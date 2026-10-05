// The band: six silhouettes, their poses scheduled on the song's grid (score.json), plus the stage risers.
import { performer, mk, sched, blend, STAND, micStand, guitarProps, kit, stick } from './rig.js';
import { lerp, clamp, ss } from '/core/lib.js';

export const POS = { singer: [0, 0, 0], drum: [1.8, .5, -2.8], guitar: [-3.3, 0, -.4], bass: [3.4, 0, -.6], danL: [-6.4, .6, -1.4], danR: [6.4, .6, -1.4] };
let S = null; export function setScore(s) { S = s; }
const D = (t0, t1) => t >= t0 && t < t1;
export function energy(t) {          // 0 dark, ~1 drop; used for body energy, crowd and bounce
  if (t < 8) return 0; if (t < 24) return lerp(.28, .75, (t - 8) / 16); if (t < 40) return 1; if (t < 48) return .3;
  if (t < 56) return 1.1; return 0;
}
function phase(t) { return (t / S.beat) % 1; }
function dip(t, amt) { return amt * (1 + Math.cos(2 * Math.PI * phase(t))) / 2; }     // dips on the beat
function bobAmt(t) { return t < 8 ? 0 : t < 24 ? .035 : t < 40 ? .07 : t < 48 ? .012 : t < 56 ? .08 : 0; }

