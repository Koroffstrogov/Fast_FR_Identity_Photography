export type Size = {
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export type ImageTransform = {
  offsetX: number;
  offsetY: number;
  zoom: number;
  rotationDegrees: number;
};

export const DEFAULT_IMAGE_TRANSFORM: ImageTransform = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  rotationDegrees: 0,
};

export function getCoverScale(source: Size, target: Size): number {
  assertPositiveSize(source, "source");
  assertPositiveSize(target, "target");

  return Math.max(target.width / source.width, target.height / source.height);
}

export function degreesToRadians(degrees: number): number {
  if (!Number.isFinite(degrees)) {
    throw new Error("degrees must be a finite number");
  }

  return (degrees * Math.PI) / 180;
}

export function getRenderedImageSize(
  source: Size,
  target: Size,
  transform: ImageTransform,
): Size {
  assertPositiveSize(source, "source");
  assertPositiveSize(target, "target");
  assertPositiveZoom(transform.zoom);

  const scale = getCoverScale(source, target) * transform.zoom;

  return {
    width: source.width * scale,
    height: source.height * scale,
  };
}

export function scalePointerDeltaToCanvas(
  delta: Point,
  displayedCanvas: Size,
  backingCanvas: Size,
): Point {
  assertPositiveSize(displayedCanvas, "displayedCanvas");
  assertPositiveSize(backingCanvas, "backingCanvas");

  return {
    x: delta.x * (backingCanvas.width / displayedCanvas.width),
    y: delta.y * (backingCanvas.height / displayedCanvas.height),
  };
}

function assertPositiveSize(size: Size, label: string): void {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new Error(`${label} size must contain positive finite dimensions`);
  }
}

function assertPositiveZoom(zoom: number): void {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error("zoom must be a positive finite number");
  }
}
