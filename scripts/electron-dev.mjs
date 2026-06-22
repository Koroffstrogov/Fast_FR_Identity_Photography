import electronPath from "electron";
import { spawn } from "node:child_process";

const DEV_SERVER_URL = "http://127.0.0.1:5173";

function startProcess(command, args, options = {}) {
  const commandLine = getCommandLine(command, args);

  return spawn(commandLine.command, commandLine.args, {
    stdio: "inherit",
    ...options,
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDevServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });

      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still starting.
    }

    await wait(300);
  }

  throw new Error(`Le serveur Vite ne répond pas sur ${url}.`);
}

const viteProcess = startProcess("npm", [
  "run",
  "dev",
  "--",
  "--port",
  "5173",
  "--strictPort",
]);

function stopVite() {
  if (!viteProcess.killed) {
    viteProcess.kill();
  }
}

process.on("exit", stopVite);
process.on("SIGINT", () => {
  stopVite();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopVite();
  process.exit(143);
});

try {
  await waitForDevServer(DEV_SERVER_URL);
  const electronProcess = startProcess(electronPath, ["electron/main.cjs"], {
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: DEV_SERVER_URL,
    },
  });

  electronProcess.on("exit", (code) => {
    stopVite();
    process.exit(code ?? 0);
  });
} catch (error) {
  stopVite();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
