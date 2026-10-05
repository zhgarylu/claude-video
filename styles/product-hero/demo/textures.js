// Procedural surface textures, drawn once into canvases (seeded: the same on every worker).
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';

function canvasTex(c, { srgb = false, rep = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true; return t;
}

// brushed steel: fine streaks that run around the circumference (constant along u), a little dust in the roughness
export function brushedRoughness(seed = 7) {
  const W = 1024, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), im = g.createImageData(W, H), r = mulberry(seed);
  const rows = new Float32Array(H), fine = new Float32Array(H);
  for (let y = 0; y < H; y++) { rows[y] = r(); fine[y] = r(); }
  for (let y = 0; y < H; y++) {
    const a = rows[y], b = rows[(y + 1) % H], d = fine[y];
    for (let x = 0; x < W; x++) {
      // low-frequency wobble along the streak so lines are not perfectly uniform
      const w = .5 + .5 * Math.sin(x * .011 + a * 40 + y * .003);
      let v = .5 + (a - .5) * .12 + (d - .5) * .10 + (w - .5) * .04 * (b - .3) + (r() - .5) * .10;
      v = Math.max(0, Math.min(1, v));
      const i = (y * W + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = Math.round(v * 255); im.data[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0); return canvasTex(c, { rep: [1, 1] });
}

// leather grain: Voronoi ridges (F2 - F1) as a height map, plus wrinkle noise
export function leatherBump(seed = 11, cell = 15) {
  const W = 1024, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), im = g.createImageData(W, H), r = mulberry(seed);
  const N = W / cell | 0, px = new Float32Array(N * N), py = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { px[i] = r(); py[i] = r(); }
  const cs = W / N;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const cx = x / cs | 0, cy = y / cs | 0; let f1 = 9, f2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = (cx + i + N) % N, gy = (cy + j + N) % N, k = gy * N + gx;
      const dx = (cx + i + px[k]) * cs - x, dy = (cy + j + py[k]) * cs - y, d = Math.hypot(dx, dy);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    const edge = Math.min(1, (f2 - f1) / (cs * .30));
    let h = .25 + .75 * Math.sqrt(edge);            // pebble tops are high, creases low
    h *= .94 + .06 * Math.sin(x * .05 + Math.sin(y * .031) * 3);
    const i = (y * W + x) * 4; const v = Math.round(h * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return canvasTex(c, { rep: [1.6, 1] });
}

// leather colour: tan with soft darker patches and a few lighter scuffs
export function leatherColor(seed = 5) {
  const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = mulberry(seed);
  g.fillStyle = '#b7814a'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H, rad = 30 + r() * 120, dark = r() < .6;
    for (const ox of [-W, 0, W]) {
      const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
      gr.addColorStop(0, dark ? 'rgba(80,45,20,.10)' : 'rgba(225,175,115,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
  }
  return canvasTex(c, { srgb: true, rep: [1, 1] });
}

// ceramic glaze: very faint orange-peel bump
export function glazeBump(seed = 3) {
  const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), im = g.createImageData(W, H), r = mulberry(seed);
  const base = new Float32Array(64 * 64); for (let i = 0; i < base.length; i++) base[i] = r();
  const s = (x, y) => base[((y % 64 + 64) % 64) * 64 + ((x % 64 + 64) % 64)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x / 8, fy = y / 8, ix = fx | 0, iy = fy | 0, ux = fx - ix, uy = fy - iy, sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
    const v = (s(ix, iy) * (1 - sx) + s(ix + 1, iy) * sx) * (1 - sy) + (s(ix, iy + 1) * (1 - sx) + s(ix + 1, iy + 1) * sx) * sy;
    const i = (y * W + x) * 4; const q = Math.round((.5 + (v - .5) * .5) * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = q; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return canvasTex(c, { rep: [4, 2] });
}
