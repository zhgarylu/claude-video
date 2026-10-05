// core.js: seeded textures (paper, wood, grain, ink blotch), colour constants, small canvas helpers.
// Everything is generated at load from fixed seeds: no files, no randomness between frames.
import { hash, clamp, lerp } from '/core/lib.js';

export const COL = { ink: '#1c1713', red: '#dc3a1f', green: '#3d8c4d', yellow: '#eaae28', indigo: '#2a4a90', peach: '#f5a78b' };
export const EDGE = { red: '#8e1a0c', green: '#1c4f2a', yellow: '#a8680e', indigo: '#101f4d', peach: '#c2604a' };
export const PAPER = '#f1e4c6';

export function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }

// periodic value noise (tiles seamlessly), anisotropic cells
function lattice(nx, ny, seed) {
  const a = new Float32Array(nx * ny);
  for (let i = 0; i < a.length; i++) a[i] = hash(i * 1.37 + seed * 91.7);
  return a;
}
export function pnoise(w, h, cx, cy, seed, oct = 4) {
  const out = new Float32Array(w * h); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const nx = Math.max(1, Math.round(w / cx) << o), ny = Math.max(1, Math.round(h / cy) << o);
    const L = lattice(nx, ny, seed + o * 7);
    for (let y = 0; y < h; y++) {
      const fy = y / h * ny, y0 = Math.floor(fy), ty = fy - y0, uy = ty * ty * (3 - 2 * ty), ya = y0 % ny, yb = (y0 + 1) % ny;
      for (let x = 0; x < w; x++) {
        const fx = x / w * nx, x0 = Math.floor(fx), tx = fx - x0, ux = tx * tx * (3 - 2 * tx), xa = x0 % nx, xb = (x0 + 1) % nx;
        const v = lerp(lerp(L[ya * nx + xa], L[ya * nx + xb], ux), lerp(L[yb * nx + xa], L[yb * nx + xb], ux), uy);
        out[y * w + x] += v * amp;
      }
    }
    tot += amp; amp *= .5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

const T = {};
export const TEX = T;

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }

// paper: warm base, long fibres, a few darker flecks
function makePaper(base, seed, size = 512) {
  const c = mk(size, size), x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
  const n1 = pnoise(size, size, 64, 64, seed, 4), n2 = pnoise(size, size, 128, 4, seed + 3, 3), [r, g, b] = hexRgb(base);
  for (let i = 0; i < size * size; i++) {
    const v = (n1[i] - .5) * 22 + (n2[i] - .5) * 12;
    d[i * 4] = clamp(r + v, 0, 255); d[i * 4 + 1] = clamp(g + v * .95, 0, 255); d[i * 4 + 2] = clamp(b + v * .85, 0, 255); d[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  x.lineCap = 'round';
  for (let i = 0; i < 260; i++) {                         // fibres
    const px = hash(i * 3.1 + seed) * size, py = hash(i * 5.7 + seed) * size, a = (hash(i * 1.9 + seed) - .5) * 1.6, l = 8 + hash(i * 8.3 + seed) * 26;
    x.strokeStyle = hash(i * 2.2 + seed) > .5 ? 'rgba(255,248,226,.20)' : 'rgba(120,90,50,.10)'; x.lineWidth = .8 + hash(i + seed) * .9;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + Math.cos(a) * l, py + oy + Math.sin(a) * l); x.stroke(); }
  }
  for (let i = 0; i < 30; i++) {                          // flecks
    const px = hash(i * 7.7 + seed) * size, py = hash(i * 4.4 + seed) * size;
    x.fillStyle = 'rgba(110,80,40,.18)'; x.beginPath(); x.arc(px, py, .8 + hash(i * 1.1) * 1.3, 0, 7); x.fill();
  }
  return c;
}

// wood: dark/light ramp along long horizontal grain
function makeWood(c1, c2, seed, size = 512, streak = 90) {
  const c = mk(size, size), x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
  const g = pnoise(size, size, streak, 5, seed, 4), w = pnoise(size, size, 256, 40, seed + 9, 3), [r1, g1, b1] = hexRgb(c1), [r2, g2, b2] = hexRgb(c2);
  for (let i = 0; i < size * size; i++) {
    let v = g[i] * .75 + w[i] * .25; v = clamp((v - .3) / .4, 0, 1);
    const ring = .5 + .5 * Math.sin((w[i] * 9 + g[i] * 3) * 6.283);
    v = clamp(v * .7 + ring * .3, 0, 1);
    d[i * 4] = lerp(r1, r2, v); d[i * 4 + 1] = lerp(g1, g2, v); d[i * 4 + 2] = lerp(b1, b2, v); d[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}

// alpha masks that are cut out of an ink layer
function makeGrainMask(seed, size = 512) {
  const c = mk(size, size), x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
  const g = pnoise(size, size, 160, 6, seed, 3), f = pnoise(size, size, 8, 8, seed + 5, 2);
  for (let i = 0; i < size * size; i++) {
    let a = clamp((g[i] - .56) / .22, 0, 1) * .22 + clamp((f[i] - .66) / .1, 0, 1) * .38;
    if (hash(i * .73 + seed * 11) > .9965) a = Math.max(a, .7);
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 0; d[i * 4 + 3] = clamp(a * 255, 0, 255);
  }
  x.putImageData(im, 0, 0); return c;
}
function makeBlotch(seed, size = 512) {
  const c = mk(size, size), x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
  const g = pnoise(size, size, 96, 96, seed, 3);
  for (let i = 0; i < size * size; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 0; d[i * 4 + 3] = clamp((g[i] - .42) / .35, 0, 1) * 70; }
  x.putImageData(im, 0, 0); return c;
}

export function initTextures() {
  T.paper = makePaper('#f1e4c6', 3);
  T.paperDeep = makePaper('#e3cf9f', 8);
  T.pear = makeWood('#d8b078', '#b88650', 5, 512, 120);
  T.table = makeWood('#5a3d28', '#3a2618', 12, 512, 150);
  T.plaster = makePaper('#e8c9a0', 17);
  T.grain = [makeGrainMask(21), makeGrainMask(34), makeGrainMask(57)];
  T.blotch = makeBlotch(44);
  return T;
}

// tile a pattern over a rect with an offset (so layers get different holes)
export function tileFill(ctx, tex, x, y, w, h, ox = 0, oy = 0) {
  const p = ctx.createPattern(tex, 'repeat'); ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = p; ctx.fillRect(x - ox, y - oy, w, h); ctx.restore();
}

export function roundRect(c, x, y, w, h, r) {
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
}
