import { BackgroundMaskData } from "../core/photo-project";

export type MaskLike = {
  width: number;
  height: number;
  getAsFloat32Array?: () => Float32Array;
  getAsUint8Array?: () => Uint8Array;
};

export type ForegroundMaskSelection = {
  mask: BackgroundMaskData;
  diagnostics: string[];
};

const FOREGROUND_LABEL_PATTERNS = ["person", "foreground", "human", "selfie"];
const BACKGROUND_LABEL_PATTERNS = ["background", "bg"];

export function createForegroundMaskFromConfidenceMasks(
  masks: readonly MaskLike[],
  labels: readonly string[],
): ForegroundMaskSelection {
  if (masks.length === 0) {
    throw new Error("Aucun masque de confiance n'a ete retourne par le modele.");
  }

  const diagnostics: string[] = [];
  const maskIndex = selectForegroundMaskIndex(labels, masks.length);

  if (labels.length === 0) {
    diagnostics.push("Le modele ne fournit pas de labels ; le premier masque est utilise.");
  }

  const mask = masks[maskIndex];

  if (!mask.getAsFloat32Array) {
    throw new Error("Le masque retourne ne peut pas etre converti en Float32Array.");
  }

  return {
    mask: {
      width: mask.width,
      height: mask.height,
      data: new Float32Array(mask.getAsFloat32Array()),
      labels: [...labels],
      source: "confidence",
    },
    diagnostics,
  };
}

export function createForegroundMaskFromCategoryMask(
  categoryMask: MaskLike,
  labels: readonly string[],
): ForegroundMaskSelection {
  if (!categoryMask.getAsUint8Array) {
    throw new Error("Le masque de categorie ne peut pas etre converti en Uint8Array.");
  }

  const categoryData = categoryMask.getAsUint8Array();
  const foregroundCategories = getForegroundCategoryIndexes(labels);

  if (foregroundCategories.length === 0) {
    throw new Error("Aucune categorie personne exploitable n'a ete trouvee dans le modele.");
  }

  const foregroundMask = new Float32Array(categoryData.length);

  for (let index = 0; index < categoryData.length; index += 1) {
    foregroundMask[index] = foregroundCategories.includes(categoryData[index]) ? 1 : 0;
  }

  return {
    mask: {
      width: categoryMask.width,
      height: categoryMask.height,
      data: foregroundMask,
      labels: [...labels],
      source: "category",
    },
    diagnostics: [],
  };
}

export function selectForegroundMaskIndex(
  labels: readonly string[],
  maskCount: number,
): number {
  if (maskCount < 1) {
    throw new Error("maskCount must be positive");
  }

  const normalizedLabels = labels.map(normalizeLabel);
  const foregroundIndex = normalizedLabels.findIndex((label) =>
    FOREGROUND_LABEL_PATTERNS.some((pattern) => label.includes(pattern)),
  );

  if (foregroundIndex >= 0 && foregroundIndex < maskCount) {
    return foregroundIndex;
  }

  const firstNonBackgroundIndex = normalizedLabels.findIndex(
    (label) =>
      !BACKGROUND_LABEL_PATTERNS.some((pattern) => label.includes(pattern)),
  );

  if (firstNonBackgroundIndex >= 0 && firstNonBackgroundIndex < maskCount) {
    return firstNonBackgroundIndex;
  }

  return maskCount === 1 ? 0 : maskCount - 1;
}

function getForegroundCategoryIndexes(labels: readonly string[]): number[] {
  return labels
    .map((label, index) => ({ label: normalizeLabel(label), index }))
    .filter(({ label }) =>
      FOREGROUND_LABEL_PATTERNS.some((pattern) => label.includes(pattern)),
    )
    .map(({ index }) => index);
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}
