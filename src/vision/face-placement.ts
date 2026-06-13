import { getFranceOfficialFaceGuide } from "../core/face-guide";
import {
  ImageTransform,
  Point,
  Size,
  clampZoom,
  degreesToRadians,
  getCoverScale,
} from "../core/geometry";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoManualFacePoint } from "../core/photo-project";
import {
  FaceCandidate,
  FaceDiagnostic,
  calculateEyeAngleDegrees,
} from "./face-landmarks";

export type FacePlacementResult = {
  transform: ImageTransform | null;
  diagnostics: FaceDiagnostic[];
  message: string;
};

export type SourceFacePoints = {
  eyesCenter: Point;
  chin: Point;
  skullTop?: Point;
  leftEye?: Point;
  rightEye?: Point;
};

const PHOTO_CANVAS_SIZE: Size = {
  width: PHOTO_FORMAT.widthPx,
  height: PHOTO_FORMAT.heightPx,
};
const ROTATION_MIN_DEGREES = -20;
const ROTATION_MAX_DEGREES = 20;

export function createFacePlacementFromCandidate(
  face: FaceCandidate,
  imageSize: Size,
): FacePlacementResult {
  return createFacePlacementFromSourcePoints(
    {
      eyesCenter: normalizedToImagePoint(face.eyesCenter, imageSize),
      chin: normalizedToImagePoint(face.chin, imageSize),
      skullTop: normalizedToImagePoint(face.estimatedSkullTop, imageSize),
      leftEye: normalizedToImagePoint(face.leftEye, imageSize),
      rightEye: normalizedToImagePoint(face.rightEye, imageSize),
    },
    imageSize,
    face.diagnostics,
    "Cadrage propose automatiquement. Verifiez le menton, le sommet du crane et les yeux.",
  );
}

export function createFacePlacementFromManualPoints(
  manualPoints: readonly PhotoManualFacePoint[],
  imageSize: Size,
): FacePlacementResult {
  return createFacePlacementFromFacePoints(
    manualPoints,
    imageSize,
    "Cadrage manuel applique. Verifiez le guide avant export.",
  );
}

export function createFacePlacementFromFacePoints(
  manualPoints: readonly PhotoManualFacePoint[],
  imageSize: Size,
  message = "Cadrage applique a partir des points visage. Verifiez le guide avant export.",
): FacePlacementResult {
  const eyesCenter = getManualPoint(manualPoints, "eyesCenter");
  const chin = getManualPoint(manualPoints, "chin");
  const skullTop = getManualPoint(manualPoints, "skullTop");

  if (!eyesCenter || !chin) {
    return {
      transform: null,
      diagnostics: [
        {
          code: "incomplete-landmarks",
          severity: "warning",
          message: "Placez au minimum le centre des yeux et le menton.",
        },
      ],
      message: "Placez au minimum le centre des yeux et le menton.",
    };
  }

  return createFacePlacementFromSourcePoints(
    {
      eyesCenter,
      chin,
      ...(skullTop ? { skullTop } : {}),
    },
    imageSize,
    [],
    message,
  );
}

export function createFacePlacementFromSourcePoints(
  points: SourceFacePoints,
  imageSize: Size,
  initialDiagnostics: readonly FaceDiagnostic[] = [],
  message = "Cadrage propose. Verifiez les reperes avant export.",
): FacePlacementResult {
  assertPositiveSize(imageSize, "imageSize");
  assertFinitePoint(points.eyesCenter, "eyesCenter");
  assertFinitePoint(points.chin, "chin");

  if (points.skullTop) {
    assertFinitePoint(points.skullTop, "skullTop");
  }

  const guide = getFranceOfficialFaceGuide();
  const targetEyes = {
    x: PHOTO_CANVAS_SIZE.width / 2,
    y: mmToCanvasYPx(guide.eyeLine.yMm),
  };
  const targetChin = {
    x: PHOTO_CANVAS_SIZE.width / 2,
    y: mmToCanvasYPx(guide.chinLine.yMm),
  };
  const targetSkullTop = {
    x: PHOTO_CANVAS_SIZE.width / 2,
    y: mmToCanvasYPx(guide.skullTopTargetLine.yMm),
  };
  const rotationDegrees = getPlacementRotationDegrees(points);
  const desiredDistancePx = points.skullTop
    ? targetChin.y - targetSkullTop.y
    : mmToCanvasYPx(guide.chinLine.yMm) - mmToCanvasYPx(guide.eyeLine.yMm);
  const sourceDistancePx = points.skullTop
    ? getDistance(points.chin, points.skullTop)
    : getDistance(points.chin, points.eyesCenter);

  if (sourceDistancePx <= 0) {
    return {
      transform: null,
      diagnostics: [
        ...initialDiagnostics,
        {
          code: "incomplete-landmarks",
          severity: "warning",
          message: "Les points visage sont trop proches pour calculer un cadrage.",
        },
      ],
      message: "Les points visage sont trop proches pour calculer un cadrage.",
    };
  }

  const coverScale = getCoverScale(imageSize, PHOTO_CANVAS_SIZE);
  const rawZoom = desiredDistancePx / sourceDistancePx / coverScale;
  const zoom = clampZoom(rawZoom);
  const scale = coverScale * zoom;
  const chinOffset = getOffsetForSourcePoint({
    sourcePoint: points.chin,
    targetPoint: targetChin,
    imageSize,
    rotationDegrees,
    scale,
  });
  const secondaryOffset = points.skullTop
    ? getOffsetForSourcePoint({
        sourcePoint: points.skullTop,
        targetPoint: targetSkullTop,
        imageSize,
        rotationDegrees,
        scale,
      })
    : getOffsetForSourcePoint({
        sourcePoint: points.eyesCenter,
        targetPoint: targetEyes,
        imageSize,
        rotationDegrees,
        scale,
      });
  const diagnostics = [...initialDiagnostics];

  if (zoom !== rawZoom) {
    diagnostics.push({
      code: "zoom-clamped",
      severity: "warning",
      message: "Le zoom propose a ete limite aux bornes disponibles.",
    });
  }

  return {
    transform: {
      offsetX: (secondaryOffset.x + chinOffset.x) / 2,
      offsetY: (secondaryOffset.y + chinOffset.y) / 2,
      zoom,
      rotationDegrees,
    },
    diagnostics,
    message,
  };
}

