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
import { ButtonIcon } from "./icons";

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
        <legend>Diagnostic qualité</legend>
        {after ? (
          <div className="quality-v2-summary">
            <div className={`quality-score-card status-${edit.analysisStatus ?? after.status}`}>
              <span>{getStructuredStatusLabel(edit.analysisStatus ?? after.status)}</span>
              <strong>{edit.analysisScore ?? after.score}/100</strong>
            </div>
            <ul className="quality-advice-list" aria-label="Synthèse qualité">
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
          <button
            type="button"
            className="button-with-icon"
            onClick={onRecalculateQuality}
            disabled={!photo}
            aria-describedby="quality-refresh-help"
          >
            <ButtonIcon name="refresh" />
            Actualiser l'analyse avant/après
          </button>
          <button type="button" className="button-with-icon" onClick={onAutoQuality} disabled={!photo}>
            <ButtonIcon name="sparkles" />
            Amélioration auto légère
          </button>
        </div>
        <p id="quality-refresh-help" className="manual-note">
          Relance les mesures sur le cadrage actuel et sur le rendu final exportable,
          utile après un changement de fond, de cadrage ou de correction.
        </p>
      </fieldset>

      <fieldset className="quality-panel">
        <legend>Avant / après corrections</legend>
        <div className="quality-snapshot-stack">
          <QualitySnapshotCard
            title="Avant corrections"
            canvasLabel="Aperçu original sans correction qualité"
            photo={photo}
            kind="beforeCorrections"
            snapshot={before}
          />
          <QualitySnapshotCard
            title="Après corrections"
            canvasLabel="Aperçu corrigé exporté"
            photo={photo}
            kind="afterCorrections"
            snapshot={after}
          />
        </div>
        <QualityBeforeAfterChecks before={before} after={after} />
        <p className="manual-note">
          Diagnostic indicatif, ne garantit pas l'acceptation officielle.
        </p>
      </fieldset>

      <fieldset className="quality-panel">
        <legend>Corrections légères</legend>
        <label className="check-control">
          <input
            type="checkbox"
            checked={edit.enabled}
            onChange={(event) =>
              onQualityChange({ enabled: event.currentTarget.checked })
            }
            disabled={!photo}
          />
          <span>Appliquer les corrections qualité</span>
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
          label="Température"
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
          label="Netteté"
          value={edit.sharpness}
          min={QUALITY_ADJUSTMENT_LIMITS.sharpness.min}
          max={QUALITY_ADJUSTMENT_LIMITS.sharpness.max}
          step={1}
          disabled={!photo}
          onChange={(sharpness) => onQualityChange({ sharpness })}
        />

        <button
          type="button"
          className="secondary-button button-with-icon"
          onClick={onResetQuality}
          disabled={!photo}
        >
          <ButtonIcon name="reset" />
          Réinitialiser qualité
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
              {Math.round(snapshot.measures.backgroundUniformityScore ?? 0)} uniformité
            </small>
          </div>
        </>
      ) : (
        <p className="manual-note">Actualisez l'analyse après import et cadrage.</p>
      )}
    </article>
  );
}

function QualityBeforeAfterChecks({
  before,
  after,
}: {
  before: QualityAnalysisSnapshot | undefined;
  after: QualityAnalysisSnapshot | undefined;
}) {
  if (!before || !after) {
    return (
      <div className="quality-diagnostics empty-state">
        Les contrôles avant/après apparaîtront après actualisation de l'analyse.
      </div>
    );
  }

  const checks = getPairedChecks(before, after);

  return (
    <ul className="quality-comparison-list" aria-label="Contrôles qualité avant après">
      {checks.map(({ id, label, beforeCheck, afterCheck }) => (
        <li key={id} className="quality-comparison-item">
          <strong>{label}</strong>
          <QualityComparisonState label="Avant" check={beforeCheck} />
          <QualityComparisonState label="Après" check={afterCheck} />
        </li>
      ))}
    </ul>
  );
}

function QualityComparisonState({
  label,
  check,
}: {
  label: "Avant" | "Après";
  check: QualityCheck | undefined;
}) {
  return (
    <div className={`quality-comparison-state status-${check?.status ?? "pending"}`}>
      <div className="quality-comparison-state-header">
        <span>{label}</span>
        <strong>{check ? getStructuredStatusLabel(check.status) : "En attente"}</strong>
      </div>
      {check ? (
        <>
          <p>{check.message}</p>
          {check.measure && <small>{check.measure}</small>}
          {check.suggestion && <small>{check.suggestion}</small>}
        </>
      ) : (
        <p>Non mesuré.</p>
      )}
    </div>
  );
}

function getPairedChecks(
  before: QualityAnalysisSnapshot,
  after: QualityAnalysisSnapshot,
): {
  id: string;
  label: string;
  beforeCheck: QualityCheck | undefined;
  afterCheck: QualityCheck | undefined;
}[] {
  const beforeById = new Map(before.checks.map((check) => [check.id, check]));
  const afterById = new Map(after.checks.map((check) => [check.id, check]));
  const ids = [
    ...after.checks.map((check) => check.id),
    ...before.checks.map((check) => check.id),
  ];

  return Array.from(new Set(ids)).map((id) => {
    const beforeCheck = beforeById.get(id);
    const afterCheck = afterById.get(id);

    return {
      id,
      label: afterCheck?.label ?? beforeCheck?.label ?? id,
      beforeCheck,
      afterCheck,
    };
  });
}

function getStructuredStatusLabel(status: QualityCheckStatus): string {
  switch (status) {
    case "pass":
      return "Conforme probable";
    case "warning":
      return "À surveiller";
    case "fail":
      return "À corriger";
  }
}

function getQualityAdvice(snapshot: QualityAnalysisSnapshot | undefined): string[] {
  if (!snapshot) {
    return ["Lancer le diagnostic après import et cadrage."];
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
    advice.push("Éviter le blanc pur : choisir gris clair ou bleu clair.");
  }

  if (failedChecks.has("backgroundColorRecommended")) {
    advice.push("Remplacer par gris clair si la teinte est jaune ou trop colorée.");
  }

  if (failedChecks.has("exposure")) {
    advice.push("Éclaircir ou assombrir légèrement sans brûler le visage.");
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
