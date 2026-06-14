import * as ort from "onnxruntime-web/webgpu";

export type OnnxRuntimeApi = {
  env: {
    wasm: {
      wasmPaths?: OnnxWasmPaths;
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

export type OnnxSessionLike = {
  readonly inputNames: readonly string[];
  readonly outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OnnxTensorLike>>;
  release?(): Promise<void>;
};

export type OnnxTensorLike = {
  readonly data: unknown;
  readonly dims: readonly number[];
};

export type OnnxWasmPaths =
  | string
  | URL
  | {
      wasm?: string | URL;
      mjs?: string | URL;
      [fileName: string]: string | URL | undefined;
    };

export const ORT_WASM_ASSET_PATHS = {
  wasm: "/ort/ort-wasm-simd-threaded.asyncify.wasm",
} as const;

const configuredRuntimes = new WeakSet<object>();

export function getOrtRuntime(): OnnxRuntimeApi {
  const runtime = ort as unknown as OnnxRuntimeApi;
  configureOrtRuntime(runtime);

  return runtime;
}

export function configureOrtRuntime(runtime: OnnxRuntimeApi): void {
  const runtimeKey = runtime as object;

  if (configuredRuntimes.has(runtimeKey)) {
    return;
  }

  runtime.env.wasm.wasmPaths = ORT_WASM_ASSET_PATHS;
  runtime.env.wasm.numThreads = 1;
  configuredRuntimes.add(runtimeKey);
}
