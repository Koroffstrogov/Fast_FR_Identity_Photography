import { DEFAULT_IMAGE_TRANSFORM, ImageTransform } from "./geometry";
import {
  QualityEditState,
  getDefaultQualityEditState,
} from "../quality/quality-state";

export type PhotoEditState = {
  transform: ImageTransform;
  showFaceGuide: boolean;
  faceGuideOpacity: number;
};

export type PhotoUsage = "college" | "sport" | "badge" | "autre";

export type BackgroundPreviewMode = "original" | "replace" | "mask-preview";

export type BackgroundRemovalEngine = "rmbg1.4" | "legacy";

export type BackgroundRemovalBackendPreference = "auto" | "gpu" | "cpu";

export type BackgroundRemovalActiveBackend = "webgpu" | "wasm" | "none";

export type BackgroundPoint = {
  x: number;
  y: number;
};

export type BackgroundMaskData = {
  width: number;
  height: number;
  data: Float32Array;
  labels: string[];
  source: "confidence" | "category" | "rmbg";
};

export type BackgroundTechnicalDiagnostics = {
  engine: BackgroundRemovalEngine;
  navigatorGpuAvailable: boolean;
  requestedBackend: BackgroundRemovalBackendPreference;
  activeBackend: BackgroundRemovalActiveBackend;
  provider: string;
  modelPath: string;
  currentOrigin?: string;
  modelUrl?: string;
  modelHttpStatus?: number;
  modelContentType?: string;
  modelContentLength?: string | null;
  modelBytes?: number;
  ortWasmPath: string;
  inputWidth: number;
  inputHeight: number;
  maskWidth?: number;
  maskHeight?: number;
  inputNames: string[];
  outputNames: string[];
  selectedInputName?: string;
  selectedOutputName?: string;
  sessionCreationMs?: number;
  inferenceMs?: number;
  fallbackMessage?: string;
};

export type OnnxSessionDiagnosticResult = {
  id: string;
  label: string;
  engine: BackgroundRemovalEngine;
  modelUrl: string;
  byteLength: number;
  provider: "webgpu" | "wasm";
  graphOptimizationLevel: "default" | "disabled" | "basic" | "extended" | "all";
  source: "url" | "buffer";
  executionMode?: "sequential" | "parallel";
  sessionCreated: boolean;
  durationMs: number;
  inputNames: string[];
  outputNames: string[];
  error?: string;
};

export type BackgroundEditState = {
  engine: BackgroundRemovalEngine;
  modelPath: string;
  enabled: boolean;
  backendPreference: BackgroundRemovalBackendPreference;
  activeBackend: BackgroundRemovalActiveBackend;
  replacementColor: string;
  mode: BackgroundPreviewMode;
  threshold: number;
  featherPx: number;
  edgeSmoothingPx: number;
  preserveHair: boolean;
  manualForegroundPoints: BackgroundPoint[];
  manualBackgroundPoints: BackgroundPoint[];
  maskVersion: number;
  rawMask?: BackgroundMaskData;
  technicalDiagnostics?: BackgroundTechnicalDiagnostics;
  sessionDiagnostics: OnnxSessionDiagnosticResult[];
  message: string;
};

export type PhotoManualFacePointKind =
  | "leftEye"
  | "rightEye"
  | "eyesCenter"
  | "chin"
  | "skullTop";

export type PhotoManualFacePoint = {
  kind: PhotoManualFacePointKind;
  xPx: number;
  yPx: number;
};

export type PhotoFacePointEditMode = "none" | "place" | "move";

export type PhotoFaceDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type PhotoFaceDetectionStatus =
  | "idle"
  | "detecting"
  | "detected"
  | "not-found"
  | "manual"
  | "error";

export type PhotoFaceDetectionState = {
  status: PhotoFaceDetectionStatus;
  manualAssistantEnabled: boolean;
  showFacePoints: boolean;
  pointEditMode: PhotoFacePointEditMode;
  manualPoints: PhotoManualFacePoint[];
  diagnostics: PhotoFaceDiagnostic[];
  message: string;
};

