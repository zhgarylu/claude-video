// One timeline for picture, type and sound: line starts come from the voice (voices/dur.json), gaps are set here.
export const BPM = 108, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const EV = [];                                   // sound events {t, type, v}: main.js pushes them once, up front; events.mjs exports them
export const ev = (t, type, v = 1, extra = {}) => EV.push({ t: +t.toFixed(3), type, v, ...extra });
export const LINES = await (await fetch('lines.json')).json();
export const DURS = await (await fetch('voices/dur.json')).json();
const GAP = { h1: .25, h2: 1.1, a1: .3, a2: .3, a3: .35, a4: 1.5, q1: 2.3, r1: .3, r2: .3, r3: .4, r4: 1.1, s1: .4, s2: .7, s3: 0 };
export const S = {}, E = {}; let t = .4;
for (const l of LINES) { S[l.id] = t; E[l.id] = t + DURS[l.id]; t += DURS[l.id] + GAP[l.id]; }
export const DUR = +(E.s3 + 3.0).toFixed(2);
// scenes: A hook, B scattering, C the purple question, R three reasons, S sunset
export const SC = { A: 0, B: S.a1 - .55, C: S.q1 - .55, R: S.r1 - .6, S: S.s1 - .6 };
export const SCENES = ['A', 'B', 'C', 'R', 'S'];
