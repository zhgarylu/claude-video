// "Ten More Minutes": a lyric video. t = film seconds. Every motion hangs on the 100 BPM grid (timeline.js) and on the word times of the vocal (words.json).
import { clamp, lerp, ss, eo, ei, back, mulberry, TAU } from '/core/lib.js';
import { SONG, LINES, BPM, BEAT, BAR, NB, DUR, secAt, secOfBar, buildEvents } from './timeline.js';
import { KIND, SPEC } from './lyrics.js';
import { PAL, drawBG, discAt } from './scene.js';

const cv = document.getElementById('c'), c = cv.getContext('2d');
const fa = new FontFace('Anton', 'url(fonts/Anton-Regular.ttf)'), fb = new FontFace('Archivo', 'url(fonts/Archivo-VF.ttf)', { weight: '100 900' });
await Promise.all([fa.load(), fb.load()]); document.fonts.add(fa); document.fonts.add(fb);
const FAM = { Anton: "'Anton'", Archivo: "'Archivo'" };
const hs = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const font = (fam, wt, size, track = 0) => { c.font = `${wt} ${size}px ${FAM[fam]}`; c.letterSpacing = track + 'px'; };

// ---------------------------------------------------------------- layout: every line becomes a block of words in its own coordinates
const MAXW = { verse: 1560, bridge: 1560, joke: 1640, pre: 1500, chorus: 1640, intro: 1640 };
function layout(L) {
  const kind = L.sec.kind, K = KIND[kind] || KIND.joke, S = SPEC[L.id];
  const words = L.words.map((w, i) => {
    const row = S.rows.findIndex(r => r.includes(i)), fam = S.fam?.[i] ?? K.fam, up = S.up?.[i] ?? K.up;
    const raw = w.tok.replace(/[,]+$/, ''), text = up ? raw.toUpperCase() : raw;
    return { i, row, fam, up, text, base: (S.rowSize?.[row] ?? K.size), mult: S.mult?.[i] ?? 1, wt: S.wt?.[i] ?? K.wt, track: K.track, col: S.col?.[i] || 'fg', fx: S.fx?.[i] || '', t0: w.t0, t1: w.t1 };
  });
  const rows = S.rows.map(r => r.map(i => words[i]));
  for (const r of rows) {                 // measure, then shrink the row if it is wider than the frame allows
    let f = 1;
    for (let pass = 0; pass < 2; pass++) {
      let tot = 0;
      r.forEach((w, k) => {
        w.size = w.base * w.mult * f; font(w.fam, (w.fx == 'sunrise' ? 900 : w.fx == 'droop' ? 800 : w.wt), w.size, w.track * w.size / 112);
        const m = c.measureText(w.text); w.w = m.width; w.asc = m.actualBoundingBoxAscent; w.desc = m.actualBoundingBoxDescent;
        tot += w.w + (k ? (w.fam == 'Anton' ? .2 : .26) * w.size : 0);
      });
      if (tot > (MAXW[kind] || 1640)) f *= (MAXW[kind] || 1640) / tot; else { r.tot = tot; break; }
      r.tot = tot;
    }
    font(r[0].fam, r[0].wt, 100); r.cap = Math.max(...r.map(w => { font(w.fam, 400, w.size); return c.measureText('H').actualBoundingBoxAscent; }));
    r.size = Math.max(...r.map(w => w.size));
  }
  let y = 0; rows.forEach((r, k) => { y += k ? (r[0].fam == 'Anton' ? r.cap + r.size * .13 + (rows[k - 1][0].fam != 'Anton' ? rows[k - 1].size * .3 : 0) : r.size * 1.1) : r.cap; r.by = y; });
  const W = Math.max(...rows.map(r => r.tot)), H = rows[rows.length - 1].by + rows[rows.length - 1].size * .22;
  rows.forEach(r => {
    let x = K.align == 'center' ? (W - r.tot) / 2 : 0;
    r.forEach(w => { w.cx = x + w.w / 2; w.by = r.by; x += w.w + (w.i == r[r.length - 1].i ? 0 : (w.fam == 'Anton' ? .2 : .26) * w.size); });
  });
  Object.assign(L, { K, S, words, rows, W, H, ox: K.align == 'center' ? K.ax - W / 2 : K.ax, oy: K.ay - H / 2 });
  L.ms = Math.min(.44, 1500 / W, 150 / H);
}
const ORDER = LINES.map(l => l.id);
LINES.forEach(layout);
const TE0 = 24 * BAR;
LINES.forEach(L => { L.tReveal = L.K.reveal == 'line' ? L.t - .2 : L.t - .02; });
LINES.forEach((L, i) => {
  const nx = LINES[i + 1];
  L.tMem = nx ? nx.tReveal : TE0 - .02;         // the next line starts: this one shrinks to the memory band
  L.tExit = nx ? L.tMem + BAR - .12 : DUR + 9;
});

