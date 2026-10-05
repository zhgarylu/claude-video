// Parts of the invented "Drip 1" stand, drawn in code. Stand coordinates: x right, y down, (0,0) = centre of the base's lower rim on the table.
// Every outline goes through lw(): line weights stay constant on the page when a zoom circle magnifies the drawing.
import { clamp } from '/core/lib.js';
export const TAU = Math.PI * 2;
export const C = {
  paper: '#f6f3ec', paperD: '#dcd7ca', ink: '#1d1f24', gray: '#7c7f86', grayL: '#c9c6bc', blue: '#1f6bff', red: '#e5372b', white: '#ffffff',
  wood: '#e2b27c', woodS: '#c48f55', woodT: '#efc896', steel: '#bcc4cd', steelS: '#8f99a5', steelT: '#d6dce2',
  dark: '#515862', darkS: '#363c44', darkT: '#69717c', cream: '#fbf8f1', creamS: '#e3ddcf', glass: 'rgba(170,214,236,.38)', coffee: '#6a3f26',
};
export const FONT = '"Hanken Grotesk", system-ui, sans-serif', NUM = '"Nunito", "Hanken Grotesk", system-ui, sans-serif';
let ZZ = 1; export const setZ = z => { ZZ = z; };
export const lw = (k = 1) => 6 * k / ZZ;
const stroke = (g, k = 1, col = C.ink) => { g.lineWidth = lw(k); g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
const fillStroke = (g, fill, k = 1) => { if (fill) { g.fillStyle = fill; g.fill(); } stroke(g, k); };

export function cyl(g, cx, yt, yb, rx, ry, body, shade, top) {
  const p = () => { g.beginPath(); g.moveTo(cx - rx, yt); g.lineTo(cx - rx, yb); g.ellipse(cx, yb, rx, ry, 0, Math.PI, 0, true); g.lineTo(cx + rx, yt); g.closePath(); };
  p(); g.fillStyle = body; g.fill();
  g.save(); p(); g.clip(); g.fillStyle = shade; g.fillRect(cx + rx * .32, yt - ry, rx, yb - yt + ry * 3); g.restore();
  p(); stroke(g);
  g.beginPath(); g.ellipse(cx, yt, rx, ry, 0, 0, TAU); fillStroke(g, top);
}
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// ---- parts (assembled position) ----
export function drawBase(g) {
  cyl(g, 0, -26, 0, 230, 44, C.wood, C.woodS, C.woodT);
  g.save(); g.globalAlpha = .55; g.strokeStyle = '#fff'; g.lineWidth = lw(.5); g.lineCap = 'round';
  for (const [rx, ry, a, b] of [[170, 31, 3.6, 5.5], [120, 22, 3.9, 5.2], [80, 14, .3, 1.7]]) { g.beginPath(); g.ellipse(0, -26, rx, ry, 0, a, b); g.stroke(); }
  g.restore();
  g.beginPath(); g.ellipse(0, -26, 22, 7.5, 0, 0, TAU); fillStroke(g, '#7a5430', .8);
}
export function drawPole(g) {
  cyl(g, 0, -44, -26, 34, 10, C.dark, C.darkS, C.darkT);          // flange
  cyl(g, 0, -426, -44, 15, 5, C.steel, C.steelS, C.steelT);       // pole
}
export function drawScrew(g, x, y, sink = 1, rot = 0, k = 1) {   // (x,y) = centre of the head's top face
  if (k !== 1) { const z = ZZ; g.save(); g.translate(x, y); g.scale(k, k); setZ(z * k); drawScrew(g, 0, 0, sink, rot, 1); setZ(z); g.restore(); return; }
  const sh = 28 * (1 - sink);
  if (sh > .5) { rrect(g, x - 3.5, y, 7, sh + 4, 3); fillStroke(g, C.steelS, .7); }
  cyl(g, x, y - 6, y, 8.5, 3.4, C.steel, C.steelS, C.steelT);
  g.beginPath(); g.ellipse(x, y - 6, 4.6, 1.9, 0, 0, TAU); g.fillStyle = C.darkS; g.fill();
  g.strokeStyle = C.steelT; g.lineWidth = lw(.35); g.beginPath();
  for (const d of [0, 2.1, 4.2]) { g.moveTo(x, y - 6); g.lineTo(x + 4.2 * Math.cos(rot + d), y - 6 + 1.7 * Math.sin(rot + d)); } g.stroke();
}
export function drawKnob(g, cx, cy, rot = 0) {
  for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; g.beginPath(); g.arc(cx + 14 * Math.cos(a), cy + 14 * Math.sin(a), 8.5, 0, TAU); fillStroke(g, C.dark, .8); }
  g.beginPath(); g.arc(cx, cy, 12, 0, TAU); g.fillStyle = C.dark; g.fill();
  g.beginPath(); g.arc(cx - 3, cy - 3, 3.2, 0, TAU); g.fillStyle = C.darkT; g.fill();
}
export function drawArm(g, knobRot = 0) {
  const yc = -300;
  rrect(g, 18, yc - 13, 106, 26, 9); g.fillStyle = C.wood; g.fill();
  g.save(); rrect(g, 18, yc - 13, 106, 26, 9); g.clip(); g.fillStyle = C.woodS; g.fillRect(0, yc + 4, 140, 20); g.restore();
  rrect(g, 18, yc - 13, 106, 26, 9); stroke(g);
  g.beginPath(); g.arc(106, yc, 3.4, 0, TAU); fillStroke(g, C.steel, .5); g.beginPath(); g.arc(106, yc, 1.2, 0, TAU); g.fillStyle = C.ink; g.fill();
  // collar: sides, then a ring-shaped top face so the pole shows through its hole
  const p = () => { g.beginPath(); g.moveTo(-28, yc - 30); g.lineTo(-28, yc + 30); g.ellipse(0, yc + 30, 28, 8, 0, Math.PI, 0, true); g.lineTo(28, yc - 30); g.closePath(); };
  p(); g.fillStyle = C.steel; g.fill(); g.save(); p(); g.clip(); g.fillStyle = C.steelS; g.fillRect(9, yc - 40, 40, 90); g.restore(); p(); stroke(g);
  g.beginPath(); g.ellipse(0, yc - 30, 28, 8, 0, 0, TAU); g.ellipse(0, yc - 30, 16.5, 4.6, 0, 0, TAU); g.fillStyle = C.steelT; g.fill('evenodd'); stroke(g);
  g.beginPath(); g.ellipse(0, yc - 30, 16.5, 4.6, 0, 0, TAU); stroke(g, .6);
  drawKnob(g, 0, yc + 4, knobRot);
}
const RCX = 190, RCY = -300;
function ringBody(g, hole) {
  cyl(g, RCX, RCY, RCY + 12, 70, 20, C.dark, C.darkS, C.darkT);
  g.beginPath(); g.ellipse(RCX, RCY, 50, 13, 0, 0, TAU); fillStroke(g, hole ? '#272b31' : null, .9);
}
export function drawRing(g, opt = {}) {                          // back + body; the notch tab hangs under the front lip (flip it for the "wrong" inset)
  ringBody(g, true);
  const f = opt.flip ? -1 : 1;
  if (!opt.flip) { rrect(g, RCX - 13, RCY + 20 + 8, 26, 12, 4); fillStroke(g, C.darkT, .8); }
  else { rrect(g, RCX - 13, RCY - 20 - 8, 26, 12, 4); fillStroke(g, C.darkT, .8); }
}
export function drawRingFront(g) {                               // the front lip again, over the cone: ring minus hole, below the centre line
  g.save(); g.beginPath(); g.rect(RCX - 90, RCY, 180, 60); g.ellipse(RCX, RCY, 50, 13, 0, Math.PI, 0, true); g.closePath(); g.clip();
  cyl(g, RCX, RCY, RCY + 12, 70, 20, C.dark, C.darkS, C.darkT);
  rrect(g, RCX - 13, RCY + 28, 26, 12, 4); fillStroke(g, C.darkT, .8);
  g.restore();
  g.beginPath(); g.ellipse(RCX, RCY, 50, 13, 0, 0, Math.PI); stroke(g, .9);
}
export function drawCone(g) {
  const cx = RCX, yr = -322, yt = -232;
  const p = () => { g.beginPath(); g.moveTo(cx - 92, yr); g.lineTo(cx - 16, yt); g.ellipse(cx, yt, 16, 5, 0, Math.PI, 0, true); g.lineTo(cx + 92, yr); g.closePath(); };
  p(); g.fillStyle = C.cream; g.fill(); g.save(); p(); g.clip(); g.fillStyle = C.creamS; g.fillRect(cx + 26, yr - 30, 80, 120); g.restore(); p(); stroke(g);
  g.save(); g.globalAlpha = .55; g.strokeStyle = C.grayL; g.lineWidth = lw(.6); g.beginPath();
  for (const k of [-.55, -.1, .35]) { g.moveTo(cx + 92 * k, yr + 22); g.lineTo(cx + 15 * k, yt - 4); } g.stroke(); g.restore();
  g.beginPath(); g.ellipse(cx, yr, 92, 24, 0, 0, TAU); fillStroke(g, C.cream);
  g.beginPath(); g.ellipse(cx, yr + 1, 78, 18, 0, 0, TAU); g.fillStyle = '#efe9db'; g.fill(); g.lineWidth = lw(.5); g.strokeStyle = C.grayL; g.stroke();
}
const CAR = [[128, -18], [128, -128], [134, -160], [156, -183], [160, -194], [154, -200]];
function carPath(g) {
  g.beginPath(); g.moveTo(CAR[0][0], CAR[0][1]);
  g.lineTo(128, -128); g.quadraticCurveTo(128, -170, 156, -184); g.lineTo(160, -196); g.lineTo(150, -202);
  g.lineTo(230, -202); g.lineTo(220, -196); g.lineTo(224, -184); g.quadraticCurveTo(252, -170, 252, -128); g.lineTo(252, -18);
  g.ellipse(190, -18, 62, 14, 0, 0, Math.PI); g.closePath();
}
export function drawCarafe(g, level = 0) {                       // level: coffee height in px above the bottom
  g.beginPath(); g.ellipse(190, -202, 40, 8, 0, 0, TAU); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill(); stroke(g, .7);
  carPath(g); g.fillStyle = C.glass; g.fill();
  if (level > .5) {
    g.save(); carPath(g); g.clip(); g.fillStyle = C.coffee; g.fillRect(100, -18 - level, 180, level + 40);
    g.beginPath(); g.ellipse(190, -18 - level, 62, 10, 0, 0, TAU); g.fillStyle = '#865234'; g.fill(); g.restore();
  }
  g.save(); carPath(g); g.clip(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = lw(1.1); g.lineCap = 'round'; g.beginPath(); g.moveTo(141, -118); g.lineTo(141, -42); g.stroke(); g.restore();
  carPath(g); stroke(g);
  g.lineWidth = lw(.7); g.strokeStyle = C.ink; g.beginPath(); for (const y of [-50, -80, -110]) { g.moveTo(252, y); g.lineTo(236, y); } g.stroke();
}
export function drawKey(g, x, y, a) {                            // hex key standing in a screw socket at (x,y); the long arm swings round it
  const L = 62, ex = x + L * Math.cos(a), ey = y - 70 + L * .32 * Math.sin(a);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x, y - 70); g.lineTo(ex, ey);
  g.strokeStyle = C.ink; g.lineWidth = lw(2.1); g.stroke(); g.strokeStyle = '#7d8793'; g.lineWidth = lw(1.0); g.stroke();
}
export function drawKeyIcon(g) {
  g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-28, 26); g.lineTo(-28, -22); g.lineTo(30, -22);
  g.strokeStyle = C.ink; g.lineWidth = lw(2.1); g.stroke(); g.strokeStyle = '#7d8793'; g.lineWidth = lw(1.0); g.stroke();
}
export function drawShadow(g, cx = 0, cy = 22, rx = 258, ry = 42) { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fillStyle = 'rgba(40,36,28,.10)'; g.fill(); }

