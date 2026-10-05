// claude-video 介绍 · 翻牌显示屏 × 科技感高铁站（16:9 满屏的“视频即世界”）。
// 生成视频里的翻牌板被逐帧跟踪（track_board.py → src/track.json），整块盖板重画成真正的机械翻牌：
// 每个格子是一个 40 片的转轮（flap.js），只能往前翻，所以每次换字都会哗啦啦翻过中间所有的字。
// 博主的手臂和衣服按颜色抠出来，盖板画在他的后面。
import { loadHost, hostFrame } from '/tools/talk/host.js';
import { cuesFromWords, cueWords } from '/tools/talk/layouts.js';
import { Cell, write } from './flap.js';

const W = 1920, H = 1080, cv = document.getElementById('c'), ctx = cv.getContext('2d');
const host = await loadHost('src');
const words = await fetch('src/words.json').then(r => r.json());
const TR = await fetch('src/track.json').then(r => r.json());
const QS = new URLSearchParams(location.search), POSTER = QS.has('poster'), AT = parseFloat(QS.get('at') || '12'), NOMATTE = QS.has('nomatte');
const DUR = host.duration, SX = W / host.w;
await Promise.all([document.fonts.load('500 40px Barlow'), document.fonts.load('500 40px "Noto Sans SC"', '水墨油画像素霓虹折纸风格画廊'), document.fonts.load('700 40px "Noto Sans SC"', '水墨')]);

// ───────── 数学 ─────────
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, u) => a + (b - a) * u, seg = (t, a, b) => clamp((t - a) / (b - a)), ss = u => u * u * (3 - 2 * u);
function homography(src, dst) {                                                    // 4 点 → 3x3（高斯消元）
  const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let i = 0; i < 8; i++) { let m = i; for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = i + 1; r < 8; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < 8; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  const x = new Array(8); for (let i = 7; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < 8; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return [...x, 1];
}
const mul3 = (A, B) => { const C = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j]; return C; };
const apply = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };

// ───────── 口播时间 ─────────
const toks = words.flatMap(s => s.words).filter(w => w.w.trim());
const punct = /[，。！？、；：,.!?;:\s"“”'‘’（）()-]/g;
const flat = []; let S = '';
toks.forEach((w, i) => { const c = w.w.replace(punct, '').toLowerCase(); for (const ch of c) { flat.push(i); S += ch; } });
const when = (str, fb, from = 0) => { const k = S.indexOf(str.toLowerCase().replace(punct, ''), from); return k >= 0 ? toks[flat[k]].t0 : fb; };
const T = {
  hello: when('开源项目', 3.4), name: when('claude', 4.3), lib: when('风格库', 5.8), ink: when('水墨', 6.6), oil: when('油画', 7.3), pixel: when('像素', 7.9), neon: when('霓虹', 8.8), ori: when('折纸', 9.6),
  sixty: when('60', 10.5), sample: when('样片', 12.7), pick: when('选一个', 13.6), topic: when('题材', 15.0), make: when('导演', 15.7), talk: when('口播解说', 17.2),
  caps: when('字幕', 20.0), landscape: when('横屏', 20.9), portrait: when('竖屏', 21.1), gallery: when('画廊', 22.3), prompt: when('提示词', 25.5), copy: when('复制', 26.0), gh: when('github', 27.5), ask: when('你最想', 28.5),
};

// ───────── 翻牌板：22 列 × 9 行，格子是转轮 ─────────
const COLS = 22, ROWS = 9, CW = 40, CH = 54, PXs = 44, PYs = 60, MX = 14, MY = 14, BW = COLS * PXs - 4 + 2 * MX, BH = ROWS * PYs - 6 + 2 * MY, TEXSC = 3;
const LAT = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.,-+/?·→%=', CJK = '水墨油画像素霓虹折纸', WHEEL = LAT + CJK;
const EV = [], LOG = [];
const cells = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => new Cell({ id: r * COLS + c, wheel: WHEEL, pan: (c / (COLS - 1) - .5) * .6, snd: 'flap' }, EV, LOG)));
const ops = [];                                                                    // {t (start of the first flap), row, col, ch, tone, step, extra}
// 一块真实的翻牌板有延迟：字从 t 开始翻，大约 0.3–1.4 s 后落定（取决于要翻过多少片）
const put = (row, col, str, t, o = {}) => [...str].forEach((ch, i) => { if (col + i < COLS) ops.push({ t: t + (o.stagger ?? .03) * i, row, col: col + i, ch, tone: o.tone ?? 'n', extra: o.extra ?? 0, step: o.step ?? .03 }); });
const clearRow = (row, t, o = {}) => put(row, 0, ' '.repeat(COLS), t, { stagger: .01, step: .012, ...o });
const clearAll = (t, o = {}) => { for (let r = 0; r < ROWS; r++) clearRow(r, t + r * .05, o); };

