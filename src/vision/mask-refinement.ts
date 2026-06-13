import {
  BackgroundEditState,
  BackgroundMaskData,
  BackgroundPoint,
} from "../core/photo-project";
import { Size } from "../core/geometry";

export type MaskRefinementOptions = Pick<
  BackgroundEditState,
  | "threshold"
  | "featherPx"
  | "edgeSmoothingPx"
  | "preserveHair"
  | "manualForegroundPoints"
  | "manualBackgroundPoints"
>;

export function createRefinedAlphaMask(
  rawMask: BackgroundMaskData,
  imageSize: Size,
  options: MaskRefinementOptions,
): Float32Array {
  const adjustedMask = applyManualPoints(
    rawMask,
    imageSize,
    options.manualForegroundPoints,
    options.manualBackgroundPoints,
    Math.max(28, options.featherPx * 4),
  );
  const smoothingRadius = sourcePxToMaskPx(
    options.edgeSmoothingPx,
    imageSize,
    rawMask,
  );
  const smoothedMask =
    smoothingRadius > 0
      ? boxBlurMask(adjustedMask, rawMask.width, rawMask.height, smoothingRadius)
      : adjustedMask;

  return thresholdMask(
    smoothedMask,
    clamp01(options.threshold),
    getThresholdSoftness(options.featherPx, options.preserveHair),
  );
}

export function thresholdMask(
  values: ArrayLike<number>,
  threshold: number,
  softness: number,
): Float32Array {
  const alpha = new Float32Array(values.length);
  const clampedThreshold = clamp01(threshold);
  const clampedSoftness = Math.max(0, softness);

  if (clampedSoftness === 0) {
    for (let index = 0; index < values.length; index += 1) {
      alpha[index] = values[index] >= clampedThreshold ? 1 : 0;
    }

    return alpha;
  }

  const min = clampedThreshold - clampedSoftness;
  const max = clampedThreshold + clampedSoftness;

  for (let index = 0; index < values.length; index += 1) {
    alpha[index] = smoothstep(min, max, values[index]);
  }

  return alpha;
}

export function boxBlurMask(
  values: ArrayLike<number>,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  if (radius <= 0) {
    return new Float32Array(values);
  }

  const output = new Float32Array(values.length);
  const blurRadius = Math.trunc(radius);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;

      for (let dy = -blurRadius; dy <= blurRadius; dy += 1) {
        const sampleY = y + dy;

        if (sampleY < 0 || sampleY >= height) {
          continue;
        }

        for (let dx = -blurRadius; dx <= blurRadius; dx += 1) {
          const sampleX = x + dx;

          if (sampleX < 0 || sampleX >= width) {
            continue;
          }

          sum += values[sampleY * width + sampleX];
          count += 1;
        }
      }

      output[y * width + x] = count > 0 ? sum / count : values[y * width + x];
    }
  }

  return output;
}

function applyManualPoints(
  rawMask: BackgroundMaskData,
  imageSize: Size,
  foregroundPoints: readonly BackgroundPoint[],
  backgroundPoints: readonly BackgroundPoint[],
  radiusSourcePx: number,
): Float32Array {
  const adjustedMask = new Float32Array(rawMask.data);

  for (const point of foregroundPoints) {
    paintSoftPoint(adjustedMask, rawMask, imageSize, point, radiusSourcePx, 1);
  }

  for (const point of backgroundPoints) {
    paintSoftPoint(adjustedMask, rawMask, imageSize, point, radiusSourcePx, 0);
  }

  return adjustedMask;
}

function paintSoftPoint(
  maskData: Float32Array,
  rawMask: BackgroundMaskData,
  imageSize: Size,
  point: BackgroundPoint,
  radiusSourcePx: number,
  targetValue: number,
): void {
  const radiusX = Math.max(1, (radiusSourcePx / imageSize.width) * rawMask.width);
  const radiusY = Math.max(1, (radiusSourcePx / imageSize.height) * rawMask.height);
  const radius = Math.max(radiusX, radiusY);
  const centerX = (point.x / imageSize.width) * rawMask.width;
  const centerY = (point.y / imageSize.height) * rawMask.height;
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(rawMask.width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(rawMask.height - 1, Math.ceil(centerY + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot((x - centerX) / radiusX, (y - centerY) / radiusY);

      if (distance > 1) {
        continue;
      }

      const influence = 1 - smoothstep(0.2, 1, distance);
      const index = y * rawMask.width + x;
      maskData[index] = maskData[index] * (1 - influence) + targetValue * influence;
    }
  }
}

function sourcePxToMaskPx(
  sourcePx: number,
  imageSize: Size,
  rawMask: BackgroundMaskData,
): number {
  if (sourcePx <= 0) {
    return 0;
  }

  const averageScale =
    (rawMask.width / imageSize.width + rawMask.height / imageSize.height) / 2;

  return Math.max(1, Math.round(sourcePx * averageScale));
}

function getThresholdSoftness(featherPx: number, preserveHair: boolean): number {
  const baseSoftness = Math.min(0.28, Math.max(0, featherPx) / 80);

  return preserveHair ? Math.max(baseSoftness, 0.08) : baseSoftness;
}

function smoothstep(min: number, max: number, value: number): number {
  if (max <= min) {
    return value >= max ? 1 : 0;
  }

  const normalizedValue = clamp01((value - min) / (max - min));

  return normalizedValue * normalizedValue * (3 - 2 * normalizedValue);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
