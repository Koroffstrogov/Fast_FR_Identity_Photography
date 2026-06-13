import { describe, expect, it } from "vitest";
import { A4_PRINT_PAGE, PRINT_LAYOUTS } from "./print-layout";

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
    });
    expect(PRINT_LAYOUTS.comfort).toEqual({
      columns: 5,
      rows: 5,
      photos: 25,
    });
  });
});
