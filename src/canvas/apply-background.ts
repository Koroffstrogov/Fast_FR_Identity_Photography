import {
  BackgroundEditState,
  BackgroundMaskData,
  BackgroundPreviewMode,
} from "../core/photo-project";
import {
  ImageTransform,
  Size,
  degreesToRadians,
  getCoverScale,
} from "../core/geometry";
import { createRefinedAlphaMask } from "../vision/mask-refinement";

export type BackgroundRenderOutput = "preview" | "export";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type SourceMaskCanvasCacheEntry = {
  key: string;
  canvas: HTMLCanvasElement;
};

const sourceMaskCanvasCache = new WeakMap<
  BackgroundMaskData,
  SourceMaskCanvasCacheEntry
>();

export function applyBackgroundToCanvas(
  canvas: HTMLCanvasElement,
  imageSize: Size,
  transform: ImageTransform,
  backgroundEdit: BackgroundEditState | undefined,
  output: BackgroundRenderOutput,
): void {
  const renderMode = getBackgroundRenderMode(backgroundEdit, output);

  if (renderMode === "original" || !backgroundEdit?.rawMask) {
    return;
  }

  const targetAlpha = renderMaskToTargetAlpha(
    backgroundEdit.rawMask,
    canvas,
    imageSize,
    transform,
    backgroundEdit,
  );
  const context = getCanvasContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const nextPixels =
    renderMode === "mask-preview"
      ? applyMaskPreviewToPixels(imageData.data, targetAlpha)
      : applyBackgroundToPixels(
          imageData.data,
          targetAlpha,
          parseHexColor(backgroundEdit.replacementColor),
        );

  const nextImageData = context.createImageData(imageData.width, imageData.height);
  nextImageData.data.set(nextPixels);
  context.putImageData(nextImageData, 0, 0);
}

export function getBackgroundRenderMode(
  backgroundEdit: BackgroundEditState | undefined,
  output: BackgroundRenderOutput,
): BackgroundPreviewMode {
  if (!backgroundEdit) {
    return "original";
  }

  if (output === "export") {
    return backgroundEdit.enabled ? "replace" : "original";
  }

  return backgroundEdit.mode;
}

export function applyBackgroundToPixels(
  sourcePixels: Uint8ClampedArray,
  alphaMask: Float32Array,
  replacementColor: RgbColor,
): Uint8ClampedArray {
  assertMatchingPixelLength(sourcePixels, alphaMask);

  const outputPixels = new Uint8ClampedArray(sourcePixels);

  for (let pixelIndex = 0; pixelIndex < alphaMask.length; pixelIndex += 1) {
    const sourceIndex = pixelIndex * 4;
    const foregroundAlpha = clamp01(alphaMask[pixelIndex]);
    const backgroundAlpha = 1 - foregroundAlpha;

    outputPixels[sourceIndex] = Math.round(
      sourcePixels[sourceIndex] * foregroundAlpha +
        replacementColor.r * backgroundAlpha,
    );
    outputPixels[sourceIndex + 1] = Math.round(
      sourcePixels[sourceIndex + 1] * foregroundAlpha +
        replacementColor.g * backgroundAlpha,
    );
    outputPixels[sourceIndex + 2] = Math.round(
      sourcePixels[sourceIndex + 2] * foregroundAlpha +
        replacementColor.b * backgroundAlpha,
    );
    outputPixels[sourceIndex + 3] = 255;
  }

  return outputPixels;
}

export function applyMaskPreviewToPixels(
  sourcePixels: Uint8ClampedArray,
  alphaMask: Float32Array,
): Uint8ClampedArray {
  assertMatchingPixelLength(sourcePixels, alphaMask);

  const outputPixels = new Uint8ClampedArray(sourcePixels);

  for (let pixelIndex = 0; pixelIndex < alphaMask.length; pixelIndex += 1) {
    const sourceIndex = pixelIndex * 4;
    const foregroundAlpha = clamp01(alphaMask[pixelIndex]);
    const uncertain = foregroundAlpha > 0.25 && foregroundAlpha < 0.75;
    const overlay = uncertain
      ? { r: 245, g: 158, b: 11 }
      : foregroundAlpha >= 0.75
        ? { r: 34, g: 197, b: 94 }
        : { r: 239, g: 68, b: 68 };
    const overlayAlpha = uncertain ? 0.55 : 0.42;

    outputPixels[sourceIndex] = Math.round(
      sourcePixels[sourceIndex] * (1 - overlayAlpha) + overlay.r * overlayAlpha,
    );
    outputPixels[sourceIndex + 1] = Math.round(
      sourcePixels[sourceIndex + 1] * (1 - overlayAlpha) +
        overlay.g * overlayAlpha,
    );
    outputPixels[sourceIndex + 2] = Math.round(
      sourcePixels[sourceIndex + 2] * (1 - overlayAlpha) +
        overlay.b * overlayAlpha,
    );
    outputPixels[sourceIndex + 3] = 255;
  }

  return outputPixels;
}

