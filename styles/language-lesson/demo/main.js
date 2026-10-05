// main.js: layout (9:16 by default, 16:9 when the viewport is wide), stage with Pip, title, progress dots, card slots (slide, flip),
// camera push, burned-in captions, window.TEXTS and window.EV. Everything is a function of t.
import { clamp, lerp, seg, ss, eo, back, hash } from '/core/lib.js';
import { C, PW, PH, txt, width, setFont, reg, resetTexts, takeTexts, STACK, rr } from './kit.js';
import { FACES, paper, ribbon, clueCenter } from './cards.js';
import { drawPip, POSES, blend } from './mascot.js';
import { build } from './script.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = cv.width = innerWidth, H = cv.height = innerHeight, PORT = H >= W;
const Q = new URLSearchParams(location.search);
await Promise.all(['900 40px Nunito', '800 40px Nunito', '700 40px Nunito', '800 40px NotoSC', '800 40px NotoJP', '700 40px Caveat', '700 40px NotoIPA', '700 40px NotoAr'].map(f => document.fonts.load(f, 'Ag猫あ')));
await document.fonts.ready;

// ---------------------------------------------------------------- layout: a 9:16 lesson and a 16:9 lesson share every card
const LY = PORT ? {
  title: { cx: W / 2, y: 168, size: 108 }, dots: { cx: W / 2, y: 262 }, pip: { x: W / 2, y: 962, s: 1.36 },
  cap: { cx: W / 2, y: 1046, w: 960, size: 54, lh: 68 },
  card: { x: 50, y: 1190, w: 980, h: 670 }, cover: { x: 50, y: 290, w: 980, h: 1400 },
} : {
  title: { cx: 960, y: 108, size: 84 }, dots: { cx: 420, y: 182 }, pip: { x: 420, y: 1020, s: 1.25 },
  cap: { cx: 1340, y: 945, w: 1020, size: 46, lh: 60 },
  card: { x: 830, y: 250, w: 1050, h: 640 }, cover: { x: 780, y: 215, w: 980, h: 730 },
};

// ---------------------------------------------------------------- the lesson
const TL = await fetch('timeline.json').then(r => r.json());
const S = build(TL);
window.DUR = S.DUR; window.EV = S.EV;
const MOUTH = TL.mouth;
const mouthAt = t => { const x = t * MOUTH.hz, i = Math.floor(x); if (i < 0 || i >= MOUTH.v.length - 1) return 0; return lerp(MOUTH.v[i], MOUTH.v[i + 1], x - i); };

// ---------------------------------------------------------------- backdrop and stage
function backdrop(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2050'); g.addColorStop(1, '#2d3478'); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
  const gx = PORT ? W / 2 : LY.pip.x, gy = PORT ? 700 : 560;
  const rg = ctx.createRadialGradient(gx, gy, 20, gx, gy, PORT ? 640 : 560); rg.addColorStop(0, 'rgba(255,214,140,.46)'); rg.addColorStop(.55, 'rgba(255,190,110,.12)'); rg.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = rg; ctx.fillRect(-W, -H, W * 3, H * 3);
  // chalk doodles drifting very slowly (no letters: they would be unread text)
  ctx.save(); ctx.strokeStyle = 'rgba(190,200,255,.2)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const x = hash(i + 3) * W, y = (PORT ? 300 : 230) + hash(i + 40) * (PORT ? 650 : 760), dx = Math.sin(t * .15 + i) * 14, dy = Math.cos(t * .12 + i * 2) * 10, k = i % 4, r = 14 + hash(i + 9) * 18;
    ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(hash(i + 70) * 6);
    ctx.beginPath(); if (k === 0) ctx.arc(0, 0, r, 0, 7); else if (k === 1) { ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); } else if (k === 2) { ctx.moveTo(-r * 1.4, 0); ctx.quadraticCurveTo(-r * .7, -r, 0, 0); ctx.quadraticCurveTo(r * .7, r, r * 1.4, 0); } else { ctx.moveTo(-r, r * .6); ctx.lineTo(0, -r * .8); ctx.lineTo(r, r * .6); ctx.closePath(); }
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  const fl = ctx.createLinearGradient(0, LY.pip.y - 10, 0, LY.pip.y + 70); fl.addColorStop(0, 'rgba(8,10,40,.35)'); fl.addColorStop(1, 'rgba(8,10,40,0)'); ctx.fillStyle = fl; if (PORT) ctx.fillRect(0, LY.pip.y - 6, W, 80);
}
const poseAt = t => {
  let k = 0; S.poses.forEach((p, i) => { if (t >= p[0]) k = i; });
  const cur = POSES[S.poses[k][1]], prev = k ? POSES[S.poses[k - 1][1]] : cur;
  return blend(prev, cur, ss(seg(t, S.poses[k][0], S.poses[k][0] + .45)));
};
const hopAt = t => { let h = 0; for (const e of S.EV) if (e.type === 'hop') { const d = t - e.t; if (d > 0 && d < .55) h = Math.max(h, 46 * Math.sin(Math.PI * d / .55) * (1 - d / .55 * .5)); } return h; };
function stage(t) {
  const P = poseAt(t), m = mouthAt(t), ph = t % 3.7, blink = ph > 3.5 ? Math.sin((ph - 3.5) / .2 * Math.PI) : 0;
  const pose = { ...P, mouth: Math.min(1, m * 1.5), blink: blink * (1 - Math.max(P.sq, 0)), bob: Math.sin(t * 2.3), tilt: P.tilt + Math.sin(t * 1.3) * 1.4 + m * 2.2, hop: hopAt(t), lookX: P.lx + Math.sin(t * .8) * .15, lookY: P.ly };
  drawPip(ctx, LY.pip.x, LY.pip.y, LY.pip.s, pose);
}

