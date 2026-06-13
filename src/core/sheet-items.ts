import { PrintLayoutMode, getSheetCapacity } from "./print-layout";

export type SheetCompositionSource = {
  id: string;
  sheetCopies: number;
};

export type SheetCompositionSlot = {
  sheetIndex: number;
  itemId: string;
  itemIndex: number;
  copyIndex: number;
};

export type SheetComposition = {
  mode: PrintLayoutMode;
  capacity: number;
  requestedCount: number;
  renderedCount: number;
  isLimited: boolean;
  slots: SheetCompositionSlot[];
};

export function getTotalSheetCopies(items: SheetCompositionSource[]): number {
  return items.reduce((total, item) => total + normalizeCopies(item.sheetCopies), 0);
}

export function buildSheetComposition(
  items: SheetCompositionSource[],
  mode: PrintLayoutMode,
): SheetComposition {
  const capacity = getSheetCapacity(mode);
  const requestedCount = getTotalSheetCopies(items);
  const slots: SheetCompositionSlot[] = [];

  for (const [itemIndex, item] of items.entries()) {
    const copies = normalizeCopies(item.sheetCopies);

    for (let copyIndex = 0; copyIndex < copies && slots.length < capacity; copyIndex += 1) {
      slots.push({
        sheetIndex: slots.length,
        itemId: item.id,
        itemIndex,
        copyIndex,
      });
    }

    if (slots.length >= capacity) {
      break;
    }
  }

  return {
    mode,
    capacity,
    requestedCount,
    renderedCount: slots.length,
    isLimited: requestedCount > capacity,
    slots,
  };
}

function normalizeCopies(copies: number): number {
  if (!Number.isFinite(copies)) {
    return 0;
  }

  return Math.max(0, Math.trunc(copies));
}
