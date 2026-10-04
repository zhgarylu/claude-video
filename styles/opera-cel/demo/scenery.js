// scenery.js — painted decorative backdrops: xuan paper, mountains, xiangyun clouds, sea-water, pine, eaves, sun.
import { mulberry, vnoise, lerp, clamp, ss } from '/core/lib.js';
import { PAL, shade, mix, spl, bez, arc, cat, line, rev, trace, bbox, ink, inkLoop, cel, flat, capsule, textures } from './brush.js';

// ---------- xuan paper ----------
const cache = {};
export function paperCanvas(W, H, tone = '#efe1ba', seed = 5) {
  const key = `${W}x${H}${tone}${seed}`; if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = mulberry(seed);
  x.fillStyle = tone; x.fillRect(0, 0, W, H);
  // soft blotches (uneven sizing / ageing)
  for (let i = 0; i < 70; i++) {
    const cx = r() * W, cy = r() * H, rad = 80 + r() * 260, g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const dark = r() < .5; g.addColorStop(0, dark ? 'rgba(150,110,50,.07)' : 'rgba(255,248,225,.09)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  // fibres
  x.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const px = r() * W, py = r() * H, a = r() * 6.28, l = 6 + r() * 26, bend = (r() - .5) * 10;
    x.strokeStyle = r() < .5 ? 'rgba(255,250,230,.35)' : 'rgba(120,90,50,.16)'; x.lineWidth = .5 + r() * 1.1;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l / 2 + bend, py + Math.sin(a) * l / 2 + bend, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  // vignette: edges slightly deeper
  const g = x.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,80,30,.13)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return cache[key] = c;
}

// ---------- sun / moon disc ----------
export function disc(ctx, cx, cy, r, col = PAL.cinnabar, o = {}) {
  const { halo = PAL.goldLt, rings = 3, seed = 3 } = o;
  ctx.save();
  for (let i = 1; i <= rings; i++) ink(ctx, arc(cx, cy, r + i * r * .12, r + i * r * .12, 0, Math.PI * 2, 6), { w: Math.max(2, 5 - i), col: halo, seed: seed + i, taper: [.01, .01], minw: .85, alpha: .9 - i * .15, closed: false });
  ctx.globalAlpha = 1;
  const p = arc(cx, cy, r, r, 0, Math.PI * 2, 4); cel(ctx, p.slice(0, -1), col, { lw: 4, seed, mott: .35, pool: .3 });
  ctx.restore();
}

// ---------- mountains (blue-green landscape, decorative) ----------
export function ridge(x0, x1, baseY, h, seed, o = {}) {
  const r = mulberry(seed * 17 | 0), { peaks = 3, rough = .18, skew = 0 } = o;
  const n = 8 + peaks * 6, pts = [];
  const centers = []; for (let i = 0; i < peaks; i++) centers.push([lerp(.15, .85, (i + r() * .6) / peaks), lerp(.55, 1, r())]);
  for (let i = 0; i <= n; i++) {
    const u = i / n; let y = 0;
    for (const [c, a] of centers) y = Math.max(y, a * Math.exp(-Math.pow(Math.abs(u - c) / (.13 + rough * .12), 1.35) * (1.1 + skew)));
    y += (r() - .5) * rough * (.25 + y) * (i % 2 ? 1.3 : .6);
    pts.push([lerp(x0, x1, u), baseY - h * clamp(y, 0, 1.2) - r() * h * .03]);
  }
  const top = spl(pts, false, 5, .3);
  return cat([[x0 - 10, baseY + 400]], [[x0 - 10, top[0][1]]], top, [[x1 + 10, top[top.length - 1][1]], [x1 + 10, baseY + 400]]);
}
export function mountain(ctx, x0, x1, baseY, h, seed, o = {}) {
  const { top = PAL.azurite, bot = PAL.malachite, lw = 3.2, cun = true, line = PAL.inkBlue, peaks = 3, mist = null, snow = false } = o;
  const p = ridge(x0, x1, baseY, h, seed, { peaks, rough: o.rough ?? .2 });
  const [bx0, by0, bx1, by1] = bbox(p);
  ctx.save();
  trace(ctx, p); const g = ctx.createLinearGradient(0, by0, 0, baseY + 60); g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fill(); ctx.clip();
  const { MOTT } = textures(ctx);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .55; ctx.fillStyle = MOTT; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // shaded faces: each peak throws a flat darker facet down its right-hand side
  const tops = p.slice(2, p.length - 2);
  for (let i = 6; i < tops.length - 6; i += 3) {
    const q = tops[i]; let isPk = true; for (let j = -6; j <= 6; j++) if (tops[i + j][1] < q[1] - 1) isPk = false;
    if (!isPk) continue;
    const wv = (bx1 - bx0) * .09 + 40;
    ctx.fillStyle = 'rgba(18,30,70,.26)'; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + wv * .55, q[1] + (baseY - q[1]) * .35); ctx.lineTo(q[0] + wv * 1.5, baseY + 80); ctx.lineTo(q[0] - 10, baseY + 80); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,190,.16)'; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] - wv * .5, q[1] + (baseY - q[1]) * .3); ctx.lineTo(q[0] - wv * .9, baseY + 80); ctx.lineTo(q[0] - 10, baseY + 80); ctx.closePath(); ctx.fill();
  }
  if (cun) {   // cun-style texture: dry-brush strokes that follow the slope, light and dark, heavier near ridges
    const r = mulberry(seed * 5 | 0), n = Math.floor((bx1 - bx0) * (baseY + 30 - by0) / 1500);
    for (let i = 0; i < n; i++) {
      const x = lerp(bx0, bx1, r()), y = lerp(by0, baseY, Math.pow(r(), .85)), l = 26 + r() * 70, side = x < (bx0 + bx1) / 2 ? 1 : -1, a = Math.PI / 2 + side * (.35 + r() * .35) * (r() < .8 ? 1 : -1);
      const q = [[x, y], [x + Math.cos(a) * l * .5 + (r() - .5) * 14, y + Math.sin(a) * l * .5], [x + Math.cos(a) * l + (r() - .5) * 10, y + Math.sin(a) * l]];
      const dark = r() < .55;
      ink(ctx, spl(q, false, 4), { w: 2.4 + r() * 3.4, col: dark ? shade(top, .62) : shade(bot, 1.45), seed: seed + i, alpha: dark ? .55 : .5, taper: [.3, .5], minw: .1, wob: .8, dry: .45 });
    }
    for (let i = 0; i < n / 6; i++) { const x = lerp(bx0, bx1, r()), y = lerp(by0 + 20, baseY, r()); ink(ctx, [[x, y], [x + 40 + r() * 60, y + 6]], { w: 7 + r() * 8, col: shade(bot, .8), seed: seed + 900 + i, alpha: .14, taper: [.5, .5], minw: .1, dry: .6 }); }
  }
  if (mist) { const m = ctx.createLinearGradient(0, baseY - h * .45, 0, baseY + 20); m.addColorStop(0, 'rgba(233,216,174,0)'); m.addColorStop(1, mist); ctx.fillStyle = m; ctx.fillRect(bx0, baseY - h * .45, bx1 - bx0, h * .45 + 400); }
  ctx.restore();
  // ridge line only (brush), no closed outline at the bottom
  const ln = p.slice(2, p.length - 2);
  ink(ctx, ln.map(q => [q[0], q[1] + 7]), { w: 9, col: o.rim ?? PAL.goldLt, seed: seed + 1, taper: [.03, .03], minw: .5, alpha: .45 });
  ink(ctx, ln, { w: lw, col: line, seed, taper: [.03, .03], minw: .4, press: .45 });
}