// bbox centres + icon scales for the inventory page and the quantity boxes
export const PART = {
  A: { c: [0, -13], s: .62, fn: g => drawBase(g), name: 'base' },
  B: { c: [0, -235], s: .5, fn: g => drawPole(g), name: 'pole' },
  C: { c: [70, -300], s: 1.05, fn: g => drawArm(g), name: 'arm' },
  D: { c: [190, -295], s: 1.45, fn: g => { drawRing(g); drawRingFront(g); }, name: 'ring' },
  E: { c: [190, -277], s: 1.1, fn: g => drawCone(g), name: 'cone' },
  F: { c: [190, -110], s: .98, fn: g => drawCarafe(g), name: 'carafe' },
  G: { c: [0, 0], s: 3.2, fn: (g, n = 4) => { for (let k = 0; k < n; k++) drawScrew(g, (k - (n - 1) / 2) * 20, -4, 0, 0.3); }, name: 'screws' },
  H: { c: [0, 0], s: 2.0, fn: g => drawKeyIcon(g), name: 'key' },
};
export function drawIcon(g, L, cx, cy, k = 1, n) {
  const P = PART[L]; g.save(); g.translate(cx, cy); g.scale(P.s * k, P.s * k); const z = ZZ; setZ(P.s * k); g.translate(-P.c[0], -P.c[1]); P.fn(g, n); setZ(z); g.restore();
}

