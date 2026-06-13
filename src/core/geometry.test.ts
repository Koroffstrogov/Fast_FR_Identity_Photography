import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMAGE_TRANSFORM,
  degreesToRadians,
  getCoverScale,
  getRenderedImageSize,
  scalePointerDeltaToCanvas,
} from "./geometry";

describe("geometry helpers", () => {
  it("calculates the cover scale between an image and a target canvas", () => {
    expect(getCoverScale({ width: 1000, height: 1000 }, { width: 413, height: 531 })).toBeCloseTo(
      0.531,
    );
  });

  it("calculates the rendered size after cover scaling and zoom", () => {
    expect(
      getRenderedImageSize(
        { width: 1000, height: 500 },
        { width: 413, height: 531 },
        { ...DEFAULT_IMAGE_TRANSFORM, zoom: 2 },
      ),
    ).toEqual({
      width: 2124,
      height: 1062,
    });
  });

  it("converts pointer movement from displayed pixels to backing canvas pixels", () => {
    expect(
      scalePointerDeltaToCanvas(
        { x: 10, y: 20 },
        { width: 206.5, height: 265.5 },
        { width: 413, height: 531 },
      ),
    ).toEqual({ x: 20, y: 40 });
  });

  it("converts degrees to radians", () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
  });
});
