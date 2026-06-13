import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";
import { renderPhotoToCanvas } from "./render-photo";

export const FINAL_PHOTO_PREVIEW_SIZE = {
  widthPx: PHOTO_FORMAT.widthPx,
  heightPx: PHOTO_FORMAT.heightPx,
  widthMm: PHOTO_FORMAT.widthMm,
  heightMm: PHOTO_FORMAT.heightMm,
  dpi: PHOTO_FORMAT.dpi,
} as const;

export function prepareFinalPhotoPreviewCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = FINAL_PHOTO_PREVIEW_SIZE.widthPx;
  canvas.height = FINAL_PHOTO_PREVIEW_SIZE.heightPx;

  const context = getCanvasContext(canvas);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

export function renderFinalPhotoPreviewToCanvas(
  canvas: HTMLCanvasElement,
  photo: PhotoItem,
): void {
  renderPhotoToCanvas(
    canvas,
    photo.image,
    photo.editState.transform,
    photo.backgroundEdit,
    "preview",
  );
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