// ---------- xiangyun (auspicious cloud) ----------
function spiralLobe(ctx, cx, cy, r, a0, dir, o) {
  const { fill, lineCol, w, seed, gold } = o;
  // embroidered halo ring behind the lobe
  ink(ctx, arc(cx, cy, r + 9, r + 9, a0 - .4, a0 - .4 + dir * 4.2, 4).map((p, i, a) => p), { w: 2.2, col: gold, seed: seed + 11, taper: [.3, .3], minw: .15, alpha: .85 });
  // body
  const body = arc(cx, cy, r, r, 0, Math.PI * 2, 4);
  ctx.save(); trace(ctx, body); ctx.fillStyle = fill; ctx.fill();
  const { MOTT } = textures(ctx); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .3; ctx.fillStyle = MOTT; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
  // outline spiralling inward at the end (the curl)
  const pts = []; const turns = 1.05, n = Math.ceil(r * 1.8);
  for (let i = 0; i <= n; i++) { const u = i / n, a = a0 + dir * u * Math.PI * 2 * turns, rr_ = r * (u < .72 ? 1 : lerp(1, .38, ss((u - .72) / .28))); pts.push([cx + Math.cos(a) * rr_, cy + Math.sin(a) * rr_]); }
  ink(ctx, pts, { w, col: lineCol, seed, taper: [.06, .3], minw: .3, press: .35 });
  // inner echo line (gold / pigment), a thin concentric curl
  const p2 = []; for (let i = 0; i <= n * .8; i++) { const u = i / (n * .8), a = a0 + .5 + dir * u * Math.PI * 1.6, rr_ = r * (.72 - .2 * u); p2.push([cx + Math.cos(a) * rr_, cy + Math.sin(a) * rr_]); }
  ink(ctx, p2, { w: Math.max(1.4, w * .45), col: gold, seed: seed + 3, taper: [.3, .4], minw: .1, alpha: .9 });
}
export function xiangyun(ctx, x, y, s = 1, seed = 1, o = {}) {
  const { fill = PAL.white, lineCol = PAL.azurite, gold = PAL.goldDk, flip = 1, n = 4, tail = 1, lw = 4, tailCol } = o;
  const r = mulberry(seed * 91 | 0);
  ctx.save(); ctx.translate(x, y); ctx.scale(s * flip, s);
  // lobes along a rising spine, largest in the middle-left, back to front
  const lobes = [];
  for (let i = 0; i < n; i++) {
    const u = i / Math.max(1, n - 1), rad = (62 - 22 * Math.abs(u - .3)) * (.6 + r() * .75);
    lobes.push({ cx: lerp(0, 210, u) + (r() - .5) * 34, cy: -Math.sin(u * Math.PI * .95) * 44 + (r() - .5) * 34, r: rad, a0: Math.PI * (.7 + r() * .7), dir: r() < .65 ? (i % 2 ? 1 : -1) : (i % 2 ? -1 : 1) });
  }
  // tail: tapering ribbon
  if (tail) {
    const tl = lobes[n - 1], t0 = [tl.cx - 6, tl.cy + tl.r * .72];
    const tp = spl([[tl.cx - 30, tl.cy + tl.r * .8], [tl.cx + 50, tl.cy + tl.r * .55], [tl.cx + 130, tl.cy + tl.r * .9], [tl.cx + 210, tl.cy + tl.r * .35], [tl.cx + 250, tl.cy - 20]], false, 5);
    const up = tp.map((p, i) => { const u = i / tp.length; return [p[0], p[1] - lerp(tl.r * .7, 3, ss(u))]; });
    const body = cat(up, rev(tp));
    flat(ctx, body, fill);
    ink(ctx, up, { w: lw * .9, col: lineCol, seed: seed + 7, taper: [.03, .4], minw: .2 });
    ink(ctx, tp, { w: lw * .8, col: lineCol, seed: seed + 8, taper: [.03, .5], minw: .2 });
    // curl at the tip
    const c = tp[tp.length - 1], cp = []; for (let i = 0; i <= 26; i++) { const u = i / 26, a = -.2 - u * 5.4, rr_ = 22 * (1 - u * .78); cp.push([c[0] + 10 + Math.cos(a) * rr_, c[1] - 14 - Math.sin(a) * rr_]); }
    ink(ctx, cp, { w: lw * .8, col: lineCol, seed: seed + 9, taper: [.02, .4], minw: .15 });
  }
  for (let i = n - 1; i >= 0; i--) { const L = lobes[i]; spiralLobe(ctx, L.cx, L.cy, L.r, L.a0, L.dir, { fill, lineCol, w: lw, seed: seed * 7 + i, gold }); }
  ctx.restore();
}

