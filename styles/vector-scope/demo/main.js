// "Hold the Fifth": a vector oscilloscope in X-Y mode. The picture is drawn from the film's own stereo samples (out/scope.bin):
// left = X, right = Y, third channel = beam intensity. Everything else (panel, graticule, captions) is drawn in code.
// t = film seconds. Deterministic: persistence is computed from the sample history at t, not from the previous frame.
import { clamp, lerp, seg, ss, eio, eo, hash } from '/core/lib.js';
import { loadFont, vtext, textPath, textWidth, glowPasses } from './engine/vtext.js';
import { trace, figure, SR } from './engine/beam.js';

const W = 1920, H = 1080, cv = document.getElementById('c'), ctx = cv.getContext('2d');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const bc = mk(W, H), bx = bc.getContext('2d'), g1 = mk(960, 540), g1x = g1.getContext('2d'), g2 = mk(480, 270), g2x = g2.getContext('2d');
const Q = new URLSearchParams(location.search), NOSUB = Q.get('nosub') === '1';
let S = null, SJ = null, TLJ = null, CAPS = [], T = null;
const C = { x: 960, y: 470 }, A = 400, GL = { x0: 445, y0: 55, x1: 1475, y1: 885 };   // tube centre, px per unit amplitude, glass rect (world)
const PHOS = 'rgba(120,255,175,', DIM = 'rgba(70,130,100,';
window.DUR = 56; window.READY = false;

// ------------------------------------------------------------------ data-derived state
const fk = t => clamp(Math.round(t * SJ.fps), 0, SJ.fl.length - 1);
const FLt = t => SJ.fl[fk(t)], FRt = t => SJ.fr[fk(t)];
const FRACS = [[1, 1], [2, 1], [3, 2], [4, 3], [5, 4]];
function fracAt(t) {
  const a = FLt(t), b = FRt(t); if (!(a > 0 && b > 0)) return null; const r = b / a;
  for (const [p, q] of FRACS) if (Math.abs(r - p / q) < .0004) return [p, q];
  return null;
}
let LOCKA = null;   // smoothed "locked" amount on the 50 Hz table
function buildLock() {
  LOCKA = new Float32Array(SJ.fl.length); let v = 0;
  for (let k = 0; k < LOCKA.length; k++) { const f = fracAt(k / SJ.fps); const tgt = f && !(f[0] === 1 && f[1] === 1) ? 1 : 0; v += (tgt - v) * (tgt > v ? .35 : .5); LOCKA[k] = v; }
}
const lockAmt = t => LOCKA[fk(t)];

// ------------------------------------------------------------------ camera
const KEYS = [
  [0, 2.4, 960, 470], [1.0, 2.4, 960, 470], [4.6, 1.0, 960, 540], [10.6, 1.07, 960, 530], [18.5, 1.12, 960, 525],
  [21.0, 1.1, 960, 530], [24.0, 1.1, 960, 525], [29.3, 1.05, 960, 535], [31.5, 1.0, 960, 540], [37.3, 1.0, 960, 540],
  [42.0, 1.28, 960, 535], [42.6, 1.28, 960, 535], [46.4, .62, 960, 520], [48.4, .62, 960, 520], [50.2, 1.0, 960, 520],
  [54.2, 1.12, 960, 500], [54.9, 1.12, 960, 490], [56.0, 2.6, 960, 470]];
function cam(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], u = eio(seg(t, a[0], b[0]));
  // scales interpolate in log space so a push and a pull feel equally fast
  let s = Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), u)), cx = lerp(a[2], b[2], u), cy = lerp(a[3], b[3], u);
  for (const k of ['return', 'octave', 'fourth', 'third']) { const d = t - T[k]; if (d >= 0 && d < 1) s *= 1 + .03 * Math.exp(-d / .16) * Math.cos(Math.min(d * 9, 3.1)); }
  const dl = t - T.lock; if (dl >= 0 && dl < 1.2) s *= 1 + .03 * Math.exp(-dl / .25);
  return { s, cx, cy };
}
const toScreen = (c, wx, wy) => [960 + (wx - c.cx) * c.s, 540 + (wy - c.cy) * c.s];

