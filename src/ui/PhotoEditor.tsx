import { PointerEventHandler, RefObject } from "react";
import { ImageTransform, ZOOM_MAX, ZOOM_MIN } from "../core/geometry";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";
import { BackgroundRemovalStatus } from "../background/background-removal";
import type { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import { BackgroundPanel, BackgroundPointMode } from "./BackgroundPanel";
import { FaceDetectionPanel } from "./FaceDetectionPanel";

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
  onLoadFaceModel: () => void;
  onPlaceFacePointsAutomatically: () => void;
  onManualPlacementChange: (enabled: boolean) => void;
  onMoveFacePointChange: (enabled: boolean) => void;
  onFacePointsVisibilityChange: (showFacePoints: boolean) => void;
  onApplyFacePlacementFromPoints: () => void;
  onDeleteFacePoints: () => void;
  backgroundRemovalStatus: BackgroundRemovalStatus;
  backgroundRemovalError: string;
  backgroundPointMode: BackgroundPointMode;
  onLoadBackgroundModel: () => void;
  onRemoveBackground: () => void;
  onBackgroundChange: (partialEdit: Partial<NonNullable<PhotoItem["backgroundEdit"]>>) => void;
  onBackgroundPointModeChange: (mode: BackgroundPointMode) => void;
  onResetBackgroundPoints: () => void;
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
  onLoadFaceModel,
  onPlaceFacePointsAutomatically,
  onManualPlacementChange,
  onMoveFacePointChange,
  onFacePointsVisibilityChange,
  onApplyFacePlacementFromPoints,
  onDeleteFacePoints,
  backgroundRemovalStatus,
  backgroundRemovalError,
  backgroundPointMode,
  onLoadBackgroundModel,
  onRemoveBackground,
  onBackgroundChange,
  onBackgroundPointModeChange,
  onResetBackgroundPoints,
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

        <fieldset className="guide-control">
          <legend>Guide visage</legend>
          <label className="check-control">
            <input
              type="checkbox"
              checked={editState?.showFaceGuide ?? true}
              onChange={(event) => onGuideVisibilityChange(event.currentTarget.checked)}
              disabled={!photo}
            />
            <span>Afficher le guide visage</span>
          </label>
          <label className="slider-control">
            <span>Opacite du guide</span>
            <output>{Math.round((editState?.faceGuideOpacity ?? 0.82) * 100)}%</output>
            <input
              aria-label="Opacite du guide"
              type="range"
              min="0.15"
              max="1"
              step="0.01"
              value={editState?.faceGuideOpacity ?? 0.82}
              onChange={(event) => onGuideOpacityChange(Number(event.currentTarget.value))}
              disabled={!photo || !editState?.showFaceGuide}
            />
          </label>
          <p className="guide-note">
            Gabarit base sur les recommandations francaises : visage 32-36 mm
            du menton au sommet du crane, hors cheveux.
          </p>
        </fieldset>

        <FaceDetectionPanel
          photo={photo}
          modelStatus={faceModelStatus}
          modelError={faceModelError}
          onLoadModel={onLoadFaceModel}
          onPlaceFacePointsAutomatically={onPlaceFacePointsAutomatically}
          onManualPlacementChange={onManualPlacementChange}
          onMoveFacePointChange={onMoveFacePointChange}
          onFacePointsVisibilityChange={onFacePointsVisibilityChange}
          onApplyFacePlacementFromPoints={onApplyFacePlacementFromPoints}
          onDeleteFacePoints={onDeleteFacePoints}
        />

        <BackgroundPanel
          backgroundEdit={photo?.backgroundEdit}
          disabled={!photo}
          removalStatus={backgroundRemovalStatus}
          removalError={backgroundRemovalError}
          pointMode={backgroundPointMode}
          onLoadModel={onLoadBackgroundModel}
          onRemoveBackground={onRemoveBackground}
          onBackgroundChange={onBackgroundChange}
          onPointModeChange={onBackgroundPointModeChange}
          onResetPoints={onResetBackgroundPoints}
          onResetSettings={onResetBackgroundSettings}
        />

        <label className="slider-control">
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

        <div className="button-row">
          <button
            type="button"
            className="secondary-button"
            onClick={onResetPhoto}
            disabled={!photo}
          >
            Reinitialiser
          </button>
          <button type="button" onClick={onExportPhoto} disabled={!photo}>
            Export JPEG
          </button>
        </div>
      </form>
    </section>
  );
}
