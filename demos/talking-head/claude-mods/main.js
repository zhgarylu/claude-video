import { clamp, lerp, seg, ss, eio, eo, ei, back, spring, hash, TAU } from '/core/lib.js';
import * as TL from './timeline.js';
const { T, TYPE, CUES, CHAPTERS, CAM } = TL;

const W = 1920, H = 1080;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');

// ───────── 色板：冷中性阶梯 + 一个强调色 + 问题色 ─────────
const C = {
  bg: '#05070c', s1: '#0a0f18', s2: '#0e1522', s3: '#141d2d', s4: '#1b2639',
  line: 'rgba(255,255,255,0.08)', t1: '#e9eef8', t2: '#98a4bb', t3: '#5d6a82',
  ac: '#8b7cff', acRGB: '139,124,255', red: '#ff5a5f', redRGB: '255,90,95',
};
const SANS = (w, s) => `${w} ${s}px Inter, "Noto Sans SC", sans-serif`;
const MONO = (w, s) => `${w} ${s}px "JetBrains Mono", "Noto Sans SC", monospace`;

// ───────── 版面 ─────────
const HP = { x: 64, y: 48, w: 670, h: 900, r: 28 };       // 讲者面板
const CP0 = { x: 784, y: 48, w: 1072, h: 900, r: 28 };    // 内容面板（收尾时居中）
const WIN = { w: 868, h: 726, r: 18 };                      // 工作台窗口（世界坐标）
const ANCH = { x: 536, y: 516 };                           // 取景区(章标下方 132px 起)的中心
const HEAD = 132;                           // 面板内：镜头中心点对应的位置
const PANE = { x: 576, y: 70, w: 268, h: 490 };
const BAND = { x: 24, y: 574, w: 820, h: 40 };
const PROMPT = { x: 24, y: 622, w: 820, h: 54 };
const STATUS = { y: 692, h: 34 };
const TR = { x: 28, y: 104, w: 532 };                       // 转录区

// ───────── 基础绘制 ─────────
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function fillRR(x, y, w, h, r, fill) { rr(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
function strokeRR(x, y, w, h, r, col, lw = 1) { rr(x, y, w, h, r); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); }
function text(s, x, y, o = {}) {
  ctx.font = o.font || SANS(500, 16); ctx.fillStyle = o.color || C.t1;
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
  ctx.letterSpacing = o.ls || '0px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.fillText(s, x, y);
  ctx.letterSpacing = '0px';
}
function tw(s, font, ls = 0) { ctx.font = font; ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.letterSpacing = '0px'; return w; }
function rgba(rgb, a) { return `rgba(${rgb},${a})`; }
function glow(col, blur, fn) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = blur; fn(); ctx.restore(); }
const GL = '▒░▓#%&@$01<>{}[]/=+*';
function scramble(str, lockedFromRight, t, seed = 0, lockedFromLeft = 0) {
  let out = ''; const fr = Math.floor(t * 24);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === ' ' || i < lockedFromLeft || i >= str.length - lockedFromRight) out += ch;
    else out += GL[Math.floor(hash(fr * 13.7 + i * 3.1 + seed) * GL.length)];
  }
  return out;
}
const ta = t => t < T.freezeA ? t : t < T.freezeB ? T.freezeA : t - (T.freezeB - T.freezeA);   // 冻结时环境运动停住

// ───────── 素材：口播逐帧 + 人声包络 ─────────
const NF = 721;
const frames = Array.from({ length: NF }, (_, i) => { const im = new Image(); im.src = `src/frames/${String(i + 1).padStart(4, '0')}.jpg`; return im; });
const ENV = await fetch('src/env.json').then(r => r.json());
await Promise.all([
  document.fonts.load(SANS(700, 96), 'Claude Code mods'), document.fonts.load(SANS(600, 15), 'Claude'),
  document.fonts.load(SANS(500, 36), '第一，看得见'), document.fonts.load(SANS(700, 64), '看得见'),
  document.fonts.load(MONO(400, 16), 'rm -rf ./src'), document.fonts.load(MONO(500, 16), '12,480'),
  ...frames.map(im => im.decode().catch(() => 0)),
]);

