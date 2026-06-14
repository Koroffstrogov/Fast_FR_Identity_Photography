import { ImageTransform, ZOOM_MAX, ZOOM_MIN } from "../core/geometry";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";
import { SheetComposition } from "../core/sheet-items";
import { AppMode, getAppModeLabel } from "./app-mode";
import {
  EditorInteractionMode,
  getNextFacePointStepLabel,
} from "./editor-interaction-mode";
import { getNextManualFacePointKind } from "../core/photo-project";
import { ButtonIcon } from "./icons";

type BottomToolbarProps = {
  mode: AppMode;
  photo: PhotoItem | null;
  composition: SheetComposition;
  editorInteractionMode: EditorInteractionMode;
  onTransformChange: (partialTransform: Partial<ImageTransform>) => void;
  onResetPhoto: () => void;
};

export function BottomToolbar({
  mode,
  photo,
  composition,
  editorInteractionMode,
  onTransformChange,
  onResetPhoto,
}: BottomToolbarProps) {
  const transform = photo?.editState.transform;
  const interactionMessage = getToolbarInteractionMessage(photo, editorInteractionMode);

  return (
    <footer className="bottom-toolbar" aria-label="Barre d'outils basse">
      <div className="toolbar-status">
        <strong>{getAppModeLabel(mode)}</strong>
        {photo && mode !== "sheet" && mode !== "export" && (
          <span>
            {mode === "crop"
              ? interactionMessage
              : `${PHOTO_FORMAT.widthMm} x ${PHOTO_FORMAT.heightMm} mm - ${PHOTO_FORMAT.widthPx} x ${PHOTO_FORMAT.heightPx}px`}
          </span>
        )}
        {mode === "sheet" && (
          <span>{composition.renderedCount} placées / {composition.capacity}</span>
        )}
        {mode === "export" && (
          <span>{composition.requestedCount} demandées / {composition.capacity} places</span>
        )}
      </div>

      {(mode === "crop" || mode === "background" || mode === "quality") && (
        <div className="toolbar-controls">
          <div className="toolbar-transform-group" aria-label="Contrôle zoom">
            <span>Zoom</span>
            <button
              type="button"
              className="secondary-button icon-step-button button-with-icon"
              onClick={() =>
                onTransformChange({ zoom: clampZoom((transform?.zoom ?? 1) - 0.05) })
              }
              disabled={!photo}
              aria-label="Zoom moins"
            >
              <ButtonIcon name="zoomOut" />
              -
            </button>
            <output aria-label="Valeur zoom">
              {Math.round((transform?.zoom ?? 1) * 100)} %
            </output>
            <button
              type="button"
              className="secondary-button icon-step-button button-with-icon"
              onClick={() =>
                onTransformChange({ zoom: clampZoom((transform?.zoom ?? 1) + 0.05) })
              }
              disabled={!photo}
              aria-label="Zoom plus"
            >
              <ButtonIcon name="zoomIn" />
              +
            </button>
            <button
              type="button"
              className="secondary-button button-with-icon"
              onClick={() => onTransformChange({ zoom: 1, offsetX: 0, offsetY: 0 })}
              disabled={!photo}
            >
              <ButtonIcon name="fit" />
              Ajuster
            </button>
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
          </div>

          <div className="toolbar-transform-group rotation-transform-group" aria-label="Contrôle rotation">
            <span>Rotation</span>
            <button
              type="button"
              className="secondary-button button-with-icon"
              onClick={() =>
                onTransformChange({
                  rotationDegrees: clampRotation((transform?.rotationDegrees ?? 0) - 1),
                })
              }
              disabled={!photo}
            >
              <ButtonIcon name="rotateLeft" />
              -1°
            </button>
            <button
              type="button"
              className="secondary-button button-with-icon"
              onClick={() =>
                onTransformChange({
                  rotationDegrees: clampRotation((transform?.rotationDegrees ?? 0) - 0.1),
                })
              }
              disabled={!photo}
            >
              <ButtonIcon name="rotateLeft" />
              -0.1°
            </button>
            <output aria-label="Valeur rotation">
              {(transform?.rotationDegrees ?? 0).toFixed(1)}°
            </output>
            <button
              type="button"
              className="secondary-button button-with-icon"
              onClick={() =>
                onTransformChange({
                  rotationDegrees: clampRotation((transform?.rotationDegrees ?? 0) + 0.1),
                })
              }
              disabled={!photo}
            >
              <ButtonIcon name="rotateRight" />
              +0.1°
            </button>
            <button
              type="button"
              className="secondary-button button-with-icon"
              onClick={() =>
                onTransformChange({
                  rotationDegrees: clampRotation((transform?.rotationDegrees ?? 0) + 1),
                })
              }
              disabled={!photo}
            >
              <ButtonIcon name="rotateRight" />
              +1°
            </button>
            <button
              type="button"
              className="secondary-button button-with-icon"
              onClick={() => onTransformChange({ rotationDegrees: 0 })}
              disabled={!photo}
            >
              <ButtonIcon name="reset" />
              Reset
            </button>
          </div>

          <button type="button" className="secondary-button button-with-icon" onClick={onResetPhoto} disabled={!photo}>
            <ButtonIcon name="reset" />
            Réinitialiser
          </button>
          <span>
            Guide {photo?.editState.showFaceGuide ? "affiché" : "masqué"}
          </span>
        </div>
      )}
    </footer>
  );
}

function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(zoom.toFixed(2))));
}

function clampRotation(rotationDegrees: number): number {
  return Math.min(20, Math.max(-20, Number(rotationDegrees.toFixed(1))));
}

function getToolbarInteractionMessage(
  photo: PhotoItem | null,
  editorInteractionMode: EditorInteractionMode,
): string {
  if (!photo) {
    return `${PHOTO_FORMAT.widthMm} x ${PHOTO_FORMAT.heightMm} mm - ${PHOTO_FORMAT.widthPx} x ${PHOTO_FORMAT.heightPx}px`;
  }

  if (editorInteractionMode === "move-face-points") {
    return "Mode déplacement points actif - la photo est verrouillée.";
  }

  if (editorInteractionMode === "place-face-points") {
    const faceDetection = photo.faceDetection;
    const nextPointKind = getNextManualFacePointKind(
      faceDetection?.manualPoints ?? [],
    );

    return getNextFacePointStepLabel(nextPointKind);
  }

  return `${PHOTO_FORMAT.widthMm} x ${PHOTO_FORMAT.heightMm} mm - ${PHOTO_FORMAT.widthPx} x ${PHOTO_FORMAT.heightPx}px`;
}
