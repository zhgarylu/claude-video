// The Plate: one sheet of hand-coated paper, from bare fibre to a washed, dried print.
// Maps (all in sheet pixels): paper alpha (deckled edge), tooth (fibre shading), coat (brushed thickness, with beads and
// pin holes), ck (when the brush reached each pixel), L (UV light that gets through whatever lies on the sheet),
// front (the order in which the wash reaches each pixel), sheen, tide (stain left by water: tide lines and drips).
// render(st) turns a state into pixels: coat -> exposure -> wash -> dry.
import { clamp, lerp } from '/core/lib.js';
import { makeNoise, boxBlur } from './noise.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function lut(stops, n) {            // stops: [[pos, r, g, b], ...] over 0..1 -> Uint8Array(n*3)
  const o = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1); let k = 0; while (k < stops.length - 2 && p > stops[k + 1][0]) k++;
    const a = stops[k], b = stops[k + 1], u = clamp((p - a[0]) / (b[0] - a[0]));
    for (let c = 0; c < 3; c++) o[i * 3 + c] = lerp(a[c + 1], b[c + 1], u);
  }
  return o;
}
// unwashed colour by exposure (0 = untouched coat, 1 = deeply exposed, past that bronzes)
const PRE = lut([[0, 207, 216, 126], [.07, 178, 203, 138], [.2, 120, 164, 156], [.38, 70, 118, 146], [.55, 52, 88, 124], [.75, 52, 72, 98], [1, 74, 70, 74]], 512);
const PRE_WET = lut([[0, 176, 196, 92], [.07, 150, 186, 112], [.2, 100, 150, 140], [.38, 58, 106, 136], [.55, 44, 78, 114], [.75, 46, 64, 90], [1, 66, 62, 66]], 512);
// washed colour by blue density (0 = paper, 1 = full Prussian)
const POST = lut([[0, 244, 240, 228], [.03, 226, 237, 236], [.12, 178, 215, 228], [.28, 100, 163, 205], [.5, 34, 100, 162], [.75, 16, 62, 120], [.9, 10, 44, 96], [1, 7, 30, 72]], 512);

