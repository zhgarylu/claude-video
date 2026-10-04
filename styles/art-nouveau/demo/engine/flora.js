// Art Nouveau engine, part 2: botanical stylisation.  Leaves, sword blades, stems, irises, small blossoms, and the Vine
// (a whiplash spine that grows, with leaves and flowers that unfold as the growth passes them).
import { clamp, lerp, seg, ss, eio, eo, TAU, mulberry } from '/core/lib.js';
import { PAL, mix, rgba, shape, inkLine, whip, ribbonPoly, resample, catmull, P2, at, polyPath, circlePts } from './ink.js';

const D = Math.PI / 180;
const inkW = s => Math.max(1.6, s * .02 + 1.4);

// ---------- leaf ----------
export function leafPoly(x, y, ang, L, W, { bend = .5, pw = .75, n = 22 } = {}) {
  const ax = [], Lp = [], Rp = []; let px = x, py = y;
  for (let i = 0; i <= n; i++) {
    const u = i / n, th = ang + bend * Math.pow(u, 1.3), hw = W / 2 * Math.pow(Math.sin(Math.PI * Math.pow(u, pw)), .9);
    ax.push({ x: px, y: py, th, u }); const nx = Math.sin(th), ny = -Math.cos(th);
    Lp.push({ x: px + nx * hw, y: py + ny * hw }); Rp.push({ x: px - nx * hw, y: py - ny * hw });
    px += Math.cos(th) * L / n; py += Math.sin(th) * L / n;
  }
  return { ax, Lp, Rp, poly: Lp.concat(Rp.slice().reverse()) };
}
export function leaf(ctx, x, y, ang, L, W, o = {}) {
  const { bend = .5, age = 1, fill = PAL.sage, fillB = PAL.sageDk, vein = PAL.oliveDk, veins = 4, ink = inkW(W), rib = true, side = 1 } = o;
  const a = eo(age); if (a <= .01) return;
  const bb = bend + (1 - a) * 2.4 * side;
  const lf = leafPoly(x, y, ang, L * (.25 + .75 * a), W * (.2 + .8 * a), { bend: bb });
  const half = lf.ax.concat(lf.Rp.slice().reverse());
  ctx.save(); ctx.fillStyle = fill; polyPath(ctx, lf.poly); ctx.fill();
  ctx.fillStyle = fillB; polyPath(ctx, half); ctx.fill();                       // the half turned away from the light
  ctx.restore();
  if (rib) {
    inkLine(ctx, lf.ax, { w: Math.max(1.4, ink * .7), t0: .05, t1: .3 });
    if (a > .6) for (let k = 1; k <= veins; k++) {
      const i = Math.round((.12 + k * .17) * (lf.ax.length - 1)), j = Math.min(lf.ax.length - 1, i + 3);
      for (const E of [lf.Lp, lf.Rp]) inkLine(ctx, [lf.ax[i], { x: (lf.ax[i].x + E[j].x) / 2 + (E[j].y - lf.ax[i].y) * .05, y: (lf.ax[i].y + E[j].y) / 2 }, { x: lerp(lf.ax[i].x, E[j].x, .92), y: lerp(lf.ax[i].y, E[j].y, .92) }], { w: Math.max(1, ink * .45), col: vein, alpha: .7, t0: .05, t1: .5 });
    }
  }
  inkLine(ctx, lf.poly, { w: ink, k: .9, closed: true });
  return lf;
}

