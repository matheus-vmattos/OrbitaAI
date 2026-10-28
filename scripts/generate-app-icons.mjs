import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
const directory = fileURLToPath(
  new URL("../apps/web/public/icons/", import.meta.url),
);
mkdirSync(directory, { recursive: true });
function crc32(buffer) {
  let value = 0xffffffff;
  for (const b of buffer) {
    value ^= b;
    for (let k = 0; k < 8; k++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, crc]);
}
for (const size of [180, 192, 512]) {
  const data = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) {
      const u = (x - size / 2) / size,
        v = (y - size / 2) / size;
      const radius = Math.hypot(u, v);
      const rx = u * 0.866 - v * 0.5,
        ry = u * 0.5 + v * 0.866;
      const ellipse = Math.sqrt((rx / 0.32) ** 2 + (ry / 0.13) ** 2);
      const ring = Math.abs(ellipse - 1) < 0.024;
      let color = [8, 13, 18];
      if (radius < 0.155) {
        const light = Math.max(0, 1 - Math.hypot(u + 0.06, v + 0.06) / 0.28);
        color = [30 + 85 * light, 60 + 110 * light, 53 + 100 * light];
      }
      if (ring) color = [145, 190, 170];
      if (Math.hypot(u - 0.263, v + 0.145) < 0.017) color = [180, 230, 207];
      const pos = row + 1 + x * 4;
      data[pos] = color[0];
      data[pos + 1] = color[1];
      data[pos + 2] = color[2];
      data[pos + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    `${directory}orbit-${size}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(data)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
console.log("Ícones locais gerados: 180, 192 e 512 px.");
