import { RMBG_DEFAULT_CONFIG, RmbgModelConfig } from "./rmbg-config";

export type RgbaImageDataLike = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type RmbgInputTensorData = {
  data: Float32Array;
  dims: readonly [1, 3, number, number];
};

export function preprocessImageDataForRmbg(
  imageData: RgbaImageDataLike,
  config: RmbgModelConfig = RMBG_DEFAULT_CONFIG,
): RmbgInputTensorData {
  if (imageData.width !== config.inputWidth || imageData.height !== config.inputHeight) {
    throw new Error(
      `RMBG attend une image ${config.inputWidth}x${config.inputHeight}, recu ${imageData.width}x${imageData.height}.`,
    );
  }

  const pixelCount = config.inputWidth * config.inputHeight;
  const tensorData = new Float32Array(pixelCount * 3);
  const [meanR, meanG, meanB] = config.normalization.mean;
  const [stdR, stdG, stdB] = config.normalization.std;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const sourceIndex = pixelIndex * 4;
    const r = imageData.data[sourceIndex] / 255;
    const g = imageData.data[sourceIndex + 1] / 255;
    const b = imageData.data[sourceIndex + 2] / 255;

    tensorData[pixelIndex] = (r - meanR) / stdR;
    tensorData[pixelCount + pixelIndex] = (g - meanG) / stdG;
    tensorData[pixelCount * 2 + pixelIndex] = (b - meanB) / stdB;
  }

  return {
    data: tensorData,
    dims: [1, 3, config.inputHeight, config.inputWidth],
  };
}

export function preprocessImageElementForRmbg(
  image: HTMLImageElement,
  config: RmbgModelConfig = RMBG_DEFAULT_CONFIG,
): RmbgInputTensorData {
  const canvas = document.createElement("canvas");
  canvas.width = config.inputWidth;
  canvas.height = config.inputHeight;

  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return preprocessImageDataForRmbg(
    context.getImageData(0, 0, canvas.width, canvas.height),
    config,
  );
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
