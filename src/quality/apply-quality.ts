import {
  QualityEditState,
  clampQualityEditState,
} from "./quality-state";

export function applyQualityToCanvas(
  canvas: HTMLCanvasElement,
  qualityEdit: QualityEditState | undefined,
): void {
  if (!qualityEdit?.enabled) {
    return;
  }

  const context = getCanvasContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const outputPixels = applyQualityToPixels(
    imageData.data,
    imageData.width,
    imageData.height,
    qualityEdit,
  );
  const outputImageData = context.createImageData(imageData.width, imageData.height);

  outputImageData.data.set(outputPixels);
  context.putImageData(outputImageData, 0, 0);
}

export function applyQualityToPixels(
  sourcePixels: Uint8ClampedArray,
  width: number,
  height: number,
  qualityEdit: QualityEditState,
): Uint8ClampedArray {
  assertPixelBuffer(sourcePixels, width, height);

  const edit = clampQualityEditState(qualityEdit);
  const adjustedPixels = new Uint8ClampedArray(sourcePixels.length);
  const exposureFactor = 2 ** edit.exposureEv;
  const contrastFactor = 1 + edit.contrast / 100;
  const saturationFactor = 1 + edit.saturation / 100;

  for (let index = 0; index < sourcePixels.length; index += 4) {
    const adjustedColor = adjustColor({
      r: sourcePixels[index],
      g: sourcePixels[index + 1],
      b: sourcePixels[index + 2],
      exposureFactor,
      brightness: edit.brightness,
      contrastFactor,
      temperature: edit.temperature,
      tint: edit.tint,
      saturationFactor,
    });

    adjustedPixels[index] = adjustedColor.r;
    adjustedPixels[index + 1] = adjustedColor.g;
    adjustedPixels[index + 2] = adjustedColor.b;
    adjustedPixels[index + 3] = sourcePixels[index + 3];
  }

  if (edit.sharpness <= 0) {
    return adjustedPixels;
  }

  return applyUnsharpMask(adjustedPixels, width, height, edit.sharpness);
}

function adjustColor({
  r,
  g,
  b,
  exposureFactor,
  brightness,
  contrastFactor,
  temperature,
  tint,
  saturationFactor,
}: {
  r: number;
  g: number;
  b: number;
  exposureFactor: number;
  brightness: number;
  contrastFactor: number;
  temperature: number;
  tint: number;
  saturationFactor: number;
}): { r: number; g: number; b: number } {
  let nextR = applyTone(r, exposureFactor, brightness, contrastFactor);
  let nextG = applyTone(g, exposureFactor, brightness, contrastFactor);
  let nextB = applyTone(b, exposureFactor, brightness, contrastFactor);

  nextR += temperature * 0.9 + tint * 0.35;
  nextG -= tint * 0.7;
  nextB -= temperature * 0.9 + tint * 0.15;

  const luminance = 0.2126 * nextR + 0.7152 * nextG + 0.0722 * nextB;

  nextR = luminance + (nextR - luminance) * saturationFactor;
  nextG = luminance + (nextG - luminance) * saturationFactor;
  nextB = luminance + (nextB - luminance) * saturationFactor;

  return {
    r: clampByte(nextR),
    g: clampByte(nextG),
    b: clampByte(nextB),
  };
}

function applyTone(
  value: number,
  exposureFactor: number,
  brightness: number,
  contrastFactor: number,
): number {
  return (value * exposureFactor + brightness - 128) * contrastFactor + 128;
}

function applyUnsharpMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sharpness: number,
): Uint8ClampedArray {
  if (width < 3 || height < 3) {
    return new Uint8ClampedArray(pixels);
  }

  const outputPixels = new Uint8ClampedArray(pixels);
  const amount = Math.min(0.3, Math.max(0, sharpness) / 40);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const blurred = get3x3Average(pixels, width, x, y, channel);
        const value = pixels[index + channel];

        outputPixels[index + channel] = clampByte(value + (value - blurred) * amount);
      }
    }
  }

  return outputPixels;
}

function get3x3Average(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  channel: number,
): number {
  let sum = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      sum += pixels[((y + dy) * width + x + dx) * 4 + channel];
    }
  }

  return sum / 9;
}

function assertPixelBuffer(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    pixels.length < width * height * 4
  ) {
    throw new Error("pixels must contain positive dimensions and RGBA data");
  }
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
