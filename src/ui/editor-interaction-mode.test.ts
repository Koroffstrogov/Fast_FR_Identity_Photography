import { describe, expect, it } from "vitest";
import {
  EDITOR_INTERACTION_MODE_LABELS,
  EDITOR_INTERACTION_MODE_MESSAGES,
  canUseEditorInteractionMode,
  getFacePointPlacementMessage,
  getInteractionModeFromLegacyPointEditMode,
  getLegacyPointEditMode,
  getNextFacePointStepLabel,
} from "./editor-interaction-mode";
import { createPhotoItem } from "../core/photo-project";

describe("editor interaction mode", () => {
  it("exposes user-facing labels and workspace messages", () => {
    expect(EDITOR_INTERACTION_MODE_LABELS["move-photo"]).toBe("Déplacer photo");
    expect(EDITOR_INTERACTION_MODE_LABELS["place-face-points"]).toBe("Placer points");
    expect(EDITOR_INTERACTION_MODE_LABELS["move-face-points"]).toBe("Déplacer points");
    expect(EDITOR_INTERACTION_MODE_MESSAGES["move-face-points"]).toContain(
      "Échap",
    );
  });

  it("maps legacy face point edit modes", () => {
    expect(getLegacyPointEditMode("move-photo")).toBe("none");
    expect(getLegacyPointEditMode("place-face-points")).toBe("place");
    expect(getLegacyPointEditMode("move-face-points")).toBe("move");
    expect(getInteractionModeFromLegacyPointEditMode("place")).toBe(
      "place-face-points",
    );
    expect(getInteractionModeFromLegacyPointEditMode("move")).toBe(
      "move-face-points",
    );
    expect(getInteractionModeFromLegacyPointEditMode("none")).toBe("move-photo");
  });

  it("requires visible face points before moving points", () => {
    const image = { naturalWidth: 1000, naturalHeight: 1000 } as HTMLImageElement;
    const photo = createPhotoItem({ id: "photo-1", originalFileName: "a.png", image });

    expect(canUseEditorInteractionMode("move-face-points", photo)).toBe(false);

    const withHiddenPoint = {
      ...photo,
      faceDetection: {
        ...photo.faceDetection!,
        showFacePoints: false,
        manualPoints: [{ kind: "chin" as const, xPx: 10, yPx: 20 }],
      },
    };
    const withVisiblePoint = {
      ...withHiddenPoint,
      faceDetection: {
        ...withHiddenPoint.faceDetection,
        showFacePoints: true,
      },
    };

    expect(canUseEditorInteractionMode("move-face-points", withHiddenPoint)).toBe(false);
    expect(canUseEditorInteractionMode("move-face-points", withVisiblePoint)).toBe(true);
  });

  it("describes the next face point placement step", () => {
    expect(getNextFacePointStepLabel("leftEye")).toContain("œil gauche");
    expect(getNextFacePointStepLabel("rightEye")).toContain("œil droit");
    expect(getNextFacePointStepLabel("chin")).toContain("menton");
    expect(getNextFacePointStepLabel("skullTop")).toContain("sommet");
  });

  it("formats the reset placement message from an empty point list", () => {
    expect(getFacePointPlacementMessage([])).toBe(
      "0/4 point(s) visage placé(s). Prochain point : œil gauche.",
    );
  });
});
