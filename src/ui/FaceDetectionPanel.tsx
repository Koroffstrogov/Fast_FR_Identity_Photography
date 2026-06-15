import type { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import {
  PhotoItem,
  getNextManualFacePointKind,
  hasAllFacePoints,
} from "../core/photo-project";
import {
  EditorInteractionMode,
  getNextFacePointStepLabel,
} from "./editor-interaction-mode";
import { ButtonIcon, Icon } from "./icons";

type FaceDetectionPanelProps = {
  photo: PhotoItem | null;
  modelStatus: FaceLandmarkerModelStatus;
  modelError: string;
  interactionMode: EditorInteractionMode;
  onLoadModel: () => void;
  onPlaceFacePointsAutomatically: () => void;
  onInteractionModeChange: (
    mode: EditorInteractionMode,
    options?: { resetFacePoints?: boolean },
  ) => void;
  onFacePointsVisibilityChange: (showFacePoints: boolean) => void;
  onApplyFacePlacementFromPoints: () => void;
  onDeleteFacePoints: () => void;
};

export function FaceDetectionPanel({
  photo,
  modelStatus,
  modelError,
  interactionMode,
  onLoadModel,
  onPlaceFacePointsAutomatically,
  onInteractionModeChange,
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
  const manualPoints = detectionState?.manualPoints ?? [];
  const facePointCount = manualPoints.length;
  const clampedFacePointCount = Math.min(facePointCount, 4);
  const isBusy = modelStatus === "loading" || detectionState?.status === "detecting";
  const canFrameFromPoints = hasAllFacePoints(manualPoints);
  const nextPointStep = getNextFacePointStepLabel(
    getNextManualFacePointKind(manualPoints),
  );

  return (
    <fieldset className="face-detection-panel">
      <legend>Points visage</legend>

      <div className="face-points-status">
        <strong>Statut : {clampedFacePointCount}/4 points placés</strong>
        <span>
          {clampedFacePointCount >= 4
            ? "Les quatre points sont placés. Ajustez-les si besoin."
            : nextPointStep}
        </span>
      </div>

      <button
        type="button"
        className="button-with-icon"
        onClick={onPlaceFacePointsAutomatically}
        disabled={!photo || isBusy}
      >
        <ButtonIcon name="sparkles" />
        Placer automatiquement
      </button>
      <p className="model-status">
        Modèle visage : {getModelStatusLabel(modelStatus)}
      </p>

      {modelError && <p className="warning">{modelError}</p>}
      {detectionState?.message && detectionState.message !== modelError && (
        <p className="detection-message">{detectionState.message}</p>
      )}

      <fieldset className="mode-control">
        <legend>Affichage points</legend>
        <div className="segmented-options face-points-visibility-options">
          <label>
            <input
              type="radio"
              name="face-points-visibility"
              value="hidden"
              checked={!showFacePoints}
              onChange={() => onFacePointsVisibilityChange(false)}
              disabled={!photo}
            />
            <span className="segmented-option-with-icon">
              <Icon name="eyeOff" />
              Masqués
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="face-points-visibility"
              value="visible"
              checked={showFacePoints}
              onChange={() => onFacePointsVisibilityChange(true)}
              disabled={!photo}
            />
            <span className="segmented-option-with-icon">
              <Icon name="eye" />
              Visibles
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="mode-control">
        <legend>Actions</legend>
        <div className="button-row">
          <button
            type="button"
            className="secondary-button button-with-icon"
            onClick={onDeleteFacePoints}
            disabled={!photo || facePointCount === 0}
          >
            <ButtonIcon name="trash" />
            Supprimer les points
          </button>
          <button
            type="button"
            className="button-with-icon"
            onClick={onApplyFacePlacementFromPoints}
            disabled={!photo || !canFrameFromPoints}
          >
            <ButtonIcon name="crop" />
            Cadrer à partir des points
          </button>
        </div>
      </fieldset>

      <details className="technical-details">
        <summary>Détails techniques</summary>
        <p className="model-status">
          Modèle : {getModelStatusLabel(modelStatus)}
        </p>
        {modelStatus !== "ready" && (
          <button
            type="button"
            className="secondary-button button-with-icon"
            onClick={onLoadModel}
            disabled={!photo || isBusy}
        >
          <ButtonIcon name="download" />
          Charger le modèle
        </button>
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
      </details>
    </fieldset>
  );
}

function getModelStatusLabel(modelStatus: FaceLandmarkerModelStatus): string {
  switch (modelStatus) {
    case "idle":
      return "non chargé";
    case "loading":
      return "chargement";
    case "ready":
      return "prêt";
    case "error":
      return "erreur";
  }
}
