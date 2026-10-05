// art_guardian.js: an original door guardian, 440 x 840 units. One block is cut once and printed twice,
// the second time mirrored, with the armour and the skirt colours swapped between the pair.
import { motifs } from './motifs.js';

export const GUARD_W = 440, GUARD_H = 840;

export function guardian(P, swap = false) {
  const M = motifs(P), A = swap ? 'green' : 'red', B = swap ? 'red' : 'green', cx = 220;
  const mx = (x) => 2 * cx - x;

  // ---- frame: indigo band with yellow dots
  P.fill('indigo', (c) => { c.rect(10, 10, 420, 820); c.moveTo(40, 40); c.lineTo(40, 800); c.lineTo(400, 800); c.lineTo(400, 40); c.closePath(); }, { rule: 'evenodd', line: false, edge: 6 });
  P.line((c) => c.rect(10, 10, 420, 820), 7); P.line((c) => c.rect(40, 40, 360, 760), 5);
  for (let i = 0; i < 10; i++) { const x = 40 + 18 + i * 36; M.dot(x, 25, 6); M.dot(x, 815, 6); }
  for (let i = 0; i < 20; i++) { const y = 40 + 20 + i * 37; M.dot(25, y, 6); M.dot(415, y, 6); }

  // ---- back: halo disc, flags
  P.fill('yellow', (c) => P.ell(cx, 300, 190, 190, 0, 26), { edge: 10 });
  const flag = (x0, y0, x1, y1, col) => {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    P.line((c) => { c.moveTo(x0, y0); c.lineTo(x1, y1); }, 5);
    P.fill(col, (c) => P.poly([[x1, y1], [x1 + (x0 - x1) * .1 + nx * 52, y1 + (y0 - y1) * .1 + ny * 52], [x1 + (x0 - x1) * .62 + nx * 22, y1 + (y0 - y1) * .62 + ny * 22]], true), { w: 5 });
  };
  flag(150, 300, 52, 128, 'indigo'); flag(300, 300, mx(52) + 0, 128, 'red');
  flag(140, 330, 40, 238, 'yellow'); flag(300, 330, 400, 238, 'green');

  // ---- weapon: halberd on the viewer's left
  P.fill('yellow', (c) => { c.rect(66, 130, 12, 660); }, { w: 5 });
  P.fill('indigo', (c) => P.curve([[72, 46], [126, 72], [132, 128], [100, 164], [72, 166], [72, 136], [94, 112], [88, 84], [72, 70]], true), { w: 7 });
  P.line((c) => { c.moveTo(78, 60); c.quadraticCurveTo(114, 82, 110, 128); }, 4);
  P.fill('red', (c) => P.curve([[72, 172], [96, 202], [82, 244], [72, 262], [62, 244], [48, 202]], true), { over: true, w: 5 });

  // ---- plumes and helmet
  const plume = (s) => { const X = (x) => s > 0 ? x : mx(x); P.line((c) => { c.moveTo(X(206), 78); c.bezierCurveTo(X(160), 30, X(84), 26, X(48), 84); }, 9); P.fill('green', (c) => P.curve([[X(48), 84], [X(36), 62], [X(52), 56], [X(66), 74]], true), { over: true, w: 5 }); for (let i = 0; i < 6; i++) { const t = .16 + i * .13, bx = X(206 + (40 - 206) * t * 1.05), by = 78 - Math.sin(t * 3.14) * 46 + t * 40; P.line((c) => { c.moveTo(bx, by); c.lineTo(bx + (s > 0 ? -1 : 1) * 4, by + 22); }, 4); } };
  plume(1); plume(-1);
  P.fill('yellow', (c) => P.ell(cx, 124, 66, 58, 0, 20), { w: 7 });
  P.fill('red', (c) => P.ell(cx, 58, 15, 15, 0, 8), { w: 5 });
  P.line((c) => { c.moveTo(cx, 72); c.lineTo(cx, 100); }, 6);
  P.fill('red', (c) => P.curve([[152, 140], [220, 154], [288, 140], [290, 164], [220, 178], [150, 164]], true), { over: true, w: 6 });
  P.fill('yellow', (c) => P.curve([[154, 146], [128, 172], [136, 218], [162, 192]], true), { w: 5 });
  P.fill('yellow', (c) => P.curve([[286, 146], [312, 172], [304, 218], [278, 192]], true), { w: 5 });

  // ---- face
  P.fill('peach', (c) => P.curve([[160, 172], [220, 182], [280, 172], [284, 220], [264, 262], [220, 278], [176, 262], [156, 220]], true), {});
  P.fill('red', (c) => P.ell(184, 236, 20, 14, 0, 10), { over: true, line: false });
  P.fill('red', (c) => P.ell(256, 236, 20, 14, 0, 10), { over: true, line: false });
  P.ink((c) => P.poly([[170, 198], [208, 206], [210, 196], [172, 184]], true)); P.ink((c) => P.poly([[270, 198], [232, 206], [230, 196], [268, 184]], true));
  P.line((c) => { c.moveTo(180, 214); c.quadraticCurveTo(194, 206, 208, 216); c.quadraticCurveTo(194, 224, 180, 214); c.moveTo(232, 216); c.quadraticCurveTo(246, 206, 260, 214); c.quadraticCurveTo(246, 224, 232, 216); }, 4);
  P.ink((c) => { P.ell(196, 215, 6, 6, 0, 8); P.ell(244, 215, 6, 6, 0, 8); });
  P.line((c) => { c.moveTo(220, 214); c.quadraticCurveTo(212, 236, 220, 244); c.quadraticCurveTo(228, 246, 232, 242); }, 4);
  // moustache and beard
  P.fill('ink', (c) => P.curve([[220, 250], [244, 240], [284, 246], [316, 262], [284, 258], [252, 262], [220, 258], [188, 262], [156, 258], [124, 262], [156, 246], [196, 240]], true), { line: false });
  P.fill('red', (c) => P.curve([[200, 268], [220, 274], [240, 268], [232, 282], [208, 282]], true), { over: true, w: 4 });

  // ---- collar and shoulders
  P.fill(B, (c) => P.curve([[160, 280], [220, 304], [280, 280], [304, 310], [220, 350], [136, 310]], true), { w: 6 });
  P.fill('yellow', (c) => P.ell(104, 336, 58, 46, -.15, 18), { w: 7 });
  P.fill('yellow', (c) => P.ell(336, 336, 58, 46, .15, 18), { w: 7 });
  P.line((c) => { P.ell(104, 336, 36, 28, -.15, 14); P.ell(336, 336, 36, 28, .15, 14); c.moveTo(70, 350); c.quadraticCurveTo(104, 372, 138, 350); c.moveTo(302, 350); c.quadraticCurveTo(336, 372, 370, 350); }, 4);

  // ---- breastplate with a beast-face disc
  P.fill(A, (c) => P.curve([[150, 322], [220, 342], [290, 322], [298, 410], [290, 496], [220, 510], [150, 496], [142, 410]], true), {});
  for (let r = 0; r < 4; r++) P.line((c) => { c.moveTo(152, 452 + r * 13); c.quadraticCurveTo(176, 462 + r * 13, 196, 452 + r * 13); c.moveTo(244, 452 + r * 13); c.quadraticCurveTo(264, 462 + r * 13, 288, 452 + r * 13); }, 3);
  P.fill('yellow', (c) => P.ell(220, 400, 46, 46, 0, 18), { over: true, w: 6 });
  P.fill('indigo', (c) => P.ell(220, 400, 26, 26, 0, 12), { over: true, w: 5 });
  P.fill('yellow', (c) => P.ell(220, 400, 10, 10, 0, 8), { over: true, line: false });
  P.line((c) => { for (let i = -3; i <= 3; i++) { c.moveTo(220 + i * 14, 290); c.quadraticCurveTo(220 + i * 20 + 8, 330, 220 + i * 11, 372 - Math.abs(i) * 8); } c.moveTo(168, 262); c.quadraticCurveTo(162, 300, 190, 336); c.moveTo(272, 262); c.quadraticCurveTo(278, 300, 250, 336); }, 6);
  // belt
  P.fill('yellow', (c) => P.curve([[138, 496], [220, 510], [302, 496], [306, 530], [220, 548], [134, 530]], true), { over: true, w: 6 });
  P.fill('green', (c) => P.ell(220, 524, 20, 17, 0, 10), { over: true, w: 6 });

  // ---- robe skirt, wide, with a hem and wave embroidery
  P.fill(B, (c) => P.curve([[138, 536], [220, 552], [302, 536], [346, 640], [352, 724], [220, 736], [88, 724], [94, 640]], true), { w: 7 });
  P.fill('yellow', (c) => P.curve([[92, 700], [220, 712], [348, 700], [352, 730], [220, 744], [88, 730]], true), { over: true, w: 6 });
  P.line((c) => { c.moveTo(220, 552); c.lineTo(220, 712); }, 5);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) { const x = 130 + i * 44 + (r % 2) * 22, y = 600 + r * 30; P.line((c) => { c.moveTo(x - 14 + (i >= 2 ? 36 : 0), y); c.quadraticCurveTo(x + (i >= 2 ? 36 : 0), y + 14, x + 14 + (i >= 2 ? 36 : 0), y); }, 3.5); }

  // ---- sleeves and hands
  // viewer's left: sleeve falls to the fist on the halberd
  P.fill(B, (c) => P.curve([[60, 350], [138, 348], [150, 420], [124, 500], [80, 508], [62, 440]], true), { w: 6 });
  P.fill('yellow', (c) => P.curve([[80, 480], [124, 486], [124, 508], [80, 514]], true), { over: true, w: 5 });
  P.fill('peach', (c) => P.ell(74, 534, 30, 28, 0, 12), {});
  P.line((c) => { c.moveTo(56, 526); c.lineTo(92, 526); c.moveTo(56, 540); c.lineTo(92, 540); }, 4);
  // viewer's right: elbow out, fist on the belt
  P.fill(B, (c) => P.curve([[300, 350], [380, 346], [422, 430], [396, 478], [350, 468], [322, 432]], true), { w: 6 });
  P.fill('yellow', (c) => P.curve([[352, 440], [402, 436], [398, 470], [350, 476]], true), { over: true, w: 5 });
  P.fill('peach', (c) => P.ell(322, 522, 28, 26, 0, 12), {});
  P.fill(B, (c) => P.cap(380, 446, 330, 510, 24, 20), { w: 6 });

  // ---- boots
  P.fill('indigo', (c) => P.curve([[92, 752], [168, 748], [172, 790], [112, 800], [60, 796], [74, 770]], true), { w: 6 });
  P.fill('indigo', (c) => P.curve([[348, 752], [272, 748], [268, 790], [328, 800], [380, 796], [366, 770]], true), { w: 6 });
  P.fill('yellow', (c) => P.curve([[92, 752], [168, 748], [170, 766], [90, 772]], true), { over: true, w: 5 });
  P.fill('yellow', (c) => P.curve([[348, 752], [272, 748], [270, 766], [350, 772]], true), { over: true, w: 5 });
  M.cloud(150, 804, .42, 'indigo'); M.cloud(300, 806, -.42, 'indigo');
}