// ---------------------------------------------------------------- events: the drum grid plus a sound for every word that does something
const extra = [];
const E = (t, type, o = {}) => extra.push({ t: +t.toFixed(4), type, ...o });
for (const L of LINES) {
  const kind = L.sec.kind;
  L.words.forEach((w, i) => {
    const fxn = L.S.fx?.[i] || '', t0 = w.t0;
    if (L.K.reveal == 'slam') E(t0 - .02, 'hit', { size: (L.S.rowSize?.[L.words[i].row] ?? L.K.size) / 235 + (kind == 'chorus' ? .2 : 0), hook: kind == 'chorus' || kind == 'intro' ? 1 : 0 });
    if (fxn == 'drop') E(t0 + .03, 'thud', { v: .45 }); if (fxn == 'press') E(t0, 'pop', { v: 1 }); if (fxn == 'shine') E(t0 + .05, 'zip');
    if (fxn == 'stack') [.12, .24, .36].forEach((d, k) => E(t0 + d, 'thud', { v: .4 - k * .1 }));
    if (fxn == 'knock') [0, .3, .6].forEach(d => E(t0 + d, 'knock'));
    if (fxn == 'door') E(t0, 'creak'); if (fxn == 'crack') E(t0, 'crack'); if (fxn == 'jangle') E(t0, 'jingle'); if (fxn == 'echo') E(t0, 'echo');
    if (fxn == 'pile') { E(t0, 'thud', { v: 1 }); E(t0 + .22, 'thud', { v: .6 }); }
    if (fxn == 'tally') for (let k = 0; k < 5; k++) E(t0 + .3 + k * .12, 'tick', { v: .5 });
    if (fxn == 'droop') E(t0, 'sink'); if (fxn == 'sunrise') E(t0, 'rise'); if (fxn == 'swing') E(t0 + .1, 'pop', { v: .6 });
    if (fxn == 'sunmask') E(t0, 'zip');
    if (L.K.reveal == 'line' && i == 0) E(L.tReveal, 'tick', { v: .4 });
  });
}
for (const s of SONG.sections) if (s.bar > 0) E(s.bar * BAR - .26, 'whoosh', { to: s.id });
const TE = 24 * BAR;     // end card
['TEN', 'MORE', 'MINUTES'].forEach((_, k) => E(TE + k * .3 - .02, 'hit', { size: 1, hook: 1 }));
E(TE + 1.2, 'pop', { v: .5 }); E(TE + 1.8, 'pop', { v: .4 });
const EV = buildEvents(extra);
window.DUR = DUR; window.EV = EV;
const KICKS = EV.filter(e => e.type == 'kick'), BEEPS = EV.filter(e => e.type == 'beep');
function kickAt(t, tau) { let a = 0, b = KICKS.length; while (a < b) { const m = (a + b) >> 1; if (KICKS[m].t <= t) a = m + 1; else b = m; } return a ? Math.exp(-(t - KICKS[a - 1].t) / tau) * (KICKS[a - 1].v || 1) : 0; }
function recentKicks(t) { return KICKS.filter(k => k.t <= t && t - k.t < 1.0); }
const beepAt = t => { let v = 0; for (const e of BEEPS) if (e.t <= t && t - e.t < .3) v = Math.max(v, Math.exp(-(t - e.t) / .07)); return v; };
const bp = t => Math.exp(-((t / BEAT) % 1) * 6);

