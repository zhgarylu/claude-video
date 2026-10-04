import { PAL, LW, mix, shade, trace, cel, ink, spl, flat } from './brush.js';
LW.k = .82;
import * as S from './scenery.js';
import { drawHero, drawHead, drawFace } from './hero.js';
import { POSES } from './poses.js';
import { finish, subtitle, title, snapMarks } from './post.js';
import { drawStoneSpirit, facePaint } from './facepaint.js';

// ---- the painted backdrop of the style frame: warm sky, sun, two mountain ranges, pavilion, pine, sea ----
function backdropA(ctx, W, H) {
  ctx.drawImage(S.paperCanvas(W, H), 0, 0);
  // sky: a gold glow around the sun, painted as a wash
  const g = ctx.createRadialGradient(1380, 330, 40, 1380, 330, 760); g.addColorStop(0, 'rgba(245,200,110,.75)'); g.addColorStop(.5, 'rgba(240,190,110,.28)'); g.addColorStop(1, 'rgba(240,190,110,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  S.disc(ctx, 1400, 330, 150);
  // far range (azurite) with a pale mist band
  S.mountain(ctx, -80, 1500, 700, 330, 21, { top: PAL.azLt ?? PAL.azuLt, bot: PAL.azurite, peaks: 4, line: PAL.inkBlue, lw: 2.8, mist: 'rgba(239,225,186,.85)' });
  // mid range (malachite)
  S.mountain(ctx, 500, 2050, 790, 300, 8, { top: PAL.malaLt, bot: PAL.malachite, peaks: 3, line: PAL.malaDk, mist: 'rgba(239,225,186,.9)' });
  S.mountain(ctx, -150, 900, 850, 260, 33, { top: PAL.malachite, bot: PAL.malaDk, peaks: 2, line: PAL.inkBlue, mist: 'rgba(239,225,186,.5)' });
  S.eave(ctx, 1700, 548, 170, 140, 7, {});
  S.pine(ctx, 130, 890, .95, 5, { lean: 1 });
  S.xiangyun(ctx, 1180, 560, .9, 9, { lineCol: PAL.vermilion, gold: PAL.goldDk });
  S.xiangyun(ctx, 160, 250, 1.1, 4, {});
  S.xiangyun(ctx, 1500, 150, .7, 12, { lineCol: PAL.azurite });
  // sea
  S.sea(ctx, 868, 1100, -60, 1980, 5, { R: 44 });
}

// ---- night / palace backdrop: indigo wash, cinnabar sun-disc halo, gold-lined clouds ----
function backdropNight(ctx, W, H, o = {}) {
  ctx.drawImage(S.paperCanvas(W, H), 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2650'); g.addColorStop(.6, '#2b3a72'); g.addColorStop(1, '#3a4f86');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  // fine gold star-dots, hand-placed
  for (let i = 0; i < 46; i++) { const x = (i * 337 % 1920), y = (i * 211 % 520); ctx.fillStyle = 'rgba(236,199,102,.75)'; ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3), 0, 7); ctx.fill(); }
  S.disc(ctx, o.cx ?? 960, o.cy ?? 520, o.r ?? 430, PAL.cinnabar, { halo: PAL.goldLt, rings: 4, seed: 5 });
  S.xiangyun(ctx, 40, 230, 1.5, 6, { fill: '#e6dcc2', lineCol: PAL.goldDk, gold: PAL.goldDk, lw: 4 });
  S.xiangyun(ctx, 1480, 820, 1.5, 14, { fill: '#e6dcc2', lineCol: PAL.goldDk, gold: PAL.goldDk, flip: 1, lw: 4 });
  S.xiangyun(ctx, 1560, 160, 1.0, 19, { fill: '#e6dcc2', lineCol: PAL.goldDk, gold: PAL.goldDk, lw: 4 });
}

