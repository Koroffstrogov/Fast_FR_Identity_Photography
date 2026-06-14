import { PhotoItem } from "../core/photo-project";

type FaceGuideLevel = "hidden" | "subtle" | "strong";

type FaceGuideControlProps = {
  photo: PhotoItem | null;
  onGuideVisibilityChange: (showGuide: boolean) => void;
  onGuideOpacityChange: (opacity: number) => void;
};

const FACE_GUIDE_LEVELS: Record<FaceGuideLevel, { label: string; opacity: number }> = {
  hidden: { label: "Masque", opacity: 0 },
  subtle: { label: "Discret", opacity: 0.45 },
  strong: { label: "Renforce", opacity: 0.82 },
};

export function FaceGuideControl({
  photo,
  onGuideVisibilityChange,
  onGuideOpacityChange,
}: FaceGuideControlProps) {
  const editState = photo?.editState;
  const selectedLevel = getSelectedGuideLevel(
    editState?.showFaceGuide ?? true,
    editState?.faceGuideOpacity ?? FACE_GUIDE_LEVELS.strong.opacity,
  );

  function handleLevelChange(level: FaceGuideLevel) {
    const nextLevel = FACE_GUIDE_LEVELS[level];

    onGuideVisibilityChange(level !== "hidden");
    onGuideOpacityChange(nextLevel.opacity);
  }

  return (
    <fieldset className="guide-control">
      <legend>Guide visage</legend>
      <div className="segmented-options guide-level-options">
        {(Object.keys(FACE_GUIDE_LEVELS) as FaceGuideLevel[]).map((level) => (
          <label key={level}>
            <input
              type="radio"
              name="face-guide-level"
              value={level}
              checked={selectedLevel === level}
              onChange={() => handleLevelChange(level)}
              disabled={!photo}
              aria-label={`Guide visage ${FACE_GUIDE_LEVELS[level].label}`}
            />
            <span>{FACE_GUIDE_LEVELS[level].label}</span>
          </label>
        ))}
      </div>
      <p className="guide-note">
        Gabarit base sur les recommandations francaises : visage 32-36 mm du
        menton au sommet du crane, hors cheveux.
      </p>
    </fieldset>
  );
}

function getSelectedGuideLevel(showGuide: boolean, opacity: number): FaceGuideLevel {
  if (!showGuide) {
    return "hidden";
  }

  return opacity <= 0.55 ? "subtle" : "strong";
}
