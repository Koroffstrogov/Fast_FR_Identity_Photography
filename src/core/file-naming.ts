import { PhotoItem, PhotoUsage } from "./photo-project";

export const FILE_NAMING_TEMPLATES = {
  lastFirstIdentity: {
    label: "nom_prenom_photo-identite.jpg",
    pattern: "{nom}_{prenom}_photo-identite.jpg",
  },
  firstLastUsage: {
    label: "prenom_nom_usage.jpg",
    pattern: "{prenom}_{nom}_{usage}.jpg",
  },
  lastFirstUsageDate: {
    label: "nom_prenom_usage_date.jpg",
    pattern: "{nom}_{prenom}_{usage}_{date}.jpg",
  },
  displayNameIdentity: {
    label: "nom-affiche_photo-identite.jpg",
    pattern: "{displayName}_photo-identite.jpg",
  },
} as const;

export type FileNamingTemplateId = keyof typeof FILE_NAMING_TEMPLATES;

export type FileNamingData = {
  displayName: string;
  firstName?: string;
  lastName?: string;
  usage?: PhotoUsage;
};

export type FileNamingOptions = {
  date?: Date;
};

export function buildDisplayNameFromPersonName(data: {
  firstName?: string;
  lastName?: string;
}): string {
  return [data.firstName, data.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export function buildFileName(
  data: FileNamingData,
  templateId: FileNamingTemplateId,
  options: FileNamingOptions = {},
): string {
  const pattern = FILE_NAMING_TEMPLATES[templateId].pattern;
  const renderedName = pattern
    .replaceAll("{nom}", data.lastName ?? "")
    .replaceAll("{prenom}", data.firstName ?? "")
    .replaceAll("{usage}", data.usage ?? "")
    .replaceAll("{displayName}", data.displayName)
    .replaceAll("{date}", formatDateForFileName(options.date ?? new Date()));
  const baseName = stripJpegExtension(renderedName);

  return `${normalizeFileNameBase(baseName)}.jpg`;
}

export function buildUniqueFileNames(
  items: FileNamingData[],
  templateId: FileNamingTemplateId,
  options: FileNamingOptions = {},
): string[] {
  return makeUniqueFileNames(
    items.map((item) => buildFileName(item, templateId, options)),
  );
}

export function buildUniquePhotoFileNames<TImage>(
  items: PhotoItem<TImage>[],
  templateId: FileNamingTemplateId,
  options: FileNamingOptions = {},
): Map<string, string> {
  const fileNames = buildUniqueFileNames(items, templateId, options);

  return new Map(items.map((item, index) => [item.id, fileNames[index]]));
}

export function makeUniqueFileNames(fileNames: string[]): string[] {
  const usedNames = new Map<string, number>();

  return fileNames.map((fileName) => {
    const normalizedName = ensureJpegExtension(fileName);
    const baseName = stripJpegExtension(normalizedName);
    const nextIndex = usedNames.get(baseName) ?? 0;

    usedNames.set(baseName, nextIndex + 1);

    if (nextIndex === 0) {
      return normalizedName;
    }

    return `${baseName}_${nextIndex + 1}.jpg`;
  });
}

export function normalizeFileNameBase(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "photo_identite";
}

export function formatDateForFileName(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function buildSheetFileName(date = new Date()): string {
  return `planche_a4_photos_identite_${formatDateForFileName(date)}.jpg`;
}

export function buildZipFileName(date = new Date()): string {
  return `photos_identite_${formatDateForFileName(date)}.zip`;
}

function stripJpegExtension(fileName: string): string {
  return fileName.replace(/\.jpe?g$/i, "");
}

function ensureJpegExtension(fileName: string): string {
  const baseName = stripJpegExtension(fileName);

  return `${normalizeFileNameBase(baseName)}.jpg`;
}
