import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDirectory = path.resolve("public/icons");
const emerald = [15, 77, 63, 255];
const ivory = [248, 244, 234, 255];
const gold = [169, 131, 66, 255];

function isInsideArch(x, y, left, top, right, bottom) {
  if (x < left || x > right || y < top || y > bottom) {
    return false;
  }

  const radius = (right - left) / 2;
  const centerX = (left + right) / 2;
  const centerY = top + radius;

  if (y >= centerY) {
    return true;
  }

  const normalizedX = (x - centerX) / radius;
  const normalizedY = (y - centerY) / radius;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function writePixel(buffer, offset, color) {
  buffer[offset] = color[0];
  buffer[offset + 1] = color[1];
  buffer[offset + 2] = color[2];
  buffer[offset + 3] = color[3];
}

function iconPixels(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const outerInset = Math.round(size * (maskable ? 0.2 : 0.1));
  const outerLeft = outerInset;
  const outerTop = outerInset;
  const outerRight = size - outerInset - 1;
  const outerBottom = size - outerInset - 1;
  const outerWidth = outerRight - outerLeft;
  const innerInset = Math.round(outerWidth * 0.23);
  const innerLeft = outerLeft + innerInset;
  const innerTop = outerTop + innerInset;
  const innerRight = outerRight - innerInset;
  const innerBottom = outerBottom;
  const centerX = Math.round(size / 2);
  const lineHalfWidth = Math.max(1, Math.round(size * 0.012));
  const lineTop = Math.round(innerTop + (innerRight - innerLeft) * 0.42);
  const lineBottom = Math.round(innerBottom - innerInset * 0.35);
  const dotCenterY = Math.round(size * 0.58);
  const dotRadius = Math.max(2, Math.round(size * 0.022));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = emerald;

      if (
        isInsideArch(
          x + 0.5,
          y + 0.5,
          outerLeft,
          outerTop,
          outerRight,
          outerBottom,
        )
      ) {
        color = ivory;
      }

      if (
        isInsideArch(
          x + 0.5,
          y + 0.5,
          innerLeft,
          innerTop,
          innerRight,
          innerBottom,
        )
      ) {
        color = emerald;
      }

      const onLine =
        Math.abs(x - centerX) <= lineHalfWidth &&
        y >= lineTop &&
        y <= lineBottom;
      const dotX = x - centerX;
      const dotY = y - dotCenterY;
      const onDot = dotX * dotX + dotY * dotY <= dotRadius * dotRadius;

      if (onLine || onDot) {
        color = gold;
      }

      writePixel(pixels, (y * size + x) * 4, color);
    }
  }

  return pixels;
}

async function writeIcon(fileName, size, options) {
  const pixels = iconPixels(size, options);

  await sharp(pixels, {
    raw: {
      width: size,
      height: size,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(outputDirectory, fileName));
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeIcon("icon-192.png", 192),
  writeIcon("icon-512.png", 512),
  writeIcon("icon-1024.png", 1024),
  writeIcon("icon-maskable-512.png", 512, { maskable: true }),
  writeIcon("icon-maskable-1024.png", 1024, { maskable: true }),
  writeIcon("apple-touch-icon.png", 180),
]);

console.log("Generated canonical Mithaq web and native icons in public/icons.");
