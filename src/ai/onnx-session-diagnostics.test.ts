import { describe, expect, it, vi } from "vitest";
import {
  diagnoseOnnxSessionCreation,
  getDefaultDiagnosticVariants,
} from "./onnx-session-diagnostics";
import {
  OnnxRuntimeApi,
  OnnxSessionCreateOptions,
} from "./configure-ort-runtime";

describe("ONNX session creation diagnostics", () => {
  it("defines provider, optimization and source variants", () => {
    const variants = getDefaultDiagnosticVariants();

    expect(variants).toHaveLength(7);
    expect(variants.map((variant) => variant.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]);
    expect(variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "webgpu" }),
        expect.objectContaining({
          provider: "webgpu",
          graphOptimizationLevel: "disabled",
        }),
        expect.objectContaining({ provider: "wasm" }),
        expect.objectContaining({
          provider: "wasm",
          graphOptimizationLevel: "disabled",
        }),
        expect.objectContaining({
          provider: "wasm",
          executionMode: "sequential",
        }),
        expect.objectContaining({ source: "url" }),
        expect.objectContaining({ source: "buffer" }),
      ]),
    );
  });

  it("reports session creation success for every mocked variant", async () => {
    const runtime = createMockRuntime();
    const results = await diagnoseOnnxSessionCreation("/models/rmbg1.4/model_fp16.onnx", {
      runtime,
      fetchModel: createModelFetch(4096),
      now: createIncrementingNow(),
    });

    expect(results).toHaveLength(7);
    expect(results.every((result) => result.sessionCreated)).toBe(true);
    expect(results.every((result) => result.engine === "rmbg1.4")).toBe(true);
    expect(results.every((result) => result.byteLength === 4096)).toBe(true);
    expect(results.map((result) => result.inputNames)).toEqual(
      Array.from({ length: 7 }, () => ["pixel_values"]),
    );
    expect(results.map((result) => result.outputNames)).toEqual(
      Array.from({ length: 7 }, () => ["alphas"]),
    );
    expect(runtime.InferenceSession.create).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({ executionProviders: ["webgpu"] }),
    );
    expect(runtime.InferenceSession.create).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({
        executionProviders: ["wasm"],
        graphOptimizationLevel: "disabled",
      }),
    );
    expect(runtime.InferenceSession.create).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({
        executionProviders: ["wasm"],
        executionMode: "sequential",
      }),
    );
    expect(runtime.InferenceSession.create).toHaveBeenCalledWith(
      expect.stringContaining("/models/rmbg1.4/model_fp16.onnx?cacheBust="),
      expect.any(Object),
    );
  });

  it("keeps exact session creation errors in diagnostic results", async () => {
    const shapeError = new Error(
      "Mismatch between number of inferred and declared dimensions. inferred=4 declared=6",
    );
    shapeError.name = "ShapeInferenceError";
    const runtime = createMockRuntime({ failWith: shapeError });

    const results = await diagnoseOnnxSessionCreation("/models/rmbg1.4/model_fp16.onnx", {
      runtime,
      fetchModel: createModelFetch(4096),
      now: createIncrementingNow(),
    });

    expect(results.every((result) => result.sessionCreated === false)).toBe(true);
    expect(results.every((result) => result.error?.includes("ShapeInferenceError"))).toBe(
      true,
    );
    expect(results.every((result) => result.error?.includes("inferred=4 declared=6"))).toBe(
      true,
    );
  });
});

function createMockRuntime(options: { failWith?: Error } = {}): OnnxRuntimeApi {
  const create = vi.fn(
    async (
      _model: Uint8Array | string,
      _sessionOptions: OnnxSessionCreateOptions,
    ) => {
      if (options.failWith) {
        throw options.failWith;
      }

      return {
        inputNames: ["pixel_values"],
        outputNames: ["alphas"],
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

function createModelFetch(byteLength: number): typeof fetch {
  return (async () => {
    const bytes = new Uint8Array(byteLength);
    bytes[0] = 8;

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(byteLength),
      },
    });
  }) as typeof fetch;
}

function createIncrementingNow(): () => number {
  let current = 0;

  return () => {
    current += 10;
    return current;
  };
}
