// scene_door.js: scenes C (pasting a mirrored pair on a courtyard door), D (crackers, the doors open) and E (inside).
import { clamp, lerp, seg, ss, eio, eo, ei, back, track, hash, mulberry } from '/core/lib.js';
import { mk, TEX, COL, PAPER, tileFill } from './core.js';
import { SW, SH, camSet, worldFill, softShadow, sweepCopy } from './stage.js';
import { Print } from './sheet.js';
import { guardian, GUARD_W, GUARD_H } from './art_guardian.js';
import { lintel, couplet, seal, LINTEL_W, LINTEL_H, COUPLET_W, COUPLET_H, SEAL_W, SEAL_H } from './art_door.js';
import { C, D, S as TS } from '../timeline.js';

const LW = 336, LH = 690, TOP = -290, BOT = 400, GS = .66;
const DIRS = [0, Math.PI / 2, Math.PI, -Math.PI / 2, .6];

export const camC = track([
  [30.375, [0, -10, .86]], [31.5, [0, -10, .86]], [31.95, [-170, 30, 1.7]], [32.6, [-170, 30, 1.72]], [33.0, [170, 30, 1.7]], [33.5, [170, 30, 1.72]],
  [34.3, [0, 10, .98]], [37.4, [0, 10, 1.1]], [38.3, [0, -70, 1.0]], [39.4, [0, -20, .94]], [39.85, [0, 30, 1.28]], [40.6, [0, 30, 1.3]],
  [41.6, [0, -10, .92]], [44.1, [0, 0, 1.02]], [44.7, [0, 0, 1.0]], [45.0, [0, 0, 1.0]], [46.0, [0, 20, 1.45]], [47.4, [0, 20, 1.95]], [49.0, [0, 20, 2.1]], [50.7, [0, 20, 2.3]]]);

export function makeDoor(childPr) {
  // brick wall tile
  const brick = mk(256, 126), bx = brick.getContext('2d');
  bx.fillStyle = '#2f3640'; bx.fillRect(0, 0, 256, 126);
  for (let r = 0; r < 3; r++) for (let c = -1; c < 3; c++) {
    const x = c * 128 + (r % 2 ? 64 : 0) + 3, y = r * 42 + 3, v = hash(r * 7.1 + c * 3.3);
    bx.fillStyle = `rgb(${72 + v * 22},${82 + v * 22},${96 + v * 20})`; bx.fillRect(x, y, 122, 36);
    bx.fillStyle = 'rgba(255,255,255,.07)'; bx.fillRect(x, y, 122, 3);
  }
  TEX.brick = brick;
  const gL = new Print((P) => guardian(P, false), GUARD_W, GUARD_H, { S: 1.25, m: 20, seed: 1 });
  const gR = new Print((P) => { P.c.translate(GUARD_W, 0); P.c.scale(-1, 1); guardian(P, true); }, GUARD_W, GUARD_H, { S: 1.25, m: 20, seed: 4, regScale: .9 });
  const lin = new Print(lintel, LINTEL_W, LINTEL_H, { S: 1.3, m: 10, seed: 2 });
  const cpL = new Print((P) => couplet(P, 0), COUPLET_W, COUPLET_H, { S: 1.3, m: 10, seed: 3 });
  const cpR = new Print((P) => couplet(P, 1), COUPLET_W, COUPLET_H, { S: 1.3, m: 10, seed: 5 });
  const sl = new Print(seal, SEAL_W, SEAL_H, { S: 1.5, m: 10, seed: 6 });
  for (const p of [gL, gR, lin, cpL, cpR, sl]) p.comp(6);
  const leafCache = {};
  return { gL, gR, lin, cpL, cpR, sl, leafCache, childPr };
}

function brickWall(ctx, cam) {
  ctx.fillStyle = '#2f3640'; ctx.fillRect(cam.x - 1500, cam.y - 1000, 3000, 2000);
  worldFill(ctx, 'brick', cam.x - 1500, cam.y - 1000, 3000, 2000, 1.7);
  // dusk gradient: darker at the top
  const g = ctx.createLinearGradient(0, -700, 0, 500); g.addColorStop(0, 'rgba(10,14,40,.62)'); g.addColorStop(.7, 'rgba(10,14,40,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(cam.x - 1500, -700, 3000, 1300);
}

function ground(ctx, cam) {
  ctx.fillStyle = '#7f858a'; ctx.fillRect(-640, BOT, 1280, 34);
  ctx.fillStyle = '#5c6268'; ctx.fillRect(-640, BOT + 34, 1280, 44);
  ctx.fillStyle = '#35393e'; ctx.fillRect(cam.x - 1500, BOT + 78, 3000, 700);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
  for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 120, BOT + 78); ctx.lineTo(i * 150, BOT + 700); ctx.stroke(); }
  for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(-1500, BOT + 120 + j * j * 22 + j * 20); ctx.lineTo(1500, BOT + 120 + j * j * 22 + j * 20); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(-640, BOT, 1280, 4);
}

