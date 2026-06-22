import { FileNamingTemplateId } from "../core/file-naming";
import { PhotoItem } from "../core/photo-project";
import { PRINT_LAYOUTS, PrintLayoutMode } from "../core/print-layout";
import { SheetComposition } from "../core/sheet-items";
import { QualityEditState } from "../quality/quality-state";
import { BackgroundRemovalStatus } from "../background/background-removal";
import type { FaceLandmarkerModelStatus } from "../vision/face-landmarker";
import { BackgroundPanel } from "./BackgroundPanel";
import { ExportPanel } from "./ExportPanel";
import { FaceDetectionPanel } from "./FaceDetectionPanel";
import { FaceGuideControl } from "./FaceGuideControl";
import { ButtonIcon } from "./icons";
import { QualityPanel } from "./QualityPanel";
import { AppMode, getAppModeLabel } from "./app-mode";
import { EditorInteractionMode } from "./editor-interaction-mode";

type RightInspectorProps = {
  mode: AppMode;
  photo: PhotoItem | null;
  photoCount: number;
  fileNamingTemplate: FileNamingTemplateId;
  sheetMode: PrintLayoutMode;
  composition: SheetComposition;
  faceModelStatus: FaceLandmarkerModelStatus;
  faceModelError: string;
  editorInteractionMode: EditorInteractionMode;
  backgroundRemovalStatus: BackgroundRemovalStatus;
  backgroundRemovalError: string;
  onGuideVisibilityChange: (showGuide: boolean) => void;
  onGuideOpacityChange: (opacity: number) => void;
  onLoadFaceModel: () => void;
  onPlaceFacePointsAutomatically: () => void;
  onEditorInteractionModeChange: (
    mode: EditorInteractionMode,
    options?: { resetFacePoints?: boolean },
  ) => void;
  onFacePointsVisibilityChange: (showFacePoints: boolean) => void;
  onApplyFacePlacementFromPoints: () => void;
  onDeleteFacePoints: () => void;
  onLoadBackgroundModel: () => void;
  onDiagnoseBackgroundSession: () => void;
  onRemoveBackground: () => void;
  onBackgroundChange: (partialEdit: Partial<NonNullable<PhotoItem["backgroundEdit"]>>) => void;
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
  onModeChange: (mode: AppMode) => void;
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
  editorInteractionMode,
  backgroundRemovalStatus,
  backgroundRemovalError,
  onGuideVisibilityChange,
  onGuideOpacityChange,
  onLoadFaceModel,
  onPlaceFacePointsAutomatically,
  onEditorInteractionModeChange,
  onFacePointsVisibilityChange,
  onApplyFacePlacementFromPoints,
  onDeleteFacePoints,
  onLoadBackgroundModel,
  onDiagnoseBackgroundSession,
  onRemoveBackground,
  onBackgroundChange,
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
  onModeChange,
}: RightInspectorProps) {
  return (
    <aside className="right-inspector" aria-label="Inspecteur">
      <div className="right-inspector-content">
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
              interactionMode={editorInteractionMode}
              onLoadModel={onLoadFaceModel}
              onPlaceFacePointsAutomatically={onPlaceFacePointsAutomatically}
              onInteractionModeChange={onEditorInteractionModeChange}
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
            onLoadModel={onLoadBackgroundModel}
            onDiagnoseSession={onDiagnoseBackgroundSession}
            onRemoveBackground={onRemoveBackground}
            onBackgroundChange={onBackgroundChange}
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
            <button
              type="button"
              className="button-with-icon"
              onClick={onExportPhoto}
              disabled={!photo}
            >
              <ButtonIcon name="download" />
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
      </div>

      <InspectorNextAction
        mode={mode}
        hasPhoto={Boolean(photo)}
        photoCount={photoCount}
        onModeChange={onModeChange}
      />
    </aside>
  );
}

function InspectorNextAction({
  mode,
  hasPhoto,
  photoCount,
  onModeChange,
}: {
  mode: AppMode;
  hasPhoto: boolean;
  photoCount: number;
  onModeChange: (mode: AppMode) => void;
}) {
  const nextMode = getNextMode(mode);

  if (!nextMode) {
    return null;
  }

  const disabled = mode === "sheet" ? photoCount === 0 : !hasPhoto;

  return (
    <div className="inspector-next-action">
      <button
        type="button"
        className="next-mode-button button-with-icon"
        onClick={() => onModeChange(nextMode)}
        disabled={disabled}
      >
        <span>Suivant : {getAppModeLabel(nextMode)}</span>
        <ButtonIcon name="arrowRight" />
      </button>
    </div>
  );
}

function getNextMode(mode: AppMode): AppMode | null {
  switch (mode) {
    case "crop":
      return "background";
    case "background":
      return "quality";
    case "quality":
      return "sheet";
    case "sheet":
      return "export";
    case "export":
      return null;
  }
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
  return (
    <FaceGuideControl
      photo={photo}
      onGuideVisibilityChange={onGuideVisibilityChange}
      onGuideOpacityChange={onGuideOpacityChange}
    />
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
        Total demandé : {composition.requestedCount} / {composition.capacity} places.
      </p>
      {composition.isLimited && (
        <p className="warning" role="alert">
          Le total dépasse la capacité. L'export sera limité aux {composition.capacity} premières
          photos.
        </p>
      )}
      <p className="print-note">
        Impression à 100 %, sans ajustement à la page. Vérifiez la règle 10 cm en bas.
      </p>
      <div className="button-row">
        <button
          type="button"
          className="button-with-icon"
          onClick={onSheetExport}
          disabled={!hasPhotos}
        >
          <ButtonIcon name="image" />
          Export planche A4
        </button>
        <button
          type="button"
          className="button-with-icon"
          onClick={onPrintSheet}
          disabled={!hasPhotos}
        >
          <ButtonIcon name="print" />
          Imprimer A4
        </button>
      </div>
    </form>
  );
}
