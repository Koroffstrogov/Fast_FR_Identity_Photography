import * as ort from "onnxruntime-web/webgpu";
import {
  BackgroundRemovalBackendPreference,
  BackgroundTechnicalDiagnostics,
} from "../core/photo-project";
import {
  BackendAttempt,
  getRuntimeCapabilities,
  resolveBackgroundBackend,
} from "./runtime-capabilities";
import {
  RMBG2_DEFAULT_CONFIG,
  RMBG2_MODEL_DIRECTORY,
  Rmbg2ModelConfig,
} from "../background/rmbg2-config";

export type OnnxTensorLike = {
  readonly data: unknown;
  readonly dims: readonly number[];
};

export type OnnxSessionLike = {
  readonly inputNames: readonly string[];
  readonly outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OnnxTensorLike>>;
  release?(): Promise<void>;
};

export type OnnxRuntimeApi = {
  env: {
    wasm: {
      wasmPaths?: string | URL | { wasm?: string | URL; mjs?: string | URL };
      numThreads?: number;
    };
  };
  InferenceSession: {
    create(
      model: Uint8Array,
      options: { executionProviders: readonly string[]; graphOptimizationLevel?: string },
    ): Promise<OnnxSessionLike>;
  };
  Tensor: new (
    type: "float32",
    data: Float32Array,
    dims: readonly number[],
  ) => unknown;
};

export type CreatedOnnxSession = {
  session: OnnxSessionLike;
  diagnostics: BackgroundTechnicalDiagnostics;
};

export type CreateOnnxSessionOptions = {
  backendPreference: BackgroundRemovalBackendPreference;
  config?: Rmbg2ModelConfig;
  runtime?: OnnxRuntimeApi;
  fetchModel?: typeof fetch;
  modelBytes?: Uint8Array;
  now?: () => number;
};

const MIN_ONNX_MODEL_SIZE_BYTES = 1024;

export async function createConfiguredOnnxSession({
  backendPreference,
  config = RMBG2_DEFAULT_CONFIG,
  runtime = ort as unknown as OnnxRuntimeApi,
  fetchModel = fetch,
  modelBytes,
  now = defaultNow,
}: CreateOnnxSessionOptions): Promise<CreatedOnnxSession> {
  configureOnnxRuntimeAssets(runtime, config);

  const capabilities = getRuntimeCapabilities();
  const resolution = resolveBackgroundBackend(backendPreference, capabilities);

  if (resolution.error) {
    throw new Error(resolution.error);
  }

  const bytes = modelBytes ?? (await loadLocalOnnxModel(config.modelPath, fetchModel));
  const errors: string[] = [];

  for (const attempt of resolution.attempts) {
    const startedAt = now();

    try {
      const session = await runtime.InferenceSession.create(bytes, {
        executionProviders: [attempt.provider],
        graphOptimizationLevel: "all",
      });
      const sessionCreationMs = Math.round(now() - startedAt);
      const fallbackMessage = getFallbackMessage(resolution.attempts, attempt, errors);

      return {
        session,
        diagnostics: {
          navigatorGpuAvailable: capabilities.navigatorGpuAvailable,
          requestedBackend: backendPreference,
          activeBackend: attempt.activeBackend,
          provider: attempt.provider,
          modelPath: config.modelPath,
          ortWasmPath: config.ortWasmPath,
          inputWidth: config.inputWidth,
          inputHeight: config.inputHeight,
          inputNames: [...session.inputNames],
          outputNames: [...session.outputNames],
          sessionCreationMs,
          fallbackMessage: fallbackMessage ?? resolution.warning,
        },
      };
    } catch (error) {
      errors.push(formatAttemptError(attempt, error));

      if (backendPreference !== "auto" || attempt.provider !== "webgpu") {
        throw new Error(formatSessionCreationError(backendPreference, errors));
      }
    }
  }

  throw new Error(formatSessionCreationError(backendPreference, errors));
}

export function configureOnnxRuntimeAssets(
  runtime: OnnxRuntimeApi,
  config: Rmbg2ModelConfig = RMBG2_DEFAULT_CONFIG,
): void {
  runtime.env.wasm.wasmPaths = config.ortWasmPath;
  runtime.env.wasm.numThreads = 1;
}

export async function loadLocalOnnxModel(
  modelPath: string,
  fetchModel: typeof fetch = fetch,
): Promise<Uint8Array> {
  let response: Response;

  try {
    response = await fetchModel(modelPath, { cache: "no-store" });
  } catch (error) {
    throw new Error(
      `Modele RMBG-2.0 inaccessible : ${modelPath}. ${formatUnknownError(error)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Modele RMBG-2.0 introuvable dans ${RMBG2_MODEL_DIRECTORY}. Fichier attendu : ${modelPath} (HTTP ${response.status}).`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const modelBytes = new Uint8Array(await response.arrayBuffer());

  if (contentType.includes("text/html") || looksLikeHtml(modelBytes)) {
    throw new Error(
      `Modele RMBG-2.0 incompatible : ${modelPath} renvoie une page HTML au lieu d'un fichier .onnx.`,
    );
  }

  if (modelBytes.byteLength < MIN_ONNX_MODEL_SIZE_BYTES) {
    throw new Error(
      `Modele RMBG-2.0 incompatible ou incomplet : ${modelPath} ne contient que ${modelBytes.byteLength} octets.`,
    );
  }

  return modelBytes;
}

function getFallbackMessage(
  attempts: readonly BackendAttempt[],
  successfulAttempt: BackendAttempt,
  errors: readonly string[],
): string | undefined {
  if (attempts[0]?.provider === successfulAttempt.provider || errors.length === 0) {
    return undefined;
  }

  return `Fallback CPU/WASM apres echec WebGPU : ${errors.join(" ")}`;
}

function formatAttemptError(attempt: BackendAttempt, error: unknown): string {
  return `${attempt.provider}: ${formatUnknownError(error)}`;
}

function formatSessionCreationError(
  backendPreference: BackgroundRemovalBackendPreference,
  errors: readonly string[],
): string {
  const detail = errors.join(" ");

  if (detail.toLowerCase().includes("wasm")) {
    return `.wasm ONNX introuvable ou inaccessible dans /ort/. ${detail}`;
  }

  if (backendPreference === "gpu") {
    return `WebGPU disponible mais session RMBG-2.0 impossible. ${detail}`;
  }

  return `Modele RMBG-2.0 incompatible avec ONNX Runtime Web. ${detail}`;
}

function looksLikeHtml(buffer: Uint8Array): boolean {
  const prefix = new TextDecoder()
    .decode(buffer.slice(0, Math.min(buffer.byteLength, 80)))
    .trimStart()
    .toLowerCase();

  return prefix.startsWith("<!doctype html") || prefix.startsWith("<html");
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function defaultNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
