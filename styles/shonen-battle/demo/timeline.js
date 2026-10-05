// timeline.js: the single source of truth for "Round One: The Jar" (60 s, 120 BPM, bar = 2 s). Picture, sound and subtitles read this.
export const DUR = 60, BPM = 120, BEAT = 0.5, BAR = 2;
export const SHOTS = [
  { id: 'black', t0: 0, t1: 0.4 },
  { id: 'eyes', t0: 0.4, t1: 2.4 },
  { id: 'jar', t0: 2.4, t1: 4.5 },
  { id: 'wide', t0: 4.5, t1: 7.5 },
  { id: 'face', t0: 7.5, t1: 14.0 },
  { id: 'grip', t0: 14.0, t1: 19.0 },
  { id: 'stance', t0: 19.0, t1: 22.4 },
  { id: 'cut', t0: 22.4, t1: 25.0 },
  { id: 'slump', t0: 25.0, t1: 28.0 },
  { id: 'flash', t0: 28.0, t1: 34.0 },
  { id: 'charge', t0: 34.0, t1: 38.5 },
  { id: 'fist', t0: 38.5, t1: 41.0 },
  { id: 'lids', t0: 41.0, t1: 44.0 },
  { id: 'swing', t0: 44.0, t1: 44.125 },
  { id: 'hush', t0: 44.125, t1: 46.0 },
  { id: 'pop', t0: 46.0, t1: 47.85 },
  { id: 'fall', t0: 47.85, t1: 50.4 },
  { id: 'smile', t0: 50.4, t1: 52.0 },
  { id: 'floor', t0: 52.0, t1: 57.3 },
  { id: 'end', t0: 57.3, t1: 60.0 },
];
export const VO = [
  { id: 'v1', t: 1.0, dur: 3.1, who: 'narr', text: 'In every kitchen, one enemy has never been beaten.' },
  { id: 'v2', t: 8.0, dur: 3.899, who: 'narr', text: "Grandma's pickles. Sealed for three years. Dinner is in ten minutes." },
  { id: 'v3', t: 17.5, dur: 1.421, who: 'narr', text: 'Round one. Nothing.' },
  { id: 'v4', t: 21.0, dur: 2.844, who: 'narr', text: 'Round two. The floor gives way. The lid does not.' },
  { id: 'v5', t: 28.4, dur: 3.388, who: 'gran', text: "Don't fight it, Haru. Just let a little air in." },
  { id: 'v6', t: 47.7, dur: 2.751, who: 'narr', text: 'And the lid? It had only been waiting to be asked.' },
  { id: 'v7', t: 52.0, dur: 1.244, who: 'gran', text: 'Dinner is ready!' },
  { id: 'v8', t: 53.5, dur: 2.137, who: 'gran', text: 'Haru, what happened to the floor?' },
];
// camera shakes: [t, amplitude px, decay seconds]
export const SHAKES = [[5.0, 26, .5], [8.3, 8, .3], [14.0, 18, .4], [19.8, 34, 2.2], [20.2, 26, .6], [20.7, 24, .6], [21.2, 22, .6], [44.125, 60, .5], [44.208, 14, .25], [46.0, 34, .5], [55.5, 6, .3]];
export const RUNS = [[11.0, 14.0, 1, 7], [14.8, 15.6, 3, 8], [15.6, 17.4, 9, 4], [19.0, 19.8, 2, 8], [19.8, 24.0, 12, 3], [34.0, 44.0, 2, 10]];   // continuous tremble: t0, t1, from px, to px

// sound and cue events for the mixer
const E = [];
const ev = (t, type, o = {}) => E.push({ t: +t.toFixed(3), type, ...o });
for (const s of SHOTS.slice(1)) ev(s.t0, 'cut', { shot: s.id });
for (const v of VO) ev(v.t, 'vo', { id: v.id, dur: v.dur, who: v.who });
for (let k = 0; k < 5; k++) ev(0.1 + k * 1.0, 'tick');
for (const t of [25.2, 26.2, 27.2]) ev(t, 'tick');
ev(3.6, 'ting'); ev(18.4, 'ting'); ev(24.0, 'ting');
for (const t of [5.0, 8.3, 8.9, 14.0, 19.0]) ev(t, 'slam');
ev(5.0, 'boom', { v: 1 });
ev(14.8, 'creak'); ev(15.6, 'kiai', { v: .7, d: 1.7 }); ev(17.55, 'sigh');
ev(19.7, 'aura'); ev(19.8, 'kiai', { v: 1, d: 1.9 });
for (const [t, v] of [[20.0, 1], [20.45, .8], [20.9, .9], [21.5, .7], [22.0, .5]]) ev(t, 'crack', { v });
for (const t of [20.3, 20.8, 21.3, 21.9]) ev(t, 'debris');
ev(23.2, 'rumble'); ev(24.4, 'drip'); ev(26.3, 'drip');
ev(29.2, 'tap'); ev(29.9, 'tap'); ev(30.6, 'tap'); ev(30.8, 'airhint'); ev(31.6, 'airhint');
ev(33.9, 'whoosh');
ev(34.0, 'charge', { d: 9.8 });
ev(40.08, 'grab'); ev(43.4, 'hush');
ev(44.0, 'swish'); ev(44.125, 'boom', { v: 1.6 }); ev(44.3, 'tink'); ev(45.3, 'hiss', { d: .7 }); ev(46.0, 'pop');
ev(46.1, 'sparkle'); ev(46.6, 'sparkle'); ev(50.05, 'land');
ev(55.5, 'gulp'); ev(57.3, 'sting'); ev(57.3, 'slam');
export const EV = E.sort((a, b) => a.t - b.t);
