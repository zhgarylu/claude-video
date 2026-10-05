// main.js: the film. window.render(t) draws the frame at film time t; everything derives from the machine in engine/machine.js.
import * as THREE from 'three';
import { makeWorld } from './engine/world.js';
import { buildMachine, B } from './engine/machine.js';
import { buildScene } from './engine/scene.js';
import { clamp, lerp, ss, eio, eo, seg } from '/core/lib.js';
import { VO, SCHED, tauToFilm, filmToTau } from './timeline.js';

const q = new URLSearchParams(location.search);
const W = innerWidth, H = innerHeight;
for (const f of ['600 40px "Courier Prime"', '700 40px "Courier Prime"', '500 40px Barlow', '600 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"']) await document.fonts.load(f);
let DURS = {}; try { DURS = await (await fetch('voices/dur.json')).json(); } catch (e) { }
const world = makeWorld(W, H);
const stage = document.getElementById('stage'); stage.appendChild(world.renderer.domElement);
const hud = document.createElement('canvas'); hud.id = 'hud'; hud.width = W; hud.height = H; stage.appendChild(hud); const g = hud.getContext('2d');
const m1 = buildMachine(), m2 = buildMachine({ pair2: [30, 30] });
const R = buildScene(world, m1, m2);
const P = m1.P;
const S0 = SCHED;

// ------------------------------------------------------------------ which machine, which tau, at film time t
function resolve(t) {
  if (t < S0.REW0) return { M: m1, tau: filmToTau(t), swap: 0, run: 1 };
  if (t < S0.REW1) { const u = (t - S0.REW0) / (S0.REW1 - S0.REW0); return { M: m1, tau: S0.TAU_END1 * (1 - ss(u)), swap: 0, run: 'rew' }; }
  if (t < S0.SW1) { const u = clamp((t - S0.SW0) / (S0.SW1 - S0.SW0)); return { M: m1, tau: 0, swap: t >= S0.SW0 ? ss(clamp((t - S0.SW0 - 0.2) / (S0.SW1 - S0.SW0 - 0.6))) : 0, run: 'swap' }; }
  if (t < S0.RUN2_END) return { M: m2, tau: t - S0.RUN2, swap: 1, run: 2 };
  if (t < S0.REW2_1) { const u = clamp((t - S0.REW2_0) / (S0.REW2_1 - S0.REW2_0)); return { M: m2, tau: t < S0.REW2_0 ? m2.tEnd : S0.TAU_END2 * (1 - ss(u)), swap: 1, run: 'rew2' }; }
  return { M: m2, tau: Math.max(0, t - S0.END0), swap: 1, run: 3 };
}

// ------------------------------------------------------------------ camera
const V = (x, y, z) => [x, y, z];
function look3(M, tau) {   // where the action is, as a world point (raw, per instant)
  const S = M.state(tau), Pm = M.P;
  if (tau < 2.3) return [26, 46, 0];
  if (tau < Pm.tEnd1 + 0.08) return [S.b1.x + 6, S.b1.y - 3, 0];
  if (tau < M.tRel + 0.4) return [Pm.Pv[0] + 12, 3, 0];
  if (tau < M.tLift - 0.3) return [Pm.F[0] - 8, Pm.F[1] + 4, 0];
  if (tau < M.tHit2 - 0.15) return [S.b2.x + 4, S.b2.y - 2, S.b2.z * 0.6];
  if (tau < M.tLast + 0.25) { let k = 0; for (let i = 0; i < S.dom.length; i++) if (S.dom[i] > 0.12) k = i; const d = Pm.domPos[k]; return [d.x + 10, Pm.domY + 6, d.z * 0.7]; }
  return [P.hammerGeo.hx + 6, 10, 6];
}
function actionLook(M, tau) {
  let a = [0, 0, 0], wsum = 0;
  for (let i = -6; i <= 2; i++) { const w = 1 - Math.abs(i + 2) / 8, p = look3(M, Math.max(0, tau + i * 0.1)); for (let k = 0; k < 3; k++) a[k] += p[k] * w; wsum += w; }
  return a.map(v => v / wsum);
}
const mk = (look, dist, az, fov, o = {}) => ({ pos: [look[0] + dist * Math.sin(az), look[1] + (o.up ?? 7) + dist * 0.06, look[2] + dist * Math.cos(az)], look, fov, aper: o.aper ?? 500, coc: o.coc ?? 14, fade: o.fade ?? 1, light: o.light });
const mix = (a, b, u) => ({ pos: a.pos.map((v, i) => lerp(v, b.pos[i], u)), look: a.look.map((v, i) => lerp(v, b.look[i], u)), fov: lerp(a.fov, b.fov, u), aper: lerp(a.aper, b.aper, u), coc: lerp(a.coc, b.coc, u), fade: lerp(a.fade, b.fade, u), light: b.light });
const kf = (t, ks) => { for (let i = 0; i < ks.length - 1; i++) if (t <= ks[i + 1][0]) { const u = eio(seg(t, ks[i][0], ks[i + 1][0])); return ks[i][1].map((v, j) => lerp(v, ks[i + 1][1][j], u)); } return ks[ks.length - 1][1]; };

