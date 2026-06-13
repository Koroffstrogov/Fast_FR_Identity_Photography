import { ImageTransform, ZOOM_MAX, ZOOM_MIN } from "../core/geometry";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";
import { SheetComposition } from "../core/sheet-items";
import { AppMode, getAppModeLabel } from "./app-mode";

type BottomToolbarProps = {
  mode: AppMode;
  photo: PhotoItem | null;
  composition: SheetComposition;
  onTransformChange: (partialTransform: Partial<ImageTransform>) => void;
  onResetPhoto: () => void;
};

export function BottomToolbar({
  mode,
  photo,
  composition,
  onTransformChange,
  onResetPhoto,
}: BottomToolbarProps) {
  const transform = photo?.editState.transform;

  return (
    <footer className="bottom-toolbar" aria-label="Barre d'outils basse">
      <div className="toolbar-status">
        <strong>{getAppModeLabel(mode)}</strong>
        {photo && mode !== "sheet" && mode !== "export" && (
          <span>{PHOTO_FORMAT.widthMm} x {PHOTO_FORMAT.heightMm} mm - {PHOTO_FORMAT.widthPx} x {PHOTO_FORMAT.heightPx}px</span>
        )}
        {mode === "sheet" && (
          <span>{composition.renderedCount} placees / {composition.capacity}</span>
        )}
        {mode === "export" && (
          <span>{composition.requestedCount} demandes / {composition.capacity} places</span>
        )}
      </div>

      {(mode === "crop" || mode === "background" || mode === "quality") && (
        <div className="toolbar-controls">
          <label className="toolbar-slider">
            <span>Zoom</span>
            <output>{transform ? transform.zoom.toFixed(2) : "1.00"}x</output>
            <input
              aria-label="Zoom"
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step="0.01"
              value={transform?.zoom ?? 1}
              onChange={(event) =>
                onTransformChange({ zoom: Number(event.currentTarget.value) })
              }
              disabled={!photo}
            />
          </label>

          <label className="toolbar-slider">
            <span>Rotation</span>
            <output>{transform ? transform.rotationDegrees.toFixed(1) : "0.0"} deg</output>
            <input
              aria-label="Rotation"
              type="range"
              min="-20"
              max="20"
              step="0.1"
              value={transform?.rotationDegrees ?? 0}
              onChange={(event) =>
                onTransformChange({ rotationDegrees: Number(event.currentTarget.value) })
              }
              disabled={!photo}
            />
          </label>

          <button type="button" className="secondary-button" onClick={onResetPhoto} disabled={!photo}>
            Reinitialiser
          </button>
          <span>
            Guide {photo?.editState.showFaceGuide ? "affiche" : "masque"}
          </span>
        </div>
      )}
    </footer>
  );
}
