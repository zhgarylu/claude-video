// The invented player: "chorus". Fixed in screen space; the camera never touches it.
import { seg, ss, eo, hash } from '/core/lib.js';
import { K, VID, CHAPTERS, paused, PAUSE } from './timeline.js';

const TAU = Math.PI * 2, ACC = '#ff6a5c';
export const TITLE = 'Day 3: I will not kill this starter';
export const SUB = 'kneadfully  ·  first sourdough, no panic';
const PLACEHOLDER = 'Send a bullet...', TYPED = 'Day 4: bagels?';
const BX = 44, BW = 1832, BY = 1006;
export const barX = tau => BX + BW * Math.min(1, tau / VID);
export const chapterAt = tau => CHAPTERS.find(c => tau >= c.a && tau < c.b) || CHAPTERS[CHAPTERS.length - 1];
const F = (w, s) => `${w} ${s}px "Barlow SC"`;
const counts = (tau) => tau >= K.burst ? ['12.9K', '3.2K', '9.7K'] : ['12.8K', '3.1K', '9.6K'];
const BTN = [{ x: 1580, col: '#ff6fa1' }, { x: 1698, col: '#ffcf4d' }, { x: 1816, col: '#ffe98a' }];
const typedN = tau => Math.floor(seg(tau, K.type0, K.send - 0.25) * (TYPED.length + 1));

function icon(c, kind, x, y, s, colr, fill) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3.2; c.strokeStyle = colr; c.fillStyle = colr; c.lineJoin = 'round';
  if (kind === 0) { c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-26, -4, -14, -22, 0, -9); c.bezierCurveTo(14, -22, 26, -4, 0, 12); fill ? c.fill() : c.stroke(); }
  else if (kind === 1) { c.beginPath(); c.arc(0, 0, 16, 0, TAU); fill ? c.fill() : c.stroke(); c.fillStyle = fill ? '#8a5a00' : colr; c.font = F(800, 20); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('C', 0, 1.5); c.textAlign = 'left'; }
  else { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 7.5 : 17, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r + 1); } c.closePath(); fill ? c.fill() : c.stroke(); }
  c.restore();
}

