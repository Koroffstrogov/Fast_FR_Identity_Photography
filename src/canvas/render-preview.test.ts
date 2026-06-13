import { describe, expect, it } from "vitest";
import { A4_PRINT_PAGE } from "../core/print-layout";
import { FINAL_PHOTO_PREVIEW_SIZE } from "./render-preview";

describe("preview canvas dimensions", () => {
  it("defines the final photo preview at export dimensions", () => {
    expect(FINAL_PHOTO_PREVIEW_SIZE.widthMm).toBe(35);
    expect(FINAL_PHOTO_PREVIEW_SIZE.heightMm).toBe(45);
    expect(FINAL_PHOTO_PREVIEW_SIZE.widthPx).toBe(413);
    expect(FINAL_PHOTO_PREVIEW_SIZE.heightPx).toBe(531);
    expect(FINAL_PHOTO_PREVIEW_SIZE.dpi).toBe(300);
  });

  it("keeps the A4 sheet dimensions unchanged", () => {
    expect(A4_PRINT_PAGE.widthPx).toBe(2480);
    expect(A4_PRINT_PAGE.heightPx).toBe(3508);
  });
});