// ───────── 舞台 ─────────
function drawStage(t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(W * .5, H * .3, 0, W * .5, H * .3, 1000);
  g.addColorStop(0, 'rgba(46,60,104,0.34)'); g.addColorStop(1, 'rgba(46,60,104,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W * .78, H * .74, 0, W * .78, H * .74, 760);
  g.addColorStop(0, rgba(C.acRGB, 0.075)); g.addColorStop(1, rgba(C.acRGB, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 1;
  for (let i = 0; i * 48 <= W; i++) { ctx.strokeStyle = `rgba(255,255,255,${i % 4 ? .028 : .06})`; ctx.beginPath(); ctx.moveTo(i * 48 + .5, 0); ctx.lineTo(i * 48 + .5, H); ctx.stroke(); }
  for (let j = 0; j * 48 <= H; j++) { ctx.strokeStyle = `rgba(255,255,255,${j % 4 ? .028 : .06})`; ctx.beginPath(); ctx.moveTo(0, j * 48 + .5); ctx.lineTo(W, j * 48 + .5); ctx.stroke(); }
  g = ctx.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 1250);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ───────── 讲者面板 ─────────
function hostU(t) { return eio(seg(t, T.hostOutA, T.hostOutB)); }
function drawHost(t) {
  const u = hostU(t); if (u >= 1) return;
  const k = 1 - u, cx = HP.x + HP.w / 2, cy = HP.y + HP.h / 2;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(Math.max(0.0001, k), Math.max(0.0001, Math.pow(k, 1.6))); ctx.translate(-cx, -cy);
  glow('rgba(0,0,0,0.55)', 50, () => fillRR(HP.x, HP.y, HP.w, HP.h, HP.r, C.s1));
  ctx.save(); rr(HP.x, HP.y, HP.w, HP.h, HP.r); ctx.clip();
  const fi = clamp(Math.floor(t * 24 + 1e-4), 0, NF - 1);
  ctx.filter = 'brightness(0.9) saturate(0.92)';
  ctx.drawImage(frames[fi], HP.x, HP.y, HP.w, HP.h);
  ctx.filter = 'none';
  let g = ctx.createLinearGradient(0, HP.y + HP.h - 220, 0, HP.y + HP.h);
  g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(1, 'rgba(5,7,12,0.55)');
  ctx.fillStyle = g; ctx.fillRect(HP.x, HP.y, HP.w, HP.h);
  g = ctx.createRadialGradient(cx, cy, 260, cx, cy, 620);
  g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(1, 'rgba(5,7,12,0.42)');
  ctx.fillStyle = g; ctx.fillRect(HP.x, HP.y, HP.w, HP.h);
  // 声纹胶囊
  const px = HP.x + 22, py = HP.y + 22, e = ENV[clamp(Math.floor(t * 24), 0, ENV.length - 1)] || 0;
  fillRR(px, py, 104, 38, 19, 'rgba(8,12,20,0.62)'); strokeRR(px, py, 104, 38, 19, 'rgba(255,255,255,0.12)');
  glow(C.ac, 10, () => { ctx.beginPath(); ctx.arc(px + 20, py + 19, 4.5, 0, TAU); ctx.fillStyle = C.ac; ctx.fill(); });
  for (let i = 0; i < 5; i++) {
    const hh = 4 + 20 * clamp(e * (.55 + .45 * hash(Math.floor(t * 12) + i * 9.1)), 0, 1);
    fillRR(px + 40 + i * 11, py + 19 - hh / 2, 5, hh, 2.5, 'rgba(233,238,248,0.88)');
  }
  ctx.restore();
  strokeRR(HP.x, HP.y, HP.w, HP.h, HP.r, C.line);
  ctx.restore();
}

// ───────── 镜头 ─────────
function camAt(t) {
  let a = CAM[0], b = CAM[CAM.length - 1];
  for (let i = 0; i < CAM.length - 1; i++) if (t >= CAM[i].t && t <= CAM[i + 1].t) { a = CAM[i]; b = CAM[i + 1]; break; }
  const u = b.t === a.t ? 1 : ss((t - a.t) / (b.t - a.t));
  return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), s: lerp(a.s, b.s, u) };
}
function cpOf(t) { const u = eio(seg(t, T.hostOutA, T.hostOutB)); return { ...CP0, x: CP0.x - 360 * u }; }
function w2s(t, x, y) { const c = camAt(t), cp = cpOf(t); return [cp.x + ANCH.x + (x - c.cx) * c.s, cp.y + ANCH.y + (y - c.cy) * c.s]; }

// ───────── 窗口内的零件 ─────────
const LINES = [
  { t: 3.45, c: C.t1, mk: '›', s: '给结账页加上优惠码' },
  { t: 3.60, c: C.t2, mk: '●', s: '读取  src/checkout.tsx' },
  { t: 3.75, c: C.t2, mk: '●', s: '修改  src/checkout.tsx  +24 −3' },
  { t: 3.90, c: C.t2, mk: '●', s: '修改  src/promo.ts  +41' },
  { t: 4.05, c: C.t2, mk: '●', s: '运行  npm test' },
];
function slideIn(t, t0, d = .22) { return eo(seg(t, t0, t0 + d)); }

function drawSlots(t) {
  const items = [
    { r: PANE, a: T.slots[0], fill: T.paneIn, lb: '面板' },
    { r: BAND, a: T.slots[1], fill: T.bandIn, lb: '信息条' },
    { r: { x: 0, y: STATUS.y, w: WIN.w, h: STATUS.h }, a: T.slots[2], fill: T.statusIn, lb: '状态栏' },
  ];
  for (const it of items) {
    if (t < it.a || t > it.fill + .3) continue;
    const pulse = Math.exp(-Math.max(0, t - it.a) * 4);
    const fade = 1 - seg(t, it.fill - .05, it.fill + .3);
    const al = (0.28 + 0.6 * pulse) * fade * slideIn(t, it.a, .12);
    ctx.save(); ctx.globalAlpha = al;
    ctx.setLineDash([7, 7]); strokeRR(it.r.x, it.r.y, it.r.w, it.r.h, 10, C.ac, 1.3); ctx.setLineDash([]);
    fillRR(it.r.x, it.r.y, it.r.w, it.r.h, 10, rgba(C.acRGB, 0.04 + 0.08 * pulse));
    text(it.lb, it.r.x + it.r.w / 2, it.r.y + it.r.h / 2, { font: SANS(500, 16), color: C.ac, align: 'center', ls: '3px' });
    ctx.restore();
  }
}

function drawTranscript(t, ta_) {
  // P0：会话行 + 危险卡；17.45 起整页上卷退出
  const out = eio(seg(t, T.pageOut0, T.pageOut0 + .55));
  if (out >= 1) return;
  ctx.save(); ctx.globalAlpha *= 1 - out; ctx.translate(0, -70 * out);
  const dim = 1 - .5 * seg(t, T.card1 - .2, T.card1 + .3);
  LINES.forEach((L, i) => {
    const a = slideIn(t, L.t); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a * dim;
    const y = TR.y + i * 36 + 14;
    text(L.mk, TR.x, y, { font: MONO(500, 18), color: i === 0 ? C.ac : C.t3 });
    text(L.s, TR.x + 24 + (1 - a) * -8, y, { font: i === 0 ? SANS(500, 19) : MONO(400, 16.5), color: L.c });
    ctx.restore();
  });
  dangerCard(t, ta_, 300, T.card1, TYPE.rm, T.gate1, 3);
  dangerCard(t, ta_, 386, T.card2, TYPE.push, T.gate2, 7);
  ctx.restore();
}

function dangerCard(t, ta_, y0, t0, spec, gT, seed) {
  if (t < t0) return;
  const a = clamp((t - t0) / .12), drop = (1 - back(seg(t, t0, t0 + .26), 1.9)) * -34;
  const h = 70, x = TR.x, w = TR.w, blocked = t >= gT;
  const trem = blocked ? 0 : (hash(Math.floor(ta_(t) * 30) + seed) - .5) * 1.8 * seg(t, t0 + .3, t0 + .5);
  const n = TL.typedN(spec, t), full = spec.text, resolved = n >= full.length;
  const gx = x + (w + 30) * eo(seg(t, gT, gT + .34)) - 15;
  const drawBody = (isBlocked) => {
    ctx.save(); ctx.translate(trem, drop);
    fillRR(x, y0, w, h, 12, C.s3);
    strokeRR(x, y0, w, h, 12, isBlocked ? rgba(C.acRGB, 0.55) : rgba(C.redRGB, 0.55));
    fillRR(x, y0 + 12, 4, h - 24, 2, isBlocked ? C.ac : C.red);
    fillRR(x + 18, y0 + 12, 52, 22, 6, C.s4);
    text('Bash', x + 44, y0 + 23, { font: MONO(500, 13), color: C.t2, align: 'center' });
    const cmd = n === 0 ? scramble(full, 0, t, seed) : full.slice(0, n) + (resolved ? '' : '▍');
    text(cmd, x + 18, y0 + 52, { font: MONO(500, 22), color: isBlocked ? C.t3 : C.t1 });
    if (isBlocked && resolved) { ctx.fillStyle = C.t3; ctx.fillRect(x + 18, y0 + 52, tw(full, MONO(500, 22)), 1.5); }
    if (isBlocked) {
      fillRR(x + w - 110, y0 + 12, 92, 26, 13, rgba(C.acRGB, 0.16));
      text('已拦截', x + w - 56, y0 + 25, { font: SANS(600, 14), color: C.ac, align: 'center', ls: '1px' });
    } else {
      const p = .55 + .45 * Math.sin(ta_(t) * 9);
      fillRR(x + w - 110, y0 + 12, 92, 26, 13, rgba(C.redRGB, 0.12 + 0.1 * p));
      text('待放行', x + w - 56, y0 + 25, { font: SANS(600, 14), color: C.red, align: 'center', ls: '1px' });
    }
    ctx.restore();
  };
  ctx.save(); ctx.globalAlpha *= a;
  if (t < gT) drawBody(false);
  else {
    ctx.save(); ctx.beginPath(); ctx.rect(gx, y0 - 20, w + 60, h + 40); ctx.clip(); drawBody(false); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y0 - 20, gx - x + 20, h + 40); ctx.clip(); drawBody(true); ctx.restore();
    if (t < gT + .5) glow(C.ac, 22, () => { ctx.fillStyle = C.ac; ctx.globalAlpha *= 1 - seg(t, gT + .3, gT + .5); ctx.fillRect(gx - 1, y0 - 6, 2.5, h + 12); });
  }
  ctx.restore();
}

