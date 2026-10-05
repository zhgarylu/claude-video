// The single source of truth: tempo, bar grid, every picture hit and sound event, the voice cues.
// Plain data and arithmetic only (no DOM, no imports) so that Node (mix.py, subtitles) and the page read the same numbers.
export const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 58;
const bar = (n, b = 0) => +(n * BAR + b * BEAT).toFixed(4);

export const T = {
  riff0: 5.9, riffStep: 0.055, riffN: 24,        // riffle: 24 cards interleave
  cut0: 7.45, cutSlide: 7.8, cutOnto: 8.15, cutBack: 8.35,
  fan0: 8.4, fanFlip0: 8.9, fanFlipStep: 0.07, collapse0: 9.95, collapseEnd: 10.5,
  deal: [10.83, 11.5, 12.17], dealDur: 0.5,      // launches; the cards land on beats 11.33, 12.0, 12.67
  flip: [bar(5), bar(9), bar(14)], flipDur: 1.1,   // 13.33, 24.0, 37.33
  silence0: bar(13), silence1: bar(14) - 0.02,       // 34.67 .. 37.31
  roll0: 38.6, roll1: 40.1, rollBack0: 40.6, rollBack1: 42.2,
  label: [bar(16), bar(16, 1), bar(16, 2)],   // ASK, COST, TIME stamped
  rule0: 44.2, rule1: 45.6, drop1: 46.4,
  seal: bar(18, 2),                                  // 49.33
  silence2a: 50.3, silence2b: bar(19, 1),            // 51.33
  pile: [51.0, 51.35, 51.7], pileDur: 0.48,          // A, B, C sweep into the pile (land 51.5, 51.83, 52.18)
  topFlip: 52.667, topFlipDur: 0.9,
  title: 53.333,
};
T.silence1 = T.flip[2] - 0.02;

export const SECS = [
  { id: 'hook', t: bar(0), bars: 2 }, { id: 'shuffle', t: bar(2), bars: 3 }, { id: 'lantern', t: bar(5), bars: 4 },
  { id: 'key', t: bar(9), bars: 4 }, { id: 'quiet', t: bar(13), bars: 1 }, { id: 'tide', t: bar(14), bars: 4 },
  { id: 'verdict', t: bar(18), bars: 1 }, { id: 'pile', t: bar(19), bars: 3 }, { id: 'end', t: bar(22), bars: 0 },
];

// ---- the voice (ids = files in voices/)
export const VO = [
  { id: 'v1', t: 0.9, text: 'Someone asks a favour, and your mouth says yes before you do.', asr: 'Someone asks a favor and your mouth says yes before you do' },
  { id: 'v2', t: 6.7, text: 'So shuffle. Cut. The deck knows nothing. It only makes you ask three things, in order.' },
  { id: 'v3', t: 14.2, text: 'First, the Lantern. What, exactly, is being asked? Say it in a single sentence.' },
  { id: 'v4', t: 24.9, text: 'Second, the Key. What does it cost? Count the hours, not the feelings.' },
  { id: 'v5', t: 38.2, text: 'Third, the Tide. Will it still matter in a year?' },
  { id: 'v6', t: 43.1, text: 'It lands upside down. Reversed means: not yet.' },
  { id: 'v7', t: 47.85, text: 'Any murky card, and the answer waits.' },
  { id: 'v8', t: 52.2, text: 'Three questions. One honest answer.' },
];

// ---- riffle deck positions: card i is supplied by the left half (even) or right half (odd)
export const riffT = i => T.riff0 + i * T.riffStep + ((i * 7) % 5) * 0.004;

// ---- sound events (type, time, optional params). Picture and sound read this one list.
const ev = [];
const E = (t, type, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
E(0.15, 'riffle', { n: 3 });                       // the opening: a thumb flicks the deck
for (let i = 0; i < T.riffN; i++) E(riffT(i) + 0.1, 'card', { pan: i % 2 ? .35 : -.35, v: .55 + (i % 3) * .08 });
E(T.riff0 - 0.1, 'riffle', { n: 12 });
E(T.cut0, 'slide'); E(T.cutSlide, 'slap', { v: .6 }); E(T.cutOnto, 'slide'); E(T.cutBack - 0.03, 'slap', { v: .8 });
E(T.fan0, 'fan');
for (let i = 0; i < 8; i++) E(T.fanFlip0 + i * T.fanFlipStep + 0.2, 'tick', { v: .5, pan: (i - 3.5) / 5 });
E(T.collapse0, 'fan', { rev: 1 });
T.deal.forEach((t, i) => { E(t, 'slide', { pan: -.4 + i * .1 }); E(t + T.dealDur, 'land', { v: .9, pan: -.35 + i * .35 }); });
T.flip.forEach((t, i) => { E(t, 'flip'); E(t + T.flipDur - 0.12, 'snap', { v: 1 }); });
E(T.flip[2] + T.flipDur - 0.12, 'bell', { low: 1 });
E(T.roll0, 'roll'); E(T.rollBack0, 'roll', { rev: 1 });
T.label.forEach((t, i) => E(t, 'chalk', { pan: -.4 + i * .4 }));
E(T.rule0, 'scratch', { d: T.rule1 - T.rule0 }); E(T.rule1, 'scratch', { d: T.drop1 - T.rule1 });
E(T.seal, 'stamp');
T.pile.forEach((t, i) => { E(t, 'slide', { pan: i ? 0 : -.3 }); E(t + T.pileDur, 'land', { v: 1, pan: 0 }); });
E(T.topFlip, 'flip'); E(T.topFlip + T.topFlipDur - 0.1, 'snap', { v: .9 });
E(T.title, 'bell', { title: 1 });
export const EV = ev.sort((a, b) => a.t - b.t);

// ---- music grid for mix.py: section list with gains per layer (0..1) by bar
export const MUSIC = {
  key: 'D minor', bpm: BPM,
  layers: {          // [bar0, bar1] each layer plays inside these bar ranges
    drone: [0, 22], bell: [0, 22], arp: [2, 13], drum: [4, 13], box: [5, 13], bass: [9, 13],
    arp2: [14, 19], drum2: [14, 19], box2: [14, 22], glass: [14, 22],
  },
  silence: [[T.silence0, T.silence1], [T.silence2a, T.silence2b]],
};
