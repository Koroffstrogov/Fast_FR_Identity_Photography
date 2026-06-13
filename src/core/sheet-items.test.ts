import { describe, expect, it } from "vitest";
import { getDefaultPhotoEditState, PhotoItem, removePhotoItem } from "./photo-project";
import { buildSheetComposition, getTotalSheetCopies } from "./sheet-items";

describe("sheet item composition", () => {
  it("calculates the total requested copies", () => {
    expect(
      getTotalSheetCopies([
        { id: "a", sheetCopies: 4 },
        { id: "b", sheetCopies: 6 },
        { id: "c", sheetCopies: 8 },
      ]),
    ).toBe(18);
  });

  it("limits composition to the standard capacity", () => {
    const composition = buildSheetComposition(
      [
        { id: "a", sheetCopies: 20 },
        { id: "b", sheetCopies: 20 },
      ],
      "standard",
    );

    expect(composition.capacity).toBe(30);
    expect(composition.requestedCount).toBe(40);
    expect(composition.renderedCount).toBe(30);
    expect(composition.isLimited).toBe(true);
  });

  it("limits composition to the comfort capacity", () => {
    const composition = buildSheetComposition(
      [
        { id: "a", sheetCopies: 20 },
        { id: "b", sheetCopies: 20 },
      ],
      "comfort",
    );

    expect(composition.capacity).toBe(25);
    expect(composition.requestedCount).toBe(40);
    expect(composition.renderedCount).toBe(25);
    expect(composition.isLimited).toBe(true);
  });

  it("fills the sheet in list order", () => {
    const composition = buildSheetComposition(
      [
        { id: "a", sheetCopies: 2 },
        { id: "b", sheetCopies: 3 },
        { id: "c", sheetCopies: 1 },
      ],
      "standard",
    );

    expect(composition.slots.map((slot) => slot.itemId)).toEqual([
      "a",
      "a",
      "b",
      "b",
      "b",
      "c",
    ]);
  });

  it("recalculates the total after deleting a photo", () => {
    const items: PhotoItem<unknown>[] = [
      createTestPhoto("a", 4),
      createTestPhoto("b", 6),
      createTestPhoto("c", 8),
    ];
    const remainingItems = removePhotoItem(items, "b");

    expect(getTotalSheetCopies(remainingItems)).toBe(12);
    expect(buildSheetComposition(remainingItems, "standard").renderedCount).toBe(12);
  });
});

function createTestPhoto(id: string, sheetCopies: number): PhotoItem<unknown> {
  return {
    id,
    originalFileName: `${id}.png`,
    displayName: id,
    image: {},
    editState: getDefaultPhotoEditState(),
    sheetCopies,
  };
}
