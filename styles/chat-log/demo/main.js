// "She Knows": a family group chat on an invented messenger. t = film seconds (script.js).
import { clamp, lerp, seg, ss, eio, eo, back, hash } from '/core/lib.js';
import { Chat, CAM, PW, PH, clearTexts, takeTexts, avatar } from './chat.js';
import { ITEMS, PEOPLE, VOICE, TITLE, MEMBERS, PINS, CAMS, SCROLLBACK, BANNERS, BANNER_LABEL, CROP, DUR, events } from './script.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const RECALL_LABEL = { tomas: 'Tomás recalled a message', jun: 'Jun recalled a message' };
await Promise.all(['600 26px Nunito', '700 17px Nunito', '800 28px Nunito', 'italic 700 17px Nunito', '600 14px Nunito', '800 17px Nunito'].map(f => document.fonts.load(f)));
await document.fonts.ready;   // the bubbles are measured with the real font
const chat = new Chat(ITEMS, { people: PEOPLE, voice: VOICE, title: TITLE, members: MEMBERS, pins: PINS, recallLabel: RECALL_LABEL, scrollback: SCROLLBACK });
window.DUR = DUR;
window.EV = events();

// ---------------------------------------------------------------- camera: one phone-space -> screen function
function resolve(c, t) {
  const tg = c.tg; let cx = 320, cy = 360;
  if (tg !== 'base') { if (tg.item) { const b = chat.itemBox(tg.item, t); cx = tg.fx ?? b.cx; cy = b.cy + (tg.dy || 0); } else { cx = tg.x; cy = tg.y; } }
  return { z: c.z, cx, cy, sx: c.sx || 0 };
}
function camAt(t) {
  let k = 0; CAMS.forEach((c, i) => { if (t >= c.t) k = i; });
  const c = CAMS[k], cur = resolve(c, t);
  if (k === 0 || !c.d) return cur;
  const a = seg(t, c.t, c.t + c.d); if (a >= 1) return cur;
  const e = ss(a), pv = resolve(CAMS[k - 1], t);
  return { z: pv.z * Math.pow(cur.z / pv.z, e), cx: lerp(pv.cx, cur.cx, e), cy: lerp(pv.cy, cur.cy, e), sx: lerp(pv.sx, cur.sx, e) };
}
const toScreen = (c, x, y) => [(x - c.cx) * c.z + 960 + c.sx, (y - c.cy) * c.z + 540];