// ------------------------------------------------------------------ small drawing helpers (world coordinates)
const ETCH = [{ lw: 1.3, col: 'rgba(86,140,112,.78)' }];
const etch = (c, str, x, y, h, al = 'l', col) => vtext(c, str, x, y, h, { align: al, passes: col ? [{ lw: 1.3, col }] : ETCH });
function screw(c, x, y, r = 9) {
  c.fillStyle = '#0a0e0c'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(70,95,82,.8)'; c.lineWidth = 1.5; c.stroke();
  c.beginPath(); c.moveTo(x - r * .6, y - r * .3); c.lineTo(x + r * .6, y + r * .3); c.stroke();
}
function knob(c, x, y, r, ang, label, lh = 16) {
  const g = c.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#2a342f'); g.addColorStop(1, '#0c110e');
  c.strokeStyle = 'rgba(70,115,92,.55)'; c.lineWidth = 1.4;
  for (let k = 0; k <= 10; k++) { const a = (-135 + 27 * k) * Math.PI / 180, r0 = r + 7, r1 = r + (k % 5 === 0 ? 17 : 12); c.beginPath(); c.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0); c.lineTo(x + Math.sin(a) * r1, y - Math.cos(a) * r1); c.stroke(); }
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(95,150,122,.7)'; c.lineWidth = 1.6; c.stroke();
  const a = ang * Math.PI / 180; c.strokeStyle = 'rgba(150,255,195,.95)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + Math.sin(a) * r * .25, y - Math.cos(a) * r * .25); c.lineTo(x + Math.sin(a) * r * .88, y - Math.cos(a) * r * .88); c.stroke();
  if (label) etch(c, label, x, y + r + 26, lh, 'c');
}
function lamp(c, x, y, on, label) {
  c.fillStyle = '#060908'; c.beginPath(); c.arc(x, y, 16, 0, 7); c.fill(); c.strokeStyle = 'rgba(86,140,112,.7)'; c.lineWidth = 1.5; c.stroke();
  if (on > .01) { const g = c.createRadialGradient(x, y, 0, x, y, 46); g.addColorStop(0, `rgba(235,255,242,${.95 * on})`); g.addColorStop(.3, `rgba(100,255,165,${.7 * on})`); g.addColorStop(1, 'rgba(20,200,90,0)'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(x, y, 46, 0, 7); c.fill(); c.restore(); }
  else { c.fillStyle = 'rgba(30,70,48,.8)'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); }
  etch(c, label, x, y + 30, 15, 'c');
}
function bnc(c, x, y) {
  c.fillStyle = '#080b09'; c.beginPath(); c.arc(x, y, 22, 0, 7); c.fill(); c.strokeStyle = 'rgba(95,150,122,.65)'; c.lineWidth = 2; c.stroke();
  c.beginPath(); c.arc(x, y, 12, 0, 7); c.stroke(); c.fillStyle = '#17201b'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill();
}
function led(c, x, y, w, h, on, hot) {
  c.fillStyle = on ? (hot ? 'rgba(230,255,240,.95)' : 'rgba(95,250,160,.9)') : 'rgba(24,52,38,.85)'; c.fillRect(x, y, w, h);
  if (on) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = hot ? 'rgba(120,255,180,.25)' : 'rgba(40,220,110,.22)'; c.fillRect(x - 5, y - 4, w + 10, h + 8); c.restore(); }
}

