import { calculateLuminance, QualityPixelData } from "./analyze-quality";
import { QualityCheck, QualityCheckStatus } from "./quality-types";

export type BackgroundQualityMeasures = {
  pixelCount: number;
  meanLuminance: number;
  luminanceStdDev: number;
  luminanceP05: number;
  luminanceP95: number;
  meanSaturation: number;
  dominantHue: number;
  nearWhitePct: number;
  shadowPct: number;
  uniformityScore: number;
};

export type BackgroundQualityAnalysis = {
  measures: BackgroundQualityMeasures;
  checks: QualityCheck[];
};

export const BACKGROUND_QUALITY_THRESHOLDS = {
  foregroundAlphaBackgroundMax: 0.25,
  minimumBackgroundSampleRatio: 0.04,
  borderSampleRatio: 0.12,
  lightPassMinLuminance: 175,
  lightWarningMinLuminance: 155,
  tooBrightWarningLuminance: 242,
  nearWhiteChannelMin: 248,
  nearWhiteFailPct: 45,
  nearWhiteWarningPct: 12,
  uniformPassStdDev: 8,
  uniformWarningStdDev: 18,
  shadowWarningDelta: 26,
  shadowFailDelta: 42,
  shadowWarningPct: 5,
  shadowFailPct: 12,
  grayMaxSaturation: 0.08,
  blueHueMin: 185,
  blueHueMax: 235,
  blueMaxSaturation: 0.28,
  yellowHueMin: 35,
  yellowHueMax: 75,
  yellowWarningSaturation: 0.08,
  yellowFailSaturation: 0.18,
  strongColorSaturation: 0.32,
} as const;

export function analyzeBackgroundQuality(
  pixelData: QualityPixelData,
  foregroundAlpha?: Float32Array,
): BackgroundQualityAnalysis {
  const samples = collectBackgroundSamples(pixelData, foregroundAlpha);
  const measures = calculateBackgroundMeasures(samples);

  return {
    measures,
    checks: [
      checkBackgroundUniform(measures),
      checkBackgroundLightEnough(measures),
      checkBackgroundNotPureWhite(measures),
      checkBackgroundColorRecommended(measures),
      checkBackgroundNoStrongShadow(measures),
    ],
  };
}

type BackgroundSample = {
  r: number;
  g: number;
  b: number;
  luminance: number;
  saturation: number;
  hue: number;
};

function collectBackgroundSamples(
  pixelData: QualityPixelData,
  foregroundAlpha: Float32Array | undefined,
): BackgroundSample[] {
  const samplesFromMask = foregroundAlpha
    ? collectSamples(pixelData, (pixelIndex) =>
        foregroundAlpha[pixelIndex] <= BACKGROUND_QUALITY_THRESHOLDS.foregroundAlphaBackgroundMax,
      )
    : [];
  const minimumMaskSamples = Math.floor(
    pixelData.width *
      pixelData.height *
      BACKGROUND_QUALITY_THRESHOLDS.minimumBackgroundSampleRatio,
  );

  if (samplesFromMask.length >= minimumMaskSamples) {
    return samplesFromMask;
  }

  return collectSamples(pixelData, (pixelIndex) => {
    const x = pixelIndex % pixelData.width;
    const y = Math.floor(pixelIndex / pixelData.width);
    const borderX = Math.ceil(pixelData.width * BACKGROUND_QUALITY_THRESHOLDS.borderSampleRatio);
    const borderY = Math.ceil(pixelData.height * BACKGROUND_QUALITY_THRESHOLDS.borderSampleRatio);

    return (
      x < borderX ||
      x >= pixelData.width - borderX ||
      y < borderY ||
      y >= pixelData.height - borderY
    );
  });
}

