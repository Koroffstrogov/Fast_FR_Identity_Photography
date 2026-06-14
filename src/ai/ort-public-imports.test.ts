import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_FILES_TO_AUDIT = ["vite.config.ts", "index.html", "package.json"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const FORBIDDEN_PUBLIC_ORT_IMPORTS = [
  /\bfrom\s+["']\/ort\//,
  /\bimport\s+["']\/ort\//,
  /\bimport\s*\(\s*["']\/ort\//,
  /new\s+URL\s*\(\s*["']\/ort\//,
];

describe("ORT public assets", () => {
  it("does not import files from public/ort as Vite modules", () => {
    const offenders = getFilesToAudit().flatMap((filePath) => {
      const content = readFileSync(join(process.cwd(), filePath), "utf8");

      return FORBIDDEN_PUBLIC_ORT_IMPORTS.flatMap((pattern) =>
        pattern.test(content) ? [`${filePath}: ${pattern}`] : [],
      );
    });

    expect(offenders).toEqual([]);
  });
});

function getFilesToAudit(): string[] {
  return [...walkSourceFiles("src"), ...ROOT_FILES_TO_AUDIT];
}

function walkSourceFiles(directory: string): string[] {
  return readdirSync(join(process.cwd(), directory)).flatMap((entry) => {
    const relativePath = `${directory}/${entry}`;
    const absolutePath = join(process.cwd(), relativePath);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      return walkSourceFiles(relativePath);
    }

    return SOURCE_EXTENSIONS.has(getExtension(entry)) ? [relativePath] : [];
  });
}

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");

  return dotIndex === -1 ? "" : fileName.slice(dotIndex);
}