// ---------- sea-water pattern + crest ----------
export function seaRow(ctx, y, x0, x1, R, col, seed, o = {}) {
  const { lineCol = PAL.indigo, hi = PAL.white, lw = 3, off = 0 } = o;
  const step = R * 1.7;
  for (let x = x0 - step + off; x < x1 + step; x += step) {
    const p = cat(arc(x, y, R, R * .8, Math.PI, Math.PI * 2, 4), [[x + R, y + R * 1.6], [x - R, y + R * 1.6]]);
    cel(ctx, p, col, { lw, line: lineCol, seed: seed + (x | 0), mott: .35, pool: .15, reg: [0, 0] });
    for (let k = 1; k <= 3; k++) { const rr_ = R * (1 - k * .22); ink(ctx, arc(x, y, rr_, rr_ * .8, Math.PI * 1.08, Math.PI * 1.92, 3), { w: lw * .6, col: hi, seed: (x | 0) + k, taper: [.3, .3], minw: .2, alpha: .85 }); }
  }
}
export function sea(ctx, y0, y1, x0, x1, seed, o = {}) {
  const { cols = [PAL.azuLt, PAL.azurite, shade(PAL.azurite, .75), PAL.indigo], R = 46 } = o;
  const rows = Math.ceil((y1 - y0) / (R * .8)) + 1;
  for (let j = 0; j < rows; j++) {
    const y = y0 + j * R * .8, t = j / Math.max(1, rows - 1), col = mix(cols[0], cols[cols.length - 1], t);
    seaRow(ctx, y, x0, x1, R * lerp(.8, 1.1, t), col, seed + j * 31, { off: (j % 2) * R * .85, lineCol: shade(PAL.indigo, lerp(1, .8, t)), hi: t < .6 ? PAL.white : PAL.azuLt });
  }
}
// a rolling crest built from the same curl lobes as the clouds
export function crest(ctx, x, y, s, seed, o = {}) {
  xiangyun(ctx, x, y, s, seed, { fill: PAL.white, lineCol: PAL.indigo, gold: PAL.azuLt, n: 4, lw: 4, ...o });
}

