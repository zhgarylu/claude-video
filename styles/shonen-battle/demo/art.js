// art.js: the cast and the set, drawn with the ink toolbox. Original characters: HARU (hero), THE JAR (rival), Grandma (hands only).
import { c, INK, S, shape, ink, taper, tube, trace, jit, focusLines, speedLines, burst, aura, cracks, puff, chunk, hatch, tone, rot2 } from './ink.js';
import { hash, clamp, lerp, seg, ss } from '/core/lib.js';

export const P = {
  skin: '#f7c9a1', skinSh: '#dd9970', hair: '#1c2150', hairHi: '#3b55c4', band: '#f6f1e4', bandSt: '#2e6fd6',
  tee: '#f2b82e', teeSh: '#c98716', apron: '#e8452c', apronSh: '#a62a20', pants: '#2c4380', pantsSh: '#1b2a57', shoe: '#f4efe3',
  teal: '#1fe7d2', tealLt: '#9ff8ee', tealDp: '#0a93ad', vio: '#7a22d8', vioLt: '#d03ee6', vioHot: '#ff4a8a',
  glass: '#9edcc0', glassSh: '#5fb394', brine: '#cfdc7c', pick: '#6f9f31', pickSh: '#3f6c20', lid: '#cfd1de', lidSh: '#7f829c',
  wall: '#ffb066', wallSh: '#e07d4a', counter: '#7a4f3d', counterTop: '#d9a870', tile: '#e8e0cf', tileSh: '#b9c2c4', navy: '#10163c',
};
export function mix(a, b, k) { const f = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = f(a), B = f(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
const pal = (lit, k = .35) => { const o = {}; for (const key of ['skin', 'skinSh', 'tee', 'teeSh', 'apron', 'apronSh', 'hair', 'pants', 'pantsSh', 'shoe', 'band']) o[key] = lit ? mix(P[key], P.tealLt, lit * k) : P[key]; return o; };

// ---------------------------------------------------------------- Haru
// local space: head centre (0,0), head about 300 wide. o: eye{open,anger,iris,look,glint}, brow, mouth, lift, sweat, vein, tilt, blush, lit, wind
export function haruHead(x, y, s, o = {}) {
  const e = Object.assign({ open: 1, anger: 0, iris: 1, look: [0, 0], glint: 0 }, o.eye || {});
  const brow = o.brow ?? e.anger, lift = o.lift || 0, wind = o.wind || 0, K = pal(o.lit || 0);
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(o.tilt || 0);
  // back hair
  const sp = [[-150, 60], [-190, 10], [-224, -62], [-172, -62], [-205, -150], [-132, -128], [-158, -236], [-82, -168], [-64, -276], [-20, -186], [34, -290], [72, -186], [140, -254], [142, -148], [212, -192], [168, -88], [228, -48], [172, -8], [204, 56], [150, 60]];
  const tips = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18]);
  const hp = sp.map((p, i) => { let [px, py] = p; if (tips.has(i)) { py -= lift * (50 + 40 * hash(i)); px += (px > 0 ? 1 : -1) * lift * 14; py += wind * 0; } return [px + (tips.has(i) ? wind * 20 * (hash(i + 3) - .3) : 0), py]; });
  shape(hp, { fill: K.hair, lw: 8, smooth: false, id: 1 });
  // neck shadow is drawn by bust; face
  const face = [[-128, -110], [-148, -20], [-136, 66], [-92, 136], [0, 172], [92, 136], [136, 66], [148, -20], [128, -110], [0, -150]];
  shape(face, { fill: K.skin, lw: 8, id: 2 });
  c.save(); c.beginPath(); trace(face, true, true); c.clip();
  c.fillStyle = K.skinSh; c.beginPath(); c.moveTo(70, -150); c.quadraticCurveTo(150, -40, 112, 100); c.lineTo(200, 200); c.lineTo(200, -150); c.fill();    // right-side shadow
  c.beginPath(); c.moveTo(-140, 120); c.quadraticCurveTo(0, 190, 140, 120); c.lineTo(140, 260); c.lineTo(-140, 260); c.fill();                       // under the chin
  c.restore();
  // hair cap and fringe
  const fr = [[152, -30], [140, 6], [112, -66], [92, -16], [62, -80], [38, 2], [8, -84], [-24, -18], [-52, -78], [-84, 4], [-108, -62], [-128, -14], [-150, -60], [-152, -30], [-165, -120], [-120, -178], [0, -198], [120, -178], [165, -120]];
  const fp = fr.map((p, i) => [p[0] + (i % 2 === 1 && i < 13 ? wind * 8 : 0), p[1] - (i % 2 === 1 && i < 13 ? lift * 34 : 0)]);
  shape(fp, { fill: K.hair, lw: 7, smooth: false, id: 3 });
  // hair highlight (hard band)
  c.save(); c.beginPath(); trace(fp, true, false); c.clip(); c.fillStyle = P.hairHi; c.beginPath(); c.moveTo(-120, -150); c.quadraticCurveTo(0, -200, 120, -150); c.lineTo(112, -128); c.quadraticCurveTo(0, -172, -112, -128); c.fill(); c.restore();
  // headband (a tea towel) + knot and tails
  const bt = [[-168, -108], [-90, -128], [0, -134], [90, -128], [168, -108]], bb = [[168, -72], [90, -94], [0, -100], [-90, -94], [-168, -72]];
  shape(bt.concat(bb), { fill: K.band, lw: 7, id: 4 });
  c.save(); c.beginPath(); trace(bt.concat(bb), true, true); c.clip(); c.fillStyle = P.bandSt; for (const dx of [-110, -50, 10, 70, 130]) { c.beginPath(); c.moveTo(dx - 8, -140); c.lineTo(dx + 8, -140); c.lineTo(dx - 6, -60); c.lineTo(dx - 20, -60); c.fill(); } c.restore();
  const fl = Math.sin(wind * 2.0 + 1) * 20 * (wind > 0 ? 1 : 0);
  tube([[160, -92], [210, -70 + fl], [262, -34 + fl * 1.6], [300, 20 + fl * 2]], [38, 34, 26, 14], { fill: K.band, lw: 6, id: 5 });
  tube([[160, -96], [214, -108 + fl], [268, -92 + fl * 1.4], [316, -50 + fl * 2]], [34, 30, 22, 10], { fill: K.band, lw: 6, id: 6 });
  shape([[140, -112], [176, -108], [180, -70], [144, -68]], { fill: P.bandSt, lw: 6, id: 7 });
  // brows
  const bw = 17;
  for (const sd of [-1, 1]) {
    c.save(); c.scale(sd, 1);
    const by = -38 - 6 * e.open + (e.open < .3 ? 10 : 0);
    taper([[-26, by + brow * 22 - 2], [18, by + 2 + brow * 8], [66, by - 4 - brow * 15]], bw, 6, INK, { id: 8 + (sd > 0 ? 1 : 0) });
    c.restore();
  }
  // eyes
  for (const sd of [-1, 1]) eye(sd * 66, 24, sd, e, K);
  // nose, mouth
  ink([[6, 62], [14, 70], [6, 74]], 5, { id: 12 });
  mouth(0, 112, o.mouth || 'line', o);
  if (o.blush) { c.save(); c.globalAlpha = o.blush; for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(sd * (84 + i * 14), 78); c.lineTo(sd * (74 + i * 14), 96); c.lineWidth = 4; c.strokeStyle = '#e0586a'; c.stroke(); } c.restore(); }
  // sweat drops, anger vein
  const sw = o.sweat || 0;
  for (let i = 0; i < sw; i++) { const sx = 150 - i * 28, sy = -30 + i * 74 + (o.sweatDrop || 0) * (60 + i * 20); drop(sx, sy, 1 - (o.sweatDrop || 0) * .6); }
  if (o.vein) vein(-112, -92, o.vein);
  if (o.gloom) { c.save(); c.beginPath(); trace(face, true, true); c.clip(); c.strokeStyle = '#2a2f8a'; c.lineWidth = 7;
    for (let i = -4; i <= 4; i++) { const g = o.gloom, x0 = i * 30; c.beginPath(); c.moveTo(x0, -120); c.lineTo(x0 + 3, -120 + 120 * g + (i % 2) * 20); c.stroke(); } c.restore(); }
  if (o.shade) { c.save(); c.beginPath(); trace(face, true, true); c.clip(); c.fillStyle = `rgba(20,10,60,${o.shade})`; c.fillRect(-300, -300, 600, 600); c.restore(); }
  c.restore();
}
function eye(x, y, sd, e, K) {
  c.save(); c.translate(x, y); c.scale(sd, 1);
  const o = e.open, a = e.anger;
  if (o < .12) {   // closed: a heavy arc with lashes
    taper([[-44, 6 + a * 8], [0, 22 + (e.sad || 0)], [50, 4 - a * 6]], 12, 5, INK, { id: 20, mid: 0 });
    taper([[46, 4 - a * 6], [64, -6 - a * 4]], 8, 2, INK, { id: 21 });
    c.restore(); return;
  }
  const top = -34 * o - a * 6, bot = 32 * o;
  const shp = [[-42, 4 + a * 14], [-20, top * .8 + a * 8], [14, top], [48, -4 - a * 12], [34, bot * .55], [4, bot], [-24, bot * .7]];
  c.save(); c.beginPath(); trace(shp, true, true); c.fillStyle = '#fff'; c.fill(); c.clip();
  const ir = 27 * e.iris, ix = 6 + e.look[0], iy = (top + bot) / 2 + e.look[1];
  c.fillStyle = '#17236b'; c.beginPath(); c.ellipse(ix, iy, ir, Math.min(ir * 1.15, 44) * Math.max(.4, o), 0, 0, 7); c.fill();
  c.save(); c.beginPath(); c.ellipse(ix, iy, ir, Math.min(ir * 1.15, 44) * Math.max(.4, o), 0, 0, 7); c.clip();
  c.fillStyle = '#2d70e6'; c.beginPath(); c.ellipse(ix, iy + ir * .55, ir * 1.1, ir * .62, 0, 0, 7); c.fill();
  c.fillStyle = '#6fd5ff'; c.beginPath(); c.ellipse(ix, iy + ir * .85, ir * .9, ir * .3, 0, 0, 7); c.fill(); c.restore();
  if (e.reflect) { c.fillStyle = INK; c.fillRect(ix - 8, iy - 4, 16, 26); c.fillRect(ix - 10, iy - 10, 20, 8); }
  c.fillStyle = INK; c.beginPath(); c.ellipse(ix, iy, ir * .42 * (e.pupil ?? 1), ir * .55 * (e.pupil ?? 1), 0, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ix - ir * .35, iy - ir * .4, ir * .3, ir * .38, -.3, 0, 7); c.fill();
  c.beginPath(); c.arc(ix + ir * .42, iy + ir * .38, ir * .13, 0, 7); c.fill();
  if (e.glint > 0) {   // a flash of light across the eye
    c.fillStyle = '#fff'; const g = e.glint; c.beginPath(); c.moveTo(ix - 60 * g, iy - 4); c.lineTo(ix, iy - 10 * g); c.lineTo(ix + 60 * g, iy - 2); c.lineTo(ix, iy + 10 * g); c.fill();
    c.beginPath(); c.moveTo(ix - 4, iy - 55 * g); c.lineTo(ix + 5, iy); c.lineTo(ix - 3, iy + 55 * g); c.lineTo(ix - 9, iy); c.fill();
  }
  c.restore();
  taper([[-46, 6 + a * 14], [-18, top * .85 + a * 8], [16, top - 4], [48, -4 - a * 12]], 15, 6, INK, { id: 22, mid: 0 });
  taper([[46, -4 - a * 12], [66, -14 - a * 10], [74, -26 - a * 8]], 9, 2, INK, { id: 23 });
  ink([[-30, bot * .7], [4, bot], [34, bot * .55]], 3.5, { id: 24 });
  c.restore();
}
function mouth(x, y, kind, o) {
  c.save(); c.translate(x, y);
  const m = o.mouthOpen ?? 1;
  if (kind === 'line') ink([[-34, 0], [0, 6], [34, -2]], 6, { id: 30 });
  else if (kind === 'flat') ink([[-30, 2], [-10, -3], [10, 5], [30, 0]], 6, { id: 30 });
  else if (kind === 'smirk') ink([[-30, 6], [0, 8], [34, -8]], 6, { id: 30 });
  else if (kind === 'smile') {
    shape([[-46, -4], [0, 10], [46, -4], [32, 32], [0, 44], [-32, 32]], { fill: '#4a0f26', lw: 7, id: 31 });
    shape([[-38, -2], [0, 10], [38, -2], [30, 12], [0, 18], [-30, 12]], { fill: '#fff', lw: 0, id: 32 });
    shape([[-18, 36], [0, 30], [18, 36], [0, 42]], { fill: '#e8547a', lw: 0, id: 33 });
  } else if (kind === 'grit') {
    shape([[-52, -22], [52, -22], [58, 22], [40, 34], [-40, 34], [-58, 22]], { fill: '#fff', lw: 8, id: 34, smooth: false });
    for (const dx of [-26, 0, 26]) ink([[dx, -22], [dx, 32]], 4, { id: 35 + dx });
    ink([[-56, 6], [56, 6]], 4, { id: 36 });
  } else if (kind === 'shout') {
    const h = 66 * m + 10, w = 62 * (.7 + .3 * m);
    shape([[-w, -16], [0, -26], [w, -16], [w * .8, h * .8], [0, h], [-w * .8, h * .8]], { fill: '#3b0a1d', lw: 8, id: 37 });
    c.save(); c.beginPath(); trace([[-w, -16], [0, -26], [w, -16], [w * .8, h * .8], [0, h], [-w * .8, h * .8]], true, true); c.clip();
    c.fillStyle = '#e8547a'; c.beginPath(); c.ellipse(0, h * .85, w * .8, h * .42, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.fillRect(-w, -26, w * 2, 22); ink([[-w, -4], [w, -4]], 3, { id: 38 }); c.restore();
  } else if (kind === 'o') shape([[-16, -14], [0, -22], [16, -14], [18, 8], [0, 18], [-18, 8]], { fill: '#4a0f26', lw: 6, id: 39 });
  else if (kind === 'wobble') ink([[-34, 2], [-22, -6], [-10, 6], [4, -6], [16, 6], [34, -2]], 6, { id: 40 });
  c.restore();
}
export function drop(x, y, k = 1) {
  c.save(); c.translate(x, y); c.scale(k, k);
  shape([[0, -34], [14, -6], [18, 14], [0, 26], [-18, 14], [-14, -6]], { fill: '#bfeaff', lw: 6, id: 50 });
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-6, 8, 4, 8, .3, 0, 7); c.fill(); c.restore();
}
export function vein(x, y, k = 1) {
  c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = '#e63946'; c.lineWidth = 5; c.strokeStyle = INK;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { c.beginPath(); c.moveTo(sx * 6, sy * 6); c.quadraticCurveTo(sx * 30, sy * 6, sx * 34, sy * 30); c.quadraticCurveTo(sx * 14, sy * 14, sx * 6, sy * 34 * .4); c.closePath(); c.fill(); c.stroke(); }
  c.restore();
}
// shoulders, torso, apron (to the bottom of the frame). origin = head centre
export function bust(x, y, s, o = {}) {
  const K = pal(o.lit || 0); c.save(); c.translate(x, y); c.scale(s, s); c.rotate(o.tilt || 0); const bot = o.bottom || 900, br = o.breath || 0;
  tube([[0, 100], [0, 200]], [112, 126], { fill: K.skin, lw: 7, id: 60 });
  c.fillStyle = K.skinSh; c.beginPath(); c.moveTo(-56, 110); c.lineTo(56, 110); c.lineTo(64, 150); c.quadraticCurveTo(0, 190, -64, 150); c.fill();
  const tb = Math.min(bot, o.teeBottom || bot), sh = [[-70, 168 - br], [-150, 200 - br], [-214, 262 - br], [-236, 390], [-244, tb], [244, tb], [236, 390], [214, 262 - br], [150, 200 - br], [70, 168 - br]];
  shape(sh, { fill: K.tee, lw: 8, smooth: false, id: 61 });
  c.save(); c.beginPath(); trace(sh, true, false); c.clip(); c.fillStyle = K.teeSh; c.beginPath(); c.moveTo(90, 160); c.lineTo(300, 220); c.lineTo(300, tb + 10); c.lineTo(150, tb + 10); c.lineTo(140, 340); c.fill(); c.restore();
  shape([[-64, 160 - br], [0, 206 - br], [64, 160 - br], [70, 176 - br], [0, 232 - br], [-70, 176 - br]], { fill: K.tee, lw: 6, id: 62 });
  const ap = [[-112, 330], [-86, 250], [-64, 178], [-46, 180], [-60, 270], [-60, 300], [60, 300], [60, 270], [46, 180], [64, 178], [86, 250], [112, 330], [150, bot], [-150, bot]];
  shape(ap, { fill: K.apron, lw: 8, smooth: false, id: 63 });
  c.save(); c.beginPath(); trace(ap, true, false); c.clip(); c.fillStyle = K.apronSh; c.beginPath(); c.moveTo(40, 190); c.lineTo(90, 250); c.lineTo(190, bot); c.lineTo(34, bot); c.fill(); c.restore();
  shape([[-70, 440], [70, 440], [64, 540], [-64, 540]], { fill: mix(K.apron, '#000', .1), lw: 6, id: 64, smooth: false });   // pocket
  c.restore();
}
// a clenched fist. (x,y) centre of the knuckles
export function fist(x, y, s, o = {}) {
  const { rot = 0, fill = P.skin, sh = P.skinSh, flip = 1, shake = 0 } = o;
  c.save(); c.translate(x + jit(77, shake), y + jit(78, shake)); c.rotate(rot); c.scale(s * flip, s);
  shape([[-58, -44], [58, -44], [66, 28], [40, 56], [-40, 56], [-66, 28]], { fill, lw: 8, id: 70, smooth: true });
  c.save(); c.beginPath(); trace([[-58, -44], [58, -44], [66, 28], [40, 56], [-40, 56], [-66, 28]], true, true); c.clip(); c.fillStyle = sh; c.fillRect(-80, 24, 160, 60); c.restore();
  for (const dx of [-30, 0, 30]) ink([[dx, -44], [dx - 2, 8]], 5, { id: 71 + dx });
  shape([[-60, -12], [-16, 6], [-6, 36], [-50, 40]], { fill, lw: 7, id: 72 });
  c.restore();
}
// a full frontal figure to the feet (for the stance). origin = head centre. stride: feet apart
export function haruStance(x, y, s, o = {}) {
  const K = pal(o.lit || 0); c.save(); c.translate(x, y); c.scale(s, s);
  const sw = o.stride ?? 230;
  for (const sd of [-1, 1]) {   // legs and shoes
    tube([[sd * 80, 640], [sd * (sw * .62), 860], [sd * sw, 1060]], [170, 134, 112], { fill: K.pants, lw: 8, id: 80 + sd, shade: K.pantsSh, shadeSide: sd });
    shape([[sd * (sw - 70), 1040], [sd * (sw + 80), 1030], [sd * (sw + 110), 1090], [sd * (sw + 40), 1130], [sd * (sw - 80), 1120]], { fill: K.shoe, lw: 8, id: 83 + sd });
    ink([[sd * (sw - 70), 1110], [sd * (sw + 90), 1104]], 6, { id: 85 + sd });
  }
  const fl = o.fistLift || 0;
  for (const sd of [-1, 1]) tube([[sd * 150, 250], [sd * 262, 372 - fl * 40]], [128, 98], { fill: K.tee, lw: 8, id: 92 + sd });
  bust(0, 0, 1, { lit: o.lit, bottom: 900, teeBottom: 690, tilt: 0 });
  // arms hanging, fists clenched
  for (const sd of [-1, 1]) {
    tube([[sd * 268, 360 - fl * 40], [sd * 286, 440 - fl * 90], [sd * (300 + (o.armOut || 0)), 560 - fl * 150]], [100, 84, 70], { fill: K.skin, lw: 8, id: 90 + sd, shade: K.skinSh, shadeSide: sd });
    fist(sd * (306 + (o.armOut || 0)), 590 - fl * 160, 1.15, { rot: sd * .1, flip: sd, shake: o.tremble || 0 });
  }
  haruHead(0, 0, 1, o.head || {});
  c.restore();
}