// 开机自检：整块板对角线地转一整圈，然后落成空白
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) ops.push({ t: .4 + c * .035 + r * .07, row: r, col: c, ch: ' ', tone: 'n', extra: 1, step: .03 });
// 开场：开源项目 / 名字
put(1, 5, 'OPEN SOURCE', T.hello - .15); put(3, 5, 'CLAUDE-VIDEO', T.name - .25, { tone: 'lit' });
// 风格库
clearRow(1, T.lib + .1); clearRow(3, T.lib + .1);
put(0, 0, 'STYLE LIBRARY', T.lib - .1);
const STY = [['水墨', 'INK WASH', T.ink], ['油画', 'OIL PAINT', T.oil], ['像素', 'PIXEL RPG', T.pixel], ['霓虹', 'NEON SIGN', T.neon], ['折纸', 'ORIGAMI', T.ori]];
STY.forEach(([zh, en, t], i) => { const r = 2 + i; put(r, 0, '0' + (i + 1), t - .2, { tone: 'lit' }); put(r, 3, zh, t - .15); put(r, 6, en, t - .1); put(r, 18, 'LIVE', t + .55, { tone: 'lit', stagger: .05 }); });
put(7, 0, '60+', T.sixty - .2, { tone: 'lit' }); put(7, 4, 'STYLES', T.sixty - .15);
put(8, 0, 'EACH WITH A FILM', T.sixty + .9);
// 功能
clearAll(T.pick - .25);
put(0, 0, 'CREATE', T.pick + .45);
put(2, 0, 'PICK A STYLE', T.pick + .4); put(3, 0, '+ YOUR TOPIC', T.topic - .1); put(4, 0, '= A FILM', T.make - .1, { tone: 'lit' });
put(6, 0, 'TALKING HEAD', T.talk - .15); put(8, 0, 'CAPTIONS · SCORE', T.caps - .15);
put(7, 0, '16:9', T.landscape - .2, { tone: 'amber' }); put(7, 6, '9:16', T.portrait - .1, { tone: 'amber' });
// 画廊与提示词
clearAll(T.gallery - .4);
put(1, 0, 'GALLERY', T.gallery - .1); put(1, 16, 'OPEN', T.gallery + .5, { tone: 'amber', stagger: .05 });
put(4, 0, 'PROMPTS', T.prompt - .2); put(4, 16, 'READY', T.copy - .1, { tone: 'amber', stagger: .05 });
put(6, 0, 'COPY · PASTE · GO', T.copy + .25, { tone: 'lit' });
// 收尾
clearAll(T.ask - 1.25);
put(3, 5, 'WHICH STYLE', T.ask - .85); put(4, 5, 'FIRST ?', T.ask - .6, { tone: 'lit' });
ops.sort((a, b) => a.t - b.t).forEach(o => { write(cells[o.row][o.col], o.t, o.ch, { step: o.step, tone: o.tone, extra: o.extra, seed: o.row * 31 + o.col }); });

