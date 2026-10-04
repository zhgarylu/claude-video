// "The Last Bowl on Pell Street": one wall, one street, one camera path. t = film seconds (timeline.js).
import { neonText, icon, frame } from './glyphs.js';
import { renderScene, prepSign, pointAt, GAS, W, H } from './neon.js';
import { track, clamp, lerp, hash, eio, ss } from '/core/lib.js';
import { T, DUR } from './timeline.js';

const out = document.getElementById('c').getContext('2d');
const { red, blue, white, green, pink, orange } = GAS;

// ---------------------------------------------------------------- helpers
const centered = (str, cx, y, h, col, o) => { const w = neonText(str, 0, y, h, col, o).width; return neonText(str, cx - w / 2, y, h, col, o); };
const sign = (strokes, o = {}) => prepSign(Object.assign({ strokes, seed: 1 }, o));
const byLetter = t => { const by = {}; for (const s of t.strokes) (by[s.li] ??= []).push(s); return Object.values(by); };
const PAT = [1, 0, 1, 0, 0, 1], OFFPAT = [1, 0, .7, 0, .3, 0];
const stut = dt => dt < 0 ? 0 : dt < .25 ? (PAT[Math.floor(dt * 24)] ?? 1) : 1;
const offp = dt => dt < .25 ? (OFFPAT[Math.floor(dt * 24)] ?? 0) : 0;
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const slotDrop = (t, seed, p, rate = 14) => { const sl = Math.floor(t * rate); return hash(sl * 3.17 + seed * 7.3) < p ? .1 + .3 * hash(sl * 1.9 + seed) : 1; };

// A sign of the noodle bar: ignites at on0 over idur, is dark between the blackout and its restart, off again at the breaker.
function mainLife(sg, on0, idur, rdelay, rdur, o = {}) {
  const tot = () => sg.total;
  sg.lit = t => {
    if (o.lit && t < T.blackout) return o.lit(t, tot());
    if (t >= T.restart + rdelay) return tot() * ramp(t, T.restart + rdelay, T.restart + rdelay + rdur);
    return t < on0 ? 0 : tot() * ramp(t, on0, on0 + idur);
  };
  sg.I = t => {
    let v;
    if (t < T.blackout) v = o.I ? o.I(t) : stut(t - on0);
    else if (t < T.blackout + .25) v = offp(t - T.blackout);
    else if (t < T.restart + rdelay) v = 0;
    else v = stut(t - T.restart - rdelay);
    if (t >= T.breaker) v = offp(t - T.breaker) * v;
    return v * (o.extra ? o.extra(t) : 1);
  };
  return sg;
}
// A neighbour: lit from the start, switched off with a sputter.
const neighbour = (sg, toff) => { sg.I = t => t < toff ? 1 : offp(t - toff); return sg; };

// ---------------------------------------------------------------- the noodle bar
const FR = frame(330, 70, 1590, 720, 90, blue, 120);
const BOWL = icon('bowl', 960 - 115, 105, 230, white, blue, .05);
const TXT = centered('NOODLES', 960, 330, 190, red, { track: .17 });
const OPN = centered('OPEN 24 HOURS', 960, 628, 60, green, { track: .22 });
const letters = byLetter(TXT);
const L_STROKE = TXT.strokes.find(s => s.li === 4);
const LX = L_STROKE.pts[0][0], L_END = L_STROKE.pts[L_STROKE.pts.length - 1];
L_STROKE.deadFn = t => t >= T.lDead ? [[.36, 1]] : null;

