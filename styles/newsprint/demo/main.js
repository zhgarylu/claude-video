// "Print It True": one story, four editions, one correction. Everything is drawn in code; t = film seconds (timeline.js).
import { track, clamp, lerp, ss, eo, ei, mulberry, hash } from '/core/lib.js';
import { T, DUR, CAM, EV, MSG, PRE } from './timeline.js';
import { loadFonts, font, INK } from './engine/type.js';
import { buildPage, drawPage, makePaper, PW, PH } from './engine/page.js';

const cv = document.getElementById('c'), out = cv.getContext('2d'), W = 1920, H = 1080;
const rt = (t, a, b) => clamp((t - a) / (b - a));
let PG = {}, PAPER = {}, TABLE = null, SUBS = [], FOLEY_VIS = null;

// ---------------------------------------------------------------- camera
const camF = track(CAM.map(k => [k[0], k[1]]));
function camAt(t) {
  const [cx, cy, s, r] = camF(clamp(t, 0, DUR));
  // the stamp strikes: a short, hard shake; the slaps nudge the camera
  let sx = 0, sy = 0;
  const hit = (t0, amp, dur) => { const u = t - t0; if (u >= 0 && u < dur) { const k = (1 - u / dur); sx += (hash(Math.floor(u * 24) * 1.3 + t0) - 0.5) * amp * k * k; sy += (hash(Math.floor(u * 24) * 2.1 + t0 * 3) - 0.5) * amp * k * k; } };
  hit(T.stamp, 26, 0.5); hit(T.p2Land, 8, 0.25); hit(T.p4Land, 8, 0.25);
  const ring = (t >= T.bell && t < T.bell + 0.5) || (t >= T.bell + 1.55 && t < T.bell + 2.05); if (ring) { sx += Math.sin(t * 150) * 1.5; sy += Math.cos(t * 130) * 1.2; }
  // a punch-in on the stamp
  const pu = t - T.stamp, punch = pu >= 0 && pu < 0.35 ? 0.05 * Math.sin(pu / 0.35 * Math.PI) : 0;
  return { cx: cx + sx, cy: cy + sy, s: s * (1 + punch), r };
}

// ---------------------------------------------------------------- the table and the pages
function makeTable() {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), rnd = mulberry(5);
  g.fillStyle = '#292826'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,235' : '0,0,0'},${0.02 + rnd() * 0.04})`; g.fillRect(rnd() * n, rnd() * n, 8 + rnd() * 90, 1); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,248,230,${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * n, rnd() * n, 1, 1); }
  return c;
}
const SLOT = { p1: -4500, p2pre: -3000, p2: -1500, p4: 0 };
const STACK = { p1: [0, 0, 0], p2pre: [16, -8, 0.5], p2: [16, -8, 0.5], p4: [-14, 10, -0.6] };
const DEAL_AT = { p2: T.deal0, p2pre: T.deal0 + 0.28, p1: T.deal0 + 0.56, p4: T.deal0 };
function place(id, t) {
  let [x, y, r] = STACK[id], vis = true, lift = 0;
  if (id === 'p2' || id === 'p4') {
    const t0 = id === 'p2' ? T.p2Drop : T.p4Drop, t1 = id === 'p2' ? T.p2Land : T.p4Land;
    if (t < t0) vis = false;
    else if (t < t1) { const u = (t - t0) / (t1 - t0), e = u * u; y = lerp(-1700, y, e); r = lerp(id === 'p2' ? 5 : -5, r, e); lift = 1 - e; }
    else { const u = t - t1; y += -7 * Math.exp(-u * 11) * Math.cos(u * 30); }
  }
  if (id === 'p2pre' && t < T.deal0) vis = false;
  if (t >= DEAL_AT[id]) {
    const u = rt(t, DEAL_AT[id], DEAL_AT[id] + 0.9), e = u < 0 ? 0 : 1 - Math.pow(1 - u, 3);
    const tx = SLOT[id], tilt = Math.sin(u * Math.PI) * -3.2;
    x = lerp(x, tx, e); y = lerp(y, 0, e); r = lerp(r, 0, e) + tilt; lift = Math.max(lift, Math.sin(u * Math.PI) * 0.6);
  }
  return { x, y, r, vis, lift };
}
const ORDER = ['p1', 'p2pre', 'p2', 'p4'];
const pageTime = (id, t) => id === 'p2pre' ? Math.min(t, T.hush0 - 0.1) : t;

