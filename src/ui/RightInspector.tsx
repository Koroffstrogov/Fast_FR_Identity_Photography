import { FileNamingTemplateId } from "../core/file-naming";
import { PhotoItem } from "../core/photo-project";
import { PRINT_LAYOUTS, PrintLayoutMode } from "../core/print-layout";
import { SheetComposition } from "../core/sheet-items";
import { QualityEditState } from "../quality/quality-state";
import { BackgroundRemovalStatus } from "../background/background-removal";
import type { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import { BackgroundPanel, BackgroundPointMode } from "./BackgroundPanel";
import { ExportPanel } from "./ExportPanel";
import { FaceDetectionPanel } from "./FaceDetectionPanel";
import { QualityPanel } from "./QualityPanel";
import { AppMode, getAppModeLabel } from "./app-mode";

type RightInspectorProps = {
  mode: AppMode;
  photo: PhotoItem | null;
  photoCount: number;
  fileNamingTemplate: FileNamingTemplateId;
  sheetMode: PrintLayoutMode;
  composition: SheetComposition;
  faceModelStatus: FaceLandmarkerModelStatus;
  faceModelError: string;
  backgroundRemovalStatus: BackgroundRemovalStatus;
  backgroundRemovalError: string;
  backgroundPointMode: BackgroundPointMode;
  onGuideVisibilityChange: (showGuide: boolean) => void;
  onGuideOpacityChange: (opacity: number) => void;
  onLoadFaceModel: () => void;
  onPlaceFacePointsAutomatically: () => void;
  onManualPlacementChange: (enabled: boolean) => void;
  onMoveFacePointChange: (enabled: boolean) => void;
  onFacePointsVisibilityChange: (showFacePoints: boolean) => void;
  onApplyFacePlacementFromPoints: () => void;
  onDeleteFacePoints: () => void;
  onLoadBackgroundModel: () => void;
  onRemoveBackground: () => void;
  onBackgroundChange: (partialEdit: Partial<NonNullable<PhotoItem["backgroundEdit"]>>) => void;
  onBackgroundPointModeChange: (mode: BackgroundPointMode) => void;
  onResetBackgroundPoints: () => void;
  onResetBackgroundSettings: () => void;
  onQualityChange: (partialEdit: Partial<QualityEditState>) => void;
  onAutoQuality: () => void;
  onResetQuality: () => void;
  onRecalculateQuality: () => void;
  onFileNamingTemplateChange: (templateId: FileNamingTemplateId) => void;
  onSheetModeChange: (mode: PrintLayoutMode) => void;
  onExportPhoto: () => void;
  onSheetExport: () => void;
  onPrintSheet: () => void;
  onZipExport: () => void;
  onSeparateExport: () => void;
};

export function RightInspector({
  mode,
  photo,
  photoCount,
  fileNamingTemplate,
  sheetMode,
  composition,
  faceModelStatus,
  faceModelError,
  backgroundRemovalStatus,
  backgroundRemovalError,
  backgroundPointMode,
  onGuideVisibilityChange,
  onGuideOpacityChange,
  onLoadFaceModel,
  onPlaceFacePointsAutomatically,
  onManualPlacementChange,
  onMoveFacePointChange,
  onFacePointsVisibilityChange,
  onApplyFacePlacementFromPoints,
  onDeleteFacePoints,
  onLoadBackgroundModel,
  onRemoveBackground,
  onBackgroundChange,
  onBackgroundPointModeChange,
  onResetBackgroundPoints,
  onResetBackgroundSettings,
  onQualityChange,
  onAutoQuality,
  onResetQuality,
  onRecalculateQuality,
  onFileNamingTemplateChange,
  onSheetModeChange,
  onExportPhoto,
  onSheetExport,
  onPrintSheet,
  onZipExport,
  onSeparateExport,
}: RightInspectorProps) {
  return (
    <aside className="right-inspector" aria-label="Inspecteur">
      <div className="inspector-heading">
        <p className="eyebrow">Mode</p>
        <h2>{getAppModeLabel(mode)}</h2>
      </div>

      {mode === "crop" && (
        <div className="inspector-stack">
          <GuideSection
            photo={photo}
            onGuideVisibilityChange={onGuideVisibilityChange}
            onGuideOpacityChange={onGuideOpacityChange}
          />
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
        </div>
      )}

      {mode === "background" && (
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
      )}

      {mode === "quality" && (
        <QualityPanel
          photo={photo}
          onQualityChange={onQualityChange}
          onAutoQuality={onAutoQuality}
          onResetQuality={onResetQuality}
          onRecalculateQuality={onRecalculateQuality}
        />
      )}

      {mode === "sheet" && (
        <SheetInspector
          photoCount={photoCount}
          sheetMode={sheetMode}
          composition={composition}
          onSheetModeChange={onSheetModeChange}
          onSheetExport={onSheetExport}
          onPrintSheet={onPrintSheet}
        />
      )}

      {mode === "export" && (
        <div className="inspector-stack">
          <button type="button" onClick={onExportPhoto} disabled={!photo}>
            Export JPEG
          </button>
          <ExportPanel
            photoCount={photoCount}
            fileNamingTemplate={fileNamingTemplate}
            sheetMode={sheetMode}
            composition={composition}
            onFileNamingTemplateChange={onFileNamingTemplateChange}
            onSheetModeChange={onSheetModeChange}
            onSheetExport={onSheetExport}
            onPrintSheet={onPrintSheet}
            onZipExport={onZipExport}
            onSeparateExport={onSeparateExport}
          />
        </div>
      )}
    </aside>
  );
}

function GuideSection({
  photo,
  onGuideVisibilityChange,
  onGuideOpacityChange,
}: {
  photo: PhotoItem | null;
  onGuideVisibilityChange: (showGuide: boolean) => void;
  onGuideOpacityChange: (opacity: number) => void;
}) {
  const editState = photo?.editState;

  return (
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
        Gabarit base sur les recommandations francaises : visage 32-36 mm du menton au
        sommet du crane, hors cheveux.
      </p>
    </fieldset>
  );
}

function SheetInspector({
  photoCount,
  sheetMode,
  composition,
  onSheetModeChange,
  onSheetExport,
  onPrintSheet,
}: {
  photoCount: number;
  sheetMode: PrintLayoutMode;
  composition: SheetComposition;
  onSheetModeChange: (mode: PrintLayoutMode) => void;
  onSheetExport: () => void;
  onPrintSheet: () => void;
}) {
  const hasPhotos = photoCount > 0;

  return (
    <form className="controls export-panel" onSubmit={(event) => event.preventDefault()}>
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
                onChange={() => onSheetModeChange(mode)}
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
        Total demande : {composition.requestedCount} / {composition.capacity} places.
      </p>
      {composition.isLimited && (
        <p className="warning" role="alert">
          Le total depasse la capacite. L'export sera limite aux {composition.capacity} premieres
          photos.
        </p>
      )}
      <p className="print-note">
        Impression a 100 %, sans ajustement a la page. Verifiez la regle 10 cm en bas.
      </p>
      <div className="button-row">
        <button type="button" onClick={onSheetExport} disabled={!hasPhotos}>
          Export planche A4
        </button>
        <button type="button" onClick={onPrintSheet} disabled={!hasPhotos}>
          Imprimer A4
        </button>
      </div>
    </form>
  );
}
