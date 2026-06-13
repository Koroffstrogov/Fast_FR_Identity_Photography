import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { exportCanvasToJpeg, exportSheetCanvasToJpeg } from "../canvas/export-jpeg";
import { prepareGuideCanvas, renderFranceOfficialFaceGuide } from "../canvas/render-guide";
import { PHOTO_CANVAS_SIZE, preparePhotoCanvas, renderPhotoToCanvas } from "../canvas/render-photo";
import { prepareSheetCanvas, renderSheetToCanvas } from "../canvas/render-sheet";
import {
  DEFAULT_IMAGE_TRANSFORM,
  ImageTransform,
  ZOOM_MAX,
  ZOOM_MIN,
  getCanvasPointFromClientPoint,
  scalePointerDeltaToCanvas,
  zoomTransformAtPoint,
} from "../core/geometry";
import { PHOTO_FORMAT } from "../core/photo-format";
import {
  A4_PRINT_PAGE,
  PRINT_LAYOUTS,
  PrintLayoutMode,
  clampSheetPhotoCount,
  getSheetCapacity,
  getSheetLayout,
} from "../core/print-layout";
import { loadImageFile } from "../io/load-image-file";
import { openA4PrintPage } from "../print/open-print-page";

type DragState = {
  pointerId: number;
  x: number;
  y: number;
};

