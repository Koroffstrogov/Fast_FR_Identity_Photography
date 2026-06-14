import {
  QualityAnalysisSnapshot,
  QualityCheckStatus,
} from "./quality-types";

export type ColorCast = "none" | "warm" | "cool" | "green" | "magenta";

export type QualityStatus = "ok" | "warning" | "problem";

export type QualityDiagnostics = {
  meanLuminance: number;
  p05: number;
  p50: number;
  p95: number;
  contrastSpread: number;
  clippedShadowsPct: number;
  clippedHighlightsPct: number;
  sharpnessScore: number;
  colorCast: ColorCast;
  warnings: string[];
  status: QualityStatus;
  score: number;
};

export type QualityEditState = {
  enabled: boolean;
  autoApplied: boolean;
  exposureEv: number;
  brightness: number;
  contrast: number;
  temperature: number;
  tint: number;
  saturation: number;
  sharpness: number;
  diagnostics?: QualityDiagnostics;
  beforeCorrections?: QualityAnalysisSnapshot;
  afterCorrections?: QualityAnalysisSnapshot;
  analysisStatus?: QualityCheckStatus;
  analysisScore?: number;
  analysisMessages?: string[];
};

export const QUALITY_ADJUSTMENT_LIMITS = {
  exposureEv: { min: -0.25, max: 0.3 },
  brightness: { min: -10, max: 10 },
  contrast: { min: -10, max: 18 },
  temperature: { min: -8, max: 8 },
  tint: { min: -6, max: 6 },
  saturation: { min: -6, max: 8 },
  sharpness: { min: 0, max: 12 },
} as const;

export const DEFAULT_QUALITY_EDIT_STATE: QualityEditState = {
  enabled: false,
  autoApplied: false,
  exposureEv: 0,
  brightness: 0,
  contrast: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  sharpness: 0,
  diagnostics: undefined,
};

export function getDefaultQualityEditState(): QualityEditState {
  return {
    ...DEFAULT_QUALITY_EDIT_STATE,
  };
}

export function clampQualityEditState(edit: QualityEditState): QualityEditState {
  return {
    ...edit,
    exposureEv: clamp(
      edit.exposureEv,
      QUALITY_ADJUSTMENT_LIMITS.exposureEv.min,
      QUALITY_ADJUSTMENT_LIMITS.exposureEv.max,
    ),
    brightness: clamp(
      edit.brightness,
      QUALITY_ADJUSTMENT_LIMITS.brightness.min,
      QUALITY_ADJUSTMENT_LIMITS.brightness.max,
    ),
    contrast: clamp(
      edit.contrast,
      QUALITY_ADJUSTMENT_LIMITS.contrast.min,
      QUALITY_ADJUSTMENT_LIMITS.contrast.max,
    ),
    temperature: clamp(
      edit.temperature,
      QUALITY_ADJUSTMENT_LIMITS.temperature.min,
      QUALITY_ADJUSTMENT_LIMITS.temperature.max,
    ),
    tint: clamp(
      edit.tint,
      QUALITY_ADJUSTMENT_LIMITS.tint.min,
      QUALITY_ADJUSTMENT_LIMITS.tint.max,
    ),
    saturation: clamp(
      edit.saturation,
      QUALITY_ADJUSTMENT_LIMITS.saturation.min,
      QUALITY_ADJUSTMENT_LIMITS.saturation.max,
    ),
    sharpness: clamp(
      edit.sharpness,
      QUALITY_ADJUSTMENT_LIMITS.sharpness.min,
      QUALITY_ADJUSTMENT_LIMITS.sharpness.max,
    ),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(max, Math.max(min, value));
}
