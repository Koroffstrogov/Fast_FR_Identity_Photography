import { useEffect, useState } from "react";
import { PhotoItem, PhotoUsage } from "../core/photo-project";
import { PhotoThumbnail } from "./PhotoThumbnail";

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
  const [expandedPhotoIds, setExpandedPhotoIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!activePhotoId) {
      return;
    }

    setExpandedPhotoIds((currentIds) => {
      if (currentIds.has(activePhotoId)) {
        return currentIds;
      }

      const nextIds = new Set(currentIds);
      nextIds.add(activePhotoId);
      return nextIds;
    });
  }, [activePhotoId]);

  function toggleExpanded(photoId: string) {
    setExpandedPhotoIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(photoId)) {
        nextIds.delete(photoId);
      } else {
        nextIds.add(photoId);
      }

      return nextIds;
    });
  }

  return (
    <aside className="photo-list-panel" aria-labelledby="photo-list-title">
      <h2 id="photo-list-title">Photos importees</h2>
      {photos.length === 0 ? (
        <p className="empty-list">Aucune photo importee.</p>
      ) : (
        <ol className="photo-list">
          {photos.map((photo, index) => {
            const isActive = photo.id === activePhotoId;
            const isExpanded = expandedPhotoIds.has(photo.id);

            return (
              <li
                key={photo.id}
                className={[
                  "photo-list-item",
                  isActive ? "is-active" : "",
                  isExpanded ? "is-expanded" : "is-collapsed",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="photo-list-summary">
                  <PhotoThumbnail photo={photo} />
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

                  <label className="compact-control copies-control">
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
                    className="secondary-button photo-toggle-button"
                    onClick={() => toggleExpanded(photo.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`photo-details-${photo.id}`}
                  >
                    {isExpanded ? "Replier" : "Ouvrir"}
                  </button>

                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => onRemovePhoto(photo.id)}
                    aria-label={`Supprimer ${photo.originalFileName}`}
                  >
                    Supprimer
                  </button>
                </div>

                {isExpanded && (
                  <div className="photo-list-details" id={`photo-details-${photo.id}`}>
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
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
