// main.js: the page contract. render(t) draws any frame, deterministically.
import { clamp, seg, ss, eio } from '/core/lib.js';
import { initTextures } from './engine/core.js';
import { Print } from './engine/sheet.js';
import { child, CHILD_W, CHILD_H } from './engine/art_child.js';
import { OFF, SW, SH, vignette, toScreen } from './engine/stage.js';
import { makeProps, drawA, drawB, camA, camB } from './engine/scene_bench.js';
import { makeDoor, drawDoor, camC } from './engine/scene_door.js';
import { drawSubs } from './engine/subs.js';
import { DUR, EV, S, A, P, C, D, F } from './timeline.js';

await document.fonts.load('40px "Lilita One"');
initTextures();
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const Q = new URLSearchParams(location.search);
const childPr = new Print(child, CHILD_W, CHILD_H, { S: 1.5 });
const pp = makeProps(childPr);
for (let k = 0; k <= 6; k++) childPr.comp(k);
const door = makeDoor(childPr);

const camF = (t) => [50 - 10 * seg(t, F.wipe0, 56), 6, .9 + .035 * ss(seg(t, F.wipe1, F.paper)) + .02 * ss(seg(t, F.flip0, 56))];

// small camera shake after each press
const shakeAt = (t) => {
  let sx = 0, sy = 0;
  const hit = (t0, amp, k) => { const dt = t - t0; if (dt > 0 && dt < .6) { const e = Math.exp(-dt * k) * amp; sx += Math.cos(dt * 55) * e * .7; sy += Math.sin(dt * 47) * e; } };
  for (const p of P) hit(p.press + p.dur, 6, 11);
  C.pass.forEach((t0) => hit(t0 + C.passDur, 4, 12));
  hit(A.thump, 9, 12); hit(F.flip1, 11, 11); hit(C.layL, 3, 14); hit(C.layR, 3, 14); hit(C.lintel, 6, 12);
  if (t >= D.burst && t < D.burst + 2) { const e = Math.exp(-(t - D.burst) * 2.2) * 9; sx += Math.cos(t * 83) * e; sy += Math.sin(t * 71) * e; }
  return [sx, sy];
};
function cam(a) { return { x: a[0], y: a[1], z: a[2], rot: a[3] || 0 }; }

// a paper-slide transition: `over` slides in from the right (dir=+1) or the old scene slides out to the left (dir=-1)
function slide(ctx, p, drawUnder, drawOver, dir) {
  const e = eio(p);
  if (dir > 0) {                      // new scene covers the old from the right
    drawUnder();
    const x = SW * (1 - e);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(x, 0, SW - x, SH); ctx.clip(); OFF.x = x; drawOver(); OFF.x = 0; ctx.restore();
    edge(ctx, x, 1);
  } else {                            // the old scene slides out to the left, uncovering the new one
    drawOver();                       // here `drawOver` = the scene underneath (new)
    const x = SW * (1 - e);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(0, 0, x, SH); ctx.clip(); OFF.x = -SW * e; drawUnder(); OFF.x = 0; ctx.restore();
    edge(ctx, x, -1);
  }
}
function edge(ctx, x, d) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(x - (d > 0 ? 0 : 60), 0, x + (d > 0 ? 60 : 0), 0);
  if (d > 0) { g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 60, SH); }
  else { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = g; ctx.fillRect(x - 60, 0, 60, SH); }
  ctx.fillStyle = 'rgba(255,245,220,.8)'; ctx.fillRect(x - (d > 0 ? 0 : 3), 0, 3, SH);
}

window.DUR = DUR; window.EV = EV;
window.render = (t) => {
  t = Math.max(0, Math.min(DUR, t));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; OFF.x = 0; OFF.y = 0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SW, SH);
  const sh = shakeAt(t);
  const dA = () => drawA(ctx, t, cam(camA(t)), childPr, pp, sh), dB = () => drawB(ctx, t, cam(camB(t)), childPr, pp, sh);
  const dC = () => drawDoor(ctx, t, cam(camC(Math.max(t, 30.375))), door, sh), dF = () => drawA(ctx, t, cam(camF(t)), childPr, pp, sh, F);
  if (t < S.B) dA();
  else if (t < C.wipe0) dB();
  else if (t < C.wipe1) slide(ctx, seg(t, C.wipe0, C.wipe1), dB, dC, 1);
  else if (t < F.wipe0) dC();
  else if (t < F.wipe1) slide(ctx, seg(t, F.wipe0, F.wipe1), dC, dF, -1);
  else dF();
  vignette(ctx, .5);
  drawSubs(ctx, t);
};
// the one piece of on-screen text that is not a subtitle: the title slip lying on the bench
ctx.font = '74px "Lilita One"';
const TW = Math.max(ctx.measureText('Five Blocks').width, ctx.measureText('to a Door').width) + 68, TH = 2 * 74 * 1.18 + 34 * 1.3;
window.TEXTS = (t) => {
  let c = null;
  if (t >= A.titleIn + .15 && t < S.B) c = cam(camA(t)); else if (t >= F.wipe1) c = cam(camF(t));
  if (!c) return [];
  const pts = [[-690 - TW / 2 - 8, -80 - TH - 8], [-690 + TW / 2 + 8, -80 + 8]].map(([x, y]) => toScreen(c, x, y));
  return [{ id: 'title', text: 'Five Blocks to a Door', x0: pts[0][0], y0: pts[0][1], x1: pts[1][0], y1: pts[1][1] }];
};
window.READY = true;
