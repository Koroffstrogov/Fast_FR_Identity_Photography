import { describe, expect, it } from "vitest";
import {
  PHOTO_DPI,
  PHOTO_FORMAT,
  PHOTO_HEIGHT_MM,
  PHOTO_WIDTH_MM,
  millimetersToPixels,
} from "./photo-format";

describe("photo format constants", () => {
  it("defines a 35 x 45 mm format at 300 dpi", () => {
    expect(PHOTO_FORMAT.widthMm).toBe(PHOTO_WIDTH_MM);
    expect(PHOTO_FORMAT.heightMm).toBe(PHOTO_HEIGHT_MM);
    expect(PHOTO_FORMAT.dpi).toBe(PHOTO_DPI);
    expect(PHOTO_FORMAT.mimeType).toBe("image/jpeg");
  });

  it("rounds the requested format to the required JPEG pixel dimensions", () => {
    expect(PHOTO_FORMAT.widthPx).toBe(413);
    expect(PHOTO_FORMAT.heightPx).toBe(531);
  });

  it("converts millimeters to pixels at the supplied dpi", () => {
    expect(millimetersToPixels(25.4, 300)).toBe(300);
    expect(millimetersToPixels(10, 300)).toBe(118);
  });

  it("rejects invalid dimensions", () => {
    expect(() => millimetersToPixels(0)).toThrow();
    expect(() => millimetersToPixels(10, Number.NaN)).toThrow();
  });
});
