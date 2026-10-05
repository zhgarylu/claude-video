// The zoetrope drum: a strip of twelve cards (curling from flat to a cylinder), a slotted shell, projected orthographically.
// Painted back to front. The stroboscopic result is the mean of several sub-frames (the "eye" of the drum), brightened only where we look through the slits.
import { TAU, clamp, lerp } from '/core/lib.js';
import { C, rad } from './ink.js';
import { brassGrad } from './world.js';

export const P = 190, L = 12 * P, RS = L / TAU, RO = RS + 8;          // card pitch, strip length, strip radius, shell radius
export const YT = 190, YS0 = 130, YS1 = 322, YRIM = 350, YPL = 26;      // strip top, slit band, rim top, plinth bottom
export const SLIT_DEG = 5.2, PAIRS = 30;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let TMP, ACC;

// 3D -> screen. world point on the strip at arc s (from the far point), height Y. kappa = curl.
function proj(st, x, Y, z) {
  const ph = rad(st.pitch);
  return [st.x + st.sc * x, st.y - st.sc * (Y * Math.cos(ph) - (z - RO) * Math.sin(ph))];
}
const stripPt = (st, s, Y) => {
  const k = st.kappa;
  if (k < 1e-7) return proj(st, s, Y, 0);
  return proj(st, Math.sin(k * s) / k, Y, (1 - Math.cos(k * s)) / k);
};
const cylPt = (st, psi, Y, Ro = RO) => proj(st, Ro * Math.sin(rad(psi)), Y, Ro * (1 - Math.cos(rad(psi))));

function drawSlice(g, img, st, s0, s1, u0, u1, shade) {
  // image columns u0..u1 (0..1) mapped on the strip between arc s0..s1, full card height YT
  const A = stripPt(st, s0, YT), B = stripPt(st, s1, YT), D = stripPt(st, s0, 0);
  const iw = img.width, ih = img.height, sx = u0 * iw, sw = (u1 - u0) * iw;
  g.save();
  g.setTransform((B[0] - A[0]) / sw, (B[1] - A[1]) / sw, (D[0] - A[0]) / ih, (D[1] - A[1]) / ih, A[0], A[1]);
  g.drawImage(img, sx, 0, sw + 0.8, ih, 0, 0, sw + 0.8, ih);
  g.restore();
  if (shade > 0.01) {
    g.fillStyle = `rgba(25,12,4,${shade})`; g.beginPath(); const C2 = stripPt(st, s1, 0);
    g.moveTo(A[0], A[1]); g.lineTo(B[0] + 0.5, B[1]); g.lineTo(C2[0] + 0.5, C2[1]); g.lineTo(D[0], D[1]); g.closePath(); g.fill();
  }
}
const wrap = s => { const h = L / 2; return ((s + h) % L + L) % L - h; };

