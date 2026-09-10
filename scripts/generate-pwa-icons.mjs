import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "public", "icons");
mkdirSync(output, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(name, data) {
  const type = Buffer.from(name);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const panelSize = size * 0.66;
  const panelLeft = center - panelSize / 2;
  const panelTop = panelLeft;
  const radius = size * 0.145;
  const waveThickness = Math.max(2, size * 0.023);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      let red = 8;
      let green = 10;
      let blue = 13;
      const dx = Math.abs(x - center) - (panelSize / 2 - radius);
      const dy = Math.abs(y - center) - (panelSize / 2 - radius);
      const roundedDistance = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius;
      const insidePanel = roundedDistance <= 0;
      if (insidePanel) {
        const mix = (x + y) / (size * 2);
        red = Math.round(95 - mix * 67);
        green = Math.round(242 - mix * 57);
        blue = Math.round(238 - mix * 19);
        const localX = (x - panelLeft) / panelSize;
        if (localX >= 0.19 && localX <= 0.81) {
          const waveX = (localX - 0.19) / 0.62;
          for (const base of [0.38, 0.5, 0.62]) {
            const waveY = panelTop + panelSize * (base + Math.sin(waveX * Math.PI * 3 + base * 9) * 0.045);
            if (Math.abs(y - waveY) <= waveThickness) {
              red = 7;
              green = 16;
              blue = 20;
            }
          }
        }
      }
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const target = y * (size * 4 + 1);
    raw[target] = 0;
    pixels.copy(raw, target + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [180, 192, 512]) writeFileSync(join(output, `mixdeck-${size}.png`), createIcon(size));
