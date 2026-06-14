import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OnnxRuntimeApi,
  createModelProbe,
  createConfiguredOnnxSession,
  loadLocalOnnxModel,
} from "./onnx-session";

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

    expect(runtime.env.wasm.wasmPaths).toBe("/ort/");
    expect(runtime.env.wasm.numThreads).toBe(1);
    expect(runtime.InferenceSession.create).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({ executionProviders: ["wasm"] }),
    );
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
    ).rejects.toThrow("WebGPU disponible mais session RMBG-2.0 impossible");
  });

  it("loads the local model and reports missing files clearly", async () => {
    const response = new Response("missing", { status: 404 });

    await expect(
      loadLocalOnnxModel("/models/rmbg2/model.onnx", async () => response),
    ).rejects.toThrow("Modele RMBG-2.0 introuvable");
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

    expect(createModelProbe("/models/rmbg2/model.onnx", () => 123)).toEqual({
      requestedPath: "/models/rmbg2/model.onnx",
      requestedUrl:
        "http://127.0.0.1:5173/models/rmbg2/model.onnx?cacheBust=123",
      currentOrigin: "http://127.0.0.1:5173",
    });
  });
});

function createMockRuntime(
  options: { failProvider?: "webgpu" | "wasm" } = {},
): OnnxRuntimeApi {
  const create = vi.fn(
    async (
      _model: Uint8Array,
      sessionOptions: { executionProviders: readonly string[] },
    ) => {
      const provider = sessionOptions.executionProviders[0];

      if (provider === options.failProvider) {
        throw new Error(`${provider} failed`);
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
