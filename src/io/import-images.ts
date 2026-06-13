import { createPhotoItem, PhotoItem } from "../core/photo-project";
import { loadImageFile } from "./load-image-file";

export type ImageImportError = {
  fileName: string;
  message: string;
};

export type ImageImportResult = {
  photos: PhotoItem[];
  errors: ImageImportError[];
};

export type ImageLoader = (file: File) => Promise<HTMLImageElement>;

export async function importImageFiles(
  files: File[],
  createId: () => string,
  loadImage: ImageLoader = loadImageFile,
): Promise<ImageImportResult> {
  const photos: PhotoItem[] = [];
  const errors: ImageImportError[] = [];

  for (const file of files) {
    try {
      const image = await loadImage(file);

      photos.push(
        createPhotoItem({
          id: createId(),
          originalFileName: file.name,
          image,
        }),
      );
    } catch (error) {
      errors.push({
        fileName: file.name,
        message: error instanceof Error ? error.message : "Image illisible.",
      });
    }
  }

  return {
    photos,
    errors,
  };
}

export function formatImportSummary(result: ImageImportResult): string {
  const importedCount = result.photos.length;
  const ignoredCount = result.errors.length;

  if (importedCount === 0 && ignoredCount === 0) {
    return "";
  }

  if (ignoredCount === 0) {
    return `${importedCount} image${importedCount > 1 ? "s" : ""} importee${importedCount > 1 ? "s" : ""}.`;
  }

  return `${importedCount} image${importedCount > 1 ? "s" : ""} importee${importedCount > 1 ? "s" : ""}, ${ignoredCount} fichier${ignoredCount > 1 ? "s" : ""} ignore${ignoredCount > 1 ? "s" : ""}.`;
}
