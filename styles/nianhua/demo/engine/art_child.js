// art_child.js: an original composition. A plump child sits on a lotus leaf and hugs a carp upright,
// a lotus held high. 800 x 1000 design units. Painter's order, back to front.
import { motifs } from './motifs.js';

export const CHILD_W = 800, CHILD_H = 1000;

export function child(P) {
  const M = motifs(P);
  // ---- frame: vermilion band with coin dots
  P.fill('red', (c) => { c.rect(26, 26, 748, 948); c.moveTo(66, 66); c.lineTo(66, 934); c.lineTo(734, 934); c.lineTo(734, 66); c.closePath(); }, { rule: 'evenodd', line: false, edge: 6 });
  P.line((c) => { c.rect(26, 26, 748, 948); }, 7); P.line((c) => { c.rect(66, 66, 668, 868); }, 5);
  for (let i = 0; i < 17; i++) { const x = 66 + 20 + i * 39.5; M.dot(x, 46, 8); M.dot(x, 954, 8); }
  for (let i = 0; i < 21; i++) { const y = 66 + 12 + i * 41; M.dot(46, y, 8); M.dot(754, y, 8); }

  // ---- sun disc behind the child
  P.fill('yellow', (c) => P.ell(400, 480, 300, 300, 0, 28), { edge: 12 });
  for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283 + .1, r0 = 316, r1 = 352; P.line((c) => { c.moveTo(400 + Math.cos(a) * r0, 480 + Math.sin(a) * r0); c.lineTo(400 + Math.cos(a) * r1, 480 + Math.sin(a) * r1); }, 5); }

  // ---- auspicious clouds, bats and coins in the sky
  M.cloud(130, 470, .8, 'indigo'); M.cloud(660, 240, -.85, 'indigo');
  M.bat(150, 108, 1, 'red'); M.bat(655, 118, -1, 'red');
  M.coin(400, 132, 30);

  // ---- water
  P.fill('indigo', (c) => { c.moveTo(66, 818); for (let i = 0; i < 8; i++) { const x0 = 66 + i * 83.5; c.quadraticCurveTo(x0 + 21, 792, x0 + 41.75, 818); c.quadraticCurveTo(x0 + 62, 844, x0 + 83.5, 818); } c.lineTo(734, 934); c.lineTo(66, 934); c.closePath(); }, { edge: 10 });
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const x = 100 + i * 112 + (r % 2) * 56, y = 862 + r * 28; P.line((c) => { c.moveTo(x, y); c.quadraticCurveTo(x + 22, y - 18, x + 44, y); c.quadraticCurveTo(x + 22, y - 8, x, y); }, 4); }

  // ---- back lotus leaves
  P.fill('green', (c) => P.ell(138, 690, 96, 56, -.4, 18), { edge: 9 });
  P.line((c) => { c.moveTo(138, 690); c.lineTo(78, 722); c.moveTo(138, 690); c.lineTo(110, 640); c.moveTo(138, 690); c.lineTo(200, 650); }, 4);
  P.fill('green', (c) => P.ell(668, 700, 92, 52, .35, 18), { edge: 9 });
  P.line((c) => { c.moveTo(668, 700); c.lineTo(726, 730); c.moveTo(668, 700); c.lineTo(700, 654); c.moveTo(668, 700); c.lineTo(612, 668); }, 4);

  // ---- the big leaf the child sits on
  P.fill('green', (c) => {
    const pts = [], n = 22;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283, r = 1 + (i % 2 ? -.045 : .03); pts.push([400 + Math.cos(a) * 322 * r, 808 + Math.sin(a) * 104 * r]); }
    P.curve(pts, true);
  }, { edge: 12 });
  for (let i = 0; i < 12; i++) { const a = Math.PI * (.05 + i / 11 * .9); P.line((c) => { c.moveTo(400, 800); c.quadraticCurveTo(400 + Math.cos(a) * 160, 800 + Math.sin(a) * 40, 400 + Math.cos(a) * 292, 808 + Math.sin(a) * 90); }, 3.5); }

  // ---- torso
  P.fill('peach', (c) => P.curve([[300, 470], [400, 452], [500, 470], [530, 560], [522, 640], [500, 706], [400, 720], [300, 706], [278, 640], [270, 560]], true), {});
  // bib (dudou), vermilion with yellow trim
  P.fill('red', (c) => P.curve([[372, 462], [428, 462], [468, 520], [452, 622], [400, 706], [348, 622], [332, 520]], true), {});
  P.fill('yellow', (c) => P.ell(400, 596, 38, 38, 0, 14), { over: true });
  P.fill('red', (c) => P.ell(400, 596, 18, 18, 0, 10), { over: true, line: false });
  P.line((c) => { c.moveTo(372, 464); c.quadraticCurveTo(400, 500, 428, 464); }, 5);
  P.line((c) => { c.moveTo(350, 530); c.lineTo(344, 560); c.moveTo(450, 530); c.lineTo(456, 560); }, 4);
  // belly button hint & fold lines
  P.line((c) => { c.moveTo(270, 690); c.quadraticCurveTo(290, 700, 304, 690); c.moveTo(496, 690); c.quadraticCurveTo(512, 700, 530, 690); }, 4);

  // ---- legs (indigo trousers, yellow shoes), in front of the lap
  P.fill('indigo', (c) => P.cap(352, 690, 276, 778, 58, 48), {});
  P.fill('indigo', (c) => P.cap(448, 690, 524, 778, 58, 48), {});
  P.fill('peach', (c) => P.ell(250, 802, 36, 22, -.4, 12), {});
  P.fill('peach', (c) => P.ell(550, 802, 36, 22, .4, 12), {});
  P.fill('yellow', (c) => P.ell(244, 806, 32, 20, -.4, 12), { over: true });
  P.fill('yellow', (c) => P.ell(556, 806, 32, 20, .4, 12), { over: true });
  P.fill('red', (c) => P.ell(238, 806, 8, 8, 0, 8), { over: true, line: false });
  P.fill('red', (c) => P.ell(562, 806, 8, 8, 0, 8), { over: true, line: false });
  P.line((c) => { c.moveTo(286, 750); c.lineTo(310, 786); c.moveTo(514, 750); c.lineTo(490, 786); c.moveTo(360, 640); c.quadraticCurveTo(400, 668, 440, 640); }, 4);
  // waistband
  P.fill('yellow', (c) => P.curve([[318, 676], [400, 692], [482, 676], [486, 704], [400, 724], [314, 704]], true), { over: true, w: 5 });

  // ---- neck
  P.fill('peach', (c) => P.curve([[366, 440], [434, 440], [440, 478], [360, 478]], true), {});

  // ---- lotus stem + flower held high on the viewer's left
  P.fill('green', (c) => P.cap(186, 300, 232, 440, 7, 8), { edge: 6 });
  M.lotus(176, 262, 1.0);

  // ---- the carp, held upright on the viewer's right
  M.carp(584, 380);

  // ---- arms
  P.fill('peach', (c) => P.ell(308, 506, 36, 34, 0, 12), { line: false });
  P.fill('peach', (c) => P.ell(494, 508, 36, 34, 0, 12), { line: false });
  // child's right arm raised to the lotus
  P.fill('peach', (c) => P.cap(312, 504, 246, 430, 33, 27), {});
  P.fill('yellow', (c) => P.ell(268, 452, 30, 12, -.8, 12), { over: true, line: true, w: 4 });
  P.fill('peach', (c) => P.ell(234, 416, 30, 28, 0, 14), {});
  P.line((c) => { c.moveTo(218, 402); c.quadraticCurveTo(232, 392, 250, 400); c.moveTo(216, 420); c.quadraticCurveTo(230, 432, 250, 426); }, 4);
  // child's left arm: around the carp, hand clasped over its back
  P.fill('peach', (c) => P.cap(490, 506, 560, 590, 34, 28), {});
  P.fill('yellow', (c) => P.ell(526, 552, 30, 12, .8, 12), { over: true, line: true, w: 4 });
  P.fill('peach', (c) => P.ell(560, 592, 32, 32, 0, 12), {line:false});
  P.fill('peach', (c) => P.cap(560, 590, 482, 628, 28, 26), {});
  P.fill('peach', (c) => P.ell(474, 632, 28, 24, .3, 12), {});
  P.line((c) => { c.moveTo(458, 624); c.lineTo(470, 640); c.moveTo(470, 616); c.lineTo(484, 636); }, 4);

  // ---- head
  P.fill('peach', (c) => P.ell(290, 366, 22, 28, 0, 10), {});              // ears
  P.fill('peach', (c) => P.ell(510, 366, 22, 28, 0, 10), {});
  P.fill('yellow', (c) => P.ell(284, 396, 9, 9, 0, 8), { over: true, w: 4 });
  P.fill('yellow', (c) => P.ell(516, 396, 9, 9, 0, 8), { over: true, w: 4 });
  P.fill('peach', (c) => P.ell(400, 360, 122, 112, 0, 26), {});
  // topknots
  P.fill('ink', (c) => P.ell(318, 262, 40, 40, 0, 14), {});
  P.fill('ink', (c) => P.ell(482, 262, 40, 40, 0, 14), {});
  P.fill('red', (c) => P.ell(318, 292, 14, 10, 0, 8), { over: true, w: 4 });
  P.fill('red', (c) => P.ell(482, 292, 14, 10, 0, 8), { over: true, w: 4 });
  // fringe
  P.fill('ink', (c) => P.curve([[286, 330], [296, 290], [340, 256], [400, 246], [460, 256], [506, 290], [516, 330], [490, 300], [450, 322], [420, 296], [388, 322], [352, 300], [318, 324]], true), {});
  // forehead dot
  P.fill('red', (c) => P.ell(400, 304, 9, 9, 0, 8), { over: true, line: false });
  // cheeks
  P.fill('red', (c) => P.ell(334, 400, 28, 20, 0, 12), { over: true, line: false });
  P.fill('red', (c) => P.ell(466, 400, 28, 20, 0, 12), { over: true, line: false });
  // eyes, brows, nose, mouth
  P.ink((c) => P.ell(352, 360, 12, 15, 0, 10)); P.ink((c) => P.ell(448, 360, 12, 15, 0, 10));
  P.line((c) => { c.moveTo(326, 336); c.quadraticCurveTo(350, 322, 374, 334); c.moveTo(426, 334); c.quadraticCurveTo(450, 322, 474, 336); }, 5);
  P.line((c) => { c.moveTo(392, 380); c.quadraticCurveTo(400, 392, 408, 380); }, 4);
  P.fill('red', (c) => P.curve([[366, 410], [400, 428], [434, 410], [420, 442], [400, 448], [380, 442]], true), { over: true, w: 5 });
  P.line((c) => { c.moveTo(386, 436); c.quadraticCurveTo(400, 442, 414, 436); }, 3);

  // ---- peony at the foot of the leaf, coin strings
  M.peony(112, 842, 1);
  M.peony(690, 848, -.9);
}
