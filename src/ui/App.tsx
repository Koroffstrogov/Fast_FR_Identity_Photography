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
import { openA4PrintPage } from "../print/open-print-page";
import {
  analyzeRenderedPhotoQuality,
  analyzeRenderedPhotoQualityBeforeAfter,
} from "../quality/analyze-photo-quality";
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
import {
  EDITOR_INTERACTION_MODE_MESSAGES,
  EditorInteractionMode,
  getFacePointPlacementMessage,
  getLegacyPointEditMode,
} from "./editor-interaction-mode";
import type { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import {
  BackgroundRemovalStatus,
  getBackgroundRemovalErrorMessage,
  loadBackgroundRemovalModel,
  removeImageBackground,
} from "../background/background-removal";
import {
  createRmbgConfigForModelPath,
  getRmbgEngineLabel,
  normalizeRmbgModelPath,
} from "../background/rmbg-config";
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
  const [editorInteractionMode, setEditorInteractionMode] =
    useState<EditorInteractionMode>("move-photo");
  const [hoveredFacePointKind, setHoveredFacePointKind] =
    useState<PhotoManualFacePointKind | null>(null);
  const [draggedFacePointKind, setDraggedFacePointKind] =
    useState<PhotoManualFacePointKind | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
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
        manualPoints: getGuideOverlayPoints(
          activePhoto,
          appMode,
          hoveredFacePointKind,
          draggedFacePointKind,
        ),
      });
      return;
    }

    prepareGuideCanvas(guideCanvas);
  }, [activePhoto, appMode, hoveredFacePointKind, draggedFacePointKind]);

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
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || appMode !== "crop") {
        return;
      }

      if (editorInteractionMode === "move-photo") {
        return;
      }

      event.preventDefault();
      dragStateRef.current = null;
      setIsDraggingPhoto(false);
      setDraggedFacePointKind(null);
      setHoveredFacePointKind(null);
      setEditorInteractionMode("move-photo");
      syncActiveFacePointEditMode("move-photo");
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appMode, editorInteractionMode, activePhotoId]);

  useEffect(() => {
    dragStateRef.current = null;
    setIsDraggingPhoto(false);
    setDraggedFacePointKind(null);
    setHoveredFacePointKind(null);

    if (appMode !== "crop" && editorInteractionMode !== "move-photo") {
      setEditorInteractionMode("move-photo");
    }
  }, [appMode, activePhotoId, editorInteractionMode]);

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
    activePhoto?.qualityEdit?.enabled,
    activePhoto?.qualityEdit?.exposureEv,
    activePhoto?.qualityEdit?.brightness,
    activePhoto?.qualityEdit?.contrast,
    activePhoto?.qualityEdit?.temperature,
    activePhoto?.qualityEdit?.tint,
    activePhoto?.qualityEdit?.saturation,
    activePhoto?.qualityEdit?.sharpness,
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
      setError("Aucune image valide n'a pu être importée.");
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
      const beforeAfter = analyzeRenderedPhotoQualityBeforeAfter(photo);

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        qualityEdit: {
          ...(currentPhoto.qualityEdit ?? getDefaultQualityEditState()),
          diagnostics,
          beforeCorrections: beforeAfter.beforeCorrections,
          afterCorrections: beforeAfter.afterCorrections,
          analysisStatus: beforeAfter.status,
          analysisScore: beforeAfter.score,
          analysisMessages: beforeAfter.messages,
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
        (key) =>
          key !== "enabled" &&
          key !== "diagnostics" &&
          key !== "beforeCorrections" &&
          key !== "afterCorrections" &&
          key !== "analysisStatus" &&
          key !== "analysisScore" &&
          key !== "analysisMessages",
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
      const beforeAfter = analyzeRenderedPhotoQualityBeforeAfter(photo);

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        qualityEdit: {
          ...getDefaultQualityEditState(),
          diagnostics,
          beforeCorrections: beforeAfter.beforeCorrections,
          afterCorrections: beforeAfter.afterCorrections,
          analysisStatus: beforeAfter.status,
          analysisScore: beforeAfter.score,
          analysisMessages: beforeAfter.messages,
        },
      }));
      setError("");
    } catch (qualityError) {
      setError(
        qualityError instanceof Error
          ? qualityError.message
          : "Impossible de réinitialiser les corrections qualité.",
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
            message: "Aucun visage exploitable n'a été détecté.",
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
            "4 points visage placés automatiquement. Vérifiez les deux yeux, le menton et le sommet avant cadrage.",
        },
      }));
      setEditorInteractionMode("move-face-points");
      setHoveredFacePointKind(null);
    } catch (detectError) {
      const message =
        detectError instanceof Error
          ? detectError.message
          : "Impossible de détecter le visage sur la photo active.";

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

  function handleEditorInteractionModeChange(
    mode: EditorInteractionMode,
    options?: { resetFacePoints?: boolean },
  ) {
    dragStateRef.current = null;
    setIsDraggingPhoto(false);
    setDraggedFacePointKind(null);
    setHoveredFacePointKind(null);
    setEditorInteractionMode(mode);
    syncActiveFacePointEditMode(mode, options);
  }

  function syncActiveFacePointEditMode(
    mode: EditorInteractionMode,
    options?: { resetFacePoints?: boolean },
  ) {
    updateActivePhoto((photo) => {
      const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();
      const nextPointEditMode = getLegacyPointEditMode(mode);
      const shouldResetFacePoints =
        mode === "place-face-points" && options?.resetFacePoints === true;
      const manualPoints = shouldResetFacePoints ? [] : faceDetection.manualPoints;
      const showFacePoints =
        mode === "place-face-points" || mode === "move-face-points"
          ? true
          : faceDetection.showFacePoints;
      const message =
        mode === "place-face-points"
          ? getFacePointPlacementMessage(manualPoints)
          : mode === "move-face-points"
            ? EDITOR_INTERACTION_MODE_MESSAGES["move-face-points"]
            : faceDetection.message;

      return {
        ...photo,
        faceDetection: {
          ...faceDetection,
          status: mode === "place-face-points" ? "manual" : faceDetection.status,
          manualAssistantEnabled: mode === "place-face-points",
          pointEditMode: nextPointEditMode,
          showFacePoints,
          manualPoints,
          message,
        },
      };
    });
  }

  function handleFacePointsVisibilityChange(showFacePoints: boolean) {
    if (!showFacePoints && editorInteractionMode !== "move-photo") {
      setEditorInteractionMode("move-photo");
      setHoveredFacePointKind(null);
      setDraggedFacePointKind(null);
      dragStateRef.current = null;
      setIsDraggingPhoto(false);
    }

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
          pointEditMode: showFacePoints
            ? faceDetection.pointEditMode
            : getLegacyPointEditMode("move-photo"),
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
            "Placez au minimum les deux yeux et le menton. Le sommet affine la hauteur visage.",
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
    dragStateRef.current = null;
    setEditorInteractionMode("move-photo");
    setHoveredFacePointKind(null);
    setDraggedFacePointKind(null);
    setIsDraggingPhoto(false);
    updateActivePhoto((photo) => ({
      ...photo,
      faceDetection: {
        ...(photo.faceDetection ?? getDefaultPhotoFaceDetectionState()),
        status: "manual",
        manualAssistantEnabled: false,
        pointEditMode: "none",
        manualPoints: [],
        diagnostics: [],
        message: "Points visage supprimés.",
      },
    }));
  }

  async function ensureBackgroundRemovalLoaded(): Promise<string | null> {
    const photo = activePhoto;

    if (!photo) {
      return "Importez une photo avant de charger le modèle de fond.";
    }

    const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();
    const modelConfig = createRmbgConfigForModelPath(backgroundEdit.modelPath);

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
          modelPath: modelConfig.modelPath,
          activeBackend: diagnostics.activeBackend,
          technicalDiagnostics: diagnostics,
          message:
            diagnostics.fallbackMessage ??
            `Modèle ${getRmbgEngineLabel(diagnostics.engine)} chargé localement. Aucune photo n'a été envoyée.`,
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
      const { diagnoseOnnxSessionCreation } = await import(
        "../ai/onnx-session-diagnostics"
      );
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
          : "Impossible de diagnostiquer la création de session ONNX.";

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
    const modelConfig = createRmbgConfigForModelPath(backgroundEdit.modelPath);

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
            modelPath: modelConfig.modelPath,
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
    const normalizedPartialEdit = {
      ...partialEdit,
      ...(partialEdit.engine !== undefined ? { engine: "rmbg1.4" as const } : {}),
      ...(partialEdit.modelPath !== undefined
        ? { modelPath: normalizeRmbgModelPath(partialEdit.modelPath) }
        : {}),
    };

    if (
      normalizedPartialEdit.backendPreference !== undefined ||
      normalizedPartialEdit.engine !== undefined ||
      normalizedPartialEdit.modelPath !== undefined
    ) {
      setBackgroundRemovalStatus("idle");
      setBackgroundRemovalError("");
    }

    updateActivePhoto((photo) => {
      const backgroundEdit = photo.backgroundEdit ?? getDefaultBackgroundEditState();
      const modelChanged =
        normalizedPartialEdit.modelPath !== undefined &&
        normalizeRmbgModelPath(normalizedPartialEdit.modelPath) !==
          normalizeRmbgModelPath(backgroundEdit.modelPath);
      const engineChanged =
        normalizedPartialEdit.engine !== undefined &&
        normalizedPartialEdit.engine !== backgroundEdit.engine;

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
                message: "Moteur ou modèle RMBG changé. Rechargez le modèle avant inférence.",
              }
            : {}),
          ...normalizedPartialEdit,
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
          message: "Points de correction effacés.",
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
          message: "Réglages fond réinitialisés sans relancer l'inférence.",
        },
      };
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!activePhotoId || !activePhoto) {
      return;
    }

    const faceDetection = activePhoto.faceDetection ?? getDefaultPhotoFaceDetectionState();

    if (appMode === "crop" && editorInteractionMode === "place-face-points") {
      event.preventDefault();
      setHoveredFacePointKind(null);
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
            pointEditMode: getLegacyPointEditMode("place-face-points"),
            manualPoints,
            message: getFacePointPlacementMessage(manualPoints),
          },
        };
      });
      return;
    }

    if (appMode === "crop" && editorInteractionMode === "move-face-points") {
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
            message: "Cliquez directement sur un point visage pour le déplacer.",
          },
        }));
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      setDraggedFacePointKind(pointKind);
      setHoveredFacePointKind(pointKind);
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
                ? "Point personne ajouté."
                : "Point fond ajouté.",
          },
        };
      });
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingPhoto(true);
    dragStateRef.current = {
      kind: "photo",
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const dragState = dragStateRef.current;

    if (
      activePhoto &&
      appMode === "crop" &&
      editorInteractionMode === "move-face-points" &&
      !dragState
    ) {
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
      const faceDetection =
        activePhoto.faceDetection ?? getDefaultPhotoFaceDetectionState();
      const pointKind = findNearestFacePointKind(
        faceDetection.manualPoints,
        canvasPoint,
        getPhotoImageSize(activePhoto),
        PHOTO_CANVAS_SIZE,
        activePhoto.editState.transform,
      );

      setHoveredFacePointKind(pointKind);
      return;
    }

    if (
      editorInteractionMode !== "move-face-points" &&
      hoveredFacePointKind &&
      !dragState
    ) {
      setHoveredFacePointKind(null);
    }

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
            pointEditMode: getLegacyPointEditMode("move-face-points"),
            manualPoints: upsertManualFacePoint(faceDetection.manualPoints, {
              kind: dragState.pointKind,
              xPx: sourcePoint.x,
              yPx: sourcePoint.y,
            }),
            message: `Point ${getManualFacePointLabel(dragState.pointKind)} déplacé.`,
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
      if (dragStateRef.current.kind === "photo") {
        setIsDraggingPhoto(false);
      }

      if (dragStateRef.current.kind === "face-point") {
        setDraggedFacePointKind(null);
      }

      dragStateRef.current = null;
    }
  }

  function handlePointerLeave() {
    if (!dragStateRef.current) {
      setHoveredFacePointKind(null);
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
      const { createPhotosZip, downloadZip } = await import("../export/export-zip");
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
      />

      <div className="app-main-grid">
        <LeftPhotoPanel
          photos={photos}
          activePhotoId={activePhotoId}
          sheetCapacity={sheetCapacity}
          fileNamingTemplate={fileNamingTemplate}
          error={error}
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
          interactionMode={editorInteractionMode}
          isDraggingPhoto={isDraggingPhoto}
          hasHoveredFacePoint={Boolean(hoveredFacePointKind)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerEnd={handlePointerEnd}
          onPointerLeave={handlePointerLeave}
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
          editorInteractionMode={editorInteractionMode}
          backgroundRemovalStatus={backgroundRemovalStatus}
          backgroundRemovalError={backgroundRemovalError}
          backgroundPointMode={backgroundPointMode}
          onGuideVisibilityChange={handleGuideVisibilityChange}
          onGuideOpacityChange={handleGuideOpacityChange}
          onLoadFaceModel={handleLoadFaceModel}
          onPlaceFacePointsAutomatically={handlePlaceFacePointsAutomatically}
          onEditorInteractionModeChange={handleEditorInteractionModeChange}
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
        editorInteractionMode={editorInteractionMode}
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

function getGuideOverlayPoints(
  photo: PhotoItem,
  appMode: AppMode,
  hoveredFacePointKind: PhotoManualFacePointKind | null,
  draggedFacePointKind: PhotoManualFacePointKind | null,
): GuideOverlayPoint[] {
  return [
    ...(appMode === "crop"
      ? getManualFaceGuideOverlayPoints(
          photo,
          hoveredFacePointKind,
          draggedFacePointKind,
        )
      : []),
    ...(appMode === "background" ? getBackgroundGuideOverlayPoints(photo) : []),
  ];
}

function getManualFaceGuideOverlayPoints(
  photo: PhotoItem,
  hoveredFacePointKind: PhotoManualFacePointKind | null,
  draggedFacePointKind: PhotoManualFacePointKind | null,
): GuideOverlayPoint[] {
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
      state:
        point.kind === draggedFacePointKind
          ? "selected"
          : point.kind === hoveredFacePointKind
            ? "hovered"
            : "normal",
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
    "Le modèle est chargé, mais aucune variante ONNX Runtime Web ne crée la session.",
    "Le modèle est valide ONNX côté Python, mais incompatible avec ONNX Runtime Web dans cette forme.",
    firstError ? `Erreur representative : ${firstError}` : "",
    "Pistes suivantes : tester un autre modèle RMBG-1.4, tester model_quantized.onnx, convertir en format .ort, tester une autre version de onnxruntime-web ou un autre export ONNX compatible navigateur.",
  ]
    .filter(Boolean)
    .join(" ");
}
