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
  PhotoUsage,
  clampCopies,
  getDefaultPhotoFaceDetectionState,
  getManualFacePointLabel,
  getNextActivePhotoId,
  getNextManualFacePointKind,
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
import { ExportPanel } from "./ExportPanel";
import { FinalPhotoPreview } from "./FinalPhotoPreview";
import { PhotoEditor } from "./PhotoEditor";
import { PhotoList } from "./PhotoList";
import { SheetPreview } from "./SheetPreview";
import {
  FaceLandmarkerModelStatus,
  detectFaceLandmarks,
  getFaceLandmarkerErrorMessage,
  loadFaceLandmarker,
} from "../vision/face-landmarker";
import { analyzeFaceLandmarks } from "../vision/face-landmarks";
import {
  canvasPointToSourceImagePoint,
  createFacePlacementFromCandidate,
  createFacePlacementFromManualPoints,
  sourceImagePointToCanvasPoint,
} from "../vision/face-placement";

type DragState = {
  pointerId: number;
  x: number;
  y: number;
};

let photoIdCounter = 0;

export function App() {
  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importErrors, setImportErrors] = useState<ImageImportError[]>([]);
  const [sheetMode, setSheetMode] = useState<PrintLayoutMode>("standard");
  const [fileNamingTemplate, setFileNamingTemplate] =
    useState<FileNamingTemplateId>("displayNameIdentity");
  const [faceModelStatus, setFaceModelStatus] =
    useState<FaceLandmarkerModelStatus>("idle");
  const [faceModelError, setFaceModelError] = useState("");
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

    if (!photoCanvas || !sheetCanvas) {
      return;
    }

    if (activePhoto) {
      renderPhotoToCanvas(photoCanvas, activePhoto.image, activePhoto.editState.transform);
    } else {
      preparePhotoCanvas(photoCanvas);
    }

    if (photos.length > 0) {
      renderPhotoItemsToSheetCanvas(sheetCanvas, photos, sheetMode);
    } else {
      prepareSheetCanvas(sheetCanvas, sheetMode);
    }
  }, [activePhoto, photos, sheetMode]);

  useEffect(() => {
    const guideCanvas = guideCanvasRef.current;

    if (!guideCanvas) {
      return;
    }

    if (activePhoto) {
      renderFaceGuideOverlay(guideCanvas, {
        showGuide: activePhoto.editState.showFaceGuide,
        opacity: activePhoto.editState.faceGuideOpacity,
        manualPoints: getManualGuideOverlayPoints(activePhoto),
      });
      return;
    }

    prepareGuideCanvas(guideCanvas);
  }, [activePhoto]);

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
  }, [activePhotoId]);

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

  async function ensureFaceModelLoaded(): Promise<string | null> {
    if (faceModelStatus === "ready") {
      return null;
    }

    setFaceModelStatus("loading");
    setFaceModelError("");

    try {
      await loadFaceLandmarker();
      setFaceModelStatus("ready");
      return null;
    } catch (loadError) {
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

  async function handleDetectFace() {
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
        message: "Detection visage en cours.",
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

      const placement = createFacePlacementFromCandidate(
        analysis.selectedFace,
        getPhotoImageSize(photo),
      );
      const diagnostics = dedupeDiagnostics([
        ...analysis.diagnostics,
        ...placement.diagnostics,
      ]);

      if (!placement.transform) {
        updatePhoto(photo.id, (currentPhoto) => ({
          ...currentPhoto,
          faceDetection: {
            ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
            status: "error",
            diagnostics,
            message: placement.message,
          },
        }));
        return;
      }

      const proposedTransform = placement.transform;

      updatePhoto(photo.id, (currentPhoto) => ({
        ...currentPhoto,
        editState: {
          ...currentPhoto.editState,
          transform: proposedTransform,
        },
        faceDetection: {
          ...(currentPhoto.faceDetection ?? getDefaultPhotoFaceDetectionState()),
          status: "detected",
          diagnostics,
          message: placement.message,
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

  function handleManualAssistantChange(enabled: boolean) {
    updateActivePhoto((photo) => {
      const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();

      return {
        ...photo,
        faceDetection: {
          ...faceDetection,
          status: enabled ? "manual" : faceDetection.status,
          manualAssistantEnabled: enabled,
          message: enabled
            ? "Cliquez centre des yeux, menton, puis sommet du crane si utile."
            : faceDetection.message,
        },
      };
    });
  }

  function handleApplyManualFacePlacement() {
    const photo = activePhoto;

    if (!photo) {
      return;
    }

    const faceDetection = photo.faceDetection ?? getDefaultPhotoFaceDetectionState();
    const placement = createFacePlacementFromManualPoints(
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

  function handleResetManualFacePoints() {
    updateActivePhoto((photo) => ({
      ...photo,
      faceDetection: {
        ...(photo.faceDetection ?? getDefaultPhotoFaceDetectionState()),
        status: "manual",
        manualPoints: [],
        diagnostics: [],
        message: "Points manuels reinitialises.",
      },
    }));
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!activePhotoId || !activePhoto) {
      return;
    }

    if (activePhoto.faceDetection?.manualAssistantEnabled) {
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
      const pointKind = getNextManualFacePointKind(
        activePhoto.faceDetection.manualPoints,
      );
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
            manualPoints,
            message: `${manualPoints.length}/3 point(s) manuel(s) places.`,
          },
        };
      });
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
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
    const canvas = photoCanvasRef.current;

    if (!canvas || !activePhoto) {
      return;
    }

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
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <div className="intro">
          <p className="eyebrow">Traitement local</p>
          <h1 id="app-title">Photo d'identite 35 x 45 mm</h1>
          <p>
            Importez plusieurs images depuis ce PC, cadrez chaque personne, puis
            generez une planche A4 avec le nombre de copies voulu.
          </p>
        </div>

        <label className="file-control import-control">
          <span>Images locales</span>
          <input type="file" accept="image/*" multiple onChange={handleFileChange} />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        {importSummary && <p className="import-summary">{importSummary}</p>}
        {importErrors.length > 0 && (
          <ul className="import-errors" aria-label="Fichiers ignores">
            {importErrors.map((importError) => (
              <li key={`${importError.fileName}-${importError.message}`}>
                {importError.fileName} : {importError.message}
              </li>
            ))}
          </ul>
        )}

        <div className="editor-layout">
          <PhotoList
            photos={photos}
            activePhotoId={activePhotoId}
            sheetCapacity={sheetCapacity}
            fileNamesByPhotoId={fileNamesByPhotoId}
            onSelectPhoto={setActivePhotoId}
            onDisplayNameChange={handleDisplayNameChange}
            onFirstNameChange={handleFirstNameChange}
            onLastNameChange={handleLastNameChange}
            onUsageChange={handleUsageChange}
            onGenerateDisplayName={handleGenerateDisplayName}
            onCopiesChange={handleCopiesChange}
            onRemovePhoto={handleRemovePhoto}
          />

          <div className="photo-workflow">
            <PhotoEditor
              photo={activePhoto}
              photoCanvasRef={photoCanvasRef}
              guideCanvasRef={guideCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerEnd={handlePointerEnd}
              onTransformChange={handleTransformChange}
              onGuideVisibilityChange={handleGuideVisibilityChange}
              onGuideOpacityChange={handleGuideOpacityChange}
              onResetPhoto={handleResetActivePhoto}
              onExportPhoto={handleExportPhoto}
              faceModelStatus={faceModelStatus}
              faceModelError={faceModelError}
              onLoadFaceModel={handleLoadFaceModel}
              onDetectFace={handleDetectFace}
              onManualAssistantChange={handleManualAssistantChange}
              onApplyManualFacePlacement={handleApplyManualFacePlacement}
              onResetManualFacePoints={handleResetManualFacePoints}
            />
            <FinalPhotoPreview photo={activePhoto} />
          </div>

          <ExportPanel
            photoCount={photos.length}
            fileNamingTemplate={fileNamingTemplate}
            sheetMode={sheetMode}
            composition={sheetComposition}
            onFileNamingTemplateChange={setFileNamingTemplate}
            onSheetModeChange={setSheetMode}
            onSheetExport={handleSheetExport}
            onPrintSheet={handlePrintSheet}
            onZipExport={handleZipExport}
            onSeparateExport={handleBatchExport}
          />
        </div>

        <SheetPreview
          canvasRef={sheetCanvasRef}
          sheetMode={sheetMode}
          composition={sheetComposition}
        />
      </section>
    </main>
  );
}

function getPhotoImageSize(photo: PhotoItem): Size {
  return {
    width: photo.image.naturalWidth,
    height: photo.image.naturalHeight,
  };
}

function getManualGuideOverlayPoints(photo: PhotoItem): GuideOverlayPoint[] {
  const faceDetection = photo.faceDetection;

  if (!faceDetection || faceDetection.manualPoints.length === 0) {
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
