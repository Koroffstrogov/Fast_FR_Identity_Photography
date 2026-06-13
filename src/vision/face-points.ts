import { ImageTransform, Point, Size } from "../core/geometry";
import {
  PhotoManualFacePoint,
  PhotoManualFacePointKind,
} from "../core/photo-project";
import { FaceCandidate } from "./face-landmarks";
import { sourceImagePointToCanvasPoint } from "./face-placement";

export const FACE_POINT_HIT_RADIUS_PX = 24;

export function createFacePointsFromCandidate(
  face: FaceCandidate,
  imageSize: Size,
): PhotoManualFacePoint[] {
  return [
    {
      kind: "eyesCenter",
      ...normalizedToPhotoPoint(face.eyesCenter, imageSize),
    },
    {
      kind: "chin",
      ...normalizedToPhotoPoint(face.chin, imageSize),
    },
    {
      kind: "skullTop",
      ...normalizedToPhotoPoint(face.estimatedSkullTop, imageSize),
    },
  ];
}

export function findNearestFacePointKind(
  facePoints: readonly PhotoManualFacePoint[],
  canvasPoint: Point,
  imageSize: Size,
  targetSize: Size,
  transform: ImageTransform,
  hitRadiusPx = FACE_POINT_HIT_RADIUS_PX,
): PhotoManualFacePointKind | null {
  let nearestPointKind: PhotoManualFacePointKind | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const point of facePoints) {
    const projectedPoint = sourceImagePointToCanvasPoint(
      { x: point.xPx, y: point.yPx },
      imageSize,
      targetSize,
      transform,
    );
    const distance = Math.hypot(
      projectedPoint.x - canvasPoint.x,
      projectedPoint.y - canvasPoint.y,
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPointKind = point.kind;
    }
  }

  return nearestDistance <= hitRadiusPx ? nearestPointKind : null;
}

function normalizedToPhotoPoint(
  point: { x: number; y: number },
  imageSize: Size,
): Pick<PhotoManualFacePoint, "xPx" | "yPx"> {
  return {
    xPx: point.x * imageSize.width,
    yPx: point.y * imageSize.height,
  };
}
