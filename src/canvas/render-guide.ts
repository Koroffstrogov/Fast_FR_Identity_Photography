import { FaceGuide, getFranceOfficialFaceGuide } from "../core/face-guide";
import { PHOTO_FORMAT } from "../core/photo-format";

export type GuideOverlayPoint = {
  xPx: number;
  yPx: number;
  label: string;
  color?: string;
  state?: "normal" | "hovered" | "selected" | "missing";
};

export type FaceGuideOverlayOptions = {
  showGuide: boolean;
  opacity: number;
  manualPoints?: readonly GuideOverlayPoint[];
};

export function prepareGuideCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = PHOTO_FORMAT.widthPx;
  canvas.height = PHOTO_FORMAT.heightPx;
  clearGuideCanvas(canvas);
}

export function clearGuideCanvas(canvas: HTMLCanvasElement): void {
  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
}

export function renderFranceOfficialFaceGuide(
  canvas: HTMLCanvasElement,
  opacity: number,
): void {
  renderFaceGuideToCanvas(canvas, getFranceOfficialFaceGuide(), opacity);
}

export function renderFaceGuideOverlay(
  canvas: HTMLCanvasElement,
  options: FaceGuideOverlayOptions,
): void {
  canvas.width = PHOTO_FORMAT.widthPx;
  canvas.height = PHOTO_FORMAT.heightPx;

  if (options.showGuide) {
    renderFaceGuideToCanvas(canvas, getFranceOfficialFaceGuide(), options.opacity);
  } else {
    clearGuideCanvas(canvas);
  }

  drawManualPoints(canvas, options.manualPoints ?? []);
}

export function renderFaceGuideToCanvas(
  canvas: HTMLCanvasElement,
  guide: FaceGuide,
  opacity: number,
): void {
  canvas.width = PHOTO_FORMAT.widthPx;
  canvas.height = PHOTO_FORMAT.heightPx;

  const context = getCanvasContext(canvas);
  const alpha = Math.min(1, Math.max(0, opacity));
  const xCenterPx = xMmToPx(guide.centerXMm, guide);
  const topToleranceYPx = yMmToPx(guide.toleranceBand.topYMm, guide);
  const bottomToleranceYPx = yMmToPx(guide.toleranceBand.bottomYMm, guide);
  const chinYPx = yMmToPx(guide.chinLine.yMm, guide);
  const skullTargetYPx = yMmToPx(guide.skullTopTargetLine.yMm, guide);
  const eyeYPx = yMmToPx(guide.eyeLine.yMm, guide);
  const shoulderYPx = yMmToPx(guide.shoulderLine.yMm, guide);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.globalAlpha = alpha;

  context.fillStyle = "rgb(20 184 166 / 22%)";
  context.fillRect(0, topToleranceYPx, canvas.width, bottomToleranceYPx - topToleranceYPx);

  drawHorizontalLine(context, skullTargetYPx, "#0f766e", 2, []);
  drawHorizontalLine(context, chinYPx, "#9f1239", 2, []);
  drawHorizontalLine(context, eyeYPx, "#2563eb", 1.5, [8, 8]);

  context.strokeStyle = "#334155";
  context.lineWidth = 1.5;
  context.setLineDash([10, 8]);
  context.beginPath();
  context.moveTo(xCenterPx, 0);
  context.lineTo(xCenterPx, canvas.height);
  context.stroke();

  context.strokeStyle = "#64748b";
  context.lineWidth = 1.5;
  context.setLineDash([12, 10]);
  context.beginPath();
  context.moveTo(xMmToPx(6, guide), shoulderYPx);
  context.bezierCurveTo(
    xMmToPx(11, guide),
    shoulderYPx - 10,
    xMmToPx(24, guide),
    shoulderYPx - 10,
    xMmToPx(29, guide),
    shoulderYPx,
  );
  context.stroke();

  drawLabel(context, "Sommet cible", 10, skullTargetYPx - 7, "#0f766e");
  drawLabel(context, "Menton", 10, chinYPx - 7, "#9f1239");
  drawLabel(context, "Yeux", 10, eyeYPx - 7, "#2563eb");

  context.restore();
}

function drawManualPoints(
  canvas: HTMLCanvasElement,
  manualPoints: readonly GuideOverlayPoint[],
): void {
  if (manualPoints.length === 0) {
    return;
  }

  const context = getCanvasContext(canvas);

  context.save();
  context.font = "15px Arial, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "middle";

  manualPoints.forEach((point) => {
    const radius = point.state === "selected" ? 10 : point.state === "hovered" ? 9 : 7;
    const lineWidth = point.state === "selected" ? 4 : point.state === "hovered" ? 3 : 2;

    context.beginPath();
    context.arc(point.xPx, point.yPx, radius, 0, Math.PI * 2);
    context.fillStyle = point.color ?? "rgb(22 78 99 / 90%)";
    context.fill();
    context.lineWidth = lineWidth;
    context.strokeStyle = "#ffffff";
    context.stroke();

    if (point.state === "selected" || point.state === "hovered") {
      context.beginPath();
      context.arc(point.xPx, point.yPx, radius + 4, 0, Math.PI * 2);
      context.lineWidth = 2;
      context.strokeStyle = point.state === "selected" ? "#f59e0b" : "#38bdf8";
      context.stroke();
    }

    context.fillStyle = "#164e63";
    context.fillText(point.label, point.xPx + 11, point.yPx);
  });

  context.restore();
}

function drawHorizontalLine(
  context: CanvasRenderingContext2D,
  yPx: number,
  color: string,
  lineWidth: number,
  dash: number[],
): void {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.setLineDash(dash);
  context.beginPath();
  context.moveTo(0, yPx);
  context.lineTo(PHOTO_FORMAT.widthPx, yPx);
  context.stroke();
}

function drawLabel(
  context: CanvasRenderingContext2D,
  label: string,
  xPx: number,
  yPx: number,
  color: string,
): void {
  context.fillStyle = color;
  context.font = "16px Arial, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText(label, xPx, yPx);
}

function xMmToPx(xMm: number, guide: FaceGuide): number {
  return (xMm / guide.photoWidthMm) * PHOTO_FORMAT.widthPx;
}

function yMmToPx(yMm: number, guide: FaceGuide): number {
  return (yMm / guide.photoHeightMm) * PHOTO_FORMAT.heightPx;
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context is unavailable");
  }

  return context;
}
