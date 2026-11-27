export type ColoringRgb = { r: number; g: number; b: number };

export function parseColorHex(hex: string): ColoringRgb | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

/**
 * Recolors a connected, exact-color region. Digital source pages are rendered
 * black/white from the approved print PDFs; neither PDF nor source artwork is changed.
 * Mutates a supplied copy of ImageData pixels, never private book assets.
 */
export function paintBucketFill(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  newColor: ColoringRgb
): number {
  if (!Number.isInteger(width) || !Number.isInteger(height)
    || width < 1 || height < 1 || width * height > 3_000_000
    || pixels.length !== width * height * 4
    || !Number.isInteger(x) || !Number.isInteger(y)
    || x < 0 || y < 0 || x >= width || y >= height
    || ![newColor.r, newColor.g, newColor.b].every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return 0;

  const start = y * width + x;
  const offset = start * 4;
  const targetR = pixels[offset], targetG = pixels[offset + 1],
    targetB = pixels[offset + 2], targetA = pixels[offset + 3];

  // Preserve the approved black line drawing and its printed text and QR.
  if (targetR < 64 && targetG < 64 && targetB < 64) return 0;
  if (targetR === newColor.r && targetG === newColor.g && targetB === newColor.b) return 0;

  const matches = (point: number) => {
    const p = point * 4;
    return pixels[p] === targetR && pixels[p + 1] === targetG
      && pixels[p + 2] === targetB && pixels[p + 3] === targetA;
  };
  const queue = new Int32Array(width * height);
  const visited = new Uint8Array(width * height);
  let head = 0, tail = 0, count = 0;

  visited[start] = 1;
  queue[tail++] = start;
  while (head < tail) {
    const point = queue[head++];
    const p = point * 4;
    pixels[p] = newColor.r;
    pixels[p + 1] = newColor.g;
    pixels[p + 2] = newColor.b;
    pixels[p + 3] = 255;
    count += 1;
    const px = point % width, py = Math.floor(point / width);
    const visit = (next: number) => {
      if (visited[next]) return;
      visited[next] = 1;
      if (matches(next)) queue[tail++] = next;
    };
    if (px > 0) visit(point - 1);
    if (px + 1 < width) visit(point + 1);
    if (py > 0) visit(point - width);
    if (py + 1 < height) visit(point + width);
  }
  return count;
}
