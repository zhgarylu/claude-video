// One timeline for picture, scroll and sound: "Webtoon Scroll" demo, one invented episode (a commuter and a stubborn umbrella).
// BPM 96: a beat is 0.625 s, a bar 2.5 s, the film is 24 bars. The scroll speed IS the pacing, so every camera segment starts and ends on a beat.
import { clamp, seg, ss } from '/core/lib.js';
export const BPM = 96, BEAT = 60 / BPM, BAR = 4 * BEAT, DUR = 62.5;
export const W = 1080, H = 1920;
export const EV = [];
export const ev = (t, type, v = 1, extra = {}) => EV.push({ t: +t.toFixed(3), type, v, ...extra });

// ---------------------------------------------------------------- layout: panels top to bottom, the gap before each is the gutter (a tall gutter is a pause)
// style: 'bleed' fades into the white gutter, 'round' has a soft rounded border, 'ui' is the end page
const RAW = [
  ['title', 1080, 0, 'bleed'], ['hall', 980, 110, 'round'], ['close', 760, 320, 'round'], ['tug', 520, 90, 'bleed'],
  ['walk', 940, 200, 'bleed'], ['boots', 420, 120, 'round'], ['stairs', 4200, 100, 'bleed'], ['sky', 640, 560, 'bleed'],
  ['punch', 1000, 110, 'round'], ['cliff', 900, 160, 'round'], ['end', 1340, 120, 'ui'],
];
export const PANELS = []; export const P = {};
{ let y = 0; for (const [id, h, gut, style] of RAW) { y += gut; const o = { id, y, h, gut, style, x: style === 'round' ? 40 : 0, w: style === 'round' ? 1000 : 1080 }; PANELS.push(o); P[id] = o; y += h; } }
export const PAGE_H = P.end.y + P.end.h + 200;
export const anchor = id => P[id].y + P[id].h / 2 - 900;            // camera top that puts a panel's middle on the safe-area middle

// ---------------------------------------------------------------- camera: the page never cuts, it only scrolls
// kinds: drift (slow, soft ends) · glide (smooth both ends) · whip (fast ramp, constant speed, HARD STOP) · stop (accelerates into a hard stop)
const END_CAM = P.end.y + 650 - 900;
const SEGS = [
  [0, 2.5, 0, 36, 'drift'],
  [2.5, 5.0, 36, anchor('hall'), 'glide'],
  [5.0, 10.0, anchor('hall'), anchor('hall') + 50, 'drift'],
  [10.0, 12.5, anchor('hall') + 50, anchor('close'), 'glide'],
  [12.5, 17.5, anchor('close'), anchor('close') + 30, 'drift'],
  [17.5, 19.375, anchor('close') + 30, anchor('tug'), 'glide'],
  [19.375, 22.5, anchor('tug'), anchor('tug') + 60, 'drift'],
  [22.5, 24.375, anchor('tug') + 60, anchor('walk'), 'glide'],
  [24.375, 30.625, anchor('walk'), anchor('boots'), 'drift'],
  [30.625, 32.5, anchor('boots'), P.stairs.y - 410, 'glide'],
  [32.5, 33.125, P.stairs.y - 410, P.stairs.y - 410 + 6, 'drift'],
  [33.125, 36.25, P.stairs.y - 410 + 6, P.stairs.y + 3000, 'whip'],
  [36.25, 38.75, P.stairs.y + 3000, P.stairs.y + 3000, 'drift'],
  [38.75, 41.25, P.stairs.y + 3000, P.stairs.y + 3500, 'drift'],
  [41.25, 42.5, P.stairs.y + 3500, anchor('sky'), 'glide'],
  [42.5, 44.375, anchor('sky'), anchor('sky') + 30, 'drift'],
  [44.375, 45.625, anchor('sky') + 30, anchor('punch'), 'stop'],
  [45.625, 50.0, anchor('punch'), anchor('punch') + 24, 'drift'],
  [50.0, 52.5, anchor('punch') + 24, anchor('cliff'), 'glide'],
  [52.5, 55.0, anchor('cliff'), anchor('cliff') + 40, 'drift'],
  [55.0, 57.5, anchor('cliff') + 40, END_CAM, 'glide'],
  [57.5, 62.5, END_CAM, END_CAM + 40, 'drift'],
];
const IMPACT = [[36.25, 40], [45.625, 24]];                          // the camera jolts at a hard stop: overshoot, spring back
const shape = (kind, u) => {
  u = clamp(u);
  if (kind === 'glide') return ss(u);
  if (kind === 'drift') return .65 * u + .35 * ss(u);
  if (kind === 'stop') return Math.pow(u, 1.85);
  const a = .11; return u < a ? u * u / (2 * a) / (1 - a / 2) : (u - a / 2) / (1 - a / 2);       // whip
};
export function camAt(t) {
  let y = SEGS[0][2];
  for (const [t0, t1, y0, y1, k] of SEGS) { if (t >= t0) y = t >= t1 ? y1 : y0 + (y1 - y0) * shape(k, (t - t0) / (t1 - t0)); }
  for (const [ti, amp] of IMPACT) { const d = t - ti; if (d > 0) y += amp * Math.sin(d * 30) * Math.exp(-d * 9); }
  return y;
}
export const speedAt = t => (camAt(t + .02) - camAt(t - .02)) / .04;
const TAB = []; for (let i = 0; i <= 62.5 * 120; i++) TAB.push(camAt(i / 120));
// the moment a world position first reaches `frac` of the way up the screen: reveal-on-scroll
export function enterT(worldY, frac = .85) { for (let i = 0; i < TAB.length; i++) if (TAB[i] + H * frac >= worldY) return i / 120; return DUR; }

// ---------------------------------------------------------------- story cues (seconds). Picture and sound both read these.
export const CUE = {
  logo: .35, blink: 1.5, swipe0: .7, swipe1: 3.3,
  narr1: 5.4, bal1: 7.7, tagSwing: 6.2,
  click1: 12.9, no1: 13.35, click2: 15.0, no2: 15.55, zoom0: 15.0, zoom1: 17.0,
  grr: 18.3, tugA: 18.3, fine: 20.6,
  narr2: 24.6, think2: 25.9, pedestrian: 25.4,
  slosh: 28.9, slip: 32.85, dropT: 33.0,
  splash: 36.25, rainEnd0: 38.2, rainEnd1: 39.6, quiet: 40.2, sun: 41.9, fwoomp: 42.9,
  tagIn: 46.4, bwip: 47.6, said: 47.6,
  cliffN: 52.9, phone: 53.0, gulp: 53.7,
  endBar: 57.8, star0: 58.3, like: 59.2, tap0: 9.0, tap1: 11.8, tap2: 49.6, tap3: 52.2,
};
// rain: how heavy it is at time t (0..1) — it stops for good at the sky panel
export const rainAt = t => t < 3 ? .75 + .25 * ss(t / 3) : (t > CUE.rainEnd0 ? 1 - ss(seg(t, CUE.rainEnd0, CUE.rainEnd1)) : t < 24 ? 1 : 1);
// Dewey's fall (world y of the umbrella and of Mina while the page whips down the stairs)
export const FALL = { t0: 33.0, t1: 36.25 };
