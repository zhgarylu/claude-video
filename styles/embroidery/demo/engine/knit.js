// knit.js — stockinette as a grid of V stitches (two plied legs each), a worn hole, and a darn woven over it.
import { hash, vnoise, mulberry, TAU, clamp, lerp } from '/core/lib.js';
import { thread, loose, css, shade, lift } from './thread.js';
import { seq } from './scene.js';

const P = (x, y) => ({ x, y });

// hole: {cx, cy, rx, ry}; the ragged edge is a noisy ellipse
export const inHole = (h, x, y, pad = 0) => {
  if (!h) return false;
  const dx = (x - h.cx) / (h.rx + pad), dy = (y - h.cy) / (h.ry + pad), a = Math.atan2(dy, dx);
  return dx * dx + dy * dy < 1 + (vnoise(a * 2.2 + 9) - 0.5) * 0.35;
};

// Draw the knit ground over world rect [x0,x1]×[y0,y1]. Rows are drawn bottom to top so each V tucks under the one above.
export function knitGround(ctx, { x0, y0, x1, y1, cw = 50, ch = 31, col, hole = null, seed = 3 }) {
  const rnd = mulberry(seed), w = cw * 0.43;
  ctx.fillStyle = css(shade(col, 0.5)); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (hole) { // what lies below the hole: the dark inside of the garment
    const g = ctx.createRadialGradient(hole.cx, hole.cy, 0, hole.cx, hole.cy, Math.max(hole.rx, hole.ry) * 1.15);
    g.addColorStop(0, 'rgba(8,10,12,1)'); g.addColorStop(0.7, 'rgba(10,12,14,0.96)'); g.addColorStop(1, 'rgba(10,12,14,0)');
    ctx.save(); ctx.translate(hole.cx, hole.cy); ctx.scale(1, hole.ry / hole.rx); ctx.translate(-hole.cx, -hole.cy);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hole.cx, hole.cy, hole.rx * 1.15, 0, TAU); ctx.fill(); ctx.restore();
  }
  const cols = Math.ceil((x1 - x0) / cw) + 2, rows = Math.ceil((y1 - y0) / ch) + 2;
  for (let r = rows; r >= -1; r--) {
    const y = y0 + r * ch;
    for (let c = -1; c < cols; c++) {
      const x = x0 + c * cw + (r & 1 ? 0 : 0);
      if (inHole(hole, x, y, -cw * 0.1)) continue;
      const tn = 0.94 + hash(c * 7.1 + r * 13.3 + seed) * 0.12 + (vnoise(x * 0.004 + y * 0.003) - 0.5) * 0.1;
      const L0 = P(x - cw * 0.38, y - ch * 0.8), L1 = P(x - cw * 0.03, y + ch * 0.55);
      const R0 = P(x + cw * 0.38, y - ch * 0.8), R1 = P(x + cw * 0.03, y + ch * 0.55);
      // shading layers: dark gap between the arms of the V, soft occlusion under the row above, row-to-row tone
      const gg = ctx.createRadialGradient(x, y - ch * 0.3, 0, x, y - ch * 0.3, cw * 0.34);
      gg.addColorStop(0, 'rgba(6,14,18,0.55)'); gg.addColorStop(1, 'rgba(6,14,18,0)');
      ctx.fillStyle = gg; ctx.fillRect(x - cw * 0.4, y - ch * 0.8, cw * 0.8, ch * 0.9);
      const o = { gloss: 0.12, fuzz: 1.4, tone: tn * (r & 1 ? 0.97 : 1.03), twist: 1.1, plyA: 0.34, sink: false, shadow: 1.1 };
      thread(ctx, L0, L1, w, col, { ...o, bow: 0.13, seed: r * 977 + c * 13 });
      thread(ctx, R0, R1, w, col, { ...o, bow: -0.13, seed: r * 977 + c * 13 + 5 });
    }
  }
}

// Frayed ends and a few loops hanging into the hole
export function frayInto(ctx, hole, col, n = 7, seed = 4, w = 16) {
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, rr = 1.0 - 0.02 * r(), p = P(hole.cx + Math.cos(a) * hole.rx * rr, hole.cy + Math.sin(a) * hole.ry * rr);
    const d = 70 + r() * 110, q = P(p.x - Math.cos(a) * d, p.y - Math.sin(a) * d * 0.9 + 12);
    loose(ctx, p, P(p.x - Math.cos(a) * d * 0.3 + 14, p.y - Math.sin(a) * d * 0.3 + 12), P(q.x + 10, q.y - 16), q, w, col, { n: 14, lift: 0.3, gloss: 0.1 });
  }
}

// The darn: warp threads first (top to bottom), then weft rows woven over/under. Returns items in stitching order
// with `warpCount` and `rows` for the timeline.
export function darn({ cx, cy, rx, ry, w = 9, gap = 11.6, warpCol, weftCol, margin = 26, seed = 6 }) {
  const rnd = mulberry(seed), warp = [], weft = [];
  const x0 = cx - rx - margin, x1 = cx + rx + margin, nW = Math.floor((x1 - x0) / gap);
  const xs = Array.from({ length: nW + 1 }, (_, k) => x0 + k * gap + (nW * gap - (x1 - x0)) / -2);
  const half = x => { const d = (x - cx) / rx; return Math.sqrt(Math.max(0.0, 1 - Math.min(1, d * d))) * ry + margin; };
  xs.forEach((x, k) => {
    const hh = half(x); if (hh < margin + 2) return;
    warp.push({ k: 't', a: P(x + (rnd() - 0.5) * 1.5, cy - hh), b: P(x + (rnd() - 0.5) * 1.5, cy + hh), w, col: warpCol, o: { gloss: 0.5, bow: 0, ply: true, tone: 0.97 + rnd() * 0.06, seed: k * 31 + seed, sink: true }, x });
  });
  const rows = []; let r = 0;
  for (let y = cy - ry - margin * 0.4; y <= cy + ry + margin * 0.4; y += gap, r++) {
    const row = [], hw = Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / (ry + margin * 0.4), 2))) * (rx + margin) + 6;
    const ks = xs.filter(x => Math.abs(x - cx) <= hw);
    if (ks.length < 2) continue;
    const order = r & 1 ? ks.slice().reverse() : ks;
    let pend = null;
    for (let i = 0; i < order.length - 1; i++) {
      const xa = order[i], xb = order[i + 1];
      row.push({ k: 't', a: P(xa, y + (rnd() - 0.5)), b: P(xb, y + (rnd() - 0.5)), w, col: weftCol, o: { gloss: 0.5, bow: 0, ply: true, tone: 0.97 + rnd() * 0.06, seed: r * 91 + i, sink: i === 0 } });
      const kb = xs.indexOf(xb), under = (kb + r) & 1;
      if (pend) { row.push(pend); pend = null; }
      if (under) pend = ({ k: 't', a: P(xb, y - w * 0.62), b: P(xb, y + w * 0.62), w, col: warpCol, o: { gloss: 0.5, bow: 0, ply: false, tone: 1, seed: kb * 7 + r, sink: false, shadow: 0.7 } });
    }
    if (pend) row.push(pend);
    rows.push(row);
  }
  return { warp, rows };
}
