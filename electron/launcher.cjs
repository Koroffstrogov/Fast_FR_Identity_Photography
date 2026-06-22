const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const LOCAL_APP_DIRECTORY = "PhotoID";
const MANIFEST_FILE_NAME = "manifest.json";
const LOCAL_MANIFEST_FILE_NAME = ".photoid-release.json";

// The launcher copies another Electron app, including resources/app.asar.
// Electron patches fs to treat .asar paths as virtual archives; that breaks fs.cp
// when the destination archive is still being written. Treat .asar as plain files.
process.noAsar = true;

let statusWindow = null;

function getLauncherRootCandidates() {
  return [
    process.env.PORTABLE_EXECUTABLE_DIR,
    process.env.PORTABLE_EXECUTABLE_FILE
      ? path.dirname(process.env.PORTABLE_EXECUTABLE_FILE)
      : undefined,
    path.dirname(process.execPath),
    process.cwd(),
  ].filter(Boolean);
}

async function findLauncherRoot() {
  const checkedPaths = [];

  for (const candidate of getLauncherRootCandidates()) {
    const manifestPath = path.join(candidate, MANIFEST_FILE_NAME);
    checkedPaths.push(manifestPath);

    if (await pathExists(manifestPath)) {
      await appendLauncherLog(`Manifest trouve : ${manifestPath}`);
      return candidate;
    }
  }

  throw new Error(
    `manifest.json introuvable. Emplacements testes : ${checkedPaths.join(" ; ")}`,
  );
}

function getLocalRoot() {
  const localAppData = process.env.LOCALAPPDATA;

  if (!localAppData) {
    throw new Error("LOCALAPPDATA est introuvable.");
  }

  return path.join(localAppData, LOCAL_APP_DIRECTORY);
}

function getLauncherLogPath() {
  const localAppData = process.env.LOCALAPPDATA;

  if (localAppData) {
    return path.join(localAppData, LOCAL_APP_DIRECTORY, "launcher.log");
  }

  return path.join(app.getPath("temp"), "PhotoID-launcher.log");
}

async function appendLauncherLog(message) {
  try {
    const logPath = getLauncherLogPath();
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    // Logging must never block launch.
  }
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

  await appendLauncherLog(`Source release : ${sourceReleasePath}`);
  await appendLauncherLog(`Release locale : ${localReleasePath}`);

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
  await removeStaleTempReleases(manifest.version);

  const tempReleasePath = `${localReleasePath}.tmp-${process.pid}`;
  await fs.rm(tempReleasePath, { recursive: true, force: true });
  await appendLauncherLog(`Copie vers : ${tempReleasePath}`);
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

async function removeStaleTempReleases(version) {
  const localRoot = getLocalRoot();
  const tempPrefix = `${version}.tmp-`;

  try {
    const entries = await fs.readdir(localRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith(tempPrefix)) {
        continue;
      }

      await appendLauncherLog(`Nettoyage dossier temporaire : ${entry.name}`);
      await fs.rm(path.join(localRoot, entry.name), { recursive: true, force: true });
    }
  } catch {
    // Temp cleanup is best effort; the current copy attempt still gives the real error.
  }
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

  const sourceRoot = await findLauncherRoot();
  const manifest = await readManifest(sourceRoot);
  const localExecutablePath = await ensureLocalRelease(sourceRoot, manifest);

  await setStatus("Lancement…");
  launchLocalApp(localExecutablePath);
  app.quit();
}

app.whenReady().then(() => {
  runLauncher().catch(async (error) => {
    const detail = formatLauncherError(error);
    const message = [
      "Impossible de copier l'application localement. Vérifiez l'accès au NAS.",
      detail ? `Détail : ${detail}` : "",
      `Journal : ${getLauncherLogPath()}`,
    ]
      .filter(Boolean)
      .join("\n");

    await setStatus(message);
    await appendLauncherLog(`ERREUR : ${error?.stack ?? String(error)}`);
    dialog.showErrorBox("PhotoID", message);
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

function formatLauncherError(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  if ("code" in error && error.code) {
    return `${error.code} - ${error.message}`;
  }

  return error.message;
}