// ───────── 翻牌的绘制（改自 styles/split-flap/demo/draw.js）─────────
const TONES = {
  n:     { top: ['#2f353b', '#262b30'], bot: ['#1d2125', '#14171a'], ink: '#eef3f7' },
  lit:   { top: ['#2f353b', '#262b30'], bot: ['#1d2125', '#14171a'], ink: '#ffb43c' },
  amber: { top: ['#f3b63c', '#e6a11d'], bot: ['#da8f13', '#c47c0b'], ink: '#1b1307' },
};
const FACES = new Map(), mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
function face(ch, tone, w, h, Sc) {
  const key = ch + '|' + tone; let c = FACES.get(key); if (c) return c; const tn = TONES[tone] || TONES.n;
  c = mk(w * Sc, h * Sc); const g = c.getContext('2d'); g.scale(Sc, Sc); const r = Math.max(2.5, w * .09), hh = h / 2;
  g.save(); rr(g, 0, 0, w, h, r); g.clip();
  let gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, tn.top[0]); gr.addColorStop(1, tn.top[1]); g.fillStyle = gr; g.fillRect(0, 0, w, hh + .5);
  gr = g.createLinearGradient(0, hh, 0, h); gr.addColorStop(0, tn.bot[0]); gr.addColorStop(1, tn.bot[1]); g.fillStyle = gr; g.fillRect(0, hh, w, hh);
  if (ch !== ' ') {
    const cjk = ch.charCodeAt(0) > 0x2e80, fs = h * (cjk ? .62 : .80); g.font = cjk ? `700 ${fs}px "Noto Sans SC"` : `500 ${fs}px Barlow`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const m = g.measureText(ch).width, fit = Math.min(1, (w * .84) / m);
    g.save(); g.translate(w / 2, h / 2 + fs * (cjk ? .36 : .35)); g.scale(fit, 1); g.fillStyle = tn.ink; g.strokeStyle = tn.ink; g.lineWidth = fs * .05; g.lineJoin = 'round'; g.strokeText(ch, 0, 0); g.fillText(ch, 0, 0); g.restore();
  }
  gr = g.createLinearGradient(0, 0, 0, h * .12); gr.addColorStop(0, 'rgba(230,240,255,.10)'); gr.addColorStop(1, 'rgba(230,240,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h * .12);
  gr = g.createLinearGradient(0, h * .9, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = gr; g.fillRect(0, h * .9, w, h * .1);
  g.restore(); FACES.set(key, c); return c;
}
const half = (g, f, bottom, x, y, w, h) => { if (h < .25) return; g.drawImage(f, 0, bottom ? f.height / 2 : 0, f.width, f.height / 2, x, y, w, h); };
function drawCell(g, x, y, w, h, st) {
  const hh = h / 2, fb = face(WHEEL[st.b], st.tb, w, h, TEXSC);
  const slit = () => { const sh = Math.max(1.4, h * .026); g.fillStyle = '#040506'; g.fillRect(x, y + hh - sh / 2, w, sh); g.fillStyle = 'rgba(230,240,255,.10)'; g.fillRect(x, y + hh + sh / 2, w, Math.max(.6, h * .008)); };
  if (st.p < 0) { half(g, fb, 0, x, y, w, hh); half(g, fb, 1, x, y + hh, w, hh); slit(); return; }
  const fa = face(WHEEL[st.a], st.ta, w, h, TEXSC), th = Math.PI * st.p * st.p, c = Math.cos(th), s = Math.sin(th);
  half(g, fb, 0, x, y, w, hh); half(g, fa, 1, x, y + hh, w, hh);
  if (th < Math.PI / 2) { g.fillStyle = `rgba(0,0,0,${.42 * (1 - th / (Math.PI / 2))})`; g.fillRect(x, y, w, hh); }
  slit();
  if (th < Math.PI / 2) { const ht = hh * c; half(g, fa, 0, x, y + hh - ht, w, ht); g.fillStyle = `rgba(0,0,0,${.62 * s})`; g.fillRect(x, y + hh - ht, w, ht); g.fillStyle = `rgba(230,240,255,${.2 * (1 - s * .6)})`; g.fillRect(x, y + hh - ht, w, Math.max(.8, h * .012)); }
  else { const hb = hh * -c; half(g, fb, 1, x, y + hh, w, hb); g.fillStyle = `rgba(0,0,0,${.62 * s})`; g.fillRect(x, y + hh, w, hb); }
}
const tex = mk(BW * TEXSC, BH * TEXSC), tg2 = tex.getContext('2d');
function drawBoardTexture(t) {
  tg2.setTransform(1, 0, 0, 1, 0, 0); tg2.clearRect(0, 0, tex.width, tex.height); tg2.setTransform(TEXSC, 0, 0, TEXSC, 0, 0);
  let g = tg2.createLinearGradient(0, 0, 0, BH); g.addColorStop(0, '#16191c'); g.addColorStop(1, '#0d0f11'); tg2.fillStyle = g; tg2.fillRect(0, 0, BW, BH);          // 盖板底
  for (let r = 0; r < ROWS; r++) { const y = MY + r * PYs; rr(tg2, MX - 4, y - 3, COLS * PXs - 4 + 8, CH + 6, 4); tg2.fillStyle = '#07080a'; tg2.fill(); }                            // 每行的凹槽
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) drawCell(tg2, MX + c * PXs, MY + r * PYs, CW, CH, cells[r][c].at(t));
  g = tg2.createLinearGradient(0, 0, BW, BH); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); tg2.fillStyle = g; tg2.fillRect(0, 0, BW, BH);   // 一层斜向的光泽
}

