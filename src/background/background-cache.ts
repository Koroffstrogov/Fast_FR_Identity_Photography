import { ImageTransform, Size } from "../core/geometry";
import { BackgroundEditState } from "../core/photo-project";

export type BackgroundRawMaskKeyInput = {
  photoId: string;
  imageSize: Size;
};

export function createRawMaskCacheKey(input: BackgroundRawMaskKeyInput): string {
  return JSON.stringify({
    photoId: input.photoId,
    imageWidth: input.imageSize.width,
    imageHeight: input.imageSize.height,
  });
}

export function createPostProcessedMaskCacheKey(
  backgroundEdit: Pick<
    BackgroundEditState,
    | "threshold"
    | "featherPx"
    | "edgeSmoothingPx"
    | "preserveHair"
    | "manualForegroundPoints"
    | "manualBackgroundPoints"
    | "maskVersion"
  >,
  imageSize?: Size,
): string {
  return JSON.stringify({
    imageWidth: imageSize?.width,
    imageHeight: imageSize?.height,
    threshold: backgroundEdit.threshold,
    featherPx: backgroundEdit.featherPx,
    edgeSmoothingPx: backgroundEdit.edgeSmoothingPx,
    preserveHair: backgroundEdit.preserveHair,
    manualForegroundPoints: backgroundEdit.manualForegroundPoints,
    manualBackgroundPoints: backgroundEdit.manualBackgroundPoints,
    maskVersion: backgroundEdit.maskVersion,
  });
}

export function createBackgroundCompositionCacheKey(
  rawMaskKey: string,
  postProcessedMaskKey: string,
  transform: ImageTransform,
  replacementColor: string,
): string {
  return JSON.stringify({
    rawMaskKey,
    postProcessedMaskKey,
    replacementColor,
    offsetX: transform.offsetX,
    offsetY: transform.offsetY,
    zoom: transform.zoom,
    rotationDegrees: transform.rotationDegrees,
  });
}
