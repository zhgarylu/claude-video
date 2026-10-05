// Lacquer & gold: the shared drawing kit. Canvas 2D only, deterministic (seeded), no state between frames.
import { clamp, lerp, seg, ss, eio, mulberry, hash, vnoise, TAU } from '/core/lib.js';
export { clamp, lerp, seg, ss, eio, mulberry, hash, vnoise, TAU };
export const W = 1920, H = 1080;

export const C = {
  black: '#0c0807', black2: '#1b110e', brown: '#2a1810',
  verm: '#b3261a', vermD: '#6e130d', vermL: '#d8452c',
  g0: '#4a3008', g1: '#7b5513', g2: '#c4952f', g3: '#ecc766', g4: '#fff1b8',
  wood: '#c9a674', paper: '#f2e6c8',
};
export function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export const ctx2 = c => c.getContext('2d');
export const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const ramp = (t, a, b) => clamp((t - a) / (b - a));

// ---- soft sprites (built once) -------------------------------------------------------------------------------
const SPR = {};
export function windowSprite() {
  if (SPR.win) return SPR.win;
  // a softbox window: 2 x 3 panes with dark mullions, blurred, fading toward the bottom
  const w = 560, h = 640, pad = 40, c = mk(w + pad * 2, h + pad * 2), g = ctx2(c);
  g.filter = 'blur(7px)'; g.fillStyle = '#fff';
  const pw = (w - 30) / 2, ph = (h - 60) / 3;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) g.fillRect(pad + i * (pw + 30), pad + j * (ph + 30), pw, ph);
  g.filter = 'none'; g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, pad, 0, pad + h); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.55, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return SPR.win = c;
}
export function blobSprite(r = 64) {   // soft round glow
  const k = 'blob' + r; if (SPR[k]) return SPR[k];
  const c = mk(r * 2, r * 2), g = ctx2(c), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return SPR[k] = c;
}
// tinted sprite (e.g. warm window) cache
export function tinted(spr, key, color) {
  const k = 'tint' + key; if (SPR[k]) return SPR[k];
  const c = mk(spr.width, spr.height), g = ctx2(c); g.drawImage(spr, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return SPR[k] = c;
}

// a diagonal band of light across the current clip: ang = direction of travel (radians), pos along it (px from origin)
export function sheenBand(g, cx, cy, ang, half, a, col = [255, 238, 205], blend = 'screen') {
  const nx = Math.cos(ang), ny = Math.sin(ang);
  const gr = g.createLinearGradient(cx - nx * half, cy - ny * half, cx + nx * half, cy + ny * half);
  const [r, gg, b] = col;
  gr.addColorStop(0, rgba(r, gg, b, 0)); gr.addColorStop(.38, rgba(r, gg, b, a * .18)); gr.addColorStop(.5, rgba(255, 255, 255, a)); gr.addColorStop(.62, rgba(r, gg, b, a * .18)); gr.addColorStop(1, rgba(r, gg, b, 0));
  g.save(); g.globalCompositeOperation = blend; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}

// ---- wood and cloth -------------------------------------------------------------------------------------------
export function woodTexture(w, h, seed = 3) {
  const c = mk(w, h), g = ctx2(c), R = mulberry(seed);
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#b98650'); bg.addColorStop(.5, '#a8763f'); bg.addColorStop(1, '#b58049');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // broad tonal bands
  for (let i = 0; i < 14; i++) { const y = R() * h, th = 40 + R() * 160; const gr = g.createLinearGradient(0, y - th, 0, y + th); gr.addColorStop(0, 'rgba(90,50,20,0)'); gr.addColorStop(.5, `rgba(90,50,20,${.05 + R() * .08})`); gr.addColorStop(1, 'rgba(90,50,20,0)'); g.fillStyle = gr; g.fillRect(0, y - th, w, th * 2); }
  g.lineCap = 'round';
  for (let i = 0; i < 1100; i++) {
    const y0 = R() * h, amp = 2 + R() * 9, fr = .002 + R() * .004, ph = R() * 9, x0 = -50 + R() * w * .6, len = 300 + R() * w * .7;
    g.strokeStyle = R() < .55 ? `rgba(70,38,14,${.05 + R() * .16})` : `rgba(235,205,150,${.04 + R() * .1})`; g.lineWidth = .5 + R() * 2.1;
    g.beginPath(); for (let x = 0; x <= len; x += 16) { const yy = y0 + Math.sin((x0 + x) * fr + ph) * amp + (x * .004 * Math.sin(ph)); x === 0 ? g.moveTo(x0 + x, yy) : g.lineTo(x0 + x, yy); } g.stroke();
  }
  for (let i = 0; i < 700; i++) { const x = R() * w, y = R() * h, l = 4 + R() * 12; g.strokeStyle = `rgba(60,30,10,${.08 + R() * .15})`; g.lineWidth = .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (R() - .5) * 1.2); g.stroke(); }
  return c;
}
export function hempPattern(g) {
  const c = mk(28, 28), p = ctx2(c); p.fillStyle = '#c9b48a'; p.fillRect(0, 0, 28, 28);
  p.strokeStyle = '#8f7a52'; p.lineWidth = 3.2;
  for (let i = 0; i < 2; i++) { p.beginPath(); p.moveTo(0, 7 + i * 14); p.lineTo(28, 7 + i * 14); p.stroke(); p.strokeStyle = '#e4d3aa'; p.lineWidth = 3.2; p.beginPath(); p.moveTo(7 + i * 14, 0); p.lineTo(7 + i * 14, 28); p.stroke(); p.strokeStyle = '#8f7a52'; }
  p.strokeStyle = 'rgba(60,40,20,.35)'; p.lineWidth = 1; for (let i = 0; i < 4; i++) { p.beginPath(); p.moveTo(0, i * 7 + 3.5); p.lineTo(28, i * 7 + 3.5); p.stroke(); }
  return g.createPattern(c, 'repeat');
}