export function drawChrome(c, tau, t, nBul) {
  const pz = paused(t);
  // scrims
  let g = c.createLinearGradient(0, 0, 0, 130); g.addColorStop(0, 'rgba(8,10,16,0.68)'); g.addColorStop(1, 'rgba(8,10,16,0)'); c.fillStyle = g; c.fillRect(0, 0, 1920, 130);
  g = c.createLinearGradient(0, 920, 0, 1080); g.addColorStop(0, 'rgba(8,10,16,0)'); g.addColorStop(1, 'rgba(8,10,16,0.82)'); c.fillStyle = g; c.fillRect(0, 920, 1920, 160);
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.font = F(700, 34); c.fillStyle = '#fff'; c.fillText(TITLE, 44, 52);
  c.font = F(500, 22); c.fillStyle = 'rgba(255,255,255,0.72)'; c.fillText(SUB, 44, 84);
  // brand and bullet count
  c.textAlign = 'right'; c.font = F(800, 32); c.fillStyle = '#fff'; c.fillText('chorus', 1876, 52); const bw = c.measureText('chorus').width;
  c.fillStyle = ACC; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(1876 - bw - 20 - i * 17, 42 - i * 2, 6 - i, 0, TAU); c.fill(); }
  c.font = F(500, 22); c.fillStyle = 'rgba(255,255,255,0.72)'; c.fillText(`bullets on  ·  ${(1000 + nBul * 13).toLocaleString('en-US')}`, 1876, 84); c.textAlign = 'left';
  // progress bar in chapters
  for (const ch of CHAPTERS) {
    const xa = barX(ch.a) + 3, xb = barX(ch.b) - 3, played = Math.max(0, Math.min(xb, barX(tau)) - xa), buf = Math.max(0, Math.min(xb, barX(tau + 9)) - xa);
    c.fillStyle = 'rgba(255,255,255,0.26)'; c.beginPath(); c.roundRect(xa, BY - 4, xb - xa, 8, 4); c.fill();
    if (buf > 0) { c.fillStyle = 'rgba(255,255,255,0.36)'; c.beginPath(); c.roundRect(xa, BY - 4, buf, 8, 4); c.fill(); }
    if (played > 0) { c.fillStyle = ACC; c.beginPath(); c.roundRect(xa, BY - 4, played, 8, 4); c.fill(); }
  }
  const kx = barX(tau); c.fillStyle = '#fff'; c.beginPath(); c.arc(kx, BY, 11, 0, TAU); c.fill(); c.strokeStyle = ACC; c.lineWidth = 4; c.stroke();
  // play / pause
  c.fillStyle = '#fff'; if (pz) { c.beginPath(); c.moveTo(56, 1030); c.lineTo(56, 1062); c.lineTo(82, 1046); c.closePath(); c.fill(); } else { c.fillRect(56, 1030, 9, 32); c.fillRect(72, 1030, 9, 32); }
  const m = Math.floor(tau / 60), s = Math.floor(tau % 60), tot = `${Math.floor(VID / 60)}:${String(Math.floor(VID % 60)).padStart(2, '0')}`;
  c.font = F(600, 24); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(`${m}:${String(s).padStart(2, '0')} / ${tot}`, 108, 1046);
  const ch = chapterAt(tau); c.fillStyle = ACC; c.beginPath(); c.arc(262, 1046, 6, 0, TAU); c.fill(); c.font = F(700, 22); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillText(ch.id, 278, 1047);
  // input pill
  c.fillStyle = 'rgba(255,255,255,0.13)'; c.strokeStyle = 'rgba(255,255,255,0.32)'; c.lineWidth = 2; c.beginPath(); c.roundRect(560, 1022, 760, 48, 24); c.fill(); c.stroke();
  const typing = tau >= K.type0 && tau < K.send, nT = typedN(tau);
  c.fillStyle = typing ? '#ffd36a' : '#fff'; c.beginPath(); c.arc(590, 1046, 11, 0, TAU); c.fill();
  c.font = F(500, 24);
  if (typing) { c.fillStyle = '#ffd36a'; c.fillText(TYPED.slice(0, nT), 620, 1047); const cw = c.measureText(TYPED.slice(0, nT)).width; if (Math.floor(tau * 3) % 2 === 0) c.fillRect(622 + cw, 1034, 2, 26); }
  else { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillText(PLACEHOLDER, 620, 1047); }
  // like / coin / favourite, held to a ring and then burst
  const hold = seg(tau, K.press0, K.burst), cn = counts(tau);
  BTN.forEach((b, i) => {
    const pop = tau >= K.burst ? 1 + 0.35 * Math.max(0, 1 - (tau - K.burst) * 4) : 1 + 0.15 * hold, on = tau >= K.burst || hold > 0.01;
    icon(c, i, b.x, 1046, 0.9 * pop, on ? b.col : 'rgba(255,255,255,0.9)', tau >= K.burst);
    if (hold > 0.01 && tau < K.burst) { c.strokeStyle = b.col; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(b.x, 1046, 27, -Math.PI / 2, -Math.PI / 2 + TAU * hold); c.stroke(); c.lineCap = 'butt'; }
    c.font = F(600, 22); c.fillStyle = 'rgba(255,255,255,0.9)'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(cn[i], b.x + 32, 1047);
  });
  // the burst: tokens fly up from the three buttons
  const bt = tau - K.burst;
  if (bt > 0 && bt < 1.4) BTN.forEach((b, i) => {
    for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + (hash(i * 31 + k * 1.7) - 0.5) * 2.4, sp = 300 + 420 * hash(i * 17 + k * 3.1), px = b.x + Math.cos(a) * sp * bt, py = 1040 + Math.sin(a) * sp * bt + 520 * bt * bt;
      c.globalAlpha = Math.max(0, 1 - bt / 1.4); icon(c, i, px, py, 0.55 + 0.35 * hash(k * 5.5 + i), b.col, true); c.globalAlpha = 1; }
    c.strokeStyle = b.col; c.globalAlpha = Math.max(0, 1 - bt * 3); c.lineWidth = 6; c.beginPath(); c.arc(b.x, 1046, 28 + bt * 220, 0, TAU); c.stroke(); c.globalAlpha = 1;
  });
  // pause: the player dims the picture and shows its big glyph
  if (pz) {
    const a = Math.min(1, (t - PAUSE.at) / 0.2, (PAUSE.at + PAUSE.len - t) / 0.2 + 0.0001);
    c.fillStyle = `rgba(6,8,14,${0.22 * a})`; c.fillRect(0, 130, 1920, 800);
    c.globalAlpha = a; c.fillStyle = 'rgba(10,12,18,0.55)'; c.beginPath(); c.arc(960, 540, 84, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 5; c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(938, 506); c.lineTo(938, 574); c.lineTo(996, 540); c.closePath(); c.fill(); c.globalAlpha = 1;
  }
  c.textBaseline = 'alphabetic';
}

export function uiTexts(c, tau) {
  const out = [], box = (id, text, font, x, y, h, right) => { c.font = font; const w = c.measureText(text).width; out.push({ id, text, x0: right ? x - w : x, y0: y - h / 2, x1: right ? x : x + w, y1: y + h / 2 }); };
  box('title', TITLE, F(700, 34), 44, 44, 34); box('sub', SUB, F(500, 22), 44, 78, 22);
  box('brand', 'chorus', F(800, 32), 1876, 44, 32, true);
  box('chapter', chapterAt(tau).id, F(700, 22), 278, 1047, 22);
  const typing = tau >= K.type0 && tau < K.send;
  box('input', typing ? TYPED : PLACEHOLDER, F(500, 24), 620, 1047, 24);
  const cn = counts(tau); BTN.forEach((b, i) => box('count' + i, cn[i], F(600, 22), b.x + 32, 1047, 22));
  return out;
}
