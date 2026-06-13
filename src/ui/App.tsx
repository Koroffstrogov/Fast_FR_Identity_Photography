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
  PhotoItem,
  clampCopies,
  createPhotoItem,
  getNextActivePhotoId,
  removePhotoItem,
  updatePhotoItem,
} from "../core/photo-project";
import {
  A4_PRINT_PAGE,
  PRINT_LAYOUTS,
  PrintLayoutMode,
  getSheetCapacity,
} from "../core/print-layout";
import { buildSheetComposition } from "../core/sheet-items";
import { loadImageFile } from "../io/load-image-file";
import { openA4PrintPage } from "../print/open-print-page";
import { PhotoEditor } from "./PhotoEditor";
import { PhotoList } from "./PhotoList";

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
  const [sheetMode, setSheetMode] = useState<PrintLayoutMode>("standard");
  const sheetCapacity = useMemo(() => getSheetCapacity(sheetMode), [sheetMode]);
  const activePhoto = useMemo(
    () => photos.find((photo) => photo.id === activePhotoId) ?? null,
    [activePhotoId, photos],
  );
  const sheetComposition = useMemo(
    () => buildSheetComposition(photos, sheetMode),
    [photos, sheetMode],
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

    try {
      const loadedPhotos = await Promise.all(
        files.map(async (file) =>
          createPhotoItem({
            id: createPhotoItemId(),
            originalFileName: file.name,
            image: await loadImageFile(file),
          }),
        ),
      );

      setPhotos((currentPhotos) => [...currentPhotos, ...loadedPhotos]);
      setActivePhotoId((currentActivePhotoId) =>
        currentActivePhotoId ?? loadedPhotos[0]?.id ?? null,
      );
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Image illisible.");
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
    link.download = "photo-identite-413x531.jpg";
    link.click();
  }

  function handleSheetExport() {
    const canvas = sheetCanvasRef.current;

    if (!canvas || photos.length === 0) {
      return;
    }

    const link = document.createElement("a");
    link.href = exportSheetCanvasToJpeg(canvas);
    link.download = `planche-a4-${sheetMode}-${sheetComposition.renderedCount}-photos.jpg`;
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

        <div className="editor-layout">
          <PhotoList
            photos={photos}
            activePhotoId={activePhotoId}
            sheetCapacity={sheetCapacity}
            onSelectPhoto={setActivePhotoId}
            onDisplayNameChange={handleDisplayNameChange}
            onCopiesChange={handleCopiesChange}
            onRemovePhoto={handleRemovePhoto}
          />

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

          <form className="controls sheet-controls" onSubmit={(event) => event.preventDefault()}>
            <fieldset className="mode-control">
              <legend>Planche A4</legend>
              <div className="segmented-options">
                {(["standard", "comfort"] as const).map((mode) => (
                  <label key={mode}>
                    <input
                      type="radio"
                      name="sheet-mode"
                      value={mode}
                      checked={sheetMode === mode}
                      onChange={() => setSheetMode(mode)}
                    />
                    <span>
                      {mode === "standard" ? "Standard" : "Confort"}
                      <small>{PRINT_LAYOUTS[mode].photos} photos</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="sheet-total">
              Total demande : {sheetComposition.requestedCount} / {sheetComposition.capacity} places.
            </p>

            {sheetComposition.isLimited && (
              <p className="warning" role="alert">
                Le total depasse la capacite. L'export sera limite aux{" "}
                {sheetComposition.capacity} premieres photos.
              </p>
            )}

            <p className="print-note">
              Impression a 100 %, sans ajustement a la page. Verifiez la regle
              10 cm en bas de la planche.
            </p>

            <div className="button-row">
              <button
                type="button"
                onClick={handleSheetExport}
                disabled={photos.length === 0}
              >
                Export planche A4
              </button>
              <button
                type="button"
                onClick={handlePrintSheet}
                disabled={photos.length === 0}
              >
                Imprimer A4
              </button>
            </div>
          </form>
        </div>

        <section className="sheet-section" aria-labelledby="sheet-title">
          <div className="sheet-copy">
            <p className="eyebrow">Planche imprimable</p>
            <h2 id="sheet-title">Apercu A4</h2>
            <p>
              Page {A4_PRINT_PAGE.widthMm} x {A4_PRINT_PAGE.heightMm} mm a{" "}
              {A4_PRINT_PAGE.dpi} dpi, marge {A4_PRINT_PAGE.marginMm} mm, mode{" "}
              {sheetMode === "standard" ? "standard" : "confort"} :{" "}
              {sheetComposition.renderedCount} photo(s) rendue(s).
            </p>
          </div>
          <div className="sheet-preview-panel">
            <canvas
              ref={sheetCanvasRef}
              width={A4_PRINT_PAGE.widthPx}
              height={A4_PRINT_PAGE.heightPx}
              className="sheet-canvas"
              aria-label="Apercu planche A4 imprimable"
            />
          </div>
        </section>
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