function drawPane(t, ta_) {
  const u = eo(seg(t, T.paneIn, T.paneDone)); if (u <= 0) return;
  const px = PANE.x + (1 - u) * 300, py = PANE.y, w = PANE.w, h = PANE.h;
  const rl = seg(t, T.reload, T.reload + .25) * (1 - seg(t, T.reloadEnd, T.reloadEnd + .4));
  ctx.save(); ctx.globalAlpha *= clamp(u * 1.6);
  glow('rgba(0,0,0,0.5)', 24, () => fillRR(px, py, w, h, 12, C.s3));
  strokeRR(px, py, w, h, 12, rl > 0 ? rgba(C.acRGB, 0.4 + .5 * rl) : C.line);
  if (rl > 0) glow(C.ac, 24 * rl, () => strokeRR(px, py, w, h, 12, rgba(C.acRGB, .5 * rl), 1.5));
  text('任务', px + 18, py + 26, { font: SANS(600, 17), color: C.t1 });
  const live = .5 + .5 * Math.sin(ta_(t) * 6);
  glow(C.ac, 8, () => { ctx.beginPath(); ctx.arc(px + w - 52, py + 26, 3.6, 0, TAU); ctx.fillStyle = rgba(C.acRGB, .5 + .5 * live); ctx.fill(); });
  text('实时', px + w - 42, py + 26, { font: SANS(500, 13), color: C.t3 });
  const steps = [['读取代码', ss(seg(t, 6.6, 7.7))], ['修改文件', ss(seg(t, 8.0, 9.2))], ['运行测试', ss(seg(t, 9.3, 10.3))]];
  steps.forEach(([nm, p], i) => {
    const y = py + 66 + i * 46;
    text(nm, px + 18, y, { font: SANS(500, 16), color: p >= 1 ? C.t1 : C.t2 });
    if (p >= 1) text('✓', px + w - 22, y, { font: SANS(700, 16), color: C.ac, align: 'right' });
    else text(Math.round(p * 100) + '%', px + w - 18, y, { font: MONO(400, 13), color: C.t3, align: 'right' });
    fillRR(px + 18, y + 14, w - 36, 5, 2.5, C.s4);
    if (p > 0) glow(C.ac, 6, () => fillRR(px + 18, y + 14, (w - 36) * p, 5, 2.5, C.ac));
  });
  text('测试', px + 18, py + 226, { font: SANS(500, 14), color: C.t3, ls: '3px' });
  for (let i = 0; i < 12; i++) {
    const col = i % 4, row = Math.floor(i / 4), x = px + 18 + col * 60, y = py + 246 + row * 46;
    const lt = T.tiles + i * T.tileStep, k = spring(t - lt, 9, .4), on = t >= lt;
    const sc = on ? 1 + .14 * Math.exp(-(t - lt) * 10) : 1;
    ctx.save(); ctx.translate(x + 25, y + 17); ctx.scale(sc, sc); ctx.translate(-25, -17);
    fillRR(0, 0, 50, 34, 7, on ? rgba(C.acRGB, 0.9) : C.s4);
    if (on) { glow(C.ac, 12 * Math.exp(-(t - lt) * 6), () => fillRR(0, 0, 50, 34, 7, rgba(C.acRGB, 0.9))); text('✓', 25, 17, { font: SANS(700, 16), color: '#0b0f1a', align: 'center' }); }
    ctx.restore();
  }
  const lock = Math.floor(2 * seg(t, T.countRoll[0], T.countRoll[1]));
  const cnt = t < T.countRoll[0] ? '--' : scramble('42', lock, t, 11);
  text(cnt, px + 18, py + 424, { font: SANS(700, 44), color: t >= T.countRoll[1] ? C.ac : C.t2, base: 'alphabetic' });
  const cw = tw('42', SANS(700, 44));
  text('/ 42  通过', px + 18 + cw + 10, py + 424, { font: SANS(500, 16), color: C.t3, base: 'alphabetic' });
  ctx.restore();
}