// ---------------------------------------------------------------- the Jar
// origin = centre of the jar body. mood: 1 menace (angled slit glints), 0 plain, -1 friendly sparkle
export function jar(x, y, s, o = {}) {
  const { mood = 0, tilt = 0, lidUp = 0, lidRot = 0, glow = 0, lit = 0, noLid = false, rattle = 0 } = o;
  c.save(); c.translate(x + jit(101, rattle), y + jit(102, rattle)); c.rotate(tilt); c.scale(s, s);
  const body = [[-170, -230], [-190, -190], [-196, 150], [-176, 236], [-120, 270], [120, 270], [176, 236], [196, 150], [190, -190], [170, -230]];
  const glass = lit ? mix(P.glass, '#ffffff', lit * .2) : P.glass;
  shape(body, { fill: glass, lw: 11, id: 100 });
  c.save(); c.beginPath(); trace(body, true, true); c.clip();
  c.fillStyle = P.glassSh; c.fillRect(70, -300, 200, 700);
  // brine and pickles
  c.fillStyle = P.brine; c.beginPath(); c.moveTo(-210, -130); c.quadraticCurveTo(-60, -150, 0, -128); c.quadraticCurveTo(100, -106, 210, -132); c.lineTo(210, 300); c.lineTo(-210, 300); c.fill();
  c.fillStyle = mix(P.brine, P.glassSh, .35); c.fillRect(70, -140, 200, 450);
  ink([[-210, -130], [-60, -150], [0, -128], [100, -106], [210, -132]], 5, { id: 101, col: '#7a8a2c' });
  const picks = [[-96, 10, -.5, 1], [10, 80, .25, 1.05], [96, -20, .6, .95], [-40, 170, .1, 1], [86, 168, -.35, .9], [-120, 210, .8, .8]];
  picks.forEach(([px, py, r, k], i) => {
    c.save(); c.translate(px, py); c.rotate(r); c.scale(k, k);
    shape([[-92, -4], [-60, -34], [30, -38], [86, -22], [96, 6], [70, 36], [-30, 40], [-80, 28]], { fill: P.pick, lw: 7, id: 102 + i });
    c.fillStyle = P.pickSh; c.beginPath(); c.ellipse(10, 24, 80, 16, 0, 0, 7); c.fill();
    c.fillStyle = '#9ccc4a'; for (const bx of [-50, -20, 20, 54]) { c.beginPath(); c.arc(bx, -12 + (bx % 3), 5, 0, 7); c.fill(); }
    c.restore();
  });
  for (const [bx, by, br] of [[-130, -60, 8], [-150, 60, 6], [140, 40, 7], [120, -80, 5]]) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(bx, by, br, 0, 7); c.stroke(); }
  c.restore();
  // glass shine and the rival's glints
  taper([[-150, -110], [-160, 30], [-152, 150]], 20, 6, '#fff', { id: 120 });
  taper([[-128, 180], [-100, 226]], 12, 4, '#fff', { id: 121 });
  if (mood > 0) {   // narrowed, slanted slits of light on the glass: it is glaring
    const k = mood;
    shape([[-150, -200 + 22 * k], [-34, -168], [-48, -146], [-150, -176 + 10 * k]].map(p => p), { fill: '#fff', lw: 0, smooth: false, id: 122 });
    shape([[150, -200 + 22 * k], [34, -168], [48, -146], [150, -176 + 10 * k]], { fill: '#fff', lw: 0, smooth: false, id: 123 });
  } else if (mood < 0) {
    for (const [sx, sy, sr] of [[-130, -170, 26], [100, -150, 18]]) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(sx, sy - sr * 1.6); c.lineTo(sx + sr * .3, sy - sr * .3); c.lineTo(sx + sr * 1.6, sy); c.lineTo(sx + sr * .3, sy + sr * .3); c.lineTo(sx, sy + sr * 1.6); c.lineTo(sx - sr * .3, sy + sr * .3); c.lineTo(sx - sr * 1.6, sy); c.lineTo(sx - sr * .3, sy - sr * .3); c.fill(); }
  }
  // label
  shape([[-110, 70], [110, 70], [104, 210], [-104, 210]], { fill: '#f4e9d0', lw: 8, smooth: false, id: 124 });
  shape([[-60, 120], [60, 120], [52, 170], [-52, 170]], { fill: P.pick, lw: 6, id: 125 });
  shape([[-96, 82], [96, 82], [96, 96], [-96, 96]], { fill: '#d6452b', lw: 0, smooth: false, id: 126 });
  // lid
  if (!noLid) {
    c.save(); c.translate(0, -lidUp); c.rotate(lidRot);
    lid(0, -254, 1);
    c.restore();
  }
  c.restore();
}
export function lid(x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const L = [[-196, 24], [-206, -20], [-186, -52], [186, -52], [206, -20], [196, 24]];
  shape(L, { fill: P.lid, lw: 10, id: 130 });
  c.save(); c.beginPath(); trace(L, true, true); c.clip(); c.fillStyle = P.lidSh; c.fillRect(80, -70, 160, 120);
  for (let i = -9; i <= 9; i++) ink([[i * 21, -46], [i * 21, 20]], 4, { id: 131 + i, col: 'rgba(13,11,22,.55)' });
  c.restore();
  taper([[-170, -36], [-60, -42], [20, -42]], 10, 4, '#fff', { id: 150 });
  c.restore();
}

