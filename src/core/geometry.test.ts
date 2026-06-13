import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMAGE_TRANSFORM,
  ZOOM_MAX,
  ZOOM_MIN,
  clampZoom,
  degreesToRadians,
  getCoverScale,
  getRenderedImageSize,
  scalePointerDeltaToCanvas,
  zoomTransformAtPoint,
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

  it("clamps zoom to the configured bounds", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(10)).toBe(ZOOM_MAX);
    expect(clampZoom(1.75)).toBe(1.75);
  });

  it("zooms around the selected canvas point", () => {
    const result = zoomTransformAtPoint(
      DEFAULT_IMAGE_TRANSFORM,
      { width: 413, height: 531 },
      { x: 300, y: 300 },
      2,
    );

    expect(result.zoom).toBe(2);
    expect(result.offsetX).toBeCloseTo(-93.5);
    expect(result.offsetY).toBeCloseTo(-34.5);
  });

  it("keeps the frame center fixed when zooming around the center", () => {
    const result = zoomTransformAtPoint(
      DEFAULT_IMAGE_TRANSFORM,
      { width: 413, height: 531 },
      { x: 206.5, y: 265.5 },
      2,
    );

    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });
});
