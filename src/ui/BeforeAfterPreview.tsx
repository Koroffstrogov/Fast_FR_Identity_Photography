import { useEffect, useRef } from "react";
import { preparePhotoCanvas, renderPhotoToCanvas } from "../canvas/render-photo";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";

type BeforeAfterPreviewProps = {
  photo: PhotoItem | null;
};

export function BeforeAfterPreview({ photo }: BeforeAfterPreviewProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const correctedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const originalCanvas = originalCanvasRef.current;
    const correctedCanvas = correctedCanvasRef.current;

    if (!originalCanvas || !correctedCanvas) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      if (!photo) {
        preparePhotoCanvas(originalCanvas);
        preparePhotoCanvas(correctedCanvas);
        return;
      }

      renderPhotoToCanvas(
        originalCanvas,
        photo.image,
        photo.editState.transform,
        photo.backgroundEdit,
        "export",
      );
      renderPhotoToCanvas(
        correctedCanvas,
        photo.image,
        photo.editState.transform,
        photo.backgroundEdit,
        "export",
        photo.qualityEdit,
      );
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [photo]);

  return (
    <div className="before-after-preview" aria-label="Apercu avant apres">
      <figure>
        <figcaption>Original</figcaption>
        <canvas
          ref={originalCanvasRef}
          width={PHOTO_FORMAT.widthPx}
          height={PHOTO_FORMAT.heightPx}
          aria-label="Apercu original sans correction qualite"
        />
      </figure>
      <figure>
        <figcaption>Corrige</figcaption>
        <canvas
          ref={correctedCanvasRef}
          width={PHOTO_FORMAT.widthPx}
          height={PHOTO_FORMAT.heightPx}
          aria-label="Apercu corrige exporte"
        />
      </figure>
    </div>
  );
}
