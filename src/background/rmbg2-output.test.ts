import { describe, expect, it } from "vitest";
import { Rmbg2ModelConfig } from "./rmbg2-config";
import { extractRmbg2AlphaMask, selectModelTensorName } from "./rmbg2-output";

const TEST_CONFIG: Rmbg2ModelConfig = {
  modelPath: "/models/rmbg2/model_fp16.onnx",
  ortWasmPath: "/ort/",
  inputWidth: 2,
  inputHeight: 2,
  normalization: {
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
  },
};

describe("RMBG-2.0 output extraction", () => {
  it("keeps a progressive float alpha matte", () => {
    const selection = extractRmbg2AlphaMask(
      {
        alpha: {
          data: new Float32Array([0, 0.25, 0.5, 1]),
          dims: [1, 1, 2, 2],
        },
      },
      ["alpha"],
      TEST_CONFIG,
    );

    expect(selection.outputName).toBe("alpha");
    expect(selection.mask.source).toBe("rmbg2");
    expect(selection.mask.width).toBe(2);
    expect(selection.mask.height).toBe(2);
    expect([...selection.mask.data]).toEqual([0, 0.25, 0.5, 1]);
  });

  it("normalizes byte-like output to 0..1", () => {
    const selection = extractRmbg2AlphaMask(
      {
        output: {
          data: new Uint8Array([0, 128, 255, 64]),
          dims: [2, 2],
        },
      },
      ["output"],
      TEST_CONFIG,
    );

    expect(selection.mask.data[0]).toBe(0);
    expect(selection.mask.data[1]).toBeCloseTo(128 / 255);
    expect(selection.mask.data[2]).toBe(1);
  });

  it("uses the configured output name when present", () => {
    expect(selectModelTensorName(["input_a", "input_b"], "input_b", "input")).toBe(
      "input_b",
    );
  });

  it("rejects an unknown configured output name", () => {
    expect(() => selectModelTensorName(["alpha"], "mask", "output")).toThrow(
      "Nom output configure introuvable",
    );
  });

  it("rejects an unexpected output shape", () => {
    expect(() =>
      extractRmbg2AlphaMask(
        {
          output: {
            data: new Float32Array(5),
            dims: [1, 2, 3],
          },
        },
        ["output"],
        TEST_CONFIG,
      ),
    ).toThrow("Shape de sortie RMBG-2.0 inattendue");
  });
});
