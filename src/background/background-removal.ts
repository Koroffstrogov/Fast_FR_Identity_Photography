import {
  BackgroundRemovalBackendPreference,
  BackgroundTechnicalDiagnostics,
} from "../core/photo-project";
import {
  BackgroundRemovalResult,
  BackgroundRemovalRunner,
} from "./background-removal-runner";
import { Rmbg2ModelConfig } from "./rmbg2-config";

export type BackgroundRemovalStatus = "idle" | "loading" | "ready" | "error";

let runner: BackgroundRemovalRunner | null = null;
let status: BackgroundRemovalStatus = "idle";

export function getBackgroundRemovalStatus(): BackgroundRemovalStatus {
  return status;
}

export async function loadBackgroundRemovalModel(
  backendPreference: BackgroundRemovalBackendPreference,
  config?: Rmbg2ModelConfig,
): Promise<BackgroundTechnicalDiagnostics> {
  status = "loading";

  try {
    const diagnostics = await (await getBackgroundRemovalRunner()).load(
      backendPreference,
      config,
    );
    status = "ready";
    return diagnostics;
  } catch (error) {
    status = "error";
    throw createBackgroundRemovalError(error);
  }
}

export async function removeImageBackground(
  image: HTMLImageElement,
  backendPreference: BackgroundRemovalBackendPreference,
  config?: Rmbg2ModelConfig,
): Promise<BackgroundRemovalResult> {
  status = "loading";

  try {
    const result = await (await getBackgroundRemovalRunner()).removeBackground(
      image,
      backendPreference,
      config,
    );
    status = "ready";
    return result;
  } catch (error) {
    status = "error";
    throw createBackgroundRemovalError(error);
  }
}

export function getBackgroundRemovalErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);

  if (
    detail.startsWith("Modele RMBG") ||
    detail.startsWith("Le modele ONNX est charge") ||
    detail.startsWith(".wasm ONNX") ||
    detail.startsWith("WebGPU") ||
    detail.startsWith("Le chemin du modele renvoie l'application HTML") ||
    detail.startsWith("Sortie modele RMBG") ||
    detail.startsWith("Shape de sortie RMBG")
  ) {
    return detail;
  }

  return `Impossible de supprimer le fond avec RMBG. ${detail}`;
}

export function setBackgroundRemovalRunnerForTests(
  nextRunner: BackgroundRemovalRunner,
): void {
  runner = nextRunner;
  status = "idle";
}

function createBackgroundRemovalError(error: unknown): Error {
  const wrappedError = new Error(getBackgroundRemovalErrorMessage(error));

  if (hasBackgroundDiagnostics(error)) {
    Object.assign(wrappedError, { diagnostics: error.diagnostics });
  }

  return wrappedError;
}

function hasBackgroundDiagnostics(
  error: unknown,
): error is { diagnostics: BackgroundTechnicalDiagnostics } {
  return (
    typeof error === "object" &&
    error !== null &&
    "diagnostics" in error &&
    typeof (error as { diagnostics?: unknown }).diagnostics === "object"
  );
}

async function getBackgroundRemovalRunner(): Promise<BackgroundRemovalRunner> {
  if (runner) {
    return runner;
  }

  const { Rmbg2BackgroundRemovalRunner } = await import("./rmbg2-runner");
  runner = new Rmbg2BackgroundRemovalRunner();

  return runner;
}