function drawBand(t) {
  const u = eo(seg(t, T.bandIn, T.bandIn + .45)); if (u <= 0) return;
  const y = BAND.y + (1 - u) * 22, rl = seg(t, T.reload, T.reload + .25) * (1 - seg(t, T.reloadEnd, T.reloadEnd + .4));
  ctx.save(); ctx.globalAlpha *= u;
  fillRR(BAND.x, y, BAND.w, BAND.h, 10, C.s3); strokeRR(BAND.x, y, BAND.w, BAND.h, 10, rl > 0 ? rgba(C.acRGB, .4 + .5 * rl) : C.line);
  text('用量', BAND.x + 18, y + 20, { font: SANS(500, 16), color: C.t2 });
  const p = .38 * ss(seg(t, T.usageRoll[0], T.usageRoll[1]));
  fillRR(BAND.x + 76, y + 17, 460, 6, 3, C.s4);
  if (p > 0) glow(C.ac, 8, () => fillRR(BAND.x + 76, y + 17, 460 * p / .55, 6, 3, C.ac));
  const full = '12,480 tok', lock = Math.floor(full.length * seg(t, T.usageRoll[0], T.usageRoll[1]));
  text(t < T.usageRoll[0] ? '' : scramble(full, lock, t, 5), BAND.x + BAND.w - 20, y + 20, { font: MONO(500, 20), color: t >= T.usageRoll[1] ? C.t1 : C.t2, align: 'right' });
  ctx.restore();
}

function statusState(t) {
  const n = TL.typedN(TYPE.status, t);
  if (t < 10.4) return { i: 0, dot: C.ac, l: '运行中', m: '3 / 5 步', r: 'main · 12.4k tok' };
  if (t < T.card1) return { i: 1, dot: C.ac, l: '测试通过', m: '5 / 5 步', r: 'main · 12.4k tok' };
  if (t < T.shield) return { i: 2, dot: C.red, l: '等待确认', m: '有危险命令待放行', r: 'main · 12.4k tok', red: 1 };
  if (t < T.enter) return { i: 3, dot: C.ac, l: '守卫  已拦截 2', m: '', r: 'main · 12.9k tok' };
  if (t < T.done) { const k = T.steps.filter(x => t >= x).length; return { i: 4, dot: C.ac, l: '运行 /ship', m: `${k} / 4 步`, r: 'main · 13.6k tok' }; }
  if (t < T.reload) return { i: 5, dot: C.ac, l: '/ship 完成', m: '4 / 4 步', r: 'main · 14.1k tok' };
  return { i: 6, dot: C.ac, l: '已热重载  my-mod', m: '', r: 'main · 14.3k tok' };
}
const SW = [10.4, T.card1, T.shield, T.enter, T.done, T.reload];
function drawStatus(t, ta_) {
  if (t < T.statusIn) return;
  const typed = seg(t, TYPE.status.t0, TYPE.status.t1), st = statusState(t);
  const cut = s => s.slice(0, Math.ceil(s.length * typed));
  const flash = Math.max(0, ...SW.map(x => t >= x ? Math.exp(-(t - x) * 6) : 0));
  ctx.save(); rr(0, STATUS.y, WIN.w, STATUS.h, [0, 0, WIN.r, WIN.r]); ctx.clip();
  ctx.fillStyle = st.red ? `rgba(${C.redRGB},0.10)` : C.s3; ctx.fillRect(0, STATUS.y, WIN.w, STATUS.h);
  ctx.fillStyle = rgba(C.acRGB, 0.18 * flash); ctx.fillRect(0, STATUS.y, WIN.w, STATUS.h);
  ctx.fillStyle = C.line; ctx.fillRect(0, STATUS.y, WIN.w, 1);
  const rl = seg(t, T.reload, T.reload + .25) * (1 - seg(t, T.reloadEnd, T.reloadEnd + .4));
  if (rl > 0) { ctx.fillStyle = rgba(C.acRGB, .16 * rl); ctx.fillRect(0, STATUS.y, WIN.w, STATUS.h); }
  const yy = STATUS.y + STATUS.h / 2 + 1, p = .6 + .4 * Math.sin(ta_(t) * 7);
  glow(st.dot, 8, () => { ctx.beginPath(); ctx.arc(24, yy, 4, 0, TAU); ctx.fillStyle = st.dot; ctx.globalAlpha *= p; ctx.fill(); });
  text(cut(st.l), 38, yy, { font: SANS(600, 15), color: st.red ? C.red : (st.i >= 3 ? C.ac : C.t1) });
  text(cut(st.m), 290, yy, { font: SANS(500, 15), color: C.t2 });
  text(cut(st.r), WIN.w - 24, yy, { font: MONO(400, 14), color: C.t3, align: 'right' });
  ctx.restore();
}

