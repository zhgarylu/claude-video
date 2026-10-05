// "Kettle Clash" (Versus Screen demo): one timeline for picture, camera, hit-stop and sound. 120 BPM, one bar = 2 s, 28 bars = 56 s.
export const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT, DUR = 56;
export const EV = [];      // sound events {t, type, v, ...}: main.js exports them, mix.py reads them (events.json)
export const HITS = [];    // camera / hit-stop events (each also a sound event)
export const ev = (t, type, v = 1, x = {}) => EV.push({ t: +t.toFixed(3), type, v, ...x });
// hit: a sound event that also kicks the camera. kz = zoom punch, sh = shake px, stop = frames of hit-stop (at 24 fps), fx = focus point for the punch
export const hit = (t, type, o = {}) => { HITS.push({ t, type, kz: 0.03, sh: 6, stop: 0, ...o }); ev(t, type, o.v ?? 1, { ...(o.pan !== undefined ? { pan: o.pan } : {}), ...(o.k !== undefined ? { k: o.k } : {}), ...(o.win ? { win: o.win } : {}) }); };

// ---------------------------------------------------------------- the two contenders and the four rounds (all numbers live here; every on-screen figure is derived from them)
export const A = { id: 'A', name: 'BRISK B5', cls: 'STEEL', spec: '2200 W · 1.7 L', hue: '#ff4d3a', deep: '#8c1b12', dark: '#2a0e12' };
export const B = { id: 'B', name: 'PEBBLE P2', cls: 'GLASS', spec: '1800 W · 1.2 L', hue: '#25d6ee', deep: '#0b6070', dark: '#08222b' };
const KJ = 4186;                                                       // J / (kg K)
const boilSec = (watts) => Math.round(KJ * 1 * 80 / (watts * 0.9));    // 1 kg of water, 20 -> 100 C, 90 % efficient: 2200 W -> 169 s, 1800 W -> 207 s
export const ROUNDS = [
  { n: 1, name: 'PRICE', rule: 'LOWER WINS', low: true, cap: 'SHELF PRICE · SAME SHOP · TAX INCLUDED', a: 39, b: 54, max: 60, scale: ['$0', '$60'], fmt: v => '$' + Math.round(v), dfmt: d => '$' + d + ' LESS' },
  { n: 2, name: 'BOIL TIME', rule: 'LOWER WINS', low: true, cap: '1 LITRE OF WATER · 20 TO 100 °C · LID CLOSED', a: boilSec(2200), b: boilSec(1800), max: 240, scale: ['0 s', '240 s'], fmt: v => Math.round(v) + ' s', dfmt: d => d + ' s FASTER' },
  { n: 3, name: 'KEEP WARM', rule: 'HIGHER WINS', low: false, cap: 'WATER TEMPERATURE AFTER 2 HOURS · LID CLOSED · ROOM 20 °C', a: 54, b: 68, max: 100, scale: ['0 °C', '100 °C'], fmt: v => Math.round(v) + ' °C', dfmt: d => d + ' °C WARMER' },
  { n: 4, name: 'CAPACITY', rule: 'HIGHER WINS', low: false, cap: 'MAX FILL LINE · LITRES', a: 1.7, b: 1.2, max: 2, scale: ['0 L', '2 L'], fmt: v => v.toFixed(1) + ' L', dfmt: d => d.toFixed(1) + ' L MORE' },
];
for (const r of ROUNDS) {                                              // the verdict of a round follows from its numbers, never from a flag
  r.win = (r.low ? r.a < r.b : r.a > r.b) ? 'A' : 'B';
  r.diff = +Math.abs(r.a - r.b).toFixed(2);
}
export const SCORE = { A: ROUNDS.filter(r => r.win === 'A').length, B: ROUNDS.filter(r => r.win === 'B').length };   // 3 - 1
export const WINNER = SCORE.A > SCORE.B ? 'A' : 'B';

// ---------------------------------------------------------------- sections
export const SK = 240;                                                 // slash lean in px over the frame height
export const T = {
  sel: { title: 0.0, p1: [0.5, 1.0, 1.5], lock1: 2.0, p2: [2.5, 3.0], lock2: 3.5, collapse: 5.1 },
  ent: { slash: 5.5, a0: 6.0, aLand: 6.25, aPlate: 6.5, b0: 7.0, bLand: 7.25, bPlate: 7.5, riser0: 7.0, mute0: 7.75, vs: 8.5, hud: 9.0, plateOut: 9.75, cd: [10.0, 10.5, 11.0], go: 11.5 },
  R0: (n) => 12 + 8 * (n - 1),
  // offsets inside a round
  r: { banner: 0.0, name: 0.5, rule: 0.75, cap: 1.0, fill0: 1.5, steps: 16, step: 0.125, hit: 4.0, life: 4.25, pip: 4.5, wipe: 7.7, wipeLen: 0.4 },
  v: { wipe: 43.7, head: 44.0, rows: [44.75, 45.25, 45.75, 46.25], score: 47.0, out: 48.5, win: 49.0, chip1: 50.0, chip2: 50.5, close: 55.4 },
};
const S = T.sel, E = T.ent, R = T.r, V = T.v;

