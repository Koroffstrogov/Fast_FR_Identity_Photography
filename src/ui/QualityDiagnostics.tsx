import { getQualityDiagnosticRows, getQualityStatusLabel } from "../quality/quality-messages";
import { QualityDiagnostics as QualityDiagnosticsData } from "../quality/quality-state";

type QualityDiagnosticsProps = {
  diagnostics: QualityDiagnosticsData | undefined;
};

export function QualityDiagnostics({ diagnostics }: QualityDiagnosticsProps) {
  if (!diagnostics) {
    return (
      <div className="quality-diagnostics empty-state">
        Diagnostic en attente.
      </div>
    );
  }

  const rows = getQualityDiagnosticRows(diagnostics);

  return (
    <div className="quality-diagnostics">
      <div className={`quality-score-card status-${diagnostics.status}`}>
        <span>{getQualityStatusLabel(diagnostics.status)}</span>
        <strong>{diagnostics.score}/100</strong>
      </div>

      <dl className="quality-metrics">
        <div>
          <dt>Luminance</dt>
          <dd>{Math.round(diagnostics.meanLuminance)}</dd>
        </div>
        <div>
          <dt>P05 / P50 / P95</dt>
          <dd>
            {Math.round(diagnostics.p05)} / {Math.round(diagnostics.p50)} /{" "}
            {Math.round(diagnostics.p95)}
          </dd>
        </div>
        <div>
          <dt>Contraste</dt>
          <dd>{Math.round(diagnostics.contrastSpread)}</dd>
        </div>
      </dl>

      <ul className="quality-row-list" aria-label="Diagnostic qualite">
        {rows.map((row) => (
          <li key={row.label} className={`quality-row status-${row.status}`}>
            <strong>{row.label}</strong>
            <span>{row.message}</span>
            {row.suggestion && <small>{row.suggestion}</small>}
          </li>
        ))}
      </ul>

      <p className="manual-note">
        Diagnostic indicatif, ne garantit pas l'acceptation officielle.
      </p>
    </div>
  );
}
