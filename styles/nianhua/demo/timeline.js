// timeline.js: the single source of truth. Scene times, voice starts, pass schedule, subtitles and sound events.
export const DUR = 56;
export const BPM = 96, BEAT = 60 / BPM;

// voice lines: start (s) and measured length (s) from out/voice/dur.json (mix.py asserts they still match)
export const VO = {
  l01: [1.2, 4.524, 'A New Year print begins as a drawing, carved backwards into a plank of pear wood.'],
  l02: [6.5, 1.811, 'One block holds every line.'],
  l03: [11.0, 2.173, 'Then comes colour, one block at a time.'],
  l04: [13.5, 2.331, 'Peach for the skin. Yellow for the gold.'],
  l05: [17.3, 2.869, 'Then green for the lotus. Indigo for the water.'],
  l06: [21.2, 3.094, 'No block fits quite perfectly. That is the charm.'],
  l07: [25.2, 4.303, 'Red goes last. A carp for surplus. A lotus for year after year.'],
  l08: [31.5, 1.98, 'But a wish needs a guard.'],
  l09: [34.0, 3.938, 'So one block is printed twice, and the pair face each other.'],
  l10: [40.9, 1.706, 'Then someone opens the door.'],
  l11: [45.0, 1.359, 'And the old year tears.'],
  l12: [47.8, 3.673, 'The paper was only borrowed. The block stays on the bench.'],
  l13: [52.25, 1.601, 'Next year, it prints again.'],
};

// scenes. Everything that is struck lands on the beat grid of the score: G0 + n * BEAT with G0 = 13.5 (the first colour block).
export const G0 = 13.5;
export const beatT = (n) => +(G0 + n * BEAT).toFixed(4);
export const S = { A: 1.0, B: 10.375, C: 30.375, D: 44.125, E: 47.0, F: 50.375 };

// scene A (the key block): 1.0 = beat -20
export const A = {
  thump: 1.0, titleIn: 2.875, ink0: 3.5, ink1: 5.375, paper: 6.0, rub0: 6.625, rub1: 8.5, flip0: 9.125, flip1: 9.75, travel0: 9.25, travel1: 10.375,
};

// scene B: colour passes. sheet pass index = 1 + i (key is pass 0)
export const P = [
  { pass: 'peach', blockIn: 12.4, press: 13.5, dur: 1.0, dir: 0 },
  { pass: 'yellow', blockIn: 13.9, press: 14.75, dur: 1.0, dir: Math.PI / 2 },
  { pass: 'green', blockIn: 16.35, press: 17.25, dur: 1.0, dir: Math.PI },
  { pass: 'indigo', blockIn: 18.2, press: 19.125, dur: 1.0, dir: -Math.PI / 2 },
  { pass: 'red', blockIn: 24.1, press: 26.0, dur: 1.3, dir: .6 },
];
export const REGISTER_ZOOM = [21.4, 25.0];     // look closely at the mis-registration
export const RING_CARP = [26.7, 28.0], RING_LOTUS = [28.0, 29.5];

// scene C: the door
export const C = {
  wipe0: 30.375, wipe1: 31.0, paste0: 31.625, paste1: 33.4, layL: 33.5, layR: 33.8125, pass: [34.125, 34.75, 35.375, 36.0, 36.625], passDur: 0.55,
  lintel: 37.875, coupL: 38.5, coupR: 39.125, seal0: 39.75, seal1: 40.375, silence: [42.6, 44.125], crack: 43.4,
};
// scene D: crackers, the doors open
export const D = { burst: 44.125, open0: 45.0, open1: 46.8, tear: 45.375, dolly0: 45.0, dolly1: 47.4 };
// scene F: the bench again (same fields as A: drawA is reused with these times)
export const F = { wipe0: 50.375, wipe1: 51.0, titleIn: 50.5, ink0: 51.3, ink1: 52.1, paper: 52.875, rub0: 53.0, rub1: 53.6, flip0: 53.7, flip1: 54.125, travel0: 99, travel1: 99, thump: 54.125 };

// subtitle cues (one per voice line, held at least speech + 0.6 s)
export const SUBS = Object.entries(VO).map(([id, [t0, d, text]]) => ({ id, t0: t0 - 0.05, t1: t0 + d + 0.7, text }));

// sound events for the mixer
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
// scene A
ev(A.thump, 'block_drop');
ev(A.ink0, 'brayer', { dur: A.ink1 - A.ink0 });
ev(A.titleIn, 'slap', { v: .6 });
ev(A.paper, 'paper_land');
ev(A.rub0, 'baren', { dur: A.rub1 - A.rub0 });
ev(A.flip0, 'peel', { dur: A.flip1 - A.flip0 });
ev(A.flip1, 'paper_land', { v: .5 });
ev(9.45, 'wipe', { dur: .85, v: .7 });
// scene B
P.forEach((p, i) => {
  ev(p.blockIn, 'block_set', { v: .7 });
  ev(p.blockIn + 0.35, 'brayer', { dur: .55, v: .6 });
  ev(p.press, 'baren', { dur: p.dur });
  ev(p.press + p.dur, 'press_end', { i, v: i === 4 ? 1.4 : 1 });
});
// scene C
ev(C.wipe0, 'wipe', { dur: C.wipe1 - C.wipe0 });
ev(C.paste0, 'paste', { dur: C.paste1 - C.paste0 });
ev(C.layL, 'slap', { v: 1 }); ev(C.layR, 'slap', { v: 1 });
C.pass.forEach((t, i) => { ev(t, 'baren', { dur: C.passDur, v: .7 }); ev(t + C.passDur, 'press_end', { i, v: .8 }); });
ev(C.lintel, 'slap', { v: 1.1 }); ev(C.coupL, 'slap', { v: .9 }); ev(C.coupR, 'slap', { v: .9 });
ev(C.seal0, 'paste', { dur: .6 }); ev(C.seal1, 'slap', { v: .7 });
// scene D
ev(D.burst, 'crackers', { dur: 1.7 });
ev(D.open0, 'hinge', { dur: D.open1 - D.open0 });
ev(D.tear, 'tear', {});
ev(D.open1, 'door_stop', {});
// scene F
ev(F.wipe0, 'wipe', { dur: F.wipe1 - F.wipe0 });
ev(F.ink0, 'brayer', { dur: F.ink1 - F.ink0, v: .8 });
ev(F.paper, 'paper_land', { v: .8 });
ev(F.rub0, 'baren', { dur: F.rub1 - F.rub0, v: .5 });
ev(F.flip0, 'peel', { dur: F.flip1 - F.flip0 });
ev(F.flip1, 'block_drop', { v: 1.2 });
ev(F.flip1, 'paper_land', { v: .9 });

// section markers for the mixer
for (const [id, t] of Object.entries(S)) ev(t, 'sec', { id });
