import { renderPhotoToCanvas } from "../canvas/render-photo";
import { FileNamingTemplateId, buildUniquePhotoFileNames } from "../core/file-naming";
import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";

export type IndividualPhotoExport = {
  photoId: string;
  fileName: string;
  blob: Blob;
};

export type PhotoExportJob = {
  photoId: string;
  fileName: string;
};

export function buildIndividualExportJobs(
  photos: PhotoItem<unknown>[],
  templateId: FileNamingTemplateId,
  date = new Date(),
): PhotoExportJob[] {
  const fileNamesById = buildUniquePhotoFileNames(photos, templateId, { date });

  return photos.map((photo) => ({
    photoId: photo.id,
    fileName: fileNamesById.get(photo.id) ?? "photo_identite.jpg",
  }));
}

export async function exportIndividualPhotoBlobs(
  photos: PhotoItem[],
  templateId: FileNamingTemplateId,
  date = new Date(),
): Promise<IndividualPhotoExport[]> {
  const jobs = buildIndividualExportJobs(photos, templateId, date);

  return Promise.all(
    photos.map(async (photo, index) => ({
      photoId: photo.id,
      fileName: jobs[index].fileName,
      blob: await renderPhotoToJpegBlob(photo),
    })),
  );
}

export function downloadPhotoExports(exports: IndividualPhotoExport[]): void {
  for (const photoExport of exports) {
    downloadBlob(photoExport.blob, photoExport.fileName);
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function renderPhotoToJpegBlob(photo: PhotoItem): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderPhotoToCanvas(canvas, photo.image, photo.editState.transform);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Impossible de generer le JPEG."));
          return;
        }

        resolve(blob);
      },
      PHOTO_FORMAT.mimeType,
      0.92,
    );
  });
}