function collectSamples(
  pixelData: QualityPixelData,
  includePixel: (pixelIndex: number) => boolean,
): BackgroundSample[] {
  const samples: BackgroundSample[] = [];
  const pixelCount = pixelData.width * pixelData.height;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (!includePixel(pixelIndex)) {
      continue;
    }

    const sourceIndex = pixelIndex * 4;
    const r = pixelData.data[sourceIndex];
    const g = pixelData.data[sourceIndex + 1];
    const b = pixelData.data[sourceIndex + 2];
    const hsl = rgbToHsl(r, g, b);

    samples.push({
      r,
      g,
      b,
      luminance: calculateLuminance(r, g, b),
      saturation: hsl.saturation,
      hue: hsl.hue,
    });
  }

  return samples;
}

function calculateBackgroundMeasures(
  samples: readonly BackgroundSample[],
): BackgroundQualityMeasures {
  if (samples.length === 0) {
    return {
      pixelCount: 0,
      meanLuminance: 0,
      luminanceStdDev: 255,
      luminanceP05: 0,
      luminanceP95: 255,
      meanSaturation: 1,
      dominantHue: 0,
      nearWhitePct: 0,
      shadowPct: 100,
      uniformityScore: 0,
    };
  }

  const luminanceValues = samples.map((sample) => sample.luminance).sort((a, b) => a - b);
  const meanLuminance = average(luminanceValues);
  const luminanceStdDev = standardDeviation(luminanceValues, meanLuminance);
  const meanSaturation = average(samples.map((sample) => sample.saturation));
  const dominantHue = getDominantHue(samples);
  const nearWhitePct =
    (samples.filter(isNearWhite).length / samples.length) * 100;
  const shadowThreshold = meanLuminance - BACKGROUND_QUALITY_THRESHOLDS.shadowWarningDelta;
  const shadowPct =
    (samples.filter((sample) => sample.luminance < shadowThreshold).length /
      samples.length) *
    100;
  const uniformityScore = Math.round(
    clamp(100 - luminanceStdDev * 3 - shadowPct * 1.5, 0, 100),
  );

  return {
    pixelCount: samples.length,
    meanLuminance,
    luminanceStdDev,
    luminanceP05: percentile(luminanceValues, 0.05),
    luminanceP95: percentile(luminanceValues, 0.95),
    meanSaturation,
    dominantHue,
    nearWhitePct,
    shadowPct,
    uniformityScore,
  };
}

function checkBackgroundUniform(measures: BackgroundQualityMeasures): QualityCheck {
  if (measures.luminanceStdDev <= BACKGROUND_QUALITY_THRESHOLDS.uniformPassStdDev) {
    return createCheck(
      "backgroundUniform",
      "Fond uni",
      "pass",
      "Fond uniforme.",
      `ecart-type ${measures.luminanceStdDev.toFixed(1)}`,
    );
  }

  if (measures.luminanceStdDev <= BACKGROUND_QUALITY_THRESHOLDS.uniformWarningStdDev) {
    return createCheck(
      "backgroundUniform",
      "Fond uni",
      "warning",
      "Fond legerement heterogene.",
      `ecart-type ${measures.luminanceStdDev.toFixed(1)}`,
      "Verifier les ombres ou remplacer par un gris clair uniforme.",
    );
  }

  return createCheck(
    "backgroundUniform",
    "Fond uni",
    "fail",
    "Fond non uniforme : un degrade ou une ombre est visible.",
    `ecart-type ${measures.luminanceStdDev.toFixed(1)}`,
    "Corriger le fond ou reprendre la photo avec un fond plus uni.",
  );
}