// ---------- pine ----------
export function pine(ctx, x, y, s, seed, o = {}) {
  const r = mulberry(seed * 13 | 0), { lean = 1, needle = PAL.malaDk, needleLt = PAL.malaLt, needleHi = PAL.goldLt } = o;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // trunk: S-curve ribbon with bark scales
  const sp = spl([[0, 0], [-26 * lean, -140], [20 * lean, -270], [-14 * lean, -420], [18 * lean, -560]], false, 5);
  const wL = sp.map((p, i) => { const u = i / sp.length; return [p[0] - lerp(30, 9, u), p[1]]; }), wR = sp.map((p, i) => { const u = i / sp.length; return [p[0] + lerp(30, 9, u), p[1]]; });
  const body = cat(wL, rev(wR));
  cel(ctx, body, PAL.ochre, { lw: 4.5, seed, mott: .8, pool: .35, reg: [0, 0], line: PAL.ink });
  ctx.save(); trace(ctx, body); ctx.clip();
  for (let i = 0; i < 70; i++) { const k = Math.floor(r() * (sp.length - 3)), p = sp[k], dx = (r() - .5) * 28, a = r() * 6.28; ink(ctx, spl([[p[0] + dx, p[1]], [p[0] + dx + 10, p[1] + 5], [p[0] + dx + 22, p[1] + 4]], false, 4), { w: 2 + r() * 2, col: PAL.inkRed, seed: i, taper: [.3, .4], minw: .2, alpha: .7 }); }
  ctx.restore();
  // tiers of needles
  const tiers = [[-120, -250, 150, 60], [100, -330, 130, 54], [-80, -430, 150, 58], [40, -520, 150, 62], [-20, -620, 170, 70]];
  for (const [tx, ty, tw, th] of tiers) {
    const top = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16, a = Math.PI + u * Math.PI; top.push([tx + Math.cos(a) * tw, ty + Math.sin(a) * th * (.85 + (r() - .5) * .25)]); }
    const bot = []; for (let i = 0; i <= 9; i++) { const u = i / 9; bot.push([tx + tw - u * tw * 2, ty + 6 + Math.sin(u * 9) * 5 + (i % 2 ? 11 : 0)]); }
    const sh = cat(top, bot);
    cel(ctx, sh, needle, { lw: 3.5, seed: seed + tx | 0, mott: .6, pool: .25, reg: [0, 0], line: PAL.inkBlue });
    ctx.save(); trace(ctx, sh); ctx.clip();
    for (let i = 0; i < 90; i++) {   // needle bursts
      const a = Math.PI + r() * Math.PI, rad = r() * .9, px = tx + Math.cos(a) * tw * rad * .9, py = ty + Math.sin(a) * th * rad * .9 + 10, l = 14 + r() * 14;
      for (let k = -2; k <= 2; k++) { const aa = -Math.PI / 2 + k * .38 + (r() - .5) * .2; ink(ctx, [[px, py], [px + Math.cos(aa) * l, py + Math.sin(aa) * l]], { w: 1.8, col: r() < .6 ? needleLt : needleHi, seed: i * 5 + k, taper: [.1, .7], minw: .1, alpha: .75 }); }
    }
    ctx.restore();
    ink(ctx, bot, { w: 3.6, col: PAL.inkBlue, seed: seed + 5, taper: [.04, .04] });
  }
  ctx.restore();
}

