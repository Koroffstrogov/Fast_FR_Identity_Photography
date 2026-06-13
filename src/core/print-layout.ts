import {
  PHOTO_DPI,
  PHOTO_FORMAT,
  mmToPx,
} from "./photo-format";

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_MARGIN_MM = 10;
export const COMFORT_CUT_SPACING_MM = 2;
export const CROP_MARK_LENGTH_MM = 3;
export const CONTROL_RULER_LENGTH_MM = 100;
export const CONTROL_RULER_BOTTOM_OFFSET_MM = 5;
export const CONTROL_RULER_MAJOR_TICK_MM = 5;
export const CONTROL_RULER_MINOR_TICK_MM = 3;
export const CONTROL_RULER_LABEL_OFFSET_MM = 6;

export type PixelRect = {
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
};

export type SheetPhotoSlot = PixelRect & {
  index: number;
  row: number;
  column: number;
};

export type ControlRulerTick = {
  xPx: number;
  heightPx: number;
};

export type ControlRulerLayout = {
  xPx: number;
  yPx: number;
  widthPx: number;
  labelXPx: number;
  labelYPx: number;
  ticks: ControlRulerTick[];
};

export type SheetLayout = {
  mode: PrintLayoutMode;
  columns: number;
  rows: number;
  capacity: number;
  photoCount: number;
  spacingPx: number;
  page: typeof A4_PRINT_PAGE;
  printableArea: PixelRect;
  photoSlots: SheetPhotoSlot[];
  cropMarkLengthPx: number;
  controlRuler: ControlRulerLayout;
};

export const A4_PRINT_PAGE = {
  widthMm: A4_WIDTH_MM,
  heightMm: A4_HEIGHT_MM,
  dpi: PHOTO_DPI,
  widthPx: mmToPx(A4_WIDTH_MM),
  heightPx: mmToPx(A4_HEIGHT_MM),
  marginMm: A4_MARGIN_MM,
  marginPx: mmToPx(A4_MARGIN_MM),
} as const;

export const PRINT_LAYOUTS = {
  standard: {
    columns: 5,
    rows: 6,
    photos: 30,
    cutSpacingMm: 0,
  },
  comfort: {
    columns: 5,
    rows: 5,
    photos: 25,
    cutSpacingMm: COMFORT_CUT_SPACING_MM,
  },
} as const;

export type PrintLayoutMode = keyof typeof PRINT_LAYOUTS;

export function getPrintableArea(): PixelRect {
  return {
    xPx: A4_PRINT_PAGE.marginPx,
    yPx: A4_PRINT_PAGE.marginPx,
    widthPx: A4_PRINT_PAGE.widthPx - A4_PRINT_PAGE.marginPx * 2,
    heightPx: A4_PRINT_PAGE.heightPx - A4_PRINT_PAGE.marginPx * 2,
  };
}

export function getSheetCapacity(mode: PrintLayoutMode): number {
  const layout = PRINT_LAYOUTS[mode];

  return layout.columns * layout.rows;
}

export function clampSheetPhotoCount(
  mode: PrintLayoutMode,
  requestedPhotoCount?: number,
): number {
  const capacity = getSheetCapacity(mode);

  if (requestedPhotoCount === undefined) {
    return capacity;
  }

  if (!Number.isFinite(requestedPhotoCount)) {
    return 1;
  }

  return Math.min(capacity, Math.max(1, Math.trunc(requestedPhotoCount)));
}

export function getSheetLayout(
  mode: PrintLayoutMode,
  requestedPhotoCount?: number,
): SheetLayout {
  const layout = PRINT_LAYOUTS[mode];
  const spacingPx = spacingMmToPx(layout.cutSpacingMm);
  const capacity = getSheetCapacity(mode);
  const photoCount = clampSheetPhotoCount(mode, requestedPhotoCount);
  const printableArea = getPrintableArea();
  const usedWidthPx =
    layout.columns * PHOTO_FORMAT.widthPx + (layout.columns - 1) * spacingPx;
  const usedHeightPx =
    layout.rows * PHOTO_FORMAT.heightPx + (layout.rows - 1) * spacingPx;

  if (usedWidthPx > printableArea.widthPx || usedHeightPx > printableArea.heightPx) {
    throw new Error(`layout ${mode} does not fit within the printable A4 area`);
  }

  const startXPx = Math.round(
    printableArea.xPx + (printableArea.widthPx - usedWidthPx) / 2,
  );
  const startYPx = Math.round(
    printableArea.yPx + (printableArea.heightPx - usedHeightPx) / 2,
  );

  return {
    mode,
    columns: layout.columns,
    rows: layout.rows,
    capacity,
    photoCount,
    spacingPx,
    page: A4_PRINT_PAGE,
    printableArea,
    photoSlots: buildPhotoSlots(
      layout.columns,
      layout.rows,
      spacingPx,
      startXPx,
      startYPx,
      photoCount,
    ),
    cropMarkLengthPx: mmToPx(CROP_MARK_LENGTH_MM),
    controlRuler: getControlRulerLayout(),
  };
}

function buildPhotoSlots(
  columns: number,
  rows: number,
  spacingPx: number,
  startXPx: number,
  startYPx: number,
  photoCount: number,
): SheetPhotoSlot[] {
  return Array.from({ length: photoCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      index,
      row,
      column,
      xPx: startXPx + column * (PHOTO_FORMAT.widthPx + spacingPx),
      yPx: startYPx + row * (PHOTO_FORMAT.heightPx + spacingPx),
      widthPx: PHOTO_FORMAT.widthPx,
      heightPx: PHOTO_FORMAT.heightPx,
    };
  });
}

function getControlRulerLayout(): ControlRulerLayout {
  const widthPx = mmToPx(CONTROL_RULER_LENGTH_MM);
  const xPx = Math.round((A4_PRINT_PAGE.widthPx - widthPx) / 2);
  const yPx = A4_PRINT_PAGE.heightPx - mmToPx(CONTROL_RULER_BOTTOM_OFFSET_MM);
  const majorTickHeightPx = mmToPx(CONTROL_RULER_MAJOR_TICK_MM);
  const minorTickHeightPx = mmToPx(CONTROL_RULER_MINOR_TICK_MM);

  return {
    xPx,
    yPx,
    widthPx,
    labelXPx: xPx + Math.round(widthPx / 2),
    labelYPx: yPx - mmToPx(CONTROL_RULER_LABEL_OFFSET_MM),
    ticks: Array.from({ length: 11 }, (_, tickIndex) => ({
      xPx: xPx + Math.round((widthPx * tickIndex) / 10),
      heightPx: tickIndex % 5 === 0 ? majorTickHeightPx : minorTickHeightPx,
    })),
  };
}

function spacingMmToPx(spacingMm: number): number {
  if (spacingMm === 0) {
    return 0;
  }

  return mmToPx(spacingMm);
}
