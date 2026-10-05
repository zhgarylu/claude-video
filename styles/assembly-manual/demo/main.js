// "Drip 1": an invented pour-over stand, told as a flat-pack assembly manual. render(t) draws any frame, deterministically.
import { clamp, seg, lerp } from '/core/lib.js';
import { DUR, EV, PAGES, SLIDE, T, cues } from './timeline.js';
import { C, FONT, NUM, TAU, setZ, lw, ease, cyl, rrect, PART, drawIcon, drawBase, drawPole, drawScrew, drawArm, drawRing, drawRingFront, drawCone, drawCarafe,
  drawKey, drawShadow, drawPerson, arrowHead, dotted, pulse } from './draw.js';

const W = 1920, H = 1080, cv = document.getElementById('c'), g = cv.getContext('2d');
let TX = [], REC = true, CUES = [];
const OX = 960, OY = 900, FS = 1.0;                                   // the step figure: origin on the table, scale
const COV = { x: 1330, y: 925, s: .84 }, DONE = { x: 1330, y: 915, s: 1.0 };

// ---------- text, recorded for readcheck ----------
function txt(id, s, x, y, o = {}) {
  const { size = 40, w = 700, fam = FONT, col = C.ink, al = 'left', ls = 0, a = 1 } = o;
  g.save(); g.globalAlpha *= a; g.font = `${w} ${size}px ${fam}`; g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillStyle = col;
  if ('letterSpacing' in g) g.letterSpacing = ls + 'px';
  g.fillText(s, x, y); const wd = g.measureText(s).width; g.restore();
  if (REC && a >= .999) { const x0 = al === 'left' ? x : al === 'center' ? x - wd / 2 : x - wd; TX.push({ id, text: s, x0, y0: y - size * .8, x1: x0 + wd, y1: y + size * .2 }); }
  return wd;
}
const toScreen = (F, x, y) => [F.x + x * F.s, F.y + y * F.s];

