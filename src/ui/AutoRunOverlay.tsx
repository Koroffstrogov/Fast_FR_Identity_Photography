type AutoRunOverlayProps = {
  message: string;
  elapsedSeconds: number;
};

export function AutoRunOverlay({
  message,
  elapsedSeconds,
}: AutoRunOverlayProps) {
  return (
    <div
      className="auto-run-overlay"
      role="status"
      aria-live="polite"
      aria-label="Génération automatique en cours"
    >
      <div className="auto-run-overlay-panel">
        <div className="auto-run-rectangles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p>{message || "Auto en cours"}</p>
      </div>
      <output className="auto-run-counter" aria-label="Temps écoulé">
        {elapsedSeconds} s
      </output>
    </div>
  );
}
