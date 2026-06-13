import { describe, expect, it } from "vitest";
import { buildZipFileName } from "../core/file-naming";
import { BATCH_EXPORT_PRIMARY_ACTION } from "./export-zip";

describe("zip export", () => {
  it("keeps ZIP as the primary batch export action", () => {
    expect(BATCH_EXPORT_PRIMARY_ACTION).toBe("zip");
  });

  it("generates the expected dated ZIP name", () => {
    expect(buildZipFileName(new Date(2026, 5, 13))).toBe(
      "photos_identite_2026-06-13.zip",
    );
  });
});