// ───────── 把贴图按每帧的透视贴到画面上（三角形网格）─────────
const Hq = homography([[0, 0], [BW, 0], [BW, BH], [0, BH]], TR.corners);              // 盖板平面 → 参考帧
const NX = 44, NY = 18, ov = document.createElement('canvas'); ov.width = W; ov.height = H; const og = ov.getContext('2d');
function drawTri(g, s0, s1, s2, d0, d1, d2) {
  const det = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]); if (Math.abs(det) < 1e-9) return;
  const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / det, c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / det;
  const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / det, d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / det;
  const e = d0[0] - a * s0[0] - c * s0[1], f = d0[1] - b * s0[0] - d * s0[1], cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, grow = p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * .7, p[1] + dy / l * .7]; };
  const [p0, p1, p2] = [grow(d0), grow(d1), grow(d2)];
  g.save(); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.clip(); g.setTransform(a, b, c, d, e, f); g.drawImage(tex, 0, 0); g.restore();
}
function drawBoard(k) {
  const Hf = TR.H[Math.min(k, TR.H.length - 1)].map(Number), Ht = mul3(Hf, Hq), dst = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const [x, y] = apply(Ht, i / NX * BW, j / NY * BH); dst.push([x * SX, y * SX]); }
  og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, W, H);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const i0 = j * (NX + 1) + i, i1 = i0 + 1, i2 = i0 + NX + 1, i3 = i2 + 1, sx0 = i / NX * BW * TEXSC, sx1 = (i + 1) / NX * BW * TEXSC, sy0 = j / NY * BH * TEXSC, sy1 = (j + 1) / NY * BH * TEXSC;
    drawTri(og, [sx0, sy0], [sx1, sy0], [sx0, sy1], dst[i0], dst[i1], dst[i2]); drawTri(og, [sx1, sy0], [sx1, sy1], [sx0, sy1], dst[i1], dst[i3], dst[i2]);
  }
  og.setTransform(1, 0, 0, 1, 0, 0);
}