// ---- gold line ------------------------------------------------------------------------------------------------
const taperW = (s, len, w) => {
  const a = Math.min(1, s / (len * .09 + 5)), b = Math.min(1, (len - s) / (len * .22 + 9));
  return w * (.3 + .7 * Math.pow(Math.min(a, b), .75)) * (.94 + .1 * vnoise(s * .045 + len));
};
function partial(s, p) {
  const n = s.pts.length, sMax = s.len * clamp(p);
  let k = 1; while (k < n && s.cum[k] <= sMax) k++;
  const pts = s.pts.slice(0, k), ss_ = s.cum.slice(0, k);
  if (k < n && sMax > s.cum[k - 1]) { const u = (sMax - s.cum[k - 1]) / (s.cum[k] - s.cum[k - 1]); pts.push([lerp(s.pts[k - 1][0], s.pts[k][0], u), lerp(s.pts[k - 1][1], s.pts[k][1], u)]); ss_.push(sMax); }
  return { pts, ss: ss_ };
}
const GOLD_PASSES = [['#bb8b2b', 0, 0, 1], ['#6b4a10', .2, .28, .5], ['#ffe9a0', -.16, -.22, .38]];
// draws the gold line up to progress p (0..1) with a raised edge: body, shaded lower-right rim, bright upper-left rim
export function goldStroke(g, s, p, col) {
  if (p <= 0) return null;
  const { pts, ss: sv } = partial(s, p); if (pts.length < 2) return null;
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (!s.taper) {
    for (const [c, ox, oy, k] of GOLD_PASSES) {
      g.strokeStyle = col && c === GOLD_PASSES[0][0] ? col : c; g.lineWidth = s.w * k;
      g.save(); g.translate(ox * s.w, oy * s.w); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); g.restore();
    }
  } else {
    const ws = sv.map(v => taperW(v, s.len, s.w));
    for (const [c, ox, oy, k] of GOLD_PASSES) {
      g.strokeStyle = col && c === GOLD_PASSES[0][0] ? col : c;
      for (let i = 1; i < pts.length; i++) {
        const w = ws[i]; g.lineWidth = w * k;
        g.beginPath(); g.moveTo(pts[i - 1][0] + ox * ws[i - 1], pts[i - 1][1] + oy * ws[i - 1]); g.lineTo(pts[i][0] + ox * w, pts[i][1] + oy * w); g.stroke();
      }
    }
  }
  return pts[pts.length - 1];
}
// metallic variation over a finished gold layer (call with the layer's context, after the strokes)
export function goldShade(g, w = W, h = H) {
  g.save(); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,230,150,.22)'); gr.addColorStop(.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,30,0,.34)');
  g.fillStyle = gr; g.setTransform(1, 0, 0, 1, 0, 0); g.fillRect(0, 0, w, h); g.restore();
}
export function goldGlow(g, x, y, r, a) {   // the wet bead at the head of a stroke
  const b = blobSprite(48); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
  g.drawImage(b, x - r, y - r, r * 2, r * 2); g.restore();
}

