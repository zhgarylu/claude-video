// One timeline for picture, sound, captions and checks. Seconds on the film clock; 120 BPM, 4/4: BEAT .5 s, BAR 2 s.
export const BPM = 120, BEAT = 0.5, BAR = 2.0, DUR = 52.6;

// Voice-over: start of each line (voice/dur.json gives lengths). Text is what Kokoro reads (lines.json); captions come from caps.json.
export const VO = [
  { id: 'v1', t: 0.9 },
  { id: 'v2', t: 5.7 },
  { id: 'v3', t: 13.15 },
  { id: 'v4', t: 19.3 },
  { id: 'v5', t: 25.75 },
  { id: 'v7', t: 27.9 },
  { id: 'v6', t: 31.5 },
  { id: 'v8', t: 37.9 },
  { id: 'v9', t: 44.0 },
];

// Key moments (film seconds)
export const T = {
  // page 1 (6 a.m.)
  p1Head: 0.25, p1HeadDt: 0.125,      // headline slugs, 16 letters
  p1Mast: 2.9, p1Rules: 3.2, p1Deck: 4.3, p1Lead: 4.6, p1Body: 5.2, p1Photo: 5.0, p1PhotoEnd: 9.0, p1Cap: 9.3,
  // page 2 (noon, then late)
  p2Drop: 13.6, p2Land: 14.0, p2Head: 14.25, p2HeadDt: 0.0625, p2Body: 14.5, p2Photo: 14.5, p2PhotoEnd: 16.8, p2Extra: 16.95,
  bell: 21.0,            // telephone rings (two double rings)
  tape0: 21.25, tape1: 23.0,   // wire tape typed
  hush0: 24.0,            // everything stops
  stamp: 25.5,            // STOP PRESS
  pull0: 27.0, pullDt: 0.0625,   // old headline lifts out
  fix0: 28.25, fixDt: 0.125,     // new headline set
  fixDeck: 29.6, morph0: 30.6, morph1: 34.0, fixCap: 31.2, edition2: 27.5,
  // page 4 (evening final)
  p4Drop: 37.1, p4Land: 37.5, p4Head: 38.25, p4HeadDt: 0.125, p4Body: 39.4, p4Photo: 38.8, p4PhotoEnd: 41.8, p4Note: 40.2,
  hush1: 43.0, hush1End: 43.25,
  deal0: 43.25, deal1: 44.6,    // the editions are dealt out in a row
  push4: 46.8,                 // push into the correction
  end: 50.25,                   // press winds down
};

// Camera keyframes [t, [cx, cy, scale, rotDeg]]; world = table units, page 1400 x 1900 centred on its origin.
export const CAM = [
  [0.0, [-230, -520, 2.2, 0.0]],
  [2.9, [-200, -530, 2.15, 0.0]],
  [3.5, [-200, -530, 2.1, 0.0]],
  [5.8, [0, -560, 1.36, 0.0]],
  [8.2, [0, -550, 1.34, 0.0]],
  [9.9, [225, -90, 1.95, 0.0]],
  [12.6, [225, -92, 1.98, 0.0]],
  [13.5, [0, -150, 0.92, 0.0]],
  [14.3, [0, -240, 1.0, 0.0]],
  [19.2, [0, -250, 1.07, 0.0]],
  [20.7, [0, 180, 1.0, 0.0]],
  [21.8, [0, 1135, 1.36, 0.0]],
  [24.6, [0, 1140, 1.44, 0.0]],
  [25.5, [0, -380, 1.30, 0.0]],      // whip back to the page, arriving on the stamp
  [26.3, [0, -330, 1.26, 0.0]],
  [28.0, [0, -235, 1.12, 0.0]],
  [34.0, [0, -215, 1.16, 0.0]],
  [35.0, [225, -92, 2.0, 0.0]],
  [36.6, [225, -92, 2.04, 0.0]],
  [37.2, [0, -130, 0.96, 0.0]],
  [38.4, [0, -520, 1.22, 0.0]],
  [40.6, [0, -470, 1.5, 0.0]],
  [42.6, [0, -440, 1.3, 0.0]],
  [43.4, [-300, -300, 0.9, 0.0]],
  [44.6, [-2250, -80, 0.30, 0.0]],
  [47.0, [-2250, -80, 0.31, 0.0]],
  [48.6, [0, -690, 1.3, 0.0]],
  [52.6, [0, -700, 1.22, 0.0]],
];

