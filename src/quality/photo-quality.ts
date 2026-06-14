import { renderMaskToTargetAlpha } from "../canvas/apply-background";
import { renderPhotoToCanvas } from "../canvas/render-photo";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";
import { analyzeQuality, QualityPixelData } from "./analyze-quality";
import { analyzeBackgroundQuality } from "./background-quality";
import { QualityDiagnostics } from "./quality-state";
import {
  QualityAnalysisSnapshot,
  QualityBeforeAfterAnalysis,
  QualityCheck,
  QualityCheckStatus,
} from "./quality-types";

export type QualitySnapshotKind = "beforeCorrections" | "afterCorrections";

export function analyzePhotoQualityBeforeAfter(
  photo: PhotoItem,
): QualityBeforeAfterAnalysis {
  const beforeCorrections = analyzePhotoQualitySnapshot(photo, "beforeCorrections");
  const afterCorrections = analyzePhotoQualitySnapshot(photo, "afterCorrections");
  const messages = buildBeforeAfterMessages(beforeCorrections, afterCorrections);

  return {
    beforeCorrections,
    afterCorrections,
    status: afterCorrections.status,
    score: afterCorrections.score,
    messages,
  };
}

export function analyzePhotoQualitySnapshot(
  photo: PhotoItem,
  kind: QualitySnapshotKind,
): QualityAnalysisSnapshot {
  const canvas = document.createElement("canvas");
  renderQualitySnapshotToCanvas(canvas, photo, kind);

  const context = getCanvasContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const foregroundAlpha = createForegroundAlphaForAnalysis(canvas, photo);
  const baseDiagnostics = analyzeQuality(imageData);
  const backgroundAnalysis = analyzeBackgroundQuality(imageData, foregroundAlpha);
  const checks = [
    createExposureCheck(baseDiagnostics),
    createContrastCheck(baseDiagnostics),
    createSharpnessCheck(baseDiagnostics),
    ...backgroundAnalysis.checks,
    createFormatCheck(imageData),
  ];
  const status = getWorstStatus(checks);
  const score = calculateSnapshotScore(checks, baseDiagnostics.score);

  return {
    status,
    score,
    checks,
    messages: buildSnapshotMessages(status, checks),
    measures: {
      meanLuminance: baseDiagnostics.meanLuminance,
      contrastSpread: baseDiagnostics.contrastSpread,
      sharpnessScore: baseDiagnostics.sharpnessScore,
      backgroundPixelCount: backgroundAnalysis.measures.pixelCount,
      backgroundMeanLuminance: backgroundAnalysis.measures.meanLuminance,
      backgroundLuminanceStdDev: backgroundAnalysis.measures.luminanceStdDev,
      backgroundMeanSaturation: backgroundAnalysis.measures.meanSaturation,
      backgroundDominantHue: backgroundAnalysis.measures.dominantHue,
      backgroundNearWhitePct: backgroundAnalysis.measures.nearWhitePct,
      backgroundShadowPct: backgroundAnalysis.measures.shadowPct,
      backgroundUniformityScore: backgroundAnalysis.measures.uniformityScore,
    },
  };
}

export function renderQualitySnapshotToCanvas(
  canvas: HTMLCanvasElement,
  photo: PhotoItem,
  kind: QualitySnapshotKind,
): void {
  if (kind === "beforeCorrections") {
    renderPhotoToCanvas(
      canvas,
      photo.image,
      photo.editState.transform,
      undefined,
      "export",
      undefined,
    );
    return;
  }

  renderPhotoToCanvas(
    canvas,
    photo.image,
    photo.editState.transform,
    photo.backgroundEdit,
    "export",
    photo.qualityEdit,
  );
}

function createForegroundAlphaForAnalysis(
  targetCanvas: HTMLCanvasElement,
  photo: PhotoItem,
): Float32Array | undefined {
  const rawMask = photo.backgroundEdit?.rawMask;

  if (!rawMask || !photo.backgroundEdit) {
    return undefined;
  }

  return renderMaskToTargetAlpha(
    rawMask,
    targetCanvas,
    {
      width: photo.image.naturalWidth,
      height: photo.image.naturalHeight,
    },
    photo.editState.transform,
    photo.backgroundEdit,
  );
}

function createExposureCheck(diagnostics: QualityDiagnostics): QualityCheck {
  if (diagnostics.meanLuminance < 95 || diagnostics.meanLuminance > 225) {
    return {
      id: "exposure",
      label: "Exposition",
      status: "fail",
      message:
        diagnostics.meanLuminance < 95
          ? "Image trop sombre."
          : "Image trop claire.",
      suggestion: "Corriger l'eclairage ou reprendre la photo si necessaire.",
      measure: `luminance ${Math.round(diagnostics.meanLuminance)}`,
    };
  }

  if (diagnostics.meanLuminance < 115 || diagnostics.meanLuminance > 205) {
    return {
      id: "exposure",
      label: "Exposition",
      status: "warning",
      message: "Exposition a surveiller.",
      suggestion: "Eclaircir ou assombrir tres legerement.",
      measure: `luminance ${Math.round(diagnostics.meanLuminance)}`,
    };
  }

  return {
    id: "exposure",
    label: "Exposition",
    status: "pass",
    message: "Exposition utilisable.",
    measure: `luminance ${Math.round(diagnostics.meanLuminance)}`,
  };
}

