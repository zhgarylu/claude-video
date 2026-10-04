// "The Seventh Fold": render(t) draws any frame deterministically. Everything comes from timeline.js and models.js.
import * as THREE from 'three';
import { makeWorld } from './engine/world.js';
import { creaseLine, foldArrow, badge, legend, INK, HALO } from './engine/diagram.js';
import { strip } from './models.js';
import * as TL from './timeline.js';

const W = innerWidth, H = innerHeight;
const world = makeWorld(W, H, { vig: .4 });
document.getElementById('stage').appendChild(world.renderer.domElement);
const hud = document.createElement('canvas'); hud.id = 'hud'; hud.width = W; hud.height = H; document.getElementById('stage').appendChild(hud);
const hx = hud.getContext('2d');
await document.fonts.load('600 40px Fredoka'); await document.fonts.load('700 40px Fredoka');

const sheet = strip();
world.mount(sheet, { front: '#8ea6d4', frontPattern: 'dots', patternColor: '#f2ebdb', back: '#ecaa88', backPattern: 'none', seed: 17, px: 3072, edge: '#efe8d8' });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), ss = t => { t = cl(t); return t * t * (3 - 2 * t); };
const P = (x, y, h = .0006) => sheet.toWorld(x, y, h);

// ---- camera -------------------------------------------------------------------------------------
function cam(t) {
  const K = TL.CAM; let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], u = ss((t - a[0]) / (b[0] - a[0])), L = j => a[j] + (b[j] - a[j]) * u;
  const look = V(L(1), L(2), L(3)), Hc = L(4), tilt = L(5), aper = L(6);
  const th = tilt * 1.22, lateral = .3 * ss((t - 26) / 2) * (1 - ss((t - 37.5) / 2));
  const pos = look.clone().add(V(Hc * Math.sin(th) * lateral, Hc * Math.cos(th), Hc * Math.sin(th)));
  const k = ss((tilt - .12) / .3), up = V(0, 0, -1).lerp(V(0, 1, 0), k).normalize();
  return { pos: pos.toArray(), look: look.toArray(), up: up.toArray(), aper, fov: 28, focus: pos.distanceTo(look) };
}

// ---- what is on screen, for the diagram layer and for readcheck ---------------------------------
const reg = (x0, x1) => ({ x0, x1 });
function region(i) { let x0 = -sheet.w / 2, x1 = sheet.w / 2; for (let k = 0; k < i; k++) x0 = (x0 + x1) / 2; return [x0, x1]; }
const fade = (t, a, b, f = .3) => Math.min(ss((t - a) / f), 1 - ss((t - (b - f)) / f));
const COUNT = [[TL.FOLD_T[0][1], 3.7, '×2'], [TL.FOLD_T[1][1], 5.55, '×4'], [TL.FOLD_T[2][1], 7.3, '×8'], [TL.FOLD_T[5][1], 12.5, '×64'], [12.6, 15.7, '×128?']];
function texts(t) {
  const out = [], card = (id, text, x, y, w, h) => ({ id, text, x0: x, y0: y, x1: x + w, y1: y + h });
  for (const c of TL.CAPTIONS) if (t >= c.t0 && t < c.t1) out.push(card(c.id, c.text, W * .2, H - 140, W * .6, 90));
  for (const [a, b, s] of COUNT) if (t >= a && t < b) out.push(card('count', s, 70, 60, 200, 100));
  TL.FOLD_T.forEach(([s, l], i) => { if (t >= s - .5 && t < l + .3) out.push(card('b' + i, String(i + 1), 0, 0, 1, 1)); });
  if (t >= 22.5 && t < 25.6) out.push(card('legend', 'valley fold mountain fold', 70, H - 160, 330, 112));
  return out;
}
window.TEXTS = t => texts(t).map(x => x.id.startsWith('b') ? { ...x, x0: 100, y0: 100, x1: 160, y1: 160 } : x);