function drawScene(c, t) {
  const cam = camAt(t);
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#292826'; c.fillRect(0, 0, W, H);
  c.setTransform(1, 0, 0, 1, W / 2, H / 2); c.rotate(cam.r * Math.PI / 180); c.scale(cam.s, cam.s); c.translate(-cam.cx, -cam.cy);
  // table
  c.fillStyle = c.createPattern(TABLE, 'repeat');
  const R = 4200; c.fillRect(cam.cx - R, cam.cy - R, 2 * R, 2 * R);
  // the wire tape
  drawTape(c, t);
  // pages
  for (const id of ORDER) {
    const pl = place(id, t); if (!pl.vis) continue;
    c.save(); c.translate(pl.x, pl.y); c.rotate(pl.r * Math.PI / 180);
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = (26 + pl.lift * 50) * cam.s; c.shadowOffsetY = (8 + pl.lift * 40) * cam.s; c.fillStyle = '#d6cdb4'; c.fillRect(-PW / 2, -PH / 2, PW, PH);
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    const key = id === 'p2pre' ? 'p2' : id;
    drawPage(c, PG[key], pageTime(id, t), PAPER[key], {});
    c.restore();
  }
  LAST = { cam, t };
}
let LAST = null;

// ---------------------------------------------------------------- the wire tape
const CW = 27.6, TAPE_Y = 1150, HEADX = 566;
const TAPE_TXT = PRE + MSG;
function tapePtr(t) { const nP = PRE.length, nM = MSG.length; if (t < T.tape0) return nP - (T.tape0 - t) * 9; if (t < T.tape1) return nP + nM * rt(t, T.tape0, T.tape1); return nP + nM; }
function drawTape(c, t) {
  const cam = camAt(t); if (cam.cy + 600 / cam.s < TAPE_Y - 60 && t < 1e9) { if (cam.cy + 560 / cam.s < TAPE_Y - 60) return; }
  const ptr = tapePtr(t), jit = (t >= T.bell && t < T.bell + 0.5) || (t >= T.bell + 1.55 && t < T.bell + 2.05) ? Math.sin(t * 160) * 1.2 : 0;
  c.save(); c.translate(0, TAPE_Y + jit);
  c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 20 * cam.s; c.shadowOffsetY = 6 * cam.s; c.fillStyle = '#d9d0b6'; c.fillRect(-2600, -46, 2600 + 1400, 92); c.shadowColor = 'transparent';
  c.fillStyle = 'rgba(70,55,30,.10)'; for (let x = -2600; x < 1400; x += 60) c.fillRect(x, -46, 1, 92);
  c.strokeStyle = 'rgba(40,30,15,.35)'; c.setLineDash([6, 8]); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-2600, -36); c.lineTo(1400, -36); c.moveTo(-2600, 36); c.lineTo(1400, 36); c.stroke(); c.setLineDash([]);
  c.font = font('slab', 46); c.fillStyle = INK; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  for (let i = 0; i < TAPE_TXT.length; i++) {
    if (i > ptr) break;
    const x = HEADX - (ptr - i) * CW; if (x < -1500 || x > 1500) continue;
    const fresh = ptr - i < 1; c.globalAlpha = fresh ? 0.6 : 1; c.fillText(TAPE_TXT[i], x, 16);
  }
  c.globalAlpha = 1;
  // the print head
  c.fillStyle = '#4b5054'; c.fillRect(HEADX + 16, -62, 22, 124); c.fillStyle = '#9aa0a3'; c.fillRect(HEADX + 16, -62, 22, 6);
  c.restore();
}