// ---------------------------------------------------------------- events: section markers
ev(0, 'sec', 1, { name: 'select' }); ev(E.slash, 'sec', 1, { name: 'enter' }); ev(E.vs, 'sec', 1, { name: 'fight' }); ev(V.wipe, 'sec', 1, { name: 'verdict' });
// select screen
hit(S.title, 'slam', { kz: 0.03, sh: 5 });
for (const t of S.p1) ev(t, 'tick', 1, { k: 0, pan: -0.4 });
for (const t of S.p2) ev(t, 'tick', 1, { k: 3, pan: 0.4 });
hit(S.lock1, 'lock', { kz: 0.025, sh: 4, pan: -0.4 }); hit(S.lock2, 'lock', { kz: 0.025, sh: 4, pan: 0.4, v: 1.1 });
ev(S.collapse, 'whoosh', 0.7);
// entrance
hit(E.slash, 'crack', { kz: 0.05, sh: 12 });
ev(E.a0, 'whoosh', 0.8, { pan: -0.7 }); hit(E.aLand, 'land', { kz: 0.035, sh: 10, pan: -0.5 }); hit(E.aPlate, 'plate', { kz: 0.01, sh: 3, pan: -0.5 });
ev(E.b0, 'whoosh', 0.8, { pan: 0.7 }); hit(E.bLand, 'land', { kz: 0.035, sh: 10, pan: 0.5 }); hit(E.bPlate, 'plate', { kz: 0.01, sh: 3, pan: 0.5 });
ev(E.riser0 - .4, 'riser', 1, { dur: E.mute0 - E.riser0 + .4 });
hit(E.vs, 'vs', { kz: 0.09, sh: 30, stop: 3, v: 1.3 });
ev(E.hud, 'whoosh', 0.6);
E.cd.forEach((t, i) => hit(t, 'beep', { kz: 0.025 + 0.01 * i, sh: 4 + 2 * i, k: i }));
hit(E.go, 'go', { kz: 0.07, sh: 16, stop: 2, v: 1.1 });
// rounds
for (const rd of ROUNDS) {
  const s = T.R0(rd.n);
  hit(s + R.banner, 'banner', { kz: 0.04, sh: 8 });
  hit(s + R.name, 'slam', { kz: 0.04, sh: 8 }); hit(s + R.rule, 'sticker', { kz: 0.015, sh: 3 });
  ev(s + R.cap, 'whoosh', 0.35);
  for (let k = 1; k <= R.steps; k++) ev(s + R.fill0 + (k - 1) * R.step, 'fill', 1, { k, of: R.steps });
  const loser = rd.win === 'A' ? 'B' : 'A', lx = loser === 'A' ? 0.45 : -0.45;
  hit(s + R.hit, 'ko', { kz: 0.10, sh: 24, stop: 3, v: 1.2, pan: lx, fx: loser, win: rd.win, n: rd.n });
  hit(s + R.hit + 0.03, 'spark', { kz: 0, sh: 0, pan: lx });
  hit(s + R.life, 'chunk', { kz: 0.03, sh: 6, pan: lx });
  hit(s + R.pip, 'pip', { kz: 0.015, sh: 2, pan: rd.win === 'A' ? -0.45 : 0.45 });
  ev(s + R.wipe, 'sweep', 0.9);
}
// verdict
hit(V.head, 'banner', { kz: 0.05, sh: 10 });
V.rows.forEach((t, i) => { hit(t, 'row', { kz: 0.012, sh: 3 }); ev(t + 0.25, 'tickmark', 1, { pan: ROUNDS[i].win === 'A' ? -0.4 : 0.4 }); });
hit(V.score, 'score', { kz: 0.08, sh: 22, stop: 3, v: 1.2 });
ev(V.out, 'whoosh', 0.6);
hit(V.win, 'gong', { kz: 0.08, sh: 26, stop: 3, v: 1.4 });
hit(V.chip1, 'sticker', { kz: 0.015, sh: 3 }); hit(V.chip2, 'sticker', { kz: 0.015, sh: 3 });
hit(V.close - 0.1, 'close', { kz: 0, sh: 0 });
EV.sort((a, b) => a.t - b.t); HITS.sort((a, b) => a.t - b.t);
export const STOPS = HITS.filter(h => h.stop).map(h => ({ t: h.t, len: h.stop / 24 }));   // frame-skip hit-stop windows
