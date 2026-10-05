// script.js: the timeline of "Five Hats and One Sock". One source for picture, sound and subtitles.
// Music: 6/8 jig, 120 bpm in quarter notes: one eighth = 0.25 s, a dotted-quarter beat = 0.75 s, a bar = 1.5 s. Every key time sits on the 0.75 s grid.
export const DUR = 60, BEAT = .75, BAR = 1.5;
export const T = { cut: 0, chart: 3.0, posters: 9.0, sail: 22.5, storm: 30.0, calm: 34.5, duck: 36.0, island: 42.0, dig: 44.25, chest: 45.75, shock: 46.5, feast: 48.0, tub: 52.5, hush: 55.5, end: 57.0 };
export const POSTER_T = [9.0, 11.25, 13.5, 15.75, 18.0];

// narration (voices/*.wav, Kokoro bm_george). dur = length of the wav, filled in by tools/export_tl.mjs from voices/dur.json
export const VO = [
  { id: 'v01', t: 0.45, text: 'Captain Pip lost a sock.' },
  { id: 'v02', t: 3.30, text: 'So he drew a map, and found a crew.' },
  { id: 'v03', t: 9.40, text: 'Pip, the captain.' },
  { id: 'v04', t: 11.65, text: 'Brisket, who cooks.' },
  { id: 'v05', t: 13.90, text: 'Longshanks, who navigates.' },
  { id: 'v06', t: 16.15, text: 'Dot, who looks out.' },
  { id: 'v07', t: 18.40, text: 'Barnacle, who fixes things.' },
  { id: 'v08', t: 20.85, text: 'Sometimes.' },
  { id: 'v09', t: 23.20, text: 'Nine long days across the Warm Wide Sea.' },
  { id: 'v10', t: 30.00, text: 'Then came a storm.' },
  { id: 'v11', t: 36.90, text: 'It was a duck. A very large, very hungry duck.' },
  { id: 'v12', t: 40.40, text: 'Brisket shared his lunch.' },
  { id: 'v13', t: 42.60, text: 'X marked the spot. Inside was one sock.' },
  { id: 'v14', t: 46.50, text: 'A left one.' },
  { id: 'v15', t: 52.90, text: 'The right one was drying on the tap.' },
];
export const DURS = { v01: 2.15, v02: 2.388, v03: 1.302, v04: 1.459, v05: 1.978, v06: 1.428, v07: 2.201, v08: 1.106, v09: 3.188, v10: 1.627, v11: 3.491, v12: 1.672, v13: 3.333, v14: 1.143, v15: 2.593 };
// burned-in narration boxes (and the .srt): hold >= 1.8 s and >= speech + 0.6 s
export function cues() {
  return VO.map((v, i) => { const d = DURS[v.id], nxt = VO[i + 1] ? VO[i + 1].t - .05 : DUR; return { t0: +(v.t - .05).toFixed(2), t1: +Math.min(nxt, Math.max(v.t + d + .6, v.t - .05 + 1.8)).toFixed(2), text: v.text }; });
}

// hand-lettered sound effects (screen space). t0..t0+dur
export const SFX = [
  { id: 'sfx.one', text: 'ONE SOCK!', t0: 0.6, dur: 2.05, x: 560, y: 150, size: 130, rot: -.07, fill: '#f0503e', shadow: '#fff2d0' },
  { id: 'sfx.p0', text: 'THWACK!', t0: 9.2, dur: 2.0, x: 280, y: 92, size: 66, rot: -.08, fill: '#ffc531', shadow: '#f0503e' },
  { id: 'sfx.p1', text: 'WHAM!', t0: 11.45, dur: 2.0, x: 620, y: 92, size: 66, rot: .06, fill: '#ffc531', shadow: '#f0503e' },
  { id: 'sfx.p2', text: 'KA-CHUNK!', t0: 13.7, dur: 2.1, x: 960, y: 88, size: 66, rot: -.04, fill: '#ffc531', shadow: '#f0503e' },
  { id: 'sfx.p3', text: 'BONK!', t0: 15.95, dur: 2.0, x: 1300, y: 92, size: 66, rot: .07, fill: '#ffc531', shadow: '#f0503e' },
  { id: 'sfx.p4', text: 'SPLAT!', t0: 18.2, dur: 2.0, x: 1640, y: 92, size: 66, rot: -.06, fill: '#ffc531', shadow: '#f0503e' },
  { id: 'sfx.swoosh', text: 'SWOOOSH!', t0: 23.3, dur: 2.1, x: 1330, y: 215, size: 112, rot: -.07, fill: '#fff2d0', shadow: '#0d7f94' },
  { id: 'sfx.krak', text: 'KRAKOOM!', t0: 32.4, dur: 2.1, x: 960, y: 160, size: 170, rot: -.05, fill: '#ffffff', shadow: '#6a4bb7' },
  { id: 'sfx.sq', text: 'SQUEEEEEK!', t0: 36.0, dur: 2.4, x: 930, y: 150, size: 190, rot: .04, fill: '#ffc531', shadow: '#f0503e' },
  { id: 'sfx.glup', text: 'GLUP!', t0: 39.75, dur: 2.0, x: 1480, y: 190, size: 130, rot: .09, fill: '#fff2d0', shadow: '#f0503e' },
  { id: 'sfx.shuk', text: 'SHUK!', t0: 44.35, dur: 1.9, x: 330, y: 190, size: 120, rot: -.1, fill: '#ffc531', shadow: '#f0503e' },
  { id: 'sfx.chak', text: 'KA-CHAK!', t0: 45.75, dur: 2.05, x: 1470, y: 170, size: 120, rot: .07, fill: '#fff2d0', shadow: '#f0503e' },
  { id: 'sfx.ha', text: 'HAHAHAHA!', t0: 48.0, dur: 2.2, x: 960, y: 150, size: 190, rot: -.03, fill: '#ffc531', shadow: '#f0503e' },
  { id: 'sfx.tbc', text: 'TO BE CONTINUED...', t0: 57.0, dur: 3.0, x: 960, y: 985, size: 112, rot: -.015, fill: '#fff2d0', shadow: '#f0503e' },
];

