import { BackgroundMaskData } from "../core/photo-project";
import { OnnxTensorLike } from "../ai/onnx-session";
import { RMBG2_DEFAULT_CONFIG, Rmbg2ModelConfig } from "./rmbg2-config";

export type Rmbg2OutputSelection = {
  outputName: string;
  mask: BackgroundMaskData;
};

type SingleChannelShape = {
  width: number;
  height: number;
};

export function selectModelTensorName(
  names: readonly string[],
  configuredName: string | undefined,
  kind: "input" | "output",
): string {
  if (configuredName) {
    if (!names.includes(configuredName)) {
      throw new Error(
        `Nom ${kind} configure introuvable dans le modele RMBG : ${configuredName}. Noms detectes : ${names.join(", ") || "aucun"}.`,
      );
    }

    return configuredName;
  }

  const [firstName] = names;

  if (!firstName) {
    throw new Error(`Le modele RMBG ne declare aucun ${kind}.`);
  }

  return firstName;
}

export function extractRmbg2AlphaMask(
  outputs: Record<string, OnnxTensorLike>,
  outputNames: readonly string[],
  config: Rmbg2ModelConfig = RMBG2_DEFAULT_CONFIG,
): Rmbg2OutputSelection {
  const outputName = selectModelTensorName(
    outputNames,
    config.modelOutputName,
    "output",
  );
  const output = outputs[outputName];

  if (!output) {
    throw new Error(
      `Sortie modele RMBG vide : ${outputName}. Noms disponibles : ${Object.keys(outputs).join(", ") || "aucun"}.`,
    );
  }

  const values = getNumericTensorValues(output);

  if (values.length === 0) {
    throw new Error("Sortie modele RMBG vide : aucun pixel de masque.");
  }

  const shape = getSingleChannelShape(output.dims, values.length, config);
  const maskData = new Float32Array(values.length);
  const scale = shouldNormalizeByteLikeValues(values) ? 255 : 1;

  for (let index = 0; index < values.length; index += 1) {
    maskData[index] = clamp01(Number(values[index]) / scale);
  }

  return {
    outputName,
    mask: {
      width: shape.width,
      height: shape.height,
      data: maskData,
      labels: ["background", "person"],
      source: "rmbg",
    },
  };
}

function getNumericTensorValues(output: OnnxTensorLike): ArrayLike<number> {
  const data = output.data;

  if (
    data instanceof Float32Array ||
    data instanceof Uint8Array ||
    data instanceof Uint8ClampedArray ||
    data instanceof Int32Array
  ) {
    return data;
  }

  if (Array.isArray(data) && data.every((value) => typeof value === "number")) {
    return data;
  }

  throw new Error("Sortie modele RMBG incompatible : tenseur non numerique.");
}

function getSingleChannelShape(
  dims: readonly number[],
  valueCount: number,
  config: Rmbg2ModelConfig,
): SingleChannelShape {
  if (dims.length === 4) {
    const [n, cOrH, hOrW, wOrC] = dims;

    if (n === 1 && cOrH === 1 && hOrW * wOrC === valueCount) {
      return { height: hOrW, width: wOrC };
    }

    if (n === 1 && wOrC === 1 && cOrH * hOrW === valueCount) {
      return { height: cOrH, width: hOrW };
    }
  }

  if (dims.length === 3) {
    const [first, second, third] = dims;

    if (first === 1 && second * third === valueCount) {
      return { height: second, width: third };
    }

    if (third === 1 && first * second === valueCount) {
      return { height: first, width: second };
    }
  }

  if (dims.length === 2 && dims[0] * dims[1] === valueCount) {
    return { height: dims[0], width: dims[1] };
  }

  if (valueCount === config.inputWidth * config.inputHeight) {
    return { width: config.inputWidth, height: config.inputHeight };
  }

  throw new Error(
    `Shape de sortie RMBG inattendue : [${dims.join(", ")}] pour ${valueCount} valeurs.`,
  );
}

function shouldNormalizeByteLikeValues(values: ArrayLike<number>): boolean {
  const sampleCount = Math.min(values.length, 4096);

  for (let index = 0; index < sampleCount; index += 1) {
    if (Number(values[index]) > 1) {
      return true;
    }
  }

  return false;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
