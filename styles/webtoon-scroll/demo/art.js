// Drawing kit: palette, outlines, the heroine Mina, the umbrella Dewey, balloons, narration boxes, onomatopoeia. Original designs.
import { clamp, seg, ss, back, lerp, hash } from '/core/lib.js';
export const C = {
  ink: '#1b2340', page: '#f7f5ee', white: '#fffdf7',
  coat: '#f2b632', coatSh: '#d38f1c', coatDk: '#b8780f', skin: '#f8d0ae', skinSh: '#e8aa86', hair: '#2a2236', hairHi: '#4b4163', hairWet: '#19152a',
  trou: '#3f527d', boot: '#2f9a94', bootSh: '#1f7772',
  coral: '#ef6b5a', coralSh: '#cd4a3d', cream: '#fff0d2', creamSh: '#ecd7ad', wood: '#a8683f', woodSh: '#82492b', steel: '#7f8aa6',
  sky0: '#8da6c0', sky1: '#b9cbdc', sky2: '#dbe5ee', fog: '#e6edf3', slate: '#5a7391', deep: '#35496b', navy: '#27365a',
  blush: '#f59a8f', mint: '#52c7aa', sun: '#ffd45a', sunSky: '#ffe9ae', peach: '#ffc79c',
};
export const FONT_BODY = '"Comic Neue", "Comic Sans MS", sans-serif', FONT_DISPLAY = 'Bangers, Impact, sans-serif';
export const LW = 6;

// ---------------------------------------------------------------- tiny helpers
export const rr = (g, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
export const ol = (g, lw = LW) => { g.lineWidth = lw; g.strokeStyle = C.ink; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
export const fs = (g, fill, lw = LW) => { g.fillStyle = fill; g.fill(); if (lw) ol(g, lw); };
export const ell = (g, x, y, rx, ry, fill, lw = LW, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot, 0, Math.PI * 2); fs(g, fill, lw); };
export function cap(g, x0, y0, x1, y1, w, fill, lw = LW, shade) {          // a capsule with an ink outline and an optional cel-shade stripe
  g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = C.ink; g.lineWidth = w + lw * 2; g.stroke();
  g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  if (shade) { const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, o = w * .27; g.beginPath(); g.moveTo(x0 + nx * o, y0 + ny * o); g.lineTo(x1 + nx * o, y1 + ny * o); g.strokeStyle = shade; g.lineWidth = w * .34; g.stroke(); }
}
export const lerpC = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
export function ik(sx, sy, tx, ty, l1, l2, dir) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const m = l1 + l2 - .5; if (d > m) { dx *= m / d; dy *= m / d; d = m; } if (d < 1) d = 1;
  const a = Math.atan2(dy, dx), c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), b = Math.acos(c), ang = a + dir * b;
  return { ex: sx + Math.cos(ang) * l1, ey: sy + Math.sin(ang) * l1, hx: sx + dx, hy: sy + dy };
}