// P1：常用流程四步
const FLOW = ['检查代码', '运行测试', '构建产物', '发布上线'];
function drawFlow(t) {
  const a = slideIn(t, T.pageIn1, .3) * (1 - seg(t, T.pageOut1, T.pageOut1 + .4)); if (a <= 0) return;
  const fold = eio(seg(t, T.foldA, T.foldB)), reexp = eo(seg(t, T.enter + .03, T.enter + .3));
  const hide = t >= T.foldB && t < T.enter + .03;
  if (hide) return;
  const pmt = [PROMPT.x + 40, PROMPT.y + 27];
  ctx.save(); ctx.globalAlpha *= a * (t < T.enter ? 1 - fold * .15 : 1);
  FLOW.forEach((nm, i) => {
    let y = 140 + i * 56, x = TR.x, sc = 1, al = 1;
    if (t >= T.foldA && t < T.foldB) { const k = fold; y = lerp(y, pmt[1] - 20, k * k); x = lerp(x, pmt[0], k); sc = lerp(1, .35, k); al = 1 - ss(seg(k, .6, 1)); }
    if (t >= T.enter + .03) { const k = reexp; y = lerp(pmt[1] - 20, y, k); x = lerp(pmt[0], x, k); sc = lerp(.35, 1, k); al = ss(seg(k, 0, .4)); }
    const done = t >= T.steps[i], fl = done ? Math.exp(-(t - T.steps[i]) * 7) : 0;
    ctx.save(); ctx.globalAlpha *= al; ctx.translate(x, y); ctx.scale(sc, sc);
    fillRR(0, 0, 480, 44, 10, done ? rgba(C.acRGB, 0.09 + .15 * fl) : C.s3); strokeRR(0, 0, 480, 44, 10, done ? rgba(C.acRGB, .45) : C.line);
    ctx.beginPath(); ctx.arc(26, 22, 10, 0, TAU); ctx.strokeStyle = done ? C.ac : C.t3; ctx.lineWidth = 1.6; ctx.stroke();
    if (done) { glow(C.ac, 10 * fl + 4, () => { ctx.beginPath(); ctx.arc(26, 22, 10, 0, TAU); ctx.fillStyle = C.ac; ctx.fill(); }); text('✓', 26, 22.5, { font: SANS(700, 13), color: '#0b0f1a', align: 'center' }); }
    text(nm, 52, 22, { font: SANS(500, 20), color: done ? C.t1 : C.t2 });
    text(`步骤 ${i + 1}`, 460, 22, { font: MONO(400, 13), color: C.t3, align: 'right' });
    ctx.restore();
  });
  if (t >= T.done) {
    const k = back(seg(t, T.done, T.done + .3), 1.6);
    ctx.save(); ctx.globalAlpha *= clamp(k); ctx.translate(0, (1 - k) * 12);
    fillRR(TR.x, 380, 480, 52, 12, rgba(C.acRGB, 0.12)); strokeRR(TR.x, 380, 480, 52, 12, rgba(C.acRGB, .5));
    text('/ship 完成', TR.x + 22, 406, { font: SANS(600, 20), color: C.ac });
    text('4 / 4 步 · 用时 3.1 秒', TR.x + 458, 406, { font: MONO(400, 14), color: C.t2, align: 'right' });
    ctx.restore();
  }
  ctx.restore();
}

// P2：新建的三个文件
const FILES = ['.claude-plugin/plugin.json', 'hooks/hooks.json', 'hooks/register.tsx'];
function drawFiles(t) {
  if (t < T.files[0] - .15) return;
  ctx.save();
  text('● 新建  my-mod/', TR.x, 88, { font: MONO(500, 17), color: C.ac, alpha: slideIn(t, T.files[0] - .15) });
  FILES.forEach((nm, i) => {
    const t0 = T.files[i]; if (t < t0) return;
    const a = clamp((t - t0) / .1), k = back(seg(t, t0, t0 + .26), 1.9), y = 124 + i * 66 + (1 - k) * -30;
    ctx.save(); ctx.globalAlpha *= a;
    fillRR(TR.x, y, 500, 54, 12, C.s3); strokeRR(TR.x, y, 500, 54, 12, rgba(C.acRGB, .35 * Math.exp(-(t - t0) * 2) + .12));
    fillRR(TR.x + 16, y + 14, 20, 26, 4, C.s4); fillRR(TR.x + 16, y + 14, 20, 5, 2, rgba(C.acRGB, .8));
    text(nm, TR.x + 52, y + 28, { font: MONO(500, 18.5), color: C.t1 });
    text('+', TR.x + 478, y + 27, { font: MONO(500, 18), color: C.ac, align: 'right' });
    ctx.restore();
  });
  ctx.restore();
}

