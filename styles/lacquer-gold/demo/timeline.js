// One clock for picture, voice, score and foley. 75 BPM, 4/4: beat 0.8 s, bar 3.2 s. 17 bars + tail.
import { buildDesign, schedule } from './motifs.js';
export const BPM = 75, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 56;
export const bar = n => (n - 1) * BAR;   // start of bar n (1-based)

export const T = {
  drop: 1.6,              // the sap drop leaves its thread
  land: 2.4,              // …and meets the pool
  wipe1: [2.8, 3.6],      // coat wipe: pool → panel
  brush0: 3.6,            // panel, three passes
  wipe2: [5.6, 6.4],      // panel → section
  coat0: 7.2,             // coat 1
  coatN: 15.2,            // coat 30
  cut0: 16.0,             // graver enters (bar 6)
  cut1: 17.6,             // groove finished
  wipe3: [18.4, 19.2],    // section → lid
  wait0: 19.2, gold0: 25.6,
  sprinkle0: 30.4, sprinkle1: 32.0, brush_p0: 32.0, brush_p1: 33.6,
  cloud0: 33.6, wave0: 34.4, wave1: 36.0, frame0: 35.2, fret0: 36.0, fret1: 37.6,
  turn0: 38.4, turn1: 44.8,
  lift0: 46.4, off0: 47.4, off1: 48.7,
  title0: 50.4, seal: 52.0,
  end: DUR,
};

// the voice: start times chosen so each caption can stay on screen as long as readcheck wants
export const VO = [
  { id: 'v1', t: 0.8, text: 'Lacquer begins as tree sap.' },
  { id: 'v2', t: 4.3, text: 'A brush lays it on, thin as breath.' },
  { id: 'v3', t: 8.3, text: 'Each coat waits for damp air to cure.' },
  { id: 'v4', t: 12.5, text: 'Polished smooth, again, thirty times.' },
  { id: 'v5', t: 16.8, text: 'Cut one open. Every coat is still there.' },
  { id: 'v6', t: 21.3, text: 'Nothing happens. That is the work.' },
  { id: 'v7', t: 25.9, text: 'Only now, the gold.' },
  { id: 'v8', t: 29.0, text: 'One line, drawn once. Then powder.' },
  { id: 'v9', t: 33.2, text: 'Each stroke rests on every coat beneath.' },
  { id: 'v10', t: 38.4, text: 'Turn it, and the light goes deep.' },
  { id: 'v11', t: 45.6, text: 'Now, open it.' },
  { id: 'v12', t: 49.0, text: 'Months of waiting, held in one hand.' },
];

// 30 coats, accelerating: spacing shrinks geometrically so that coat 30 lands at T.coatN
export const COATS = (() => {
  const n = 30, span = T.coatN - T.coat0;
  let lo = .5, hi = .999;
  const sum = r => { let s = 0, d = .85; for (let i = 0; i < n - 1; i++) { s += d; d *= r; } return s; };
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (sum(m) > span) hi = m; else lo = m; }
  const r = (lo + hi) / 2, out = [T.coat0]; let d = .85;
  for (let i = 1; i < n; i++) { out.push(out[i - 1] + d); d *= r; }
  return out;
})();
export const countAt = t => COATS.filter(c => t >= c).length;

export const DESIGN = buildDesign();
export const GOLD_EV = schedule(DESIGN, T);

// sound / cue events for the mixer (events.mjs exports window.EV; the mixer reads timeline.json)
export const EV = [
  { t: T.drop, type: 'thread' }, { t: T.land, type: 'plop' },
  { t: T.wipe1[0], type: 'wipe' }, { t: T.wipe2[0], type: 'wipe' }, { t: T.wipe3[0], type: 'wipe' },
  ...[0, 1, 2].map(k => ({ t: T.brush0 + k * (2 / 3), type: 'drag', dur: 2 / 3, k })),
  ...COATS.map((t, i) => ({ t, type: 'coat', n: i + 1 })),
  { t: T.coatN, type: 'bell30' },
  { t: T.cut0 + .1, type: 'cut', dur: T.cut1 - T.cut0 }, { t: T.cut0, type: 'bell' },
  ...GOLD_EV,
  { t: T.sprinkle0, type: 'sprinkle', dur: T.sprinkle1 - T.sprinkle0 }, { t: T.brush_p0, type: 'powderbrush', dur: T.brush_p1 - T.brush_p0 },
  { t: T.wave0, type: 'waves', dur: T.wave1 - T.wave0 }, { t: T.fret0, type: 'fret', dur: T.fret1 - T.fret0 },
  { t: T.frame0, type: 'rule', dur: 1.6 },
  { t: T.turn0 + .2, type: 'sheen', dur: 3.0 }, { t: 41.6, type: 'sheen', dur: 2.8 },
  { t: T.lift0, type: 'lift' }, { t: T.off0, type: 'slide', dur: T.off1 - T.off0 },
  { t: T.seal, type: 'seal' }, { t: 54.4, type: 'glint' },
].sort((a, b) => a.t - b.t);

// music grid markers for cuecheck
export const SECS = [
  { id: 'sap', t: bar(1), bars: 2 }, { id: 'coats', t: bar(3), bars: 3 }, { id: 'cut', t: bar(6), bars: 1 },
  { id: 'wait', t: bar(7), bars: 2 }, { id: 'gold', t: bar(9), bars: 4 }, { id: 'turn', t: bar(13), bars: 2 },
  { id: 'open', t: bar(15), bars: 3 },
];
