// art_door.js: the rest of the door: a lintel banner with a fringe, couplet strips, a seal strip over the seam.
// The single Chinese character on screen (nian, "year") is drawn from six block-cut strokes.
import { motifs } from './motifs.js';

export const LINTEL_W = 900, LINTEL_H = 190;
export const COUPLET_W = 110, COUPLET_H = 760;
export const SEAL_W = 420, SEAL_H = 84;

// the character for "year", six strokes in a box of half-size s around (cx, cy)
export function nian(P, cx, cy, s, w) {
  const X = (u) => cx + u * s, Y = (v) => cy + v * s;
  P.line((c) => {
    c.moveTo(X(-.12), Y(-1)); c.quadraticCurveTo(X(-.5), Y(-.85), X(-.8), Y(-.48));        // 1 left-falling
    c.moveTo(X(-.55), Y(-.48)); c.lineTo(X(.78), Y(-.48));                                   // 2 top bar
    c.moveTo(X(-.7), Y(.04)); c.lineTo(X(.62), Y(.04));                                      // 3 middle bar
    c.moveTo(X(-.7), Y(.04)); c.lineTo(X(-.7), Y(.56));                                      // 4 short down
    c.moveTo(X(-.95), Y(.56)); c.lineTo(X(.95), Y(.56));                                     // 5 bottom bar
    c.moveTo(X(.1), Y(-.48)); c.lineTo(X(.1), Y(.95)); c.quadraticCurveTo(X(.1), Y(1.02), X(-.1), Y(1.02));   // 6 centre stroke with a hook
  }, w);
}

export function lintel(P) {
  const M = motifs(P), W = LINTEL_W;
  // banner field
  P.fill('red', (c) => c.rect(8, 8, W - 16, 112), { w: 8, edge: 8 });
  P.line((c) => c.rect(22, 22, W - 44, 84), 4);
  // central roundel with the character
  P.fill('yellow', (c) => P.ell(W / 2, 64, 76, 70, 0, 22), { w: 8, edge: 8 });
  P.fill('red', (c) => P.ell(W / 2, 64, 56, 52, 0, 20), { over: false, w: 5 });
  nian(P, W / 2, 64, 36, 12);
  // motifs either side
  for (const sg of [-1, 1]) {
    M.bat(W / 2 + sg * 190, 64, .38 * sg, 'yellow');
    M.coin(W / 2 + sg * 290, 64, 28);
    M.peony(W / 2 + sg * 372, 64, .62 * sg);
  }
  // fringe: pendants hanging below the banner
  const n = 15, pw = (W - 16) / n, cols = ['yellow', 'green', 'peach', 'indigo'];
  for (let i = 0; i < n; i++) {
    const x0 = 8 + i * pw, col = cols[i % 4];
    P.fill(col, (c) => P.poly([[x0 + 2, 118], [x0 + pw - 2, 118], [x0 + pw - 2, 150], [x0 + pw / 2, 180], [x0 + 2, 150]], true), { w: 5, edge: 6 });
    P.fill('red', (c) => P.ell(x0 + pw / 2, 142, 6, 6, 0, 8), { over: true, line: false });
  }
}

export function couplet(P, kind = 0) {
  const M = motifs(P), W = COUPLET_W, H = COUPLET_H;
  P.fill('red', (c) => c.rect(6, 6, W - 12, H - 12), { w: 8, edge: 8 });
  P.line((c) => c.rect(18, 18, W - 36, H - 36), 4);
  // chain of motifs down the strip
  const cx = W / 2;
  if (kind === 0) {
    M.bat(cx, 78, .46, 'yellow');
    for (let i = 0; i < 4; i++) M.coin(cx, 190 + i * 96, 34);
    M.peony(cx, 610, .9);
    M.cloud(cx + 10, 704, .26, 'indigo');
  } else {
    M.bat(cx, 78, -.46, 'yellow');
    M.peony(cx, 186, .9);
    for (let i = 0; i < 4; i++) M.coin(cx, 300 + i * 96, 34);
    M.cloud(cx - 10, 704, -.26, 'indigo');
  }
  P.line((c) => { c.moveTo(cx, 120); c.lineTo(cx, H - 120); }, 3);
}

export function seal(P) {
  const M = motifs(P), W = SEAL_W, H = SEAL_H;
  P.fill('red', (c) => c.rect(6, 6, W - 12, H - 12), { w: 7, edge: 7 });
  P.line((c) => c.rect(16, 16, W - 32, H - 32), 3.5);
  for (let i = 0; i < 6; i++) M.coin(W / 2 + (i - 2.5) * 66, H / 2, 20);
}
