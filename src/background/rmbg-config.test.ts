import { describe, expect, it } from "vitest";
import {
  RMBG_DEFAULT_CONFIG,
  RMBG_ENGINE_OPTIONS,
  RMBG_MODEL_OPTIONS,
  createRmbgConfigForModelPath,
  getDefaultRmbgModelPath,
  getRmbgEngineForModelPath,
  getRmbgLocalModelPath,
  getRmbgModelFileName,
  getRmbgModelOptions,
  normalizeRmbgEngine,
  normalizeRmbgModelPath,
} from "./rmbg-config";

describe("RMBG model configuration", () => {
  it("uses the RMBG-1.4 FP16 model as the default browser model", () => {
    expect(RMBG_DEFAULT_CONFIG).toMatchObject({
      engine: "rmbg1.4",
      modelPath: "/models/rmbg1.4/model_fp16.onnx",
      normalization: {
        mean: [0.5, 0.5, 0.5],
        std: [1, 1, 1],
      },
      outputNormalization: "min-max",
    });
  });

  it("exposes only the supported RMBG-1.4 local model variants", () => {
    expect(RMBG_MODEL_OPTIONS.map((option) => option.fileName)).toEqual([
      "model.onnx",
      "model_fp16.onnx",
      "model_quantized.onnx",
    ]);
    expect(RMBG_MODEL_OPTIONS.every((option) => option.engine === "rmbg1.4")).toBe(
      true,
    );
    expect(RMBG_ENGINE_OPTIONS.map((option) => option.engine)).toEqual([
      "rmbg1.4",
    ]);
  });

  it("builds a config for a selected RMBG-1.4 model path", () => {
    const config = createRmbgConfigForModelPath(
      "/models/rmbg1.4/model_quantized.onnx",
    );

    expect(config).toMatchObject({
      engine: "rmbg1.4",
      modelPath: "/models/rmbg1.4/model_quantized.onnx",
      inputWidth: 1024,
      inputHeight: 1024,
      outputNormalization: "min-max",
    });
  });

  it("normalizes legacy removed model state to the recommended RMBG-1.4 model", () => {
    const removedModelPath = `/models/${"rmbg" + "2"}/model_fp16.onnx`;

    expect(normalizeRmbgEngine("rmbg" + "2")).toBe("rmbg1.4");
    expect(normalizeRmbgModelPath(removedModelPath)).toBe(
      "/models/rmbg1.4/model_fp16.onnx",
    );
    expect(createRmbgConfigForModelPath(removedModelPath)).toMatchObject({
      engine: "rmbg1.4",
      modelPath: "/models/rmbg1.4/model_fp16.onnx",
    });
  });

  it("derives engine and paths for the remaining local model family", () => {
    expect(getRmbgEngineForModelPath("/models/rmbg1.4/model_fp16.onnx")).toBe(
      "rmbg1.4",
    );
    expect(getDefaultRmbgModelPath()).toBe("/models/rmbg1.4/model_fp16.onnx");
    expect(getRmbgModelOptions()).toHaveLength(3);
  });

  it("derives file names and local paths from model paths", () => {
    expect(getRmbgModelFileName("/models/rmbg1.4/model_quantized.onnx")).toBe(
      "model_quantized.onnx",
    );
    expect(getRmbgLocalModelPath("/models/rmbg1.4/model_fp16.onnx")).toBe(
      "local-models/rmbg1.4/model_fp16.onnx",
    );
  });
});
