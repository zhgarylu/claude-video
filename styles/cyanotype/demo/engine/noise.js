// Seeded value noise (2D) and small helpers shared by the plate, the board and the water.
import { mulberry } from '/core/lib.js';

export function makeNoise(seed) {
  const rnd = mulberry(seed), g = new Float32Array(256 * 256);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) << 8, y1 = ((yi + 1) & 255) << 8;
    const a = g[y0 | x0], b = g[y0 | x1], c = g[y1 | x0], d = g[y1 | x1];
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (x, y, oct = 4, gain = 0.5) => {
    let s = 0, a = 1, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * n2(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= gain; f *= 2; }
    return s / n;
  };
  const n1 = x => n2(x, 3.7);
  return { n2, fbm, n1, rnd };
}

// separable box blur on a Float32 map (two passes ~ a soft gaussian); returns a new map
export function boxBlur(src, w, h, r, passes = 2) {
  let cur = Float32Array.from(src); const tmp = new Float32Array(w * h), k = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const o = y * w; let s = 0;
      for (let x = -r; x <= r; x++) s += cur[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[o + x] = s * k;
        s += cur[o + Math.min(w - 1, x + r + 1)] - cur[o + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        cur[y * w + x] = s * k;
        s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
  }
  return cur;
}
