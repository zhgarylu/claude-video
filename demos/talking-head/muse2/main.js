import { clamp, lerp, seg, ss, eio, eo, back, hash, TAU } from '/core/lib.js';
import { loadHost, hostFrame } from '/tools/talk/host.js';
import * as TL from './timeline.js';
const { T, CUES, CARDS, TILES, CONNECT, ROUTE, KEY } = TL;

const W = 1920, H = 1080;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
const QS = new URLSearchParams(location.search), POSTER = QS.has('poster'), POSTER_T = parseFloat(QS.get('at') || '24.6');

// ───────── 色板（等距信息图：一色一义）─────────
const COL = {
  ground: '#E7DCCA', ink: '#231A2C', paper: '#FBF7EE',
  violet: '#7B5CF5', teal: '#1EA79B', mustard: '#F0B23B', coral: '#EF6F5E', sky: '#3E8FE8', graphite: '#5A5F6E',
};
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const tone = c => ({ top: mixc(c, '#FFF6E8', .22), L: c, R: mixc(c, '#231A2C', .24) });
const SANS = (w, s) => `${w} ${s}px Jost, "Noto Sans SC", sans-serif`;
const C30 = Math.cos(Math.PI / 6);

// ───────── 版面：视频是主画面（接近满高），两侧是信息卡 ─────────
const VID = { x: 602, y: 0, w: 715, h: 960 }, S = VID.h / 752;          // 视频 560×752 → 715×960
const host = await loadHost('src');
const NF = host.frames.length;

function vidXf(t) {                                                       // 视频的整体变换：结尾缩到左边
  const p = ss(seg(t, T.pull, T.pull + .75)), sc = lerp(1, .56, p);
  return { sc, cx: lerp(VID.x + VID.w / 2, 330, p), cy: lerp(VID.y + VID.h / 2, 500, p), p };
}
const toScreen = (t, vx, vy) => { const f = vidXf(t); return [f.cx + (vx / 560 - .5) * VID.w * f.sc, f.cy + (vy / 752 - .5) * VID.h * f.sc]; };
function anchorAt(c, t) {                                                 // [t,x,y] 分段线性
  const a = c.anchor; if (t <= a[0][0] || a.length === 1) return [a[0][1], a[0][2]];
  for (let i = 0; i < a.length - 1; i++) if (t <= a[i + 1][0]) { const u = seg(t, a[i][0], a[i + 1][0]); return [lerp(a[i][1], a[i + 1][1], u), lerp(a[i][2], a[i + 1][2], u)]; }
  const l = a[a.length - 1]; return [l[1], l[2]];
}

// 卡片竖直位置：尽量与引线终点同高，同侧同时在场的卡片至少相隔 150px
function allocate() {
  for (const side of ['L', 'R']) {
    const lo = side === 'L' ? 180 : 140, placed = [];
    for (const c of CARDS.filter(c => c.side === side).sort((a, b) => a.t0 - b.t0)) {
      if (c.y) { placed.push(c); continue; }                                  // 手动指定
      const a = anchorAt(c, c.t0), desired = clamp(a[1] * S, lo, 840);
      const cand = [0, 150, -150, 300, -300, 450, -450].map(d => desired + d).filter(y => y >= lo && y <= 840);
      c.y = cand.find(y => placed.every(p => !(p.t0 < c.t1 && c.t0 < p.t1) || Math.abs(p.y - y) >= 150)) ?? desired;
      placed.push(c);
    }
  }
}
allocate();
TL.CONNECT.y = 610;

