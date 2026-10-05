// Label geometry shared by the page and tools/placelabels.mjs (pure).
export const SIZE = 22, SIZE_X = 25, GAP = 17, HALO = 3;
// box of a label (x0, y0, w, h) relative to the station centre for each anchor
export function boxFor(dir, w, h) {
  const g = GAP, d = g * .72;
  switch (dir) {
    case 'nc': return [-w / 2, -g - h, w, h];
    case 'sc': return [-w / 2, g, w, h];
    case 'n': return [-8, -g - h, w, h];       // starts at the tick, runs right, above the line
    case 'nw': return [8 - w, -g - h, w, h];   // ends at the tick, runs left, above the line
    case 's': return [-8, g, w, h];
    case 'sw': return [8 - w, g, w, h];
    case 'e': return [g + 2, -h / 2, w, h];
    case 'w': return [-g - 2 - w, -h / 2, w, h];
    case 'ne': return [d, -d - h + 4, w, h];
    case 'se': return [d, d - 4, w, h];
    case 'ex': return [g + 16, -h / 2, w, h];
    case 'wx': return [-g - 16 - w, -h / 2, w, h];
    case 'nx': return [-w / 2, -g - 14 - h, w, h];
    case 'sx': return [-w / 2, g + 14, w, h];
    case 'nwd': return [-d - w, -d - h + 4, w, h];
    case 'swd': return [-d - w, d - 4, w, h];
  }
  throw new Error('bad label anchor ' + dir);
}