export function sourceImagePointToCanvasPoint(
  sourcePoint: Point,
  imageSize: Size,
  targetSize: Size,
  transform: ImageTransform,
): Point {
  assertFinitePoint(sourcePoint, "sourcePoint");
  assertPositiveSize(imageSize, "imageSize");
  assertPositiveSize(targetSize, "targetSize");

  const scale = getCoverScale(imageSize, targetSize) * transform.zoom;
  const relX = sourcePoint.x - imageSize.width / 2;
  const relY = sourcePoint.y - imageSize.height / 2;
  const rotated = rotatePoint({ x: relX, y: relY }, transform.rotationDegrees);

  return {
    x: targetSize.width / 2 + transform.offsetX + rotated.x * scale,
    y: targetSize.height / 2 + transform.offsetY + rotated.y * scale,
  };
}

export function canvasPointToSourceImagePoint(
  canvasPoint: Point,
  imageSize: Size,
  targetSize: Size,
  transform: ImageTransform,
): Point {
  assertFinitePoint(canvasPoint, "canvasPoint");
  assertPositiveSize(imageSize, "imageSize");
  assertPositiveSize(targetSize, "targetSize");

  const scale = getCoverScale(imageSize, targetSize) * transform.zoom;
  const relX = (canvasPoint.x - targetSize.width / 2 - transform.offsetX) / scale;
  const relY = (canvasPoint.y - targetSize.height / 2 - transform.offsetY) / scale;
  const unrotated = rotatePoint({ x: relX, y: relY }, -transform.rotationDegrees);

  return {
    x: clamp(unrotated.x + imageSize.width / 2, 0, imageSize.width),
    y: clamp(unrotated.y + imageSize.height / 2, 0, imageSize.height),
  };
}

function getPlacementRotationDegrees(points: SourceFacePoints): number {
  if (!points.leftEye || !points.rightEye) {
    return 0;
  }

  const angleDegrees = calculateEyeAngleDegrees(points.leftEye, points.rightEye);

  return clamp(-angleDegrees, ROTATION_MIN_DEGREES, ROTATION_MAX_DEGREES);
}

function getOffsetForSourcePoint({
  sourcePoint,
  targetPoint,
  imageSize,
  rotationDegrees,
  scale,
}: {
  sourcePoint: Point;
  targetPoint: Point;
  imageSize: Size;
  rotationDegrees: number;
  scale: number;
}): Point {
  const relX = sourcePoint.x - imageSize.width / 2;
  const relY = sourcePoint.y - imageSize.height / 2;
  const rotated = rotatePoint({ x: relX, y: relY }, rotationDegrees);
  const projectedX = PHOTO_CANVAS_SIZE.width / 2 + rotated.x * scale;
  const projectedY = PHOTO_CANVAS_SIZE.height / 2 + rotated.y * scale;

  return {
    x: targetPoint.x - projectedX,
    y: targetPoint.y - projectedY,
  };
}

function getManualPoint(
  manualPoints: readonly PhotoManualFacePoint[],
  kind: PhotoManualFacePoint["kind"],
): Point | null {
  const point = manualPoints.find((manualPoint) => manualPoint.kind === kind);

  return point ? { x: point.xPx, y: point.yPx } : null;
}

function normalizedToImagePoint(
  point: { x: number; y: number },
  imageSize: Size,
): Point {
  return {
    x: point.x * imageSize.width,
    y: point.y * imageSize.height,
  };
}

function mmToCanvasYPx(yMm: number): number {
  const guide = getFranceOfficialFaceGuide();

  return (yMm / guide.photoHeightMm) * PHOTO_FORMAT.heightPx;
}

function rotatePoint(point: Point, degrees: number): Point {
  const radians = degreesToRadians(degrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function getDistance(firstPoint: Point, secondPoint: Point): number {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function assertFinitePoint(point: Point, label: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must contain finite coordinates`);
  }
}

function assertPositiveSize(size: Size, label: string): void {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new Error(`${label} must contain positive finite dimensions`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