// ───────── 博主抠像：按颜色把皮肤和深蓝衣服认出来，盖板画在他后面 ─────────
const MW = 960, MH = 540, small = document.createElement('canvas'); small.width = MW; small.height = MH; const sg = small.getContext('2d', { willReadFrequently: true });
const mk2 = document.createElement('canvas'); mk2.width = MW; mk2.height = MH; const mg = mk2.getContext('2d'); const mimg = mg.createImageData(MW, MH);
function hostMatte(im) {
  sg.drawImage(im, 0, 0, MW, MH); const d = sg.getImageData(0, 0, MW, MH).data, o = mimg.data, raw = new Uint8Array(MW * MH);
  for (let i = 0, p = 0; i < raw.length; i++, p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2], l = .3 * r + .59 * g + .11 * b;
    const skin = r > 110 && r > g + 8 && g > b - 4 && r - b > 26 && (r - b) < .5 * r && l > 95 && l < 235, navy = b > r + 20 && b > g + 5 && l < 110 && l > 8;
    raw[i] = skin || navy ? 1 : 0;
  }
  const dil = new Uint8Array(raw.length);                                           // 小半径膨胀，去掉孤立点
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) { const i = y * MW + x; let n = raw[i - 1] + raw[i + 1] + raw[i - MW] + raw[i + MW] + raw[i - MW - 1] + raw[i - MW + 1] + raw[i + MW - 1] + raw[i + MW + 1] + raw[i]; dil[i] = n >= 8 ? 1 : 0; }
  const grow = new Uint8Array(raw.length);
  for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) { const i = y * MW + x; grow[i] = (dil[i] || dil[i - 1] || dil[i + 1] || dil[i - MW] || dil[i + MW] || dil[i - 2] || dil[i + 2]) ? 255 : 0; }
  for (let i = 0, p = 0; i < grow.length; i++, p += 4) { o[p] = 0; o[p + 1] = 0; o[p + 2] = 0; o[p + 3] = grow[i]; }
  mg.putImageData(mimg, 0, 0);
}

// ───────── 字幕 ─────────
const cues = cuesFromWords(words, { maxChars: 26, softChars: 12, gap: .45, balance: true }), CW2 = cueWords(cues, words);
function captionsLayer(t) {
  const k = cues.findIndex(c => t >= c.t0 - .02 && t < c.t1); if (k < 0) return; const c = cues[k], tk = CW2[k], size = 42;
  ctx.save(); ctx.font = `700 ${size}px "Noto Sans SC", Barlow, sans-serif`; const wd = tk.reduce((a, w) => a + ctx.measureText(w.s).width, 0), pw = wd + 92, ph = 78, x = W / 2 - pw / 2, y = 960;
  const a = ss(seg(t, c.t0, c.t0 + .16)) * (1 - ss(seg(t, c.t1 - .14, c.t1))); ctx.globalAlpha = a;
  rr(ctx, x, y, pw, ph, 14); ctx.fillStyle = 'rgba(10,12,15,.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,180,60,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#ffb43c'; ctx.fillRect(x + 26, y + ph - 12, 44, 3);
  let act = -1; tk.forEach((w, i) => { if (t >= w.t0) act = i; }); let cx = x + 46;
  tk.forEach((w, i) => { ctx.fillStyle = i <= act ? '#FFFFFF' : 'rgba(205,215,225,.55)'; ctx.fillText(w.s, cx, y + 52); cx += ctx.measureText(w.s).width; });
  ctx.restore();
}

// ───────── 声音事件：翻牌落地按 40 ms 一档汇总 ─────────
const bins = new Map();
for (const e of EV) { const k = Math.round(e.t / .04); const b = bins.get(k) || { t: k * .04, n: 0, x: 0 }; b.n++; b.x += e.x; bins.set(k, b); }
EV.length = 0; [...bins.values()].sort((a, b) => a.t - b.t).forEach(b => EV.push({ t: +b.t.toFixed(3), type: 'flaps', n: b.n, x: +(b.x / b.n).toFixed(2) }));
window.EV = EV;

// ───────── 渲染 ─────────
window.DUR = DUR;
window.render = (t0) => {
  const t = POSTER ? AT : t0, time = POSTER ? AT : Math.min(t0, host.duration - .05), k = Math.min(host.frames.length - 1, Math.floor(time * host.fps + 1e-4)), im = hostFrame(host, time);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(im, 0, 0, W, H);
  drawBoardTexture(t); drawBoard(k);
  if (!NOMATTE) { hostMatte(im); og.globalCompositeOperation = 'destination-out'; og.imageSmoothingEnabled = true; og.filter = 'blur(1.2px)'; og.drawImage(mk2, 0, 0, W, H); og.filter = 'none'; og.globalCompositeOperation = 'source-over'; }
  ctx.drawImage(ov, 0, 0);
  if (!POSTER) captionsLayer(t);
};
window.TEXTS = () => [];
window.ROWS = (t) => cells.map(row => row.map(c => { const q = c.at(t); return q.p < 0 ? WHEEL[q.b] : '*'; }).join(''));
window.READY = true;