// ---------------------------------------------------------------- the galley slip (subtitles)
function drawSub(c, t) {
  const s = SUBS.find(s => t >= s.t0 && t < s.t1); if (!s) return;
  const dt = t - s.t0, a = Math.min(1, dt / 0.12) * Math.min(1, (s.t1 - t) / 0.12);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.translate(W / 2, 982); c.rotate(-0.006); c.globalAlpha = a;
  c.font = font('bodyI', 38); const tw = c.measureText(s.text).width, w = Math.max(560, tw + 90), h = 78;
  c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 14; c.shadowOffsetY = 4; c.fillStyle = '#e4dcc4'; c.fillRect(-w / 2, -h / 2, w, h); c.shadowColor = 'transparent';
  c.fillStyle = 'rgba(90,70,40,.10)'; for (let i = 0; i < 40; i++) c.fillRect(-w / 2 + hash(i * 3.1) * w, -h / 2 + hash(i * 7.7) * h, 2, 1);
  c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(-w / 2 + 10, -h / 2 + 8); c.lineTo(w / 2 - 10, -h / 2 + 8); c.stroke(); c.lineWidth = 0.8; c.beginPath(); c.moveTo(-w / 2 + 10, -h / 2 + 12); c.lineTo(w / 2 - 10, -h / 2 + 12); c.moveTo(-w / 2 + 10, h / 2 - 9); c.lineTo(w / 2 - 10, h / 2 - 9); c.stroke();
  c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(s.text, 0, 11);
  c.restore();
}

