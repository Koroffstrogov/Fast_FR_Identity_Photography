import {
  BackgroundEditState,
  BackgroundRemovalBackendPreference,
  BackgroundPreviewMode,
  OnnxSessionDiagnosticResult,
  getDefaultBackgroundEditState,
} from "../core/photo-project";
import { getRuntimeCapabilities } from "../ai/runtime-capabilities";
import { BackgroundRemovalStatus } from "../background/background-removal";
import {
  RMBG_DEFAULT_CONFIG,
  getRmbgEngineLabel,
  getRmbgLocalModelPath,
  getRmbgModelFileName,
  getRmbgModelOption,
  getRmbgModelOptions,
  normalizeRmbgModelPath,
} from "../background/rmbg-config";
import { ButtonIcon } from "./icons";

export type BackgroundPointMode = "none" | "foreground" | "background";

type BackgroundPanelProps = {
  backgroundEdit: BackgroundEditState | undefined;
  disabled: boolean;
  removalStatus: BackgroundRemovalStatus;
  removalError: string;
  pointMode: BackgroundPointMode;
  onLoadModel: () => void;
  onDiagnoseSession?: () => void;
  onRemoveBackground: () => void;
  onBackgroundChange: (partialEdit: Partial<BackgroundEditState>) => void;
  onPointModeChange: (mode: BackgroundPointMode) => void;
  onResetPoints: () => void;
  onResetSettings: () => void;
};

const RECOMMENDED_BACKGROUND_COLORS = [
  { label: "Gris clair", value: "#eeeeee" },
  { label: "Bleu clair", value: "#dbeafe" },
  { label: "Gris bleuté", value: "#e5edf0" },
] as const;

