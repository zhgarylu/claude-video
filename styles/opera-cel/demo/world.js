// world.js — the painted places of the film, built once into canvases (dry = spring shut, lush = spring open).
import { mulberry, lerp, clamp, ss, vnoise } from '/core/lib.js';
import { PAL, shade, mix, spl, arc, cat, rev, trace, bbox, ink, inkLoop, cel, flat, textures, tube } from './brush.js';
import * as S from './scenery.js';
import { facePaint } from './facepaint.js';

const cache = {};
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export const PALS = {
  dry: {
    sky0: '#d8b070', sky1: '#f0e2bc', far: ['#cdbd9a', '#a89576'], mid: ['#cfa468', '#8c6c46'], near: ['#a8885a', '#6a5136'],
    line: '#4a3322', rim: '#f0d9a0', mist: 'rgba(240,226,188,.82)', sun: '#d89a45', sunHalo: '#e9c778', ground: '#c3a06c', groundDk: '#8b6b45',
    needle: '#6a6a3c', needleLt: '#9a9a5e', needleHi: '#cdbb78', rock: ['#b79a6c', '#7d6445'], cloud: '#eadfc4', cloudLine: '#9a7f50',
  },
  lush: {
    sky0: '#f2cf78', sky1: '#f3e8c6', far: [PAL.azuLt, PAL.azurite], mid: [PAL.malaLt, PAL.malachite], near: [PAL.malachite, PAL.malaDk],
    line: PAL.inkBlue, rim: PAL.goldLt, mist: 'rgba(239,225,186,.85)', sun: PAL.cinnabar, sunHalo: PAL.goldLt, ground: '#8fbf86', groundDk: '#3f8a63',
    needle: PAL.malaDk, needleLt: PAL.malaLt, needleHi: PAL.goldLt, rock: ['#7f9a8a', '#44695a'], cloud: PAL.white, cloudLine: PAL.azurite,
  },
};

function skyWash(ctx, W, H, P, y1 = 760) {
  const g = ctx.createLinearGradient(0, 0, 0, y1); g.addColorStop(0, P.sky0); g.addColorStop(1, 'rgba(240,226,188,0)');
  ctx.save(); ctx.globalAlpha = .75; ctx.fillStyle = g; ctx.fillRect(0, 0, W, y1); ctx.restore();
}

export function ground(ctx, x0, x1, y, h, P, seed, lush = false) {
  const r = mulberry(seed), pts = [];
  for (let x = x0 - 40; x <= x1 + 40; x += 60) pts.push([x, y + (vnoise(x / 220 + seed) - .5) * 26]);
  const top = spl(pts, false, 6);
  const poly = cat(top, [[x1 + 40, y + h + 40], [x0 - 40, y + h + 40]]);
  ctx.save(); trace(ctx, poly); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, P.ground); g.addColorStop(1, P.groundDk); ctx.fillStyle = g; ctx.fill(); ctx.clip();
  const { MOTT } = textures(ctx); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .6; ctx.fillStyle = MOTT; ctx.fillRect(x0 - 50, y - 40, x1 - x0 + 100, h + 120); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const n = Math.floor((x1 - x0) / 14);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), yy = y + 14 + Math.pow(r(), .8) * (h - 10);
    if (lush) { for (let k = -1; k <= 1; k++) ink(ctx, [[x + k * 5, yy], [x + k * 9, yy - 14 - r() * 12]], { w: 3, col: r() < .5 ? PAL.malaDk : PAL.malaLt, seed: seed + i * 3 + k, taper: [.1, .8], minw: .1, alpha: .85 }); }
    else if (r() < .55) {   // cracked earth
      const a = r() * 6.28, l = 30 + r() * 90, p0 = [x, yy], pp = [p0];
      let cx = x, cy = yy; for (let k = 0; k < 4; k++) { cx += Math.cos(a + (r() - .5) * 1.2) * l / 4; cy += Math.sin(a + (r() - .5) * 1.2) * l / 8; pp.push([cx, cy]); }
      ink(ctx, pp, { w: 2 + r() * 2.2, col: '#4a3322', seed: seed + i, taper: [.1, .7], minw: .15, alpha: .7, dry: .25 });
    }
  }
  ctx.restore();
  ink(ctx, top, { w: 4, col: P.line, seed: seed + 3, taper: [.03, .03], minw: .6 });
}

