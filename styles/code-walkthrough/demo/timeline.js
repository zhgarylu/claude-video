// One list of sound events for the mixer: main.js pushes while it builds the film (all in module scope, before READY), events.mjs exports it.
export const BPM = 88, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const EV = [];
export const ev = (t, type, v = 1, extra = {}) => EV.push({ t: +t.toFixed(3), type, v: +(+v).toFixed(3), ...extra });
