import { PhotoItem } from "../core/photo-project";
import { PHOTO_FORMAT } from "../core/photo-format";
import { Size, degreesToRadians, getCoverScale } from "../core/geometry";

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

  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const imageSize: Size = {
    width: photo.image.naturalWidth,
    height: photo.image.naturalHeight,
  };
  const transform = photo.editState.transform;
  const coverScale = getCoverScale(imageSize, {
    width: canvas.width,
    height: canvas.height,
  });
  const offsetScaleX = canvas.width / PHOTO_FORMAT.widthPx;
  const offsetScaleY = canvas.height / PHOTO_FORMAT.heightPx;
  const scale = coverScale * transform.zoom;

  context.save();
  context.translate(
    canvas.width / 2 + transform.offsetX * offsetScaleX,
    canvas.height / 2 + transform.offsetY * offsetScaleY,
  );
  context.rotate(degreesToRadians(transform.rotationDegrees));
  context.scale(scale, scale);
  context.drawImage(
    photo.image,
    -photo.image.naturalWidth / 2,
    -photo.image.naturalHeight / 2,
  );
  context.restore();
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