// ---------------------------------------------------------------- singer
const MICH = { hRx: .10, hRy: 1.38 };
const SP = (o) => mk(Object.assign({ fLx: -.2, fRx: .2 }, MICH, o));
const SING = [
  [0, SP({ hLx: -.30, hLy: .88 })], [12, SP({ hLx: -.22, hLy: 1.0 })], [17, SP({ hLx: -.5, hLy: 1.45, lean: -.03 })],
  [20, SP({ hLx: -.5, hLy: 1.75, lean: -.05 })], [22, SP({ hLx: -.5, hLy: 2.05, lean: -.08, tilt: -.1 })],
  [23.0, SP({ hLx: -.5, hLy: 2.05, lean: -.1, hipY: .74, tilt: -.1 }), .5],
  [24.0, SP({ hLx: -.55, hLy: 2.25, hRx: .55, hRy: 2.25, hipY: 1.02, fLy: .14, fRy: .14, tilt: -.1 }), .16],
  [24.4, SP({ hLx: -.55, hLy: 2.25, hRx: .55, hRy: 2.25 }), .3],
  [26, SP({ hLx: -1.05, hLy: 1.55, lean: -.06 })], [28, SP({ hLx: -.55, hLy: 2.25, hRx: .55, hRy: 2.25 })],
  [30, SP({ hLx: .0, hLy: 1.38, hRx: 1.05, hRy: 1.55, lean: .06 })], [32, SP({ hLx: -.12, hLy: 2.05, hRx: .12, hRy: 2.05 })],
  [34, SP({ hLx: -.55, hLy: 2.25, hRx: .55, hRy: 2.25 })], [36, SP({ hLx: -1.05, hLy: 1.55, lean: -.06 })],
  [38, SP({ hLx: -.5, hLy: 1.9, lean: -.04, tilt: -.1 })],
  [40, SP({ hLx: -.12, hLy: 1.22, lean: .07, tilt: .38 }), .6], [44, SP({ hLx: -.45, hLy: 1.5, lean: .0, tilt: .1 }), 1.2],
  [46.6, SP({ hLx: -.5, hLy: 2.05, lean: -.07, tilt: -.2 }), 1.4],
  [48.0, SP({ hLx: -.55, hLy: 2.25, hRx: .55, hRy: 2.25, hipY: 1.02, fLy: .14, fRy: .14, tilt: -.1 }), .16],
  [48.4, SP({ hLx: -.55, hLy: 2.25, hRx: .55, hRy: 2.25 }), .3],
  [50, SP({ hLx: -.12, hLy: 2.05, hRx: .12, hRy: 2.05 })], [52, SP({ hLx: -.55, hLy: 2.25, hRx: .55, hRy: 2.25 })],
  [54, SP({ hLx: -.12, hLy: 2.05, hRx: .12, hRy: 2.05 })],
  [56.0, SP({ hLx: 0.0, hLy: 1.38, hRx: .5, hRy: 2.3, lean: -.05, tilt: -.15 }), .12],
];
export function singerPose(t) {
  const p = sched(SING, t), b = bobAmt(t), d = dip(t, b);
  const o = Object.assign({}, p); o.hipY -= d; if (!(t >= 23 && t < 24)) { o.hLy -= d * .5; if (o.hRx > .4 && o.hRy > 1.8) o.hRy -= d * .5; }
  o.lean += Math.sin(t * .9) * .012 + (t < 56 ? Math.sin(2 * Math.PI * t / S.bar / 2) * .02 * energy(t) : 0);
  return o;
}
// ---------------------------------------------------------------- guitarist / bassist
function strum(t, hz) { return Math.sin(t * 2 * Math.PI * hz); }
function guitaristPose(t, who) {
  const en = energy(t), d = dip(t, en * .1), g = who === 'g';
  const sgn = g ? 1 : -1;
  let lean = (g ? -.08 : .06) + Math.sin(t * 1.3 + (g ? 0 : 2)) * .02, hipY = .92 - d;
  const solo = g && t >= 28 && t < 31.8;
  if (solo) { lean = -.2 + Math.sin(t * 3) * .03; hipY = .84 - d; }
  if (!g && t >= 30 && t < 32) lean = .1 + Math.sin(t * 4) * .04;
  const kick = (t >= 48 && t < 48.6) ? Math.sin(Math.PI * (t - 48) / .6) * .35 : 0;
  const neckHand = g ? [-.66 - .02 * Math.sin(t * .8), 1.12] : [-.78, 1.2];
  const strumY = .86 - dip(t, .03) + (en > .2 ? strum(t, 4) * .045 * (en > 0.9 ? 1.2 : 1) : 0);
  return mk({ hipX: 0, hipY, lean, tilt: solo ? -.35 : (en > .5 ? Math.sin(2 * Math.PI * t / (S.beat * 2)) * .12 : 0),
    hLx: neckHand[0], hLy: neckHand[1] + (solo ? .2 : 0), hRx: .16, hRy: strumY,
    fLx: -.34 - kick * .1, fRx: .36 + kick, fRy: kick * .25 });
}
// ---------------------------------------------------------------- drummer
const REST_L = [-.25, .7], REST_R = [.3, .75];
function evs(list, target) { return list.map(x => ({ t: Array.isArray(x) ? x[0] : x, tg: typeof target === 'function' ? target(x) : target })).sort((a, b) => a.t - b.t); }
let HL = null, HR = null, KICKS = null;
function prep() {
  if (HL) return;
  const tomL = (x) => x[1] >= 170 ? [-.22, 1.12] : x[1] >= 140 ? [.24, 1.12] : [.85, .72];
  HR = evs([...S.hat, ...S.ohat], [-.78, .92]).concat(evs(S.crash, [-.6, 1.55])).concat(evs(S.tom.filter((_, i) => i % 2 === 1), tomL))
    .concat(evs(S.stick, [.04, 1.75])).concat(evs(S.rim, [-.7, .9])).sort((a, b) => a.t - b.t);
  HL = evs(S.snare, [-.28, .78]).concat(evs(S.tom.filter((_, i) => i % 2 === 0), tomL)).concat(evs(S.stick, [-.04, 1.75])).sort((a, b) => a.t - b.t);
  KICKS = S.kick.map(k => k[0]);
}
function handPos(list, t, rest) {
  let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].t <= t) lo = m + 1; else hi = m; }
  const prev = lo > 0 ? list[lo - 1] : null, next = lo < list.length ? list[lo] : null;
  const a = prev ? prev.tg : rest, b = next ? next.tg : rest;
  if (prev && next) {
    const gap = next.t - prev.t, u = (t - prev.t) / gap;
    const lift = Math.min(.34, .2 * gap + .04) * Math.pow(Math.sin(Math.PI * u), .85);
    if (gap > 1.2) { const w = u < .5 ? ss(u * gap / .5) * .0 : 0; }       // long gap: the hand floats across in the same arc
    return [lerp(a[0], b[0], ss(u)), lerp(a[1], b[1], ss(u)) + lift];
  }
  if (prev) { const u = (t - prev.t) / .7; return [lerp(a[0], rest[0], ss(u)), lerp(a[1], rest[1], ss(u)) + .12 * Math.sin(Math.PI * clamp(u))]; }
  if (next) { const u = 1 - (next.t - t) / .8; return [lerp(rest[0], b[0], ss(u)), lerp(rest[1], b[1], ss(u)) + .12 * Math.sin(Math.PI * clamp(u))]; }
  return rest;
}
function drummerPose(t) {
  prep(); const L = handPos(HL, t, REST_L), R = handPos(HR, t, REST_R), en = energy(t);
  let kd = 9; for (const k of KICKS) { const d = Math.abs(t - k); if (d < kd) kd = d; if (k > t + 1) break; }
  const kl = Math.min(.12, kd * .7);
  const sway = en > .3 ? Math.sin(2 * Math.PI * t / (S.beat * 2)) * .05 : 0;
  const bangy = t >= 24 && t < 56 && t < 40 || t >= 48 ? dip(t, .03) : 0;
  return { pose: mk({ hipY: .53 - bangy, lean: sway, tilt: sway * 1.5, hLx: L[0], hLy: L[1], hRx: R[0], hRy: R[1], fLx: -.55, fLy: .05 + (t % .5 < .08 ? .02 : 0), fRx: .12, fRy: .04 + kl }), L, R };
}
// ---------------------------------------------------------------- dancers
function dancerPose(t, side) {
  const en = energy(t), ph = 2 * Math.PI * t / S.beat, k = side, bar = 2 * Math.PI * t / S.bar;
  if (t < 16) return mk({ hLx: -.3, hLy: .8, hRx: .3, hRy: .8 });
  const bigjump = (t >= 24 && t < 40 || t >= 48 && t < 56);
  let hLx = -.3, hLy = .85, hRx = .3, hRy = .85, hipY = .92, lean = Math.sin(bar * .5 + k) * .05, fLy = 0, fRy = 0, fLx = -.17, fRx = .17;
  const w = Math.sin(ph / 2 + k);             // step-touch
  if (t < 24) {                              // sway, arms rise like a slow wave
    const up = .5 + .5 * Math.sin(bar * .5 + (k > 0 ? 0 : 1.2));
    hLx = -.55; hRx = .55; hLy = 1.0 + up * .9; hRy = 1.0 + (1 - up) * .9; fLx = -.2 + w * .08; fRx = .2 + w * .08;
  } else if (bigjump) {
    const j = Math.max(0, Math.sin(ph)); const alt = Math.floor(t / S.beat) % 2;
    hipY = .92 - dip(t, .09) + j * .0;
    hLx = alt ? -.6 : -.3; hLy = alt ? 2.1 : 1.3; hRx = alt ? .3 : .6; hRy = alt ? 1.3 : 2.1;
    if (t >= 48) { hLx = -.55; hLy = 2.2; hRx = .55; hRy = 2.2; }
    fLy = j * .1; fRy = j * .1;
  } else if (t < 48) {                       // bridge: slow arms to the sun
    const rise = ss((t - 41) / 6); hLx = -.45; hRx = .45; hLy = lerp(.9, 2.0, rise); hRy = lerp(.9, 2.0, rise); lean = Math.sin(bar * .25 + k) * .04;
  } else {
    hLx = -.12; hLy = 2.0; hRx = .12; hRy = 2.0;
  }
  return mk({ hipY, lean, hLx, hLy, hRx, hRy, fLx, fRx, fLy, fRy, tilt: Math.sin(bar * .5) * .1 });
}

