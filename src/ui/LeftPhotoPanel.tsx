import { ChangeEvent } from "react";
import { FileNamingTemplateId, buildUniquePhotoFileNames } from "../core/file-naming";
import { PhotoItem, PhotoUsage } from "../core/photo-project";
import { ImageImportError } from "../io/import-images";
import { PhotoList } from "./PhotoList";

type LeftPhotoPanelProps = {
  photos: PhotoItem[];
  activePhotoId: string | null;
  sheetCapacity: number;
  fileNamingTemplate: FileNamingTemplateId;
  error: string;
  importSummary: string;
  importErrors: ImageImportError[];
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectPhoto: (photoId: string) => void;
  onDisplayNameChange: (photoId: string, displayName: string) => void;
  onFirstNameChange: (photoId: string, firstName: string) => void;
  onLastNameChange: (photoId: string, lastName: string) => void;
  onUsageChange: (photoId: string, usage: PhotoUsage | "") => void;
  onGenerateDisplayName: (photoId: string) => void;
  onCopiesChange: (photoId: string, copies: number) => void;
  onRemovePhoto: (photoId: string) => void;
};

export function LeftPhotoPanel({
  photos,
  activePhotoId,
  sheetCapacity,
  fileNamingTemplate,
  error,
  importSummary,
  importErrors,
  onFileChange,
  onSelectPhoto,
  onDisplayNameChange,
  onFirstNameChange,
  onLastNameChange,
  onUsageChange,
  onGenerateDisplayName,
  onCopiesChange,
  onRemovePhoto,
}: LeftPhotoPanelProps) {
  const fileNamesByPhotoId = buildUniquePhotoFileNames(photos, fileNamingTemplate);

  return (
    <aside className="left-photo-panel" aria-label="Photos et import">
      <div className="left-import-area">
        <label className="file-control import-control">
          <span>Images locales</span>
          <input type="file" accept="image/*" multiple onChange={onFileChange} />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        {importSummary && <p className="import-summary">{importSummary}</p>}
        {importErrors.length > 0 && (
          <ul className="import-errors" aria-label="Fichiers ignores">
            {importErrors.map((importError) => (
              <li key={`${importError.fileName}-${importError.message}`}>
                {importError.fileName} : {importError.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <PhotoList
        photos={photos}
        activePhotoId={activePhotoId}
        sheetCapacity={sheetCapacity}
        fileNamesByPhotoId={fileNamesByPhotoId}
        onSelectPhoto={onSelectPhoto}
        onDisplayNameChange={onDisplayNameChange}
        onFirstNameChange={onFirstNameChange}
        onLastNameChange={onLastNameChange}
        onUsageChange={onUsageChange}
        onGenerateDisplayName={onGenerateDisplayName}
        onCopiesChange={onCopiesChange}
        onRemovePhoto={onRemovePhoto}
      />
    </aside>
  );
}