export function BackgroundPanel({
  backgroundEdit,
  disabled,
  removalStatus,
  removalError,
  pointMode,
  onLoadModel,
  onDiagnoseSession,
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
  const browserOrigin = getBrowserOrigin();
  const selectedModelPath = normalizeRmbgModelPath(
    edit.modelPath || RMBG_DEFAULT_CONFIG.modelPath,
  );
  const modelOptions = getRmbgModelOptions();
  const selectedModelOption = getRmbgModelOption(selectedModelPath);
  const selectedModelName =
    selectedModelOption?.label ?? getRmbgModelFileName(selectedModelPath);
  const fallbackModelUrl = getModelUrlForOrigin(browserOrigin, selectedModelPath);
  const navigatorGpuAvailable =
    diagnostics?.navigatorGpuAvailable ?? getRuntimeCapabilities().navigatorGpuAvailable;

  return (
    <fieldset className="background-panel">
      <legend>Fond</legend>

      <div className="background-simple">
        <p className="model-status">
          {getRmbgEngineLabel("rmbg1.4")} : suppression locale, sans envoi de photo.
        </p>
        <p className="model-status">État modèle : {getRemovalStatusLabel(removalStatus)}</p>

        <div className="button-row">
          <button
            type="button"
            className="secondary-button button-with-icon"
            onClick={onLoadModel}
            disabled={disabled || isBusy}
          >
            <ButtonIcon name="download" />
            Charger / vérifier le modèle
          </button>
          <button
            type="button"
            className="button-with-icon"
            onClick={onRemoveBackground}
            disabled={disabled || isBusy}
          >
            <ButtonIcon name="background" />
            Supprimer le fond
          </button>
          <button
            type="button"
            className="secondary-button button-with-icon"
            onClick={onRemoveBackground}
            disabled={disabled || isBusy}
          >
            <ButtonIcon name="refresh" />
            Réappliquer
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
          <legend>Aperçu fond</legend>
          <div className="segmented-options background-mode-options">
            {renderModeOption("original", "Original", edit.mode, disabled, onBackgroundChange)}
            {renderModeOption("replace", "Fond remplacé", edit.mode, disabled, onBackgroundChange)}
            {renderModeOption("mask-preview", "Masque", edit.mode, disabled, onBackgroundChange)}
          </div>
        </fieldset>

        <div className="background-color-row">
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
          <div className="background-swatches" aria-label="Couleurs recommandées">
            {RECOMMENDED_BACKGROUND_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className="background-swatch"
                style={{ backgroundColor: color.value }}
                onClick={() =>
                  onBackgroundChange({
                    replacementColor: color.value,
                    enabled: true,
                    mode: "replace",
                  })
                }
                disabled={disabled}
                aria-label={`Fond ${color.label}`}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </div>

      <details className="background-advanced">
        <summary>Options avancées</summary>

        <label className="select-control">
          <span>Modèle</span>
          <select
            aria-label="Modèle RMBG"
            value={selectedModelPath}
            onChange={(event) => {
              const modelPath = event.currentTarget.value;

              onBackgroundChange({
                engine: "rmbg1.4",
                modelPath,
              });
            }}
            disabled={disabled || isBusy}
          >
            {modelOptions.map((option) => (
              <option key={option.modelPath} value={option.modelPath}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="manual-note">
          {selectedModelOption?.description ?? "Modèle RMBG-1.4 local configurable."}
        </p>

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

        {onDiagnoseSession && (
          <button
            type="button"
            className="secondary-button"
            onClick={onDiagnoseSession}
            disabled={disabled || isBusy}
          >
            Diagnostiquer la session ONNX
          </button>
        )}

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

        <div className="button-row">
          <button
            type="button"
            className="secondary-button button-with-icon"
            onClick={onResetSettings}
            disabled={disabled}
          >
            <ButtonIcon name="reset" />
            Réinitialiser les réglages fond
          </button>
          <button
            type="button"
            className="secondary-button button-with-icon"
            onClick={() => onBackgroundChange({ enabled: false, mode: "original" })}
            disabled={disabled}
          >
            <ButtonIcon name="eyeOff" />
            Désactiver le remplacement du fond
          </button>
        </div>

        <dl className="background-diagnostics" aria-label="Diagnostics techniques fond">
          <div>
            <dt>Moteur</dt>
            <dd>{getRmbgEngineLabel("rmbg1.4")}</dd>
          </div>
          <div>
            <dt>WebGPU</dt>
            <dd>{navigatorGpuAvailable ? "oui" : "non"}</dd>
          </div>
          <div>
            <dt>Backend demandé</dt>
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
            <dt>Modèle chargé</dt>
            <dd>{getLoadedModelLabel(diagnostics?.modelPath, selectedModelName)}</dd>
          </div>
          <div>
            <dt>Taille modèle</dt>
            <dd>{formatBytes(diagnostics?.modelBytes)}</dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>{formatMs(diagnostics?.sessionCreationMs)}</dd>
          </div>
          <div>
            <dt>Inférence</dt>
            <dd>{formatMs(diagnostics?.inferenceMs)}</dd>
          </div>
          <div>
            <dt>Entrée modèle</dt>
            <dd>{diagnostics ? `${diagnostics.inputWidth}x${diagnostics.inputHeight}` : "1024x1024"}</dd>
          </div>
          <div>
            <dt>Masque sortie</dt>
            <dd>{diagnostics?.maskWidth && diagnostics.maskHeight ? `${diagnostics.maskWidth}x${diagnostics.maskHeight}` : "-"}</dd>
          </div>
        </dl>

        <details className="technical-details">
          <summary>Détails ONNX</summary>
          <p>Input détecté : {diagnostics?.selectedInputName ?? "-"}</p>
          <p>Output détecté : {diagnostics?.selectedOutputName ?? "-"}</p>
          <p>Input names : {formatNames(diagnostics?.inputNames)}</p>
          <p>Output names : {formatNames(diagnostics?.outputNames)}</p>
          <p>Assets WASM : {diagnostics?.ortWasmPath ?? "/ort/"}</p>
          <p>Origin courant : {diagnostics?.currentOrigin ?? browserOrigin ?? "-"}</p>
          <p>Modèle : {diagnostics?.modelPath ?? selectedModelPath}</p>
          <p>Nom modèle : {getRmbgModelFileName(diagnostics?.modelPath ?? selectedModelPath)}</p>
          <p>Fichier local dev : {getRmbgLocalModelPath(selectedModelPath)}</p>
          <p>URL testée : {diagnostics?.modelUrl ?? fallbackModelUrl}</p>
          <p>HTTP modèle : {diagnostics?.modelHttpStatus ?? "-"}</p>
          <p>Content-Type modèle : {diagnostics?.modelContentType ?? "-"}</p>
          <p>Octets modèle : {diagnostics?.modelBytes ?? "-"}</p>
          {diagnostics?.fallbackMessage && (
            <p className="warning">{diagnostics.fallbackMessage}</p>
          )}
        </details>

        {edit.sessionDiagnostics.length > 0 && (
          <details className="technical-details" open>
            <summary>Diagnostic création session</summary>
            <div className="diagnostic-table-wrap">
              <table className="diagnostic-table">
                <thead>
                  <tr>
                    <th>Variante</th>
                    <th>Moteur</th>
                    <th>Provider</th>
                    <th>Graphe</th>
                    <th>Source</th>
                    <th>Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {edit.sessionDiagnostics.map((result) => (
                    <tr key={result.id}>
                      <td>{result.id}</td>
                      <td>{getRmbgEngineLabel(result.engine)}</td>
                      <td>{result.provider}</td>
                      <td>{formatGraphOptimization(result)}</td>
                      <td>{result.source}</td>
                      <td>
                        {result.sessionCreated ? "OK" : "Échec"}
                        <small>{formatSessionDiagnosticDetail(result)}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        <div className="background-point-controls">
          <button
            type="button"
            className={`${pointMode === "foreground" ? "active-tool-button" : "secondary-button"} button-with-icon`}
            onClick={() => onPointModeChange(pointMode === "foreground" ? "none" : "foreground")}
            disabled={disabled}
          >
            <ButtonIcon name="point" />
            Ajouter point personne à garder
          </button>
          <button
            type="button"
            className={`${pointMode === "background" ? "active-tool-button" : "secondary-button"} button-with-icon`}
            onClick={() => onPointModeChange(pointMode === "background" ? "none" : "background")}
            disabled={disabled}
          >
            <ButtonIcon name="point" />
            Ajouter point fond à supprimer
          </button>
          <button
            type="button"
            className="secondary-button button-with-icon"
            onClick={onResetPoints}
            disabled={disabled || pointCount === 0}
          >
            <ButtonIcon name="trash" />
            Effacer les points
          </button>
        </div>

        <p className="manual-note">
          Points : {edit.manualForegroundPoints.length} personne,{" "}
          {edit.manualBackgroundPoints.length} fond.
        </p>
      </details>
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
      return "non chargé";
    case "loading":
      return "chargement";
    case "ready":
      return "prêt";
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

function getBrowserOrigin(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.location.origin;
}

function getModelUrlForOrigin(origin: string | undefined, modelPath: string): string {
  if (!origin) {
    return modelPath;
  }

  return new URL(modelPath, origin).toString();
}

function getLoadedModelLabel(
  loadedModelPath: string | undefined,
  fallbackLabel: string,
): string {
  if (!loadedModelPath) {
    return fallbackLabel;
  }

  return getRmbgModelOption(loadedModelPath)?.label ?? getRmbgModelFileName(loadedModelPath);
}

function formatBytes(value: number | undefined): string {
  if (typeof value !== "number") {
    return "-";
  }

  if (value < 1024) {
    return `${value} o`;
  }

  const megaBytes = value / (1024 * 1024);
  return `${megaBytes.toFixed(1)} Mo`;
}

function formatNames(names: string[] | undefined): string {
  return names && names.length > 0 ? names.join(", ") : "-";
}

function formatGraphOptimization(result: OnnxSessionDiagnosticResult): string {
  return [
    result.graphOptimizationLevel,
    result.executionMode ? `mode ${result.executionMode}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function formatSessionDiagnosticDetail(result: OnnxSessionDiagnosticResult): string {
  if (result.sessionCreated) {
    return ` ${result.durationMs} ms, inputs ${formatNames(result.inputNames)}, outputs ${formatNames(result.outputNames)}`;
  }

  return ` ${result.durationMs} ms, ${result.error ?? "erreur inconnue"}`;
}
