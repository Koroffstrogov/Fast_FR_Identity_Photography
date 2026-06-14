export type NormalizedFaceLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type FaceBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  area: number;
};

export type FaceDiagnosticSeverity = "info" | "warning" | "error";

export type FaceDiagnosticCode =
  | "no-face"
  | "multiple-faces"
  | "incomplete-landmarks"
  | "face-too-tilted"
  | "face-too-small"
  | "low-confidence"
  | "eye-axis-missing"
  | "zoom-clamped";

export type FaceDiagnostic = {
  code: FaceDiagnosticCode;
  severity: FaceDiagnosticSeverity;
  message: string;
};

export type FaceCandidate = {
  index: number;
  landmarks: NormalizedFaceLandmark[];
  leftEye: NormalizedFaceLandmark;
  rightEye: NormalizedFaceLandmark;
  eyesCenter: NormalizedFaceLandmark;
  chin: NormalizedFaceLandmark;
  estimatedSkullTop: NormalizedFaceLandmark;
  bounds: FaceBounds;
  rollDegrees: number;
  diagnostics: FaceDiagnostic[];
};

export type FaceLandmarkAnalysis = {
  faces: FaceCandidate[];
  selectedFace: FaceCandidate | null;
  diagnostics: FaceDiagnostic[];
};

const LEFT_EYE_INDICES = [33, 133, 159, 145];
const RIGHT_EYE_INDICES = [263, 362, 386, 374];
const CHIN_INDEX = 152;
const FOREHEAD_TOP_INDEX = 10;
const SKULL_TOP_EXTENSION_FROM_FOREHEAD_RATIO = 0.22;
const TILT_WARNING_DEGREES = 12;
const MIN_FACE_BOUND_RATIO = 0.18;
const MIN_FACE_AREA_RATIO = 0.03;
const LOW_VISIBILITY_THRESHOLD = 0.35;

export function calculateEyeAngleDegrees(
  leftEye: NormalizedFaceLandmark,
  rightEye: NormalizedFaceLandmark,
): number {
  assertFiniteLandmark(leftEye, "leftEye");
  assertFiniteLandmark(rightEye, "rightEye");

  return (Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180) / Math.PI;
}

export function getFaceBounds(landmarks: readonly NormalizedFaceLandmark[]): FaceBounds {
  const validLandmarks = landmarks.filter(isFiniteLandmark);

  if (validLandmarks.length === 0) {
    throw new Error("landmarks must contain at least one finite point");
  }

  const minX = Math.min(...validLandmarks.map((landmark) => landmark.x));
  const minY = Math.min(...validLandmarks.map((landmark) => landmark.y));
  const maxX = Math.max(...validLandmarks.map((landmark) => landmark.x));
  const maxY = Math.max(...validLandmarks.map((landmark) => landmark.y));
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    area: width * height,
  };
}

export function selectLargestFace(
  faces: readonly FaceCandidate[],
): FaceCandidate | null {
  if (faces.length === 0) {
    return null;
  }

  return faces.reduce((largestFace, face) =>
    face.bounds.area > largestFace.bounds.area ? face : largestFace,
  );
}

export function extractFaceCandidate(
  landmarks: readonly NormalizedFaceLandmark[],
  index = 0,
): FaceCandidate | null {
  const leftEye = averageLandmarks(landmarks, LEFT_EYE_INDICES);
  const rightEye = averageLandmarks(landmarks, RIGHT_EYE_INDICES);
  const chin = landmarks[CHIN_INDEX];

  if (!leftEye || !rightEye || !isFiniteLandmark(chin)) {
    return null;
  }

  const bounds = getFaceBounds(landmarks);
  const rollDegrees = calculateEyeAngleDegrees(leftEye, rightEye);
  const eyesCenter = averagePoints(leftEye, rightEye);
  const topLandmark = landmarks[FOREHEAD_TOP_INDEX];
  const estimatedSkullTop = estimateSkullTop({
    foreheadTop: isFiniteLandmark(topLandmark) ? topLandmark : null,
    eyesCenter,
    chin,
    bounds,
  });
  const diagnostics = getCandidateDiagnostics({
    leftEye,
    rightEye,
    chin,
    estimatedSkullTop,
    bounds,
    rollDegrees,
  });

  return {
    index,
    landmarks: landmarks.filter(isFiniteLandmark),
    leftEye,
    rightEye,
    eyesCenter,
    chin,
    estimatedSkullTop,
    bounds,
    rollDegrees,
    diagnostics,
  };
}

export function analyzeFaceLandmarks(
  faceLandmarks: readonly (readonly NormalizedFaceLandmark[])[],
): FaceLandmarkAnalysis {
  const faces = faceLandmarks
    .map((landmarks, index) => extractFaceCandidate(landmarks, index))
    .filter((candidate): candidate is FaceCandidate => candidate !== null);
  const diagnostics: FaceDiagnostic[] = [];

  if (faceLandmarks.length > 0 && faces.length < faceLandmarks.length) {
    diagnostics.push({
      code: "incomplete-landmarks",
      severity: "warning",
      message: "Certains visages détectés ne contiennent pas assez de points utilisables.",
    });
  }

  if (faces.length === 0) {
    diagnostics.push({
      code: "no-face",
      severity: "error",
      message: "Aucun visage exploitable n'a été détecté sur la photo active.",
    });

    return {
      faces,
      selectedFace: null,
      diagnostics,
    };
  }

  if (faces.length > 1) {
    diagnostics.push({
      code: "multiple-faces",
      severity: "info",
      message: "Plusieurs visages ont été détectés ; le plus grand est utilisé.",
    });
  }

  const selectedFace = selectLargestFace(faces);

  return {
    faces,
    selectedFace,
    diagnostics: selectedFace
      ? [...diagnostics, ...selectedFace.diagnostics]
      : diagnostics,
  };
}

