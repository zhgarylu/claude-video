// Dots · Swiss Motion Graphics around a talking-head video that is itself a Swiss world.
// The video sits on the right, edges feathered; the page colour is the video's own corner colours, so the left page grows out of the same studio.
// Everything snaps to the grid and lands on a beat (score.json); the green dot is the one element that moves linearly and off grid.
import { loadHost, hostFrame } from '/tools/talk/host.js';
import { cuesFromWords } from '/tools/talk/layouts.js';

const W = 1920, H = 1080, ctx = document.getElementById('c').getContext('2d');
const host = await loadHost('src');
const words = await fetch('src/words.json').then(r => r.json());
const SC = await fetch('score.json').then(r => r.json());
const E = SC.ev, D8 = SC.beat / 2;
const QS = new URLSearchParams(location.search), POSTER = QS.has('poster'), AT = parseFloat(QS.get('at') || '9');
const DUR = host.duration;

const INK = '#111111', GREEN = '#22DD46', PAPER = '#FFFFFF', GREY = 'rgba(17,17,17,.46)', RULE = 'rgba(17,17,17,.14)';
const LAT = '"Inter", "Noto Sans SC", sans-serif', f = (w, s) => `${w} ${s}px ${LAT}`;
await Promise.all([500, 700, 800].flatMap(w => [document.fonts.load(`${w} 40px Inter`), document.fonts.load(`${w === 800 ? 900 : w} 40px "Noto Sans SC"`, '字小时在线')]));

// ───────── maths ─────────
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, u) => a + (b - a) * u, seg = (t, a, b) => clamp((t - a) / (b - a));
const bez = (x1, y1, x2, y2) => u => {                                  // cubic-bezier(.7,0,.2,1): the one precise ease
  if (u <= 0) return 0; if (u >= 1) return 1; let s = u;
  for (let i = 0; i < 8; i++) { const c = 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3 - u, d = 3 * x1 * (1 - s) ** 2 + 6 * (x2 - x1) * s * (1 - s) + 3 * (1 - x2) * s * s; if (Math.abs(d) < 1e-6) break; s -= c / d; s = clamp(s); }
  return 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3;
};
const ease = bez(.7, 0, .2, 1);
const snap = (t, tl, dur = D8) => ease(seg(t, tl - dur, tl));            // starts one note early, lands on the beat
const rise = (t, t0, dur = .22) => ease(seg(t, t0, t0 + dur));

// ───────── grid ─────────
const MX = 96, CW = 122, GUT = 24, colX = i => MX + i * (CW + GUT);
const PANEL = { x: 96, y: 56, w: 964, h: 834 };
const texts = [];

