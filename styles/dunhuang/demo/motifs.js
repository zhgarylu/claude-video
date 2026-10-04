// motifs.js: the mural's pattern vocabulary, every one generated. Scattered flowers, lotus roundels, lattices, vine scrolls,
// pennant fringes, the thousand-figure border, drifting cloud streams, the lotus coffer, the inscription plaque.
import { clamp, lerp, mulberry, vnoise, TAU } from '/core/lib.js';
import { PAL, mix, halo, wire, polyPath, catmull, limb, tubePoly } from './brush.js';

export function groundFill(ctx, x, y, w, h, col, seed = 1) {
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const r = mulberry(seed);
  for (let i = 0; i < Math.round(w * h / 22000); i++) {      // brush-laid mottling, a few percent of value
    const cx = x + r() * w, cy = y + r() * h, rx = 60 + r() * 160, ry = 20 + r() * 60, a = r() * 3;
    ctx.fillStyle = r() < .5 ? 'rgba(255,230,190,.045)' : 'rgba(40,10,0,.06)';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, a, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export function petalPts(cx, cy, ang, len, wid, tip = .9) {
  const pw = tip < 0 ? .55 : .75; tip = Math.abs(tip);
  const ca = Math.cos(ang), sa = Math.sin(ang), pts = [];
  for (let k = 0; k <= 10; k++) { const u = k / 10, w = wid * Math.sin(Math.PI * Math.pow(u, pw)) * (1 - .15 * u); pts.push([cx + ca * len * u - sa * w, cy + sa * len * u + ca * w]); }
  for (let k = 9; k >= 1; k--) { const u = k / 10, w = wid * Math.sin(Math.PI * Math.pow(u, pw)) * (1 - .15 * u); pts.push([cx + ca * len * u + sa * w, cy + sa * len * u - ca * w]); }
  return pts;
}
export function flower(ctx, x, y, r, col, o = {}) {
  const n = o.n || 5, rot = o.rot || 0, edge = mix(col, PAL.earthD, .55);
  for (let i = 0; i < n; i++) {
    const p = petalPts(x, y, rot + i * TAU / n, r, r * .42);
    halo(ctx, p, col, edge, Math.max(1.5, r * .22), 3, .3);
  }
  ctx.fillStyle = o.heart || PAL.cinnabar; ctx.beginPath(); ctx.arc(x, y, r * .2, 0, TAU); ctx.fill();
}
// star-scattered ground: small flowers, four-petal stars, dots; keeps clear of `avoid(x,y)->bool`
export function scatter(ctx, rect, n, seed, avoid, cols) {
  const r = mulberry(seed), [x0, y0, w, h] = rect, placed = [];
  cols = cols || [PAL.lead, PAL.lead, PAL.azuriteL, PAL.ochreL, PAL.malachiteL];
  for (let i = 0; i < n * 6 && placed.length < n; i++) {
    const x = x0 + r() * w, y = y0 + r() * h, s = 7 + r() * 11;
    if (avoid && avoid(x, y)) continue;
    if (placed.some(p => Math.hypot(p[0] - x, p[1] - y) < 54 + (p[2] + s))) continue;
    placed.push([x, y, s]);
    const c = cols[(r() * cols.length) | 0], kind = r();
    if (kind < .55) flower(ctx, x, y, s, c, { n: 4 + ((r() * 3) | 0), rot: r() * 6, heart: r() < .5 ? PAL.cinnabar : PAL.ochre });
    else if (kind < .8) { // four-point star
      ctx.fillStyle = c; ctx.beginPath();
      for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + .4, rr = k % 2 ? s * .22 : s * .8; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    } else { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, s * .28, 0, TAU); ctx.fill(); }
  }
}

export function lotus(ctx, cx, cy, R, o = {}) {
  const rings = o.rings || [{ n: 12, len: 1, w: .26, col: PAL.cinnabar }, { n: 12, len: .74, w: .24, col: PAL.lead, rot: .26 }, { n: 8, len: .46, w: .22, col: PAL.ochreL }];
  for (const rg of rings) {
    for (let i = 0; i < rg.n; i++) {
      const a = (rg.rot || 0) + i * TAU / rg.n, p = petalPts(cx, cy, a, R * rg.len, R * rg.w * (o.fat || 1.15), .9);
      halo(ctx, p, rg.col, mix(rg.col, PAL.earthD, .55), R * .06, 3, .3);
      const q = [[cx + Math.cos(a) * R * rg.len * .18, cy + Math.sin(a) * R * rg.len * .18], [cx + Math.cos(a) * R * rg.len * .8, cy + Math.sin(a) * R * rg.len * .8]];
      wire(ctx, q, Math.max(1.4, R * .014), mix(rg.col, PAL.soot, .6), { raw: true });
      wire(ctx, p.slice(0, 11), Math.max(1.6, R * .016), PAL.soot, { seed: i, raw: true });
      wire(ctx, [...p.slice(10)].concat([p[0]]), Math.max(1.6, R * .016), PAL.soot, { seed: i + 4, raw: true });
    }
  }
  ctx.fillStyle = PAL.ochre; ctx.beginPath(); ctx.arc(cx, cy, R * .13, 0, TAU); ctx.fill();
  ctx.fillStyle = PAL.cinnabarD; for (let i = 0; i < 9; i++) { const a = i * TAU / 9; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * .07, cy + Math.sin(a) * R * .07, R * .017, 0, TAU); ctx.fill(); }
  ctx.fillStyle = PAL.cinnabarD; ctx.beginPath(); ctx.arc(cx, cy, R * .02, 0, TAU); ctx.fill();
}