export type PhotoItem<TImage = HTMLImageElement> = {
  id: string;
  originalFileName: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  usage?: PhotoUsage;
  image: TImage;
  editState: PhotoEditState;
  faceDetection?: PhotoFaceDetectionState;
  backgroundEdit?: BackgroundEditState;
  qualityEdit?: QualityEditState;
  sheetCopies: number;
};

export type CreatePhotoItemInput<TImage = HTMLImageElement> = {
  id: string;
  originalFileName: string;
  image: TImage;
  displayName?: string;
};

export const DEFAULT_FACE_GUIDE_OPACITY = 0.82;
export const DEFAULT_SHEET_COPIES = 1;
export const DEFAULT_BACKGROUND_REPLACEMENT_COLOR = "#eeeeee";
export const DEFAULT_BACKGROUND_MODEL_PATH = "/models/rmbg1.4/model_fp16.onnx";

export function getDefaultPhotoEditState(): PhotoEditState {
  return {
    transform: { ...DEFAULT_IMAGE_TRANSFORM },
    showFaceGuide: true,
    faceGuideOpacity: DEFAULT_FACE_GUIDE_OPACITY,
  };
}

export function getDefaultPhotoFaceDetectionState(): PhotoFaceDetectionState {
  return {
    status: "idle",
    manualAssistantEnabled: false,
    showFacePoints: true,
    pointEditMode: "none",
    manualPoints: [],
    diagnostics: [],
    message: "",
  };
}

export function getDefaultBackgroundEditState(): BackgroundEditState {
  return {
    engine: "rmbg1.4",
    modelPath: DEFAULT_BACKGROUND_MODEL_PATH,
    enabled: false,
    backendPreference: "auto",
    activeBackend: "none",
    replacementColor: DEFAULT_BACKGROUND_REPLACEMENT_COLOR,
    mode: "original",
    threshold: 0.15,
    featherPx: 6,
    edgeSmoothingPx: 2,
    preserveHair: true,
    manualForegroundPoints: [],
    manualBackgroundPoints: [],
    maskVersion: 0,
    rawMask: undefined,
    technicalDiagnostics: undefined,
    sessionDiagnostics: [],
    message: "",
  };
}

export function createPhotoItem<TImage>(
  input: CreatePhotoItemInput<TImage>,
): PhotoItem<TImage> {
  return {
    id: input.id,
    originalFileName: input.originalFileName,
    displayName: input.displayName ?? getDefaultDisplayName(input.originalFileName),
    firstName: undefined,
    lastName: undefined,
    usage: undefined,
    image: input.image,
    editState: getDefaultPhotoEditState(),
    faceDetection: getDefaultPhotoFaceDetectionState(),
    backgroundEdit: getDefaultBackgroundEditState(),
    qualityEdit: getDefaultQualityEditState(),
    sheetCopies: DEFAULT_SHEET_COPIES,
  };
}

export function updatePhotoItem<TImage>(
  items: PhotoItem<TImage>[],
  photoId: string,
  updater: (item: PhotoItem<TImage>) => PhotoItem<TImage>,
): PhotoItem<TImage>[] {
  return items.map((item) => (item.id === photoId ? updater(item) : item));
}

export function removePhotoItem<TImage>(
  items: PhotoItem<TImage>[],
  photoId: string,
): PhotoItem<TImage>[] {
  return items.filter((item) => item.id !== photoId);
}

export function getNextActivePhotoId<TImage>(
  itemsBeforeRemoval: PhotoItem<TImage>[],
  removedPhotoId: string,
  currentActivePhotoId: string | null,
): string | null {
  const nextItems = removePhotoItem(itemsBeforeRemoval, removedPhotoId);

  if (nextItems.length === 0) {
    return null;
  }

  if (currentActivePhotoId !== removedPhotoId) {
    return nextItems.some((item) => item.id === currentActivePhotoId)
      ? currentActivePhotoId
      : nextItems[0].id;
  }

  const removedIndex = itemsBeforeRemoval.findIndex((item) => item.id === removedPhotoId);
  const nextIndex = Math.min(Math.max(removedIndex, 0), nextItems.length - 1);

  return nextItems[nextIndex].id;
}

