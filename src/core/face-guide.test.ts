import { describe, expect, it } from "vitest";
import {
  FRANCE_ID_PHOTO_GUIDE,
  getFranceOfficialFaceGuide,
} from "./face-guide";

describe("France official face guide", () => {
  it("defines the 35 x 45 mm photo format", () => {
    const guide = getFranceOfficialFaceGuide();

    expect(guide.photoWidthMm).toBe(35);
    expect(guide.photoHeightMm).toBe(45);
  });

  it("defines the official face height range and target", () => {
    const guide = getFranceOfficialFaceGuide();

    expect(guide.faceHeightMinMm).toBe(32);
    expect(guide.faceHeightTargetMm).toBe(34);
    expect(guide.faceHeightMaxMm).toBe(36);
  });

  it("places the target skull and chin lines 34 mm apart", () => {
    expect(
      FRANCE_ID_PHOTO_GUIDE.chinYTargetMm -
        FRANCE_ID_PHOTO_GUIDE.skullTopYTargetMm,
    ).toBe(34);
  });

  it("places the minimum official face height at 32 mm", () => {
    expect(
      FRANCE_ID_PHOTO_GUIDE.chinYTargetMm -
        FRANCE_ID_PHOTO_GUIDE.skullTopYForFaceMinMm,
    ).toBe(32);
  });

  it("places the maximum official face height at 36 mm", () => {
    expect(
      FRANCE_ID_PHOTO_GUIDE.chinYTargetMm -
        FRANCE_ID_PHOTO_GUIDE.skullTopYForFaceMaxMm,
    ).toBe(36);
  });
});