export class Plate {
  constructor(o) {
    const { w, h, seed = 1, margin = 8 } = o; this.w = w; this.h = h; this.o = o;
    const N = makeNoise(seed), n = w * h; this.N = N;
    this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h;
    this.cx = this.cv.getContext('2d'); this.img = this.cx.createImageData(w, h);
    // ---- the deckled edge
    const alpha = this.alpha = new Float32Array(n);
    const deck = o.deckle ?? 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = Math.min(x - margin, w - margin - x, y - margin, h - margin - y);
      const wob = (N.fbm(x * 0.045, y * 0.045, 3) - 0.5) * 16 * deck + (N.n2(x * 0.5, y * 0.5) - 0.5) * 4.5 * deck + (N.n2(x * 0.11 + 40, y * 0.11) - 0.5) * 6 * deck;
      alpha[y * w + x] = ss(-0.5, 1.5, d + wob);
    }
    // ---- paper tooth and fibre
    const tc = document.createElement('canvas'); tc.width = w; tc.height = h; const g = tc.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    const rnd = N.rnd; let sd = seed * 977;
    const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    g.lineCap = 'round';
    for (let i = 0; i < Math.round(w * h / 420); i++) {
      const x = r() * w, y = r() * h, L = 6 + r() * 30, a = r() * 6.283, cu = (r() - .5) * 0.9;
      g.strokeStyle = r() < 0.62 ? `rgba(255,255,255,${0.10 + r() * 0.22})` : `rgba(0,0,0,${0.05 + r() * 0.12})`;
      g.lineWidth = 0.5 + r() * 0.9; g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + cu) * L * .5, y + Math.sin(a + cu) * L * .5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    const td = g.getImageData(0, 0, w, h).data, tooth = this.tooth = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      tooth[i] = 1 + (td[i * 4] - 128) / 128 * 0.16 + (N.fbm(x * 0.012, y * 0.012, 3) - 0.5) * 0.06 + (N.n2(x * 0.7, y * 0.7) - 0.5) * 0.045 + (N.n2(x * 0.19, y * 0.23) - 0.5) * 0.03;
    }
    // ---- the coat
    this.paintCoat(o.coat);
    // ---- light map: 1 everywhere until objects are laid down
    this.L = new Float32Array(n).fill(1);
    this.front = new Float32Array(n); this.setFront(o.front || ((x, y) => x / w));
    this.sheen = new Float32Array(n); const sfx = (o.sheen && o.sheen.fx) || 0.014, sfy = (o.sheen && o.sheen.fy) || 0.02;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.sheen[y * w + x] = Math.pow(clamp((N.fbm(x * sfx + 7, y * sfy + 3, 3) - 0.5) * 4.2), 1.4);
    this.tide = new Float32Array(n);
    this.paintTide(o.tide || {});
    this.cache = null;
  }

  paintCoat(c) {
    const { w, h, N } = this, n = w * h;
    const coat = this.coat = new Float32Array(n), ck = this.ck = new Float32Array(n).fill(1e9);
    if (!c) return;
    const sh = c.strokeH || 120, step = sh * 0.76, rows = Math.max(1, Math.round((c.y1 - c.y0 - sh) / step) + 1);
    this.nStrokes = rows;
    for (let j = 0; j < rows; j++) {
      const yc = c.y0 + sh / 2 + j * (c.y1 - c.y0 - sh) / Math.max(1, rows - 1), seed = j * 13.7 + 5;
      const sx0 = c.x0 + (N.n1(seed) - .5) * 26, sx1 = c.x1 + (N.n1(seed + 50) - .5) * 26;
      const ya = Math.floor(yc - sh / 2 - 3), yb = Math.ceil(yc + sh / 2 + 3);
      for (let y = Math.max(0, ya); y < Math.min(h, yb); y++) {
        const across = (y - yc) / (sh / 2), yj = (N.n1(y * 0.3 + seed) - .5) * 0.10;
        if (Math.abs(across) > 1.4) continue;
        const bristle = 0.80 + 0.20 * N.n2(y * 0.55 + seed, 1.7) + 0.08 * (N.n2(y * 2.1, seed) - .5);
        const rj0 = (N.n1(y * 0.09 + seed) - .5) * 30, rj1 = (N.n1(y * 0.09 + seed + 30) - .5) * 30;
        for (let x = Math.max(0, Math.floor(sx0 - 40)); x < Math.min(w, Math.ceil(sx1 + 40)); x++) {
          const ex = ss(0, 26, x - (sx0 + rj0)) * ss(0, 26, (sx1 + rj1) - x);
          if (ex <= 0) continue;
          const wob = (N.n1(x * 0.011 + seed) - .5) * 0.2 + (N.n1(x * 0.08 + seed * 3) - .5) * 0.06;
          const ev = ss(1, 0.80, Math.abs(across + wob) + yj);
          if (ev <= 0) continue;
          const along = 0.92 + 0.18 * (N.n2(x * 0.004 + seed, y * 0.35) - .5) + 0.10 * (N.n2(x * 0.03, y * 0.08 + seed) - .5);
          const v = ev * ex * bristle * along * (c.thick || 0.82);
          const i = y * w + x;
          coat[i] += v;
          const f = clamp((x - sx0) / (sx1 - sx0)), key = j + (j % 2 ? 1 - f : f);
          if (v > 0.05 && key < ck[i]) ck[i] = key;
        }
      }
    }
    for (let i = 0; i < n; i++) coat[i] = 1 - Math.exp(-1.7 * coat[i]);
    // beads: coating pools where it is already thick at an edge
    const cb = boxBlur(coat, w, h, 6, 2);
    for (let i = 0; i < n; i++) { const m = coat[i]; coat[i] = Math.min(1.45, m + Math.max(0, m - cb[i]) * 1.1 + (m > 0.2 ? (cb[i] < 0.5 ? 0.2 * cb[i] : 0) : 0)); }
    this.coatBlur = boxBlur(coat, w, h, 34, 2);
    // pin holes and bubbles
    const holes = c.holes ?? 36, rnd = N.rnd;
    for (let k = 0; k < holes; k++) {
      const hx = c.x0 + rnd() * (c.x1 - c.x0), hy = c.y0 + rnd() * (c.y1 - c.y0), hr = 0.8 + rnd() * rnd() * 3.2;
      for (let y = Math.floor(hy - hr - 1); y <= hy + hr + 1; y++) for (let x = Math.floor(hx - hr - 1); x <= hx + hr + 1; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const d = Math.hypot(x - hx, y - hy); coat[y * w + x] *= ss(hr - 0.4, hr + 1, d);
      }
    }
  }

  setFront(fn) { const { w, h } = this; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.front[y * w + x] = fn(x, y); }

  // tide lines hugging the edge of the coat, and a few drips
  paintTide(o) {
    const { w, h, N, coatBlur, coat } = this, tide = this.tide, rnd = N.rnd;
    const lv = o.levels || [0.28, 0.52, 0.8];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (coat[i] < 0.05) continue;
      const f = coatBlur[i] + (N.fbm(x * 0.01, y * 0.01, 3) - .5) * 0.22;
      let t = 0; for (const L of lv) t += Math.exp(-(((f - L) / 0.022) ** 2));
      tide[i] += t * (o.line ?? 0.07);
    }
    const nd = o.drips ?? 7;
    for (let k = 0; k < nd; k++) {
      const x0 = (o.dx0 ?? 0.1) * w + rnd() * w * (o.dx1 ?? 0.8), y0 = h * (0.05 + rnd() * 0.35), L = h * (0.25 + rnd() * 0.5), wd = 2 + rnd() * 4;
      for (let y = Math.floor(y0); y < Math.min(h, y0 + L); y++) {
        const cx = x0 + Math.sin(y * 0.01 + k) * 5 + (N.n1(y * 0.02 + k * 9) - .5) * 10, u = (y - y0) / L;
        const amp = (u < 0.06 ? u / 0.06 : 1) * (1 - 0.5 * u);
        for (let x = Math.floor(cx - wd * 2); x <= cx + wd * 2; x++) {
          if (x < 0 || x >= w) continue; const i = y * w + x; if (coat[i] < 0.05) continue;
          tide[i] += (-0.11 * amp) * Math.exp(-(((x - cx) / wd) ** 2)) + (u > 0.9 ? 0.2 * Math.exp(-(((x - cx) / wd) ** 2)) * (u - 0.9) * 10 : 0);
        }
      }
    }
  }

  // objects lying on the sheet: draw() paints a transmission map (white = light passes, black = opaque)
  setLight(draw, blur = 0, mix = 1) {
    const { w, h } = this, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    const b = document.createElement('canvas'); b.width = w; b.height = h; const bg = b.getContext('2d');
    bg.fillStyle = '#fff'; bg.fillRect(0, 0, w, h); bg.globalCompositeOperation = 'darken'; draw(bg);
    if (blur) g.filter = `blur(${blur}px)`;
    g.drawImage(b, 0, 0); g.filter = 'none';
    const d = g.getImageData(0, 0, w, h).data, L = this.L;
    for (let i = 0; i < w * h; i++) L[i] = Math.min(L[i], d[i * 4] / 255);
  }
  clearLight() { this.L.fill(1); this.cache = null; }

  render(st) {
    const key = JSON.stringify([st.dose, st.brush, st.coatWet, st.wash, st.dry, st.fog, st.tsKey, st.gloss, st.flat, st.flow]);
    if (this.cache === key) return this.cv; this.cache = key;
    const { w, h, alpha, tooth, coat, ck, L, front, sheen, tide } = this, d = this.img.data;
    const dose = st.dose || 0, ts = st.ts || null, brush = st.brush ?? 1e9, coatWet = st.coatWet || 0;
    const wash = st.wash ?? -9, dry = st.dry ?? 1, fog = st.fog ?? 0.08, g = st.g ?? 1.7, E0 = st.E0 ?? 4.5, preK = st.preK ?? 0.2, gloss = st.gloss ?? 1;
    const soft = st.soft ?? 0.05, flat = st.flat || 0, flow = st.flow | 0;
    // response curve B(E) tabulated
    const NB = 2048, Emax = 24, Btab = new Float32Array(NB);
    for (let i = 0; i < NB; i++) Btab[i] = 1 - Math.exp(-Math.pow((i / (NB - 1)) * Emax / E0, g));
    const dg = 0.62 + 0.38 * dry;
    const paper = [244, 240, 226];
    for (let y = 0; y < h; y++) {
      const sy = ((((y - flow) % h) + h) % h) * w;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, p = i * 4, a = alpha[i];
        if (a <= 0.002) { d[p + 3] = 0; continue; }
        const tt = tooth[i];
        let r = paper[0], gr = paper[1], b = paper[2];
        const cin = coat[i];
        if (cin > 0.02) {
          const vis = brush >= 1e8 ? 1 : ss(0, 0.04, brush - ck[i]);
          let E = dose - (ts ? ts[x] : 0); if (E < 0) E = 0;
          const l = L[i], Ee = E * (l + fog * (1 - l));
          const cov = Math.min(1, cin * 1.1);
          // unwashed
          let q = Ee * preK; if (q > 1) q = 1;
          const qi = (q * 511 + 0.5) | 0 , lw = coatWet;
          const pr = PRE[qi * 3] * (1 - lw) + PRE_WET[qi * 3] * lw, pg = PRE[qi * 3 + 1] * (1 - lw) + PRE_WET[qi * 3 + 1] * lw, pb = PRE[qi * 3 + 2] * (1 - lw) + PRE_WET[qi * 3 + 2] * lw;
          const th = 1 - 0.07 * (cin - 1);
          let ur = pr * th, ug = pg * th, ub = pb * th;
          // washed
          let ei = (Ee / Emax * (NB - 1) + 0.5) | 0; if (ei > NB - 1) ei = NB - 1;
          let B = Btab[ei] * Math.min(1.12, 0.3 + 0.8 * cin) + tide[i] * (0.4 + 0.6 * dry) * Math.min(1, cin);
          if (flat) B = B * (1 - flat) + flat * 0.5;
          B *= dg; if (B < 0) B = 0; if (B > 1) B = 1;
          const bi = (B * 511 + 0.5) | 0;
          const wr = POST[bi * 3], wg = POST[bi * 3 + 1], wb = POST[bi * 3 + 2];
          const Wf = ss(0, 1, (wash - front[i]) / soft);
          // the unwashed coat mixes with bare paper where it is thin or not yet brushed
          const cm = vis * Math.min(1, cin * 1.5);
          ur = paper[0] + (ur - paper[0]) * cm; ug = paper[1] + (ug - paper[1]) * cm; ub = paper[2] + (ub - paper[2]) * cm;
          r = ur + (wr - ur) * Wf; gr = ug + (wg - ug) * Wf; b = ub + (wb - ub) * Wf;
          // wet look: sheen on the water, a bright rim and a dark line at the front
          if (wash > -1) {
            const e = wash - front[i];
            if (Wf > 0 && dry < 1) {
              const wet = (1 - dry) * Wf, s = sheen[sy + x] * 0.22 * wet * gloss;
              r += s * (255 - r) * 0.8; gr += s * (255 - gr); b += s * (255 - b);
            }
            const rim = Math.exp(-(((e - soft * 0.5) / (soft * 0.55)) ** 2));
            if (rim > 0.01) { const k = rim * 0.35 * gloss; r += (235 - r) * k; gr += (250 - gr) * k; b += (255 - b) * k; }
          }
        }
        const k2 = tt - 1;
        r = r * tt + k2 * 38; gr = gr * tt + k2 * 38; b = b * tt + k2 * 34;
        d[p] = r; d[p + 1] = gr; d[p + 2] = b; d[p + 3] = a * 255;
      }
    }
    this.cx.putImageData(this.img, 0, 0);
    return this.cv;
  }
}
