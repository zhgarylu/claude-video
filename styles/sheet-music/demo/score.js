// "Four Notes": one short original composition, generated in code. This file is the single source of truth:
// the notation, the picture (blooms, ribbons, waves) and the soundtrack all read the same event list EV.
// Pitch is a letter number L (C0 = 0, D0 = 1 ... B0 = 6, C1 = 7 ...; E4 = 30) plus an explicit alteration `acc`.
// The key signature is E minor (one sharp, F), so F sharp needs no accidental; D sharp in the cadence does.
export const BPM = 92, BEAT = 60 / BPM, BAR = 4 * BEAT, T0 = 3.0, NBARS = 16;
export const BARS_PER_SYS = 4;
export const VOICES = [
  { id: 'lead', name: 'Lead', clef: 'g', color: '#c8432a' },        // vermilion
  { id: 'mallets', name: 'Mallets', clef: 'g', color: '#256a8c' },  // prussian blue
  { id: 'bass', name: 'Bass', clef: 'f', color: '#8a7418' },        // olive ochre
];
const E4 = 30;                                    // letter number of E4
const E = d => E4 + d;                            // d = diatonic steps above E4
const SEMI = [0, 2, 4, 5, 7, 9, 11];
// letter F (index 3) carries the key-signature sharp
export const midi = (L, acc = 0) => 12 * (Math.floor(L / 7) + 1) + SEMI[L % 7] + (L % 7 === 3 ? 1 : 0) + acc;
export const hz = m => 440 * Math.pow(2, (m - 69) / 12);

// ---- the idea: a four-note seed, and four things to do with it ---------------------------------
const SEED = [[7, 1], [9, 1], [8, .5], [4, 1.5]];                  // [d, beats]  E5 G5 F#5 B4
const invert = (m, ax) => m.map(([d, b]) => [2 * ax - d, b]);      // mirror the contour
const stretch = (m, k) => m.map(([d, b]) => [d, b * k]);           // augmentation
const shift = (m, s) => m.map(([d, b]) => [d + s, b]);             // transposition
const voices = [[], [], []];
const N = (v, bar, beat, dur, d, o = {}) => voices[v].push({ bar, beat, dur, notes: [{ L: E(d), acc: o.acc || 0 }], ...o });
const NL = (v, bar, beat, dur, L, o = {}) => voices[v].push({ bar, beat, dur, notes: [{ L, acc: o.acc || 0 }], ...o });
const phrase = (v, bar, beat, m, slur) => {
  let b = beat;
  m.forEach(([d, du], i) => { N(v, bar + Math.floor(b / 4), b % 4, du, d, slur ? { ph: i === 0 ? 'start' : i === m.length - 1 ? 'end' : 'mid' } : {}); b += du; });
};

// lead: seed, repeat, invert, stretch; then the same moves transposed and layered
phrase(0, 1, 0, SEED, 1); N(0, 2, 0, 2, 3);
phrase(0, 3, 0, SEED, 1); N(0, 4, 0, 2, 3);
phrase(0, 5, 0, invert(SEED, 7), 1); N(0, 6, 0, 2, 9);
phrase(0, 7, 0, stretch(SEED, 2), 1);
phrase(0, 9, 0, shift(SEED, 2), 1); N(0, 10, 0, 2, 5);
phrase(0, 11, 0, invert(SEED, 7), 1); N(0, 12, 0, 2, 9);
phrase(0, 13, 0, stretch(SEED, 2), 1);
N(0, 15, 0, 1, 8); N(0, 15, 1, 1, 6, { acc: 1 }); N(0, 15, 2, 2, 4); N(0, 16, 0, 4, 7, { fermata: 1 });

// mallets: an eight-note arpeggio per bar (from bar 3), the seed mirrored in bar 11, a held chord at the end
const CH = { Em: [0, 2, 4], Am: [-4, -2, 0], C: [-2, 0, 2], G: [-3, -1, 2], D: [-1, 1, 3], B: [-3, -1, 1] };
const ARP = { 3: 'Em', 4: 'Am', 5: 'C', 6: 'G', 7: 'Em', 8: 'Em', 9: 'G', 10: 'C', 12: 'D', 13: 'Em', 14: 'Em', 15: 'B' };
for (const [bar, c] of Object.entries(ARP)) [0, 1, 2, 1, 0, 1, 2, 1].forEach((k, i) => N(1, +bar, i * .5, .5, CH[c][k], { stac: 1, acc: c === 'B' && k === 1 ? 1 : 0 }));
phrase(1, 11, 0, SEED.map(([d, b]) => [d - 7, b]), 0);            // the seed an octave lower, while the lead mirrors it
voices[1].push({ bar: 16, beat: 0, dur: 4, notes: [0, 2, 4].map(d => ({ L: E(d), acc: 0 })), fermata: 1 });