function drawCaption(ctx, c, t) {
  const a = fade(t, c.t0, c.t1, .35); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = '600 42px Fredoka, sans-serif'; const w = ctx.measureText(c.text).width + 70, h = 78, x = (W - w) / 2, y = H - 150 + (1 - a) * 10;
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.roundRect(x + 3, y + 6, w, h, 12); ctx.fill();
  ctx.fillStyle = 'rgba(247,242,230,.97)'; ctx.strokeStyle = 'rgba(28,39,72,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.text, W / 2, y + h / 2 + 2); ctx.restore();
}
function drawCount(ctx, t) {
  for (const [a, b, s] of COUNT) {
    const al = fade(t, a, b, .25); if (al <= 0) continue;
    ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = 'rgba(247,242,230,.96)'; ctx.strokeStyle = 'rgba(28,39,72,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(70, 60, s.length > 3 ? 250 : 200, 100, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = '700 58px Fredoka, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(s, 94, 100); ctx.font = '500 20px Fredoka, sans-serif'; ctx.fillText('layers', 96, 140); ctx.restore();
  }
}
function drawFolds(ctx, t) {
  TL.FOLD_T.forEach(([s, l], i) => {
    const r = ss((t - (s - .5)) / .45), o = 1 - ss((t - (l + .1)) / .25);
    if (r <= 0 || o <= 0) return; ctx.save(); ctx.globalAlpha = o;
    const [x0, x1] = region(i), xm = (x0 + x1) / 2, hh = Math.pow(2, i) * sheet.th + .0008, ly = sheet.h / 2 + .006;
    creaseLine(ctx, world, P(xm, -ly, hh), P(xm, ly, hh), { kind: 'valley', reveal: r, scale: .55 + Math.min(.5, (x1 - x0) * 3) });
    if (t > s - .25) foldArrow(ctx, world, P(xm - (xm - x0) * .55, 0, hh + .002), P(xm + (x1 - xm) * .5, 0, hh + .004), { lift: .05 + (x1 - x0) * .25, scale: .5 + Math.min(.45, (x1 - x0) * 3), reveal: ss((t - s + .25) / .35) });
    if (t < l + .3) { const p = world.px(P(xm, ly + .006, hh)); badge(ctx, p[0], p[1], String(i + 1), { scale: .95 }); }
    ctx.restore();
  });
}
function drawPattern(ctx, t) {
  const flat = (t >= 22.5 && t < 25.6) || t >= 38.8;
  if (!flat) return;
  const total = TL.PATTERN.t1 - TL.PATTERN.t0;
  for (const c of sheet.chords) {
    if (c.k > 5) continue;
    const ua = 22.8 + (5 - c.k) * .26, r = ss((t - ua) / .6), o = t >= 38.8 ? ss((t - 38.8) / .8) * .55 : (1 - ss((t - 25.0) / .6));
    if (r <= 0 || o <= 0) continue; ctx.save(); ctx.globalAlpha = o;
    creaseLine(ctx, world, P(c.a[0], c.a[1]), P(c.b[0], c.b[1]), { kind: c.kind, thin: true, scale: .9, reveal: r, col: c.kind === 'valley' ? '#fbf3e2' : INK }); ctx.restore();
  }
  // the pleat creases: bold, drawn before the collapse and again once the sheet has opened
  const pl = t < 26 ? ss((t - 24.9) / .7) * (1 - ss((t - 25.6) / .4)) : t >= 38.8 ? ss((t - 38.8) / .9) : 0;
  if (pl > 0) for (let i = 1; i < TL.PLEAT.n; i++) {
    const x = -sheet.w / 2 + sheet.w / TL.PLEAT.n * i; ctx.save(); ctx.globalAlpha = pl;
    creaseLine(ctx, world, P(x, -sheet.h / 2 - .004, .001), P(x, sheet.h / 2 + .004, .001), { kind: i % 2 ? 'valley' : 'mountain', scale: .75, col: i % 2 ? '#fbf3e2' : INK }); ctx.restore();
  }
  if (t >= 22.5 && t < 25.6) { ctx.save(); ctx.globalAlpha = fade(t, 22.5, 25.6, .4); legend(ctx, 70, H - 160, { scale: 1 }); ctx.restore(); }
}

// ---- sound events for the mixer ------------------------------------------------------------------
const EV = [];
TL.FOLD_T.forEach(([s, l], i) => {
  EV.push({ t: s - .5, type: 'tick' }, { t: s, type: 'swish', dur: l - s, layers: Math.pow(2, i + 1), fold: i + 1 }, { t: l - .03, type: 'crease', fold: i + 1 }, { t: l, type: 'land', layers: Math.pow(2, i + 1), fold: i + 1 });
});
EV.push({ t: 12.0, type: 'tick' }, { t: 12.5, type: 'swish', dur: 1.0, layers: 64, fold: 7 }, { t: 13.5, type: 'strain', v: 1 }, { t: 14.5, type: 'strain', v: 1.3 }, { t: 15.0, type: 'strain', v: 1.6 }, { t: 15.7, type: 'drop', layers: 64 });
for (let k = 5; k >= 0; k--) EV.push({ t: TL.UNFOLD.t0 + (5 - k) * TL.UNFOLD.step, type: 'rustle', dur: TL.UNFOLD.win, v: .55 + .08 * (5 - k) });
for (let i = 0; i < 6; i++) EV.push({ t: 22.8 + i * .26, type: 'tick' });
for (let i = 0; i < 7; i++) EV.push({ t: 24.9 + i * .1, type: 'tick' });
EV.push({ t: TL.PLEAT.collapse[0], type: 'pleat', dur: TL.PLEAT.collapse[1] - TL.PLEAT.collapse[0] });
EV.push({ t: TL.PLEAT.collapse[1], type: 'land', layers: 8, fold: 0 });
EV.push({ t: TL.PLEAT.pull[0], type: 'pull', dur: TL.PLEAT.pull[1] - TL.PLEAT.pull[0] });
EV.push({ t: TL.PLEAT.pull[1], type: 'land', layers: 1, fold: 0 });
window.EV = EV; window.DUR = TL.DUR;

window.render = (t) => {
  t = Math.max(0, Math.min(TL.DUR, t));
  const Q = new URLSearchParams(location.search).get('cam'), cc = cam(t);
  if (Q) { const n = Q.split(',').map(Number); cc.pos = n.slice(0, 3); cc.look = n.slice(3, 6); cc.up = [0, 1, 0]; cc.focus = V(...cc.pos).distanceTo(V(...cc.look)); }
  world.update(t); world.cam(cc);
  const dim = 1 - .8 * ss((t - 47) / 3); world.key.intensity = 2.5 * dim; world.scene.environmentIntensity = .7 * (1 - .5 * ss((t - 47) / 3));
  world.render();
  hx.clearRect(0, 0, W, H);
  drawFolds(hx, t); drawPattern(hx, t); drawCount(hx, t); for (const c of TL.CAPTIONS) drawCaption(hx, c, t);
};
window.READY = true;
