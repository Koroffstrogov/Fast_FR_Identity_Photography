import { ColorCast, QualityDiagnostics, QualityStatus } from "./quality-state";
import { calculateSharpnessScore } from "./sharpness";

export type QualityPixelData = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export const QUALITY_DIAGNOSTIC_THRESHOLDS = {
  clippedShadowLuminance: 5,
  clippedHighlightLuminance: 250,
  clippingWarningPct: 1.5,
  lowContrastSpread: 85,
  highContrastSpread: 225,
  darkMeanLuminance: 105,
  brightMeanLuminance: 210,
  blurrySharpnessScore: 7,
  softSharpnessScore: 14,
  colorCastDelta: 10,
  strongColorCastDelta: 18,
} as const;

export function analyzeQuality(pixelData: QualityPixelData): QualityDiagnostics {
  assertPixelData(pixelData);

  const luminanceValues: number[] = [];
  let clippedShadows = 0;
  let clippedHighlights = 0;
  let luminanceSum = 0;
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  const pixelCount = pixelData.width * pixelData.height;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const sourceIndex = pixelIndex * 4;
    const r = pixelData.data[sourceIndex];
    const g = pixelData.data[sourceIndex + 1];
    const b = pixelData.data[sourceIndex + 2];
    const luminance = calculateLuminance(r, g, b);

    luminanceValues.push(luminance);
    luminanceSum += luminance;
    redSum += r;
    greenSum += g;
    blueSum += b;

    if (luminance < QUALITY_DIAGNOSTIC_THRESHOLDS.clippedShadowLuminance) {
      clippedShadows += 1;
    }

    if (luminance > QUALITY_DIAGNOSTIC_THRESHOLDS.clippedHighlightLuminance) {
      clippedHighlights += 1;
    }
  }

  luminanceValues.sort((first, second) => first - second);

  const p05 = calculatePercentile(luminanceValues, 0.05);
  const p50 = calculatePercentile(luminanceValues, 0.5);
  const p95 = calculatePercentile(luminanceValues, 0.95);
  const contrastSpread = p95 - p05;
  const clippedShadowsPct = (clippedShadows / pixelCount) * 100;
  const clippedHighlightsPct = (clippedHighlights / pixelCount) * 100;
  const meanLuminance = luminanceSum / pixelCount;
  const sharpnessScore = calculateSharpnessScore(
    pixelData.data,
    pixelData.width,
    pixelData.height,
  );
  const colorCast = detectColorCast(
    redSum / pixelCount,
    greenSum / pixelCount,
    blueSum / pixelCount,
  );
  const warnings = buildWarnings({
    meanLuminance,
    contrastSpread,
    clippedShadowsPct,
    clippedHighlightsPct,
    sharpnessScore,
    colorCast,
  });
  const score = calculateQualityScore({
    meanLuminance,
    contrastSpread,
    clippedShadowsPct,
    clippedHighlightsPct,
    sharpnessScore,
    colorCast,
  });
  const status = getQualityStatus(score, warnings.length);

  return {
    meanLuminance,
    p05,
    p50,
    p95,
    contrastSpread,
    clippedShadowsPct,
    clippedHighlightsPct,
    sharpnessScore,
    colorCast,
    warnings,
    status,
    score,
  };
}