const SH = [];   // shots {t1, fn}
const shot = (t1, fn) => SH.push({ t1, fn });
const sc = S0;
shot(2.5, t => { const d = kf(t, [[0, [88]], [2.5, [62]]]); return mk([lerp(24, 31, ss(t / 2.5)), 46.5, 0], d[0], lerp(-0.18, -0.05, t / 2.5), 28); });
shot(3.9, t => { const tau = filmToTau(t); return mk(actionLook(m1, tau), 88, lerp(-0.1, 0.12, ss(seg(t, 2.5, 3.9))), 30, { up: 9 }); });
shot(5.4, t => { const lx = lerp(192, 226, eio(seg(t, 3.9, 5.4))); const d = lerp(95, 74, eio(seg(t, 3.9, 5.4))); return mk([lx, 4, 0], d, lerp(0.18, 0.3, seg(t, 3.9, 5.4)), 31); });
shot(9.0, t => { const u = eio(seg(t, 5.4, 9.0)); return mk([lerp(240, 252, u), lerp(4, 5, u), 5], lerp(76, 54, u), lerp(0.3, -0.12, u), lerp(31, 27, u), { aper: 650 }); });
shot(11.5, t => { const u = eio(seg(t, 9.0, 11.5)); const lx = lerp(255, 388, u); return mk([lx, 14, 8], lerp(60, 150, Math.sin(Math.PI * clamp(u * 1.0)) * 0.85 + u * 0.15), lerp(-0.1, 0.2, u), 30, { aper: 350 }); });
shot(13.0, t => { const u = eio(seg(t, 11.5, 12.6)); return mk([lerp(388, 268, u), lerp(14, 22, u), 6], lerp(150, 62, u), lerp(0.2, 0.05, u), 29, { aper: 600 }); });
shot(S0.RUN1_END + 0.4, t => { const tau = filmToTau(t); const u = ss(seg(t, 13.0, 14.0)); return mk(actionLook(m1, tau), lerp(70, 64, u), lerp(0.1, 0.45, ss(seg(t, 13.5, S0.T_DOM1))) * (1 - ss(seg(t, S0.T_DOM1, S0.RUN1_END))), 32, { up: 4 }); });
shot(S0.MAP1, t => {   // pull out to the whole board for the cause map
  const u = eio(seg(t, S0.RUN1_END + 0.4, S0.MAP0 + 1.8));
  const a = mk(actionLook(m1, filmToTau(S0.RUN1_END + 0.4)), 64, 0, 32, { up: 4 }); const b = mk([213, 28, 0], 400, 0, 38, { up: 20, aper: 900, fade: 0.38 });
  return mix(a, b, u);
});
shot(S0.REW1, t => { const u = ss(seg(t, S0.REW0, S0.REW1)); const tau = resolve(t).tau; const a = mk(actionLook(m1, tau), 140, 0.1 * Math.sin(u * 3), 32, { aper: 300 }); const b = mk([213, 28, 0], 400, 0, 38, { up: 20, aper: 900, fade: 0.38 }); return mix(b, a, ss(seg(t, S0.REW0, S0.REW0 + 0.6))); });
shot(S0.SW1, t => { const u = eio(seg(t, S0.REW1 - 0.8, S0.REW1 + 0.6)); const tau = resolve(Math.min(t, S0.REW1 - 0.8)).tau; const a = mk(actionLook(m1, tau), 140, 0, 32, { aper: 300 }); const orbit = lerp(0.55, -0.35, eio(seg(t, S0.SW0, S0.SW1))); const b = mk([P.E[0] + 4, P.E[1] + 6, 6], lerp(70, 54, seg(t, S0.SW0, S0.SW1)), orbit, 29, { aper: 650 }); return mix(a, b, u); });
shot(S0.RUN2_END, t => { const tau = t - S0.RUN2; const a = mk([P.E[0] + 4, P.E[1] + 6, 6], 54, -0.35, 29, { aper: 650 }); const b = mk(actionLook(m2, tau), lerp(80, 125, ss(seg(t, S0.RUN2 + 1.5, S0.RUN2 + 4.5))), lerp(0.0, 0.25, ss(seg(t, S0.RUN2, S0.RUN2_END))), 33, { aper: 380, up: 9 }); return mix(a, b, ss(seg(t, S0.RUN2, S0.RUN2 + 0.7))); });
shot(S0.CMP1 + 0.0001, t => { const u = eio(seg(t, S0.RUN2_END, S0.CMP0 + 1.2)); const tau = Math.min(t - S0.RUN2, m2.tEnd); const a = mk(actionLook(m2, tau), 125, 0.25, 33, { aper: 380, up: 9 }); const b = mk([213, 28, 0], 400, 0, 38, { up: 20, aper: 900, fade: 0.38 }); return mix(a, b, u); });
shot(S0.REW2_1, t => { const u = ss(seg(t, S0.REW2_0, S0.REW2_1)); const tau = resolve(t).tau; const b = mk(actionLook(m2, tau), 150, 0.05, 32, { aper: 300 }); const w = mk([213, 28, 0], 400, 0, 38, { up: 20, aper: 900, fade: 0.38 }); const c = mk([26, 46, 0], 78, -0.15, 28, { aper: 500 }); return mix(mix(w, b, ss(seg(t, S0.REW2_0, S0.REW2_0 + 0.5))), c, ss(seg(t, S0.REW2_1 - 1.2, S0.REW2_1))); });
shot(1e9, t => { const u = seg(t, S0.END0, S0.DUR); return mk([lerp(25, 31, u), 46.5, 0], lerp(80, 60, eio(u)), lerp(-0.15, -0.04, u), 28, { aper: 520 }); });
function camAt(t) {
  let i = SH.findIndex(s => t <= s.t1); if (i < 0) i = SH.length - 1;
  const c = SH[i].fn(t);
  const t0 = i ? SH[i - 1].t1 : -1, XF = 0.55;
  if (i && t - t0 < XF) return mix(SH[i - 1].fn(t), c, ss((t - t0) / XF));
  return c;
}

