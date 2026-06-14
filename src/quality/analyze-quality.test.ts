import { describe, expect, it } from "vitest";
import {
  analyzeQuality,
  calculateLuminance,
  calculatePercentile,
  detectColorCast,
} from "./analyze-quality";

describe("quality analysis", () => {
  it("calculates luminance", () => {
    expect(calculateLuminance(255, 255, 255)).toBeCloseTo(255);
    expect(calculateLuminance(0, 0, 0)).toBe(0);
    expect(calculateLuminance(255, 0, 0)).toBeCloseTo(54.213);
  });

  it("calculates P05, P50 and P95 percentiles", () => {
    const values = Array.from({ length: 101 }, (_, index) => index);

    expect(calculatePercentile(values, 0.05)).toBeCloseTo(5);
    expect(calculatePercentile(values, 0.5)).toBeCloseTo(50);
    expect(calculatePercentile(values, 0.95)).toBeCloseTo(95);
  });

  it("detects a dark photo", () => {
    const diagnostics = analyzeQuality(createSolidPixels(12, 12, [55, 55, 55]));

    expect(diagnostics.meanLuminance).toBeLessThan(105);
    expect(diagnostics.warnings).toContain("Photo legerement sombre.");
    expect(diagnostics.status).not.toBe("ok");
  });

  it("detects a bright photo", () => {
    const diagnostics = analyzeQuality(createSolidPixels(12, 12, [232, 232, 232]));

    expect(diagnostics.meanLuminance).toBeGreaterThan(210);
    expect(diagnostics.warnings).toContain("Photo trop claire.");
    expect(diagnostics.status).not.toBe("ok");
  });

  it("detects low contrast", () => {
    const diagnostics = analyzeQuality(
      createGradientPixels(20, 10, 112, 148),
    );

    expect(diagnostics.contrastSpread).toBeLessThan(85);
    expect(diagnostics.warnings).toContain(
      "Contraste faible : rendu possiblement grisatre.",
    );
  });

  it("detects clipped shadows and highlights", () => {
    const diagnostics = analyzeQuality(
      createSplitPixels(20, 10, [
        [0, 0, 0],
        [255, 255, 255],
      ]),
    );

    expect(diagnostics.clippedShadowsPct).toBeGreaterThan(1.5);
    expect(diagnostics.clippedHighlightsPct).toBeGreaterThan(1.5);
    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        "Zones sombres potentiellement bouchees.",
        "Zones claires potentiellement brulees.",
      ]),
    );
  });

  it("detects approximate color casts", () => {
    expect(detectColorCast(150, 128, 105)).toBe("warm");
    expect(detectColorCast(105, 128, 150)).toBe("cool");
    expect(detectColorCast(110, 150, 112)).toBe("green");
    expect(detectColorCast(150, 110, 150)).toBe("magenta");
    expect(detectColorCast(130, 128, 126)).toBe("none");
  });

  it("keeps score between 0 and 100", () => {
    const diagnostics = analyzeQuality(createSplitPixels(8, 8, [
      [0, 0, 0],
      [255, 240, 210],
    ]));

    expect(diagnostics.score).toBeGreaterThanOrEqual(0);
    expect(diagnostics.score).toBeLessThanOrEqual(100);
  });
});

function createSolidPixels(
  width: number,
  height: number,
  color: [number, number, number],
) {
  return createSplitPixels(width, height, [color]);
}

function createGradientPixels(
  width: number,
  height: number,
  from: number,
  to: number,
) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ratio = width === 1 ? 0 : x / (width - 1);
      const value = Math.round(from * (1 - ratio) + to * ratio);
      const index = (y * width + x) * 4;

      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  return { data, width, height };
}

function createSplitPixels(
  width: number,
  height: number,
  colors: readonly [number, number, number][],
) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const color = colors[pixelIndex % colors.length];
    const index = pixelIndex * 4;

    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = 255;
  }

  return { data, width, height };
}
