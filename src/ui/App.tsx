import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { exportCanvasToJpeg, exportSheetCanvasToJpeg } from "../canvas/export-jpeg";
import { prepareGuideCanvas, renderFranceOfficialFaceGuide } from "../canvas/render-guide";
import { PHOTO_CANVAS_SIZE, preparePhotoCanvas, renderPhotoToCanvas } from "../canvas/render-photo";
import {
  prepareSheetCanvas,
  renderPhotoItemsToSheetCanvas,
} from "../canvas/render-sheet";
import {
  DEFAULT_IMAGE_TRANSFORM,
  getCanvasPointFromClientPoint,
  scalePointerDeltaToCanvas,
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
  getNextActivePhotoId,
  removePhotoItem,
  updatePhotoItem,
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

    if (activePhoto?.editState.showFaceGuide) {
      renderFranceOfficialFaceGuide(guideCanvas, activePhoto.editState.faceGuideOpacity);
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

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!activePhotoId) {
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

function createPhotoItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  photoIdCounter += 1;

  return `photo-${Date.now()}-${photoIdCounter}`;
}
