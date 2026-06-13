import { PhotoItem, PhotoUsage } from "../core/photo-project";

const PHOTO_USAGE_LABELS: Record<PhotoUsage, string> = {
  college: "College",
  sport: "Sport",
  badge: "Badge",
  autre: "Autre",
};

type PhotoListProps = {
  photos: PhotoItem[];
  activePhotoId: string | null;
  sheetCapacity: number;
  fileNamesByPhotoId: Map<string, string>;
  onSelectPhoto: (photoId: string) => void;
  onDisplayNameChange: (photoId: string, displayName: string) => void;
  onFirstNameChange: (photoId: string, firstName: string) => void;
  onLastNameChange: (photoId: string, lastName: string) => void;
  onUsageChange: (photoId: string, usage: PhotoUsage | "") => void;
  onGenerateDisplayName: (photoId: string) => void;
  onCopiesChange: (photoId: string, copies: number) => void;
  onRemovePhoto: (photoId: string) => void;
};

export function PhotoList({
  photos,
  activePhotoId,
  sheetCapacity,
  fileNamesByPhotoId,
  onSelectPhoto,
  onDisplayNameChange,
  onFirstNameChange,
  onLastNameChange,
  onUsageChange,
  onGenerateDisplayName,
  onCopiesChange,
  onRemovePhoto,
}: PhotoListProps) {
  return (
    <aside className="photo-list-panel" aria-labelledby="photo-list-title">
      <h2 id="photo-list-title">Photos importees</h2>
      {photos.length === 0 ? (
        <p className="empty-list">Aucune photo importee.</p>
      ) : (
        <ol className="photo-list">
          {photos.map((photo, index) => {
            const isActive = photo.id === activePhotoId;

            return (
              <li key={photo.id} className={isActive ? "photo-list-item is-active" : "photo-list-item"}>
                <button
                  type="button"
                  className="photo-select-button"
                  onClick={() => onSelectPhoto(photo.id)}
                  aria-pressed={isActive}
                  aria-label={`Choisir ${photo.originalFileName}`}
                >
                  <span>{index + 1}</span>
                  <strong>{photo.displayName}</strong>
                  <small>{photo.originalFileName}</small>
                </button>

                <label className="compact-control">
                  <span>Nom affiche</span>
                  <input
                    aria-label={`Nom affiche ${photo.originalFileName}`}
                    type="text"
                    value={photo.displayName}
                    onChange={(event) =>
                      onDisplayNameChange(photo.id, event.currentTarget.value)
                    }
                  />
                </label>

                <div className="name-fields">
                  <label className="compact-control">
                    <span>Prenom</span>
                    <input
                      aria-label={`Prenom ${photo.originalFileName}`}
                      type="text"
                      value={photo.firstName ?? ""}
                      onChange={(event) =>
                        onFirstNameChange(photo.id, event.currentTarget.value)
                      }
                    />
                  </label>

                  <label className="compact-control">
                    <span>Nom</span>
                    <input
                      aria-label={`Nom ${photo.originalFileName}`}
                      type="text"
                      value={photo.lastName ?? ""}
                      onChange={(event) =>
                        onLastNameChange(photo.id, event.currentTarget.value)
                      }
                    />
                  </label>
                </div>

                <label className="compact-control">
                  <span>Usage</span>
                  <select
                    aria-label={`Usage ${photo.originalFileName}`}
                    value={photo.usage ?? ""}
                    onChange={(event) =>
                      onUsageChange(photo.id, event.currentTarget.value as PhotoUsage | "")
                    }
                  >
                    <option value="">Non renseigne</option>
                    {Object.entries(PHOTO_USAGE_LABELS).map(([usage, label]) => (
                      <option key={usage} value={usage}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => onGenerateDisplayName(photo.id)}
                  disabled={!photo.firstName?.trim() && !photo.lastName?.trim()}
                >
                  Generer nom affiche
                </button>

                <p className="generated-name">
                  Fichier : {fileNamesByPhotoId.get(photo.id) ?? "photo_identite.jpg"}
                </p>

                <label className="compact-control">
                  <span>Copies</span>
                  <input
                    aria-label={`Copies ${photo.originalFileName}`}
                    type="number"
                    min="1"
                    max={sheetCapacity}
                    step="1"
                    value={photo.sheetCopies}
                    onChange={(event) =>
                      onCopiesChange(photo.id, event.currentTarget.valueAsNumber)
                    }
                  />
                </label>

                <button
                  type="button"
                  className="remove-button"
                  onClick={() => onRemovePhoto(photo.id)}
                  aria-label={`Supprimer ${photo.originalFileName}`}
                >
                  Supprimer
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
