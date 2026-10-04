// timeline.js: the single source of truth for time. 72 BPM, 4/4, 16 bars; picture, score, voice and subtitles all read this.
export const BPM = 72, BEAT = 60 / BPM, BAR = BEAT * 4;
export const DUR = BAR * 16;
export const bar = (n, b = 1) => (n - 1) * BAR + (b - 1) * BEAT;
// shots (treatment section 4)
export const SHOTS = [
  { id: 's1', t0: bar(1), t1: bar(2) },
  { id: 's2', t0: bar(2), t1: bar(4) },
  { id: 's3', t0: bar(4), t1: bar(6) },
  { id: 's4', t0: bar(6), t1: bar(8) },
  { id: 's5', t0: bar(8), t1: bar(10) },
  { id: 's6', t0: bar(10), t1: bar(11) },
  { id: 's7', t0: bar(11), t1: bar(14) },
  { id: 's8', t0: bar(14), t1: bar(16) },
  { id: 's9', t0: bar(16), t1: DUR },
];
// voice lines: t = start of speech, dur from voices/dur.json (overridden at load when the file is there); win = plaque on the wall
export const LINES = [
  { id: 'l1', t: 5.0, dur: 2.746, text: ['洞里没有光，', '只有一盏借来的灯。'], one: '洞里没有光，只有一盏借来的灯。', wall: 'A' },
  { id: 'l2', t: bar(5), dur: 2.564, text: ['灯走到哪里，墙就醒到哪里。'], one: '灯走到哪里，墙就醒到哪里。', wall: 'B' },
  { id: 'l3', t: bar(6, 4), dur: 3.006, text: ['丝带还在吹，风是画进去的。'], one: '丝带还在吹，风是画进去的。', wall: 'B' },
  { id: 'l4', t: bar(12, 1), dur: 3.091, text: ['一格一格，', '每一笔都有人用手画过。'], one: '一格一格，每一笔都有人用手画过。', wall: 'D' },
  { id: 'l5', t: bar(14, 4), dur: 2.486, text: ['颜色会退，线条还在。'], one: '颜色会退，线条还在。', wall: 'D' },
];
const req = l => l.one.length / 4.5 + 1.5;   // readcheck: CJK characters / 4.5 + 1.5 s
export const winOf = l => { const a = l.t - .35; return [a, Math.min(a + Math.max(l.dur + .9, req(l) + .15), l.id === 'l3' ? 23.2 : 1e9)]; };
export const TITLE = { t0: 39.3, t1: 43.3 };
