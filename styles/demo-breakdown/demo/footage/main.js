// Fictional screen recording: "Kege Notes" (小格笔记), an invented note app with a smart-sort feature. No real product, brand or UI is imitated.
// It is the demo's *source footage*: the breakdown film is built from this clip exactly as it would be from a recording the user supplies.
import { clamp, seg, ss, eo, eio, lerp, track } from '/core/lib.js';
const W = 1920, H = 1080, cv = document.getElementById('c'), g = cv.getContext('2d'); const DUR = 30;
await Promise.all([500, 700, 900].map(w => document.fonts.load(`${w} 30px "Noto Sans SC"`, '小格笔记智能归类工作生活灵感待办')));
const F = 'Noto Sans SC', COL = { work: '#3C7BE8', life: '#E58A2B', idea: '#8A5CE0', todo: '#E2506B' }, NAME = { work: '工作', life: '生活', idea: '灵感', todo: '待办' };
const NOTES = [['下周一例会要讲的三个要点', 'work'], ['给妈妈买生日礼物', 'life'], ['做一个会自己整理的笔记 App', 'idea'], ['周五前交季度报告', 'todo'], ['客户反馈：导出太慢', 'work'], ['周末去哪儿徒步', 'life'], ['把会议录音转成文字', 'idea'], ['报销单寄给财务', 'todo']];
const ORDER = ['work', 'todo', 'life', 'idea'], NEWNOTE = '周日带孩子去公园野餐';
const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const T = (s, x, y, size, w = 500, col = '#26343a', al = 'left') => { g.font = `${w} ${size}px ${F}`; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };

// cursor path: [t, [x, y]] (smooth), clicks listed separately
const CUR = track([[0, [1500, 900]], [1.2, [1500, 900]], [3.4, [915, 102]], [4.0, [915, 102]], [7, [1180, 470]], [11, [1000, 600]], [13.6, [900, 640]], [15.4, [900, 640]], [16.0, [1290, 716]], [16.4, [1290, 716]], [18.4, [1100, 100]], [19.0, [1100, 100]], [21.3, [1225, 480]], [21.7, [1225, 480]], [23.3, [1550, 360]], [23.9, [1550, 360]], [24.4, [1000, 230]], [30, [1000, 232]]]);
const CLICKS = [4.0, 16.4, 19.0, 21.6, 23.9, 24.4];
const NEWAT = 24.8, TYPEEND = 27.0, ENTER = 27.5;
const group = (k, i) => ORDER.indexOf(NOTES[i][1]) * 10 + NOTES.filter((n, j) => j < i && n[1] === NOTES[i][1]).length;
export const EV = [...CLICKS.map(t => ({ t, type: 'click' })), ...NOTES.map((n, i) => ({ t: 6.6 + .55 * i, type: 'chip' })), { t: 11.2, type: 'whoosh' }, { t: 13.6, type: 'pop' }, { t: 17.0, type: 'ding' }, { t: 22.0, type: 'ding' }, { t: 21.7, type: 'switch' }, { t: 4.5, type: 'whoosh' },
  ...Array.from({ length: NEWNOTE.length }, (_, i) => ({ t: NEWAT + 0.06 + i * ((TYPEEND - NEWAT - .1) / NEWNOTE.length), type: 'key' })), { t: ENTER, type: 'click' }, { t: ENTER + .7, type: 'chip' }];
window.EV = EV; window.DUR = DUR;