function brush(ctx, x, y, rot = .5) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-60 + 8, -20 + 12, 120, 40);
  ctx.fillStyle = '#7b4e22'; ctx.fillRect(-10, -190, 20, 180);                           // handle
  ctx.fillStyle = '#2d1c0e'; ctx.fillRect(-10, -190, 20, 14);
  ctx.fillStyle = '#d8c9a4'; ctx.beginPath(); ctx.roundRect(-62, -14, 124, 54, 6); ctx.fill();   // bristles with paste
  ctx.strokeStyle = 'rgba(120,100,60,.55)'; ctx.lineWidth = 2; for (let i = -54; i <= 54; i += 9) { ctx.beginPath(); ctx.moveTo(i, -8); ctx.lineTo(i, 36); ctx.stroke(); }
  ctx.fillStyle = '#6a4a22'; ctx.fillRect(-64, -22, 128, 14);
  ctx.restore();
}

// ------------------------------------------------------------------ leaf content (local coords, origin = top-left of the leaf)
function leafState(t, side) {
  const lay = side < 0 ? C.layL : C.layR, off = side < 0 ? 0 : .08;
  let done = 0, active = -1;
  C.pass.forEach((t0, i) => { const s = t0 + off; if (t >= s + C.passDur) done = i + 1; else if (t >= s && active < 0) active = i; });
  const pa = side < 0 ? seg(t, C.paste0, C.paste0 + (C.paste1 - C.paste0) * .55) : seg(t, C.paste0 + (C.paste1 - C.paste0) * .5, C.paste1);
  return { lay, done, active, off, pa };
}

