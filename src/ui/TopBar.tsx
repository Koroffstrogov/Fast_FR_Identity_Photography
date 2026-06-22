import { AppMode, APP_MODES } from "./app-mode";
import { ButtonIcon } from "./icons";

export type TopBarAutoStatus = "idle" | "running" | "error" | "done";

type TopBarProps = {
  mode: AppMode;
  photoCount: number;
  sheetCapacity: number;
  autoStatus: TopBarAutoStatus;
  autoMessage: string;
  autoDisabled: boolean;
  isAutoReady: boolean;
  onModeChange: (mode: AppMode) => void;
  onRunAuto: () => void;
};

export function TopBar({
  mode,
  photoCount,
  sheetCapacity,
  autoStatus,
  autoMessage,
  autoDisabled,
  isAutoReady,
  onModeChange,
  onRunAuto,
}: TopBarProps) {
  return (
    <header className="app-topbar">
      <div className="app-brand">
        <h1>Photo ID 35x45</h1>
        <span>Traitement local</span>
      </div>

      <div className="topbar-center">
        <div className="topbar-flow-actions" aria-label="Démarrage et modes">
          <button
            type="button"
            className={
              isAutoReady
                ? "auto-flow-button button-with-icon is-ready"
                : "auto-flow-button button-with-icon"
            }
            onClick={onRunAuto}
            disabled={autoDisabled}
            aria-describedby={autoMessage ? "auto-status-message" : undefined}
          >
            <ButtonIcon name="sparkles" />
            <strong>Génération automatique</strong>
          </button>

          <span className="topbar-flow-separator" aria-hidden="true">
            ou
          </span>

          <nav className="mode-nav" aria-label="Modes">
            {APP_MODES.map((appMode) => (
              <button
                key={appMode.id}
                type="button"
                className={mode === appMode.id ? "mode-nav-button is-active" : "mode-nav-button"}
                aria-pressed={mode === appMode.id}
                onClick={() => onModeChange(appMode.id)}
              >
                {appMode.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="topbar-actions">
        <p>{photoCount} photos / {sheetCapacity} places</p>
        {autoMessage && (
          <p
            id="auto-status-message"
            className={`auto-status-message auto-status-${autoStatus}`}
            role="status"
          >
            {autoMessage}
          </p>
        )}
      </div>
    </header>
  );
}
