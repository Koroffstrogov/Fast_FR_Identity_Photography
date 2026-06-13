import { useEffect, useRef } from "react";
import {
  FINAL_PHOTO_PREVIEW_SIZE,
  prepareFinalPhotoPreviewCanvas,
  renderFinalPhotoPreviewToCanvas,
} from "../canvas/render-preview";
import { PhotoItem } from "../core/photo-project";

type FinalPhotoPreviewProps = {
  photo: PhotoItem | null;
};

export function FinalPhotoPreview({ photo }: FinalPhotoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      if (photo) {
        renderFinalPhotoPreviewToCanvas(canvas, photo);
        return;
      }

      prepareFinalPhotoPreviewCanvas(canvas);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [photo]);

  return (
    <section className="final-preview" aria-labelledby="final-preview-title">
      <div>
        <p className="eyebrow">Export individuel</p>
        <h2 id="final-preview-title">Photo finale 35x45</h2>
        <p>
          {FINAL_PHOTO_PREVIEW_SIZE.widthMm} x {FINAL_PHOTO_PREVIEW_SIZE.heightMm} mm,
          {" "}
          {FINAL_PHOTO_PREVIEW_SIZE.widthPx} x {FINAL_PHOTO_PREVIEW_SIZE.heightPx} px a{" "}
          {FINAL_PHOTO_PREVIEW_SIZE.dpi} dpi.
        </p>
      </div>
      <canvas
        ref={canvasRef}
        width={FINAL_PHOTO_PREVIEW_SIZE.widthPx}
        height={FINAL_PHOTO_PREVIEW_SIZE.heightPx}
        className="final-preview-canvas"
        aria-label="Apercu photo finale 35 par 45 millimetres"
      />
    </section>
  );
}