// ------------------------------------------------------------------ one sub-frame
function frame(g, st) {
  const full = st.kappa > 1 / RS * 0.999;
  const spinLen = full ? L * st.spin / 360 : 0;
  // inside of the shell (far half): dark wood
  if (st.kappa > 1 / RS * 0.4) {
    g.beginPath(); for (let a = -92; a <= 92; a += 4) { const p = cylPt(st, a, YRIM - 8, RO - 4); a === -92 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); }
    for (let a = 92; a >= -92; a -= 4) { const p = cylPt(st, a, 0, RO - 4); g.lineTo(p[0], p[1]); } g.closePath();
    const t0 = cylPt(st, 0, YRIM, RO), t1 = cylPt(st, 0, 0, RO), gr = g.createLinearGradient(0, t0[1], 0, t1[1]); gr.addColorStop(0, '#120a05'); gr.addColorStop(1, '#2d1b0e');
    g.fillStyle = gr; g.fill();
    // floor
    g.save(); g.beginPath(); for (let a = 0; a < 360; a += 5) { const p = cylPt(st, a, 0, RO - 6); a ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath(); g.fillStyle = '#1b1008'; g.fill(); g.restore();
  }
  // cards, far ones first
  const list = [];
  for (let k = 0; k < 12; k++) { const s = full ? wrap((k - 5.5) * P + spinLen) : (k - 5.5) * P; list.push([k, s]); }
  list.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));      // near ones (large |s|) first, far (|s| small) last -> far painted last? no: painter wants far first
  list.reverse();
  for (const [k, s] of list) {
    const img = st.cards[k], M = 5;
    for (let m = 0; m < M; m++) {
      const sa = s - P / 2 + P * m / M, sb = s - P / 2 + P * (m + 1) / M, pm = st.kappa * (sa + sb) / 2;
      if (st.kappa > 1e-6 && Math.abs(pm) > Math.PI / 2) continue;
      drawSlice(g, img, st, sa, sb, m / M, (m + 1) / M, 0.62 * Math.pow(1 - Math.cos(pm), 1.1));
    }
  }
  if (!st.shell) return;
  // near half of the shell: plinth ring, slit band panels, rim ring are painted by the caller (static parts); here the panels
  const sy = st.shellY || 0;
  for (let j = 0; j < 12; j++) {
    const c0 = 180 - ((j - 5.5) * PAIRS) + st.spin, a0 = c0 + SLIT_DEG / 2, a1 = c0 + PAIRS - SLIT_DEG / 2;       // panel between slit j and slit j-1
    let lo = (((a0 % 360) + 360) % 360), hi = lo + (a1 - a0);
    lo = Math.max(lo, 88); hi = Math.min(hi, 272); if (hi <= lo) continue;
    g.beginPath(); const steps = 6;
    for (let i = 0; i <= steps; i++) { const p = cylPt(st, lo + (hi - lo) * i / steps, YS1 + sy); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    for (let i = steps; i >= 0; i--) { const p = cylPt(st, lo + (hi - lo) * i / steps, YS0 + sy); g.lineTo(p[0], p[1]); }
    g.closePath();
    const xm = RO * Math.sin(rad((lo + hi) / 2)), lit = clamp(0.5 - xm / RO * 0.5 + 0.1, 0.1, 0.95);
    const pa = cylPt(st, lo, 0), pb = cylPt(st, hi, 0), gr = g.createLinearGradient(pa[0], 0, pb[0], 0);
    const mkc = f => `rgb(${Math.round(18 + 44 * f)},${Math.round(11 + 26 * f)},${Math.round(6 + 14 * f)})`;
    gr.addColorStop(0, mkc(clamp(lit + 0.18))); gr.addColorStop(0.5, mkc(lit)); gr.addColorStop(1, mkc(clamp(lit - 0.15)));
    g.fillStyle = gr; g.fill();
    // a row of gilt dots along the middle of the panel
    g.fillStyle = 'rgba(214,170,80,0.85)';
    for (let q = 0; q < 3; q++) for (let r2 = 0; r2 < 2; r2++) { const p = cylPt(st, lo + (hi - lo) * (0.28 + 0.22 * q), (YS0 + YS1) / 2 + sy + (r2 ? 34 : -34)); g.beginPath(); g.arc(p[0], p[1], 3 * st.sc, 0, TAU); g.fill(); }
  }
}

// ------------------------------------------------------------------ static brass parts painted over the mean
function ringBand(g, st, y0, y1, fillFn, near = true, a0 = 90, a1 = 270) {
  g.beginPath();
  for (let a = a0; a <= a1; a += 3) { const p = cylPt(st, a, y1); a === a0 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); }
  for (let a = a1; a >= a0; a -= 3) { const p = cylPt(st, a, y0); g.lineTo(p[0], p[1]); }
  g.closePath(); g.fillStyle = fillFn(); g.fill();
}
export function drawBase(g, st) {
  const pa = cylPt(st, 90, 0), pb = cylPt(st, 270, 0);
  const bgr = () => { const gr = g.createLinearGradient(pa[0], 0, pb[0], 0); gr.addColorStop(0, '#f3d98a'); gr.addColorStop(0.18, C.brass); gr.addColorStop(0.55, C.brassLo); gr.addColorStop(1, C.brassDk); return gr; };
  const sy = st.shellY || 0;
  // foot
  ringBand(g, st, -34, YPL, bgr, true, 90, 270);
  ringBand(g, st, YPL - 6, YPL + 3, () => C.brassHi, true, 90, 270);
  if (!st.shell && st.kappa > 1 / RS * 0.999) ringBand(g, st, 0, YT, () => { const gr = g.createLinearGradient(pa[0], 0, pb[0], 0); gr.addColorStop(0, '#e9d7a4'); gr.addColorStop(0.5, '#cdb277'); gr.addColorStop(1, '#6b5430'); return gr; });
  if (st.shell) {
    ringBand(g, st, YPL + 3, YS0 - 2 + sy, () => { const gr = g.createLinearGradient(pa[0], 0, pb[0], 0); gr.addColorStop(0, '#46301a'); gr.addColorStop(0.3, '#2c1b0d'); gr.addColorStop(1, '#0f0805'); return gr; });
    ringBand(g, st, YS0 - 6 + sy, YS0 + sy, bgr);
    ringBand(g, st, YS1 + sy, YS1 + 6 + sy, bgr);
    ringBand(g, st, YS1 + 6 + sy, YRIM + sy, () => { const gr = g.createLinearGradient(pa[0], 0, pb[0], 0); gr.addColorStop(0, '#46301a'); gr.addColorStop(0.3, '#2c1b0d'); gr.addColorStop(1, '#0f0805'); return gr; });
    ringBand(g, st, YRIM - 4 + sy, YRIM + 3 + sy, bgr);
    // top rim, far half behind is not drawn; the ellipse edge of the near rim
    g.strokeStyle = C.brassHi; g.lineWidth = 2; g.beginPath(); for (let a = 90; a <= 270; a += 3) { const p = cylPt(st, a, YRIM + 3 + sy); a === 90 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); } g.stroke();
  }
}
export function drawRimFar(g, st) {
  if (!st.shell) return; const sy = st.shellY || 0;
  g.strokeStyle = C.brassLo; g.lineWidth = 7 * st.sc; g.lineCap = 'round'; g.beginPath(); for (let a = -92; a <= 92; a += 3) { const p = cylPt(st, a, YRIM + sy - 2); a === -92 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); } g.stroke();
}

