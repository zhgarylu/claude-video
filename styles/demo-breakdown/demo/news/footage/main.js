// Fictional "official demo" footage: Murmur Mini (絮语 Mini) by Lanyu Labs (岚屿实验室), an invented on-device transcription app, shown on a phone in portrait.
// It is the news-digest demo's *source footage*: the film is built from this clip exactly as it would be from an official clip the user supplies.
// Nothing here is a real product, brand or UI. 19 s, 1080x1920.
import { clamp, seg, ss, eo, eio, lerp, track } from '/core/lib.js';
const W = 1080, H = 1920, cv = document.getElementById('c'), g = cv.getContext('2d'), DUR = 19;
const ALL = '絮语 Mini 岚屿实验室 虚构演示 离线运行 周会录音.m4a 2 分 40 秒 本地转写 转写中 转写完成 用时 生成纪要 会议纪要 决定 待办 周五上午 10:00 正式发布 周三 文案定稿 周四 设计给图 中午前 修完 两个测试问题 客服提前拿到常见问题答案 我们先对一下周五上线的事 测试还剩两个问题 周四中午能修完 那文案周三定稿 设计周四给图 客服要提前拿到答案 好 周五上午十点发布 我来盯发布后的反馈';
await Promise.all([500, 700, 900].map(w => document.fonts.load(`${w} 30px "Noto Sans SC"`, ALL)));
const F = 'Noto Sans SC', PRI = '#4B5BD6', INK = '#1d2433', MUT = '#6b7385', GRN = '#1E9E6A', ORG = '#E8892B';
const LINES = [['00:04', '我们先对一下周五上线的事。'], ['00:19', '测试还剩两个问题，周四中午能修完。'], ['00:42', '那文案周三定稿，设计周四给图。'], ['01:15', '客服要提前拿到常见问题的答案。'], ['01:58', '好，周五上午十点发布。'], ['02:31', '我来盯发布后的反馈。']];
const L0 = 3.0, LSTEP = .95, TAP1 = 2.6, DONE = 8.6, TAP2 = 11.4, SHEET = 12.2;
const SX = 122, SY = 172, SW = 836, SH = 1606;
const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const T = (s, x, y, size, w = 500, col = INK, al = 'left') => { g.font = `${w} ${size}px "${F}"`; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
const FING = track([[0, [900, 1860]], [1.2, [900, 1860]], [2.4, [540, 1596]], [3.4, [540, 1596]], [5.2, [900, 1720]], [9.8, [900, 1720]], [11.0, [540, 1596]], [12.0, [540, 1596]], [14.0, [900, 1720]], [19, [900, 1720]]]);
const TAPS = [TAP1, TAP2];
const rowT = i => SHEET + .9 + i * 1;
const EV = [...TAPS.map(t => ({ t, type: 'click' })), ...LINES.map((l, i) => ({ t: L0 + LSTEP * i, type: 'chip' })), { t: DONE, type: 'ding' }, { t: SHEET, type: 'whoosh' }, ...[0, 1, 2, 3].map(i => ({ t: rowT(i), type: 'pop' }))];
window.EV = EV; window.DUR = DUR;

function plane(x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.beginPath(); g.moveTo(0, -16); g.lineTo(4, -4); g.lineTo(18, 4); g.lineTo(18, 9); g.lineTo(4, 5); g.lineTo(3, 13); g.lineTo(8, 17); g.lineTo(8, 20); g.lineTo(0, 18); g.lineTo(-8, 20); g.lineTo(-8, 17); g.lineTo(-3, 13); g.lineTo(-4, 5); g.lineTo(-18, 9); g.lineTo(-18, 4); g.lineTo(-4, -4); g.closePath(); g.fill(); g.restore(); }
function wave(x, y, w, h, t, col) { for (let i = 0; i < 26; i++) { const a = .35 + .65 * Math.abs(Math.sin(i * 1.7 + i * i * .13)); g.fillStyle = col; rr(x + i * (w / 26), y + h / 2 - h * a / 2, w / 26 - 6, h * a, 4); g.fill(); } }
function statusBar() { T('9:41', 56, 46, 40, 800); plane(620, 30, 1.25, INK); g.strokeStyle = INK; g.lineWidth = 4; rr(684, 14, 62, 30, 8); g.stroke(); g.fillStyle = INK; rr(690, 20, 40, 18, 4); g.fill(); rr(748, 24, 6, 10, 2); g.fill(); g.fillStyle = INK; for (let i = 0; i < 3; i++) { rr(772 + i * 14, 40 - (i + 1) * 8, 9, (i + 1) * 8 + 4, 2); g.fill(); } g.globalAlpha = .25; g.fillRect(806, 14, 6, 26); g.globalAlpha = 1; }
function header() { T('絮语 Mini', 48, 160, 64, 900, INK); g.fillStyle = '#E3F5EC'; rr(SW - 330, 100, 282, 78, 39); g.fill(); g.fillStyle = GRN; g.beginPath(); g.arc(SW - 330 + 40, 139, 11, 0, 6.3); g.fill(); T('离线运行', SW - 330 + 66, 153, 42, 800, GRN); }
function button(label, state, t) { const p = state === 'press' ? .96 : 1; g.save(); g.translate(SW / 2, 1442); g.scale(p, p); g.fillStyle = state === 'busy' ? '#8D97E8' : state === 'press' ? '#3D4CC0' : PRI; g.shadowColor = 'rgba(75,91,214,.35)'; g.shadowBlur = 24; g.shadowOffsetY = 8; rr(-330, -62, 660, 124, 62); g.fill(); g.shadowColor = 'transparent'; T(label, 0, 18, 52, 800, '#fff', 'center');
  if (state === 'busy') { const a = t * 7; g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(-250, 0, 20, a, a + 4.2); g.stroke(); } g.restore(); }
function card(y, h) { g.fillStyle = '#fff'; g.shadowColor = 'rgba(30,40,70,.14)'; g.shadowBlur = 24; g.shadowOffsetY = 8; rr(40, y, SW - 80, h, 34); g.fill(); g.shadowColor = 'transparent'; }

window.render = t => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#EBF0F5'); bg.addColorStop(1, '#CBD5E0'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  T('岚屿实验室 · 絮语 Mini', W / 2, 96, 48, 800, '#2b3550', 'center'); T('官方演示 · 虚构产品', W / 2, 138, 34, 500, MUT, 'center');
  g.save(); g.shadowColor = 'rgba(20,30,50,.35)'; g.shadowBlur = 50; g.shadowOffsetY = 24; g.fillStyle = '#10141a'; rr(100, 150, 880, 1650, 100); g.fill(); g.restore();
  g.save(); g.translate(SX, SY); rr(0, 0, SW, SH, 78); g.clip(); g.fillStyle = '#F4F6FB'; g.fillRect(0, 0, SW, SH);
  statusBar(); header();
  const done = t >= DONE, busyT = t - TAP1, busy = t > TAP1 + .1 && !done, pct = clamp((t - TAP1 - .2) / (DONE - TAP1 - .4));
  // file card, becomes the result banner
  const sw = ss(seg(t, DONE, DONE + .5));
  if (sw < 1) { g.save(); g.globalAlpha = 1 - sw; card(240, 220); wave(80, 270, 200, 90, t, '#aab2ee'); T('周会录音.m4a', 310, 320, 48, 800); T('2 分 40 秒', 310, 376, 40, 500, MUT);
    if (busy) { g.fillStyle = '#E3E7FA'; rr(80, 412, SW - 160, 16, 8); g.fill(); g.fillStyle = PRI; rr(80, 412, (SW - 160) * pct, 16, 8); g.fill(); T(`转写中 ${Math.round(pct * 100)}%`, 80, 404, 36, 700, PRI); T(`用时 ${Math.floor(busyT)} 秒`, SW - 80, 404, 36, 700, MUT, 'right'); } g.restore(); }
  if (sw > 0) { g.save(); g.globalAlpha = sw; g.translate(0, (1 - sw) * 16); card(240, 220); g.fillStyle = '#E3F5EC'; g.beginPath(); g.arc(120, 350, 44, 0, 6.3); g.fill(); g.strokeStyle = GRN; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(98, 350); g.lineTo(115, 368); g.lineTo(146, 330); g.stroke();
    T('转写完成', 190, 330, 52, 900, INK); T('2 分 40 秒录音 · 用时 6 秒', 190, 396, 42, 700, GRN); g.restore(); }
  // transcript lines
  LINES.forEach((l, i) => { const at = L0 + LSTEP * i, p = eo(seg(t, at, at + .4)); if (p <= 0) return; const y = 500 + i * 140;
    g.save(); g.globalAlpha = p; g.translate(0, (1 - p) * 22); g.fillStyle = '#E6E9FA'; rr(48, y, 128, 50, 25); g.fill(); T(l[0], 112, y + 37, 36, 700, PRI, 'center'); T(l[1], 48, y + 110, 46, 600, INK); g.restore(); });
  // button
  const sheet = eo(seg(t, SHEET, SHEET + .7));
  if (sheet < 1) { g.save(); g.globalAlpha = 1 - sheet; const lab = !done ? (busy ? '转写中…' : '本地转写') : (t > TAP2 + .1 ? '生成纪要…' : '生成纪要'), st = (!done && busy) || (done && t > TAP2 + .1) ? 'busy' : TAPS.some(c => t >= c && t < c + .16) ? 'press' : '';
    button(lab, st, t); g.restore(); }
  // minutes sheet
  if (sheet > 0) { g.save(); g.fillStyle = `rgba(20,25,45,${.28 * sheet})`; g.fillRect(0, 0, SW, SH); g.translate(0, (1 - sheet) * 700); g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 40; rr(0, 560, SW, SH - 560 + 100, 64); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#d6dae6'; rr(SW / 2 - 50, 580, 100, 10, 5); g.fill(); T('会议纪要', 48, 690, 60, 900, INK); T('由上面的转写生成', SW - 48, 686, 36, 500, MUT, 'right');
    const rows = [['决定', GRN, '#E3F5EC', '周五上午 10:00 正式发布', '01:58'], ['待办', ORG, '#FCEBD9', '周三文案定稿，周四设计给图', '00:42'], ['待办', ORG, '#FCEBD9', '周四中午前修完两个测试问题', '00:19'], ['待办', ORG, '#FCEBD9', '客服提前拿到常见问题答案', '01:15']];
    rows.forEach((r, i) => { const p = eo(seg(t, rowT(i), rowT(i) + .4)); if (p <= 0) return; const y = 740 + i * 190; g.save(); g.globalAlpha = p; g.translate(0, (1 - p) * 20);
      g.fillStyle = '#F4F6FB'; rr(40, y, SW - 80, 164, 28); g.fill(); g.fillStyle = r[2]; rr(70, y + 24, 108, 52, 26); g.fill(); T(r[0], 124, y + 62, 38, 800, r[1], 'center');
      g.fillStyle = '#E6E9FA'; rr(SW - 70 - 148, y + 24, 148, 52, 26); g.fill(); T(r[4], SW - 70 - 74 + 8, y + 62, 36, 700, PRI, 'center'); g.fillStyle = PRI; g.beginPath(); g.moveTo(SW - 70 - 130, y + 40); g.lineTo(SW - 70 - 130, y + 60); g.lineTo(SW - 70 - 114, y + 50); g.closePath(); g.fill();
      T(r[3], 70, y + 130, 46, 700, INK); g.restore(); });
    g.restore(); }
  g.restore();
  g.fillStyle = '#05080b'; rr(W / 2 - 120, 186, 240, 46, 23); g.fill();
  const [fx, fy] = FING(t), press = TAPS.some(c => t >= c && t < c + .18) ? 1 : 0, fo = ss(seg(t, 1.0, 1.6));
  g.save(); g.globalAlpha = .8 * fo; g.fillStyle = press ? 'rgba(40,50,70,.55)' : 'rgba(60,70,95,.38)'; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5; g.beginPath(); g.arc(fx, fy, press ? 30 : 38, 0, 6.3); g.fill(); g.stroke(); g.restore();
};
window.TEXTS = () => []; window.READY = true;