// ---------------------------------------------------------------- frame
function post(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function camSpeed(t) { const a = camAt(t - 1 / 48), b = camAt(t + 1 / 48); return Math.hypot((b.cx - a.cx) * b.s, (b.cy - a.cy) * b.s) * 12 + Math.abs(b.s - a.s) * 600; }
const acc = document.createElement('canvas'); acc.width = W; acc.height = H;
function render(t) {
  const sp = camSpeed(t), n = sp > 70 ? Math.min(6, Math.ceil(sp / 70)) : 1;
  if (n === 1) drawScene(out, t);
  else {
    const g = acc.getContext('2d'); out.setTransform(1, 0, 0, 1, 0, 0); out.clearRect(0, 0, W, H);
    for (let k = 0; k < n; k++) { drawScene(g, t - (k / n) * (1 / 24) * 0.8 + 0.4 / 24); out.globalAlpha = 1 / (k + 1); out.drawImage(acc, 0, 0); }
    out.globalAlpha = 1;
  }
  post(out, t);
  if (!new URLSearchParams(location.search).get('nosub')) drawSub(out, t);
}
window.DUR = DUR; window.EV = EV; window.render = render;

// ---------------------------------------------------------------- what the viewer is meant to read (for readcheck)
const headRect = (H, pad = 0) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const c of H.chars) { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x + c.w); y0 = Math.min(y0, c.y - H.size * 0.72); y1 = Math.max(y1, c.y + H.size * 0.22); } return { x0, y0, x1, y1 }; };
const ROW0 = T.deal0 + 0.95;
function readsAt(t) {
  const R = [], p1 = PG.p1, p2 = PG.p2, p4 = PG.p4;
  const add = (id, text, page, rc, t0, t1) => { if (t >= t0 && t < t1) R.push({ id, text, page, rc }); };
  const dRect = (d, x0 = -640, x1 = 640) => ({ x0, y0: d.lines[0].y - 24, x1, y1: d.lines[d.lines.length - 1].y + 8 });
  const cRect = cp => ({ x0: -200, y0: cp.lines[0].y - 16, x1: 640, y1: cp.lines[cp.lines.length - 1].y + 6 });
  const lineRect = (d) => { let x1 = 0; for (const l of d.lines) x1 = Math.max(x1, l.x + l.w); return x1; };
  add('h1', 'FIRE AT CANDLE MILL', 'p1', headRect(p1.heads[0].H), T.p1Head, T.p2Land);
  add('d1', 'Smoke seen at dawn; residents told to stay indoors', 'p1', { x0: -640, y0: -400, x1: 160, y1: -348 }, T.p1Deck, T.p2Land);
  add('c1', 'Smoke rises above the Candle Mill at first light.', 'p1', { x0: -200, y0: p1.caps[0].lines[0].y - 16, x1: 330, y1: p1.caps[0].lines[0].y + 6 }, T.p1Cap, T.p2Land);
  add('h2', 'MILL FIRE: THREE HURT', 'p2', headRect(p2.heads[0].H), T.p2Head, T.pull0);
  add('d2', 'Crowds at the quayside as firemen reach the mill', 'p2', { x0: -640, y0: -400, x1: 80, y1: -348 }, T.p2Head + 1.6, T.pull0);
  add('x2', 'EXTRA', 'p2', { x0: 410, y0: -735, x1: 670, y1: -630 }, T.p2Extra, T.deal0);
  add('tape', MSG, null, { x0: -566, y0: TAPE_Y - 36, x1: 566, y1: TAPE_Y + 30 }, T.tape0, T.stamp - 0.1);
  add('sp', 'STOP PRESS', 'p2', { x0: 20, y0: -600, x1: 650, y1: -320 }, T.stamp, T.deal0);
  add('h3', 'IT WAS THE OVEN', 'p2', headRect(p2.heads[1].H), T.fix0, T.deal0 + 99);
  add('d3', 'The smoke was the bakery’s new oven; nobody was hurt', 'p2', { x0: -640, y0: -400, x1: 150, y1: -348 }, T.fixDeck, T.p4Land);
  add('c3', 'The “fire”: a new oven flue on Harbour Road. The mill is quiet.', 'p2', { x0: -200, y0: 128, x1: 520, y1: 172 }, T.fixCap, T.p4Land);
  add('h4', 'WE WERE WRONG', 'p4', headRect(p4.heads[0].H), T.p4Head, 1e9);
  add('h4b', 'OVEN’S FIRST LOAF FEEDS THE STREET', 'p4', headRect(p4.heads[1].H), T.p4Head + 1.9, 1e9);
  add('n4', 'There was no fire at the Candle Mill. We are sorry.', 'p4', { x0: -600, y0: -520, x1: 120, y1: -480 }, 48.2, 1e9);
  if (t >= ROW0) {
    add('r1', 'FIRE AT CANDLE MILL', 'p1', headRect(p1.heads[0].H), ROW0, 1e9);
    add('r2', 'MILL FIRE: THREE HURT', 'p2pre', headRect(p2.heads[0].H), ROW0, 1e9);
  }
  return R;
}
window.TEXTS = t => {
  if (!LAST || Math.abs(LAST.t - t) > 1e-6) { window.render(t); }
  const cam = LAST.cam, out = [], cr = cam.r * Math.PI / 180, ca = Math.cos(cr), sa = Math.sin(cr);
  const toS = (wx, wy) => { const dx = (wx - cam.cx) * cam.s, dy = (wy - cam.cy) * cam.s; return [W / 2 + dx * ca - dy * sa, H / 2 + dx * sa + dy * ca]; };
  for (const r of readsAt(t)) {
    let pl = { x: 0, y: 0, r: 0 }; if (r.page) pl = place(r.page, t);
    if (r.page && !pl.vis) continue;
    const pr = pl.r * Math.PI / 180, pc = Math.cos(pr), ps = Math.sin(pr);
    const pts = [[r.rc.x0, r.rc.y0], [r.rc.x1, r.rc.y0], [r.rc.x1, r.rc.y1], [r.rc.x0, r.rc.y1]].map(([x, y]) => toS(pl.x + x * pc - y * ps, pl.y + x * ps + y * pc));
    out.push({ id: r.id, text: r.text, x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) });
  }
  return out;
};

(async () => {
  try {
    await loadFonts();
    TABLE = makeTable();
    PAPER = { p1: makePaper(3, '#d7cfb5'), p2: makePaper(8, '#d9d1b7'), p4: makePaper(14, '#dad3bb') };
    PG = { p1: buildPage('p1'), p2: buildPage('p2'), p4: buildPage('p4') };
    const q = new URLSearchParams(location.search);
    if (!q.get('nosub')) { const r = await fetch('caps.json'); if (r.ok) SUBS = await r.json(); }
  } catch (e) { console.error(e); throw e; }
  window.READY = true;
})();
