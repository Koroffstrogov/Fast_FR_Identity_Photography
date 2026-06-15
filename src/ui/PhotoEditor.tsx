import { PointerEventHandler, RefObject } from "react";
import { ImageTransform, ZOOM_MAX, ZOOM_MIN } from "../core/geometry";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";
import { BackgroundRemovalStatus } from "../background/background-removal";
import type { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import { BackgroundPanel } from "./BackgroundPanel";
import { FaceDetectionPanel } from "./FaceDetectionPanel";
import { FaceGuideControl } from "./FaceGuideControl";
import { EditorInteractionMode } from "./editor-interaction-mode";

type PhotoEditorProps = {
  photo: PhotoItem | null;
  photoCanvasRef: RefObject<HTMLCanvasElement | null>;
  guideCanvasRef: RefObject<HTMLCanvasElement | null>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerEnd: PointerEventHandler<HTMLCanvasElement>;
  onTransformChange: (partialTransform: Partial<ImageTransform>) => void;
  onGuideVisibilityChange: (showGuide: boolean) => void;
  onGuideOpacityChange: (opacity: number) => void;
  onResetPhoto: () => void;
  onExportPhoto: () => void;
  faceModelStatus: FaceLandmarkerModelStatus;
  faceModelError: string;
  editorInteractionMode: EditorInteractionMode;
  onLoadFaceModel: () => void;
  onPlaceFacePointsAutomatically: () => void;
  onEditorInteractionModeChange: (
    mode: EditorInteractionMode,
    options?: { resetFacePoints?: boolean },
  ) => void;
  onFacePointsVisibilityChange: (showFacePoints: boolean) => void;
  onApplyFacePlacementFromPoints: () => void;
  onDeleteFacePoints: () => void;
  backgroundRemovalStatus: BackgroundRemovalStatus;
  backgroundRemovalError: string;
  onLoadBackgroundModel: () => void;
  onRemoveBackground: () => void;
  onBackgroundChange: (partialEdit: Partial<NonNullable<PhotoItem["backgroundEdit"]>>) => void;
  onResetBackgroundSettings: () => void;
};

export function PhotoEditor({
  photo,
  photoCanvasRef,
  guideCanvasRef,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onTransformChange,
  onGuideVisibilityChange,
  onGuideOpacityChange,
  onResetPhoto,
  onExportPhoto,
  faceModelStatus,
  faceModelError,
  editorInteractionMode,
  onLoadFaceModel,
  onPlaceFacePointsAutomatically,
  onEditorInteractionModeChange,
  onFacePointsVisibilityChange,
  onApplyFacePlacementFromPoints,
  onDeleteFacePoints,
  backgroundRemovalStatus,
  backgroundRemovalError,
  onLoadBackgroundModel,
  onRemoveBackground,
  onBackgroundChange,
  onResetBackgroundSettings,
}: PhotoEditorProps) {
  const editState = photo?.editState;
  const transform = editState?.transform;

  return (
    <section className="photo-editor" aria-labelledby="photo-editor-title">
      <div className="canvas-panel">
        <canvas
          ref={photoCanvasRef}
          width={PHOTO_FORMAT.widthPx}
          height={PHOTO_FORMAT.heightPx}
          className={photo ? "photo-canvas is-draggable" : "photo-canvas"}
          aria-label="Aperçu photo 35 par 45 millimètres"
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

      <form className="controls photo-controls" onSubmit={(event) => event.preventDefault()}>
        <div>
          <p className="eyebrow">Cadrage actif</p>
          <h2 id="photo-editor-title">{photo ? photo.displayName : "Aucune photo"}</h2>
        </div>

        <label className="slider-control">
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

        <FaceGuideControl
          photo={photo}
          onGuideVisibilityChange={onGuideVisibilityChange}
          onGuideOpacityChange={onGuideOpacityChange}
        />

        <FaceDetectionPanel
          photo={photo}
          modelStatus={faceModelStatus}
          modelError={faceModelError}
          interactionMode={editorInteractionMode}
          onLoadModel={onLoadFaceModel}
          onPlaceFacePointsAutomatically={onPlaceFacePointsAutomatically}
          onInteractionModeChange={onEditorInteractionModeChange}
          onFacePointsVisibilityChange={onFacePointsVisibilityChange}
          onApplyFacePlacementFromPoints={onApplyFacePlacementFromPoints}
          onDeleteFacePoints={onDeleteFacePoints}
        />

        <BackgroundPanel
          backgroundEdit={photo?.backgroundEdit}
          disabled={!photo}
          removalStatus={backgroundRemovalStatus}
          removalError={backgroundRemovalError}
          onLoadModel={onLoadBackgroundModel}
          onRemoveBackground={onRemoveBackground}
          onBackgroundChange={onBackgroundChange}
          onResetSettings={onResetBackgroundSettings}
        />

        <label className="slider-control">
          <span>Rotation</span>
          <output>{transform ? transform.rotationDegrees.toFixed(1) : "0.0"}°</output>
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

        <div className="button-row">
          <button
            type="button"
            className="secondary-button"
            onClick={onResetPhoto}
            disabled={!photo}
          >
            Réinitialiser
          </button>
          <button type="button" onClick={onExportPhoto} disabled={!photo}>
            Export JPEG
          </button>
        </div>
      </form>
    </section>
  );
}
