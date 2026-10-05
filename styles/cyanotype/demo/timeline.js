// One timeline drives the picture, the score, the foley and the subtitles. 96 BPM, 4/4: beat 0.625 s, bar 2.5 s.
export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 60;
const B = n => +(n * BEAT).toFixed(4);                   // beat n -> seconds

// voice lines (t = when the wav starts)
export const VO = [
  { id: 'v1', t: 0.9 }, { id: 'v2', t: 8.1 }, { id: 'v3', t: 12.7 }, { id: 'v4', t: 16.0 }, { id: 'v5', t: 27.4 },
  { id: 'v6', t: 34.4 }, { id: 'v7', t: 40.6 }, { id: 'v8', t: 47.5 }, { id: 'v9', t: 51.9 }, { id: 'v10', t: 55.3 },
];

export const T = {
  titleIn: 3.0, titleOut: 7.3,
  lift1: [6.85, 8.05],                                   // the hook sheet is pulled off the strip
  coat0: 8.75, coatDt: 1.25, coatN: 3, brushIn: 8.2, brushOut: [12.45, 13.0],
  frond: 13.125, glassIn: [13.2, 13.75], cardIn: [13.8, 14.25], sun0: 14.375, flash: [14.375, 15.3],
  uncover: [18.125, 19.375, 20.625, 21.875, 23.125, 24.375],          // card edge passes the boundary of band 6 ... band 1
  cardOut: [24.8, 25.7], expEnd: 26.25, glassOut: [26.25, 27.1],
  wash1: [27.5, 32.0], digits: [28.1, 28.9, 29.7, 30.5, 31.3, 32.1], notePale: 28.7, noteFlat: 32.3,
  circle: [34.375, 35.45], noteRight: 35.6, push: [34.2, 37.6], silence: [37.6, 39.55],
  lift2: [39.6, 40.6],
  fern: 42.1, feather: 42.5, sun2: 43.125, exp2End: 45.625, lift3: [45.7, 46.8],
  wash2: [47.5, 51.7], dryEnd: 58,
  hang: [52.0, 52.9], wall0: 52.9,
  noteEnd: [55.3, 57.3], pull: [55.6, 59.6], lastDrop: 58.75,
};

// ---------------------------------------------------------------- the strip: card edge, sun, dose
export const BANDS = { x0: 180, w: 260, n: 6 };           // coated area of the strip in world px; band 1 is the left one
const xs = [1760, 1480, 1220, 960, 700, 440, 160];        // card edge positions after each jerk
export function cardEdge(t) {
  let x = xs[0];
  for (let k = 0; k < 6; k++) {
    const t1 = T.uncover[k], t0 = t1 - 0.34;
    if (t >= t1) x = xs[k + 1]; else if (t > t0) { const u = (t - t0) / (t1 - t0); x = xs[k] + (xs[k + 1] - xs[k]) * (1 - Math.pow(1 - u, 2.2)); break; } else break;
  }
  if (t > T.cardOut[0]) { const u = Math.min(1, (t - T.cardOut[0]) / (T.cardOut[1] - T.cardOut[0])); x = xs[6] - 2000 * u * u; }
  return x;
}
export const sunAt = t => Math.min(1, Math.max(0, (t - T.sun0) / 0.7)) * (1 - Math.min(1, Math.max(0, (t - T.expEnd) / 0.5)));
export const RATE1 = 1.12;                                // dose per second on the strip
export const Itot1 = t => RATE1 * Math.max(0, Math.min(t, T.expEnd) - T.uncover[0] + 0.3);   // dose a point has had if uncovered at the start
// the real sheet
export const RATE2 = 2.4;
export const dose2 = t => RATE2 * Math.max(0, Math.min(t, T.exp2End) - T.sun2);
export const sun2At = t => Math.min(1, Math.max(0, (t - T.sun2) / 0.6)) * (1 - Math.min(1, Math.max(0, (t - T.exp2End) / 0.6)));

// ---------------------------------------------------------------- camera: [t, [cx, cy, zoom]]
export const CAM = [
  [0, [960, 470, 1.0]], [3.5, [975, 475, 1.02]], [6.85, [990, 470, 1.04]], [7.6, [980, 460, 1.0]],
  [8.0, [760, 430, 1.35]], [10.0, [980, 450, 1.33]], [11.8, [1180, 450, 1.3]], [12.6, [960, 450, 1.0]],
  [15.0, [960, 450, 1.05]], [17.0, [1330, 440, 1.32]],
  // 17.8 .. 25: follows the card (see camAt in main.js)
  [25.0, [560, 440, 1.32]], [27.0, [960, 450, 1.0]], [29.0, [820, 440, 1.1]], [32.5, [1100, 440, 1.1]], [34.2, [960, 450, 1.0]],
  [37.6, [1090, 580, 1.8]], [39.4, [1090, 580, 1.8]], [40.5, [960, 470, 1.0]],
  [43.0, [960, 470, 1.02]], [46.0, [960, 470, 1.06]], [47.5, [960, 470, 1.06]], [51.7, [940, 520, 1.3]], [52.6, [960, 470, 1.15]],
  [53.0, [960, 470, 1.0]], [55.6, [960, 470, 1.0]], [59.6, [960, 520, 0.52]], [60, [960, 520, 0.52]],
];

