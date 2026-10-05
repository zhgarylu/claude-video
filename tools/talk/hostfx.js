// Put the host IN a style: restyle the presenter's video frames (halftone dots, 8-bit pixels, ASCII, engraving lines, flat comic, duotone, ink, neon).
//
//   import { loadHost } from '/tools/talk/host.js';
//   import { fxFrames, FX } from '/tools/talk/hostfx.js';
//   const host = await loadHost('src');
//   host.frames = fxFrames(host, 'halftone', { cutout: true });      // drop-in: every layout that draws host.frames[k] now draws the restyled frame
//
// opts (all optional): cutout (true: only the person, from src/matte, on transparent), size (working width, default 960), plus the kind's own:
//   halftone { cell: 9, ink: '#16171b', paper: '#efe9dc', angle: 45 }     pixel { cols: 160, levels: 4, palette: ['#...'] }
//   ascii { cell: 9, ramp: ' .:-=+*#%@', ink: '#d8e6d0', paper: '#07100a', color: false }     engrave { gap: 7, ink: '#1a1612', paper: '#efe6d2' }
//   comic { levels: 4, outline: 0.5, palette: ['#...' ...] }     duotone { dark: '#13294b', light: '#f2d8a7', grain: 0.12 }
//   ink { paper: '#f1ece0', ink: '#14110f' }     neon { color: '#ff3df0', glow: 3 }
// Pure canvas 2D, no randomness: the same frame gives the same pixels. Frames are made on demand and the last 40 are kept.
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const lum = (r, g, b) => (.299 * r + .587 * g + .114 * b) / 255;
function sobel(L, w, h) {                                         // edge strength 0..1 of a luminance plane
  const E = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1], gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1]; E[i] = Math.min(1, Math.hypot(gx, gy) * .6); }
  return E;
}
function blur(L, w, h, r) {
  const t = new Float32Array(w * h), o = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { let a = 0; for (let x = -r; x <= r; x++) a += L[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { t[y * w + x] = a / n; a += L[y * w + Math.min(w - 1, x + r + 1)] - L[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let a = 0; for (let y = -r; y <= r; y++) a += t[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { o[y * w + x] = a / n; a += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return o;
}
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };

// stretch the frame's own tonal range (5th..95th percentile of luminance) so a dark shirt and a bright hall both keep detail in the one-ink styles
function levels(D, w, h) {
  const hist = new Uint32Array(256); for (let i = 0; i < w * h; i += 7) hist[Math.round(lum(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]) * 255)]++;
  const tot = hist.reduce((a, b) => a + b, 0); let a = 0, lo = 0, hi = 255; for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= tot * .05) { lo = v; break; } } a = 0; for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= tot * .95) { hi = v; break; } }
  const sc = 255 / Math.max(40, hi - lo), out = new Uint8ClampedArray(D.length); for (let i = 0; i < D.length; i++) out[i] = i % 4 === 3 ? 255 : (D[i] - lo) * sc; return out;
}
// each kind: (rgbaImageData, w, h, opts) -> canvas (w x h), alpha handled by the caller
const KINDS = {
  halftone(D, w, h, o) {
    D = levels(D, w, h);
    const cell = o.cell ?? 9, ink = o.ink ?? '#16171b', paper = o.paper ?? '#efe9dc', ang = (o.angle ?? 45) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    const out = mk(w, h), g = out.getContext('2d'); g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = ink;
    const diag = Math.hypot(w, h), n = Math.ceil(diag / cell);
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const u = i * cell, v = j * cell, x = w / 2 + u * ca - v * sa, y = h / 2 + u * sa + v * ca; if (x < 0 || y < 0 || x >= w || y >= h) continue;
      let L = 0, c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = Math.min(w - 1, Math.max(0, (x + dx * cell * .3) | 0)), yy = Math.min(h - 1, Math.max(0, (y + dy * cell * .3) | 0)), p = (yy * w + xx) * 4; L += lum(D[p], D[p + 1], D[p + 2]); c++; }
      const dark = 1 - L / c, r = Math.sqrt(dark) * cell * .62; if (r > .35) { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); }
    }
    return out;
  },
  pixel(D, w, h, o) {
    const cols = o.cols ?? 160, rows = Math.round(cols * h / w), lv = o.levels ?? 4, pal = o.palette ? o.palette.map(hex) : null;
    const small = mk(cols, rows), sg = small.getContext('2d', { willReadFrequently: true }); const src = mk(w, h); src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(D), w, h), 0, 0);
    sg.imageSmoothingEnabled = true; sg.drawImage(src, 0, 0, cols, rows); const S = sg.getImageData(0, 0, cols, rows), d = S.data;
    for (let i = 0; i < cols * rows; i++) {
      let r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      if (pal) { let best = 0, bd = 1e9; for (let k = 0; k < pal.length; k++) { const q = (r - pal[k][0]) ** 2 + (g - pal[k][1]) ** 2 + (b - pal[k][2]) ** 2; if (q < bd) { bd = q; best = k; } } [r, g, b] = pal[best]; }
      else { const s = 255 / (lv - 1); r = Math.round(r / s) * s; g = Math.round(g / s) * s; b = Math.round(b / s) * s; }
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    sg.putImageData(S, 0, 0); const out = mk(w, h), g2 = out.getContext('2d'); g2.imageSmoothingEnabled = false; g2.drawImage(small, 0, 0, w, h); return out;
  },
  ascii(D, w, h, o) {
    D = levels(D, w, h);
    const cell = o.cell ?? 9, ramp = o.ramp ?? ' .:-=+*#%@', ink = o.ink ?? '#d8e6d0', paper = o.paper ?? '#07100a', col = !!o.color, ch = Math.round(cell * 1.7);
    const out = mk(w, h), g = out.getContext('2d'); g.fillStyle = paper; g.fillRect(0, 0, w, h); g.font = `700 ${Math.round(cell * 1.5)}px ui-monospace, Menlo, Consolas, monospace`; g.textBaseline = 'top';
    for (let y = 0; y + ch <= h; y += ch) for (let x = 0; x + cell <= w; x += cell) {
      let R = 0, G = 0, B = 0, c = 0; for (let yy = y; yy < y + ch; yy += 3) for (let xx = x; xx < x + cell; xx += 3) { const p = (yy * w + xx) * 4; R += D[p]; G += D[p + 1]; B += D[p + 2]; c++; }
      R /= c; G /= c; B /= c; const L = lum(R, G, B), k = Math.min(ramp.length - 1, Math.floor(L ** 1.2 * ramp.length)); if (ramp[k] === ' ') continue;
      g.fillStyle = col ? `rgb(${R | 0},${G | 0},${B | 0})` : ink; g.fillText(ramp[k], x, y);
    }
    return out;
  },
  engrave(D, w, h, o) {
    D = levels(D, w, h);
    const gap = o.gap ?? 6, ink = o.ink ?? '#1a1612', paper = o.paper ?? '#efe6d2', out = mk(w, h), g = out.getContext('2d'); g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = ink;
    const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = lum(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]); const B = blur(L, w, h, 2);
    for (let y = gap / 2; y < h; y += gap) { let x = 0; while (x < w) { const l = B[(y | 0) * w + x], t = (1 - l) ** 1.1 * gap * .95; if (t > .5) { let x2 = x; const base = (y | 0) * w; while (x2 < w && Math.abs((1 - B[base + x2]) ** 1.1 * gap * .95 - t) < .6) x2 += 2; g.beginPath(); g.moveTo(x, y - t / 2); g.lineTo(x2, y - t / 2); g.lineTo(x2, y + t / 2); g.lineTo(x, y + t / 2); g.fill(); x = x2; } else x += 2; } }
    return out;
  },
  comic(D, w, h, o) {
    const lv = o.levels ?? 4, olw = o.outline ?? .5, pal = o.palette ? o.palette.map(hex) : null, L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = lum(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]); const E = sobel(blur(L, w, h, 1), w, h), out = new ImageData(w, h), d = out.data;
    for (let i = 0; i < w * h; i++) {
      let r = D[i * 4], g = D[i * 4 + 1], b = D[i * 4 + 2]; const s = 255 / (lv - 1);
      if (pal) { const k = Math.min(pal.length - 1, Math.floor(L[i] * pal.length)); [r, g, b] = pal[k]; } else { r = Math.round(r / s) * s; g = Math.round(g / s) * s; b = Math.round(b / s) * s; const m = (r + g + b) / 3; const boost = 1.25; r = Math.min(255, m + (r - m) * boost); g = Math.min(255, m + (g - m) * boost); b = Math.min(255, m + (b - m) * boost); }
      const e = Math.min(1, E[i] * 2.4 * olw / .5); d[i * 4] = r * (1 - e); d[i * 4 + 1] = g * (1 - e); d[i * 4 + 2] = b * (1 - e); d[i * 4 + 3] = 255;
    }
    const out2 = mk(w, h); out2.getContext('2d').putImageData(out, 0, 0); return out2;
  },
  duotone(D, w, h, o) {
    const dk = hex(o.dark ?? '#13294b'), lt = hex(o.light ?? '#f2d8a7'), grain = o.grain ?? .12, out = new ImageData(w, h), d = out.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; let l = lum(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]); l = Math.min(1, Math.max(0, (l - .5) * 1.25 + .5 + (hash(x >> 1, y >> 1) - .5) * grain)); const c = lerp3(dk, lt, l); d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
    const c2 = mk(w, h); c2.getContext('2d').putImageData(out, 0, 0); return c2;
  },
  ink(D, w, h, o) {
    const paper = hex(o.paper ?? '#f1ece0'), ink = hex(o.ink ?? '#14110f'), L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = lum(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]);
    const B = blur(L, w, h, 3), E = sobel(blur(L, w, h, 1), w, h), out = new ImageData(w, h), d = out.data;
    for (let i = 0; i < w * h; i++) { let t = Math.max(0, 1 - B[i] * 1.5); t = Math.min(1, Math.floor(t * 4 + .35) / 4 * .8 + E[i] * 1.2); const c = lerp3(paper, ink, t); d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
    const c2 = mk(w, h); c2.getContext('2d').putImageData(out, 0, 0); return c2;
  },
  neon(D, w, h, o) {
    const col = hex(o.color ?? '#ff3df0'), L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = lum(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]);
    const E = sobel(blur(L, w, h, 1), w, h), G = blur(E, w, h, Math.round((o.glow ?? 3) * 2)), out = new ImageData(w, h), d = out.data;
    for (let i = 0; i < w * h; i++) { const v = Math.min(1, E[i] * 1.6 + G[i] * 2.2), core = Math.min(1, E[i] * 2); d[i * 4] = Math.min(255, col[0] * v + 255 * core * .6); d[i * 4 + 1] = Math.min(255, col[1] * v + 255 * core * .6); d[i * 4 + 2] = Math.min(255, col[2] * v + 255 * core * .6); d[i * 4 + 3] = 255; }
    const c2 = mk(w, h); c2.getContext('2d').putImageData(out, 0, 0); return c2;
  },
};
export const FX = Object.keys(KINDS);

