import { clamp, lerp, seg, ss, eio, eo, ei, back, spring, hash, TAU } from '/core/lib.js';
import * as TL from './timeline.js';
const { T, STN, CUES, CAM, TILES } = TL;

const W = 1920, H = 1080;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');

// ───────── 色板：奶油底 + 一色一义 ─────────
const COL = {
  ground: '#F2ECDF', ink: '#231A2C', paper: '#FBF7EE', board: '#E8DEC8',
  violet: '#7B5CF5', teal: '#1EA79B', mustard: '#F0B23B', coral: '#EF6F5E', sky: '#3E8FE8', graphite: '#5A5F6E', gray: '#CFC7B6',
  soil1: '#C9B48F', soil2: '#B69E78', soil3: '#9A8564',
};
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const tone = c => ({ top: mixc(c, '#FFF6E8', .22), L: c, R: mixc(c, '#231A2C', .24) });
let GREY = 0;                                                 // 隐私一句：除 Muse 外向暖灰退
const hue = (n, keep = false) => keep || n === 'ink' || n === 'ground' || n === 'paper' ? COL[n] : mixc(COL[n], '#BDB4A5', GREY * .82);
const SANS = (w, s) => `${w} ${s}px Jost, "Noto Sans SC", sans-serif`;

// ───────── 投影：sx=(x−y)·cos30·k，sy=((x+y)/2−z)·k ─────────
const C30 = Math.cos(Math.PI / 6), LU = 48;
const V = { cx: 0, cy: 0, k: 60, ox: W * .42, oy: H * .60 };
const P = (x, y, z = 0) => [V.ox + ((x - V.cx) - (y - V.cy)) * C30 * V.k, V.oy + (((x - V.cx) + (y - V.cy)) / 2 - z) * V.k];
function camAt(t) {
  let a = CAM[0], b = CAM[CAM.length - 1];
  for (let i = 0; i < CAM.length - 1; i++) if (t >= CAM[i].t && t <= CAM[i + 1].t) { a = CAM[i]; b = CAM[i + 1]; break; }
  const u = b.t === a.t ? 1 : eio((t - a.t) / (b.t - a.t));
  return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), k: Math.exp(lerp(Math.log(a.k), Math.log(b.k), u)) };
}
function poly(pts, fill) {
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = .8; ctx.stroke();
}
function faceT(kind, x, y, z, w, d, h) {            // 把画布变换到某个面的局部坐标（1 世界单位 = 48 局部像素）
  const k = V.k / LU, a = C30 * k, b = .5 * k;
  if (kind === 'L') { const [ex, ey] = P(x, y + d, z + h); ctx.transform(a, b, 0, k, ex, ey); return [w * LU, h * LU]; }
  if (kind === 'R') { const [ex, ey] = P(x + w, y + d, z + h); ctx.transform(a, -b, 0, k, ex, ey); return [d * LU, h * LU]; }
  const [ex, ey] = P(x, y, z + h); ctx.transform(a, b, -a, b, ex, ey); return [w * LU, d * LU];
}
function onFace(kind, x, y, z, w, d, h, fn) { ctx.save(); const [fw, fh] = faceT(kind, x, y, z, w, d, h); fn(ctx, fw, fh); ctx.restore(); }

// ───────── 绘制队列（画家算法：x+y+z）─────────
let Q = [], PINS = [], TEXTS_NOW = [];
const qpush = (dep, f) => Q.push({ dep, f });
function drawBox(x, y, z, w, d, h, col, o = {}) {
  if (h <= .002 || w <= 0 || d <= 0) return;
  const t3 = tone(col); ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], o.cL || t3.L);
  poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], o.cR || t3.R);
  poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], o.cT || t3.top);
  if (o.L) onFace('L', x, y, z, w, d, h, o.L); if (o.R) onFace('R', x, y, z, w, d, h, o.R); if (o.top) onFace('T', x, y, z, w, d, h, o.top);
  ctx.restore();
}
const box = (x, y, z, w, d, h, col, o = {}) => qpush((x + w / 2) + (y + d / 2) + (z + h / 2) + (o.bias || 0), () => drawBox(x, y, z, w, d, h, col, o));

// ───────── 文字与小图标 ─────────
function halo(s, x, y, font, color, align = 'left', hw = 7, base = 'alphabetic') {
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = base; ctx.lineJoin = 'round';
  ctx.lineWidth = hw; ctx.strokeStyle = COL.ground; ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function iSpark(c, x, y, r, col) { c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x + r * .14, y - r * .14, x + r, y); c.quadraticCurveTo(x + r * .14, y + r * .14, x, y + r); c.quadraticCurveTo(x - r * .14, y + r * .14, x - r, y); c.quadraticCurveTo(x - r * .14, y - r * .14, x, y - r); c.fillStyle = col; c.fill(); }
function iCheck(c, x, y, r, col, bg) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = bg; c.fill(); c.strokeStyle = col; c.lineWidth = r * .3; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x - r * .42, y + r * .02); c.lineTo(x - r * .1, y + r * .34); c.lineTo(x + r * .46, y - r * .3); c.stroke(); }
function iLock(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.roundRect(x - s * .5, y - s * .1, s, s * .78, s * .12); c.fill(); c.strokeStyle = col; c.lineWidth = s * .16; c.beginPath(); c.arc(x, y - s * .1, s * .28, Math.PI, 0); c.stroke(); c.fillStyle = COL.paper; c.beginPath(); c.arc(x, y + s * .26, s * .09, 0, TAU); c.fill(); }
function iMail(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = s * .09; c.lineJoin = 'round'; c.beginPath(); c.roundRect(x - s * .5, y - s * .34, s, s * .68, s * .08); c.stroke(); c.beginPath(); c.moveTo(x - s * .5, y - s * .3); c.lineTo(x, y + s * .08); c.lineTo(x + s * .5, y - s * .3); c.stroke(); }
function iCal(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = s * .09; c.beginPath(); c.roundRect(x - s * .46, y - s * .4, s * .92, s * .84, s * .08); c.stroke(); c.fillStyle = col; c.fillRect(x - s * .46, y - s * .4, s * .92, s * .2); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.fillRect(x - s * .3 + i * s * .26, y + j * s * .22 - s * .06, s * .13, s * .13); }
function iDoc(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = s * .09; c.beginPath(); c.roundRect(x - s * .34, y - s * .46, s * .68, s * .92, s * .08); c.stroke(); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - s * .18, y - s * .2 + i * s * .22); c.lineTo(x + s * .18, y - s * .2 + i * s * .22); c.stroke(); } }
function iChat(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = s * .09; c.lineJoin = 'round'; c.beginPath(); c.roundRect(x - s * .5, y - s * .4, s, s * .64, s * .14); c.stroke(); c.beginPath(); c.moveTo(x - s * .18, y + s * .24); c.lineTo(x - s * .3, y + s * .46); c.lineTo(x + s * .02, y + s * .24); c.stroke(); }
function iBust(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y - s * .2, s * .22, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - s * .4, y + s * .5); c.quadraticCurveTo(x - s * .4, y + s * .08, x, y + s * .08); c.quadraticCurveTo(x + s * .4, y + s * .08, x + s * .4, y + s * .5); c.closePath(); c.fill(); }
const NOISE = 'ABCDEFGHJKLMNOPQRSTUVWXYZ#%&01';