function checkBackgroundLightEnough(measures: BackgroundQualityMeasures): QualityCheck {
  if (
    measures.meanLuminance >= BACKGROUND_QUALITY_THRESHOLDS.lightPassMinLuminance &&
    measures.meanLuminance < BACKGROUND_QUALITY_THRESHOLDS.tooBrightWarningLuminance
  ) {
    return createCheck(
      "backgroundLightEnough",
      "Fond clair",
      "pass",
      "Fond suffisamment clair.",
      `luminance ${Math.round(measures.meanLuminance)}`,
    );
  }

  if (measures.meanLuminance >= BACKGROUND_QUALITY_THRESHOLDS.lightWarningMinLuminance) {
    return createCheck(
      "backgroundLightEnough",
      "Fond clair",
      "warning",
      measures.meanLuminance >= BACKGROUND_QUALITY_THRESHOLDS.tooBrightWarningLuminance
        ? "Fond tres clair, a surveiller."
        : "Fond un peu sombre.",
      `luminance ${Math.round(measures.meanLuminance)}`,
      "Privilegier un gris clair ou un bleu clair.",
    );
  }

  return createCheck(
    "backgroundLightEnough",
    "Fond clair",
    "fail",
    "Fond trop sombre.",
    `luminance ${Math.round(measures.meanLuminance)}`,
    "Remplacer par un fond gris clair ou bleu clair.",
  );
}

function checkBackgroundNotPureWhite(measures: BackgroundQualityMeasures): QualityCheck {
  if (measures.nearWhitePct >= BACKGROUND_QUALITY_THRESHOLDS.nearWhiteFailPct) {
    return createCheck(
      "backgroundNotPureWhite",
      "Fond non blanc",
      "fail",
      "Fond trop blanc : le fond blanc pur est interdit.",
      `${measures.nearWhitePct.toFixed(1)}% quasi blanc`,
      "Remplacer par un gris clair ou un bleu clair.",
    );
  }

  if (measures.nearWhitePct >= BACKGROUND_QUALITY_THRESHOLDS.nearWhiteWarningPct) {
    return createCheck(
      "backgroundNotPureWhite",
      "Fond non blanc",
      "warning",
      "Fond trop proche du blanc.",
      `${measures.nearWhitePct.toFixed(1)}% quasi blanc`,
      "Assombrir legerement vers gris clair ou bleu clair.",
    );
  }

  return createCheck(
    "backgroundNotPureWhite",
    "Fond non blanc",
    "pass",
    "Fond distinct du blanc pur.",
    `${measures.nearWhitePct.toFixed(1)}% quasi blanc`,
  );
}

function checkBackgroundColorRecommended(
  measures: BackgroundQualityMeasures,
): QualityCheck {
  const isGray = measures.meanSaturation <= BACKGROUND_QUALITY_THRESHOLDS.grayMaxSaturation;
  const isLightBlue =
    measures.dominantHue >= BACKGROUND_QUALITY_THRESHOLDS.blueHueMin &&
    measures.dominantHue <= BACKGROUND_QUALITY_THRESHOLDS.blueHueMax &&
    measures.meanSaturation <= BACKGROUND_QUALITY_THRESHOLDS.blueMaxSaturation;
  const isYellow =
    measures.dominantHue >= BACKGROUND_QUALITY_THRESHOLDS.yellowHueMin &&
    measures.dominantHue <= BACKGROUND_QUALITY_THRESHOLDS.yellowHueMax &&
    measures.meanSaturation >= BACKGROUND_QUALITY_THRESHOLDS.yellowWarningSaturation;

  if (isGray || isLightBlue) {
    return createCheck(
      "backgroundColorRecommended",
      "Couleur du fond",
      "pass",
      isGray ? "Fond gris clair recommande." : "Fond bleu clair recommande.",
      `teinte ${Math.round(measures.dominantHue)}°, saturation ${measures.meanSaturation.toFixed(2)}`,
    );
  }

  if (isYellow) {
    return createCheck(
      "backgroundColorRecommended",
      "Couleur du fond",
      measures.meanSaturation >= BACKGROUND_QUALITY_THRESHOLDS.yellowFailSaturation
        ? "fail"
        : "warning",
      "Fond trop jaune : privilegier un gris clair ou un bleu clair.",
      `teinte ${Math.round(measures.dominantHue)}°, saturation ${measures.meanSaturation.toFixed(2)}`,
      "Remplacer par gris clair ou bleu clair.",
    );
  }

  if (measures.meanSaturation > BACKGROUND_QUALITY_THRESHOLDS.strongColorSaturation) {
    return createCheck(
      "backgroundColorRecommended",
      "Couleur du fond",
      "fail",
      "Fond colore marque.",
      `teinte ${Math.round(measures.dominantHue)}°, saturation ${measures.meanSaturation.toFixed(2)}`,
      "Utiliser une couleur claire et peu saturee.",
    );
  }

  return createCheck(
    "backgroundColorRecommended",
    "Couleur du fond",
    "warning",
    "Couleur de fond a verifier.",
    `teinte ${Math.round(measures.dominantHue)}°, saturation ${measures.meanSaturation.toFixed(2)}`,
    "Les teintes gris clair et bleu clair sont les plus prudentes.",
  );
}

