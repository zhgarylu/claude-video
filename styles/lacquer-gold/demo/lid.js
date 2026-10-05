// The lid: black lacquer over a box, with gold lines, powder, pearl flecks, a window reflection and a sheen band.
// Everything is drawn from time t alone. World = lid space (centre 0,0; 1240 x 800).
import { W, H, C, mk, ctx2, clamp, lerp, ss, seg, ramp, eio, mulberry, hash, vnoise, TAU, rgba, windowSprite, tinted, blobSprite, sheenBand, woodTexture, goldStroke, goldShade, goldGlow, buildPowder, drawPowder, buildPearl, drawPearl, flatBrush, seal } from './lacq.js';
import { LID, CRANE, SUN, craneFills, waveFill } from './motifs.js';
import { T, DESIGN } from './timeline.js';
import { track } from '/core/lib.js';

export const camXf = (g, c) => { g.setTransform(1, 0, 0, 1, 0, 0); g.translate(c.sx ?? 960, c.sy ?? 540); g.scale(c.z, c.z); g.rotate(c.rot || 0); g.translate(-c.x, -c.y); };
export const toScr = (c, x, y) => { const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0), dx = (x - c.x) * c.z, dy = (y - c.y) * c.z; return [(c.sx ?? 960) + dx * cs - dy * sn, (c.sy ?? 540) + dx * sn + dy * cs]; };

let G = null, GG = null, TABLE = null, POWDER = null, PEARL = null;
function init() {
  if (G) return;
  G = mk(); GG = ctx2(G);
  TABLE = woodTexture(2400, 1500, 9);
  const F = craneFills();
  const fills = [
    { poly: F.body.poly, dens: .34, mult: 1, radial: [F.body.poly[0][0], F.body.poly[0][1], 190] },
    { poly: F.wing.poly, edge: F.wing.edge, width: 150, dens: .30 },
    { poly: F.far.poly, edge: F.far.edge, width: 110, dens: .22 },
  ];
  // the sun disc, graded from its centre; the wave scales, graded from the top
  const sunPoly = Array.from({ length: 60 }, (_, i) => [SUN.x + Math.cos(i / 60 * TAU) * (SUN.r - 20), SUN.y + Math.sin(i / 60 * TAU) * (SUN.r - 20)]);
  fills.push({ poly: sunPoly, dens: .42, radial: [SUN.x - 12, SUN.y - 12, SUN.r - 10] });
  for (const w of waveFill()) fills.push({ poly: Array.from({ length: 24 }, (_, i) => [w.cx + Math.cos(Math.PI + i / 23 * Math.PI) * (w.r * .98), w.cy + Math.sin(Math.PI + i / 23 * Math.PI) * (w.r * .98)]), dens: .16, grad: (x, y) => clamp(.2 + (y - (w.cy - w.r)) / w.r * 1.2) });
  POWDER = buildPowder(fills, 11);
  PEARL = buildPearl([-LID.w / 2 + 30, -LID.h / 2 + 30, LID.w - 60, LID.h - 60], 340, 5);
}

const lidPath = (g, inset = 0, r = LID.r) => { g.beginPath(); g.roundRect(-LID.w / 2 + inset, -LID.h / 2 + inset, LID.w - inset * 2, LID.h - inset * 2, Math.max(2, r - inset)); };

// ---- state: everything that changes with time ---------------------------------------------------------------
const CAM = track([
  [0, [0, 0, .84]], [25.0, [0, 0, .84]], [25.9, [30, -20, .98]], [27.6, [88, -66, 1.45]], [29.6, [10, -60, 1.25]],
  [31.6, [-120, -70, 1.28]], [33.6, [-90, -40, 1.1]], [36.0, [10, 10, .98]], [38.4, [0, 0, 1.0]],
]);
const SY = track([[0, [610]], [25.0, [610]], [27, [560]], [33, [540]], [38.4, [540]]]);
export function lidState(t) {
  const [x, y, z] = CAM(t), sy = SY(t)[0];
  const s = { cam: { x, y, z, rot: 0, sx: 960, sy }, turn: 0, lift: 0, off: 0, sheen: null, win: { u: 0, a: .5, tint: 0 } };
  // turn phase: pull out and rotate about the vertical axis; two sheen sweeps
  if (t >= T.turn0) {
    const k = seg(t, T.turn0, T.turn1);
    s.cam = { x: 0, y: 0, z: lerp(1.0, .86, ss(k)), rot: 0, sx: 960, sy: 540 };
    s.turn = .2 * Math.sin(k * TAU) * (1 - .45 * k) * (1 - ss(seg(k, .8, 1)));  // swings one way, then the other, and settles
  }
  if (t >= T.turn1) s.cam = { x: 0, y: 0, z: .86 + .1 * ss(seg(t, T.off0, T.title0 + 1)), rot: 0, sx: 960, sy: 540 };
  s.lift = ss(seg(t, T.lift0, T.lift0 + 1.0));
  s.off = ss(seg(t, T.off0, T.off1));
  return s;
}