// ───────── 沙盘、点阵、路线 ─────────
const BD = { x0: -3, y0: -.5, x1: 33.5, y1: 10.5, th: 1.7 };
function drawGround() {
  ctx.fillStyle = COL.ground; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * .45, H * .45, 100, W * .45, H * .45, 1300);
  g.addColorStop(0, 'rgba(255,250,240,0.55)'); g.addColorStop(1, 'rgba(180,165,135,0.18)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(35,26,44,0.16)';
  const step = V.k > 55 ? 2 : 4, r = clamp(V.k / 40, .9, 2.2);
  for (let i = -12; i <= 50; i += step) for (let j = -12; j <= 24; j += step) {
    const [x, y] = P(i, j, -1.7); if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
}
function drawBoard(t) {
  const w = BD.x1 - BD.x0, d = BD.y1 - BD.y0;
  const [sx, sy] = P(BD.x1 + .6, BD.y1 + .6, -BD.th);
  ctx.save(); ctx.filter = `blur(${clamp(V.k / 4, 4, 24)}px)`; ctx.fillStyle = 'rgba(35,26,44,0.20)';
  const a = P(BD.x0 + 1, BD.y0 + 1, -BD.th - .3), b = P(BD.x1 + 2.2, BD.y0 + 1, -BD.th - .3), c = P(BD.x1 + 2.2, BD.y1 + 2.2, -BD.th - .3), e = P(BD.x0 + 1, BD.y1 + 2.2, -BD.th - .3);
  ctx.beginPath(); [a, b, c, e].forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore();
  const strata = (c, fw, fh, dark) => {
    const bands = [[0, .28, COL.soil1], [.28, .58, COL.soil2], [.58, 1, COL.soil3]];
    bands.forEach(([a, b, col]) => { c.fillStyle = col; c.fillRect(0, a * fh, fw, (b - a) * fh + 1); });
    c.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < fw; i += 150) c.fillRect(i, .1 * fh, 60, 4);
    c.strokeStyle = COL.teal; c.lineWidth = 6; c.beginPath(); c.moveTo(0, .45 * fh); c.lineTo(fw, .45 * fh); c.stroke();
    c.fillStyle = COL.mustard; for (let i = 30; i < fw; i += 220) { c.beginPath(); c.arc(i, .45 * fh, 11, 0, TAU); c.fill(); }
    c.strokeStyle = COL.ink; c.globalAlpha = .45; c.lineWidth = 3; c.beginPath(); c.moveTo(0, .78 * fh); c.lineTo(fw, .78 * fh); c.stroke(); c.globalAlpha = 1;
    if (dark) { c.fillStyle = 'rgba(35,26,44,0.24)'; c.fillRect(0, 0, fw, fh); }
  };
  drawBox(BD.x0, BD.y0, -BD.th, w, d, BD.th, COL.board, {
    L: (c, fw, fh) => strata(c, fw, fh, false), R: (c, fw, fh) => strata(c, fw, fh, true),
    cT: '#EADFC8',
    top: (c, fw, fh) => {
      c.strokeStyle = 'rgba(35,26,44,0.07)'; c.lineWidth = 2;
      for (let i = 0; i <= w; i += 2) { c.beginPath(); c.moveTo(i * LU, 0); c.lineTo(i * LU, fh); c.stroke(); }
      for (let j = 0; j <= d; j += 2) { c.beginPath(); c.moveTo(0, j * LU); c.lineTo(fw, j * LU); c.stroke(); }
    },
  });
  // 工位底板（淡色板 + 虚线轮廓 + 路标）
  const plates = [[STN.s1, 'RANK', '01'], [STN.s2, 'CORE', '02'], [STN.s3, 'REACH', '03'], [STN.s4, 'WORK', '04']];
  plates.forEach(([sx0, name, no]) => {
    const px = sx0 - 3.5, pw = 7.0, py = .4, pd = 9.2;
    const q = [P(px, py, .01), P(px + pw, py, .01), P(px + pw, py + pd, .01), P(px, py + pd, .01)];
    ctx.save(); poly(q, 'rgba(251,247,238,0.62)'); ctx.setLineDash([12, 9]); ctx.strokeStyle = 'rgba(35,26,44,0.55)'; ctx.lineWidth = 2.2; ctx.beginPath(); q.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke(); ctx.restore();
    onFace('T', px, py, 0, pw, pd, .01, (c, fw, fh) => {
      c.font = SANS(600, 40); c.fillStyle = 'rgba(35,26,44,0.5)'; c.textBaseline = 'alphabetic'; c.letterSpacing = '9px';
      c.fillText(`${no}  ${name}`, 18, fh - 18); c.letterSpacing = '0px';
    });
  });
  // 路线：画在镜头之前一点
  const reveal = clamp(((V.cx + 7) - STN.s1) / (STN.s4 - STN.s1 + 3.4), .06, 1);
  const rx1 = lerp(STN.s1 + 3, STN.s4 - 3.4, Math.min(1, reveal));
  ctx.save(); ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(35,26,44,0.5)'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  [[STN.s1 + 3.9, STN.s2 - 3.9], [STN.s2 + 3.9, STN.s3 - 3.9], [STN.s3 + 3.9, STN.s4 - 3.9]].forEach(([x0, x1]) => {
    const e = Math.min(x1, Math.max(x0, rx1 + 6)); if (e <= x0) return;
    ctx.beginPath(); const [ax, ay] = P(x0, STN.y, .02), [bx, by] = P(e, STN.y, .02); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }); ctx.restore();
}

