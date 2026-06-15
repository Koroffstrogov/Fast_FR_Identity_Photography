import { describe, expect, it } from "vitest";
import { DEFAULT_IMAGE_TRANSFORM } from "../core/geometry";
import {
  createFacePointsFromCandidate,
  findNearestFacePointKind,
} from "./face-points";

describe("face points", () => {
  it("creates left eye, right eye, chin and skull top points from an automatic candidate", () => {
    const points = createFacePointsFromCandidate(
      {
        index: 0,
        landmarks: [],
        leftEye: { x: 0.4, y: 0.4 },
        rightEye: { x: 0.6, y: 0.4 },
        eyesCenter: { x: 0.5, y: 0.4 },
        chin: { x: 0.5, y: 0.78 },
        estimatedSkullTop: { x: 0.5, y: 0.08 },
        bounds: {
          minX: 0.3,
          minY: 0.08,
          maxX: 0.7,
          maxY: 0.8,
          width: 0.4,
          height: 0.72,
          area: 0.288,
        },
        rollDegrees: 0,
        diagnostics: [],
      },
      { width: 1000, height: 800 },
    );

    expect(points.map((point) => point.kind)).toEqual([
      "leftEye",
      "rightEye",
      "chin",
      "skullTop",
    ]);
    expect(points[0]).toMatchObject({ xPx: 400, yPx: 320 });
    expect(points[1]).toMatchObject({ xPx: 600, yPx: 320 });
    expect(points[3]).toMatchObject({ xPx: 500, yPx: 64 });
  });

  it("normalizes automatic eyes from the screen point of view", () => {
    const points = createFacePointsFromCandidate(
      {
        index: 0,
        landmarks: [],
        leftEye: { x: 0.65, y: 0.4 },
        rightEye: { x: 0.35, y: 0.42 },
        eyesCenter: { x: 0.5, y: 0.41 },
        chin: { x: 0.5, y: 0.78 },
        estimatedSkullTop: { x: 0.5, y: 0.08 },
        bounds: {
          minX: 0.3,
          minY: 0.08,
          maxX: 0.7,
          maxY: 0.8,
          width: 0.4,
          height: 0.72,
          area: 0.288,
        },
        rollDegrees: 0,
        diagnostics: [],
      },
      { width: 1000, height: 800 },
    );

    expect(points[0]).toMatchObject({ kind: "leftEye", xPx: 350, yPx: 336 });
    expect(points[1]).toMatchObject({ kind: "rightEye", xPx: 650, yPx: 320 });
  });

  it("selects the nearest visible face point inside the hit radius", () => {
    const pointKind = findNearestFacePointKind(
      [
        { kind: "leftEye", xPx: 450, yPx: 300 },
        { kind: "rightEye", xPx: 550, yPx: 300 },
        { kind: "chin", xPx: 500, yPx: 650 },
        { kind: "skullTop", xPx: 500, yPx: 80 },
      ],
      { x: 206, y: 345 },
      { width: 1000, height: 1000 },
      { width: 413, height: 531 },
      DEFAULT_IMAGE_TRANSFORM,
    );

    expect(pointKind).toBe("chin");
  });
});