// ---------- page furniture ----------
function paper() { g.fillStyle = C.paper; g.fillRect(0, 0, W, H); g.strokeStyle = '#e6e1d3'; g.lineWidth = 3; rrect(g, 38, 38, W - 76, H - 76, 26); g.stroke(); }
function footer(pg) {
  txt('code' + pg.id, 'DRIP-1', 130, 1024, { size: 24, w: 800, col: C.gray, ls: 3 });
  if (pg.no) txt('no' + pg.id, String(pg.no).padStart(2, '0'), 1790, 1026, { size: 38, w: 800, fam: NUM, col: C.gray, al: 'right' });
}
function numeral(u, t0, n, id) {
  const p = ease.out(seg(u, t0, t0 + .28)); if (p <= 0) return;
  g.save(); g.globalAlpha = p; g.translate(130, 330); g.scale(.72 + .28 * p, .72 + .28 * p); g.translate(-130, -330);
  g.font = `800 300px ${NUM}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink; g.fillText(String(n), 130, 330);
  rrect(g, 138, 372, 96, 16, 8); g.fillStyle = C.blue; g.fill(); g.restore();
  if (REC && p >= .999) { g.font = `800 300px ${NUM}`; const wd = g.measureText(String(n)).width; TX.push({ id: 'n' + id, text: String(n), x0: 130, y0: 330 - 215, x1: 130 + wd, y1: 330 + 5 }); }
}
// quantity box: letter, the part, "2x". slot 0 is the rightmost.
function qtyBox(u, t0, slot, L, n, id) {
  const p = ease.out(seg(u, t0, t0 + .25)); if (p <= 0) return;
  const x = 1790 - (slot + 1) * 236 + 16, y = 92 - (1 - p) * 14;
  g.save(); g.globalAlpha = p; rrect(g, x, y, 220, 190, 28); g.fillStyle = C.white; g.fill(); g.lineWidth = 6; g.strokeStyle = C.ink; g.stroke();
  g.beginPath(); g.arc(x + 38, y + 40, 24, 0, TAU); g.fillStyle = C.ink; g.fill(); g.restore();
  g.save(); g.globalAlpha = p; drawIcon(g, L, x + 112, y + 94, .52, n); g.restore();
  g.save(); g.globalAlpha = p; g.font = `800 28px ${NUM}`; g.textAlign = 'center'; g.fillStyle = C.white; g.fillText(L, x + 38, y + 50); g.restore();
  txt('q' + id + L, n + '×', x + 206, y + 172, { size: 54, w: 800, fam: NUM, al: 'right', a: p });
}

// ---------- the stand ----------
const FULL = { dx: 0, dy: 0, a: 1, p: 1 };
function mv(u, m, from, ez = 'in') {                                  // m = [lineStart, flyStart, land]; null before the part appears
  if (u < m[0]) return null; const p = ease[ez](seg(u, m[1], m[2]));
  return { dx: from[0] * (1 - p), dy: from[1] * (1 - p), a: ease.out(seg(u, m[0], m[0] + .2)), p };
}
function put(m, fn) { if (!m) return; g.save(); g.translate(m.dx, m.dy); g.globalAlpha *= m.a; fn(); g.restore(); }
function drawFigure(st) {
  drawShadow(g); drawBase(g);
  put(st.carafe, () => drawCarafe(g, st.level || 0));
  put(st.pole, () => drawPole(g));
  (st.bscr || []).forEach(s => put(s, () => drawScrew(g, s.x, -44, s.p, s.rot || 0)));
  put(st.arm, () => drawArm(g, st.knob || 0));
  put(st.ring, () => drawRing(g));
  (st.rscr || []).forEach(s => put(s, () => drawScrew(g, s.x, -303, s.p, s.rot || 0, 1.7)));
  put(st.cone, () => drawCone(g));
  put(st.ring, () => drawRingFront(g));
}
const scr = (u, ms, xs, from = [0, -110]) => ms.map((m, k) => { const r = mv(u, m, from); if (r) r.x = xs[k]; return r; }).filter(Boolean);
const fixScr = xs => xs.map(x => ({ ...FULL, x }));
const knobAt = (u, a, b, step = .3, per = .6) => { if (u <= a) return 0; const k = Math.floor((Math.min(u, b) - a) / step), f = ((Math.min(u, b) - a) % step) / step; return (k + ease.out(clamp(f * 3))) * per; };
function figState(id, u) {
  const s = T[id], st = {};
  const L = id === 's1' ? 1 : id === 's2' ? 2 : id === 's3' ? 3 : id === 's4' ? 4 : id === 's5' ? 5 : 9;
  if (id === 's1') {
    st.pole = mv(u, s.pole, [0, -300]); const sc = scr(u, s.scr, [-22, 22]);
    const rot = k => k === 0 ? 3.1 * ease.io(seg(u, s.turn1[0], s.turn1[1])) : 3.1 * ease.io(seg(u, s.turn2[0], s.turn2[1])); sc.forEach((x, k) => { x.rot = rot(k); }); st.bscr = sc; return st;
  }
  st.pole = FULL; st.bscr = fixScr([-22, 22]).map((x, k) => ({ ...x, rot: 3.1 })); st.knob = 0;
  if (L === 2) { st.arm = mv(u, s.arm, [0, -290]); st.knob = knobAt(u, s.turn[0], s.turn[1]); return st; }
  st.arm = FULL; st.knob = 3.6;                                          // the knob's final angle: 6 ratchet steps of 0.6 rad
  if (L === 3) { st.ring = mv(u, s.ring, [300, 0], 'io'); st.rscr = scr(u, s.scr, [130, 250]); return st; }
  st.ring = FULL; st.rscr = fixScr([130, 250]);
  if (L === 4) { st.cone = mv(u, s.cone, [0, -300]); return st; }
  st.cone = FULL;
  if (L === 5) { st.carafe = mv(u, s.carafe, [420, 0], 'io'); return st; }
  st.carafe = FULL; return st;
}
function dropsAt(u) {                                                 // [{y, fall:0..1, since}]
  const s = T.done, out = [], tip = -228;
  const list = [s.drop0]; for (let k = 0; s.drop1 + k * s.dropStep < 10; k++) list.push(s.drop1 + k * s.dropStep);
  const lvl = levelAt(u), surf = -18 - lvl;
  for (const ts of list) {
    const q = (u - ts) / s.fall;
    if (q > -1 && q < 0) out.push({ kind: 'bulb', r: 2 + 3.2 * (q + 1), y: tip + 3 });
    else if (q >= 0 && q < 1) out.push({ kind: 'drop', y: lerp(tip + 4, surf - 4, q * q) });
    else if (q >= 1 && q < 2.1) out.push({ kind: 'ripple', k: (q - 1) / 1.1, y: surf });
  }
  return out;
}
const levelAt = u => { const s = T.done; return 92 * ease.io(seg(u, s.drop0 + s.fall, 9.8)); };
function drawDrops(u) {
  for (const d of dropsAt(u)) {
    if (d.kind === 'bulb') { g.beginPath(); g.arc(190, d.y + d.r, d.r, 0, TAU); g.fillStyle = C.coffee; g.fill(); }
    else if (d.kind === 'drop') { g.beginPath(); g.moveTo(190, d.y - 11); g.quadraticCurveTo(196, d.y, 194.5, d.y + 3); g.arc(190, d.y + 3, 4.5, 0, Math.PI); g.quadraticCurveTo(184, d.y, 190, d.y - 11); g.closePath(); g.fillStyle = C.coffee; g.fill(); g.lineWidth = lw(.6); g.strokeStyle = C.ink; g.stroke(); }
    else { g.save(); g.globalAlpha = (1 - d.k) * .9; g.strokeStyle = '#c99a72'; g.lineWidth = lw(.8); g.beginPath(); g.ellipse(190, d.y, 8 + 40 * d.k, 2.5 + 8 * d.k, 0, 0, TAU); g.stroke(); g.restore(); }
  }
}
function steam(u) {
  const a = ease.out(seg(u, 3.0, 4.2)) * .55; if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.strokeStyle = '#b9b5aa'; g.lineWidth = lw(1.4); g.lineCap = 'round';
  for (let k = 0; k < 3; k++) { g.beginPath(); for (let j = 0; j <= 20; j++) { const q = j / 20, y = -214 - q * 70, x = 190 + (k - 1) * 22 + Math.sin(q * 6.5 + u * 2.2 + k * 1.7) * 7 * q; j ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.restore();
}

// ---------- the zoom circle ("click" callout) ----------
function bubble(F, u, b0, target, fin, R, Z, inner, off) {
  let p = ease.out(seg(u, b0 + .18, b0 + .7)); if (off) p *= 1 - ease.io(seg(u, off, off + .35));
  const sp = toScreen(F, target[0], target[1]), ring = ease.out(seg(u, b0, b0 + .2)) * (off ? 1 - ease.io(seg(u, off, off + .35)) : 1);
  if (ring <= 0) return;
  g.save(); g.lineCap = 'round';
  g.beginPath(); g.arc(sp[0], sp[1], 44 * ring, 0, TAU); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
  if (p > .06) {
    const cx = lerp(sp[0], fin[0], p), cy = lerp(sp[1], fin[1], p), r = R * p;
    const ang = Math.atan2(cy - sp[1], cx - sp[0]);
    g.beginPath(); g.moveTo(sp[0] + 44 * Math.cos(ang), sp[1] + 44 * Math.sin(ang)); g.lineTo(cx - r * Math.cos(ang), cy - r * Math.sin(ang)); g.lineWidth = 5; g.stroke();
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fillStyle = C.white; g.fill();
    g.save(); g.clip(); g.translate(cx, cy); g.scale(Z * p / p, Z * p / p); g.translate(-target[0], -target[1]); setZ(Z); inner({ cx, cy, Z, target, full: p >= .999 }); g.restore();
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.lineWidth = 9; g.strokeStyle = C.ink; g.stroke();
  }
  g.restore();
}
const arc = (x, y, rx, ry, a0, a1, col = C.blue, k = 1) => {       // a curved arrow around something: an arc with a head at its end
  g.save(); g.strokeStyle = col; g.lineWidth = lw(3.4 * k); g.lineCap = 'round'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, a0, a1); g.stroke();
  const ex = x + rx * Math.cos(a1), ey = y + ry * Math.sin(a1), tx = -rx * Math.sin(a1), ty = ry * Math.cos(a1), an = Math.atan2(ty, tx);
  g.translate(ex, ey); g.rotate(an); g.beginPath(); g.moveTo(11 * k / (1), 0); g.lineTo(-5 * k, -8 * k); g.lineTo(-5 * k, 8 * k); g.closePath(); g.fillStyle = col; g.fill(); g.restore();
};

// ---------- pages ----------
function pCover(pg, u) {
  const c = T.cover;
  rrect(g, 130, 130, 300, 58, 29); g.fillStyle = C.blue; g.fill(); txt('tag', 'Assembly guide', 280, 169, { size: 30, w: 700, col: C.white, al: 'center' });
  txt('title', 'Drip 1', 124, 470, { size: 270, w: 800, fam: NUM });
  txt('sub', 'Pour-over coffee stand', 134, 570, { size: 66, w: 700 });
  txt('meta', '5 steps  ·  about 10 minutes  ·  1 hex key', 136, 650, { size: 38, w: 600, col: C.gray });
  txt('model', 'Model PO-1', 136, 990, { size: 28, w: 800, col: C.gray, ls: 3 });
  const EXP = { A: [0, 0], F: [0, -60], B: [0, -90], D: [0, -150], C: [-50, -290], E: [0, -300] };
  const FROM = { A: [0, 320], F: [420, 0], B: [-430, -90], D: [430, -140], C: [-520, -100], E: [440, -290] };
  const LAND = { A: c.land.base, F: c.land.carafe, B: c.land.pole, D: c.land.ring, C: c.land.arm, E: c.land.cone };
  g.save(); g.translate(COV.x, COV.y); g.scale(COV.s, COV.s); setZ(COV.s);
  drawShadow(g, 0, 22, 258, 42);
  for (const L of ['F', 'B', 'D', 'C', 'E']) { const e = EXP[L], cc = PART[L].c; dotted(g, cc[0] + e[0], cc[1] + e[1], cc[0], cc[1], ease.out(seg(u, LAND[L], LAND[L] + .35)), C.blue, 5); }
  const at = L => { const t = LAND[L], p = ease.in(seg(u, t - c.fly, t)), a = ease.out(seg(u, t - c.fly, t - c.fly + .12)); return a > 0 ? { dx: EXP[L][0] + FROM[L][0] * (1 - p), dy: EXP[L][1] + FROM[L][1] * (1 - p), a } : null; };
  put(at('A'), () => drawBase(g)); put(at('F'), () => drawCarafe(g)); put(at('B'), () => drawPole(g)); put(at('C'), () => drawArm(g));
  put(at('D'), () => { drawRing(g); drawRingFront(g); }); put(at('E'), () => drawCone(g));
  for (const L of 'ABCDEF') { const e = EXP[L], cc = PART[L].c; pulse(g, cc[0] + e[0], cc[1] + e[1], seg(u, LAND[L], LAND[L] + .35)); }
  g.restore();
}
const CODES = { A: '104827', B: '104830', C: '104835', D: '104841', E: '104852', F: '104866', G: '900123', H: '900207' };
const QTY = { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 4, H: 1 };
function tick(cx, cy, p) {
  if (p <= 0) return; const r = 27 * (.6 + .4 * p); g.save(); g.globalAlpha = p; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fillStyle = C.blue; g.fill();
  g.strokeStyle = C.white; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(cx - 11, cy + 1); g.lineTo(cx - 3, cy + 9); g.lineTo(cx + 12, cy - 8); g.stroke(); g.restore();
}
function pParts(pg, u) {
  const s = T.parts;
  txt('phead', 'Parts', 130, 235, { size: 120, w: 800, fam: NUM });
  'ABCDEFGH'.split('').forEach((L, k) => {
    const col = k % 4, row = k >> 2, x = 130 + col * 430, y = 300 + row * 330, t0 = s.cell0 + k * s.cellStep, p = ease.out(seg(u, t0, t0 + .25)); if (p <= 0) return;
    g.save(); g.translate(x + 200, y + 150); g.scale(.92 + .08 * p, .92 + .08 * p); g.translate(-x - 200, -y - 150); g.globalAlpha = p;
    rrect(g, x, y, 400, 300, 30); g.fillStyle = C.white; g.fill(); g.lineWidth = 6; g.strokeStyle = C.ink; g.stroke();
    g.beginPath(); g.arc(x + 50, y + 50, 30, 0, TAU); g.fillStyle = C.ink; g.fill();
    g.font = `800 36px ${NUM}`; g.textAlign = 'center'; g.fillStyle = C.white; g.fillText(L, x + 50, y + 63);
    drawIcon(g, L, x + 205, y + 150, 1, QTY[L]); g.restore();
    if (p >= .999) { txt('c' + L, CODES[L], x + 24, y + 278, { size: 26, w: 700, col: C.gray, ls: 1 }); txt('k' + L, QTY[L] + '×', x + 378, y + 280, { size: 54, w: 800, fam: NUM, al: 'right' }); }
    const tt = k < 6 ? s.tickA + k * s.tickStep : k === 6 ? s.tickG : s.tickH; tick(x + 352, y + 50, ease.out(seg(u, tt, tt + .2)));
  });
}

function arrowSet(F, list, u) {                                        // list of {m:[l0,f0,land], x0,y0,x1,y1, hx,hy,ang,k}
  g.save(); g.translate(F.x, F.y); g.scale(F.s, F.s); setZ(F.s);
  for (const a of list) { const p = ease.out(seg(u, a.m[0], a.m[0] + .35)); g.save(); g.globalAlpha = 1 - ease.io(seg(u, a.m[2] + 1.2, a.m[2] + 1.7)); dotted(g, a.x0, a.y0, a.x1, a.y1, p); g.restore(); }
  g.restore();
}
function headSet(F, list, u) {
  g.save(); g.translate(F.x, F.y); g.scale(F.s, F.s); setZ(F.s);
  for (const a of list) { const p = ease.out(seg(u, a.m[0], a.m[0] + .35)); if (p > 0) { g.save(); g.globalAlpha = p * (1 - ease.io(seg(u, a.m[2] + 1.2, a.m[2] + 1.7))); arrowHead(g, a.hx, a.hy, a.ang, a.k || 1); g.restore(); } }
  g.restore();
}
const FIG = { x: OX, y: OY, s: FS };
function figure(st, u, snaps, extra) {
  g.save(); g.translate(FIG.x, FIG.y); g.scale(FIG.s, FIG.s); setZ(FIG.s); drawFigure(st); if (extra) extra(); for (const [x, y, t] of snaps) pulse(g, x, y, seg(u, t, t + .35)); g.restore();
}

function pS1(pg, u) {
  const s = T.s1; numeral(u, s.num, 1, 's1'); qtyBox(u, s.qty, 0, 'H', 1, 's1'); qtyBox(u, s.qty + .15, 1, 'G', 2, 's1'); qtyBox(u, s.qty + .3, 2, 'B', 1, 's1');
  const st = figState('s1', u);
  arrowSet(FIG, [{ m: s.pole, x0: 0, y0: -535, x1: 0, y1: -235 }, { m: s.scr[0], x0: -22, y0: -154, x1: -22, y1: -50 }, { m: s.scr[1], x0: 22, y0: -154, x1: 22, y1: -50 }], u);
  figure(st, u, [[0, -60, s.pole[2]], [-22, -48, s.scr[0][2]], [22, -48, s.scr[1][2]]]);
  headSet(FIG, [{ m: s.pole, hx: 0, hy: -465, ang: Math.PI / 2 }], u);
  const kp = seg(u, s.key[0], s.key[1]), turn1 = seg(u, s.turn1[0], s.turn1[1]), hop = ease.io(seg(u, s.hop[0], s.hop[1])), turn2 = seg(u, s.turn2[0], s.turn2[1]);
  bubble(FIG, u, s.bub, [0, -78], [1500, 610], 215, 3.2, ({ full }) => {
    drawFigure(st);
    if (kp > 0) {
      const kx = lerp(-22, 22, hop), lift = Math.sin(Math.PI * hop) * 26, ky = -44 - (1 - ease.out(kp)) * 44 - lift, a = turn2 > 0 ? 3.1 * ease.io(turn2) : 3.1 * ease.io(turn1);
      if (turn1 > 0 && turn1 < 1 || turn2 > 0 && turn2 < 1) arc(kx, -52, 25, 10, .15 * Math.PI, 1.55 * Math.PI, C.blue, 1);
      drawKey(g, kx, ky + 0, a);
    }
  });
}
function pS2(pg, u) {
  const s = T.s2; numeral(u, s.num, 2, 's2'); qtyBox(u, s.qty, 0, 'C', 1, 's2');
  const st = figState('s2', u);
  arrowSet(FIG, [{ m: s.arm, x0: 0, y0: -590, x1: 0, y1: -300 }], u);
  figure(st, u, [[0, -300, s.arm[2]]]);
  headSet(FIG, [{ m: s.arm, hx: 0, hy: -700, ang: Math.PI / 2 }], u);
  // person pictogram: hold the base steady
  const p = ease.out(seg(u, s.inset, s.inset + .3));
  if (p > 0) {
    g.save(); g.globalAlpha = p; g.translate(0, (1 - p) * 14); rrect(g, 120, 470, 400, 380, 32); g.fillStyle = C.white; g.fill(); g.lineWidth = 6; g.strokeStyle = C.ink; g.stroke();
    g.save(); g.translate(0, 0); setZ(.9); drawPerson(g, 262, 640, 1.18, .5 + .5 * Math.sin(u * 5)); g.restore();
    cyl(g, 392, 690, 712, 66, 14, C.wood, C.woodS, C.woodT);
    arrowHead(g, 392, 620 + 6 * Math.sin(u * 5), Math.PI / 2, .8); g.restore();
    setZ(FS);
  }
  const kn = st.knob;
  bubble(FIG, u, s.bub, [0, -296], [1500, 610], 215, 3.4, () => {
    drawFigure(st);
    if (u > s.turn[0] && u < s.turn[1] + .15) arc(0, -296, 40, 40, -2.2, .5, C.blue, 1.1);
  });
}
function pS3(pg, u) {
  const s = T.s3; numeral(u, s.num, 3, 's3'); qtyBox(u, s.qty, 0, 'D', 1, 's3'); qtyBox(u, s.qty + .3, 1, 'G', 2, 's3');
  const st = figState('s3', u);
  arrowSet(FIG, [{ m: s.ring, x0: 490, y0: -295, x1: 190, y1: -295 }, { m: s.scr[0], x0: 130, y0: -411, x1: 130, y1: -305 }, { m: s.scr[1], x0: 250, y0: -411, x1: 250, y1: -305 }], u);
  figure(st, u, [[124, -300, s.ring[2]], [130, -302, s.scr[0][2]], [250, -302, s.scr[1][2]]]);
  headSet(FIG, [{ m: s.ring, hx: 350, hy: -295, ang: Math.PI }, { m: s.scr[0], hx: 130, hy: -440, ang: Math.PI / 2, k: .5 }, { m: s.scr[1], hx: 250, hy: -440, ang: Math.PI / 2, k: .5 }], u);
  // "do not" panel and the right way
  const pw = ease.out(seg(u, s.dn, s.dn + .25)), po = ease.out(seg(u, s.ok, s.ok + .25));
  const panel = (x, a, flip) => {
    g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 14); rrect(g, x, 650, 190, 250, 30); g.fillStyle = C.white; g.fill(); g.lineWidth = 6; g.strokeStyle = C.ink; g.stroke();
    g.save(); g.beginPath(); g.rect(x + 8, 658, 174, 234); g.clip(); g.translate(x + 95, 775); g.scale(1.05, 1.05); g.translate(-190, 295); setZ(1.05); drawRing(g, { flip }); drawRingFront(g); g.restore(); g.restore();
  };
  if (pw > 0) {
    panel(1400, pw, true);
    const cc = ease.out(seg(u, s.dn + .1, s.dn + .4)), sl = ease.out(seg(u, s.dn + .3, s.dn + .45));
    g.save(); g.globalAlpha = pw; g.strokeStyle = C.red; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.arc(1495, 775, 78, -Math.PI / 2 - .8, -Math.PI / 2 - .8 + TAU * cc); g.stroke();
    if (sl > 0) { g.beginPath(); g.moveTo(1495 - 55 * sl, 775 - 55 * sl); g.lineTo(1495 + 55 * sl, 775 + 55 * sl); g.stroke(); } g.restore();
  }
  if (po > 0) {
    panel(1610, po, false);
    g.save(); g.globalAlpha = po; g.strokeStyle = C.blue; g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(1760, 850); g.lineTo(1775, 868); g.lineTo(1795, 838); g.stroke(); g.restore();
  }
  setZ(FS);
}
function pS4(pg, u) {
  const s = T.s4; numeral(u, s.num, 4, 's4'); qtyBox(u, s.qty, 0, 'E', 1, 's4');
  const st = figState('s4', u);
  arrowSet(FIG, [{ m: s.cone, x0: 190, y0: -577, x1: 190, y1: -277 }], u);
  figure(st, u, [[190, -300, s.cone[2]]]);
  headSet(FIG, [{ m: s.cone, hx: 190, hy: -705, ang: Math.PI / 2 }], u);
}
function pS5(pg, u) {
  const s = T.s5; numeral(u, s.num, 5, 's5'); qtyBox(u, s.qty, 0, 'F', 1, 's5');
  const st = figState('s5', u);
  arrowSet(FIG, [{ m: s.carafe, x0: 610, y0: -110, x1: 190, y1: -110 }], u);
  figure(st, u, [[190, -30, s.carafe[2]]]);
  headSet(FIG, [{ m: s.carafe, hx: 440, hy: -110, ang: Math.PI }], u);
  bubble(FIG, u, s.bub, [190, -214], [1500, 610], 215, 3.6, (info) => {
    drawFigure(st);
    // the gap between the cone tip and the carafe lip: a dotted drop line and a measure
    dotted(g, 190, -226, 190, -206, 1, C.blue, 4);
    g.save(); g.strokeStyle = C.ink; g.lineWidth = lw(1); g.lineCap = 'round';
    g.beginPath(); g.moveTo(234, -226); g.lineTo(246, -226); g.moveTo(234, -203); g.lineTo(246, -203); g.moveTo(240, -226); g.lineTo(240, -203); g.stroke(); g.restore();
    arrowHead(g, 240, -228, -Math.PI / 2, .13); arrowHead(g, 240, -201, Math.PI / 2, .13);
    if (info.full) {
      const sz = 42, rx = info.cx + 152, by = info.cy + 15;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = `800 ${sz}px ${NUM}`; g.textAlign = 'right'; g.fillStyle = C.ink; g.fillText('2 cm', rx, by);
      const wd = g.measureText('2 cm').width; g.restore();
      if (REC) TX.push({ id: 'cm', text: '2 cm', x0: rx - wd, y0: by - sz * .8, x1: rx, y1: by + 8 });
    }
  }, s.bubOff);
}
function pDone(pg, u) {
  const s = T.done, F = DONE;
  const lvl = levelAt(u), st = figState('done', u); st.level = lvl;
  // left: badge, title, steps
  const bp = ease.out(seg(u, s.badge, s.badge + .3));
  if (bp > 0) {
    g.save(); g.translate(230, 235); g.scale(.6 + .4 * bp, .6 + .4 * bp); g.globalAlpha = bp; g.beginPath(); g.arc(0, 0, 78, 0, TAU); g.fillStyle = C.blue; g.fill();
    g.strokeStyle = C.white; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-34, 4); g.lineTo(-9, 30); g.lineTo(38, -26); g.stroke(); g.restore();
    txt('done', 'Done', 124, 585, { size: 270, w: 800, fam: NUM, a: bp });
    txt('ready', 'Drip 1 is ready to brew', 134, 680, { size: 46, w: 700, col: C.gray, a: bp });
  }
  for (let k = 0; k < 5; k++) {
    const p = ease.out(seg(u, s.dot0 + k * s.dotStep, s.dot0 + k * s.dotStep + .2)); if (p <= 0) continue; const cx = 160 + k * 112, cy = 800;
    g.save(); g.translate(cx, cy); g.scale(.7 + .3 * p, .7 + .3 * p); g.globalAlpha = p; g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.fillStyle = C.ink; g.fill();
    g.strokeStyle = C.white; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-15, 2); g.lineTo(-4, 14); g.lineTo(17, -11); g.stroke(); g.restore();
  }
  g.save(); g.translate(F.x, F.y); g.scale(F.s, F.s); setZ(F.s); drawFigure(st); drawDrops(u); steam(u); g.restore();
  const FD = F;
  bubble(FD, u, s.bub, [190, -150], [1560, 330], 215, 3.0, () => { drawFigure(st); drawDrops(u); steam(u); });
}

const DRAW = { cover: pCover, parts: pParts, s1: pS1, s2: pS2, s3: pS3, s4: pS4, s5: pS5, done: pDone };
function drawPage(pg, u) { paper(); DRAW[pg.id](pg, u); footer(pg); }

// ---------- render ----------
function caption(t) {
  for (const c of CUES) {
    if (t < c.t0 - .1 || t > c.t1 + .15) continue; const a = clamp(Math.min((t - (c.t0 - .1)) / .2, (c.t1 + .15 - t) / .2));
    g.save(); g.globalAlpha = a; g.font = `600 36px ${FONT}`; const wd = g.measureText(c.text).width, x = W / 2 - wd / 2 - 34, y = 1002 - 36;
    rrect(g, x, y, wd + 68, 72, 36); g.fillStyle = 'rgba(255,255,255,.94)'; g.fill(); g.lineWidth = 4; g.strokeStyle = C.ink; g.stroke();
    g.textAlign = 'left'; g.fillStyle = C.ink; g.fillText(c.text, x + 34, y + 49); g.restore();
  }
}
function render(t) {
  TX = []; g.setTransform(1, 0, 0, 1, 0, 0); setZ(1);
  const idx = Math.max(0, PAGES.findIndex(p => t >= p.t0 && t < p.t1)), pg = idx < 0 ? PAGES[PAGES.length - 1] : PAGES[idx];
  const P = t >= PAGES[PAGES.length - 1].t1 ? PAGES[PAGES.length - 1] : pg, u = t - P.t0;
  g.fillStyle = C.paperD; g.fillRect(0, 0, W, H);
  if (P !== PAGES[0] && u < SLIDE) {
    const e = ease.out(u / SLIDE), prev = PAGES[PAGES.indexOf(P) - 1];
    REC = false; g.save(); g.translate(-W * .12 * e, 0); drawPage(prev, t - prev.t0); g.fillStyle = `rgba(30,26,18,${.16 * e})`; g.fillRect(0, 0, W, H); g.restore();
    g.save(); g.translate(W * (1 - e), 0); const gr = g.createLinearGradient(-60, 0, 0, 0); gr.addColorStop(0, 'rgba(30,26,18,0)'); gr.addColorStop(1, 'rgba(30,26,18,.22)'); g.fillStyle = gr; g.fillRect(-60, 0, 60, H);
    g.beginPath(); g.rect(0, 0, W, H); g.clip(); drawPage(P, u); g.restore(); REC = true;
  } else drawPage(P, u);
  caption(t);
  const f = seg(t, DUR - .5, DUR); if (f > 0) { g.fillStyle = `rgba(246,243,236,${f})`; g.fillRect(0, 0, W, H); }
}
window.DUR = DUR; window.EV = EV; window.render = render;
window.TEXTS = t => { render(t); return TX; };
(async () => {
  try { await Promise.all(['800 100px Nunito', '700 40px "Hanken Grotesk"', '600 40px "Hanken Grotesk"', '800 40px "Hanken Grotesk"'].map(f => document.fonts.load(f))); await document.fonts.ready; } catch (e) { }
  try { const lines = await (await fetch('lines.json')).json(), dur = await (await fetch('voices/dur.json')).json(); CUES = cues(lines, dur); } catch (e) { CUES = []; }
  render(0); window.READY = true;
})();
