import {
  BackgroundRemovalEngine,
  DEFAULT_BACKGROUND_MODEL_PATH,
} from "../core/photo-project";

export type RmbgNormalization = {
  mean: readonly [number, number, number];
  std: readonly [number, number, number];
};

export type RmbgOutputNormalization = "none" | "min-max";

export type RmbgModelConfig = {
  engine: BackgroundRemovalEngine;
  modelPath: string;
  ortWasmPath: string;
  modelInputName?: string;
  modelOutputName?: string;
  inputWidth: number;
  inputHeight: number;
  normalization: RmbgNormalization;
  outputNormalization: RmbgOutputNormalization;
};

export type RmbgModelVariant = "full" | "fp16" | "quantized";

export type RmbgModelOption = {
  engine: Exclude<BackgroundRemovalEngine, "legacy">;
  variant: RmbgModelVariant;
  fileName: string;
  label: string;
  modelPath: string;
  localPath: string;
  description: string;
};

export type RmbgEngineOption = {
  engine: Exclude<BackgroundRemovalEngine, "legacy">;
  label: string;
  shortLabel: string;
  description: string;
};

export const RMBG_MODEL_DIRECTORY = "local-models/rmbg1.4/";
export const RMBG_MODEL_PUBLIC_DIRECTORY = "/models/rmbg1.4/";
export const RMBG_RECOMMENDED_MODEL_FILE_NAME = "model_fp16.onnx";
export const RMBG_ENGINE_LABEL = "RMBG-1.4 ONNX";

export const RMBG_ENGINE_OPTIONS: readonly RmbgEngineOption[] = [
  {
    engine: "rmbg1.4",
    label: RMBG_ENGINE_LABEL,
    shortLabel: "RMBG-1.4",
    description: "Moteur local recommandé pour la compatibilité navigateur.",
  },
] as const;

export const RMBG_MODEL_OPTIONS: readonly RmbgModelOption[] = [
  {
    engine: "rmbg1.4",
    variant: "full",
    fileName: "model.onnx",
    label: "Full",
    modelPath: "/models/rmbg1.4/model.onnx",
    localPath: "local-models/rmbg1.4/model.onnx",
    description: "Modèle RMBG-1.4 complet, environ 176 Mo.",
  },
  {
    engine: "rmbg1.4",
    variant: "fp16",
    fileName: "model_fp16.onnx",
    label: "FP16",
    modelPath: "/models/rmbg1.4/model_fp16.onnx",
    localPath: "local-models/rmbg1.4/model_fp16.onnx",
    description: "Modèle RMBG-1.4 recommandé pour WebGPU, environ 88 Mo.",
  },
  {
    engine: "rmbg1.4",
    variant: "quantized",
    fileName: "model_quantized.onnx",
    label: "Quantized",
    modelPath: "/models/rmbg1.4/model_quantized.onnx",
    localPath: "local-models/rmbg1.4/model_quantized.onnx",
    description: "Modèle RMBG-1.4 léger à tester en fallback, environ 44 Mo.",
  },
] as const;

export const RMBG_DEFAULT_CONFIG: RmbgModelConfig = {
  engine: "rmbg1.4",
  modelPath: DEFAULT_BACKGROUND_MODEL_PATH,
  ortWasmPath: "/ort/",
  inputWidth: 1024,
  inputHeight: 1024,
  normalization: {
    mean: [0.5, 0.5, 0.5],
    std: [1, 1, 1],
  },
  outputNormalization: "min-max",
};

export const RMBG_LOCAL_MODEL_PATH = "local-models/rmbg1.4/model_fp16.onnx";

export function createRmbgConfigForModelPath(modelPath: string): RmbgModelConfig {
  return {
    ...RMBG_DEFAULT_CONFIG,
    modelPath: normalizeRmbgModelPath(modelPath),
  };
}

export function getRmbgModelOptions(): readonly RmbgModelOption[] {
  return RMBG_MODEL_OPTIONS;
}

export function getDefaultRmbgModelPath(): string {
  return DEFAULT_BACKGROUND_MODEL_PATH;
}

export function getRmbgModelOption(modelPath: string): RmbgModelOption | undefined {
  const normalizedPath = normalizeRmbgModelPath(modelPath);

  return RMBG_MODEL_OPTIONS.find((option) => option.modelPath === normalizedPath);
}

export function getRmbgEngineOption(
  engine: BackgroundRemovalEngine,
): RmbgEngineOption | undefined {
  return RMBG_ENGINE_OPTIONS.find(
    (option) => option.engine === normalizeRmbgEngine(engine),
  );
}

export function normalizeRmbgEngine(
  engine: BackgroundRemovalEngine | string | undefined,
): BackgroundRemovalEngine {
  return engine === "legacy" ? "legacy" : "rmbg1.4";
}

export function getRmbgEngineForModelPath(
  _modelPath: string,
): Exclude<BackgroundRemovalEngine, "legacy"> {
  return "rmbg1.4";
}

export function getRmbgEngineLabel(engine: BackgroundRemovalEngine | string): string {
  return engine === "legacy" ? "Suppression de fond locale" : RMBG_ENGINE_LABEL;
}

export function normalizeRmbgModelPath(modelPath: string | undefined): string {
  const removedEngineSegment = `/rmbg${2}/`;

  if (!modelPath || modelPath.includes(removedEngineSegment)) {
    return DEFAULT_BACKGROUND_MODEL_PATH;
  }

  return modelPath;
}

export function getRmbgModelFileName(modelPath: string): string {
  const normalizedPath = normalizeRmbgModelPath(modelPath);
  const pathname = normalizedPath.startsWith("http")
    ? new URL(normalizedPath).pathname
    : normalizedPath;
  const slashIndex = pathname.lastIndexOf("/");

  return slashIndex === -1 ? pathname : pathname.slice(slashIndex + 1);
}

export function getRmbgLocalModelPath(modelPath: string): string {
  const normalizedPath = normalizeRmbgModelPath(modelPath);
  const option = getRmbgModelOption(normalizedPath);

  if (option) {
    return option.localPath;
  }

  return `${RMBG_MODEL_DIRECTORY}${getRmbgModelFileName(normalizedPath)}`;
}