// ───────── ground from the video's own corner colours ─────────
const c8 = document.createElement('canvas'); c8.width = c8.height = 8; const x8 = c8.getContext('2d', { willReadFrequently: true });
function edgeColors(time) {
  x8.drawImage(hostFrame(host, time), 0, 0, 8, 8);
  const px = (x, y) => x8.getImageData(x, y, 1, 1).data, m = (p, q) => [0, 1, 2].map(i => Math.round((p[i] + q[i]) / 2));
  const avg = (...ps) => [0, 1, 2].map(i => Math.round(ps.reduce((a, q) => a + q[i], 0) / ps.length));   // the green panel sits top-left: never sample it
  return [avg(px(3, 0), px(4, 0)), avg(px(0, 7), px(3, 7), px(4, 7), px(7, 7))];
}
const VH = 1000, VW = Math.round(VH * host.w / host.h), VX = W - VW - 40, VY = 40;
const vc = document.createElement('canvas'); vc.width = VW; vc.height = VH; const vctx = vc.getContext('2d');
function drawGround(time) {
  const [top, bot] = edgeColors(time), g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${top})`); g.addColorStop(1, `rgb(${bot})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function drawVideo(time) {
  vctx.globalCompositeOperation = 'source-over'; vctx.clearRect(0, 0, VW, VH); vctx.drawImage(hostFrame(host, time), 0, 0, VW, VH);
  vctx.globalCompositeOperation = 'destination-in';
  let g = vctx.createLinearGradient(0, 0, VW, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(46 / VW, '#000'); g.addColorStop(1 - 46 / VW, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
  vctx.fillStyle = g; vctx.fillRect(0, 0, VW, VH);
  g = vctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(24 / VH, '#000'); g.addColorStop(1 - 70 / VH, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
  vctx.fillStyle = g; vctx.fillRect(0, 0, VW, VH);
  ctx.drawImage(vc, VX, VY);
}
const toScreen = (vx, vy) => [VX + vx / host.w * VW, VY + vy / host.h * VH];

// ───────── text helpers ─────────
function T(str, x, y, size, weight = 700, color = INK, o = {}) {           // plain text
  ctx.font = f(weight, size); ctx.fillStyle = color; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  if (o.ls) ctx.letterSpacing = o.ls + 'px'; ctx.fillText(str, x, y); ctx.letterSpacing = '0px';
}
function R(str, x, base, size, weight, color, p, o = {}) {                 // clip-reveal: rises out from under the baseline (p 0→1), leaves upward (out 0→1)
  const out = o.out || 0; if (p <= 0 || out >= 1) return;
  ctx.save(); ctx.font = f(weight, size); if (o.ls) ctx.letterSpacing = o.ls + 'px';
  const w = ctx.measureText(str).width; ctx.beginPath(); ctx.rect(x - 10, base - size * 1.02, w + 20, size * 1.3); ctx.clip();
  ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, base + (1 - p) * size * 1.1 - out * size * 1.1);
  ctx.restore(); ctx.letterSpacing = '0px';
  if (size >= 44 && size <= 120 && p >= .95 && out < .05 && !o.nocheck && !/^[\d,+]+$/.test(str)) texts.push({ id: 'ln-' + str, text: str, x0: x, y0: base - size, x1: x + w, y1: base + 10 });   // layout text, for readcheck
}
function giant(str, X, base, size, color, p, o = {}) {                       // optically flush-left giant numerals / words
  ctx.font = f(800, size); ctx.letterSpacing = (-0.02 * size) + 'px'; const m = ctx.measureText(str); ctx.letterSpacing = '0px';
  R(str, X + m.actualBoundingBoxLeft, base, size, 800, color, p, { ...o, ls: -0.02 * size });
}
const rule = (x0, x1, y, p = 1, c = RULE, lw = 1.5) => { if (p <= 0) return; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, p), y); ctx.stroke(); };
const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

// ───────── knife cut: a line crosses, then the group collapses to its midline ─────────
function knifed(t, tK, cy, x0, x1, draw, collapse = .3) {
  const s = 1 - ease(seg(t, tK, tK + collapse)); if (s <= 0.004) return;
  ctx.save(); ctx.translate(0, cy); ctx.scale(1, s); ctx.translate(0, -cy); draw(); ctx.restore();
  const kp = seg(t, tK - .22, tK); if (kp > 0 && t < tK + collapse) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(lerp(x0, x1, kp), cy); ctx.stroke(); }
}

// ───────── the green dot: the exception ─────────
const KEYS = [
  [E.dot, 114, 120], [3.9, 114, 120], [4.2, 114, 698], [5.2, 1056 - 18, 698], [5.95, 1038, 698],
  [6.95, 1020, 96], [14.3, 1020, 96], [14.62, 270, 440], [16.2, 270, 440], [16.98, 574, 440], [18.3, 574, 440], [18.83, 878, 440], [19.7, 878, 440],
  [20.5, 1020, 96], [28.2, 1020, 96], [E.qdot, 330, 668],
];
function agentAt(t) {
  if (t <= KEYS[0][0]) return [KEYS[0][1], KEYS[0][2], false];
  for (let i = 0; i < KEYS.length - 1; i++) if (t <= KEYS[i + 1][0]) { const [a, b] = [KEYS[i], KEYS[i + 1]], u = seg(t, a[0], b[0]); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), a[1] !== b[1] || a[2] !== b[2]]; }
  const l = KEYS[KEYS.length - 1]; return [l[1], l[2], false];
}

// ───────── captions: part of the layout, bottom of the left page, words rise by their time stamp ─────────
const cues = cuesFromWords(words, { maxChars: 24, softChars: 10, gap: .45 });
const toks = words.flatMap(s => s.words).filter(w => w.w.trim());
function cueTokens(c) {
  const i0 = toks.findIndex(w => w.t0 >= c.t0 - .03); const out = []; let n = 0;
  for (let i = i0; i < toks.length && n < c.text.length; i++) { const w = toks[i], len = w.w.length; out.push({ s: c.text.slice(n, n + len), t0: w.t0 }); n += len; }
  if (n < c.text.length && out.length) out[out.length - 1].s += c.text.slice(n);
  return out;
}
const CUE_TOKS = cues.map(cueTokens);
function drawCaption(t) {
  const k = cues.findIndex(c => t >= c.t0 - .02 && t < c.t1); if (k < 0) return; const c = cues[k], tk = CUE_TOKS[k];
  const size = 42, base = 1000, out = seg(t, c.t1 - .18, c.t1);
  rule(MX, MX + 920, base - size - 26, ease(seg(t, c.t0, c.t0 + .25)));
  T(String(k + 1).padStart(2, '0') + ' / ' + String(cues.length).padStart(2, '0'), MX, base - size - 38, 18, 500, GREY, { ls: 1 });
  ctx.font = f(700, size); let x = MX;
  for (const w of tk) { const wd = ctx.measureText(w.s).width; R(w.s, x, base, size, 700, INK, rise(t, Math.max(c.t0, w.t0 - .04), .2), { out, nocheck: true }); x += wd; }
}

