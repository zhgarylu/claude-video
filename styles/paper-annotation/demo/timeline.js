// One timeline: line starts come from the voice (voices/dur.json); every annotation is an offset from a line start.
export const BPM = 84, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const EV = [];
export const ev = (t, type, v = 1, extra = {}) => EV.push({ t: +t.toFixed(3), type, v, ...extra });
export const LINES = await (await fetch('lines.json')).json();
export const DURS = await (await fetch('voices/dur.json')).json();
const GAP = { p1: .5, p2: .4, p3: .4, p4: .5, p5: .4, p6: .4, p7: .4, p8: 0 };
export const S = {}, E = {}; let t = .6;
for (const l of LINES) { S[l.id] = t; E[l.id] = t + DURS[l.id]; t += DURS[l.id] + GAP[l.id]; }
export const DUR = +(E.p8 + 2.6).toFixed(2);
