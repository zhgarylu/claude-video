// One timeline for picture, score and foley. Times in seconds. mix.py reads these through events.json.
export const DUR = 52;
export const BPM = 108;                    // 3/4
export const BEAT = 60 / BPM, BAR = BEAT * 3, EIGHTH = BEAT / 2;
export const bar = n => n * BAR;           // start of bar n (bar 0 = 0 s)
export const DRAW = 1 / 12;                // the wool is moved on twos

// voice starts (the voice files come from out/voice/, durations in dur.json)
export const VOICE = [
  { id: 'v1', t: 0.55 }, { id: 'v2', t: 3.6 }, { id: 'v3', t: 13.5 }, { id: 'v4', t: 20.2 },
  { id: 'v5', t: 28.5 }, { id: 'v6', t: 36.9 }, { id: 'v7', t: 42.3 },
];

// subtitle pieces (a piece is held >= max(1.8, speech + 0.6) s)
export const CAPS = [
  { t0: 0.5, t1: 3.3, text: 'A handful of wool is mostly air.' },
  { t0: 3.55, t1: 5.85, text: 'A felting needle changes that.' },
  { t0: 5.95, t1: 8.78, text: 'Its tiny barbs catch a few fibres on every poke,' },
  { t0: 8.78, t1: 11.9, text: 'and drag them in, where they tangle and stay.' },
  { t0: 13.45, t1: 15.6, text: 'Forty pokes, and the cloud is a ball.' },
  { t0: 15.6, t1: 18.3, text: 'Four hundred, and it holds its shape.' },
  { t0: 20.1, t1: 21.9, text: 'A second ball becomes a head.' },
  { t0: 21.9, t1: 23.7, text: 'A cone becomes a beak.' },
  { t0: 23.7, t1: 26.4, text: 'The wings are flat layers, pressed on.' },
  { t0: 28.45, t1: 30.3, text: 'Colour goes in the same way.' },
  { t0: 30.3, t1: 34.0, text: 'Where two shades meet, the needle blends them, and there is no edge.' },
  { t0: 36.8, t1: 39.0, text: 'Last, two small eyes.' },
  { t0: 42.25, t1: 46.3, text: 'Four thousand pokes. And what was air is looking back.' },
];

// the poke counter tag (each number is held >= 2.5 s)
export const TAGS = [
  { t0: 3.889, t1: 13.333, text: '0 pokes' }, { t0: 13.333, t1: 15.833, text: '40 pokes' }, { t0: 15.833, t1: 21.667, text: '400 pokes' },
  { t0: 21.667, t1: 27.5, text: '1,200 pokes' }, { t0: 27.5, t1: 34.444, text: '2,500 pokes' }, { t0: 34.444, t1: 42.5, text: '3,800 pokes' },
  { t0: 42.5, t1: 51.2, text: '4,000 pokes' },
];

// needle work: windows of poke groups placed on the eighth-note grid (target: which wool is being poked)
const E = EIGHTH;
const run = (b0, e0, n, target) => Array.from({ length: n }, (_, i) => ({ t: bar(b0) + (e0 + i) * E, target }));
export const POKES = [
  // the cloud: groups of three on beats 2-3, then non-stop
  ...run(2, 3, 3, 'body'), ...run(3, 3, 3, 'body'),
  ...run(4, 0, 3, 'body'), ...run(4, 3, 3, 'body'), ...run(5, 0, 3, 'body'), ...run(5, 3, 3, 'body'),
  ...run(6, 0, 3, 'body'), ...run(6, 3, 3, 'body'), ...run(7, 0, 3, 'body'),
  // head joined, beak, wings
  ...run(13, 2, 3, 'neck'), ...run(14, 0, 3, 'beak'), ...run(14, 3, 3, 'wingL'), ...run(15, 0, 3, 'wingR'), ...run(15, 3, 2, 'wingR'),
  // the blend
  ...run(17, 3, 3, 'breast'), ...run(18, 0, 3, 'breast'), ...run(18, 3, 3, 'breast'), ...run(19, 0, 3, 'breast'), ...run(19, 3, 3, 'breast'), ...run(20, 0, 3, 'breast'), ...run(20, 3, 3, 'breast'),
  // eyes
  { t: 37.78, target: 'eyeL' }, { t: 38.33, target: 'eyeR' },
];

// shots (for sound and for the wipe design)
export const WIPES = [[19.17, 20.17], [35.56, 36.67]];

// events for the mixer, exported by core/render/events.mjs
const ev = [];
POKES.forEach(p => ev.push({ t: p.t, type: 'poke', target: p.target }));
ev.push(
  ...TAGS.map(g => ({ t: g.t0, type: 'tag' })),
  { t: 3.3, type: 'needle_in' }, { t: 1.667, type: 'land' },
  { t: 17.22, type: 'bounce' }, { t: 17.78, type: 'bounce' }, { t: 18.33, type: 'bounce_small' },
  { t: 20.28, type: 'roll', dur: 0.83 }, { t: 21.667, type: 'hop' },
  { t: 23.056, type: 'beak' }, { t: 23.89, type: 'wing' }, { t: 24.72, type: 'wing' },
  { t: 29.44, type: 'tuft' }, { t: 30.0, type: 'blend', dur: 5.0 },
  { t: 37.5, type: 'bead' }, { t: 38.06, type: 'bead' },
  { t: 40.56, type: 'blink' }, { t: 41.67, type: 'peep' },
  { t: 19.17, type: 'wipe' }, { t: 35.56, type: 'wipe' },
  { t: 45.83, type: 'needle_down' }, { t: 49.72, type: 'lamp_off' },
);
VOICE.forEach(v => ev.push({ t: v.t, type: 'voice', id: v.id }));
CAPS.forEach(c => ev.push({ t: c.t0, t1: c.t1, type: 'cap', text: c.text }));
ev.push({ t: 0.14, type: 'lamp_on' });
export const EV = ev.sort((a, b) => a.t - b.t);
export const SILENCE = [38.7, 41.6];   // music out
