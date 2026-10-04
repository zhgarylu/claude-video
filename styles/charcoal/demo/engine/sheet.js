// Charcoal sheet: pigment-on-paper-tooth renderer.
// The sheet is a set of Float32 density fields (charcoal C, graphite G, sanguine S), a smudge field M and a fixed tooth field.
// Pigment lands on the tooth peaks first; a thumb fills the valleys (M), an eraser lifts the peaks and leaves the valleys:
// that residue is the ghost of every earlier mark. Nothing here uses Math.random: the tooth is seeded.
import { mulberry } from '/core/lib.js';

export const W = 3600, H = 2000, N = W * H, MARGIN = 250;
export const PAPER = [226, 218, 200];            // warm cotton rag, before light
const ss = (a, b, x) => { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

// ---- box blur on a Float32 field, separable, running sums -------------------------------------------
function blurX(s, d, w, h, r) {
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const o = y * w; let acc = 0;
    for (let x = -r; x <= r; x++) acc += s[o + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      d[o + x] = acc * k;
      acc += s[o + Math.min(w - 1, x + r + 1)] - s[o + Math.max(0, x - r)];
    }
  }
}
function blurY(s, d, w, h, r) {
  const k = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += s[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      d[y * w + x] = acc * k;
      acc += s[Math.min(h - 1, y + r + 1) * w + x] - s[Math.max(0, y - r) * w + x];
    }
  }
}
function blur(src, w, h, rx, ry, passes = 2) {
  let a = src, b = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    blurX(a, b, w, h, rx); const t = a; a = b; b = (t === src) ? new Float32Array(src.length) : t;
    blurY(a, b, w, h, ry); const t2 = a; a = b; b = t2;
  }
  return a;
}
function zscore(a) {
  let m = 0; for (let i = 0; i < a.length; i++) m += a[i]; m /= a.length;
  let v = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - m; v += d * d; } const sd = Math.sqrt(v / a.length) || 1;
  const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = (a[i] - m) / sd; return o;
}

