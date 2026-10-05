// chat.js: the engine. An invented messenger drawn on a 2D canvas, as a function of time.
// Phone space is 640 x 720 units (header 88, chat 88..640, input bar 640..720). The camera (main.js) maps phone space to the screen.
//   const chat = new Chat(items, { people, title, members, pins, voice, recallLabel });  // measures every bubble once
//   chat.draw(ctx, t);          // wallpaper, bubbles, header, pinned banner, input bar at time t
//   chat.itemBox(id, t)         // where a bubble is right now (for camera targets)
//   chat.ghosts(t)              // bubble rectangles, for the faint giant chat behind the phone
// Item kinds: text, image, link, voice, system, typing. Fields: id, who, t, time, reply, reactions, recall, seen, seenBy, draft.
import { clamp, lerp, seg, ss, eo, back, hash } from '/core/lib.js';

export const PW = 640, PH = 720, HEAD = 88, PIN = 44, FOOT = 80, CBOT = PH - FOOT;
export const COL = {
  wall: '#ece6f5', doodle: '#ddd3ee', recv: '#ffffff', recvInk: '#2a2140', sent: '#5a4be0', sentInk: '#ffffff',
  nana: '#ffeab0', nanaInk: '#4a3200', sys: '#4a4166', sysBg: 'rgba(74,58,122,.13)', muted: '#8a82a0', accent: '#5a4be0',
};
const F = {
  body: '600 26px Nunito', name: '800 17px Nunito', time: '600 14px Nunito', sys: '700 18px Nunito', quote: '600 16px Nunito',
  quoteName: '800 14px Nunito', cap: '600 25px Nunito', title: '800 24px Nunito', domain: '600 16px Nunito', tr: '600 22px Nunito',
  head: '800 28px Nunito', sub: '600 16px Nunito', pin: '600 17px Nunito', pinLab: '800 13px Nunito', ph: '600 22px Nunito',
};
const M = document.createElement('canvas').getContext('2d');
const tw = (s, font) => { M.font = font; return M.measureText(s).width; };
function wrap(text, font, maxW) {
  M.font = font; const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (M.measureText(test).width <= maxW || !cur) cur = test; else { lines.push(cur); cur = w; }
  }
  lines.push(cur);
  return lines.map(s => ({ s, w: M.measureText(s).width }));
}
function ellipsize(text, font, maxW) {
  if (tw(text, font) <= maxW) return text;
  let s = text; while (s.length > 1 && tw(s + '…', font) > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ---- text registry for readcheck: reg() is called while drawing, with phone-space boxes ----
export const CAM = { z: 1.5, cx: 320, cy: 360, sx: 0, sy: 0 };
let TX = [];
export const takeTexts = () => TX;
export const clearTexts = () => { TX = []; };
function reg(id, text, x0, y0, x1, y1, vis) {
  const { z, cx, cy, sx, sy } = CAM;
  let X0 = (x0 - cx) * z + 960 + sx, X1 = (x1 - cx) * z + 960 + sx, Y0 = (y0 - cy) * z + 540 + sy, Y1 = (y1 - cy) * z + 540 + sy;
  const v = vis || [0, 0, PW, PH];
  if (x0 < v[0] || x1 > v[2] || y0 < v[1] || y1 > v[3]) Y0 = -1e4;   // partly hidden by the header, the pin or the input bar: not fully visible
  TX.push({ id, text, x0: X0, y0: Y0, x1: X1, y1: Y1 });
}
const tbox = (x, base, w, fs) => [x, base - fs * 0.86, x + w, base + fs * 0.26];

// ---- small drawings ----
function heart(ctx, cx, cy, s, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy + s * .9);
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * .1, cx - s * .8, cy - s * 1.1, cx, cy - s * .35);
  ctx.bezierCurveTo(cx + s * .8, cy - s * 1.1, cx + s * 1.5, cy - s * .1, cx, cy + s * .9); ctx.fill();
}
function laugh(ctx, cx, cy, r) {
  ctx.fillStyle = '#ffc93c'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6a4300'; ctx.lineWidth = r * .16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - r * .5, cy - r * .22); ctx.lineTo(cx - r * .22, cy - r * .42); ctx.moveTo(cx + r * .5, cy - r * .22); ctx.lineTo(cx + r * .22, cy - r * .42); ctx.stroke();
  ctx.fillStyle = '#6a4300'; ctx.beginPath(); ctx.moveTo(cx - r * .6, cy + r * .05); ctx.quadraticCurveTo(cx, cy + r * .95, cx + r * .6, cy + r * .05); ctx.closePath(); ctx.fill();
}
function ticks(ctx, x, y, col) {   // two check marks, baseline y
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 3.5, y - 1.5); ctx.lineTo(x + 10, y - 9); ctx.moveTo(x + 6, y - 2.5); ctx.lineTo(x + 7.6, y - 1.5); ctx.lineTo(x + 14, y - 9); ctx.stroke();
}
const SKIN = { tomas: '#c98a5b', jun: '#f1cba3', bee: '#8f5b3c', nana: '#f4d6bd', me: '#dba87a' };
export function avatar(ctx, who, cx, cy, r, bg) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy + r * 1.05, r * .85, r * .62, 0, 0, 7); ctx.fill();   // shoulders
  const hx = cx, hy = cy - r * .08, hr = r * .38, sk = SKIN[who];
  const hair = { tomas: '#2b1d14', jun: '#15121a', bee: '#7a2a1c', nana: '#f4f0f6', me: '#3a2418' }[who];
  if (who === 'bee') { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(hx, hy - hr * 1.3, hr * .55, 0, 7); ctx.fill(); }
  if (who === 'nana') { ctx.fillStyle = hair; for (const [dx, dy, rr2] of [[-.8, -.2, .55], [.8, -.2, .55], [-.45, -.8, .6], [.45, -.8, .6], [0, -.95, .6]]) { ctx.beginPath(); ctx.arc(hx + dx * hr, hy + dy * hr, rr2 * hr, 0, 7); ctx.fill(); } }
  if (who === 'me') { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(hx + hr * 1.05, hy + hr * .35, hr * .42, 0, 7); ctx.fill(); }
  ctx.fillStyle = sk; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fill();
  ctx.fillStyle = hair;
  if (who === 'tomas') { ctx.beginPath(); ctx.arc(hx, hy - hr * .05, hr * 1.02, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx, hy + hr * .72, hr * .72, hr * .45, 0, 0, Math.PI); ctx.fill(); }
  else if (who === 'jun') { ctx.beginPath(); ctx.arc(hx, hy - hr * .05, hr * 1.04, Math.PI * 1.0, Math.PI * 2.0); ctx.fill(); }
  else if (who === 'bee' || who === 'me') { ctx.beginPath(); ctx.arc(hx, hy - hr * .08, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
  ctx.fillStyle = '#2a1c14'; const ey = hy - hr * .05, ed = hr * .38, er = Math.max(1, hr * .09);
  ctx.beginPath(); ctx.arc(hx - ed, ey, er, 0, 7); ctx.arc(hx + ed, ey, er, 0, 7); ctx.fill();
  if (who === 'jun' || who === 'nana') { ctx.strokeStyle = '#2a1c14'; ctx.lineWidth = Math.max(1, r * .06); ctx.beginPath(); ctx.arc(hx - ed, ey, hr * .24, 0, 7); ctx.moveTo(hx + ed + hr * .24, ey); ctx.arc(hx + ed, ey, hr * .24, 0, 7); ctx.stroke(); }
  if (who === 'bee') { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(hx - hr * .98, hy + hr * .45, Math.max(1, hr * .13), 0, 7); ctx.arc(hx + hr * .98, hy + hr * .45, Math.max(1, hr * .13), 0, 7); ctx.fill(); }
  ctx.strokeStyle = who === 'tomas' ? '#f3e1d0' : '#7a3a2a'; ctx.lineWidth = Math.max(1, r * .05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(hx, hy + hr * .25, hr * .34, .25, Math.PI - .25); ctx.stroke();
  ctx.restore();
}

// ---- pictures inside bubbles ----
function cakePic(ctx, x, y, w, h) {
  ctx.save(); rr(ctx, x, y, w, h, 16); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fde9d6'); g.addColorStop(1, '#f7cdb4'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x + w * .82, y + h * .22, 46, 0, 7); ctx.fill();
  const cx = x + w / 2;
  ctx.fillStyle = '#fff7ef'; ctx.beginPath(); ctx.ellipse(cx, y + h - 22, 150, 22, 0, 0, 7); ctx.fill();            // plate
  ctx.fillStyle = '#e46f86'; rr(ctx, cx - 100, y + h - 98, 200, 74, 16); ctx.fill();                                  // lower tier
  ctx.fillStyle = '#f59cae'; rr(ctx, cx - 70, y + h - 148, 140, 56, 14); ctx.fill();                                  // upper tier
  ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.moveTo(cx - 70, y + h - 140);                                       // frosting drips
  for (let i = 0; i <= 7; i++) { const px = cx - 70 + i * 20; ctx.quadraticCurveTo(px + 6, y + h - 118 + (i % 2) * 12, px + 10, y + h - 134); }
  ctx.lineTo(cx + 70, y + h - 156); ctx.lineTo(cx - 70, y + h - 156); ctx.fill();
  ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.moveTo(cx - 100, y + h - 90);
  for (let i = 0; i <= 10; i++) { const px = cx - 100 + i * 20; ctx.quadraticCurveTo(px + 6, y + h - 66 + (i % 2) * 14, px + 10, y + h - 86); }
  ctx.lineTo(cx + 100, y + h - 104); ctx.lineTo(cx - 100, y + h - 104); ctx.fill();
  for (const [dx, dy] of [[-62, 40], [-20, 48], [30, 42], [68, 50]]) { ctx.fillStyle = '#c91f3d'; ctx.beginPath(); ctx.arc(cx + dx, y + h - 98 + dy * .35, 7, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#4b9ad1'; ctx.lineWidth = 9; ctx.lineCap = 'round';                                              // the candles: an 8 and a 0
  ctx.beginPath(); ctx.arc(cx - 26, y + h - 172, 9, 0, 7); ctx.arc(cx - 26, y + h - 192, 11, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx + 28, y + h - 182, 11, 19, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#ffb12e'; for (const fx of [cx - 26, cx + 28]) { ctx.beginPath(); ctx.ellipse(fx, y + h - 214, 5, 9, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function chairsPic(ctx, x, y, w, h) {
  ctx.save(); rr(ctx, x, y, w, h, 14); ctx.clip(); ctx.fillStyle = '#e8f1ec'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#cfe2d7'; ctx.fillRect(x, y + h - 30, w, 30);
  for (let i = 0; i < 4; i++) {
    const cx = x + 56 + i * 82, base = y + h - 22; ctx.strokeStyle = '#33414a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.fillStyle = ['#4b9ad1', '#e0734a', '#4b9ad1', '#e0734a'][i];
    rr(ctx, cx - 22, base - 84, 44, 34, 6); ctx.fill();                                              // back
    rr(ctx, cx - 26, base - 44, 52, 12, 5); ctx.fill();                                              // seat
    ctx.beginPath(); ctx.moveTo(cx - 20, base - 32); ctx.lineTo(cx - 28, base); ctx.moveTo(cx + 20, base - 32); ctx.lineTo(cx + 28, base); ctx.moveTo(cx - 20, base - 32); ctx.lineTo(cx + 26, base); ctx.stroke();
  }
  ctx.restore();
}

// ---- the chat ----
export class Chat {
  constructor(items, cfg) {
    this.items = items; this.cfg = cfg; this.people = cfg.people; this.byId = {};
    items.forEach((it, i) => { it.i = i; this.byId[it.id] = it; });
    items.forEach(it => this.measure(it));
    // wallpaper tile
    const tl = document.createElement('canvas'); tl.width = tl.height = 360; const c = tl.getContext('2d');
    c.fillStyle = COL.wall; c.fillRect(0, 0, 360, 360); c.strokeStyle = COL.doodle; c.fillStyle = COL.doodle; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let k = 0; k < 16; k++) {
      const x = 20 + hash(k * 3.1) * 320, y = 20 + hash(k * 7.7 + 2) * 320, s = 9 + hash(k * 1.3) * 8, kind = k % 5;
      c.save(); c.translate(x, y); c.rotate((hash(k * 5.9) - .5) * 1.2);
      if (kind === 0) { c.beginPath(); c.arc(0, 0, s, 0, 7); c.stroke(); }
      else if (kind === 1) { c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.moveTo(0, -s); c.lineTo(0, s); c.stroke(); }
      else if (kind === 2) { c.beginPath(); c.moveTo(-s * 1.4, 0); for (let q = 0; q < 4; q++) c.quadraticCurveTo(-s * 1.4 + q * s * .7 + s * .35, q % 2 ? s * .6 : -s * .6, -s * 1.4 + (q + 1) * s * .7, 0); c.stroke(); }
      else if (kind === 3) { c.beginPath(); c.roundRect(-s * 1.1, -s * .8, s * 2.2, s * 1.4, s * .5); c.moveTo(-s * .6, s * .6); c.lineTo(-s * .9, s * 1.2); c.lineTo(-s * .1, s * .6); c.stroke(); }
      else { heart(c, 0, 0, s * .55, COL.doodle); }
      c.restore();
    }
    this.tile = M.createPattern(tl, 'repeat');
    this.chatMemo = {};
  }

  measure(it) {
    const sent = it.who === 'me', prev = this.items[it.i - 1];
    it.sent = sent;
    it.first = !(prev && prev.who === it.who && prev.kind !== 'system' && prev.kind !== 'typing') && it.kind !== 'system';
    it.nameH = (!sent && it.first && it.kind !== 'system' && it.kind !== 'typing') ? 24 : 0;
    it.mt = it.kind === 'system' ? 14 : it.kind === 'typing' ? 10 : it.first ? 12 : 3;
    const timeW = it.time ? tw(it.time, F.time) + (sent ? 24 : 0) : 0;
    const g = it.g = {};
    if (it.kind === 'text') {
      const lines = wrap(it.text, F.body, 372), last = lines[lines.length - 1].w, mx = Math.max(...lines.map(l => l.w));
      g.lines = lines; g.inline = last + 12 + timeW <= 372; g.iw = Math.max(mx, g.inline ? last + 12 + timeW : timeW);
      if (it.reply) { g.iw = Math.max(g.iw, 250); g.q = ellipsize(it.reply.text, F.quote, g.iw - 14); }
      g.bw = g.iw + 32; g.bh = 22 + (it.reply ? 60 : 0) + lines.length * 34 + (g.inline ? 0 : 20);
    } else if (it.kind === 'image') {
      const lines = wrap(it.caption, F.cap, 316), last = lines[lines.length - 1].w;
      g.lines = lines; g.inline = last + 12 + timeW <= 316; g.bw = 352; g.ih = 236;
      g.bh = 6 + g.ih + 8 + lines.length * 34 + (g.inline ? 0 : 20) + 8;
    } else if (it.kind === 'link') {
      g.lines = wrap(it.title, F.title, 336); g.bw = 372; g.bh = 6 + 128 + 10 + g.lines.length * 29 + 4 + 26 + 10;
    } else if (it.kind === 'voice') {
      const v = this.cfg.voice, lines = wrap(v.text, F.tr, 400); g.bw = 432;
      // word positions per line for the karaoke highlight
      let wi = 0; g.wl = lines.map(l => { const ws = l.s.split(' '); let x = 0; return ws.map((w, k) => { const o = { w, x, i: wi++ }; x += tw(w + ' ', F.tr); return o; }); });
      g.lines = lines; g.bh = 14 + 56 + 12 + lines.length * 30 + 6 + 22 + 6;
    } else if (it.kind === 'typing') { g.bw = 92; g.bh = 52;
    } else if (it.kind === 'system') { g.bw = tw(it.text, F.sys) + 36; g.bh = 34; }
    if (it.kind === 'voice' || it.kind === 'link' || it.kind === 'image' || it.kind === 'text') g.timeW = timeW;
    it.H0 = it.mt + it.nameH + g.bh;
    it.HR = 14 + 34;
    if (it.recall) it.recText = this.cfg.recallLabel[it.who];
    it.rx0 = it.reactions && it.reactions.length ? it.reactions[0].t : null;
  }

  // dynamic height of a row
  rowH(it, t) {
    const a = ss(seg(t, it.t, it.t + .34));
    if (a <= 0) return 0;
    if (it.kind === 'typing') return it.H0 * a * (1 - ss(seg(t, it.tEnd, it.tEnd + .28)));
    let full = it.H0;
    if (it.rx0 != null) full += 16 * ss(seg(t, it.rx0, it.rx0 + .25));
    if (it.seenBy) full += 30 * ss(seg(t, it.seenBy, it.seenBy + .3));
    if (it.recall) full = lerp(full, it.HR, ss(seg(t, it.recall.t, it.recall.t + .5)));
    return full * a;
  }

  layout(t) {
    const rows = []; let y = 10;
    for (const it of this.items) { const h = this.rowH(it, t); rows.push({ it, y, h }); y += h; }
    const B = y + 12, view = CBOT - HEAD;
    let S = Math.max(0, B - view);
    const sb = this.cfg.scrollback;
    if (sb) {
      const up = ss(seg(t, sb.t0, sb.t0 + sb.up)), down = ss(seg(t, sb.hold, sb.hold + sb.down));
      S = S * (1 - (up - down));
    }
    return { rows, S, B };
  }
  pinH(t) { const p = this.cfg.pins; return p.length ? PIN * ss(seg(t, p[0].t, p[0].t + .35)) : 0; }

  itemBox(id, t) {
    const L = this.layout(t), r = L.rows.find(r => r.it.id === id), it = r.it, g = it.g;
    const bx = it.sent ? PW - 18 - g.bw : 70;
    const top = HEAD + r.y - L.S + it.mt, bh = g.bh + it.nameH + (it.seenBy ? 28 : 0);
    return { x: bx, y: top, w: g.bw, h: bh, cx: bx + g.bw / 2, cy: top + bh / 2 };
  }
  ghosts(t) {
    const L = this.layout(t), out = [];
    for (const r of L.rows) {
      const it = r.it; if (r.h < 4 || it.kind === 'system') continue;
      const g = it.g, bx = it.sent ? PW - 18 - g.bw : 70;
      out.push({ x: bx, y: HEAD + r.y - L.S + it.mt + it.nameH, w: g.bw, h: g.bh, sent: it.sent, nana: it.who === 'nana', a: ss(seg(t, it.t, it.t + .4)) });
    }
    return out;
  }
  lastness(it, t) {
    const nx = this.items[it.i + 1];
    if (nx && nx.who === it.who && nx.kind !== 'system' && nx.kind !== 'typing') return 1 - ss(seg(t, nx.t, nx.t + .22));
    return 1;
  }

  // ---------------------------------------------------------------- drawing
  draw(ctx, t) {
    const P = this.people, L = this.layout(t), pinH = this.pinH(t), visTop = HEAD + pinH;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(0, 0, PW, PH, 30); ctx.clip();
    // wallpaper (scrolls at 0.8 of the content)
    ctx.fillStyle = COL.wall; ctx.fillRect(0, 0, PW, PH);
    ctx.save(); ctx.translate(0, -(L.S * .8) % 360 - 360); ctx.fillStyle = this.tile; ctx.fillRect(0, 0, PW, PH + 720); ctx.restore();
    // bubbles
    ctx.save(); ctx.beginPath(); ctx.rect(0, HEAD, PW, CBOT - HEAD); ctx.clip();
    for (const r of L.rows) {
      const it = r.it; if (r.h < 1) continue;
      const Y = HEAD + r.y - L.S;
      if (Y + r.h < HEAD - 30 || Y > CBOT + 10) continue;
      this.drawItem(ctx, it, t, Y, [0, visTop, PW, CBOT]);
    }
    ctx.restore();
    this.drawHeader(ctx, t, pinH);
    this.drawInput(ctx, t);
    ctx.restore();
  }

  drawItem(ctx, it, t, Y, vis) {
    const g = it.g, P = this.people, sent = it.sent, id = it.id;
    if (it.kind === 'system') {
      const rc = 0, a = ss(seg(t, it.t, it.t + .3)), by = Y + it.mt, bx = (PW - g.bw) / 2;
      ctx.globalAlpha = a; ctx.fillStyle = COL.sysBg; rr(ctx, bx, by, g.bw, 34, 17); ctx.fill();
      ctx.fillStyle = COL.sys; ctx.font = F.sys; ctx.textAlign = 'center'; ctx.fillText(it.text, PW / 2, by + 23); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      if (a >= 1) reg(id, it.text, ...tbox(PW / 2 - (g.bw - 36) / 2, by + 23, g.bw - 36, 18), vis);
      return;
    }
    const prog = seg(t, it.t, it.t + .34), settled = prog >= 1;
    let sc = lerp(.55, 1, back(prog, 1.5)), al = ss(seg(t, it.t, it.t + .13));
    if (it.kind === 'typing') al *= 1 - ss(seg(t, it.tEnd - .02, it.tEnd + .2));
    const bx = sent ? PW - 18 - g.bw : 70, nameY = Y + it.mt, by = nameY + it.nameH, bh = g.bh;
    const rcT = it.recall ? it.recall.t : 1e9, r = ss(seg(t, rcT, rcT + .5)), recalled = t >= rcT;
    const own = P[it.who], dy = it.draft ? (1 - eo(prog)) * 46 : 0;
    const last = this.lastness(it, t);
    // pop transform about the tail corner
    const ox = sent ? bx + g.bw : bx, oy = by + bh;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(ox, oy + dy); ctx.scale(sc, sc); ctx.translate(-ox, -oy);
    // name
    if (it.nameH && r < .5) {
      ctx.font = F.name; ctx.fillStyle = own.col; ctx.fillText(own.name, bx + 8, nameY + 17);
      if (settled && !recalled) reg(id + '.name', own.name, ...tbox(bx + 8, nameY + 17, tw(own.name, F.name), 17), vis);
    }
    // bubble + contents (a recalled bubble collapses into a grey line)
    const fill = it.kind === 'typing' ? COL.recv : sent ? COL.sent : it.who === 'nana' ? COL.nana : COL.recv;
    const ink = sent ? COL.sentInk : it.who === 'nana' ? COL.nanaInk : COL.recvInk;
    const sub = sent ? 'rgba(255,255,255,.72)' : it.who === 'nana' ? 'rgba(74,50,0,.55)' : 'rgba(42,33,64,.45)';
    const R = 22, T = lerp(R, 7, last);
    const radii = sent ? [R, R, T, R] : [R, R, R, T];
    const sy = recalled ? lerp(1, 40 / bh, r) : 1;
    ctx.save();
    if (recalled) { ctx.translate(0, by); ctx.scale(1, sy); ctx.translate(0, -by); ctx.globalAlpha *= 1 - ss(seg(r, 0, .7)); }
    ctx.shadowColor = 'rgba(40,20,80,.16)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = fill; rr(ctx, bx, by, g.bw, bh, radii); ctx.fill(); ctx.shadowColor = 'transparent';
    const vis2 = settled && !recalled;
    if (it.kind === 'text') this.drawText(ctx, it, t, bx, by, ink, sub, vis2, vis);
    else if (it.kind === 'image') this.drawImage(ctx, it, t, bx, by, ink, sub, vis2, vis);
    else if (it.kind === 'link') this.drawLink(ctx, it, t, bx, by, ink, sub, vis2, vis);
    else if (it.kind === 'voice') this.drawVoice(ctx, it, t, bx, by, ink, sub, vis2, vis);
    else if (it.kind === 'typing') {
      for (let k = 0; k < 3; k++) {
        const ph = t * 1.9 - k * .16, up = Math.max(0, Math.sin(ph * Math.PI * 2)) ** 2;
        ctx.fillStyle = `rgba(90,75,224,${.35 + .5 * up})`; ctx.beginPath(); ctx.arc(bx + 28 + k * 18, by + 26 - up * 7, 5.2, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
    // avatar on the last bubble of a run
    if (!sent && (it.kind !== 'typing' || true)) {
      const aa = last * (recalled ? 1 - ss(seg(r, 0, .5)) : 1);
      if (aa > 0.01) { ctx.save(); ctx.globalAlpha *= aa; avatar(ctx, it.who, 38, by + bh - 22 + (recalled ? (40 - bh) * r : 0), 22, own.bg); ctx.restore(); }
    }
    // reactions
    if (it.reactions && !recalled) this.drawReactions(ctx, it, t, bx, by, bh);
    // seen-by row
    if (it.seenBy) {
      const a = ss(seg(t, it.seenBy, it.seenBy + .3)), yy = by + bh + 8;
      ctx.save(); ctx.globalAlpha *= a;
      ['jun', 'tomas', 'bee', 'me'].forEach((w, k) => avatar(ctx, w, 80 + k * 15, yy + 10, 10, P[w].bg));
      ctx.font = F.time; ctx.fillStyle = COL.muted; ctx.fillText('Seen by all', 150, yy + 15); ctx.restore();
      if (a >= 1) reg(id + '.seen', 'Seen by all', ...tbox(150, yy + 15, tw('Seen by all', F.time), 14), vis);
    }
    ctx.restore();
    // the recalled line
    if (recalled && r > 0) {
      const lab = it.recText, w = tw(lab, F.sys) + 36, a = ss(seg(r, .35, 1)), by2 = Y + 14, x0 = (PW - w) / 2;
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = COL.sysBg; rr(ctx, x0, by2, w, 34, 17); ctx.fill();
      ctx.fillStyle = COL.sys; ctx.font = 'italic ' + F.sys; ctx.textAlign = 'center'; ctx.fillText(lab, PW / 2, by2 + 23); ctx.restore();
      if (r >= 1) reg(id + '.rec', lab, ...tbox(PW / 2 - (w - 36) / 2, by2 + 23, w - 36, 18), vis);
    }
  }

  timeLine(ctx, it, t, x, base, right, sub, show, vis) {   // the time label (and ticks for sent messages) ending at x = right
    if (!it.time) return;
    ctx.font = F.time; ctx.fillStyle = sub; ctx.textAlign = 'left';
    const w = tw(it.time, F.time);
    if (it.sent) {
      const seen = it.seen != null && t >= it.seen, x0 = right - 22 - w;
      ctx.fillText(it.time, x0, base); ticks(ctx, right - 16, base, seen ? '#8ff3e4' : sub);
      if (show) reg(it.id + '.time', it.time, ...tbox(x0, base, w, 14), vis);
    } else {
      ctx.fillText(it.time, right - w, base); if (show) reg(it.id + '.time', it.time, ...tbox(right - w, base, w, 14), vis);
    }
  }

  drawText(ctx, it, t, bx, by, ink, sub, show, vis) {
    const g = it.g; let y = by + 11;
    if (it.reply) {
      const rp = this.people[it.reply.who];
      ctx.fillStyle = it.sent ? 'rgba(255,255,255,.18)' : 'rgba(42,33,64,.07)'; rr(ctx, bx + 8, y, g.bw - 16, 52, 10); ctx.fill();
      ctx.fillStyle = rp.col; ctx.fillRect(bx + 8, y + 6, 4, 40);
      ctx.font = F.quoteName; ctx.fillStyle = rp.col; ctx.fillText(rp.name, bx + 22, y + 19);
      ctx.font = F.quote; ctx.fillStyle = it.sent ? 'rgba(255,255,255,.85)' : 'rgba(42,33,64,.7)'; ctx.fillText(g.q, bx + 22, y + 41);
      if (show) { reg(it.id + '.qn', rp.name, ...tbox(bx + 22, y + 19, tw(rp.name, F.quoteName), 14), vis); reg(it.id + '.qt', g.q, ...tbox(bx + 22, y + 41, tw(g.q, F.quote), 16), vis); }
      y += 60;
    }
    ctx.font = F.body; ctx.fillStyle = ink; ctx.textAlign = 'left';
    g.lines.forEach((l, k) => ctx.fillText(l.s, bx + 16, y + k * 34 + 24));
    if (show) reg(it.id, it.text, bx + 16, y + 24 - 22, bx + 16 + Math.max(...g.lines.map(l => l.w)), y + (g.lines.length - 1) * 34 + 24 + 7, vis);
    const base = g.inline ? y + (g.lines.length - 1) * 34 + 24 : by + g.bh - 11;
    this.timeLine(ctx, it, t, bx, base, bx + g.bw - 14, sub, show, vis);
  }

  drawImage(ctx, it, t, bx, by, ink, sub, show, vis) {
    const g = it.g; cakePic(ctx, bx + 6, by + 6, g.bw - 12, g.ih);
    const y = by + 6 + g.ih + 8;
    ctx.font = F.cap; ctx.fillStyle = ink; g.lines.forEach((l, k) => ctx.fillText(l.s, bx + 16, y + k * 34 + 24));
    if (show) reg(it.id, it.caption, bx + 16, y + 3, bx + 16 + Math.max(...g.lines.map(l => l.w)), y + (g.lines.length - 1) * 34 + 31, vis);
    this.timeLine(ctx, it, t, bx, g.inline ? y + (g.lines.length - 1) * 34 + 24 : by + g.bh - 12, bx + g.bw - 14, sub, show, vis);
  }

  drawLink(ctx, it, t, bx, by, ink, sub, show, vis) {
    const g = it.g; chairsPic(ctx, bx + 6, by + 6, g.bw - 12, 128);
    let y = by + 6 + 128 + 10; ctx.font = F.title; ctx.fillStyle = ink;
    g.lines.forEach((l, k) => ctx.fillText(l.s, bx + 16, y + k * 29 + 21));
    if (show) reg(it.id, it.title, bx + 16, y, bx + 16 + Math.max(...g.lines.map(l => l.w)), y + (g.lines.length - 1) * 29 + 27, vis);
    y += g.lines.length * 29 + 4;
    ctx.strokeStyle = COL.accent; ctx.lineWidth = 2.4; ctx.lineCap = 'round';   // a little chain-link mark
    ctx.beginPath(); ctx.roundRect(bx + 16, y + 6, 14, 9, 4.5); ctx.roundRect(bx + 25, y + 11, 14, 9, 4.5); ctx.stroke();
    ctx.font = F.domain; ctx.fillStyle = COL.accent; ctx.fillText(it.domain, bx + 46, y + 18);
    if (show) reg(it.id + '.dom', it.domain, ...tbox(bx + 46, y + 18, tw(it.domain, F.domain), 16), vis);
    this.timeLine(ctx, it, t, bx, y + 18, bx + g.bw - 14, sub, show, vis);
  }

  drawVoice(ctx, it, t, bx, by, ink, sub, show, vis) {
    const g = it.g, v = this.cfg.voice, tp = t - it.tPlay, playing = tp >= 0 && tp < v.dur, prog = clamp(tp / v.dur);
    const cx = bx + 14 + 26, cy = by + 14 + 28;
    ctx.fillStyle = '#e19a12'; ctx.beginPath(); ctx.arc(cx, cy, 25, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    if (playing) { rr(ctx, cx - 9, cy - 10, 6, 20, 2); ctx.fill(); rr(ctx, cx + 3, cy - 10, 6, 20, 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(cx - 6, cy - 11); ctx.lineTo(cx + 11, cy); ctx.lineTo(cx - 6, cy + 11); ctx.closePath(); ctx.fill(); }
    const n = 30, wx = bx + 14 + 64, ww = g.bw - 14 - 64 - 14 - 56;
    for (let k = 0; k < n; k++) {
      const env = Math.sin(Math.PI * (k + .5) / n) ** .6, h = 6 + 34 * env * (.25 + .75 * hash(k * 2.3 + 7.1)) + (playing && Math.abs(k / n - prog) < .08 ? 4 * Math.sin(t * 30 + k) : 0);
      ctx.fillStyle = k / n <= prog ? '#c07d0a' : 'rgba(110,75,0,.3)'; rr(ctx, wx + k * (ww / n), cy - h / 2, 5, h, 2.5); ctx.fill();
    }
    const dur = playing ? v.dur - tp : v.dur, ds = '0:' + String(Math.max(0, Math.ceil(dur - .001))).padStart(2, '0');
    ctx.font = F.time; ctx.fillStyle = sub; ctx.textAlign = 'right'; ctx.fillText(ds, bx + g.bw - 14, cy + 5); ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(110,75,0,.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 14, by + 14 + 56 + 6); ctx.lineTo(bx + g.bw - 14, by + 14 + 56 + 6); ctx.stroke();
    // transcript, word by word
    const ty = by + 14 + 56 + 12; ctx.font = F.tr;
    g.wl.forEach((ws, k) => ws.forEach(w => {
      const on = tp >= v.starts[w.i];
      ctx.fillStyle = on ? ink : 'rgba(74,50,0,.38)'; ctx.fillText(w.w, bx + 16 + w.x, ty + k * 30 + 22);
    }));
    if (show) reg(it.id + '.tr', v.text, bx + 16, ty + 2, bx + 16 + Math.max(...g.lines.map(l => l.w)), ty + (g.lines.length - 1) * 30 + 28, vis);
    this.timeLine(ctx, it, t, bx, by + g.bh - 12, bx + g.bw - 14, sub, show, vis);
  }

  drawReactions(ctx, it, t, bx, by, bh) {
    const rs = it.reactions.filter(r => t >= r.t); if (!rs.length) return;
    const icons = [...new Set(rs.map(r => r.icon))], P = this.people, n = rs.length;
    const w = 14 + icons.length * 22 + (n > 1 ? 10 + n * 15 : 0) + 8, h = 30, x = it.sent ? bx + 12 : bx + it.g.bw - 12 - w, y = by + bh - 12;
    const last = rs[rs.length - 1], pr = back(seg(t, last.t, last.t + .3), 2.2);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(lerp(.6, 1, pr), lerp(.6, 1, pr)); ctx.translate(-(x + w / 2), -(y + h / 2));
    ctx.shadowColor = 'rgba(40,20,80,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; ctx.fillStyle = '#fff'; rr(ctx, x, y, w, h, 15); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = COL.wall; ctx.lineWidth = 2; ctx.stroke();
    icons.forEach((ic, k) => { const cx = x + 14 + k * 22 + 4, cy = y + 15; ic === 'heart' ? heart(ctx, cx, cy, 8, '#ef3b5d') : laugh(ctx, cx, cy, 9); });
    if (n > 1) rs.forEach((r, k) => avatar(ctx, r.who, x + 14 + icons.length * 22 + 14 + k * 15, y + 15, 9, P[r.who].bg));
    ctx.restore();
  }

  // header: back arrow, group icon, title, status line, pinned banner
  drawHeader(ctx, t, pinH) {
    const P = this.people, cfg = this.cfg, V = [0, 0, PW, PH];
    // pinned banner (under the header)
    if (pinH > 0.5) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, HEAD, PW, pinH); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(0, HEAD, PW, PIN); ctx.fillStyle = 'rgba(42,33,64,.08)'; ctx.fillRect(0, HEAD + pinH - 1.5, PW, 1.5);
      const ps = cfg.pins; let cur = 0; ps.forEach((p, k) => { if (t >= p.t) cur = k; });
      const sw = ss(seg(t, ps[cur].t, ps[cur].t + .4)), prev = cur > 0 ? ps[cur - 1] : null, off = pinH - PIN;
      const bar = (y0) => { ctx.fillStyle = COL.accent; rr(ctx, 16, y0 + 9, 4, 26, 2); ctx.fill(); };
      ctx.font = F.pinLab; ctx.letterSpacing = '1.5px';
      const line = (p, dy, al) => { ctx.save(); ctx.globalAlpha = al; ctx.translate(0, dy + off); bar(HEAD); ctx.fillStyle = COL.accent; ctx.font = F.pinLab; ctx.fillText('PINNED', 30, HEAD + 17); ctx.letterSpacing = '0px'; ctx.font = F.pin; ctx.fillStyle = COL.recvInk; ctx.fillText(ellipsize(p.text, F.pin, 560), 30, HEAD + 36); ctx.restore(); };
      if (prev && sw < 1) { line(prev, -sw * 24, 1 - sw); line(ps[cur], (1 - sw) * 24, sw); } else line(ps[cur], 0, 1);
      ctx.letterSpacing = '0px'; ctx.restore();
      if (pinH >= PIN - .01 && (!prev || sw >= 1)) {
        ctx.font = F.pinLab; ctx.letterSpacing = '1.5px'; const lw = ctx.measureText('PINNED').width; ctx.letterSpacing = '0px';
        reg('pin.label', 'PINNED', ...tbox(30, HEAD + 17, lw, 13), V);
        const s = ellipsize(ps[cur].text, F.pin, 560); reg('pin.' + cur, s, ...tbox(30, HEAD + 36, tw(s, F.pin), 17), V);
      }
    }
    ctx.save(); ctx.shadowColor = 'rgba(40,20,80,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 1; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PW, HEAD); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PW, HEAD);
    ctx.strokeStyle = COL.accent; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(34, 34); ctx.lineTo(24, 46); ctx.lineTo(34, 58); ctx.stroke();
    // group icon: four member colours
    ctx.save(); rr(ctx, 48, 20, 52, 52, 16); ctx.clip();
    [['tomas', 0, 0], ['jun', 26, 0], ['bee', 0, 26], ['me', 26, 26]].forEach(([w, dx, dy]) => { ctx.fillStyle = P[w].bg; ctx.fillRect(48 + dx, 20 + dy, 26, 26); });
    ctx.restore();
    // title (renames by deleting, then typing)
    const tt = cfg.title; let shown = tt.first, full = tt.first, fullT = 0;
    if (t >= tt.edit.t) {
      const k = (t - tt.edit.t - .15) * 22, nd = tt.first.length;
      if (k < 0) shown = tt.first; else if (k < nd) shown = tt.first.slice(0, nd - Math.floor(k)); else shown = tt.edit.to.slice(0, Math.min(tt.edit.to.length, Math.floor(k - nd) + 1));
      if (k >= nd) { full = tt.edit.to; fullT = 1; }
    }
    ctx.font = F.head; ctx.fillStyle = COL.recvInk; ctx.fillText(shown, 114, 44);
    if (fullT) { ctx.fillStyle = COL.accent; if (shown.length < full.length) { ctx.fillRect(114 + tw(shown, F.head) + 2, 22, 3, 28); } }
    reg('title', full, ...tbox(114, 44, tw(full, F.head), 28), V);
    // status line: members, or who is typing
    const st = (tx) => {
      const typing = this.items.some(i => i.kind === 'typing' && t >= i.t + .2 && t < i.tEnd);
      if (typing) return 'Nana Rose is typing…';
      let m = cfg.members[0].text; cfg.members.forEach(x => { if (t >= x.t) m = x.text; }); return m;
    };
    const cur = st(t); let tc = null;
    for (let u = t - 1 / 48; u > t - .4; u -= 1 / 48) if (st(u) !== cur) { tc = u + 1 / 48; break; }
    const prev = tc != null ? st(tc - 1 / 48) : cur, a = tc != null ? ss(seg(t, tc, tc + .22)) : 1;
    ctx.font = F.sub;
    const sline = (s, al, dy) => { ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = s.includes('typing') ? COL.accent : COL.muted; ctx.fillText(s, 114, 70 + dy); ctx.restore(); };
    if (a < 1) { sline(prev, 1 - a, -a * 8); sline(cur, a, (1 - a) * 8); } else sline(cur, 1, 0);
    if (a >= 1) reg('status', cur, ...tbox(114, 70, tw(cur, F.sub), 16), V);
    // right-hand icons
    ctx.strokeStyle = COL.accent; ctx.lineWidth = 3; rr(ctx, 538, 36, 28, 20, 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(566, 44); ctx.lineTo(580, 38); ctx.lineTo(580, 54); ctx.lineTo(566, 48); ctx.stroke();
    ctx.fillStyle = COL.accent; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(606, 36 + k * 10, 2.8, 0, 7); ctx.fill(); }
  }

  drawInput(ctx, t) {
    const V = [0, 0, PW, PH];
    ctx.save(); ctx.shadowColor = 'rgba(40,20,80,.16)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = -1; ctx.fillStyle = '#fff'; ctx.fillRect(0, CBOT, PW, FOOT); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, CBOT, PW, FOOT);
    // plus button
    ctx.strokeStyle = COL.accent; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(34, CBOT + 28); ctx.lineTo(34, CBOT + 52); ctx.moveTo(22, CBOT + 40); ctx.lineTo(46, CBOT + 40); ctx.stroke();
    ctx.fillStyle = '#f1edf8'; rr(ctx, 62, CBOT + 14, 508, 52, 26); ctx.fill();
    // draft
    let draft = '', dI = null;
    for (const it of this.items) if (it.draft && t >= it.draft.t0 && t < it.t) { dI = it; break; }
    if (dI) {
      const span = dI.t - dI.draft.t0 - .35, k = Math.floor(clamp((t - dI.draft.t0 - .1) / span) * dI.text.length) + (t > dI.draft.t0 + .1 ? 1 : 0);
      draft = dI.text.slice(0, Math.min(dI.text.length, k));
    }
    if (draft) {
      ctx.font = F.ph; ctx.fillStyle = COL.recvInk; ctx.fillText(draft, 82, CBOT + 49);
      ctx.fillStyle = COL.accent; ctx.beginPath(); ctx.arc(600, CBOT + 40, 22, 0, 7); ctx.fill();   // send button
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(600, CBOT + 49); ctx.lineTo(600, CBOT + 31); ctx.moveTo(591, CBOT + 39); ctx.lineTo(600, CBOT + 30); ctx.lineTo(609, CBOT + 39); ctx.stroke();
    } else {
      ctx.font = F.ph; ctx.fillStyle = 'rgba(42,33,64,.4)'; ctx.fillText('Message', 82, CBOT + 49);
      reg('placeholder', 'Message', ...tbox(82, CBOT + 49, tw('Message', F.ph), 22), V);
      ctx.strokeStyle = COL.accent; ctx.lineWidth = 3; rr(ctx, 593, CBOT + 24, 14, 24, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(600, CBOT + 38, 14, 0.15, Math.PI - .15); ctx.moveTo(600, CBOT + 52); ctx.lineTo(600, CBOT + 57); ctx.stroke();
    }
  }
}