// ---- the box that sits under the lid ----------------------------------------------------------------------------
const BOX = { w: 1264, h: 824, r: 56 };
function drawBox(g, t, st, p) {
  const hw = BOX.w / 2, hh = BOX.h / 2;
  // outer black body (the lip you see around the lid)
  g.save();
  g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 60; g.shadowOffsetX = 10; g.shadowOffsetY = 26;
  g.fillStyle = '#0b0706'; g.beginPath(); g.roundRect(-hw, -hh, BOX.w, BOX.h, BOX.r); g.fill(); g.restore();
  const open = st.off;
  // rim lip (vermilion line on the black)
  g.save(); g.beginPath(); g.roundRect(-hw + 10, -hh + 10, BOX.w - 20, BOX.h - 20, BOX.r - 8); g.clip();
  // interior floor
  const fl = g.createRadialGradient(0, -80, 40, 0, 0, 760);
  fl.addColorStop(0, '#d23a24'); fl.addColorStop(.55, '#a8281a'); fl.addColorStop(1, '#5f0f09');
  g.fillStyle = fl; g.fillRect(-hw, -hh, BOX.w, BOX.h);
  // walls fall into shadow
  const ao = g.createLinearGradient(-hw, 0, hw, 0);
  ao.addColorStop(0, 'rgba(20,0,0,.72)'); ao.addColorStop(.1, 'rgba(20,0,0,0)'); ao.addColorStop(.9, 'rgba(20,0,0,0)'); ao.addColorStop(1, 'rgba(20,0,0,.72)');
  g.fillStyle = ao; g.fillRect(-hw, -hh, BOX.w, BOX.h);
  const ao2 = g.createLinearGradient(0, -hh, 0, hh);
  ao2.addColorStop(0, 'rgba(20,0,0,.7)'); ao2.addColorStop(.14, 'rgba(20,0,0,0)'); ao2.addColorStop(.86, 'rgba(20,0,0,0)'); ao2.addColorStop(1, 'rgba(20,0,0,.7)');
  g.fillStyle = ao2; g.fillRect(-hw, -hh, BOX.w, BOX.h);
  // soft window light on the floor
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = .16; g.drawImage(windowSprite(), -280 + 90 * Math.sin(t * .2), -300, 560, 520); g.restore();
  // fine gold-powder sprinkle on the red floor (a few hundred grains, fixed)
  const R = mulberry(77); g.fillStyle = 'rgba(236,199,102,.55)';
  for (let i = 0; i < 420; i++) { const x = (R() - .5) * (BOX.w - 120), y = (R() - .5) * (BOX.h - 120), r = .5 + R() * R() * 1.3; g.fillRect(x, y, r * 2, r * 2); }
  g.restore();
  // inner gold rule near the wall
  g.save(); g.strokeStyle = '#c4952f'; g.lineWidth = 3; g.beginPath(); g.roundRect(-hw + 44, -hh + 44, BOX.w - 88, BOX.h - 88, 30); g.stroke();
  g.strokeStyle = 'rgba(255,233,160,.7)'; g.lineWidth = 1; g.beginPath(); g.roundRect(-hw + 43, -hh + 43, BOX.w - 86, BOX.h - 86, 30); g.stroke(); g.restore();
  // lacquered rim: a thin bright line along the lip
  g.save(); g.strokeStyle = 'rgba(255,200,170,.28)'; g.lineWidth = 2; g.beginPath(); g.roundRect(-hw + 10, -hh + 10, BOX.w - 20, BOX.h - 20, BOX.r - 8); g.stroke(); g.restore();
}

