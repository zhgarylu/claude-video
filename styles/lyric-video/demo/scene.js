// Backgrounds: one disc that is a clock, a moon or a sun, and shapes that pulse with the kick.
import { clamp, lerp, ss, eo, mulberry, TAU } from '/core/lib.js';
import { BEAT, BAR, DUR } from './timeline.js';

// palette per section: night = cool, day = warm, the chorus is the loudest colour in the film
export const PAL = {
  intro:  { bg: '#0b1030', bg2: '#17205a', fg: '#eef2ff', lit: '#ffffff', unlit: 'rgba(238,242,255,.40)', acc: '#ffd23f', shape: '#27358a', shape2: '#ffd23f' },
  v1:     { bg: '#0b1030', bg2: '#17205a', fg: '#dfe8ff', lit: '#ffffff', unlit: 'rgba(223,232,255,.40)', acc: '#ffd23f', shape: '#27358a', shape2: '#7aa2ff' },
  p1:     { bg: '#2a0d52', bg2: '#5a1a78', fg: '#ffffff', lit: '#ffffff', unlit: 'rgba(255,255,255,.42)', acc: '#ff7ab6', shape: '#8a2a96', shape2: '#ff7ab6' },
  c1:     { bg: '#ffb81c', bg2: '#ffc83d', fg: '#14100a', lit: '#14100a', unlit: 'rgba(20,16,10,.35)', acc: '#e8352e', shape: '#ff8f1c', shape2: '#e8352e', ray: '#ffd24a' },
  v2:     { bg: '#f4efe3', bg2: '#fff6dc', fg: '#17203a', lit: '#17203a', unlit: 'rgba(23,32,58,.34)', acc: '#e8461f', shape: '#ffd36b', shape2: '#e8461f' },
  p2:     { bg: '#ff6a4d', bg2: '#e2402f', fg: '#240a16', lit: '#240a16', unlit: 'rgba(36,10,22,.40)', acc: '#fff3d6', shape: '#ffb04a', shape2: '#fff3d6' },
  c2:     { bg: '#e8352e', bg2: '#f0543a', fg: '#fff3d6', lit: '#fff3d6', unlit: 'rgba(255,243,214,.42)', acc: '#ffd23f', shape: '#ff7a2b', shape2: '#ffd23f', ray: '#ff5a3a' },
  bridge: { bg: '#060919', bg2: '#0e1438', fg: '#b9c4ff', lit: '#e8ecff', unlit: 'rgba(185,196,255,.64)', acc: '#ffd23f', shape: '#1b2663', shape2: '#ffd23f' },
  joke:   { bg: '#060919', bg2: '#0e1438', fg: '#b9c4ff', lit: '#e8ecff', unlit: 'rgba(185,196,255,.64)', acc: '#ffd23f', shape: '#1b2663', shape2: '#ffd23f' },
  end:    { bg: '#0b1030', bg2: '#17205a', fg: '#eef2ff', lit: '#ffffff', unlit: 'rgba(238,242,255,.40)', acc: '#ffd23f', shape: '#27358a', shape2: '#ffd23f' },
};
const R = mulberry(89);
const STARS = Array.from({ length: 90 }, () => ({ x: R() * 1920, y: R() * 720, r: .8 + R() * 1.8, p: R() * TAU, s: .6 + R() * 1.4 }));
const BLOBS = Array.from({ length: 70 }, () => ({ x: R() * 1920, y: R() * 1080, r: 6 + R() * 10 }));

const grad = (c, a, b, y0 = 0, y1 = 1080) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
function ticks(c, cx, cy, r, n, len, w, col, big = 5) {
  c.save(); c.strokeStyle = col; c.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2, l = i % big == 0 ? len * 1.7 : len; c.lineWidth = i % big == 0 ? w * 1.6 : w; c.beginPath(); c.moveTo(cx + Math.cos(a) * (r - l), cy + Math.sin(a) * (r - l)); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.stroke(); }
  c.restore();
}
function rays(c, cx, cy, n, r0, r1, rot, col, a) {
  c.save(); c.fillStyle = col; c.globalAlpha = a;
  for (let i = 0; i < n; i += 2) { const a0 = rot + i / n * TAU, a1 = rot + (i + 1) / n * TAU; c.beginPath(); c.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0); c.lineTo(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1); c.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1); c.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0); c.fill(); }
  c.restore();
}
function disc(c, cx, cy, r, col) { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); }
// pulse rings: one per kick, growing outward
function kickRings(c, cx, cy, kicks, t, col, r0, speed, lw, life = .95) {
  c.save(); c.strokeStyle = col;
  for (const k of kicks) { const u = (t - k.t) / life; if (u < 0 || u > 1) continue; c.globalAlpha = (1 - u) * .55 * (k.v || 1); c.lineWidth = lw * (1 - u * .6); c.beginPath(); c.arc(cx, cy, r0 + u * speed, 0, TAU); c.stroke(); }
  c.restore();
}