// ---------- eaves (palace pavilion: curved double roof with upswept corners) ----------
export function roofTier(ctx, cx, y, w, h, seed, o) {
  const { roof, trim, line = PAL.ink } = o;
  const L = (x, yy) => [cx + x * w, y + yy * h];
  const right = spl([L(.30, -1), L(.40, -.55), L(.52, -.30), L(.64, -.36)], false, 4);
  const underR = spl([L(.64, -.36), L(.56, -.14), L(.30, -.04), L(0, 0)], false, 4);
  const underL = spl([L(0, 0), L(-.30, -.04), L(-.56, -.14), L(-.64, -.36)], false, 4);
  const left = spl([L(-.64, -.36), L(-.52, -.30), L(-.40, -.55), L(-.30, -1)], false, 4);
  const body = cat(right, underR, underL, left);
  cel(ctx, body, roof, { lw: 4, seed, mott: .6, pool: .3 });
  ctx.save(); trace(ctx, body); ctx.clip();
  for (let i = -8; i <= 8; i++) { const x = i * .07; ink(ctx, spl([L(x * .5, -.96), L(x * .9, -.5), L(x * 1.1, -.08)], false, 4), { w: 2, col: shade(roof, .5), seed: seed + i, taper: [.05, .05], minw: .5, alpha: .65 }); }
  ctx.restore();
  ink(ctx, cat(underR, underL), { w: 6, col: trim, seed: seed + 40, taper: [.03, .03], minw: .8 }); ink(ctx, cat(underR, underL), { w: 1.8, col: line, seed: seed + 41, taper: [.03, .03], minw: .8 });
  ink(ctx, [L(-.3, -1), L(.3, -1)], { w: 7, col: trim, seed: seed + 42, taper: [.02, .02], minw: .9 });
  for (const s of [-1, 1]) { const t = L(s * .64, -.36); cel(ctx, [[t[0], t[1] - 10], [t[0] + s * 12, t[1] - 26], [t[0] + s * 4, t[1] + 2]], trim, { lw: 2, seed: seed + 50 + s, mott: .1, pool: 0 }); }
}
export function eave(ctx, x, y, w, h, seed = 1, o = {}) {
  const { roof = PAL.malachite, trim = PAL.gold, wall = PAL.cinnabar } = o;
  // (x, y) = centre of the base; w total width; h roof+wall height
  ctx.save();
  const ww = w * .56, wh = h * .34;
  cel(ctx, [[x - ww / 2, y - wh], [x + ww / 2, y - wh], [x + ww / 2, y], [x - ww / 2, y]], wall, { lw: 3, seed, mott: .55 });
  for (let i = -2; i <= 2; i++) { const px = x + i * ww * .22; cel(ctx, [[px - 4, y - wh], [px + 4, y - wh], [px + 4, y], [px - 4, y]], shade(wall, .75), { lw: 1.8, seed: seed + i, mott: .3, pool: 0 }); }
  cel(ctx, [[x - ww * .62, y - wh - 6], [x + ww * .62, y - wh - 6], [x + ww * .62, y - wh + 8], [x - ww * .62, y - wh + 8]], PAL.azurite, { lw: 2.4, seed: seed + 9, mott: .4, pool: 0 });
  roofTier(ctx, x, y - wh - 4, w, h * .34, seed + 20, { roof, trim });
  cel(ctx, [[x - ww * .26, y - wh - h * .34 + 2], [x + ww * .26, y - wh - h * .34 + 2], [x + ww * .26, y - wh - h * .34 - h * .14], [x - ww * .26, y - wh - h * .34 - h * .14]], wall, { lw: 2.4, seed: seed + 30, mott: .5 });
  roofTier(ctx, x, y - wh - h * .34 - h * .1, w * .62, h * .3, seed + 60, { roof, trim });
  // finial
  ink(ctx, [[x, y - wh - h * .8], [x, y - wh - h * .98]], { w: 4, col: trim, seed: seed + 70, taper: [.02, .6], minw: .3 });
  ctx.restore();
}