// ---- the lid face ------------------------------------------------------------------------------------------------
function drawLidFace(g, t, st, o) {
  const warm = o.warm ?? 0;
  lidPath(g); g.save(); g.clip();
  const base = g.createLinearGradient(-LID.w / 2, -LID.h / 2, LID.w / 2, LID.h / 2);
  base.addColorStop(0, '#201511'); base.addColorStop(.5, '#0f0a08'); base.addColorStop(1, '#070404');
  g.fillStyle = base; g.fillRect(-LID.w / 2, -LID.h / 2, LID.w, LID.h);
  // the deep red under the black: it shows where the light goes in
  if (o.depth > 0) {
    const gl = g.createRadialGradient(o.sx, o.sy, 0, o.sx, o.sy, 520);
    gl.addColorStop(0, `rgba(170,52,22,${.4 * o.depth})`); gl.addColorStop(.5, `rgba(90,22,10,${.22 * o.depth})`); gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(-LID.w / 2, -LID.h / 2, LID.w, LID.h); g.restore();
  }
  // the window reflection (cool by day, warming through the afternoon)
  const w = windowSprite(), wx = o.winX, wy = o.winY - 240;
  const cool = tinted(w, 'cool', '#cfe4ff'), hot = tinted(w, 'hot', '#ffc486');
  g.save(); g.globalCompositeOperation = 'screen';
  g.globalAlpha = o.winA * (1 - warm); g.drawImage(cool, wx, wy, 620, 700);
  g.globalAlpha = o.winA * warm; g.drawImage(hot, wx, wy, 620, 700);
  // rain on the window shows as slow vertical glints inside the reflection
  if (o.rain > 0) {
    g.globalAlpha = .5 * o.rain; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) { const x = wx + 30 + hash(i * 3.1) * 560, y0 = wy + 40 + ((hash(i * 7.7) * 600 + t * (10 + hash(i) * 22)) % 520); g.beginPath(); g.moveTo(x, y0); g.lineTo(x + .6, y0 + 8 + hash(i * 5.2) * 14); g.stroke(); }
  }
  g.restore();
  // second, tiny lamp reflection near the bottom right
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = .1 * o.winA; g.drawImage(blobSprite(64), 330, 170, 220, 120); g.restore();
  // sheen band (world coords: we rotate the gradient by the band angle)
  if (o.sheenA > 0) {
    g.save(); g.translate(o.sx, o.sy); g.rotate(-.5);
    const gr = g.createLinearGradient(-190, 0, 190, 0);
    gr.addColorStop(0, 'rgba(255,230,190,0)'); gr.addColorStop(.35, `rgba(255,225,180,${.1 * o.sheenA})`); gr.addColorStop(.5, `rgba(255,248,235,${.55 * o.sheenA})`); gr.addColorStop(.65, `rgba(255,225,180,${.1 * o.sheenA})`); gr.addColorStop(1, 'rgba(255,230,190,0)');
    g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(-190, -1100, 380, 2200); g.restore();
  }
  // mother-of-pearl flecks catch the light where it passes
  const sxl = o.sx, syl = o.sy;
  drawPearl(g, PEARL, (x, y, f) => {
    const d = Math.abs(((x - sxl) * Math.cos(-.5 + Math.PI / 2) + (y - syl) * Math.sin(-.5 + Math.PI / 2))), band = Math.exp(-((d / 130) ** 2)) * o.sheenA;
    const tw = .5 + .5 * Math.sin(t * 1.3 + f.ph);
    return clamp(band * .9 + .06 * tw + (o.pearl ?? 0) * .04);
  });
  g.restore();
  // bevel: bright upper-left lip, dark lower-right
  g.save(); lidPath(g, 5); g.lineWidth = 8;
  const bv = g.createLinearGradient(-LID.w / 2, -LID.h / 2, LID.w / 2, LID.h / 2);
  bv.addColorStop(0, 'rgba(255,230,205,.34)'); bv.addColorStop(.35, 'rgba(120,80,60,.12)'); bv.addColorStop(.7, 'rgba(0,0,0,.35)'); bv.addColorStop(1, 'rgba(255,200,170,.18)');
  g.strokeStyle = bv; g.stroke(); g.restore();
  g.save(); lidPath(g, 1); g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,.8)'; g.stroke(); g.restore();
}