// ───────── 标注（pin）：点 → 竖线 → 横线 → 文字 ─────────
function pin(id, text, wx, wy, wz, t0, t1, o = {}) {
  if (CUR_T < t0 || CUR_T > t1) return;
  const pIn = ss((CUR_T - t0) / .28), pOut = 1 - ss((CUR_T - (t1 - .2)) / .2);
  PINS.push({ id, text, wx, wy, wz, pIn, pOut, up: o.up ?? 76, side: o.side ?? 1, hue: o.hue || 'ink', sub: o.sub });
}
function drawPins() {
  for (const p of PINS) {
    const [x, y] = P(p.wx, p.wy, p.wz), a = p.pIn * p.pOut; if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.4);
    const L = p.up * Math.min(1, p.pIn * 1.6), f = SANS(600, 30), tw = (ctx.font = f, ctx.measureText(p.text).width);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - L); ctx.stroke();
    const rl = (tw + 20) * clamp((p.pIn - .35) / .65);
    ctx.beginPath(); ctx.moveTo(x, y - L); ctx.lineTo(x + p.side * rl, y - L); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU); ctx.fillStyle = COL.paper; ctx.fill(); ctx.stroke();
    if (p.pIn > .6) {
      ctx.globalAlpha *= clamp((p.pIn - .6) / .4);
      const tx = p.side > 0 ? x + 10 : x - 10;
      halo(p.text, tx, y - L - 11, f, hue(p.hue === 'ink' ? 'ink' : p.hue), p.side > 0 ? 'left' : 'right');
      if (p.sub) halo(p.sub, tx, y - L + 28, SANS(500, 21), COL.graphite, p.side > 0 ? 'left' : 'right', 6);
      const x0 = p.side > 0 ? tx : tx - tw, y0 = y - L - 40;
      TEXTS_NOW.push({ id: p.id, text: p.text, x0, y0, x1: x0 + tw, y1: y0 + 36 });
    }
    ctx.restore();
  }
}

// ───────── 人物（极简广告牌）─────────
function person(x, y, z, o = {}) {
  const [px, py] = P(x, y, z), s = V.k * (o.s || .95), tq = Math.floor(CUR_T * 12) / 12, c = hue(o.col || 'coral');
  const dark = mixc(c, '#231A2C', .24), pose = o.pose || 0;
  ctx.save(); ctx.translate(px, py); if (o.flip) ctx.scale(-1, 1);
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-.22 * s, -1.12 * s); ctx.lineTo(0, -1.12 * s); ctx.lineTo(0, 0); ctx.lineTo(-.42 * s, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, -1.12 * s); ctx.lineTo(.22 * s, -1.12 * s); ctx.lineTo(.42 * s, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  const bob = pose === 1 ? Math.sin(tq * 5) * .02 * s : 0;
  ctx.lineCap = 'round'; ctx.lineWidth = .14 * s; ctx.strokeStyle = dark;
  const arm = (sx, ex, ey) => { ctx.beginPath(); ctx.moveTo(sx * .2 * s, -1.02 * s); ctx.lineTo(ex * s, ey * s + bob); ctx.stroke(); };
  if (pose === 0) { arm(-1, -.36, -.55); arm(1, .36, -.55); }
  else if (pose === 1) { arm(-1, -.55, -.62); arm(1, .5, -1.3 + Math.sin(tq * 6) * .1); }      // 放松，一只手举着杯子
  else if (pose === 2) { arm(-1, -.3, -.5); arm(1, .85, -.95); }                                // 向前递出
  else { arm(-1, -.5, -1.15); arm(1, .5, -1.15); }                                                // 耸肩犹豫
  ctx.fillStyle = mixc('#F6C9A6', '#BDB4A5', GREY * .6); ctx.beginPath(); ctx.arc(0, -1.42 * s + bob, .26 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(0, -1.5 * s + bob, .27 * s, Math.PI * 1.04, Math.PI * 1.96); ctx.fill();
  ctx.restore();
}

// ───────── 常用动画函数 ─────────
let CUR_T = 0;
const grow = (t, t0, d = .45, s = 1.8) => back(seg(t, t0, t0 + d), s);
const dropZ = (t, t0, z0 = 7, d = .45) => { const u = seg(t, t0, t0 + d); return z0 * (1 - u * u) + (u >= 1 ? Math.max(0, .35 * Math.exp(-(t - t0 - d) * 9) * Math.sin((t - t0 - d) * 28)) : 0); };

// ═══════════ 工位一：榜单 ═══════════
function museCube(x, y, z, s, t, o = {}) {
  const h = s;
  box(x, y, z, s, s, h, hue('violet', true), {
    bias: o.bias || 0,
    top: (c, fw, fh) => { iSpark(c, fw / 2, fh / 2, Math.min(fw, fh) * .3, COL.paper); },
    R: (c, fw, fh) => { c.font = SANS(700, fh * .30); c.fillStyle = COL.paper; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = (fh * .03) + 'px'; c.fillText('MUSE', fw / 2, fh / 2); c.letterSpacing = '0px'; },
    L: (c, fw, fh) => { iSpark(c, fw / 2, fh / 2, fh * .22, COL.paper); },
  });
}
function calendar(x, y, label, t0, t) {
  if (t < t0) return; const z = dropZ(t, t0, 7), sq = t > t0 + .45 ? 1 - .08 * Math.exp(-(t - t0 - .45) * 10) : 1;
  box(x, y, z, 1.9, .34, 1.9 * sq, COL.paper, {
    L: (c, fw, fh) => { c.fillStyle = hue('coral'); c.fillRect(0, 0, fw, fh * .3); c.fillStyle = COL.ink; c.font = SANS(700, fh * .46); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, fw / 2, fh * .66); c.fillStyle = COL.paper; for (const px of [.25, .75]) { c.beginPath(); c.arc(fw * px, fh * .08, fh * .045, 0, TAU); c.fill(); } },
  });
}
const POD = { x: 3.8, y: 4.4 };
function museState(t) {
  const hopU = seg(t, T.hop, T.hop + .6), rise = grow(t, T.muse, .5, 1.7), s = 1.45;
  return { x: lerp(2.5, POD.x + 1.5 + .02, ss(hopU)), y: lerp(3.3, POD.y + .22, ss(hopU)), z: lerp(0, 1.9, ss(hopU)) + Math.sin(hopU * Math.PI) * 2.2, s: s * rise, hopU };
}
function sceneRank(t) {
  calendar(.5, 7.2, '9/8', T.cal1, t);
  if (t >= T.meta - .1 && t < 6.1) {                                      // Meta 名字牌（文字牌，不使用商标）；镜头离开前沉回沙盘
    const u = grow(t, T.meta - .1, .35) * (t < 5.4 ? 1 : 1 - ss(seg(t, 5.4, 6.0))), sz = -2.8 * (1 - (t < 5.4 ? 1 : 1 - ss(seg(t, 5.4, 6.0))));
    box(6.7, 1.0, sz, .22, .22, 1.7 * Math.max(u, 0), COL.graphite);
    box(5.85, 1.0 + .22 - .12, sz + 1.7 * Math.max(u, 0), 1.9, .2, .9 * Math.max(u, 0), COL.paper, { L: (c, fw, fh) => { c.fillStyle = COL.ink; c.font = SANS(700, fh * .55); c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '4px'; c.fillText('META', fw / 2, fh / 2); c.letterSpacing = '0px'; } });
  }
  // 手机
  if (t >= T.phone) {
    const z = dropZ(t, T.phone, 6, .42);
    box(2.6, 7.0, z, 1.9, .22, 3.2, COL.graphite, {
      L: (c, fw, fh) => {
        c.fillStyle = '#F7F2E6'; c.beginPath(); c.roundRect(14, 14, fw - 28, fh - 28, 16); c.fill();
        const cols = ['gray', 'mustard', 'sky', 'coral', 'gray', 'teal', 'gray', 'violet'];
        for (let i = 0; i < 12; i++) {
          const cx = 34 + (i % 3) * ((fw - 68) / 2.2), cy = 40 + Math.floor(i / 3) * ((fh - 80) / 3.6), isM = i === 7;
          const pop = isM ? 1 + .12 * Math.sin(Math.max(0, CUR_T - T.phone - .5) * 7) * Math.exp(-(CUR_T - T.phone - .5) * 1.2) : 1;
          c.save(); c.translate(cx + 28, cy + 28); c.scale(pop, pop); c.fillStyle = isM ? COL.violet : mixc(COL[cols[i % 8]], '#F7F2E6', .55); c.beginPath(); c.roundRect(-28, -28, 56, 56, 14); c.fill(); if (isM) iSpark(c, 0, 0, 17, COL.paper); c.restore();
        }
      },
    });
  }
  // 领奖台
  const podX = POD.x, podY = POD.y, steps = [[0, 1.1, '2'], [1, 1.9, '1'], [2, .8, '3']];
  const hopU = seg(t, T.hop, T.hop + .6);
  steps.forEach(([i, hh, num]) => {
    const u = grow(t, T.phone + .1 + i * .12, .4, 1.5);
    box(podX + i * 1.5, podY, 0, 1.5, 1.9, hh * u, i === 1 ? mixc(COL.violet, '#FFF6E8', .55) : COL.gray, {
      L: (c, fw, fh) => { c.fillStyle = COL.ink; c.globalAlpha = .75; c.font = SANS(700, fh * .5); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(num, fw / 2, fh * .48); },
    });
  });
  // Muse 方块：升起 → 跳上第一名
  if (t >= T.muse) {
    const m = museState(t);
    const sq = m.hopU >= 1 ? 1 - .12 * Math.exp(-(t - T.hop - .6) * 11) * Math.abs(Math.cos((t - T.hop - .6) * 22)) : 1;
    qpush(m.x + m.y + m.z + 1.45 * 1.5 + 8, () => { drawMuseCubeNow(m.x, m.y, m.z, m.s, sq); });
  }
  // 第一名图标堆（Isotype）
  if (t >= T.rank) {
    const u = grow(t, T.rank, .4, 2), z = 4.4;
    qpush(30, () => {
      const [px, py] = P(podX + 2.2, podY + 1.0, z); ctx.save(); ctx.translate(px, py - 6); ctx.scale(u, u);
      const r = V.k * .62; ctx.fillStyle = COL.mustard; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = COL.ink; ctx.stroke();
      ctx.fillStyle = COL.ink; ctx.font = SANS(700, r * 1.15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('#1', 0, r * .05);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .5, sp = grow(t, T.rank + .1 + i * .06, .3, 2.2); iSpark(ctx, Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45 - r * .1, V.k * .13 * sp, COL.mustard); }
      ctx.restore();
    });
  }
  pin('pin-meta', 'Meta', 6.8, 1.1, 2.3, T.meta, 5.5, { up: 70 });
  { const m = museState(t); pin('pin-muse', 'MUSE', m.x, m.y + m.s, m.z + m.s, T.muse + .1, 5.9, { up: 125, side: -1, hue: 'violet', sub: '个人 AI 智能体' }); }
}
function drawMuseCubeNow(x, y, z, s, sq = 1) {
  if (s <= .01) return;
  drawBox(x, y, z, s, s, s * sq, hue('violet', true), {
    top: (c, fw, fh) => iSpark(c, fw / 2, fh / 2, Math.min(fw, fh) * .3, COL.paper),
    R: (c, fw, fh) => { c.font = SANS(700, fh * .30); c.fillStyle = COL.paper; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = (fh * .03) + 'px'; c.fillText('MUSE', fw / 2, fh / 2); c.letterSpacing = '0px'; },
    L: (c, fw, fh) => iSpark(c, fw / 2, fh / 2, fh * .22, COL.paper),
  });
}

