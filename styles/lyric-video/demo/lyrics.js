// How every line is typeset and which word does what. Word timing comes from words.json (timeline.js); this file only decides the look.
// rows: word indices per row. rowSize: px per row. mult / wt / col / fx: per word index. 'acc' = the section's accent colour.
export const KIND = {
  intro:  { fam: 'Anton',   size: 170, wt: 400, align: 'center', ax: 960, ay: 560, up: 1, track: 6, reveal: 'slam', lh: 1.0 },
  verse:  { fam: 'Archivo', size: 112, wt: 800, align: 'left',   ax: 150, ay: 650, up: 0, track: 0, reveal: 'line', lh: 1.1, fill: 1 },
  pre:    { fam: 'Archivo', size: 132, wt: 900, align: 'center', ax: 960, ay: 650, up: 1, track: 2, reveal: 'slam', lh: 1.06 },
  chorus: { fam: 'Anton',   size: 230, wt: 400, align: 'center', ax: 960, ay: 630, up: 1, track: 3, reveal: 'slam', lh: .98 },
  bridge: { fam: 'Archivo', size: 92,  wt: 300, align: 'left',   ax: 210, ay: 600, up: 0, track: 5, reveal: 'fade', lh: 1.25, fill: 1 },
  joke:   { fam: 'Archivo', size: 96,  wt: 300, align: 'center', ax: 960, ay: 600, up: 0, track: 5, reveal: 'fade', lh: 1.3, fill: 1 },
};
export const SPEC = {
  l00: { rows: [[0, 1, 2]], fx: { 2: 'beatpulse' } },
  // verse 1: night
  l01: { rows: [[0, 1, 2, 3, 4], [5, 6, 7, 8]], mult: { 5: 1.18, 8: 1.3 }, wt: { 5: 900, 8: 900 }, col: { 5: 'acc', 8: 'acc' }, fx: { 5: 'shake', 8: 'hollow' } },
  l02: { rows: [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]], mult: { 1: 1.1, 8: 1.05, 9: 1.3 }, wt: { 1: 900, 9: 900 }, col: { 9: 'acc' }, fx: { 1: 'press', 4: 'shine', 8: 'orbit', 9: 'drop' } },
  l03: { rows: [[0, 1, 2, 3], [4, 5, 6, 7, 8]], mult: { 3: 1.12, 6: 1.12, 8: 1.35 }, wt: { 3: 900, 6: 900, 8: 900 }, col: { 8: 'acc' }, fx: { 3: 'float', 6: 'float', 8: 'stack' } },
  l04: { rows: [[0, 1, 2, 3], [4, 5, 6, 7]], mult: { 2: 1.15, 5: 1.2, 7: 1.4 }, wt: { 2: 900, 5: 900, 7: 900 }, col: { 7: 'acc' }, fx: { 5: 'crack', 7: 'rise' } },
  // pre-chorus 1: the little voice
  l05: { rows: [[0, 1, 2, 3], [4, 5, 6]], mult: { 3: 1.25, 6: 1.35 }, col: { 3: 'acc', 6: 'acc' }, fx: { 3: 'echo' }, grow: 1 },
  l06: { rows: [[0, 1, 2], [3, 4, 5]], mult: { 4: 1.3, 5: 1.5 }, col: { 4: 'acc', 5: 'acc' }, grow: 1, ramp: 1 },
  // chorus 1: yellow
  l07: { rows: [[0], [1], [2]], rowSize: [196, 196, 196], tilt: -2 },
  l08: { rows: [[0, 1, 2], [3, 4, 5, 6]], rowSize: [190, 190], col: { 6: 'acc' }, fx: { 5: 'sunmask', 6: 'swing' } },
  l09: { rows: [[0, 1, 2], [3, 4, 5]], rowSize: [150, 240], col: { 5: 'acc' } },
  l10: { rows: [[0, 1, 2], [3, 4, 5]], rowSize: [150, 250], mult: { 3: .6, 4: 1.12, 5: .55 }, col: { 4: 'acc' }, fx: { 5: 'timid' } },
  // verse 2: day
  l11: { rows: [[0, 1, 2, 3], [4, 5, 6]], mult: { 0: 1.1, 3: 1.2, 6: 1.35 }, wt: { 0: 900, 3: 900, 6: 900 }, col: { 3: 'acc' }, fx: { 3: 'lightmask', 6: 'door' } },
  l12: { rows: [[0, 1, 2, 3], [4, 5, 6, 7]], mult: { 0: 1.2, 3: 1.1, 7: 1.3 }, wt: { 0: 900, 3: 900, 7: 900 }, col: { 0: 'acc' }, fx: { 0: 'knock', 3: 'sway', 7: 'tally' } },
  l13: { rows: [[0, 1, 2], [3, 4, 5, 6, 7]], mult: { 2: 1.3, 5: 1.1, 7: 1.15 }, wt: { 2: 900, 5: 900, 7: 900 }, col: { 2: 'acc' }, fx: { 2: 'shiver', 6: 'drift', 7: 'drift' } },
  l14: { rows: [[0, 1, 2, 3], [4, 5, 6, 7, 8]], mult: { 0: 1.25, 1: 1.25, 2: 1.25, 3: 1.25, 8: 1.4 }, wt: { 0: 900, 1: 900, 2: 900, 3: 900, 8: 900 }, col: { 8: 'acc' }, fx: { 0: 'stutter', 1: 'stutter', 2: 'stutter', 3: 'stutter' } },
  // pre-chorus 2: the keys
  l15: { rows: [[0, 1, 2], [3, 4, 5, 6, 7]], mult: { 1: 1.15, 4: 1.15, 7: 1.4 }, col: { 7: 'acc' }, fx: { 7: 'jangle' }, grow: 1 },
  l16: { rows: [[0, 1, 2], [3, 4, 5, 6]], mult: { 2: .62, 3: 1.0, 4: 1.15, 5: 1.35, 6: 1.6 }, wt: { 2: 200 }, col: { 6: 'acc' }, fx: { 2: 'whisper' }, grow: 1, ramp: 1 },
  // chorus 2: red, louder
  l17: { rows: [[0], [1], [2]], rowSize: [216, 216, 216], tilt: 2 },
  l18: { rows: [[0, 1, 2], [3, 4, 5, 6]], rowSize: [215, 215], col: { 6: 'acc' }, fx: { 5: 'sunmask', 6: 'swing' }, tilt: -1.5 },
  l19: { rows: [[0, 1, 2], [3, 4, 5]], rowSize: [165, 270], col: { 5: 'acc' }, tilt: 1.5 },
  l20: { rows: [[0, 1, 2], [3, 4, 5]], rowSize: [150, 240], mult: { 3: .8, 4: .8, 5: 1.25 }, col: { 5: 'acc' }, fx: { 5: 'pile' } },
  // bridge: the hush
  l21: { rows: [[0, 1, 2, 3], [4, 5, 6]], mult: { 3: 1.1, 6: 1.25 }, wt: { 3: 500, 6: 300 }, fx: { 6: 'droop' } },
  l22: { rows: [[0, 1, 2, 3], [4, 5, 6, 7, 8]], mult: { 8: 1.55 }, col: { 8: 'acc' }, wt: { 8: 300 }, fx: { 8: 'sunrise' } },
  l23: { rows: [[0], [1, 2, 3]], rowSize: [96, 150], fam: { 1: 'Anton', 2: 'Anton', 3: 'Anton' }, up: { 1: 1, 2: 1, 3: 1 }, col: { 3: 'acc' }, wt: { 0: 300 }, fx: { 3: 'beatpulse' } },
};