// ---------------------------------------------------------------- camera: smooth 2D moves (zoom, roll, track), a punch on every kick
const lt = (t, a, b, f) => f(clamp((t - a) / (b - a)));
function camAt(t) {
  const sec = secAt(t), k = sec.id, ls = t - sec.bar * BAR, n = sec.n * BAR, K1 = kickAt(t, .09);
  let s = 1, r = 0, dx = 0, dy = 0;
  if (k == 'intro') { s = lerp(1.1, 1, eo(clamp(ls / BAR))); s += .012 * K1; }
  else if (k == 'v1') { s = lerp(1, 1.055, ls / n) + .006 * K1; dx = lerp(0, -30, ls / n); }
  else if (k == 'p1') { const u = ls / n; s = lerp(1.03, 1.08, ei(u)) + .012 * K1; r = lerp(0, -.05, ei(u)) * Math.PI / 1.8; dy = -20 * u; dx = lerp(-30, 0, u); }
  else if (k == 'c1') { s = 1 + lerp(.15, 0, eo(clamp(ls / .38))) + lerp(0, .035, ls / n) + .03 * K1; r = lerp(.03, 0, eo(clamp(ls / .5))); }
  else if (k == 'v2') { const u = ls / n; s = 1.03; dx = lerp(-50, 50, u); dy = 8 * Math.sin(u * TAU); s += .006 * K1; }
  else if (k == 'p2') { const u = ls / n; s = lerp(1.03, 1.08, ei(u)) + .012 * K1; r = lerp(0, .05, ei(u)) * Math.PI / 1.8; dx = lerp(50, 0, u); }
  else if (k == 'c2') {
    const u = ls / n; s = 1 + lerp(.16, 0, eo(clamp(ls / .38))) + lerp(0, .05, u) + .04 * K1; r = Math.sin(ls / BAR * Math.PI) * .018 * (ls < BAR * 3 ? 1 : 0) - lerp(0, .07, ss(clamp((ls - 3 * BAR) / 1.0)));
    dx = 12 * (hs(Math.floor(t * 24)) - .5) * K1 * 2; dy = 12 * (hs(Math.floor(t * 24) + 7) - .5) * K1 * 2;
  }
  else if (k == 'bridge') { const u = ls / n; s = lerp(1.08, 1.0, ss(u)); dy = lerp(-30, 40, ss(u)); r = lerp(-.07, .012, ss(clamp(ls / (BAR * 1.5)))); }
  else if (k == 'joke') { s = 1.0 + .01 * K1; dy = 40; r = .012; }
  else if (k == 'end') { const u = clamp(ls / (BAR * 1.4)); s = lerp(1.05, 1, ss(u)); dy = lerp(60, 0, ss(u)); }
  return { s, r, dx, dy };
}
function applyCam(cam, amt = 1) {
  c.translate(960 + cam.dx * amt, 540 + cam.dy * amt); c.rotate(cam.r * amt); const s = lerp(1, cam.s, amt); c.scale(s, s); c.translate(-960, -540);
}

// ---------------------------------------------------------------- per-frame state
let TXT = [];
const off = document.createElement('canvas'); off.width = 1400; off.height = 700; const oc = off.getContext('2d');
function pushBox(id, text, asc, hw, desc) {
  const m = c.getTransform(), pts = [[-hw, -asc], [hw, -asc], [hw, desc], [-hw, desc]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  TXT.push({ id, text, x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) });
}
function maskedText(wd, st, painter, u) {
  const pad = 40, ww = Math.ceil(wd.w + pad * 2), hh = Math.ceil(wd.size * 1.6);
  oc.clearRect(0, 0, off.width, off.height); oc.save(); oc.font = `${st.wt} ${wd.size}px ${FAM[wd.fam]}`; oc.letterSpacing = c.letterSpacing; oc.textAlign = 'center'; oc.fillStyle = '#fff';
  oc.fillText(wd.text, ww / 2, hh * .72); oc.globalCompositeOperation = 'source-atop'; painter(oc, ww, hh, u); oc.restore();
  c.drawImage(off, 0, 0, ww, hh, -ww / 2, -hh * .72, ww, hh);
}

