import { describe, expect, it } from "vitest";
import {
  applyBackgroundToPixels,
  applyMaskPreviewToPixels,
  getBackgroundRenderMode,
  parseHexColor,
} from "./apply-background";
import { getDefaultBackgroundEditState } from "../core/photo-project";

describe("background application", () => {
  it("replaces background pixels using the alpha mask", () => {
    const sourcePixels = new Uint8ClampedArray([
      10, 20, 30, 255,
      200, 210, 220, 255,
    ]);
    const outputPixels = applyBackgroundToPixels(
      sourcePixels,
      new Float32Array([1, 0]),
      parseHexColor("#eeeeee"),
    );

    expect([...outputPixels]).toEqual([
      10, 20, 30, 255,
      238, 238, 238, 255,
    ]);
  });

  it("does not mutate the original pixel buffer", () => {
    const sourcePixels = new Uint8ClampedArray([10, 20, 30, 255]);

    applyBackgroundToPixels(sourcePixels, new Float32Array([0]), parseHexColor("#eeeeee"));

    expect([...sourcePixels]).toEqual([10, 20, 30, 255]);
  });

  it("creates a visible mask preview without changing alpha", () => {
    const outputPixels = applyMaskPreviewToPixels(
      new Uint8ClampedArray([100, 100, 100, 255]),
      new Float32Array([0]),
    );

    expect(outputPixels[0]).toBeGreaterThan(100);
    expect(outputPixels[3]).toBe(255);
  });

  it("uses replacement mode for clean exports when enabled", () => {
    const edit = {
      ...getDefaultBackgroundEditState(),
      enabled: true,
      mode: "mask-preview" as const,
    };

    expect(getBackgroundRenderMode(edit, "preview")).toBe("mask-preview");
    expect(getBackgroundRenderMode(edit, "export")).toBe("replace");
  });
});