// ───────── 小图标 ─────────
function iso(x, y, s, col) {                                              // 小等距方块（图例用）
  const t3 = tone(col), pt = (a, b, c) => [x + (a - b) * C30 * s, y + ((a + b) / 2 - c) * s];
  const f = (arr, cl) => { ctx.beginPath(); arr.forEach(([a, b, c], i) => { const [px, py] = pt(a, b, c); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.fillStyle = cl; ctx.fill(); ctx.strokeStyle = cl; ctx.lineWidth = .6; ctx.stroke(); };
  f([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], t3.top); f([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], t3.L); f([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], t3.R);
}
function check(x, y, r, col = COL.teal) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = COL.paper; ctx.lineWidth = r * .3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - r * .42, y + r * .02); ctx.lineTo(x - r * .1, y + r * .34); ctx.lineTo(x + r * .46, y - r * .3); ctx.stroke();
}
function spark(x, y, r, col) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * .14, y - r * .14, x + r, y); ctx.quadraticCurveTo(x + r * .14, y + r * .14, x, y + r); ctx.quadraticCurveTo(x - r * .14, y + r * .14, x - r, y); ctx.quadraticCurveTo(x - r * .14, y - r * .14, x, y - r); ctx.fillStyle = col; ctx.fill(); }
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
function halo(s, x, y, font, color, align = 'left', hw = 8) {
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  if (hw) { ctx.lineWidth = hw; ctx.strokeStyle = COL.ground; ctx.strokeText(s, x, y); } ctx.fillStyle = color; ctx.fillText(s, x, y);
}

// ───────── 背景：奶油底 + 极淡等距点阵 ─────────
const sc8 = document.createElement('canvas'); sc8.width = 8; sc8.height = 8; const sx8 = sc8.getContext('2d', { willReadFrequently: true });
function edgeColors(t) {                                                   // 取视频四角的颜色，让底色跟着视频的底色走（锁出现时画面会变灰变亮）
  sx8.drawImage(hostFrame(host, POSTER ? POSTER_T : Math.min(t, host.duration - .05)), 0, 0, 8, 8);
  const px = (x, y) => sx8.getImageData(x, y, 1, 1).data, a = px(0, 0), b = px(7, 0), c = px(0, 7), d = px(7, 7);
  const mix = (p, q) => [0, 1, 2].map(i => Math.round((p[i] + q[i]) / 2));
  return [mix(a, b), mix(c, d)];
}
function drawGround(t) {
  const [top, bot] = edgeColors(t), k = 1 - ss(seg(t, T.pull, T.pull + .8));                  // 结尾回到固定奶油色
  const m = (v, base) => v.map((x, i) => Math.round(lerp(base[i], x, k)));
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${m(top, [235, 224, 206])})`); g.addColorStop(1, `rgb(${m(bot, [228, 217, 199])})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(35,26,44,0.11)'; const k2 = 56;
  for (let i = -20; i < 50; i++) for (let j = -20; j < 50; j++) {
    const x = 960 + (i - j) * C30 * k2 * .5, y = 400 + (i + j) * .5 * k2 * .5; if (x < 0 || x > W || y < 0 || y > H) continue; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
  }
}

// ───────── 视频（四边羽化，融进奶油底）─────────
const vc = document.createElement('canvas'); vc.width = VID.w; vc.height = VID.h; const vctx = vc.getContext('2d');
function drawVideo(t) {
  const f = vidXf(t), fade = 1 - ss(seg(t, T.vidOut - .4, T.vidOut)); if (fade <= 0) return;
  const tt = POSTER ? POSTER_T : Math.min(t, host.duration - 0.05);
  vctx.globalCompositeOperation = 'source-over'; vctx.clearRect(0, 0, VID.w, VID.h); vctx.drawImage(hostFrame(host, tt), 0, 0, VID.w, VID.h);
  vctx.globalCompositeOperation = 'destination-in';
  let g = vctx.createLinearGradient(0, 0, VID.w, 0); const F = 46 / VID.w; g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(F, '#000'); g.addColorStop(1 - F, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); vctx.fillStyle = g; vctx.fillRect(0, 0, VID.w, VID.h);
  g = vctx.createLinearGradient(0, 0, 0, VID.h); const A = 24 / VID.h, B = 70 / VID.h; g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(A, '#000'); g.addColorStop(1 - B, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); vctx.fillStyle = g; vctx.fillRect(0, 0, VID.w, VID.h);
  ctx.save(); ctx.globalAlpha = fade; ctx.drawImage(vc, f.cx - VID.w * f.sc / 2, f.cy - VID.h * f.sc / 2, VID.w * f.sc, VID.h * f.sc); ctx.restore();
}

