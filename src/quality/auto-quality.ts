import { QUALITY_DIAGNOSTIC_THRESHOLDS } from "./analyze-quality";
import {
  QualityDiagnostics,
  QualityEditState,
  clampQualityEditState,
  getDefaultQualityEditState,
} from "./quality-state";

export function createAutoQualityEdit(
  diagnostics: QualityDiagnostics,
): QualityEditState {
  const edit = getDefaultQualityEditState();

  edit.enabled = true;
  edit.autoApplied = true;

  if (diagnostics.meanLuminance < QUALITY_DIAGNOSTIC_THRESHOLDS.darkMeanLuminance) {
    edit.exposureEv = diagnostics.meanLuminance < 85 ? 0.3 : 0.18;
    edit.brightness = diagnostics.meanLuminance < 85 ? 8 : 5;
  } else if (
    diagnostics.meanLuminance > QUALITY_DIAGNOSTIC_THRESHOLDS.brightMeanLuminance
  ) {
    edit.exposureEv = diagnostics.meanLuminance > 230 ? -0.25 : -0.16;
    edit.brightness = diagnostics.meanLuminance > 230 ? -8 : -5;
  }

  if (diagnostics.contrastSpread < QUALITY_DIAGNOSTIC_THRESHOLDS.lowContrastSpread) {
    edit.contrast = diagnostics.contrastSpread < 60 ? 16 : 10;
  } else if (
    diagnostics.contrastSpread > QUALITY_DIAGNOSTIC_THRESHOLDS.highContrastSpread
  ) {
    edit.contrast = -6;
  }

  switch (diagnostics.colorCast) {
    case "warm":
      edit.temperature = -6;
      break;
    case "cool":
      edit.temperature = 6;
      break;
    case "green":
      edit.tint = 5;
      break;
    case "magenta":
      edit.tint = -5;
      break;
    case "none":
      break;
  }

  edit.saturation =
    diagnostics.colorCast === "none" && diagnostics.contrastSpread >= 85 ? 3 : 1;

  if (diagnostics.sharpnessScore < QUALITY_DIAGNOSTIC_THRESHOLDS.blurrySharpnessScore) {
    edit.sharpness = 10;
  } else if (
    diagnostics.sharpnessScore < QUALITY_DIAGNOSTIC_THRESHOLDS.softSharpnessScore
  ) {
    edit.sharpness = 6;
  }

  edit.diagnostics = diagnostics;

  return clampQualityEditState(edit);
}