function drawPrompt(t, ta_) {
  const x = PROMPT.x, y = PROMPT.y, w = PROMPT.w, h = PROMPT.h;
  const fl = Math.max(Math.exp(-Math.max(0, t - T.enter) * 5) * (t >= T.enter && t < T.enter + 1), Math.exp(-Math.max(0, t - T.askEnter) * 5) * (t >= T.askEnter && t < T.askEnter + 1));
  fillRR(x, y, w, h, 14, C.s3); strokeRR(x, y, w, h, 14, rgba(C.acRGB, .16 + .7 * fl));
  if (fl > 0) glow(C.ac, 18 * fl, () => strokeRR(x, y, w, h, 14, rgba(C.acRGB, .6 * fl), 1.4));
  text('›', x + 22, y + 27, { font: MONO(500, 20), color: C.ac });
  let s = '', typing = false;
  if (t >= TYPE.ship.t0 && t < T.enter) { s = TL.typedStr(TYPE.ship, t); typing = true; }
  else if (t >= TYPE.ask.chars[0][1] && t < T.askEnter) { s = TL.typedStr(TYPE.ask, t); typing = true; }
  if (s) {
    text(s, x + 46, y + 27, { font: s[0] === '/' ? MONO(500, 20) : SANS(500, 20), color: s[0] === '/' ? C.ac : C.t1 });
    const cwid = tw(s, s[0] === '/' ? MONO(500, 20) : SANS(500, 20));
    fillRR(x + 48 + cwid, y + 15, 2.5, 24, 1, C.ac);
  } else if (t < T.enter - .4 || (t > T.askEnter && t < 30.9) || (t > T.enter + .4 && t < TYPE.ask.chars[0][1])) {
    text('输入指令，或按 / 调用命令', x + 46, y + 27, { font: SANS(400, 18), color: C.t3 });
  }
}

function drawMenu(t) {
  const a = slideIn(t, 20.55, .16) * (1 - seg(t, T.enter, T.enter + .12)); if (a <= 0) return;
  const mx = 24, mh = 3 * 42 + 14, my = PROMPT.y - 10 - mh;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(mx, my + (1 - a) * 8);
  glow('rgba(0,0,0,0.6)', 26, () => fillRR(0, 0, 440, mh, 12, C.s4)); strokeRR(0, 0, 440, mh, 12, C.line);
  [['/ship', '检查 · 测试 · 构建 · 发布'], ['/review', '检查当前改动'], ['/standup', '汇总昨天的进展']].forEach(([c, d], i) => {
    const y = 7 + i * 42;
    if (i === 0) fillRR(6, y, 428, 38, 8, rgba(C.acRGB, 0.18));
    text(c, 22, y + 19, { font: MONO(500, 19), color: i === 0 ? C.ac : C.t1 });
    text(d, 142, y + 19, { font: SANS(400, 15), color: C.t2 });
  });
  ctx.restore();
}

function drawToast(t) {
  if (t < T.toast || t > T.toastOut + .4) return;
  const k = back(seg(t, T.toast, T.toast + .32), 1.7), o = eio(seg(t, T.toastOut, T.toastOut + .35));
  const x = 504, y = 52 + (1 - k) * -110 - o * 110;
  ctx.save();
  glow('rgba(0,0,0,0.6)', 30, () => fillRR(x, y, 340, 76, 16, C.s4)); strokeRR(x, y, 340, 76, 16, rgba(C.acRGB, .5));
  const bx = x + 38, by = y + 38, sw = Math.sin((t - T.toast) * 38) * Math.exp(-(t - T.toast) * 5) * .35;
  ctx.save(); ctx.translate(bx, by - 6); ctx.rotate(sw);
  glow(C.ac, 12, () => { ctx.beginPath(); ctx.moveTo(-11, 8); ctx.quadraticCurveTo(-11, -12, 0, -13); ctx.quadraticCurveTo(11, -12, 11, 8); ctx.closePath(); ctx.fillStyle = C.ac; ctx.fill(); ctx.fillRect(-13, 8, 26, 3); ctx.beginPath(); ctx.arc(0, 15, 3.6, 0, TAU); ctx.fill(); });
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const p = seg(t - T.toast - i * .13, 0, .7); if (p <= 0 || p >= 1) continue;
    ctx.beginPath(); ctx.arc(bx, by, 22 + 38 * p, 0, TAU); ctx.strokeStyle = rgba(C.acRGB, .55 * (1 - p)); ctx.lineWidth = 2; ctx.stroke();
  }
  text('已完成', x + 76, y + 29, { font: SANS(600, 21), color: C.t1 });
  text('/ship · 4 / 4 步', x + 76, y + 53, { font: MONO(400, 14), color: C.t2 });
  ctx.restore();
}

function drawReload(t) {
  const u = seg(t, T.reload, T.reloadEnd); if (u <= 0 || u >= 1) return;
  const x = lerp(-300, WIN.w + 300, eio(u));
  ctx.save(); rr(0, 0, WIN.w, WIN.h, WIN.r); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x - 260, 0, x + 260, 0);
  g.addColorStop(0, rgba(C.acRGB, 0)); g.addColorStop(.7, rgba(C.acRGB, .16)); g.addColorStop(.92, 'rgba(235,232,255,0.18)'); g.addColorStop(1, rgba(C.acRGB, 0));
  ctx.fillStyle = g; ctx.transform(1, 0, -.25, 1, 0, 0); ctx.fillRect(-400, 0, WIN.w + 800, WIN.h);
  ctx.restore();
  const a = back(seg(t, T.reload + .1, T.reload + .4), 1.8);
  ctx.save(); ctx.globalAlpha *= clamp(a); const cx = WIN.w - 24;
  fillRR(cx - 124, 46, 124, 24, 12, rgba(C.acRGB, .2)); strokeRR(cx - 124, 46, 124, 24, 12, rgba(C.acRGB, .6));
  text('✓ 已热重载', cx - 62, 58.5, { font: SANS(600, 13), color: C.ac, align: 'center' }); ctx.restore();
}

