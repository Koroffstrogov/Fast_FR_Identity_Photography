import { describe, expect, it } from "vitest";
import { BackgroundMaskData } from "../core/photo-project";
import {
  boxBlurMask,
  createRefinedAlphaMask,
  thresholdMask,
} from "./mask-refinement";

describe("mask refinement", () => {
  it("applies a hard threshold to mask values", () => {
    expect([...thresholdMask([0.2, 0.5, 0.8], 0.5, 0)]).toEqual([0, 1, 1]);
  });

  it("softens uncertain mask values when feathering is enabled", () => {
    const alpha = thresholdMask([0.45, 0.5, 0.55], 0.5, 0.1);

    expect(alpha[0]).toBeGreaterThan(0);
    expect(alpha[0]).toBeLessThan(0.5);
    expect(alpha[2]).toBeGreaterThan(0.5);
    expect(alpha[2]).toBeLessThan(1);
  });

  it("smooths neighboring pixels with a box blur", () => {
    const blurredMask = boxBlurMask([0, 0, 0, 0, 1, 0, 0, 0, 0], 3, 3, 1);

    expect(blurredMask[4]).toBeLessThan(1);
    expect(blurredMask[0]).toBeGreaterThan(0);
  });

  it("uses manual foreground and background points to refine the mask", () => {
    const rawMask: BackgroundMaskData = {
      width: 5,
      height: 5,
      data: new Float32Array(25).fill(0.5),
      labels: ["background", "person"],
      source: "confidence",
    };
    const alpha = createRefinedAlphaMask(rawMask, { width: 100, height: 100 }, {
      threshold: 0.5,
      featherPx: 0,
      edgeSmoothingPx: 0,
      preserveHair: false,
      manualForegroundPoints: [{ x: 50, y: 50 }],
      manualBackgroundPoints: [{ x: 5, y: 5 }],
    });

    expect(alpha[12]).toBe(1);
    expect(alpha[0]).toBe(0);
  });
});
