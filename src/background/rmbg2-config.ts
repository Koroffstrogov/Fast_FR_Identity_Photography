import {
  BackgroundRemovalEngine,
  DEFAULT_BACKGROUND_MODEL_PATH,
} from "../core/photo-project";

export type RmbgNormalization = {
  mean: readonly [number, number, number];
  std: readonly [number, number, number];
};

export type RmbgModelConfig = {
  engine: BackgroundRemovalEngine;
  modelPath: string;
  ortWasmPath: string;
  modelInputName?: string;
  modelOutputName?: string;
  inputWidth: number;
  inputHeight: number;
  normalization: RmbgNormalization;
};

export type Rmbg2Normalization = RmbgNormalization;
export type Rmbg2ModelConfig = RmbgModelConfig;

export type RmbgModelVariant = "full" | "fp16" | "quantized" | "uint8";

export type RmbgModelOption = {
  engine: Exclude<BackgroundRemovalEngine, "legacy">;
  variant: RmbgModelVariant;
  fileName: string;
  label: string;
  modelPath: string;
  localPath: string;
  description: string;
};

export type Rmbg2ModelOption = RmbgModelOption;

export type RmbgEngineOption = {
  engine: Exclude<BackgroundRemovalEngine, "legacy">;
  label: string;
  shortLabel: string;
  description: string;
};

export const RMBG14_MODEL_DIRECTORY = "local-models/rmbg1.4/";
export const RMBG14_MODEL_PUBLIC_DIRECTORY = "/models/rmbg1.4/";
export const RMBG14_RECOMMENDED_MODEL_FILE_NAME = "model_fp16.onnx";
export const RMBG14_ENGINE_LABEL = "RMBG-1.4 ONNX";

export const RMBG2_MODEL_DIRECTORY = "local-models/rmbg2/";
export const RMBG2_MODEL_PUBLIC_DIRECTORY = "/models/rmbg2/";
export const RMBG2_RECOMMENDED_MODEL_FILE_NAME = "model_fp16.onnx";
export const RMBG2_ENGINE_LABEL = "RMBG-2.0 ONNX experimental";

export const RMBG_ENGINE_OPTIONS: readonly RmbgEngineOption[] = [
  {
    engine: "rmbg1.4",
    label: RMBG14_ENGINE_LABEL,
    shortLabel: "RMBG-1.4",
    description: "Moteur recommande pour la compatibilite web.",
  },
  {
    engine: "rmbg2",
    label: RMBG2_ENGINE_LABEL,
    shortLabel: "RMBG-2.0",
    description:
      "Moteur experimental haute qualite. Peut echouer a creer une session ORT Web selon l'export ONNX.",
  },
] as const;

export const RMBG14_MODEL_OPTIONS: readonly RmbgModelOption[] = [
  {
    engine: "rmbg1.4",
    variant: "full",
    fileName: "model.onnx",
    label: "Full",
    modelPath: "/models/rmbg1.4/model.onnx",
    localPath: "local-models/rmbg1.4/model.onnx",
    description: "Modele RMBG-1.4 complet, environ 176 Mo.",
  },
  {
    engine: "rmbg1.4",
    variant: "fp16",
    fileName: "model_fp16.onnx",
    label: "FP16",
    modelPath: "/models/rmbg1.4/model_fp16.onnx",
    localPath: "local-models/rmbg1.4/model_fp16.onnx",
    description: "Modele RMBG-1.4 recommande pour WebGPU, environ 88 Mo.",
  },
  {
    engine: "rmbg1.4",
    variant: "quantized",
    fileName: "model_quantized.onnx",
    label: "Quantized",
    modelPath: "/models/rmbg1.4/model_quantized.onnx",
    localPath: "local-models/rmbg1.4/model_quantized.onnx",
    description: "Modele RMBG-1.4 leger a tester en fallback, environ 44 Mo.",
  },
] as const;

export const RMBG2_MODEL_OPTIONS: readonly RmbgModelOption[] = [
  {
    engine: "rmbg2",
    variant: "fp16",
    fileName: "model_fp16.onnx",
    label: "FP16 experimental",
    modelPath: "/models/rmbg2/model_fp16.onnx",
    localPath: "local-models/rmbg2/model_fp16.onnx",
    description:
      "Modele RMBG-2.0 FP16 experimental. Peut echouer avec ShapeInferenceError dans ORT Web.",
  },
  {
    engine: "rmbg2",
    variant: "quantized",
    fileName: "model_quantized.onnx",
    label: "Quantized experimental",
    modelPath: "/models/rmbg2/model_quantized.onnx",
    localPath: "local-models/rmbg2/model_quantized.onnx",
    description: "Modele RMBG-2.0 plus leger a tester si FP16 echoue.",
  },
  {
    engine: "rmbg2",
    variant: "uint8",
    fileName: "model_uint8.onnx",
    label: "Uint8 experimental",
    modelPath: "/models/rmbg2/model_uint8.onnx",
    localPath: "local-models/rmbg2/model_uint8.onnx",
    description: "Fallback RMBG-2.0 experimental selon l'export disponible.",
  },
] as const;