// ---- gold layer ----------------------------------------------------------------------------------------------------
function drawGold(main, t, xf, o) {
  GG.setTransform(1, 0, 0, 1, 0, 0); GG.clearRect(0, 0, W, H);
  xf(GG);
  const M = GG.getTransform(), zz = Math.hypot(M.a, M.b), P = (x, y) => { const p = M.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };
  const heads = [];
  const pk = ramp(t, T.sprinkle0, T.sprinkle1), pb = ramp(t, T.brush_p0, T.brush_p1);
  drawPowder(GG, POWDER, pk, pb, [-500, 480], t);      // powder first: the gold lines are drawn over it
  const all = [...DESIGN.frame, ...DESIGN.waves, ...DESIGN.sun, ...DESIGN.clouds, ...DESIGN.crane];
  for (const s of all) {
    if (s.t0 === undefined || t < s.t0) continue;
    const r = ramp(t, s.t0, s.t1);
    const head = goldStroke(GG, s, r >= 1 ? 1 : r);
    if (head && r < 1 && r > 0) heads.push([head, s.w]);
  }
  goldShade(GG);
  if (o.sheenA > 0) {
    GG.setTransform(1, 0, 0, 1, 0, 0);
    const a = P(o.sx, o.sy), ang = -.5 + Math.atan2(M.b, M.a);
    GG.save(); GG.globalCompositeOperation = 'source-atop'; GG.translate(a[0], a[1]); GG.rotate(ang);
    const half = 210 * zz, gr = GG.createLinearGradient(-half, 0, half, 0);
    gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(.5, `rgba(255,252,235,${.85 * o.sheenA})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
    GG.fillStyle = gr; GG.fillRect(-half, -2400, half * 2, 4800); GG.restore();
  }
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  if (o.glow) { main.globalCompositeOperation = 'lighter'; main.globalAlpha = o.glow; main.filter = 'blur(7px)'; main.drawImage(G, 0, 0); main.filter = 'none'; main.globalAlpha = 1; main.globalCompositeOperation = 'source-over'; }
  main.shadowColor = 'rgba(0,0,0,.7)'; main.shadowBlur = 5 * zz; main.shadowOffsetX = 1.8 * zz; main.shadowOffsetY = 2.6 * zz;
  main.drawImage(G, 0, 0);
  main.restore();
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  for (const [h, w] of heads) { const sp = P(h[0], h[1]); goldGlow(main, sp[0], sp[1], (w * 2.4 + 8) * zz, .9); }
  main.restore();
}

// the powder tube and the soft brush that sweeps it
function drawPowderTools(main, t, cam) {
  const pk = ramp(t, T.sprinkle0, T.sprinkle1), pb = ramp(t, T.brush_p0, T.brush_p1);
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  if (pk > 0 && pk < 1) {
    const wx = lerp(-460, 90, ss(clamp(pk * 1.05))), wy = lerp(-210, -190, pk), a = toScr(cam, wx, wy - 150);
    main.translate(a[0], a[1]); main.rotate(-.5 + Math.sin(t * 18) * .012);
    const L = 520 * cam.z, r = 20 * cam.z, gr = main.createLinearGradient(0, -r, 0, r);
    gr.addColorStop(0, '#c9a35a'); gr.addColorStop(.5, '#8b6a30'); gr.addColorStop(1, '#4b3516');
    main.fillStyle = gr; main.fillRect(-L, -r, L, r * 2);
    main.fillStyle = 'rgba(40,24,8,.5)'; for (const q of [.3, .66]) main.fillRect(-L * q, -r, 4 * cam.z, r * 2);
    main.fillStyle = '#2c1d0a'; main.beginPath(); main.ellipse(0, 0, 5 * cam.z, r, 0, 0, TAU); main.fill();
  }
  main.restore();
  if (pb > 0 && pb < 1) {
    const px = lerp(-470, 410, ss(pb)), py = -40 + Math.sin(pb * TAU * 1.5) * 120, a = toScr(cam, px, py);
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
    flatBrush(main, a[0], a[1], 190 * cam.z, -.75, 560 * cam.z, 1.5, .3);
    main.restore();
  }
}

// the whole flat lid scene (table, box, lid face, gold, tools)
export function renderLid(main, t) {
  init();
  const st = lidState(t), cam = st.cam;
  let sx = 0, sy = 0, sheenA = 0, depth = 0, glow = 0;
  const sw = (a, b, from, to) => { const k = seg(t, a, b); return [lerp(from[0], to[0], eio(k)), lerp(from[1], to[1], eio(k)), Math.sin(Math.PI * k) ** .7]; };
  if (t >= T.turn0 && t < 41.4) { [sx, sy, sheenA] = sw(T.turn0 + .2, 41.2, [-760, -90], [760, 90]); depth = sheenA; glow = .16 * sheenA; }
  else if (t >= 41.6 && t < 44.6) { [sx, sy, sheenA] = sw(41.6, 44.4, [760, 70], [-760, -80]); depth = sheenA * .8; glow = .14 * sheenA; }
  else if (t >= 54.4 && t < 55.9) { [sx, sy, sheenA] = sw(54.4, 55.8, [-700, -70], [700, 60]); sheenA *= .8; }
  else if (t >= 36.4 && t < 38.4) { [sx, sy, sheenA] = sw(36.4, 38.4, [-760, -60], [-300, 0]); sheenA *= .25; }
  const waitK = seg(t, 19.2, 25.6);
  const o = {
    sx, sy, sheenA, depth, glow, rain: t >= 19.2 && t < 27 ? 1 - ss(seg(t, 25.6, 27)) : 0,
    winX: -250 + 90 * waitK - st.turn * 900, winY: -110, winA: .62,
    warm: t < 25.6 ? ss(seg(t, 19.2, 25.6)) : t < 38.4 ? 1 - ss(seg(t, 25.6, 27)) * .6 : .4,
  };
  main.setTransform(1, 0, 0, 1, 0, 0);
  main.fillStyle = '#0b0706'; main.fillRect(0, 0, W, H);
  main.drawImage(TABLE, 0, 0, W, H); main.fillStyle = 'rgba(7,4,3,.9)'; main.fillRect(0, 0, W, H);
  const pool = main.createRadialGradient(960, cam.sy + 20, 100, 960, cam.sy + 20, 1300);
  pool.addColorStop(0, 'rgba(120,70,36,.42)'); pool.addColorStop(.5, 'rgba(60,32,18,.2)'); pool.addColorStop(1, 'rgba(0,0,0,0)');
  main.fillStyle = pool; main.fillRect(0, 0, W, H);
  const lz = 1 + .12 * st.lift, offY = -1250 * st.off - 40 * st.lift, offR = .06 * st.off;
  main.save(); camXf(main, cam);
  drawBox(main, t, st);
  if (st.off < 1) {
    main.save(); main.translate(0, offY); main.rotate(offR); main.scale(lz, lz);
    main.save(); main.shadowColor = `rgba(0,0,0,${.55 * st.lift})`; main.shadowBlur = 20 + 70 * st.lift; main.shadowOffsetX = 14 * st.lift; main.shadowOffsetY = 40 * st.lift + 10;
    main.fillStyle = '#0b0706'; lidPath(main); main.fill(); main.restore();
    drawLidFace(main, t, st, o);
    main.restore();
  }
  main.restore();
  if (st.off < 1) {
    const xf = g => { camXf(g, cam); g.translate(0, offY); g.rotate(offR); g.scale(lz, lz); };
    drawGold(main, t, xf, o);
    if (st.lift === 0) drawPowderTools(main, t, cam);
  }
  return st;
}
// ---- the turn: draw the flat lid into `src`, then re-project it with perspective around the vertical axis ----------
export function drawTurned(dst, src, a, f = 2300) {
  dst.setTransform(1, 0, 0, 1, 0, 0);
  if (Math.abs(a) < 1e-4) { dst.drawImage(src, 0, 0); return; }
  dst.drawImage(src, 0, 0);
  const ca = Math.cos(a), sa = Math.sin(a), step = 2;
  const srcX = xd => xd * f / (f * ca - xd * sa);
  for (let xd = -W / 2 - 400; xd < W / 2 + 400; xd += step) {
    const X0 = srcX(xd), X1 = srcX(xd + step);
    const lo = Math.max(-W / 2, Math.min(W / 2 - 2, X0)), hi = Math.max(lo + 1, Math.min(W / 2, X1));
    if (!(X1 > X0)) continue;
    const s = f / (f + X0 * sa);
    dst.drawImage(src, W / 2 + lo, 0, hi - lo + .5, H, W / 2 + xd, H / 2 - H / 2 * s, step + .8, H * s);
  }
}
export { G as _G };
