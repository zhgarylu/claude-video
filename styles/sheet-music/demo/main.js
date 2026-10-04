// "Four Notes": the picture as a function of time. The event list (score.js) lights the notation, blooms the shapes,
// bends the staves and draws the ribbons; the synth reads the same list. render(t) is deterministic.
import { clamp, lerp, seg, ss, eio, eo, mulberry, hash, TAU } from '/core/lib.js';
import { EV, CHORDS, RESTS, VOICES, DYN, HAIRPIN, SECTIONS, T0, BEAT, BAR, NBARS, END, DUR as SDUR, tOf, sounding } from './score.js';
import * as E from './engrave.js';
const { INK, G, mix, rgb, items, groups, slurs, evById, PAGE, SP_P, SP_L, SYS_L, SYS_R, HDR, PADL, YL, xl, PPS, XL0 } = E;

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1920, H = 1080, Q = new URLSearchParams(location.search);
window.DUR = 50;
let TX = [];
const reg = (id, text, x, y, size, align = 'left', alpha = 1) => {   // report a visible text box in screen pixels (for readcheck)
  if (alpha < .6) return; const mt = ctx.getTransform(), w = ctx.measureText(text).width * mt.a, h = size * 1.1 * mt.a;
  const x0 = (align === 'center' ? x - ctx.measureText(text).width / 2 : align === 'right' ? x - ctx.measureText(text).width : x) * mt.a + mt.e, y0 = (y - size * .85) * mt.d + mt.f;
  TX.push({ id, text, x0, y0, x1: x0 + w, y1: y0 + h });
};
const PAPER = '#efe3c6', DESK = '#4e4030', UMBER = '#5b4733';
const VC = VOICES.map(v => v.color);

