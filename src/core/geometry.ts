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

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;

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

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    throw new Error("zoom must be a finite number");
  }

  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function zoomTransformAtPoint(
  transform: ImageTransform,
  target: Size,
  canvasPoint: Point,
  nextZoom: number,
): ImageTransform {
  assertPositiveSize(target, "target");
  assertFinitePoint(canvasPoint, "canvasPoint");
  assertPositiveZoom(transform.zoom);

  const clampedZoom = clampZoom(nextZoom);
  const zoomRatio = clampedZoom / transform.zoom;
  const centerX = target.width / 2;
  const centerY = target.height / 2;
  const anchorFromCenterX = canvasPoint.x - centerX;
  const anchorFromCenterY = canvasPoint.y - centerY;

  return {
    ...transform,
    zoom: clampedZoom,
    offsetX: anchorFromCenterX - zoomRatio * (anchorFromCenterX - transform.offsetX),
    offsetY: anchorFromCenterY - zoomRatio * (anchorFromCenterY - transform.offsetY),
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

export function getCanvasPointFromClientPoint(
  clientPoint: Point,
  canvasRect: Size & Point,
  backingCanvas: Size,
): Point {
  assertFinitePoint(clientPoint, "clientPoint");
  assertPositiveSize(canvasRect, "canvasRect");
  assertPositiveSize(backingCanvas, "backingCanvas");

  return {
    x: (clientPoint.x - canvasRect.x) * (backingCanvas.width / canvasRect.width),
    y: (clientPoint.y - canvasRect.y) * (backingCanvas.height / canvasRect.height),
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

function assertFinitePoint(point: Point, label: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must contain finite coordinates`);
  }
}

function assertPositiveZoom(zoom: number): void {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error("zoom must be a positive finite number");
  }
}
