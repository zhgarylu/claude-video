// One timeline for picture, score and foley. Times in seconds. mix.py reads these through events.json.
export const DUR = 50.8;
export const BPM = 84;

// shots (cuts happen under a clay wipe or on an action)
export const SHOTS = [
  { id: 'worry', t0: 0, t1: 6.1 },
  { id: 'night', t0: 6.1, t1: 16 },
  { id: 'strain', t0: 16, t1: 24.1 },
  { id: 'enter', t0: 24.1, t1: 29.7 },
  { id: 'poke', t0: 29.7, t1: 35.9 },
  { id: 'rise', t0: 35.9, t1: 42.3 },
  { id: 'loaf', t0: 42.3, t1: 46.2 },
  { id: 'pull', t0: 46.2, t1: 50.8 },
];

// captions (clay plates). Each is held at least chars/15 + 1.5 s.
export const CAPS = [
  { id: 'c1', text: '3 a.m. Still the same size.', t0: 1.0, t1: 5.4 },
  { id: 'c2', text: 'It just needed a poke.', t0: 38.2, t1: 42.0 },
  { id: 'title', text: 'Proof.', t0: 46.6, t1: 50.8, big: true },
];

// sound events: foley the mixer places exactly on the picture
export const EV = [
  { t: 1.0, type: 'plate' }, { t: 5.4, type: 'unplate' },
  { t: 3.0, type: 'blink' },
  { t: 5.7, type: 'wipe' }, { t: 23.7, type: 'wipe' },
  { t: 17.0, type: 'strain', dur: 1.4 }, { t: 18.5, type: 'slump' },
  { t: 20.0, type: 'strain', dur: 1.5 }, { t: 21.9, type: 'slump' },
  { t: 24.4, type: 'finger_in', dur: 2.6 },
  { t: 29.95, type: 'press' }, { t: 30.9, type: 'press_hold' },
  { t: 33.8, type: 'release' }, { t: 34.2, type: 'finger_out', dur: 1.2 },
  { t: 36.0, type: 'crouch' }, { t: 36.5, type: 'rise', dur: 0.8 }, { t: 37.55, type: 'land' },
  { t: 38.2, type: 'plate' }, { t: 42.0, type: 'unplate' },
  { t: 41.4, type: 'puff' }, { t: 42.1, type: 'bake_ding' },
  { t: 46.6, type: 'plate' },
];
export const SILENCE = [[28.6, 30.2], [31.4, 33.8]];   // music and bed drop out here
