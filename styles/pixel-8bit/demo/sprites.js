// Sprite sheet for Dusklight: hand-authored ASCII, 3 colours + transparent per sub-palette, original characters.
// Sub-palettes (global for a frame): 0 = Wick's head half (black, red hat, skin)   1 = Wick's body half (black, blue coat, skin)
//                                    2 = gold light (black, orange, pale yellow)   3 = moths (dark, violet, white)
import { Sheet } from './ppu.js';
import { glyphRows } from './font.js';
import { C } from './palette.js';

const fit = (rows, w = 16) => rows.map(r => r.padEnd(w, '.').slice(0, w));
const mir = h => h + [...h].reverse().join('');
// ---- Wick, the lamplighter: 16x24, the head half (rows 0-15) uses palette 0, the coat half (rows 16-23) palette 1
const TOP = [
  '................', '.......11.......', '......1221......', '.....122221.....', '.....122221.....', '....12222221....', '....12222221....', '...1222222221...',
  '...1222222221...', '..111111111111..', '...13333333311..', '...13333133331..', '...1333333331...', '....13333311....', '.....1111111....', '....1222222221..',
  '...122222222221.', '...122222222221.', '..1312222222131.', '...111222222111.',
];
const LEGS = {
  stand: ['.....12211221...', '.....12211221...', '.....12211221...', '....1111.11111..'],
  stepA: ['....12211.1221..', '...1221...12211.', '..1221.....1221.', '.11111.....1111.'],
  stepB: ['.....12211221...', '....1221..1221..', '...1221....1221.', '..1111.....1111.'],
  climb: ['....111...1111..', '...111.....111..', '...111.....111..', '..1111....1111..'],
};
// back view for the ladder: red hat, back of the head, a raised hand on one side (mirrored with flipH for the other limb)
const CLIMB_TOP = [
  '................', '.......11.......', '......1221......', '.....122221.....', '.....122221.....', '....12222221....', '....12222221....', '...1222222221...',
  '...1222222221...', '..111111111111..', '.13.133333311...', '.131133333311...', '..11.13333311...', '.....1333331....', '.....1111111....', '....1222222221..',
  '...122222222131.', '...12222222221..', '...1222222221...', '...111222222111.',
];
// the raised-lantern pose: stand, plus an arm up the right side (the lantern sprite sits over the hand)
const RAISE_TOP = TOP.map((r, y) => y >= 3 && y <= 15 ? r.slice(0, 13) + '31' + r.slice(15) : r).map(r => r.slice(0, 16));
const spin = n => { // coin turning: width by frame
  const rx = [7, 5, 2, 5][n], g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = (x - 7.5) / rx, dy = (y - 7.5) / 7.2, d = dx * dx + dy * dy; if (d > 1) continue;
    g[y][x] = d > 0.72 ? '1' : d > 0.5 ? '2' : '3';
    if (n === 0 && d < 0.18 && dx < 0 && dy < 0) g[y][x] = '2';
  }
  return g.map(r => r.join(''));
};
const star = big => { // four-point flare, 16x16
  const g = Array.from({ length: 16 }, () => Array(16).fill('.')), L = big ? 7 : 4;
  for (let i = -L; i <= L; i++) { const t = Math.abs(i) > L - 3 ? '2' : '3'; g[8 + i < 0 ? 0 : 8 + i][7] = t; g[7][8 + i < 0 ? 0 : 8 + i] = t; g[8 + i][8] = t; g[8][8 + i] = t; }
  if (big) for (let i = -3; i <= 3; i++) { if (i) { g[8 + i][8 + i] = '2'; g[7 - i][8 + i] = '2'; } }
  return g.map(r => r.join(''));
};
// lamp glow: a lit glass with a dithered halo, 24x24 (3x3 tiles), drawn over a painted dark lamp
const glow = () => {
  const g = Array.from({ length: 24 }, () => Array(24).fill('.'));
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const d = Math.hypot(x - 11.5, y - 11.5); if (d < 11.5 && d > 7 && (x + y) % 2 === 0) g[y][x] = '2'; }
  for (let y = 6; y < 17; y++) for (let x = 7; x < 16; x++) g[y][x] = (y + x) % 7 === 0 ? '2' : '3';
  return g.map(r => r.join(''));
};
export function buildSheet() {
  const s = new Sheet(), big = (n, rows, w = 16) => s.addBig(n, fit(rows, w));
  big('stand', [...TOP, ...LEGS.stand]); big('stepA', [...TOP, ...LEGS.stepA]); big('stepB', [...TOP, ...LEGS.stepB]);
  big('climb', [...CLIMB_TOP, ...LEGS.climb]); big('raise', [...RAISE_TOP, ...LEGS.stand]);
  // moths, 16x8, two wing frames
  s.addBig('moth0', ['23......', '2332....', '23332...', '.233321.', '..23321.', '...2221.', '....111.', '........'].map(mir));
  s.addBig('moth1', ['........', '....111.', '...2221.', '..23321.', '.233321.', '23332...', '2332....', '23......'].map(mir));
  s.add('lamp0', ['...11...', '..1111..', '.123321.', '.133331.', '.133331.', '.123321.', '..1111..', '...11...']);
  s.add('lamp1', ['...11...', '..1221..', '.123321.', '.133331.', '.133331.', '.122221.', '..1111..', '...11...']);
  for (let i = 0; i < 4; i++) big('coin' + i, spin(i));
  big('flare0', star(true)); big('flare1', star(false));
  big('glow', glow(), 24);
  s.add('cursor', glyphRows('>'));
  return s;
}
export const SPR_PAL = [[C.black, C.red1, C.orange2], [C.black, C.blue1, C.orange2], [C.black, C.orange2, C.yellow3], [C.indigo0, C.violet3, C.paper]];
// a w x h-tile picture to OAM entries; pal may be an array per tile row
export function meta(sheet, name, x, y, cols, rows, pal, opt = {}) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const flip = !!opt.flipH, cc = flip ? cols - 1 - c : c;
    out.push({ x: x + c * 8, y: y + r * 8, tile: sheet.id(`${name}_${cc}_${r}`), pal: Array.isArray(pal) ? pal[r] : pal, flipH: flip, flipV: false, behind: !!opt.behind });
  }
  return out;
}
export const WICK_PAL = [0, 0, 1];                                  // tile rows 0-2
