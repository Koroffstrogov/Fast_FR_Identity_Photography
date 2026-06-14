import {
  OnnxExecutionMode,
  OnnxGraphOptimizationLevel,
  OnnxRuntimeApi,
  OnnxSessionCreateOptions,
  configureOrtRuntime,
  getOrtRuntime,
} from "./configure-ort-runtime";
import { loadLocalOnnxModel } from "./onnx-session";
import { OnnxSessionDiagnosticResult } from "../core/photo-project";
import { getRmbgEngineForModelPath } from "../background/rmbg2-config";

type OnnxSessionDiagnosticVariant = {
  id: string;
  label: string;
  provider: "webgpu" | "wasm";
  graphOptimizationLevel?: OnnxGraphOptimizationLevel;
  executionMode?: OnnxExecutionMode;
  source: "url" | "buffer";
};

export type DiagnoseOnnxSessionCreationOptions = {
  runtime?: OnnxRuntimeApi;
  fetchModel?: typeof fetch;
  now?: () => number;
};

export async function diagnoseOnnxSessionCreation(
  modelPath: string,
  options: DiagnoseOnnxSessionCreationOptions = {},
): Promise<OnnxSessionDiagnosticResult[]> {
  const runtime = options.runtime ?? getOrtRuntime();
  const now = options.now ?? defaultNow;
  configureOrtRuntime(runtime);

  const loadedModel = await loadLocalOnnxModel(modelPath, options.fetchModel ?? fetch);
  const engine = getRmbgEngineForModelPath(modelPath);

  const variants = getDefaultDiagnosticVariants();
  const results: OnnxSessionDiagnosticResult[] = [];

  for (const variant of variants) {
    const startedAt = now();
    const createOptions = createSessionOptions(variant);

    try {
      const session = await runtime.InferenceSession.create(
        variant.source === "url" ? loadedModel.probe.requestedUrl : loadedModel.bytes,
        createOptions,
      );
      const durationMs = Math.round(now() - startedAt);

      results.push({
        id: variant.id,
        label: variant.label,
        engine,
        modelUrl: loadedModel.probe.requestedUrl,
        byteLength: loadedModel.bytes.byteLength,
        provider: variant.provider,
        graphOptimizationLevel: variant.graphOptimizationLevel ?? "default",
        source: variant.source,
        executionMode: variant.executionMode,
        sessionCreated: true,
        durationMs,
        inputNames: [...session.inputNames],
        outputNames: [...session.outputNames],
      });

      await session.release?.();
    } catch (error) {
      results.push({
        id: variant.id,
        label: variant.label,
        engine,
        modelUrl: loadedModel.probe.requestedUrl,
        byteLength: loadedModel.bytes.byteLength,
        provider: variant.provider,
        graphOptimizationLevel: variant.graphOptimizationLevel ?? "default",
        source: variant.source,
        executionMode: variant.executionMode,
        sessionCreated: false,
        durationMs: Math.round(now() - startedAt),
        inputNames: [],
        outputNames: [],
        error: formatDiagnosticError(error),
      });
    }
  }

  return results;
}

export function getDefaultDiagnosticVariants(): OnnxSessionDiagnosticVariant[] {
  return [
    {
      id: "A",
      label: "WebGPU, options par defaut",
      provider: "webgpu",
      source: "buffer",
    },
    {
      id: "B",
      label: 'WebGPU, graphOptimizationLevel "disabled"',
      provider: "webgpu",
      graphOptimizationLevel: "disabled",
      source: "buffer",
    },
    {
      id: "C",
      label: "WASM, options par defaut",
      provider: "wasm",
      source: "buffer",
    },
    {
      id: "D",
      label: 'WASM, graphOptimizationLevel "disabled"',
      provider: "wasm",
      graphOptimizationLevel: "disabled",
      source: "buffer",
    },
    {
      id: "E",
      label: 'WASM, executionMode "sequential"',
      provider: "wasm",
      graphOptimizationLevel: "disabled",
      executionMode: "sequential",
      source: "buffer",
    },
    {
      id: "F",
      label: "WASM depuis URL modele",
      provider: "wasm",
      graphOptimizationLevel: "disabled",
      source: "url",
    },
    {
      id: "G",
      label: "WebGPU depuis URL modele",
      provider: "webgpu",
      graphOptimizationLevel: "disabled",
      source: "url",
    },
  ];
}

function createSessionOptions(
  variant: OnnxSessionDiagnosticVariant,
): OnnxSessionCreateOptions {
  return {
    executionProviders: [variant.provider],
    ...(variant.graphOptimizationLevel
      ? { graphOptimizationLevel: variant.graphOptimizationLevel }
      : {}),
    ...(variant.executionMode ? { executionMode: variant.executionMode } : {}),
  };
}

function formatDiagnosticError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  if (!error.name || error.name === "Error" || error.message.includes(error.name)) {
    return error.message;
  }

  return `${error.name}: ${error.message}`;
}

function defaultNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
