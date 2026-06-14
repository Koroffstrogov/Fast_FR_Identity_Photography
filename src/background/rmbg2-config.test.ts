import { describe, expect, it } from "vitest";
import {
  RMBG2_DEFAULT_CONFIG,
  RMBG2_MODEL_OPTIONS,
  createRmbg2ConfigForModelPath,
  getRmbg2LocalModelPath,
  getRmbg2ModelFileName,
} from "./rmbg2-config";

describe("RMBG-2.0 model configuration", () => {
  it("uses the FP16 model as the default browser model", () => {
    expect(RMBG2_DEFAULT_CONFIG.modelPath).toBe("/models/rmbg2/model_fp16.onnx");
  });

  it("exposes the supported local model variants", () => {
    expect(RMBG2_MODEL_OPTIONS.map((option) => option.fileName)).toEqual([
      "model_fp16.onnx",
      "model_quantized.onnx",
      "model_uint8.onnx",
    ]);
  });

  it("builds a config for a selected model path", () => {
    const config = createRmbg2ConfigForModelPath("/models/rmbg2/model_uint8.onnx");

    expect(config).toMatchObject({
      modelPath: "/models/rmbg2/model_uint8.onnx",
      inputWidth: 1024,
      inputHeight: 1024,
    });
  });

  it("derives file names and local paths from model paths", () => {
    expect(getRmbg2ModelFileName("/models/rmbg2/model_quantized.onnx")).toBe(
      "model_quantized.onnx",
    );
    expect(getRmbg2LocalModelPath("/models/rmbg2/model_quantized.onnx")).toBe(
      "local-models/rmbg2/model_quantized.onnx",
    );
  });
});
