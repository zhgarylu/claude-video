// One timeline for picture, type and sound: line starts come from the voice (voices/dur.json); legs, tags and camera moves are offsets from a line start.
export const BPM = 100, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const EV = [];
export const ev = (t, type, v = 1, extra = {}) => EV.push({ t: +t.toFixed(3), type, v, ...extra });
export const LINES = await (await fetch('lines.json')).json();
export const DURS = await (await fetch('voices/dur.json')).json();
const GAP = { h1: .4, l2: .3, l3: .3, l4: .3, l5: .3, l6: .3, l7: .3, l8: .3, l9: .4, l10: .3, l11: 0 };
export const S = {}, E = {}; let t = .5;
for (const l of LINES) { S[l.id] = t; E[l.id] = t + DURS[l.id]; t += DURS[l.id] + GAP[l.id]; }
export const DUR = +(E.l11 + 2.6).toFixed(2);
