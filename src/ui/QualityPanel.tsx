import { PhotoItem } from "../core/photo-project";
import {
  QUALITY_ADJUSTMENT_LIMITS,
  QualityEditState,
  getDefaultQualityEditState,
} from "../quality/quality-state";
import { BeforeAfterPreview } from "./BeforeAfterPreview";
import { QualityDiagnostics } from "./QualityDiagnostics";

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

  return (
    <div className="inspector-stack quality-panel-stack">
      <fieldset className="quality-panel">
        <legend>Diagnostic qualite</legend>
        <QualityDiagnostics diagnostics={edit.diagnostics} />
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
        <legend>Avant / apres</legend>
        <BeforeAfterPreview photo={photo} />
      </fieldset>
    </div>
  );
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
