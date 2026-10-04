// The master palette: 54 fixed colours, addressed like the hardware did: id = (level << 4) | column.
// 4 brightness levels x 13 columns (1 grey ramp + 12 hues) = 52, plus two extra darks in column 13 = 54.
// Nothing in the film may be any other colour: a pixel is a master id, never an RGB value.
const HUES = [null, 240, 268, 300, 332, 358, 14, 32, 52, 84, 132, 166, 196]; // columns 1..12
const LEVEL = [{ s: 0.92, v: 0.36 }, { s: 0.80, v: 0.72 }, { s: 0.62, v: 0.98 }, { s: 0.26, v: 1.0 }];
function hsv(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
export const MASTER = {};                      // id -> [r,g,b]
const GREY = [[84, 84, 90], [152, 152, 160], [208, 208, 214], [252, 252, 252]];
for (let l = 0; l < 4; l++) {
  MASTER[l << 4] = GREY[l];
  for (let c = 1; c <= 12; c++) MASTER[(l << 4) | c] = hsv(HUES[c], LEVEL[l].s, LEVEL[l].v);
}
MASTER[0x0d] = [0, 0, 0];                      // black
MASTER[0x2d] = [236, 224, 238];                // paper white (cool)
export const IDS = Object.keys(MASTER).map(Number).sort((a, b) => a - b);
export const COUNT = IDS.length;               // 54
export const isMaster = id => Object.prototype.hasOwnProperty.call(MASTER, id);
export const rgb = id => { if (!isMaster(id)) throw new Error('not a master colour: 0x' + id.toString(16)); return MASTER[id]; };
// A palette fade is a step down the brightness levels: each step lowers every colour by one level; below level 0 -> black.
export function fadeId(id, steps) {
  if ((id & 15) === 13) return steps > 0 ? 0x0d : id;
  const l = (id >> 4) - steps;
  return l < 0 ? 0x0d : (l << 4) | (id & 15);
}
// Named ids, so scene code reads like a palette sheet: C.<hue><level>
const NAMES = ['grey', 'blue', 'indigo', 'violet', 'magenta', 'crimson', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan'];
export const C = { black: 0x0d, paper: 0x2d };
NAMES.forEach((n, c) => { for (let l = 0; l < 4; l++) C[n + l] = (l << 4) | c; });
