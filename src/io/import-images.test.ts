import { describe, expect, it } from "vitest";
import { formatImportSummary, importImageFiles } from "./import-images";

describe("image import", () => {
  it("keeps valid files when another file fails", async () => {
    const validFile = new File(["valid"], "valid.png", { type: "image/png" });
    const invalidFile = new File(["invalid"], "invalid.txt", { type: "text/plain" });
    let idIndex = 0;

    const result = await importImageFiles(
      [validFile, invalidFile],
      () => {
        idIndex += 1;

        return `photo-${idIndex}`;
      },
      async (file) => {
        if (file.type !== "image/png") {
          throw new Error("Fichier ignoré");
        }

        return {} as HTMLImageElement;
      },
    );

    expect(result.photos).toHaveLength(1);
    expect(result.photos[0].originalFileName).toBe("valid.png");
    expect(result.errors).toEqual([
      {
        fileName: "invalid.txt",
        message: "Fichier ignoré",
      },
    ]);
    expect(formatImportSummary(result)).toBe("1 image importée, 1 fichier ignoré.");
  });
});
