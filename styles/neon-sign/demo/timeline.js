// One timeline for picture, sound and subtitles. Plain ESM, no DOM: imported by the page and by node tools (export_tl.mjs → timeline.json).
// Grid: 72 BPM, 4/4 → beat 0.8333 s, bar 3.3333 s. Key hits sit on beats (cuecheck.py verifies).
export const BPM = 72, BEAT = 60 / BPM, BAR = BEAT * 4;
export const DUR = 54.0;

export const T = {
  tick: 1.2, catch: 1.6, fail: 2.0, hold: 3.0,
  pull0: 5.0, pull1: 9.2,                      // pull-back from the first tube to the whole sign
  frame0: 5.0, frameEnd: 11.0, bowl: 7.0, bowlDur: 1.0, lettersFrom: 8.3333, letterGap: 0.4167, letterDur: 0.7, open: 10.0, openDur: 0.9,
  pan0: 12.0, off24: 15.0, offBar: 17.5, offHotel: 20.0, ret0: 20.5, ret1: 23.3,
  eFlick: 23.4, lDie0: 24.5, lDead: 27.5, push0: 23.4, macro0: 28.0, macro1: 31.5,
  blackout: 33.3333, restart: 35.8333,
  tilt0: 37.5, tilt1: 40.5, walk0: 38.2, walk1: 46.3, step: 0.52,
  dawn0: 43.5, dawn1: 49.0, rain0: 21.0, rain1: 44.0, rain2: 48.0,
  hand0: 48.4, breaker: 50.0,
};

// narration: the owner, dry, close. `t` = start of speech.
export const VO = [
  { id: 'v1', t: 5.6, text: 'I light it every evening.' },
  { id: 'v2', t: 8.9, text: 'Tube by tube.' },
  { id: 'v3', t: 13.6, text: 'By midnight, the street is dark.' },
  { id: 'v4', t: 25.1, text: 'Then one piece goes out.' },
  { id: 'v5', t: 36.4, text: 'I left it.' },
  { id: 'v6', t: 40.7, text: 'The last light on Pell Street.' },
];

// hum level over time (0..1) = how much glass is lit; keyframes [t, level]
export const HUM = [[0, .03], [1.5, .03], [1.6, .14], [1.95, .14], [2.0, .03], [2.95, .03], [3.0, .16], [5, .22], [11, .62], [12, .76], [15, .76], [15.06, .64],
  [17.5, .64], [17.56, .5], [20, .5], [20.06, .34], [27.5, .34], [27.56, .3], [33.33, .3], [33.4, 0], [35.8, 0], [35.9, .05], [37.6, .3], [48, .3], [50, .24], [50.02, .0]];

// sound events: {t, type, ...}
export const EV = [
  { t: T.tick, type: 'tick' },
  { t: T.catch, type: 'crackle', dur: .2, g: .6 }, { t: 1.78, type: 'sputter', g: .5 },
  { t: 2.9, type: 'tick' }, { t: T.hold, type: 'crackle', dur: .3, g: .6 },
  { t: T.frame0, type: 'crackle', dur: 6.0, g: .8 },
  { t: T.bowl, type: 'relay' }, { t: T.bowl, type: 'crackle', dur: T.bowlDur, g: .7 },
  ...Array.from({ length: 7 }, (_, i) => ({ t: T.lettersFrom + i * T.letterGap, type: 'crackle', dur: T.letterDur, g: .55 })),
  { t: T.lettersFrom, type: 'relay' }, { t: T.open, type: 'crackle', dur: T.openDur, g: .45 },
  { t: T.off24, type: 'thump' }, { t: T.offBar, type: 'thump' }, { t: T.offHotel, type: 'thump', big: 1 },
  { t: 20.35, type: 'whoosh' },
  { t: 23.65, type: 'sputter' }, { t: 24.15, type: 'sputter' }, { t: 24.9, type: 'sputter' }, { t: 25.5, type: 'sputter' }, { t: 26.2, type: 'sputter' }, { t: 26.8, type: 'sputter', g: .8 },
  { t: T.lDead, type: 'dead' }, { t: 30.6, type: 'sputter', g: .4 }, { t: 32.2, type: 'sputter', g: .35 },
  { t: T.blackout, type: 'blackout' },
  { t: T.restart, type: 'thump', big: 1 }, { t: T.restart + .05, type: 'relay' }, { t: T.restart + .05, type: 'crackle', dur: 1.9, g: .8 },
  { t: T.breaker - 1.55, type: 'hand' }, { t: T.breaker, type: 'breaker' },
];
// footsteps of the passer-by (alternating feet), puddle splashes every other step
for (let k = 0, t = T.walk0 + .3; t < T.walk1 - .2; k++, t += T.step) EV.push({ t, type: 'step', pan: k % 2 ? .25 : -.25, splash: k % 3 === 1 });

// music: section gates (seconds) the mixer uses; the picture does not need them
export const MUSIC = { start: 5.0, gate1: 20.0, back1: 23.3333, gate2: 33.3333, back2: 35.8333, dawn: 43.3333, end: 50.0 };
