// Generates public/icons/{apple-touch-icon,icon-192x192,icon-512x512}.png
// No dependencies — uses only Node.js built-in zlib.
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const lenBuf  = Buffer.allocUnsafe(4); lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf  = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ── PNG encoder (RGB, no alpha) ────────────────────────────────────────────
function encodePNG(w, h, pixels /* Uint8Array, row-major RGB */) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = Buffer.allocUnsafe(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 3;
      const dst = y * (1 + w * 3) + 1 + x * 3;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Pixel renderer ─────────────────────────────────────────────────────────
// Colors
const BG   = [0x02, 0x06, 0x17]; // #020617  slate-950
const GLOW = [0x0c, 0x18, 0x38]; // subtle inner glow
const CYAN = [0x22, 0xd3, 0xee]; // #22d3ee  cyan-400
const WHITE= [0xff, 0xff, 0xff];

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Signed-distance helpers for smooth edges (anti-aliasing via SDF)
function sdCircle(px, py, cx, cy, r) {
  return Math.sqrt((px-cx)**2 + (py-cy)**2) - r;
}

// Coverage from a signed distance (positive = outside)
function coverage(sd, aaWidth = 1.2) {
  return Math.max(0, Math.min(1, 0.5 - sd / aaWidth));
}

function getColor(x, y, size) {
  // Normalise to [-1, 1]
  const nx = (x / size) * 2 - 1;
  const ny = (y / size) * 2 - 1;

  // Pin geometry (in normalised space)
  const headCX = 0, headCY = -0.18, headR = 0.46;
  const holeR  = 0.20;
  const tipY   = 0.82;

  const aa = 2.5 / size; // anti-alias band in normalised units

  // ── outer pin (head circle + body wedge) ──
  const sdHead = sdCircle(nx, ny, headCX, headCY, headR);

  // Body: isosceles triangle from bottom of head to tip
  // Width at a given ny: linearly tapers from headR at headCY to 0 at tipY
  const bodyTop = headCY;
  const bodyBottom = tipY;
  let sdBody = 1; // outside by default
  if (ny >= bodyTop - headR * 0.3 && ny <= bodyBottom) {
    const t = (ny - bodyTop) / (bodyBottom - bodyTop);
    const halfW = headR * (1 - t);
    sdBody = Math.max(Math.abs(nx) - halfW, ny - bodyBottom);
  }

  const sdPin = Math.min(sdHead, sdBody);

  // ── inner hole ──
  const sdHole = sdCircle(nx, ny, headCX, headCY, holeR);

  // Coverages
  const pinCov  = coverage(sdPin,  aa);
  const holeCov = coverage(sdHole, aa);

  // Net pin pixel = pin AND NOT hole
  const netPin = pinCov * (1 - holeCov);

  if (netPin <= 0) {
    // Background with subtle radial glow toward center
    const dist = Math.sqrt(nx*nx + ny*ny);
    const glowT = Math.max(0, 1 - dist / 1.0) * 0.4;
    return lerp(BG, GLOW, glowT);
  }

  if (netPin >= 1) return CYAN;

  // Blend edge against background
  const bg = lerp(BG, GLOW, Math.max(0, 1 - Math.sqrt(nx*nx+ny*ny)) * 0.3);
  return lerp(bg, CYAN, netPin);
}

// ── Render & save ──────────────────────────────────────────────────────────
function renderIcon(size) {
  // 4× supersampling for crisp edges at small sizes
  const ss = 4;
  const pixels = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const fx = x + (sx + 0.5) / ss;
          const fy = y + (sy + 0.5) / ss;
          const [cr, cg, cb] = getColor(fx, fy, size);
          r += cr; g += cg; b += cb;
        }
      }
      const n = ss * ss;
      pixels[(y * size + x) * 3]     = Math.round(r / n);
      pixels[(y * size + x) * 3 + 1] = Math.round(g / n);
      pixels[(y * size + x) * 3 + 2] = Math.round(b / n);
    }
  }
  return encodePNG(size, size, pixels);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, size] of [
  ['icon-512x512.png', 512],
  ['icon-192x192.png', 192],
  ['apple-touch-icon.png', 180],
]) {
  const buf = renderIcon(size);
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`✓ ${name}  (${buf.length} bytes)`);
}