function createContrastCheck(diagnostics: QualityDiagnostics): QualityCheck {
  if (diagnostics.contrastSpread < 55 || diagnostics.contrastSpread > 245) {
    return {
      id: "contrast",
      label: "Contraste",
      status: "fail",
      message:
        diagnostics.contrastSpread < 55
          ? "Contraste trop faible."
          : "Contraste trop dur.",
      suggestion: "Ajuster moderement le contraste ou reprendre la photo.",
      measure: `ecart ${Math.round(diagnostics.contrastSpread)}`,
    };
  }

  if (diagnostics.contrastSpread < 85 || diagnostics.contrastSpread > 225) {
    return {
      id: "contrast",
      label: "Contraste",
      status: "warning",
      message: "Contraste a surveiller.",
      suggestion: "Appliquer une correction legere seulement.",
      measure: `ecart ${Math.round(diagnostics.contrastSpread)}`,
    };
  }

  return {
    id: "contrast",
    label: "Contraste",
    status: "pass",
    message: "Contraste utilisable.",
    measure: `ecart ${Math.round(diagnostics.contrastSpread)}`,
  };
}

function createSharpnessCheck(diagnostics: QualityDiagnostics): QualityCheck {
  if (diagnostics.sharpnessScore < 7) {
    return {
      id: "sharpness",
      label: "Nettete",
      status: "fail",
      message: "Photo probablement floue.",
      suggestion: "Reprendre la photo si le visage manque de detail.",
      measure: `score ${diagnostics.sharpnessScore.toFixed(1)}`,
    };
  }

  if (diagnostics.sharpnessScore < 14) {
    return {
      id: "sharpness",
      label: "Nettete",
      status: "warning",
      message: "Nettete faible.",
      suggestion: "Ajouter une nettete tres legere si le rendu reste naturel.",
      measure: `score ${diagnostics.sharpnessScore.toFixed(1)}`,
    };
  }

  return {
    id: "sharpness",
    label: "Nettete",
    status: "pass",
    message: "Nettete suffisante.",
    measure: `score ${diagnostics.sharpnessScore.toFixed(1)}`,
  };
}

function createFormatCheck(pixelData: QualityPixelData): QualityCheck {
  const formatOk =
    pixelData.width === PHOTO_FORMAT.widthPx &&
    pixelData.height === PHOTO_FORMAT.heightPx;

  return {
    id: "format",
    label: "Format",
    status: formatOk ? "pass" : "fail",
    message: formatOk
      ? "Rendu 35 x 45 mm en 300 dpi."
      : "Dimensions de rendu inattendues.",
    measure: `${pixelData.width} x ${pixelData.height} px`,
  };
}

function buildSnapshotMessages(
  status: QualityCheckStatus,
  checks: readonly QualityCheck[],
): string[] {
  const failingMessages = checks
    .filter((check) => check.status === "fail")
    .map((check) => check.message);
  const warningMessages = checks
    .filter((check) => check.status === "warning")
    .map((check) => check.message);

  if (status === "pass") {
    return ["Apres corrections, le fond semble conforme."];
  }

  return [...failingMessages, ...warningMessages].slice(0, 4);
}

function buildBeforeAfterMessages(
  beforeCorrections: QualityAnalysisSnapshot,
  afterCorrections: QualityAnalysisSnapshot,
): string[] {
  const messages: string[] = [];

  if (
    isCheckImproved(beforeCorrections, afterCorrections, "backgroundUniform") &&
    getCheck(afterCorrections, "backgroundUniform")?.status === "pass"
  ) {
    messages.push("Fond non uniforme avant / fond conforme apres.");
  }

  if (
    isCheckImproved(beforeCorrections, afterCorrections, "backgroundNotPureWhite") &&
    getCheck(afterCorrections, "backgroundNotPureWhite")?.status === "pass"
  ) {
    messages.push("Le remplacement de fond evite le blanc pur.");
  }

  if (afterCorrections.status === "pass") {
    messages.push("Apres corrections, le fond semble conforme.");
  } else if (beforeCorrections.score < afterCorrections.score) {
    messages.push(
      "L'image finale est meilleure que l'originale, mais certains points restent a surveiller.",
    );
  }

  if (messages.length === 0) {
    messages.push("Comparez l'original et le rendu final avant export.");
  }

  return messages;
}

function isCheckImproved(
  beforeCorrections: QualityAnalysisSnapshot,
  afterCorrections: QualityAnalysisSnapshot,
  checkId: QualityCheck["id"],
): boolean {
  const before = getCheck(beforeCorrections, checkId);
  const after = getCheck(afterCorrections, checkId);

  if (!before || !after) {
    return false;
  }

  return getStatusRank(after.status) > getStatusRank(before.status);
}

function getCheck(
  snapshot: QualityAnalysisSnapshot,
  checkId: QualityCheck["id"],
): QualityCheck | undefined {
  return snapshot.checks.find((check) => check.id === checkId);
}

function getWorstStatus(checks: readonly QualityCheck[]): QualityCheckStatus {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "pass";
}

function calculateSnapshotScore(
  checks: readonly QualityCheck[],
  baseQualityScore: number,
): number {
  const penalty = checks.reduce((sum, check) => {
    if (check.status === "fail") {
      return sum + 14;
    }

    if (check.status === "warning") {
      return sum + 6;
    }

    return sum;
  }, 0);

  return Math.max(0, Math.min(100, Math.round(baseQualityScore - penalty)));
}

function getStatusRank(status: QualityCheckStatus): number {
  switch (status) {
    case "fail":
      return 0;
    case "warning":
      return 1;
    case "pass":
      return 2;
  }
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