export const SHOTS = [
 { name:'style', t0:0, t1:10, draw(ctx,W,H,t){
   backdropA(ctx, W, H);
   // cloud platform under the feet
   S.xiangyun(ctx, 600, 1040, 2.6, 31, { n: 5, lineCol: PAL.azurite, tail: 1, lw: 4.2 });
   ctx.save(); ctx.translate(820, 640); drawHero(ctx, POSES.liangxiang, { scale: .93 }); ctx.restore();
   snapMarks(ctx, 805, 300, 140, 240, -2.5, -1.6, 5, 7);
   snapMarks(ctx, 805, 300, 140, 240, -1.3, -.55, 4, 17);
   subtitle(ctx, '云开三尺，锣鼓住声。', W, H);
   finish(ctx, W, H);
 }},
 { name:'spirit', t0:10, t1:20, draw(ctx,W,H,t){
   backdropNight(ctx, W, H, { cx: 960, cy: 500, r: 420 });
   ctx.save(); ctx.translate(960, 530); ctx.scale(1.2,1.2); drawStoneSpirit(ctx,{}); ctx.restore();
   finish(ctx, W, H);
 }},
 { name:'wipe', t0:30, t1:40, draw(ctx,W,H,t){
   // scene A: the leap on the sunlit backdrop
   backdropA(ctx, W, H);
   const hip = [520, 600];
   // speed strokes behind the figure
   for (let i = 0; i < 9; i++) { const y = 330 + i * 62 + (i % 3) * 14, x0 = 80 + (i * 97 % 260), len = 420 + (i * 53 % 200); ink(ctx, [[x0, y], [x0 + len * .5, y + 3], [x0 + len, y + 6]], { w: 9 + (i % 3) * 4, col: i % 2 ? PAL.white : PAL.goldLt, seed: 40 + i, taper: [.9, .02], minw: .02, alpha: .8, press: .1, wob: .2 }); }
   ctx.save(); ctx.translate(hip[0], hip[1]); drawHero(ctx, POSES.leap, { scale: .92 }); ctx.restore();
   // the wipe: scene B (night) shows behind a wall of scroll clouds
   const edge = y => 1240 + 60 * Math.sin(y / 140);
   ctx.save(); ctx.beginPath(); ctx.moveTo(edge(0), 0); for (let y = 0; y <= H; y += 12) ctx.lineTo(edge(y), y); ctx.lineTo(W, H); ctx.lineTo(W, 0); ctx.closePath(); ctx.clip();
   backdropNight(ctx, W, H, { cx: 1640, cy: 540, r: 280 });
   ctx.restore();
   for (let i = 0; i < 6; i++) { const y = 80 + i * 190; S.xiangyun(ctx, edge(y) - 150 + (i % 2) * 40, y, 1.9, 60 + i, { n: 4, lineCol: i % 2 ? PAL.azurite : PAL.goldDk, gold: PAL.goldDk, lw: 4.4, tail: 0 }); }
   for (let i = 0; i < 5; i++) { const y = 175 + i * 190; S.xiangyun(ctx, edge(y) + 40, y, 1.4, 80 + i, { n: 3, flip: 1, lineCol: PAL.goldDk, gold: PAL.azurite, lw: 4, tail: 0, fill: '#f3ead4' }); }
   subtitle(ctx, '一声锣响，山门洞开！', W, H);
   finish(ctx, W, H);
 }},
 { name:'hero', t0:40, t1:50, draw(ctx,W,H,t){
   ctx.drawImage(S.paperCanvas(W,H),0,0);
   ctx.save(); ctx.translate(900, 650); drawHero(ctx, POSES.liangxiang, {scale:.95}); ctx.restore();
 }},
 { name:'face', t0:50, t1:60, draw(ctx,W,H,t){
   ctx.drawImage(S.paperCanvas(W,H),0,0);
   ctx.save(); ctx.translate(960, 560); ctx.scale(4,4); drawHead(ctx,{}); ctx.restore();
 }},
];
export const DUR_TOTAL = 30;
