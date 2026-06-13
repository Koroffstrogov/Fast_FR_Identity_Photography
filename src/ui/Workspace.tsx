import { PointerEventHandler, RefObject } from "react";
import { PrintLayoutMode } from "../core/print-layout";
import { PhotoItem } from "../core/photo-project";
import { SheetComposition } from "../core/sheet-items";
import { PHOTO_FORMAT } from "../core/photo-format";
import { AppMode, getAppModeLabel } from "./app-mode";
import { SheetPreview } from "./SheetPreview";

type WorkspaceProps = {
  mode: AppMode;
  photo: PhotoItem | null;
  photoCanvasRef: RefObject<HTMLCanvasElement | null>;
  guideCanvasRef: RefObject<HTMLCanvasElement | null>;
  sheetCanvasRef: RefObject<HTMLCanvasElement | null>;
  sheetMode: PrintLayoutMode;
  composition: SheetComposition;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerEnd: PointerEventHandler<HTMLCanvasElement>;
};

export function Workspace({
  mode,
  photo,
  photoCanvasRef,
  guideCanvasRef,
  sheetCanvasRef,
  sheetMode,
  composition,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: WorkspaceProps) {
  if (mode === "sheet") {
    return (
      <main className="workspace-panel" aria-label="Espace de travail">
        <SheetPreview
          canvasRef={sheetCanvasRef}
          sheetMode={sheetMode}
          composition={composition}
          variant="stage"
        />
      </main>
    );
  }

  if (mode === "export") {
    return (
      <main className="workspace-panel" aria-label="Espace de travail">
        <section className="export-summary-stage" aria-labelledby="export-summary-title">
          <p className="eyebrow">Sorties</p>
          <h2 id="export-summary-title">Recapitulatif export</h2>
          <dl className="export-summary-grid">
            <div>
              <dt>Photo active</dt>
              <dd>{photo ? photo.displayName : "Aucune"}</dd>
            </div>
            <div>
              <dt>Planche</dt>
              <dd>{composition.renderedCount} / {composition.capacity}</dd>
            </div>
            <div>
              <dt>Limite</dt>
              <dd>{composition.isLimited ? "Capacite depassee" : "OK"}</dd>
            </div>
          </dl>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-panel" aria-label="Espace de travail">
      <section className="photo-stage" aria-labelledby="photo-stage-title">
        <div className="stage-title-row">
          <div>
            <p className="eyebrow">{getAppModeLabel(mode)}</p>
            <h2 id="photo-stage-title">{photo ? photo.displayName : "Aucune photo"}</h2>
          </div>
          <button type="button" className="secondary-button stage-fit-button">
            Ajuster a l'ecran
          </button>
        </div>

        <div className="photo-stage-viewport">
          <div className="canvas-panel photo-stage-canvas-panel">
            <canvas
              ref={photoCanvasRef}
              width={PHOTO_FORMAT.widthPx}
              height={PHOTO_FORMAT.heightPx}
              className={photo ? "photo-canvas is-draggable" : "photo-canvas"}
              aria-label="Apercu photo 35 par 45 millimetres"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
            />
            {!photo && (
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
        </div>
      </section>
    </main>
  );
}