// ---------------------------------------------------------------- sound events (the mix and the picture read the same list)
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
// hook: running water over the sheet
ev(0.0, 'water', { t1: 7.2, g: 1 });
for (const t of [1.3, 2.9, 4.6, 6.2]) ev(t, 'drip');
ev(2.3, 'bell', { note: 'F#5' });
ev(T.titleIn, 'pen', { t1: 5.0 });
ev(T.lift1[0], 'lift', { t1: T.lift1[1] });
// coat
for (let j = 0; j < T.coatN; j++) ev(T.coat0 + j * T.coatDt, 'brush', { t1: T.coat0 + (j + 1) * T.coatDt, j });
ev(T.brushOut[0], 'lift', { t1: T.brushOut[1], g: 0.4 });
ev(T.frond, 'thump', { g: 0.8, kind: 'leaf' });
ev(T.glassIn[0], 'slide', { t1: T.glassIn[1], kind: 'glass' }); ev(T.glassIn[1], 'clink');
ev(T.cardIn[0], 'slide', { t1: T.cardIn[1], kind: 'card' }); ev(T.cardIn[1], 'thump', { g: 0.5, kind: 'card' });
ev(T.sun0, 'sun', { t1: T.expEnd });
T.uncover.forEach((t, k) => { ev(t - 0.34, 'scrape', { t1: t }); ev(t, 'band', { k: 6 - k }); });
ev(T.cardOut[0], 'slide', { t1: T.cardOut[1], kind: 'card' });
ev(T.glassOut[0], 'slide', { t1: T.glassOut[1], kind: 'glass' }); ev(T.glassOut[0] + 0.1, 'lift', { t1: T.glassOut[1], g: 0.5 });
ev(T.wash1[0], 'water', { t1: T.wash1[1] + 1.2, g: 0.9 });
T.digits.forEach(t => ev(t, 'pen', { t1: t + 0.35, g: 0.5 }));
ev(T.notePale, 'pen', { t1: T.notePale + 0.6, g: 0.5 }); ev(T.noteFlat, 'pen', { t1: T.noteFlat + 0.6, g: 0.5 });
for (const t of [29.2, 31.0, 33.0]) ev(t, 'drip');
ev(T.circle[0], 'pen', { t1: T.circle[1], g: 0.8 }); ev(T.noteRight, 'pen', { t1: T.noteRight + 0.7, g: 0.5 });
ev(38.05, 'drip', { g: 1.3 });
ev(T.lift2[0], 'lift', { t1: T.lift2[1] });
ev(40.0, 'bowl');
// the real sheet
ev(T.fern, 'thump', { g: 1.0, kind: 'leaf' }); ev(T.feather, 'thump', { g: 0.8, kind: 'feather' });
ev(T.sun2, 'sun', { t1: T.exp2End });
ev(T.lift3[0], 'lift', { t1: T.lift3[1], g: 1.0 }); ev(T.lift3[0] + 0.25, 'feather');
ev(T.wash2[0], 'water', { t1: T.wash2[1] + 1.3, g: 1.1 });
ev(48.5, 'bloom'); ev(T.wash2[0] + 0.0, 'bloom', { g: 0.5 });
for (const t of [49.2, 50.3, 51.4, 52.2]) ev(t, 'drip');
ev(T.hang[0], 'lift', { t1: T.hang[1], g: 0.8 }); ev(T.hang[1] + 0.05, 'peg'); ev(T.hang[1] + 0.2, 'peg', { g: 0.7 });
ev(T.noteEnd[0], 'pen', { t1: T.noteEnd[1] });
ev(T.lastDrop, 'drop', { g: 1.0 });
export const END_BELL = 59.1;

export const SECS = [
  { id: 'hook', t: 0, bars: 3 }, { id: 'coat', t: 7.5, bars: 2 }, { id: 'dry', t: 12.5, bars: 2 }, { id: 'strip', t: 17.5, bars: 4 },
  { id: 'wash', t: 27.5, bars: 3 }, { id: 'look', t: 35, bars: 1.5 }, { id: 'silence', t: 38.75, bars: 0.5 }, { id: 'real', t: 40, bars: 3 },
  { id: 'rinse', t: 47.5, bars: 2 }, { id: 'dry2', t: 52.5, bars: 3 }, { id: 'end', t: 57.5, bars: 1 },
];
export const HITS = {
  coat0: T.coat0, glass: T.glassIn[1], sun0: T.sun0, uncover1: T.uncover[0], uncover6: T.uncover[5], wash1: T.wash1[0], circle: T.circle[0],
  bowl: 40.0, sun2: T.sun2, wash2: T.wash2[0], lastDrop: T.lastDrop,
};