// ---------- stems and sword blades along a whiplash curve ----------
export function stem(ctx, S, o = {}) {
  const { w0 = 10, w1 = 2.5, fill = PAL.olive, fillB = PAL.oliveDk, ink = 2.6 } = o;
  if (!S || S.length < 3) return;
  const rb = ribbonPoly(S, u => lerp(w0, w1, Math.pow(u, .8)) + 0);
  const half = S.map(p => ({ x: p.x, y: p.y })).concat(rb.R.slice().reverse());
  ctx.save(); ctx.fillStyle = fill; polyPath(ctx, rb.poly); ctx.fill(); ctx.fillStyle = fillB; polyPath(ctx, half); ctx.fill(); ctx.restore();
  inkLine(ctx, rb.poly, { w: ink, k: .9, closed: true });
}
export function blade(ctx, S, o = {}) {      // iris sword leaf: widest near the base, long pointed tip
  const { W = 56, fill = PAL.sage, fillB = PAL.sageDk, ink = 3, rib = true } = o;
  if (!S || S.length < 4) return;
  const wf = u => W * Math.pow(Math.sin(Math.PI * Math.pow(u, .55)), .75) * (1 - .45 * u);
  const rb = ribbonPoly(S, (u) => Math.max(.5, wf(u)));
  const half = S.map(p => ({ x: p.x, y: p.y })).concat(rb.R.slice().reverse());
  ctx.save(); ctx.fillStyle = fill; polyPath(ctx, rb.poly); ctx.fill(); ctx.fillStyle = fillB; polyPath(ctx, half); ctx.fill(); ctx.restore();
  if (rib) for (const f of [-.5, .5, 0]) {                     // parallel veins following the spine
    const V = S.filter((_, i) => i % 2 === 0).map(p => { const h = wf(p.u) * f * .5; return { x: p.x + Math.sin(p.th) * h, y: p.y - Math.cos(p.th) * h }; });
    inkLine(ctx, V.slice(2, Math.floor(V.length * .86)), { w: f === 0 ? 2 : 1.3, col: PAL.oliveDk, alpha: f === 0 ? .8 : .5, t0: .1, t1: .5 });
  }
  inkLine(ctx, rb.poly, { w: ink, k: .9, closed: true });
}