// ---- paper and desk (procedural tiles) -----------------------------------------------------------
function tile(seed, base, amp, fibres) {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const R = mulberry(seed), img = g.createImageData(S, S), d = img.data, B = rgb(base);
  const oct = [[8, .42], [32, .30], [128, .2], [512, .08]].map(([n, w]) => ({ n, w, a: Float32Array.from({ length: n * n }, () => R()) }));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0;
    for (const o of oct) {
      const fx = x / S * o.n, fy = y / S * o.n, ix = Math.floor(fx), iy = Math.floor(fy), ux = ss(fx - ix), uy = ss(fy - iy);
      const a = o.a, n = o.n, i0 = iy % n * n, i1 = (iy + 1) % n * n, x0 = ix % n, x1 = (ix + 1) % n;
      v += o.w * lerp(lerp(a[i0 + x0], a[i0 + x1], ux), lerp(a[i1 + x0], a[i1 + x1], ux), uy);
    }
    const k = 1 + amp * (v - .5), p = (y * S + x) * 4;
    d[p] = B[0] * k; d[p + 1] = B[1] * k; d[p + 2] = B[2] * k; d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < fibres; i++) {
    const x = R() * S, y = R() * S, a = R() * TAU, l = 6 + R() * 22, dark = R() < .55;
    g.strokeStyle = dark ? `rgba(110,80,40,${.02 + R() * .035})` : `rgba(255,252,238,${.04 + R() * .06})`; g.lineWidth = .4 + R() * .6;
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + Math.cos(a + .6) * l * .5 + ox, y + Math.sin(a + .6) * l * .5 + oy, x + Math.cos(a) * l + ox, y + Math.sin(a) * l + oy); g.stroke();
    }
  }
  if (amp > .1 && base === PAPER) for (let i = 0; i < 46; i++) {   // foxing
    const x = 60 + R() * (S - 120), y = 60 + R() * (S - 120), r = 3 + R() * 14, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(150,105,50,${.05 + R() * .08})`); gr.addColorStop(1, 'rgba(150,105,50,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}
let PAT_PAPER, PAT_DESK;

// ---- state of the frame ---------------------------------------------------------------------------
const RV = [[.5, 1.8], [1.0, 2.5]];                    // intro: the two systems are engraved left to right
const M0 = 21.4, M1 = 24.8;                            // page -> landscape
const morph = t => ss(seg(t, M0, M1));
const beatPulse = t => { if (t < T0) return 0; const b = (t - T0) / BEAT, ph = b - Math.floor(b); return Math.exp(-ph * 4.2) * (Math.floor(b) % 4 === 0 ? 1 : .55); };
const litEnv = (age, dur, res = .55) => age < 0 ? 0 : Math.min(1, age / .05) * (age < dur ? 1 : res + (1 - res) * Math.exp(-(age - dur) / .45));
const revealFront = (t, s) => lerp(SYS_L - 60, SYS_R + 230, eio(seg(t, RV[s][0], RV[s][1])));
const revA = (t, s, x) => clamp((revealFront(t, s) - x) / 90);

const OV0 = 40.0, OV1 = 44.8;
const ovAt = t => ss(seg(t, OV0, OV1));            // the final pull-back: the staves drift apart and the score becomes a landscape
const SPREAD = 2.2, ZOV = .5;   // panorama: the last 8 bars, staves drifting apart to fill the height
function camera(t, e) {
  const ph = xl(clamp(t, T0, END)), follow = ph + 360, ov = ovAt(t);
  return { cx: lerp(960, lerp(follow, (xl(tOf(9, 0)) + xl(END)) / 2, ov), e), z: lerp(1, lerp(1, ZOV, ov), e), cy: 540 };
}

// ripples: every sounding note disturbs the staves around it (landscape only)
function waveFn(t, e) {
  const src = [];
  for (const ev of EV) if (ev.t <= t && t - ev.t < 3.4) src.push({ x: xl(ev.t), age: t - ev.t, A: ev.vel * [15, 8, 19][ev.voice] });
  return (v, X) => {
    let s = 3.2 * Math.sin(X / 240 + t * .9 + v * 2.1) + 1.6 * Math.sin(X / 97 - t * 1.7 + v);
    for (const q of src) { const d = Math.sqrt((X - q.x) ** 2 + 1600); s += q.A * Math.exp(-q.age / .95) * Math.exp(-d / 330) * Math.cos(d / 52 - q.age * 8.5); }
    return s * e;
  };
}

// ---- the frame --------------------------------------------------------------------------------------
function render(t) {
  TX = [];
  const e = morph(t), ex = ss(seg(e, 0, .55)), ey = ss(seg(e, .3, .95));   // x moves first (the systems unroll), then the rows merge (y)
  const cam = camera(t, ex), sp = lerp(SP_P, SP_L, ey), pulse = beatPulse(t), ov = ovAt(t) * ey;
  const YLt = YL.map(y => 540 + (y - 540) * (1 + (SPREAD - 1) * ov));
  const rowY = (s, v) => lerp(E.ycPage(Math.min(s, 1), v), YLt[v], ey);
  const wave = waveFn(t, ey * (1 + 2.4 * ov));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // desk
  ctx.fillStyle = PAT_DESK; ctx.fillRect(0, 0, W, H);
  const z = cam.z, tx = 960 - cam.cx * z, ty = 540 - cam.cy * z;
  // page rect (grows to fill the screen as the page becomes a landscape)
  const kk = ss(seg(e, .0, .22)), vx = 960 / z + 260, vy = 540 / z + 260;
  const pr = { x0: lerp(PAGE.x0, cam.cx - vx, kk), y0: lerp(PAGE.y0, cam.cy - vy, kk), x1: lerp(PAGE.x1, cam.cx + vx, kk), y1: lerp(PAGE.y1, cam.cy + vy, kk) };
  ctx.setTransform(z, 0, 0, z, tx, ty);
  if (kk < .98) { ctx.save(); ctx.shadowColor = 'rgba(10,5,0,.55)'; ctx.shadowBlur = 46 * z; ctx.shadowOffsetY = 14 * z; ctx.fillStyle = PAPER; ctx.fillRect(pr.x0, pr.y0, pr.x1 - pr.x0, pr.y1 - pr.y0); ctx.restore(); }
  ctx.fillStyle = PAT_PAPER; ctx.fillRect(pr.x0, pr.y0, pr.x1 - pr.x0, pr.y1 - pr.y0);
  if (kk < .98) {   // page edge: a darker hairline and a soft inner shade
    const g1 = ctx.createLinearGradient(0, pr.y0, 0, pr.y0 + 50); g1.addColorStop(0, 'rgba(90,60,25,.20)'); g1.addColorStop(1, 'rgba(90,60,25,0)');
    ctx.fillStyle = g1; ctx.fillRect(pr.x0, pr.y0, pr.x1 - pr.x0, 50);
    const g2 = ctx.createLinearGradient(pr.x0, 0, pr.x0 + 60, 0); g2.addColorStop(0, 'rgba(90,60,25,.16)'); g2.addColorStop(1, 'rgba(90,60,25,0)'); ctx.fillStyle = g2; ctx.fillRect(pr.x0, pr.y0, 60, pr.y1 - pr.y0);
    ctx.strokeStyle = 'rgba(80,55,25,.35)'; ctx.lineWidth = 1.2; ctx.strokeRect(pr.x0, pr.y0, pr.x1 - pr.x0, pr.y1 - pr.y0);
  }
  ctx.globalCompositeOperation = 'multiply';

  // positions of every chord this frame
  const vis0 = cam.cx - 960 / z - 120, vis1 = cam.cx + 960 / z + 120;
  const pl = items.map(it => {
    const pg = E.hasPage(it.bar), s = Math.floor((it.bar - 1) / 4);
    const xp = pg ? E.pageX(it.bar, it.beat) : null, xlnd = E.landX(it.bar, it.beat);
    const x = pg ? lerp(xp, xlnd, ex) : xlnd, yc = rowY(s, it.v);
    const a = pg ? revA(t, s, xp) : ss(e) * ss(e);
    return { x, yc, dy: wave(it.v, x), a, xp, s };
  });
  const NP = {}; window.__NP = NP;   // note id -> {x, y}
  items.forEach((it, i) => it.ids.forEach((id, k) => { NP[id] = { x: pl[i].x, y: pl[i].yc - (it.pos[k] - 4) * sp / 2 + pl[i].dy, v: it.v }; }));

  // ---- blooms: noteheads grow into shapes (under the ink) -------------------------------------------
  const bs = lerp(.7, 2.5, ey) * (1 + .9 * ov);
  for (const ev of EV) {
    const age = t - ev.t; if (age < 0) continue;
    const P = NP[ev.id], it = items.find(c => c.ids.includes(ev.id)); if (!P) continue;
    const a = litEnv(age, ev.dur, lerp(.2, .34, ey));
    if (P.x < vis0 - 300 || P.x > vis1 + 300) continue;
    const c = VC[ev.voice], vis = pl[it.i].a; if (vis < .02) continue;
    const grow = Math.min(1, age / .3), g = eo(grow) * (1 + .18 * Math.exp(-age * 7) * Math.sin(age * 14));
    const dur = ev.dur;
    if (ev.voice === 0) {            // lead: an orb, a wash with a darker rim
      const R = (11 + 44 * ev.vel) * (.65 + .35 * Math.min(1, dur / 1.2)) * bs * g * (1 + .5 * ss(age / 6));
      const gr = ctx.createRadialGradient(P.x, P.y, R * .05, P.x, P.y, R); gr.addColorStop(0, rgba(c, .7 * a * vis)); gr.addColorStop(.7, rgba(c, .46 * a * vis)); gr.addColorStop(1, rgba(c, .0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, .45 * a * vis); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(P.x, P.y, R * .78, 0, TAU); ctx.stroke();
    } else if (ev.voice === 1) {     // mallets: a small blossom
      const R = (9 + 18 * ev.vel) * bs * g, rot = hash(ev.t * 7.7) * TAU;
      ctx.fillStyle = rgba(c, .42 * a * vis); ctx.strokeStyle = rgba(c, .55 * a * vis); ctx.lineWidth = .9;
      for (let k = 0; k < 5; k++) { const an = rot + k * TAU / 5; ctx.beginPath(); ctx.ellipse(P.x + Math.cos(an) * R * .55, P.y + Math.sin(an) * R * .55, R * .6, R * .28, an, 0, TAU); ctx.fill(); ctx.stroke(); }
    } else {                         // bass: a hill that lasts as long as the note
      const wpx = ev.dur * lerp((E.barW(1)) / BAR, PPS, ex), h = (16 + 70 * ev.vel) * bs * g, y0 = P.yc0 ?? (pl[it.i].yc + 2 * sp + 26 * ey), x0 = P.x - sp * .6;
      const gr = ctx.createLinearGradient(0, y0 - h, 0, y0); gr.addColorStop(0, rgba(c, .5 * a * vis)); gr.addColorStop(1, rgba(c, .1 * a * vis));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 + wpx * .22, y0 - h * 1.25, x0 + wpx * .78, y0 - h * 1.25, x0 + wpx, y0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(c, .5 * a * vis); ctx.lineWidth = 1.1; ctx.stroke();
    }
    if (age < .5) { const k = age / .5, R = sp * (.7 + 3.2 * eo(k)); ctx.strokeStyle = rgba(c, .55 * (1 - k) * vis); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.stroke(); }
  }

  // ---- staves ---------------------------------------------------------------------------------------
  const lw = .13 * sp + .06 * sp * pulse * ey;
  for (let g = 0; g < 4; g++) {
    const pg = g < 2, s = g;
    const lL = E.landBarline(4 * g + 1) - (g === 0 ? HDR[0] * (sp / SP_P) * .0 + HDR[0] : 0), lR = E.landBarline(4 * g + 5);
    const xa = pg ? lerp(SYS_L, lL, ex) : g === 2 ? lerp(SYS_R, lL, ex) : lL, xb = pg ? lerp(SYS_R, lR, ex) : lR;
    const front = pg && t < RV[s][1] ? revealFront(t, s) : 1e9, a = pg ? 1 : ss(e);
    if (a < .01) continue;
    const xe = Math.min(xb, front), xs = Math.max(xa, vis0), xx = Math.min(xe, vis1);
    if (xx <= xs) continue;
    for (let v = 0; v < 3; v++) {
      const yc = rowY(s, v);
      for (let i = -2; i <= 2; i++) {
        ctx.globalAlpha = .9 * a; ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.beginPath();
        const step = ey < .01 ? 400 : clamp(14 / z, 8, 40);
        for (let x = xs; ; x = Math.min(x + step, xx)) { const y = yc + i * sp + wave(v, x); x === xs ? ctx.moveTo(x, y) : ctx.lineTo(x, y); if (x >= xx) break; }
        ctx.stroke();
      }
    }
  }
  // bar lines (one tall line through the voices, bending with the staves) and the system start lines with their bracket
  const Yc = [0, 0, 0];
  const barline = (X, a, th = 1) => {
    if (a < .01 || X < vis0 - 20 || X > vis1 + 20) return;
    for (let v = 0; v < 3; v++) { const w = wave(v, X); E.line(ctx, X, Yc[v] - 2 * sp + w, X, Yc[v] + 2 * sp + w, .16 * sp * th, INK, .9 * a); }
    for (let v = 0; v < 2; v++) E.line(ctx, X, Yc[v] + 2 * sp + wave(v, X), X, Yc[v + 1] - 2 * sp + wave(v + 1, X), .13 * sp, INK, .55 * a);
  };
  for (let b = 2; b <= NBARS + 1; b++) {
    const s0 = Math.floor((b - 2) / 4), pg = b <= 9;
    const xpR = b <= 8 ? E.pageBarline(b) : (b === 9 ? SYS_R : null), xlR = E.landBarline(b);
    const x = xpR != null ? lerp(xpR, xlR, ex) : xlR;
    for (let v = 0; v < 3; v++) Yc[v] = rowY(s0, v);
    barline(x, pg ? revA(t, s0, xpR) : ss(e) ** 2, b === NBARS + 1 ? 1.9 : 1);
  }
  for (let g = 0; g < 2; g++) {
    const lL = E.landBarline(4 * g + 1) - (g === 0 ? HDR[0] : 0), x = lerp(SYS_L, lL, ex);
    for (let v = 0; v < 3; v++) Yc[v] = lerp(E.ycPage(g, v), YLt[v], ey);
    const a = g === 0 ? revA(t, 0, x + 40) : (1 - ex) * (1 - ex) * revA(t, 1, x + 40);
    barline(x, a, 1.4);
    if (a > .01) {
      const yt = Yc[0] - 2 * sp, yb = Yc[2] + 2 * sp, bx = x - 10 * sp / SP_P;
      ctx.globalAlpha = a * .95; ctx.fillStyle = INK; ctx.fillRect(bx - 3, yt, 5, yb - yt);
      for (const [yy, d] of [[yt, 1], [yb, -1]]) { ctx.beginPath(); ctx.moveTo(bx - 3, yy); ctx.quadraticCurveTo(bx + 4, yy - d * 6, bx + 15, yy - d * 6); ctx.quadraticCurveTo(bx + 6, yy - d * 1, bx + 2, yy + d * 12); ctx.lineTo(bx - 3, yy + d * 12); ctx.closePath(); ctx.fill(); }
    }
  }

  // ---- headers: clefs, key signature, time signature, names ------------------------------------------
  for (let g = 0; g < 2; g++) {
    const lL = E.landBarline(4 * g + 1) - (g === 0 ? HDR[0] : 0), xa = lerp(SYS_L, lL, ex);
    const a = g === 0 ? 1 : (1 - ex) ** 3, ar = g === 0 ? revA(t, 0, xa + 120) : revA(t, 1, xa + 100);
    if (a * ar < .01 || xa < vis0 - 300 || xa > vis1) continue;
    for (let v = 0; v < 3; v++) {
      const yc = lerp(E.ycPage(g, v), YLt[v], ey), w = wave(v, xa + 30), isG = VOICES[v].clef === 'g';
      E.glyph(ctx, isG ? G.gClef : G.fClef, xa + 14, yc + w + (isG ? sp : -sp), sp, INK, a * ar);
      E.glyph(ctx, G.sharp, xa + 14 + 3.4 * sp, yc + w + (isG ? -2 * sp : -sp), sp, INK, a * ar);
      if (g === 0) { E.glyph(ctx, E.digit(4), xa + 14 + 5.0 * sp, yc + w - sp, sp, INK, a * ar); E.glyph(ctx, E.digit(4), xa + 14 + 5.0 * sp, yc + w + sp, sp, INK, a * ar); }
    }
    if (g === 0) for (let v = 0; v < 3; v++) {
      const yc = lerp(E.ycPage(0, v), YLt[v], ey);
      ctx.globalAlpha = ar; ctx.fillStyle = VC[v]; ctx.font = `italic 500 ${sp * 1.55}px "EB Garamond"`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(VOICES[v].name, xa - 30, yc + wave(v, xa)); ctx.textAlign = 'left';
    }
  }

  // ---- rests -----------------------------------------------------------------------------------------
  for (const r of RESTS) {
    const pg = r.bar <= 8, s = Math.floor((r.bar - 1) / 4);
    const xpC = pg ? (r.dur >= 4 ? E.barX0(r.bar) + E.barW(s) / 2 - 10 : E.pageX(r.bar, r.beat + r.dur / 2) - 8) : null;
    const xlC = r.dur >= 4 ? (E.landBarline(r.bar) + E.landBarline(r.bar + 1)) / 2 - 10 : xl(tOf(r.bar, r.beat + r.dur / 2)) - 8;
    const x = pg ? lerp(xpC, xlC, ex) : xlC, yc = rowY(s, r.v);
    const a = pg ? revA(t, s, xpC) : ss(e) ** 2;
    if (a < .02 || x < vis0 - 40 || x > vis1 + 40) continue;
    const y = yc + wave(r.v, x) + (r.dur >= 4 ? -sp : r.dur >= 2 ? 0 : 0);
    E.glyph(ctx, E.restGlyph(r.dur), x, y + (r.dur >= 4 ? 0 : 0), sp, INK, a * .95);
  }

  // ---- notation: beams first, then chords ----------------------------------------------------------
  const colOf = (it, k = 0) => { const ev = evById[it.ids[k]], age = t - ev.t; return mix(INK, VC[it.v], litEnv(age, ev.dur, .62) * .94); };
  const done = new Set();
  for (const it of items) {
    const P = pl[it.i]; if (P.a < .02 || P.x < vis0 - 60 || P.x > vis1 + 60) continue;
    const ev = evById[it.ids[0]], age = t - ev.t;
    const pop = age >= 0 && age < .4 ? 1 + .38 * Math.exp(-age * 9) : 1;
    const bm = it.grp >= 0 && groups[it.grp].length > 1;
    if (bm && !done.has(it.grp)) { done.add(it.grp); const g = groups[it.grp]; E.drawBeam(ctx, g, g.map(c => pl[c.i]), sp, g.map(c => colOf(c)), Math.min(...g.map(c => pl[c.i].a))); }
    E.drawChord(ctx, it, P, sp, colOf(it), P.a, pop, bm);
  }
  for (const sl of slurs) {
    const pts = sl.map(it => ({ x: pl[it.i].x, y: pl[it.i].yc - (it.pos[0] - 4) * sp / 2 + pl[it.i].dy })), a = Math.min(...sl.map(it => pl[it.i].a));
    if (a < .02 || pts[pts.length - 1].x < vis0 || pts[0].x > vis1) continue;
    E.drawSlur(ctx, pts, sp, INK, a * .8);
  }
  // dynamics and the hairpin
  const lead = (x, e2 = e) => 0;
  for (const [m, b, be] of DYN) {
    const pg = b <= 8, s = Math.floor((b - 1) / 4), xp = pg ? E.pageX(b, be) : null, xlnd = E.landX(b, be);
    const x = (pg ? lerp(xp, xlnd, ex) : xlnd) - .55 * sp, yc = rowY(s, 0), a = pg ? revA(t, s, xp) : ss(e) ** 2;
    if (a < .02 || x < vis0 - 60 || x > vis1) continue;
    E.glyph(ctx, G[m], x, yc + 2 * sp + 2.15 * sp + wave(0, x), sp, INK, a * .9);
  }
  { const [b0, be0] = HAIRPIN.from, [b1, be1] = HAIRPIN.to, xa = E.landX(b0, be0) - .3 * sp, xb = E.landX(b1, be1) - .9 * sp, a = ss(e) ** 2;
    if (a > .02 && xb > vis0 && xa < vis1) { const y = YLt[0] + 2 * sp + 1.6 * sp; ctx.globalAlpha = .85 * a; ctx.strokeStyle = INK; ctx.lineWidth = .13 * sp; ctx.beginPath();
      ctx.moveTo(xb, y + wave(0, xb) - .7 * sp); ctx.lineTo(xa, y + wave(0, xa)); ctx.lineTo(xb, y + wave(0, xb) + .7 * sp); ctx.stroke(); } }

  // ---- ribbons: the melody draws itself through its own noteheads ------------------------------------
  for (const v of [0, 1, 2]) {
    const a0 = ss(e) ** 2; if (a0 < .02) continue;
    const list = EV.filter(ev => ev.voice === v && ev.t <= t + 3);
    let pts = []; const seen = new Set();
    for (const ev of list) { if (seen.has(ev.t)) continue; seen.add(ev.t); const P = NP[ev.id]; pts.push({ x: P.x, y: P.y, t: ev.t, vel: ev.vel }); }
    if (v === 2) { pts = pts.flatMap((p, i) => { const n = pts[i + 1]; return n ? [p, { ...p, x: n.x - 1, t: n.t - .001 }] : [p]; }); }
    // head position: halfway to the next note as time passes
    const past = pts.filter(p => p.t <= t);
    if (past.length < 1) continue;
    const nxt = pts.find(p => p.t > t), last = past[past.length - 1];
    const upto = past.slice(); if (nxt) { const k = ss((t - last.t) / Math.max(.2, nxt.t - last.t)); upto.push({ x: lerp(last.x, nxt.x, k), y: lerp(last.y, nxt.y, k), t, vel: last.vel }); }
    const sm = []; for (let i = 0; i < upto.length - 1; i++) {   // Catmull-Rom through the points
      const p0 = upto[Math.max(0, i - 1)], p1 = upto[i], p2 = upto[i + 1], p3 = upto[Math.min(upto.length - 1, i + 2)];
      for (let k = 0; k < 8; k++) { const u = k / 8, u2 = u * u, u3 = u2 * u; const f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); sm.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y), t: lerp(p1.t, p2.t, u), vel: lerp(p1.vel, p2.vel, u) }); }
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wv = [5.5, 2.2, 7][v], al = [.7, .38, .42][v];
    for (let i = 1; i < sm.length; i++) {
      const p = sm[i], q = sm[i - 1]; if (p.x < vis0 - 50 || p.x > vis1 + 50) continue;
      const age = t - p.t, fade = Math.exp(-Math.max(0, age - 2) / 7), w = (.45 + p.vel * .75) * wv * lerp(.5, 1, ss(1 - age / 4)) * lerp(1, 1.3, ss(seg(age, 0, .3)));
      ctx.strokeStyle = rgba(VC[v], al * a0 * (.45 + .55 * fade)); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    const h = sm[sm.length - 1]; if (h && t - last.t < 2.5) { ctx.fillStyle = rgba(VC[v], .55 * a0); ctx.beginPath(); ctx.arc(h.x, h.y, wv * .9 + 1.5, 0, TAU); ctx.fill(); }
    ctx.lineCap = 'butt';
  }

  // ---- playhead ------------------------------------------------------------------------------------
  { const ph = E.pagePlayhead(t), xlnd = xl(clamp(t, T0 - 1.2, END + 1)), x = lerp(ph.x, xlnd, ex);
    const yt = lerp(E.ycPage(ph.s, 0) - 2 * SP_P - 22, YLt[0] - 2 * SP_L - 90, ey), yb = lerp(E.ycPage(ph.s, 2) + 2 * SP_P + 22, YLt[2] + 2 * SP_L + 90, ey);
    const aLive = t < T0 - .45 ? 0 : ss(seg(t, T0 - .45, T0 - .05)) * (1 - ss(seg(t, END + .5, END + 1.6)));
    const hop = ex < .5 ? ss(Math.abs(t - tOf(5, 0)) / .18) : 1;   // fade across the line break
    if (aLive * hop > .02 && x > vis0 && x < vis1) {
      const w = lerp(34, 60, ey), ym = (yt + yb) / 2, hh = (yb - yt) / 2 + 40;
      for (const [dx, sx, al] of [[-w * .9, w * 1.5, .2 + .1 * pulse], [0, w * .45, .16 + .12 * pulse]]) {
        ctx.save(); ctx.translate(x + dx, ym); ctx.scale(sx, hh); const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0, `rgba(190,100,40,${al})`); gr.addColorStop(.6, `rgba(190,100,40,${al * .5})`); gr.addColorStop(1, 'rgba(190,100,40,0)');
        ctx.globalAlpha = aLive * hop; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
      }
      E.line(ctx, x, yt, x, yb, 2 + 1.2 * pulse, '#8d4423', .85 * aLive * hop);
    }
    // metre dots under each system: the pulse
    if (ex < .98) for (const s of [0, 1]) for (let b = 1 + s * 4; b < 5 + s * 4; b++) for (let k = 0; k < 4; k++) {
      const x0 = E.pageX(b, k), tt = tOf(b, k), cur = t >= tt && t < tt + BEAT, p = cur ? Math.exp(-(t - tt) / BEAT * 4.2) : 0;
      const a = revA(t, s, x0) * (1 - ex); if (a < .02) continue;
      const y = E.sysBottom(s) + 14;
      ctx.globalAlpha = a * (cur || t >= tt ? .85 : .45); ctx.fillStyle = cur ? mix(UMBER, '#8d4423', p) : UMBER; ctx.beginPath(); ctx.arc(x0, y, (k === 0 ? 3.6 : 2.6) + 4.5 * p, 0, TAU); ctx.fill();
    }
  }

  // ---- lesson labels: brackets under the systems that become captions over the landscape -----------------
  SECTIONS.forEach((sec, i) => {
    const [b0, b1] = sec.bars, ts = tOf(b0, 0), a = ss(seg(t, ts - .5, ts + .1));
    if (a < .02) return;
    const pg = b1 <= 8, s = Math.floor((b0 - 1) / 4);
    const xp0 = pg ? E.pageBarline(b0) + 6 : 0, xp1 = pg ? E.pageBarline(b1) + E.barW(s) - 6 : 0, xl0 = E.landBarline(b0) + 6, xl1 = E.landBarline(b1 + 1) - 6;
    const x0 = pg ? lerp(xp0, xl0, ex) : xl0, x1 = pg ? lerp(xp1, xl1, ex) : xl1;
    const yL = YLt[0] - 182, y = pg ? lerp(E.sysBottom(s) + 30, yL, ey) : yL;
    if (x1 < vis0 || x0 > vis1) return;
    ctx.globalAlpha = a * .8; ctx.strokeStyle = UMBER; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y - 8); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 8); ctx.stroke();
    const tx0 = (x0 + x1) / 2, ty0 = y + 30 * lerp(1, 1, 0);
    ctx.globalAlpha = a * .92; ctx.fillStyle = UMBER; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `italic 500 ${lerp(30, 40, ey)}px "EB Garamond"`; { const ty = pg ? lerp(y + 28, y - 20, ey) : y - 20, str = `${i + 1}  ${sec.name}`; ctx.fillText(str, tx0, ty); reg('lab' + i, str, tx0, ty, lerp(30, 40, ey), 'center', a * .92); } ctx.textAlign = 'left';
  });

  // ---- title on the page -----------------------------------------------------------------------------
  { const a = (1 - ss(seg(e, 0, .35))) * ss(seg(t, .15, 1.0)); if (a > .01) {
    ctx.globalAlpha = a; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'italic 600 96px "EB Garamond"'; ctx.fillText('Four Notes', 960, 118); reg('title', 'Four Notes', 960, 118, 96, 'center', a);
    ctx.font = 'italic 500 28px "EB Garamond"'; ctx.globalAlpha = a * .8; ctx.fillStyle = UMBER; ctx.fillText('a short study in making one idea last', 960, 160); reg('sub', 'a short study in making one idea last', 960, 160, 28, 'center', a * .8 / .8); ctx.textAlign = 'left';
    ctx.font = `italic 600 30px "EB Garamond"`; ctx.fillStyle = INK; ctx.globalAlpha = a * ss(seg(t, .8, 1.4)) * .9; ctx.fillText('Moderato', SYS_L + HDR[0], E.sysTop(0) - 40);
    E.glyph(ctx, G.quarter, SYS_L + HDR[0] + 128, E.sysTop(0) - 40, 7.5, INK, a * ss(seg(t, .8, 1.4)) * .9);
    ctx.font = `500 28px "EB Garamond"`; ctx.fillText('= 92', SYS_L + HDR[0] + 150, E.sysTop(0) - 40);
  } }
  ctx.globalAlpha = 1;

  // ---- screen space: legend, subtitle, vignette, debug -------------------------------------------------
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  { const a = ss(seg(e, .5, 1)) * (1 - ss(seg(t, 46, 47))); if (a > .02) {
    ctx.globalAlpha = a; ctx.font = 'italic 500 30px "EB Garamond"'; ctx.textBaseline = 'middle'; let x = 70;
    for (let v = 0; v < 3; v++) { ctx.fillStyle = rgba(VC[v], .75); ctx.beginPath(); ctx.arc(x + 9, 1038, 9, 0, TAU); ctx.fill(); ctx.fillStyle = VC[v]; ctx.fillText(VOICES[v].name, x + 28, 1039); reg('leg' + v, VOICES[v].name, x + 28, 1039, 30, 'left', a); x += 36 + ctx.measureText(VOICES[v].name).width + 34; }
  } }
  const sub = Q.get('nosub') ? null : SUBS.find(s => t >= s.a && t < s.b);
  if (sub) { const a = ss(seg(t, sub.a, sub.a + .3)) * (1 - ss(seg(t, sub.b - .3, sub.b)));
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * .95; ctx.fillStyle = mix('#f1e5c8', INK, ss(seg(e, .3, .9))); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = 'italic 500 42px "EB Garamond"';
    ctx.fillText(sub.text, 960, 1046); reg('cap', sub.text, 960, 1046, 42, 'center', a); ctx.textAlign = 'left'; }
  ctx.globalCompositeOperation = 'multiply';
  { const g = ctx.createRadialGradient(960, 540, 420, 960, 540, 1180); g.addColorStop(0, 'rgba(120,80,30,0)'); g.addColorStop(1, `rgba(100,66,24,${lerp(.18, .3, e)})`);
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (Q.get('debug')) debugOverlay(t);
}
const SUBS = [   // performance directions; each is held for chars / 15 + 1.5 s plus its fades
  { a: 1.8, b: 6.4, text: 'Four notes. That is the whole idea.' },
  { a: 8.4, b: 13.2, text: 'Say it again, then turn it upside down.' },
  { a: 16.2, b: 21.0, text: 'Now stretch it: same shape, more time.' },
  { a: 21.5, b: 26.2, text: 'Let the page open into a landscape.' },
  { a: 28.4, b: 34.2, text: 'Layer them, and mirror one voice against another.' },
  { a: 35.2, b: 40.0, text: 'Build it louder, then bring it home.' },
  { a: 45.0, b: 49.2, text: 'Four notes were enough.' },
];
function debugOverlay(t) {
  const s = sounding(t).map(e => e.id).join('  '), items2 = lastLit.join('  ');
  ctx.fillStyle = 'rgba(30,22,14,.86)'; ctx.fillRect(18, 18, 780, 86);
  ctx.fillStyle = '#f3e7c8'; ctx.font = '600 21px "EB Garamond"'; ctx.textBaseline = 'top';
  ctx.fillText(`t = ${t.toFixed(2)} s   bar ${(Math.floor((t - T0) / BAR) + 1)}   beat ${(((t - T0) / BEAT) % 4 + 1).toFixed(2)}`, 30, 26);
  ctx.fillText('event list : ' + (s || '(silence)'), 30, 52); ctx.fillText('picture lit: ' + (items2 || '(none)'), 30, 76);
}
let lastLit = [];
const rgba = (hex, a) => { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`; };

