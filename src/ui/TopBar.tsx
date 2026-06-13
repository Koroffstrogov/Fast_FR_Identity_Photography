import { ChangeEvent } from "react";
import { AppMode, APP_MODES } from "./app-mode";

type TopBarProps = {
  mode: AppMode;
  photoCount: number;
  sheetCapacity: number;
  onModeChange: (mode: AppMode) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function TopBar({
  mode,
  photoCount,
  sheetCapacity,
  onModeChange,
  onFileChange,
}: TopBarProps) {
  return (
    <header className="app-topbar">
      <div className="app-brand">
        <h1>Photo ID 35x45</h1>
        <span>Traitement local</span>
      </div>

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

      <div className="topbar-actions">
        <label className="topbar-import">
          <span>Importer</span>
          <input
            aria-label="Importer depuis la barre"
            type="file"
            accept="image/*"
            multiple
            onChange={onFileChange}
          />
        </label>
        <p>{photoCount} photos / {sheetCapacity} places</p>
      </div>
    </header>
  );
}
