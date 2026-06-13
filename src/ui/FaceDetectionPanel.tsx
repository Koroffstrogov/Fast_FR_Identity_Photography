import { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import { PhotoItem } from "../core/photo-project";

type FaceDetectionPanelProps = {
  photo: PhotoItem | null;
  modelStatus: FaceLandmarkerModelStatus;
  modelError: string;
  onLoadModel: () => void;
  onDetectFace: () => void;
  onManualAssistantChange: (enabled: boolean) => void;
  onApplyManualFacePlacement: () => void;
  onResetManualFacePoints: () => void;
};

export function FaceDetectionPanel({
  photo,
  modelStatus,
  modelError,
  onLoadModel,
  onDetectFace,
  onManualAssistantChange,
  onApplyManualFacePlacement,
  onResetManualFacePoints,
}: FaceDetectionPanelProps) {
  const detectionState = photo?.faceDetection;
  const manualAssistantEnabled = detectionState?.manualAssistantEnabled ?? false;
  const manualPointCount = detectionState?.manualPoints.length ?? 0;
  const isBusy = modelStatus === "loading" || detectionState?.status === "detecting";
  const hasManualRequiredPoints =
    detectionState?.manualPoints.some((point) => point.kind === "eyesCenter") &&
    detectionState.manualPoints.some((point) => point.kind === "chin");

  return (
    <fieldset className="face-detection-panel">
      <legend>Detection visage locale</legend>

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

      <button type="button" onClick={onDetectFace} disabled={!photo || isBusy}>
        Detecter le visage
      </button>

      {modelError && <p className="warning">{modelError}</p>}
      {detectionState?.message && detectionState.message !== modelError && (
        <p className="detection-message">{detectionState.message}</p>
      )}

      {detectionState?.diagnostics && detectionState.diagnostics.length > 0 && (
        <ul className="diagnostic-list" aria-label="Diagnostics visage">
          {detectionState.diagnostics.map((diagnostic) => (
            <li key={`${diagnostic.code}-${diagnostic.message}`}>
              {diagnostic.message}
            </li>
          ))}
        </ul>
      )}

      <label className="check-control">
        <input
          type="checkbox"
          checked={manualAssistantEnabled}
          onChange={(event) => onManualAssistantChange(event.currentTarget.checked)}
          disabled={!photo}
        />
        <span>Assistant manuel visage</span>
      </label>

      <p className="manual-note">
        Points manuels : {manualPointCount}/3. Cliquez centre des yeux, menton,
        puis sommet du crane si utile.
      </p>

      <div className="button-row">
        <button
          type="button"
          className="secondary-button"
          onClick={onResetManualFacePoints}
          disabled={!photo || manualPointCount === 0}
        >
          Reinitialiser les points
        </button>
        <button
          type="button"
          onClick={onApplyManualFacePlacement}
          disabled={!photo || !hasManualRequiredPoints}
        >
          Appliquer le cadrage manuel
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
