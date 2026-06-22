import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { verifyReleaseAssets } from "./verify-release-assets.mjs";

const NAS_OUTPUT_ROOT = "release/nas/PhotoID";
const PORTABLE_OUTPUT_ROOT = "release/portable/win-unpacked";
const LAUNCHER_OUTPUT_PATH = "release/launcher/PhotoID-Launcher.exe";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const commandLine = getCommandLine(command, args);
    const child = spawn(commandLine.command, commandLine.args, {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} a échoué avec le code ${code}.`));
    });
  });
}

function getCommandLine(command, args) {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", [command, ...args].join(" ")],
    };
  }

  return { command, args };
}

async function readPackageVersion() {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  if (typeof packageJson.version !== "string") {
    throw new Error("La version package.json est invalide.");
  }

  return packageJson.version;
}

function createManifest(version) {
  return {
    productName: "PhotoID",
    version,
    releaseDirectory: `releases/${version}`,
    executable: "PhotoID.exe",
    models: [
      "models/mediapipe/face_landmarker.task",
      "models/mediapipe/wasm/",
      "models/rmbg1.4/model_fp16.onnx",
      "models/rmbg1.4/model_quantized.onnx",
    ],
    ortDirectory: "ort",
    createdAt: new Date().toISOString(),
  };
}

async function assembleNasRelease(version) {
  const versionOutputRoot = path.join(NAS_OUTPUT_ROOT, "releases", version);

  await removeOutputDirectory(NAS_OUTPUT_ROOT);
  await mkdir(versionOutputRoot, { recursive: true });
  await cp(PORTABLE_OUTPUT_ROOT, versionOutputRoot, { recursive: true });
  await cp(LAUNCHER_OUTPUT_PATH, path.join(NAS_OUTPUT_ROOT, "PhotoID-Launcher.exe"));
  await writeFile(
    path.join(NAS_OUTPUT_ROOT, "manifest.json"),
    `${JSON.stringify(createManifest(version), null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  const version = await readPackageVersion();

  await run("npm", ["run", "build"]);
  await verifyReleaseAssets();
  await removeOutputDirectory("release/portable");
  await removeOutputDirectory("release/launcher");
  await run("npx", ["electron-builder", "--config", "electron-builder.app.json", "--win", "dir"]);
  await run("npx", [
    "electron-builder",
    "--config",
    "electron-builder.launcher.json",
    "--win",
    "portable",
  ]);
  await assembleNasRelease(version);

  console.log(`Release NAS prête : ${NAS_OUTPUT_ROOT}`);
}

async function removeOutputDirectory(directory) {
  try {
    await rm(directory, { recursive: true, force: true });
  } catch (error) {
    if (isLockedDirectoryError(error)) {
      throw new Error(
        `Impossible de nettoyer ${directory}. Fermez toutes les fenêtres PhotoID lancées depuis ce dossier, puis relancez la commande.`,
      );
    }

    throw error;
  }
}

function isLockedDirectoryError(error) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "EBUSY" || error.code === "EPERM")
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