// ------------------------------------------------------------------ overlay: brass plates, callouts, the cause map
const brass = (x, y, w, h, o = {}) => {
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
  const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h); gr.addColorStop(0, o.c0 ?? '#ebc977'); gr.addColorStop(.5, o.c1 ?? '#d1a24c'); gr.addColorStop(1, o.c2 ?? '#b38535');
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, o.r ?? 8); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(90,58,16,.7)'; g.lineWidth = 2; g.stroke(); g.strokeStyle = 'rgba(255,240,200,.45)'; g.lineWidth = 1; g.beginPath(); g.roundRect(x + 3, y + 3, w - 6, h - 6, Math.max(2, (o.r ?? 8) - 3)); g.stroke();
  if (o.screws !== false) for (const sx of [x + 15, x + w - 15]) { g.fillStyle = '#8a6424'; g.beginPath(); g.arc(sx, y + h / 2, 6, 0, 7); g.fill(); g.strokeStyle = '#4a3010'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx - 4, y + h / 2 - 1); g.lineTo(sx + 4, y + h / 2 + 1); g.stroke(); }
  g.restore();
};
const INK = '#2a1a0a';
function plateText(txt, cx, cy, font, o = {}) { g.font = font; const tw = g.measureText(txt).width, w = tw + (o.padX ?? 96), h = o.h ?? 64; brass(cx - w / 2, cy - h / 2, w, h, o); g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, cx, cy + 2); return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]; }
function subtitle(t) {
  const out = [];
  for (const v of VO) {
    const dur = DURS[v.id] ?? v.dur ?? 2.5, t0 = v.t, t1 = v.t + Math.max(dur + 0.6, 1.9);
    if (t < t0 - 0.05 || t > t1 + 0.35) continue;
    const a = ss((t - t0) / 0.3), b = ss((t1 + 0.3 - t) / 0.3), k = Math.min(a, b); if (k <= 0) continue;
    g.save(); g.globalAlpha = Math.min(1, k * 1.4); const dy = (1 - k) * 90;
    g.font = '700 33px "Courier Prime"'; const tw = g.measureText(v.sub).width, w = tw + 110, h = 66, x = W / 2 - w / 2, y = H - 112 + dy;
    brass(x, y, w, h); g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v.sub, W / 2, y + h / 2 + 2); g.restore();
  }
}
const tag = (txt, wx, wy, wz, t0, t1, t, dx = 0, dy = 0) => {
  if (t < t0 || t > t1) return null; const k = Math.min(ss((t - t0) / 0.35), ss((t1 - t) / 0.35)); const [px, py] = world.px([wx, wy, wz]);
  g.save(); g.globalAlpha = k; const r = plateText(txt, px + dx, py + dy - (1 - k) * 18, '700 30px "Courier Prime"', { h: 50, padX: 56 }); g.restore(); return { id: 'tag-' + txt + wx, text: txt, x0: r[0], y0: r[1], x1: r[2], y1: r[3], t0, t1 };
};
const FONT_B = '500 24px Barlow';
function drawBars(y, M, scale, x0, prog, label, hi, alpha = 1) {
  const links = M.links, tot = M.tStrike; let x = x0;
  g.save(); g.globalAlpha = alpha;
  brass(x0 - 26, y - 14, scale * tot + 52, 92, { c0: '#3a2a18', c1: '#2e2012', c2: '#241810', screws: false, r: 10 });
  for (const L of links) {
    const w = (L.t1 - L.t0) * scale, filled = clamp((prog - L.t0) / (L.t1 - L.t0)); const isHi = L.id === 4;
    if (w > 0 && filled > 0) {
      const gr = g.createLinearGradient(x, y, x, y + 64); const base = isHi ? ['#ffd88a', '#f0b84e', '#c88a2a'] : ['#d6aa58', '#b88a3c', '#97702c']; gr.addColorStop(0, base[0]); gr.addColorStop(.5, base[1]); gr.addColorStop(1, base[2]);
      g.fillStyle = gr; g.fillRect(x, y, Math.max(1, w * filled), 64);
      if (isHi) { g.save(); g.beginPath(); g.rect(x, y, w * filled, 64); g.clip(); g.strokeStyle = 'rgba(90,50,10,.28)'; g.lineWidth = 6; for (let k = -80; k < w + 80; k += 22) { g.beginPath(); g.moveTo(x + k, y + 64); g.lineTo(x + k + 40, y); g.stroke(); } g.restore(); }
    }
    g.fillStyle = 'rgba(20,10,0,.9)'; g.fillRect(x + w - 1.5, y, 1.5, 64); x += w;
  }
  g.restore();
}

