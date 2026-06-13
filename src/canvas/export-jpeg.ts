import { JPEG_EXPORT_QUALITY, PHOTO_FORMAT } from "../core/photo-format";
import { A4_PRINT_PAGE } from "../core/print-layout";

export function exportCanvasToJpeg(
  canvas: HTMLCanvasElement,
  quality = JPEG_EXPORT_QUALITY,
): string {
  if (canvas.width !== PHOTO_FORMAT.widthPx || canvas.height !== PHOTO_FORMAT.heightPx) {
    throw new Error(
      `canvas must be ${PHOTO_FORMAT.widthPx}x${PHOTO_FORMAT.heightPx} before export`,
    );
  }

  return canvas.toDataURL(PHOTO_FORMAT.mimeType, quality);
}

export function exportSheetCanvasToJpeg(
  canvas: HTMLCanvasElement,
  quality = JPEG_EXPORT_QUALITY,
): string {
  if (canvas.width !== A4_PRINT_PAGE.widthPx || canvas.height !== A4_PRINT_PAGE.heightPx) {
    throw new Error(
      `canvas must be ${A4_PRINT_PAGE.widthPx}x${A4_PRINT_PAGE.heightPx} before export`,
    );
  }

  return canvas.toDataURL(PHOTO_FORMAT.mimeType, quality);
}