// ---------- the iris ----------
function petal(x, y, ang, len, wid, { droop = 0, pe = .65, ruff = 0, ph = 0, n = 24 } = {}) {
  const ax = [], Lp = [], Rp = []; let px = x, py = y;
  for (let i = 0; i <= n; i++) {
    const u = i / n, th = ang + droop * Math.pow(u, 1.5);
    let hw = wid / 2 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, pe))), .7);
    if (ruff) hw *= 1 + ruff * Math.sin(u * TAU * 3.2 + ph) * ss((u - .35) / .4);
    const nx = Math.sin(th), ny = -Math.cos(th); ax.push({ x: px, y: py, th, u });
    Lp.push({ x: px + nx * hw, y: py + ny * hw }); Rp.push({ x: px - nx * hw, y: py - ny * hw });
    px += Math.cos(th) * len / n; py += Math.sin(th) * len / n;
  }
  return { ax, Lp, Rp, poly: Lp.concat(Rp.slice().reverse()) };
}
export const IRIS = { std: PAL.lilacLt, stdSh: PAL.lilac, fall: PAL.violet, fallSh: PAL.violetDk, vein: '#4a4580', beard: PAL.ochre };
// x,y = where the petals meet; up = pointing direction of the flower (default straight up); L = petal length in px.
export function iris(ctx, x, y, o = {}) {
  const { L = 150, open = 1, up = -90, cols = IRIS, sway = 0, spathe = true } = o;
  const oo = clamp(open), os = eio(seg(oo, 0, .65)), of = eio(seg(oo, .3, 1)), W = L * .6;
  ctx.save(); ctx.translate(x, y); ctx.rotate((up + 90) * D + sway); ctx.translate(-x, -y);  // work in "pointing up" space
  const U = -90 * D, ink = inkW(L * .5);
  if (spathe) {                                              // papery sheath behind the petals
    const sp = 1 - .5 * oo;
    for (const s of [-1, 1]) leaf(ctx, x, y + L * .1, U + s * (14 + 40 * oo) * D, L * .46 * sp + L * .1, L * .2, { bend: -s * .35, age: 1, fill: PAL.sageLt, fillB: PAL.sage, veins: 2, ink: 2.2 });
  }
  const std = [{ h: U - 30 * D * os, d: .5 * os, wid: W * (.5 + .22 * os), l: L * .98 }, { h: U + 30 * D * os, d: -.5 * os, wid: W * (.5 + .22 * os), l: L * .98 }];
  const back = petal(x, y, U, L * 1.04, W * (.46 + .1 * os), { droop: 0, pe: .62 });
  const fl = [{ h: lerp(U - 8 * D, 156 * D, of), d: -.85 * of, side: -1 }, { h: lerp(U + 8 * D, 24 * D, of), d: .85 * of, side: 1 }];
  const paint = (P, f, sh, vein) => shape(ctx, P.poly, { fill: f, shade: sh, sd: L * .05, ink, k: .9 });
  paint(back, cols.std, cols.stdSh);
  inkLine(ctx, back.ax.slice(2, 18), { w: 1.6, col: cols.vein, alpha: .4, t0: .1, t1: .4 });
  for (const s of std) { const p = petal(x, y, s.h, s.l, s.wid, { droop: s.d, pe: .62, ruff: .05 * os }); paint(p, cols.std, cols.stdSh);
    inkLine(ctx, p.ax.slice(2, 20), { w: 1.6, col: cols.vein, alpha: .4, t0: .1, t1: .4 }); }
  // falls: two side falls, then the broad front fall
  const fallPetal = (h, d, l, wid, ph) => petal(x, y, h, l, wid, { droop: d, pe: 1.35, ruff: .07 * of, ph, n: 30 });
  const drawFall = (p, side) => {
    paint(p, cols.fall, cols.fallSh);
    const m = p.ax.length;
    for (let k = -2; k <= 2; k++) {                                   // veining that fans out from the beard
      const V = p.ax.slice(2, m - 5).map(q => { const hw = (Math.hypot(p.Lp[q.u * (m - 1) | 0].x - q.x, p.Lp[q.u * (m - 1) | 0].y - q.y)) * k * .36; return { x: q.x + Math.sin(q.th) * hw, y: q.y - Math.cos(q.th) * hw }; });
      inkLine(ctx, V, { w: 1.5, col: '#cfc8ee', alpha: .55, t0: .1, t1: .5 });
    }
    // beard: an ochre strip with short tufts
    const B = p.ax.slice(3, Math.round(m * .5));
    const bw = i => Math.hypot(p.Lp[3 + i].x - p.Rp[3 + i].x, p.Lp[3 + i].y - p.Rp[3 + i].y) * .17;
    const rb = ribbonPoly(B.map((q, i) => ({ ...q, u: i / (B.length - 1) })), u => Math.max(2, bw(Math.round(u * (B.length - 1))) * 1.3 * Math.sin(Math.PI * Math.min(1, u * .9 + .08))));
    shape(ctx, rb.poly, { fill: cols.beard, ink: 1.8, k: .7 });
    for (let i = 1; i < B.length - 1; i += 2) { const q = B[i], h = bw(i) * .55; inkLine(ctx, [{ x: q.x - Math.sin(q.th) * h, y: q.y + Math.cos(q.th) * h }, { x: q.x + Math.sin(q.th) * h, y: q.y - Math.cos(q.th) * h }], { w: 1.4, col: PAL.ochreDk, alpha: .8 }); }
  };
  drawFall(fallPetal(fl[0].h, fl[0].d, L * 1.02, W * (.5 + .25 * of), 0), -1);
  drawFall(fallPetal(fl[1].h, fl[1].d, L * 1.02, W * (.5 + .25 * of), 2), 1);
  if (of > .25) drawFall(fallPetal(lerp(U, 92 * D, of), lerp(0, .12, of), L * lerp(.6, .86, of), W * (.45 + .38 * of), 1), 0);
  // standards' crest tips (style arms) in the throat
  if (os > .3) for (const s of [-1, 1]) { const p = petal(x, y - L * .05, U + s * 12 * D, L * .38, W * .2, { droop: -s * .5, pe: .7 }); shape(ctx, p.poly, { fill: cols.beard, ink: 1.8, k: .6, shade: PAL.ochreDk, sd: 3 }); }
  ctx.restore();
}