export function calculateLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculatePercentile(
  sortedValues: readonly number[],
  percentile: number,
): number {
  if (sortedValues.length === 0) {
    throw new Error("sortedValues must not be empty");
  }

  if (!Number.isFinite(percentile) || percentile < 0 || percentile > 1) {
    throw new Error("percentile must be between 0 and 1");
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const index = percentile * (sortedValues.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const ratio = index - lowerIndex;

  return (
    sortedValues[lowerIndex] * (1 - ratio) + sortedValues[upperIndex] * ratio
  );
}

export function detectColorCast(
  meanR: number,
  meanG: number,
  meanB: number,
): ColorCast {
  const redBlueDelta = meanR - meanB;
  const greenDelta = meanG - (meanR + meanB) / 2;
  const magentaDelta = (meanR + meanB) / 2 - meanG;

  if (greenDelta > QUALITY_DIAGNOSTIC_THRESHOLDS.strongColorCastDelta) {
    return "green";
  }

  if (magentaDelta > QUALITY_DIAGNOSTIC_THRESHOLDS.strongColorCastDelta) {
    return "magenta";
  }

  if (redBlueDelta > QUALITY_DIAGNOSTIC_THRESHOLDS.colorCastDelta) {
    return "warm";
  }

  if (-redBlueDelta > QUALITY_DIAGNOSTIC_THRESHOLDS.colorCastDelta) {
    return "cool";
  }

  return "none";
}

function buildWarnings({
  meanLuminance,
  contrastSpread,
  clippedShadowsPct,
  clippedHighlightsPct,
  sharpnessScore,
  colorCast,
}: Pick<
  QualityDiagnostics,
  | "meanLuminance"
  | "contrastSpread"
  | "clippedShadowsPct"
  | "clippedHighlightsPct"
  | "sharpnessScore"
  | "colorCast"
>): string[] {
  const warnings: string[] = [];

  if (meanLuminance < QUALITY_DIAGNOSTIC_THRESHOLDS.darkMeanLuminance) {
    warnings.push("Photo legerement sombre.");
  } else if (meanLuminance > QUALITY_DIAGNOSTIC_THRESHOLDS.brightMeanLuminance) {
    warnings.push("Photo trop claire.");
  }

  if (contrastSpread < QUALITY_DIAGNOSTIC_THRESHOLDS.lowContrastSpread) {
    warnings.push("Contraste faible : rendu possiblement grisatre.");
  } else if (contrastSpread > QUALITY_DIAGNOSTIC_THRESHOLDS.highContrastSpread) {
    warnings.push("Contraste dur : transitions potentiellement trop fortes.");
  }

  if (clippedShadowsPct > QUALITY_DIAGNOSTIC_THRESHOLDS.clippingWarningPct) {
    warnings.push("Zones sombres potentiellement bouchees.");
  }

  if (clippedHighlightsPct > QUALITY_DIAGNOSTIC_THRESHOLDS.clippingWarningPct) {
    warnings.push("Zones claires potentiellement brulees.");
  }

  if (sharpnessScore < QUALITY_DIAGNOSTIC_THRESHOLDS.blurrySharpnessScore) {
    warnings.push("Photo probablement floue.");
  } else if (sharpnessScore < QUALITY_DIAGNOSTIC_THRESHOLDS.softSharpnessScore) {
    warnings.push("Nettete faible : verifiez le rendu du visage.");
  }

  if (colorCast !== "none") {
    warnings.push(getColorCastWarning(colorCast));
  }

  return warnings;
}

function calculateQualityScore({
  meanLuminance,
  contrastSpread,
  clippedShadowsPct,
  clippedHighlightsPct,
  sharpnessScore,
  colorCast,
}: Pick<
  QualityDiagnostics,
  | "meanLuminance"
  | "contrastSpread"
  | "clippedShadowsPct"
  | "clippedHighlightsPct"
  | "sharpnessScore"
  | "colorCast"
>): number {
  let score = 100;

  score -= Math.min(22, Math.abs(meanLuminance - 155) / 3.5);

  if (contrastSpread < QUALITY_DIAGNOSTIC_THRESHOLDS.lowContrastSpread) {
    score -= Math.min(20, (QUALITY_DIAGNOSTIC_THRESHOLDS.lowContrastSpread - contrastSpread) / 2);
  } else if (contrastSpread > QUALITY_DIAGNOSTIC_THRESHOLDS.highContrastSpread) {
    score -= Math.min(14, (contrastSpread - QUALITY_DIAGNOSTIC_THRESHOLDS.highContrastSpread) / 3);
  }

  score -= Math.min(16, clippedShadowsPct * 4);
  score -= Math.min(16, clippedHighlightsPct * 4);

  if (sharpnessScore < QUALITY_DIAGNOSTIC_THRESHOLDS.softSharpnessScore) {
    score -= Math.min(18, QUALITY_DIAGNOSTIC_THRESHOLDS.softSharpnessScore - sharpnessScore);
  }

  if (colorCast !== "none") {
    score -= 8;
  }

  return Math.round(clamp(score, 0, 100));
}

function getQualityStatus(score: number, warningCount: number): QualityStatus {
  if (score < 55 || warningCount >= 4) {
    return "problem";
  }

  if (score < 78 || warningCount > 0) {
    return "warning";
  }

  return "ok";
}

function getColorCastWarning(colorCast: ColorCast): string {
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
      return "";
  }
}

function assertPixelData(pixelData: QualityPixelData): void {
  if (
    !Number.isFinite(pixelData.width) ||
    !Number.isFinite(pixelData.height) ||
    pixelData.width <= 0 ||
    pixelData.height <= 0 ||
    pixelData.data.length < pixelData.width * pixelData.height * 4
  ) {
    throw new Error("pixelData must contain positive dimensions and RGBA pixels");
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
