import {
  BackgroundEditState,
  BackgroundRemovalBackendPreference,
  BackgroundPreviewMode,
  getDefaultBackgroundEditState,
} from "../core/photo-project";
import { getRuntimeCapabilities } from "../ai/runtime-capabilities";
import { BackgroundRemovalStatus } from "../background/background-removal";
import { RMBG2_ENGINE_LABEL } from "../background/rmbg2-config";

export type BackgroundPointMode = "none" | "foreground" | "background";

type BackgroundPanelProps = {
  backgroundEdit: BackgroundEditState | undefined;
  disabled: boolean;
  removalStatus: BackgroundRemovalStatus;
  removalError: string;
  pointMode: BackgroundPointMode;
  onLoadModel: () => void;
  onRemoveBackground: () => void;
  onBackgroundChange: (partialEdit: Partial<BackgroundEditState>) => void;
  onPointModeChange: (mode: BackgroundPointMode) => void;
  onResetPoints: () => void;
  onResetSettings: () => void;
};

export function BackgroundPanel({
  backgroundEdit,
  disabled,
  removalStatus,
  removalError,
  pointMode,
  onLoadModel,
  onRemoveBackground,
  onBackgroundChange,
  onPointModeChange,
  onResetPoints,
  onResetSettings,
}: BackgroundPanelProps) {
  const edit = backgroundEdit ?? getFallbackBackgroundEditState();
  const isBusy = removalStatus === "loading";
  const pointCount =
    edit.manualForegroundPoints.length + edit.manualBackgroundPoints.length;
  const diagnostics = edit.technicalDiagnostics;
  const navigatorGpuAvailable =
    diagnostics?.navigatorGpuAvailable ?? getRuntimeCapabilities().navigatorGpuAvailable;

  return (
    <fieldset className="background-panel">
      <legend>Fond</legend>

      <p className="model-status">Moteur : {RMBG2_ENGINE_LABEL}</p>
      <p className="model-status">Modele : {getRemovalStatusLabel(removalStatus)}</p>

      <label className="select-control">
        <span>Backend fond</span>
        <select
          aria-label="Backend fond"
          value={edit.backendPreference}
          onChange={(event) =>
            onBackgroundChange({
              backendPreference: event.currentTarget
                .value as BackgroundRemovalBackendPreference,
              activeBackend: "none",
            })
          }
          disabled={disabled || isBusy}
        >
          <option value="auto">Auto GPU puis CPU</option>
          <option value="gpu">GPU WebGPU</option>
          <option value="cpu">CPU WASM</option>
        </select>
      </label>

      <button
        type="button"
        className="secondary-button"
        onClick={onLoadModel}
        disabled={disabled || isBusy}
      >
        Charger / verifier le modele
      </button>

      <button
        type="button"
        onClick={onRemoveBackground}
        disabled={disabled || isBusy}
      >
        Supprimer le fond
      </button>

      <button
        type="button"
        className="secondary-button"
        onClick={onRemoveBackground}
        disabled={disabled || isBusy}
      >
        Reappliquer
      </button>

      <div className="button-row">
        <button
          type="button"
          className="secondary-button"
          onClick={onResetSettings}
          disabled={disabled}
        >
          Reinitialiser les reglages fond
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onBackgroundChange({ enabled: false, mode: "original" })}
          disabled={disabled}
        >
          Desactiver le remplacement du fond
        </button>
      </div>

      {removalError && <p className="warning">{removalError}</p>}
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
          {renderModeOption("replace", "Fond remplace", edit.mode, disabled, onBackgroundChange)}
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

      <dl className="background-diagnostics" aria-label="Diagnostics techniques fond">
        <div>
          <dt>WebGPU</dt>
          <dd>{navigatorGpuAvailable ? "oui" : "non"}</dd>
        </div>
        <div>
          <dt>Backend demande</dt>
          <dd>{getBackendPreferenceLabel(edit.backendPreference)}</dd>
        </div>
        <div>
          <dt>Backend actif</dt>
          <dd>{getActiveBackendLabel(edit.activeBackend)}</dd>
        </div>
        <div>
          <dt>Provider ONNX</dt>
          <dd>{diagnostics?.provider ?? "-"}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd>{formatMs(diagnostics?.sessionCreationMs)}</dd>
        </div>
        <div>
          <dt>Inference</dt>
          <dd>{formatMs(diagnostics?.inferenceMs)}</dd>
        </div>
        <div>
          <dt>Entree modele</dt>
          <dd>{diagnostics ? `${diagnostics.inputWidth}x${diagnostics.inputHeight}` : "1024x1024"}</dd>
        </div>
        <div>
          <dt>Masque sortie</dt>
          <dd>{diagnostics?.maskWidth && diagnostics.maskHeight ? `${diagnostics.maskWidth}x${diagnostics.maskHeight}` : "-"}</dd>
        </div>
      </dl>

      <details className="technical-details">
        <summary>Details ONNX</summary>
        <p>Input detecte : {diagnostics?.selectedInputName ?? diagnostics?.inputNames.join(", ") ?? "-"}</p>
        <p>Output detecte : {diagnostics?.selectedOutputName ?? diagnostics?.outputNames.join(", ") ?? "-"}</p>
        <p>Assets WASM : {diagnostics?.ortWasmPath ?? "/ort/"}</p>
        <p>Modele : {diagnostics?.modelPath ?? "/models/rmbg2/model.onnx"}</p>
        {diagnostics?.fallbackMessage && (
          <p className="warning">{diagnostics.fallbackMessage}</p>
        )}
      </details>

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
  return getDefaultBackgroundEditState();
}

function getRemovalStatusLabel(status: BackgroundRemovalStatus): string {
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

function getBackendPreferenceLabel(
  backendPreference: BackgroundRemovalBackendPreference,
): string {
  switch (backendPreference) {
    case "auto":
      return "Auto";
    case "gpu":
      return "GPU";
    case "cpu":
      return "CPU";
  }
}

function getActiveBackendLabel(activeBackend: BackgroundEditState["activeBackend"]): string {
  switch (activeBackend) {
    case "webgpu":
      return "WebGPU";
    case "wasm":
      return "CPU/WASM";
    case "none":
      return "-";
  }
}

function formatMs(value: number | undefined): string {
  return typeof value === "number" ? `${value} ms` : "-";
}
