export function calculateSharpnessScore(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  if (width < 3 || height < 3 || pixels.length < width * height * 4) {
    return 0;
  }

  let edgeSum = 0;
  let sampleCount = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = getLuminanceAt(pixels, width, x, y);
      const laplacian =
        getLuminanceAt(pixels, width, x - 1, y) +
        getLuminanceAt(pixels, width, x + 1, y) +
        getLuminanceAt(pixels, width, x, y - 1) +
        getLuminanceAt(pixels, width, x, y + 1) -
        center * 4;

      edgeSum += Math.abs(laplacian);
      sampleCount += 1;
    }
  }

  if (sampleCount === 0) {
    return 0;
  }

  return Math.min(100, (edgeSum / sampleCount) * 1.8);
}

function getLuminanceAt(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): number {
  const index = (y * width + x) * 4;

  return calculateLuminance(pixels[index], pixels[index + 1], pixels[index + 2]);
}

function calculateLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