// ---------------------------------------------------------------- title and progress dots
function title(t) {
  const T = S.titles; let k = 0; T.forEach((x, i) => { if (t >= x.t0) k = i; });
  const draw = (tt, alpha, dy, id) => {
    const parts = tt.s, size = LY.title.size; ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(0, dy); setFont(ctx, size, 900, 'zh', true);
    const ws = parts.map(p => width(ctx, p[0], size, 900, 'zh')); const tot = ws.reduce((a, b) => a + b, 0) * 1.0; let x = LY.title.cx - tot / 2 + size * .05;
    parts.forEach((p, i) => { txt(ctx, p[0], x, LY.title.y, { size, w: 900, lang: 'zh', italic: true, fill: p[1], stroke: C.yelEdge, sw: size * .17, id: `${id}.${i}` }); x += ws[i]; });
    ctx.restore();
  };
  const tt = T[k], a = ss(seg(t, tt.t0, tt.t0 + .38));
  if (k > 0 && a < 1) draw(T[k - 1], 1 - a, -a * 40, `title${k - 1}`);
  draw(tt, k === 0 ? 1 : a, (1 - a) * 46 * (k > 0), `title${k}`);
}
function dots(t) {
  const cur = S.dots.find(d => t >= d.t0 && t < d.t1); if (!cur) return;
  const a = ss(seg(t, cur.t0, cur.t0 + .3)) * (1 - ss(seg(t, cur.t1 - .25, cur.t1))); const n = 10, gap = PORT ? 42 : 36, x0 = LY.dots.cx - (n - 1) * gap / 2;
  ctx.save(); ctx.globalAlpha *= Math.max(a, cur.t1 > 1e8 ? a : a);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * gap, y = LY.dots.y, on = i === cur.cur, done = i < cur.cur, pk = on ? 1 + .4 * back(seg(t, cur.t0 + .1, cur.t0 + .5), 3) * (1 - 0) : 1;
    ctx.beginPath(); ctx.arc(x, y, (on ? 14 : 10) * (on ? pk * .8 : 1), 0, 7);
    ctx.fillStyle = on ? C.yel : done ? '#fff' : 'rgba(255,255,255,.18)'; ctx.fill(); if (on) { ctx.strokeStyle = C.yelEdge; ctx.lineWidth = 4; ctx.stroke(); }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- cards: slot placement, slide, flip
const CARD = {}; S.cards.forEach(c => CARD[c.id] = c);
function placement(card, t) {
  const slot = card.tall ? LY.cover : LY.card, dw = PW, dh = card.tall ? 1450 : PH, s = Math.min(slot.w / dw, slot.h / dh);
  const inP = card.inDur ? 1 : eo(seg(t, card.tIn, card.tIn + .5)), outP = ss(seg(t, card.tOut, card.tOut + .4));
  const away = H - slot.y + 90, off = (1 - (card.inDur ? 1 : back(seg(t, card.tIn, card.tIn + .55), 1.3))) * away + outP * away;
  return { cx: slot.x + slot.w / 2, cy: slot.y + slot.h / 2 + off, s, dw, dh, off, vis: t >= card.tIn - .01 && off < away - 1 };
}
function drawCard(card, t) {
  const pl = placement(card, t); if (!pl.vis) return;
  // which face, and the flip between faces
  let k = 0, fx = 1; card.faces.forEach((f, i) => { if (t >= f.t0 - (i ? 0 : 0)) k = i; });
  for (let i = 1; i < card.faces.length; i++) { const f0 = card.faces[i].t0, u = (t - (f0 - .18)) / .36; if (u > 0 && u < 1) { fx = Math.abs(Math.cos(Math.PI * u)); k = u < .5 ? i - 1 : i; } }
  const face = card.faces[k].face;
  ctx.save(); ctx.translate(pl.cx, pl.cy); ctx.scale(pl.s * Math.max(fx, .001), pl.s); ctx.translate(-pl.dw / 2, -pl.dh / 2);
  if (face.ribbon && fx > .999) ribbon(ctx, face, t, pl.dw);
  paper(ctx, pl.dw, pl.dh); FACES[face.type](ctx, face, t);
  ctx.restore();
}
// design-space point of a card -> screen
const toScreen = (card, t, x, y) => { const p = placement(card, t); return [p.cx + (x - p.dw / 2) * p.s, p.cy + (y - p.dh / 2) * p.s]; };

// ---------------------------------------------------------------- camera: a push-in on the clue
function camAt(t) {
  let z = 1, fx = W / 2, fy = H / 2;
  for (const c of S.cams) {
    const k = ss(seg(t, c.t0, c.t0 + .75)) * (1 - ss(seg(t, c.t1, c.t1 + .75)));
    if (k > 0) {
      const card = CARD[c.card], face = card.faces[0].face, cc = clueCenter(ctx, face), [sx, sy] = toScreen(card, c.t0 + .9, cc.x, cc.y);
      z = 1 + (c.z - 1) * k; fx = W / 2; fy = sy;
    }
  }
  return { z, fx, fy };
}

// ---------------------------------------------------------------- burned-in captions (also the .srt)
function captions(t) {
  const cue = S.caps.find(c => t >= c.t0 && t < c.t1); if (!cue) return;
  const a = ss(seg(t, cue.t0, cue.t0 + .16)) * (1 - ss(seg(t, cue.t1 - .12, cue.t1))), L = { ...LY.cap, y: PORT ? (cue.y || LY.cap.y) : (cue.yl || LY.cap.y) };
  const chunks = []; cue.parts.forEach(([lang, s]) => { if (lang === 'zh') for (const ch of s) chunks.push({ s: ch, col: '#fff', lang: 'zh' }); else s.split(/(?<= )/).forEach(w => chunks.push({ s: w, col: C.yel, lang: 'lat' })); });
  ctx.save(); setFont(ctx, L.size, 800, 'zh'); const ws = chunks.map(c => { setFont(ctx, L.size, 800, c.lang); return ctx.measureText(c.s).width; });
  const lines = [[]]; let lw = 0; chunks.forEach((c, i) => { if (lw + ws[i] > L.w && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(i); lw += ws[i]; });
  if (lines.length === 2) {                                   // balance two lines instead of leaving one word alone on the second
    const all = lines[0].concat(lines[1]); let best = lines[0].length, bm = 1e9;
    for (let k = 1; k < all.length; k++) { const a = all.slice(0, k).reduce((u, i) => u + ws[i], 0), b = all.slice(k).reduce((u, i) => u + ws[i], 0); if (!/^[，。！？、：；,.!?]/.test(chunks[all[k]].s) && a <= L.w && b <= L.w && Math.max(a, b) < bm) { bm = Math.max(a, b); best = k; } }
    lines[0] = all.slice(0, best); lines[1] = all.slice(best);
  }
  const y0 = L.y - (lines.length - 1) * L.lh / 2 + (1 - a) * 12;
  ctx.globalAlpha *= a; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  lines.forEach((ln, li) => {
    const tot = ln.reduce((u, i) => u + ws[i], 0); let x = L.cx - tot / 2, y = y0 + li * L.lh;
    ln.forEach(i => { const c = chunks[i]; setFont(ctx, L.size, 800, c.lang); ctx.textAlign = 'left'; ctx.strokeStyle = C.navy; ctx.lineWidth = 13; ctx.strokeText(c.s, x, y); ctx.fillStyle = c.col; ctx.fillText(c.s, x, y); x += ws[i]; });
  });
  ctx.restore();
}

// ---------------------------------------------------------------- the frame
window.render = t => {
  resetTexts(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  const cam = camAt(t);
  ctx.save(); ctx.translate(cam.fx, cam.fy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.fx, -cam.fy);
  backdrop(t); stage(t); title(t); dots(t);
  S.cards.forEach(c => drawCard(c, t));
  ctx.restore();
  captions(t);
};
window.TEXTS = () => takeTexts();
// ?show=cards: a review sheet of the other cards of the system (not part of the film)
if (Q.get('show') === 'cards') {
  const { SHEET } = await import('./showcase.js');
  window.render = () => {
    resetTexts(); ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2050'); g.addColorStop(1, '#2d3478'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    SHEET.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2), sc = .5, x = 30 + col * 530, y = 72 + row * 452;
      txt(ctx, c.name, x + 4, y - 14, { size: 26, w: 800, fill: '#fff' });
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); paper(ctx, PW, PH); FACES[c.face.type](ctx, c.face, 10); ctx.restore();
    });
  };
}
window.READY = true;