// Headlines (letters excluding spaces get one slug each)
export const HL = {
  h1: ['FIRE AT', 'CANDLE MILL'],
  h2: ['MILL FIRE:', 'THREE HURT'],
  h3: ['IT WAS', 'THE OVEN'],
};
const nlet = a => a.join('').replace(/\s/g, '').length;
export const N = { h1: nlet(HL.h1), h2: nlet(HL.h2), h3: nlet(HL.h3), wrong: 'WE WERE WRONG'.replace(/\s/g, '').length };

export const PRE = 'HARBOUR BOARD DEFERS PIER VOTE  *  THREE HURT AT MILL SAYS WIRE  *  ';
export const MSG = 'NO FIRE AT MILL. HOLD THE PRESS.';
// Sound events derived from the same numbers (the mixer reads timeline.json)
export function events() {
  const ev = [];
  const e = (t, type, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
  for (let i = 0; i < N.h1; i++) e(T.p1Head + i * T.p1HeadDt, 'slug', { i, big: 1 });
  e(T.p1Mast, 'rule'); e(T.p1Rules, 'rule'); e(T.p1Rules + 0.5, 'rule');
  for (const [a, b, d] of [[T.p1Lead, T.p1Lead + 1.4, 0.07], [T.p1Body, T.p1Body + 1.6, 0.09]]) for (let t = a, k = 0; t < b; t += d, k++) e(t, 'line', { k });
  e(T.p1PhotoEnd - 3.5, 'develop', { d: 3.8 });
  e(T.p1Cap, 'cap');
  e(T.p2Drop, 'whoosh'); e(T.p2Land, 'slap');
  for (let i = 0; i < N.h2; i++) e(T.p2Head + i * T.p2HeadDt, 'slug', { i, big: 1 });
  for (let t = T.p2Body, k = 0; t < T.p2Body + 1.2; t += 0.08, k++) e(t, 'line', { k });
  e(T.p2Photo, 'develop', { d: 2.6 });
  e(T.p2Extra, 'stamp', { small: 1 });
  e(T.bell, 'phone'); e(T.bell + 1.55, 'phone');
  const msg = MSG;
  for (let i = 0; i < msg.length; i++) if (msg[i] !== ' ') e(T.tape0 + (T.tape1 - T.tape0) * i / msg.length, 'key', { i });
  e(T.stamp, 'stamp', { big: 1 });
  e(T.edition2, 'rule');
  for (let i = 0; i < N.h2; i++) e(T.pull0 + i * T.pullDt, 'lift', { i });
  for (let i = 0; i < N.h3; i++) e(T.fix0 + i * T.fixDt, 'slug', { i, big: 1 });
  e(T.fixDeck, 'cap');
  e(T.morph0, 'develop', { d: 3.2 });
  e(T.fixCap, 'cap');
  e(T.p4Drop, 'whoosh'); e(T.p4Land, 'slap');
  for (let i = 0; i < N.wrong; i++) e(T.p4Head + i * T.p4HeadDt, 'slug', { i, big: 1 });
  e(T.p4Head + 12 * T.p4HeadDt + 0.2, 'rule');
  for (let t = T.p4Body, k = 0; t < T.p4Body + 1.3; t += 0.08, k++) e(t, 'line', { k });
  e(T.p4Photo, 'develop', { d: 3.0 });
  e(T.p4Note, 'cap');
  for (let i = 0; i < 3; i++) e(T.deal0 + i * 0.28, 'deal', { i });
  e(T.push4 - 0.1, 'whoosh');
  return ev.sort((a, b) => a.t - b.t);
}
export const EV = events();

// Score sections (bars of 2 s). Silences are real: no music, no bed in [hush0, stamp) and [hush1, hush1End).
export const MUSIC = { in: 4.0, hush0: T.hush0, stamp: T.stamp, back: 26.0, hush1: T.hush1, back1: T.hush1End, out: 50.0 };
