// claude-video 介绍 · 翻牌显示屏 × 科技感高铁站（16:9 满屏的“视频即世界”）。
// 生成视频里的翻牌板被逐帧跟踪（track_board.py → src/track.json），整块盖板重画成真正的机械翻牌：
// 每个格子是一个 40 片的转轮（flap.js），只能往前翻，所以每次换字都会哗啦啦翻过中间所有的字。
// 博主的手臂和衣服按颜色抠出来，盖板画在他的后面。
import { loadHost, hostFrame, hostMatteFrame } from '/tools/talk/host.js';
import { cuesFromWords, cueWords } from '/tools/talk/layouts.js';
import { Cell, write } from './flap.js';
import { styled, CREATURES, TW, TH } from './backdrop.js';

const W = 1920, H = 1080, cv = document.getElementById('c'), ctx = cv.getContext('2d');
const host = await loadHost('src');
const words = await fetch('src/words.json').then(r => r.json());
const TR = await fetch('src/track.json').then(r => r.json());
const CARD = await fetch('src/card.json').then(r => r.json()).catch(() => ({ frames: [] }));
const QS = new URLSearchParams(location.search), POSTER = QS.has('poster'), AT = parseFloat(QS.get('at') || '12'), NOMATTE = QS.has('nomatte');
const DUR = host.duration, SX = W / host.w;
await Promise.all([document.fonts.load('500 40px Barlow'), document.fonts.load('500 40px "Noto Sans SC"', '水墨油画像素霓虹折纸风格画廊'), document.fonts.load('700 40px "Noto Sans SC"', '水墨')]);