function checkBackgroundNoStrongShadow(measures: BackgroundQualityMeasures): QualityCheck {
  const shadowSpread = measures.luminanceP95 - measures.luminanceP05;

  if (
    measures.shadowPct >= BACKGROUND_QUALITY_THRESHOLDS.shadowFailPct ||
    shadowSpread >= BACKGROUND_QUALITY_THRESHOLDS.shadowFailDelta
  ) {
    return createCheck(
      "backgroundNoStrongShadow",
      "Ombres sur fond",
      "fail",
      "Ombre forte detectee sur le fond.",
      `${measures.shadowPct.toFixed(1)}% pixels sombres`,
      "Eloigner la personne du fond ou remplacer le fond.",
    );
  }

  if (measures.shadowPct >= BACKGROUND_QUALITY_THRESHOLDS.shadowWarningPct) {
    return createCheck(
      "backgroundNoStrongShadow",
      "Ombres sur fond",
      "warning",
      "Ombre legere possible sur le fond.",
      `${measures.shadowPct.toFixed(1)}% pixels sombres`,
      "Verifier visuellement le fond.",
    );
  }

  return createCheck(
    "backgroundNoStrongShadow",
    "Ombres sur fond",
    "pass",
    "Pas d'ombre forte detectee sur le fond.",
    `${measures.shadowPct.toFixed(1)}% pixels sombres`,
  );
}

function createCheck(
  id: QualityCheck["id"],
  label: string,
  status: QualityCheckStatus,
  message: string,
  measure?: string,
  suggestion?: string,
): QualityCheck {
  return { id, label, status, message, measure, suggestion };
}

function isNearWhite(sample: BackgroundSample): boolean {
  return (
    sample.r >= BACKGROUND_QUALITY_THRESHOLDS.nearWhiteChannelMin &&
    sample.g >= BACKGROUND_QUALITY_THRESHOLDS.nearWhiteChannelMin &&
    sample.b >= BACKGROUND_QUALITY_THRESHOLDS.nearWhiteChannelMin
  );
}

function rgbToHsl(
  rByte: number,
  gByte: number,
  bByte: number,
): { hue: number; saturation: number } {
  const r = rByte / 255;
  const g = gByte / 255;
  const b = bByte / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0 };
  }

  const saturation = delta;
  let hue = 0;

  if (max === r) {
    hue = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
    hue = 60 * ((b - r) / delta + 2);
  } else {
    hue = 60 * ((r - g) / delta + 4);
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation,
  };
}

function getDominantHue(samples: readonly BackgroundSample[]): number {
  let x = 0;
  let y = 0;

  for (const sample of samples) {
    if (sample.saturation < 0.03) {
      continue;
    }

    const radians = (sample.hue * Math.PI) / 180;
    x += Math.cos(radians) * sample.saturation;
    y += Math.sin(radians) * sample.saturation;
  }

  if (x === 0 && y === 0) {
    return 0;
  }

  const degrees = (Math.atan2(y, x) * 180) / Math.PI;

  return degrees < 0 ? degrees + 360 : degrees;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[], mean: number): number {
  const variance = average(values.map((value) => (value - mean) ** 2));

  return Math.sqrt(variance);
}

function percentile(sortedValues: readonly number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = ratio * (sortedValues.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const interpolation = index - lowerIndex;

  return (
    sortedValues[lowerIndex] * (1 - interpolation) +
    sortedValues[upperIndex] * interpolation
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
