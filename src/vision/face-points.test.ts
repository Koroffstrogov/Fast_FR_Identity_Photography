import { describe, expect, it } from "vitest";
import { DEFAULT_IMAGE_TRANSFORM } from "../core/geometry";
import {
  createFacePointsFromCandidate,
  findNearestFacePointKind,
} from "./face-points";

describe("face points", () => {
  it("creates eyes, chin and skull top points from an automatic candidate", () => {
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
      "eyesCenter",
      "chin",
      "skullTop",
    ]);
    expect(points[2]).toMatchObject({ xPx: 500, yPx: 64 });
  });

  it("selects the nearest visible face point inside the hit radius", () => {
    const pointKind = findNearestFacePointKind(
      [
        { kind: "eyesCenter", xPx: 500, yPx: 300 },
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