function estimateSkullTop({
  foreheadTop,
  eyesCenter,
  chin,
  bounds,
}: {
  foreheadTop: NormalizedFaceLandmark | null;
  eyesCenter: NormalizedFaceLandmark;
  chin: NormalizedFaceLandmark;
  bounds: FaceBounds;
}): NormalizedFaceLandmark {
  const referenceTop = foreheadTop ?? {
    x: eyesCenter.x,
    y: bounds.minY,
    z: eyesCenter.z,
    visibility: eyesCenter.visibility,
  };
  const faceHeightFromForehead = Math.max(0, chin.y - referenceTop.y);
  const fallbackFaceHeight = Math.max(bounds.height, chin.y - eyesCenter.y);
  const extrapolationBase =
    faceHeightFromForehead > 0 ? faceHeightFromForehead : fallbackFaceHeight;
  const skullExtension = extrapolationBase * SKULL_TOP_EXTENSION_FROM_FOREHEAD_RATIO;

  return {
    x: referenceTop.x,
    y: Math.max(0, Math.min(eyesCenter.y, referenceTop.y - skullExtension)),
    z: referenceTop.z,
    visibility: referenceTop.visibility,
  };
}

function getCandidateDiagnostics({
  leftEye,
  rightEye,
  chin,
  estimatedSkullTop,
  bounds,
  rollDegrees,
}: {
  leftEye: NormalizedFaceLandmark;
  rightEye: NormalizedFaceLandmark;
  chin: NormalizedFaceLandmark;
  estimatedSkullTop: NormalizedFaceLandmark;
  bounds: FaceBounds;
  rollDegrees: number;
}): FaceDiagnostic[] {
  const diagnostics: FaceDiagnostic[] = [];

  if (Math.abs(rollDegrees) > TILT_WARNING_DEGREES) {
    diagnostics.push({
      code: "face-too-tilted",
      severity: "warning",
      message: "Le visage semble incliné ; vérifiez la rotation proposée.",
    });
  }

  if (
    bounds.width < MIN_FACE_BOUND_RATIO ||
    bounds.height < MIN_FACE_BOUND_RATIO ||
    bounds.area < MIN_FACE_AREA_RATIO
  ) {
    diagnostics.push({
      code: "face-too-small",
      severity: "warning",
      message: "Le visage détecté occupe peu l'image ; le cadrage peut être approximatif.",
    });
  }

  if (
    [leftEye, rightEye, chin, estimatedSkullTop].some(
      (landmark) =>
        landmark.visibility !== undefined &&
        Number.isFinite(landmark.visibility) &&
        landmark.visibility < LOW_VISIBILITY_THRESHOLD,
    )
  ) {
    diagnostics.push({
      code: "low-confidence",
      severity: "warning",
      message: "Certains points du visage ont une confiance faible.",
    });
  }

  return diagnostics;
}

function averageLandmarks(
  landmarks: readonly NormalizedFaceLandmark[],
  indices: readonly number[],
): NormalizedFaceLandmark | null {
  const points = indices
    .map((index) => landmarks[index])
    .filter((landmark): landmark is NormalizedFaceLandmark => isFiniteLandmark(landmark));

  if (points.length === 0) {
    return null;
  }

  return {
    x: average(points.map((point) => point.x)),
    y: average(points.map((point) => point.y)),
    z: average(points.map((point) => point.z ?? 0)),
    visibility:
      points.some((point) => point.visibility !== undefined)
        ? average(points.map((point) => point.visibility ?? 1))
        : undefined,
  };
}

function averagePoints(
  firstPoint: NormalizedFaceLandmark,
  secondPoint: NormalizedFaceLandmark,
): NormalizedFaceLandmark {
  return {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
    z:
      firstPoint.z !== undefined || secondPoint.z !== undefined
        ? ((firstPoint.z ?? 0) + (secondPoint.z ?? 0)) / 2
        : undefined,
    visibility:
      firstPoint.visibility !== undefined || secondPoint.visibility !== undefined
        ? ((firstPoint.visibility ?? 1) + (secondPoint.visibility ?? 1)) / 2
        : undefined,
  };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function assertFiniteLandmark(landmark: NormalizedFaceLandmark, label: string): void {
  if (!isFiniteLandmark(landmark)) {
    throw new Error(`${label} must contain finite coordinates`);
  }
}

function isFiniteLandmark(
  landmark: NormalizedFaceLandmark | undefined,
): landmark is NormalizedFaceLandmark {
  return (
    landmark !== undefined &&
    Number.isFinite(landmark.x) &&
    Number.isFinite(landmark.y)
  );
}
