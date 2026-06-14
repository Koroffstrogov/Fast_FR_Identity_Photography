import {
  FilesetResolver,
  ImageSegmenter,
  type ImageSegmenterResult,
} from "@mediapipe/tasks-vision";
import { BackgroundMaskData } from "../core/photo-project";
import {
  createForegroundMaskFromCategoryMask,
  createForegroundMaskFromConfidenceMasks,
} from "./background-mask";
import { FACE_LANDMARKER_WASM_PATH } from "./face-landmarker";

export type BackgroundSegmenterStatus = "idle" | "loading" | "ready" | "error";

export type BackgroundSegmentationResult = {
  mask: BackgroundMaskData;
  labels: string[];
  diagnostics: string[];
};

export const BACKGROUND_SEGMENTER_MODEL_PATH =
  "/models/mediapipe/selfie_segmenter.tflite";

const MIN_SEGMENTER_MODEL_SIZE_BYTES = 100_000;

let segmenter: ImageSegmenter | null = null;
let loadingPromise: Promise<ImageSegmenter> | null = null;
let segmenterStatus: BackgroundSegmenterStatus = "idle";

export function getBackgroundSegmenterStatus(): BackgroundSegmenterStatus {
  return segmenterStatus;
}

export async function loadBackgroundSegmenter(): Promise<ImageSegmenter> {
  if (segmenter) {
    segmenterStatus = "ready";
    return segmenter;
  }

  if (!loadingPromise) {
    segmenterStatus = "loading";
    loadingPromise = createBackgroundSegmenter().catch((error: unknown) => {
      loadingPromise = null;
      segmenterStatus = "error";
      throw new Error(getBackgroundSegmenterErrorMessage(error));
    });
  }

  segmenter = await loadingPromise;
  segmenterStatus = "ready";

  return segmenter;
}

export async function segmentImageBackground(
  image: HTMLImageElement,
): Promise<BackgroundSegmentationResult> {
  const loadedSegmenter = await loadBackgroundSegmenter();
  const labels = loadedSegmenter.getLabels();
  const result = loadedSegmenter.segment(image);

  try {
    return createBackgroundSegmentationResult(result, labels);
  } finally {
    result.close();
  }
}

export function getBackgroundSegmenterErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);

  if (detail.startsWith("Impossible de charger le modèle de fond local.")) {
    return detail;
  }

  return [
    "Impossible de charger le modèle de fond local.",
    `Vérifiez la présence de ${BACKGROUND_SEGMENTER_MODEL_PATH} et des fichiers WASM dans ${FACE_LANDMARKER_WASM_PATH}.`,
    detail,
  ].join(" ");
}

function createBackgroundSegmentationResult(
  result: ImageSegmenterResult,
  labels: readonly string[],
): BackgroundSegmentationResult {
  if (result.confidenceMasks && result.confidenceMasks.length > 0) {
    const selection = createForegroundMaskFromConfidenceMasks(
      result.confidenceMasks,
      labels,
    );

    return {
      mask: selection.mask,
      labels: [...labels],
      diagnostics: selection.diagnostics,
    };
  }

  if (result.categoryMask) {
    const selection = createForegroundMaskFromCategoryMask(result.categoryMask, labels);

    return {
      mask: selection.mask,
      labels: [...labels],
      diagnostics: selection.diagnostics,
    };
  }

    throw new Error("Le modèle n'a retourné aucun masque exploitable.");
}

async function createBackgroundSegmenter(): Promise<ImageSegmenter> {
  const modelBuffer = await loadLocalBackgroundModel();
  const visionFileset = await FilesetResolver.forVisionTasks(FACE_LANDMARKER_WASM_PATH);

  return ImageSegmenter.createFromOptions(visionFileset, {
    baseOptions: {
      modelAssetBuffer: modelBuffer,
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    outputConfidenceMasks: true,
    outputCategoryMask: true,
  });
}

async function loadLocalBackgroundModel(): Promise<Uint8Array> {
  const response = await fetch(BACKGROUND_SEGMENTER_MODEL_PATH, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Le fichier modèle est introuvable : ${BACKGROUND_SEGMENTER_MODEL_PATH} (HTTP ${response.status}).`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const modelBuffer = new Uint8Array(await response.arrayBuffer());

  if (contentType.includes("text/html") || looksLikeHtml(modelBuffer)) {
    throw new Error(
      `Le chemin ${BACKGROUND_SEGMENTER_MODEL_PATH} renvoie une page HTML au lieu du modèle .tflite.`,
    );
  }

  if (modelBuffer.byteLength < MIN_SEGMENTER_MODEL_SIZE_BYTES) {
    throw new Error(
      `Le fichier modèle ${BACKGROUND_SEGMENTER_MODEL_PATH} est trop petit (${modelBuffer.byteLength} octets). Il est probablement incomplet.`,
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