// where the disc sits in each section, so the iris can open from it
export function discAt(key, t) {
  if (key == 'c1' || key == 'c2') return [960, 560];
  if (key == 'p1' || key == 'p2') return [960, 580];
  if (key == 'v2') return [1560, 250];
  if (key == 'end') return [960, 820];
  return [1520, 300];
}

// o = {K: kick envelope fn(tau), kicks: recent kick events, bar: bar float, lt: seconds into the section}
export function drawBG(c, key, t, o) {
  const P = PAL[key], k = o.K(.14), b = t / BEAT, cx0 = discAt(key, t)[0], cy0 = discAt(key, t)[1];
  c.fillStyle = grad(c, P.bg, P.bg2, -200, 1280); c.fillRect(-300, -300, 2520, 1680);
  if (key == 'v1' || key == 'intro' || key == 'bridge' || key == 'joke') {
    const dim = key == 'bridge' || key == 'joke' ? .55 : 1, fall = key == 'bridge' ? clamp(o.lt / (2 * BAR)) : 0;
    c.fillStyle = '#fff';
    for (const s of STARS) { c.globalAlpha = (.25 + .45 * (.5 + .5 * Math.sin(t * s.s + s.p))) * dim; c.fillRect(s.x, s.y + fall * 40, s.r, s.r); }
    c.globalAlpha = 1;
    if (key == 'intro') {            // the alarm clock: a face behind the hook, hands at six, rings flash with the two beeps
      const cx = 960, cy = 540, R0 = 400 * (1 + .03 * k), beep = o.beep;
      disc(c, cx, cy, R0, '#141c52'); c.strokeStyle = beep > .1 ? '#ff5a4a' : '#27358a'; c.lineWidth = 10 + 8 * beep; c.beginPath(); c.arc(cx, cy, R0, 0, TAU); c.stroke();
      ticks(c, cx, cy, R0 - 18, 60, 14, 3, '#8fa6ff'); c.lineCap = 'round'; c.strokeStyle = '#eef2ff'; c.lineWidth = 12;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy + R0 * .5); c.stroke();   // hour hand down: six
      const sec = -Math.PI / 2 + Math.floor(b) * TAU / 24 + ss((b % 1) * 4) * TAU / 24; c.lineWidth = 6; c.strokeStyle = '#ffd23f'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(sec) * R0 * .82, cy + Math.sin(sec) * R0 * .82); c.stroke();
      for (const a of [-1, 1]) { c.save(); c.translate(cx + a * R0 * .78, cy - R0 * .72); c.rotate(a * (.5 + beep * .12 * Math.sin(t * 90))); disc(c, 0, 0, 62, beep > .1 ? '#ff5a4a' : '#27358a'); c.restore(); }   // the bells
    } else {                          // moon and clock ring
      const cx = cx0, cy = cy0 + fall * 110, R0 = (key == 'bridge' ? 150 : 230) * (1 + .018 * k);
      kickRings(c, cx, cy, o.kicks, t, '#5a73ff', R0 + 20, 520, 5);
      disc(c, cx, cy, R0, key == 'bridge' || key == 'joke' ? '#141c52' : '#1d2766'); ticks(c, cx, cy, R0 - 10, 60, 9, 2.4, '#7f95ff');
      const a = -Math.PI / 2 + (Math.floor(b) + ss((b % 1) * 5)) * TAU / 60; c.strokeStyle = '#ffd23f'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (R0 - 24), cy + Math.sin(a) * (R0 - 24)); c.stroke();
      disc(c, cx, cy, 8, '#ffd23f');
    }
    // low horizon
    c.fillStyle = '#060919'; c.globalAlpha = .55; c.fillRect(0, 960, 1920, 120); c.globalAlpha = 1;
  }
  else if (key == 'p1' || key == 'p2') {
    const u = clamp(o.lt / (2 * BAR)), R0 = lerp(170, 640, ss(u)) * (1 + .03 * k), rot = t * (.25 + u * .9);
    const sunny = key == 'p2';
    rays(c, cx0, cy0, 32, R0 * .8, 1700, rot, sunny ? '#ffd1a0' : '#ff7ab6', .12 + .16 * u);
    kickRings(c, cx0, cy0, o.kicks, t, sunny ? '#fff3d6' : '#ff7ab6', R0, 700, 7, .8);
    disc(c, cx0, cy0, R0, sunny ? '#ffb04a' : '#7a2290'); ticks(c, cx0, cy0, R0 - 14, 60, 16, 3.4, sunny ? '#fff3d6' : '#ff9cc9');
    c.save(); c.translate(cx0, cy0); const a = Math.floor(b * 4) / 4 * TAU / 6; c.rotate(a); c.strokeStyle = P.acc; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -R0 + 40); c.stroke(); c.restore();
  }
  else if (key == 'c1' || key == 'c2') {
    const hot = key == 'c2', R0 = (hot ? 640 : 560) * (1 + (hot ? .06 : .045) * k), rot = t * (hot ? .32 : .2);
    rays(c, cx0, cy0, 28, R0 * .9, 1800, rot, P.ray, hot ? .5 : .55);
    kickRings(c, cx0, cy0, o.kicks, t, P.shape2, R0 + 10, 900, hot ? 16 : 12, .8);
    disc(c, cx0, cy0, R0, P.shape);
    c.save(); c.globalAlpha = .18; disc(c, cx0, cy0, R0 * .78, '#fff3d6'); c.restore();
    if (hot) { c.fillStyle = 'rgba(255,243,214,.10)'; for (const d of BLOBS) { const j = Math.sin(t * 2 + d.x) * 3; c.beginPath(); c.arc(d.x, d.y + j, d.r * (1 + .3 * k), 0, TAU); c.fill(); } }
  }
  else if (key == 'v2') {
    const sx = (t * 70) % 520;      // slanting beams of sunlight slide across
    c.fillStyle = P.shape; c.globalAlpha = .38;
    for (let i = -4; i < 8; i++) { const x = i * 520 + sx; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 220, 0); c.lineTo(x - 180, 1080); c.lineTo(x - 400, 1080); c.fill(); }
    c.globalAlpha = 1; c.fillStyle = 'rgba(23,32,58,.07)';
    for (let y = 60; y < 1080; y += 60) for (let x = 60; x < 1920; x += 60) { c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); }
    const R0 = 170 * (1 + .05 * k);
    rays(c, cx0, cy0, 24, R0 + 24, R0 + 120, t * .22, '#ffb02e', .75);
    kickRings(c, cx0, cy0, o.kicks, t, '#e8461f', R0 + 14, 420, 5);
    disc(c, cx0, cy0, R0, '#ffc23a'); disc(c, cx0, cy0, R0 * .8, '#ffd978');
  }
  else if (key == 'end') {
    const u = ss(clamp(o.lt / (BAR * 1.4))), cy = lerp(1230, 1040, u), R0 = 300 * (1 + .02 * k);
    for (const s of STARS) { c.fillStyle = '#fff'; c.globalAlpha = (.25 + .4 * (.5 + .5 * Math.sin(t * s.s + s.p))) * (1 - u * .6); c.fillRect(s.x, s.y, s.r, s.r); }
    c.globalAlpha = 1;
    rays(c, 960, cy, 28, R0, 1400, t * .12, '#ffb81c', .13 * u); kickRings(c, 960, cy, o.kicks, t, '#ffd23f', R0, 480, 6);
    disc(c, 960, cy, R0, '#ffb81c'); disc(c, 960, cy, R0 * .86, '#ffd23f');
    c.fillStyle = '#060919'; c.fillRect(0, 1010, 1920, 70);
  }
}
