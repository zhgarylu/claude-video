// Versus Screen film from data.json: one timeline for picture, camera, hit-stop and sound. 120 BPM, one bar = 2 s, 28 bars = 56 s.
// ---------------------------------------------------------------- the two contenders and the rounds: every number and word comes from data.json (tools/versus/make.py writes it)
export const D = await (await fetch('data.json')).json();
export const A = { id: 'A', ...D.a }, B = { id: 'B', ...D.b };
const money = (r, v) => (r.prefix || '') + (Number.isInteger(v) ? v : +v.toFixed(2)) + (r.suffix || '');
export const ROUNDS = D.rounds.map((r, i) => ({
  n: i + 1, name: r.name, rule: r.rule, low: !!r.low, cap: r.cap, a: r.a, b: r.b, max: r.max, scale: r.scale,
  fmt: r.labels ? (v => r.labels[Math.round(v)]) : (v => money(r, Math.round(v * 100) / 100)),
  dfmt: r.diff ? (d => r.diff.replace('{d}', money({ ...r, prefix: '', suffix: '' }, d))) : (d => '+' + money(r, d)),
}));
export const NR = ROUNDS.length;
export const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT, DUR = 12 + 8 * NR + 12;
export const EV = [];      // sound events {t, type, v, ...}: main.js exports them, mix.py reads them (events.json)
export const HITS = [];    // camera / hit-stop events (each also a sound event)
export const ev = (t, type, v = 1, x = {}) => EV.push({ t: +t.toFixed(3), type, v, ...x });
// hit: a sound event that also kicks the camera. kz = zoom punch, sh = shake px, stop = frames of hit-stop (at 24 fps), fx = focus point for the punch
export const hit = (t, type, o = {}) => { HITS.push({ t, type, kz: 0.03, sh: 6, stop: 0, ...o }); ev(t, type, o.v ?? 1, { ...(o.pan !== undefined ? { pan: o.pan } : {}), ...(o.k !== undefined ? { k: o.k } : {}), ...(o.win ? { win: o.win } : {}) }); };

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
  v: { wipe: 12 + 8 * NR - 0.3, head: 12 + 8 * NR, rows: [0.75, 1.25, 1.75, 2.25].slice(0, NR).map(x => 12 + 8 * NR + x), score: 12 + 8 * NR + 3, out: 12 + 8 * NR + 4.5, win: 12 + 8 * NR + 5, chip1: 12 + 8 * NR + 6, chip2: 12 + 8 * NR + 6.5, close: 12 + 8 * NR + 11.4 },
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
