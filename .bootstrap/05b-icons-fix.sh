#!/usr/bin/env bash
set -euo pipefail

cat > scripts/generate-pwa-icons.mjs <<'EOF'
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDirectory = path.resolve("public/icons");
const number = (value) => Number(value.toFixed(3));

function iconSvg(size, { maskable = false } = {}) {
  const inset = size * (maskable ? 0.2 : 0.1);
  const left = number(inset);
  const right = number(size - inset);
  const top = number(inset);
  const bottom = number(size - inset);
  const center = number(size / 2);
  const width = right - left;
  const shoulder = number(top + width / 2);
  const innerInset = number(width * 0.23);
  const innerLeft = number(left + innerInset);
  const innerRight = number(right - innerInset);
  const innerTop = number(top + innerInset);
  const innerShoulder = number(shoulder + innerInset * 0.32);
  const stroke = number(size * 0.043);
  const goldStroke = number(size * 0.024);
  const lineTop = number(innerTop + innerInset * 0.35);
  const lineBottom = number(bottom - innerInset * 0.42);
  const dotRadius = number(size * 0.022);

  const outerPath = [
    `M ${left} ${bottom}`,
    `L ${left} ${shoulder}`,
    `C ${left} ${number(top + width * 0.22)}, ${number(left + width * 0.22)} ${top}, ${center} ${top}`,
    `C ${number(right - width * 0.22)} ${top}, ${right} ${number(top + width * 0.22)}, ${right} ${shoulder}`,
    `L ${right} ${bottom}`,
    "Z"
  ].join(" ");

  const innerPath = [
    `M ${innerLeft} ${bottom}`,
    `L ${innerLeft} ${innerShoulder}`,
    `C ${innerLeft} ${number(innerTop + (innerRight - innerLeft) * 0.22)}, ${number(innerLeft + (innerRight - innerLeft) * 0.22)} ${innerTop}, ${center} ${innerTop}`,
    `C ${number(innerRight - (innerRight - innerLeft) * 0.22)} ${innerTop}, ${innerRight} ${number(innerTop + (innerRight - innerLeft) * 0.22)}, ${innerRight} ${innerShoulder}`,
    `L ${innerRight} ${bottom}`
  ].join(" ");

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${maskable ? 0 : number(size * 0.18)}" fill="#0F4D3F"/><path d="${outerPath}" fill="#F8F4EA"/><path d="${innerPath}" fill="none" stroke="#0F4D3F" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/><line x1="${center}" y1="${lineTop}" x2="${center}" y2="${lineBottom}" stroke="#A98342" stroke-width="${goldStroke}" stroke-linecap="round"/><circle cx="${center}" cy="${number(size * 0.58)}" r="${dotRadius}" fill="#A98342"/></svg>`;
}

async function writeIcon(fileName, size, options) {
  await sharp(Buffer.from(iconSvg(size, options)))
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDirectory, fileName));
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeIcon("icon-192.png", 192),
  writeIcon("icon-512.png", 512),
  writeIcon("icon-maskable-512.png", 512, { maskable: true }),
  writeIcon("apple-touch-icon.png", 180)
]);

console.log("Generated provisional Mithaq PWA icons in public/icons.");
EOF