// ---------------------------------------------------------------- the kitchen
export function kitchen(o = {}) {
  const { cx = 960, cy = 540, k = 1, dusk = 1, shake = 0 } = o;
  c.save(); c.translate(cx, cy); c.scale(k, k); c.translate(-960, -540);
  // back wall + window
  const g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, mix(P.wall, '#7a3a7a', dusk * .5)); g.addColorStop(1, P.wall); c.fillStyle = g; c.fillRect(-200, -200, 2320, 840);
  hatch(-200, -200, 2320, 640, 34, -.5, 'rgba(13,11,22,.05)', 6);
  shape([[1180, 90], [1640, 90], [1640, 420], [1180, 420]], { fill: mix('#ffd18a', '#ff7a8a', dusk), lw: 12, smooth: false, id: 160 });
  shape([[1180, 90], [1640, 90], [1640, 150], [1180, 150]], { fill: mix('#ff9a6a', '#8a4aa8', dusk), lw: 0, smooth: false, id: 161 });
  c.beginPath(); c.arc(1470, 330, 70, 0, 7); c.fillStyle = '#fff3c4'; c.fill();
  ink([[1410, 90], [1410, 420]], 9); ink([[1180, 255], [1640, 255]], 9);
  // fridge
  shape([[110, 40], [430, 40], [430, 640], [110, 640]], { fill: '#d9e1e6', lw: 12, smooth: false, id: 162 });
  c.fillStyle = '#aab6c0'; c.fillRect(300, 40, 130, 600); ink([[110, 250], [430, 250]], 8); ink([[390, 120], [390, 210]], 12); ink([[390, 300], [390, 420]], 12);
  // hanging pots
  for (let i = 0; i < 4; i++) { const px = 700 + i * 110; ink([[px, 0], [px, 90 + (i % 2) * 36]], 5); shape([[px - 40, 90 + (i % 2) * 36], [px + 40, 90 + (i % 2) * 36], [px + 34, 150 + (i % 2) * 36], [px - 34, 150 + (i % 2) * 36]], { fill: i % 2 ? '#c8cbd6' : '#e07a3a', lw: 7, smooth: false, id: 170 + i }); }
  // counter
  shape([[-200, 640], [2120, 640], [2120, 700], [-200, 700]], { fill: P.counterTop, lw: 10, smooth: false, id: 180 });
  c.fillStyle = P.counter; c.fillRect(-200, 700, 2320, 120); ink([[-200, 700], [2120, 700]], 8);
  for (const dx of [260, 760, 1260, 1760]) ink([[dx, 710], [dx, 820]], 6);
  // floor tiles in perspective
  c.fillStyle = P.tile; c.fillRect(-200, 820, 2320, 600); c.fillStyle = P.tileSh; c.fillRect(-200, 820, 2320, 40);
  ink([[-200, 820], [2120, 820]], 9);
  for (let i = 1; i < 6; i++) { const y = 820 + (i * i) * 18; ink([[-200, y], [2120, y]], 4, { col: 'rgba(13,11,22,.45)' }); }
  for (let i = -8; i <= 8; i++) ink([[960 + i * 70, 820], [960 + i * 280, 1300]], 4, { col: 'rgba(13,11,22,.45)' });
  c.restore();
}