export function rockMass(ctx, pts, P, seed, opts = {}) {
  const { top = P.rock[0], bot = P.rock[1], strokes = 1 } = opts;
  const poly = spl(pts, true, 6, .28), [x0, y0, x1, y1] = bbox(poly);
  ctx.save(); trace(ctx, poly); const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fill(); ctx.clip();
  const { MOTT } = textures(ctx); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .7; ctx.fillStyle = MOTT; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const r = mulberry(seed);
  // vertical facets, light left, dark right
  for (let i = 0; i < 5; i++) { const fx = lerp(x0, x1, r()), fw = 60 + r() * 140; flat(ctx, [[fx, y0 - 10], [fx + fw, y0 - 10], [fx + fw + 50, y1 + 10], [fx - 30, y1 + 10]], r() < .5 ? 'rgba(255,240,200,.14)' : 'rgba(20,24,40,.2)'); }
  const n = Math.floor((x1 - x0) * (y1 - y0) / 3200 * strokes);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), l = 40 + r() * 120, a = Math.PI / 2 + (r() - .5) * .35, dark = r() < .6;
    ink(ctx, spl([[x, y], [x + Math.cos(a) * l * .5 + (r() - .5) * 10, y + l * .5], [x + Math.cos(a) * l + (r() - .5) * 8, y + l]], false, 4), { w: 3 + r() * 4, col: dark ? shade(bot, .6) : shade(top, 1.4), seed: seed + i, alpha: dark ? .5 : .45, taper: [.3, .5], minw: .1, wob: .8, dry: .5 });
  }
  ctx.restore();
  inkLoop(ctx, poly, { w: 5, col: P.line, seed, light: .5, press: .5 });
}

function clouds(ctx, list, P) { for (const [x, y, s, sd, fl] of list) S.xiangyun(ctx, x, y, s, sd, { fill: P.cloud, lineCol: P.cloudLine, gold: PAL.goldDk, flip: fl ?? 1, lw: 4 }); }

// ---------------- the long scroll (shots 1-2): a far layer (sky, mountains) and a near layer (pines, gate, ground) for parallax ----------------
export function scrollWorld() {
  if (cache.scroll) return cache.scroll;
  const P = PALS.dry, FW = 4500, NW = 5760, H = 1080;
  const far = cv(FW, H), fx = far.getContext('2d');
  fx.drawImage(S.paperCanvas(FW, H, '#ecdeb8', 7), 0, 0);
  skyWash(fx, FW, H, P);
  S.disc(fx, 3500, 300, 118, P.sun, { halo: P.sunHalo, rings: 3, seed: 5 });
  S.mountain(fx, -50, 1800, 720, 340, 41, { top: P.far[0], bot: P.far[1], peaks: 4, line: P.line, lw: 2.8, mist: P.mist, rim: P.rim });
  S.mountain(fx, 1600, 3500, 740, 380, 42, { top: P.far[0], bot: P.far[1], peaks: 5, line: P.line, lw: 2.8, mist: P.mist, rim: P.rim });
  S.mountain(fx, 3300, 4600, 720, 320, 43, { top: P.far[0], bot: P.far[1], peaks: 3, line: P.line, lw: 2.8, mist: P.mist, rim: P.rim });
  S.eave(fx, 1500, 470, 180, 130, 7, { roof: '#7d8a58', trim: PAL.goldDk, wall: '#b4543c' });
  S.mountain(fx, -100, 1600, 860, 300, 51, { top: P.mid[0], bot: P.mid[1], peaks: 3, line: P.line, mist: P.mist, rim: P.rim });
  S.mountain(fx, 1400, 3200, 880, 340, 52, { top: P.mid[0], bot: P.mid[1], peaks: 4, line: P.line, mist: P.mist, rim: P.rim });
  S.mountain(fx, 3000, 4700, 860, 300, 53, { top: P.mid[0], bot: P.mid[1], peaks: 3, line: P.line, mist: P.mist, rim: P.rim });
  clouds(fx, [[300, 240, 1.1, 4], [1400, 180, .9, 12, -1], [2400, 260, 1.2, 19], [3100, 150, .8, 23], [3900, 360, 1.0, 29, -1]], P);
  const near = cv(NW, H), nx = near.getContext('2d');
  for (const [x, s, sd] of [[1200, .8, 3], [2700, .95, 5], [3500, .7, 7], [4500, .85, 9]]) S.pine(nx, x, 930, s, sd, { lean: sd % 2 ? 1 : -1, needle: P.needle, needleLt: P.needleLt, needleHi: P.needleHi });
  gateFar(nx, 5120, 930, .72, P);
  ground(nx, 0, NW, 905, 175, P, 61, false);
  const r = mulberry(77);
  for (let i = 0; i < 26; i++) { const x = 100 + i * 210 + r() * 60, y = 960 + r() * 50; const st = spl([[x - 46, y + 8], [x - 30, y - 14], [x + 20, y - 18], [x + 50, y + 4], [x + 28, y + 20], [x - 22, y + 20]], true, 4, .4); cel(nx, st, '#b69e7c', { lw: 3.2, seed: i, mott: .8, line: P.line }); }
  return cache.scroll = { far, near };
}
function gateFar(ctx, x, y, s, P) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const px of [-300, 140]) cel(ctx, [[px, 0], [px + 160, 0], [px + 160, -900], [px, -900]], '#8d7a62', { lw: 5, seed: px, mott: .7, line: P.line });
  cel(ctx, [[-400, -900], [400, -900], [400, -760], [-400, -760]], '#6b5a48', { lw: 5, seed: 4, mott: .7, line: P.line });
  S.eave(ctx, 0, -900, 900, 340, 3, { roof: '#7d8a58', trim: PAL.goldDk, wall: '#b4543c' });
  cel(ctx, [[-140, 0], [140, 0], [140, -700], [-140, -700]], '#2c3558', { lw: 4, seed: 8, mott: .6, line: P.line });
  ctx.restore();
}