// ═══════════ 通用：开合的房间（剖面）═══════════
const hatch = (c, fw, fh) => { c.strokeStyle = 'rgba(35,26,44,0.38)'; c.lineWidth = 2; for (let i = -fh; i < fw; i += 14) { c.beginPath(); c.moveTo(i, fh); c.lineTo(i + fh, 0); c.stroke(); } };
function tierBox(x, y, z, w, d, h, col, openP, inner, closedDeco) {
  if (openP <= .001) { box(x, y, z, w, d, h, col, closedDeco || {}); return; }
  const th = .14, s = ss(openP), a = 1 - s;
  box(x, y, z, w, d, .1, mixc(col, '#FFF6E8', .3));
  box(x, y, z, th, d, h, col, { top: hatch }); box(x, y, z, w, th, h, col, { top: hatch });
  inner(s);
  if (a > .01) {
    box(x + w - th + s * 2.4, y, z, th, d, h, col, { alpha: a });
    box(x, y + d - th + s * 2.4, z, w, th, h, col, { alpha: a });
    box(x, y, z + h - th + s * 2.6, w, d, th, col, { alpha: a });
  }
}
function ground(pts, col, lw = 3.2, dash = [12, 9], prog = 1) {                // 地面折线（虚线），prog 控制画出的比例
  const L = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let acc = 0; ctx.save(); ctx.setLineDash(dash); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
  const want = tot * clamp(prog);
  for (let i = 1; i < pts.length; i++) {
    const take = Math.min(L[i - 1], Math.max(0, want - acc)); if (take <= 0) break;
    const u = take / L[i - 1], ax = pts[i - 1][0], ay = pts[i - 1][1], bx = ax + (pts[i][0] - ax) * u, by = ay + (pts[i][1] - ay) * u;
    const [px, py] = P(ax, ay, .03), [qx, qy] = P(bx, by, .03); ctx.moveTo(px, py); ctx.lineTo(qx, qy); acc += L[i - 1];
  }
  ctx.stroke(); ctx.restore();
}
function alongPath(pts, u) {
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let d = u * tot; for (let i = 1; i < pts.length; i++) { if (d <= L[i - 1]) { const q = d / L[i - 1]; return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; } d -= L[i - 1]; }
  return pts[pts.length - 1];
}
function badge(wx, wy, wz, t0, t, col = 'teal') {                                // Isotype 对勾徽章（弹出）
  if (t < t0) return; const u = grow(t, t0, .32, 2.4);
  qpush(wx + wy + wz + 4, () => { const [px, py] = P(wx, wy, wz); ctx.save(); ctx.translate(px, py); ctx.scale(u, u); iCheck(ctx, 0, 0, V.k * .3, COL.paper, hue(col)); ctx.restore(); });
}