// ---- the paper: tooth, light, deckle edge, board ----------------------------------------------------
let PAPERDATA = null;
export function buildPaper(seed = 7) {
  if (PAPERDATA) return PAPERDATA;
  const rnd = mulberry(seed);
  const n1 = new Float32Array(N); for (let i = 0; i < N; i++) n1[i] = rnd();
  const z1 = zscore(blur(n1, W, H, 1, 1, 1));
  const n2 = new Float32Array(N); for (let i = 0; i < N; i++) n2[i] = rnd();
  const z2 = zscore(blur(n2, W, H, 2, 1, 2));            // slightly laid: wider than tall
  const n3 = new Float32Array(N); for (let i = 0; i < N; i++) n3[i] = rnd();
  const z3 = zscore(blur(n3, W, H, 9, 7, 2));
  const tooth = new Float32Array(N);
  for (let i = 0; i < N; i++) tooth[i] = ss(-2.3, 2.3, 0.70 * z1[i] + 0.50 * z2[i] + 0.18 * z3[i]);
  // low-frequency mottle (rag pulp clouds) from a small grid, bilinear
  const gw = 200, gh = 113, g = new Float32Array(gw * gh); for (let i = 0; i < g.length; i++) g[i] = rnd();
  const gb = zscore(blur(g, gw, gh, 5, 5, 2));
  const mott = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x / W * (gw - 1), fy = y / H * (gh - 1), ix = fx | 0, iy = fy | 0, ux = fx - ix, uy = fy - iy;
    const a = gb[iy * gw + ix], b = gb[iy * gw + Math.min(gw - 1, ix + 1)], c = gb[Math.min(gh - 1, iy + 1) * gw + ix], d = gb[Math.min(gh - 1, iy + 1) * gw + Math.min(gw - 1, ix + 1)];
    const v = (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
    // soft lamp from upper left, plus mottle
    const dx = (x - W * 0.28) / W, dy = (y - H * 0.18) / H;
    mott[y * W + x] = (1.0 + 0.022 * v) * (1.035 - 0.15 * Math.sqrt(dx * dx + dy * dy * 1.4));
  }
  // fibres: short curved hairs, light and dark, on a mid-grey canvas
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d');
  cx.fillStyle = 'rgb(128,128,128)'; cx.fillRect(0, 0, W, H); cx.lineCap = 'round';
  for (let k = 0; k < 9000; k++) {
    const x = rnd() * W, y = rnd() * H, a = rnd() * 6.283, l = 8 + rnd() * 34, bend = (rnd() - 0.5) * 1.2;
    cx.strokeStyle = rnd() < 0.62 ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.16)'; cx.lineWidth = 0.6 + rnd() * 0.7;
    cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + Math.cos(a + bend) * l * 0.5, y + Math.sin(a + bend) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); cx.stroke();
  }
  const fd = cx.getImageData(0, 0, W, H).data;
  for (let i = 0; i < N; i++) mott[i] *= 1 + (fd[i * 4] - 128) / 128 * 0.07;
  // emboss shade from the tooth, light from the upper left
  const lit = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    lit[i] = mott[i] * (1 + 0.07 * (tooth[i - W - 1] - tooth[i + W + 1]) + 0.05 * (tooth[i] - 0.5));
  }
  // deckle edge mask + board with the paper's cast shadow
  const mask = new Float32Array(N), wob = new Float32Array(N);
  for (let i = 0; i < N; i++) wob[i] = rnd();
  const wl = blur(wob, W, H, 6, 6, 2), wf = blur(wob, W, H, 1, 1, 1);
  const sw = (a) => { let m = 0; for (let i = 0; i < a.length; i += 97) m += a[i]; return m / Math.ceil(a.length / 97); };
  const m1 = sw(wl), m2 = sw(wf);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const d = Math.min(x - MARGIN, W - MARGIN - x, y - MARGIN, H - MARGIN - y);
    const w = (wl[i] - m1) * 150 + (wf[i] - m2) * 22;
    mask[i] = ss(-1.2, 1.4, d + w);
  }
  const sh = new Float32Array(N);       // shadow = mask shifted down-right, blurred
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sh[y * W + x] = mask[Math.max(0, y - 7) * W + Math.max(0, x - 5)];
  const shb = blur(sh, W, H, 7, 7, 2);
  const board = new Float32Array(N);    // wood-fibre drawing board, very dark, with long grain
  const bn = new Float32Array(N); for (let i = 0; i < N; i++) bn[i] = rnd();
  const bg = zscore(blur(bn, W, H, 40, 1, 1)), bf = zscore(blur(bn, W, H, 1, 1, 1));
  for (let i = 0; i < N; i++) board[i] = (0.66 + 0.07 * bg[i] + 0.03 * bf[i]) * (1 - 0.72 * shb[i]);
  PAPERDATA = { tooth, lit, mask, board };
  return PAPERDATA;
}

// ---- the sheet --------------------------------------------------------------------------------------
export class Sheet {
  constructor() {
    const p = buildPaper();
    this.tooth = p.tooth; this.lit = p.lit; this.mask = p.mask; this.board = p.board;
    this.C = new Float32Array(N); this.G = new Float32Array(N); this.S = new Float32Array(N); this.M = new Float32Array(N); this.Gh = new Float32Array(N);
    this.cv = document.createElement('canvas'); this.cv.width = W; this.cv.height = H;
    this.cx = this.cv.getContext('2d'); this.img = this.cx.createImageData(W, H); this.u32 = new Uint32Array(this.img.data.buffer);
    this.scratch = new Float32Array(900 * 900); this.sc2 = new Float32Array(900 * 900); this.sc3 = new Float32Array(900 * 900);
    this.reset();
  }
  reset() {
    this.C.fill(0); this.G.fill(0); this.S.fill(0); this.M.fill(0); this.Gh.fill(0);
    this.dirty = [0, 0, W, H];
  }
  touch(x0, y0, x1, y1) {
    const d = this.dirty; x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    if (!d) this.dirty = [x0, y0, x1, y1]; else { d[0] = Math.min(d[0], x0); d[1] = Math.min(d[1], y0); d[2] = Math.max(d[2], x1); d[3] = Math.max(d[3], y1); }
  }