// ---------------- the gate (tall canvas, shots 3-8 and 9b) ----------------
export const GATE = { W: 1920, H: 1980, groundY: 1800, discC: [960, 1420], discR: 150, doorTop: 1010, hingeL: 680, hingeR: 1240, medallion: [960, 850] };
export function gateWorld(lush) {
  const key = lush ? 'gateL' : 'gateD'; if (cache[key]) return cache[key];
  const { W, H } = GATE, c = cv(W, H), ctx = c.getContext('2d'), P = lush ? PALS.lush : PALS.dry;
  ctx.drawImage(S.paperCanvas(W, H, '#ecdeb8', 9), 0, 0);
  skyWash(ctx, W, H, P, 900);
  S.disc(ctx, 1480, 250, 130, P.sun, { halo: P.sunHalo, rings: 3, seed: 5 });
  S.mountain(ctx, -50, 2000, 560, 380, 71, { top: P.far[0], bot: P.far[1], peaks: 4, line: P.line, lw: 3, mist: P.mist, rim: P.rim });
  S.mountain(ctx, -100, 2020, 700, 340, 72, { top: P.mid[0], bot: P.mid[1], peaks: 3, line: P.line, mist: P.mist, rim: P.rim });
  clouds(ctx, [[120, 160, 1.0, 4], [1500, 420, .9, 13, -1]], P);
  // cliffs framing the gate
  rockMass(ctx, [[-60, 360], [200, 300], [420, 420], [500, 800], [470, 1850], [-60, 1850]], P, 81);
  rockMass(ctx, [[1980, 340], [1700, 280], [1460, 410], [1400, 820], [1430, 1850], [1980, 1850]], P, 82);
  // pillars
  for (const [x0, sd] of [[520, 1], [1240, 2]]) {
    const pil = [[x0, 520], [x0 + 160, 520], [x0 + 160, 1810], [x0, 1810]];
    cel(ctx, pil, lush ? '#c0452f' : '#a8523a', { lw: 6, seed: sd, mott: .8, pool: .3, line: P.line });
    ctx.save(); trace(ctx, pil); ctx.clip();
    for (let y = 600; y < 1800; y += 130) ink(ctx, [[x0, y], [x0 + 160, y + 4]], { w: 3.4, col: P.line, seed: y + sd, taper: [.05, .05], minw: .6, alpha: .8, dry: .2 });
    flat(ctx, [[x0 + 110, 520], [x0 + 160, 520], [x0 + 160, 1810], [x0 + 110, 1810]], 'rgba(20,24,50,.22)');
    ctx.restore();
    cel(ctx, [[x0 - 24, 520], [x0 + 184, 520], [x0 + 184, 590], [x0 - 24, 590]], PAL.azurite, { lw: 5, seed: sd + 5, mott: .5 });
    for (let k = 0; k < 4; k++) ink(ctx, [[x0 - 14 + k * 58, 530], [x0 - 14 + k * 58, 582]], { w: 6, col: PAL.gold, seed: sd * 9 + k, taper: [.1, .1], minw: .8 });
    for (let y = 640; y < 1780; y += 260) { const sp = []; for (let i = 0; i <= 22; i++) { const u = i / 22, a = u * 8; sp.push([x0 + 80 + Math.cos(a) * (36 - u * 28), y + 60 + Math.sin(a) * (34 - u * 26)]); } ink(ctx, sp, { w: 4, col: PAL.goldDk, seed: y + sd, taper: [.1, .3], minw: .3 }); }
  }
  // wall of the gate between the pillars (behind the doors and the medallion)
  const wall = [[670, 640], [1250, 640], [1250, 1810], [670, 1810]];
  cel(ctx, wall, lush ? '#8fa89a' : '#9d8a6e', { lw: 5, seed: 12, mott: .85, pool: .3, line: P.line });
  ctx.save(); trace(ctx, wall); ctx.clip();
  for (let y = 700; y < 1800; y += 110) ink(ctx, [[670, y], [1250, y + 3]], { w: 2.6, col: P.line, seed: y, taper: [.05, .05], minw: .6, alpha: .55, dry: .3 });
  flat(ctx, [[1100, 640], [1250, 640], [1250, 1810], [1100, 1810]], 'rgba(20,24,50,.18)'); ctx.restore();
  // gate tower: lintel beam + double eaves
  cel(ctx, [[470, 600], [1450, 600], [1450, 700], [470, 700]], PAL.indigo, { lw: 6, seed: 3, mott: .6 });
  for (let i = 0; i < 12; i++) { const x = 500 + i * 80; cel(ctx, [[x, 604], [x + 36, 604], [x + 36, 632], [x, 632]], i % 2 ? PAL.gold : PAL.cinnabar, { lw: 2, seed: i, mott: .2, pool: 0 }); }
  S.eave(ctx, 960, 600, 1100, 400, 5, { roof: lush ? PAL.malachite : '#7d8a58', trim: PAL.gold, wall: PAL.cinnabar });
  // medallion for the relief face
  const [mx, my] = GATE.medallion;
  cel(ctx, arc(mx, my, 190, 190, 0, 6.3, 5).slice(0, -1), lush ? '#9fb0a6' : '#a8957a', { lw: 7, seed: 31, mott: .8, line: P.line });
  ink(ctx, arc(mx, my, 172, 172, 0, 6.3, 5), { w: 5, col: PAL.goldDk, seed: 32, taper: [.02, .02], minw: .9 });
  // doorway interior behind the leaves
  ground(ctx, 0, W, 1800, 200, P, 91, lush);
  // stone steps in front of the doors
  for (let i = 0; i < 3; i++) { const y = 1790 + i * 36, x0 = 600 - i * 50, x1 = 1320 + i * 50; cel(ctx, [[x0, y], [x1, y], [x1 + 16, y + 40], [x0 - 16, y + 40]], i % 2 ? '#a3917a' : '#b3a088', { lw: 4, seed: 40 + i, mott: .7, line: P.line }); }
  return cache[key] = c;
}