// ───────── 窗口 ─────────
function titleSpec(t) {
  const u = eio(seg(t, T.winA, T.winB));
  const full = 'Claude Code', n = TL.typedN(TYPE.title, t), s = full.slice(0, n);
  const f0 = 96, f1 = 15, size = lerp(f0, f1, u);
  const wTot = tw('Claude Code mods', SANS(700, 96)), x0 = WIN.w / 2 - wTot / 2, y0 = WIN.h / 2;
  return { u, s, size, x: lerp(x0, 44, u), y: lerp(y0, 22, u), col: u > .5 ? C.t2 : C.t1, wTot, x0, y0 };
}
function drawIntroCaret(t, ts) {
  if (ts.u > .02 || t > T.winA) return;
  const mods = t >= T.mods;
  const wc = tw(mods ? 'Claude Code mods' : ts.s, SANS(700, 96));
  const blink = t < 1.0 || Math.floor(t / (60 / TL.BPM)) % 2 === 0;
  if (blink) fillRR(ts.x0 + wc + 6, ts.y0 - 44, 7, 88, 2, C.ac);
}
function drawWindow(t, ta_) {
  const ts = titleSpec(t), u = ts.u;
  const R0 = { x: ts.x0 - 44, y: ts.y0 - 66, w: ts.wTot + 88, h: 132 }, e = u;
  const R = { x: lerp(R0.x, 0, e), y: lerp(R0.y, 0, e), w: lerp(R0.w, WIN.w, e), h: lerp(R0.h, WIN.h, e) };
  const rad = lerp(14, WIN.r, e), body = ss(seg(u, .72, 1));
  // 标题行本身（展开前）
  if (u < 1) {
    ctx.save(); ctx.globalAlpha = ss(seg(t, 0, .1)) * (1 - ss(seg(u, .35, .8)));
    fillRR(R.x, R.y, R.w, R.h, rad, C.s2); strokeRR(R.x, R.y, R.w, R.h, rad, C.line); ctx.restore();
  }
  ctx.save(); ctx.globalAlpha = ss(seg(u, .05, .45));
  glow('rgba(0,0,0,0.55)', 40, () => fillRR(R.x, R.y, R.w, R.h, rad, C.s2));
  strokeRR(R.x, R.y, R.w, R.h, rad, C.line); ctx.restore();
  // 标题文字（96px → 15px 的匹配切换）
  ctx.save();
  if (t >= 0) {
    const mods = t >= T.mods, k = u;
    text(ts.s, ts.x, ts.y, { font: SANS(lerp(700, 600, k), ts.size), color: ts.col, ls: lerp(-2, 0, k) + 'px' });
    if (mods && k < .6) {
      const pop = back(seg(t, T.mods, T.mods + .18), 2) , mx = ts.x + tw('Claude Code ', SANS(700, ts.size));
      ctx.save(); ctx.globalAlpha *= (1 - seg(k, .1, .6)) * clamp(pop);
      glow(C.ac, 26 * (1 - k), () => text('mods', mx, ts.y + (1 - pop) * 14, { font: SANS(700, ts.size), color: C.ac, ls: '-2px' }));
      ctx.restore();
    }
  }
  ctx.restore();
  drawIntroCaret(t, ts);
  if (body <= 0) return;
  ctx.save(); rr(0, 0, WIN.w, WIN.h, WIN.r); ctx.clip(); ctx.globalAlpha = body;
  ctx.fillStyle = C.s2; ctx.fillRect(0, 44, WIN.w, 1); ctx.fillStyle = C.line; ctx.fillRect(0, 44, WIN.w, 1);
  fillRR(20, 17, 10, 10, 3, C.ac);
  text('~/shop-app  ·  main', WIN.w - 24, 22, { font: MONO(400, 14), color: C.t3, align: 'right' });
  drawSlots(t);
  drawTranscript(t, ta);
  drawFlow(t); drawFiles(t);
  drawPane(t, ta); drawBand(t); drawMenu(t);
  drawPrompt(t, ta); drawStatus(t, ta);
  drawToast(t); drawReload(t);
  ctx.restore();
}

// ───────── 章标（屏幕坐标，面板内）─────────
function drawHeader(t, cp) {
  let ch = null;
  for (const c of CHAPTERS) if (t >= c.t) ch = c;
  if (!ch) return;
  const idx = CHAPTERS.indexOf(ch), prev = idx > 0 ? CHAPTERS[idx - 1] : null;
  const fadeOut = 1 - seg(t, TL.CH_END, TL.CH_END + .3);
  ctx.save(); ctx.globalAlpha *= fadeOut;
  const lx = cp.x + 44, ly = cp.y + 44;
  const la = slideIn(t, ch.t, .2);
  text(`${ch.n} / 04`, lx, ly, { font: MONO(500, 18), color: C.ac, ls: '3px', alpha: la });
  const k = seg(t, ch.tt, ch.tt + .3), ko = seg(t, ch.t, ch.t + .18);
  if (prev && ko < 1) text(prev.title, lx, cp.y + 104 - 26 * ko, { font: SANS(700, 64), color: C.t1, alpha: 1 - ko });
  if (t >= ch.tt) text(ch.title, lx, cp.y + 104 + (1 - eo(k)) * 26, { font: SANS(700, 64), color: C.t1, alpha: eo(k) });
  ctx.restore();
}

