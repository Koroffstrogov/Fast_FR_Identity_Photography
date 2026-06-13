import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { exportCanvasToJpeg } from "../canvas/export-jpeg";
import { PHOTO_CANVAS_SIZE, preparePhotoCanvas, renderPhotoToCanvas } from "../canvas/render-photo";
import { DEFAULT_IMAGE_TRANSFORM, ImageTransform, scalePointerDeltaToCanvas } from "../core/geometry";
import { PHOTO_FORMAT } from "../core/photo-format";
import { loadImageFile } from "../io/load-image-file";

type DragState = {
  pointerId: number;
  x: number;
  y: number;
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [transform, setTransform] = useState<ImageTransform>(DEFAULT_IMAGE_TRANSFORM);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    if (image) {
      renderPhotoToCanvas(canvas, image, transform);
      return;
    }

    preparePhotoCanvas(canvas);
  }, [image, transform]);

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
    const canvas = canvasRef.current;

    if (!canvas || !image) {
      return;
    }

    const link = document.createElement("a");
    link.href = exportCanvasToJpeg(canvas);
    link.download = "photo-identite-413x531.jpg";
    link.click();
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <div className="intro">
          <p className="eyebrow">Traitement local</p>
          <h1 id="app-title">Photo d'identite 35 x 45 mm</h1>
          <p>
            Chargez une image depuis ce PC, cadrez-la dans le canvas, puis exportez
            un JPEG {PHOTO_FORMAT.widthPx} x {PHOTO_FORMAT.heightPx} px.
          </p>
        </div>

        <div className="editor-layout">
          <div className="canvas-panel">
            <canvas
              ref={canvasRef}
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
                min="0.5"
                max="3"
                step="0.01"
                value={transform.zoom}
                onChange={(event) => updateTransform({ zoom: Number(event.currentTarget.value) })}
                disabled={!image}
              />
            </label>

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
          </form>
        </div>
      </section>
    </main>
  );
}
