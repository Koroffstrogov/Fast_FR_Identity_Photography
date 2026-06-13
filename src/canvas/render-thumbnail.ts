import { PhotoItem } from "../core/photo-project";
import { renderPhotoToCanvas } from "./render-photo";

export const PHOTO_THUMBNAIL_SIZE = {
  widthPx: 82,
  heightPx: 106,
} as const;

export function renderPhotoThumbnailToCanvas(
  canvas: HTMLCanvasElement,
  photo: PhotoItem,
): void {
  canvas.width = PHOTO_THUMBNAIL_SIZE.widthPx;
  canvas.height = PHOTO_THUMBNAIL_SIZE.heightPx;

  const sourceCanvas = document.createElement("canvas");
  renderPhotoToCanvas(sourceCanvas, photo.image, photo.editState.transform);

  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