// ───────── 样片素材（预览窗和卡片里用）─────────
const STILLS = ['ink-wash', 'impasto', 'watercolor', 'risograph', 'blueprint', 'hologram-hud', 'swiss-motion', 'ukiyoe', 'tarot', 'lacquer-gold', 'newsprint', 'felt', 'cyanotype', 'woodcut', 'art-deco', 'silkscreen-poster', 'crayon-book', 'transit-map', 'zoetrope', 'vector-scope'];
const SEQS = ['neon', 'pixel', 'origami', 'clay', 'wide', 'tall'], IMG = {};
const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
await Promise.all([...SEQS.map(async n => { IMG[n] = await Promise.all(Array.from({ length: 36 }, (_, q) => loadImg(`samples/${n}/${String(q + 1).padStart(3, '0')}.jpg`))); }), ...STILLS.map(async n => { IMG[n] = await loadImg(`samples/stills/${n}.jpg`); })]);

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
put(1, 0, 'OPEN SOURCE', T.hello - .15); put(3, 0, 'CLAUDE-VIDEO', T.name - .25, { tone: 'lit' });
// 风格库（右边是预览窗，左边 13 列放文字）
clearRow(1, T.lib + .1); clearRow(3, T.lib + .1);
put(0, 0, 'STYLE LIBRARY', T.lib - .1);
const STY = [['水墨', 'INK WASH', T.ink], ['油画', 'OIL PAINT', T.oil], ['像素', 'PIXEL RPG', T.pixel], ['霓虹', 'NEON SIGN', T.neon], ['折纸', 'ORIGAMI', T.ori]];
STY.forEach(([zh, en, t], i) => { const r = 2 + i; put(r, 0, zh, t - .15); put(r, 3, en, t - .1); });
put(7, 0, '60+', T.sixty - .2, { tone: 'lit' }); put(7, 4, 'STYLES', T.sixty - .15);
put(8, 0, 'EACH A FILM', T.sixty + .9);
// 功能
clearAll(T.pick - .25);
put(0, 0, 'CREATE', T.pick + .45);
put(2, 0, 'PICK A STYLE', T.pick + .4); put(3, 0, '+ YOUR TOPIC', T.topic - .1); put(4, 0, '= A FILM', T.make - .1, { tone: 'lit' });
put(6, 0, 'TALKING HEAD', T.talk - .15); put(8, 0, 'CAPTIONS · SCORE', T.caps - .15);
put(7, 0, '16:9', T.landscape - .2, { tone: 'amber' }); put(7, 6, '9:16', T.portrait - .1, { tone: 'amber' });
// 画廊与提示词
clearAll(T.gallery - .4);
put(1, 0, 'GALLERY', T.gallery - .1); put(1, 8, 'OPEN', T.gallery + .5, { tone: 'amber', stagger: .05 });
put(3, 0, 'PROMPTS', T.prompt - .2); put(3, 8, 'READY', T.copy - .1, { tone: 'amber', stagger: .05 });
put(6, 0, 'COPY · PASTE · GO', T.copy + .25, { tone: 'lit' });
// 收尾
clearAll(T.ask - 1.25);
put(3, 0, 'WHICH STYLE', T.ask - .85); put(4, 0, 'FIRST ?', T.ask - .6, { tone: 'lit' });
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
// ───────── 板右边的预览窗：一块会翻的大翻牌，里面放各种风格的样片 ─────────
const P0 = { x: MX + 13 * PXs, y: MY + 1 * PYs, w: 9 * PXs - 4, h: 5 * PYs - 6 };
const clampn = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const frameOf = (n, t) => { const arr = IMG[n]; return Array.isArray(arr) ? arr[Math.floor(Math.max(0, t) * 12) % arr.length] : arr; };
function cover(g, im, x, y, w, h, z = 1) { if (!im) return; const sc = Math.max(w / im.width, h / im.height) * z, iw = im.width * sc, ih = im.height * sc; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); g.restore(); }
const fontL = (px, w = 500) => `${w} ${px}px Barlow, "Noto Sans SC", sans-serif`;
function labelBar(g, w, h, text, amber = true, right = '') {
  g.fillStyle = 'rgba(6,8,10,.84)'; g.fillRect(0, h - 24, w, 24); g.fillStyle = amber ? '#ffb43c' : '#eef3f7'; g.font = fontL(15); g.textBaseline = 'middle'; g.textAlign = 'left'; g.letterSpacing = '1.5px'; g.fillText(text, 10, h - 12); if (right) { g.textAlign = 'right'; g.fillText(right, w - 10, h - 12); } g.letterSpacing = '0px';
}
const LISTA = ['ink-wash', 'impasto', 'watercolor', 'risograph', 'ukiyoe', 'blueprint', 'hologram-hud', 'woodcut', 'art-deco'], LISTB = ['tarot', 'lacquer-gold', 'newsprint', 'felt', 'cyanotype', 'transit-map', 'zoetrope', 'vector-scope', 'swiss-motion', 'crayon-book', 'silkscreen-poster', 'art-deco'];
const SHUF = ['crayon-book', 'blueprint', 'ukiyoe', 'newsprint', 'felt', 'tarot', 'risograph', 'zoetrope', 'woodcut', 'cyanotype', 'transit-map', 'lacquer-gold', 'swiss-motion', 'watercolor'];
function mosaic(g, w, h, list, cols, rows, t, t0, stagger, dim = 0) {
  const bh = h - 24, tw = w / cols, th = bh / rows;
  for (let i = 0; i < cols * rows; i++) {
    const cx = (i % cols) * tw, cy = Math.floor(i / cols) * th, rt = t0 + i * stagger, p = clampn((t - rt) / .3);
    g.save(); g.beginPath(); g.rect(cx, cy, tw, th); g.clip(); g.fillStyle = '#0a0c0f'; g.fillRect(cx, cy, tw, th);
    if (p > 0) { const f = p < .5 ? 1 - p * 2 : (p - .5) * 2; g.translate(cx + tw / 2, cy); g.scale(Math.max(.02, f), 1); g.translate(-tw / 2, 0); if (p >= .5) cover(g, IMG[list[i % list.length]], 1, 1, tw - 2, th - 2); else { g.fillStyle = '#1b2026'; g.fillRect(1, 1, tw - 2, th - 2); } }
    g.restore(); if (dim) { g.fillStyle = `rgba(0,0,0,${dim})`; g.fillRect(cx, cy, tw, th); }
  }
}
function typed(g, w, h, t, t0, lines) {
  g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb43c'; g.font = fontL(16); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '2px'; g.fillText('YOUR TOPIC', 18, 36); g.letterSpacing = '0px';
  let n = Math.floor(Math.max(0, t - t0) * 16); g.fillStyle = '#eef3f7'; g.font = fontL(30, 700);
  lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, n)); n -= ln.length; g.fillText(part, 18, 92 + i * 44); });
  if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#ffb43c'; g.fillRect(18 + 4 + g.measureText(lines[Math.min(lines.length - 1, Math.floor(Math.max(0, t - t0) * 16 / 14))] || '').width * 0, 92 + 44 * 2 - 30, 12, 26); }
}
function promptCard(g, w, h, t, tcopy) {
  g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb43c'; g.font = fontL(16); g.textBaseline = 'alphabetic'; g.letterSpacing = '2px'; g.fillText('PROMPT', 18, 34); g.letterSpacing = '0px';
  [300, 250, 320, 210, 290, 140].forEach((lw, i) => { g.fillStyle = i % 2 ? 'rgba(238,243,247,.22)' : 'rgba(238,243,247,.34)'; g.fillRect(18, 54 + i * 24, lw * clampn((t - tcopy + 2.6 - i * .12) / .4), 8); });
  const hit = t >= tcopy, pf = hit ? 1 - clampn((t - tcopy) / .5) : 0; g.fillStyle = hit ? (pf > 0 ? '#ffb43c' : 'rgba(255,180,60,.22)') : 'rgba(238,243,247,.12)'; g.beginPath(); g.roundRect(18, h - 80, 150, 36, 18); g.fill();
  g.strokeStyle = hit ? '#ffb43c' : 'rgba(238,243,247,.5)'; g.lineWidth = 1.6; g.stroke(); g.fillStyle = hit ? (pf > 0 ? '#1b1307' : '#ffd08a') : '#eef3f7'; g.font = fontL(17, 700); g.textAlign = 'center'; g.fillText(hit ? '✓  COPIED' : 'COPY', 18 + 75, h - 57); g.textAlign = 'left';
}
const SHOTS = [
  { t0: 0, kind: 'standby' }, { t0: 2.5, kind: 'mosaic', list: LISTB, cols: 4, rows: 3, stagger: .09, label: 'NOW SHOWING' },
  { t0: T.ink - .05, kind: 'still', name: 'ink-wash', label: 'INK WASH' }, { t0: T.oil - .05, kind: 'still', name: 'impasto', label: 'OIL PAINT' },
  { t0: T.pixel - .05, kind: 'clip', name: 'pixel', label: 'PIXEL RPG' }, { t0: T.neon - .05, kind: 'clip', name: 'neon', label: 'NEON SIGN' }, { t0: T.ori - .05, kind: 'clip', name: 'origami', label: 'ORIGAMI' },
  { t0: T.sixty + .15, kind: 'mosaic', list: LISTA, cols: 3, rows: 3, stagger: .12, label: '60+ STYLES' },
  { t0: T.pick, kind: 'shuffle', label: 'PICK A STYLE' }, { t0: T.topic, kind: 'topic', label: 'STYLE + TOPIC' },
  { t0: T.make, kind: 'clip', name: 'clay', label: 'A FILM', amberFlash: true }, { t0: T.talk, kind: 'clip', name: 'wide', label: 'TALKING HEAD' },
  { t0: T.landscape - .1, kind: 'split', label: '16:9  ·  9:16' },
  { t0: T.gallery, kind: 'mosaic', list: LISTB, cols: 4, rows: 3, stagger: .1, label: 'GALLERY' }, { t0: T.prompt, kind: 'prompt', label: 'PROMPTS' },
  { t0: T.ask - .6, kind: 'mosaic', list: LISTA, cols: 3, rows: 3, stagger: .05, dim: .35, label: 'WHICH STYLE FIRST ?' },
];
function drawShot(g, sh, t, w, h) {
  const lt = t - sh.t0; g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
  if (sh.kind === 'standby') { g.fillStyle = '#06080a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,180,60,.9)'; g.font = fontL(16); g.textBaseline = 'middle'; g.letterSpacing = '3px'; g.fillText('●  STANDBY', 18, h / 2); g.letterSpacing = '0px'; }
  else if (sh.kind === 'still') { cover(g, IMG[sh.name], 0, 0, w, h - 24, 1.02 + .05 * clampn(lt / 3)); labelBar(g, w, h, sh.label, true, '▶'); }
  else if (sh.kind === 'clip') { cover(g, frameOf(sh.name, lt), 0, 0, w, h - 24); labelBar(g, w, h, sh.label, true, '▶'); if (sh.amberFlash && lt < .7) { g.fillStyle = `rgba(255,180,60,${.28 * (1 - lt / .7)})`; g.fillRect(0, 0, w, h - 24); } }
  else if (sh.kind === 'mosaic') { g.fillStyle = '#0a0c0f'; g.fillRect(0, 0, w, h); mosaic(g, w, h, sh.list, sh.cols, sh.rows, t, sh.t0, sh.stagger, sh.dim || 0); labelBar(g, w, h, sh.label, true); }
  else if (sh.kind === 'shuffle') { cover(g, IMG[SHUF[Math.floor(lt / .14) % SHUF.length]], 0, 0, w, h - 24); labelBar(g, w, h, sh.label, true, '▶▶'); }
  else if (sh.kind === 'topic') { typed(g, w, h - 24, t, sh.t0 + .1, ['A FILM ABOUT', 'YOUR STORY']); labelBar(g, w, h, sh.label, true); }
  else if (sh.kind === 'split') { g.fillStyle = '#0a0c0f'; g.fillRect(0, 0, w, h); cover(g, frameOf('wide', lt), 10, 62, 232, 130); cover(g, frameOf('tall', lt), 262, 34, 118, 210); g.strokeStyle = 'rgba(255,180,60,.7)'; g.lineWidth = 1.5; g.strokeRect(10, 62, 232, 130); g.strokeRect(262, 34, 118, 210); g.fillStyle = '#ffb43c'; g.font = fontL(15); g.textAlign = 'center'; g.fillText('16:9', 126, 212); g.fillText('9:16', 321, 262); g.textAlign = 'left'; labelBar(g, w, h, sh.label, false); }
  else if (sh.kind === 'prompt') { promptCard(g, w, h - 24, t, T.copy); labelBar(g, w, h, sh.label, true); }
  g.restore();
}
const pcA = mk(P0.w * TEXSC, P0.h * TEXSC), pcB = mk(P0.w * TEXSC, P0.h * TEXSC), pgA = pcA.getContext('2d'), pgB = pcB.getContext('2d');
function renderShot(g2, sh, t) { g2.setTransform(TEXSC, 0, 0, TEXSC, 0, 0); g2.clearRect(0, 0, P0.w, P0.h); drawShot(g2, sh, t, P0.w, P0.h); }
function drawPanel(g, t) {
  let i = SHOTS.length - 1; while (i > 0 && SHOTS[i].t0 > t) i--; const sh = SHOTS[i], p = i > 0 ? clampn((t - sh.t0) / .34) : 1;
  g.save(); g.translate(P0.x, P0.y); rr(g, -6, -6, P0.w + 12, P0.h + 12, 8); g.fillStyle = '#07090b'; g.fill(); g.strokeStyle = 'rgba(255,180,60,.45)'; g.lineWidth = 1.4; g.stroke();
  g.save(); g.beginPath(); g.rect(0, 0, P0.w, P0.h); g.clip();
  if (p >= 1) drawShot(g, sh, t, P0.w, P0.h);
  else {
    renderShot(pgA, SHOTS[i - 1], t); renderShot(pgB, sh, t); const h2 = P0.h / 2, cw = pcA.width, ch = pcA.height, th = Math.PI * p;
    g.drawImage(pcB, 0, 0, cw, ch / 2, 0, 0, P0.w, h2); g.drawImage(pcA, 0, ch / 2, cw, ch / 2, 0, h2, P0.w, h2);
    if (th < Math.PI / 2) { const hh = h2 * Math.cos(th); g.drawImage(pcA, 0, 0, cw, ch / 2, 0, h2 - hh, P0.w, hh); g.fillStyle = `rgba(0,0,0,${.55 * Math.sin(th)})`; g.fillRect(0, h2 - hh, P0.w, hh); }
    else { const hb = h2 * -Math.cos(th); g.drawImage(pcB, 0, ch / 2, cw, ch / 2, 0, h2, P0.w, hb); g.fillStyle = `rgba(0,0,0,${.55 * Math.sin(th)})`; g.fillRect(0, h2, P0.w, hb); }
    g.fillStyle = '#040506'; g.fillRect(0, h2 - 1.2, P0.w, 2.4);
  }
  // 玻璃：斜向反光 + 细扫描线
  let gr = g.createLinearGradient(0, 0, P0.w, P0.h); gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(.4, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, P0.w, P0.h);
  g.fillStyle = 'rgba(0,0,0,.10)'; for (let y = 0; y < P0.h; y += 3) g.fillRect(0, y, P0.w, 1);
  g.restore(); g.restore();
}
// ───────── 博主手里的卡片：上面也有内容 ─────────
const CWc = 320, CHc = 200, cardC = document.createElement('canvas'); cardC.width = CWc; cardC.height = CHc; const cg = cardC.getContext('2d');
const lay = document.createElement('canvas'); lay.width = W; lay.height = H; const lg = lay.getContext('2d');
const CYCLE = ['impasto', 'ukiyoe', 'blueprint', 'tarot', 'newsprint', 'risograph', 'felt', 'lacquer-gold', 'cyanotype', 'woodcut'];
function drawCardContent(t) {
  const g = cg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CWc, CHc); g.save(); g.beginPath(); g.roundRect(0, 0, CWc, CHc, 10); g.clip();
  g.fillStyle = '#0b0e12'; g.fillRect(0, 0, CWc, CHc); const top = 34, bodyH = CHc - top;
  let strip = 'STYLE', pic = null, mode = 'img';
  if (t < T.topic) { pic = IMG[SHUF[Math.floor(Math.max(0, t - 14.2) / .12) % SHUF.length]]; }
  else if (t < T.make) { mode = 'topic'; strip = 'TOPIC'; }
  else if (t < T.talk + 1.0) { pic = frameOf('clay', t - T.make); strip = 'FILM'; }
  else if (t < 22.2) { pic = IMG[CYCLE[Math.floor((t - T.talk) / .75) % CYCLE.length]]; }
  else if (t < 26.4) { mode = 'prompt'; strip = 'PROMPT'; }
  else { mode = 'ready'; strip = 'TICKET'; }
  if (mode === 'img') cover(g, pic, 0, top, CWc, bodyH);
  else if (mode === 'topic') { g.save(); g.translate(0, top); typed(g, CWc, bodyH, t, T.topic + .1, ['A FILM ABOUT', 'YOUR STORY']); g.restore(); }
  else if (mode === 'prompt') { g.save(); g.translate(0, top); promptCard(g, CWc, bodyH, t, T.copy); g.restore(); }
  else { g.fillStyle = '#ffb43c'; g.fillRect(0, top, CWc, bodyH); g.fillStyle = '#1b1307'; g.font = fontL(104, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✓', CWc / 2, top + bodyH / 2 - 4); g.font = fontL(22, 700); g.letterSpacing = '3px'; g.fillText('STYLE × TOPIC → FILM', CWc / 2, CHc - 18); g.letterSpacing = '0px'; g.textAlign = 'left'; }
  g.fillStyle = '#ffb43c'; g.fillRect(0, 0, CWc, top); g.fillStyle = '#1b1307'; g.font = fontL(22, 700); g.textBaseline = 'middle'; g.letterSpacing = '3px'; g.fillText(strip, 14, top / 2 + 1); g.letterSpacing = '0px';
  g.textAlign = 'right'; g.fillText('ADMIT ONE', CWc - 12, top / 2 + 1); g.textAlign = 'left'; g.restore();
}
function drawCard(k, t, im) {
  const q = (CARD.frames || [])[k]?.q; if (!q) return; drawCardContent(t);
  const P = q.map(p => [p[0] * SX, p[1] * SX]); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
  const a = (P[1][0] - P[0][0]) / CWc, b = (P[1][1] - P[0][1]) / CWc, c = (P[3][0] - P[0][0]) / CHc, d = (P[3][1] - P[0][1]) / CHc;
  lg.imageSmoothingEnabled = true; lg.setTransform(a, b, c, d, P[0][0], P[0][1]); lg.drawImage(cardC, 0, 0); lg.setTransform(1, 0, 0, 1, 0, 0);
  // 只保留“卡片白”的像素：手指和别的东西留在前面
  const m = cardWhiteMask(P); lg.globalCompositeOperation = 'destination-in'; lg.drawImage(m, 0, 0, W, H); lg.globalCompositeOperation = 'source-over';
  lg.globalCompositeOperation = 'source-atop'; lg.fillStyle = 'rgba(8,14,26,.10)'; lg.fillRect(0, 0, W, H); lg.globalCompositeOperation = 'source-over';   // match the scene's exposure on the card
  ctx.drawImage(lay, 0, 0);
}
const tex = mk(BW * TEXSC, BH * TEXSC), tg2 = tex.getContext('2d');
function drawBoardTexture(t) {
  tg2.setTransform(1, 0, 0, 1, 0, 0); tg2.clearRect(0, 0, tex.width, tex.height); tg2.setTransform(TEXSC, 0, 0, TEXSC, 0, 0);
  let g = tg2.createLinearGradient(0, 0, 0, BH); g.addColorStop(0, '#16191c'); g.addColorStop(1, '#0d0f11'); tg2.fillStyle = g; tg2.fillRect(0, 0, BW, BH);          // 盖板底
  for (let r = 0; r < ROWS; r++) { const y = MY + r * PYs; rr(tg2, MX - 4, y - 3, COLS * PXs - 4 + 8, CH + 6, 4); tg2.fillStyle = '#07080a'; tg2.fill(); }                            // 每行的凹槽
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) drawCell(tg2, MX + c * PXs, MY + r * PYs, CW, CH, cells[r][c].at(t));
  drawPanel(tg2, t);
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
let lastPix = null;
const mk2 = document.createElement('canvas'); mk2.width = MW; mk2.height = MH; const mg = mk2.getContext('2d'); const mimg = mg.createImageData(MW, MH);
function hostMatte(im) {
  sg.drawImage(im, 0, 0, MW, MH); const d = sg.getImageData(0, 0, MW, MH).data, o = mimg.data, raw = new Uint8Array(MW * MH); lastPix = d;
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

const cmk = document.createElement('canvas'); cmk.width = MW; cmk.height = MH; const cmg = cmk.getContext('2d'), cimg = cmg.createImageData(MW, MH);
function cardWhiteMask(P) {                                                       // P: 卡片四角（1920×1080 像素）；返回 960×540 的 alpha 画布，只在“卡片白”的像素上不透明
  const d = lastPix, o = cimg.data; o.fill(0); const Q = P.map(p => [p[0] / 2, p[1] / 2]), cx = Q.reduce((a, q) => a + q[0], 0) / 4, cy = Q.reduce((a, q) => a + q[1], 0) / 4;
  const E = Q.map(q => { const dx = q[0] - cx, dy = q[1] - cy, l = Math.hypot(dx, dy) || 1; return [q[0] + dx / l * 3, q[1] + dy / l * 3]; });
  const x0 = Math.max(0, Math.floor(Math.min(...E.map(q => q[0])))), x1 = Math.min(MW - 1, Math.ceil(Math.max(...E.map(q => q[0])))), y0 = Math.max(0, Math.floor(Math.min(...E.map(q => q[1])))), y1 = Math.min(MH - 1, Math.ceil(Math.max(...E.map(q => q[1]))));
  const cr = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const s0 = cr(E[0], E[1], x, y), s1 = cr(E[1], E[2], x, y), s2 = cr(E[2], E[3], x, y), s3 = cr(E[3], E[0], x, y);
    if (!((s0 >= 0 && s1 >= 0 && s2 >= 0 && s3 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0 && s3 <= 0))) continue;
    const p = (y * MW + x) * 4, r = d[p], g = d[p + 1], b = d[p + 2], l = .3 * r + .59 * g + .11 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const skin = r > 110 && r > g + 8 && g > b - 4 && r - b > 26 && (r - b) < .5 * r && l > 95 && l < 235, navy = b > r + 20 && b > g + 5 && l < 110;
    if (l > 150 && mx - mn < 48 && !skin && !navy) { const q = (y * MW + x) * 4; o[q + 3] = 255; }
  }
  cmg.putImageData(cimg, 0, 0); return cmk;
}

// ───────── 前景遮罩：博主 + 翻牌板（含侧面和底座），文字和角色画在它们后面 ─────────
const fgC = document.createElement('canvas'); fgC.width = MW; fgC.height = MH; const fgG = fgC.getContext('2d'), fgImg = fgG.createImageData(MW, MH);
const qC = document.createElement('canvas'); qC.width = MW; qC.height = MH; const qG = qC.getContext('2d', { willReadFrequently: true });
const seen = new Uint8Array(MW * MH), cand = new Uint8Array(MW * MH), stk = new Int32Array(MW * MH), dist = new Uint16Array(MW * MH);
function fgMatte(k) {
  const d = lastPix, n = MW * MH; let qh = 0, qt = 0; seen.fill(0); dist.fill(0);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2], l = .3 * r + .59 * g + .11 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const navy = b > r + 20 && b > g + 5 && l < 110 && l > 8, skin = r > g && g > b && r - b > 14 && l > 38 && l < 242 && r / (g + 1) < 1.62, dark = l < 85 && mx - mn < 48;
    cand[i] = navy || skin || dark ? 1 : 0; if (navy) { seen[i] = 1; stk[qt++] = i; }
  }
  // 翻牌板的四边形也当种子
  const Hf = TR.H[Math.min(k, TR.H.length - 1)].map(Number), Ht = mul3(Hf, Hq);
  qG.setTransform(1, 0, 0, 1, 0, 0); qG.clearRect(0, 0, MW, MH); qG.fillStyle = '#fff'; qG.beginPath();
  [[0, 0], [BW, 0], [BW, BH], [0, BH]].forEach(([x, y], q) => { const [px, py] = apply(Ht, x, y); q ? qG.lineTo(px * SX / 2, py * SX / 2) : qG.moveTo(px * SX / 2, py * SX / 2); }); qG.closePath(); qG.fill();
  const qd = qG.getImageData(0, 0, MW, MH).data;
  for (let i = 0; i < n; i++) if (qd[i * 4 + 3] > 128) { if (!seen[i]) { seen[i] = 1; stk[qt++] = i; } cand[i] = 1; }
  // 广度优先，最多往外长 170 个像素：脸、脖子、头发、手臂都在衣服附近，远处的铜色立柱和天花板暗线长不到
  const CAP = 170;
  while (qh < qt) {
    const i = stk[qh++], x = i % MW, dd = dist[i]; if (dd >= CAP) continue;
    if (x > 0 && cand[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; dist[i - 1] = dd + 1; stk[qt++] = i - 1; }
    if (x < MW - 1 && cand[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; dist[i + 1] = dd + 1; stk[qt++] = i + 1; }
    if (i >= MW && cand[i - MW] && !seen[i - MW]) { seen[i - MW] = 1; dist[i - MW] = dd + 1; stk[qt++] = i - MW; }
    if (i < n - MW && cand[i + MW] && !seen[i + MW]) { seen[i + MW] = 1; dist[i + MW] = dd + 1; stk[qt++] = i + MW; }
  }
  // 填洞：从画面边缘能走到的“非前景”是背景，其余的洞（卡片、高光）算前景
  const out = new Uint8Array(n); let sp = 0; const st2 = new Int32Array(n);
  const pushBg = i => { if (!seen[i] && !out[i]) { out[i] = 1; st2[sp++] = i; } };
  for (let x = 0; x < MW; x++) { pushBg(x); pushBg((MH - 1) * MW + x); } for (let y = 0; y < MH; y++) { pushBg(y * MW); pushBg(y * MW + MW - 1); }
  while (sp) { const i = st2[--sp], x = i % MW; if (x > 0) pushBg(i - 1); if (x < MW - 1) pushBg(i + 1); if (i >= MW) pushBg(i - MW); if (i < n - MW) pushBg(i + MW); }
  const o = fgImg.data; for (let i = 0, p = 0; i < n; i++, p += 4) { o[p] = o[p + 1] = o[p + 2] = 0; o[p + 3] = out[i] ? 0 : 255; }
  fgG.putImageData(fgImg, 0, 0); return fgC;
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
SHOTS.slice(1).forEach(sh => EV.push({ t: +sh.t0.toFixed(3), type: 'pflip' }));
for (const sh of SHOTS) if (sh.kind === 'mosaic') for (let q = 0; q < sh.cols * sh.rows; q++) EV.push({ t: +(sh.t0 + q * sh.stagger + .15).toFixed(3), type: 'tile' });
for (let tt = 14.25; tt < T.topic; tt += .12) EV.push({ t: +tt.toFixed(3), type: 'tick' });
EV.sort((x, y) => x.t - y.t);
window.EV = EV;

// ───────── 博主背后的风格大字和角色 ─────────
const SCN = [
  { t0: 1.6, t1: T.lib - .1, kind: 'outline', text: 'CLAUDE-VIDEO' },
  { t0: T.ink - .15, t1: T.oil - .1, kind: 'ink', text: '水墨', cr: 'inkCrane' },
  { t0: T.oil - .15, t1: T.pixel - .1, kind: 'oil', text: '油画' },
  { t0: T.pixel - .15, t1: T.neon - .1, kind: 'pixel', text: 'PIXEL', cr: 'pixelCat' },
  { t0: T.neon - .15, t1: T.ori - .1, kind: 'neon', text: 'NEON', cr: 'neonFish' },
  { t0: T.ori - .15, t1: T.sixty - .3, kind: 'origami', text: '折纸', cr: 'origamiCrane' },
  { t0: T.sixty - .3, t1: T.pick - .35, kind: 'amber', text: '60+', parade: true },
  { t0: T.pick - .3, t1: T.topic - .1, kind: 'outline', text: 'PICK A STYLE' },
  { t0: T.topic - .1, t1: T.make - .1, kind: 'outline', text: '+ YOUR TOPIC' },
  { t0: T.make - .1, t1: T.talk - .1, kind: 'neon', text: 'A FILM' },
  { t0: T.talk - .1, t1: T.landscape - .15, kind: 'outline', text: 'TALKING HEAD' },
  { t0: T.landscape - .15, t1: T.gallery - .3, kind: 'outline', text: '16:9 · 9:16' },
  { t0: T.gallery - .3, t1: T.prompt - .2, kind: 'origami', text: 'GALLERY', parade: true },
  { t0: T.prompt - .2, t1: T.ask - .6, kind: 'pixel', text: 'PROMPTS' },
  { t0: T.ask - .6, t1: DUR + 1, kind: 'neon', text: 'WHICH STYLE?', parade: true },
];
const PARADE = ['inkCrane', 'pixelCat', 'neonFish', 'origamiCrane', 'clayChick'];
const bgC = document.createElement('canvas'); bgC.width = W; bgC.height = H; const bgG = bgC.getContext('2d');
const camOf = k => { const Ht = mul3(TR.H[Math.min(k, TR.H.length - 1)].map(Number), Hq), [x, y] = apply(Ht, BW / 2, BH / 2), [x1, y1] = apply(Ht, 0, 0), [x2, y2] = apply(Ht, BW, BH); return { x: x * SX, y: y * SX, L: Math.hypot(x2 - x1, y2 - y1) * SX }; };
const CAM0 = camOf(TR.ref);
const easeOut = u => 1 - (1 - u) ** 3;
function drawBackdrop(k, t) {
  bgG.setTransform(1, 0, 0, 1, 0, 0); bgG.globalCompositeOperation = 'source-over'; bgG.clearRect(0, 0, W, H);
  const c = camOf(k), dx = (c.x - CAM0.x) * .5, dy = (c.y - CAM0.y) * .3, sc = 1 + .35 * (c.L / CAM0.L - 1);
  bgG.setTransform(sc, 0, 0, sc, W / 2 * (1 - sc) + dx, H / 2 * (1 - sc) + dy);
  for (const sn of SCN) {
    if (t < sn.t0 || t > sn.t1) continue; const p = easeOut(seg(t, sn.t0, sn.t0 + .38)), out = 1 - ss(seg(t, sn.t1 - .3, sn.t1)), a = p * out; if (a <= 0) continue;
    const st = styled(sn.kind, sn.text), z = lerp(.88, 1, p) * (1 + .035 * seg(t, sn.t0, sn.t1)), fl = sn.kind === 'neon' ? (.88 + .12 * Math.sin(t * 23) * (Math.sin(t * 3.3) > .6 ? 1 : .15)) : 1;
    const bw = st.bb.x1 - st.bb.x0, bh = st.bb.y1 - st.bb.y0, fitS = Math.min(860 / bw, 380 / bh);                     // 画在“博主左边、翻牌板左边”那块看得见的地方
    bgG.save(); bgG.globalAlpha = Math.min(1, a * .96) * fl; bgG.translate(W * .245, H * .34); bgG.scale(z * fitS, z * fitS); bgG.drawImage(st.c, -(st.bb.x0 + st.bb.x1) / 2, -(st.bb.y0 + st.bb.y1) / 2); bgG.restore();
    if (sn.parade) { PARADE.forEach((nm, i) => { const q = easeOut(seg(t, sn.t0 + .25 + i * .14, sn.t0 + .6 + i * .14)); if (q > 0) { bgG.save(); bgG.globalAlpha = a * q; CREATURES[nm](bgG, t + i, W * (.07 + i * .105), H * .76 - (1 - q) * 40, 175); bgG.restore(); } }); }
    else if (sn.cr) { const q = easeOut(seg(t, sn.t0 + .15, sn.t0 + .6)); bgG.save(); bgG.globalAlpha = a * q; CREATURES[sn.cr](bgG, t, W * .445, H * .70 - (1 - q) * 50, 290); bgG.restore(); }
  }
  // 博主和翻牌板在前面：用前景遮罩（先膨胀几个像素）把背景层挖掉
  bgG.setTransform(1, 0, 0, 1, 0, 0); bgG.globalCompositeOperation = 'destination-out'; const m = fgMatte(k);
  for (const [ox, oy] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6], [4, 4], [-4, 4], [4, -4], [-4, -4]]) bgG.drawImage(m, ox, oy, W, H);
  const pmk = host.matte && host.matte[k]; if (pmk) for (const [ox, oy] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]]) bgG.drawImage(pmk, ox, oy, W, H);
  bgG.globalCompositeOperation = 'source-over';
}