// ───────── scenes ─────────
const FIELD = { x: 114, y: 120, dx: 40, dy: 40, nx: 24, ny: 4 };
function sceneA(t) {
  knifed(t, E.cut1, 380, 96, 1060, () => {
    T('OPENAI DEVDAY · 2026-09-29', MX, 72, 18, 500, GREY, { ls: 1.5 });
    // field of grey dots, rippling out from the green dot, nearest first
    for (let j = 0; j < FIELD.ny; j++) for (let i = 0; i < FIELD.nx; i++) {
      const d = Math.hypot(i, j), p = seg(t, E.ripple + d * D8 * .35, E.ripple + d * D8 * .35 + D8); if (p <= 0 || (i === 0 && j === 0)) continue;
      dot(FIELD.x + i * FIELD.dx, FIELD.y + j * FIELD.dy, 3.6 * ease(p), 'rgba(17,17,17,.30)');
    }
    // title, then the numeral 24
    const gone = rise(t, E.n24 - .35, .3);
    giant('dots', MX, 600, 330, INK, rise(t, E.title - D8, D8), { out: gone });
    const n = Math.round(24 * ease(seg(t, E.n24 - .5, E.n24))), step = Math.round(n / 3) * 3;
    if (t >= E.n24 - .5) giant(String(t >= E.n24 ? 24 : step), MX, 600, 400, INK, 1);
    const lp = rise(t, E.n24 - .2, .25);
    R('小时在线', 640, 600, 84, 700, INK, lp); R('ALWAYS ON · 24 H / DAY', 644, 640, 20, 500, GREY, lp, { ls: 1.5 });
    // the 24-module bar, filled module by module
    for (let i = 0; i < 24 && t >= E.bar - D8; i++) {
      const on = t >= E.bar + i * .03; ctx.fillStyle = on ? INK : 'rgba(17,17,17,.10)'; ctx.fillRect(96 + i * 40, 680, 37, 36);
    }
    if (t > E.bar) { T('00:00', 96, 756, 18, 500, GREY, { ls: 1 }); T('24:00', 1056, 756, 18, 500, GREY, { ls: 1, align: 'right' }); }
  });
}
function panel(t) {
  const pin = ease(seg(t, E.wipe1, E.r1 - .02)), s = 1 - ease(seg(t, E.clear, E.clear + .3)); if (pin <= 0 || s <= .004) return;
  ctx.save(); ctx.translate(0, PANEL.y + PANEL.h / 2); ctx.scale(1, s); ctx.translate(0, -(PANEL.y + PANEL.h / 2));
  ctx.fillStyle = PAPER; ctx.fillRect(PANEL.x, PANEL.y, PANEL.w * pin, PANEL.h); ctx.restore();
}
const PX = PANEL.x + 34;
const inPanel = (t, a, b, tKnife, draw) => { if (t < a || t > b) return; knifed(t, tKnife, PANEL.y + PANEL.h / 2, PANEL.x, PANEL.x + PANEL.w, draw, .28); };
function numeral(t, str, tl, out) { giant(str, PX, 330, 300, INK, snap(t, tl, D8 * 1.5), { out }); T('RULE', PX + 4, 92, 18, 500, GREY, { ls: 2 }); }
function leader(t, t0, fromY, anchor) {
  const p = ease(seg(t, t0, t0 + .45)); if (p <= 0) return; const [ax, ay] = toScreen(...anchor), sx = PANEL.x + PANEL.w;
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, fromY); ctx.lineTo(lerp(sx, ax, p), lerp(fromY, ay, p)); ctx.stroke();
  if (p > .95) { ctx.beginPath(); ctx.arc(ax, ay, 8, 0, 6.3); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); dot(ax, ay, 3, INK); }
}
function rule1(t) {
  inPanel(t, E.r1 - .5, 12.95, 12.6, () => {
    numeral(t, '01', E.r1);
    R('有自己的', PX, 470, 76, 700, INK, rise(t, E.pc - D8)); R('云端电脑', PX, 556, 76, 700, INK, rise(t, E.pc), {});
    R('和浏览器', PX + 340 + 40, 556, 76, 700, INK, rise(t, E.br - D8));
    R('OWN CLOUD COMPUTER + BROWSER', PX + 2, 600, 18, 500, GREY, rise(t, E.pc + .2), { ls: 1.5 });
    // 40 dots = 4,000 apps (one dot = 100); filled from the corner, nearest first
    const GX = 590, GY = 130, P = 50;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) {
      const k = j * 8 + i, on = seg(t, E.grid + k * .045, E.grid + k * .045 + D8);
      dot(GX + i * P, GY + j * P, 15, 'rgba(17,17,17,.10)'); if (on > 0) dot(GX + i * P, GY + j * P, 15 * ease(on), INK);
    }
    const cnt = Math.round(4000 * ease(seg(t, E.grid, E.grid + 1.5)) / 100) * 100;
    if (t > E.grid) { giant((cnt >= 4000 ? '4,000+' : cnt.toLocaleString('en-US')), PX, 780, 150, INK, 1); R('个应用 / APPS · 1 点 = 100', PX + 4, 830, 22, 500, GREY, 1, { ls: 1 }); }
    const sp = rise(t, E.slack - D8); if (sp > 0) { const sx = GX + 5 * P, sy = GY + 3 * P; dot(sx, sy, 15, INK); rule(sx + 20, sx + 56, sy, sp, INK, 2); R('Slack', sx + 66, sy + 9, 28, 700, INK, sp); }
  });
  if (t > E.pc && t < 12.6) leader(t, E.pc + .1, 520, [300, 360]);
}
function rule2(t) {
  inPanel(t, E.r2 - .5, 20.4, 19.95, () => {
    numeral(t, '02', E.r2);
    R('你不在时，', PX, 470 - 60, 56, 500, GREY, rise(t, 14.0), { });
    const MW = 280, MH = 200, MY = 480, mx = i => PX + i * (MW + 24);
    // track
    rule(PX, PX + 3 * MW + 48, 440, ease(seg(t, 14.0, 14.62)), INK, 2);
    const steps = [['只读地看', 'READ-ONLY', E.s1, 'ink-soft'], ['先准备好', 'DRAFT', E.s2, 'ink'], ['等你批准', 'APPROVAL', E.s3, 'hollow']];
    steps.forEach(([zh, en, tl, kind], i) => {
      const p = snap(t, tl); if (p <= 0) return; const x = mx(i), h = MH * p;
      if (kind === 'hollow') { ctx.strokeStyle = GREEN; ctx.lineWidth = 6; ctx.strokeRect(x + 3, MY + 3, MW - 6, MH * p - 6); }
      else { ctx.fillStyle = kind === 'ink' ? INK : '#D9D7D2'; ctx.fillRect(x, MY, MW, h); }
      const col = kind === 'ink' ? PAPER : INK;
      R(zh, x + 24, MY + 100, 46, 700, col, rise(t, tl, .25)); R(en, x + 26, MY + 150, 20, 500, kind === 'ink' ? 'rgba(255,255,255,.7)' : GREY, rise(t, tl + .08, .25), { ls: 1.5 });
      T('0' + (i + 1), x + 24, MY + 44, 22, 700, kind === 'ink' ? 'rgba(255,255,255,.7)' : GREY);
    });
    // coordinate readout of the exception
    const [ax, , mov] = agentAt(t); if (t > 14.3) T(mov ? `x ${String(Math.round(ax)).padStart(4, '0')} · off grid` : 'parked · waiting for you', PX, 790, 22, 500, GREY, { ls: 1 });
  });
  if (t > 14.4 && t < 19.9) leader(t, 14.5, 590, [310, 330]);
}
function rule3(t) {
  inPanel(t, E.r3 - .5, 25.3, 24.95, () => {
    numeral(t, '03', E.r3);
    R('你定规则', PX, 450, 76, 700, INK, rise(t, E.r3 + .2));
    const RH = 110, RY = [530, 660, 790], rows = [['能做', 'ALLOW', E.row1], ['先问', 'ASK FIRST', E.row2], ['不许碰', 'NEVER', E.row3]];
    rows.forEach(([zh, en, tl], i) => {
      const p = snap(t, tl); if (p <= 0) return; const y = RY[i] - 40, w = (PANEL.w - 68) * p;
      let collapse = 1; if (i === 2) collapse = 1 - ease(seg(t, E.knife, E.knife + .3));
      ctx.save(); ctx.translate(0, y + RH / 2); ctx.scale(1, Math.max(.04, collapse)); ctx.translate(0, -(y + RH / 2));
      if (i === 0) { ctx.fillStyle = GREEN; ctx.fillRect(PX, y, w, RH); }
      else if (i === 1) { ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.strokeRect(PX + 2.5, y + 2.5, w - 5, RH - 5); }
      else { ctx.fillStyle = INK; ctx.fillRect(PX, y, w, RH); }
      ctx.restore();
      if (collapse > .35) { const c = i === 2 ? PAPER : INK; R(zh, PX + 30, y + 78, 58, 700, c, rise(t, tl, .25)); R(en, PX + 330, y + 70, 24, 500, i === 2 ? 'rgba(255,255,255,.7)' : 'rgba(17,17,17,.6)', rise(t, tl + .08, .25), { ls: 1.5 }); }
    });
    const kp = seg(t, E.knife - .22, E.knife); if (kp > 0 && t < E.knife + .3) { ctx.strokeStyle = GREEN; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PX, RY[2] + 15); ctx.lineTo(lerp(PX, PX + 896, kp), RY[2] + 15); ctx.stroke(); }
  });
  if (t > E.row1 && t < 24.9) leader(t, E.row1, 600, [300, 340]);
}
function rule4(t) {
  inPanel(t, 25.1, E.clear + .4, E.clear, () => {
    T('04', PX, 120, 18, 500, GREY, { ls: 2 });
    const notes = [['部分付费套餐', 'PLANS', E.note1, 250], ['企业：管理员开启', 'ENTERPRISE', E.note2, 520]];
    for (const [zh, en, tl, y] of notes) { rule(PX, PX + 896, y, ease(seg(t, tl - D8, tl)), INK, 2); R(en, PX, y + 40, 20, 500, GREY, rise(t, tl, .25), { ls: 2 }); R(zh, PX, y + 150, 92, 700, INK, rise(t, tl + .1, .3)); }
  });
}
function question(t) {
  if (t < E.q) return;
  const p = seg(t, E.q, E.q + .8), R0 = 120, cx = 330, cy = 340, sw = 50;
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = sw; ctx.lineCap = 'butt';
  const a0 = Math.PI * 1.08, a1 = Math.PI * 2.5, tot = a1 - a0, stem = 100, len = R0 * tot + stem, drawn = len * p;
  ctx.beginPath(); ctx.arc(cx, cy, R0, a0, a0 + Math.min(R0 * tot, drawn) / R0); ctx.stroke();
  if (drawn > R0 * tot) { ctx.beginPath(); ctx.moveTo(cx, cy + R0); ctx.lineTo(cx, cy + R0 + (drawn - R0 * tot)); ctx.stroke(); }
  ctx.restore();
  // the dot of the question mark is the green dot; it arrives linearly (see KEYS)
}
function grid(t) {                                                       // 12 column guides on the ground, drawn linearly
  const p = seg(t, 5.8, 7.2); if (p <= 0) return;
  for (let i = 0; i < 12; i++) { for (const x of [colX(i), colX(i) + CW]) { ctx.strokeStyle = 'rgba(17,17,17,.07)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 56); ctx.lineTo(x, lerp(56, 890, p)); ctx.stroke(); } }
}
function agent(t) {
  if (t < E.dot - D8) return; const [x, y] = agentAt(t), r = 14 * snap(t, E.dot) + (t >= E.qdot ? 6 * (1 - ease(seg(t, E.qdot, E.qdot + .01))) : 0);
  dot(x, y, t >= E.qdot - .6 ? lerp(14, 34, ease(seg(t, E.qdot - .6, E.qdot))) * snap(t, E.dot) : r, GREEN);
}

window.DUR = DUR; window.EV = [];
window.render = (t0) => {
  const t = POSTER ? AT : t0, time = POSTER ? AT : Math.min(t0, host.duration - .05);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; texts.length = 0;
  drawGround(time); drawVideo(time); grid(t); panel(t);
  sceneA(t); rule1(t); rule2(t); rule3(t); rule4(t); question(t); agent(t);
  if (!POSTER) drawCaption(t);
};
window.TEXTS = (t) => { window.render(t); return texts; };
window.READY = true;