const sFrame = sign(FR, { seed: 5, fp: .02 });
// frame: first light is the film's opening: catch, fail, catch, hold, then travel
mainLife(sFrame, T.frame0, T.frameEnd - T.frame0, 0, 1.8, {
  lit: (t, tot) => t < T.catch ? 0 : t < T.hold ? 70 : t < T.frame0 ? 70 + (t - T.hold) * 110 : lerp(70 + (T.frame0 - T.hold) * 110, tot, ramp(t, T.frame0, T.frameEnd)),
  I: t => t < T.catch ? 0 : t < 1.78 ? 1 : t < 2.9 ? 0 : t < T.hold ? ([1, 0, 1][Math.floor((t - 2.9) * 24)] ?? 0) : 1,
});
const sBowl = mainLife(sign(BOWL, { seed: 9, d: 9 }), T.bowl, T.bowlDur, .45, .7);
const dying = t => t < T.lDie0 || t >= T.blackout ? 1 : t < T.lDead ? slotDrop(t, 11, .75 * ramp(t, T.lDie0, T.lDead), 12) : slotDrop(t, 11, .05, 12) ;
const eflick = t => t < T.eFlick || t >= T.blackout ? 1 : slotDrop(t, 17, .45 * ramp(t, T.eFlick, T.eFlick + 2.5) + .08, 11);
const sLetters = letters.map((ss, i) => mainLife(sign(ss, { seed: 3 + i * 1.7, fp: .012 }), T.lettersFrom + i * T.letterGap, T.letterDur, .8 + i * .14, .5,
  { extra: i === 4 ? dying : i === 5 ? eflick : null }));
const sOpen = mainLife(sign(OPN.strokes, { seed: 11, d: 7.5 }), T.open, T.openDur, 1.7, .5);
const MAIN = [sFrame, sBowl, ...sLetters, sOpen];

// ---------------------------------------------------------------- neighbours (to the right along the street)
const mart = icon('martini', 3030, 110, 260, pink, green, .02);
const barT = centered('BAR', 3150, 450, 200, pink, { track: .16 });
const sBar = byLetter(barT).map((ss, i) => neighbour(sign(ss, { seed: 33 + i, fp: .01 }), T.offBar));
const sMart = neighbour(sign(mart, { seed: 31, d: 10 }), T.offBar);
const hFr = frame(4120, 24, 4380, 790, 70, blue, 90);
const hot = []; { let y = 70; for (const ch of 'HOTEL') { const w = neonText(ch, 0, y, 104, blue).width; hot.push(...neonText(ch, 4250 - w / 2, y, 104, blue).strokes); y += 138; } }
const sHot = [neighbour(sign(hot, { seed: 41 }), T.offHotel), neighbour(sign(hFr, { seed: 42 }), T.offHotel)];
const h24 = centered('24H', 2100, 290, 150, green, { track: .18 });
const arr = icon('arrow', 1930, 500, 250, green, green);
const cup = icon('cup', 2260, 520, 150, orange, orange, .02);
const s24 = [sign(h24.strokes, { seed: 51, d: 10 }), sign(arr, { seed: 52, d: 9 }), sign(cup, { seed: 61, d: 8 })].map(s => neighbour(s, T.off24));
const NEIGH = [sMart, ...sBar, ...sHot, ...s24];
const SIGNS = [...MAIN, ...NEIGH];