function sidebar(t, counts, pulse) {
  g.fillStyle = '#EFEAE0'; g.fillRect(0, 0, 360, H);
  T('小格笔记', 44, 940, 40, 900, '#1f2d33'); g.fillStyle = '#1FA38A'; rr(44, 956, 54, 8, 4); g.fill();
  const items = [['全部便签', null], ['工作', 'work'], ['待办', 'todo'], ['生活', 'life'], ['灵感', 'idea']];
  items.forEach(([n, k], i) => { const y = 190 + i * 84, all = k === null;
    if (all) { g.fillStyle = '#FFFFFF'; rr(28, y - 44, 304, 70, 16); g.fill(); }
    if (k) { g.fillStyle = COL[k]; g.beginPath(); g.arc(62, y - 10, 10, 0, 6.3); g.fill(); }
    T(n, k ? 90 : 52, y, 32, all ? 800 : 600, all ? '#1f2d33' : '#44565c');
    const c = all ? NOTES.length + (t > ENTER + .1 ? 1 : 0) : (counts[k] || 0), pl = k && pulse[k] ? 1 + .35 * pulse[k] : 1; g.save(); g.translate(296, y - 8); g.scale(pl, pl);
    if (k && counts[k] !== undefined) { g.fillStyle = k && pulse[k] ? COL[k] : '#DDD6C7'; rr(-30, -26, 60, 44, 22); g.fill(); T(String(c), 0, 8, 28, 800, pulse[k] ? '#fff' : '#44565c', 'center'); } else if (all) T(String(c), 0, 8, 28, 800, '#44565c', 'center');
    g.restore(); });
}
function chipDraw(x, y, k, s) { if (s <= 0) return; g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = COL[k]; rr(-52, -22, 104, 44, 22); g.fill(); T(NAME[k], 0, 10, 26, 800, '#fff', 'center'); g.restore(); }
function cursor(x, y, press) { g.save(); g.translate(x, y); g.scale(1 - .08 * press, 1 - .08 * press); g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 8; g.shadowOffsetY = 3; g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 38); g.lineTo(10, 29); g.lineTo(18, 46); g.lineTo(26, 42); g.lineTo(18, 26); g.lineTo(32, 26); g.closePath(); g.fill(); g.stroke(); g.restore(); }