// ------------------------------------------------------------------ the panel
function meterLevel(i1, ch) {   // RMS dB-ish over the last 40 ms
  const n = 1920; let s = 0, pk = 0; const i0 = Math.max(0, i1 - n);
  for (let i = i0; i <= i1; i += 4) { const v = S[3 * i + ch] / 32767; s += v * v; }
  const rms = Math.sqrt(s / Math.ceil((i1 - i0 + 1) / 4)); const db = 20 * Math.log10(rms + 1e-5);
  for (let i = Math.max(0, i1 - 12000); i <= i1; i += 24) pk = Math.max(pk, Math.abs(S[3 * i + ch] / 32767));
  return { lv: clamp((db + 24) / 24), pk: clamp((20 * Math.log10(pk + 1e-5) + 24) / 24) };
}
function drawPlate(c, t, i1) {
  // bench and plate
  c.fillStyle = '#050706'; c.fillRect(-1500, -1000, 5400, 3400);
  const pg = c.createLinearGradient(0, -300, 0, 1400); pg.addColorStop(0, '#1a231e'); pg.addColorStop(.5, '#161e19'); pg.addColorStop(1, '#121914');
  c.fillStyle = pg; c.fillRect(-520, -300, 2960, 1700);
  c.strokeStyle = 'rgba(95,140,115,.4)'; c.lineWidth = 3; c.strokeRect(-520, -300, 2960, 1700);
  // fine brushed lines (deterministic)
  c.strokeStyle = 'rgba(120,170,145,.035)'; c.lineWidth = 1;
  for (let y = -290; y < 1400; y += 7) { c.beginPath(); c.moveTo(-520, y + hash(y) * 3); c.lineTo(2440, y + hash(y + 9) * 3); c.stroke(); }
  // module seams
  c.strokeStyle = 'rgba(8,12,10,.9)'; c.lineWidth = 4;
  for (const x of [0, 390, 1530, 1920]) { c.beginPath(); c.moveTo(x, -300); c.lineTo(x, 1400); c.stroke(); c.strokeStyle = 'rgba(100,150,125,.18)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 3, -300); c.lineTo(x + 3, 1400); c.stroke(); c.strokeStyle = 'rgba(8,12,10,.9)'; c.lineWidth = 4; }
  for (const x of [-500, 20, 410, 1510, 1900, 2420]) for (const y of [-280, 1380]) screw(c, x, y);
  for (const x of [30, 380, 1540, 1890]) for (const y of [5, 905]) screw(c, x, y, 7);
  etch(c, 'VS-81  X-Y VECTOR DISPLAY', 960, -190, 44, 'c', 'rgba(110,170,138,.8)');
  etch(c, 'PHOSPHOR P31   EXTERNAL X  EXTERNAL Y  EXTERNAL Z', 960, -120, 20, 'c');
  // ---- left module: input meters
  const fl = FLt(t), fr = FRt(t), mL = meterLevel(i1, 0), mR = meterLevel(i1, 1);
  etch(c, 'INPUT', 195, 56, 22, 'c', 'rgba(110,170,138,.85)');
  const SEG = 16, MY = 92, MS = 26;
  for (const [ch, x, m, lab] of [[0, 90, mL, 'L / X'], [1, 250, mR, 'R / Y']]) {
    c.fillStyle = '#070a08'; c.fillRect(x - 12, MY - 8, 84, SEG * MS + 16); c.strokeStyle = 'rgba(86,140,112,.5)'; c.lineWidth = 1.5; c.strokeRect(x - 12, MY - 8, 84, SEG * MS + 16);
    for (let k = 0; k < SEG; k++) { const lv = (k + .5) / SEG; led(c, x, MY + (SEG - 1 - k) * MS, 60, MS - 6, lv <= m.lv, k >= SEG - 2); }
    const pk = Math.min(SEG - 1, Math.floor(m.pk * SEG)); if (m.pk > .05) led(c, x, MY + (SEG - 1 - pk) * MS, 60, MS - 6, true, true);
    etch(c, lab, x + 30, MY + SEG * MS + 16, 20, 'c');
  }
  for (const [db, k] of [['0', 15], ['-6', 11.5], ['-12', 7.5], ['-18', 3.5]]) etch(c, db, 171, MY + (SEG - 1 - k) * MS + 2, 12, 'c');
  // frequency ruler (log, 100..700 Hz)
  const RY = 590;
  etch(c, 'FREQUENCY', 195, RY, 16, 'c');
  const fx = f => 60 + 270 * Math.log(f / 100) / Math.log(7);
  c.strokeStyle = 'rgba(86,140,112,.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(60, RY + 52); c.lineTo(330, RY + 52); c.stroke();
  for (const f of [100, 150, 200, 300, 400, 500, 700]) { c.beginPath(); c.moveTo(fx(f), RY + 52); c.lineTo(fx(f), RY + 62); c.stroke(); etch(c, String(f), fx(f), RY + 68, 11, 'c'); }
  const mark = (f, up, col) => { if (!(f > 0)) return; const x = fx(clamp(f, 100, 700)); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = col; c.beginPath(); c.moveTo(x, RY + 50); c.lineTo(x - 7, RY + 50 + (up ? -16 : 16)); c.lineTo(x + 7, RY + 50 + (up ? -16 : 16)); c.closePath(); c.fill(); c.restore(); };
  mark(fl, true, 'rgba(150,255,195,.95)'); mark(fr, false, 'rgba(235,255,242,.95)');
  const hz = f => f > 0 ? f.toFixed(1).padStart(6, ' ') : '  ----';
  etch(c, 'L  HZ', 60, 708, 16); vtext(c, hz(fl), 60, 734, 38, { passes: glowPasses(38, .9), op: 'lighter' });
  etch(c, 'R  HZ', 60, 796, 16); vtext(c, hz(fr), 60, 822, 38, { passes: glowPasses(38, .9), op: 'lighter' });
  // ---- right module: ratio, lamps, memory rack, knobs
  const fa = fracAt(t), la = lockAmt(t);
  etch(c, 'RATIO  R / L', 1725, 56, 22, 'c', 'rgba(110,170,138,.85)');
  const ratio = fl > 0 && fr > 0 && t < T.word0 ? (fr / fl).toFixed(4) : '------';
  vtext(c, ratio, 1725, 96, 54, { align: 'c', passes: glowPasses(54, .9), op: 'lighter' });
  lamp(c, 1600, 214, fl > 0 && fr > 0 ? 1 : 0, 'X-Y');
  lamp(c, 1725, 214, (t > T.glide0 && t < T.lock) ? .9 : 0, 'TUNE');
  lamp(c, 1850, 214, la, 'LOCK');
  etch(c, 'MEMORY', 1725, 290, 20, 'c', 'rgba(110,170,138,.85)');
  THUMBS.forEach((th, k) => {
    const x = 1585 + (k % 2) * 150, y = 322 + Math.floor(k / 2) * 200;
    c.fillStyle = '#050807'; c.fillRect(x, y, 140, 140); c.strokeStyle = 'rgba(86,140,112,.55)'; c.lineWidth = 1.4; c.strokeRect(x, y, 140, 140);
    c.strokeStyle = 'rgba(40,90,62,.5)'; c.beginPath(); c.moveTo(x + 70, y + 4); c.lineTo(x + 70, y + 136); c.moveTo(x + 4, y + 70); c.lineTo(x + 136, y + 70); c.stroke();
    const u = ss(seg(t, th.t, th.t + .25));
    if (u > 0) {
      figure(c, S, th.i0, th.n, x + 70, y + 70, 56, 56, u, 1.2);
      const r = vtext(c, th.lab, x + 70, y + 152, 26, { align: 'c', passes: glowPasses(26, u), op: 'lighter' }); th.box = [r.x0, r.y0, r.x1, r.y1];
    }
  });
  knob(c, 1650, 840, 34, -90 + 160 * (Math.log(Math.max(100, fl || 100) / 100) / Math.log(7)), 'FREQ L');
  knob(c, 1800, 840, 34, -90 + 160 * (Math.log(Math.max(100, fr || 100) / 100) / Math.log(7)), 'FREQ R');
  // ---- extensions (seen when the camera pulls back)
  etch(c, 'TIME BASE', -260, 56, 22, 'c', 'rgba(110,170,138,.85)');
  [[-400, 150], [-260, 150], [-120, 150], [-400, 320], [-260, 320], [-120, 320]].forEach(([x, y], k) => knob(c, x, y, 38, -100 + k * 37, ['S/DIV', 'POS X', 'POS Y', 'TRIG', 'LEVEL', 'HOLD'][k]));
  etch(c, 'INPUTS', -260, 470, 22, 'c', 'rgba(110,170,138,.85)');
  [-400, -260, -120].forEach((x, k) => { bnc(c, x, 550); etch(c, ['X', 'Y', 'Z'][k], x, 590, 18, 'c'); });
  etch(c, 'POWER', -260, 700, 22, 'c', 'rgba(110,170,138,.85)');
  lamp(c, -330, 760, t > T.relay && t < T.powerOff ? 1 : 0, 'ON');
  c.fillStyle = '#080b09'; c.fillRect(-230, 735, 90, 50); c.strokeStyle = 'rgba(95,150,122,.7)'; c.strokeRect(-230, 735, 90, 50); c.fillStyle = '#2a332e'; c.fillRect(-224, t > T.relay && t < T.powerOff ? 741 : 760, 78, 20);
  etch(c, 'BEAM', 2180, 56, 22, 'c', 'rgba(110,170,138,.85)');
  [[2040, 150], [2180, 150], [2320, 150], [2040, 320], [2180, 320], [2320, 320]].forEach(([x, y], k) => knob(c, x, y, 38, -95 + k * 31, ['INTENS', 'FOCUS', 'ASTIG', 'X GAIN', 'Y GAIN', 'Z GAIN'][k]));
  etch(c, 'OUTPUTS', 2180, 470, 22, 'c', 'rgba(110,170,138,.85)');
  [2060, 2180, 2300].forEach((x, k) => { bnc(c, x, 550); etch(c, ['CAL', 'MON', 'SYNC'][k], x, 590, 18, 'c'); });
  for (let k = 0; k < 14; k++) { c.fillStyle = '#050706'; c.fillRect(-380 + k * 190, 1020, 120, 12); c.fillRect(-380 + k * 190, 1060, 120, 12); c.fillRect(-380 + k * 190, 1100, 120, 12); }
  etch(c, 'MAINS 50 HZ   FUSE 1 A', 960, 1330, 20, 'c');
}

// ------------------------------------------------------------------ the tube
function glassPath(c) { const r = 38; c.beginPath(); c.roundRect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0, r); }
function drawTube(c, t, lit) {
  // bezel
  const bg = c.createLinearGradient(0, 15, 0, 925); bg.addColorStop(0, '#0f1512'); bg.addColorStop(1, '#070a08');
  c.fillStyle = bg; c.beginPath(); c.roundRect(395, 15, 1130, 900, 58); c.fill();
  c.strokeStyle = 'rgba(100,150,125,.5)'; c.lineWidth = 3; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 10; c.beginPath(); c.roundRect(430, 40, 1060, 850, 44); c.stroke();
  // glass
  glassPath(c); const gg = c.createRadialGradient(C.x, C.y, 60, C.x, C.y, 640); gg.addColorStop(0, '#020b06'); gg.addColorStop(1, '#010302');
  c.fillStyle = gg; c.fill();
  // graticule (edge lit)
  c.save(); glassPath(c); c.clip();
  const gl = lit;
  c.strokeStyle = `rgba(48,140,92,${.62 * gl})`; c.lineWidth = 1.8;
  c.beginPath(); for (let i = -5; i <= 5; i++) { c.moveTo(C.x + i * 100, C.y - 400); c.lineTo(C.x + i * 100, C.y + 400); } for (let j = -4; j <= 4; j++) { c.moveTo(C.x - 500, C.y + j * 100); c.lineTo(C.x + 500, C.y + j * 100); } c.stroke();
  c.strokeStyle = `rgba(70,190,125,${.9 * gl})`; c.lineWidth = 2.4; c.beginPath(); c.moveTo(C.x - 500, C.y); c.lineTo(C.x + 500, C.y); c.moveTo(C.x, C.y - 400); c.lineTo(C.x, C.y + 400); c.stroke();
  // 0.2-division ticks on the centre axes, longer at 0.5
  c.strokeStyle = `rgba(80,210,140,${.9 * gl})`; c.lineWidth = 1.8; c.beginPath();
  for (let k = -25; k <= 25; k++) { const l = k % 5 === 0 ? 0 : (k % 5 === 0 ? 0 : 9); if (k % 5 === 0) continue; c.moveTo(C.x + k * 20, C.y - 9); c.lineTo(C.x + k * 20, C.y + 9); }
  for (let k = -20; k <= 20; k++) { if (k % 5 === 0) continue; c.moveTo(C.x - 9, C.y + k * 20); c.lineTo(C.x + 9, C.y + k * 20); }
  c.stroke();
  c.strokeStyle = `rgba(70,190,125,${.55 * gl})`; c.lineWidth = 1.6; c.beginPath();    // frame ticks
  for (let k = -25; k <= 25; k++) { if (k % 5 === 0) continue; c.moveTo(C.x + k * 20, C.y - 400); c.lineTo(C.x + k * 20, C.y - 388); c.moveTo(C.x + k * 20, C.y + 400); c.lineTo(C.x + k * 20, C.y + 388); }
  for (let k = -20; k <= 20; k++) { if (k % 5 === 0) continue; c.moveTo(C.x - 500, C.y + k * 20); c.lineTo(C.x - 488, C.y + k * 20); c.moveTo(C.x + 500, C.y + k * 20); c.lineTo(C.x + 488, C.y + k * 20); }
  c.stroke();
  c.restore();
}
function glassShine(c) {   // a faint reflection, drawn over the beam
  c.save(); glassPath(c); c.clip(); const g = c.createLinearGradient(GL.x0, GL.y0, GL.x0 + 500, GL.y0 + 500);
  g.addColorStop(0, 'rgba(200,255,225,.05)'); g.addColorStop(.35, 'rgba(200,255,225,.012)'); g.addColorStop(1, 'rgba(200,255,225,0)');
  c.fillStyle = g; c.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0); c.restore();
}

