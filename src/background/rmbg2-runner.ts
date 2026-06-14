import * as ort from "onnxruntime-web/webgpu";
import {
  BackgroundRemovalBackendPreference,
  BackgroundTechnicalDiagnostics,
} from "../core/photo-project";
import {
  OnnxRuntimeApi,
  OnnxSessionLike,
  createConfiguredOnnxSession,
} from "../ai/onnx-session";
import { RMBG2_DEFAULT_CONFIG, Rmbg2ModelConfig } from "./rmbg2-config";
import {
  BackgroundRemovalResult,
  BackgroundRemovalRunner,
} from "./background-removal-runner";
import { preprocessImageElementForRmbg2 } from "./rmbg2-preprocess";
import {
  extractRmbg2AlphaMask,
  selectModelTensorName,
} from "./rmbg2-output";

type LoadedSession = {
  backendPreference: BackgroundRemovalBackendPreference;
  session: OnnxSessionLike;
  diagnostics: BackgroundTechnicalDiagnostics;
};

export type Rmbg2RunnerOptions = {
  config?: Rmbg2ModelConfig;
  runtime?: OnnxRuntimeApi;
  now?: () => number;
};

export class Rmbg2BackgroundRemovalRunner implements BackgroundRemovalRunner {
  private readonly config: Rmbg2ModelConfig;
  private readonly runtime: OnnxRuntimeApi;
  private readonly now: () => number;
  private loadedSession: LoadedSession | null = null;

  constructor({
    config = RMBG2_DEFAULT_CONFIG,
    runtime = ort as unknown as OnnxRuntimeApi,
    now = defaultNow,
  }: Rmbg2RunnerOptions = {}) {
    this.config = config;
    this.runtime = runtime;
    this.now = now;
  }

  async load(
    backendPreference: BackgroundRemovalBackendPreference,
  ): Promise<BackgroundTechnicalDiagnostics> {
    const existingSession = this.loadedSession;

    if (existingSession?.backendPreference === backendPreference) {
      return existingSession.diagnostics;
    }

    await existingSession?.session.release?.();

    const createdSession = await createConfiguredOnnxSession({
      backendPreference,
      config: this.config,
      runtime: this.runtime,
      now: this.now,
    });

    this.loadedSession = {
      backendPreference,
      session: createdSession.session,
      diagnostics: createdSession.diagnostics,
    };

    return createdSession.diagnostics;
  }

  async removeBackground(
    image: HTMLImageElement,
    backendPreference: BackgroundRemovalBackendPreference,
  ): Promise<BackgroundRemovalResult> {
    const diagnostics = await this.load(backendPreference);
    const loadedSession = this.loadedSession;

    if (!loadedSession) {
      throw new Error("Session RMBG-2.0 non initialisee.");
    }

    const input = preprocessImageElementForRmbg2(image, this.config);
    const inputName = selectModelTensorName(
      loadedSession.session.inputNames,
      this.config.modelInputName,
      "input",
    );
    const startedAt = this.now();
    const tensor = this.createTensor(input.data, input.dims);
    const outputs = await loadedSession.session.run({ [inputName]: tensor });
    const inferenceMs = Math.round(this.now() - startedAt);
    const outputSelection = extractRmbg2AlphaMask(
      outputs,
      loadedSession.session.outputNames,
      this.config,
    );
    const nextDiagnostics: BackgroundTechnicalDiagnostics = {
      ...diagnostics,
      selectedInputName: inputName,
      selectedOutputName: outputSelection.outputName,
      inferenceMs,
      maskWidth: outputSelection.mask.width,
      maskHeight: outputSelection.mask.height,
    };

    this.loadedSession = {
      ...loadedSession,
      diagnostics: nextDiagnostics,
    };

    return {
      mask: outputSelection.mask,
      diagnostics: nextDiagnostics,
      messages: [
        "Fond supprime avec RMBG-2.0. Comparez Original, Masque et Fond remplace avant export.",
        ...(nextDiagnostics.fallbackMessage ? [nextDiagnostics.fallbackMessage] : []),
      ],
    };
  }

  async dispose(): Promise<void> {
    await this.loadedSession?.session.release?.();
    this.loadedSession = null;
  }

  private createTensor(data: Float32Array, dims: readonly number[]): unknown {
    return new this.runtime.Tensor("float32", data, dims);
  }
}

function defaultNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