// grandma's hand tapping a lid rim with a wooden spoon; flat, warm, calm
export function grandHand(x, y, s, o = {}) {
  const { tap = 0, flip = 1 } = o;
  c.save(); c.translate(x, y); c.scale(s * flip, s);
  tube([[260, 220], [150, 150], [60, 70]], [150, 120, 92], { fill: '#b9a2e0', lw: 9, id: 200, shade: '#8f76c2', shadeSide: 1 });   // cardigan sleeve
  shape([[40, 20], [-10, -10], [-60, 4], [-80, 40], [-40, 80], [30, 92], [70, 70]], { fill: '#f1cba9', lw: 8, id: 201 });
  for (let i = 0; i < 4; i++) tube([[-6 - i * 12, 10 + i * 22], [-60 - i * 10, 4 + i * 24 + 10], [-100 - i * 6, 14 + i * 26 + 16]], [26, 22, 18], { fill: '#f1cba9', lw: 6, id: 202 + i });
  ink([[20, 40], [0, 48]], 3, { id: 210 }); ink([[10, 60], [-8, 66]], 3, { id: 211 });
  // wooden spoon in the other grip
  c.save(); c.translate(-40, 20 - tap * 30); c.rotate(-.7 - tap * .3);
  tube([[0, 0], [-10, -140], [-12, -260]], [30, 26, 22], { fill: '#c58a4f', lw: 8, id: 212 });
  shape([[-36, -260], [-12, -330], [20, -260], [10, -210], [-26, -212]], { fill: '#c58a4f', lw: 8, id: 213 });
  c.restore(); c.restore();
}

