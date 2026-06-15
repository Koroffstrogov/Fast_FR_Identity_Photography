import { describe, expect, it } from "vitest";
import {
  addBackgroundPoint,
  getDefaultBackgroundEditState,
  getNextManualFacePointKind,
  hasAllFacePoints,
  resetBackgroundPoints,
  upsertManualFacePoint,
} from "./photo-project";

describe("photo project manual face points", () => {
  it("returns the manual assistant point order", () => {
    expect(getNextManualFacePointKind([])).toBe("leftEye");
    expect(
      getNextManualFacePointKind([{ kind: "leftEye", xPx: 1, yPx: 2 }]),
    ).toBe("rightEye");
    expect(
      getNextManualFacePointKind([
        { kind: "leftEye", xPx: 1, yPx: 2 },
        { kind: "rightEye", xPx: 2, yPx: 3 },
      ]),
    ).toBe("chin");
    expect(
      getNextManualFacePointKind([
        { kind: "leftEye", xPx: 1, yPx: 2 },
        { kind: "rightEye", xPx: 2, yPx: 3 },
        { kind: "chin", xPx: 3, yPx: 4 },
      ]),
    ).toBe("skullTop");
  });

  it("upserts manual points while keeping display order", () => {
    const points = upsertManualFacePoint(
      [
        { kind: "chin", xPx: 10, yPx: 20 },
        { kind: "rightEye", xPx: 8, yPx: 8 },
        { kind: "leftEye", xPx: 5, yPx: 8 },
      ],
      { kind: "chin", xPx: 30, yPx: 40 },
    );

    expect(points).toEqual([
      { kind: "leftEye", xPx: 5, yPx: 8 },
      { kind: "rightEye", xPx: 8, yPx: 8 },
      { kind: "chin", xPx: 30, yPx: 40 },
    ]);
  });

  it("requires both eyes and chin for point-based framing", () => {
    expect(
      hasAllFacePoints([
        { kind: "leftEye", xPx: 5, yPx: 8 },
        { kind: "chin", xPx: 30, yPx: 40 },
      ]),
    ).toBe(false);
    expect(
      hasAllFacePoints([
        { kind: "leftEye", xPx: 5, yPx: 8 },
        { kind: "rightEye", xPx: 15, yPx: 8 },
        { kind: "chin", xPx: 30, yPx: 40 },
      ]),
    ).toBe(true);
  });

  it("keeps legacy eyes center points compatible when skull top is present", () => {
    expect(
      hasAllFacePoints([
        { kind: "eyesCenter", xPx: 5, yPx: 8 },
        { kind: "chin", xPx: 30, yPx: 40 },
        { kind: "skullTop", xPx: 20, yPx: 10 },
      ]),
    ).toBe(true);
  });
});

describe("photo project background points", () => {
  it("uses a low default threshold for progressive RMBG masks", () => {
    expect(getDefaultBackgroundEditState().threshold).toBe(0.15);
  });

  it("stores foreground and background points independently", () => {
    const backgroundEdit = getDefaultBackgroundEditState();
    const withForegroundPoint = addBackgroundPoint(
      backgroundEdit,
      "foreground",
      { x: 10, y: 20 },
    );
    const withBackgroundPoint = addBackgroundPoint(
      withForegroundPoint,
      "background",
      { x: 30, y: 40 },
    );

    expect(withBackgroundPoint.manualForegroundPoints).toEqual([{ x: 10, y: 20 }]);
    expect(withBackgroundPoint.manualBackgroundPoints).toEqual([{ x: 30, y: 40 }]);
    expect(withBackgroundPoint.maskVersion).toBe(2);
  });

  it("resets correction points and increments mask version", () => {
    const backgroundEdit = addBackgroundPoint(
      getDefaultBackgroundEditState(),
      "foreground",
      { x: 10, y: 20 },
    );
    const resetEdit = resetBackgroundPoints(backgroundEdit);

    expect(resetEdit.manualForegroundPoints).toEqual([]);
    expect(resetEdit.manualBackgroundPoints).toEqual([]);
    expect(resetEdit.maskVersion).toBe(2);
  });
});
