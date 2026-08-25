#!/usr/bin/env node
/**
 * ENGRAM icon generator — zero-dependency PNG rasterizer.
 * Draws the "neural spark" glyph on a violet→cyan gradient and encodes PNGs
 * with Node's builtin zlib. Run: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---------- tiny PNG encoder ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------
const VIOLET = [168, 85, 247];
const CYAN = [34, 211, 238];
const WHITE = [245, 247, 250];

const dist2Seg = (px, py, ax, ay, bx, by) => {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1)));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
};

/** SDF coverage helper: distance (px) → 0..1 with ~1.5px anti-aliased edge. */
const covFromDistPx = (dPx) => Math.min(1, Math.max(0, 0.75 - dPx / 1.5));

/**
 * Coverage of the "engram" glyph at (u,v) in unit space.
 * Central node + 5 satellites + spokes — a memory constellation.
 */
function glyphCoverage(u, v, pixelSize, glyphScale) {
  // normalize into glyph-local space (centered on the hub)
  const lu = (u - 0.5) / glyphScale + 0.5;
  const lv = (v - 0.52) / glyphScale + 0.52;

  const nodes = [
    [0.5, 0.52, 0.105],
    [0.27, 0.3, 0.062],
    [0.76, 0.26, 0.056],
    [0.82, 0.62, 0.062],
    [0.56, 0.83, 0.05],
    [0.22, 0.72, 0.056],
  ];
  const spokes = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [3, 4],
  ];

  let cov = 0;
  for (const [nx, ny, nr] of nodes) {
    const dPx = (Math.hypot(lu - nx, lv - ny) - nr) * pixelSize;
    cov = Math.max(cov, covFromDistPx(dPx));
  }
  const spokeW = 0.02;
  for (const [a, b] of spokes) {
    const dPx = (dist2Seg(lu, lv, nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1]) - spokeW) * pixelSize;
    cov = Math.max(cov, covFromDistPx(dPx));
  }
  return cov;
}

function render(size, { rounded = true, maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.225;
  const ss = 2; // supersampling factor
  const glyphScale = maskable ? 0.68 : 0.92; // keep glyph inside maskable safe zone

  const gradAt = (u, v) => {
    const t = Math.max(0, Math.min(1, (u + v) / 2));
    return [
      VIOLET[0] + (CYAN[0] - VIOLET[0]) * t,
      VIOLET[1] + (CYAN[1] - VIOLET[1]) * t,
      VIOLET[2] + (CYAN[2] - VIOLET[2]) * t,
    ];
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const u = (x + (sx + 0.5) / ss) / size;
          const v = (y + (sy + 0.5) / ss) / size;

          // background coverage (rounded corners)
          let bg = 1;
          if (!maskable && rounded) {
            const cu = Math.max(radius / size, Math.min(u, 1 - radius / size));
            const cv = Math.max(radius / size, Math.min(v, 1 - radius / size));
            const dOut = (Math.hypot(u - cu, v - cv) - radius / size) * size;
            bg = covFromDistPx(dOut); // negative inside → coverage 1
          }

          const [gr, gg, gb] = gradAt(u, v);
          const gcov = glyphCoverage(u, v, size, glyphScale) * 0.97;
          const pr = gr * (1 - gcov) + WHITE[0] * gcov;
          const pg = gg * (1 - gcov) + WHITE[1] * gcov;
          const pb = gb * (1 - gcov) + WHITE[2] * gcov;

          r += pr * bg;
          g += pg * bg;
          b += pb * bg;
          a += bg;
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round((a / n) * 255);
    }
  }
  return encodePNG(size, size, rgba);
}

const targets = [
  ['icon-512.png', 512, {}],
  ['icon-192.png', 192, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { rounded: false }],
];

for (const [name, size, opts] of targets) {
  const png = render(size, opts);
  writeFileSync(join(outDir, name), png);
  console.log(`wrote public/icons/${name} (${(png.length / 1024).toFixed(1)} kB)`);
}
console.log('done');