export const RMBG_MODEL_OPTIONS: readonly RmbgModelOption[] = [
  ...RMBG14_MODEL_OPTIONS,
  ...RMBG2_MODEL_OPTIONS,
] as const;

export const RMBG_DEFAULT_CONFIG: RmbgModelConfig = {
  engine: getRmbgEngineForModelPath(DEFAULT_BACKGROUND_MODEL_PATH),
  modelPath: DEFAULT_BACKGROUND_MODEL_PATH,
  ortWasmPath: "/ort/",
  inputWidth: 1024,
  inputHeight: 1024,
  normalization: {
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
  },
};

export const RMBG2_DEFAULT_CONFIG: Rmbg2ModelConfig = RMBG_DEFAULT_CONFIG;

export const RMBG14_LOCAL_MODEL_PATH = "local-models/rmbg1.4/model_fp16.onnx";
export const RMBG2_LOCAL_MODEL_PATH = "local-models/rmbg2/model_fp16.onnx";

export function createRmbgConfigForModelPath(modelPath: string): RmbgModelConfig {
  return {
    ...RMBG_DEFAULT_CONFIG,
    engine: getRmbgEngineForModelPath(modelPath),
    modelPath,
  };
}

export function createRmbg2ConfigForModelPath(modelPath: string): Rmbg2ModelConfig {
  return createRmbgConfigForModelPath(modelPath);
}

export function getRmbgModelOptionsForEngine(
  engine: BackgroundRemovalEngine,
): readonly RmbgModelOption[] {
  switch (engine) {
    case "rmbg1.4":
      return RMBG14_MODEL_OPTIONS;
    case "rmbg2":
      return RMBG2_MODEL_OPTIONS;
    case "legacy":
      return [];
  }
}

export function getDefaultRmbgModelPathForEngine(
  engine: BackgroundRemovalEngine,
): string {
  switch (engine) {
    case "rmbg1.4":
      return "/models/rmbg1.4/model_fp16.onnx";
    case "rmbg2":
      return "/models/rmbg2/model_fp16.onnx";
    case "legacy":
      return DEFAULT_BACKGROUND_MODEL_PATH;
  }
}

export function getRmbgModelOption(modelPath: string): RmbgModelOption | undefined {
  return RMBG_MODEL_OPTIONS.find((option) => option.modelPath === modelPath);
}

export function getRmbg2ModelOption(modelPath: string): Rmbg2ModelOption | undefined {
  return getRmbgModelOption(modelPath);
}

export function getRmbgEngineOption(
  engine: BackgroundRemovalEngine,
): RmbgEngineOption | undefined {
  return RMBG_ENGINE_OPTIONS.find((option) => option.engine === engine);
}

export function getRmbgEngineForModelPath(
  modelPath: string,
): Exclude<BackgroundRemovalEngine, "legacy"> {
  const option = getRmbgModelOption(modelPath);

  if (option) {
    return option.engine;
  }

  const pathname = modelPath.startsWith("http")
    ? new URL(modelPath).pathname
    : modelPath;

  return pathname.includes("/rmbg2/") ? "rmbg2" : "rmbg1.4";
}

export function getRmbgEngineLabel(engine: BackgroundRemovalEngine): string {
  return getRmbgEngineOption(engine)?.label ?? "Suppression de fond locale";
}

export function getRmbgModelFileName(modelPath: string): string {
  const pathname = modelPath.startsWith("http")
    ? new URL(modelPath).pathname
    : modelPath;
  const slashIndex = pathname.lastIndexOf("/");

  return slashIndex === -1 ? pathname : pathname.slice(slashIndex + 1);
}

export function getRmbg2ModelFileName(modelPath: string): string {
  return getRmbgModelFileName(modelPath);
}

export function getRmbgLocalModelPath(modelPath: string): string {
  const option = getRmbgModelOption(modelPath);

  if (option) {
    return option.localPath;
  }

  const engine = getRmbgEngineForModelPath(modelPath);
  const directory = engine === "rmbg2" ? RMBG2_MODEL_DIRECTORY : RMBG14_MODEL_DIRECTORY;

  return `${directory}${getRmbgModelFileName(modelPath)}`;
}

export function getRmbg2LocalModelPath(modelPath: string): string {
  return getRmbgLocalModelPath(modelPath);
}
