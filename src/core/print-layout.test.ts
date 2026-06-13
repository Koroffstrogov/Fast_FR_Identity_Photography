import { describe, expect, it } from "vitest";
import { PHOTO_FORMAT, mmToPx } from "./photo-format";
import {
  A4_PRINT_PAGE,
  COMFORT_CUT_SPACING_MM,
  PRINT_LAYOUTS,
  PrintLayoutMode,
  clampSheetPhotoCount,
  getSheetCapacity,
  getSheetLayout,
} from "./print-layout";

describe("print layout constants", () => {
  it("defines A4 print dimensions at 300 dpi", () => {
    expect(A4_PRINT_PAGE.widthMm).toBe(210);
    expect(A4_PRINT_PAGE.heightMm).toBe(297);
    expect(A4_PRINT_PAGE.widthPx).toBe(2480);
    expect(A4_PRINT_PAGE.heightPx).toBe(3508);
    expect(A4_PRINT_PAGE.marginMm).toBe(10);
    expect(A4_PRINT_PAGE.marginPx).toBe(118);
  });

  it("defines the standard and comfort capacities", () => {
    expect(PRINT_LAYOUTS.standard).toEqual({
      columns: 5,
      rows: 6,
      photos: 30,
      cutSpacingMm: 0,
    });
    expect(PRINT_LAYOUTS.comfort).toEqual({
      columns: 5,
      rows: 5,
      photos: 25,
      cutSpacingMm: COMFORT_CUT_SPACING_MM,
    });
  });

  it("reports the standard 5 x 6 capacity", () => {
    const layout = getSheetLayout("standard");

    expect(getSheetCapacity("standard")).toBe(30);
    expect(layout.capacity).toBe(30);
    expect(layout.photoCount).toBe(30);
    expect(layout.columns).toBe(5);
    expect(layout.rows).toBe(6);
    expect(layout.photoSlots).toHaveLength(30);
  });

  it("reports the comfort 5 x 5 capacity with 2 mm cut spacing", () => {
    const layout = getSheetLayout("comfort");

    expect(getSheetCapacity("comfort")).toBe(25);
    expect(layout.capacity).toBe(25);
    expect(layout.photoCount).toBe(25);
    expect(layout.columns).toBe(5);
    expect(layout.rows).toBe(5);
    expect(layout.spacingPx).toBe(mmToPx(2));
    expect(layout.photoSlots).toHaveLength(25);
  });

  it.each<PrintLayoutMode>(["standard", "comfort"])(
    "keeps every %s photo inside the printable area",
    (mode) => {
      const layout = getSheetLayout(mode);
      const printableRightPx = layout.printableArea.xPx + layout.printableArea.widthPx;
      const printableBottomPx = layout.printableArea.yPx + layout.printableArea.heightPx;

      for (const slot of layout.photoSlots) {
        expect(slot.xPx).toBeGreaterThanOrEqual(layout.printableArea.xPx);
        expect(slot.yPx).toBeGreaterThanOrEqual(layout.printableArea.yPx);
        expect(slot.xPx + slot.widthPx).toBeLessThanOrEqual(printableRightPx);
        expect(slot.yPx + slot.heightPx).toBeLessThanOrEqual(printableBottomPx);
        expect(slot.widthPx).toBe(PHOTO_FORMAT.widthPx);
        expect(slot.heightPx).toBe(PHOTO_FORMAT.heightPx);
      }
    },
  );

  it("defines a 10 cm control ruler near the bottom of the A4 page", () => {
    const layout = getSheetLayout("standard");

    expect(layout.controlRuler.widthPx).toBe(mmToPx(100));
    expect(layout.controlRuler.ticks).toHaveLength(11);
    expect(layout.controlRuler.yPx).toBeLessThan(A4_PRINT_PAGE.heightPx);
  });

  it("reduces the rendered slots when a manual photo count is provided", () => {
    const layout = getSheetLayout("standard", 7);

    expect(layout.capacity).toBe(30);
    expect(layout.photoCount).toBe(7);
    expect(layout.photoSlots).toHaveLength(7);
  });

  it("clamps the manual photo count to the mode capacity", () => {
    expect(clampSheetPhotoCount("standard", 99)).toBe(30);
    expect(getSheetLayout("comfort", 99).photoCount).toBe(25);
    expect(getSheetLayout("comfort", 0).photoCount).toBe(1);
  });
});