// ---------------------------------------------------------------- Mina: front-view chibi commuter in a mustard raincoat. Origin = between the feet, y up is negative.
export const MINA = { lean: 0, bob: 0, walk: null, lh: [-96, -176], rh: [96, -176], look: [0, 0], brow: [0, 0], eye: 'open', mouth: 'flat', soak: 0, blush: 0, tilt: 0, hold: null, sit: 0, wet: 0 };
export function mina(g, x, y, s, o = {}) {
  const P = { ...MINA, ...o }, fl = o.flip ? -1 : 1; let aLr, aRr;
  g.save(); g.translate(x, y); g.scale(s * fl, s);
  const soak = P.soak, coat = lerpC(C.coat, '#d99a17', soak * .7), coatSh = lerpC(C.coatSh, '#b97a10', soak * .7), hair = lerpC(C.hair, C.hairWet, soak);
  const w = P.walk;                                   // walk phase in turns, or null
  const sw = w == null ? 0 : Math.sin(w * Math.PI * 2), swb = w == null ? 0 : Math.sin(w * Math.PI * 2 + Math.PI);
  const liftA = w == null ? 0 : Math.max(0, sw) * 26, liftB = w == null ? 0 : Math.max(0, swb) * 26, bob = (w == null ? 0 : -Math.abs(Math.cos(w * Math.PI * 2)) * 9) + P.bob;
  g.translate(0, P.sit * 96);
  g.translate(0, bob);
  if (!P.headOnly) {
  g.save(); g.translate(0, -125); g.rotate(P.lean + (w == null ? 0 : sw * .035)); g.translate(0, 125);
  const hipY = -122;
  // legs (behind the coat). When sitting they splay.
  const legs = [[-32, liftA], [32, liftB]];
  for (const [lx, lift] of legs) {
    const sx = Math.sign(lx), fx = lx + sx * 62 * P.sit, fy = -34 - lift - 14 * P.sit;
    cap(g, lx * .8, hipY, fx, fy, 32, C.trou, LW, lerpC(C.trou, C.navy, .5));
    g.save(); g.translate(fx, fy + 6); g.rotate(sx * .75 * P.sit);
    g.beginPath(); g.moveTo(-26, -14); g.lineTo(26, -14); g.quadraticCurveTo(46, -10, 44, 12); g.quadraticCurveTo(40, 26, 20, 26); g.lineTo(-22, 26); g.quadraticCurveTo(-42, 24, -40, 4); g.quadraticCurveTo(-38, -12, -26, -14); fs(g, C.boot);
    g.save(); g.clip(); g.fillStyle = C.bootSh; g.fillRect(-50, 12, 100, 20); g.restore(); ol(g, 0); g.restore();
  }
  // coat
  const lh = P.lh, rh = P.rh;
  const shoulderY = -266, armDir = [-1, 1];
  const drawArm = (sgn, tg) => {
    const sh = [sgn * 62, shoulderY], AL = P.arm || 72, r = ik(sh[0], sh[1], tg[0], tg[1], AL, AL, (P.elbow ? P.elbow[sgn < 0 ? 0 : 1] : -sgn));
    cap(g, sh[0], sh[1], r.ex, r.ey, 38, coat, LW, coatSh); cap(g, r.ex, r.ey, r.hx, r.hy, 34, coat, LW, coatSh);
    ell(g, r.hx, r.hy + 2, 19, 19, C.skin, LW);
    return r;
  };
  // hood bunched behind the neck
  ell(g, 0, -300, 74, 30, coatSh, LW);
  const coatPath = () => { g.beginPath(); g.moveTo(-64, -290); g.quadraticCurveTo(0, -318, 64, -290); g.lineTo(88, -118); g.quadraticCurveTo(0, -98, -88, -118); g.closePath(); };
  coatPath(); fs(g, coat);
  g.save(); g.clip(); g.fillStyle = coatSh; g.beginPath(); g.moveTo(34, -300); g.lineTo(110, -300); g.lineTo(110, -90); g.lineTo(58, -90); g.quadraticCurveTo(30, -190, 34, -300); g.fill();
  if (soak) { g.fillStyle = `rgba(27,35,64,${.22 * soak})`; g.fillRect(-100, -200, 200, 120); }
  g.restore(); coatPath(); ol(g);
  g.beginPath(); g.moveTo(0, -292); g.lineTo(0, -112); g.strokeStyle = C.coatDk; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.moveTo(-58, -178); g.quadraticCurveTo(-46, -160, -30, -176); g.moveTo(58, -178); g.quadraticCurveTo(46, -160, 30, -176); g.strokeStyle = C.coatDk; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.moveTo(-84, -150); g.quadraticCurveTo(0, -132, 84, -150); g.strokeStyle = coatSh; g.lineWidth = 8; g.stroke();
  // arms: the viewer's-left arm first (drawn over the coat)
  const aL = drawArm(-1, lh), aR = drawArm(1, rh); aLr = aL; aRr = aR;
  g.restore();
  } // body
  // head: sits on the leaning body, so it is drawn inside the same lean around a different pivot
  g.save(); g.translate(0, -125); g.rotate(P.lean * 1.25 + P.tilt); g.translate(0, 125);
  const hy = -392, hairC = hair;
  g.beginPath(); g.ellipse(0, hy - 12, 108, 106, 0, 0, Math.PI * 2); fs(g, hairC);
  const cur = (sgn) => { g.beginPath(); g.moveTo(sgn * 108, hy - 6); g.lineTo(sgn * 108, hy + 70 + soak * 24); g.quadraticCurveTo(sgn * 104, hy + 92 + soak * 26, sgn * 82, hy + 90 + soak * 26); g.lineTo(sgn * 66, hy + 24); g.closePath(); fs(g, hairC); };
  cur(-1); cur(1);
  // face: a skin ellipse with a thin cel-shade crescent on the right
  g.beginPath(); g.ellipse(0, hy + 8, 92, 90, 0, 0, Math.PI * 2); fs(g, C.skinSh);
  g.save(); g.beginPath(); g.ellipse(0, hy + 8, 92, 90, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = C.skin; g.beginPath(); g.ellipse(-12, hy + 2, 90, 88, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.beginPath(); g.ellipse(0, hy + 8, 92, 90, 0, 0, Math.PI * 2); ol(g);
  // fringe: scalloped bottom edge; wet strands clump when soaked
  g.beginPath(); g.moveTo(-98, hy - 14); g.quadraticCurveTo(-104, hy - 100, 0, hy - 104); g.quadraticCurveTo(104, hy - 100, 98, hy - 14);
  const nb = 6; for (let i = 0; i <= nb; i++) { const fx = 98 - (196 * i) / nb, dip = (i % 2 ? 2 : 18) + (i % 2 ? 0 : soak * 10) + (hash(i + 3) - .5) * 5; g.lineTo(fx, hy - 30 + dip); }
  g.closePath(); fs(g, hairC);
  g.save(); g.clip(); g.strokeStyle = C.hairHi; g.lineWidth = 11; g.lineCap = 'round'; g.globalAlpha = 1 - soak * .75; g.beginPath(); g.moveTo(-58, hy - 76); g.quadraticCurveTo(-24, hy - 92, 22, hy - 88); g.stroke(); g.restore();
  if (soak > .3) for (let i = 0; i < 3; i++) { const dx = [-100, 102, -6][i], dy = [hy + 88, hy + 90, hy - 36][i]; g.beginPath(); g.moveTo(dx, dy); g.quadraticCurveTo(dx + (i === 2 ? 0 : Math.sign(dx) * 8), dy + 26, dx + (i === 2 ? 0 : Math.sign(dx) * 2), dy + 44 * soak); g.strokeStyle = hairC; g.lineWidth = 9; g.stroke(); }
  // face features
  const lk = P.look, ey = hy + 18, ex = 36;
  if (P.blush) { g.globalAlpha = .55 * P.blush; ell(g, -60, ey + 28, 18, 10, C.blush, 0); ell(g, 60, ey + 28, 18, 10, C.blush, 0); g.globalAlpha = 1; }
  for (const sgn of [-1, 1]) {
    const cx = sgn * ex + lk[0] * .5, cy = ey + lk[1] * .5;
    g.save();
    if (P.eye === 'open') { ell(g, cx, cy, 12, 18, C.ink, 0); ell(g, cx + 3.5, cy - 6, 5, 6, '#fff', 0); }
    else if (P.eye === 'wide') { ell(g, cx, cy, 22, 25, '#fff', 5); ell(g, cx + lk[0] * .5, cy + lk[1] * .5, 7, 8, C.ink, 0); }
    else if (P.eye === 'flat') { ell(g, cx, cy + 2, 13, 16, C.ink, 0); g.fillStyle = C.skin; g.fillRect(cx - 20, cy - 22, 40, 21); g.beginPath(); g.moveTo(cx - 18, cy - 1); g.lineTo(cx + 18, cy - 1); ol(g, 5); }
    else if (P.eye === 'happy') { g.beginPath(); g.arc(cx, cy + 6, 14, Math.PI * 1.08, Math.PI * 1.92); ol(g, 6); }
    else if (P.eye === 'sad') { g.beginPath(); g.arc(cx, cy + 10, 13, Math.PI * .1, Math.PI * .9); ol(g, 6); }
    else if (P.eye === 'squint') { g.beginPath(); g.moveTo(cx - sgn * 15, cy - 10); g.lineTo(cx + sgn * 11, cy); g.lineTo(cx - sgn * 15, cy + 10); ol(g, 6); }
    else if (P.eye === 'dot') { ell(g, cx, cy, 7, 8, C.ink, 0); }
    g.restore();
    const b = P.brow, by = ey - 36 + b[1], ang = b[0] * sgn;           // b[0] > 0: angry (inner ends low) · < 0: worried
    g.beginPath(); g.moveTo(sgn * ex - 20, by + Math.sin(ang) * 20); g.lineTo(sgn * ex + 20, by - Math.sin(ang) * 20); g.strokeStyle = soak > .5 ? C.hairWet : C.hair; g.lineWidth = 9; g.lineCap = 'round'; g.stroke();
  }
  const my = ey + 50, M = P.mouth;
  if (M === 'flat') { g.beginPath(); g.moveTo(-14, my); g.lineTo(14, my); ol(g, 5); }
  else if (M === 'smile') { g.beginPath(); g.arc(0, my - 10, 20, Math.PI * .15, Math.PI * .85); ol(g, 5); }
  else if (M === 'smirk') { g.beginPath(); g.moveTo(-16, my + 2); g.quadraticCurveTo(6, my + 10, 22, my - 8); ol(g, 5); }
  else if (M === 'frown') { g.beginPath(); g.arc(0, my + 18, 18, Math.PI * 1.2, Math.PI * 1.8); ol(g, 5); }
  else if (M === 'o') { ell(g, 0, my, 9, 12, C.ink, 0); }
  else if (M === 'open') { g.beginPath(); g.moveTo(-20, my - 8); g.quadraticCurveTo(0, my - 2, 20, my - 8); g.quadraticCurveTo(18, my + 30, 0, my + 30); g.quadraticCurveTo(-18, my + 30, -20, my - 8); fs(g, '#7a2430', 5); g.save(); g.clip(); ell(g, 0, my + 28, 14, 10, C.coral, 0); g.restore(); }
  else if (M === 'grit') { rr(g, -22, my - 8, 44, 20, 6); fs(g, '#fff', 5); g.beginPath(); g.moveTo(-8, my - 8); g.lineTo(-8, my + 12); g.moveTo(8, my - 8); g.lineTo(8, my + 12); ol(g, 3); }
  else if (M === 'wavy') { g.beginPath(); g.moveTo(-20, my); g.quadraticCurveTo(-10, my - 8, 0, my); g.quadraticCurveTo(10, my + 8, 20, my); ol(g, 5); }
  g.restore();
  // held things go over the head too (they are in front of the body), in the body's lean frame
  if (P.hold && !P.headOnly) { g.save(); g.translate(0, -125); g.rotate(P.lean + (w == null ? 0 : sw * .035)); g.translate(0, 125); P.hold(g, aLr, aRr); g.restore(); }
  g.restore();
}

// ---------------------------------------------------------------- Dewey: a furled coral umbrella with a face and opinions. Origin = the grip point on the shaft.
export function dewey(g, x, y, s, o = {}) {
  const D = { ang: 0, mood: 'no', blink: 0, open: 0, tag: 0, look: [0, 0], squash: 1, shine: 0, ...o };
  g.save(); g.translate(x, y); g.rotate(D.ang); g.scale(s, s); g.translate(0, 60);
  // handle (J hook) + shaft
  g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -34); g.lineTo(0, -4); g.arc(-26, -4, 26, 0, Math.PI * .92); g.lineTo(-50, -24);
  g.strokeStyle = C.ink; g.lineWidth = 24 + LW; g.stroke(); g.strokeStyle = C.wood; g.lineWidth = 24; g.stroke();
  g.beginPath(); g.moveTo(-6, -30); g.lineTo(-6, -6); g.strokeStyle = C.woodSh; g.lineWidth = 6; g.stroke();
  if (D.tag) {                                                         // hang tag on a loop of string: swings
    const sw = D.tag === true ? 0 : D.tag, ax = -50, ay = -16;
    g.save(); g.translate(ax, ay); g.rotate(sw);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10, 30, -4, 54); g.strokeStyle = C.ink; g.lineWidth = 3; g.stroke();
    g.translate(-4, 54); g.rotate(.12); rr(g, -22, 0, 44, 62, 6); fs(g, C.cream, 4);
    ell(g, 0, 10, 4, 4, C.page, 3); g.beginPath(); g.moveTo(-12, 28); g.lineTo(12, 28); g.moveTo(-12, 40); g.lineTo(8, 40); g.moveTo(-12, 52); g.lineTo(10, 52); g.strokeStyle = C.slate; g.lineWidth = 3; g.stroke();
    g.restore();
  }
  const op = D.open;
  if (op < .02) {
    // furled body
    g.save(); g.scale(D.squash, 1 / D.squash);
    const body = () => { g.beginPath(); g.moveTo(0, -476); g.bezierCurveTo(52, -410, 70, -310, 64, -200); g.bezierCurveTo(60, -150, 38, -112, 14, -98); g.lineTo(-14, -98); g.bezierCurveTo(-38, -112, -60, -150, -64, -200); g.bezierCurveTo(-70, -310, -52, -410, 0, -476); g.closePath(); };
    body(); fs(g, C.coral);
    g.save(); body(); g.clip();
    g.fillStyle = C.coralSh; g.beginPath(); g.moveTo(14, -480); g.bezierCurveTo(70, -400, 84, -300, 80, -90); g.lineTo(100, -90); g.lineTo(100, -500); g.fill();
    g.strokeStyle = C.coralSh; g.lineWidth = 5; g.lineCap = 'round';
    for (const k of [-1, 1]) for (const f of [.3, .68]) { g.beginPath(); g.moveTo(0, -470); g.bezierCurveTo(k * 70 * f, -380, k * 76 * f, -260, k * 40 * f, -104); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-34, -330, 8, 62, .12, 0, Math.PI * 2); g.fill();
    g.restore(); body(); ol(g);
    // strap
    g.save(); g.translate(0, -208); g.rotate(-.04); rr(g, -68, -13, 136, 26, 8); fs(g, C.cream, 5); ell(g, 44, 0, 8, 8, C.ink, 0); g.restore();
    // tip
    g.beginPath(); g.moveTo(-5, -468); g.lineTo(5, -468); g.lineTo(3, -498); g.lineTo(-3, -498); g.closePath(); fs(g, C.steel, 4);
    face(g, 0, -312, D, 1);
    g.restore();
  } else {
    // open parasol: coral and cream gores with scalloped hem, face on the dome
    const R = 290 * ss(op), Hh = 210 * (.4 + .6 * ss(op)), by = -262, tipY = by - Hh;
    g.beginPath(); g.moveTo(0, -60); g.lineTo(0, by + 4); g.strokeStyle = C.ink; g.lineWidth = 16 + LW; g.stroke(); g.strokeStyle = C.steel; g.lineWidth = 16; g.stroke();
    const n = 6, pts = []; for (let i = 0; i <= n; i++) pts.push([-R + (2 * R * i) / n, by + (i % 1 ? 0 : 0)]);
    const dome = () => { g.beginPath(); g.moveTo(-R, by); g.bezierCurveTo(-R, tipY + Hh * .15, -R * .45, tipY, 0, tipY); g.bezierCurveTo(R * .45, tipY, R, tipY + Hh * .15, R, by); for (let i = n; i > 0; i--) { const x0 = pts[i][0], x1 = pts[i - 1][0]; g.quadraticCurveTo((x0 + x1) / 2, by + 44 * ss(op), x1, by); } g.closePath(); };
    dome(); fs(g, C.cream);
    g.save(); dome(); g.clip();
    for (let i = 0; i < n; i += 2) { g.fillStyle = C.coral; g.beginPath(); g.moveTo(0, tipY - 6); g.lineTo(pts[i][0], by + 60); g.lineTo(pts[i + 1][0], by + 60); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(27,35,64,.13)'; g.beginPath(); g.ellipse(R * .5, tipY + Hh * .5, R * .85, Hh * .75, -.25, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(0, tipY); g.lineTo(pts[i][0], by + 20); g.stroke(); }
    g.restore(); dome(); ol(g);
    g.beginPath(); g.moveTo(0, tipY - 2); g.lineTo(0, tipY - 30); ol(g, 8); ell(g, 0, tipY - 32, 8, 8, C.steel, 4);
    if (op > .6) face(g, 0, by - Hh * .42, D, 1.0, 1.15);
  }
  g.restore();
}
function face(g, cx, cy, D, sc, wide = 1) {                    // Dewey's face; mood shows in brows and eyelids
  const m = D.mood, ex = 26 * wide, bl = 1 - D.blink;
  g.save(); g.translate(cx, cy); g.scale(sc, sc);
  for (const sgn of [-1, 1]) {
    const X = sgn * ex;
    if (m === 'no') { g.beginPath(); g.moveTo(X - 15, 0); g.lineTo(X + 15, 0); ol(g, 6); }                              // eyes shut tight: refusal
    else if (m === 'strain') { g.beginPath(); g.moveTo(X - sgn * 16, -12); g.lineTo(X + sgn * 12, 0); g.lineTo(X - sgn * 16, 12); ol(g, 6); }
    else if (m === 'shock') { ell(g, X, 0, 17, 20 * bl + 1, '#fff', 5); ell(g, X + D.look[0], D.look[1], 5, 6 * bl + .5, C.ink, 0); }
    else if (m === 'smug') { ell(g, X, 0, 16, 18 * bl + 1, '#fff', 5); ell(g, X + D.look[0] + 4, 4 + D.look[1], 7, 8 * bl + .5, C.ink, 0); g.fillStyle = C.coral; g.fillRect(X - 22, -22, 44, 17 * bl + 6); g.beginPath(); g.moveTo(X - 18, -3); g.lineTo(X + 18, -3); ol(g, 5); }
    else { ell(g, X, 0, 16, 19 * bl + 1, '#fff', 5); ell(g, X + D.look[0], D.look[1] + 2, 6.5, 8 * bl + .5, C.ink, 0); }
    const k = (m === 'shock' ? -.15 : m === 'smug' ? .08 : .42) * 16, yo = -32, inner = X - sgn * 20, outer = X + sgn * 20;
    g.beginPath(); g.moveTo(outer, yo - k); g.lineTo(inner, yo + k); g.strokeStyle = C.ink; g.lineWidth = 9; g.lineCap = 'round'; g.stroke();
  }
  if (m === 'smug') { g.beginPath(); g.moveTo(-16, 38); g.quadraticCurveTo(4, 48, 22, 30); ol(g, 5); }
  else if (m === 'shock') ell(g, 0, 40, 8, 11, C.ink, 0);
  else if (m === 'strain') { rr(g, -18, 32, 36, 16, 5); fs(g, '#fff', 4); g.beginPath(); g.moveTo(0, 32); g.lineTo(0, 48); ol(g, 3); }
  else { g.beginPath(); g.arc(0, 52, 13, Math.PI * 1.15, Math.PI * 1.85); ol(g, 5); }
  g.restore();
}

// ---------------------------------------------------------------- text: balloons, narration boxes, onomatopoeia
export function wrap(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  lines.push(cur); return lines;
}
export function textBox(g, text, size, maxW, weight = '700', italic = false) {
  g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT_BODY}`; const lines = wrap(g, text, maxW), lh = size * 1.12;
  const w = Math.max(...lines.map(l => g.measureText(l).width)); return { lines, lh, w, h: lines.length * lh };
}
function drawLines(g, B, cx, cy, size, col = C.ink, italic = false, weight = '700') {
  g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT_BODY}`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  B.lines.forEach((l, i) => g.fillText(l, cx, cy + (i - (B.lines.length - 1) / 2) * B.lh));
}
// A balloon. (x, y) = its centre; tail = [tx, ty] the tip. kind: speech · thought · shout · small (Dewey).  pop = 0..1 pop-in. Returns the text box in current coordinates.
export function balloon(g, o) {
  const { text, x, y, tail, kind = 'speech', size = 46, maxW = 460, pop = 1 } = o;
  const B = textBox(g, text, size, maxW, '700', kind === 'small'), padX = kind === 'shout' ? 62 : 44, padY = 30;
  const bw = B.w + padX * 2, bh = B.h + padY * 2;
  const box = { x0: x - B.w / 2, y0: y - B.h / 2, x1: x + B.w / 2, y1: y + B.h / 2 };
  if (pop <= 0) return box;
  g.save();
  const ox = tail ? tail[0] : x, oy = tail ? tail[1] : y, sc = Math.max(.001, back(pop, 2.2));
  g.translate(ox, oy); g.scale(sc, sc); g.translate(-ox, -oy);
  const fill = kind === 'small' ? '#e6eef9' : C.white;
  if (kind === 'thought') {
    const rx = bw / 2 * 1.08, ry = bh / 2 * 1.2, n = 16, br = Math.min(rx, ry) * .2;
    for (let i = 0; i < n; i++) { const am = (i / n) * Math.PI * 2; ell(g, x + Math.cos(am) * rx, y + Math.sin(am) * ry, br, br, fill, 5); }
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
    if (tail) { const dx = tail[0] - x, dy = tail[1] - y; for (const [f, r] of [[.66, 15], [.82, 11], [.96, 7]]) ell(g, x + dx * f, y + dy * f, r, r, fill, 4); }
  } else if (kind === 'shout') {
    const n = 16, rx = bw / 2 * 1.12, ry = bh / 2 * 1.34; g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, k = i % 2 ? .8 : 1.16; g.lineTo(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k); } g.closePath(); fs(g, C.white, 6);
    if (tail) { g.beginPath(); g.moveTo(x - 30, y + ry * .6); g.lineTo(tail[0], tail[1]); g.lineTo(x + 30, y + ry * .6); fs(g, C.white, 6); }
  } else if (kind === 'small') {
    if (tail) { const d = Math.hypot(tail[0] - x, tail[1] - y) || 1, ux = (tail[0] - x) / d, uy = (tail[1] - y) / d; g.beginPath(); g.moveTo(x - uy * 18 + ux * 20, y + ux * 18 + uy * 20); g.lineTo(tail[0], tail[1]); g.lineTo(x + uy * 18 + ux * 20, y - ux * 18 + uy * 20); fs(g, fill, 5); }
    rr(g, x - bw / 2, y - bh / 2, bw, bh, 20); fs(g, fill, 5);
    if (tail) { const d = Math.hypot(tail[0] - x, tail[1] - y) || 1, ux = (tail[0] - x) / d, uy = (tail[1] - y) / d; g.beginPath(); g.moveTo(x - uy * 14 + ux * 18, y + ux * 14 + uy * 18); g.lineTo(tail[0] - ux * 2, tail[1] - uy * 2); g.lineTo(x + uy * 14 + ux * 18, y - ux * 14 + uy * 18); g.closePath(); g.fillStyle = fill; g.fill(); }
  } else {
    const rx = bw / 2 * 1.1, ry = bh / 2 * 1.22;
    if (tail) {
      const a = Math.atan2((tail[1] - y) / ry, (tail[0] - x) / rx), sp = .2, p1 = [x + Math.cos(a - sp) * rx, y + Math.sin(a - sp) * ry], p2 = [x + Math.cos(a + sp) * rx, y + Math.sin(a + sp) * ry];
      g.beginPath(); g.moveTo(...p1); g.quadraticCurveTo((p1[0] + tail[0]) / 2 + 6, (p1[1] + tail[1]) / 2 - 4, tail[0], tail[1]); g.quadraticCurveTo((p2[0] + tail[0]) / 2 - 6, (p2[1] + tail[1]) / 2 + 4, ...p2); g.closePath(); fs(g, fill, 5);
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, a + sp * .9, a - sp * .9 + Math.PI * 2); ol(g, 5);
    } else { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); fs(g, fill, 5); }
  }
  drawLines(g, B, x, y, size, C.ink, kind === 'small');
  g.restore();
  return box;
}
// A narration box: cream rectangle, ink border, hard shadow. (x, y) = top-left.
export function narration(g, o) {
  const { text, x, y, size = 38, maxW = 560, slide = 1 } = o;
  const B = textBox(g, text, size, maxW, '700'), w = B.w + 56, h = B.h + 40, ox = (1 - slide) * -60;
  if (slide <= 0) return { x0: x + 28, y0: y + 20, x1: x + 28 + B.w, y1: y + 20 + B.h, w, h };
  g.save(); g.globalAlpha = clamp(slide * 2); g.translate(ox, 0);
  g.fillStyle = C.ink; g.fillRect(x + 8, y + 8, w, h);
  g.fillStyle = C.cream; g.fillRect(x, y, w, h); g.strokeStyle = C.ink; g.lineWidth = 5; g.lineJoin = 'miter'; g.strokeRect(x, y, w, h);
  g.font = `700 ${size}px ${FONT_BODY}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = C.ink;
  B.lines.forEach((l, i) => g.fillText(l, x + 28, y + 20 + B.lh / 2 + i * B.lh));
  g.restore();
  return { x0: x + 28 + ox, y0: y + 20, x1: x + 28 + B.w + ox, y1: y + 20 + B.h, w, h };
}
// Onomatopoeia in the display face: a fill, a thick ink outline, a hard offset shadow. (x, y) = centre.
export function sfxText(g, o) {
  const { text, x, y, size = 150, rot = 0, fill = C.coral, pop = 1, shake = 0, edge = C.white, tt = 0 } = o;
  if (pop <= 0) return null;
  g.save(); g.font = `${size}px ${FONT_DISPLAY}`; const w = g.measureText(text).width;
  g.translate(x + (shake ? Math.sin(tt * 80) * shake : 0), y + (shake ? Math.cos(tt * 67) * shake * .6 : 0)); g.rotate(rot);
  const sc = Math.max(.001, back(pop, 2.6)); g.scale(sc * (1 + (1 - pop) * .2), sc);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.fillStyle = C.ink; g.fillText(text, 8, 10);
  g.strokeStyle = C.ink; g.lineWidth = size * .16; g.strokeText(text, 0, 0);
  g.strokeStyle = edge; g.lineWidth = size * .07; g.strokeText(text, 0, 0);
  g.fillStyle = fill; g.fillText(text, 0, 0);
  g.restore();
  return { w, h: size * .9 };
}
export function drop(g, x, y, r, fill = C.sky1) {
  g.beginPath(); g.moveTo(x, y - r * 1.7); g.quadraticCurveTo(x + r * 1.1, y - r * .1, x, y + r); g.quadraticCurveTo(x - r * 1.1, y - r * .1, x, y - r * 1.7); fs(g, fill, 3.5);
}
export function sweat(g, x, y, r = 12) { drop(g, x, y, r, '#cfe6f7'); }
// speed / impact lines radiating from (cx, cy)
export function burst(g, cx, cy, r0, r1, n, seed, col = C.ink, lw = 4) {
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + hash(seed + i) * .3, a0 = r0 * (1 + hash(seed + i * 3) * .4), a1 = r1 * (.75 + hash(seed + i * 5) * .5); g.beginPath(); g.moveTo(cx + Math.cos(a) * a0, cy + Math.sin(a) * a0); g.lineTo(cx + Math.cos(a) * a1, cy + Math.sin(a) * a1); g.stroke(); }
}