// ---- gold powder (maki-e) -------------------------------------------------------------------------------------
// build dots inside polygons (rejection sampling); each dot has a tone, a size, a landing order and, for strays, a clearing order
export function buildPowder(fills, seed = 11) {
  const R = mulberry(seed), g = ctx2(mk(2, 2)), dots = [];
  for (const f of fills) {
    const path = new Path2D(); f.poly.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y)); path.closePath();
    const xs = f.poly.map(p => p[0]), ys = f.poly.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const area = (x1 - x0) * (y1 - y0), N = Math.floor(area * f.dens * (f.mult || 1));
    const edge = f.edge, wd = f.width || 100;
    let made = 0, tries = 0;
    while (made < N && tries < N * 30) {
      tries++;
      const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0);
      if (!g.isPointInPath(path, x, y)) continue;
      let wgt = 1;
      if (edge) { let d = 1e9; for (let i = 0; i < edge.length; i += 3) d = Math.min(d, Math.hypot(edge[i][0] - x, edge[i][1] - y)); wgt = clamp(1 - d / wd, 0, 1); wgt = .1 + .9 * wgt * wgt; }
      if (f.radial) { const d = Math.hypot(x - f.radial[0], y - f.radial[1]) / f.radial[2]; wgt = clamp(1.05 - d, .12, 1); }
      if (f.grad) wgt = clamp((f.grad(x, y)), .08, 1);
      if (f.pivot) { const an = Math.atan2(y - f.pivot[1], x - f.pivot[0]); wgt *= (Math.floor(an * 11) & 1) ? .3 : 1; }
      if (R() > wgt) continue;
      dots.push({ x, y, r: .7 + R() * R() * 1.5, tone: Math.floor(R() * 4), land: R(), key: x, stray: false, sp: R() < .05 });
      made++;
    }
    // strays: scattered just outside the shape, swept away by the brush
    const NS = Math.floor(N * .22); made = 0; tries = 0;
    while (made < NS && tries < NS * 40) {
      tries++;
      const x = x0 - 30 + R() * (x1 - x0 + 60), y = y0 - 30 + R() * (y1 - y0 + 60);
      if (g.isPointInPath(path, x, y)) continue;
      let d = 1e9; for (let i = 0; i < f.poly.length; i += 2) d = Math.min(d, Math.hypot(f.poly[i][0] - x, f.poly[i][1] - y));
      if (d > 34 || R() > .5) continue;
      dots.push({ x, y, r: .6 + R() * R() * 1.3, tone: Math.floor(R() * 3), land: R(), key: x, stray: true, sp: false }); made++;
    }
  }
  return dots;
}
const TONES = ['#8a621c', '#c4952f', '#e6bf5a', '#fff0b4'];
// k: sprinkle progress 0..1, kb: brush progress 0..1 (sweeps strays away), x range for ordering
export function drawPowder(g, dots, k, kb, xr, t) {
  if (k <= 0) return;
  const [xa, xb] = xr, buckets = [[], [], [], []], streaks = [];
  for (const d of dots) {
    const kx = (d.key - xa) / (xb - xa);
    const start = clamp(kx * .55 + d.land * .35), u = clamp((k - start) / .1);
    if (u <= 0) continue;
    if (d.stray && kb > 0 && kb * 1.15 - (1 - kx) * .15 > d.land * .85) continue;   // swept
    let y = d.y;
    if (u < 1) { y = d.y - (1 - u) * (1 - u) * 190; streaks.push([d.x, y, d.x, y - 10 * (1 - u)]); }
    buckets[d.tone].push([d.x, y, d.r * (u < 1 ? .8 : 1)]);
  }
  for (let i = 0; i < 4; i++) {
    g.fillStyle = TONES[i]; g.beginPath();
    for (const [x, y, r] of buckets[i]) g.rect(x - r, y - r, r * 2, r * 2);
    g.fill();
  }
  if (streaks.length) { g.strokeStyle = 'rgba(255,230,160,.5)'; g.lineWidth = 1; g.beginPath(); for (const s of streaks) { g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); } g.stroke(); }
}

