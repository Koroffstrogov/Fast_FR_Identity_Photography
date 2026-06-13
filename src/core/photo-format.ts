export const MM_PER_INCH = 25.4;
export const PHOTO_DPI = 300;
export const PHOTO_WIDTH_MM = 35;
export const PHOTO_HEIGHT_MM = 45;
export const JPEG_EXPORT_QUALITY = 0.92;

export function mmToPx(
  millimeters: number,
  dpi = PHOTO_DPI,
): number {
  if (!Number.isFinite(millimeters) || millimeters <= 0) {
    throw new Error("millimeters must be a positive finite number");
  }

  if (!Number.isFinite(dpi) || dpi <= 0) {
    throw new Error("dpi must be a positive finite number");
  }

  return Math.round((millimeters / MM_PER_INCH) * dpi);
}

export function millimetersToPixels(
  millimeters: number,
  dpi = PHOTO_DPI,
): number {
  return mmToPx(millimeters, dpi);
}

export const PHOTO_FORMAT = {
  widthMm: PHOTO_WIDTH_MM,
  heightMm: PHOTO_HEIGHT_MM,
  dpi: PHOTO_DPI,
  widthPx: mmToPx(PHOTO_WIDTH_MM),
  heightPx: mmToPx(PHOTO_HEIGHT_MM),
  mimeType: "image/jpeg",
} as const;