export function diaper(ctx, x, y, w, h, cell, a, b, line = PAL.soot) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let j = -1; j * cell / 2 < h + cell; j++) for (let i = -1; i * cell < w + cell; i++) {
    const cx = x + i * cell + (j & 1 ? cell / 2 : 0), cy = y + j * cell / 2, c = ((i + (j >> 1)) & 1) ? a : b;
    const p = [[cx, cy - cell / 2], [cx + cell / 2, cy], [cx, cy + cell / 2], [cx - cell / 2, cy]];
    halo(ctx, p, a, mix(a, PAL.earthD, .5), cell * .1, 3, .28); ctx.lineWidth = 1.8; ctx.strokeStyle = line; ctx.beginPath(); polyPath(ctx, p); ctx.stroke();
    const q = p.map(v => [cx + (v[0] - cx) * .5, cy + (v[1] - cy) * .5]); halo(ctx, q, b, mix(b, PAL.earthD, .5), cell * .06, 3, .3); ctx.lineWidth = 1.4; ctx.beginPath(); polyPath(ctx, q); ctx.stroke();
  }
  ctx.restore();
}

// vine scroll band: a wave of iron-wire stem with leaf lobes and small flowers
export function vine(ctx, x0, x1, y, amp, wl, seed, cols = {}) {
  const r = mulberry(seed), stem = [], step = wl / 8;
  for (let x = x0; x <= x1 + step; x += step) stem.push([x, y + Math.sin((x - x0) / wl * TAU) * amp]);
  const sp = catmull(stem, 6);
  wire(ctx, sp, 5, cols.stem || PAL.malachiteD, { raw: true, t0: 0, t1: 0 });
  for (let k = 0; k < (x1 - x0) / (wl / 2); k++) {
    const x = x0 + (k + .5) * wl / 2, up = k % 2 ? -1 : 1, yy = y + Math.sin((x - x0) / wl * TAU) * amp;
    const base = [x, yy], ang = up * Math.PI / 2 + (k % 2 ? .35 : -.35);
    const leaf = petalPts(base[0], base[1], ang, amp * 1.25, amp * .5, .9);
    halo(ctx, leaf, cols.leaf || PAL.malachite, PAL.malachiteD, amp * .18, 3, .3);
    wire(ctx, leaf, 2.2, PAL.soot, { raw: true, seed: k });
    const leaf2 = petalPts(base[0], base[1], ang + up * .9, amp * .8, amp * .32, .9);
    halo(ctx, leaf2, cols.leaf2 || PAL.malachiteL, PAL.malachiteD, amp * .12, 3, .3); wire(ctx, leaf2, 2, PAL.soot, { raw: true, seed: k + 3 });
    if (k % 2 === 0) flower(ctx, x + wl * .25, y + Math.sin((x + wl * .25 - x0) / wl * TAU) * amp, amp * .42, cols.flower || PAL.lead, { n: 5, rot: r() * 3, heart: PAL.cinnabar });
  }
}

export function pennants(ctx, x, y, w, hgt, n, cols, down = true) {
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length], x0 = x + i * cw;
    const p = down ? [[x0, y], [x0 + cw, y], [x0 + cw / 2, y + hgt]] : [[x0, y + hgt], [x0 + cw, y + hgt], [x0 + cw / 2, y]];
    halo(ctx, p, c, mix(c, PAL.earthD, .55), cw * .12, 3, .3);
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.soot; ctx.beginPath(); polyPath(ctx, p); ctx.stroke();
    const my = down ? y + hgt * .38 : y + hgt * .62; ctx.fillStyle = mix(c, '#fff', .55); ctx.beginPath(); ctx.arc(x0 + cw / 2, my, cw * .08, 0, TAU); ctx.fill();
  }
}

