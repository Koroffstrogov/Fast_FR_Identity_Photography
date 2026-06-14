import {
  PHOTO_HEIGHT_MM,
  PHOTO_WIDTH_MM,
} from "./photo-format";

export const FRANCE_ID_PHOTO_GUIDE = {
  photoWidthMm: PHOTO_WIDTH_MM,
  photoHeightMm: PHOTO_HEIGHT_MM,

  faceHeightMinMm: 32,
  faceHeightTargetMm: 34,
  faceHeightMaxMm: 36,

  chinYTargetMm: 39.5,
  skullTopYTargetMm: 5.5,

  skullTopYForFaceMinMm: 7.5,
  skullTopYForFaceTargetMm: 5.5,
  skullTopYForFaceMaxMm: 3.5,

  eyeLineYIndicativeMm: 21,
  shoulderLineYIndicativeMm: 42,
} as const;

export type FaceGuideVariant = "france-official" | "child-school" | "sport-badge";

export type FaceGuideLine = {
  id: string;
  yMm: number;
  label: string;
};

export type FaceGuideBand = {
  id: string;
  topYMm: number;
  bottomYMm: number;
  label: string;
};

export type FaceGuide = {
  variant: FaceGuideVariant;
  photoWidthMm: number;
  photoHeightMm: number;
  faceHeightMinMm: number;
  faceHeightTargetMm: number;
  faceHeightMaxMm: number;
  centerXMm: number;
  toleranceBand: FaceGuideBand;
  chinLine: FaceGuideLine;
  skullTopTargetLine: FaceGuideLine;
  eyeLine: FaceGuideLine;
  shoulderLine: FaceGuideLine;
};

export function getFranceOfficialFaceGuide(): FaceGuide {
  const guide = FRANCE_ID_PHOTO_GUIDE;

  return {
    variant: "france-official",
    photoWidthMm: guide.photoWidthMm,
    photoHeightMm: guide.photoHeightMm,
    faceHeightMinMm: guide.faceHeightMinMm,
    faceHeightTargetMm: guide.faceHeightTargetMm,
    faceHeightMaxMm: guide.faceHeightMaxMm,
    centerXMm: guide.photoWidthMm / 2,
    toleranceBand: {
      id: "skull-top-tolerance",
      topYMm: guide.skullTopYForFaceMaxMm,
      bottomYMm: guide.skullTopYForFaceMinMm,
      label: "Tolérance sommet du crâne",
    },
    chinLine: {
      id: "chin",
      yMm: guide.chinYTargetMm,
      label: "Menton",
    },
    skullTopTargetLine: {
      id: "skull-top-target",
      yMm: guide.skullTopYTargetMm,
      label: "Sommet cible",
    },
    eyeLine: {
      id: "eyes",
      yMm: guide.eyeLineYIndicativeMm,
      label: "Yeux indicatifs",
    },
    shoulderLine: {
      id: "shoulders",
      yMm: guide.shoulderLineYIndicativeMm,
      label: "Epaules",
    },
  };
}