// bass: silent until the stretch, then roots and fifths (letter numbers)
NL(2, 7, 0, 4, 23); NL(2, 8, 0, 4, 20);
[[9, 18, 22], [10, 21, 18], [11, 19, 23], [12, 22, 19], [13, 23, 20], [14, 23, 20]].forEach(([bar, a, b]) => { NL(2, bar, 0, 2, a); NL(2, bar, 2, 2, b); });
NL(2, 15, 0, 4, 20); NL(2, 16, 0, 4, 23, { fermata: 1 });

// dynamics (marking, bar, beat) and one hairpin
export const DYN = [['p', 1, 0], ['mp', 3, 0], ['mf', 5, 0], ['f', 9, 0], ['ff', 15, 0], ['p', 16, 0]];
export const HAIRPIN = { from: [13, 0], to: [15, 0] };
const LV = { p: .36, mp: .5, mf: .62, f: .8, ff: .95 };
const velAt = (bar, beat) => {
  const tb = (bar - 1) * 4 + beat; let v = .36;
  for (const [m, b, be] of DYN) if ((b - 1) * 4 + be <= tb) v = LV[m];
  const a = (HAIRPIN.from[0] - 1) * 4, b2 = (HAIRPIN.to[0] - 1) * 4;
  if (tb >= a && tb < b2) v = .8 + (.95 - .8) * (tb - a) / (b2 - a);
  return v;
};

// ---- the event list ----------------------------------------------------------------------------
export const tOf = (bar, beat) => T0 + ((bar - 1) * 4 + beat) * BEAT;
export const EV = [], RESTS = [], CHORDS = [];
voices.forEach((list, v) => {
  list.sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  for (const n of list) {
    const ch = { v, bar: n.bar, beat: n.beat, dur: n.dur, ph: n.ph, fermata: n.fermata, stac: n.stac, ids: [], notes: n.notes };
    n.notes.forEach((p, k) => {
      const id = `${'LMB'[v]}${n.bar}:${n.beat}${k ? '#' + k : ''}`;
      EV.push({ t: +tOf(n.bar, n.beat).toFixed(4), type: 'note', id, voice: v, midi: midi(p.L, p.acc), L: p.L, acc: p.acc, bar: n.bar, beat: n.beat, beats: n.dur, dur: +(n.dur * BEAT * (n.stac ? .8 : n.fermata ? 1.9 : .96)).toFixed(4), vel: +velAt(n.bar, n.beat).toFixed(3), chord: n.notes.length > 1 ? 1 : 0 });
      ch.ids.push(id);
    });
    CHORDS.push(ch);
  }
  // rests fill every gap in every bar
  for (let bar = 1; bar <= NBARS; bar++) {
    const here = list.filter(n => n.bar === bar).sort((a, b) => a.beat - b.beat);
    let cur = 0; const gaps = [];
    for (const n of here) { if (n.beat > cur) gaps.push([cur, n.beat - cur]); cur = Math.max(cur, n.beat + n.dur); }
    if (cur < 4) gaps.push([cur, 4 - cur]);
    for (let [b, len] of gaps) while (len > 1e-6) {
      const u = len >= 4 ? 4 : len >= 2 && b % 2 === 0 ? 2 : len >= 1 && b % 1 === 0 ? 1 : .5;
      RESTS.push({ v, bar, beat: b, dur: u }); b += u; len -= u;
    }
  }
});
EV.sort((a, b) => a.t - b.t || a.voice - b.voice || a.midi - b.midi);
export const SECTIONS = [   // the lesson's chapters (bars), for the margin analysis
  { name: 'the seed', bars: [1, 2] }, { name: 'repeat', bars: [3, 4] }, { name: 'invert', bars: [5, 6] }, { name: 'stretch', bars: [7, 8] },
  { name: 'layered', bars: [9, 10] }, { name: 'contrary motion', bars: [11, 12] }, { name: 'louder', bars: [13, 14] }, { name: 'home', bars: [15, 16] },
];
export const END = tOf(NBARS + 1, 0);
export const DUR = 50;
// notes sounding at t: onset <= t < onset + dur (the picture lights exactly these; the synth plays exactly these)
export const sounding = t => EV.filter(e => e.t <= t + 1e-9 && t < e.t + e.dur);
