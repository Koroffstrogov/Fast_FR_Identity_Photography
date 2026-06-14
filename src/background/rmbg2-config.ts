export type Rmbg2Normalization = {
  mean: readonly [number, number, number];
  std: readonly [number, number, number];
};

export type Rmbg2ModelConfig = {
  modelPath: string;
  ortWasmPath: string;
  modelInputName?: string;
  modelOutputName?: string;
  inputWidth: number;
  inputHeight: number;
  normalization: Rmbg2Normalization;
};

export type Rmbg2ModelOption = {
  fileName: string;
  label: string;
  modelPath: string;
  localPath: string;
  description: string;
};

export const RMBG2_MODEL_DIRECTORY = "local-models/rmbg2/";
export const RMBG2_MODEL_PUBLIC_DIRECTORY = "/models/rmbg2/";
export const RMBG2_RECOMMENDED_MODEL_FILE_NAME = "model_fp16.onnx";
export const RMBG2_MODEL_OPTIONS: readonly Rmbg2ModelOption[] = [
  {
    fileName: "model_fp16.onnx",
    label: "RMBG-2.0 FP16",
    modelPath: "/models/rmbg2/model_fp16.onnx",
    localPath: "local-models/rmbg2/model_fp16.onnx",
    description: "Modele recommande pour WebGPU.",
  },
  {
    fileName: "model_quantized.onnx",
    label: "RMBG-2.0 quantized",
    modelPath: "/models/rmbg2/model_quantized.onnx",
    localPath: "local-models/rmbg2/model_quantized.onnx",
    description: "Modele plus leger a tester si FP16 echoue.",
  },
  {
    fileName: "model_uint8.onnx",
    label: "RMBG-2.0 uint8",
    modelPath: "/models/rmbg2/model_uint8.onnx",
    localPath: "local-models/rmbg2/model_uint8.onnx",
    description: "Fallback experimental selon l'export disponible.",
  },
] as const;

export const RMBG2_DEFAULT_CONFIG: Rmbg2ModelConfig = {
  modelPath: DEFAULT_BACKGROUND_MODEL_PATH,
  ortWasmPath: "/ort/",
  inputWidth: 1024,
  inputHeight: 1024,
  normalization: {
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
  },
};

export const RMBG2_LOCAL_MODEL_PATH = "local-models/rmbg2/model_fp16.onnx";
export const RMBG2_ENGINE_LABEL = "RMBG-2.0";

export function createRmbg2ConfigForModelPath(modelPath: string): Rmbg2ModelConfig {
  return {
    ...RMBG2_DEFAULT_CONFIG,
    modelPath,
  };
}

export function getRmbg2ModelOption(modelPath: string): Rmbg2ModelOption | undefined {
  return RMBG2_MODEL_OPTIONS.find((option) => option.modelPath === modelPath);
}

export function getRmbg2ModelFileName(modelPath: string): string {
  const pathname = modelPath.startsWith("http")
    ? new URL(modelPath).pathname
    : modelPath;
  const slashIndex = pathname.lastIndexOf("/");

  return slashIndex === -1 ? pathname : pathname.slice(slashIndex + 1);
}

export function getRmbg2LocalModelPath(modelPath: string): string {
  const option = getRmbg2ModelOption(modelPath);

  return option?.localPath ?? `${RMBG2_MODEL_DIRECTORY}${getRmbg2ModelFileName(modelPath)}`;
}
import { DEFAULT_BACKGROUND_MODEL_PATH } from "../core/photo-project";