// ---- mother-of-pearl flecks ------------------------------------------------------------------------------------
export function buildPearl(rect, n, seed = 5) {
  const R = mulberry(seed), out = [];
  for (let i = 0; i < n; i++) {
    const sz = 2 + R() * R() * 7;
    out.push({ x: rect[0] + R() * rect[2], y: rect[1] + R() * rect[3], a: R() * TAU, sz, hue: R(), ph: R() * TAU });
  }
  return out;
}
// lit: 0..1 per fleck given a function of position (the sheen band) — they catch the light only where it passes
export function drawPearl(g, fl, litAt) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const f of fl) {
    const L = litAt(f.x, f.y, f); const a = .05 + .7 * L; if (a < .06) continue;
    const hue = 160 + f.hue * 160 + L * 50, c = `hsla(${hue},55%,${68 + L * 20}%,${a})`;
    g.fillStyle = c; g.beginPath();
    for (let k = 0; k < 4; k++) { const an = f.a + k * TAU / 4 + (k & 1) * .4, rr = f.sz * (k & 1 ? .55 : 1); k ? g.lineTo(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr * .6) : g.moveTo(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr * .6); }
    g.closePath(); g.fill();
  }
  g.restore();
}

// ---- tools ----------------------------------------------------------------------------------------------------
// a flat lacquer brush, tip at (x,y), handle toward the upper right at angle `ang` (radians from +x)
export function flatBrush(g, x, y, wid, ang = -.9, len = 520, tint = 1, hw = 1) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const hh = wid / 2;
  // handle
  const gr = g.createLinearGradient(0, -hh * .5, 0, hh * .5); gr.addColorStop(0, '#8a6038'); gr.addColorStop(.5, '#5c3c20'); gr.addColorStop(1, '#2e1c0e');
  g.fillStyle = gr; g.beginPath(); g.moveTo(len * .34, -hh * .42 * hw); g.lineTo(len, -hh * .3 * hw); g.lineTo(len, hh * .3 * hw); g.lineTo(len * .34, hh * .42 * hw); g.closePath(); g.fill();
  // ferrule (bamboo wrap)
  g.fillStyle = '#d2b078'; g.fillRect(len * .2, -hh * .58 * hw, len * .14, hh * 1.16 * hw); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(len * .27, -hh * .58 * hw, 3, hh * 1.16 * hw);
  // hair: tapering block with streaks
  g.fillStyle = `rgb(${34 * tint | 0},${22 * tint | 0},${16 * tint | 0})`;
  g.beginPath(); g.moveTo(len * .2, -hh * .58); g.lineTo(len * .02, -hh); g.lineTo(0, -hh * .88); g.lineTo(0, hh * .88); g.lineTo(len * .02, hh); g.lineTo(len * .2, hh * .58); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,220,180,.18)'; g.lineWidth = 1; for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(len * .19, i * hh * .09); g.lineTo(2, i * hh * .14); g.stroke(); }
  g.restore();
}
export function seal(g, cx, cy, size, a = 1) {
  // a seal: vermilion square, carved-out glyph for "gold" (金) drawn from strokes
  g.save(); g.globalAlpha = a; g.translate(cx, cy);
  const s = size, h = s / 2;
  g.fillStyle = '#b3261a'; g.beginPath(); g.roundRect(-h, -h, s, s, s * .05); g.fill();
  g.strokeStyle = '#f2d78a'; g.lineCap = 'round'; g.lineJoin = 'round';
  const L = (w, ...p) => { g.lineWidth = w * s; g.beginPath(); g.moveTo(p[0] * s, p[1] * s); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] * s, p[i + 1] * s); g.stroke(); };
  L(.07, -.30, -.24, 0, -.40, .30, -.24);            // roof (人)
  L(.06, -.22, -.18, .22, -.18);                     // bar
  L(.06, -.28, -.02, .28, -.02);                     // upper stroke
  L(.06, -.33, .22, .33, .22);                       // lower stroke
  L(.06, 0, -.18, 0, .30);                           // centre line
  L(.05, -.20, .06, -.16, .12); L(.05, .20, .06, .16, .12);    // the two dots
  g.lineWidth = s * .035; g.strokeRect(-h * .88, -h * .88, s * .88, s * .88);
  g.restore();
}
