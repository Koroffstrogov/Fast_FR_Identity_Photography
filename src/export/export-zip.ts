import JSZip from "jszip";
import { IndividualPhotoExport, downloadBlob } from "./export-batch";

export const BATCH_EXPORT_PRIMARY_ACTION = "zip" as const;
export type BatchExportPrimaryAction = typeof BATCH_EXPORT_PRIMARY_ACTION;

export async function createPhotosZip(exports: IndividualPhotoExport[]): Promise<Blob> {
  const zip = new JSZip();

  for (const photoExport of exports) {
    zip.file(photoExport.fileName, photoExport.blob);
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadZip(blob: Blob, fileName: string): void {
  downloadBlob(blob, fileName);
}
