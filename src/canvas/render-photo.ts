import { PHOTO_FORMAT } from "../core/photo-format";
import {
  ImageTransform,
  Size,
  degreesToRadians,
  getCoverScale,
} from "../core/geometry";

export const PHOTO_CANVAS_SIZE: Size = {
  width: PHOTO_FORMAT.widthPx,
  height: PHOTO_FORMAT.heightPx,
};

export function preparePhotoCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = PHOTO_FORMAT.widthPx;
  canvas.height = PHOTO_FORMAT.heightPx;

  const context = getCanvasContext(canvas);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

export function renderPhotoToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  transform: ImageTransform,
): void {
  canvas.width = PHOTO_FORMAT.widthPx;
  canvas.height = PHOTO_FORMAT.heightPx;

  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const imageSize: Size = {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
  const coverScale = getCoverScale(imageSize, PHOTO_CANVAS_SIZE);
  const scale = coverScale * transform.zoom;

  context.save();
  context.translate(
    PHOTO_FORMAT.widthPx / 2 + transform.offsetX,
    PHOTO_FORMAT.heightPx / 2 + transform.offsetY,
  );
  context.rotate(degreesToRadians(transform.rotationDegrees));
  context.scale(scale, scale);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  context.restore();
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
