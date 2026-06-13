import { JPEG_EXPORT_QUALITY, PHOTO_FORMAT } from "../core/photo-format";

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