// repeating little seated figures in niches: a checker of robe colours, faceless dots for heads, a plain halo
export function thousand(ctx, x, y, w, h, cell, seed, cols) {
  cols = cols || [PAL.cinnabar, PAL.azurite, PAL.malachite, PAL.ochre];
  const r = mulberry(seed), nx = Math.floor(w / cell), ny = Math.max(1, Math.round(h / cell));
  const cw = w / nx, ch = h / ny;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  groundFill(ctx, x, y, w, h, PAL.earthD, seed);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const cx = x + (i + .5) * cw, cy = y + (j + .5) * ch, c = cols[(i + j * 2) % cols.length], u = Math.min(cw, ch);
    // niche
    const nic = [[cx - cw * .46, cy + ch * .46], [cx - cw * .46, cy - ch * .1], [cx, cy - ch * .48], [cx + cw * .46, cy - ch * .1], [cx + cw * .46, cy + ch * .46]];
    halo(ctx, nic, mix(PAL.lead, PAL.leadD, .4), PAL.ochreD, u * .08, 3, .3);
    // halo disc, body, head, lotus seat
    ctx.fillStyle = PAL.ochreL; ctx.beginPath(); ctx.arc(cx, cy - ch * .1, u * .27, 0, TAU); ctx.fill();
    const body = [[cx - u * .3, cy + u * .34], [cx - u * .17, cy + u * .02], [cx - u * .09, cy - u * .06], [cx + u * .09, cy - u * .06], [cx + u * .17, cy + u * .02], [cx + u * .3, cy + u * .34]];
    halo(ctx, body, c, mix(c, PAL.earthD, .6), u * .06, 3, .3);
    ctx.fillStyle = PAL.flesh; ctx.beginPath(); ctx.arc(cx, cy - u * .17, u * .09, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.soot; ctx.beginPath(); ctx.arc(cx, cy - u * .24, u * .055, 0, TAU); ctx.fill();
    ctx.fillStyle = r() < .5 ? PAL.lead : PAL.cinnabarL; ctx.beginPath(); ctx.ellipse(cx, cy + u * .35, u * .34, u * .08, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.3; ctx.strokeStyle = PAL.soot; ctx.beginPath(); polyPath(ctx, nic); ctx.stroke();
  }
  ctx.restore();
}

// a stream of wind-clouds: each a swirl head with a tapering tail streaming downwind, pale with a dark wire edge
export function cloudStream(ctx, x, y, len, dir, seed, t = 0, col = PAL.lead) {
  const r = mulberry(seed), n = Math.floor(len / 260);
  for (let i = 0; i < n; i++) {
    const cx = x + dir * (i * 260 + (t * 22) % 260) + r() * 30, cy = y + Math.sin(i * 1.7 + seed) * 30, R = 22 + r() * 16;
    const spine = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8; spine.push([cx - dir * (R * 7 * (1 - u)), cy + R * .9 + Math.sin(u * 5 + i) * R * .5 * (1 - u) * (1 - u) * 1.5 - (u * u) * R * .9]); }
    for (let k = 1; k <= 14; k++) { const a = Math.PI / 2 - k * .42, rr = R * (1 - k / 17); spine.push([cx + dir * Math.cos(a + Math.PI) * -rr * 0 + dir * Math.sin(k * .42) * rr * 1.0, cy + Math.cos(k * .42) * rr * 1.0 * -1 + R * .0]); }
    const w = spine.map((_, k) => k < 8 ? 3 + R * .9 * (k / 8) : R * .9 * (1 - (k - 8) / 8) + 3);
    const tube = tubePoly(spine, w);
    halo(ctx, tube.poly, col, mix(col, PAL.ochreD, .5), R * .26, 3, .3);
    wire(ctx, tube.L, 2.2, PAL.soot, { raw: true }); wire(ctx, tube.R, 2.2, PAL.soot, { raw: true });
  }
}