// ═══════════ 工位二：Muse 本体 ═══════════
const TW = { x: 8.9, y: 3.3, w: 3.0 };
const APPS = [[13.4, 2.0, iMail], [13.4, 3.9, iCal], [13.4, 5.9, iDoc], [13.4, 7.8, iChat]];
const appPath = i => [[TW.x + TW.w - .2, 4.8], [12.9, 4.8], [12.9, APPS[i][1] + .65], [13.4, APPS[i][1] + .65]];
function groundCore(t) {
  APPS.forEach((a, i) => { const p = seg(t, T.cross + i * .12, T.cross + .7 + i * .12); if (p > 0) ground(appPath(i), 'rgba(35,26,44,0.6)', 3.4, [12, 8], p); });
}
function sceneCore(t) {
  const g = [grow(t, T.tower, .5, 1.5), grow(t, T.tower + .22, .5, 1.5), grow(t, T.tower + .44, .5, 1.5)];
  const x = TW.x, y = TW.y, w = TW.w;
  if (t >= T.tower) {
    box(x, y, 0, w, w, .7 * g[0], mixc(COL.violet, '#231A2C', .38));
    const openVm = seg(t, T.openVm, T.openVm + .7), openTop = seg(t, T.openTop, T.openTop + .7);
    if (g[1] > .02) tierBox(x + .25, y + .25, .7, w - .5, w - .5, 2.1 * g[1], hue('teal'), openVm, (s) => {
      const bx = x + .25, by = y + .25;
      box(bx + .45, by + .35, .8, 1.9, .16, 1.25, COL.graphite, {                            // 显示器：浏览器窗口
        L: (c, fw, fh) => {
          c.fillStyle = '#F7F2E6'; c.fillRect(6, 6, fw - 12, fh - 12); c.fillStyle = COL.teal; c.fillRect(6, 6, fw - 12, 13);
          [0, 1, 2].forEach(i => { c.fillStyle = COL.paper; c.beginPath(); c.arc(16 + i * 11, 12.5, 3, 0, TAU); c.fill(); });
          c.fillStyle = '#E3DCCB'; c.fillRect(14, 26, (fw - 28) * .7, 7); c.fillRect(14, 38, (fw - 28) * .5, 7); c.fillStyle = mixc(COL.teal, '#F7F2E6', .55); c.fillRect(14, 50, (fw - 28), 14);
        },
      });
      box(bx + 1.2, by + .35, .8, .5, .3, .08, COL.graphite);
      box(bx + 1.0, by + 1.15, .8, 1.0, 1.0, .1, mixc(COL.teal, '#FFF6E8', .45), { top: (c, fw, fh) => iLock(c, fw / 2, fh / 2 - 2, fh * .5, COL.teal) });
    }, { L: (c, fw, fh) => { iLock(c, fw / 2, fh / 2 - 6, fh * .45, COL.paper); }, R: (c, fw, fh) => { c.font = SANS(700, fh * .28); c.fillStyle = COL.paper; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '6px'; c.fillText('VM', fw / 2, fh / 2); c.letterSpacing = '0px'; } });
    if (g[2] > .02) tierBox(x + .45, y + .45, 2.8, w - .9, w - .9, 1.6 * g[2], hue('violet', true), openTop, (s) => {
      const cx = x + w / 2, cy = y + w / 2, bob = Math.sin(t * 3) * .08;
      qpush(cx + cy + 4.1, () => {
        const [gx, gy] = P(cx, cy, 3.9 + bob), r = V.k * .52 * ss(s * 1.4); if (r < 1) return;
        ctx.save(); ctx.translate(gx, gy); ctx.strokeStyle = 'rgba(123,92,245,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 10; i++) { const a = t * .9 + i * TAU / 10; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.4, Math.sin(a) * r * .8); ctx.lineTo(Math.cos(a) * r * (1.9 + .25 * Math.sin(t * 5 + i)), Math.sin(a) * r * (1.05 + .15 * Math.sin(t * 5 + i))); ctx.stroke(); }
        const Tn = tone(COL.violet), pts = { t: [0, -r], l: [-r * .8, 0], rr: [r * .8, 0], b: [0, r * 1.2], m: [0, 0] };
        poly([pts.t, pts.l, pts.m], Tn.top); poly([pts.t, pts.rr, pts.m], Tn.L); poly([pts.l, pts.b, pts.m], Tn.L); poly([pts.rr, pts.b, pts.m], Tn.R);
        iSpark(ctx, 0, -r * .15, r * .32, COL.paper); ctx.restore();
      });
    }, { top: (c, fw, fh) => iSpark(c, fw / 2, fh / 2, Math.min(fw, fh) * .3, COL.paper), R: (c, fw, fh) => { c.font = SANS(700, fh * .3); c.fillStyle = COL.paper; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '4px'; c.fillText('SPARK', fw / 2, fh / 2); c.letterSpacing = '0px'; } });
  }
  // 跨应用：四个应用块 + 包裹沿线
  APPS.forEach(([ax, ay, ic], i) => {
    if (t < T.cross + i * .12) return; const u = grow(t, T.cross + i * .12, .4, 1.8);
    box(ax, ay, 0, 1.3, 1.3, .32 * u, hue('mustard'), { top: (c, fw, fh) => { c.save(); c.translate(0, 0); ic(c, fw / 2, fh / 2, fh * .55, COL.ink); c.restore(); } });
    badge(ax + .65, ay + .65, 1.5, T.checks[i], t);
  });
  if (t > T.cross + .5 && t < T.work + 1.3) APPS.forEach((a, i) => {
    const u = ((t - T.cross - .4 - i * .1) * .85) % 1; if (u < 0 || t < T.cross + .4 + i * .1) return; const [px, py] = alongPath(appPath(i), u);
    box(px - .16, py - .16, .12, .32, .32, .32, hue('violet', true), { bias: 2 });
  });
  if (t >= T.tower + .3) person(10.2, 8.8, 0, { pose: 1, col: 'coral', s: 1.0 });
  pin('pin-spark', 'Muse Spark 模型', TW.x + 1.5, TW.y + 1.5, 4.0, 7.8, 12.7, { up: 130, hue: 'violet', side: 1 });
  pin('pin-vm', '专属安全虚拟机', TW.x + 1.2, TW.y + .6, 2.05, 9.4, 12.9, { up: 90, hue: 'teal', side: -1 });
  pin('pin-cross', '跨应用', 12.9, 4.8, .05, 11.3, 13.65, { up: 95, side: 1 });
}

