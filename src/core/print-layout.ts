import { PHOTO_DPI, millimetersToPixels } from "./photo-format";

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_MARGIN_MM = 10;

export const A4_PRINT_PAGE = {
  widthMm: A4_WIDTH_MM,
  heightMm: A4_HEIGHT_MM,
  dpi: PHOTO_DPI,
  widthPx: millimetersToPixels(A4_WIDTH_MM),
  heightPx: millimetersToPixels(A4_HEIGHT_MM),
  marginMm: A4_MARGIN_MM,
  marginPx: millimetersToPixels(A4_MARGIN_MM),
} as const;

export const PRINT_LAYOUTS = {
  standard: {
    columns: 5,
    rows: 6,
    photos: 30,
  },
  comfort: {
    columns: 5,
    rows: 5,
    photos: 25,
  },
} as const;

export type PrintLayoutMode = keyof typeof PRINT_LAYOUTS;
