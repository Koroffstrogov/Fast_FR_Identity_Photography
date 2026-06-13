import { PointerEvent, RefObject, useRef, useState } from "react";
import { PrintLayoutMode } from "../core/print-layout";
import { SheetComposition } from "../core/sheet-items";

type SheetPreviewZoom = "fit" | "50" | "100" | "200";

type DragState = {
  pointerId: number;
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
};

type SheetPreviewProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sheetMode: PrintLayoutMode;
  composition: SheetComposition;
};

const SHEET_ZOOM_LABELS: Record<SheetPreviewZoom, string> = {
  fit: "Ajuste",
  "50": "50%",
  "100": "100%",
  "200": "200%",
};

export function SheetPreview({ canvasRef, sheetMode, composition }: SheetPreviewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [zoom, setZoom] = useState<SheetPreviewZoom>("fit");
  const canPan = zoom !== "fit";

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canPan || !viewportRef.current) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    const viewport = viewportRef.current;

    if (!dragState || !viewport || dragState.pointerId !== event.pointerId) {
      return;
    }

    viewport.scrollLeft = dragState.scrollLeft - (event.clientX - dragState.x);
    viewport.scrollTop = dragState.scrollTop - (event.clientY - dragState.y);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  return (
    <section className="sheet-section" aria-labelledby="sheet-title">
      <div className="sheet-copy">
        <p className="eyebrow">Planche imprimable</p>
        <h2 id="sheet-title">Apercu planche A4</h2>
        <dl className="sheet-stats">
          <div>
            <dt>Mode</dt>
            <dd>{sheetMode === "standard" ? "Standard" : "Confort"}</dd>
          </div>
          <div>
            <dt>Total demande</dt>
            <dd>{composition.requestedCount}</dd>
          </div>
          <div>
            <dt>Capacite</dt>
            <dd>{composition.capacity}</dd>
          </div>
          <div>
            <dt>Placees</dt>
            <dd>{composition.renderedCount}</dd>
          </div>
        </dl>
        {composition.isLimited && (
          <p className="warning" role="alert">
            Le total depasse la capacite. L'aperçu et l'export sont limites aux{" "}
            {composition.capacity} premieres photos.
          </p>
        )}
      </div>

      <div className="sheet-preview-panel">
        <fieldset className="zoom-control">
          <legend>Zoom aperçu</legend>
          <div className="segmented-options zoom-options">
            {(Object.keys(SHEET_ZOOM_LABELS) as SheetPreviewZoom[]).map((zoomOption) => (
              <label key={zoomOption}>
                <input
                  type="radio"
                  name="sheet-preview-zoom"
                  value={zoomOption}
                  checked={zoom === zoomOption}
                  onChange={() => setZoom(zoomOption)}
                />
                <span>{SHEET_ZOOM_LABELS[zoomOption]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div
          ref={viewportRef}
          className={canPan ? "sheet-preview-viewport can-pan" : "sheet-preview-viewport"}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <canvas
            ref={canvasRef}
            width="2480"
            height="3508"
            className={`sheet-canvas sheet-zoom-${zoom}`}
            aria-label="Apercu planche A4 imprimable"
          />
        </div>
      </div>
    </section>
  );
}