// ───────── 信息卡（标签卡 + 引线）─────────
let TEXTS_NOW = [];
function cardMetrics(c) {
  ctx.font = SANS(700, 46); const tw = ctx.measureText(c.title).width; ctx.font = SANS(500, 26); const sw = c.sub ? ctx.measureText(c.sub).width : 0;
  return { w: Math.max(330, Math.max(tw, sw) + 128 + (c.tag ? 0 : 0)), h: c.sub ? 124 : 94, tw };
}
function drawCard(c, t) {
  if (t < c.t0 || t > c.t1 + .05) return;
  const m = cardMetrics(c), u = back(seg(t, c.t0, c.t0 + .4), 1.7), out = 1 - ss(seg(t, c.t1 - .35, c.t1)), a = clamp(u * 2) * out; if (a <= 0) return;
  const dir = c.side === 'L' ? -1 : 1, x = (c.side === 'L' ? 566 - m.w : 1354) + dir * (1 - clamp(u, 0, 1)) * 50 + dir * (1 - out) * 40, y = c.y - m.h / 2;
  ctx.save(); ctx.globalAlpha = a;
  // 引线
  const [ax, ay] = toScreen(t, ...anchorAt(c, t)), sx = c.side === 'L' ? x + m.w : x, sy = c.y, p = ss(seg(t, c.t0 + .12, c.t0 + .55)) * (1 - ss(seg(t, c.objEnd ?? 99, (c.objEnd ?? 99) + .3)));      // 物体消失后引线收回，卡片留作说明
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lerp(sx, ax, p), lerp(sy, ay, p)); ctx.stroke();
  if (p > .92) { ctx.beginPath(); ctx.arc(ax, ay, 9, 0, TAU); ctx.fillStyle = COL.paper; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(ax, ay, 3.2, 0, TAU); ctx.fillStyle = COL[c.hue]; ctx.fill(); }
  // 卡
  ctx.shadowColor = 'rgba(35,26,44,0.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; rr(x, y, m.w, m.h, 16); ctx.fillStyle = 'rgba(251,247,238,0.98)'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; rr(x, y, m.w, m.h, 16); ctx.stroke();
  iso(x + 44, y + m.h / 2 + 12, 20, COL[c.hue]);
  ctx.font = SANS(700, 46); ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; const ty = c.sub ? y + 56 : y + m.h / 2 + 16; ctx.fillText(c.title, x + 84, ty);
  if (c.sub) { ctx.font = SANS(500, 26); ctx.fillStyle = COL.graphite; ctx.fillText(c.sub, x + 84, y + 96); }
  if (c.tag) { ctx.font = SANS(700, 20); const tw2 = ctx.measureText(c.tag).width + 26; rr(x + m.w - tw2 - 14, y - 14, tw2, 30, 15); ctx.fillStyle = COL[c.hue]; ctx.fill(); ctx.fillStyle = COL.paper; ctx.textAlign = 'center'; ctx.fillText(c.tag, x + m.w - tw2 / 2 - 14, y + 7); }
  ctx.restore();
  if (u > .95 && out > .98) TEXTS_NOW.push({ id: 'card-' + c.id, text: c.title, x0: x + 84, y0: ty - 38, x1: x + 84 + m.tw, y1: ty + 8 });
}