function leafContent(ctx, side, t, door) {
  const st = leafState(t, side), pr = side < 0 ? door.gL : door.gR;
  // lacquer
  const g = ctx.createLinearGradient(0, 0, LW, 0); g.addColorStop(0, '#9a1f14'); g.addColorStop(.5, '#b8281a'); g.addColorStop(1, '#951e13');
  ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; for (const x of [84, 168, 252]) ctx.fillRect(x - 1.5, 0, 3, LH);
  ctx.fillStyle = 'rgba(255,200,170,.12)'; for (const x of [84, 168, 252]) ctx.fillRect(x + 1.5, 0, 2, LH);
  ctx.strokeStyle = '#2a1008'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, LW - 8, LH - 8);
  // brass studs along both long edges
  ctx.fillStyle = '#d4a53a'; for (let i = 0; i < 9; i++) for (const x of [20, LW - 20]) { ctx.beginPath(); ctx.arc(x, 36 + i * 76, 7, 0, 7); ctx.fill(); }
  // paste
  const px = LW / 2, py = 335, pw = pr.PW * GS, ph = pr.PH * GS;
  if (st.pa > 0 && t < st.lay + .1) {
    const w = mk(Math.ceil(pw), Math.ceil(ph)), wx = w.getContext('2d');
    wx.fillStyle = 'rgba(236,224,190,.62)'; wx.fillRect(0, 0, w.width, w.height);
    wx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) wx.fillRect(0, i * w.height / 6 + 6, w.width, 3);
    const tmp = mk(w.width, w.height); sweepCopy(tmp, w, st.pa, Math.PI / 2, .08);
    ctx.drawImage(tmp, px - pw / 2, py - ph / 2);
    if (st.pa < 1) { const q = st.pa, by = lerp(py - ph / 2, py + ph / 2, q), bx = px + Math.sin(q * Math.PI * 7) * pw * .28; brush(ctx, bx, by + 10, side < 0 ? .5 : -.5); }
  }
  // the guardian sheet
  const lp = seg(t, st.lay - .25, st.lay);
  if (lp > 0) {
    const off = st.active >= 0 ? 1 - ss(seg(t, C.pass[st.active] + st.off, C.pass[st.active] + st.off + C.passDur + .3)) : 0;
    const dirL = st.active >= 0 ? DIRS[st.active] : 0, dir = side < 0 ? dirL : Math.PI - dirL;
    const pp = st.active >= 0 ? clamp(seg(t, C.pass[st.active] + st.off, C.pass[st.active] + st.off + C.passDur)) : 0;
    const cv = pr.render(1 + st.done, pp, dir, off, .22);
    const land = ei(lp), k = GS * (1 + (1 - land) * .06);
    ctx.save(); ctx.translate(px, py - (1 - land) * 24); ctx.globalAlpha = Math.min(1, lp * 3);
    softShadow(ctx, -pw / 2 + 3, -ph / 2 + 5, pw, ph, 6, .4);
    ctx.drawImage(cv, -pw * k / GS / 2, -ph * k / GS / 2, pw * k / GS, ph * k / GS);
    ctx.restore();
  }
  // the seal strip over the seam, on whichever side this leaf is
  const sealP = seg(t, C.seal0 + .1, C.seal0 + .6);
  if (sealP > 0) {
    const sl = door.sl, sw = sl.PW * .62, sh = sl.PH * .62, cx = side < 0 ? LW : 0, cy = 345;
    ctx.save(); ctx.beginPath();
    if (t >= D.tear - .05) {                    // torn edge
      const rr = mulberry(5); ctx.moveTo(side < 0 ? 0 : 0, cy - 60);
      const x0 = side < 0 ? LW : 0, dir = side < 0 ? 1 : -1;
      if (side < 0) { ctx.moveTo(0, cy - 60); ctx.lineTo(LW - 6, cy - 60); for (let y = cy - 60; y <= cy + 60; y += 9) ctx.lineTo(LW - 6 + ((y / 9 | 0) % 2 ? 1 : -1) * (5 + hash(y * .31) * 14), y); ctx.lineTo(0, cy + 60); }
      else { ctx.moveTo(LW, cy - 60); ctx.lineTo(6, cy - 60); for (let y = cy - 60; y <= cy + 60; y += 9) ctx.lineTo(6 + ((y / 9 | 0) % 2 ? -1 : 1) * (5 + hash(y * .37 + 3) * 14), y); ctx.lineTo(LW, cy + 60); }
      ctx.closePath();
    } else ctx.rect(0, cy - 60, LW, 120);
    ctx.clip();
    // reveal from the left to the right across both leaves: the left leaf first, then the right
    const half = side < 0 ? seg(sealP, 0, .5) : seg(sealP, .5, 1);
    if (half > 0) {
      ctx.save(); ctx.beginPath(); if (side < 0) ctx.rect(0, 0, LW * half + 2, LH); else ctx.rect(0, 0, LW * half + 2, LH); ctx.clip();
      softShadow(ctx, cx - sw / 2 + 3, cy - sh / 2 + 4, sw, sh, 5, .35);
      ctx.drawImage(sl.render(6, 0), cx - sw / 2, cy - sh / 2, sw, sh);
      ctx.restore();
    }
    ctx.restore();
  }
}

function openAngle(t) {
  const q = seg(t, D.open0, D.open1);
  return 1.5 * eio(q) + (q >= 1 ? .03 * Math.exp(-(t - D.open1) * 5) * Math.sin((t - D.open1) * 12) : 0);
}

