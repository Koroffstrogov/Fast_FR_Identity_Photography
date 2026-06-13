import { describe, expect, it } from "vitest";
import { DEFAULT_IMAGE_TRANSFORM, ZOOM_MAX, ZOOM_MIN } from "../core/geometry";
import { PhotoManualFacePoint } from "../core/photo-project";
import {
  canvasPointToSourceImagePoint,
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