export function clampCopies(copies: number, maxCopies: number): number {
  if (!Number.isFinite(copies)) {
    return 1;
  }

  if (!Number.isFinite(maxCopies) || maxCopies < 1) {
    throw new Error("maxCopies must be a positive finite number");
  }

  return Math.min(maxCopies, Math.max(1, Math.trunc(copies)));
}

export function getNextManualFacePointKind(
  manualPoints: readonly PhotoManualFacePoint[],
): PhotoManualFacePointKind {
  if (!manualPoints.some((point) => point.kind === "leftEye")) {
    return "leftEye";
  }

  if (!manualPoints.some((point) => point.kind === "rightEye")) {
    return "rightEye";
  }

  if (!manualPoints.some((point) => point.kind === "chin")) {
    return "chin";
  }

  return "skullTop";
}

export function upsertManualFacePoint(
  manualPoints: readonly PhotoManualFacePoint[],
  point: PhotoManualFacePoint,
): PhotoManualFacePoint[] {
  const nextPoints = manualPoints.filter(
    (manualPoint) => manualPoint.kind !== point.kind,
  );

  return [...nextPoints, point].sort(
    (firstPoint, secondPoint) =>
      getManualPointOrder(firstPoint.kind) - getManualPointOrder(secondPoint.kind),
  );
}

export function hasAllFacePoints(
  manualPoints: readonly PhotoManualFacePoint[],
): boolean {
  const hasEyePair =
    manualPoints.some((point) => point.kind === "leftEye") &&
    manualPoints.some((point) => point.kind === "rightEye");
  const hasLegacyEyesCenter = manualPoints.some((point) => point.kind === "eyesCenter");
  const hasChin = manualPoints.some((point) => point.kind === "chin");
  const hasSkullTop = manualPoints.some((point) => point.kind === "skullTop");

  return (
    (hasEyePair && hasChin) ||
    (hasLegacyEyesCenter && hasChin && hasSkullTop)
  );
}

export function getManualFacePointLabel(kind: PhotoManualFacePointKind): string {
  switch (kind) {
    case "leftEye":
      return "Œil G";
    case "rightEye":
      return "Œil D";
    case "eyesCenter":
      return "Yeux";
    case "chin":
      return "Menton";
    case "skullTop":
      return "Sommet";
  }
}

export function addBackgroundPoint(
  backgroundEdit: BackgroundEditState,
  pointType: "foreground" | "background",
  point: BackgroundPoint,
): BackgroundEditState {
  const nextEdit = {
    ...backgroundEdit,
    maskVersion: backgroundEdit.maskVersion + 1,
  };

  if (pointType === "foreground") {
    return {
      ...nextEdit,
      manualForegroundPoints: [...backgroundEdit.manualForegroundPoints, point],
    };
  }

  return {
    ...nextEdit,
    manualBackgroundPoints: [...backgroundEdit.manualBackgroundPoints, point],
  };
}

export function resetBackgroundPoints(
  backgroundEdit: BackgroundEditState,
): BackgroundEditState {
  return {
    ...backgroundEdit,
    manualForegroundPoints: [],
    manualBackgroundPoints: [],
    maskVersion: backgroundEdit.maskVersion + 1,
  };
}

function getDefaultDisplayName(fileName: string): string {
  const trimmedName = fileName.trim();
  const extensionIndex = trimmedName.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return trimmedName || "Photo";
  }

  return trimmedName.slice(0, extensionIndex);
}

function getManualPointOrder(kind: PhotoManualFacePointKind): number {
  switch (kind) {
    case "leftEye":
      return 0;
    case "rightEye":
      return 1;
    case "eyesCenter":
      return 2;
    case "chin":
      return 3;
    case "skullTop":
      return 4;
  }
}
