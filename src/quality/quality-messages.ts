import { QUALITY_DIAGNOSTIC_THRESHOLDS } from "./analyze-quality";
import { QualityDiagnostics, QualityStatus } from "./quality-state";

export type QualityDiagnosticRow = {
  label: string;
  status: QualityStatus;
  message: string;
  suggestion?: string;
};

export function getQualityStatusLabel(status: QualityStatus): string {
  switch (status) {
    case "ok":
      return "Correct";
    case "warning":
      return "A verifier";
    case "problem":
      return "Probleme probable";
  }
}

export function getQualityDiagnosticRows(
  diagnostics: QualityDiagnostics,
): QualityDiagnosticRow[] {
  return [
    getExposureRow(diagnostics),
    getContrastRow(diagnostics),
    getSharpnessRow(diagnostics),
    getColorRow(diagnostics),
    getClippingRow(diagnostics),
  ];
}

function getExposureRow(diagnostics: QualityDiagnostics): QualityDiagnosticRow {
  if (diagnostics.meanLuminance < QUALITY_DIAGNOSTIC_THRESHOLDS.darkMeanLuminance) {
    return {
      label: "Exposition",
      status: "warning",
      message: "Photo legerement sombre.",
      suggestion: "Augmenter legerement l'exposition.",
    };
  }

  if (diagnostics.meanLuminance > QUALITY_DIAGNOSTIC_THRESHOLDS.brightMeanLuminance) {
    return {
      label: "Exposition",
      status: "warning",
      message: "Photo trop claire.",
      suggestion: "Reduire legerement l'exposition.",
    };
  }

  return {
    label: "Exposition",
    status: "ok",
    message: "Luminosite moyenne correcte.",
  };
}

function getContrastRow(diagnostics: QualityDiagnostics): QualityDiagnosticRow {
  if (diagnostics.contrastSpread < QUALITY_DIAGNOSTIC_THRESHOLDS.lowContrastSpread) {
    return {
      label: "Contraste",
      status: "warning",
      message: "Contraste faible : rendu possiblement grisatre.",
      suggestion: "Augmenter moderement le contraste.",
    };
  }

  if (diagnostics.contrastSpread > QUALITY_DIAGNOSTIC_THRESHOLDS.highContrastSpread) {
    return {
      label: "Contraste",
      status: "warning",
      message: "Contraste dur.",
      suggestion: "Reduire legerement le contraste.",
    };
  }

  return {
    label: "Contraste",
    status: "ok",
    message: "Contraste utilisable.",
  };
}

function getSharpnessRow(diagnostics: QualityDiagnostics): QualityDiagnosticRow {
  if (diagnostics.sharpnessScore < QUALITY_DIAGNOSTIC_THRESHOLDS.blurrySharpnessScore) {
    return {
      label: "Nettete",
      status: "problem",
      message: "Photo probablement floue.",
      suggestion: "Appliquer une nettete legere, si l'image le permet.",
    };
  }

  if (diagnostics.sharpnessScore < QUALITY_DIAGNOSTIC_THRESHOLDS.softSharpnessScore) {
    return {
      label: "Nettete",
      status: "warning",
      message: "Nettete faible.",
      suggestion: "Ajouter une nettete tres legere.",
    };
  }

  return {
    label: "Nettete",
    status: "ok",
    message: "Nettete correcte.",
  };
}

function getColorRow(diagnostics: QualityDiagnostics): QualityDiagnosticRow {
  if (diagnostics.colorCast === "none") {
    return {
      label: "Couleur",
      status: "ok",
      message: "Aucune dominante forte detectee.",
    };
  }

  return {
    label: "Couleur",
    status: "warning",
    message: getColorCastMessage(diagnostics.colorCast),
    suggestion: "Correction de couleur douce uniquement.",
  };
}

function getClippingRow(diagnostics: QualityDiagnostics): QualityDiagnosticRow {
  const shadowClipping =
    diagnostics.clippedShadowsPct > QUALITY_DIAGNOSTIC_THRESHOLDS.clippingWarningPct;
  const highlightClipping =
    diagnostics.clippedHighlightsPct > QUALITY_DIAGNOSTIC_THRESHOLDS.clippingWarningPct;

  if (shadowClipping || highlightClipping) {
    return {
      label: "Hautes lumieres / ombres",
      status: "warning",
      message: [
        shadowClipping ? "ombres bouchees" : "",
        highlightClipping ? "zones claires brulees" : "",
      ]
        .filter(Boolean)
        .join(", "),
      suggestion: "Verifier l'eclairage ou reduire les corrections extremes.",
    };
  }

  return {
    label: "Hautes lumieres / ombres",
    status: "ok",
    message: "Pas de clipping important detecte.",
  };
}

function getColorCastMessage(colorCast: QualityDiagnostics["colorCast"]): string {
  switch (colorCast) {
    case "warm":
      return "Dominante chaude detectee.";
    case "cool":
      return "Dominante froide detectee.";
    case "green":
      return "Dominante verte detectee.";
    case "magenta":
      return "Dominante magenta detectee.";
    case "none":
      return "Aucune dominante forte detectee.";
  }
}