// ------------------------------------------------------------------ the trace and what rides on it
function beamCurrent(t) {
  let I = t < 10 ? .85 : 1.0;
  I *= 1 + .95 * lockAmt(t);
  I *= 1 + .5 * ss(seg(t, 38.2, 40)) * (1 - ss(seg(t, 42.2, 42.6)));
  if (t >= T.word0) I = 1.25;
  if (t >= T.octave && t < T.fourth) I *= .85;
  return I * (t < T.dot ? 0 : 1);
}
function gainAt(t) { return 1 + .5 * eio(seg(t, 48.9, 50.3)) - .06 * ss(seg(t, 38.2, 40)); }
function touchPts(i1) {   // local maxima of Y (top edge) and of X (right edge) over one period: found in the samples
  const n = 440, i0 = i1 - n, top = [], right = [];
  let mY = 0, mX = 0; for (let i = i0; i <= i1; i++) { mY = Math.max(mY, S[3 * i + 1]); mX = Math.max(mX, S[3 * i]); }
  for (let i = i0 + 1; i < i1; i++) {
    const y = S[3 * i + 1], x = S[3 * i];
    if (y > S[3 * (i - 1) + 1] && y >= S[3 * (i + 1) + 1] && y > .97 * mY) { if (!top.length || Math.abs(x - top[top.length - 1][0]) > 2000) top.push([x, y]); }
    if (x > S[3 * (i - 1)] && x >= S[3 * (i + 1)] && x > .97 * mX) { if (!right.length || Math.abs(y - right[right.length - 1][1]) > 2000) right.push([x, y]); }
  }
  top.sort((a, b) => a[0] - b[0]); right.sort((a, b) => b[1] - a[1]);
  return { top, right, mX: mX / 32767, mY: mY / 32767 };
}
const TOUCHES = [];   // numerals reported to readcheck
function drawTouches(c, t, i1, G) {
  const t0 = T.touch3 - .5, t1 = T.octave - 1.4;   // 26.0 .. 30.6
  if (t < t0 || t > t1) return;
  const fade = ss(seg(t, t0, t0 + .3)) * (1 - ss(seg(t, t1 - .3, t1)));
  const tp = touchPts(Math.floor(26.0 * SR)), ax = A * G;
  const lx = C.x - tp.mX * ax, rx = C.x + tp.mX * ax, ty = C.y - tp.mY * ax, by = C.y + tp.mY * ax;
  c.save(); c.globalCompositeOperation = 'lighter'; c.setLineDash([10, 10]); c.strokeStyle = `rgba(110,255,175,${.35 * fade})`; c.lineWidth = 1.6;
  c.strokeRect(lx, ty, rx - lx, by - ty); c.setLineDash([]); c.restore();
  const put = (id, str, x, y, when, al) => {
    const u = ss(seg(t, when, when + .18)); if (u <= 0) return;
    const r = vtext(c, str, x, y, 30, { align: al, passes: glowPasses(30, u * fade), op: 'lighter' });
    TOUCHES.push({ id, text: str, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 });
  };
  const ring = (x, y, when) => { const u = ss(seg(t, when, when + .2)); if (u <= 0) return; c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(235,255,242,${.95 * u * fade})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 12 + 14 * (1 - u), 0, 7); c.stroke(); c.restore(); };
  tp.top.forEach((p, k) => { const x = C.x + p[0] / 32767 * ax, y = C.y - p[1] / 32767 * ax; ring(x, y, T.touch3 + .1 * k); put('top' + k, String(k + 1), x, ty - 52, T.touch3 + .1 * k, 'c'); });
  tp.right.forEach((p, k) => { const x = C.x + p[0] / 32767 * ax, y = C.y - p[1] / 32767 * ax; ring(x, y, T.touch2 + .1 * k); put('right' + k, String(k + 1), rx + 26, y - 15, T.touch2 + .1 * k, 'l'); });
}
function drawBeam(t, cm) {
  const i1 = Math.min(Math.floor(t * SR), S.length / 3 - 2), G = gainAt(t);
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, W, H);
  bx.setTransform(cm.s, 0, 0, cm.s, 960 - cm.s * cm.cx, 540 - cm.s * cm.cy);
  const fl = .97 + .03 * (hash(Math.floor(t * 24) * 1.7) - .5) * 4;            // a little supply flicker
  trace(bx, S, i1, { ox: C.x, oy: C.y, ax: A * G, ay: A * G, I: beamCurrent(t) * fl, s: cm.s, lw: 1.7 });
  // everything below rides on the same layer so it blooms like the trace
  bx.save();
  drawTouches(bx, t, i1, G);
  const lab = (str, x, y, h, al, when, until, id) => {
    const u = seg(t, when, when + .4); if (u <= 0 || t > until) return null;
    const fade = 1 - ss(seg(t, until - .3, until));
    const r = vtext(bx, str, x, y, h, { align: al, prog: u, passes: glowPasses(h, fade), op: 'lighter' }); r.id = id; r.text = str; return r;
  };
  TUBE_LABELS.length = 0;
  const RX = C.x + 430;
  const l1 = lab('LOCK', RX, C.y - 70, 34, 'c', T.lock + .08, T.octave - 1.0, 'lock'); if (l1) TUBE_LABELS.push(l1);
  const l1b = lab(LOCKTXT, RX, C.y - 14, 46, 'c', T.lock + .2, T.octave - 1.0, 'lockr'); if (l1b) TUBE_LABELS.push(l1b);
  const l2 = lab('OUT OF', RX, C.y - 50, 28, 'c', 39.2, 42.5, 'oor1'); if (l2) TUBE_LABELS.push(l2);
  const l2b = lab('RATIO', RX, C.y - 8, 28, 'c', 39.3, 42.5, 'oor2'); if (l2b) TUBE_LABELS.push(l2b);
  bx.restore();
  // the lock flash: the whole glass blooms for an instant
  const dl = t - T.lock; let flash = dl >= 0 && dl < 1.2 ? Math.exp(-dl / .3) : 0;
  // bloom
  g1x.setTransform(1, 0, 0, 1, 0, 0); g1x.clearRect(0, 0, 960, 540); g1x.filter = 'blur(5px)'; g1x.drawImage(bc, 0, 0, 960, 540); g1x.filter = 'none';
  g2x.setTransform(1, 0, 0, 1, 0, 0); g2x.clearRect(0, 0, 480, 270); g2x.filter = 'blur(6px)'; g2x.drawImage(g1, 0, 0, 480, 270); g2x.filter = 'none';
  return flash;
}
const TUBE_LABELS = []; let LOCKTXT = '3:2';