// draw a leaf: flat when closed, in perspective strips when open
function drawLeaf(ctx, side, t, door, theta) {
  const hingeX = side < 0 ? -LW : LW;
  if (theta < .004) {
    ctx.save(); ctx.translate(side < 0 ? -LW : 0, TOP); ctx.beginPath(); ctx.rect(0, 0, LW, LH); ctx.clip(); leafContent(ctx, side, t, door); ctx.restore(); return;
  }
  const K = 1.6, torn = t >= D.tear - .05, key = side + (torn ? 'b' : 'a');
  let L = door.leafCache[key];
  if (!L) { L = mk(LW * K, LH * K); const lx = L.getContext('2d'); lx.scale(K, K); leafContent(lx, side, torn ? 99 : 44.9, door); door.leafCache[key] = L; }
  const n = 56, c = Math.cos(theta), s = Math.sin(theta), kp = .5, yc = TOP + LH / 2;
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, f = (u) => 1 / (1 + kp * s * u * 1.0);
    const x = (u) => LW * c * u * f(u) / (1 + 0 * u), xa = hingeX + (side < 0 ? 1 : -1) * x(u0), xb = hingeX + (side < 0 ? 1 : -1) * x(u1);
    const h = LH * f((u0 + u1) / 2), sx = (side < 0 ? u0 : 1 - u1) * L.width, sw = L.width / n;
    const dx = Math.min(xa, xb), dw = Math.abs(xb - xa) + .8;
    ctx.drawImage(L, sx, 0, sw, L.height, dx, yc - h / 2, dw, h);
  }
  // shade the leaf as it turns away
  ctx.save(); ctx.globalAlpha = .45 * s; ctx.fillStyle = '#1a0805';
  const xe = hingeX + (side < 0 ? 1 : -1) * LW * c / (1 + kp * s), hh = LH / (1 + kp * s);
  ctx.beginPath(); ctx.moveTo(hingeX, TOP); ctx.lineTo(xe, yc - hh / 2); ctx.lineTo(xe, yc + hh / 2); ctx.lineTo(hingeX, BOT); ctx.closePath(); ctx.fill(); ctx.restore();
}

function interior(ctx, t, door) {
  // warm room behind the doors
  const x0 = -LW, x1 = LW;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, TOP, x1 - x0, BOT - TOP); ctx.clip();
  const g = ctx.createLinearGradient(0, TOP, 0, BOT); g.addColorStop(0, '#7a3a22'); g.addColorStop(.6, '#c1743a'); g.addColorStop(1, '#6a3a22');
  ctx.fillStyle = g; ctx.fillRect(x0, TOP, x1 - x0, BOT - TOP);
  ctx.globalAlpha = .35; worldFill(ctx, 'plaster', x0, TOP, x1 - x0, 560, 1.4); ctx.globalAlpha = 1;
  // wainscot and floor
  ctx.fillStyle = '#4a2214'; ctx.fillRect(x0, 250, x1 - x0, BOT - 250);
  ctx.fillStyle = 'rgba(255,190,120,.25)'; ctx.fillRect(x0, 250, x1 - x0, 5);
  // red altar table with two candles
  ctx.fillStyle = '#8f1d12'; ctx.fillRect(-250, 240, 500, 54); ctx.fillStyle = '#d4a53a'; ctx.fillRect(-250, 240, 500, 6);
  for (const cx of [-190, 190]) { ctx.fillStyle = '#f0e2c0'; ctx.fillRect(cx - 7, 200, 14, 40); const fl = 1 + .08 * Math.sin(t * 17 + cx); ctx.fillStyle = '#ffc24a'; ctx.beginPath(); ctx.ellipse(cx, 188, 7 * fl, 15 * fl, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,200,100,.18)'; ctx.beginPath(); ctx.arc(cx, 188, 70, 0, 7); ctx.fill(); }
  // the child print, hung on the wall with four pins
  const pr = door.childPr, sc = .5, w = pr.PW * sc, h = pr.PH * sc, cy = -20;
  softShadow(ctx, -w / 2 + 6, cy - h / 2 + 8, w, h, 12, .5);
  ctx.drawImage(pr.comp(6), -w / 2, cy - h / 2, w, h);
  ctx.fillStyle = '#d4a53a'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(dx * (w / 2 - 12), cy + dy * (h / 2 - 12), 6, 0, 7); ctx.fill(); }
  // light from the room: a warm radial haze
  const hz = ctx.createRadialGradient(0, 0, 40, 0, 0, 520); hz.addColorStop(0, 'rgba(255,190,110,.20)'); hz.addColorStop(1, 'rgba(60,15,0,.38)');
  ctx.fillStyle = hz; ctx.fillRect(x0, TOP, x1 - x0, BOT - TOP);
  ctx.restore();
}

function frame(ctx) {
  const wood = '#3b1d12';
  ctx.fillStyle = wood; ctx.fillRect(-372, TOP - 40, 744, 40); ctx.fillRect(-372, TOP, 36, BOT - TOP); ctx.fillRect(336, TOP, 36, BOT - TOP);
  ctx.fillStyle = 'rgba(255,170,110,.14)'; ctx.fillRect(-372, TOP - 40, 744, 4); ctx.fillRect(-372, TOP, 4, BOT - TOP); ctx.fillRect(336, TOP, 4, BOT - TOP);
  ctx.fillStyle = '#d4a53a'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-354, TOP + 44 + i * 74, 6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(354, TOP + 44 + i * 74, 6, 0, 7); ctx.fill(); }
}

