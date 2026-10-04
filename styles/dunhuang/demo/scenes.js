// scenes.js: the gate-3 compositions drawn from the real engine. Everything is drawn in wall coordinates;
// the camera is a translate (and optional zoom) so the plaster stays under the paint.
import { clamp, lerp, seg, ss, mulberry, TAU } from '/core/lib.js';
import { PAL, mix, wire, halo, polyPath, catmull } from './brush.js';
import { groundFill, scatter, thousand, vine, diaper, lotus, coffer, cloudStream, pennants, plaque, flower } from './motifs.js';
import { drawApsara } from './apsara.js';

const F = { title: '700 64px "Ma Shan Zheng"', sub: '600 46px "Noto Serif SC"', small: '600 26px "Noto Serif SC"' };

function frameBands(ctx, x, y, w, h) {   // painted rule lines between registers
  ctx.fillStyle = PAL.lead; ctx.fillRect(x, y, w, h); ctx.fillStyle = PAL.cinnabarD; ctx.fillRect(x, y + h * .3, w, h * .4);
  ctx.fillStyle = PAL.soot; ctx.fillRect(x, y - 1.5, w, 3); ctx.fillRect(x, y + h - 1.5, w, 3);
}

export const SCENES = {
  // 1. one flying figure on red earth between two thousand-figure borders
  apsara: {
    wall: { W: 2100, H: 1220, seed: 11, crack: 1.1, loss: .36, edge: .6, wearBias: 0 },
    cam: { x: 90, y: 70, z: 1 },
    paint(ctx, t, q) {
      groundFill(ctx, 0, 0, 2100, 1220, PAL.earth, 5);
      scatter(ctx, [0, 220, 2100, 800], 46, 21, (x, y) => (x > 1380 && y > 860) || (y < 240 || y > 990) || Math.hypot(x - 880, y - 620) < 190, [PAL.lead, PAL.lead, PAL.azuriteL, PAL.ochreL, PAL.malachiteL]);
      thousand(ctx, 0, 70, 2100, 120, 60, 3);
      thousand(ctx, 0, 1030, 2100, 120, 60, 8);
      frameBands(ctx, 0, 190, 2100, 28); frameBands(ctx, 0, 1002, 2100, 28);
      drawApsara(ctx, { x: 1010, y: 600, s: 3.1, t, seed: 1, pal: { skirt: PAL.azurite, bodice: PAL.lead } });
      plaque(ctx, 1240, 862, 760, 116, { lines: [{ text: '灯走到哪里，墙就醒到哪里。', font: F.sub, dy: 0 }] });
    },
    state(t, q) {
      const pa = q.p ?? (q.anim ? -.12 + 1.34 * ss(seg(t, .2, 2.6)) : .72), front = 100 + (1 - pa) * 1900;
      return { wake: (x, y) => 1 - (x - 100) / 1900, p: pa, band: .045, wearAmt: 1, freshWear: q.anim ? .1 : .32, lamp: { x: q.anim ? lerp(clamp(front + 120, 300, 1900), 1040, ss(seg(pa, .8, 1.15))) : 1040, y: 540, z: 130, R: 640, i: 2.7, col: [1, .85, .64] }, amb: .1, wakeJit: .1, keep: q.anim ? null : [[1232, 854, 2008, 986]] };
    },
  },
  // 2. three registers on a wall, as found: deep wear, the lamp pool in the middle
  registers: {
    wall: { W: 2100, H: 1220, seed: 23, crack: 1.3, loss: .3, edge: .5, wearBias: .1 },
    cam: { x: 90, y: 70, z: 1 },
    paint(ctx, t, q) {
      groundFill(ctx, 0, 0, 2100, 1220, PAL.earth, 9);
      groundFill(ctx, 0, 70, 2100, 270, mix(PAL.lead, PAL.ochreL, .3), 2);
      for (let i = 0; i < 8; i++) { const cx = 150 + i * 280; ctx.fillStyle = PAL.azurite; ctx.beginPath(); ctx.arc(cx, 215, 104, 0, TAU); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PAL.soot; ctx.stroke(); lotus(ctx, cx, 215, 90, i % 2 ? { rings: [{ n: 8, len: 1, w: .3, col: PAL.lead }, { n: 8, len: .7, w: .26, col: PAL.cinnabar, rot: .39 }, { n: 8, len: .42, w: .22, col: PAL.ochreL }] } : undefined); }
      pennants(ctx, 0, 70, 2100, 40, 52, [PAL.cinnabar, PAL.lead, PAL.azurite, PAL.ochre]);
      frameBands(ctx, 0, 340, 2100, 30);
      groundFill(ctx, 0, 370, 2100, 460, mix(PAL.malachiteD, PAL.earthD, .2), 4);
      scatter(ctx, [0, 380, 2100, 440], 40, 31, (x, y) => Math.hypot(x - 700, y - 600) < 210 || Math.hypot(x - 1450, y - 590) < 210, [PAL.lead, PAL.ochreL, PAL.azuriteL]);
      drawApsara(ctx, { x: 640, y: 610, s: 1.15, t, seed: 3, flip: false, hold: 'pipa', pal: { skirt: PAL.cinnabar, bodice: PAL.lead, ribA: [PAL.azuriteL, PAL.lead], ribB: [PAL.ochreL, PAL.cinnabarL], ribC: [PAL.lead, PAL.azurite] } });
      drawApsara(ctx, { x: 1380, y: 580, s: 1.15, t, seed: 5, flip: false, pal: { skirt: PAL.ochre, bodice: PAL.lead, ribA: [PAL.lead, PAL.cinnabar], ribB: [PAL.malachiteL, PAL.lead], ribC: [PAL.azuriteL, PAL.ochreL] } });
      frameBands(ctx, 0, 830, 2100, 26);
      diaper(ctx, 0, 856, 2100, 70, 70, PAL.azurite, PAL.lead);
      frameBands(ctx, 0, 926, 2100, 22);
      thousand(ctx, 0, 948, 2100, 202, 66, 12);
    },
    state(t, q) { return { wake: () => 2, p: 0, band: .05, wearAmt: .66, freshWear: 1, lamp: { x: 1050, y: 590, z: 140, R: 620, i: 2.7, col: [1, .85, .64] }, amb: .1 }; },
  },
  // 3. the lotus coffer waking from the centre outwards
  coffer: {
    wall: { W: 2100, H: 1220, seed: 37, crack: 1.1, loss: .4, edge: .5, wearBias: .05 },
    cam: { x: 90, y: 70, z: 1 },
    paint(ctx, t, q) {
      groundFill(ctx, 0, 0, 2100, 1220, mix(PAL.earth, PAL.earthD, .35), 6);
      scatter(ctx, [0, 0, 2100, 1220], 50, 41, (x, y) => Math.abs(x - 1050) < 560 && Math.abs(y - 610) < 560, [PAL.lead, PAL.ochreL, PAL.azuriteL]);
      coffer(ctx, 1050, 610, 1080, 3);
    },
    state(t, q) { return { wake: (x, y) => Math.hypot(x - 1050, y - 610) / 900, p: q.p ?? .42, band: .06, wearAmt: 1, freshWear: .06, lamp: { x: 1050, y: 560, z: 150, R: 640, i: 2.7, col: [1, .85, .64] }, amb: .1, wakeJit: .16 }; },
  },
};