// ---------------------------------------------------------------- hardware
const clipPts = (signs, gap = 170) => {
  const pts = [];
  for (const sg of signs) for (const st of sg.strokes) { if (st.len < ((sg.d ?? 13) < 10 ? 150 : 90)) continue; const n = Math.max(1, Math.round(st.len / gap)); for (let i = 0; i < n; i++) pts.push([...pointAt({ strokes: [st], total: st.start + st.len }, st.start + st.len * (i + .5) / n), sg.d ?? 13]); }
  return pts;
};
const CLIPS = clipPts(SIGNS);
const LEVER = t => { const a = t < T.breaker ? -.55 : lerp(-.55, .5, ss(ramp(t, T.breaker, T.breaker + .22))); return a; };
function hardware(Hc, P, z, h, t) {
  for (const [x, y, d] of CLIPS) h.clip(Hc, P, z, x, y, d);
  // pipes and rails between the signs
  for (const px of [250, 1500, 2700, 3700, 4700]) h.pipe(Hc, P, z, px, -100, 790, 28);
  h.rail(Hc, P, z, 420, 345, 1500, 345, 8); h.rail(Hc, P, z, 420, 505, 1500, 505, 8); h.rail(Hc, P, z, 960, 70, 960, 120, 10);
  h.rail(Hc, P, z, 3000, 330, 3320, 330, 8); h.rail(Hc, P, z, 3000, 560, 3320, 560, 8); h.rail(Hc, P, z, 1930, 500, 2400, 500, 8);
  // black backing board behind the small line of text: real signs paint it out so thin tubes stay legible
  { const xs = OPN.strokes.flatMap(s => s.pts.map(p => p[0])), ys = OPN.strokes.flatMap(s => s.pts.map(p => p[1]));
    const x0 = Math.min(...xs) - 26, x1 = Math.max(...xs) + 26, y0 = Math.min(...ys) - 22, y1 = Math.max(...ys) + 22, r = 22 * z;
    const [a, b] = P(x0, y0), w = (x1 - x0) * z, hh = (y1 - y0) * z;
    Hc.fillStyle = '#07080b'; Hc.beginPath(); Hc.roundRect(a, b, w, hh, r); Hc.fill();
    Hc.strokeStyle = 'rgba(190,200,225,.5)'; Hc.lineWidth = Math.max(1, 2 * z); Hc.beginPath(); Hc.roundRect(a, b, w, hh, r); Hc.stroke(); }
  // frame electrodes + cables down to the breaker box
  h.boot(Hc, P, z, 540, 70, -1, 0); h.boot(Hc, P, z, 420, 70, 1, 0);
  h.cable(Hc, P, z, [[488, 70], [488, 12], [210, 30], [190, 580]], 5);
  h.cable(Hc, P, z, [[472, 70], [470, 30], [250, 60], [220, 580]], 5);
  // the letter L: both electrodes + a junction box under the word
  h.boot(Hc, P, z, LX, L_STROKE.pts[0][1], 0, -1, 13); h.boot(Hc, P, z, L_END[0], L_END[1], 1, 0, 13);
  h.box(Hc, P, z, LX - 40, 548, 110, 58);
  h.cable(Hc, P, z, [[L_END[0] + 52, L_END[1]], [L_END[0] + 62, L_END[1] + 20], [LX + 56, 520], [LX + 60, 548]], 5);
  h.cable(Hc, P, z, [[LX, L_STROKE.pts[0][1] - 52], [LX, 296], [LX - 80, 330], [LX - 60, 548]], 5);
  h.cable(Hc, P, z, [[LX - 40, 585], [LX - 200, 640], [400, 700], [240, 650]], 6);
  // breaker box with a lever
  h.box(Hc, P, z, 110, 580, 130, 118);
  const [bx, by] = P(175, 640), a = LEVER(t);
  Hc.save(); Hc.translate(bx, by); Hc.rotate(a); Hc.fillStyle = '#9c1f1c'; Hc.fillRect(-5 * z, -46 * z, 10 * z, 52 * z); Hc.fillStyle = '#d0c8c0'; Hc.fillRect(-9 * z, -52 * z, 18 * z, 14 * z); Hc.restore();
  // neighbours: boxes and cables
  h.box(Hc, P, z, 1960, 640, 110, 90); h.cable(Hc, P, z, [[2010, 640], [2000, 600], [2060, 560], [2100, 440]], 5);
  h.box(Hc, P, z, 3010, 640, 110, 90); h.cable(Hc, P, z, [[3060, 640], [3050, 600], [3120, 560], [3150, 660]], 5);
  h.box(Hc, P, z, 4420, 690, 110, 90); h.cable(Hc, P, z, [[4470, 690], [4460, 600], [4400, 440], [4382, 360]], 5);
}