function lantern(ctx, x, y, t, glow) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -420); ctx.lineTo(0, -52); ctx.stroke();
  const gl = ctx.createRadialGradient(0, 0, 10, 0, 0, 230); gl.addColorStop(0, `rgba(255,150,70,${.5 * glow})`); gl.addColorStop(1, 'rgba(255,100,40,0)');
  ctx.fillStyle = gl; ctx.fillRect(-240, -240, 480, 480);
  ctx.fillStyle = '#d4a53a'; ctx.fillRect(-26, -62, 52, 14); ctx.fillRect(-26, 48, 52, 14);
  const g = ctx.createLinearGradient(-50, 0, 50, 0); g.addColorStop(0, '#8c150c'); g.addColorStop(.5, '#e0402a'); g.addColorStop(1, '#8c150c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 50, 58, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(80,10,0,.5)'; ctx.lineWidth = 2; for (const k of [-24, 0, 24]) { ctx.beginPath(); ctx.ellipse(0, 0, Math.abs(k) * 2 + 4, 58, 0, 0, 7); ctx.stroke(); }
  ctx.strokeStyle = '#e8b94a'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 8, 62); ctx.lineTo(i * 10 + Math.sin(t * 2 + i) * 3, 120); ctx.stroke(); }
  ctx.restore();
}

// crackers: a string hung each side; they burst bottom to top
const CX = [-565, 565], NCR = 12;
const crY = (i) => 170 - i * 30;
function crackerBurstTime(i) { return D.burst + i * 0.12; }

function crackers(ctx, t) {
  for (const x of CX) {
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -300); ctx.lineTo(x, 190); ctx.stroke();
    for (let i = 0; i < NCR; i++) {
      const bt = crackerBurstTime(i); if (t > bt + .06) continue;
      ctx.save(); ctx.translate(x, crY(i)); ctx.rotate(((i % 2) - .5) * .3);
      ctx.fillStyle = '#c4261a'; ctx.fillRect(-8, -13, 16, 26); ctx.fillStyle = '#e8b94a'; ctx.fillRect(-8, -13, 16, 4); ctx.fillRect(-8, 9, 16, 4);
      ctx.restore();
    }
  }
}

function particles(ctx, t) {
  if (t < D.burst) return;
  const rnd = mulberry(77);
  for (let s = 0; s < 2; s++) for (let i = 0; i < NCR; i++) {
    const bt = crackerBurstTime(i), dt = t - bt; const n = 7;
    const ox = CX[s], oy = crY(i);
    // flash + smoke
    if (dt >= 0 && dt < .12) { ctx.fillStyle = `rgba(255,${200 + 30 * (1 - dt / .12) | 0},120,${.8 * (1 - dt / .12)})`; ctx.beginPath(); ctx.arc(ox, oy, 26 + dt * 380, 0, 7); ctx.fill(); }
    if (dt >= 0 && dt < 2.2) { const q = dt / 2.2, sx = ox + (hash(i + s * 9) - .5) * 70 * q, sy = oy - 40 * q, sr = 24 + 90 * q; const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr); sg.addColorStop(0, `rgba(200,195,190,${.3 * (1 - q)})`); sg.addColorStop(1, 'rgba(200,195,190,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill(); }
    for (let k = 0; k < n; k++) {
      const a = (-Math.PI * (.05 + .9 * rnd())) + (s ? 0.35 : -0.35), v = 160 + 520 * rnd(), sp = (rnd() - .5) * 14, sz = 8 + rnd() * 12, col = rnd() < .16 ? '#eaae28' : rnd() < .5 ? '#d8301a' : '#b5200f';
      if (dt < 0) continue;
      const g = 800, vx = Math.cos(a) * v * (s ? -1 : 1) * (1) , vy = Math.sin(a) * v;
      let x = ox + vx * dt * Math.exp(-dt * .6), y = oy + vy * dt + .5 * g * dt * dt;
      const gy = BOT + 10 + hash(i * 3.1 + k + s * 40) * 30;
      let rest = false; if (y > gy) { y = gy; rest = true; }
      ctx.save(); ctx.translate(x, y); ctx.rotate(rest ? (hash(k + i * 7) - .5) * 3 : sp * dt); ctx.fillStyle = col; ctx.globalAlpha = rest ? .95 : 1;
      ctx.fillRect(-sz / 2, -sz / 3, sz, sz * .66); ctx.restore();
    }
  }
}

// red paper bits from the crackers drift down the lit doorway while we look in
function drift(ctx, t) {
  if (t < 45.6 || t > 50.6) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const a = ss(seg(t, 45.6, 46.4)) * (1 - ss(seg(t, 49.8, 50.6)));
  for (let i = 0; i < 26; i++) {
    const x0 = hash(i * 3.3) * SW, sp = 60 + hash(i * 7.7) * 90, ph = hash(i * 5.1) * 6;
    const x = x0 + Math.sin(t * .9 + ph) * 60, y = ((hash(i * 9.9) * SH * 1.6 + (t - 45.6) * sp) % (SH + 80)) - 40;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (.8 + hash(i) * 1.6) + ph); ctx.globalAlpha = a * (.5 + hash(i * 2.2) * .5);
    ctx.fillStyle = hash(i * 1.7) < .2 ? '#eaae28' : '#d8301a'; const sz = 9 + hash(i * 4.1) * 12; ctx.fillRect(-sz / 2, -sz / 3, sz, sz * .66); ctx.restore();
  }
}

