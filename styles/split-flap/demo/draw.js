// Drawing: flap faces (cached sprites), the hinged fall of one flap, the housing, the section drawing.
import { ALPHA, NUM } from './flap.js';
import { T } from './timeline.js';
import { COLS, ROWS, CW, CH, PX, PY, X0, Y0, CCOLS, CAPW, CAPH, CPX, CPY, CX0, CY0, spinTimes } from './film.js';

// ---------------------------------------------------------------- tones: card colours and ink
const TONES = {
  n:     { top: ['#302c28', '#252220'], bot: ['#1e1c19', '#151311'], ink: '#f3e7ca' },
  cap:   { top: ['#26231f', '#1d1b18'], bot: ['#191715', '#121110'], ink: '#d9cca9' },
  amber: { top: ['#f3b63c', '#e6a11d'], bot: ['#da8f13', '#c47c0b'], ink: '#1b1307' },
  green: { top: ['#3aa86e', '#2d935b'], bot: ['#26824d', '#1e7041'], ink: '#eef9f1' },
  lit:   { top: ['#302c28', '#252220'], bot: ['#1e1c19', '#151311'], ink: '#ffb43c' },
  trail: { top: ['#2b2620', '#211d18'], bot: ['#1b1815', '#13110f'], ink: '#d99a2e' },
};
const FACES = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// one full face (both halves) of a card carrying character ch, drawn at scale S
export function face(ch, toneName, w, h, S) {
  const key = ch + '|' + toneName + '|' + w + 'x' + h + '|' + S;
  let c = FACES.get(key); if (c) return c;
  const tn = TONES[toneName] || TONES.n;
  c = mk(w * S, h * S); const g = c.getContext('2d'); g.scale(S, S);
  const r = Math.max(2.5, w * 0.09), hh = h / 2;
  g.save(); rr(g, 0, 0, w, h, r); g.clip();
  let gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, tn.top[0]); gr.addColorStop(1, tn.top[1]); g.fillStyle = gr; g.fillRect(0, 0, w, hh + .5);
  gr = g.createLinearGradient(0, hh, 0, h); gr.addColorStop(0, tn.bot[0]); gr.addColorStop(1, tn.bot[1]); g.fillStyle = gr; g.fillRect(0, hh, w, hh);
  if (ch !== ' ') {
    const fs = h * 0.80; g.font = `500 ${fs}px Barlow`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const m = g.measureText(ch).width, fit = Math.min(1, (w * 0.80) / m);
    g.save(); g.translate(w / 2, h / 2 + fs * 0.35); g.scale(fit, 1);
    g.fillStyle = tn.ink; g.strokeStyle = tn.ink; g.lineWidth = fs * 0.055; g.lineJoin = 'round';
    g.strokeText(ch, 0, 0); g.fillText(ch, 0, 0); g.restore();
  }
  // light from above: a soft sheen on the top edge of each half, a darker foot
  gr = g.createLinearGradient(0, 0, 0, h * 0.12); gr.addColorStop(0, 'rgba(255,245,225,.10)'); gr.addColorStop(1, 'rgba(255,245,225,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.12);
  gr = g.createLinearGradient(0, hh, 0, hh + h * 0.08); gr.addColorStop(0, 'rgba(255,245,225,.06)'); gr.addColorStop(1, 'rgba(255,245,225,0)'); g.fillStyle = gr; g.fillRect(0, hh, w, h * 0.08);
  gr = g.createLinearGradient(0, h * 0.9, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = gr; g.fillRect(0, h * 0.9, w, h * 0.1);
  g.restore();
  FACES.set(key, c); return c;
}
const half = (ctx, f, bottom, x, y, w, h) => { if (h < 0.25) return; ctx.drawImage(f, 0, bottom ? f.height / 2 : 0, f.width, f.height / 2, x, y, w, h); };
export const sprScale = px => px > 8 ? 16 : px > 4 ? 8 : px > 2 ? 4 : px > 1.05 ? 2 : 1;   // px = on-screen pixels per world pixel

// one cell at (x,y), size w x h, state st (from Cell.at), wheel string
export function drawCell(ctx, x, y, w, h, st, wheel, S) {
  const hh = h / 2, fb = face(wheel[st.b], st.tb, w, h, S);
  const slit = () => {
    const sh = Math.max(1.4, h * 0.026);
    ctx.fillStyle = '#040303'; ctx.fillRect(x, y + hh - sh / 2, w, sh);
    ctx.fillStyle = 'rgba(255,238,205,.11)'; ctx.fillRect(x, y + hh + sh / 2, w, Math.max(.6, h * .008));
    ctx.fillStyle = '#050404'; ctx.fillRect(x - 1, y + hh - h * 0.03, Math.max(1.5, w * 0.05), h * 0.06); ctx.fillRect(x + w - Math.max(1.5, w * .05) + 1, y + hh - h * 0.03, Math.max(1.5, w * .05), h * 0.06);
  };
  if (st.p < 0) { half(ctx, fb, 0, x, y, w, hh); half(ctx, fb, 1, x, y + hh, w, hh); slit(); return; }
  const fa = face(wheel[st.a], st.ta, w, h, S), th = Math.PI * st.p * st.p, c = Math.cos(th), s = Math.sin(th);
  half(ctx, fb, 0, x, y, w, hh); half(ctx, fa, 1, x, y + hh, w, hh);
  if (th < Math.PI / 2) { ctx.fillStyle = `rgba(0,0,0,${0.42 * (1 - th / (Math.PI / 2))})`; ctx.fillRect(x, y, w, hh); }
  slit();
  if (th < Math.PI / 2) {
    const ht = hh * c; half(ctx, fa, 0, x, y + hh - ht, w, ht);
    ctx.fillStyle = `rgba(0,0,0,${0.62 * s})`; ctx.fillRect(x, y + hh - ht, w, ht);
    ctx.fillStyle = `rgba(255,240,210,${0.22 * (1 - s * 0.6)})`; ctx.fillRect(x, y + hh - ht, w, Math.max(.8, h * .012));
  } else {
    const hb = hh * -c; half(ctx, fb, 1, x, y + hh, w, hb);
    ctx.fillStyle = `rgba(0,0,0,${0.62 * s})`; ctx.fillRect(x, y + hh, w, hb);
    ctx.fillStyle = `rgba(255,240,210,${0.16 * (1 - s)})`; ctx.fillRect(x, y + hh + hb - Math.max(.8, h * .01), w, Math.max(.8, h * .01));
  }
}

// ---------------------------------------------------------------- text helper
export function label(ctx, s, x, y, size, col, o = {}) {
  ctx.save(); ctx.font = `500 ${size}px Barlow`; ctx.fillStyle = col; ctx.textBaseline = 'alphabetic'; ctx.textAlign = o.align || 'left';
  ctx.letterSpacing = (o.ls ?? 0.12) * size + 'px'; if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  const w = ctx.measureText(s).width; ctx.fillText(s, x, y); ctx.restore(); return w;
}

// ---------------------------------------------------------------- housing
export function drawWall(ctx, t) {
  ctx.fillStyle = '#0b0a09'; ctx.fillRect(-3000, -3000, 8000, 8000);
  const g = ctx.createLinearGradient(0, -400, 0, 1400); g.addColorStop(0, '#16130f'); g.addColorStop(1, '#0a0908'); ctx.fillStyle = g; ctx.fillRect(-3000, -400, 8000, 1800);
  ctx.strokeStyle = 'rgba(255,235,200,.028)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let x = -3000; x < 5000; x += 192) { ctx.moveTo(x, -3000); ctx.lineTo(x, 3000); } ctx.stroke();
}
export function drawHousing(ctx) {
  // two hanger rods from the ceiling
  for (const x of [330, 1590]) { const g = ctx.createLinearGradient(x - 6, 0, x + 6, 0); g.addColorStop(0, '#2a2825'); g.addColorStop(.35, '#6b665c'); g.addColorStop(1, '#171512'); ctx.fillStyle = g; ctx.fillRect(x - 6, -3000, 12, 3068); }
  // plate
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  rr(ctx, 70, 62, 1780, 804, 16); let g = ctx.createLinearGradient(0, 62, 0, 866); g.addColorStop(0, '#24211d'); g.addColorStop(.12, '#171512'); g.addColorStop(1, '#0c0b0a'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  rr(ctx, 70.5, 62.5, 1779, 803, 16); ctx.strokeStyle = 'rgba(255,238,205,.18)'; ctx.lineWidth = 1.6; ctx.stroke();
  rr(ctx, 84, 76, 1752, 776, 10); ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 2; ctx.stroke();
  for (const [x, y] of [[96, 88], [1824, 88], [96, 840], [1824, 840]]) {
    const b = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8); b.addColorStop(0, '#7b756a'); b.addColorStop(1, '#1b1916'); ctx.fillStyle = b; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#0b0a09'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 4, y - 1); ctx.lineTo(x + 3, y + 2); ctx.stroke();
  }
  // troughs
  for (let r = 0; r < ROWS; r++) {
    const y = Y0 + r * PY; rr(ctx, X0 - 9, y - 7, (COLS - 1) * PX + CW + 18, CH + 14, 6); ctx.fillStyle = '#050404'; ctx.fill();
    ctx.fillStyle = 'rgba(255,235,200,.05)'; ctx.fillRect(X0 - 8, y + CH + 6, (COLS - 1) * PX + CW + 16, 1);
  }
}
export function drawStripHousing(ctx) {
  let g;
  // announcement strip
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  rr(ctx, 150, 892, 1620, 154, 12); g = ctx.createLinearGradient(0, 892, 0, 1046); g.addColorStop(0, '#1d1a17'); g.addColorStop(1, '#0c0b0a'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  rr(ctx, 150.5, 892.5, 1619, 153, 12); ctx.strokeStyle = 'rgba(255,238,205,.14)'; ctx.lineWidth = 1.4; ctx.stroke();
  for (let r = 0; r < 2; r++) { rr(ctx, CX0 - 6, CY0 + r * CPY - 4, (CCOLS - 1) * CPX + CAPW + 12, CAPH + 8, 5); ctx.fillStyle = '#050404'; ctx.fill(); }
  label(ctx, 'ANNOUNCEMENT', 174, 884, 11, 'rgba(235,220,185,.38)', { ls: .3 });
}

// ---------------------------------------------------------------- the whole board (world space) and the strip (drawn in world space too, but placed on screen by the page)
export function drawCells(ctx, cells, cam, vw, vh) {
  const px = cam.z;                      // screen pixels per world pixel
  for (const c of cells) {
    const sx = (c.x - cam.cx) * cam.z + vw / 2, sy = (c.y - cam.cy) * cam.z + vh / 2;
    if (sx > vw + 4 || sy > vh + 4 || sx + c.w * cam.z < -4 || sy + c.h * cam.z < -4) continue;
    drawCell(ctx, c.x, c.y, c.w, c.h, c.st, c.wheel, sprScale(px * 1.1));
  }
}

// ---------------------------------------------------------------- the section drawing
export const AX = 520, HY = 548, L = 207;           // spool axis x, hinge height, flap half-length
export const FRONT = { x: 1086, y: HY - 207, s: 4.4 };
const sgn = x => (x < 0 ? -1 : 1);
let HATCH = null;
function hatch(ctx) {
  if (HATCH) return HATCH; const c = mk(10, 10), g = c.getContext('2d'); g.strokeStyle = 'rgba(235,215,170,.34)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2, 12); g.lineTo(12, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(8, 12); g.lineTo(12, 8); g.stroke(); HATCH = ctx.createPattern(c, 'repeat'); return HATCH;
}
const sstep = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
const SPIN = spinTimes();
function flapPlate(ctx, deg, fill, edge, lw = 9, len = L) {
  ctx.save(); ctx.translate(AX, HY); ctx.rotate(deg * Math.PI / 180);
  const g = ctx.createLinearGradient(-lw / 2, 0, lw / 2, 0); g.addColorStop(0, edge); g.addColorStop(.28, fill); g.addColorStop(1, '#0d0c0b'); ctx.fillStyle = g;
  rr(ctx, -lw / 2, -len, lw, len - 13, 2.2); ctx.fill();
  ctx.restore();
}
export function drawSection(ctx, t, F, texts) {
  const vc = F.vc, st = vc.at(t);
  ctx.fillStyle = '#0e0c0a'; ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle = 'rgba(255,235,200,.035)'; for (let x = 40; x < 1920; x += 40) for (let y = 40; y < 1080; y += 40) ctx.fillRect(x, y, 1.6, 1.6);
  // ---- the wheel in order (strip of 40 small cards)
  const SX = 104, SW = 34, SH = 48, SP = 43, SY = 128;
  label(ctx, 'THE WHEEL, IN ORDER', SX, 100, 17, 'rgba(235,220,185,.7)', { ls: .26 });
  label(ctx, 'SECTION OF ONE CELL', 1816, 100, 17, 'rgba(235,220,185,.45)', { ls: .26, align: 'right' });
  const cur = st.p < 0 ? st.b : st.b;      // the card that is on show (or about to be)
  const fallen = SPIN.filter(tt => tt <= t).length;                    // flaps of the long fall that have landed
  const vB = ALPHA.indexOf('B'), vA = ALPHA.indexOf('A');
  for (let i = 0; i < 40; i++) {
    const trail = fallen > 0 && ((i - vB + 40) % 40) >= 1 && ((i - vB + 40) % 40) <= fallen;
    const tone = i === cur ? 'amber' : trail ? 'trail' : 'cap';
    const f = face(ALPHA[i], tone, SW, SH, 2);
    ctx.drawImage(f, 0, 0, f.width, f.height / 2, SX + i * SP, SY, SW, SH / 2); ctx.drawImage(f, 0, f.height / 2, f.width, f.height / 2, SX + i * SP, SY + SH / 2, SW, SH / 2);
    ctx.fillStyle = '#040303'; ctx.fillRect(SX + i * SP, SY + SH / 2 - 1, SW, 2);
  }
  // target flag over A
  const ax0 = SX + vA * SP + SW / 2;
  if (t > T.arrow - 0.4) { label(ctx, 'A', ax0, SY + SH + 28, 17, '#ffb43c', { align: 'center', ls: 0 }); ctx.fillStyle = '#ffb43c'; ctx.beginPath(); ctx.moveTo(ax0, SY + SH + 5); ctx.lineTo(ax0 - 6, SY + SH + 14); ctx.lineTo(ax0 + 6, SY + SH + 14); ctx.fill(); }
  // the one step back, and the pawl that refuses it
  const bx = SX + vB * SP + SW / 2;
  if (t >= T.arrow && t < T.spin0 + 0.25) {
    const a = sstep(T.arrow, T.arrow + .35, t), dead = t > T.pawl;
    ctx.save(); ctx.globalAlpha = (dead ? 0.55 : 1) * a * (1 - sstep(T.spin0, T.spin0 + .25, t)); ctx.strokeStyle = dead ? '#c9573c' : '#ffb43c'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(bx, SY - 10); ctx.quadraticCurveTo((bx + ax0) / 2, SY - 44, ax0 + 3, SY - 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(ax0 - 2, SY - 8); ctx.lineTo(ax0 + 9, SY - 22); ctx.lineTo(ax0 + 11, SY - 6); ctx.fill();
    if (dead) { ctx.lineWidth = 4; ctx.setLineDash([]); const mx = (bx + ax0) / 2, my = SY - 38; ctx.beginPath(); ctx.moveTo(mx - 9, my - 9); ctx.lineTo(mx + 9, my + 9); ctx.moveTo(mx + 9, my - 9); ctx.lineTo(mx - 9, my + 9); ctx.stroke(); }
    ctx.restore();
  }
  if (t >= T.spin0) { // the long way: a bracket under the strip from B on to the end, wrapping to A
    const u = sstep(T.spin0, T.spin0 + 0.5, t);
    ctx.save(); ctx.globalAlpha = u; ctx.strokeStyle = 'rgba(255,180,60,.75)'; ctx.lineWidth = 2.5;
    const y0 = SY + SH + 8, xe = SX + 39 * SP + SW; ctx.beginPath(); ctx.moveTo(bx + 14, y0); ctx.lineTo(xe, y0); ctx.lineTo(xe, y0 + 10); ctx.stroke();
    ctx.restore();
  }
  // ---- side view
  const wall = hatch(ctx);
  ctx.save();
  // case
  ctx.fillStyle = '#12100e'; rr(ctx, AX - 232, HY - 236, 232 + 232, 472, 10); ctx.fill();
  ctx.fillStyle = wall; ctx.fillRect(AX - 246, HY - 250, 480, 14); ctx.fillRect(AX - 246, HY + 236, 480, 14); ctx.fillRect(AX - 246, HY - 250, 14, 500);
  ctx.strokeStyle = 'rgba(235,215,170,.8)'; ctx.lineWidth = 2; ctx.strokeRect(AX - 246, HY - 250, 480, 14); ctx.strokeRect(AX - 246, HY + 236, 480, 14); ctx.strokeRect(AX - 246, HY - 250, 14, 500);
  // window plane at the front (right)
  ctx.strokeStyle = 'rgba(235,215,170,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(AX + 234, HY - 236); ctx.lineTo(AX + 234, HY + 236); ctx.stroke();
  ctx.fillStyle = 'rgba(180,200,210,.05)'; ctx.fillRect(AX + 230, HY - 207, 8, 414);
  ctx.restore();
  // flaps
  const p = st.p, fallingNow = p >= 0;
  const sUp = fallingNow ? sstep(0, 0.35, p) : 0, sLow = fallingNow ? sstep(0.78, 1, p) : 0;
  for (let j = 14; j >= 1; j--) flapPlate(ctx, 3 - 2.0 * (j - sUp), '#2c2824', '#5d5547');
  for (let j = 13; j >= 0; j--) flapPlate(ctx, 177 + 2.0 * (j + sLow), '#2c2824', '#5d5547');
  if (!fallingNow) { flapPlate(ctx, 3, '#40392f', '#d3bf8d'); flapPlate(ctx, 177, '#40392f', '#d3bf8d'); }
  else {
    const th = 3 + 174 * p * p;
    for (const [d, a] of [[0.14, .10], [0.07, .18]]) { const pp = Math.max(0, p - d), tg = 3 + 174 * pp * pp; ctx.save(); ctx.globalAlpha = a; flapPlate(ctx, tg, '#6a5328', '#ffb43c'); ctx.restore(); }
    flapPlate(ctx, th, '#5d4a22', '#ffcb6b', 10);
  }
  // spool and ratchet
  let rot = (st.p < 0 ? st.b : st.b + st.p) * 9;
  if (t > T.pawl - 0.16 && t < T.pawl) rot -= 5 * Math.sin(Math.PI * (t - (T.pawl - 0.16)) / 0.16);
  ctx.save(); ctx.translate(AX, HY); ctx.rotate(rot * Math.PI / 180);
  ctx.fillStyle = '#34312c'; ctx.beginPath(); for (let k = 0; k < 40; k++) { const a0 = k * 2 * Math.PI / 40, a1 = a0 + 2 * Math.PI / 40 * 0.82; ctx.lineTo(Math.cos(a0) * 31, Math.sin(a0) * 31); ctx.lineTo(Math.cos(a0) * 41, Math.sin(a0) * 41); ctx.lineTo(Math.cos(a1) * 31, Math.sin(a1) * 31); } ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a7f69'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#1c1a17'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill(); ctx.strokeStyle = '#6a6254'; ctx.stroke();
  ctx.fillStyle = '#8a7f69'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
  ctx.restore();
  // the pawl
  const hit = t > T.pawl - 0.02 && t < T.pawl + 0.22;
  ctx.save(); ctx.translate(AX + 70, HY + 58); ctx.rotate(-0.55 + (hit ? 0.1 * Math.sin((t - T.pawl) * 40) : 0));
  ctx.fillStyle = hit ? '#e8b04a' : '#8a7f69'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-62, -4); ctx.lineTo(-70, 2); ctx.lineTo(-62, 5); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1c1a17'; ctx.beginPath(); ctx.arc(2, 3, 4, 0, 7); ctx.fill(); ctx.restore();
  label(ctx, 'RATCHET AND PAWL', AX + 100, HY + 128, 13, 'rgba(235,220,185,.5)', { ls: .22 });
  label(ctx, 'SIDE', AX - 232, HY + 292, 17, 'rgba(235,220,185,.6)', { ls: .3 });
  // ---- projection lines from the hinge to the front view
  ctx.strokeStyle = 'rgba(235,215,170,.32)'; ctx.lineWidth = 1.4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(AX + 240, HY); ctx.lineTo(FRONT.x - 20, HY); ctx.stroke(); ctx.setLineDash([]);
  // ---- front view: the same cell, as on the board
  const fw = CW * FRONT.s, fh = CH * FRONT.s;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12; ctx.fillStyle = '#050404'; rr(ctx, FRONT.x - 14, FRONT.y - 14, fw + 28, fh + 28, 10); ctx.fill(); ctx.restore();
  drawCell(ctx, FRONT.x, FRONT.y, fw, fh, st, ALPHA, 16 > 8 ? 8 : 8);
  label(ctx, 'FRONT', FRONT.x, HY + 292, 17, 'rgba(235,220,185,.6)', { ls: .3 });
  // ---- the flap counter
  const cx0 = 1560;
  label(ctx, 'FLAPS FALLEN', cx0, 340, 17, 'rgba(235,220,185,.7)', { ls: .26 });
  for (const [cell, x] of [[F.ct, cx0], [F.cu, cx0 + 112]]) {
    const cs = cell.at(t); ctx.save(); ctx.fillStyle = '#050404'; rr(ctx, x - 8, 358, 112, 200, 8); ctx.fill(); ctx.restore();
    drawCell(ctx, x, 366, 96, 184, cs, NUM, 8);
  }
  // a quiet drift of the whole drawing is done by the page (camera scale)
}
