import {
  PhotoItem,
  PhotoManualFacePoint,
  PhotoManualFacePointKind,
  getNextManualFacePointKind,
} from "../core/photo-project";

export type EditorInteractionMode =
  | "move-photo"
  | "place-face-points"
  | "move-face-points";

export const EDITOR_INTERACTION_MODE_LABELS: Record<EditorInteractionMode, string> = {
  "move-photo": "Déplacer photo",
  "place-face-points": "Placer points",
  "move-face-points": "Ajuster points",
};

export const EDITOR_INTERACTION_MODE_MESSAGES: Record<EditorInteractionMode, string> = {
  "move-photo": "Déplacer photo - glissez l'image, utilisez la molette pour zoomer.",
  "place-face-points":
    "Placer points - cliquez : œil gauche à l'écran, œil droit à l'écran, menton, sommet du crâne.",
  "move-face-points":
    "Ajuster points - glissez un point pour l'ajuster. Échap pour quitter.",
};

export function canUseEditorInteractionMode(
  mode: EditorInteractionMode,
  photo: PhotoItem | null,
): boolean {
  if (!photo) {
    return false;
  }

  if (mode !== "move-face-points") {
    return true;
  }

  const faceDetection = photo.faceDetection;

  return Boolean(
    faceDetection?.showFacePoints && faceDetection.manualPoints.length > 0,
  );
}

export function getLegacyPointEditMode(
  mode: EditorInteractionMode,
): "none" | "place" | "move" {
  switch (mode) {
    case "place-face-points":
      return "place";
    case "move-face-points":
      return "move";
    case "move-photo":
      return "none";
  }
}

export function getInteractionModeFromLegacyPointEditMode(
  pointEditMode: "none" | "place" | "move" | undefined,
): EditorInteractionMode {
  switch (pointEditMode) {
    case "place":
      return "place-face-points";
    case "move":
      return "move-face-points";
    case "none":
    case undefined:
      return "move-photo";
  }
}

export function getNextFacePointStepLabel(
  nextPointKind: PhotoManualFacePointKind,
): string {
  switch (nextPointKind) {
    case "leftEye":
      return "Prochain point : œil gauche à l'écran.";
    case "rightEye":
      return "Prochain point : œil droit à l'écran.";
    case "chin":
      return "Prochain point : menton.";
    case "skullTop":
      return "Prochain point : sommet du crâne.";
    case "eyesCenter":
      return "Prochain point : centre des yeux.";
  }
}

export function getFacePointPlacementMessage(
  manualPoints: readonly PhotoManualFacePoint[],
): string {
  const clampedPointCount = Math.min(manualPoints.length, 4);

  if (clampedPointCount >= 4) {
    return "4/4 points visage placés. Ajustez-les si besoin.";
  }

  return `${clampedPointCount}/4 point(s) visage placé(s). ${getNextFacePointStepLabel(
    getNextManualFacePointKind(manualPoints),
  )}`;
}
