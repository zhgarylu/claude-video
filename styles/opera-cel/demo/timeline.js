// timeline.js — the single source of truth: bar grid, shots, voice lines, sound events, subtitles.
// 96 BPM, 4/4: one beat = 0.625 s, one bar = 2.5 s. Bar n starts at 2.5 (n-1).
export const BEAT = 0.625, BAR = 2.5, DUR = 52.5;
export const bar = (n, beat = 1) => (n - 1) * BAR + (beat - 1) * BEAT;

export const SHOT = {
  s1: [0, bar(2)],            // cloud curtain parts, first pose
  s2: [bar(2), bar(5)],       // stage-step glide along the scroll
  s3: [bar(5), bar(6)],       // crane up the gate, face cuts
  s4: [bar(6), bar(8)],       // standoff, couplet
  s5: [bar(8), bar(11)],      // three exchanges
  s6: [bar(11), bar(13)],     // spear bites, the disc
  s7: [bar(13), bar(15)],     // silence
  s8: [bar(15), bar(16) + 1.0], // the stroke, doors, wipe
  s9a: [bar(16) + 1.0, bar(17) + 2.0], // valley
  s9b: [bar(17) + 2.0, bar(19) + 2.0], // gate tableau, lush
  s10: [bar(19) + 2.0, DUR],  // tableau hold, scroll border closes, end card
};

// voice lines: id, who, text (spoken), sub (subtitle), start time of the audio
export const LINES = [
  { id: 'ql1', who: 'ql', text: '泉断三春久，求公放一线。', t: bar(6) + 0.05 },
  { id: 'sg1', who: 'sg', text: '欲得山泉水，先接三招！', t: bar(7) + 0.3 },
  { id: 'ql2', who: 'ql', text: '原来，这把锁，是面锣。', t: bar(11) + 0.9 },
  { id: 'sg2', who: 'sg', text: '哈哈哈，好一记响锣！', t: bar(17) + 2.55 },
];
// filled in by the build once the audio exists (voices/dur.json); estimates used until then
export const EST = { ql1: 3.0, sg1: 3.0, ql2: 2.6, sg2: 2.6 };

// sound / cue events (also drive secondary motion: plume, ribbon swings)
export const EV = [
  { t: 0.625, type: 'gong_small', v: .8 }, { t: 1.25, type: 'gong_big', v: 1 },
  { t: bar(1, 4), type: 'cymbal', v: .9 }, { t: bar(1, 4), type: 'snap', v: 1 },
  { t: bar(2) + 0.0, type: 'cut' },
  // gate bar
  { t: bar(5), type: 'gong_big', v: .9 }, { t: bar(5, 3), type: 'cut' }, { t: bar(5, 4), type: 'cut' }, { t: bar(6), type: 'cut' },
  { t: bar(6, 1), type: 'cymbal', v: .5 }, { t: bar(7, 1), type: 'cymbal', v: .5 },
  // exchanges
  { t: bar(8), type: 'strike', v: 1 }, { t: bar(8) + 0.4, type: 'clash', v: .9 },
  { t: bar(9), type: 'strike', v: 1 }, { t: bar(9) + 0.4, type: 'clash', v: .9 },
  { t: bar(10), type: 'strike', v: 1 }, { t: bar(10) + 0.4, type: 'clash', v: 1 },
  { t: bar(11), type: 'bite', v: 1 },
  { t: bar(12, 2), type: 'zoom', v: .8 },
  // silence, then the stroke
  { t: bar(14, 3), type: 'drip', v: .6 },
  { t: bar(14, 2) + 0.5, type: 'tug', v: .7 },
  { t: bar(15), type: 'stroke', v: 1 },
  { t: bar(15) + .1, type: 'water', v: 1 },
  { t: bar(19) + 0.0, type: 'cut' },
  { t: bar(21), type: 'gong_big', v: .9 }, { t: bar(21), type: 'cymbal', v: .9 },
];
EV.push(...LINES.map(l => ({ t: l.t, type: 'voice', id: l.id, text: l.text })));
// poses that land with a snap (anticipation 2 frames before): used for plume / ribbon swings
export const HITS = [bar(1, 4), bar(8), bar(8) + .4, bar(9), bar(9) + .4, bar(10), bar(10) + .4, bar(11), bar(14, 2) + .5, bar(15), bar(19) + 2.0];

// title cards and on-screen text (also exported as TEXTS for readcheck)
export const TITLE = { t0: bar(2) + 0.6, t1: bar(2) + 0.6 + 4.6, text: '石门一锣' };
export const ENDCARD = { t0: 49.3, t1: DUR, line1: '石门一锣', line2: 'LemoLab × Claude Opus 5.5' };
