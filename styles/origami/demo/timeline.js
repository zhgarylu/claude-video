// timeline.js: the single source of truth for "The Seventh Fold": times, beats, captions, camera keys.
// 96 BPM, 4/4: one beat = 0.625 s. Fold landings sit on beats, so picture and music are one grid.
export const BPM = 96, BEAT = 60 / BPM, DUR = 50;
export const beat = n => n * BEAT;

export const SHEET = { w: .34, h: .085, th: .00012, seg: .0055 };      // a long strip: every fold is parallel, so folds can overlap in time

// halving folds 1..6: land on beats, durations shrink (acceleration)
export const LAND_BEATS = [3, 6, 9, 12, 14, 16];
export const FOLD_DUR = [1.25, 1.2, 1.1, 1.0, .9, .85];
export const FOLD_CURL = [.3, .12, 0, 0, 0, 0];
export const FOLD_T = LAND_BEATS.map((b, i) => [beat(b) - FOLD_DUR[i], beat(b)]);          // [start, land]

// the seventh fold: lifts, strains against 32 layers, drops back (keys [t, progress])
export const SEVEN = [[12.5, 0], [13.5, .26], [13.85, .24], [14.5, .36], [15.0, .36], [15.7, 0]];

// unfolding, last fold first and one after another (stacked layers cannot open all at once), then the crease pattern
export const UNFOLD = { t0: 17.5, win: .8, step: .92 };
export const PATTERN = { t0: 21.4, t1: 24.0 };

// pleats: eight segments, seven creases moving together, then one pull
export const PLEAT = { n: 8, collapse: [25.625, 31.25], hold: 34.375, pull: [34.375, 38.75], max: .9 };

export const CAPTIONS = [
  { id: 'c1', t0: 1.0, t1: 4.8, text: 'Fold a sheet in half. Again.' },
  { id: 'c2', t0: 5.0, t1: 9.4, text: 'Every fold doubles the layers.' },
  { id: 'c3', t0: 10.3, t1: 12.8, text: '64 layers.' },
  { id: 'c4', t0: 13.0, t1: 17.4, text: 'The seventh fold will not close.' },
  { id: 'c5', t0: 19.0, t1: 23.6, text: 'Unfolded, the sheet keeps a record.' },
  { id: 'c6', t0: 26.0, t1: 30.2, text: 'Fold it back and forth instead.' },
  { id: 'c7', t0: 30.4, t1: 35.2, text: 'Each crease bends one layer, not sixty-four.' },
  { id: 'c8', t0: 35.6, t1: 39.6, text: 'One pull and it opens.' },
  { id: 'c9', t0: 41.0, t1: 46.4, text: 'Twelve folds took 1,200 metres of paper.' },
  { id: 'c10', t0: 46.6, t1: 50.0, text: 'Fold smarter, not more.' },
];

// camera keys: [t, lookX, lookY, lookZ, height, tilt (0 top-down .. 1 low oblique), aperture]
export const CAM = [
  [0.0, 0, 0, 0, .80, .22, 1.4],
  [1.9, .06, 0, 0, .66, .26, 1.5],
  [3.75, .118, 0, 0, .46, .36, 1.8],
  [5.63, .146, 0, 0, .33, .44, 2.0],
  [7.5, .158, 0, 0, .27, .50, 2.2],
  [8.75, .164, 0, 0, .235, .54, 2.4],
  [10.0, .167, .002, 0, .21, .56, 2.6],
  [11.4, .167, .003, 0, .19, .70, 2.8],
  [12.4, .167, .004, .04, .095, 1.0, 3.2],
  [15.9, .167, .004, .04, .095, 1.0, 3.2],
  [17.5, .167, .003, 0, .22, .50, 2.2],
  [19.6, .10, .002, 0, .38, .36, 1.8],
  [21.6, .02, 0, 0, .56, .18, 1.4],
  [23.2, 0, 0, 0, .62, .10, 1.2],
  [25.8, 0, 0, 0, .55, .12, 1.2],
  [27.5, -.10, .01, 0, .17, .78, 3.0],
  [31.0, -.115, .018, 0, .15, .84, 3.2],
  [34.4, -.115, .018, 0, .15, .84, 3.2],
  [38.6, -.02, .006, 0, .40, .45, 1.6],
  [41.0, 0, 0, 0, .64, .06, 1.2],
  [50.0, 0, 0, 0, .58, .05, 1.0],
];
