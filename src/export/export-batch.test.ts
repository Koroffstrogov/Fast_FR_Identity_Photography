import { describe, expect, it } from "vitest";
import { getDefaultPhotoEditState, PhotoItem } from "../core/photo-project";
import { buildIndividualExportJobs } from "./export-batch";

describe("batch export jobs", () => {
  it("creates one export job per photo", () => {
    const photos = [
      createTestPhoto("a", "Alice Dupont"),
      createTestPhoto("b", "Bob Martin"),
    ];

    expect(buildIndividualExportJobs(photos, "displayNameIdentity")).toEqual([
      {
        photoId: "a",
        fileName: "alice_dupont_photo-identite.jpg",
      },
      {
        photoId: "b",
        fileName: "bob_martin_photo-identite.jpg",
      },
    ]);
  });
});

function createTestPhoto(id: string, displayName: string): PhotoItem<unknown> {
  return {
    id,
    originalFileName: `${id}.png`,
    displayName,
    image: {},
    editState: getDefaultPhotoEditState(),
    sheetCopies: 1,
  };
}
