import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { exportCanvasToJpeg, exportSheetCanvasToJpeg } from "../canvas/export-jpeg";
import {
  GuideOverlayPoint,
  prepareGuideCanvas,
  renderFaceGuideOverlay,
} from "../canvas/render-guide";
import { PHOTO_CANVAS_SIZE, preparePhotoCanvas, renderPhotoToCanvas } from "../canvas/render-photo";
import {
  prepareSheetCanvas,
  renderPhotoItemsToSheetCanvas,
} from "../canvas/render-sheet";
import {
  DEFAULT_IMAGE_TRANSFORM,
  getCanvasPointFromClientPoint,
  scalePointerDeltaToCanvas,
  Size,
  zoomTransformAtPoint,
} from "../core/geometry";
import {
  FileNamingTemplateId,
  buildDisplayNameFromPersonName,
  buildSheetFileName,
  buildUniquePhotoFileNames,
  buildZipFileName,
} from "../core/file-naming";
import {
  PhotoItem,
  PhotoManualFacePointKind,
  BackgroundTechnicalDiagnostics,
  OnnxSessionDiagnosticResult,
  PhotoUsage,
  addBackgroundPoint,
  clampCopies,
  getDefaultBackgroundEditState,
  getDefaultPhotoFaceDetectionState,
  getManualFacePointLabel,
  getNextActivePhotoId,
  getNextManualFacePointKind,
  hasAllFacePoints,
  removePhotoItem,
  updatePhotoItem,
  upsertManualFacePoint,
} from "../core/photo-project";
import { PrintLayoutMode, getSheetCapacity } from "../core/print-layout";
import { buildSheetComposition } from "../core/sheet-items";
import {
  ImageImportError,
  formatImportSummary,
  importImageFiles,
} from "../io/import-images";
import {
  downloadPhotoExports,
  exportIndividualPhotoBlobs,
} from "../export/export-batch";
import { createPhotosZip, downloadZip } from "../export/export-zip";
import { openA4PrintPage } from "../print/open-print-page";
import { analyzeRenderedPhotoQuality } from "../quality/analyze-photo-quality";
import { createAutoQualityEdit } from "../quality/auto-quality";
import {
  QualityEditState,
  clampQualityEditState,
  getDefaultQualityEditState,
} from "../quality/quality-state";
import { BackgroundPointMode } from "./BackgroundPanel";
import { BottomToolbar } from "./BottomToolbar";
import { LeftPhotoPanel } from "./LeftPhotoPanel";
import { RightInspector } from "./RightInspector";
import { TopBar } from "./TopBar";
import { Workspace } from "./Workspace";
import { AppMode } from "./app-mode";
import type { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import {
  BackgroundRemovalStatus,
  getBackgroundRemovalErrorMessage,
  loadBackgroundRemovalModel,
  removeImageBackground,
} from "../background/background-removal";
import {
  createRmbg2ConfigForModelPath,
  getRmbgEngineLabel,
} from "../background/rmbg2-config";
import { diagnoseOnnxSessionCreation } from "../ai/onnx-session-diagnostics";
import { analyzeFaceLandmarks } from "../vision/face-landmarks";
import {
  createFacePointsFromCandidate,
  findNearestFacePointKind,
} from "../vision/face-points";
import {
  canvasPointToSourceImagePoint,
  createFacePlacementFromFacePoints,
  sourceImagePointToCanvasPoint,
} from "../vision/face-placement";
type DragState = {
  kind: "photo";
  pointerId: number;
  x: number;
  y: number;
};

type FacePointDragState = {
  kind: "face-point";
  pointerId: number;
  pointKind: PhotoManualFacePointKind;
};

let photoIdCounter = 0;

export function App() {
  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | FacePointDragState | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importErrors, setImportErrors] = useState<ImageImportError[]>([]);
  const [appMode, setAppMode] = useState<AppMode>("crop");
  const [sheetMode, setSheetMode] = useState<PrintLayoutMode>("standard");
  const [fileNamingTemplate, setFileNamingTemplate] =
    useState<FileNamingTemplateId>("displayNameIdentity");
  const [faceModelStatus, setFaceModelStatus] =
    useState<FaceLandmarkerModelStatus>("idle");
  const [faceModelError, setFaceModelError] = useState("");
  const [backgroundRemovalStatus, setBackgroundRemovalStatus] =
    useState<BackgroundRemovalStatus>("idle");
  const [backgroundRemovalError, setBackgroundRemovalError] = useState("");
  const [backgroundPointMode, setBackgroundPointMode] =
    useState<BackgroundPointMode>("none");
  const sheetCapacity = useMemo(() => getSheetCapacity(sheetMode), [sheetMode]);
  const activePhoto = useMemo(
    () => photos.find((photo) => photo.id === activePhotoId) ?? null,
    [activePhotoId, photos],
  );
  const sheetComposition = useMemo(
    () => buildSheetComposition(photos, sheetMode),
    [photos, sheetMode],
  );
  const fileNamesByPhotoId = useMemo(
    () => buildUniquePhotoFileNames(photos, fileNamingTemplate),
    [fileNamingTemplate, photos],
  );

  useEffect(() => {
    const photoCanvas = photoCanvasRef.current;
    const sheetCanvas = sheetCanvasRef.current;

    if (photoCanvas && activePhoto) {
      renderPhotoToCanvas(
        photoCanvas,
        activePhoto.image,
        activePhoto.editState.transform,
        activePhoto.backgroundEdit,
        "preview",
        activePhoto.qualityEdit,
      );
    } else if (photoCanvas) {
      preparePhotoCanvas(photoCanvas);
    }

    if (sheetCanvas && photos.length > 0) {
      renderPhotoItemsToSheetCanvas(sheetCanvas, photos, sheetMode);
    } else if (sheetCanvas) {
      prepareSheetCanvas(sheetCanvas, sheetMode);
    }
  }, [activePhoto, photos, sheetMode, appMode]);

  useEffect(() => {
    const guideCanvas = guideCanvasRef.current;

    if (!guideCanvas) {
      return;
    }

    if (activePhoto) {
      renderFaceGuideOverlay(guideCanvas, {
        showGuide: appMode === "crop" && activePhoto.editState.showFaceGuide,
        opacity: activePhoto.editState.faceGuideOpacity,
        manualPoints: getGuideOverlayPoints(activePhoto, appMode),
      });
      return;
    }

    prepareGuideCanvas(guideCanvas);
  }, [activePhoto, appMode]);

  useEffect(() => {
    const canvas = photoCanvasRef.current;

    if (!canvas) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      if (!activePhotoId || !canvas) {
        return;
      }

      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const canvasPoint = getCanvasPointFromClientPoint(
        {
          x: event.clientX,
          y: event.clientY,
        },
        {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
        PHOTO_CANVAS_SIZE,
      );
      const zoomFactor = Math.exp(-event.deltaY * 0.0015);

      updatePhoto(activePhotoId, (photo) => ({
        ...photo,
        editState: {
          ...photo.editState,
          transform: zoomTransformAtPoint(
            photo.editState.transform,
            PHOTO_CANVAS_SIZE,
            canvasPoint,
            photo.editState.transform.zoom * zoomFactor,
          ),
        },
      }));
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [activePhotoId, appMode]);

  useEffect(() => {
    if (!activePhoto) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      updatePhotoQualityDiagnostics(activePhoto);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    activePhotoId,
    activePhoto?.editState.transform.offsetX,
    activePhoto?.editState.transform.offsetY,
    activePhoto?.editState.transform.zoom,
    activePhoto?.editState.transform.rotationDegrees,
    activePhoto?.backgroundEdit?.enabled,
    activePhoto?.backgroundEdit?.replacementColor,
    activePhoto?.backgroundEdit?.threshold,
    activePhoto?.backgroundEdit?.featherPx,
    activePhoto?.backgroundEdit?.edgeSmoothingPx,
    activePhoto?.backgroundEdit?.preserveHair,
    activePhoto?.backgroundEdit?.maskVersion,
    activePhoto?.backgroundEdit?.rawMask,
  ]);

  useEffect(() => {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) => ({
        ...photo,
        sheetCopies: clampCopies(photo.sheetCopies, sheetCapacity),
      })),
    );
  }, [sheetCapacity]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";

    if (files.length === 0) {
      return;
    }

    const result = await importImageFiles(files, createPhotoItemId);
    const summary = formatImportSummary(result);

    if (result.photos.length > 0) {
      setPhotos((currentPhotos) => [...currentPhotos, ...result.photos]);
      setActivePhotoId((currentActivePhotoId) =>
        currentActivePhotoId ?? result.photos[0]?.id ?? null,
      );
    }

    setImportSummary(summary);
    setImportErrors(result.errors);

    if (result.errors.length === files.length) {
      setError("Aucune image valide n'a pu etre importee.");
      return;
    }

    if (result.errors.length === 0) {
      setError("");
    }
  }

  function updatePhoto(photoId: string, updater: (photo: PhotoItem) => PhotoItem) {
    setPhotos((currentPhotos) => updatePhotoItem(currentPhotos, photoId, updater));
  }

  function updateActivePhoto(updater: (photo: PhotoItem) => PhotoItem) {
    if (!activePhotoId) {
      return;
    }

    updatePhoto(activePhotoId, updater);
  }

  function updatePhotoQualityDiagnostics(photo: PhotoItem) {
    try {
      const diagnostics = analyzeRenderedPhotoQuality(photo);

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        qualityEdit: {
          ...(currentPhoto.qualityEdit ?? getDefaultQualityEditState()),
          diagnostics,
        },
      }));
    } catch (qualityError) {
      setError(
        qualityError instanceof Error
          ? qualityError.message
          : "Impossible d'analyser la qualite de la photo.",
      );
    }
  }

  function handleTransformChange(partialTransform: Partial<PhotoItem["editState"]["transform"]>) {
    updateActivePhoto((photo) => ({
      ...photo,
      editState: {
        ...photo.editState,
        transform: {
          ...photo.editState.transform,
          ...partialTransform,
        },
      },
    }));
  }

  function handleGuideVisibilityChange(showFaceGuide: boolean) {
    updateActivePhoto((photo) => ({
      ...photo,
      editState: {
        ...photo.editState,
        showFaceGuide,
      },
    }));
  }

  function handleGuideOpacityChange(faceGuideOpacity: number) {
    updateActivePhoto((photo) => ({
      ...photo,
      editState: {
        ...photo.editState,
        faceGuideOpacity,
      },
    }));
  }

  function handleResetActivePhoto() {
    updateActivePhoto((photo) => ({
      ...photo,
      editState: {
        ...photo.editState,
        transform: { ...DEFAULT_IMAGE_TRANSFORM },
      },
    }));
  }

  function handleQualityChange(partialEdit: Partial<QualityEditState>) {
    updateActivePhoto((photo) => {
      const qualityEdit = photo.qualityEdit ?? getDefaultQualityEditState();
      const changesAdjustments = Object.keys(partialEdit).some(
        (key) => key !== "enabled" && key !== "diagnostics",
      );

      return {
        ...photo,
        qualityEdit: clampQualityEditState({
          ...qualityEdit,
          ...partialEdit,
          enabled:
            partialEdit.enabled !== undefined
              ? partialEdit.enabled
              : changesAdjustments
                ? true
                : qualityEdit.enabled,
          autoApplied: changesAdjustments ? false : qualityEdit.autoApplied,
        }),
      };
    });
  }

  function handleAutoQuality() {
    const photo = activePhoto;

    if (!photo) {
      return;
    }

    try {
      const diagnostics = photo.qualityEdit?.diagnostics ?? analyzeRenderedPhotoQuality(photo);
      const qualityEdit = createAutoQualityEdit(diagnostics);

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        qualityEdit,
      }));
      setError("");
    } catch (qualityError) {
      setError(
        qualityError instanceof Error
          ? qualityError.message
          : "Impossible d'appliquer l'amelioration automatique.",
      );
    }
  }

  function handleResetQuality() {
    const photo = activePhoto;

    if (!photo) {
      return;
    }

    try {
      const diagnostics = analyzeRenderedPhotoQuality(photo);

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        qualityEdit: {
          ...getDefaultQualityEditState(),
          diagnostics,
        },
      }));
      setError("");
    } catch (qualityError) {
      setError(
        qualityError instanceof Error
          ? qualityError.message
          : "Impossible de reinitialiser les corrections qualite.",
      );
    }
  }

  function handleRecalculateQuality() {
    if (activePhoto) {
      updatePhotoQualityDiagnostics(activePhoto);
    }
  }

  async function ensureFaceModelLoaded(): Promise<string | null> {
    if (faceModelStatus === "ready") {
      return null;
    }

    setFaceModelStatus("loading");
    setFaceModelError("");

    try {
      const { loadFaceLandmarker } = await import("../vision/face-landmarker");
      await loadFaceLandmarker();
      setFaceModelStatus("ready");
      return null;
    } catch (loadError) {
      const { getFaceLandmarkerErrorMessage } = await import(
        "../vision/face-landmarker"
      );
      const message =
        loadError instanceof Error
          ? loadError.message
          : getFaceLandmarkerErrorMessage(loadError);
      setFaceModelStatus("error");
      setFaceModelError(message);

      return message;
    }
  }

  function handleLoadFaceModel() {
    void ensureFaceModelLoaded();
  }

  async function handlePlaceFacePointsAutomatically() {
    const photo = activePhoto;

    if (!photo) {
      return;
    }

    updatePhoto(photo.id, (currentPhoto) => ({
      ...currentPhoto,
      faceDetection: {
        ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
        status: "detecting",
        diagnostics: [],
        message: "Placement automatique des points visage en cours.",
      },
    }));

    const modelErrorMessage = await ensureFaceModelLoaded();

    if (modelErrorMessage) {
      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        faceDetection: {
          ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
          status: "error",
          diagnostics: [],
          message: modelErrorMessage,
        },
      }));
      return;
    }

    try {
      const { detectFaceLandmarks } = await import("../vision/face-landmarker");
      const detectionResult = await detectFaceLandmarks(photo.image);
      const analysis = analyzeFaceLandmarks(detectionResult.faceLandmarks);

      if (!analysis.selectedFace) {
        updatePhoto(photo.id, (currentPhoto) => ({
          ...currentPhoto,
          faceDetection: {
            ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
            status: "not-found",
            diagnostics: analysis.diagnostics,
            message: "Aucun visage exploitable n'a ete detecte.",
          },
        }));
        return;
      }

      const diagnostics = dedupeDiagnostics(analysis.diagnostics);
      const facePoints = createFacePointsFromCandidate(
        analysis.selectedFace,
        getPhotoImageSize(photo),
      );

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        faceDetection: {
          ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
          status: "detected",
          manualAssistantEnabled: false,
          showFacePoints: true,
          pointEditMode: "move",
          manualPoints: facePoints,
          diagnostics,
          message:
            "3 points visage places automatiquement. Deplacez-les si besoin, puis cadrez a partir des points.",
        },
      }));
    } catch (detectError) {
      const message =
        detectError instanceof Error
          ? detectError.message
          : "Impossible de detecter le visage sur la photo active.";

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        faceDetection: {
          ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
          status: "error",
          diagnostics: [],
          message,
        },
      }));
    }
  }

  function handleFaceManualPlacementChange(enabled: boolean) {
    updateActivePhoto((photo) => {
      const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();

      return {
        ...photo,
        faceDetection: {
          ...faceDetection,
          status: enabled ? "manual" : faceDetection.status,
          manualAssistantEnabled: enabled,
          pointEditMode: enabled ? "place" : "none",
          showFacePoints: enabled ? true : faceDetection.showFacePoints,
          message: enabled
            ? "Cliquez centre des yeux, menton, puis sommet du crane si utile."
            : faceDetection.message,
        },
      };
    });
  }

  function handleFacePointMoveChange(enabled: boolean) {
    updateActivePhoto((photo) => {
      const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();

      return {
        ...photo,
        faceDetection: {
          ...faceDetection,
          manualAssistantEnabled: false,
          pointEditMode: enabled ? "move" : "none",
          showFacePoints: enabled ? true : faceDetection.showFacePoints,
          message: enabled
            ? "Cliquez puis glissez un point visage pour le deplacer."
            : faceDetection.message,
        },
      };
    });
  }

  function handleFacePointsVisibilityChange(showFacePoints: boolean) {
    updateActivePhoto((photo) => {
      const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();

      return {
        ...photo,
        faceDetection: {
          ...faceDetection,
          showFacePoints,
          manualAssistantEnabled: showFacePoints
            ? faceDetection.manualAssistantEnabled
            : false,
          pointEditMode: showFacePoints ? faceDetection.pointEditMode : "none",
        },
      };
    });
  }

  function handleApplyFacePlacementFromPoints() {
    const photo = activePhoto;

    if (!photo) {
      return;
    }

    const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();

    if (!hasAllFacePoints(faceDetection.manualPoints)) {
      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        faceDetection: {
          ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
          status: "error",
          diagnostics: [],
          message:
            "Placez les trois points visage : yeux, menton et sommet du crane.",
        },
      }));
      return;
    }

    const placement = createFacePlacementFromFacePoints(
      faceDetection.manualPoints,
      getPhotoImageSize(photo),
    );

    updatePhoto(photo.id, (currentPhoto) => ({
      ...currentPhoto,
      editState: placement.transform
        ? {
            ...currentPhoto.editState,
            transform: placement.transform,
          }
        : currentPhoto.editState,
      faceDetection: {
        ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
        status: placement.transform ? "manual" : "error",
        diagnostics: placement.diagnostics,
        message: placement.message,
      },
    }));
  }

  function handleDeleteFacePoints() {
    updateActivePhoto((photo) => ({
      ...photo,
      faceDetection: {
        ...(photo.faceDetection ?? getDefaultPhotoFaceDetectionState()),
        status: "manual",
        manualAssistantEnabled: false,
        pointEditMode: "none",
        manualPoints: [],
        diagnostics: [],
        message: "Points visage supprimes.",
      },
    }));
  }

  async function ensureBackgroundRemovalLoaded(): Promise<string | null> {
    const photo = activePhoto;

    if (!photo) {
      return "Importez une photo avant de charger le modele de fond.";
    }

    const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();
    const modelConfig = createRmbg2ConfigForModelPath(backgroundEdit.modelPath);

    setBackgroundRemovalStatus("loading");
    setBackgroundRemovalError("");

    try {
      const diagnostics = await loadBackgroundRemovalModel(
        backgroundEdit.backendPreference,
        modelConfig,
      );
      setBackgroundRemovalStatus("ready");
      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        backgroundEdit: {
          ...(currentPhoto.backgroundEdit ?? getDefaultBackgroundEditState()),
          engine: diagnostics.engine,
          modelPath: backgroundEdit.modelPath,
          activeBackend: diagnostics.activeBackend,
          technicalDiagnostics: diagnostics,
          message:
            diagnostics.fallbackMessage ??
            `Modele ${getRmbgEngineLabel(diagnostics.engine)} charge localement. Aucune photo n'a ete envoyee.`,
        },
      }));
      return null;
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : getBackgroundRemovalErrorMessage(loadError);
      setBackgroundRemovalStatus("error");
      setBackgroundRemovalError(message);

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        backgroundEdit: {
          ...(currentPhoto.backgroundEdit ?? getDefaultBackgroundEditState()),
          ...(hasBackgroundDiagnostics(loadError)
            ? { technicalDiagnostics: loadError.diagnostics }
            : {}),
          message,
        },
      }));

      return message;
    }
  }

  function handleLoadBackgroundModel() {
    void ensureBackgroundRemovalLoaded();
  }

  async function handleDiagnoseBackgroundSession() {
    const photo = activePhoto;

    if (!photo) {
      return;
    }

    const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();
    setBackgroundRemovalStatus("loading");
    setBackgroundRemovalError("");

    try {
      const results = await diagnoseOnnxSessionCreation(backgroundEdit.modelPath);
      const message = getOnnxSessionDiagnosticSummary(results);

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        backgroundEdit: {
          ...(currentPhoto.backgroundEdit ?? getDefaultBackgroundEditState()),
          sessionDiagnostics: results,
          message,
        },
      }));

      setBackgroundRemovalStatus(results.some((result) => result.sessionCreated) ? "ready" : "error");
      setBackgroundRemovalError(
        results.some((result) => result.sessionCreated) ? "" : message,
      );
    } catch (diagnosticError) {
      const message =
        diagnosticError instanceof Error
          ? diagnosticError.message
          : "Impossible de diagnostiquer la creation de session ONNX.";

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        backgroundEdit: {
          ...(currentPhoto.backgroundEdit ?? getDefaultBackgroundEditState()),
          sessionDiagnostics: [],
          message,
        },
      }));
      setBackgroundRemovalStatus("error");
      setBackgroundRemovalError(message);
    }
  }

  async function handleRemoveBackground() {
    const photo = activePhoto;

    if (!photo) {
      return;
    }

    const backendPreference =
      photo.backgroundEdit?.backendPreference ??
      getDefaultBackgroundEditState().backendPreference;
    const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();
    const modelConfig = createRmbg2ConfigForModelPath(backgroundEdit.modelPath);

    updatePhoto(photo.id, (currentPhoto) => ({
      ...currentPhoto,
      backgroundEdit: {
        ...(currentPhoto.backgroundEdit ?? getDefaultBackgroundEditState()),
        message: `Suppression du fond ${getRmbgEngineLabel(modelConfig.engine)} en cours.`,
      },
    }));

    const modelErrorMessage = await ensureBackgroundRemovalLoaded();

    if (modelErrorMessage) {
      return;
    }

    try {
      const result = await removeImageBackground(
        photo.image,
        backendPreference,
        modelConfig,
      );

      updatePhoto(photo.id, (currentPhoto) => {
        const backgroundEdit =
          currentPhoto.backgroundEdit ?? getDefaultBackgroundEditState();

        return {
          ...currentPhoto,
          backgroundEdit: {
            ...backgroundEdit,
            engine: modelConfig.engine,
            enabled: true,
            activeBackend: result.diagnostics.activeBackend,
            mode: "replace",
            rawMask: result.mask,
            technicalDiagnostics: result.diagnostics,
            maskVersion: backgroundEdit.maskVersion + 1,
            message: result.messages.join(" "),
          },
        };
      });
      setBackgroundRemovalStatus("ready");
      setBackgroundRemovalError("");
    } catch (removeError) {
      const message =
        removeError instanceof Error
          ? removeError.message
          : "Impossible de supprimer le fond sur la photo active.";

      setBackgroundRemovalStatus("error");
      setBackgroundRemovalError(message);
      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        backgroundEdit: {
          ...(currentPhoto.backgroundEdit ?? getDefaultBackgroundEditState()),
          ...(hasBackgroundDiagnostics(removeError)
            ? { technicalDiagnostics: removeError.diagnostics }
            : {}),
          message,
        },
      }));
    }
  }

  function handleBackgroundChange(
    partialEdit: Partial<NonNullable<PhotoItem["backgroundEdit"]>>,
  ) {
    if (
      partialEdit.backendPreference !== undefined ||
      partialEdit.engine !== undefined ||
      partialEdit.modelPath !== undefined
    ) {
      setBackgroundRemovalStatus("idle");
      setBackgroundRemovalError("");
    }

    updateActivePhoto((photo) => {
      const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();
      const modelChanged =
        partialEdit.modelPath !== undefined &&
        partialEdit.modelPath !== backgroundEdit.modelPath;
      const engineChanged =
        partialEdit.engine !== undefined &&
        partialEdit.engine !== backgroundEdit.engine;

      return {
        ...photo,
        backgroundEdit: {
          ...backgroundEdit,
          ...(modelChanged || engineChanged
            ? {
                enabled: false,
                activeBackend: "none" as const,
                rawMask: undefined,
                technicalDiagnostics: undefined,
                sessionDiagnostics: [],
                maskVersion: backgroundEdit.maskVersion + 1,
                message: "Moteur ou modele RMBG change. Rechargez le modele avant inference.",
              }
            : {}),
          ...partialEdit,
        },
      };
    });
  }

  function handleResetBackgroundPoints() {
    updateActivePhoto((photo) => {
      const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();

      return {
        ...photo,
        backgroundEdit: {
          ...backgroundEdit,
          manualForegroundPoints: [],
          manualBackgroundPoints: [],
          maskVersion: backgroundEdit.maskVersion + 1,
          message: "Points de correction effaces.",
        },
      };
    });
  }

  function handleResetBackgroundSettings() {
    updateActivePhoto((photo) => {
      const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();
      const defaults = getDefaultBackgroundEditState();

      return {
        ...photo,
        backgroundEdit: {
          ...backgroundEdit,
          replacementColor: defaults.replacementColor,
          threshold: defaults.threshold,
          featherPx: defaults.featherPx,
          edgeSmoothingPx: defaults.edgeSmoothingPx,
          preserveHair: defaults.preserveHair,
          manualForegroundPoints: [],
          manualBackgroundPoints: [],
          maskVersion: backgroundEdit.maskVersion + 1,
          message: "Reglages fond reinitialises sans relancer l'inference.",
        },
      };
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!activePhotoId || !activePhoto) {
      return;
    }

    const faceDetection = activePhoto.faceDetection ?? getDefaultPhotoFaceDetectionState();

    if (appMode === "crop" && faceDetection.pointEditMode === "place") {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const canvasPoint = getCanvasPointFromClientPoint(
        {
          x: event.clientX,
          y: event.clientY,
        },
        {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
        PHOTO_CANVAS_SIZE,
      );
      const pointKind = getNextManualFacePointKind(faceDetection.manualPoints);
      const sourcePoint = canvasPointToSourceImagePoint(
        canvasPoint,
        getPhotoImageSize(activePhoto),
        PHOTO_CANVAS_SIZE,
        activePhoto.editState.transform,
      );

      updatePhoto(activePhotoId, (photo) => {
        const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();
        const manualPoints = upsertManualFacePoint(faceDetection.manualPoints, {
          kind: pointKind,
          xPx: sourcePoint.x,
          yPx: sourcePoint.y,
        });

        return {
          ...photo,
          faceDetection: {
            ...faceDetection,
            status: "manual",
            manualAssistantEnabled: true,
            showFacePoints: true,
            pointEditMode: "place",
            manualPoints,
            message: `${manualPoints.length}/3 point(s) visage place(s).`,
          },
        };
      });
      return;
    }

    if (appMode === "crop" && faceDetection.pointEditMode === "move") {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const canvasPoint = getCanvasPointFromClientPoint(
        {
          x: event.clientX,
          y: event.clientY,
        },
        {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
        PHOTO_CANVAS_SIZE,
      );
      const pointKind = findNearestFacePointKind(
        faceDetection.manualPoints,
        canvasPoint,
        getPhotoImageSize(activePhoto),
        PHOTO_CANVAS_SIZE,
        activePhoto.editState.transform,
      );

      if (!pointKind) {
        updatePhoto(activePhotoId, (photo) => ({
          ...photo,
          faceDetection: {
            ...(photo.faceDetection ?? getDefaultPhotoFaceDetectionState()),
            message: "Cliquez directement sur un point visage pour le deplacer.",
          },
        }));
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      dragStateRef.current = {
        kind: "face-point",
        pointerId: event.pointerId,
        pointKind,
      };
      return;
    }

    if (backgroundPointMode !== "none") {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const canvasPoint = getCanvasPointFromClientPoint(
        {
          x: event.clientX,
          y: event.clientY,
        },
        {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
        PHOTO_CANVAS_SIZE,
      );
      const sourcePoint = canvasPointToSourceImagePoint(
        canvasPoint,
        getPhotoImageSize(activePhoto),
        PHOTO_CANVAS_SIZE,
        activePhoto.editState.transform,
      );

      updatePhoto(activePhotoId, (photo) => {
        const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();
        const nextBackgroundEdit = addBackgroundPoint(
          backgroundEdit,
          backgroundPointMode,
          sourcePoint,
        );

        return {
          ...photo,
          backgroundEdit: {
            ...nextBackgroundEdit,
            message:
              backgroundPointMode === "foreground"
                ? "Point personne ajoute."
                : "Point fond ajoute.",
          },
        };
      });
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      kind: "photo",
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const dragState = dragStateRef.current;

    if (!activePhotoId || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (dragState.kind === "face-point") {
      if (!activePhoto) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const canvasPoint = getCanvasPointFromClientPoint(
        {
          x: event.clientX,
          y: event.clientY,
        },
        {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
        PHOTO_CANVAS_SIZE,
      );
      const sourcePoint = canvasPointToSourceImagePoint(
        canvasPoint,
        getPhotoImageSize(activePhoto),
        PHOTO_CANVAS_SIZE,
        activePhoto.editState.transform,
      );

      updatePhoto(activePhotoId, (photo) => {
        const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();

        return {
          ...photo,
          faceDetection: {
            ...faceDetection,
            showFacePoints: true,
            pointEditMode: "move",
            manualPoints: upsertManualFacePoint(faceDetection.manualPoints, {
              kind: dragState.pointKind,
              xPx: sourcePoint.x,
              yPx: sourcePoint.y,
            }),
            message: `Point ${getManualFacePointLabel(dragState.pointKind)} deplace.`,
          },
        };
      });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const canvasDelta = scalePointerDeltaToCanvas(
      {
        x: event.clientX - dragState.x,
        y: event.clientY - dragState.y,
      },
      {
        width: rect.width,
        height: rect.height,
      },
      PHOTO_CANVAS_SIZE,
    );

    dragStateRef.current = {
      kind: "photo",
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    updatePhoto(activePhotoId, (photo) => ({
      ...photo,
      editState: {
        ...photo.editState,
        transform: {
          ...photo.editState.transform,
          offsetX: photo.editState.transform.offsetX + canvasDelta.x,
          offsetY: photo.editState.transform.offsetY + canvasDelta.y,
        },
      },
    }));
  }

  function handlePointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  function handleDisplayNameChange(photoId: string, displayName: string) {
    updatePhoto(photoId, (photo) => ({
      ...photo,
      displayName,
    }));
  }

  function handleFirstNameChange(photoId: string, firstName: string) {
    updatePhoto(photoId, (photo) => ({
      ...photo,
      firstName,
    }));
  }

  function handleLastNameChange(photoId: string, lastName: string) {
    updatePhoto(photoId, (photo) => ({
      ...photo,
      lastName,
    }));
  }

  function handleUsageChange(photoId: string, usage: PhotoUsage | "") {
    updatePhoto(photoId, (photo) => ({
      ...photo,
      usage: usage || undefined,
    }));
  }

  function handleGenerateDisplayName(photoId: string) {
    updatePhoto(photoId, (photo) => {
      const displayName = buildDisplayNameFromPersonName(photo);

      if (!displayName) {
        return photo;
      }

      return {
        ...photo,
        displayName,
      };
    });
  }

  function handleCopiesChange(photoId: string, copies: number) {
    updatePhoto(photoId, (photo) => ({
      ...photo,
      sheetCopies: clampCopies(copies, sheetCapacity),
    }));
  }

  function handleRemovePhoto(photoId: string) {
    setPhotos((currentPhotos) => {
      setActivePhotoId((currentActivePhotoId) =>
        getNextActivePhotoId(currentPhotos, photoId, currentActivePhotoId),
      );

      return removePhotoItem(currentPhotos, photoId);
    });
  }

  function handleExportPhoto() {
    if (!activePhoto) {
      return;
    }

    const canvas = document.createElement("canvas");
    renderPhotoToCanvas(
      canvas,
      activePhoto.image,
      activePhoto.editState.transform,
      activePhoto.backgroundEdit,
      "export",
      activePhoto.qualityEdit,
    );

    const link = document.createElement("a");
    link.href = exportCanvasToJpeg(canvas);
    link.download = fileNamesByPhotoId.get(activePhoto.id) ?? "photo_identite.jpg";
    link.click();
  }

  async function handleBatchExport() {
    if (photos.length === 0) {
      return;
    }

    try {
      const exports = await exportIndividualPhotoBlobs(photos, fileNamingTemplate);
      downloadPhotoExports(exports);
      setError("");
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Impossible d'exporter les photos.",
      );
    }
  }

  async function handleZipExport() {
    if (photos.length === 0) {
      return;
    }

    try {
      const exports = await exportIndividualPhotoBlobs(photos, fileNamingTemplate);
      const zipBlob = await createPhotosZip(exports);
      downloadZip(zipBlob, buildZipFileName());
      setError("");
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Impossible de generer le ZIP.",
      );
    }
  }

  function handleSheetExport() {
    const canvas = sheetCanvasRef.current;

    if (!canvas || photos.length === 0) {
      return;
    }

    const link = document.createElement("a");
    link.href = exportSheetCanvasToJpeg(canvas);
    link.download = buildSheetFileName();
    link.click();
  }

  function handlePrintSheet() {
    const canvas = sheetCanvasRef.current;

    if (!canvas || photos.length === 0) {
      return;
    }

    try {
      openA4PrintPage(exportSheetCanvasToJpeg(canvas));
      setError("");
    } catch (printError) {
      setError(
        printError instanceof Error
          ? printError.message
          : "Impossible d'ouvrir la page d'impression.",
      );
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        mode={appMode}
        photoCount={photos.length}
        sheetCapacity={sheetCapacity}
        onModeChange={setAppMode}
        onFileChange={handleFileChange}
      />

      <div className="app-main-grid">
        <LeftPhotoPanel
          photos={photos}
          activePhotoId={activePhotoId}
          sheetCapacity={sheetCapacity}
          fileNamingTemplate={fileNamingTemplate}
          error={error}
          importSummary={importSummary}
          importErrors={importErrors}
          onFileChange={handleFileChange}
          onSelectPhoto={setActivePhotoId}
          onDisplayNameChange={handleDisplayNameChange}
          onFirstNameChange={handleFirstNameChange}
          onLastNameChange={handleLastNameChange}
          onUsageChange={handleUsageChange}
          onGenerateDisplayName={handleGenerateDisplayName}
          onCopiesChange={handleCopiesChange}
          onRemovePhoto={handleRemovePhoto}
        />

        <Workspace
          mode={appMode}
          photo={activePhoto}
          photoCanvasRef={photoCanvasRef}
          guideCanvasRef={guideCanvasRef}
          sheetCanvasRef={sheetCanvasRef}
          sheetMode={sheetMode}
          composition={sheetComposition}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerEnd={handlePointerEnd}
        />

        <RightInspector
          mode={appMode}
          photo={activePhoto}
          photoCount={photos.length}
          fileNamingTemplate={fileNamingTemplate}
          sheetMode={sheetMode}
          composition={sheetComposition}
          faceModelStatus={faceModelStatus}
          faceModelError={faceModelError}
          backgroundRemovalStatus={backgroundRemovalStatus}
          backgroundRemovalError={backgroundRemovalError}
          backgroundPointMode={backgroundPointMode}
          onGuideVisibilityChange={handleGuideVisibilityChange}
          onGuideOpacityChange={handleGuideOpacityChange}
          onLoadFaceModel={handleLoadFaceModel}
          onPlaceFacePointsAutomatically={handlePlaceFacePointsAutomatically}
          onManualPlacementChange={handleFaceManualPlacementChange}
          onMoveFacePointChange={handleFacePointMoveChange}
          onFacePointsVisibilityChange={handleFacePointsVisibilityChange}
          onApplyFacePlacementFromPoints={handleApplyFacePlacementFromPoints}
          onDeleteFacePoints={handleDeleteFacePoints}
          onLoadBackgroundModel={handleLoadBackgroundModel}
          onDiagnoseBackgroundSession={handleDiagnoseBackgroundSession}
          onRemoveBackground={handleRemoveBackground}
          onBackgroundChange={handleBackgroundChange}
          onBackgroundPointModeChange={setBackgroundPointMode}
          onResetBackgroundPoints={handleResetBackgroundPoints}
          onResetBackgroundSettings={handleResetBackgroundSettings}
          onQualityChange={handleQualityChange}
          onAutoQuality={handleAutoQuality}
          onResetQuality={handleResetQuality}
          onRecalculateQuality={handleRecalculateQuality}
          onFileNamingTemplateChange={setFileNamingTemplate}
          onSheetModeChange={setSheetMode}
          onExportPhoto={handleExportPhoto}
          onSheetExport={handleSheetExport}
          onPrintSheet={handlePrintSheet}
          onZipExport={handleZipExport}
          onSeparateExport={handleBatchExport}
        />
      </div>

      <BottomToolbar
        mode={appMode}
        photo={activePhoto}
        composition={sheetComposition}
        onTransformChange={handleTransformChange}
        onResetPhoto={handleResetActivePhoto}
      />
    </div>
  );
}

function getPhotoImageSize(photo: PhotoItem): Size {
  return {
    width: photo.image.naturalWidth,
    height: photo.image.naturalHeight,
  };
}

function getGuideOverlayPoints(photo: PhotoItem, appMode: AppMode): GuideOverlayPoint[] {
  return [
    ...(appMode === "crop" ? getManualFaceGuideOverlayPoints(photo) : []),
    ...(appMode === "background" ? getBackgroundGuideOverlayPoints(photo) : []),
  ];
}

function getManualFaceGuideOverlayPoints(photo: PhotoItem): GuideOverlayPoint[] {
  const faceDetection = photo.faceDetection;

  if (
    !faceDetection ||
    !faceDetection.showFacePoints ||
    faceDetection.manualPoints.length === 0
  ) {
    return [];
  }

  return faceDetection.manualPoints.map((point) => {
    const canvasPoint = sourceImagePointToCanvasPoint(
      {
        x: point.xPx,
        y: point.yPx,
      },
      getPhotoImageSize(photo),
      PHOTO_CANVAS_SIZE,
      photo.editState.transform,
    );

    return {
      xPx: canvasPoint.x,
      yPx: canvasPoint.y,
      label: getManualFacePointLabel(point.kind),
    };
  });
}

function getBackgroundGuideOverlayPoints(photo: PhotoItem): GuideOverlayPoint[] {
  const backgroundEdit = photo.backgroundEdit;

  if (!backgroundEdit) {
    return [];
  }

  const imageSize = getPhotoImageSize(photo);
  const foregroundPoints = backgroundEdit.manualForegroundPoints.map((point) =>
    buildBackgroundOverlayPoint(photo, imageSize, point, "Personne", "#15803d"),
  );
  const backgroundPoints = backgroundEdit.manualBackgroundPoints.map((point) =>
    buildBackgroundOverlayPoint(photo, imageSize, point, "Fond", "#b91c1c"),
  );

  return [...foregroundPoints, ...backgroundPoints];
}

function buildBackgroundOverlayPoint(
  photo: PhotoItem,
  imageSize: Size,
  point: { x: number; y: number },
  label: string,
  color: string,
): GuideOverlayPoint {
  const canvasPoint = sourceImagePointToCanvasPoint(
    point,
    imageSize,
    PHOTO_CANVAS_SIZE,
    photo.editState.transform,
  );

  return {
    xPx: canvasPoint.x,
    yPx: canvasPoint.y,
    label,
    color,
  };
}

function dedupeDiagnostics<TDiagnostic extends { code: string; message: string }>(
  diagnostics: readonly TDiagnostic[],
): TDiagnostic[] {
  const seenDiagnostics = new Set<string>();

  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}-${diagnostic.message}`;

    if (seenDiagnostics.has(key)) {
      return false;
    }

    seenDiagnostics.add(key);
    return true;
  });
}

function createPhotoItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  photoIdCounter += 1;

  return `photo-${Date.now()}-${photoIdCounter}`;
}

function hasBackgroundDiagnostics(
  error: unknown,
): error is { diagnostics: BackgroundTechnicalDiagnostics } {
  return (
    typeof error === "object" &&
    error !== null &&
    "diagnostics" in error &&
    typeof (error as { diagnostics?: unknown }).diagnostics === "object"
  );
}

function getOnnxSessionDiagnosticSummary(
  results: readonly OnnxSessionDiagnosticResult[],
): string {
  const successfulResults = results.filter((result) => result.sessionCreated);

  if (successfulResults.length > 0) {
    return `Diagnostic ONNX termine : ${successfulResults.length}/${results.length} variante(s) creent une session.`;
  }

  const firstError = results.find((result) => result.error)?.error;

  return [
    "Le modele est charge, mais aucune variante ONNX Runtime Web ne cree la session.",
    "Le modele est valide ONNX cote Python, mais incompatible avec ONNX Runtime Web dans cette forme.",
    firstError ? `Erreur representative : ${firstError}` : "",
    "Pistes suivantes : tester un autre modele RMBG-1.4, tester model_quantized.onnx, tester model_uint8.onnx pour RMBG-2.0, convertir en format .ort, tester une autre version de onnxruntime-web ou un autre export ONNX compatible navigateur.",
  ]
    .filter(Boolean)
    .join(" ");
}
