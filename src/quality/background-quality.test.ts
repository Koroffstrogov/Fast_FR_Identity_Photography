import { describe, expect, it } from "vitest";
import { analyzeBackgroundQuality } from "./background-quality";
import { QualityCheckId } from "./quality-types";

describe("background quality analysis", () => {
  it("passes a uniform light gray background", () => {
    const analysis = analyzeBackgroundQuality(createSolidPixels(20, 20, [221, 221, 221]));

    expect(getCheckStatus(analysis.checks, "backgroundUniform")).toBe("pass");
    expect(getCheckStatus(analysis.checks, "backgroundLightEnough")).toBe("pass");
    expect(getCheckStatus(analysis.checks, "backgroundNotPureWhite")).toBe("pass");
    expect(getCheckStatus(analysis.checks, "backgroundColorRecommended")).toBe("pass");
  });

  it("passes a uniform light blue background", () => {
    const analysis = analyzeBackgroundQuality(createSolidPixels(20, 20, [219, 234, 254]));

    expect(getCheckStatus(analysis.checks, "backgroundUniform")).toBe("pass");
    expect(getCheckStatus(analysis.checks, "backgroundLightEnough")).toBe("pass");
    expect(getCheckStatus(analysis.checks, "backgroundColorRecommended")).toBe("pass");
  });

  it("fails a pure white background", () => {
    const analysis = analyzeBackgroundQuality(createSolidPixels(20, 20, [255, 255, 255]));

    expect(getCheckStatus(analysis.checks, "backgroundNotPureWhite")).toBe("fail");
    expect(
      analysis.checks.find((check) => check.id === "backgroundNotPureWhite")?.message,
    ).toContain("fond blanc pur est interdit");
  });

  it("warns or fails a yellow light background", () => {
    const analysis = analyzeBackgroundQuality(createSolidPixels(20, 20, [246, 231, 170]));
    const status = getCheckStatus(analysis.checks, "backgroundColorRecommended");

    expect(["warning", "fail"]).toContain(status);
  });

  it("fails a heterogeneous shadowed background", () => {
    const analysis = analyzeBackgroundQuality(
      createVerticalSplitPixels(20, 20, [230, 230, 230], [155, 155, 155]),
    );

    expect(getCheckStatus(analysis.checks, "backgroundUniform")).toBe("fail");
    expect(getCheckStatus(analysis.checks, "backgroundNoStrongShadow")).toBe("fail");
  });
});

function getCheckStatus(
  checks: readonly { id: QualityCheckId; status: string }[],
  id: QualityCheckId,
): string {
  const check = checks.find((candidate) => candidate.id === id);

  if (!check) {
    throw new Error(`Missing check ${id}`);
  }

  return check.status;
}

function createSolidPixels(
  width: number,
  height: number,
  color: [number, number, number],
) {
  return createVerticalSplitPixels(width, height, color, color);
}

function createVerticalSplitPixels(
  width: number,
  height: number,
  leftColor: [number, number, number],
  rightColor: [number, number, number],
) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = x < width / 2 ? leftColor : rightColor;
      const index = (y * width + x) * 4;

      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = 255;
    }
  }

  return { data, width, height };
}