// “连接”卡：六块应用牌依次弹出，最后一起打勾
const LOGO = {};
function drawConnect(t) {
  const c = CONNECT; if (t < c.t0 || t > c.t1 + .05) return;
  const u = back(seg(t, c.t0, c.t0 + .4), 1.7), out = 1 - ss(seg(t, c.t1 - .35, c.t1)), a = clamp(u * 2) * out; if (a <= 0) return;
  const w = 470, h = 330, x = 1354 + (1 - clamp(u, 0, 1)) * 50, y = c.y - h / 2;
  ctx.save(); ctx.globalAlpha = a;
  const [ax, ay] = toScreen(t, ...anchorAt(c, t)), p = ss(seg(t, c.t0 + .12, c.t0 + .55));
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, c.y); ctx.lineTo(lerp(x, ax, p), lerp(c.y, ay, p)); ctx.stroke();
  if (p > .92) { ctx.beginPath(); ctx.arc(ax, ay, 9, 0, TAU); ctx.fillStyle = COL.paper; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(ax, ay, 3.2, 0, TAU); ctx.fillStyle = COL.mustard; ctx.fill(); }
  ctx.shadowColor = 'rgba(35,26,44,0.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; rr(x, y, w, h, 16); ctx.fillStyle = 'rgba(251,247,238,0.98)'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; rr(x, y, w, h, 16); ctx.stroke();
  iso(x + 44, y + 58, 20, COL.mustard);
  ctx.font = SANS(700, 44); ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('连接常用软件', x + 84, y + 62);
  TILES.forEach(([nm, t0], i) => {
    if (t < t0) return; const k = back(seg(t, t0, t0 + .35), 2), cx = x + 24 + (i % 2) * 214, cy = y + 96 + Math.floor(i / 2) * 74;
    ctx.save(); ctx.translate(cx + 100, cy + 29); ctx.scale(clamp(k, 0, 1.15), clamp(k, 0, 1.15)); ctx.translate(-100, -29);
    rr(0, 0, 200, 58, 12); ctx.fillStyle = COL.paper; ctx.fill(); ctx.strokeStyle = COL.mustard; ctx.lineWidth = 4; ctx.stroke();
    const lg = LOGO[nm.toLowerCase()];
    if (lg) { const r = Math.min(150 / lg.width, 40 / lg.height); ctx.drawImage(lg, 100 - lg.width * r / 2, 29 - lg.height * r / 2, lg.width * r, lg.height * r); }
    else { ctx.font = SANS(700, 30); ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nm, 100, 31); }
    if (t >= c.checks + i * .09) check(180, 29, 14 * back(seg(t, c.checks + i * .09, c.checks + i * .09 + .3), 2.4));
    ctx.restore();
    if (k > .95 && out > .98) TEXTS_NOW.push({ id: 'tile-' + nm, text: nm, x0: cx + 30, y0: cy + 12, x1: cx + 150, y1: cy + 46 });
  });
  ctx.restore();
}

// ───────── 路线条、品牌角标、字幕 ─────────
function drawRoute(t) {
  let cur = 0; ROUTE.forEach(([, , t0], i) => { if (t >= t0) cur = i; });
  let x = 60; const y = 56, a = 1 - ss(seg(t, T.pull, T.pull + .4));
  ctx.save(); ctx.globalAlpha = a;
  ROUTE.forEach(([no, nm], i) => {
    ctx.font = SANS(700, 22); const w = ctx.measureText(`${no}  ${nm}`).width + 34;
    rr(x, y, w, 40, 20);
    if (i === cur) { ctx.fillStyle = COL.violet; ctx.fill(); ctx.fillStyle = COL.paper; }
    else if (i < cur) { ctx.fillStyle = 'rgba(35,26,44,0.12)'; ctx.fill(); ctx.fillStyle = COL.ink; }
    else { ctx.strokeStyle = 'rgba(35,26,44,0.38)'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(35,26,44,0.5)'; }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(`${no}  ${nm}`, x + 17, y + 21); x += w + 10;
  });
  ctx.restore();
}
function drawBrand(t) {
  const a = 1 - ss(seg(t, T.pull, T.pull + .4)); ctx.save(); ctx.globalAlpha = a; spark(1706, 64, 17, COL.violet);
  ctx.font = SANS(700, 38); ctx.fillStyle = COL.violet; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '4px'; ctx.fillText('MUSE', 1736, 66); ctx.letterSpacing = '0px'; ctx.restore();
}
function drawCaption(t) {
  const c = CUES.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const f = SANS(500, 42); ctx.font = f; const tw = ctx.measureText(c.text).width, cw = tw + 128, ch = 78, x = W / 2 - cw / 2, y = H - 140;
  const k = eo(seg(t, c.t0, c.t0 + .22)), out = 1 - seg(t, c.t1 - .1, c.t1);
  ctx.save(); ctx.globalAlpha = out; ctx.fillStyle = 'rgba(251,247,238,0.97)'; rr(x, y, cw, ch, 14); ctx.fill();
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.setLineDash([cw * 2 + ch * 2]); ctx.lineDashOffset = (1 - clamp(k * 2)) * (cw * 2 + ch * 2); rr(x, y, cw, ch, 14); ctx.stroke(); ctx.setLineDash([]);
  iso(x + 40, y + ch / 2 + 7, 11, COL.violet);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 70, y, (cw - 70) * ss((k - .35) / .65), ch); ctx.clip();
  ctx.font = f; ctx.fillStyle = COL.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(c.text, x + 70, y + ch / 2 + 2); ctx.restore(); ctx.restore();
}

