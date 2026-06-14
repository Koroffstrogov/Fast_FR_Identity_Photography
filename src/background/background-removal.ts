import {
  BackgroundRemovalBackendPreference,
  BackgroundTechnicalDiagnostics,
} from "../core/photo-project";
import {
  BackgroundRemovalResult,
  BackgroundRemovalRunner,
} from "./background-removal-runner";
import { Rmbg2BackgroundRemovalRunner } from "./rmbg2-runner";

export type BackgroundRemovalStatus = "idle" | "loading" | "ready" | "error";

let runner: BackgroundRemovalRunner = new Rmbg2BackgroundRemovalRunner();
let status: BackgroundRemovalStatus = "idle";

export function getBackgroundRemovalStatus(): BackgroundRemovalStatus {
  return status;
}

export async function loadBackgroundRemovalModel(
  backendPreference: BackgroundRemovalBackendPreference,
): Promise<BackgroundTechnicalDiagnostics> {
  status = "loading";

  try {
    const diagnostics = await runner.load(backendPreference);
    status = "ready";
    return diagnostics;
  } catch (error) {
    status = "error";
    throw new Error(getBackgroundRemovalErrorMessage(error));
  }
}

export async function removeImageBackground(
  image: HTMLImageElement,
  backendPreference: BackgroundRemovalBackendPreference,
): Promise<BackgroundRemovalResult> {
  status = "loading";

  try {
    const result = await runner.removeBackground(image, backendPreference);
    status = "ready";
    return result;
  } catch (error) {
    status = "error";
    throw new Error(getBackgroundRemovalErrorMessage(error));
  }
}

export function getBackgroundRemovalErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);

  if (
    detail.startsWith("Modele RMBG-2.0") ||
    detail.startsWith(".wasm ONNX") ||
    detail.startsWith("WebGPU") ||
    detail.startsWith("Sortie modele RMBG-2.0") ||
    detail.startsWith("Shape de sortie RMBG-2.0")
  ) {
    return detail;
  }

  return `Impossible de supprimer le fond avec RMBG-2.0. ${detail}`;
}

export function setBackgroundRemovalRunnerForTests(
  nextRunner: BackgroundRemovalRunner,
): void {
  runner = nextRunner;
  status = "idle";
}