// ───────── 字幕胶囊 ─────────
function drawCaption(t) {
  const c = CUES.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const k = eo(seg(t, c.t0, c.t0 + .16)), out = 1 - seg(t, c.t1 - .1, c.t1);
  const f = SANS(500, 36), wd = tw(c.text, f), pw = wd + 96, ph = 66, x = W / 2 - pw / 2, y = 1014 - ph / 2 + (1 - k) * 10;
  ctx.save(); ctx.globalAlpha = k * out;
  glow('rgba(0,0,0,0.5)', 22, () => fillRR(x, y, pw, ph, 33, 'rgba(12,17,28,0.86)'));
  strokeRR(x, y, pw, ph, 33, 'rgba(255,255,255,0.13)');
  glow(C.ac, 10, () => { ctx.beginPath(); ctx.arc(x + 30, y + ph / 2, 5, 0, TAU); ctx.fillStyle = C.ac; ctx.fill(); });
  text(c.text, x + 54, y + ph / 2 + 1, { font: f, color: C.t1 });
  ctx.restore();
}

// ───────── 收尾：讲者变成光标 ─────────
function drawDot(t) {
  if (t < T.hostOutA + .3) return;
  const [ex, ey] = w2s(t, PROMPT.x + 46, PROMPT.y + 27);
  const sx = HP.x + HP.w / 2, sy = HP.y + HP.h / 2;
  const f = eio(seg(t, T.hostOutB - .3, T.hostOutB + .35));
  const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 150;
  const x = (1 - f) * (1 - f) * sx + 2 * (1 - f) * f * mx + f * f * ex, y = (1 - f) * (1 - f) * sy + 2 * (1 - f) * f * my + f * f * ey;
  const grow = ss(seg(t, T.hostOutA + .3, T.hostOutA + .6));
  const landed = f >= 1, blink = !landed || Math.floor((t - T.blink[0] + .0) / .3) % 2 === 0 || t < T.blink[0];
  if (!blink) return;
  glow(C.ac, 22, () => {
    if (landed) fillRR(x - 1.5, y - 13, 3.2, 26, 1.5, C.ac);
    else { const r = lerp(6, 12, 1 - f) * grow; ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, TAU); ctx.fillStyle = C.ac; ctx.fill(); }
  });
}

// ───────── 总渲染 ─────────
window.DUR = TL.DUR;
window.EV = TL.EV;
window.render = (t) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  drawStage(t);
  drawHost(t);
  const cp = cpOf(t), c = camAt(t);
  ctx.save();
  glow('rgba(0,0,0,0.55)', 50, () => fillRR(cp.x, cp.y, cp.w, cp.h, cp.r, C.s1));
  rr(cp.x, cp.y, cp.w, cp.h, cp.r); ctx.clip();
  ctx.fillStyle = 'rgba(8,12,20,0.94)'; ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
  ctx.save();
  ctx.beginPath(); ctx.rect(cp.x, cp.y + HEAD, cp.w, cp.h - HEAD); ctx.clip();
  ctx.translate(cp.x + ANCH.x, cp.y + HEAD + (ANCH.y - HEAD)); ctx.scale(c.s, c.s); ctx.translate(-c.cx, -c.cy);
  drawWindow(t, ta);
  ctx.restore();
  // 取景区上沿淡出
  const g = ctx.createLinearGradient(0, cp.y + HEAD, 0, cp.y + HEAD + 48);
  g.addColorStop(0, 'rgba(8,12,20,0.98)'); g.addColorStop(1, 'rgba(8,12,20,0)');
  ctx.save(); ctx.globalAlpha = ss(seg(c.cy - (ANCH.y - HEAD) / c.s - 0, -2, 22)); ctx.fillStyle = g; ctx.fillRect(cp.x, cp.y + HEAD, cp.w, 48); ctx.restore();
  drawHeader(t, cp);
  ctx.restore();
  strokeRR(cp.x, cp.y, cp.w, cp.h, cp.r, C.line);
  drawCaption(t);
  drawDot(t);
};

// ───────── 可读性检查用的文字清单（只报需要读的：章标、命令、清单、通知、文件名）─────────
window.TEXTS = (t) => {
  const out = [], cp = cpOf(t);
  const add = (id, s, x0, y0, x1, y1) => out.push({ id, text: s, x0, y0, x1, y1 });
  const wbox = (id, s, wx0, wy0, wx1, wy1) => { const [a, b] = w2s(t, wx0, wy0), [c, d] = w2s(t, wx1, wy1); add(id, s, a, b, c, d); };
  const cur = CHAPTERS.findLast(c => t >= c.t);
  if (cur && t >= cur.tt + .32 && t < TL.CH_END) add('title', cur.title, cp.x + 44, cp.y + 50, cp.x + 300, cp.y + 112);
  if (t >= TYPE.rm.t1 + .05 && t < T.pageOut0) wbox('rm', TYPE.rm.text, TR.x + 18, 322, TR.x + 300, 352);
  if (t >= TYPE.push.t1 + .02 && t < T.pageOut0) wbox('push', TYPE.push.text, TR.x + 18, 408, TR.x + 300, 438);
  if (t >= T.enter + .35 && t < T.pageOut1) FLOW.forEach((nm, i) => wbox('row' + i, nm, TR.x + 52, 140 + i * 56 + 8, TR.x + 150, 140 + i * 56 + 36));
  if (t >= T.done + .1 && t < T.pageOut1) wbox('done', '/ship 完成', TR.x + 22, 392, TR.x + 130, 420);
  if (t >= T.toast + .1 && t < T.toastOut) wbox('toast', '已完成', 580, 66, 660, 92);
  FILES.forEach((nm, i) => { if (t >= T.files[i] + .1) wbox('file' + i, nm, TR.x + 52, 124 + i * 66 + 14, TR.x + 300, 124 + i * 66 + 40); });
  return out;
};
window.READY = true;
