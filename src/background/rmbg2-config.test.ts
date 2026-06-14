import { describe, expect, it } from "vitest";
import {
  RMBG14_MODEL_OPTIONS,
  RMBG2_DEFAULT_CONFIG,
  RMBG2_MODEL_OPTIONS,
  createRmbg2ConfigForModelPath,
  getDefaultRmbgModelPathForEngine,
  getRmbgEngineForModelPath,
  getRmbgLocalModelPath,
  getRmbgModelOptionsForEngine,
  getRmbg2LocalModelPath,
  getRmbg2ModelFileName,
} from "./rmbg2-config";

describe("RMBG model configuration", () => {
  it("uses the RMBG-1.4 FP16 model as the default browser model", () => {
    expect(RMBG2_DEFAULT_CONFIG).toMatchObject({
      engine: "rmbg1.4",
      modelPath: "/models/rmbg1.4/model_fp16.onnx",
    });
  });

  it("exposes the supported RMBG-1.4 local model variants", () => {
    expect(RMBG14_MODEL_OPTIONS.map((option) => option.fileName)).toEqual([
      "model.onnx",
      "model_fp16.onnx",
      "model_quantized.onnx",
    ]);
  });

  it("keeps the supported RMBG-2.0 local model variants", () => {
    expect(RMBG2_MODEL_OPTIONS.map((option) => option.fileName)).toEqual([
      "model_fp16.onnx",
      "model_quantized.onnx",
      "model_uint8.onnx",
    ]);
  });

  it("builds a config for a selected model path", () => {
    const config = createRmbg2ConfigForModelPath(
      "/models/rmbg1.4/model_quantized.onnx",
    );

    expect(config).toMatchObject({
      engine: "rmbg1.4",
      modelPath: "/models/rmbg1.4/model_quantized.onnx",
      inputWidth: 1024,
      inputHeight: 1024,
    });
  });

  it("derives the engine and default model path from model paths", () => {
    expect(getRmbgEngineForModelPath("/models/rmbg1.4/model_fp16.onnx")).toBe(
      "rmbg1.4",
    );
    expect(getRmbgEngineForModelPath("/models/rmbg2/model_fp16.onnx")).toBe(
      "rmbg2",
    );
    expect(getDefaultRmbgModelPathForEngine("rmbg1.4")).toBe(
      "/models/rmbg1.4/model_fp16.onnx",
    );
    expect(getDefaultRmbgModelPathForEngine("rmbg2")).toBe(
      "/models/rmbg2/model_fp16.onnx",
    );
    expect(getRmbgModelOptionsForEngine("legacy")).toEqual([]);
  });

  it("derives file names and local paths from model paths", () => {
    expect(getRmbg2ModelFileName("/models/rmbg2/model_quantized.onnx")).toBe(
      "model_quantized.onnx",
    );
    expect(getRmbgLocalModelPath("/models/rmbg1.4/model_fp16.onnx")).toBe(
      "local-models/rmbg1.4/model_fp16.onnx",
    );
    expect(getRmbg2LocalModelPath("/models/rmbg2/model_quantized.onnx")).toBe(
      "local-models/rmbg2/model_quantized.onnx",
    );
  });
});