// the lotus coffer (zaojing): nested square bands around a lotus roundel, pennants hanging at the rim
export function coffer(ctx, cx, cy, S, seed = 3) {
  const h = S / 2;
  const sq = (k, c) => { const a = h * k; halo(ctx, [[cx - a, cy - a], [cx + a, cy - a], [cx + a, cy + a], [cx - a, cy + a]], c, mix(c, PAL.earthD, .55), S * .012, 3, .25); ctx.lineWidth = 3; ctx.strokeStyle = PAL.soot; ctx.beginPath(); polyPath(ctx, [[cx - a, cy - a], [cx + a, cy - a], [cx + a, cy + a], [cx - a, cy + a]]); ctx.stroke(); };
  sq(1, PAL.earth);
  // outer lattice band
  ctx.save(); ctx.beginPath(); ctx.rect(cx - h, cy - h, S, S); ctx.rect(cx - h * .82, cy - h * .82, S * .82, S * .82); ctx.clip('evenodd');
  diaper(ctx, cx - h, cy - h, S, S, S * .06, PAL.azurite, PAL.lead);
  ctx.restore();
  sq(.82, PAL.malachiteD);
  // vine band on each side (clipped to the ring)
  ctx.save(); ctx.beginPath(); ctx.rect(cx - h * .82, cy - h * .82, S * .82, S * .82); ctx.rect(cx - h * .6, cy - h * .6, S * .6, S * .6); ctx.clip('evenodd');
  for (let k = 0; k < 4; k++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(k * Math.PI / 2); ctx.translate(-h, -h);
    vine(ctx, S * .1, S * .9, S * .11, S * .03, S * .15, seed + k, { stem: PAL.soot });
    ctx.restore();
  }
  ctx.restore();
  sq(.6, PAL.cinnabarD);
  // pennants hang inward from the inner rim
  for (let k = 0; k < 4; k++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(k * Math.PI / 2); ctx.translate(-h * .6, -h * .6);
    pennants(ctx, 0, 0, S * .6, S * .06, 12, [PAL.cinnabar, PAL.lead, PAL.azurite, PAL.ochre]);
    ctx.restore();
  }
  sq(.42, PAL.azuriteD);
  // roundel
  ctx.fillStyle = PAL.azurite; ctx.beginPath(); ctx.arc(cx, cy, h * .4, 0, TAU); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = PAL.soot; ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.ochreL; ctx.beginPath(); ctx.arc(cx, cy, h * .37, 0, TAU); ctx.stroke();
  lotus(ctx, cx, cy, h * .34);
  // four corner scrolls
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, px = cx + Math.cos(a) * h * .56, py = cy + Math.sin(a) * h * .56;
    for (let q = 0; q < 3; q++) { const p = petalPts(px, py, a + (q - 1) * .65, h * .13, h * .045); halo(ctx, p, q === 1 ? PAL.lead : PAL.ochreL, PAL.ochreD, 3, 3, .3); wire(ctx, p, 1.8, PAL.soot, { raw: true }); }
  }
}

export function plaque(ctx, x, y, w, h, o = {}) {
  const box = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  halo(ctx, box, mix(PAL.lead, PAL.leadD, .35), PAL.ochreD, 14, 4, .2);
  ctx.lineWidth = 7; ctx.strokeStyle = PAL.cinnabarD; ctx.beginPath(); polyPath(ctx, [[x + 7, y + 7], [x + w - 7, y + 7], [x + w - 7, y + h - 7], [x + 7, y + h - 7]]); ctx.stroke();
  ctx.lineWidth = 2.2; ctx.strokeStyle = PAL.soot; ctx.beginPath(); polyPath(ctx, box); ctx.stroke();
  ctx.fillStyle = PAL.soot; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = o.lines || []; lines.forEach((l, i) => { ctx.font = l.font; ctx.fillStyle = l.col || PAL.soot; ctx.fillText(l.text, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * (l.dy || 56)); });
}

// abstract pattern band: a row of arched niches, each holding a rosette on a disc; robe colours become a checker of pigments
export function cellBand(ctx, x, y, w, h, cell, seed, cols) {
  cols = cols || [PAL.cinnabar, PAL.azurite, PAL.malachite, PAL.ochre];
  const nx = Math.floor(w / cell), ny = Math.max(1, Math.round(h / cell)), cw = w / nx, ch = h / ny;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  groundFill(ctx, x, y, w, h, PAL.earthD, seed);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const cx = x + (i + .5) * cw, cy = y + (j + .5) * ch, c = cols[(i + j * 2) % cols.length], u = Math.min(cw, ch);
    const nic = [[cx - cw * .46, cy + ch * .46], [cx - cw * .46, cy - ch * .1], [cx, cy - ch * .48], [cx + cw * .46, cy - ch * .1], [cx + cw * .46, cy + ch * .46]];
    halo(ctx, nic, mix(PAL.lead, PAL.leadD, .4), PAL.ochreD, u * .08, 3, .3);
    ctx.fillStyle = PAL.ochreL; ctx.beginPath(); ctx.arc(cx, cy - ch * .02, u * .3, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = PAL.soot; ctx.stroke();
    for (let k = 0; k < 6; k++) { const p = petalPts(cx, cy - ch * .02, k * TAU / 6 + (i & 1) * .26, u * .27, u * .1, .9); halo(ctx, p, k % 2 ? PAL.lead : c, mix(c, PAL.earthD, .55), u * .03, 3, .3); }
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy - ch * .02, u * .07, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.lead; ctx.beginPath(); ctx.ellipse(cx, cy + ch * .38, u * .3, u * .06, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.3; ctx.strokeStyle = PAL.soot; ctx.beginPath(); polyPath(ctx, nic); ctx.stroke();
  }
  ctx.restore();
}
