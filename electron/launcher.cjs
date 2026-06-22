const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const LOCAL_APP_DIRECTORY = "PhotoID";
const MANIFEST_FILE_NAME = "manifest.json";
const LOCAL_MANIFEST_FILE_NAME = ".photoid-release.json";

let statusWindow = null;

function getLauncherRoot() {
  return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
}

function getLocalRoot() {
  const localAppData = process.env.LOCALAPPDATA;

  if (!localAppData) {
    throw new Error("LOCALAPPDATA est introuvable.");
  }

  return path.join(localAppData, LOCAL_APP_DIRECTORY);
}

async function readManifest(sourceRoot) {
  const manifestPath = path.join(sourceRoot, MANIFEST_FILE_NAME);
  const manifestText = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);

  if (
    typeof manifest.version !== "string" ||
    typeof manifest.releaseDirectory !== "string" ||
    typeof manifest.executable !== "string"
  ) {
    throw new Error("Le manifest de release PhotoID est invalide.");
  }

  return manifest;
}

function renderStatusHtml() {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>PhotoID</title>
    <style>
      :root {
        color: #173039;
        background: #eef3f1;
        font-family: "Segoe UI", Arial, sans-serif;
      }

      body {
        display: grid;
        min-height: 100vh;
        margin: 0;
        place-items: center;
      }

      main {
        display: grid;
        gap: 12px;
        width: min(420px, calc(100vw - 48px));
        border: 1px solid #cbd8d3;
        border-radius: 10px;
        padding: 26px;
        background: #ffffff;
        box-shadow: 0 18px 42px rgb(23 48 57 / 12%);
      }

      h1 {
        margin: 0;
        font-size: 1.3rem;
      }

      p {
        margin: 0;
        color: #4b5f66;
        font-weight: 700;
      }

      progress {
        width: 100%;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>PhotoID</h1>
      <p id="status">Préparation de PhotoID…</p>
      <progress></progress>
    </main>
  </body>
</html>`;
}

async function createStatusWindow() {
  statusWindow = new BrowserWindow({
    width: 520,
    height: 260,
    resizable: false,
    minimizable: false,
    maximizable: false,
    backgroundColor: "#eef3f1",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  statusWindow.setMenuBarVisibility(false);
  statusWindow.once("ready-to-show", () => statusWindow.show());
  await statusWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(renderStatusHtml())}`,
  );
}

async function setStatus(message) {
  if (!statusWindow || statusWindow.isDestroyed()) {
    return;
  }

  await statusWindow.webContents.executeJavaScript(
    `document.getElementById("status").textContent = ${JSON.stringify(message)};`,
  );
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureLocalRelease(sourceRoot, manifest) {
  const sourceReleasePath = path.resolve(sourceRoot, manifest.releaseDirectory);
  const localReleasePath = path.join(getLocalRoot(), manifest.version);
  const localExecutablePath = path.join(localReleasePath, manifest.executable);
  const localManifestPath = path.join(localReleasePath, LOCAL_MANIFEST_FILE_NAME);

  if (
    (await pathExists(localExecutablePath)) &&
    (await isLocalManifestCurrent(localManifestPath, manifest))
  ) {
    return localExecutablePath;
  }

  if (!(await pathExists(sourceReleasePath))) {
    throw new Error("La release PhotoID est introuvable sur le NAS.");
  }

  await setStatus("Copie des modèles…");
  await fs.mkdir(getLocalRoot(), { recursive: true });

  const tempReleasePath = `${localReleasePath}.tmp-${process.pid}`;
  await fs.rm(tempReleasePath, { recursive: true, force: true });
  await fs.cp(sourceReleasePath, tempReleasePath, {
    recursive: true,
    force: true,
    verbatimSymlinks: false,
  });
  await fs.rm(localReleasePath, { recursive: true, force: true });
  await fs.rename(tempReleasePath, localReleasePath);
  await fs.writeFile(
    localManifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return localExecutablePath;
}

async function isLocalManifestCurrent(localManifestPath, sourceManifest) {
  try {
    const localManifest = JSON.parse(await fs.readFile(localManifestPath, "utf8"));

    return (
      localManifest.version === sourceManifest.version &&
      localManifest.createdAt === sourceManifest.createdAt &&
      localManifest.releaseDirectory === sourceManifest.releaseDirectory
    );
  } catch {
    return false;
  }
}

function launchLocalApp(executablePath) {
  const child = spawn(executablePath, [], {
    cwd: path.dirname(executablePath),
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function runLauncher() {
  await createStatusWindow();
  await setStatus("Préparation de PhotoID…");

  const sourceRoot = getLauncherRoot();
  const manifest = await readManifest(sourceRoot);
  const localExecutablePath = await ensureLocalRelease(sourceRoot, manifest);

  await setStatus("Lancement…");
  launchLocalApp(localExecutablePath);
  app.quit();
}

app.whenReady().then(() => {
  runLauncher().catch(async () => {
    const message =
      "Impossible de copier l'application localement. Vérifiez l'accès au NAS.";

    await setStatus(message);
    dialog.showErrorBox("PhotoID", message);
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
