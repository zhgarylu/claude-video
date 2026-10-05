// "Second Sunrise": a concert film made of light. Every cue reads the song's grid (score.json, written by score.py).
import { camAt, proj, W, H } from './cam.js';
import { rigAt, flashList, setScore as setCues, C } from './cues.js';
import { drawBand, setScore as setBand, energy } from './band.js';
import { drawBeams, followSpot, compositeBeams, addLayer, drawWall, drawFloor, floorReflect, hazeGlow, lamps, riser, wallText, wallBox, WALLTEXT, _LC } from './lights.js';
import { drawCrowd, drawConfetti, drawSparks, setScore as setFx, CANNONS, FOUNTAINS } from './fx.js';
import { ss, clamp } from '/core/lib.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const TMP = mk(W, H), tctx = TMP.getContext('2d'), BL1 = mk(480, 270), b1 = BL1.getContext('2d'), BL2 = mk(160, 90), b2 = BL2.getContext('2d');
let S = null;
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ------------------------------------------------------------ titles (screen-space text is part of the show)
const LOWER = { t0: 9.0, t1: 14.0 }, END = { t0: 56.8, t1: 60 };
const SONG = 'SECOND SUNRISE  ·  LIVE';
function setLS(v) { try { ctx.letterSpacing = v; } catch (e) { } }
function lowerBox() {
  ctx.save(); ctx.font = '88px "Bebas Neue"'; setLS('7px'); const w1 = ctx.measureText('VANTA HARBOR').width;
  ctx.font = '500 32px "Barlow Condensed"'; setLS('9px'); const w2 = ctx.measureText(SONG).width; ctx.restore();
  return [{ id: 'band', text: 'VANTA HARBOR', x0: 110, y0: 110, x1: 110 + w1, y1: 190 }, { id: 'song', text: SONG, x0: 112, y0: 208, x1: 112 + w2, y1: 244 }];
}
function endBox() {
  ctx.save(); ctx.font = '210px "Bebas Neue"'; setLS('16px'); const w1 = ctx.measureText('VANTA HARBOR').width;
  ctx.font = '500 38px "Barlow Condensed"'; setLS('14px'); const w2 = ctx.measureText(SONG).width; ctx.restore();
  return [{ id: 'endband', text: 'VANTA HARBOR', x0: 960 - w1 / 2, y0: 150, x1: 960 + w1 / 2, y1: 305 }, { id: 'endsong', text: SONG, x0: 960 - w2 / 2, y0: 330, x1: 960 + w2 / 2, y1: 372 }];
}
function drawTitles(t, rig) {
  ctx.save(); ctx.textBaseline = 'alphabetic';
  if (t >= LOWER.t0 && t < LOWER.t1) {
    const a = ss((t - LOWER.t0) / .6) * (1 - ss((t - (LOWER.t1 - .6)) / .6)), slide = (1 - ss((t - LOWER.t0) / .8)) * 40;
    ctx.globalAlpha = a; ctx.translate(-slide, 0);
    const col = [150, 200, 255];
    ctx.fillStyle = rgba(col, .9); ctx.fillRect(96, 112, 5, 130);
    ctx.fillStyle = '#eef4ff'; ctx.font = '88px "Bebas Neue"'; setLS('7px'); ctx.fillText('VANTA HARBOR', 112, 182);
    ctx.fillStyle = rgba(col, 1); ctx.font = '500 32px "Barlow Condensed"'; setLS('9px'); ctx.fillText(SONG, 114, 236);
  }
  if (t >= END.t0 && t < END.t1) {
    const a = ss((t - END.t0) / .8);
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,170,60,.55)'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#fff3e0'; ctx.font = '210px "Bebas Neue"'; setLS('16px'); ctx.fillText('VANTA HARBOR', 960 + 8, 300);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,190,100,.95)'; ctx.font = '500 38px "Barlow Condensed"'; setLS('14px'); ctx.fillText(SONG, 960 + 7, 366);
  }
  ctx.restore();
}
window.TEXTS = (t) => {
  const o = [];
  if (t >= LOWER.t0 && t < LOWER.t1) o.push(...lowerBox());
  const wt = wallText(t);
  if (wt) { const cam = camAt(t), b = wallBox(cam, wt.px); o.push({ id: 'wall', text: wt.text, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }); }
  if (t >= END.t0 && t < END.t1) o.push(...endBox());
  return o;
};

