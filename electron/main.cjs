const { app, BrowserWindow, protocol } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const APP_PROTOCOL = "photoid";

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".onnx", "application/octet-stream"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".wasm", "application/wasm"],
]);

function getReleaseRoot() {
  return app.isPackaged ? path.dirname(process.execPath) : process.cwd();
}

function getStaticRoots() {
  const releaseRoot = getReleaseRoot();

  return {
    appRoot: path.join(releaseRoot, "app"),
    modelsRoot: path.join(releaseRoot, "models"),
    ortRoot: path.join(releaseRoot, "ort"),
  };
}

function getSafeFilePath(root, requestPath) {
  const relativePath = decodeURIComponent(requestPath).replace(/^\/+/, "");
  const filePath = path.normalize(path.join(root, relativePath || "index.html"));
  const normalizedRoot = path.normalize(root + path.sep);

  if (!filePath.startsWith(normalizedRoot)) {
    return null;
  }

  return filePath;
}

function resolveProtocolPath(requestUrl) {
  const url = new URL(requestUrl);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const roots = getStaticRoots();

  if (pathname.startsWith("/models/")) {
    return getSafeFilePath(roots.modelsRoot, pathname.slice("/models/".length));
  }

  if (pathname.startsWith("/ort/")) {
    return getSafeFilePath(roots.ortRoot, pathname.slice("/ort/".length));
  }

  return getSafeFilePath(roots.appRoot, pathname);
}

function createHeaders(filePath, byteLength) {
  const extension = path.extname(filePath).toLowerCase();

  return {
    "Cache-Control": "no-store",
    "Content-Length": String(byteLength),
    "Content-Type": MIME_TYPES.get(extension) ?? "application/octet-stream",
  };
}

function createResponse(body, status, headers = {}) {
  return new Response(body, {
    status,
    headers,
  });
}

function registerAppProtocol() {
  protocol.handle(APP_PROTOCOL, async (request) => {
    const filePath = resolveProtocolPath(request.url);

    if (!filePath) {
      return createResponse("Chemin invalide.", 403, {
        "Content-Type": "text/plain; charset=utf-8",
      });
    }

    try {
      const data = await fs.readFile(filePath);

      if (request.method === "HEAD") {
        return createResponse(null, 200, createHeaders(filePath, data.byteLength));
      }

      return createResponse(data, 200, createHeaders(filePath, data.byteLength));
    } catch {
      return createResponse("Fichier introuvable.", 404, {
        "Content-Type": "text/plain; charset=utf-8",
      });
    }
  });
}

async function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1320,
    minHeight: 720,
    backgroundColor: "#edf2f0",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.once("ready-to-show", () => window.show());

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    return;
  }

  await window.loadURL(`${APP_PROTOCOL}://app/index.html`);
}

app.whenReady().then(async () => {
  registerAppProtocol();
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
