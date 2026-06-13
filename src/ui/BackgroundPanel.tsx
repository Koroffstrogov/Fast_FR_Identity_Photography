import {
  BackgroundEditState,
  BackgroundPreviewMode,
  DEFAULT_BACKGROUND_REPLACEMENT_COLOR,
} from "../core/photo-project";
import { BackgroundSegmenterStatus } from "../vision/background-segmenter";

export type BackgroundPointMode = "none" | "foreground" | "background";

type BackgroundPanelProps = {
  backgroundEdit: BackgroundEditState | undefined;
  disabled: boolean;
  segmenterStatus: BackgroundSegmenterStatus;
  segmenterError: string;
  pointMode: BackgroundPointMode;
  onLoadSegmenter: () => void;
  onSegmentBackground: () => void;
  onBackgroundChange: (partialEdit: Partial<BackgroundEditState>) => void;
  onPointModeChange: (mode: BackgroundPointMode) => void;
  onResetPoints: () => void;
};

export function BackgroundPanel({
  backgroundEdit,
  disabled,
  segmenterStatus,
  segmenterError,
  pointMode,
  onLoadSegmenter,
  onSegmentBackground,
  onBackgroundChange,
  onPointModeChange,
  onResetPoints,
}: BackgroundPanelProps) {
  const edit = backgroundEdit ?? getFallbackBackgroundEditState();
  const isBusy = segmenterStatus === "loading";
  const pointCount =
    edit.manualForegroundPoints.length + edit.manualBackgroundPoints.length;

  return (
    <fieldset className="background-panel">
      <legend>Fond</legend>

      <p className="model-status">Modele : {getSegmenterStatusLabel(segmenterStatus)}</p>

      {segmenterStatus !== "ready" && (
        <button
          type="button"
          className="secondary-button"
          onClick={onLoadSegmenter}
          disabled={disabled || isBusy}
        >
          Charger le modele fond
        </button>
      )}

      <button
        type="button"
        onClick={onSegmentBackground}
        disabled={disabled || isBusy}
      >
        Supprimer le fond
      </button>

      {segmenterError && <p className="warning">{segmenterError}</p>}
      {edit.message && <p className="detection-message">{edit.message}</p>}

      <label className="check-control">
        <input
          type="checkbox"
          checked={edit.enabled}
          onChange={(event) =>
            onBackgroundChange({
              enabled: event.currentTarget.checked,
              mode: event.currentTarget.checked ? "replace" : "original",
            })
          }
          disabled={disabled}
        />
        <span>Remplacer le fond dans les exports</span>
      </label>

      <fieldset className="mode-control">
        <legend>Apercu fond</legend>
        <div className="segmented-options background-mode-options">
          {renderModeOption("original", "Original", edit.mode, disabled, onBackgroundChange)}
          {renderModeOption("replace", "Remplace", edit.mode, disabled, onBackgroundChange)}
          {renderModeOption("mask-preview", "Masque", edit.mode, disabled, onBackgroundChange)}
        </div>
      </fieldset>

      <label className="color-control">
        <span>Couleur de fond</span>
        <input
          aria-label="Couleur de fond"
          type="color"
          value={edit.replacementColor}
          onChange={(event) =>
            onBackgroundChange({
              replacementColor: event.currentTarget.value,
              enabled: true,
              mode: "replace",
            })
          }
          disabled={disabled}
        />
      </label>

      <label className="slider-control">
        <span>Seuil du masque</span>
        <output>{edit.threshold.toFixed(2)}</output>
        <input
          aria-label="Seuil du masque"
          type="range"
          min="0.05"
          max="0.95"
          step="0.01"
          value={edit.threshold}
          onChange={(event) =>
            onBackgroundChange({
              threshold: Number(event.currentTarget.value),
              maskVersion: edit.maskVersion + 1,
            })
          }
          disabled={disabled}
        />
      </label>

      <label className="slider-control">
        <span>Contour progressif</span>
        <output>{edit.featherPx}px</output>
        <input
          aria-label="Contour progressif"
          type="range"
          min="0"
          max="24"
          step="1"
          value={edit.featherPx}
          onChange={(event) =>
            onBackgroundChange({
              featherPx: Number(event.currentTarget.value),
              maskVersion: edit.maskVersion + 1,
            })
          }
          disabled={disabled}
        />
      </label>

      <label className="slider-control">
        <span>Lissage des bords</span>
        <output>{edit.edgeSmoothingPx}px</output>
        <input
          aria-label="Lissage des bords"
          type="range"
          min="0"
          max="12"
          step="1"
          value={edit.edgeSmoothingPx}
          onChange={(event) =>
            onBackgroundChange({
              edgeSmoothingPx: Number(event.currentTarget.value),
              maskVersion: edit.maskVersion + 1,
            })
          }
          disabled={disabled}
        />
      </label>

      <label className="check-control">
        <input
          type="checkbox"
          checked={edit.preserveHair}
          onChange={(event) =>
            onBackgroundChange({
              preserveHair: event.currentTarget.checked,
              maskVersion: edit.maskVersion + 1,
            })
          }
          disabled={disabled}
        />
        <span>Conserver les cheveux fins</span>
      </label>

      <div className="background-point-controls">
        <button
          type="button"
          className={pointMode === "foreground" ? "active-tool-button" : "secondary-button"}
          onClick={() => onPointModeChange(pointMode === "foreground" ? "none" : "foreground")}
          disabled={disabled}
        >
          Ajouter point personne a garder
        </button>
        <button
          type="button"
          className={pointMode === "background" ? "active-tool-button" : "secondary-button"}
          onClick={() => onPointModeChange(pointMode === "background" ? "none" : "background")}
          disabled={disabled}
        >
          Ajouter point fond a supprimer
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onResetPoints}
          disabled={disabled || pointCount === 0}
        >
          Effacer les points
        </button>
      </div>

      <p className="manual-note">
        Points : {edit.manualForegroundPoints.length} personne,{" "}
        {edit.manualBackgroundPoints.length} fond.
      </p>
    </fieldset>
  );
}

function renderModeOption(
  value: BackgroundPreviewMode,
  label: string,
  selectedValue: BackgroundPreviewMode,
  disabled: boolean,
  onBackgroundChange: (partialEdit: Partial<BackgroundEditState>) => void,
) {
  return (
    <label>
      <input
        type="radio"
        name="background-preview-mode"
        value={value}
        checked={selectedValue === value}
        onChange={() => {
          onBackgroundChange(
            value === "replace" ? { mode: value, enabled: true } : { mode: value },
          );
        }}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}

function getFallbackBackgroundEditState(): BackgroundEditState {
  return {
    enabled: false,
    replacementColor: DEFAULT_BACKGROUND_REPLACEMENT_COLOR,
    mode: "original",
    threshold: 0.5,
    featherPx: 6,
    edgeSmoothingPx: 2,
    preserveHair: true,
    manualForegroundPoints: [],
    manualBackgroundPoints: [],
    maskVersion: 0,
    rawMask: undefined,
    message: "",
  };
}

function getSegmenterStatusLabel(status: BackgroundSegmenterStatus): string {
  switch (status) {
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