export function drawDoor(ctx, t, cam, door, shake) {
  camSet(ctx, cam, shake);
  brickWall(ctx, cam); ground(ctx, cam);
  const theta = t >= D.open0 ? openAngle(t) : 0;
  // lanterns
  const lit = ss(seg(t, 40.5, 41.2)) * .6 + .4;
  lantern(ctx, -690, -240, t, lit); lantern(ctx, 690, -240, t, lit);
  crackers(ctx, t);
  // lamp light from the room spilling out on the steps
  if (theta > 0) interior(ctx, t, door); else { ctx.fillStyle = '#16100c'; ctx.fillRect(-LW, TOP, 2 * LW, LH); }
  if (theta > 0) {
    // warm spill
    const sp = ctx.createLinearGradient(0, BOT, 0, BOT + 280); sp.addColorStop(0, `rgba(255,170,90,${.55 * Math.min(1, theta)})`); sp.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = sp; ctx.beginPath(); ctx.moveTo(-LW, BOT + 34); ctx.lineTo(LW, BOT + 34); ctx.lineTo(LW + 260 * theta, BOT + 300); ctx.lineTo(-LW - 260 * theta, BOT + 300); ctx.closePath(); ctx.fill();
  }
  drawLeaf(ctx, -1, t, door, theta); drawLeaf(ctx, 1, t, door, theta);
  // light crack along the seam before the doors move
  const cr = seg(t, C.crack, D.open0 + .3);
  if (cr > 0 && theta < .05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,190,100,${.5 * cr})`; ctx.fillRect(-1.5 - 2 * cr, TOP + 4, 3 + 4 * cr, LH - 8); ctx.restore(); }
  frame(ctx);
  // lintel banner
  const lp = seg(t, C.lintel - .3, C.lintel);
  if (lp > 0) {
    const w = door.lin.PW * .66, h = door.lin.PH * .66, land = ei(lp);
    ctx.save(); ctx.translate(0, TOP - 62 - (1 - land) * 70); ctx.globalAlpha = Math.min(1, lp * 3);
    softShadow(ctx, -w / 2 + 3, -h / 2 + 6, w, h, 8, .5); ctx.drawImage(door.lin.render(6, 0), -w / 2, -h / 2, w, h); ctx.restore();
  }
  // couplet strips on the wall, left and right
  [[door.cpL, -438, C.coupL], [door.cpR, 438, C.coupR]].forEach(([pr, x, tt]) => {
    const q = seg(t, tt - .3, tt); if (q <= 0) return;
    const w = pr.PW * .74, h = pr.PH * .74, land = ei(q);
    ctx.save(); ctx.translate(x, 55 - (1 - land) * 80); ctx.globalAlpha = Math.min(1, q * 3);
    softShadow(ctx, -w / 2 + 3, -h / 2 + 6, w, h, 7, .45); ctx.drawImage(pr.render(6, 0), -w / 2, -h / 2, w, h); ctx.restore();
  });
  particles(ctx, t);
  drift(ctx, t);
  // flash of the first burst
  if (t >= D.burst && t < D.burst + .2) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,220,150,${.2 * (1 - (t - D.burst) / .2)})`; ctx.fillRect(0, 0, SW, SH); ctx.restore(); }
}