// ------------------------------------------------------------------ captions (the beam writes them, word by word)
function drawCaption(c, t) {
  if (NOSUB) return;
  const cue = CAPS.find(k => t >= k.t0 - .02 && t <= k.t1);
  // strip
  c.save();
  c.fillStyle = 'rgba(2,5,4,.94)'; c.beginPath(); c.roundRect(110, 928, 1700, 136, 22); c.fill();
  c.strokeStyle = 'rgba(86,140,112,.55)'; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineWidth = 8; c.beginPath(); c.roundRect(104, 922, 1712, 148, 26); c.stroke();
  etch(c, 'READOUT', 140, 944, 12);
  if (cue) {
    const out = 1 - ss(seg(t, cue.t1 - .25, cue.t1)), h = 40, ly = cue.lines.length === 1 ? [976] : [946, 1004];
    let wi = 0;
    cue.lines.forEach((line, li) => {
      const toks = line.split(' ');
      const full = textWidth(line, h), x0 = 960 - full / 2, sp = textWidth('A A', h) - textWidth('AA', h);
      let x = x0;
      for (const tk of toks) {
        const w = cue.words[wi++], tw = textWidth(tk, h);
        const prog = clamp((t - w.t0 + .03) / Math.min(.34, Math.max(.16, tk.length * .045)));
        if (prog > 0) {
          const fl = .93 + .07 * hash(Math.floor(t * 24) * .37 + wi);
          const r = textPath(tk, x, ly[li], h, 'l', prog);
          c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
          for (const p of glowPasses(h, out * fl)) { c.lineWidth = p.lw; c.strokeStyle = p.col; c.stroke(r.path); }
          if (prog < 1 && r.head) { const g = c.createRadialGradient(r.head[0], r.head[1], 0, r.head[0], r.head[1], 16); g.addColorStop(0, 'rgba(240,255,246,.95)'); g.addColorStop(1, 'rgba(20,200,90,0)'); c.fillStyle = g; c.beginPath(); c.arc(r.head[0], r.head[1], 16, 0, 7); c.fill(); }
          c.restore();
        }
        x += tw + sp;
      }
    });
  }
  c.restore();
}

