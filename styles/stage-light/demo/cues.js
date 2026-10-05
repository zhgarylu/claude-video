// The light cue stack: every number here is a function of the song's grid (score.json).
// rigAt(t) -> the state of 12 moving heads, the follow spot, the LED wall, the haze, the flash overlay.
import { lerp, clamp, ss, hash } from '/core/lib.js';

export const NH = 12;
export const HEADS = Array.from({ length: NH }, (_, i) => [-6.6 + 1.2 * i, 6.6, -3.6]);
const C = { wb: [190, 215, 255], blue: [40, 110, 255], blue2: [60, 160, 255], mag: [255, 45, 160], vio: [140, 60, 255], amber: [255, 172, 52], white: [255, 244, 228] };
export { C };
let S = null; export function setScore(s) { S = s; }
const T = (bar, beat = 0) => (bar * 4 + beat) * .5;

// flashes: full-stage or partial overlays. HARD RULE of the style: on the beat grid only, never more than 2 a second
export function flashList() {
  const F = [
    [24.0, .7, .26], [28.0, .22, .18], [32.0, .3, .18], [36.0, .2, .18], [31.0, .2, .16], [31.5, .2, .16], [39.0, .2, .16], [39.5, .2, .16],
    [48.0, .5, .24], [50.0, .18, .18], [52.0, .38, .22], [54.0, .18, .18], [55.0, .2, .16], [55.5, .2, .16], [56.0, .62, .16],
  ];
  return F.sort((a, b) => a[0] - b[0]);
}
const FL = flashList();
export function flashAt(t) { let a = 0; for (const [t0, p, d] of FL) if (t >= t0 - .02) a += p * (t < t0 ? (t - t0 + .02) / .02 : Math.exp(-(t - t0) / d)); return Math.min(.85, a); }

// last kick before t -> a pulse 1..0, used to breathe the lights on the beat
function pulse(t, dec = .22) {
  const k = S.kick; let lo = 0, hi = k.length; while (lo < hi) { const m = (lo + hi) >> 1; if (k[m][0] <= t) lo = m + 1; else hi = m; }
  if (!lo) return 0; return Math.exp(-(t - k[lo - 1][0]) / dec);
}
export function beatPulse(t, dec = .25) { const ph = (t / S.beat) % 1; return Math.exp(-ph / dec); }

