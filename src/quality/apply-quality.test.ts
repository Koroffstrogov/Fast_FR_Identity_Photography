import { describe, expect, it } from "vitest";
import { applyQualityToPixels } from "./apply-quality";
import { getDefaultQualityEditState } from "./quality-state";

describe("quality application", () => {
  it("applies exposure correction", () => {
    const output = applyQualityToPixels(
      new Uint8ClampedArray([100, 100, 100, 255]),
      1,
      1,
      {
        ...getDefaultQualityEditState(),
        enabled: true,
        exposureEv: 0.3,
      },
    );

    expect(output[0]).toBeGreaterThan(100);
    expect(output[3]).toBe(255);
  });

  it("applies contrast correction", () => {
    const output = applyQualityToPixels(
      new Uint8ClampedArray([80, 80, 80, 255, 180, 180, 180, 255]),
      2,
      1,
      {
        ...getDefaultQualityEditState(),
        enabled: true,
        contrast: 18,
      },
    );

    expect(output[0]).toBeLessThan(80);
    expect(output[4]).toBeGreaterThan(180);
  });

  it("applies saturation correction", () => {
    const output = applyQualityToPixels(
      new Uint8ClampedArray([140, 110, 90, 255]),
      1,
      1,
      {
        ...getDefaultQualityEditState(),
        enabled: true,
        saturation: 8,
      },
    );

    expect(output[0] - output[2]).toBeGreaterThan(50);
  });

  it("applies simple sharpness without changing alpha", () => {
    const output = applyQualityToPixels(
      new Uint8ClampedArray([
        80, 80, 80, 255, 80, 80, 80, 255, 80, 80, 80, 255,
        80, 80, 80, 255, 180, 180, 180, 255, 80, 80, 80, 255,
        80, 80, 80, 255, 80, 80, 80, 255, 80, 80, 80, 255,
      ]),
      3,
      3,
      {
        ...getDefaultQualityEditState(),
        enabled: true,
        sharpness: 12,
      },
    );

    expect(output[4 * 4]).toBeGreaterThan(180);
    expect(output[4 * 4 + 3]).toBe(255);
  });

  it("does not mutate the source pixels", () => {
    const source = new Uint8ClampedArray([100, 120, 140, 255]);

    applyQualityToPixels(source, 1, 1, {
      ...getDefaultQualityEditState(),
      enabled: true,
      brightness: 10,
    });

    expect([...source]).toEqual([100, 120, 140, 255]);
  });
});