// ═══════════ 工位三：数字形象、视频、眼镜 ═══════════
function sceneReach(t) {
  const bu = i => grow(t, T.avatar + i * .12, .4, 1.6), skin = hue('coral');
  const sk = mixc('#F6C9A6', '#BDB4A5', GREY * .6);
  if (t >= T.avatar) {
    box(16.1, 2.5, 0, 1.9, 1.9, .5 * bu(0), mixc(COL.coral, '#231A2C', .3));
    if (bu(1) > .02) box(16.45, 2.85, .5, 1.2, 1.2, .95 * bu(1), skin);
    if (bu(2) > .02) box(16.85, 3.25, 1.45, .4, .4, .3 * bu(2), sk);
    if (bu(3) > .02) box(16.55, 2.95, 1.75, 1.0, 1.0, 1.0 * bu(3), sk, { L: (c, fw, fh) => { if (bu(5) > .5) { c.fillStyle = COL.ink; [.3, .7].forEach(p => { c.beginPath(); c.arc(fw * p, fh * .5, fh * .06, 0, TAU); c.fill(); }); c.strokeStyle = COL.ink; c.lineWidth = 3; c.beginPath(); c.arc(fw / 2, fh * .66, fh * .1, .15 * Math.PI, .85 * Math.PI); c.stroke(); } } });
    if (bu(4) > .02) box(16.5, 2.9, 2.75, 1.1, 1.1, .28 * bu(4), COL.ink);
  }
  if (t >= T.call) {                                                    // 视频通话窗口
    const u = grow(t, T.call, .45, 1.6);
    box(18.4, 1.7, 0, 1.0, .7, .3 * u, COL.graphite);
    box(17.8, 1.95, .3, 3.3, .26, 2.3 * u, COL.sky, {
      L: (c, fw, fh) => {
        c.fillStyle = '#1C2A44'; c.fillRect(8, 8, fw - 16, fh - 16);
        const bw = (fw - 16) / 2; iBust(c, 8 + bw * .5, fh * .55, fh * .5, hue('coral')); iBust(c, 8 + bw * 1.5, fh * .55, fh * .5, mixc(COL.coral, '#FFF6E8', .45));
        c.fillStyle = COL.paper; c.fillRect(8 + bw, 14, 2, fh - 28);
        const blink = Math.sin(CUR_T * 8) > 0; c.fillStyle = blink ? '#FF5A5F' : '#7a3b3f'; c.beginPath(); c.arc(30, 24, 6, 0, TAU); c.fill(); c.fillStyle = COL.paper; c.font = SANS(700, 17); c.textBaseline = 'middle'; c.fillText('LIVE', 42, 25);
      },
    });
    qpush(40, () => {                                                    // 信号弧
      const [px, py] = P(19.45, 2.1, 2.9);
      for (let i = 0; i < 3; i++) { const p = (((t - T.call) * 1.4 - i * .28) % 1 + 1) % 1, r = V.k * (.3 + .35 * i); ctx.strokeStyle = hue('sky'); ctx.globalAlpha = .9 - i * .25; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(px, py - V.k * .1, r, -Math.PI * .8, -Math.PI * .2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    });
  }
  if (t >= T.glasses) {                                                  // 智能眼镜
    const u = grow(t, T.glasses, .5, 1.5), bob = Math.sin(t * 3) * .08, z = 1.5 * u + bob;
    const gx = 19.0, gy = 7.0, lens = (lx) => box(lx, gy, z, 1.05, .2, .8, COL.ink, { L: (c, fw, fh) => { c.fillStyle = mixc(COL.sky, '#231A2C', .35); c.fillRect(5, 5, fw - 10, fh - 10); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(12, fh - 8); c.lineTo(28, 8); c.lineTo(38, 8); c.lineTo(22, fh - 8); c.fill(); } });
    lens(gx); lens(gx + 1.5); box(gx + 1.05, gy, z + .5, .45, .2, .14, COL.ink);
    box(gx - .02, gy - 1.2, z + .56, .14, 1.2, .14, COL.ink); box(gx + 2.43, gy - 1.2, z + .56, .14, 1.2, .14, COL.ink);
  }
  if (t >= 14.0) person(18.2, 8.9, 0, { pose: 0, col: 'coral', s: .85 * grow(t, 14.0, .4, 1.8) });
  if (t > T.waves && t < T.waves + 2.4) qpush(60, () => {
    const [sx, sy] = P(18.2, 8.9, 1.5), [ex, ey] = P(20.2, 7.2, 1.9);
    for (let i = 0; i < 4; i++) { const p = (((t - T.waves) * .9 - i * .22) % 1 + 1) % 1; const x = lerp(sx, ex, p), y = lerp(sy, ey, p), r = V.k * (.12 + .22 * p); ctx.strokeStyle = hue('sky'); ctx.globalAlpha = (1 - p) * .9; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  });
  pin('pin-avatar', '数字形象', 17.05, 3.45, 3.1, T.avatar + .4, 19.3, { up: 100, side: -1, hue: 'coral', sub: '即将上线' });
  pin('pin-call', '实时视频聊天', 19.45, 2.1, 2.6, T.call, 19.3, { up: 80, side: 1, hue: 'sky' });
  pin('pin-glasses', '眼镜', 20.0, 7.1, 2.4, T.glasses, 19.5, { up: 95, side: 1, hue: 'sky', sub: '智能眼镜 · 即将上线' });
}

// ═══════════ 工位四：小企业版 ═══════════
const HUB = { x: 27.65, y: 4.55 };
const TILE_POS = [-150, -90, -30, 30, 90, 150].map(a => [HUB.x + .75 + 3.5 * Math.cos(a * Math.PI / 180) - .8, HUB.y + .75 + 3.4 * Math.sin(a * Math.PI / 180) - .8]);
const TILE_T = [22.36, 22.88, 23.2, 23.42, 23.6, 23.78];
const LOGO = {};
const sinkU = t => ss(seg(t, 27.2, 27.55)) * (1 - ss(seg(t, T.pull, T.pull + .5)));
function groundWork(t) {
  if (t >= T.shop + .5) ground([[25.1, 5.3], [HUB.x, 5.3]], 'rgba(35,26,44,0.55)', 3.2, [12, 8], seg(t, T.shop + .5, T.shop + 1.0));
  TILE_POS.forEach(([tx, ty], i) => { const p = seg(t, TILE_T[i] - .15, TILE_T[i] + .4) * (1 - sinkU(t)); if (p > 0) ground([[HUB.x + .75, HUB.y + .75], [tx + .8, ty + .8]], 'rgba(35,26,44,0.6)', 3.4, [12, 8], p); });
}
function sceneWork(t) {
  const sk = sinkU(t);
  calendar(29.2, 0.7, '9/29', T.cal2, t);
  if (t >= T.shop) {                                                      // 小店
    const u = grow(t, T.shop, .5, 1.5) * (1 - sk) , sz = -sk * .5;
    box(23.2, 4.3, sz, 1.9, 1.9, 1.5 * u, hue('mustard'), {
      L: (c, fw, fh) => { c.fillStyle = COL.paper; c.fillRect(fw * .15, fh * .38, fw * .3, fh * .36); c.fillStyle = mixc(COL.mustard, '#231A2C', .35); c.fillRect(fw * .58, fh * .3, fw * .26, fh * .7); },
      cT: mixc(COL.mustard, '#FFF6E8', .3),
    });
    if (u > .6) box(23.1, 4.3 + 1.9 - .1, sz + 1.5 * u - .05, 2.1, .55, .12, COL.paper, { L: (c, fw, fh) => { for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? COL.paper : hue('mustard'); c.fillRect(i * fw / 10, 0, fw / 10 + 1, fh); } } });
  }
  // 枢纽（Muse）
  const hubU = grow(t, T.cal2 + .2, .5, 1.6);
  qpush(HUB.x + HUB.y + 3, () => drawMuseCubeNow(HUB.x, HUB.y, 0, 1.5 * hubU));
  // 六块应用牌
  TILES.forEach((nm, i) => {
    if (t < TILE_T[i]) return; const [tx, ty] = TILE_POS[i], u = grow(t, TILE_T[i], .42, 1.9), big = (i === 0 && t < T.canva) || (i === 1 && t < T.others) ? 1 : 0;
    const pop = (i < 2) ? .35 * Math.exp(-(t - TILE_T[i]) * 3) : 0;
    box(tx, ty, -sk * .6 + pop, 1.6, 1.6, .3 * u, hue('mustard'), {
      alpha: 1 - sk * .9,
      top: (c, fw, fh) => {
        c.fillStyle = COL.paper; c.beginPath(); c.roundRect(7, 7, fw - 14, fh - 14, 10); c.fill();
        const lg = LOGO[nm.toLowerCase()];
        if (lg) { const r = Math.min((fw - 30) / lg.width, (fh - 30) / lg.height); c.drawImage(lg, fw / 2 - lg.width * r / 2, fh / 2 - lg.height * r / 2, lg.width * r, lg.height * r); }
        else { c.fillStyle = COL.ink; c.font = SANS(700, nm.length > 5 ? 21 : 25); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, fw / 2, fh / 2 + 2); }
      },
    });
    if (sk < .5) badge(tx + .8, ty + .8, 1.6, T.good + i * .09, t);
  });
  // 隐私：锁落在 Muse 上方，投下阴影
  if (t >= T.lock && t < 27.7) {
    const d = ss(seg(t, T.lock, T.lock + .45)), up = ss(seg(t, 27.2, 27.6)), z = lerp(6.5, 3.3, d) + up * 4, a = 1 - up;
    const sh = d * .32 * a;
    qpush(HUB.x + HUB.y - 1, () => { ctx.save(); ctx.globalAlpha = sh; const q = [P(HUB.x - .6, HUB.y - .3, .03), P(HUB.x + 2.7, HUB.y - .3, .03), P(HUB.x + 2.7, HUB.y + 3.0, .03), P(HUB.x - .6, HUB.y + 3.0, .03)]; poly(q, COL.ink); ctx.restore(); });
    qpush(HUB.x + HUB.y + 14, () => {
      const [px, py] = P(HUB.x + .75, HUB.y + .75, z), s = V.k * 1.9; ctx.save(); ctx.globalAlpha = a; ctx.translate(px, py); iLock(ctx, 0, 0, s * .8, hue('graphite', true));
      const wob = t < T.lock + .9 ? Math.sin((t - T.lock) * 30) * Math.exp(-(t - T.lock) * 4) * .05 : 0; ctx.rotate(wob); ctx.restore();
    });
  }
  pin('pin-shop', '小企业版', 24.0, 5.3, 1.7, T.shop + .2, 24.8, { up: 105, side: -1, hue: 'mustard' });
  pin('pin-privacy', '隐私', HUB.x + .75, HUB.y + .75, 3.3, T.lock + .0, 27.45, { up: 150, side: 1, hue: 'ink', sub: '数据交给谁？' });
  // 终问：事情的包裹
  if (t >= T.ask - .1) {
    const pu = ss(seg(t, T.ask - .1, T.ask + .3));
    person(24.0, 6.6, 0, { pose: t < T.pkg + .9 ? 2 : 3, col: 'coral', s: .95 * pu });
    if (t >= T.pkg) {
      const u = ss(seg(t, T.pkg, T.pkg + .9)), bob = t > T.pkg + .9 ? Math.sin((t - T.pkg) * 5) * .08 : 0;
      const bx = lerp(24.7, 26.3, u), by = lerp(6.2, 5.4, u), bz = lerp(1.1, 1.9, u) + bob;
      box(bx, by, bz, .9, .9, .7, hue('mustard'), { top: (c, fw, fh) => { c.fillStyle = COL.ink; c.globalAlpha = .55; c.fillRect(fw * .42, 0, fw * .16, fh); c.fillRect(0, fh * .42, fw, fh * .16); } });
    }
    if (t >= T.qmark) { const u = grow(t, T.qmark, .4, 2.4); qpush(80, () => { const [px, py] = P(26.6, 5.0, 4.2 + Math.sin(t * 4) * .06); ctx.save(); ctx.translate(px, py); ctx.scale(u, u); ctx.fillStyle = COL.ink; ctx.font = SANS(700, V.k * 2.1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 0); ctx.restore(); }); }
  }
}

// ═══════════ 收尾图例 ═══════════
const KEY = [['violet', 'Muse 本体'], ['teal', '安全虚拟机'], ['mustard', '应用与企业'], ['coral', '数字形象'], ['sky', '视频与眼镜'], ['graphite', '隐私']];
function drawLegend(t) {
  if (t < T.legend) return;
  const a = ss(seg(t, T.legend, T.legend + .4)), x = W - 560, y = 70;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(251,247,238,0.94)'; ctx.beginPath(); ctx.roundRect(x - 26, y - 22, 520, 560, 14); ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke();
  halo('MUSE', x, y + 62, SANS(700, 76), COL.violet, 'left', 0); ctx.letterSpacing = '0px';
  halo('一块沙盘，四个工位', x, y + 112, SANS(500, 32), COL.ink, 'left', 0);
  KEY.forEach(([h, nm], i) => {
    const u = grow(t, T.legend + .15 + i * .12, .35, 2), yy = y + 190 + i * 56;
    ctx.save(); ctx.translate(x + 20, yy); ctx.scale(u, u);
    const T3 = tone(COL[h]), s = 15, pt = (a2, b, c2) => [(a2 - b) * C30 * s, ((a2 + b) / 2 - c2) * s];
    const face = (arr, col) => { ctx.beginPath(); arr.forEach(([a2, b, c2], j) => { const [px, py] = pt(a2, b, c2); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
    face([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], T3.top); face([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], T3.L); face([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], T3.R); ctx.restore();
    ctx.globalAlpha = a * clamp(u); ctx.fillStyle = COL.ink; ctx.font = SANS(500, 31); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(nm, x + 62, yy + 2); ctx.globalAlpha = a;
    TEXTS_NOW.push({ id: 'key' + i, text: nm, x0: x + 62, y0: yy - 18, x1: x + 62 + ctx.measureText(nm).width, y1: yy + 18 });
  });
  ctx.fillStyle = COL.ink; ctx.globalAlpha = a * .55; ctx.font = SANS(600, 22); ctx.letterSpacing = '5px'; ctx.textBaseline = 'alphabetic'; ctx.fillText('NOT TO SCALE', x, y + 520); ctx.letterSpacing = '0px';
  ctx.restore();
  ctx.save(); ctx.globalAlpha = a * .8; ctx.textAlign = 'right'; ctx.fillStyle = COL.ink; ctx.font = SANS(500, 26); ctx.fillText('资料：Meta、TechCrunch、CNBC · 2026 年 9 月', W - 70, H - 56); ctx.restore();
}

// ───────── 画面级：画中画、字幕、图例 ─────────
const NF = 721, frames = Array.from({ length: NF }, (_, i) => { const im = new Image(); im.src = `src/frames/${String(i + 1).padStart(4, '0')}.jpg`; return im; });
function drawPip(t0) {
  const t = POSTER ? HOST_T : t0, out = POSTER ? 0 : ss(seg(t, T.pipOut, T.pipOut + .6)); if (out >= 1) return;
  const w = 330, h = 443, x = W - 40 - w, y = 40 - out * (h + 80);
  ctx.save(); ctx.filter = 'none';
  ctx.shadowColor = 'rgba(35,26,44,0.28)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8; ctx.fillStyle = COL.paper; ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.clip();
  ctx.drawImage(frames[clamp(Math.floor(t * 24 + 1e-4), 0, NF - 1)], x, y, w, h); ctx.restore();
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.stroke();
  ctx.restore();
}
function drawCaption(t) {
  const c = CUES.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const f = SANS(500, 42); ctx.font = f; const tw = ctx.measureText(c.text).width, cw = tw + 128, ch = 78, x = W / 2 - cw / 2, y = H - 150 + 10;
  const k = eo(seg(t, c.t0, c.t0 + .22)), out = 1 - seg(t, c.t1 - .1, c.t1);
  ctx.save(); ctx.globalAlpha = out;
  ctx.fillStyle = 'rgba(251,247,238,0.97)'; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 14); ctx.fill();
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.setLineDash([cw * 2 + ch * 2]); ctx.lineDashOffset = (1 - clamp(k * 2)) * (cw * 2 + ch * 2); ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 14); ctx.stroke(); ctx.setLineDash([]);
  const cx = x + 40, cy = y + ch / 2;                                        // 图例小方块
  ctx.save(); ctx.translate(cx, cy + 3); const u = 11; const T3 = tone(COL.violet);
  const pt = (a, b, c2) => [(a - b) * C30 * u, ((a + b) / 2 - c2) * u];
  const face = (arr, col) => { ctx.beginPath(); arr.forEach(([a, b, c2], i) => { const [px, py] = pt(a, b, c2); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  face([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], T3.top); face([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], T3.L); face([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], T3.R); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x + 70, y, (cw - 70) * ss((k - .35) / .65), ch); ctx.clip();
  ctx.font = f; ctx.fillStyle = COL.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(c.text, x + 70, cy + 2); ctx.restore();
  ctx.restore();
}

// ───────── 总渲染 ─────────
const QS = new URLSearchParams(location.search), POSTER = QS.has('poster'), HOST_T = parseFloat(QS.get('host') || '24.95');   // ?poster=1：去掉字幕，叠标题，供导出海报
function drawPosterTitle() {
  const x = 80, y = 230;
  halo('MUSE', x, y, SANS(700, 200), COL.violet, 'left', 14); halo('把事情交给它吗？', x, y + 100, SANS(700, 78), COL.ink, 'left', 12);
  halo('个人 AI 智能体 · 2026.9', x, y + 156, SANS(500, 34), COL.graphite, 'left', 9);
}
window.DUR = TL.DUR; window.EV = TL.EV;
window.render = (t) => {
  CUR_T = t; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t); V.cx = c.cx; V.cy = c.cy; V.k = c.k;
  GREY = ss(seg(t, T.privacy - .1, T.privacy + .5)) * (1 - ss(seg(t, 27.2, 27.55)));
  Q = []; PINS = []; TEXTS_NOW = [];
  drawGround(); drawBoard(t); groundCore(t); groundWork(t);
  sceneRank(t); sceneCore(t); sceneReach(t); sceneWork(t);
  Q.sort((a, b) => a.dep - b.dep).forEach(q => q.f());
  if (!POSTER) { drawPins(); drawLegend(t); }
  drawPip(t); if (POSTER) drawPosterTitle(); else drawCaption(t);
};
window.TEXTS = (t) => { window.render(t); return TEXTS_NOW; };

const LOGO_NAMES = ['muse', 'meta', 'slack', 'canva', 'asana', 'zoom', 'intuit', 'box'];
await Promise.all(LOGO_NAMES.map(n => new Promise(res => { const im = new Image(); im.onload = () => { LOGO[n] = im; res(); }; im.onerror = () => res(); im.src = `src/brand/${n}.png`; })));
await Promise.all([document.fonts.load(SANS(600, 30), 'MUSE Meta App Store'), document.fonts.load(SANS(500, 42), '9月8日，登顶苹果应用商店'), document.fonts.load(SANS(700, 40), '01 RANK'),
  ...frames.map(im => im.decode().catch(() => 0))]);
window.READY = true;
