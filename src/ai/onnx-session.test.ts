import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OnnxRuntimeApi,
  classifyOnnxSessionCreationFailure,
  createModelProbe,
  createConfiguredOnnxSession,
  loadLocalOnnxModel,
} from "./onnx-session";
import {
  ORT_WASM_ASSET_PATHS,
  OnnxSessionCreateOptions,
} from "./configure-ort-runtime";

describe("ONNX session setup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a CPU/WASM session with local runtime assets", async () => {
    const runtime = createMockRuntime();

    const created = await createConfiguredOnnxSession({
      backendPreference: "cpu",
      runtime,
      modelBytes: new Uint8Array(2048),
      now: createNow([10, 42]),
    });

    expect(runtime.env.wasm.wasmPaths).toEqual(ORT_WASM_ASSET_PATHS);
    expect(runtime.env.wasm.wasmPaths).toMatchObject({
      wasm: "/ort/ort-wasm-simd-threaded.asyncify.wasm",
    });
    expect(runtime.env.wasm.wasmPaths).not.toHaveProperty("mjs");
    expect(runtime.env.wasm.numThreads).toBe(1);
    expect(runtime.InferenceSession.create).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({ executionProviders: ["wasm"] }),
    );
    expect(created.diagnostics.engine).toBe("rmbg1.4");
    expect(created.diagnostics.activeBackend).toBe("wasm");
    expect(created.diagnostics.provider).toBe("wasm");
    expect(created.diagnostics.inputNames).toEqual(["input"]);
    expect(created.diagnostics.outputNames).toEqual(["output"]);
    expect(created.diagnostics.sessionCreationMs).toBe(32);
  });

  it("falls back from WebGPU to WASM in auto mode", async () => {
    vi.stubGlobal("navigator", { gpu: {}, userAgent: "test" });
    const runtime = createMockRuntime({ failProvider: "webgpu" });

    const created = await createConfiguredOnnxSession({
      backendPreference: "auto",
      runtime,
      modelBytes: new Uint8Array(2048),
    });

    expect(runtime.InferenceSession.create).toHaveBeenNthCalledWith(
      1,
      expect.any(Uint8Array),
      expect.objectContaining({ executionProviders: ["webgpu"] }),
    );
    expect(runtime.InferenceSession.create).toHaveBeenNthCalledWith(
      2,
      expect.any(Uint8Array),
      expect.objectContaining({ executionProviders: ["wasm"] }),
    );
    expect(created.diagnostics.activeBackend).toBe("wasm");
    expect(created.diagnostics.fallbackMessage).toContain("Fallback CPU/WASM");
  });

  it("does not silently fallback when GPU mode fails", async () => {
    vi.stubGlobal("navigator", { gpu: {}, userAgent: "test" });
    const runtime = createMockRuntime({ failProvider: "webgpu" });

    await expect(
      createConfiguredOnnxSession({
        backendPreference: "gpu",
        runtime,
        modelBytes: new Uint8Array(2048),
      }),
    ).rejects.toThrow("WebGPU disponible mais session RMBG impossible");
  });

  it("classifies shape inference failures as session creation errors", () => {
    expect(
      classifyOnnxSessionCreationFailure(
        "ShapeInferenceError: Mismatch between number of inferred and declared dimensions. inferred=4 declared=6",
      ),
    ).toBe("session-create-error");
  });

  it("does not classify RMBG shape inference failures as missing WASM assets", async () => {
    const shapeError = new Error(
      "Mismatch between number of inferred and declared dimensions. inferred=4 declared=6",
    );
    shapeError.name = "ShapeInferenceError";
    const runtime = createMockRuntime({
      failProvider: "wasm",
      failWith: shapeError,
    });

    await expect(
      createConfiguredOnnxSession({
        backendPreference: "cpu",
        runtime,
        modelBytes: new Uint8Array(2048),
      }),
    ).rejects.toThrow(
      "Le modele ONNX est charge, mais ONNX Runtime Web ne peut pas creer la session",
    );

    await expect(
      createConfiguredOnnxSession({
        backendPreference: "cpu",
        runtime,
        modelBytes: new Uint8Array(2048),
      }),
    ).rejects.not.toThrow(".wasm ONNX introuvable");
  });

  it("loads the local model and reports missing files clearly", async () => {
    const response = new Response("missing", { status: 404 });

    await expect(
      loadLocalOnnxModel("/models/rmbg1.4/model_fp16.onnx", async () => response),
    ).rejects.toThrow("Modele RMBG-1.4 ONNX introuvable");
  });

  it("reports Vite HTML fallback before ONNX session creation", async () => {
    const runtime = createMockRuntime();
    const htmlResponse = new Response("<!doctype html><script type=\"module\">", {
      status: 200,
      headers: {
        "content-type": "text/html",
        "content-length": "581",
      },
    });

    await expect(
      createConfiguredOnnxSession({
        backendPreference: "cpu",
        runtime,
        fetchModel: async () => htmlResponse,
      }),
    ).rejects.toThrow("Le chemin du modele renvoie l'application HTML");

    expect(runtime.InferenceSession.create).not.toHaveBeenCalled();
  });

  it("builds a cache-busted model probe URL from the current origin", () => {
    vi.stubGlobal("window", {
      location: { origin: "http://127.0.0.1:5173" },
    });

    expect(createModelProbe("/models/rmbg1.4/model_fp16.onnx", () => 123)).toEqual({
      requestedPath: "/models/rmbg1.4/model_fp16.onnx",
      requestedUrl:
        "http://127.0.0.1:5173/models/rmbg1.4/model_fp16.onnx?cacheBust=123",
      currentOrigin: "http://127.0.0.1:5173",
    });
  });
});

function createMockRuntime(
  options: { failProvider?: "webgpu" | "wasm"; failWith?: Error } = {},
): OnnxRuntimeApi {
  const create = vi.fn(
    async (
      _model: Uint8Array | string,
      sessionOptions: OnnxSessionCreateOptions,
    ) => {
      const provider = sessionOptions.executionProviders[0];

      if (provider === options.failProvider) {
        throw options.failWith ?? new Error(`${provider} failed`);
      }

      return {
        inputNames: ["input"],
        outputNames: ["output"],
        run: vi.fn(),
        release: vi.fn(),
      };
    },
  );

  return {
    env: { wasm: {} },
    InferenceSession: { create },
    Tensor: class MockTensor {
      constructor(
        public readonly type: "float32",
        public readonly data: Float32Array,
        public readonly dims: readonly number[],
      ) {}
    },
  } satisfies OnnxRuntimeApi;
}

function createNow(values: number[]): () => number {
  const queue = [...values];

  return () => queue.shift() ?? values[values.length - 1] ?? 0;
}
