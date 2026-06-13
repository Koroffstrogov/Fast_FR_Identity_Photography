import { describe, expect, it } from "vitest";
import {
  NormalizedFaceLandmark,
  analyzeFaceLandmarks,
  calculateEyeAngleDegrees,
  extractFaceCandidate,
  selectLargestFace,
} from "./face-landmarks";

describe("face landmarks helpers", () => {
  it("calculates the angle between two eyes", () => {
    expect(
      calculateEyeAngleDegrees(
        { x: 0.3, y: 0.4 },
        { x: 0.7, y: 0.5 },
      ),
    ).toBeCloseTo(14.04, 2);
  });

  it("converts simulated landmarks into useful face points", () => {
    const candidate = extractFaceCandidate(createFaceLandmarks(), 0);

    expect(candidate).not.toBeNull();
    expect(candidate?.eyesCenter.x).toBeCloseTo(0.5);
    expect(candidate?.chin.y).toBeCloseTo(0.78);
    expect(candidate?.estimatedSkullTop.y).toBeCloseTo(0.2);
  });

  it("selects the largest face among simulated results", () => {
    const smallFace = extractFaceCandidate(
      createFaceLandmarks({
        leftEye: { x: 0.42, y: 0.42 },
        rightEye: { x: 0.58, y: 0.42 },
        chin: { x: 0.5, y: 0.62 },
        top: { x: 0.5, y: 0.32 },
      }),
      0,
    );
    const largeFace = extractFaceCandidate(createFaceLandmarks(), 1);

    expect(selectLargestFace([smallFace!, largeFace!])?.index).toBe(1);
  });

  it("reports no face without a selected candidate", () => {
    const analysis = analyzeFaceLandmarks([]);

    expect(analysis.selectedFace).toBeNull();
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "no-face",
    );
  });

  it("reports multiple faces and keeps list order separate from largest selection", () => {
    const analysis = analyzeFaceLandmarks([
      createFaceLandmarks({
        leftEye: { x: 0.42, y: 0.42 },
        rightEye: { x: 0.58, y: 0.42 },
        chin: { x: 0.5, y: 0.62 },
        top: { x: 0.5, y: 0.32 },
      }),
      createFaceLandmarks(),
    ]);

    expect(analysis.selectedFace?.index).toBe(1);
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "multiple-faces",
    );
  });

  it("diagnoses tilted and small faces", () => {
    const analysis = analyzeFaceLandmarks([
      createFaceLandmarks({
        leftEye: { x: 0.46, y: 0.46 },
        rightEye: { x: 0.56, y: 0.54 },
        chin: { x: 0.51, y: 0.61 },
        top: { x: 0.51, y: 0.43 },
      }),
    ]);

    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["face-too-tilted", "face-too-small"]),
    );
  });
});

function createFaceLandmarks(
  options: {
    leftEye?: NormalizedFaceLandmark;
    rightEye?: NormalizedFaceLandmark;
    chin?: NormalizedFaceLandmark;
    top?: NormalizedFaceLandmark;
  } = {},
): NormalizedFaceLandmark[] {
  const landmarks: NormalizedFaceLandmark[] = [];
  const leftEye = options.leftEye ?? { x: 0.34, y: 0.42 };
  const rightEye = options.rightEye ?? { x: 0.66, y: 0.42 };
  const chin = options.chin ?? { x: 0.5, y: 0.78 };
  const top = options.top ?? { x: 0.5, y: 0.2 };

  [33, 133, 159, 145].forEach((index) => {
    landmarks[index] = leftEye;
  });
  [263, 362, 386, 374].forEach((index) => {
    landmarks[index] = rightEye;
  });
  landmarks[10] = top;
  landmarks[152] = chin;

  return landmarks;
}
