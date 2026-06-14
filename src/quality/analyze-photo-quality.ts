import { renderPhotoToCanvas } from "../canvas/render-photo";
import { PhotoItem } from "../core/photo-project";
import { analyzeQuality } from "./analyze-quality";
import { QualityDiagnostics } from "./quality-state";
import {
  QualityBeforeAfterAnalysis,
} from "./quality-types";
import { analyzePhotoQualityBeforeAfter } from "./photo-quality";

export function analyzeRenderedPhotoQuality(photo: PhotoItem): QualityDiagnostics {
  const canvas = document.createElement("canvas");

  renderPhotoToCanvas(
    canvas,
    photo.image,
    photo.editState.transform,
    photo.backgroundEdit,
    "export",
  );

  const context = getCanvasContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  return analyzeQuality(imageData);
}

export function analyzeRenderedPhotoQualityBeforeAfter(
  photo: PhotoItem,
): QualityBeforeAfterAnalysis {
  return analyzePhotoQualityBeforeAfter(photo);
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