// the relief face in the medallion (live: the eyes open)
export function reliefFace(ctx, open, lush, look = 0) {
  const [mx, my] = GATE.medallion;
  ctx.save(); ctx.translate(mx, my + 8); ctx.scale(.5, .5);
  facePaint(ctx, { base: lush ? '#7f9a8a' : '#9a8f78', white: '#d8d0b8', gold: '#b9923e', ink: '#3a3030', open, look, seed: 3 });
  ctx.restore();
}

// door leaves, opened by theta (0 closed .. 1.35 wide). The bronze disc rides the free edges.
export function gateDoors(ctx, theta, lush, ringT = -1, shake = 0, behind = null) {
  const G = GATE, top = G.doorTop, bot = G.groundY + 6, P = lush ? PALS.lush : PALS.dry, wL = 280, mid = 960;
  const c = Math.cos(theta), sw = wL * c, tap = (1 - c) * 120;
  // the opening behind the leaves
  if (theta > .01) {
    const x0 = G.hingeL + sw, x1 = G.hingeR - sw;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bot - top); ctx.clip();
    const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, '#fff6cf'); g.addColorStop(1, '#f2d88a'); ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, bot - top);
    if (behind) behind(x0, x1, top, bot);
    ctx.restore();
  }
  for (const s of [-1, 1]) {
    const hinge = s < 0 ? G.hingeL : G.hingeR;   // the free edge moves toward the hinge as the leaf swings away
    const fx = s < 0 ? hinge + sw : hinge - sw;
    const poly = [[hinge, top], [fx, top + tap], [fx, bot - tap * .3], [hinge, bot]];
    cel(ctx, poly, PAL.azurite, { lw: 6, seed: 50 + s, mott: .7, pool: .3, line: PAL.indigo });
    ctx.save(); trace(ctx, poly); ctx.clip();
    // panels and studs
    const nx = k => lerp(hinge, fx, k);
    for (let j = 0; j < 4; j++) {
      const y0 = top + 40 + j * 190, y1 = y0 + 150;
      ink(ctx, [[nx(.1), y0], [nx(.9), y0 + tap * .05], [nx(.9), y1], [nx(.1), y1 + tap * .02], [nx(.1), y0]], { w: 3.4, col: PAL.goldDk, seed: 60 + j + s, taper: [.02, .02], minw: .8 });
      for (let i = 0; i < 3; i++) { const sx = nx(.25 + i * .25), sy = (y0 + y1) / 2; ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.ellipse(sx, sy, 9 * c + 1, 9, 0, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.6; ctx.stroke(); }
    }
    flat(ctx, [[nx(.7), top], [fx, top], [fx, bot], [nx(.7), bot]], 'rgba(10,20,60,.2)');
    ctx.restore();
  }
  // bronze disc (the lock): whole when closed, split in halves on the free edges when open
  const [dx, dy] = G.discC, R = G.discR;
  const drawDisc = (cx, sx, half) => {
    ctx.save(); ctx.translate(cx + (shake ? shake * 3 : 0), dy); ctx.scale(sx, 1);
    ctx.beginPath(); if (half < 0) ctx.rect(-R - 40, -R - 40, R + 40, 2 * R + 80); else if (half > 0) ctx.rect(0, -R - 40, R + 40, 2 * R + 80); else ctx.rect(-R - 40, -R - 40, 2 * R + 80, 2 * R + 80); ctx.clip();
    const body = arc(0, 0, R, R, 0, 6.3, 4).slice(0, -1);
    cel(ctx, body, '#b57a3a', { lw: 7, seed: 70, mott: .6, pool: .35, line: PAL.ink, sheen: true });
    for (let k = 1; k <= 4; k++) ink(ctx, arc(0, 0, R * (1 - k * .19), R * (1 - k * .19), 0, 6.3, 4), { w: k % 2 ? 4 : 2.4, col: k % 2 ? PAL.goldLt : '#6a3f1c', seed: 71 + k, taper: [.02, .02], minw: .9, alpha: .95 });
    const boss = arc(0, 0, R * .2, R * .2, 0, 6.3, 3).slice(0, -1); cel(ctx, boss, PAL.goldLt, { lw: 3.4, seed: 79, mott: .2, sheen: true });
    // ring ripples after the stroke
    if (ringT >= 0) for (let k = 0; k < 3; k++) { const u = ringT - k * .12; if (u > 0 && u < 1.1) ink(ctx, arc(0, 0, R * (1 + u * .9), R * (1 + u * .9), 0, 6.3, 6), { w: 8 * (1 - u * .8), col: PAL.goldLt, seed: 90 + k, taper: [.02, .02], minw: .9, alpha: clamp(1 - u) * .9 }); }
    ctx.restore();
  };
  drawDisc(G.hingeL + sw, c, -1); drawDisc(G.hingeR - sw, c, 1);
}
