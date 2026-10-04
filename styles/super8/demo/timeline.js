// One timeline for picture, foley, score and checks. 3/4 at 108 BPM: beat 0.5556 s, bar 1.6667 s, 34 bars = 56.667 s.
export const BPM = 108, BEAT = 60 / BPM, BAR = BEAT * 3, DUR = BAR * 34;
const b = n => +(n * BAR).toFixed(4);          // start of bar n (0-based)
export const SHOTS = [
  { id: 'card',     t0: b(0),  t1: b(3) },       // 0 - 5.0
  { id: 'street',   t0: b(3),  t1: b(8) },       // 5.0 - 13.33
  { id: 'beach',    t0: b(8),  t1: b(15) },      // 13.33 - 25.0
  { id: 'medium',   t0: b(15), t1: b(18) },      // 25 - 30
  { id: 'golden',   t0: b(18), t1: b(22) },      // 30 - 36.67
  { id: 'handover', t0: b(22), t1: b(26) },      // 36.67 - 43.33
  { id: 'dad',      t0: b(26), t1: b(30) },      // 43.33 - 50
  { id: 'burn',     t0: b(30), t1: b(31.5) },    // 50 - 52.5
  { id: 'end',      t0: b(31.5), t1: DUR },      // 52.5 - 56.67
];
export const SPLICES = [{ t: b(3), amp: .6 }, { t: b(8), amp: 1 }, { t: b(15), amp: .5 }, { t: b(18), amp: .7 }];
// hit points the music and foley lock to (all on the beat or half-beat grid)
export const T = {
  stamp: b(1), thunk: +(b(3) + 1.5 * BEAT).toFixed(4), whip: +(b(5) + 2.5 * BEAT).toFixed(4), whipEnd: b(6),
  silence0: b(22), silence1: b(23), thumb0: b(23), thumb1: +(b(23) + 1.5 * BEAT).toFixed(4),
  whip2: b(25), land: b(26), enter: +(b(26) + 1.5 * BEAT).toFixed(4), burn0: b(30), card2: b(31.5), stamp2: b(32.5), endNote: b(32.5),
};
