// Art Nouveau engine, part 4: the letterform builder.  Capitals are skeletons (smooth strokes through control points,
// cap height 100); a broad-nib width model gives thick verticals and thin horizontals, strokes swell and taper,
// terminals can run on into whiplash tails, and the whole line can be bent by any warp (an arc, a wave, a camera).
import { clamp, lerp, ss, TAU } from '/core/lib.js';
import { PAL, catmull, P2, inkLine, polyPath, whip, ribbonPoly, resample } from './ink.js';

// each letter: advance width and strokes (list of points; `c:1` closes it)
const G = {
  A: { w: 80, s: [[[4, 100], [40, 0]], [[40, 0], [76, 100]], [[17, 68], [40, 62], [63, 68]]] },
  B: { w: 66, s: [[[9, 0], [9, 100]], [[9, 2], [34, 0], [51, 12], [50, 28], [34, 45], [9, 49]], [[9, 49], [40, 50], [60, 64], [60, 82], [40, 99], [9, 100]]] },
  C: { w: 74, s: [[[68, 20], [54, 5], [36, 0], [17, 10], [6, 36], [6, 66], [17, 91], [36, 100], [54, 95], [68, 80]]] },
  D: { w: 76, s: [[[9, 0], [9, 100]], [[9, 2], [38, 1], [62, 20], [69, 50], [62, 80], [38, 99], [9, 100]]] },
  E: { w: 58, s: [[[10, 0], [10, 100]], [[10, 3], [34, 0], [52, 9]], [[10, 50], [32, 47], [44, 52]], [[10, 97], [34, 100], [54, 90]]] },
  F: { w: 54, s: [[[10, 0], [10, 100]], [[10, 3], [34, 0], [52, 9]], [[10, 50], [32, 47], [44, 52]]] },
  G: { w: 78, s: [[[68, 20], [54, 5], [36, 0], [17, 10], [6, 36], [6, 66], [17, 91], [36, 100], [56, 94], [70, 78], [71, 56], [46, 56]]] },
  H: { w: 76, s: [[[9, 0], [9, 100]], [[67, 0], [67, 100]], [[9, 54], [38, 47], [67, 54]]] },
  I: { w: 24, s: [[[12, 0], [12, 100]]] },
  J: { w: 44, s: [[[30, 0], [30, 74], [24, 93], [10, 100], [0, 90]]] },
  K: { w: 68, s: [[[9, 0], [9, 100]], [[62, 0], [10, 58]], [[26, 42], [64, 100]]] },
  L: { w: 54, s: [[[10, 0], [10, 100]], [[10, 98], [30, 100], [52, 90]]] },
  M: { w: 94, s: [[[9, 100], [9, 0]], [[9, 0], [47, 74]], [[47, 74], [85, 0]], [[85, 0], [85, 100]]] },
  N: { w: 78, s: [[[9, 100], [9, 0]], [[9, 0], [69, 100]], [[69, 100], [69, 0]]] },
  O: { w: 82, s: [{ c: 1, p: [[41, 0], [67, 10], [77, 50], [67, 90], [41, 100], [15, 90], [5, 50], [15, 10]] }] },
  P: { w: 60, s: [[[9, 0], [9, 100]], [[9, 2], [36, 0], [54, 15], [54, 34], [36, 50], [9, 52]]] },
  Q: { w: 82, s: [{ c: 1, p: [[41, 0], [67, 10], [77, 50], [67, 90], [41, 100], [15, 90], [5, 50], [15, 10]] }, [[50, 78], [62, 94], [78, 100], [92, 94]]] },
  R: { w: 68, s: [[[9, 0], [9, 100]], [[9, 2], [36, 0], [54, 15], [54, 34], [36, 50], [9, 52]], [[26, 50], [44, 76], [64, 100]]] },
  S: { w: 58, s: [[[51, 17], [39, 3], [22, 2], [8, 14], [10, 33], [29, 47], [47, 60], [51, 78], [42, 95], [26, 100], [10, 94], [3, 80]]] },
  T: { w: 70, s: [[[2, 7], [35, 0], [68, 7]], [[35, 0], [35, 100]]] },
  U: { w: 78, s: [[[9, 0], [9, 64], [18, 90], [39, 100], [60, 90], [69, 64], [69, 0]]] },
  V: { w: 78, s: [[[4, 0], [39, 100]], [[39, 100], [74, 0]]] },
  W: { w: 116, s: [[[3, 0], [24, 100]], [[24, 100], [58, 24]], [[58, 24], [92, 100]], [[92, 100], [113, 0]]] },
  X: { w: 72, s: [[[6, 0], [66, 100]], [[66, 0], [6, 100]]] },
  Y: { w: 72, s: [[[4, 0], [36, 54]], [[68, 0], [36, 54]], [[36, 54], [36, 100]]] },
  Z: { w: 68, s: [[[6, 5], [34, 0], [62, 3]], [[62, 3], [6, 97]], [[6, 97], [34, 100], [64, 95]]] },
  ' ': { w: 34, s: [] },
  '.': { w: 22, s: [{ c: 1, p: [[8, 94], [14, 90], [20, 96], [14, 102]] }] },
};

