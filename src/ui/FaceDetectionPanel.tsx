import type { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import { PhotoItem, hasAllFacePoints } from "../core/photo-project";

type FaceDetectionPanelProps = {
  photo: PhotoItem | null;
  modelStatus: FaceLandmarkerModelStatus;
  modelError: string;
  onLoadModel: () => void;
  onPlaceFacePointsAutomatically: () => void;
  onManualPlacementChange: (enabled: boolean) => void;
  onMoveFacePointChange: (enabled: boolean) => void;
  onFacePointsVisibilityChange: (showFacePoints: boolean) => void;
  onApplyFacePlacementFromPoints: () => void;
  onDeleteFacePoints: () => void;
};

export function FaceDetectionPanel({
  photo,
  modelStatus,
  modelError,
  onLoadModel,
  onPlaceFacePointsAutomatically,
  onManualPlacementChange,
  onMoveFacePointChange,
  onFacePointsVisibilityChange,
  onApplyFacePlacementFromPoints,
  onDeleteFacePoints,
}: FaceDetectionPanelProps) {
  const detectionState = photo?.faceDetection;
  const displayedDiagnostics =
    detectionState?.diagnostics.filter(
      (diagnostic) =>
        !(detectionState.status === "not-found" && diagnostic.code === "no-face"),
    ) ?? [];
  const showFacePoints = detectionState?.showFacePoints ?? true;
  const pointEditMode = detectionState?.pointEditMode ?? "none";
  const facePointCount = detectionState?.manualPoints.length ?? 0;
  const isBusy = modelStatus === "loading" || detectionState?.status === "detecting";
  const canFrameFromPoints = hasAllFacePoints(detectionState?.manualPoints ?? []);

  return (
    <fieldset className="face-detection-panel">
      <legend>Points visage</legend>

      <p className="model-status">
        Modele : {getModelStatusLabel(modelStatus)}
      </p>

      {modelStatus !== "ready" && (
        <button
          type="button"
          className="secondary-button"
          onClick={onLoadModel}
          disabled={!photo || isBusy}
        >
          Charger le modele
        </button>
      )}

      <button
        type="button"
        onClick={onPlaceFacePointsAutomatically}
        disabled={!photo || isBusy}
      >
        Placer les points automatiquement
      </button>

      {modelError && <p className="warning">{modelError}</p>}
      {detectionState?.message && detectionState.message !== modelError && (
        <p className="detection-message">{detectionState.message}</p>
      )}

      {displayedDiagnostics.length > 0 && (
        <ul className="diagnostic-list" aria-label="Diagnostics visage">
          {displayedDiagnostics.map((diagnostic) => (
            <li key={`${diagnostic.code}-${diagnostic.message}`}>
              {diagnostic.message}
            </li>
          ))}
        </ul>
      )}

      <label className="check-control">
        <input
          type="checkbox"
          checked={showFacePoints}
          onChange={(event) => onFacePointsVisibilityChange(event.currentTarget.checked)}
          disabled={!photo}
        />
        <span>Afficher les points du visage</span>
      </label>

      <p className="manual-note">
        Points visage : {Math.min(facePointCount, 4)}/4. Ordre manuel : oeil gauche,
        oeil droit, menton, sommet du crane.
      </p>

      <div className="button-row">
        <button
          type="button"
          className={pointEditMode === "place" ? "active-tool-button" : "secondary-button"}
          onClick={() => onManualPlacementChange(pointEditMode !== "place")}
          disabled={!photo}
        >
          Placer les points du visage manuellement
        </button>
        <button
          type="button"
          className={pointEditMode === "move" ? "active-tool-button" : "secondary-button"}
          onClick={() => onMoveFacePointChange(pointEditMode !== "move")}
          disabled={!photo || facePointCount === 0}
        >
          Deplacer un point
        </button>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="secondary-button"
          onClick={onDeleteFacePoints}
          disabled={!photo || facePointCount === 0}
        >
          Supprimer les points
        </button>
        <button
          type="button"
          onClick={onApplyFacePlacementFromPoints}
          disabled={!photo || !canFrameFromPoints}
        >
          Cadrer a partir de points
        </button>
      </div>
    </fieldset>
  );
}

function getModelStatusLabel(modelStatus: FaceLandmarkerModelStatus): string {
  switch (modelStatus) {
    case "idle":
      return "non charge";
    case "loading":
      return "chargement";
    case "ready":
      return "pret";
    case "error":
      return "erreur";
  }
}