// what the picture lights at t (exported so a script can compare it with the event list)
window.__PH = t => { const p = E.pagePlayhead(t); return { x: p.x, y0: E.ycPage(p.s, 0) - 60, y1: E.ycPage(p.s, 2) + 60 }; };
window.LIT = t => EV.filter(ev => { const age = t - ev.t; return age >= 0.05 && age < ev.dur; }).map(ev => ev.id);

window.TEXTS = t => { R0(t); return TX; };
const R0 = render;
window.render = t => { lastLit = window.LIT(t).concat(EV.filter(ev => t - ev.t >= 0 && t - ev.t < .05).map(ev => ev.id)); R0(t); };
window.EV = [
  ...EV.map(e => ({ t: e.t, type: 'note', id: e.id, voice: e.voice, midi: e.midi, dur: e.dur, vel: e.vel })),
  { t: RV[0][0], t1: RV[0][1], type: 'pen', s: 0 }, { t: RV[1][0], t1: RV[1][1], type: 'pen', s: 1 },
  { t: M0 - .4, t1: M1, type: 'slide' },
  ...SECTIONS.map((s, i) => ({ t: tOf(s.bars[0], 0) - .2, type: 'tick', i })),
  ...SUBS.map(s => ({ t: s.a, t1: s.b, type: 'caption', text: s.text })),
];
(async () => {
  await Promise.all(['64px Bravura', 'italic 500 40px "EB Garamond"', '500 40px "EB Garamond"'].map(f => document.fonts.load(f)));
  PAT_PAPER = ctx.createPattern(tile(11, PAPER, .09, 1100), 'repeat'); PAT_DESK = ctx.createPattern(tile(5, DESK, .5, 500), 'repeat');
  window.READY = true;
})();
