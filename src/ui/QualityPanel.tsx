import { useEffect, useRef } from "react";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";
import {
  QUALITY_ADJUSTMENT_LIMITS,
  QualityEditState,
  getDefaultQualityEditState,
} from "../quality/quality-state";
import {
  QualityAnalysisSnapshot,
  QualityCheck,
  QualityCheckStatus,
} from "../quality/quality-types";
import {
  QualitySnapshotKind,
  renderQualitySnapshotToCanvas,
} from "../quality/photo-quality";

type QualityPanelProps = {
  photo: PhotoItem | null;
  onQualityChange: (partialEdit: Partial<QualityEditState>) => void;
  onAutoQuality: () => void;
  onResetQuality: () => void;
  onRecalculateQuality: () => void;
};

export function QualityPanel({
  photo,
  onQualityChange,
  onAutoQuality,
  onResetQuality,
  onRecalculateQuality,
}: QualityPanelProps) {
  const edit = photo?.qualityEdit ?? getDefaultQualityEditState();
  const after = edit.afterCorrections;
  const before = edit.beforeCorrections;

  return (
    <div className="inspector-stack quality-panel-stack">
      <fieldset className="quality-panel">
        <legend>Diagnostic qualite</legend>
        {after ? (
          <div className="quality-v2-summary">
            <div className={`quality-score-card status-${edit.analysisStatus ?? after.status}`}>
              <span>{getStructuredStatusLabel(edit.analysisStatus ?? after.status)}</span>
              <strong>{edit.analysisScore ?? after.score}/100</strong>
            </div>
            <ul className="quality-advice-list" aria-label="Synthese qualite">
              {(edit.analysisMessages ?? after.messages).slice(0, 3).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="quality-diagnostics empty-state">
            Diagnostic en attente.
          </div>
        )}
        <div className="button-row">
          <button type="button" onClick={onRecalculateQuality} disabled={!photo}>
            Recalculer diagnostic
          </button>
          <button type="button" onClick={onAutoQuality} disabled={!photo}>
            Amelioration auto legere
          </button>
        </div>
      </fieldset>

      <fieldset className="quality-panel">
        <legend>Avant / apres corrections</legend>
        <div className="quality-snapshot-grid">
          <QualitySnapshotCard
            title="Avant corrections"
            canvasLabel="Apercu original sans correction qualite"
            photo={photo}
            kind="beforeCorrections"
            snapshot={before}
          />
          <QualitySnapshotCard
            title="Apres corrections"
            canvasLabel="Apercu corrige exporte"
            photo={photo}
            kind="afterCorrections"
            snapshot={after}
          />
        </div>
        <p className="manual-note">
          Diagnostic indicatif, ne garantit pas l'acceptation officielle.
        </p>
      </fieldset>

      <fieldset className="quality-panel">
        <legend>Corrections legeres</legend>
        <label className="check-control">
          <input
            type="checkbox"
            checked={edit.enabled}
            onChange={(event) =>
              onQualityChange({ enabled: event.currentTarget.checked })
            }
            disabled={!photo}
          />
          <span>Appliquer les corrections qualite</span>
        </label>

        <QualitySlider
          label="Exposition"
          value={edit.exposureEv}
          min={QUALITY_ADJUSTMENT_LIMITS.exposureEv.min}
          max={QUALITY_ADJUSTMENT_LIMITS.exposureEv.max}
          step={0.01}
          suffix=" EV"
          disabled={!photo}
          onChange={(exposureEv) => onQualityChange({ exposureEv })}
        />
        <QualitySlider
          label="Contraste"
          value={edit.contrast}
          min={QUALITY_ADJUSTMENT_LIMITS.contrast.min}
          max={QUALITY_ADJUSTMENT_LIMITS.contrast.max}
          step={1}
          disabled={!photo}
          onChange={(contrast) => onQualityChange({ contrast })}
        />
        <QualitySlider
          label="Temperature"
          value={edit.temperature}
          min={QUALITY_ADJUSTMENT_LIMITS.temperature.min}
          max={QUALITY_ADJUSTMENT_LIMITS.temperature.max}
          step={1}
          disabled={!photo}
          onChange={(temperature) => onQualityChange({ temperature })}
        />
        <QualitySlider
          label="Saturation"
          value={edit.saturation}
          min={QUALITY_ADJUSTMENT_LIMITS.saturation.min}
          max={QUALITY_ADJUSTMENT_LIMITS.saturation.max}
          step={1}
          disabled={!photo}
          onChange={(saturation) => onQualityChange({ saturation })}
        />
        <QualitySlider
          label="Nettete"
          value={edit.sharpness}
          min={QUALITY_ADJUSTMENT_LIMITS.sharpness.min}
          max={QUALITY_ADJUSTMENT_LIMITS.sharpness.max}
          step={1}
          disabled={!photo}
          onChange={(sharpness) => onQualityChange({ sharpness })}
        />

        <button
          type="button"
          className="secondary-button"
          onClick={onResetQuality}
          disabled={!photo}
        >
          Reinitialiser qualite
        </button>
      </fieldset>

      <fieldset className="quality-panel">
        <legend>Conseils</legend>
        <ul className="quality-advice-list">
          {getQualityAdvice(after).map((advice) => (
            <li key={advice}>{advice}</li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}

function QualitySnapshotCard({
  title,
  canvasLabel,
  photo,
  kind,
  snapshot,
}: {
  title: string;
  canvasLabel: string;
  photo: PhotoItem | null;
  kind: QualitySnapshotKind;
  snapshot: QualityAnalysisSnapshot | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !photo) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      renderQualitySnapshotToCanvas(canvas, photo, kind);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [photo, kind]);

  return (
    <article className={`quality-snapshot-card status-${snapshot?.status ?? "pending"}`}>
      <header>
        <h3>{title}</h3>
        <span>{snapshot ? getStructuredStatusLabel(snapshot.status) : "En attente"}</span>
      </header>
      <canvas
        ref={canvasRef}
        width={PHOTO_FORMAT.widthPx}
        height={PHOTO_FORMAT.heightPx}
        aria-label={canvasLabel}
      />
      {snapshot ? (
        <>
          <div className="quality-snapshot-score">
            <strong>{snapshot.score}/100</strong>
            <small>
              Fond {Math.round(snapshot.measures.backgroundMeanLuminance ?? 0)} lum. ·{" "}
              {Math.round(snapshot.measures.backgroundUniformityScore ?? 0)} uniformite
            </small>
          </div>
          <ul className="quality-row-list">
            {snapshot.checks.map((check) => (
              <QualityCheckRow key={check.id} check={check} />
            ))}
          </ul>
        </>
      ) : (
        <p className="manual-note">Cliquez sur Recalculer diagnostic.</p>
      )}
    </article>
  );
}

function QualityCheckRow({ check }: { check: QualityCheck }) {
  return (
    <li className={`quality-row status-${check.status}`}>
      <strong>{check.label}</strong>
      <span>{check.message}</span>
      {check.measure && <small>{check.measure}</small>}
      {check.suggestion && <small>{check.suggestion}</small>}
    </li>
  );
}

function getStructuredStatusLabel(status: QualityCheckStatus): string {
  switch (status) {
    case "pass":
      return "Conforme probable";
    case "warning":
      return "A surveiller";
    case "fail":
      return "A corriger";
  }
}

function getQualityAdvice(snapshot: QualityAnalysisSnapshot | undefined): string[] {
  if (!snapshot) {
    return ["Lancer le diagnostic apres import et cadrage."];
  }

  const failedChecks = new Set(
    snapshot.checks
      .filter((check) => check.status === "fail" || check.status === "warning")
      .map((check) => check.id),
  );
  const advice: string[] = [];

  if (
    failedChecks.has("backgroundUniform") ||
    failedChecks.has("backgroundNoStrongShadow")
  ) {
    advice.push("Corriger le fond ou remplacer par une couleur unie.");
  }

  if (failedChecks.has("backgroundNotPureWhite")) {
    advice.push("Eviter le blanc pur : choisir gris clair ou bleu clair.");
  }

  if (failedChecks.has("backgroundColorRecommended")) {
    advice.push("Remplacer par gris clair si la teinte est jaune ou trop coloree.");
  }

  if (failedChecks.has("exposure")) {
    advice.push("Eclaircir ou assombrir legerement sans bruler le visage.");
  }

  if (failedChecks.has("sharpness")) {
    advice.push("Reprendre la photo si le visage reste flou.");
  }

  return advice.length > 0
    ? advice
    : ["L'image finale est utilisable selon les heuristiques locales."];
}

function QualitySlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-control">
      <span>{label}</span>
      <output>
        {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
        {suffix}
      </output>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        disabled={disabled}
      />
    </label>
  );
}