export function parseHexColor(hexColor: string): RgbColor {
  const normalizedColor = hexColor.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(normalizedColor)) {
    throw new Error("replacement color must use #rrggbb format");
  }

  return {
    r: Number.parseInt(normalizedColor.slice(1, 3), 16),
    g: Number.parseInt(normalizedColor.slice(3, 5), 16),
    b: Number.parseInt(normalizedColor.slice(5, 7), 16),
  };
}

function renderMaskToTargetAlpha(
  rawMask: BackgroundMaskData,
  targetCanvas: HTMLCanvasElement,
  imageSize: Size,
  transform: ImageTransform,
  backgroundEdit: BackgroundEditState,
): Float32Array {
  const sourceMaskCanvas = getSourceMaskCanvas(rawMask, imageSize, backgroundEdit);
  const targetMaskCanvas = document.createElement("canvas");

  targetMaskCanvas.width = targetCanvas.width;
  targetMaskCanvas.height = targetCanvas.height;

  const targetMaskContext = getCanvasContext(targetMaskCanvas);
  const coverScale = getCoverScale(imageSize, {
    width: targetCanvas.width,
    height: targetCanvas.height,
  });
  const scale = coverScale * transform.zoom;

  targetMaskContext.clearRect(0, 0, targetMaskCanvas.width, targetMaskCanvas.height);
  targetMaskContext.save();
  targetMaskContext.translate(
    targetCanvas.width / 2 + transform.offsetX,
    targetCanvas.height / 2 + transform.offsetY,
  );
  targetMaskContext.rotate(degreesToRadians(transform.rotationDegrees));
  targetMaskContext.scale(scale, scale);
  targetMaskContext.drawImage(
    sourceMaskCanvas,
    -imageSize.width / 2,
    -imageSize.height / 2,
    imageSize.width,
    imageSize.height,
  );
  targetMaskContext.restore();

  const maskPixels = targetMaskContext.getImageData(
    0,
    0,
    targetMaskCanvas.width,
    targetMaskCanvas.height,
  ).data;
  const targetAlpha = new Float32Array(targetMaskCanvas.width * targetMaskCanvas.height);

  for (let pixelIndex = 0; pixelIndex < targetAlpha.length; pixelIndex += 1) {
    targetAlpha[pixelIndex] = maskPixels[pixelIndex * 4] / 255;
  }

  return targetAlpha;
}

function getSourceMaskCanvas(
  rawMask: BackgroundMaskData,
  imageSize: Size,
  backgroundEdit: BackgroundEditState,
): HTMLCanvasElement {
  const cacheKey = getSourceMaskCanvasCacheKey(imageSize, backgroundEdit);
  const cachedEntry = sourceMaskCanvasCache.get(rawMask);

  if (cachedEntry?.key === cacheKey) {
    return cachedEntry.canvas;
  }

  const refinedAlpha = createRefinedAlphaMask(rawMask, imageSize, backgroundEdit);
  const canvas = createSourceMaskCanvas(rawMask, refinedAlpha);

  sourceMaskCanvasCache.set(rawMask, {
    key: cacheKey,
    canvas,
  });

  return canvas;
}

function getSourceMaskCanvasCacheKey(
  imageSize: Size,
  backgroundEdit: BackgroundEditState,
): string {
  return JSON.stringify({
    imageWidth: imageSize.width,
    imageHeight: imageSize.height,
    threshold: backgroundEdit.threshold,
    featherPx: backgroundEdit.featherPx,
    edgeSmoothingPx: backgroundEdit.edgeSmoothingPx,
    preserveHair: backgroundEdit.preserveHair,
    maskVersion: backgroundEdit.maskVersion,
    foregroundPoints: backgroundEdit.manualForegroundPoints,
    backgroundPoints: backgroundEdit.manualBackgroundPoints,
  });
}

function createSourceMaskCanvas(
  rawMask: BackgroundMaskData,
  alpha: Float32Array,
): HTMLCanvasElement {
  const sourceMaskCanvas = document.createElement("canvas");
  const sourceMaskContext = getCanvasContext(sourceMaskCanvas);

  sourceMaskCanvas.width = rawMask.width;
  sourceMaskCanvas.height = rawMask.height;

  const imageData = sourceMaskContext.createImageData(rawMask.width, rawMask.height);

  for (let index = 0; index < alpha.length; index += 1) {
    const pixelIndex = index * 4;
    const value = Math.round(clamp01(alpha[index]) * 255);

    imageData.data[pixelIndex] = value;
    imageData.data[pixelIndex + 1] = value;
    imageData.data[pixelIndex + 2] = value;
    imageData.data[pixelIndex + 3] = 255;
  }

  sourceMaskContext.putImageData(imageData, 0, 0);

  return sourceMaskCanvas;
}

function assertMatchingPixelLength(
  sourcePixels: Uint8ClampedArray,
  alphaMask: Float32Array,
): void {
  if (sourcePixels.length !== alphaMask.length * 4) {
    throw new Error("alpha mask size must match RGBA pixel data");
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
