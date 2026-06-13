import { PhotoItem } from "../core/photo-project";

type PhotoListProps = {
  photos: PhotoItem[];
  activePhotoId: string | null;
  sheetCapacity: number;
  onSelectPhoto: (photoId: string) => void;
  onDisplayNameChange: (photoId: string, displayName: string) => void;
  onCopiesChange: (photoId: string, copies: number) => void;
  onRemovePhoto: (photoId: string) => void;
};

export function PhotoList({
  photos,
  activePhotoId,
  sheetCapacity,
  onSelectPhoto,
  onDisplayNameChange,
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
