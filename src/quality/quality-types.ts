export type QualityCheckStatus = "pass" | "warning" | "fail";

export type QualityCheckId =
  | "sharpness"
  | "exposure"
  | "contrast"
  | "backgroundUniform"
  | "backgroundLightEnough"
  | "backgroundNotPureWhite"
  | "backgroundColorRecommended"
  | "backgroundNoStrongShadow"
  | "format";

export type QualityCheck = {
  id: QualityCheckId;
  label: string;
  status: QualityCheckStatus;
  message: string;
  suggestion?: string;
  measure?: string;
};

export type QualityAnalysisMeasures = {
  meanLuminance: number;
  contrastSpread: number;
  sharpnessScore: number;
  backgroundPixelCount: number;
  backgroundMeanLuminance?: number;
  backgroundLuminanceStdDev?: number;
  backgroundMeanSaturation?: number;
  backgroundDominantHue?: number;
  backgroundNearWhitePct?: number;
  backgroundShadowPct?: number;
  backgroundUniformityScore?: number;
};

export type QualityAnalysisSnapshot = {
  status: QualityCheckStatus;
  score: number;
  checks: QualityCheck[];
  messages: string[];
  measures: QualityAnalysisMeasures;
};

export type QualityBeforeAfterAnalysis = {
  beforeCorrections: QualityAnalysisSnapshot;
  afterCorrections: QualityAnalysisSnapshot;
  status: QualityCheckStatus;
  score: number;
  messages: string[];
};