  // One dab of dry pigment. p: pressure 0..1.2, g: how hard the tooth gates it (1 = only peaks at low pressure).
  // tx,ty: stroke direction; ridge: Float32Array(64) profile across the stick (streaks along the stroke).
  dab(L, x, y, r, p, g, flow, tx, ty, ridge, ridgeAmt) {
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
    const r2 = r * r, tooth = this.tooth, M = this.M, ir = 1 / r;
    for (let yy = y0; yy <= y1; yy++) {
      const dy = yy + 0.5 - y;
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx + 0.5 - x, d2 = dx * dx + dy * dy; if (d2 > r2) continue;
        const u = 1 - d2 / r2, f = u * Math.sqrt(u);
        const i = yy * W + xx;
        let c = p * f;
        if (ridge) { const pr = (dx * -ty + dy * tx) * ir * 0.5 + 0.5; c *= 1 - ridgeAmt + ridgeAmt * ridge[(pr * 63) | 0]; }
        const t = tooth[i];
        const hit = ss(0, 0.38, c * 2.2 + (t - 0.5) * g * 0.6 * (1 - 0.5 * M[i]));
        if (hit > 0) { const a = hit * flow * 3.2; L[i] += (1 - L[i]) * (a > 1 ? 1 : a); }
      }
    }
    this.touch(x0, y0, x1 + 1, y1 + 1);
  }

  // Thumb: drags pigment from behind along (dx,dy) and fills the valleys (M).
  smudge(x, y, r, dx, dy, len, k, lift = 0.05, layers = 'CGS') {
    const pad = Math.ceil(len) + 2;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1; if (bw * bh > 900 * 900) return;
    const r2 = r * r, K = 11, M = this.M, tooth = this.tooth, pw = Math.min(r * 0.4, 60), PO = [0, 0.6, -0.6, 0.3, -0.3, 0.95, -0.95, 0.15, -0.15, 0.45, -0.45];
    const Ls = []; if (layers.includes('C')) Ls.push([this.C, this.scratch]); if (layers.includes('G')) Ls.push([this.G, this.sc2]); if (layers.includes('S')) Ls.push([this.S, this.sc3]);
    const mm = new Float32Array(bw * bh);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const ddx = xx + 0.5 - x, ddy = yy + 0.5 - y, d2 = ddx * ddx + ddy * ddy; const o = (yy - y0) * bw + (xx - x0);
      if (d2 > r2) { mm[o] = 0; continue; }
      const u = 1 - d2 / r2; const m = u * k; mm[o] = m;
      for (const [L, sc] of Ls) {
        let acc = 0, wsum = 0;
        for (let j = 0; j < K; j++) {
          const sj = (j * 7 % K) / (K - 1), w = 1 - 0.5 * sj, po = PO[j] * pw;
          const sx = Math.min(W - 1, Math.max(0, Math.round(xx - dx * len * sj - dy * po))), sy = Math.min(H - 1, Math.max(0, Math.round(yy - dy * len * sj + dx * po)));
          acc += L[sy * W + sx] * w; wsum += w;
        }
        sc[o] = acc / wsum;
      }
    }
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const o = (yy - y0) * bw + (xx - x0), m = mm[o]; if (m <= 0) continue; const i = yy * W + xx;
      for (const [L, sc] of Ls) { const v = L[i] + (sc[o] - L[i]) * m; L[i] = v * (1 - lift * m); }
      M[i] += (1 - M[i]) * Math.min(1, m * 1.1);
    }
    this.touch(x0, y0, x1 + 1, y1 + 1);
  }

  // Kneaded eraser: lifts pigment off the peaks and leaves the valleys: the residue is the ghost.
  erase(x, y, r, k, hard = 1) {
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
    const r2 = r * r, tooth = this.tooth, C = this.C, G = this.G, S = this.S, M = this.M;
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const dx = xx + 0.5 - x, dy = yy + 0.5 - y, d2 = dx * dx + dy * dy; if (d2 > r2) continue;
      const u = 1 - d2 / r2, m = Math.min(1, Math.pow(u, 0.9) * 1.25 * k), i = yy * W + xx, t = tooth[i];
      const peak = 0.30 + 0.70 * ss(0.18, 0.82, t);          // peaks lift well, valleys keep their pigment
      const e = m * peak * hard;
      const gone = C[i] * e + G[i] * e * 0.6 + S[i] * e * 0.5;           // what the eraser lifts leaves a faint stain behind
      const gh = this.Gh[i] + gone * 0.28; this.Gh[i] = gh > 0.42 ? 0.42 : gh;
      C[i] *= 1 - e; G[i] *= 1 - e * 0.9; S[i] *= 1 - e * 0.8; M[i] *= 1 - 0.35 * m;
    }
    this.touch(x0, y0, x1 + 1, y1 + 1);
  }

  // ---- composite: sheet fields -> canvas ----------------------------------------------------------
  composite() {
    const d = this.dirty; if (!d) return this.cv; this.dirty = null;
    const [X0, Y0, X1, Y1] = d, u32 = this.u32, C = this.C, G = this.G, S = this.S, M = this.M, Gh = this.Gh, tooth = this.tooth, lit = this.lit, mask = this.mask, board = this.board;
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const i = y * W + x, a = mask[i];
      let r, g, b;
      if (a < 0.003) { const bv = board[i] * 62; r = bv * 1.02; g = bv * 0.98; b = bv * 0.93; }
      else {
        const t = tooth[i], m = M[i], L = lit[i];
        r = PAPER[0]; g = PAPER[1]; b = PAPER[2];
        const gh = Gh[i]; if (gh > 0.003) { const f = 1 - gh * 0.9 * (0.72 + 0.56 * t); r *= f; g *= f; b *= f * 1.01; }
        const c = C[i];
        if (c > 0.004) {
          const cc = ss(0.04, 0.62, c + (t - 0.5) * 0.42 * (1 - 0.97 * m * m)) * 0.965;
          r += (24 - r) * cc; g += (23 - g) * cc; b += (25 - b) * cc;
        }
        const gr = G[i];
        if (gr > 0.004) {
          const gg = ss(0.04, 0.55, gr + (t - 0.5) * 0.30 * (1 - 0.8 * m)) * 0.80, sheen = 1 + (t - 0.5) * 0.22;
          r += (66 * sheen - r) * gg; g += (69 * sheen - g) * gg; b += (76 * sheen - b) * gg;
        }
        const s = S[i];
        if (s > 0.004) {
          const sg = ss(0.04, 0.65, s + (t - 0.5) * 0.7 * (1 - 0.8 * m)) * 0.9;
          r += (r * 0.66 - r) * sg; g += (g * 0.27 - g) * sg; b += (b * 0.20 - b) * sg;
        }
        const k = L;
        r *= k; g *= k; b *= k;
        if (a < 1) { const bv = board[i] * 62; r = r * a + bv * 1.02 * (1 - a); g = g * a + bv * 0.98 * (1 - a); b = b * a + bv * 0.93 * (1 - a); }
      }
      u32[i] = 0xFF000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
    }
    this.cx.putImageData(this.img, 0, 0, X0, Y0, X1 - X0, Y1 - Y0);
    return this.cv;
  }
}
