import { describe, expect, it } from "vitest";
import {
  getNextManualFacePointKind,
  upsertManualFacePoint,
} from "./photo-project";

describe("photo project manual face points", () => {
  it("returns the manual assistant point order", () => {
    expect(getNextManualFacePointKind([])).toBe("eyesCenter");
    expect(
      getNextManualFacePointKind([{ kind: "eyesCenter", xPx: 1, yPx: 2 }]),
    ).toBe("chin");
    expect(
      getNextManualFacePointKind([
        { kind: "eyesCenter", xPx: 1, yPx: 2 },
        { kind: "chin", xPx: 3, yPx: 4 },
      ]),
    ).toBe("skullTop");
  });

  it("upserts manual points while keeping display order", () => {
    const points = upsertManualFacePoint(
      [
        { kind: "chin", xPx: 10, yPx: 20 },
        { kind: "eyesCenter", xPx: 5, yPx: 8 },
      ],
      { kind: "chin", xPx: 30, yPx: 40 },
    );

    expect(points).toEqual([
      { kind: "eyesCenter", xPx: 5, yPx: 8 },
      { kind: "chin", xPx: 30, yPx: 40 },
    ]);
  });
});