// ---------------------------------------------------------------- camera
const KERB = 790;
const LCX = LX + 55;
const camA = track([
  [0, [500, 100, 3.4]], [4.9, [508, 98, 3.3]], [T.pull1, [960, 430, 1.0]], [12.0, [960, 430, 1.03]],
  [14.3, [2100, 430, 1.0]], [15.8, [2100, 430, 1.0]], [16.8, [3150, 430, 1.0]], [18.2, [3150, 430, 1.0]], [19.2, [4250, 430, 1.0]], [20.9, [4250, 430, 1.0]],
  [T.ret1, [960, 430, 1.0]], [28.0, [LCX + 5, 440, 1.9]], [T.macro1, [LCX + 20, 470, 3.2]], [T.blackout, [LCX + 24, 474, 3.25]],
]);
const camB = track([
  [T.blackout, [960, 430, 1.0]], [T.tilt0, [960, 430, 1.03]], [T.tilt1, [960, 705, 1.03]], [T.dawn0, [960, 705, 1.03]], [T.dawn1, [900, 480, 1.0]], [DUR, [900, 480, 1.05]],
]);
const cam = t => { const v = t < T.blackout ? camA(t) : camB(t); return { cx: v[0], cy: v[1], z: v[2] }; };

// ---------------------------------------------------------------- the passer-by (silhouette, umbrella) and the hand
const WALK_X = t => -70 + (t - (T.walk0 - 0.0)) * 254;
function figure(c, P, z, x, foot, ph, flip) {
  const bob = -Math.abs(Math.sin(ph)) * 7, lean = Math.sin(ph) * .035, swing = .6 + .4 * Math.sin(ph + .6);
  const u = (px, py) => P(x + px, foot + py), ub = (px, py) => P(x + px + lean * (-py), foot + py + bob);   // ub = upper body: bobs and sways over the hips
  const hip = [0, -165], sh = [4, -275];
  c.save(); c.fillStyle = '#05060a'; c.strokeStyle = '#05060a'; c.lineCap = 'round'; c.lineJoin = 'round';
  // legs (hips follow the bob, the planted foot stays on the ground)
  for (const side of [0, 1]) {
    const a = Math.sin(ph + side * Math.PI) * .52, k = Math.max(0, Math.sin(ph + side * Math.PI + 1.3)) * .6;
    const kn = [hip[0] + Math.sin(a) * 85, hip[1] + Math.cos(a) * 85], ft = [kn[0] + Math.sin(a - k) * 82, Math.min(0, kn[1] + Math.cos(a - k) * 82)];
    c.lineWidth = 26 * z; c.beginPath(); c.moveTo(...ub(...hip)); c.lineTo(...u(kn[0], kn[1] + bob * .5)); c.lineTo(...u(ft[0] + 10, ft[1])); c.stroke();
  }
  // coat with a hem that trails behind the stride
  c.beginPath(); c.moveTo(...ub(-22, -280)); c.lineTo(...ub(26, -280)); c.lineTo(...ub(38, -105)); c.lineTo(...ub(-34 - 26 * swing, -92)); c.quadraticCurveTo(...ub(-30 - 10 * swing, -190), ...ub(-22, -280)); c.closePath(); c.fill();
  // head
  c.beginPath(); c.arc(...ub(8, -305), 21 * z, 0, 7); c.fill();
  // arm to the handle, a hooked handle, a clearly visible rod, a ribbed dome
  c.lineWidth = 17 * z; c.beginPath(); c.moveTo(...ub(...sh)); c.lineTo(...ub(34, -255)); c.lineTo(...ub(40, -318)); c.stroke();
  c.lineWidth = 8 * z; c.strokeStyle = '#2b3042'; c.beginPath(); c.moveTo(...ub(40, -318)); c.lineTo(...ub(40, -388)); c.stroke();
  c.beginPath(); const hk = ub(48, -318); c.arc(hk[0], hk[1], 8 * z, 0, Math.PI); c.stroke();
  c.fillStyle = '#05060a'; c.beginPath(); const d0 = ub(40, -372); c.ellipse(d0[0], d0[1], 128 * z, 62 * z, 0, Math.PI, 0); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(60,66,90,.7)'; c.lineWidth = Math.max(1, 1.6 * z);
  for (const r of [-.8, -.4, 0, .4, .8]) { c.beginPath(); c.moveTo(d0[0], d0[1] - 62 * z); c.lineTo(d0[0] + r * 128 * z, d0[1]); c.stroke(); }
  c.restore();
  return ub;
}
function fx(sc, P, z, t, hyS) {
  if (t >= T.walk0 - 1 && t < 48.4) {
    const x = WALK_X(t), ph = (t - T.walk0) * Math.PI / T.step, foot = KERB + 190, fy = P(0, foot)[1];
    if (x > -300 && x < 2300) {
      // reflection (dark: the figure blocks the mirror), then the figure, then a rim of sign light
      sc.save(); sc.globalAlpha = .55; sc.filter = 'blur(3px)'; sc.translate(0, 2 * fy); sc.scale(1, -1); figure(sc, P, z, x, foot, ph); sc.restore();
      sc.save(); sc.filter = 'none'; figure(sc, P, z, x, foot, ph); sc.restore();
      const u = (px, py) => P(x + px + Math.sin(ph) * .035 * (-py), foot + py - Math.abs(Math.sin(ph)) * 7);
      sc.save(); sc.globalCompositeOperation = 'lighter'; sc.lineWidth = 3 * z; sc.lineCap = 'round';
      const near = Math.abs(x - 960) < 800 ? 1 : .5;
      sc.strokeStyle = `rgba(255,70,40,${.34 * near})`; sc.beginPath(); const d0 = u(40, -372); sc.ellipse(d0[0], d0[1], 128 * z, 62 * z, 0, Math.PI * 1.05, Math.PI * 1.55); sc.stroke();
      sc.strokeStyle = `rgba(255,110,60,${.3 * near})`; sc.beginPath(); sc.arc(...u(8, -305), 21 * z, Math.PI * 1.1, Math.PI * 1.6); sc.stroke();
      sc.strokeStyle = `rgba(255,120,70,${.5 * near})`; sc.lineWidth = 2 * z; sc.beginPath(); sc.moveTo(...u(37, -318)); sc.lineTo(...u(37, -388)); sc.stroke();
      sc.restore();
    }
  }
  // the owner's hand at the breaker
  if (t > T.hand0 - .1 && t < T.breaker + 1.8) {
    const k = ss(ramp(t, T.hand0, T.hand0 + 1.2)), kb = t < T.breaker ? 0 : ss(ramp(t, T.breaker, T.breaker + .22)), kr = ss(ramp(t, T.breaker + .6, T.breaker + 1.7));
    const lev = LEVER(t); const tip = [175 + Math.sin(lev) * 60, 640 - Math.cos(lev) * 60];
    const hx = lerp(-160, tip[0] + 8, k) + lerp(0, -380, kr), hy = lerp(980, tip[1] + 22, k) + lerp(0, 330, kr);
    const [hs, hv] = P(hx, hy), [as, av] = P(hx - 260 - 120 * (1 - k), hy + 290 + 160 * (1 - k));
    sc.save(); sc.lineCap = 'round'; sc.strokeStyle = '#05060a'; sc.fillStyle = '#05060a';
    sc.lineWidth = 58 * z; sc.beginPath(); sc.moveTo(as, av); sc.lineTo(hs - 18 * z, hv + 20 * z); sc.stroke();
    sc.beginPath(); sc.ellipse(hs, hv, 34 * z, 26 * z, -.6, 0, 7); sc.fill();
    sc.lineWidth = 11 * z;   // four fingers wrapped over the lever, a thumb under it
    for (let f = 0; f < 4; f++) { const a = -1.05 + f * .22; sc.beginPath(); sc.moveTo(hs + Math.cos(a) * 20 * z, hv + Math.sin(a) * 20 * z); sc.quadraticCurveTo(hs + Math.cos(a) * 46 * z, hv + Math.sin(a) * 40 * z - 6 * z, hs + Math.cos(a - .25) * 52 * z + 6 * z, hv + Math.sin(a) * 52 * z + 8 * z); sc.stroke(); }
    sc.lineWidth = 13 * z; sc.beginPath(); sc.moveTo(hs - 8 * z, hv + 16 * z); sc.lineTo(hs + 26 * z, hv + 34 * z); sc.stroke();
    sc.strokeStyle = 'rgba(200,210,235,.25)'; sc.lineWidth = 2 * z; sc.beginPath(); sc.ellipse(hs, hv, 34 * z, 26 * z, -.6, Math.PI * 1.1, Math.PI * 1.7); sc.stroke();
    sc.restore();
  }
}