// transitions between scenes: kind, window (the new scene is revealed from t0 to t1)
export const WIPES = [
  { kind: 'slash', t0: 2.65, t1: 3.15 },
  { kind: 'grow', t0: 8.55, t1: 9.0 },
  { kind: 'wave', t0: 22.0, t1: 22.95 },
  { kind: 'slash', t0: 41.75, t1: 42.25 },
  { kind: 'iris', t0: 47.65, t1: 48.05 },
];

// camera keys: [[t, {z, cx, cy, roll}], ...] eased between keys with a smoothstep (or a hold if equal)
const lerp = (a, b, t) => a + (b - a) * t, ss = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function kf(t, keys) {
  if (t <= keys[0][0]) return { ...keys[0][1] };
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], u = ss((t - t0) / (t1 - t0)), o = {};
    for (const k in b) o[k] = k === 'z' ? a.z * Math.pow(b.z / a.z, u) : lerp(a[k] ?? 0, b[k], u);
    return o;
  }
  return { ...keys[keys.length - 1][1] };
}

// sound events for the mixer
export function events() {
  const E = [], add = (t, type, o = {}) => E.push({ t: +t.toFixed(3), type, ...o });
  add(0.0, 'boom'); add(0.02, 'whoosh', { d: .5 }); add(1.85, 'pop'); [2.0, 2.2, 2.4].forEach((t, i) => add(t, 'boing', { n: i }));
  add(2.65, 'whoosh', { d: .55 });
  add(3.0, 'unroll'); add(3.5, 'pen', { d: 1.1 }); [4.85, 5.15, 5.45, 5.75, 6.05, 5.95].forEach((t, i) => add(t, 'pen', { d: .5 })); add(5.4, 'pen', { d: 2.8, route: 1 }); add(8.2, 'thud', { f: 90 });
  add(8.55, 'whoosh', { d: .5 });
  POSTER_T.forEach((t, k) => { add(t - .12, 'whoosh', { d: .2 }); add(t + .17, 'thwack', { k }); add(t + .67, 'stamp', { k }); });
  add(20.55, 'tink'); add(20.8, 'swing', { d: 1.3 });
  add(22.0, 'wavewipe'); add(21.6, 'seabed');
  add(24.1, 'gull'); add(25.7, 'gull'); add(23.5, 'creak'); add(26.3, 'creak'); add(28.0, 'creak'); add(27.0, 'splash', { v: .4 }); add(29.25, 'clang');
  add(30.0, 'rumble'); [30.75, 31.5, 32.25, 33.0, 33.75].forEach((t, i) => add(t, 'pop', { n: i + 1 })); add(32.25, 'thunder');
  add(34.5, 'hush'); [35.0, 35.4].forEach(t => add(t, 'drip', { deep: 1 })); [35.55, 35.7, 35.85].forEach((t, i) => add(t, 'bloop', { n: i }));
  add(36.0, 'squeak', { big: 1 }); add(36.0, 'splash', { v: 1 });
  add(38.45, 'wind'); [38.6, 38.95, 39.3].forEach(t => add(t, 'step')); add(39.75, 'glup'); add(40.05, 'squeak', { big: 0 }); add(40.5, 'squeak', { big: 0, hi: 1 }); add(41.1, 'splash', { v: .7 });
  add(41.75, 'whoosh', { d: .5 });
  [44.4, 44.7, 45.0, 45.3].forEach(t => add(t, 'shuk')); add(45.55, 'thunk'); add(45.75, 'chest'); add(45.95, 'sparkle'); add(46.5, 'boing', { n: 3 });
  add(47.65, 'whoosh', { d: .4 });
  [48.0, 48.75, 49.5, 50.25, 51.0, 51.75].forEach((t, i) => add(t, 'laugh', { n: i }));
  add(52.5, 'pullout', { d: 3.2 }); [54.15, 55.0].forEach(t => add(t, 'drip', { deep: 0 })); [56.1, 56.8].forEach(t => add(t, 'drip', { deep: 0 }));
  add(57.0, 'end');
  return E.sort((a, b) => a.t - b.t);
}