for (const sn of SCN) EV.push({ t: +sn.t0.toFixed(3), type: 'bgpop' }); EV.sort((x, y) => x.t - y.t);

// ───────── 渲染 ─────────
window.DUR = DUR;
window.render = (t0) => {
  const t = POSTER ? AT : t0, time = POSTER ? AT : Math.min(t0, host.duration - .05), k = Math.min(host.frames.length - 1, Math.floor(time * host.fps + 1e-4)), im = hostFrame(host, time);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(im, 0, 0, W, H);
  hostMatte(im);
  const pm = hostMatteFrame(host, time); if (pm) { mg.clearRect(0, 0, MW, MH); mg.drawImage(pm, 0, 0, MW, MH); }   // Vision 人像遮罩（有就用它，没有就用上面的颜色抠）
  if (!QS.has('nobg')) { drawBackdrop(k, t); ctx.drawImage(bgC, 0, 0); }
  drawBoardTexture(t); drawBoard(k);
  if (!NOMATTE) { og.globalCompositeOperation = 'destination-out'; og.imageSmoothingEnabled = true; og.filter = 'blur(1.2px)'; og.drawImage(mk2, 0, 0, W, H); og.filter = 'none'; og.globalCompositeOperation = 'source-over'; }
  ctx.drawImage(ov, 0, 0);
  drawCard(k, t, im);
  if (QS.has('fg')) { const m = fgMatte(k); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H); lg.fillStyle = 'rgba(255,0,200,.55)'; lg.fillRect(0, 0, W, H); lg.globalCompositeOperation = 'destination-out'; lg.drawImage(m, 0, 0, W, H); lg.globalCompositeOperation = 'source-over'; ctx.drawImage(lay, 0, 0); }
  if (!POSTER) captionsLayer(t);
};
window.TEXTS = () => [];
window.ROWS = (t) => cells.map(row => row.map(c => { const q = c.at(t); return q.p < 0 ? WHEEL[q.b] : '*'; }).join(''));
window.READY = true;