// ------------------------------------------------------------------ full drum, optionally with a time window
// st: { x, y, sc, kappa, pitch, spin (deg), spinRange (deg the window spans backwards), shell (bool), shellY, cards, W, H, gain }
export function drawDrum(main, st) {
  const W = st.W, H = st.H;
  if (!TMP) { TMP = mk(W, H); ACC = mk(W, H); ACC.getContext('2d', { willReadFrequently: true }); }
  const tg = TMP.getContext('2d'), ag = ACC.getContext('2d');
  const range = Math.abs(st.spinRange || 0), N = range < 0.4 ? 1 : clamp(Math.ceil(range / 0.9), 2, 36);
  ag.setTransform(1, 0, 0, 1, 0, 0); ag.clearRect(0, 0, W, H);
  const dir = Math.sign(st.spinRange || 1);
  // (the world transform of the camera is applied by main: st.x / st.y are already screen coordinates)
  for (let i = 0; i < N; i++) {
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
    const sub = { ...st, spin: st.spin - dir * (N === 1 ? 0 : range * i / (N - 1)) };
    frame(tg, sub);
    ag.globalAlpha = 1 / (i + 1); ag.drawImage(TMP, 0, 0);
  }
  ag.globalAlpha = 1;
  // brighten what is seen through the slits only
  if (st.shell && st.gainS > 0.02) {
    const bb = { x0: Math.max(0, Math.floor(st.x - st.sc * RO - 4)), x1: Math.min(W, Math.ceil(st.x + st.sc * RO + 4)) };
    const sy = st.shellY || 0;
    let ymin = 1e9, ymax = -1e9;
    const colTop = [], colBot = [];
    for (let x = bb.x0; x < bb.x1; x++) {
      const xx = (x - st.x) / (st.sc * RO); if (Math.abs(xx) >= 1) { colTop.push(1e9); colBot.push(-1e9); continue; }
      const z = RO * (1 + Math.sqrt(1 - xx * xx)), ph = rad(st.pitch);
      const yt = st.y - st.sc * ((YS1 + sy) * Math.cos(ph) - (z - RO) * Math.sin(ph)), yb = st.y - st.sc * ((YS0 + sy) * Math.cos(ph) - (z - RO) * Math.sin(ph));
      colTop.push(Math.floor(yt)); colBot.push(Math.ceil(yb)); ymin = Math.min(ymin, yt); ymax = Math.max(ymax, yb);
    }
    const y0 = Math.max(0, Math.floor(ymin)), y1 = Math.min(H, Math.ceil(ymax));
    if (y1 > y0 && bb.x1 > bb.x0) {
      const w = bb.x1 - bb.x0, h = y1 - y0, id = ag.getImageData(bb.x0, y0, w, h), d = id.data;
      const f = SLIT_DEG / PAIRS, sg = st.gainS, pp = [196, 176, 134], bb2 = [22, 13, 8], Mp = pp.map((v, c2) => f * v + (1 - f) * bb2[c2]);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const Y = yy + y0; if (Y < colTop[xx] || Y > colBot[xx]) continue;
        const i = (yy * w + xx) * 4;
        for (let c2 = 0; c2 < 3; c2++) { const fixed = clamp(pp[c2] - (Mp[c2] - d[i + c2]) / f, 0, 255); d[i + c2] = d[i + c2] + (fixed - d[i + c2]) * sg; }
      }
      ag.putImageData(id, bb.x0, y0);
    }
  }
  main.drawImage(ACC, 0, 0);
}
