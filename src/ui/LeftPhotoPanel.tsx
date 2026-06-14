import { ChangeEvent } from "react";
import { FileNamingTemplateId, buildUniquePhotoFileNames } from "../core/file-naming";
import { PhotoItem, PhotoUsage } from "../core/photo-project";
import { ImageImportError } from "../io/import-images";
import { ButtonIcon } from "./icons";
import { PhotoList } from "./PhotoList";

type LeftPhotoPanelProps = {
  photos: PhotoItem[];
  activePhotoId: string | null;
  sheetCapacity: number;
  fileNamingTemplate: FileNamingTemplateId;
  error: string;
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
  const importStatus =
    photos.length === 0
      ? "Aucune photo importée."
      : photos.length === 1
        ? "1 image importée."
        : `${photos.length} images importées.`;

  return (
    <aside className="left-photo-panel" aria-label="Photos et import">
      <div className="left-import-area">
        <label className="left-import-button">
          <ButtonIcon name="upload" />
          <span>Importer</span>
          <input
            aria-label="Importer depuis le volet gauche"
            type="file"
            accept="image/*"
            multiple
            onChange={onFileChange}
          />
        </label>
        <p className="left-import-status">{importStatus}</p>
        {error && <p className="error" role="alert">{error}</p>}
        {importErrors.length > 0 && (
          <ul className="import-errors" aria-label="Fichiers ignorés">
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
