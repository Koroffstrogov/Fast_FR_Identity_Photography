import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { verifyReleaseAssets } from "./verify-release-assets.mjs";

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

async function main() {
  await run("npm", ["run", "build"]);
  await verifyReleaseAssets();
  await removeOutputDirectory("release/portable");
  await run("npx", ["electron-builder", "--config", "electron-builder.app.json", "--win", "dir"]);
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