export function App() {
  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [transform, setTransform] = useState<ImageTransform>(DEFAULT_IMAGE_TRANSFORM);
  const [showFaceGuide, setShowFaceGuide] = useState(true);
  const [faceGuideOpacity, setFaceGuideOpacity] = useState(0.82);
  const [sheetMode, setSheetMode] = useState<PrintLayoutMode>("standard");
  const [sheetPhotoCount, setSheetPhotoCount] = useState(getSheetCapacity("standard"));
  const sheetCapacity = useMemo(() => getSheetCapacity(sheetMode), [sheetMode]);
  const sheetLayout = useMemo(
    () => getSheetLayout(sheetMode, sheetPhotoCount),
    [sheetMode, sheetPhotoCount],
  );

  useEffect(() => {
    const photoCanvas = photoCanvasRef.current;
    const sheetCanvas = sheetCanvasRef.current;

    if (!photoCanvas || !sheetCanvas) {
      return;
    }

    if (image) {
      renderPhotoToCanvas(photoCanvas, image, transform);
      renderSheetToCanvas(sheetCanvas, photoCanvas, sheetMode, sheetPhotoCount);
      return;
    }

    preparePhotoCanvas(photoCanvas);
    prepareSheetCanvas(sheetCanvas, sheetMode, sheetPhotoCount);
  }, [image, sheetMode, sheetPhotoCount, transform]);

  useEffect(() => {
    const guideCanvas = guideCanvasRef.current;

    if (!guideCanvas) {
      return;
    }

    if (showFaceGuide) {
      renderFranceOfficialFaceGuide(guideCanvas, faceGuideOpacity);
      return;
    }

    prepareGuideCanvas(guideCanvas);
  }, [faceGuideOpacity, showFaceGuide]);

  useEffect(() => {
    const canvas = photoCanvasRef.current;

    if (!canvas) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      if (!image || !canvas) {
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

      setTransform((current) =>
        zoomTransformAtPoint(
          current,
          PHOTO_CANVAS_SIZE,
          canvasPoint,
          current.zoom * zoomFactor,
        ),
      );
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [image]);

  useEffect(() => {
    setSheetPhotoCount((current) => clampSheetPhotoCount(sheetMode, current));
  }, [sheetMode]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      const loadedImage = await loadImageFile(file);
      setImage(loadedImage);
      setFileName(file.name);
      setError("");
      setTransform(DEFAULT_IMAGE_TRANSFORM);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Image illisible.");
      setImage(null);
      setFileName("");
    }
  }

  function updateTransform(partialTransform: Partial<ImageTransform>) {
    setTransform((current) => ({
      ...current,
      ...partialTransform,
    }));
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!image) {
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

    if (!image || !dragState || dragState.pointerId !== event.pointerId) {
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

    setTransform((current) => ({
      ...current,
      offsetX: current.offsetX + canvasDelta.x,
      offsetY: current.offsetY + canvasDelta.y,
    }));
  }

  function handlePointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  function handleExport() {
    const canvas = photoCanvasRef.current;

    if (!canvas || !image) {
      return;
    }

    const link = document.createElement("a");
    link.href = exportCanvasToJpeg(canvas);
    link.download = "photo-identite-413x531.jpg";
    link.click();
  }

  function handleSheetExport() {
    const canvas = sheetCanvasRef.current;

    if (!canvas || !image) {
      return;
    }

    const link = document.createElement("a");
    link.href = exportSheetCanvasToJpeg(canvas);
    link.download = `planche-a4-${sheetMode}-${sheetLayout.photoCount}-photos.jpg`;
    link.click();
  }

  function handlePrintSheet() {
    const canvas = sheetCanvasRef.current;

    if (!canvas || !image) {
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
            Chargez une image depuis ce PC, cadrez-la dans le canvas, puis exportez
            un JPEG {PHOTO_FORMAT.widthPx} x {PHOTO_FORMAT.heightPx} px ou une
            planche A4 imprimable.
          </p>
        </div>

        <div className="editor-layout">
          <div className="canvas-panel">
            <canvas
              ref={photoCanvasRef}
              width={PHOTO_FORMAT.widthPx}
              height={PHOTO_FORMAT.heightPx}
              className={image ? "photo-canvas is-draggable" : "photo-canvas"}
              aria-label="Apercu photo 35 par 45 millimetres"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            />
            {!image && (
              <div className="canvas-empty" aria-hidden="true">
                Importez une image
              </div>
            )}
            <canvas
              ref={guideCanvasRef}
              width={PHOTO_FORMAT.widthPx}
              height={PHOTO_FORMAT.heightPx}
              className="guide-canvas"
              aria-hidden="true"
            />
          </div>

          <form className="controls" onSubmit={(event) => event.preventDefault()}>
            <label className="file-control">
              <span>Image locale</span>
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>

            {fileName && <p className="file-name">{fileName}</p>}
            {error && <p className="error" role="alert">{error}</p>}

            <label className="slider-control">
              <span>Zoom</span>
              <output>{transform.zoom.toFixed(2)}x</output>
              <input
                aria-label="Zoom"
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step="0.01"
                value={transform.zoom}
                onChange={(event) => updateTransform({ zoom: Number(event.currentTarget.value) })}
                disabled={!image}
              />
            </label>

            <fieldset className="guide-control">
              <legend>Guide visage</legend>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={showFaceGuide}
                  onChange={(event) => setShowFaceGuide(event.currentTarget.checked)}
                />
                <span>Afficher le guide visage</span>
              </label>
              <label className="slider-control">
                <span>Opacite du guide</span>
                <output>{Math.round(faceGuideOpacity * 100)}%</output>
                <input
                  aria-label="Opacite du guide"
                  type="range"
                  min="0.15"
                  max="1"
                  step="0.01"
                  value={faceGuideOpacity}
                  onChange={(event) =>
                    setFaceGuideOpacity(Number(event.currentTarget.value))
                  }
                  disabled={!showFaceGuide}
                />
              </label>
              <p className="guide-note">
                Gabarit base sur les recommandations francaises : visage 32-36 mm
                du menton au sommet du crane, hors cheveux.
              </p>
            </fieldset>

            <label className="slider-control">
              <span>Rotation</span>
              <output>{transform.rotationDegrees.toFixed(1)} deg</output>
              <input
                aria-label="Rotation"
                type="range"
                min="-20"
                max="20"
                step="0.1"
                value={transform.rotationDegrees}
                onChange={(event) =>
                  updateTransform({ rotationDegrees: Number(event.currentTarget.value) })
                }
                disabled={!image}
              />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setTransform(DEFAULT_IMAGE_TRANSFORM)}
                disabled={!image}
              >
                Reinitialiser
              </button>
              <button type="button" onClick={handleExport} disabled={!image}>
                Export JPEG
              </button>
            </div>

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

            <label className="number-control">
              <span>Nombre de photos</span>
              <output>
                {sheetPhotoCount}/{sheetCapacity}
              </output>
              <input
                aria-label="Nombre de photos"
                type="number"
                min="1"
                max={sheetCapacity}
                step="1"
                value={sheetPhotoCount}
                onChange={(event) =>
                  setSheetPhotoCount(
                    clampSheetPhotoCount(sheetMode, event.currentTarget.valueAsNumber),
                  )
                }
              />
            </label>

            <p className="print-note">
              Impression a 100 %, sans ajustement a la page. Verifiez la regle
              10 cm en bas de la planche.
            </p>

            <div className="button-row">
              <button type="button" onClick={handleSheetExport} disabled={!image}>
                Export planche A4
              </button>
              <button type="button" onClick={handlePrintSheet} disabled={!image}>
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
              {sheetMode === "standard" ? "standard" : "confort"} de{" "}
              {sheetLayout.photoCount} photos.
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
