import { useEffect, useRef } from "react";
import {
  PHOTO_THUMBNAIL_SIZE,
  renderPhotoThumbnailToCanvas,
} from "../canvas/render-thumbnail";
import { PhotoItem } from "../core/photo-project";

type PhotoThumbnailProps = {
  photo: PhotoItem;
};

export function PhotoThumbnail({ photo }: PhotoThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      renderPhotoThumbnailToCanvas(canvas, photo);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [photo]);

  return (
    <canvas
      ref={canvasRef}
      width={PHOTO_THUMBNAIL_SIZE.widthPx}
      height={PHOTO_THUMBNAIL_SIZE.heightPx}
      className="photo-thumbnail"
      aria-hidden="true"
    />
  );
}
