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

export const RMBG2_DEFAULT_CONFIG: Rmbg2ModelConfig = {
  modelPath: "/models/rmbg2/model.onnx",
  ortWasmPath: "/ort/",
  inputWidth: 1024,
  inputHeight: 1024,
  normalization: {
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
  },
};

export const RMBG2_MODEL_DIRECTORY = "local-models/rmbg2/";
export const RMBG2_LOCAL_MODEL_PATH = "local-models/rmbg2/model.onnx";
export const RMBG2_ENGINE_LABEL = "RMBG-2.0";
