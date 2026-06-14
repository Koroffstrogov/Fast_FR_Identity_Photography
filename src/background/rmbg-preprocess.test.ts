import { describe, expect, it } from "vitest";
import { RmbgModelConfig } from "./rmbg-config";
import { preprocessImageDataForRmbg } from "./rmbg-preprocess";

const TEST_CONFIG: RmbgModelConfig = {
  engine: "rmbg1.4",
  modelPath: "/models/rmbg1.4/model_fp16.onnx",
  ortWasmPath: "/ort/",
  inputWidth: 2,
  inputHeight: 1,
  normalization: {
    mean: [0.5, 0.25, 0],
    std: [0.5, 0.25, 1],
  },
  outputNormalization: "min-max",
};

describe("RMBG preprocessing", () => {
  it("converts RGBA pixels to normalized NCHW float32 RGB", () => {
    const tensor = preprocessImageDataForRmbg(
      {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([
          255, 0, 128, 255,
          0, 255, 64, 255,
        ]),
      },
      TEST_CONFIG,
    );

    expect(tensor.dims).toEqual([1, 3, 1, 2]);
    expect(tensor.data[0]).toBeCloseTo(1);
    expect(tensor.data[1]).toBeCloseTo(-1);
    expect(tensor.data[2]).toBeCloseTo(-1);
    expect(tensor.data[3]).toBeCloseTo(3);
    expect(tensor.data[4]).toBeCloseTo(128 / 255);
    expect(tensor.data[5]).toBeCloseTo(64 / 255);
  });

  it("rejects an unexpected input size", () => {
    expect(() =>
      preprocessImageDataForRmbg(
        {
          width: 1,
          height: 1,
          data: new Uint8ClampedArray([0, 0, 0, 255]),
        },
        TEST_CONFIG,
      ),
    ).toThrow("RMBG attend une image 2x1");
  });
});
