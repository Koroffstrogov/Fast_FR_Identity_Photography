import {
  BackgroundRemovalBackendPreference,
  BackgroundTechnicalDiagnostics,
} from "../core/photo-project";
import { getOrtRuntime } from "../ai/configure-ort-runtime";
import {
  OnnxRuntimeApi,
  OnnxSessionLike,
  createConfiguredOnnxSession,
} from "../ai/onnx-session";
import {
  RMBG_DEFAULT_CONFIG,
  RmbgModelConfig,
  getRmbgEngineLabel,
} from "./rmbg-config";
import {
  BackgroundRemovalResult,
  BackgroundRemovalRunner,
} from "./background-removal-runner";
import { preprocessImageElementForRmbg } from "./rmbg-preprocess";
import { extractRmbgAlphaMask, selectModelTensorName } from "./rmbg-output";

type LoadedSession = {
  backendPreference: BackgroundRemovalBackendPreference;
  config: RmbgModelConfig;
  session: OnnxSessionLike;
  diagnostics: BackgroundTechnicalDiagnostics;
};

export type RmbgRunnerOptions = {
  config?: RmbgModelConfig;
  runtime?: OnnxRuntimeApi;
  now?: () => number;
};

export class RmbgBackgroundRemovalRunner implements BackgroundRemovalRunner {
  private readonly defaultConfig: RmbgModelConfig;
  private readonly runtime: OnnxRuntimeApi;
  private readonly now: () => number;
  private loadedSession: LoadedSession | null = null;

  constructor({
    config = RMBG_DEFAULT_CONFIG,
    runtime = getOrtRuntime(),
    now = defaultNow,
  }: RmbgRunnerOptions = {}) {
    this.defaultConfig = config;
    this.runtime = runtime;
    this.now = now;
  }

  async load(
    backendPreference: BackgroundRemovalBackendPreference,
    config = this.defaultConfig,
  ): Promise<BackgroundTechnicalDiagnostics> {
    const existingSession = this.loadedSession;

    if (
      existingSession?.backendPreference === backendPreference &&
      existingSession.config.modelPath === config.modelPath
    ) {
      return existingSession.diagnostics;
    }

    await existingSession?.session.release?.();

    const createdSession = await createConfiguredOnnxSession({
      backendPreference,
      config,
      runtime: this.runtime,
      now: this.now,
    });

    this.loadedSession = {
      backendPreference,
      config,
      session: createdSession.session,
      diagnostics: createdSession.diagnostics,
    };

    return createdSession.diagnostics;
  }

  async removeBackground(
    image: HTMLImageElement,
    backendPreference: BackgroundRemovalBackendPreference,
    config = this.defaultConfig,
  ): Promise<BackgroundRemovalResult> {
    const diagnostics = await this.load(backendPreference, config);
    const loadedSession = this.loadedSession;

    if (!loadedSession) {
      throw new Error(`Session ${getRmbgEngineLabel(config.engine)} non initialisee.`);
    }

    const input = preprocessImageElementForRmbg(image, config);
    const inputName = selectModelTensorName(
      loadedSession.session.inputNames,
      config.modelInputName,
      "input",
    );
    const startedAt = this.now();
    const tensor = this.createTensor(input.data, input.dims);
    const outputs = await loadedSession.session.run({ [inputName]: tensor });
    const inferenceMs = Math.round(this.now() - startedAt);
    const outputSelection = extractRmbgAlphaMask(
      outputs,
      loadedSession.session.outputNames,
      config,
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
        `Fond supprime avec ${getRmbgEngineLabel(config.engine)}. Comparez Original, Masque et Fond remplace avant export.`,
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
