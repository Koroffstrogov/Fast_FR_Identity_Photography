import { describe, expect, it } from "vitest";
import {
  MaskLike,
  createForegroundMaskFromCategoryMask,
  createForegroundMaskFromConfidenceMasks,
  selectForegroundMaskIndex,
} from "./background-mask";

describe("background mask extraction", () => {
  it("selects the person mask when labels expose it", () => {
    expect(selectForegroundMaskIndex(["background", "person"], 2)).toBe(1);
  });

  it("falls back to the only confidence mask when labels are missing", () => {
    const mask = createFloatMask([0.1, 0.9], 2, 1);
    const selection = createForegroundMaskFromConfidenceMasks([mask], []);

    expect(selection.mask.data[0]).toBeCloseTo(0.1);
    expect(selection.mask.data[1]).toBeCloseTo(0.9);
    expect(selection.diagnostics).toHaveLength(1);
  });

  it("extracts foreground categories from category masks", () => {
    const mask = createCategoryMask([0, 1, 1, 0], 2, 2);
    const selection = createForegroundMaskFromCategoryMask(mask, [
      "background",
      "person",
    ]);

    expect([...selection.mask.data]).toEqual([0, 1, 1, 0]);
    expect(selection.mask.source).toBe("category");
  });
});

function createFloatMask(
  values: number[],
  width: number,
  height: number,
): MaskLike {
  return {
    width,
    height,
    getAsFloat32Array: () => new Float32Array(values),
  };
}

function createCategoryMask(
  values: number[],
  width: number,
  height: number,
): MaskLike {
  return {
    width,
    height,
    getAsUint8Array: () => new Uint8Array(values),
  };
}