// ---------------------------------------------------------------- subtitles (burned in): a small lit caption over the kerb
let SUBS = [];
const HALO = { v1: [255, 70, 40], v2: [255, 70, 40], v3: [58, 126, 255], v4: [255, 70, 40], v5: [255, 70, 40], v6: [58, 126, 255] };
function post(c, t) {
  // dark band for the caption
  const g = c.createLinearGradient(0, H - 190, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = g; c.fillRect(0, H - 190, W, 190);
  const s = SUBS.find(s => t >= s.t0 && t < s.t1); if (!s) return;
  const dt = t - s.t0, on = dt < .125 ? ([1, 0, 1][Math.floor(dt * 24)] ?? 1) : 1; if (!on) return;
  const fade = t > s.t1 - .01 ? 0 : 1, h = HALO[s.id] || [255, 150, 90];
  c.save(); c.font = '500 42px Barlow, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.letterSpacing = '1.5px';
  c.shadowColor = `rgba(${h[0]},${h[1]},${h[2]},.85)`; c.shadowBlur = 22; c.fillStyle = 'rgba(255,214,170,.38)'; c.fillText(s.text, W / 2, 1010);
  c.shadowBlur = 8; c.fillStyle = 'rgba(255,226,190,.92)'; c.fillText(s.text, W / 2, 1010); c.restore();
}

// ---------------------------------------------------------------- scene
const rain = t => t < T.rain0 ? 0 : t < T.rain0 + 2.5 ? .85 * ramp(t, T.rain0, T.rain0 + 2.5) : t < T.rain1 ? .85 : .85 * (1 - ramp(t, T.rain1, T.rain2));
const day = t => t < T.dawn0 ? 0 : .85 * ss(ramp(t, T.dawn0, T.dawn1)) + .1 * ramp(t, T.dawn1, DUR);
const SCENE = {
  signs: SIGNS, d: 13, cam, hardware, fx, post, rain, day, ambScale: t => ss(ramp(t, 1.4, 6)),
  street: { hy: KERB, seed: 2, puddles: 16, x0: -300, x1: 4800, wet: .62 },
  wall: { streaks: [[600, 330, 420, 40], [1340, 330, 360, 30], [1066, 520, 280, 60], [2200, 640, 200, 50], [3100, 560, 240, 50]] },
};
window.DUR = DUR;
window.TEXTS = t => SUBS.filter(s => t >= s.t0 && t < s.t1).map(s => ({ id: s.id, text: s.text, x0: 560, y0: 962, x1: 1360, y1: 1024 }));
window.DBG = t => MAIN.map(s => [Math.round(s.lit(t)), +s.I(t).toFixed(2)]);
window.render = t => renderScene(out, SCENE, t);

(async () => {
  try {
    const q = new URLSearchParams(location.search), nos = q.get('nosub');
    if (!nos) { const r = await fetch('subs.json'); if (r.ok) SUBS = await r.json(); }
    await document.fonts.load('500 42px Barlow');
  } catch (e) { /* subtitles are optional for stills */ }
  window.READY = true;
})();