function mapLayer(t, which, texts) {
  // which: 1 -> the cause map of run one; 2 -> the comparison
  const t0 = which === 1 ? S0.MAP0 : S0.CMP0, t1 = which === 1 ? S0.MAP1 : S0.CMP1;
  if (t < t0 || t > t1) return;
  const k = Math.min(ss((t - t0) / 0.6), ss((t1 - t) / 0.5)); g.save(); g.globalAlpha = k;
  const x0 = 150, x1 = 1770, tot = m1.tStrike, scale = (x1 - x0) / tot;
  const links = m1.links;
  // heading plate
  const hd = which === 1 ? 'CAUSE MAP' : 'THE SAME CHAIN, TWICE';
  g.font = '600 56px "Cormorant Garamond"'; g.textAlign = 'left'; g.fillStyle = '#f3dba0'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 14; g.fillText(hd.split('').join(' '), x0, 120);
  g.font = 'italic 500 30px "Cormorant Garamond"'; g.fillStyle = '#d9bf84'; g.fillText(which === 1 ? 'traced in the order it happened, to scale in time' : 'one pair of gears changed', x0, 166); g.shadowBlur = 0;
  texts.push({ id: 'map-h' + which, text: hd + (which === 1 ? ' traced in the order it happened, to scale in time' : ' one pair of gears changed'), x0, y0: 70, x1: 1100, y1: 180, t0, t1 });
  const rate = 4.0, prog1 = clamp((t - t0 - 0.7) * rate, 0, tot);
  if (which === 1) {
    // chain of nodes
    const ny = 330, nx = i => x0 + 60 + i * ((x1 - x0 - 120) / 7);
    for (let i = 0; i < 8; i++) {
      const L = links[i], on = prog1 >= L.t0; if (i < 7 && prog1 >= links[i + 1].t0) { g.strokeStyle = '#d9b05a'; g.lineWidth = 7; g.beginPath(); g.moveTo(nx(i), ny); g.lineTo(nx(i + 1), ny); g.stroke(); }
      else if (i < 7) { g.strokeStyle = 'rgba(217,176,90,.25)'; g.lineWidth = 4; g.beginPath(); g.moveTo(nx(i), ny); g.lineTo(nx(i + 1), ny); g.stroke(); }
      g.beginPath(); g.arc(nx(i), ny, 40, 0, 7); const gr = g.createRadialGradient(nx(i) - 12, ny - 14, 4, nx(i), ny, 44); gr.addColorStop(0, on ? '#ffe7a8' : '#6f5630'); gr.addColorStop(1, on ? '#c18f35' : '#3c2d18'); g.fillStyle = gr; g.fill(); g.strokeStyle = on ? '#5b3a0e' : '#2a1d0e'; g.lineWidth = 3; g.stroke();
      g.fillStyle = on ? INK : '#a58a58'; g.font = '700 40px "Courier Prime"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(L.id), nx(i), ny + 2);
      g.font = '500 25px Barlow'; g.fillStyle = on ? '#f0d9a2' : '#8a7550'; g.fillText(L.name, nx(i), ny + 66);
      texts.push({ id: 'n' + i, text: L.name, x0: nx(i) - 70, y0: ny + 52, x1: nx(i) + 70, y1: ny + 80, t0, t1 });
    }
    // fan lines from nodes to their bar segments
    let xs = x0;
    for (let i = 0; i < 8; i++) { const L = links[i], w = (L.t1 - L.t0) * scale, cx = xs + w / 2; if (prog1 >= L.t0) { g.strokeStyle = i === 3 ? 'rgba(255,214,130,.8)' : 'rgba(217,176,90,.35)'; g.lineWidth = i === 3 ? 3 : 1.5; g.beginPath(); g.moveTo(nx(i), ny + 90); g.bezierCurveTo(nx(i), 480, cx, 470, cx, 560); g.stroke(); } xs += w; }
  }
  const by = which === 1 ? 600 : 400;
  if (which === 1) {
    drawBars(by, m1, scale, x0, prog1, 'run 1', 4);
    // seconds above segments
    let xs = x0; for (const L of links) { const w = (L.t1 - L.t0) * scale; if (w > 70 && prog1 >= L.t1 - 0.01) { g.font = '600 30px "Courier Prime"'; g.fillStyle = L.id === 4 ? '#ffe3a0' : '#e6cc92'; g.textAlign = 'center'; g.fillText((L.t1 - L.t0).toFixed(1) + ' s', xs + w / 2, by + 112); } xs += w; }
    const w4 = (links[3].t1 - links[3].t0) * scale, x4 = x0 + (links[3].t0) * scale;
    const kk = ss((prog1 - links[3].t1 + 0.1) / 0.4);
    if (kk > 0) { g.globalAlpha = k * kk; g.font = '600 92px "Cormorant Garamond"'; g.fillStyle = '#ffe2a2'; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 18; const pct = Math.round(100 * (links[3].t1 - links[3].t0) / tot); g.fillText(pct + '% of the time', x4 + w4 / 2, by + 220); g.font = 'italic 500 36px "Cormorant Garamond"'; g.fillStyle = '#e0c88c'; g.fillText('one link, waiting', x4 + w4 / 2, by + 270); g.shadowBlur = 0; g.globalAlpha = k;
      texts.push({ id: 'pct', text: pct + '% of the time one link, waiting', x0: x4 + w4 / 2 - 330, y0: by + 150, x1: x4 + w4 / 2 + 330, y1: by + 290, t0, t1 }); }
  } else {
    const kt = clamp((t - t0 - 0.6) / 2.2), p1 = tot * kt, p2 = m2.tStrike * kt;
    g.font = '600 34px "Courier Prime"'; g.fillStyle = '#e6cc92'; g.textAlign = 'left'; g.fillText('BEFORE   ' + m1.tStrike.toFixed(1) + ' s', x0, by - 40);
    drawBars(by, m1, scale, x0, p1, '', 4);
    g.fillStyle = '#e6cc92'; g.fillText('AFTER   ' + m2.tStrike.toFixed(1) + ' s', x0, by + 150);
    drawBars(by + 190, m2, scale, x0, p2, '', 4);
    const kk = ss((kt - 0.9) / 0.1); if (kk > 0) { g.globalAlpha = k * kk; g.font = '600 120px "Cormorant Garamond"'; g.fillStyle = '#ffe2a2'; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 18; g.fillText('−' + (m1.tStrike - m2.tStrike).toFixed(1) + ' s', 960, by + 420); g.shadowBlur = 0; }
    texts.push({ id: 'cmp', text: 'BEFORE AFTER minus seconds', x0: 150, y0: by - 70, x1: 1000, y1: by + 480, t0, t1 });
  }
  g.restore();
}

