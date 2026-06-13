import { describe, expect, it } from "vitest";
import {
  buildFileName,
  buildUniquePhotoFileNames,
  makeUniqueFileNames,
  normalizeFileNameBase,
} from "./file-naming";
import { getDefaultPhotoEditState, PhotoItem } from "./photo-project";

const TEST_DATE = new Date(2026, 5, 13);

describe("file naming", () => {
  it("normalizes accents, spaces, apostrophes and special characters", () => {
    expect(normalizeFileNameBase("Sébastien Molhérac")).toBe("sebastien_molherac");
    expect(normalizeFileNameBase("L'Éléa Sport !")).toBe("l_elea_sport");
    expect(normalizeFileNameBase("  A__B   C  ")).toBe("a_b_c");
  });

  it("falls back when the normalized name is empty", () => {
    expect(normalizeFileNameBase(" !!! ")).toBe("photo_identite");
  });

  it("builds the last-first identity template", () => {
    expect(
      buildFileName(
        {
          displayName: "Sébastien Molhérac",
          firstName: "Sébastien",
          lastName: "Molhérac",
        },
        "lastFirstIdentity",
        { date: TEST_DATE },
      ),
    ).toBe("molherac_sebastien_photo-identite.jpg");
  });

  it("builds usage and date templates", () => {
    expect(
      buildFileName(
        {
          displayName: "Éléa Sport",
          firstName: "Éléa",
          lastName: "Sport",
          usage: "badge",
        },
        "lastFirstUsageDate",
        { date: TEST_DATE },
      ),
    ).toBe("sport_elea_badge_2026-06-13.jpg");
  });

  it("builds the display name identity template", () => {
    expect(
      buildFileName(
        {
          displayName: "Éléa Sport",
        },
        "displayNameIdentity",
      ),
    ).toBe("elea_sport_photo-identite.jpg");
  });

  it("deduplicates generated file names", () => {
    expect(
      makeUniqueFileNames([
        "elea_sport_photo-identite.jpg",
        "elea_sport_photo-identite.jpg",
        "elea_sport_photo-identite.jpg",
      ]),
    ).toEqual([
      "elea_sport_photo-identite.jpg",
      "elea_sport_photo-identite_2.jpg",
      "elea_sport_photo-identite_3.jpg",
    ]);
  });

  it("generates unique names for photo items", () => {
    const photos = [
      createTestPhoto("a", "Éléa Sport"),
      createTestPhoto("b", "Éléa Sport"),
    ];

    expect(
      Array.from(buildUniquePhotoFileNames(photos, "displayNameIdentity").values()),
    ).toEqual([
      "elea_sport_photo-identite.jpg",
      "elea_sport_photo-identite_2.jpg",
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