// ---------------------------------------------------------------- backdrop: dusk plum, soft colour, a giant ghost of the chat
function backdrop(t) {
  const g = ctx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#2d2046'); g.addColorStop(1, '#171029'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  const blobs = [[240, 220, 520, '31,165,147', .22], [1700, 260, 480, '216,71,156', .2], [1560, 900, 560, '90,75,224', .26], [280, 880, 520, '240,176,46', .14]];
  blobs.forEach(([x, y, r, c, a], i) => {
    const dx = Math.sin(t * .21 + i * 1.7) * 40, dy = Math.cos(t * .17 + i * 2.3) * 30, rg = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
    rg.addColorStop(0, `rgba(${c},${a})`); rg.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = rg; ctx.fillRect(0, 0, 1920, 1080);
  });
  const G = 2.7, gx = 960 - CAM.cx * .0 + CAM.sx * .6 - (CAM.cx - 320) * 1.1, gy = 540 - (CAM.cy - 360) * .6 - 40;
  ctx.save(); ctx.filter = 'blur(16px)';
  for (const r of chat.ghosts(t)) {
    const x = gx + (r.x - 320) * G, y = gy + (r.y - 360) * G;
    ctx.globalAlpha = r.a; ctx.fillStyle = r.sent ? 'rgba(120,100,255,.13)' : r.nana ? 'rgba(240,176,46,.12)' : 'rgba(255,255,255,.05)';
    ctx.beginPath(); ctx.roundRect(x, y, r.w * G, r.h * G, 30 * G / 1.6); ctx.fill();
  }
  ctx.restore();
  const v = ctx.createRadialGradient(960, 540, 300, 960, 540, 1250); v.addColorStop(0, 'rgba(10,6,20,0)'); v.addColorStop(1, 'rgba(10,6,20,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, 1920, 1080);
}

// ---------------------------------------------------------------- Nana's lock screen (world space, to the right of the phone)
const BX = PW + 40, BW = 400, BH = 92;
function banners(t) {
  const first = BANNERS[0].t; if (t < first - .1) return;
  const V = [-1e4, -1e4, 1e4, 1e4];
  ctx.save();
  const la = ss(seg(t, first - .1, first + .4));
  ctx.globalAlpha = la; ctx.font = '800 20px Nunito'; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fillText(BANNER_LABEL, BX + 6, 126);
  ctx.letterSpacing = '0px'; ctx.restore();
  if (la >= 1) { ctx.font = '800 20px Nunito'; ctx.letterSpacing = '2px'; const w = ctx.measureText(BANNER_LABEL).width; ctx.letterSpacing = '0px'; const [a, b] = [BX + 6, 126]; chatReg('banner.label', BANNER_LABEL, a, b - 17, a + w, b + 5); }
  BANNERS.forEach((bn, k) => {
    const p = seg(t, bn.t, bn.t + .45); if (p <= 0) return;
    const e = back(p, 1.4), x = BX + (1 - e) * 120, y = 150 + k * 108;
    ctx.save(); ctx.globalAlpha = ss(seg(p, 0, .5));
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath(); ctx.roundRect(x, y, BW, BH, 24); ctx.fill(); ctx.shadowColor = 'transparent';
    const ig = ctx.createLinearGradient(x, y, x + 52, y + 52); ig.addColorStop(0, '#7a6cf0'); ig.addColorStop(1, '#4a3bd0'); ctx.fillStyle = ig; ctx.beginPath(); ctx.roundRect(x + 16, y + 20, 52, 52, 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x + 27, y + 31, 30, 22, 9); ctx.moveTo(x + 33, y + 52); ctx.lineTo(x + 31, y + 61); ctx.lineTo(x + 41, y + 53); ctx.fill();
    ctx.font = '800 21px Nunito'; ctx.fillStyle = PEOPLE[bn.who].col; ctx.fillText(bn.title, x + 84, y + 38);
    ctx.font = '600 23px Nunito'; ctx.fillStyle = '#2a2140'; ctx.fillText(bn.body, x + 84, y + 68);
    ctx.font = '600 15px Nunito'; ctx.fillStyle = '#8a82a0'; ctx.textAlign = 'right'; ctx.fillText('now', x + BW - 18, y + 30); ctx.textAlign = 'left';
    ctx.restore();
    if (p >= 1) {
      const w = (s, f) => { ctx.font = f; return ctx.measureText(s).width; };
      chatReg(`banner${k}.title`, bn.title, x + 84, y + 38 - 18, x + 84 + w(bn.title, '800 21px Nunito'), y + 38 + 6);
      chatReg(`banner${k}.body`, bn.body, x + 84, y + 68 - 20, x + 84 + w(bn.body, '600 23px Nunito'), y + 68 + 6);
      chatReg(`banner${k}.now`, 'now', x + BW - 18 - w('now', '600 15px Nunito'), y + 30 - 13, x + BW - 18, y + 30 + 4);
    }
  });
}
// world-space text registration (same mapping as the chat's)
const texts = [];
function chatReg(id, text, x0, y0, x1, y1) {
  const { z, cx, cy, sx } = CAM;
  texts.push({ id, text, x0: (x0 - cx) * z + 960 + sx, y0: (y0 - cy) * z + 540, x1: (x1 - cx) * z + 960 + sx, y1: (y1 - cy) * z + 540 });
}

// ---------------------------------------------------------------- screenshot crop (screen space)
function cropRect() {   // exactly what the final shot will show (the camera's last move), seen from the camera just before the shutter
  const c = camAt(CROP.tShot - 0.001), k = resolve(CAMS[CAMS.length - 1], CROP.tShot), w = 1920 / k.z * c.z, h = 1080 / k.z * c.z;
  const [cx, cy] = toScreen(c, k.cx, k.cy);
  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
}
let CR = null;
function crop(t) {
  if (t < CROP.t0) return;
  CR ??= cropRect();
  const a = eio(seg(t, CROP.t0, CROP.tShot - .35)), full = [28, 28, 1892, 1052];
  const r = full.map((v, i) => lerp(v, CR[i], a));
  const vis = ss(seg(t, CROP.t0, CROP.t0 + .3)) * (1 - ss(seg(t, CROP.tShot + .1, CROP.tShot + .5)));
  if (vis > 0) {
    ctx.save(); ctx.globalAlpha = vis;
    ctx.fillStyle = 'rgba(8,4,16,.55)'; ctx.beginPath(); ctx.rect(0, 0, 1920, 1080); ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); ctx.fill('evenodd');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const L = 52;
    [[r[0], r[1], 1, 1], [r[2], r[1], -1, 1], [r[0], r[3], 1, -1], [r[2], r[3], -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke(); });
    ctx.lineWidth = 1.5; ctx.globalAlpha = vis * .35;
    for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(r[0] + (r[2] - r[0]) * k / 3, r[1]); ctx.lineTo(r[0] + (r[2] - r[0]) * k / 3, r[3]); ctx.moveTo(r[0], r[1] + (r[3] - r[1]) * k / 3); ctx.lineTo(r[2], r[1] + (r[3] - r[1]) * k / 3); ctx.stroke(); }
    ctx.restore();
  }
  const fl = t >= CROP.tShot ? Math.pow(1 - seg(t, CROP.tShot, CROP.tShot + .42), 2) : 0;
  if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${.95 * fl})`; ctx.fillRect(0, 0, 1920, 1080); }
}

// ---------------------------------------------------------------- frame
let lastT = -1;
window.render = t => {
  lastT = t; clearTexts(); texts.length = 0;
  Object.assign(CAM, camAt(t));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; backdrop(t);
  ctx.save(); ctx.translate(960 + CAM.sx, 540); ctx.scale(CAM.z, CAM.z); ctx.translate(-CAM.cx, -CAM.cy);
  ctx.save(); ctx.shadowColor = 'rgba(5,0,15,.55)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 26; ctx.fillStyle = '#ece6f5'; ctx.beginPath(); ctx.roundRect(0, 0, PW, PH, 30); ctx.fill(); ctx.restore();
  chat.draw(ctx, t);
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(0, 0, PW, PH, 30); ctx.stroke();
  banners(t);
  ctx.restore();
  crop(t);
};
window.TEXTS = t => { if (t !== lastT) window.render(t); return [...takeTexts(), ...texts]; };

window.READY = true;