function drawLine(L, t, cam, pal, palNow, wcount) {
  if (t < L.tReveal || t >= L.tExit) return;
  const q = ss(clamp((t - L.tMem) / .36)), ex = 1 - q, K = L.K, S = L.S;
  const tilt = (S.tilt || 0) * Math.PI / 180 * (L.sec.kind == 'chorus' ? 1 : 1);
  const bx = lerp(L.ox + L.W / 2, 960, q), by = lerp(L.oy + L.H / 2, 112, q), bs = lerp(1, L.ms, q), br = lerp(tilt, 0, q);
  const exit = ss(clamp((t - (L.tExit - .3)) / .3));
  c.save(); applyCam(cam, ex); c.translate(bx, by - exit * 26); c.rotate(br); c.scale(bs, bs); c.translate(0, 0);
  const grow = S.grow ? 1 : 0;
  // pre-chorus: the whole block pushes in as the bar goes
  if (S.ramp) { const u = clamp((t - L.t) / BAR); const g = 1 + .1 * ei(u) * ex; c.scale(g, g); }
  for (const wd of L.words) {
    const w = wd, fx = ex > .02 ? wd.fx : '', u = t - w.t0, i = wd.i;
    // ---- reveal
    let alpha = 1, dx = 0, dy = 0, sx = 1, sy = 1, rot = 0, track = wd.track * wd.size / 112, wt = wd.wt, fill = 0, hollow = false, pivot = [0, -wd.asc * .5];
    if (K.reveal == 'line') { const a = ss((t - (L.tReveal + i * .028)) / .24); alpha = a; dy = (1 - a) * 36; fill = clamp(u / Math.max(.08, w.t1 - w.t0)); }
    else if (K.reveal == 'fade') { const a = ss((t - (w.t0 - .45)) / .6); alpha = a; track += (1 - a) * 14; fill = ss(clamp(u / Math.max(.15, w.t1 - w.t0))); }
    else { const tr = w.t0 - .02; if (t < tr) continue; const uu = (t - tr) / .17; alpha = clamp(uu * 7); const sc = 1 + 1.05 * (1 - ss(clamp(uu))) ** 2 + .1 * Math.exp(-Math.max(0, uu - 1) * 9) * Math.sin(uu * 14) ; sx = sy = sc; rot = (hs(i * 3.1 + L.t) - .5) * .05 * (1 - ss(clamp(uu))); fill = 1; }
    if (t < w.t0 - .4 && K.reveal == 'fade') continue;
    // ---- colours
    const cu = wd.col == 'acc' ? pal.acc : pal.lit;       // lit
    let colLit = cu, colUn = wd.col == 'acc' ? hexA(pal.acc, .5) : pal.unlit;
    if (!K.fill) colLit = wd.col == 'acc' ? pal.acc : pal.fg;
    const kk = kickAt(t, .12);
    if (L.sec.kind == 'chorus' || L.sec.kind == 'intro') { const z = 1 + (L.sec.id == 'c2' ? .028 : .02) * kk; sx *= z; sy *= z; }
    if (K.fill && u >= 0) { const b = Math.exp(-u * 10); sx *= 1 + .025 * b; sy *= 1 + .13 * b; }       // a vertical pop: a sideways one would eat the gap between words
    // ---- native moves
    const before = [], after = []; let mask = null, custom = null;
    const cap = wd.asc;
    if (fx == 'beatpulse') { const z = 1 + .07 * bp(t); sx *= z; sy *= z; }
    else if (fx == 'shake') { const j = Math.floor(t * 30); dx += (hs(j) - .5) * 9 * (.4 + bp(t)); dy += (hs(j + 9) - .5) * 9 * (.4 + bp(t)); const z = 1 + .05 * bp(t); sx *= z; sy *= z; }
    else if (fx == 'hollow') { hollow = true; }
    else if (fx == 'press') {
      if (u >= 0) { const d = Math.exp(-u * 4.5); sx = sy = 1 - .26 * d * Math.cos(Math.min(u, 1) * 3); after.push(() => { const r = clamp(u / .9); c.save(); c.strokeStyle = pal.acc; c.globalAlpha = (1 - r) * .7 * ex; c.lineWidth = 6 * (1 - r); c.beginPath(); c.arc(0, -cap / 2, 30 + r * 330, 0, TAU); c.stroke(); c.restore(); }); }
    }
    else if (fx == 'shine') { mask = (o, W, H) => { o.fillStyle = cu; o.fillRect(0, 0, W, H); const p = clamp(u / .55), x = lerp(-180, W + 80, ss(p)); const g = o.createLinearGradient(x - 90, 0, x + 90, H); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = g; o.fillRect(0, 0, W, H); }; if (u < 0 || u > .6) mask = null; }
    else if (fx == 'orbit') {
      const a = t / BEAT * Math.PI * .5 + 1; const rx = wd.w / 2 + 60, ry = wd.size * .62;
      before.push(() => { c.save(); c.strokeStyle = hexA(pal.fg, .18); c.lineWidth = 2; c.beginPath(); c.ellipse(0, -cap / 2, rx, ry, 0, 0, TAU); c.stroke(); if (Math.sin(a) < 0) { c.fillStyle = pal.acc; c.globalAlpha = ex; c.beginPath(); c.arc(Math.cos(a) * rx, -cap / 2 + Math.sin(a) * ry, 13, 0, TAU); c.fill(); } c.restore(); });
      after.push(() => { if (Math.sin(a) >= 0) { c.save(); c.fillStyle = pal.acc; c.globalAlpha = ex; c.beginPath(); c.arc(Math.cos(a) * rx, -cap / 2 + Math.sin(a) * ry, 16, 0, TAU); c.fill(); c.restore(); } });
    }
    else if (fx == 'drop') {
      const tl = w.t0; if (t < tl - .36) continue; const g = 2 * 700 / (.34 * .34);
      if (t < tl) dy -= .5 * g * (tl - t) ** 2; else { const d = t - tl; dy -= 22 * Math.exp(-d * 8) * Math.abs(Math.sin(d * 20)); sy *= 1 - .2 * Math.exp(-d * 14); sx *= 1 + .1 * Math.exp(-d * 14); }
      alpha = 1;
      after.push(() => { const d = t - w.t0; if (d > 0 && d < .6) { c.save(); c.strokeStyle = hexA(pal.fg, .5 * (1 - d / .6)); c.lineWidth = 4; const r = d / .6; c.beginPath(); c.moveTo(-wd.w / 2 - 20 - r * 90, 8); c.lineTo(-wd.w / 2 - 70 - r * 130, 8); c.moveTo(wd.w / 2 + 20 + r * 90, 8); c.lineTo(wd.w / 2 + 70 + r * 130, 8); c.stroke(); c.restore(); } });
    }
    else if (fx == 'float') { dy += Math.sin(t * 2.1 + i) * 7; before.push(() => { c.save(); c.fillStyle = hexA(pal.fg, .07 * ex); for (const [a, b, r] of [[-.3, -.45, .5], [.05, -.6, .62], [.35, -.42, .46]]) { c.beginPath(); c.arc(wd.w * a, cap * b + 14, wd.size * r * .7, 0, TAU); c.fill(); } c.restore(); }); }
    else if (fx == 'stack') {
      [1, 2, 3].forEach(k => after.push(() => { const d = u - .12 * k; if (d < 0) return; const a = ss(d / .15); c.save(); c.globalAlpha = alpha * (.5 - .14 * k) * ex; c.fillStyle = colLit; c.translate(0, wd.size * .88 * k + (1 - a) * -20); c.fillText(wd.text, 0, 0); c.restore(); }));
    }
    else if (fx == 'crack') { custom = 'crack'; }
    else if (fx == 'rise') { if (u >= 0) { dy -= 12 * ss(u / .4); const z = 1 + .06 * ss(u / .4); sx *= z; sy *= z; } }
    else if (fx == 'echo') { for (let k = 1; k <= 3; k++) before.push(() => { const ph = ((t / BEAT) * .5 + k / 3) % 1; c.save(); c.strokeStyle = pal.acc; c.lineWidth = 3; c.globalAlpha = (1 - ph) * .55 * ex * ss(u / .1); c.scale(1 + ph * .35, 1 + ph * .35); c.strokeText(wd.text, 0, 0); c.restore(); }); }
    else if (fx == 'sunmask') { mask = (o, W, H) => { const g = o.createLinearGradient(0, 0, 0, H); g.addColorStop(.2, '#ffd23f'); g.addColorStop(.55, '#ff7a1c'); g.addColorStop(1, '#e8352e'); o.fillStyle = g; o.fillRect(0, 0, W, H); o.fillStyle = 'rgba(255,255,255,.28)'; const sh = (t * 120) % 60; for (let y = -60 + sh; y < H; y += 30) o.fillRect(0, y, W, 9 + 5 * Math.sin(y * .05 + t * 3)); }; }
    else if (fx == 'lightmask') { mask = (o, W, H) => { o.fillStyle = pal.acc; o.fillRect(0, 0, W, H); const sx0 = (t * 160) % (W + 400) - 200; o.fillStyle = 'rgba(255,240,170,.85)'; o.beginPath(); o.moveTo(sx0, 0); o.lineTo(sx0 + 90, 0); o.lineTo(sx0 + 10, H); o.lineTo(sx0 - 80, H); o.fill(); }; }
    else if (fx == 'swing') { pivot = [-wd.w / 2 + 14, -cap]; if (u >= 0) rot += .2 * Math.sin(u * 7.5) * Math.exp(-u * 1.1); after.push(() => { c.save(); c.strokeStyle = hexA(pal.fg, .6 * ex); c.lineWidth = 3; c.beginPath(); c.moveTo(-wd.w / 2 + 14, -cap); c.lineTo(-wd.w / 2 + 14, -cap - 150); c.stroke(); c.restore(); }); }
    else if (fx == 'timid') { sx *= .94; sy *= .94; rot += .07 + .015 * Math.sin(t * 9); dx += Math.sin(t * 40) * 1.2; }
    else if (fx == 'door') { pivot = [-wd.w / 2, -cap / 2]; const p = ss(clamp(u / .5)); sx *= .06 + .94 * p; custom = 'door'; }
    else if (fx == 'knock') { if (u >= 0) { for (const d of [0, .3, .6]) { const e = u - d; if (e >= 0 && e < .25) { const a = 1 - e / .25; dx += Math.sin(e * 90) * 6 * a; sx *= 1 + .07 * a; sy *= 1 + .07 * a; after.push(() => { c.save(); c.strokeStyle = hexA(pal.acc, a * .8 * ex); c.lineWidth = 5 * a; c.beginPath(); c.arc(0, -cap / 2, 40 + (1 - a) * 220, 0, TAU); c.stroke(); c.restore(); }); } } } }
    else if (fx == 'sway') { pivot = [0, -cap * 1.2]; rot += .09 * Math.sin(t * 2.4 + 1); }
    else if (fx == 'tally') { after.push(() => { c.save(); c.strokeStyle = pal.acc; c.lineWidth = 13; c.lineCap = 'round'; c.globalAlpha = alpha * ex; const x0 = wd.w / 2 + 40; for (let k = 0; k < 4; k++) { if (u < .3 + k * .12) break; c.beginPath(); c.moveTo(x0 + k * 26, -cap * .95); c.lineTo(x0 + k * 26, -cap * .05); c.stroke(); } if (u > .3 + 4 * .12) { c.beginPath(); c.moveTo(x0 - 14, -cap * .15); c.lineTo(x0 + 4 * 26 - 8, -cap * .85); c.stroke(); } c.restore(); }); }
    else if (fx == 'shiver') { dx += Math.sin(t * 75) * 2.4; dy += Math.sin(t * 91) * 1.6; colLit = '#127fb8'; colUn = hexA('#127fb8', .45); }
    else if (fx == 'drift') { const p = ss(clamp(u / 1.8)); dx += 36 * p; alpha *= 1 - .22 * p; sx *= 1 - .07 * p; sy *= 1 - .07 * p; }
    else if (fx == 'stutter') { [1, 2].forEach(k => before.push(() => { const j = Math.floor(t / (BEAT / 4)); c.save(); c.globalAlpha = (k == 1 ? .26 : .13) * ex * alpha; c.fillStyle = pal.acc; c.translate(-16 * k + (hs(j + i) - .5) * 3, 0); c.fillText(wd.text, 0, 0); c.restore(); })); if (u >= 0) { const e = (t / (BEAT / 2)) % 1; dx += Math.sin(e * TAU * 2) * 2; } }
    else if (fx == 'jangle') { pivot = [0, -cap * 1.3]; if (u >= 0) rot += .32 * Math.sin(u * 13) * Math.exp(-u * 2.2); after.push(() => { c.save(); c.strokeStyle = pal.acc; c.lineWidth = 7; c.globalAlpha = alpha * ex; c.beginPath(); c.arc(0, -cap * 1.3 - 26, 26, 0, TAU); c.stroke(); c.restore(); }); }
    else if (fx == 'whisper') { track += wd.size * .12; wt = 200; }
    else if (fx == 'pile') {
      const tl = w.t0; if (t < tl - .3) continue; if (t < tl) dy -= .5 * (2 * 900 / .09) * (tl - t) ** 2; else { const d = t - tl; dy -= 30 * Math.exp(-d * 7) * Math.abs(Math.sin(d * 18)); rot += .06 * Math.sin(d * 9) * Math.exp(-d * 2); }
      alpha = 1;
      [[-60, 84, -.16, .32], [52, 160, .2, .18]].forEach(([ox, oy, r, a], k) => before.push(() => { const d = t - w.t0 - .1 * k; if (d < 0) return; c.save(); c.globalAlpha = a * ex; c.fillStyle = colLit; c.translate(ox, oy * ss(d / .1)); c.rotate(r); c.fillText(wd.text, 0, 0); c.restore(); }));
    }
    else if (fx == 'droop') { custom = 'droop'; }
    else if (fx == 'sunrise') {
      if (u >= 0) { wt = lerp(300, 900, ss(u / 1.0)); dy -= 14 * ss(u / 1.0); }
      before.push(() => { const p = ss(clamp(u / 1.1)); c.save(); c.globalAlpha = .45 * p * ex; c.fillStyle = pal.acc; c.beginPath(); c.arc(0, -cap / 2 + 70 * (1 - p), wd.size * .55 * p, 0, TAU); c.fill(); c.restore(); });
    }
    if (wd.fx == 'droop') wt = lerp(300, 800, ss(clamp(u / .9)));
    if (alpha <= 0.01) continue;
    // ---- draw
    c.save();
    c.translate(wd.cx - L.W / 2 + dx, wd.by - L.H / 2 + dy);
    c.translate(pivot[0], pivot[1]); c.rotate(rot); c.scale(sx, sy); c.translate(-pivot[0], -pivot[1]);
    c.globalAlpha = clamp(alpha * (1 - .38 * q) * (1 - exit)); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = `${wt} ${wd.size}px ${FAM[wd.fam]}`; c.letterSpacing = track + 'px';
    for (const f of before) f();
    c.lineJoin = 'round';
    if (alpha * (1 - .38 * q) * (1 - exit) >= .2) pushBox(L.id + '_' + i, wd.text, cap + 4, wd.w / 2 + 3, wd.desc + 4);
    if (mask) { maskedText(wd, { wt }, mask, u); c.lineWidth = 5; c.strokeStyle = hexA(pal.fg, .85); c.strokeText(wd.text, 0, 0); }
    else if (custom == 'crack') {
      const ccap = cap; c.save(); c.beginPath(); c.rect(-wd.w, -ccap * 2, wd.w * 2, ccap * 1.55); c.clip(); c.rotate(-.012); c.fillStyle = K.fill ? mixFill(colUn, colLit, fill) : colLit; c.fillText(wd.text, 0, 0); c.restore();
      c.save(); const d = ss(clamp(u / .25)) * ex; c.translate(0, 9 * d); c.rotate(.018 * d); c.beginPath(); c.rect(-wd.w, -ccap * .45, wd.w * 2, ccap * 2); c.clip(); c.fillStyle = K.fill ? mixFill(colUn, colLit, fill) : colLit; c.fillText(wd.text, 0, 0); c.restore();
      c.save(); c.strokeStyle = pal.acc; c.lineWidth = 4; c.globalAlpha = alpha * d; c.beginPath(); let xx = -wd.w / 2; c.moveTo(xx, -ccap * .45); for (let k = 0; k < 9; k++) { xx += wd.w / 8; c.lineTo(xx, -ccap * .45 + (k % 2 ? -7 : 7)); } c.stroke(); c.restore();
    }
    else if (custom == 'door') {
      const p = ss(clamp(u / .5)); c.save(); c.fillStyle = K.fill ? mixFill(colUn, colLit, fill) : colLit; c.fillText(wd.text, 0, 0); c.restore();
      c.save(); c.globalAlpha = (1 - p) * .5 * alpha; c.fillStyle = pal.fg; c.fillRect(-wd.w / 2 - 8, -cap * 1.05, 10, cap * 1.35); c.restore();
    }
    else if (custom == 'droop') {
      let x = -wd.w / 2; const ch = [...wd.text], sp = (wd.w - 0) / ch.length;
      ch.forEach((chr, j) => { const m = c.measureText(chr).width + track; const d = ss(clamp((u - j * .06) / .7)); c.save(); c.translate(x + m / 2, j * 3 * d + 7 * d); c.rotate(.045 * j * d); c.fillStyle = mixFill(colUn, colLit, clamp(fill * ch.length - j)); c.textAlign = 'center'; c.fillText(chr, 0, 0); c.restore(); x += m; });
    }
    else if (hollow) { c.lineWidth = 5; c.strokeStyle = K.fill ? mixFill(colUn, colLit, fill) : colLit; c.fillStyle = hexA(pal.bg, 1); c.fillText(wd.text, 0, 0); c.strokeText(wd.text, 0, 0); c.save(); c.shadowColor = pal.acc; c.shadowBlur = 24 * fill; c.strokeText(wd.text, 0, 0); c.restore(); }
    else if (K.fill) {
      c.fillStyle = colUn; c.fillText(wd.text, 0, 0);
      if (fill > 0) { c.save(); c.beginPath(); c.rect(-wd.w / 2 - 6, -wd.size * 1.2, (wd.w + 12) * fill, wd.size * 1.7); c.clip(); c.fillStyle = colLit; c.fillText(wd.text, 0, 0); c.restore(); }
    }
    else { c.fillStyle = colLit; c.fillText(wd.text, 0, 0); }
    for (const f of after) f();
    c.restore();
  }
  c.restore();
}
const hexA = (h, a) => { if (h.startsWith('rgba')) return h; const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function parse(col) { if (col.startsWith('#')) { const n = parseInt(col.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; } const m = col.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1]; }
function mixFill(a, b, p) { const A = parse(a), B = parse(b); return `rgba(${Math.round(lerp(A[0], B[0], p))},${Math.round(lerp(A[1], B[1], p))},${Math.round(lerp(A[2], B[2], p))},${lerp(A[3], B[3], p).toFixed(3)})`; }

// ---------------------------------------------------------------- end card
function drawEnd(t, cam, pal) {
  const u = t - TE; if (u < -.05) return;
  c.save(); applyCam(cam, 1);
  const rows = [['TEN', 'MORE', 'MINUTES']]; font('Anton', 400, 190, 6);
  const ws = rows[0].map(s => c.measureText(s).width), gap = 44, tot = ws.reduce((a, b) => a + b, 0) + gap * 2; let x = 960 - tot / 2;
  rows[0].forEach((s, k) => {
    const tr = k * .3 - .02, uu = (u - tr) / .17; if (uu >= 0) {
      const sc = 1 + .9 * (1 - ss(clamp(uu))) ** 2, kk = kickAt(t, .12);
      c.save(); c.translate(x + ws[k] / 2, 440); c.scale(sc * (1 + .02 * kk), sc * (1 + .02 * kk)); c.globalAlpha = clamp(uu * 7); c.fillStyle = pal.acc; c.textAlign = 'center'; font('Anton', 400, 190, 6); c.fillText(s, 0, 0);
      pushBox('end_t' + k, s, 140, ws[k] / 2 + 3, 6); c.restore();
    } x += ws[k] + gap;
  });
  const ua = u - 1.2; if (ua > 0) { c.save(); c.translate(960, 548); c.globalAlpha = ss(ua / .4); c.fillStyle = pal.fg; c.textAlign = 'center'; font('Archivo', 700, 54, 14); c.fillText('THE SNOOZE BUTTON', 0, 0); pushBox('end_a', 'THE SNOOZE BUTTON', 40, c.measureText('THE SNOOZE BUTTON').width / 2, 8); c.restore(); }
  const ub = u - 1.8; if (ub > 0) { c.save(); c.translate(960, 612); c.globalAlpha = ss(ub / .4) * .8; c.fillStyle = pal.fg; c.textAlign = 'center'; font('Archivo', 400, 30, 6); c.fillText('SPOKEN WORD, 100 BPM', 0, 0); pushBox('end_b', 'SPOKEN WORD, 100 BPM', 24, c.measureText('SPOKEN WORD, 100 BPM').width / 2, 6); c.restore(); }
  c.restore();
}

// ---------------------------------------------------------------- the frame
function bgFor(key, t, lt0, cam, amt) {
  c.save(); applyCam(cam, amt);
  drawBG(c, key, t, { K: tau => kickAt(t, tau), kicks: recentKicks(t), lt: lt0, beep: beepAt(t) });
  c.restore();
}
window.render = t => {
  TXT = []; t = clamp(t, 0, DUR - 1e-6);
  const sec = secAt(t), cam = camAt(t), key = sec.id;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.letterSpacing = '0px';
  // the section change: the new palette opens as an iris from the new disc, a little before the downbeat
  const nextSec = SONG.sections.find(s => s.bar > 0 && t >= s.bar * BAR - .26 && t < s.bar * BAR + .1);
  const base = nextSec ? secOfBar(nextSec.bar - 1) : sec;
  c.fillStyle = PAL[base.id].bg; c.fillRect(0, 0, 1920, 1080);
  bgFor(base.id, t, t - base.bar * BAR, cam, .5);
  let palNow = PAL[nextSec && t >= nextSec.bar * BAR - .05 ? nextSec.id : base.id];
  if (nextSec) {
    const u = (t - (nextSec.bar * BAR - .26)) / .36, R = 2600 * eo(clamp(u)), [dx, dy] = discAt(nextSec.id, t);
    c.save(); c.beginPath(); c.arc(dx, dy, R, 0, TAU); c.clip(); bgFor(nextSec.id, t, Math.max(0, t - nextSec.bar * BAR), cam, .5);
    c.lineWidth = 14; c.strokeStyle = PAL[nextSec.id].acc; c.restore();
    c.save(); c.strokeStyle = PAL[nextSec.id].acc; c.globalAlpha = (1 - clamp(u)) * .8; c.lineWidth = 16; c.beginPath(); c.arc(dx, dy, R, 0, TAU); c.stroke(); c.restore();
    // speed lines: the whip
    const w = clamp((t - (nextSec.bar * BAR - .12)) / .34);
    if (w > 0 && w < 1) { c.save(); c.fillStyle = PAL[nextSec.id].acc; for (let k = 0; k < 16; k++) { const y = hs(k * 3.7 + nextSec.bar) * 1080, h = 4 + hs(k * 1.3) * 18, len = 500 + hs(k * 7.1) * 1100, x = lerp(-len, 2000, eo(w)) + (hs(k) - .5) * 300; c.globalAlpha = (1 - w) * .55; c.fillRect(x, y, len, h); } c.restore(); }
  }
  const palSec = PAL[(nextSec && t >= nextSec.bar * BAR ? nextSec : sec).id];
  // lines: the current one under the camera, the memory line fixed at the top
  const swap = nextSec && t >= nextSec.bar * BAR - .1;      // halfway through the iris the cur line takes the incoming palette, so it never sits in the wrong colour
  for (const L of LINES) {
    const pal = PAL[L.sec.id], q = ss(clamp((t - L.tMem) / .36));
    drawLine(L, t, cam, (q > .5 || (swap && L.sec.id !== nextSec.id)) ? palSec : pal, palSec);
  }
  if (t >= TE - .05) drawEnd(t, cam, PAL.end);
  // crash flash on the drop and the bar-24 hit
  for (const s of [7, 17, 24]) { const d = t - s * BAR; if (d >= 0 && d < .16) { c.fillStyle = `rgba(255,255,255,${.5 * (1 - d / .16)})`; c.fillRect(0, 0, 1920, 1080); } }
  // a thin progress line, the song's own clock
  c.fillStyle = hexA(palSec.acc, .85); c.fillRect(0, 1074, 1920 * t / DUR, 6);
  window.__lastT = t;
};
window.TEXTS = t => { if (window.__lastT !== clamp(t, 0, DUR - 1e-6)) window.render(t); return TXT; };
window.READY = true;