export function fxFrames(host, kind, opts = {}) {
  if (!KINDS[kind]) throw new Error(`hostfx: unknown kind "${kind}" (${FX.join(', ')})`);
  const src = host.frames, W0 = opts.size ?? 960, w = Math.min(W0, host.w), h = Math.round(w * host.h / host.w), cache = new Map(), mats = host.matte;
  const work = mk(w, h), wg = work.getContext('2d', { willReadFrequently: true }), mcv = mk(w, h), mg = mcv.getContext('2d', { willReadFrequently: true });
  const build = k => {
    wg.clearRect(0, 0, w, h); wg.drawImage(src[k], 0, 0, w, h); const D = wg.getImageData(0, 0, w, h).data;
    const styled = KINDS[kind](D, w, h, opts);
    if (opts.cutout && mats) {                                      // keep only the person: soft matte from src/matte
      const out = mk(w, h), og = out.getContext('2d'); og.drawImage(styled, 0, 0); og.globalCompositeOperation = 'destination-in'; og.drawImage(mats[k], 0, 0, w, h); return out;
    }
    return styled;
  };
  const get = k => { if (!cache.has(k)) { cache.set(k, build(k)); if (cache.size > 40) cache.delete(cache.keys().next().value); } return cache.get(k); };
  return new Proxy(src, { get(t, p, r) { if (typeof p === 'string' && /^\d+$/.test(p)) { const k = +p; return k >= 0 && k < t.length ? get(k) : undefined; } return Reflect.get(t, p, r); } });
}