// ------------------------------------------------------------------ thumbnails (replayed from the real samples)
const THUMBS = [];

// ------------------------------------------------------------------ frame
window.render = (t) => {
  if (!S) return;
  t = clamp(t, 0, window.DUR - 1e-4);
  const cm = cam(t), i1 = Math.min(Math.floor(t * SR), S.length / 3 - 2);
  TOUCHES.length = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#040605'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.setTransform(cm.s, 0, 0, cm.s, 960 - cm.s * cm.cx, 540 - cm.s * cm.cy);
  const lit = .35 + .65 * ss(seg(t, T.relay, T.relay + .25)) * (t < T.powerOff + .4 ? 1 : 1 - ss(seg(t, T.powerOff + .4, T.powerOff + .9)) * .75);
  drawPlate(ctx, t, i1); drawTube(ctx, t, lit);
  ctx.restore();
  const flash = drawBeam(t, cm);
  // composite the beam layer inside the glass
  ctx.save(); ctx.setTransform(cm.s, 0, 0, cm.s, 960 - cm.s * cm.cx, 540 - cm.s * cm.cy); glassPath(ctx); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = .95; ctx.drawImage(g2, 0, 0, W, H); ctx.globalAlpha = .85; ctx.drawImage(g1, 0, 0, W, H); ctx.globalAlpha = 1; ctx.drawImage(bc, 0, 0);
  if (flash > .01) { ctx.globalAlpha = .55 * flash; ctx.drawImage(g2, 0, 0, W, H); ctx.drawImage(g2, 0, 0, W, H); ctx.globalAlpha = 1; ctx.fillStyle = `rgba(90,255,160,${.07 * flash})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  ctx.save(); ctx.setTransform(cm.s, 0, 0, cm.s, 960 - cm.s * cm.cx, 540 - cm.s * cm.cy); glassShine(ctx); ctx.restore();
  // vignette and caption (screen space)
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(960, 540, 420, 960, 540, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  drawCaption(ctx, t);
  ctx.restore();
  LAST = { cm, t };
};
let LAST = null;

// ------------------------------------------------------------------ what readcheck sees (text that carries content; the Hz counters and etched panel marks are instrument chrome)
window.TEXTS = (t) => {
  if (!LAST || Math.abs(LAST.t - t) > 1e-6) window.render(t);
  const cm = cam(t), out = [];
  const add = (id, text, x0, y0, x1, y1) => { const [a, b] = toScreen(cm, x0, y0), [c2, d] = toScreen(cm, x1, y1); out.push({ id, text, x0: a, y0: b, x1: c2, y1: d }); };
  for (const l of TUBE_LABELS) add(l.id, l.text, l.x0, l.y0, l.x1, l.y1);
  for (const n of TOUCHES) add(n.id, n.text, n.x0, n.y0, n.x1, n.y1);
  for (const th of THUMBS) if (t >= th.t + .25 && th.box) add('th' + th.lab, th.lab, ...th.box);
  if (t >= T.word0 + .02 && t < T.powerOff - .1) { const G = gainAt(t); add('word', 'PLAYED', C.x - .95 * A * G * .8, C.y - .25 * A * G, C.x + .95 * A * G * .8, C.y + .25 * A * G); }
  return out;
};
window.EV = [];

// ------------------------------------------------------------------ init
(async () => {
  const j = async u => (await fetch(u)).json();
  [TLJ, SJ] = await Promise.all([j('timeline.json'), j('out/scope.json')]);
  T = TLJ.T; window.DUR = TLJ.DUR;
  const buf = await (await fetch('out/scope.bin')).arrayBuffer(); S = new Int16Array(buf);
  try { CAPS = await j('caps.json'); } catch (e) { CAPS = []; }
  await loadFont('vfont.json');
  buildLock();
  const th = (t, lab, t0, hz) => THUMBS.push({ t, lab, i0: Math.floor(t0 * SR), n: Math.round(SR / hz), box: null });
  th(T.lock + 8.0, '3:2', 28.0, 110); th(T.octave + .25, '2:1', 32.9, 165); th(T.fourth + .25, '4:3', 34.0, 73.333); th(T.third + .25, '5:4', 36.0, 49);
  window.EV = [{ t: T.relay, type: 'relay' }, { t: T.lock, type: 'lock' }, { t: T.return, type: 'return' }, { t: T.octave, type: 'note' }, { t: T.fourth, type: 'note' }, { t: T.third, type: 'note' }, { t: T.word0, type: 'word' }, { t: T.powerOff, type: 'off' }];
  window.READY = true;
})();
