import { describe, expect, it } from "vitest";
import { getFranceOfficialFaceGuide } from "../core/face-guide";
import { DEFAULT_IMAGE_TRANSFORM, ZOOM_MAX, ZOOM_MIN } from "../core/geometry";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoManualFacePoint } from "../core/photo-project";
import {
  canvasPointToSourceImagePoint,
  createFacePlacementFromCandidate,
  createFacePlacementFromManualPoints,
  createFacePlacementFromSourcePoints,
  sourceImagePointToCanvasPoint,
} from "./face-placement";

describe("face placement", () => {
  it("converts manual face points into an image transform", () => {
    const placement = createFacePlacementFromManualPoints(
      [
        { kind: "eyesCenter", xPx: 500, yPx: 430 },
        { kind: "chin", xPx: 500, yPx: 700 },
      ],
      { width: 1000, height: 1000 },
    );

    expect(placement.transform).not.toBeNull();
    expect(placement.transform?.zoom).toBeGreaterThanOrEqual(ZOOM_MIN);
    expect(placement.transform?.zoom).toBeLessThanOrEqual(ZOOM_MAX);
    expect(Number.isFinite(placement.transform?.offsetY)).toBe(true);
  });

  it("does not return a transform when manual points are incomplete", () => {
    const placement = createFacePlacementFromManualPoints(
      [{ kind: "eyesCenter", xPx: 500, yPx: 430 }],
      { width: 1000, height: 1000 },
    );

    expect(placement.transform).toBeNull();
    expect(placement.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "incomplete-landmarks",
    );
  });

  it("clamps zoom to the minimum available value", () => {
    const placement = createFacePlacementFromManualPoints(
      [
        { kind: "eyesCenter", xPx: 500, yPx: 0 },
        { kind: "chin", xPx: 500, yPx: 1000 },
      ],
      { width: 1000, height: 1000 },
    );

    expect(placement.transform?.zoom).toBe(ZOOM_MIN);
    expect(placement.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "zoom-clamped",
    );
  });

  it("clamps zoom to the maximum available value", () => {
    const placement = createFacePlacementFromManualPoints(
      [
        { kind: "eyesCenter", xPx: 500, yPx: 500 },
        { kind: "chin", xPx: 500, yPx: 505 },
      ],
      { width: 1000, height: 1000 },
    );

    expect(placement.transform?.zoom).toBe(ZOOM_MAX);
    expect(placement.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "zoom-clamped",
    );
  });

  it("uses the eye axis to propose a rotation", () => {
    const placement = createFacePlacementFromSourcePoints(
      {
        leftEye: { x: 360, y: 420 },
        rightEye: { x: 640, y: 470 },
        eyesCenter: { x: 500, y: 445 },
        chin: { x: 500, y: 700 },
      },
      { width: 1000, height: 1000 },
    );

    expect(placement.transform?.rotationDegrees).toBeLessThan(0);
  });

  it("prioritizes the automatic skull top and chin over the indicative eye line", () => {
    const placementFromCandidate = createFacePlacementFromCandidate(
      {
        index: 0,
        landmarks: [],
        leftEye: { x: 0.36, y: 0.42 },
        rightEye: { x: 0.64, y: 0.42 },
        eyesCenter: { x: 0.5, y: 0.42 },
        chin: { x: 0.5, y: 0.78 },
        estimatedSkullTop: { x: 0.5, y: 0.08 },
        bounds: {
          minX: 0.32,
          minY: 0.22,
          maxX: 0.68,
          maxY: 0.8,
          width: 0.36,
          height: 0.58,
          area: 0.2088,
        },
        rollDegrees: 0,
        diagnostics: [],
      },
      { width: 1000, height: 1000 },
    );
    const transform = placementFromCandidate.transform;
    const imageSize = { width: 1000, height: 1000 };
    const canvasSize = { width: PHOTO_FORMAT.widthPx, height: PHOTO_FORMAT.heightPx };
    const guide = getFranceOfficialFaceGuide();
    const skullTargetY = guideYToCanvasY(guide.skullTopTargetLine.yMm);
    const chinTargetY = guideYToCanvasY(guide.chinLine.yMm);
    const eyeTargetY = guideYToCanvasY(guide.eyeLine.yMm);

    expect(transform).not.toBeNull();

    const skullCanvasPoint = sourceImagePointToCanvasPoint(
      { x: 500, y: 80 },
      imageSize,
      canvasSize,
      transform!,
    );
    const chinCanvasPoint = sourceImagePointToCanvasPoint(
      { x: 500, y: 780 },
      imageSize,
      canvasSize,
      transform!,
    );
    const eyeCanvasPoint = sourceImagePointToCanvasPoint(
      { x: 500, y: 420 },
      imageSize,
      canvasSize,
      transform!,
    );

    expect(skullCanvasPoint.y).toBeCloseTo(skullTargetY, 1);
    expect(chinCanvasPoint.y).toBeCloseTo(chinTargetY, 1);
    expect(Math.abs(eyeCanvasPoint.y - eyeTargetY)).toBeGreaterThan(4);
  });

  it("round-trips a canvas point through source image coordinates", () => {
    const imageSize = { width: 1000, height: 800 };
    const canvasSize = { width: 413, height: 531 };
    const sourcePoint = { x: 450, y: 380 };
    const transform = {
      ...DEFAULT_IMAGE_TRANSFORM,
      zoom: 1.4,
      offsetX: 12,
      offsetY: -18,
      rotationDegrees: 7,
    };
    const canvasPoint = sourceImagePointToCanvasPoint(
      sourcePoint,
      imageSize,
      canvasSize,
      transform,
    );
    const restoredSourcePoint = canvasPointToSourceImagePoint(
      canvasPoint,
      imageSize,
      canvasSize,
      transform,
    );

    expect(restoredSourcePoint.x).toBeCloseTo(sourcePoint.x);
    expect(restoredSourcePoint.y).toBeCloseTo(sourcePoint.y);
  });

  it("uses an optional skull top point for manual target face height", () => {
    const manualPoints: PhotoManualFacePoint[] = [
      { kind: "eyesCenter", xPx: 500, yPx: 430 },
      { kind: "chin", xPx: 500, yPx: 770 },
      { kind: "skullTop", xPx: 500, yPx: 170 },
    ];
    const placement = createFacePlacementFromManualPoints(manualPoints, {
      width: 1000,
      height: 1000,
    });

    expect(placement.transform).not.toBeNull();
    expect(placement.message).toContain("manuel");
  });
});

function guideYToCanvasY(yMm: number): number {
  return (yMm / getFranceOfficialFaceGuide().photoHeightMm) * PHOTO_FORMAT.heightPx;
}
