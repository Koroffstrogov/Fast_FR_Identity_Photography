import { PHOTO_FORMAT } from "../core/photo-format";
import { PhotoItem } from "../core/photo-project";
import {
  A4_PRINT_PAGE,
  PrintLayoutMode,
  SheetLayout,
  SheetPhotoSlot,
  getSheetLayout,
} from "../core/print-layout";
import { buildSheetComposition } from "../core/sheet-items";
import { renderPhotoToCanvas } from "./render-photo";

export function prepareSheetCanvas(
  canvas: HTMLCanvasElement,
  mode: PrintLayoutMode,
  photoCount?: number,
): void {
  const context = prepareBaseSheet(canvas);
  const layout = getSheetLayout(mode, photoCount);

  drawPhotoPlaceholders(context, layout);
  drawControlRuler(context, layout);
}

export function renderSheetToCanvas(
  canvas: HTMLCanvasElement,
  photoCanvas: HTMLCanvasElement,
  mode: PrintLayoutMode,
  photoCount?: number,
): void {
  assertPhotoCanvasSize(photoCanvas);

  const context = prepareBaseSheet(canvas);
  const layout = getSheetLayout(mode, photoCount);

  for (const slot of layout.photoSlots) {
    context.drawImage(
      photoCanvas,
      slot.xPx,
      slot.yPx,
      slot.widthPx,
      slot.heightPx,
    );
    drawCropMarks(context, slot, layout.cropMarkLengthPx);
  }

  drawControlRuler(context, layout);
}

export function renderPhotoItemsToSheetCanvas(
  canvas: HTMLCanvasElement,
  items: PhotoItem[],
  mode: PrintLayoutMode,
): void {
  const context = prepareBaseSheet(canvas);
  const layout = getSheetLayout(mode);
  const composition = buildSheetComposition(items, mode);
  const renderedPhotos = new Map<string, HTMLCanvasElement>();

  for (const assignment of composition.slots) {
    const item = items[assignment.itemIndex];
    const slot = layout.photoSlots[assignment.sheetIndex];
    const renderedPhoto = getRenderedPhotoCanvas(item, renderedPhotos);

    context.drawImage(
      renderedPhoto,
      slot.xPx,
      slot.yPx,
      slot.widthPx,
      slot.heightPx,
    );
    drawCropMarks(context, slot, layout.cropMarkLengthPx);
  }

  drawControlRuler(context, layout);
}

function prepareBaseSheet(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = A4_PRINT_PAGE.widthPx;
  canvas.height = A4_PRINT_PAGE.heightPx;

  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  return context;
}

function drawPhotoPlaceholders(
  context: CanvasRenderingContext2D,
  layout: SheetLayout,
): void {
  context.save();
  context.strokeStyle = "#d8dee4";
  context.lineWidth = 2;
  context.setLineDash([16, 12]);

  for (const slot of layout.photoSlots) {
    context.strokeRect(slot.xPx, slot.yPx, slot.widthPx, slot.heightPx);
  }

  context.restore();
}

function drawCropMarks(
  context: CanvasRenderingContext2D,
  slot: SheetPhotoSlot,
  markLengthPx: number,
): void {
  const rightPx = slot.xPx + slot.widthPx;
  const bottomPx = slot.yPx + slot.heightPx;

  context.save();
  context.strokeStyle = "rgb(38 50 56 / 55%)";
  context.lineWidth = 1;
  context.beginPath();

  context.moveTo(slot.xPx, slot.yPx);
  context.lineTo(slot.xPx + markLengthPx, slot.yPx);
  context.moveTo(slot.xPx, slot.yPx);
  context.lineTo(slot.xPx, slot.yPx + markLengthPx);

  context.moveTo(rightPx, slot.yPx);
  context.lineTo(rightPx - markLengthPx, slot.yPx);
  context.moveTo(rightPx, slot.yPx);
  context.lineTo(rightPx, slot.yPx + markLengthPx);

  context.moveTo(slot.xPx, bottomPx);
  context.lineTo(slot.xPx + markLengthPx, bottomPx);
  context.moveTo(slot.xPx, bottomPx);
  context.lineTo(slot.xPx, bottomPx - markLengthPx);

  context.moveTo(rightPx, bottomPx);
  context.lineTo(rightPx - markLengthPx, bottomPx);
  context.moveTo(rightPx, bottomPx);
  context.lineTo(rightPx, bottomPx - markLengthPx);

  context.stroke();
  context.restore();
}

function drawControlRuler(
  context: CanvasRenderingContext2D,
  layout: SheetLayout,
): void {
  const ruler = layout.controlRuler;

  context.save();
  context.strokeStyle = "#263238";
  context.fillStyle = "#263238";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(ruler.xPx, ruler.yPx);
  context.lineTo(ruler.xPx + ruler.widthPx, ruler.yPx);

  for (const tick of ruler.ticks) {
    context.moveTo(tick.xPx, ruler.yPx);
    context.lineTo(tick.xPx, ruler.yPx - tick.heightPx);
  }

  context.stroke();
  context.font = "24px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillText("10 cm", ruler.labelXPx, ruler.labelYPx);
  context.restore();
}

function assertPhotoCanvasSize(photoCanvas: HTMLCanvasElement): void {
  if (
    photoCanvas.width !== PHOTO_FORMAT.widthPx ||
    photoCanvas.height !== PHOTO_FORMAT.heightPx
  ) {
    throw new Error(
      `photo canvas must be ${PHOTO_FORMAT.widthPx}x${PHOTO_FORMAT.heightPx}`,
    );
  }
}

function getRenderedPhotoCanvas(
  item: PhotoItem,
  renderedPhotos: Map<string, HTMLCanvasElement>,
): HTMLCanvasElement {
  const existingCanvas = renderedPhotos.get(item.id);

  if (existingCanvas) {
    return existingCanvas;
  }

  const canvas = document.createElement("canvas");
  renderPhotoToCanvas(
    canvas,
    item.image,
    item.editState.transform,
    item.backgroundEdit,
    "export",
  );
  renderedPhotos.set(item.id, canvas);

  return canvas;
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