// ---------- a small round blossom, a berry, a seed head ----------
export function blossom(ctx, x, y, r, o = {}) {
  const { n = 5, rot = 0, fill = PAL.roseLt, shade = PAL.rose, core = PAL.ochre, open = 1 } = o;
  const a = eo(open); if (a <= .02) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  for (let i = 0; i < n; i++) { const th = i / n * TAU - Math.PI / 2, R = r * a;
    const P = catmull(P2([[0, 0], [Math.cos(th - .5) * R * .75, Math.sin(th - .5) * R * .75], [Math.cos(th - .22) * R * 1.05, Math.sin(th - .22) * R * 1.05], [Math.cos(th) * R * 1.12, Math.sin(th) * R * 1.12], [Math.cos(th + .22) * R * 1.05, Math.sin(th + .22) * R * 1.05], [Math.cos(th + .5) * R * .75, Math.sin(th + .5) * R * .75]]), 6, true);
    shape(ctx, P, { fill, shade, sd: r * .12, ink: Math.max(1.6, r * .07), k: .8 }); }
  const c = circlePts(0, 0, r * .26 * a, 18); shape(ctx, c, { fill: core, shade: PAL.ochreDk, sd: 2, ink: Math.max(1.4, r * .05) });
  ctx.restore();
}
export function berry(ctx, x, y, r, o = {}) { const { fill = PAL.rose, shade = PAL.roseDk } = o; shape(ctx, circlePts(x, y, r, 20), { fill, shade, sd: r * .35, ink: Math.max(1.5, r * .12), hi: mix(fill, '#ffffff', .45) }); }

// ---------- the Vine ----------
// def: {x,y,ang,len,wave,freq,phase,bias,curl,curlLen,dir, w0,w1, nodes:[{u,side,kind,size,...}], seed}
// Growth g in 0..1.  A node at spine position u wakes up when the tip has passed it (so leaves unfold behind the growing tip).
export function vineSpine(def, g, t = 0) {
  const sw = def.sway ? Math.sin(t * .9 + (def.phase || 0)) * def.sway : 0;
  return whip(def.x, def.y, def.ang, def.len, { ...def, phase: (def.phase || 0) + sw, g });
}
export function drawVine(ctx, def, g, t = 0, o = {}) {
  const S = vineSpine(def, g, t); if (S.length < 4) return S;
  const pad = def.tipLen ?? .16;
  const grow = (u, dur = .22) => clamp((g - u - pad * .15) / dur);        // 0..1 for a node at u
  // sword blades and secondary stems go under the main stem
  const nodes = (def.nodes || []).filter(n => n.u < g - .01);
  for (const nd of nodes) if (nd.kind === 'tendril') {
    const p = at(S, nd.u), a = grow(nd.u, nd.dur || .3);
    if (a > 0) { const T = whip(p.x, p.y, p.th + nd.side * (nd.turn ?? 1.1), nd.len, { wave: nd.wave ?? .5, freq: 1, phase: nd.ph || 0, curl: nd.curl ?? 1.1, curlLen: .45, dir: nd.side, g: eo(a), tipTurns: .9, tipLen: .2 });
      stem(ctx, T, { w0: (nd.w || 5), w1: 1.5, ink: 2 }); }
  }
  const lk = o.look ?? 1;      // 0 = a thin gilded line, 1 = a green stem: the line thickens into the plant
  stem(ctx, S, { w0: (def.w0 ?? 10) * (.62 + .38 * lk), w1: (def.w1 ?? 2.5) * (.6 + .4 * lk), ink: (def.ink ?? 2.8) * (.6 + .4 * lk), fill: mix(PAL.ochre, PAL.olive, lk), fillB: mix(PAL.ochreDk, PAL.oliveDk, lk) });
  for (const nd of nodes) {
    const p = at(S, nd.u), a = grow(nd.u, nd.dur || .25); if (a <= 0 || nd.kind === 'tendril') continue;
    if (nd.kind === 'leaf') leaf(ctx, p.x, p.y, p.th + nd.side * (nd.turn ?? .9), nd.size, nd.size * (nd.aspect ?? .42), { bend: -nd.side * (nd.bend ?? .5), age: a, side: nd.side, fill: nd.fill || PAL.sage, fillB: nd.fillB || PAL.sageDk });
    else if (nd.kind === 'blossom') blossom(ctx, p.x, p.y, nd.size, { open: a, rot: nd.rot || 0, fill: nd.fill, shade: nd.shade });
    else if (nd.kind === 'berry') berry(ctx, p.x, p.y, nd.size * eo(a), { fill: nd.fill, shade: nd.shade });
    else if (nd.kind === 'iris') iris(ctx, p.x, p.y, { L: nd.size * eo(Math.min(1, a * 1.2)), open: clamp((g - nd.u - (nd.delay ?? .1)) / (nd.dur || .25)), up: (p.th * 180 / Math.PI) + (nd.turnDeg || 0) , sway: Math.sin(t * .8 + nd.u * 9) * .02 });
  }
  return S;
}