// a wooden spoon from a gripping hand (hx,hy) to its bowl tip (tx,ty); the hand is a fist round the handle
export function spoon(hx, hy, tx, ty, o = {}) {
  const { w = 30, bowl = 1, hand = true, sleeve = '#b9a2e0', skin = '#f1cba9' } = o;
  const dx = tx - hx, dy = ty - hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ang = Math.atan2(dy, dx);
  tube([[hx, hy], [hx + dx * .5, hy + dy * .5], [tx - ux * 20 * bowl, ty - uy * 20 * bowl]], [w, w * .85, w * .8], { fill: '#c58a4f', lw: 8, id: 220 });
  c.save(); c.translate(tx - ux * 30 * bowl, ty - uy * 30 * bowl); c.rotate(ang); c.scale(bowl, bowl);
  shape([[0, -36], [46, -40], [78, 0], [46, 40], [0, 36], [-16, 0]], { fill: '#d9a066', lw: 8, id: 221 });
  c.fillStyle = '#a56a35'; c.beginPath(); c.ellipse(34, 8, 34, 16, 0, 0, 7); c.fill();
  c.restore();
  if (hand) {   // sleeve back from the hand, then a ring of fingers over the handle
    const bx = hx - ux * 40, by = hy - uy * 40;
    tube([[bx - ux * 40, by - uy * 40], [bx - ux * 220, by - uy * 220], [bx - ux * 420, by - uy * 420]], [112, 130, 150], { fill: sleeve, lw: 9, id: 222 });
    c.save(); c.translate(hx, hy); c.rotate(ang);
    shape([[-46, -34], [30, -38], [58, -10], [52, 30], [-30, 40], [-60, 10]], { fill: skin, lw: 8, id: 223 });
    for (const dx2 of [-26, 0, 26]) ink([[dx2, -36], [dx2 + 4, 34]], 4, { id: 224 + dx2 });
    c.restore();
  }
}