// person pictogram (solid ink, round ends), facing the viewer; hands press down on the thing in front of them
export function drawPerson(g, cx, cy, k, press = 0) {
  g.save(); g.translate(cx, cy); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.ink; g.fillStyle = C.ink;
  g.beginPath(); g.arc(0, -86, 24, 0, TAU); g.fill();
  g.lineWidth = 46; g.beginPath(); g.moveTo(0, -52); g.lineTo(0, -2); g.stroke();
  g.lineWidth = 28; g.beginPath(); g.moveTo(-12, 8); g.lineTo(-16, 86); g.moveTo(12, 8); g.lineTo(16, 86); g.stroke();
  g.lineWidth = 18; g.beginPath(); g.moveTo(-26, -46); g.lineTo(-52, 6 + press * 6); g.moveTo(26, -46); g.lineTo(68, -20 + press * 10); g.lineTo(104, 4 + press * 12); g.stroke();
  g.restore();
}
export function arrowHead(g, x, y, ang, s = 1, col = C.blue) {
  g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(34 * s, 0); g.lineTo(-18 * s, -30 * s); g.lineTo(-6 * s, 0); g.lineTo(-18 * s, 30 * s); g.closePath();
  g.fillStyle = col; g.fill(); g.lineWidth = lw(.8); g.strokeStyle = C.ink; g.lineJoin = 'round'; g.stroke(); g.restore();
}
export function dotted(g, x0, y0, x1, y1, p = 1, col = C.blue, w = 5) {
  if (p <= 0) return; g.save(); g.strokeStyle = col; g.lineWidth = w / ZZ; g.lineCap = 'round'; g.setLineDash([.1, 16 / ZZ]);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * p, y0 + (y1 - y0) * p); g.stroke(); g.restore();
}
export function pulse(g, x, y, p, col = C.blue) {                 // the snap: a thin ring that opens and fades; p = 0..1
  if (p <= 0 || p >= 1) return; g.save(); g.globalAlpha = (1 - p) * .9; g.strokeStyle = col; g.lineWidth = 4 / ZZ;
  g.beginPath(); g.arc(x, y, (14 + 50 * (1 - Math.pow(1 - p, 3))) , 0, TAU); g.stroke(); g.restore();
}
export const ease = {
  in: t => Math.pow(clamp(t), 2.2),                               // accelerates into the snap, stops dead: no overshoot
  io: t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  out: t => 1 - Math.pow(1 - clamp(t), 3),
};
