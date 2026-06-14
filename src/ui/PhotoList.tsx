import { PhotoItem, PhotoUsage } from "../core/photo-project";
import { ButtonIcon } from "./icons";
import { PhotoThumbnail } from "./PhotoThumbnail";

const PHOTO_USAGE_LABELS: Record<PhotoUsage, string> = {
  college: "Collège",
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
  const activePhoto = photos.find((photo) => photo.id === activePhotoId) ?? null;

  return (
    <aside className="photo-list-panel" aria-labelledby="photo-list-title">
      <div className="photo-list-header">
        <h2 id="photo-list-title">Photos importées</h2>
      </div>

      {photos.length === 0 ? (
        <p className="empty-list">Aucune photo importée.</p>
      ) : (
        <ol className="photo-list" aria-label="Photos importées">
          {photos.map((photo) => {
            const isActive = photo.id === activePhotoId;

            return (
              <li
                key={photo.id}
                className={[
                  "photo-list-item",
                  "is-compact",
                  isActive ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className="photo-card-button"
                  onClick={() => onSelectPhoto(photo.id)}
                  aria-pressed={isActive}
                  aria-label={`Choisir ${photo.originalFileName}`}
                >
                  <PhotoThumbnail photo={photo} />
                  <span className="photo-card-text">
                    <strong>{photo.displayName}</strong>
                    <small>{photo.originalFileName}</small>
                  </span>
                </button>

                <label className="copies-compact-control">
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
                  className="photo-remove-button button-with-icon"
                  onClick={() => onRemovePhoto(photo.id)}
                  aria-label={`Supprimer ${photo.originalFileName}`}
                >
                  <ButtonIcon name="trash" />
                  Suppr.
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {activePhoto && (
        <section
          className="active-photo-details"
          aria-labelledby="active-photo-details-title"
        >
          <h3 id="active-photo-details-title">Détails photo active</h3>

          <label className="compact-control">
            <span>Nom affiché</span>
            <input
              aria-label={`Nom affiché ${activePhoto.originalFileName}`}
              type="text"
              value={activePhoto.displayName}
              onChange={(event) =>
                onDisplayNameChange(activePhoto.id, event.currentTarget.value)
              }
            />
          </label>

          <div className="name-fields">
            <label className="compact-control">
              <span>Prénom</span>
              <input
                aria-label={`Prénom ${activePhoto.originalFileName}`}
                type="text"
                value={activePhoto.firstName ?? ""}
                onChange={(event) =>
                  onFirstNameChange(activePhoto.id, event.currentTarget.value)
                }
              />
            </label>

            <label className="compact-control">
              <span>Nom</span>
              <input
                aria-label={`Nom ${activePhoto.originalFileName}`}
                type="text"
                value={activePhoto.lastName ?? ""}
                onChange={(event) =>
                  onLastNameChange(activePhoto.id, event.currentTarget.value)
                }
              />
            </label>
          </div>

          <label className="compact-control">
            <span>Usage</span>
            <select
              aria-label={`Usage ${activePhoto.originalFileName}`}
              value={activePhoto.usage ?? ""}
              onChange={(event) =>
                onUsageChange(
                  activePhoto.id,
                  event.currentTarget.value as PhotoUsage | "",
                )
              }
            >
              <option value="">Non renseigné</option>
              {Object.entries(PHOTO_USAGE_LABELS).map(([usage, label]) => (
                <option key={usage} value={usage}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="secondary-button compact-button button-with-icon"
            onClick={() => onGenerateDisplayName(activePhoto.id)}
            disabled={!activePhoto.firstName?.trim() && !activePhoto.lastName?.trim()}
          >
            <ButtonIcon name="sparkles" />
            Générer nom affiché
          </button>

          <p className="generated-name">
            Fichier : {fileNamesByPhotoId.get(activePhoto.id) ?? "photo_identite.jpg"}
          </p>
        </section>
      )}
    </aside>
  );
}