function samples(st, n = 12) {                         // st: array of [x,y] or {c, p}
  const closed = !Array.isArray(st), pts = P2(closed ? st.p : st);
  return { S: catmull(pts, pts.length > 2 ? n : 20, closed), closed };
}

// Sprouts: the terminals that run on into small whiplash curls, per letter (stroke index, which end, length in units, curl direction).
const SPR = {
  I: [{ stroke: 0, end: 'start', len: 78, dir: 1, curl: .8, wave: .1 }],
  T: [{ stroke: 0, end: 'end', len: 70, dir: 1, curl: .8, wave: .1 }, { stroke: 0, end: 'start', len: 70, dir: -1, curl: .8, wave: .1 }],
  E: [{ stroke: 1, end: 'end', len: 52, dir: 1, curl: .8, wave: .1 }, { stroke: 3, end: 'end', len: 60, dir: -1, curl: .8, wave: .1 }],
  U: [{ stroke: 0, end: 'start', len: 58, dir: -1, curl: .8, wave: .1 }, { stroke: 0, end: 'end', len: 58, dir: 1, curl: .8, wave: .1 }],
  H: [{ stroke: 2, end: 'start', len: 40, dir: 1, curl: .8, wave: .1 }],
  L: [{ stroke: 1, end: 'end', len: 56, dir: -1, curl: .8, wave: .1 }],
  A: [{ stroke: 2, end: 'end', len: 40, dir: 1, curl: .8, wave: .1 }],
  S: [{ stroke: 0, end: 'start', len: 40, dir: 1, curl: .8, wave: .1 }],
};
function extend(st, sw) {
  const S = st.S, end = sw.end === 'start' ? 0 : S.length - 1, e = S[end], p = S[end === 0 ? 4 : S.length - 5];
  const ang = Math.atan2(e.y - p.y, e.x - p.x), tail = whip(e.x, e.y, ang, sw.len, { wave: sw.wave ?? .35, freq: sw.freq ?? .8, phase: sw.phase ?? 0, bias: sw.bias ?? 0, curl: sw.curl ?? 1.1, curlLen: sw.curlLen ?? .65, dir: sw.dir ?? 1, step: 2 });
  const n = tail.length - 1;
  st.S = end === 0 ? tail.slice(1).reverse().concat(S) : S.concat(tail.slice(1));
  if (end === 0) st.tA = (st.tA || 0) + n; else st.tB = (st.tB || 0) + n;
}

// glyph layout: [{ch, x, strokes:[{S, closed}]}] plus total width; `swash` = {charIndex:{stroke, end, len, wave, curl, dir, bias}}
export function layout(text, o = {}) {
  const { track = 8, swash = {}, wnib = [3.4, 27], nib = 24, sprout = false } = o, out = []; let x = 0;
  [...text.toUpperCase()].forEach((ch, idx) => {
    const g = G[ch] || G[' '], strokes = g.s.map(s => samples(s));
    if (sprout && SPR[ch]) for (const sw of SPR[ch]) if (strokes[sw.stroke]) extend(strokes[sw.stroke], { ...sw, len: sw.len * (typeof sprout === 'number' ? sprout : 1) });
    const sw = swash[idx];
    if (sw && strokes[sw.stroke]) extend(strokes[sw.stroke], sw);
    out.push({ ch, x, strokes, w: g.w });
    x += g.w + track;
  });
  return { glyphs: out, width: x - track, wnib, nib };
}

