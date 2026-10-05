// One timeline drives picture, sound and captions. Pure data (no DOM), imported by the page and by tools/export_tl.mjs.
// Tempo 100 BPM, 4/4: beat 0.6 s, bar 2.4 s. Every burst of flaps is placed on this grid.
export const BPM = 100, BEAT = 0.6, BAR = 2.4;
export const DUR = 60.0;

// key times (s)
export const T = {
  power: 0.3,        // power-on test: every cell cycles
  fill: 4.8,         // bar 3: the departures write themselves
  dive0: 9.6, dive1: 11.7,   // push into one hinge
  open0: 11.7, open1: 12.4,  // the hinge gap opens into the section drawing
  slow1: 13.2, slow2: 17.7,  // two slow flaps shown in the section
  arrow: 19.5, pawl: 20.7,   // "back is one step": the arrow, the pawl that says no
  spin0: 21.1, land: 24.0,   // 39 flaps fall; the last one lands on bar 11
  close0: 24.9, close1: 25.5, wide: 26.4,   // the gap closes, pull back to the board
  chime: 28.8, stamp: 29.4,  // the delay: station chime, status turns amber
  roll: 30.0,                // the time rolls round past midnight
  resort: 34.2,              // the lines write themselves again, shifted up
  clock: 38.4, count0: 39.6, zero: 45.6,  // countdown: 10 beats from 00:10 to 00:00
  clear: 49.2,               // the whole board falls blank
  quote0: 52.0, quoteDt: 0.15,  // the sentence is spelled, one cell per sixteenth-ish
  end: 60.0
};

// Voice lines. dur = measured by tts.py (tools/export_tl.mjs checks it against voices/dur.json).
// rows = the announcement strip (two rows of up to 36 flaps), letters land in time with the voice.
export const VO = [
  { id: 'v1', t: 5.0,  dur: 2.254, text: 'Every change on this board is a journey.', rows: ['EVERY CHANGE ON THIS BOARD', 'IS A JOURNEY.'] },
  { id: 'v2', t: 12.6, dur: 4.143, text: 'Each letter sits on a wheel of forty flaps. It turns one way only.', rows: ['EACH LETTER SITS ON A WHEEL OF', 'FORTY FLAPS. IT TURNS ONE WAY ONLY.'] },
  { id: 'v3', t: 19.2, dur: 3.355, text: 'From B back to A is one step. Here, it is thirty-nine.', rows: ['FROM B BACK TO A IS ONE STEP.', 'HERE, IT IS 39.'] },
  { id: 'v4', t: 27.0, dur: 3.23,  text: 'So when a train is late, the board writes the whole line again.', rows: ['SO WHEN A TRAIN IS LATE, THE BOARD', 'WRITES THE WHOLE LINE AGAIN.'] },
  { id: 'v5', t: 37.2, dur: 2.245, text: 'The last train leaves in ten seconds.', rows: ['THE LAST TRAIN LEAVES IN', '10 SECONDS.'] },
  { id: 'v6', t: 51.6, dur: 3.305, text: 'Even going back means going forward, all the way round.', rows: ['EVEN GOING BACK MEANS GOING FORWARD,', 'ALL THE WAY ROUND.'] }
];

// score sections (bars are 2.4 s); mix.py reads these
export const MUSIC = {
  start: 2.4, rows: 4.8, thin: 9.6, silent: 11.7, back: 26.4, delay: 28.8, count: 38.4, zero: 45.6, hush: 47.0, quote: 51.6, end: 60.0
};
