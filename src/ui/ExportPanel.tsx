import {
  FILE_NAMING_TEMPLATES,
  FileNamingTemplateId,
} from "../core/file-naming";
import { PRINT_LAYOUTS, PrintLayoutMode } from "../core/print-layout";
import { SheetComposition } from "../core/sheet-items";
import { ButtonIcon } from "./icons";

type ExportPanelProps = {
  photoCount: number;
  fileNamingTemplate: FileNamingTemplateId;
  sheetMode: PrintLayoutMode;
  composition: SheetComposition;
  onFileNamingTemplateChange: (templateId: FileNamingTemplateId) => void;
  onSheetModeChange: (mode: PrintLayoutMode) => void;
  onSheetExport: () => void;
  onPrintSheet: () => void;
  onZipExport: () => void;
  onSeparateExport: () => void;
};

export function ExportPanel({
  photoCount,
  fileNamingTemplate,
  sheetMode,
  composition,
  onFileNamingTemplateChange,
  onSheetModeChange,
  onSheetExport,
  onPrintSheet,
  onZipExport,
  onSeparateExport,
}: ExportPanelProps) {
  const hasPhotos = photoCount > 0;

  return (
    <form className="controls export-panel" onSubmit={(event) => event.preventDefault()}>
      <fieldset className="mode-control">
        <legend>Nommage exports</legend>
        <label className="select-control">
          <span>Modèle</span>
          <select
            aria-label="Modèle de nommage"
            value={fileNamingTemplate}
            onChange={(event) =>
              onFileNamingTemplateChange(event.currentTarget.value as FileNamingTemplateId)
            }
          >
            {Object.entries(FILE_NAMING_TEMPLATES).map(([templateId, template]) => (
              <option key={templateId} value={templateId}>
                {template.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

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
          Le total dépasse la capacité. L'export sera limité aux{" "}
          {composition.capacity} premières photos.
        </p>
      )}

      <p className="print-note">
        Impression à 100 %, sans ajustement à la page. Vérifiez la règle 10 cm
        en bas de la planche.
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

      <button
        type="button"
        className="button-with-icon"
        onClick={onZipExport}
        disabled={!hasPhotos}
      >
        <ButtonIcon name="zip" />
        Exporter toutes les photos en ZIP
      </button>
      <button
        type="button"
        className="secondary-button button-with-icon"
        onClick={onSeparateExport}
        disabled={!hasPhotos}
      >
        <ButtonIcon name="download" />
        Télécharger séparément
      </button>
    </form>
  );
}