// Draw a laid-out line.  px = pixels per 100 units of cap height.  pos(x,y) maps letter units (x along the line from 0,
// y 0 = cap line, 100 = baseline) to screen; the default is a straight line starting at (x0,y0).  prog (0..1) draws the
// strokes on one after another, in writing order.
export function drawLayout(ctx, L, o = {}) {
  const { x0 = 0, y0 = 0, px = 120, pos = null, fill = PAL.ochre, edge = PAL.ink, edgeW = 3, inline = PAL.cream, prog = 1, shadeCol = PAL.ochreDk, k = 1 } = o;
  const f = px / 100, [wmin, wmax] = L.wnib, nib = L.nib * Math.PI / 180;
  const P = pos || ((x, y) => ({ x: x0 + x * f, y: y0 + y * f }));
  // collect all strokes in order
  const all = []; L.glyphs.forEach(g => g.strokes.forEach(s => all.push({ g, S: s.S, closed: s.closed, tA: s.tA || 0, tB: s.tB || 0 })));
  const tot = all.reduce((a, s) => a + s.S.length, 0); let acc = 0;
  const parts = [];
  for (const s of all) {
    const n0 = s.S.length, a0 = acc / tot, a1 = (acc + n0) / tot; acc += n0;
    const pr = clamp((prog - a0) / (a1 - a0)); if (pr <= 0) continue;
    const m = Math.max(2, Math.round(n0 * pr)), Q = s.S.slice(0, m);
    const W = Q.map(p => P(s.g.x + p.x, p.y));
    const rows = W.map((q, i) => {
      const a = Q[Math.max(0, i - 1)], b = Q[Math.min(Q.length - 1, i + 1)], th = Math.atan2(b.y - a.y, b.x - a.x);
      const u = i / (Q.length - 1), thick0 = wmin + (wmax - wmin) * Math.abs(Math.sin(th - nib));
      const nT = s.S.length, tl = i < s.tA ? 1 - i / s.tA : (i >= nT - s.tB ? (i - (nT - s.tB)) / s.tB : 0);      // 0 on the letter, 1 at the tip of a sprout
      const thick = thick0 * (1 - .72 * ss(tl)) * (tl > 0 ? .8 : 1);
      const sw = s.closed ? 1 : .9 + .2 * Math.sin(Math.PI * Math.min(1, u));          // firm, cut terminals: a swell, no taper
      return { q, w: thick * sw * f };
    });
    parts.push({ rows, closed: s.closed });
  }
  const ribbon = (rows, closed, widen = 0, scale = 1) => {
    const n = rows.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const a = rows[closed ? (i - 1 + n) % n : Math.max(0, i - 1)].q, b = rows[closed ? (i + 1) % n : Math.min(n - 1, i + 1)].q;
      let tx = b.x - a.x, ty = b.y - a.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
      const h = Math.max(.4, rows[i].w * scale / 2 + widen); Lp.push({ x: rows[i].q.x + ty * h, y: rows[i].q.y - tx * h }); Rp.push({ x: rows[i].q.x - ty * h, y: rows[i].q.y + tx * h });
    }
    return { Lp, Rp };
  };
  const draw = (fn) => parts.forEach(pt => { const { Lp, Rp } = ribbon(pt.rows, pt.closed, fn.widen || 0, fn.scale || 1);
    ctx.beginPath();
    if (pt.closed) { ctx.moveTo(Lp[0].x, Lp[0].y); Lp.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.moveTo(Rp[0].x, Rp[0].y); Rp.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); fn.paint('evenodd'); }
    else { ctx.moveTo(Lp[0].x, Lp[0].y); Lp.forEach(p => ctx.lineTo(p.x, p.y)); for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i].x, Rp[i].y); ctx.closePath(); fn.paint('nonzero'); } });
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // 1. one dark outline under everything (so overlapping strokes of a letter merge into one shape)
  ctx.strokeStyle = edge; ctx.fillStyle = edge;
  draw({ paint: m => { ctx.lineWidth = edgeW * 2; ctx.stroke(); ctx.fill(m); } });
  // round the free ends of strokes
  // 2. the fill, with a shade edge away from the light
  ctx.fillStyle = fill; draw({ paint: m => ctx.fill(m) });
  // 3. the inline: a hairline of cream down the middle of the thick strokes
  if (inline) parts.forEach(pt => { const rows = pt.rows.map(r => ({ q: r.q, w: r.w })); const pts = rows.map(r => r.q);
    inkLine(ctx, pt.closed ? pts : pts.slice(Math.min(3, pts.length - 2), pts.length - Math.min(3, pts.length - 2)), { w: Math.max(1.6, px * .014), col: inline, closed: pt.closed, t0: .15, t1: .15, tmin: .1, alpha: .9 }); });
  ctx.restore();
}

// Warps: map letter units onto a circle (text bent along an arc) -------------------------------------------------
// The line's centre sits at `ang` (radians; -PI/2 = top of the circle); y=100 (baseline) sits at radius R, the cap line outwards.
export function arcPos(L, cx, cy, R, ang, px, inward = false) {
  const f = px / 100, half = L.width / 2;
  return (x, y) => {
    const d = (x - half) * f, h = (100 - y) * f;
    if (!inward) { const a = ang + d / R, r = R + h; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; }
    const a = ang - d / R, r = R + (y - 0) * f; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };
}
// A gentle wave along a line for flowing banners
export function wavePos(x0, y0, px, amp, wl, ph = 0) { const f = px / 100; return (x, y) => ({ x: x0 + x * f, y: y0 + y * f + Math.sin(x * f / wl * TAU + ph) * amp }); }