// ───────── 结尾：视频缩到左边，右边是系统总览 ─────────
function drawEnd(t) {
  if (t < T.legend) return; const a = ss(seg(t, T.legend, T.legend + .4)), x = 640;
  ctx.save(); ctx.globalAlpha = a;
  halo('MUSE', x, 270, SANS(700, 190), COL.violet, 'left', 0); halo('把事情交给它吗？', x, 366, SANS(700, 76), COL.ink, 'left', 0);
  halo('一条沙盘上的五件事', x, 424, SANS(500, 34), COL.graphite, 'left', 0);
  KEY.forEach(([h, nm], i) => {
    const u = back(seg(t, T.legend + .15 + i * .1, T.legend + .5 + i * .1), 2), yy = 500 + i * 62;
    ctx.save(); ctx.translate(x + 20, yy); ctx.scale(clamp(u, 0, 1.1), clamp(u, 0, 1.1)); iso(0, 8, 17, COL[h]); ctx.restore();
    ctx.globalAlpha = a * clamp(u); ctx.font = SANS(500, 34); ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(nm, x + 68, yy + 6); ctx.globalAlpha = a;
    if (u > .95) TEXTS_NOW.push({ id: 'key' + i, text: nm, x0: x + 68, y0: yy - 20, x1: x + 68 + ctx.measureText(nm).width, y1: yy + 30 });
  });
  ctx.fillStyle = COL.ink; ctx.globalAlpha = a * .6; ctx.font = SANS(600, 22); ctx.letterSpacing = '5px'; ctx.textBaseline = 'alphabetic'; ctx.fillText('NOT TO SCALE', x, 890); ctx.letterSpacing = '0px';
  ctx.globalAlpha = a * .85; ctx.font = SANS(500, 26); ctx.textAlign = 'right'; ctx.fillText('资料：Meta、TechCrunch、CNBC · 2026 年 9 月', W - 70, 1010);
  ctx.restore();
}

// ───────── 总渲染 ─────────
window.DUR = TL.DUR; window.EV = TL.EV;
window.render = (t0) => {
  const t = POSTER ? POSTER_T : t0;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; TEXTS_NOW = [];
  drawGround(t); drawVideo(t);
  if (!POSTER) { drawRoute(t); drawBrand(t); CARDS.forEach(c => drawCard(c, t)); drawConnect(t); drawCaption(t); drawEnd(t); }
  else drawPoster();
};
function drawPoster() {
  CARDS.forEach(c => drawCard(c, POSTER_T)); drawConnect(POSTER_T);
  halo('MUSE', 70, 250, SANS(700, 200), COL.violet, 'left', 12); halo('把事情交给它吗？', 70, 346, SANS(700, 78), COL.ink, 'left', 10);
  halo('个人 AI 智能体 · 2026.9', 70, 406, SANS(500, 34), COL.graphite, 'left', 8);
}
window.TEXTS = (t) => { window.render(t); return TEXTS_NOW; };

const LOGO_NAMES = ['muse', 'meta', 'slack', 'canva', 'asana', 'zoom', 'intuit', 'box'];
await Promise.all(LOGO_NAMES.map(n => new Promise(res => { const im = new Image(); im.onload = () => { LOGO[n] = im; res(); }; im.onerror = () => res(); im.src = `src/brand/${n}.png`; })));
await Promise.all([document.fonts.load(SANS(600, 30), 'MUSE Meta App Store'), document.fonts.load(SANS(500, 42), '9月8日，登顶苹果应用商店'), document.fonts.load(SANS(700, 46), '专属安全虚拟机')]);
window.READY = true;