// ---------------------------------------------------------------- draw
export function drawBand(ctx, cam, t, L) {
  // L = {rim:[r,g,b] colour of the backlight, rimA, spot:{a, color}, keyA: front light on the others}
  prep(); const out = {};
  const rimA = L.rimA, rim = { color: L.rim, a: rimA };
  const lit = (a, col) => ({ a, color: col || L.rim });
  // drummer + riser first (furthest)
  const dp = drummerPose(t);
  out.drum = performer(ctx, cam, { base: POS.drum, pose: dp.pose, rim, lit: lit(L.fill * .6), props: (c, X, p, J, tt, st) => {
    kit(c, X, p, J, tt, st);
    // sticks follow the hands
    const sL = [dp.L[0] - .0, dp.L[1] + .12], sR = [dp.R[0], dp.R[1] + .12];
    stick(c, X, [dp.L[0] - .02, dp.L[1] - .03], [dp.L[0] + .03, dp.L[1] + .22]); stick(c, X, [dp.R[0] - .02, dp.R[1] - .03], [dp.R[0] + .03, dp.R[1] + .22]);
  } }, t);
  out.danL = performer(ctx, cam, { base: POS.danL, pose: dancerPose(t, -1), rim, lit: lit(L.fill * .5) }, t);
  out.danR = performer(ctx, cam, { base: POS.danR, pose: dancerPose(t, 1), rim, lit: lit(L.fill * .5), flip: true }, t);
  out.guitar = performer(ctx, cam, { base: POS.guitar, pose: guitaristPose(t, 'g'), rim, lit: lit(L.fill), props: guitarProps(.85, (t >= 28 && t < 31.8) ? .45 : .1) }, t);
  out.bass = performer(ctx, cam, { base: POS.bass, pose: guitaristPose(t, 'b'), rim, lit: lit(L.fill), flip: true, props: guitarProps(1.05, .05) }, t);
  out.singer = performer(ctx, cam, { base: POS.singer, pose: singerPose(t), rim, lit: { a: L.spotA, color: L.spotColor }, props: (c, X) => micStand(c, X) }, t);
  return out;
}
