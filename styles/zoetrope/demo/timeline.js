// The single source of truth: tempo grid, scene times, the spin of the toy (rev/s over time) and everything derived from it.
// Browser (main.js) and Node (tools/export_tl.mjs -> timeline.json -> mix.py) read the same numbers.
import { monotone, clamp, ss } from '/core/lib.js';

export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 3, NBARS = 29, DUR = NBARS * BAR;      // 3/4 waltz; 1 beat = 15 frames
const bar = (n, beat = 0) => n * BAR + beat * BEAT;

export const T = {
  v1: 1.25, pin: bar(4), mirrorIn: 8.7, mirrorOut: 24.7,
  slow: 16.4, slowHold: 17.6, fast: 18.8, fastHold: 20.2, rev: 21.8, revHold: 23.6,
  wheel: 25.0, lock: 27.6, creep: 29.35, creepEnd: 31.9, stopDisc: 33.55,
  lift: 33.9, unrolled: 36.0, flip0: 36.1, curl0: 37.1, curl1: 38.6, shellOn: 38.6, shellEnd: 39.4, drumSpin: 39.4, drumFull: 41.0,
  slowDrum: 45.4, stopDrum: 47.5, pullOut: 48.4, end: DUR,
};
// the voice-over: start times (s)
export const VO = [
  { id: 'v1', t: 1.25 }, { id: 'v2', t: 8.1 }, { id: 'v3', t: 11.25 }, { id: 'v4', t: 16.9 }, { id: 'v5', t: 19.1 },
  { id: 'v6', t: 21.75 }, { id: 'v7', t: 26.25 }, { id: 'v8', t: 33.75 }, { id: 'v9', t: 41.25 }, { id: 'v10', t: 45.9 }, { id: 'v11', t: 50.4 },
];

// spin of the toy in revolutions per second (positive = clockwise); the disc until the ring is lifted, the drum after
const KEYS = [
  [0, 0], [7.5, 0], [9.5, 0.25], [10.8, 0.6], [12.3, 1.2], [13.5, 2.0], [16.4, 2.0],
  [17.6, 0.5], [18.7, 0.5], [20.2, 2.0], [21.8, 2.0],
  [23.6, -2.0], [25.2, -2.0], [27.6, 2.0], [29.35, 2.0], [29.8, 1.9], [31.9, 1.9], [32.4, 2.0], [32.7, 2.0],
  [33.55, 0], [39.0, 0], [41.0, -1.0], [45.4, -1.0], [47.5, 0], [DUR, 0],
];
const spd = monotone(KEYS);
export const SPEED = t => spd(clamp(t, 0, DUR));
export const FPS = 24;

// angle table (degrees, clockwise) at 1920 Hz with phase locks on the plateaus at +-2 rev/s so that a slit passes just before each film frame
const RES = 1920, NT = Math.ceil(DUR * RES) + 2;
const BASE = new Float64Array(NT);
for (let i = 1; i < NT; i++) BASE[i] = BASE[i - 1] + 360 * SPEED(i / RES) / RES;
const baseAt = (t, tab) => { const x = clamp(t, 0, DUR) * RES, i = Math.floor(x), f = x - i; return tab[i] * (1 - f) + tab[i + 1] * f; };
// plateaus: [start, end, target phase in degrees past the slit centre at the frame sample times]
const LOCKS = [[13.7, 16.4, 3.0], [20.4, 21.8, 3.0], [24.0, 25.2, -3.0], [27.8, 29.35, 3.0]];
export const THETA = new Float64Array(NT);
{
  let corr = new Float64Array(NT);
  for (const [a, b, tgt] of LOCKS) {
    // angle at a frame time inside the plateau, with the corrections made so far
    const tf = Math.ceil(a * FPS) / FPS, idx = Math.round(tf * RES);
    const th = BASE[idx] + corr[idx];
    let d = (tgt - th) % 30; if (d > 15) d -= 30; if (d < -15) d += 30;
    const r0 = a - 0.9;
    for (let i = 0; i < NT; i++) { const t = i / RES, u = clamp((t - r0) / 0.9); corr[i] += d * ss(u); }
  }
  for (let i = 0; i < NT; i++) THETA[i] = BASE[i] + corr[i];
}
export const theta = t => baseAt(t, THETA);          // degrees, continuous
export const thetaRes = RES;

// the speed samples the mixer needs (1/120 s) -- derived from the table so that pitch and clicks follow the real rotation
export function spinSamples() { const out = []; for (let i = 0; i <= Math.round(DUR * 120); i++) { const t = i / 120; out.push(+((theta(t + 1 / 240) - theta(t - 1 / 240)) * 120 / 360).toFixed(4)); } return out; }

// sound / cue events (also exported through window.EV by main.js)
export const EV = [
  { t: T.pin, type: 'pin' }, { t: T.mirrorIn, type: 'slide' }, { t: T.mirrorOut, type: 'slide' },
  { t: 18.75, type: 'dial' }, { t: 22.5, type: 'dial' },
  { t: T.lift, type: 'unroll' }, { t: T.shellOn, type: 'sleeve' }, { t: T.stopDisc, type: 'stop' }, { t: T.stopDrum, type: 'stop' },
  { t: T.curl0, type: 'curl' },
];
export const MUSIC = { in: bar(4), tempoFall: bar(24), stop: T.stopDrum, silence2: 48.8, last: 51.0 };