window.render = t => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2d4a4f'); bg.addColorStop(1, '#16282c'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.save(); g.translate(60, 40); g.beginPath(); g.roundRect(0, 0, 1800, 1000, 26); g.clip(); g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, 1800, 1000); g.translate(0, 0);
  // window content is drawn in window coordinates (0..1800, 0..1000)
  const counts = {}, pulse = {}; NOTES.forEach((n, i) => { const at = 6.6 + .55 * i; if (t >= at) { counts[n[1]] = (counts[n[1]] || 0) + 1; pulse[n[1]] = Math.max(pulse[n[1]] || 0, 1 - seg(t, at, at + .5)); } else counts[n[1]] = counts[n[1]] || 0; });
  const newIn = t >= ENTER + .7; if (newIn) { counts.life += 1; pulse.life = Math.max(pulse.life || 0, 1 - seg(t, ENTER + .7, ENTER + 1.2)); }
  g.save(); g.beginPath(); g.rect(0, 0, 300, 1000); g.clip(); g.scale(300 / 360, 1); sidebar(t, counts, pulse); g.restore();
  // toolbar
  g.fillStyle = '#FFFFFF'; g.fillRect(300, 0, 1500, 118); g.fillStyle = '#E9E3D6'; g.fillRect(300, 118, 1500, 2);
  g.fillStyle = '#F1ECE1'; rr(340, 30, 340, 58, 29); g.fill(); T('搜索便签', 384, 69, 28, 500, '#8A9599');
  const btnX = 720, btnW = 250, hot = ss(seg(t, 3.0, 3.6)), press = t > 3.95 && t < 4.15 ? 1 : 0, busy = t > 4.1 && t < 6.5;
  g.save(); g.fillStyle = busy || press ? '#168a73' : hot > .5 ? '#22b69a' : '#1FA38A'; rr(btnX, 28, btnW, 62, 31); g.fill();
  g.fillStyle = '#fff'; g.save(); g.translate(btnX + 44, 59); for (const [dx, dy, s] of [[0, 0, 13], [14, -12, 6], [14, 12, 5]]) { g.beginPath(); g.moveTo(dx, dy - s); g.lineTo(dx + s * .3, dy - s * .3); g.lineTo(dx + s, dy); g.lineTo(dx + s * .3, dy + s * .3); g.lineTo(dx, dy + s); g.lineTo(dx - s * .3, dy + s * .3); g.lineTo(dx - s, dy); g.lineTo(dx - s * .3, dy - s * .3); g.closePath(); g.fill(); } g.restore();
  T(busy ? '正在归类…' : '智能归类', btnX + 78, 70, 30, 800, '#fff'); g.restore();
  if (busy) { const a = (t - 4.1) * 6; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(btnX + btnW - 36, 59, 14, a, a + 4.2); g.stroke(); }
  const GX = 1040; g.fillStyle = '#F1ECE1'; g.beginPath(); g.arc(GX, 59, 30, 0, 6.3); g.fill(); g.strokeStyle = '#5b6c71'; g.lineWidth = 4; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(GX + Math.cos(a) * 14, 59 + Math.sin(a) * 14); g.lineTo(GX + Math.cos(a) * 21, 59 + Math.sin(a) * 21); g.stroke(); } g.beginPath(); g.arc(GX, 59, 11, 0, 6.3); g.stroke();
  // new-note field
  const typed = clamp(Math.floor((t - NEWAT) / (TYPEEND - NEWAT - .1) * NEWNOTE.length), 0, NEWNOTE.length), field = t < ENTER;
  g.fillStyle = '#FFFFFF'; rr(340, 146, 1420, 84, 20); g.fill(); g.strokeStyle = field && t > NEWAT - .3 ? '#1FA38A' : '#E1DACB'; g.lineWidth = 3; rr(340, 146, 1420, 84, 20); g.stroke();
  const shown = t >= ENTER ? '' : NEWNOTE.slice(0, typed); T(shown || (t >= NEWAT - .3 && t < ENTER ? '' : '写点什么，回车保存'), 376, 200, 32, 500, shown ? '#26343a' : '#9AA5A8');
  if (field && t > NEWAT - .3 && Math.floor(t * 2) % 2 === 0) { g.font = `500 32px ${F}`; const cx = 376 + g.measureText(shown).width + 4; g.fillStyle = '#1FA38A'; g.fillRect(cx, 164, 3, 42); }
  // note rows: positions interpolate from original order to grouped order at t = 11.2
  const move = eio(seg(t, 11.2, 12.4)), rowH = 90, y0 = 256 + (newIn ? 0 : 0), shift = t >= ENTER ? eo(seg(t, ENTER, ENTER + .5)) * rowH : 0;
  const order = NOTES.map((n, i) => ({ i, g: group(n[1], i) })).sort((a, b) => a.g - b.g).map(o => o.i);
  NOTES.forEach((n, i) => {
    const y = lerp(y0 + i * rowH, y0 + order.indexOf(i) * rowH, move) + shift, k = n[1], at = 6.6 + .55 * i, isTodo4 = i === 3, done = isTodo4 && t > 16.6, glow = ss(seg(t, at - .1, at + .2)) * (1 - ss(seg(t, at + .3, at + .9)));
    g.fillStyle = '#FFFFFF'; g.shadowColor = 'rgba(40,50,40,.12)'; g.shadowBlur = 14; g.shadowOffsetY = 4; rr(340, y, 1420, 80, 16); g.fill(); g.shadowColor = 'transparent';
    if (glow > 0) { g.strokeStyle = COL[k]; g.globalAlpha = glow; g.lineWidth = 4; rr(340, y, 1420, 80, 16); g.stroke(); g.globalAlpha = 1; }
    T(n[0], 376, y + 52, 32, 600, '#26343a'); if (done) { T('周五 18:00 提醒', 1190, y + 50, 26, 600, '#E2506B', 'right'); g.fillStyle = '#E2506B'; g.beginPath(); g.arc(1210, y + 40, 8, 0, 6.3); g.fill(); }
    chipDraw(1680, y + 40, k, eo(seg(t, at, at + .3)));
  });
  if (t >= ENTER) { const p = eo(seg(t, ENTER, ENTER + .5)), y = y0; g.save(); g.globalAlpha = p; g.fillStyle = '#FFFFFF'; g.shadowColor = 'rgba(40,50,40,.12)'; g.shadowBlur = 14; g.shadowOffsetY = 4; rr(340, y, 1420, 80, 16); g.fill(); g.shadowColor = 'transparent'; T(NEWNOTE, 376, y + 52, 32, 600, '#26343a'); chipDraw(1680, y + 40, 'life', eo(seg(t, ENTER + .7, ENTER + 1.0))); g.restore(); }
  // suggestion popover
  const pp = eo(seg(t, 13.6, 14.1)) * (1 - ss(seg(t, 16.5, 16.9)));
  if (pp > 0) { const px = 820, py = 420 + (order.indexOf(3)) * 0 + 0; g.save(); g.globalAlpha = pp; g.translate(0, (1 - pp) * 14); g.fillStyle = '#FFFFFF'; g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 40; g.shadowOffsetY = 12; rr(px, 470, 700, 250, 24); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#1FA38A'; rr(px, 470, 10, 250, 5); g.fill(); T('智能建议', px + 44, 524, 26, 800, '#1FA38A'); T('把「周五前交季度报告」', px + 44, 580, 34, 700); T('设为待办并加提醒？', px + 44, 626, 34, 700);
    const hov = t > 15.8; g.fillStyle = hov ? '#168a73' : '#1FA38A'; rr(px + 330, 650, 150, 52, 26); g.fill(); T('接受', px + 405, 686, 28, 800, '#fff', 'center'); g.fillStyle = '#F1ECE1'; rr(px + 500, 650, 150, 52, 26); g.fill(); T('忽略', px + 575, 686, 28, 700, '#5b6c71', 'center'); g.restore(); }
  // settings sheet
  const sp = eo(seg(t, 19.2, 19.7)) * (1 - ss(seg(t, 23.7, 24.1)));
  if (sp > 0) { g.save(); g.fillStyle = `rgba(20,30,30,${.35 * sp})`; g.fillRect(0, 0, 1800, 1000); g.globalAlpha = sp; g.translate(0, (1 - sp) * 30); g.fillStyle = '#FFFFFF'; g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 50; rr(520, 250, 760, 420, 28); g.fill(); g.shadowColor = 'transparent';
    T('设置', 570, 330, 38, 900); g.fillStyle = '#E9E3D6'; g.fillRect(570, 354, 660, 2); T('新便签自动归类', 570, 440, 32, 700); T('保存时自动加上分类标签', 570, 484, 26, 500, '#8A9599');
    const on = ss(seg(t, 21.6, 21.9)); g.fillStyle = on > .5 ? '#1FA38A' : '#CFC8B8'; rr(1110, 410, 110, 56, 28); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(lerp(1138, 1192, on), 438, 22, 0, 6.3); g.fill();
    T('归类规则', 570, 580, 32, 700); T('工作 · 待办 · 生活 · 灵感', 570, 624, 26, 500, '#8A9599'); g.restore(); }
  const toast = eo(seg(t, 22.0, 22.4)) * (1 - ss(seg(t, 23.4, 23.8))); if (toast > 0) { g.save(); g.globalAlpha = toast; g.translate(0, (1 - toast) * 30); g.fillStyle = '#1f2d33'; rr(600, 880, 600, 72, 36); g.fill(); T('已开启：新便签会自动归类', 900, 926, 28, 700, '#fff', 'center'); g.restore(); }
  g.restore();
  const [cx, cy] = CUR(t); cursor(cx, cy, CLICKS.some(c => t >= c && t < c + .14) ? 1 : 0);
};
window.TEXTS = () => []; window.READY = true;
