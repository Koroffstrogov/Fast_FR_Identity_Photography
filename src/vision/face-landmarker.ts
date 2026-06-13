import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

export type FaceLandmarkerModelStatus = "idle" | "loading" | "ready" | "error";

export const FACE_LANDMARKER_MODEL_PATH =
  "/models/mediapipe/face_landmarker.task";
export const FACE_LANDMARKER_WASM_PATH = "/models/mediapipe/wasm";

const MIN_MODEL_SIZE_BYTES = 1_000_000;
const ZIP_MAGIC_FIRST_BYTE = 0x50;
const ZIP_MAGIC_SECOND_BYTE = 0x4b;

let landmarker: FaceLandmarker | null = null;
let loadingPromise: Promise<FaceLandmarker> | null = null;
let modelStatus: FaceLandmarkerModelStatus = "idle";

export function getFaceLandmarkerStatus(): FaceLandmarkerModelStatus {
  return modelStatus;
}

export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarker) {
    modelStatus = "ready";
    return landmarker;
  }

  if (!loadingPromise) {
    modelStatus = "loading";
    loadingPromise = createFaceLandmarker().catch((error: unknown) => {
      loadingPromise = null;
      modelStatus = "error";
      throw new Error(getFaceLandmarkerErrorMessage(error));
    });
  }

  landmarker = await loadingPromise;
  modelStatus = "ready";

  return landmarker;
}

export async function detectFaceLandmarks(
  image: HTMLImageElement,
): Promise<FaceLandmarkerResult> {
  const loadedLandmarker = await loadFaceLandmarker();

  return loadedLandmarker.detect(image);
}

export function getFaceLandmarkerErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);

  if (detail.startsWith("Impossible de charger le modele visage local.")) {
    return detail;
  }

  return [
    "Impossible de charger le modele visage local.",
    `Verifiez la presence de ${FACE_LANDMARKER_MODEL_PATH} et des fichiers WASM dans ${FACE_LANDMARKER_WASM_PATH}.`,
    detail,
  ].join(" ");
}

async function createFaceLandmarker(): Promise<FaceLandmarker> {
  const modelBuffer = await loadLocalFaceLandmarkerModel();
  const visionFileset = await FilesetResolver.forVisionTasks(
    FACE_LANDMARKER_WASM_PATH,
  );

  return FaceLandmarker.createFromOptions(visionFileset, {
    baseOptions: {
      modelAssetBuffer: modelBuffer,
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    numFaces: 5,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

async function loadLocalFaceLandmarkerModel(): Promise<Uint8Array> {
  const response = await fetch(FACE_LANDMARKER_MODEL_PATH, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Le fichier modele est introuvable : ${FACE_LANDMARKER_MODEL_PATH} (HTTP ${response.status}).`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const modelBuffer = new Uint8Array(await response.arrayBuffer());

  if (contentType.includes("text/html") || looksLikeHtml(modelBuffer)) {
    throw new Error(
      `Le chemin ${FACE_LANDMARKER_MODEL_PATH} renvoie une page HTML au lieu du modele .task.`,
    );
  }

  if (modelBuffer.byteLength < MIN_MODEL_SIZE_BYTES) {
    throw new Error(
      `Le fichier modele ${FACE_LANDMARKER_MODEL_PATH} est trop petit (${modelBuffer.byteLength} octets). Il est probablement incomplet.`,
    );
  }

  if (
    modelBuffer[0] !== ZIP_MAGIC_FIRST_BYTE ||
    modelBuffer[1] !== ZIP_MAGIC_SECOND_BYTE
  ) {
    throw new Error(
      `Le fichier modele ${FACE_LANDMARKER_MODEL_PATH} n'a pas le format MediaPipe attendu.`,
    );
  }

  return modelBuffer;
}

function looksLikeHtml(buffer: Uint8Array): boolean {
  const prefix = new TextDecoder()
    .decode(buffer.slice(0, Math.min(buffer.byteLength, 80)))
    .trimStart()
    .toLowerCase();

  return prefix.startsWith("<!doctype html") || prefix.startsWith("<html");
}