// sweep phase: the integral of the sweeping speed, so a change of speed never jumps the beams
function sweep(t) {
  const sp = (a, b, w) => w * clamp(t - a, 0, b - a);          // rad/s * seconds inside [a,b]
  return sp(8, 16, 2 * Math.PI / 8) + sp(16, 24, 2 * Math.PI / 4) + sp(24, 32, 2 * Math.PI / 4) + sp(32, 36, 2 * Math.PI / 2) + sp(36, 41, 2 * Math.PI / 4) + sp(41, 48, 2 * Math.PI / 8) + sp(48, 52, 2 * Math.PI / 3) + sp(52, 60, 2 * Math.PI / 2);
}
const SINGER_TARGET = [0, 1.7, 0];
// target modes: (head index, t) -> world point
const floorSweep = (A, zc, kx) => (i, t) => { const ph = sweep(t) + i * .55 * (i % 2 ? -1 : 1) + (i % 2 ? Math.PI : 0); return [HEADS[i][0] * kx + A * Math.sin(ph), 0, zc + 2.2 * Math.sin(ph * .7 + i)]; };
const skyFan = (spread) => (i, t) => { const ph = sweep(t) + i * .5; return [HEADS[i][0] * spread + 3.2 * Math.sin(ph), 8.5 + 2 * Math.cos(ph * .8 + i), -3.2]; };
const burst = (i) => [HEADS[i][0] * 2.4, 9.5, -2.5];
const converge = (i) => [SINGER_TARGET[0] + (i % 2 ? .25 : -.25), SINGER_TARGET[1], SINGER_TARGET[2]];
const curtain = (i) => [HEADS[i][0] * .5, 0, -1.2];
function lerp3(a, b, w) { return [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)]; }
function aim(i, t) {
  // one function per time block; blends over .6 s at each boundary except where a cut is the cue (the drop)
  let a;
  if (t < 8) a = curtain(i);
  else if (t < 16) a = floorSweep(3.2, 1.2, .55)(i, t);
  else if (t < 24) { a = floorSweep(5.6, 1.2, .3)(i, t); const c = ss((t - 21.4) / 2.0); a = lerp3(a, converge(i), c); }
  else if (t < 28) { const w = ss((t - 24.15) / 1.4); a = lerp3(burst(i), floorSweep(7, 1.4, .25)(i, t), w); }
  else if (t < 32) a = lerp3(floorSweep(7, 1.4, .25)(i, t), skyFan(1.7)(i, t), ss((t - 28) / .7));
  else if (t < 36) a = lerp3(skyFan(1.7)(i, t), floorSweep(8, 1.2, .2)(i, t), ss((t - 32) / .7));
  else if (t < 41) a = lerp3(floorSweep(8, 1.2, .2)(i, t), converge(i), ss((t - 36) / 3.4));
  else if (t < 48) a = lerp3(converge(i), floorSweep(3, 1.0, .5)(i, t), ss((t - 41) / 1.5));
  else if (t < 54) { const w = ss((t - 48) / .8); a = lerp3(burst(i), t < 51 ? skyFan(2.0)(i, t) : floorSweep(8.5, 1.2, .25)(i, t), w); if (t >= 51) a = lerp3(skyFan(2.0)(i, t), floorSweep(8.5, 1.2, .25)(i, t), ss((t - 51) / .7)); }
  else { const c = ss((t - 53.6) / 1.6); a = lerp3(floorSweep(8.5, 1.2, .25)(i, t), converge(i), c); }
  return a;
}
// per-head intensity and colour
function headState(i, t) {
  const hp = pulse(t), bp = beatPulse(t), pop = (t0) => (t >= t0 ? Math.exp(-(t - t0) / .12) : 0);
  let I = 0, col = C.wb, spread = 3.2;
  if (t < 8) {
    const on = [1, 4, 7, 10].indexOf(i);
    if (on >= 0 && t >= 6 + on * .5) { I = .3 + .7 * pop(6 + on * .5); col = C.wb; }
  } else if (t < T(11, 3)) {
    col = i % 2 ? C.blue2 : C.blue; I = lerp(.55, 1, (t - 8) / 16) * (.78 + .22 * hp); I *= 0.45 + 0.55 * ss((t - 8) / .4 - i * .02);
    if (t >= 21.4) I *= 1 + .25 * ss((t - 21.4) / 2);
    spread = t >= 16 ? 3.6 : 3.2;
  } else if (t < 24) I = 0;
  else if (t < 40) {
    col = i % 2 ? C.vio : C.mag; I = (.82 + .18 * hp);
    if (t >= 32 && t < 36) I *= ((Math.floor(t / S.beat) + i) % 2 ? .45 : 1);        // alternate heads on the beat in the fast block
    if (t < 24.8) I *= 1 + .5 * Math.exp(-(t - 24) / .4);
    spread = t < 25.5 ? 4.6 : 3.4;
    if (t >= T(19, 3.0)) I = 0;                                                     // beat 4 of bar 20: lights thin out before the bridge silence
  } else if (t < 41) I = 0;
  else if (t < 48) {
    col = C.amber; const t0 = 41 + i * .5; I = t >= t0 ? .78 * ss((t - t0) / .8) * (.85 + .15 * bp) : 0; spread = 4.6;
  } else if (t < 56) {
    col = [C.blue, C.mag, C.amber][i % 3]; I = (.85 + .15 * hp); if (t < 48.8) I *= 1 + .4 * Math.exp(-(t - 48) / .4); spread = 3.8;
    if (t >= 53.6) I *= 1 + .12 * ss((t - 53.6) / 2.2);
  } else if (t < 56.14) { col = C.white; I = .9 * (1 - (t - 56) / .14); spread = 5; }
  return { i, I: clamp(I, 0, 1.4), col, spread: spread * Math.PI / 180, src: HEADS[i], aim: aim(i, t) };
}
export function rigAt(t) {
  const heads = []; for (let i = 0; i < NH; i++) heads.push(headState(i, t));
  const blackout = (t >= T(11, 3) && t < 24) || (t >= 40 && t < 41) || (t >= 56.14);
  // the follow spot on the singer
  let spotA = 0, spotCol = C.wb, spotW = .55;
  if (t >= .5 && t < 23.5) { spotA = (t < .56 ? (t - .5) / .06 : 1) * (t < 8 ? .7 : .55); spotCol = t < 8 ? C.wb : [150, 195, 255]; }
  else if (t >= 23.5 && t < 24) { spotA = .42; spotCol = C.wb; spotW = .22; }
  else if (t >= 24 && t < 40) { spotA = .5; spotCol = [255, 205, 235]; }
  else if (t >= 40 && t < 48) { spotA = t < 40 ? 0 : (t < 40.4 ? ss((t - 40) / .4) : 1) * .36; spotCol = [255, 215, 150]; spotW = .4; }
  else if (t >= 48 && t < 56) { spotA = .55; spotCol = C.white; }
  else if (t >= 56 && t < 56.12) { spotA = .5; spotCol = C.white; }
  else if (t >= 57) { spotA = .62 * ss((t - 57) / 1.3); spotCol = [255, 232, 200]; spotW = .4; }
  // LED wall: mode + gain
  let wall = 'off', wg = 0;
  if (t < 6) { wall = 'standby'; wg = t > 3 ? ss((t - 3) / 2) * .35 : 0; }
  else if (t < 8) { wall = 'standby'; wg = .35 + .25 * Math.max(...[6, 6.5, 7, 7.5].map(a => t >= a ? Math.exp(-(t - a) / .15) : 0)); }
  else if (t < T(11, 3)) { wall = 'eq'; wg = lerp(.4, .85, (t - 8) / 16); }
  else if (t < 24) { wall = 'off'; wg = 0; }
  else if (t < 40) { wall = 'rings'; wg = .8; }
  else if (t < 41) { wall = 'off'; wg = 0; }
  else if (t < 48) { wall = 'sun'; wg = ss((t - 41) / 2.5) * .85; }
  else if (t < 56.1) { wall = 'sun2'; wg = t >= 53.6 ? lerp(.8, .6, ss((t - 53.6) / 1.5)) : .8; }
  // palette for rim / fill light on the band
  let rim = C.wb, rimA = 0, fill = 0;
  if (t < .5) { rimA = 0; } else if (t < 8) { rim = C.wb; rimA = t < 6 ? .05 : .45; fill = 0; }
  else if (t < T(11, 3)) { rim = C.blue2; rimA = .75; fill = .04 + .04 * ss((t - 8) / 14); }
  else if (t < 24) { rimA = 0; }
  else if (t < 40) { rim = [255, 110, 200]; rimA = .8; fill = .09; if (t >= T(19, 3)) rimA = 0; }
  else if (t < 41) rimA = 0;
  else if (t < 48) { rim = C.amber; rimA = .55 + .2 * ss((t - 41) / 5); fill = .07; }
  else if (t < 56) { rim = [255, 150, 210]; rimA = .85; fill = .1; }
  else if (t < 56.14) { rim = C.white; rimA = .9; fill = .1; }
  // haze density 0.5..1.2 (beam brightness and the glow around the lamps)
  const haze = t < 8 ? .6 : t < 24 ? .8 : t < 40 ? 1.0 : t < 48 ? 1.05 : 1.1;
  // base colour of the haze glow
  const glow = t < 8 ? C.wb : t < 24 ? C.blue : t < 40 ? C.mag : t < 48 ? C.amber : [200, 140, 255];
  return { heads, blackout, spotA, spotCol, spotW, wall, wg, rim, rimA, fill, haze, glow, flash: flashAt(t) };
}