function titleCard(t, texts) {
  const t0 = S0.END0 + 0.5, t1 = S0.DUR; if (t < t0) return;
  const k = Math.min(ss((t - t0) / 0.7), 1); g.save(); g.globalAlpha = k;
  const w = 880, h = 200, x = W / 2 - w / 2, y = 120 + (1 - k) * -30;
  brass(x, y, w, h, { r: 12 });
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 84px "Cormorant Garamond"'; g.fillText('THE SLOWEST LINK', W / 2, y + 82);
  g.font = 'italic 600 32px "Cormorant Garamond"'; g.fillText('a chain runs at the pace of its slowest link', W / 2, y + 152);
  g.restore(); texts.push({ id: 'title', text: 'THE SLOWEST LINK a chain runs at the pace of its slowest link', x0: x, y0: y, x1: x + w, y1: y + h, t0, t1 });
}

// ------------------------------------------------------------------ the frame
const texts = [];
function frame(t) {
  t = clamp(t, 0, S0.DUR);
  const r = resolve(t), S = r.M.state(r.tau);
  R.pose(S, m2.state(0), r.swap);
  const c = camAt(t); let fade = 1;
  if (t < 0.5) fade = lerp(0.3, 1, ss(t / 0.5)); if (t > S0.DUR - 1.1) fade = Math.min(fade, lerp(0.1, 1, ss((S0.DUR - t) / 1.1)));
  // dim the board while a map is up
  const mapK = Math.max(ss(seg(t, S0.MAP0 - 0.3, S0.MAP0 + 0.5)) * (1 - ss(seg(t, S0.MAP1 - 0.3, S0.MAP1 + 0.2))), ss(seg(t, S0.CMP0 - 0.3, S0.CMP0 + 0.5)) * (1 - ss(seg(t, S0.CMP1 - 0.3, S0.CMP1 + 0.2))));
  c.fade = lerp(1, 0.4, mapK) * fade; c.aper = lerp(c.aper, 900, mapK);
  world.cam(c); world.render();
  texts.length = 0; g.clearRect(0, 0, W, H);
  // callouts at the gears
  const Dm = P.D, Em = P.E, Fm = P.F;
  const tg = [];
  if (r.run === 1 || r.run === 'swap' || r.run === 2) {
    const sw = r.run === 'swap' || r.run === 2;
    if (!sw) {
      tg.push(tag('12 : 48', (Dm[0] + Em[0]) / 2, (Dm[1] + Em[1]) / 2 - 3, 9, 6.0, 11.3, t, 0, 0));
      tg.push(tag('12 : 48', (Em[0] + Fm[0]) / 2 + 2, (Em[1] + Fm[1]) / 2 + 10, 11, 7.6, 11.3, t, 0, 0));
      tg.push(tag('÷ 16', Fm[0] + 2, Fm[1] - 5, 11, 7.6, 9.6, t, 0, 0));
    } else {
      tg.push(tag('30 : 30', (Em[0] + Fm[0]) / 2 + 2, (Em[1] + Fm[1]) / 2 + 12, 11, S0.SW1 - 2.4, S0.RUN2 + 3.4, t, 0, 0));
    }
  }
  for (const x of tg) if (x) texts.push(x);
  mapLayer(t, 1, texts); mapLayer(t, 2, texts); titleCard(t, texts);
  subtitle(t);
}
window.DUR = S0.DUR;
window.render = frame;
window.TEXTS = t => texts.map(x => x);
// sound / cue events (film time) for the mixer
{
  const EV = []; const f1 = tau => tauToFilm(tau);
  for (const e of m1.events) EV.push({ ...e, t: +f1(e.tau).toFixed(4), run: 1 });
  for (const e of m2.events) if (e.type !== 'tick' || e.tau < m2.tEnd + 0.3) EV.push({ ...e, t: +(S0.RUN2 + e.tau).toFixed(4), run: 2 });
  EV.length = 0;
  const add = (t, type, o = {}) => EV.push({ t: +t.toFixed(4), type, ...o });
  for (const e of m1.events) if (!(e.type === 'tick' && e.tau > S0.TAU_END1)) add(f1(e.tau), e.type, { ...e, tau: undefined, run: 1, rate: 1 / (Math.max(0.05, f1(e.tau + 0.01) - f1(e.tau - 0.01)) / 0.02) });
  for (const e of m2.events) if (!(e.type === 'tick' && e.tau > S0.TAU_END2)) add(S0.RUN2 + e.tau, e.type, { ...e, tau: undefined, run: 2, rate: 1 });
  for (let k = 0; k <= 4; k++) add(S0.END0 + k * B, 'tick', { k, run: 3, tock: k % 2 === 1 }); add(S0.END0 + 2.5 + 0.03, 'roll1start', { run: 3 });
  for (const rr of m1.rolls) add(f1(rr.pts[0][0]), 'roll', { id: rr.id, run: 1, pts: rr.pts.map(([tt, v]) => [+f1(tt).toFixed(3), v]) });
  for (const rr of m2.rolls) add(S0.RUN2 + rr.pts[0][0], 'roll', { id: rr.id, run: 2, pts: rr.pts.map(([tt, v]) => [+(S0.RUN2 + tt).toFixed(3), v]) });
  for (const v of VO) add(v.t, 'voice', { id: v.id, sub: v.sub });
  add(S0.REW0, 'rewind', { t1: S0.REW1, run: 1 }); add(S0.REW2_0, 'rewind', { t1: S0.REW2_1, run: 2 });
  add(S0.SW0, 'swap', { t1: S0.SW1 }); add(S0.MAP0, 'map', { t1: S0.MAP1, which: 1 }); add(S0.CMP0, 'map', { t1: S0.CMP1, which: 2 });
  // map tracer clicks (a tick as the tracer reaches each link)
  for (const L of m1.links) add(S0.MAP0 + 0.7 + L.t0 / 4.0, 'maptick', { id: L.id });
  add(0, 'sched', { ...S0, tStrike1: m1.tStrike, tStrike2: m2.tStrike, wD: m1.wD }); window.EV = EV; window.SCHED = S0; window.VOICE = VO; window.LINKS = { m1: m1.links, m2: m2.links, tEnd1: m1.tStrike, tEnd2: m2.tStrike };
}
window.READY = true;