// ------------------------------------------------------------ the frame
function bloom(a1, a2) {
  b1.setTransform(1, 0, 0, 1, 0, 0); b1.clearRect(0, 0, 480, 270); b1.filter = 'blur(3px)'; b1.drawImage(cv, 0, 0, 480, 270); b1.filter = 'none';
  b2.clearRect(0, 0, 160, 90); b2.filter = 'blur(2px)'; b2.drawImage(BL1, 0, 0, 160, 90); b2.filter = 'none';
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = a1; ctx.drawImage(BL1, 0, 0, W, H); ctx.globalAlpha = a2; ctx.drawImage(BL2, 0, 0, W, H); ctx.restore();
}
function render(t) {
  const cam = camAt(t), rig = rigAt(t), en = energy(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#02030a'); bg.addColorStop(1, '#04050c'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // floor + wall + its reflection
  const fl = drawFloor(ctx, cam, rig, t);
  drawWall(ctx, cam, S, rig, t, false, 1);
  floorReflect(ctx, cam, S, rig, t, fl);
  hazeGlow(ctx, cam, rig, t);
  // beams on the haze layer (behind the band)
  const sing = proj(cam, 0, 1.0, 0);
  drawBeams(cam, rig, t); followSpot(cam, rig, t, sing); compositeBeams(ctx, t); addLayer(ctx, .85);
  // the flash is a burst of light behind the band: the silhouettes stay black
  if (rig.flash > .004) { const f = rig.flash; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba([255, 240, 235], f * .62); ctx.fillRect(0, 0, W, H); ctx.fillStyle = rgba(rig.glow, f * .3); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // risers and band
  const edge = rig.rim, ea = rig.rimA * .8;
  riser(ctx, cam, .1, 3.5, .5, -4.0, -1.6, edge, ea); riser(ctx, cam, -7.2, -5.6, .6, -2.2, -.6, edge, ea); riser(ctx, cam, 5.6, 7.2, .6, -2.2, -.6, edge, ea);
  drawBand(ctx, cam, t, { rim: rig.rim, rimA: rig.rimA, fill: rig.fill, spotA: rig.spotA * .3, spotColor: rig.spotCol });
  // a thin veil of the same beams in front of the band (haze is everywhere)
  addLayer(ctx, .14);
  lamps(ctx, cam, rig, t);
  drawSparks(ctx, cam, t);
  const avg = rig.heads.reduce((a, h) => a + h.I, 0) / rig.heads.length;
  drawConfetti(ctx, cam, t, clamp(.35 + avg * .8 + rig.flash, .35, 1.1));
  drawCrowd(ctx, cam, t, rig, en);
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.0); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  bloom(.3, .3);
  // motion blur on the whips and the crash pull-back
  const c1 = camAt(t - 1 / 48), c2 = camAt(t + 1 / 48), r1 = proj(c1, 0, 1.7, -1), r2 = proj(c2, 0, 1.7, -1);
  let dx = (r2.x - r1.x), dy = (r2.y - r1.y); const dm = Math.hypot(dx, dy);
  if (dm > 60 && r1.z > .5 && r2.z > .5) {
    const k = Math.min(1, 520 / dm); dx *= k; dy *= k;
    tctx.clearRect(0, 0, W, H); tctx.drawImage(cv, 0, 0); ctx.save(); const N = 9;
    for (let i = 0; i < N; i++) { ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(TMP, (i / (N - 1) - .5) * dx * .75, (i / (N - 1) - .5) * dy * .75); } ctx.restore();
  }
  // fade in from black over the first frames and out of the final seconds is the film's own blackout: no extra fade
  drawTitles(t, rig);
}
window.render = render; window.__LC = _LC; window.__dbg = { drawBeams, camAt, rigAt };

// ------------------------------------------------------------ boot
(async () => {
  S = await (await fetch('score.json')).json(); setCues(S); setBand(S); setFx(S);
  window.DUR = S.dur; window.SCORE = S;
  const EV = [];
  const cu = S.cues;
  EV.push({ t: .5, type: 'spot' }); [6, 6.5, 7, 7.5].forEach((t, i) => EV.push({ t, type: 'headpop', n: i }));
  EV.push({ t: 8.0, type: 'rigon' });
  [5.7, 7.6, 28.0, 31.5].forEach(t => EV.push({ t, type: 'whip', d: .36 }));
  EV.push({ t: 24.0, type: 'pullback' }, { t: 47.3, type: 'zoomout' });
  flashList().forEach(([t, a]) => EV.push({ t, type: 'flash', a }));
  EV.push({ t: 23.5, type: 'blackout' }, { t: 40.0, type: 'blackout' }, { t: 56.14, type: 'blackout' });
  CANNONS.forEach(([t, pos], i) => EV.push({ t, type: 'confetti', x: pos[0] / 6, n: i }));
  FOUNTAINS.forEach(([t, d, pos], i) => { if (i % 2 === 0 || t === 56) EV.push({ t, type: 'sparks', d, x: pos[0] / 6 }); });
  for (let i = 0; i < 12; i++) EV.push({ t: 41 + i * .5, type: 'lamp', n: i });
  EV.push({ t: 57.0, type: 'spot' });
  EV.sort((a, b) => a.t - b.t); window.EV = EV;
  await Promise.all([document.fonts.load('88px "Bebas Neue"'), document.fonts.load('500 32px "Barlow Condensed"')]);
  window.READY = true;
})();
