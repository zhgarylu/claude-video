// props.js: the world of the voyage: sky, sea, the ship, the duck, the island, small things. World units are pixels at zoom 1.
import { clamp, lerp, seg, ss, hash, vnoise } from '/core/lib.js';
import { COL, G, TAU, ell, catmull, quad, cubic, xf, path, shape, ring, stroke, tube, capsule, hatchFill, toneFill, crescent, jr, jf, star, puff, text } from './ink.js';

export const camSet = (ctx, c) => { ctx.translate(960 + (c.sx || 0), 540 + (c.sy || 0)); if (c.roll) ctx.rotate(c.roll); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy); };
export const toScreen = (c, x, y) => { const cr = Math.cos(c.roll || 0), sr = Math.sin(c.roll || 0), dx = (x - c.cx) * c.z, dy = (y - c.cy) * c.z; return [960 + (c.sx || 0) + dx * cr - dy * sr, 540 + (c.sy || 0) + dx * sr + dy * cr]; };
const lerpc = (a, b, u) => { const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16)); return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], u)).toString(16).padStart(2, '0')).join(''); };
export { lerpc };

// ------------------------------------------------------------------ sky
export function sky(ctx, t, c, mood = 0, hz = -200) {
  const top = lerpc('#58bfe8', '#3b3a66', mood), mid = lerpc('#bfe9f2', '#6e5a8a', mood), low = lerpc('#fff0c4', '#b88a8a', mood);
  const g = ctx.createLinearGradient(0, hz - 1400, 0, hz); g.addColorStop(0, top); g.addColorStop(.6, mid); g.addColorStop(1, low);
  ctx.fillStyle = g; ctx.fillRect(-9000, hz - 4000, 18000, 4000 + 2);
  // flat tone bands in the sky (screentone gradient)
  ctx.save(); ctx.beginPath(); ctx.rect(-9000, hz - 4000, 18000, 4000); ctx.clip();
  toneFill(ctx, -3000, hz - 900, 3000, hz - 500, { col: lerpc('#2c8fb8', '#1a1740', mood), alpha: .22 + mood * .2 }); toneFill(ctx, -3000, hz - 1400, 3000, hz - 900, { col: lerpc('#2c8fb8', '#1a1740', mood), alpha: .32 + mood * .2 });
  ctx.restore();
}
export function sun(ctx, t, x, y, r, mood) {
  if (mood > .9) return;
  ctx.save(); ctx.globalAlpha = 1 - mood;
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + t * .15, l = r * (i % 2 ? 1.5 : 1.85); stroke(ctx, [[x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 11, i, { col: COL.orange, taper: .5, boil: false }); }
  shape(ctx, ell(x, y, r, r, 36, .01, 3), COL.sun, 7, 3, { tone: { col: COL.orange, alpha: .5 } });
  // a smug face on the sun
  stroke(ctx, quad([x - r * .5, y + r * .08], [x, y + r * .62], [x + r * .5, y + r * .08], 8), 6, 4, { taper: .3 });
  for (const s of [-1, 1]) { shape(ctx, ell(x + s * r * .32, y - r * .22, r * .1, r * .13, 12), '#fff', 4, 5 + s, { off: [0, 0] }); ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(x + s * r * .32 + 3, y - r * .2, r * .055, 0, TAU); ctx.fill(); }
  ctx.restore();
}
export function cloud(ctx, x, y, s, seed, mood = 0, t = 0) {
  const body = lerpc('#ffffff', '#8a7fa6', mood), cx = x + Math.sin(t * .2 + seed) * 10;
  const lobes = [[-1.15, .12, .5], [-.62, -.12, .72], [0, -.3, .9], [.68, -.1, .72], [1.2, .14, .5], [-.3, .22, .6], [.4, .22, .62]];
  const polys = lobes.map(([lx, ly, lr], i) => ell(cx + lx * s, y + ly * s * .55, lr * s * .8, lr * s * .62, 22, .03, seed + i));
  ctx.fillStyle = COL.ink; for (const p of polys) { ctx.save(); ctx.translate(2, 3); path(ctx, p); ctx.lineWidth = 12 * G.lw; ctx.strokeStyle = COL.ink; ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = body; for (const p of polys) { path(ctx, p); ctx.fill(); }
  ctx.save(); ctx.beginPath(); for (const p of polys) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); } ctx.clip();
  hatchFill(ctx, cx - 2 * s, y - .6 * s, cx + 2 * s, y + .5 * s, { ang: 2.2, gap: 11, w: 1.6, alpha: .45 }, seed);
  ctx.restore();
}
export function gull(ctx, x, y, s, t, ph = 0, col = '#fff') {
  const f = Math.sin(t * 7 + ph) * .55;
  for (const sg of [-1, 1]) { const w = [[0, 0], [sg * 22 * s, -12 * s - f * 22 * s], [sg * 52 * s, -2 * s + f * 14 * s], [sg * 24 * s, 3 * s - f * 10 * s]]; shape(ctx, catmull([...w], 4, true), col, 3.2, ph, { off: [0, 0] }); }
  shape(ctx, ell(x, y + 3 * s, 11 * s, 7 * s, 12), col, 3.2, ph + 1, { off: [0, 0] }); ctx.fillStyle = COL.orange; ctx.beginPath(); ctx.moveTo(x + 9 * s, y + s); ctx.lineTo(x + 20 * s, y + 4 * s); ctx.lineTo(x + 9 * s, y + 6 * s); ctx.fill();
}
export function perchedGull(ctx, x, y, s, mood = 0, flap = 0) {   // standing gull for Dot's bucket
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  stroke(ctx, [[-6, 0], [-6, 24]], 4, 1, { col: COL.orange }); stroke(ctx, [[8, 0], [8, 24]], 4, 2, { col: COL.orange });
  shape(ctx, catmull([[-34, 4], [-20, -28], [10, -34], [34, -20], [38, -4], [10, 14], [-18, 12]], 4, true), '#fff', 4, 3, { hatch: { ang: 1, gap: 8, w: 1.3 }, off: [1, 2] });
  shape(ctx, catmull([[-30, -4], [-8, -14], [8, 4], [-22, 14]], 4, true), '#dfe6ea', 3.4, 4, { off: [0, 0] });
  shape(ctx, ell(34, -34, 15, 14, 14), '#fff', 4, 5, { off: [1, 1] });
  shape(ctx, [[46, -37], [68, -31], [46, -27]], COL.orange, 3.4, 6, { off: [0, 0] });
  ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(38, -38, 3.4, 0, TAU); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ waves
// a curled crest. (x,y) = left foot of the wave; w wide; h high
export function waveGlyph(ctx, x, y, w, h, fill, seed, o = {}) {
  const { lw = 4.5, under = null, flip = 1 } = o;
  const P = [[0, 0], [.16, -.34], [.38, -.84], [.6, -1.0], [.82, -.84], [.9, -.55], [.8, -.38], [.7, -.52], [.78, -.66], [.62, -.7], [.5, -.48], [.55, -.22], [.7, -.08], [1.0, 0], [.5, .1]];
  const pts = catmull(P.map(([a, b]) => [x + a * w * flip, y + b * h]), 4, true);
  shape(ctx, pts, fill, lw, seed, { hatch: under, light: [-.5, -.85], off: [2, 3] });
}
export function sea(ctx, t, c, o = {}) {
  const { hz = -200, mood = 0, swell = 1, y0 = hz, rows = 9, base = 0, seed = 1 } = o;
  const deep = lerpc(COL.teal2, '#1a2f5a', mood), mid = lerpc(COL.teal, '#2b4f7f', mood), light = lerpc(COL.teal3, '#5f86b0', mood);
  const g = ctx.createLinearGradient(0, hz, 0, hz + 1800); g.addColorStop(0, light); g.addColorStop(.18, mid); g.addColorStop(1, deep);
  ctx.fillStyle = g; ctx.fillRect(-9000, hz, 18000, 6000);
  // horizontal tone/hatch bands
  ctx.save(); ctx.beginPath(); ctx.rect(-9000, hz, 18000, 6000); ctx.clip();
  for (let i = 0; i < 14; i++) { const yy = hz + 20 + Math.pow(i, 1.55) * 26 + Math.sin(t * .8 + i) * 4; stroke(ctx, [[c.cx - 3000 / c.z * 1, yy], [c.cx + 3000 / c.z, yy]], 3 + i * .4, seed + i, { col: lerpc('#0a4a62', '#0a1030', mood), taper: 0, vary: .8, boil: false }); }
  ctx.restore();
  stroke(ctx, [[-9000, hz], [9000, hz]], 6, 7, { taper: 0, vary: .2 });
  // wave rows, small and high near the horizon, big and low near the viewer
  for (let r = rows - 1; r >= 0; r--) {
    const k = (r + 1) / rows, yy = hz + 30 + Math.pow(r + .5, 1.7) * 38 * (1 + .1 * r), s = .35 + k * k * 2.3 + base, w = 120 * s, h = 70 * s * swell;
    const half = (3000 / c.z) + w, x0 = Math.floor((c.cx - half) / (w * 1.5)) * w * 1.5;
    for (let x = x0; x < c.cx + half; x += w * 1.5) {
      const idx = Math.round(x / (w * 1.5)), jx = (hash(idx * 3.7 + r * 11.3 + seed) - .5) * w * .5, ph = hash(idx * 1.3 + r * 2.1) * TAU, bob = Math.sin(t * 1.5 * (.7 + .3 * swell) + ph) * h * .1;
      if (hash(idx * 5.1 + r * 7.7 + seed) < .18) continue;
      waveGlyph(ctx, x + jx + ((r % 2) * w * .7) + Math.sin(t * .5 + ph) * w * .08, yy + bob, w, h, r % 3 === 0 ? light : r % 3 === 1 ? mid : lerpc(light, '#ffffff', .35), seed + idx + r * 13, { lw: 3 + s * 1.2, under: { ang: 1.1, gap: 7 + s * 2, w: 1.3 } });
    }
  }
}

// ------------------------------------------------------------------ the ship (faces right). origin = waterline midships
export function ship(ctx, t, o = {}) {
  const { x = 0, y = 0, s = 1, roll = 0, bob = true, sail = 1, crewFn = null, flag = true, seed = 3, wreck = 0 } = o;
  const by = bob ? Math.sin(t * 1.7) * 7 : 0, br = bob ? Math.sin(t * 1.3 + 1) * .025 : 0;
  ctx.save(); ctx.translate(x, y + by * s); ctx.scale(s, s); ctx.rotate(roll + br);
  const bellow = 26 + Math.sin(t * 2.1) * 6 + 18 * sail;
  // back rigging
  stroke(ctx, [[0, -520], [-270, -90]], 3.5, 1, { taper: 0, vary: .1 }); stroke(ctx, [[0, -520], [340, -75]], 3.5, 2, { taper: 0, vary: .1 });
  // foremast + jib
  stroke(ctx, [[200, -75], [200, -400]], 13, 3, { col: COL.wood2, taper: .02, vary: .1 });
  const jib = catmull([[200, -392], [276, -250], [338, -92], [200, -118], [196, -250]], 6, true);
  shape(ctx, jib.slice(0, jib.length), '#fff6dc', 5, 4, { hatch: { ang: 1.2, gap: 9, w: 1.4 }, light: [-.8, -.2], off: [2, 3] });
  // main mast and sail
  stroke(ctx, [[0, -80], [0, -540]], 18, 5, { col: COL.wood2, taper: .02, vary: .1 });
  const sl = [], N = 8;
  for (let i = 0; i <= N; i++) sl.push([-150 + 20 * Math.sin(i / N * Math.PI) * 0, -470 + i * 36]);
  const top = [], right = [], bot = [], left = [];
  for (let i = 0; i <= 6; i++) { const u = i / 6; top.push([-150 + u * 300, -470 + Math.sin(u * Math.PI) * 14]); }
  for (let i = 1; i <= 8; i++) { const u = i / 8; right.push([150 + Math.sin(u * Math.PI) * bellow, -470 + u * 290]); }
  for (let i = 1; i <= 6; i++) { const u = i / 6; bot.push([150 + (1 - u) * 20 - u * 320 + 20 * (1 - u), -180 - Math.sin(u * Math.PI) * 16]); }
  const sailPoly = [...top, ...right, ...bot.slice(0, -1), [-150, -180]];
  const sp = catmull(sailPoly, 2);
  shape(ctx, sp, '#fff3d2', 6, 6, { off: [3, 4] });
  ctx.save(); path(ctx, sp); ctx.clip();
  // patches
  for (const [px, py, pw, ph, pc, rot] of [[-70, -400, 70, 62, COL.coral, .1], [40, -330, 78, 64, COL.teal, -.08], [-100, -260, 62, 52, COL.sun, .05], [60, -230, 52, 48, COL.pink, -.12]]) { ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.fillStyle = pc; ctx.fillRect(-pw / 2, -ph / 2, pw, ph); ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.6; ctx.setLineDash([7, 5]); ctx.strokeRect(-pw / 2 + 5, -ph / 2 + 5, pw - 10, ph - 10); ctx.restore(); }
  hatchFill(ctx, -170, -480, 190, -170, { ang: 1.25, gap: 15, w: 1.3, alpha: .3 }, 7);
  for (let i = 1; i < 4; i++) stroke(ctx, quad([-152, -470 + i * 72], [0, -470 + i * 72 + 18], [150 + bellow * .6, -470 + i * 72], 8), 2.6, 9 + i, { col: 'rgba(60,40,20,.55)', taper: 0, vary: .1 });
  ctx.restore(); ring(ctx, sp, 6, 6);
  stroke(ctx, [[-175, -176], [185, -190]], 12, 8, { col: COL.wood2, taper: .04 });
  // crow's nest and flag
  shape(ctx, [[-26, -540], [26, -540], [20, -500], [-20, -500]], COL.wood, 4, 10, { off: [1, 2] });
  if (flag) {
    const fl = []; const L = 150; for (let i = 0; i <= 8; i++) { const u = i / 8; fl.push([u * L, Math.sin(u * 5 - t * 7) * 11 * u]); }
    const top_ = fl.map(([a, b]) => [a + 12, b - 548]), bot_ = fl.map(([a, b]) => [a + 12 - u0(a) * 0, b - 500 + (a / L) * 14]).reverse();
    function u0() { return 0; }
    const fp = [...top_, ...bot_];
    shape(ctx, fp, COL.purple, 5, 11, { tone: { alpha: .3, col: '#fff' }, off: [2, 3] });
    // sock and two spoons
    ctx.save(); ctx.translate(72, -523 + Math.sin(-t * 7 + 2) * 3); ctx.rotate(Math.sin(-t * 7 + 1) * .05);
    stroke(ctx, [[-22, -16], [22, 18]], 4, 1, { col: COL.cream, taper: .1 }); stroke(ctx, [[22, -16], [-22, 18]], 4, 2, { col: COL.cream, taper: .1 });
    shape(ctx, catmull([[-6, -18], [10, -18], [10, 4], [22, 12], [18, 22], [-8, 14]], 3, true), COL.sun, 2.6, 12, { off: [0, 0] });
    ctx.restore();
  }
  // hull (drawn after sails so it overlaps their feet)
  const hull = catmull([[-285, -82], [-296, -8], [-215, 66], [-60, 102], [140, 98], [272, 34], [346, -66], [262, -76], [150, -62], [-100, -64], [-205, -74]], 5, true);
  shape(ctx, hull, COL.wood, 6.5, 13, { hatch: { ang: 1.3, gap: 9, w: 1.5 }, tone: { alpha: .25 }, light: [-.3, -.95], off: [3, 4] });
  ctx.save(); path(ctx, hull); ctx.clip();
  for (let i = 1; i < 4; i++) stroke(ctx, quad([-300, -64 + i * 34], [20, -30 + i * 34 + 24], [350, -64 + i * 34 - 24], 14), 3, 20 + i, { taper: 0, vary: .4, boil: false });
  stroke(ctx, [[-300, -66], [-150, -66], [150, -58], [350, -74]], 10, 21, { col: COL.cream, taper: 0, vary: .15 });
  // the painted grin and portholes
  const gm = catmull([[96, 6], [150, 36], [215, 38], [262, 4], [250, 22], [212, 62], [150, 62], [104, 30]], 4, true);
  shape(ctx, gm, '#5b1b1b', 4.5, 22, { off: [0, 0] });
  ctx.save(); path(ctx, gm); ctx.clip(); ctx.fillStyle = '#fff8e8'; ctx.fillRect(90, 0, 190, 26); ctx.fillStyle = COL.ink; for (let i = 0; i < 8; i++) ctx.fillRect(105 + i * 21, 0, 2.6, 28); ctx.restore(); ring(ctx, gm, 4.5, 22);
  for (const px of [150, 232]) { shape(ctx, ell(px, -34, 17, 17, 18), '#fff', 4.5, 23, { off: [0, 0] }); ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(px + 4 + Math.sin(t * 1.2) * 3, -32, 7, 0, TAU); ctx.fill(); }
  ctx.restore();
  stroke(ctx, [[340, -66], [440, -118]], 14, 24, { col: COL.wood2, taper: .05 });
  // crew on the rail
  if (crewFn) crewFn(ctx);
  ctx.restore();
}

// ------------------------------------------------------------------ the duck (faces right). origin = centre of the waterline
export function duck(ctx, t, o = {}) {
  const { x = 0, y = 0, s = 1, beak = 0, sq = 1, eye = 0, happy = 0, rise = 1, seed = 5, flip = 1 } = o;
  const bobY = Math.sin(t * 1.4) * 10;
  ctx.save(); ctx.translate(x, y + bobY + (1 - rise) * 900 * s); ctx.scale(flip * s * (1 / Math.sqrt(sq)), s * sq);
  const Y = '#ffd433', Y2 = '#f2a81d';
  // body
  const body = catmull([[-480, -40], [-470, -240], [-300, -400], [0, -450], [300, -380], [470, -220], [480, -60], [340, 40], [0, 70], [-330, 40]], 5, true);
  shape(ctx, body, Y, 9, seed, { hatch: { ang: 1.1, gap: 15, w: 2.4, col: '#b86a0a', alpha: .85 }, tone: { col: '#e08a10', alpha: .5 }, light: [-.45, -.9], off: [5, 6] });
  // tail tuft
  shape(ctx, catmull([[-470, -230], [-590, -330], [-540, -210], [-490, -150]], 4, true), Y, 8, seed + 1, { off: [3, 4] });
  // wing
  const wing = catmull([[-250, -230], [-60, -300], [180, -250], [150, -150], [-60, -90], [-240, -150]], 5, true);
  shape(ctx, wing, Y2, 7, seed + 2, { hatch: { ang: .6, gap: 12, w: 2, col: '#8a4a05' }, off: [3, 4] });
  stroke(ctx, quad([-130, -330], [60, -400], [250, -330], 10), 14, seed + 3, { col: '#fff7c8', taper: .4, vary: .15 });
  // neck and head
  const hx = 300, hy = -560;
  shape(ctx, catmull([[170, -330], [150, -520], [330, -640], [520, -560], [540, -430], [440, -330]], 5, true), Y, 9, seed + 4, { off: [4, 5] });
  const head = ell(hx + 40, hy - 10, 250, 232, 40, .01, seed + 5);
  shape(ctx, head, Y, 9, seed + 5, { hatch: { ang: 1.1, gap: 14, w: 2.2, col: '#b86a0a', alpha: .8 }, light: [-.5, -.85], off: [4, 5] });
  // beak
  const open = beak * 120;
  const up = catmull([[hx + 200, hy + 10], [hx + 330, hy - 30 - open * .15], [hx + 570, hy - 10 - open * .35], [hx + 585, hy + 32 - open * .25], [hx + 330, hy + 54 - open * .1], [hx + 200, hy + 52]], 5, true);
  const lo = catmull([[hx + 200, hy + 56], [hx + 380, hy + 60 + open * .05], [hx + 560, hy + 62 + open * .9], [hx + 520, hy + 128 + open], [hx + 300, hy + 130 + open * .6], [hx + 200, hy + 110]], 5, true);
  if (beak > .1) { shape(ctx, ell(hx + 380, hy + 80 + open * .4, 160, 40 + open * .45, 20), '#5b1b1b', 5, seed + 6, { off: [0, 0] }); shape(ctx, ell(hx + 400, hy + 120 + open * .5, 80, 26 + open * .2, 14), '#e8566a', 3.5, seed + 7, { off: [0, 0] }); }
  shape(ctx, lo, Y2, 8, seed + 8, { hatch: { ang: .4, gap: 12, w: 2, col: '#8a4a05' }, off: [3, 4] });
  shape(ctx, up, '#ff9a22', 8, seed + 9, { hatch: { ang: .5, gap: 12, w: 2, col: '#8a4a05' }, off: [3, 4] });
  for (const nx of [hx + 440, hx + 485]) { ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(nx, hy - 6 - open * .12, 7, 11, .3, 0, TAU); ctx.fill(); }
  // eye: one huge, dopey, with a lid when it is happy
  const ex = hx + 150, ey = hy - 80;
  const eyeP = ell(ex, ey, 74, 84, 26, .01, seed + 10);
  shape(ctx, eyeP, '#fffdf6', 8, seed + 10, { off: [0, 0] });
  ctx.save(); path(ctx, eyeP); ctx.clip();
  ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(ex + 22 + Math.sin(t * .9) * 8, ey + 14 + eye * 10, 26 - 6 * eye, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 14, ey + 4, 8, 0, TAU); ctx.fill();
  if (happy > 0) { ctx.fillStyle = Y; ctx.fillRect(ex - 90, ey - 100, 180, 100 * (.45 + happy * .6) + 10); }
  ctx.restore(); ring(ctx, eyeP, 8, seed + 10);
  if (happy > 0) stroke(ctx, quad([ex - 70, ey + 10], [ex, ey - 60 * happy - 8], [ex + 70, ey + 10], 10), 10, seed + 11, { taper: .3 });
  stroke(ctx, quad([ex - 70, ey - 120], [ex, ey - 150 + (happy ? 20 : 0)], [ex + 70, ey - 112 + happy * -10], 8), 14, seed + 12, { taper: .5 });
  // blush and shine
  for (let i = 0; i < 4; i++) stroke(ctx, [[hx + 290 + i * 18, hy + 100], [hx + 310 + i * 18, hy + 60]], 5, seed + i, { col: '#e0452f', taper: .5, boil: false });
  stroke(ctx, quad([hx - 130, hy - 190], [hx - 30, hy - 240], [hx + 90, hy - 230], 8), 15, seed + 13, { col: '#fffbe0', taper: .5, vary: .15 });
  ctx.restore();
}

// ------------------------------------------------------------------ the island and its small things
export function palm(ctx, x, y, h, lean, t, seed = 1) {
  const trunk = []; for (let i = 0; i <= 10; i++) { const u = i / 10; trunk.push([x + lean * u * u * h, y - u * h]); }
  const tp = capsule(trunk, trunk.map((_, i) => lerp(30, 16, i / 10)));
  shape(ctx, tp, COL.wood3, 5.5, seed, { hatch: { ang: .15, gap: 9, w: 1.5 }, off: [2, 3] });
  const tx = trunk[10][0], ty = trunk[10][1];
  for (let i = 1; i < 6; i++) stroke(ctx, [[trunk[i][0] - 18, trunk[i][1]], [trunk[i][0] + 18, trunk[i][1] - 6]], 2.8, seed + i, { taper: .2, boil: false });
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + i / 6 * Math.PI + (i % 2 ? .1 : -.05), L = h * .62 * (.85 + hash(i + seed) * .3), sw = Math.sin(t * 1.4 + i) * .06;
    const c = Math.cos(a + sw), si = Math.sin(a + sw), droop = L * .42;
    const spine = quad([tx, ty], [tx + c * L * .55, ty + si * L * .55 - 20], [tx + c * L, ty + si * L + droop], 8), w = L * .17;
    const lp = [...spine.map(([a1, b1], k) => [a1 + 0, b1 - w * Math.sin(k / 8 * Math.PI)]), ...spine.map(([a1, b1], k) => [a1, b1 + w * .6 * Math.sin(k / 8 * Math.PI)]).reverse()];
    shape(ctx, catmull(lp, 2, true), i % 2 ? COL.leaf : '#52c25a', 4.5, seed + i, { hatch: { ang: 1.2, gap: 8, w: 1.3 }, off: [2, 3] });
    stroke(ctx, spine, 3, seed + i, { taper: .1, boil: false });
  }
  for (const dx of [-14, 12]) shape(ctx, ell(tx + dx, ty + 18, 14, 14, 12), COL.wood2, 4, seed + dx, { off: [1, 1] });
}
export function island(ctx, t, x, y, s = 1, o = {}) {
  const { xmark = 0, dig = 0 } = o;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const sand = catmull([[-520, 20], [-430, -60], [-250, -120], [0, -140], [250, -120], [430, -70], [530, 20], [300, 70], [0, 84], [-300, 70]], 5, true);
  shape(ctx, sand, '#f4d58a', 7, 31, { hatch: { ang: .3, gap: 13, w: 1.8, col: '#b08a3a', alpha: .8 }, tone: { col: '#d0a14a', alpha: .5 }, light: [-.4, -.9], off: [3, 4] });
  palm(ctx, -270, -100, 520, .28, t, 2); palm(ctx, 330, -90, 400, -.22, t + 1, 6);
  shape(ctx, catmull([[-120, -60], [-60, -110], [40, -112], [110, -64], [60, -34], [-60, -34]], 4, true), '#9a8e7a', 6, 40, { hatch: { ang: 1.1, gap: 9, w: 1.6 }, off: [2, 3] });
  if (xmark) { for (const sg of [-1, 1]) stroke(ctx, [[-34, -30 * sg + 4], [34, 30 * sg + 4]].map(([a, b]) => [a + 130, b - 30]), 14, 50 + sg, { col: COL.coral, taper: .15 }); }
  ctx.restore();
}
export function sock(ctx, x, y, s, rot, o = {}) {   // a long striped sock; left = toe to the left
  const { toe = -1, drip = 0, seed = 7, wet = 0 } = o;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * toe * -1, s);
  const P = catmull([[-28, -150], [28, -150], [30, 10], [34, 52], [90, 62], [98, 98], [14, 106], [-30, 70]], 4, true);
  ctx.save(); ctx.fillStyle = COL.teal; path(ctx, P); ctx.fill(); ctx.clip(); ctx.fillStyle = COL.sun; for (let i = 0; i < 5; i++) ctx.fillRect(-60, -150 + i * 44, 200, 22);
  ctx.fillStyle = COL.coral; ctx.fillRect(-60, 56, 200, 60); ctx.fillStyle = COL.pink; ctx.beginPath(); ctx.arc(-6, 74, 22, 0, TAU); ctx.fill();
  ctx.restore(); ring(ctx, P, 5.5, seed);
  shape(ctx, [[-32, -170], [32, -170], [32, -146], [-32, -146]], COL.cream, 4.5, seed + 1, { hatch: { ang: 1.2, gap: 6, w: 1.2 } });
  ctx.restore();
}
export function chest(ctx, x, y, s, lid, t, seed = 9) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const L = ss(lid), H = 120 * L;
  if (L > .02) {
    shape(ctx, [[-158, -138], [158, -138], [146, -138 - H], [-146, -138 - H]], '#a8703a', 7, seed + 2, { hatch: { ang: 1.4, gap: 10, w: 1.6 }, off: [3, 4] });
    shape(ctx, [[-150, -110], [150, -110], [158, -138], [-158, -138]], '#2a1608', 6, seed + 3, { off: [0, 0] });
    ctx.save(); ctx.globalAlpha = .95 * L; const g = ctx.createRadialGradient(0, -124, 10, 0, -124, 460); g.addColorStop(0, '#fffbe0'); g.addColorStop(.35, 'rgba(255,225,110,.65)'); g.addColorStop(1, 'rgba(255,225,110,0)'); ctx.fillStyle = g; ctx.fillRect(-500, -584, 1000, 920); ctx.restore();
    for (let i = 0; i < 18; i++) { const a = -Math.PI * (.08 + .84 * i / 17), l = 420 * (.6 + hash(i * 1.7 + seed) * .7) * L; stroke(ctx, [[Math.cos(a) * 50, -126 + Math.sin(a) * 18], [Math.cos(a) * l, -126 + Math.sin(a) * l]], 11, i, { col: COL.sun, taper: .7, boil: false }); }
  }
  shape(ctx, [[-150, 0], [150, 0], [160, -110], [-160, -110]], COL.wood, 7, seed, { hatch: { ang: 1.4, gap: 10, w: 1.6 }, off: [3, 4] });
  for (const px of [-100, 0, 100]) stroke(ctx, [[px, 0], [px, -110]], 6, seed + px, { taper: 0 });
  stroke(ctx, [[-155, -52], [155, -52]], 6, seed, { taper: 0 });
  if (L < .02) { shape(ctx, catmull([[-165, -108], [-150, -170], [0, -192], [150, -170], [165, -108], [0, -100]], 4, true), COL.wood2, 7, seed + 3, { hatch: { ang: 1.4, gap: 10, w: 1.6 }, off: [3, 4] }); stroke(ctx, [[-160, -128], [160, -128]], 5, seed, { taper: 0 }); }
  shape(ctx, ell(0, -88, 16, 20, 12), COL.sun, 4.5, seed + 4, { off: [1, 1] });
  ctx.restore();
}

// ------------------------------------------------------------------ the tub (the last shot): enamel rim, tiles, tap, and the right sock
export function tubWorld(ctx, t, o = {}) {
  const { wx = 0, wy = 0, ww = 9000, wh = 5200, sockDrip = 1, sockIn = 1, dropT = 0 } = o;
  // tile wall behind
  const tw = 360, rows = 14, cols = 30;
  ctx.fillStyle = '#d7efe6'; ctx.fillRect(wx - ww / 2 - 3000, wy - wh / 2 - 6000, ww + 6000, 6000 + wh * .15);
  for (let r = 0; r < 18; r++) for (let c = 0; c < 36; c++) {
    const x = wx - ww / 2 - 2500 + c * tw, y = wy - wh * .55 - 6000 + r * tw; if (y > wy - wh * .3) continue;
    ctx.fillStyle = (r + c) % 7 === 0 ? '#bfe3dc' : '#e4f6ef'; ctx.fillRect(x, y, tw, tw);
  }
  ctx.strokeStyle = 'rgba(40,90,90,.55)'; ctx.lineWidth = 8;
  ctx.beginPath(); for (let c = 0; c < 36; c++) { const x = wx - ww / 2 - 2500 + c * tw; ctx.moveTo(x, wy - wh * .55 - 6000); ctx.lineTo(x, wy - wh * .3); } for (let r = 0; r < 18; r++) { const y = wy - wh * .55 - 6000 + r * tw; if (y < wy - wh * .3) { ctx.moveTo(wx - ww / 2 - 2500, y); ctx.lineTo(wx + ww / 2 + 3500, y); } } ctx.stroke();
  // enamel tub: outer rim as a big rounded rectangle, the water inside
  const rim = 300, ox = wx - ww / 2 - rim, oy = wy - wh / 2 - rim, ow = ww + rim * 2, oh = wh + rim * 2;
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  ctx.save(); rr(ox - 40, oy + oh * .1, ow + 80, oh + 400, 600); ctx.fillStyle = '#f2efe6'; ctx.fill(); ctx.lineWidth = 16 * G.lw; ctx.strokeStyle = COL.ink; ctx.stroke(); ctx.restore();
  ctx.save(); rr(ox, oy, ow, oh, 520); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 16 * G.lw; ctx.strokeStyle = COL.ink; ctx.stroke();
  ctx.clip(); hatchFill(ctx, ox, oy, ox + ow, oy + oh, { ang: .9, gap: 60, w: 5, alpha: .18 }, 3); ctx.restore();
  ctx.save(); rr(wx - ww / 2 - 60, wy - wh / 2 - 60, ww + 120, wh + 120, 400); ctx.fillStyle = '#c9d7d0'; ctx.fill(); ctx.lineWidth = 12 * G.lw; ctx.strokeStyle = COL.ink; ctx.stroke(); ctx.restore();
  // tap and the right sock
  const tx = wx + ww * .12, ty = wy - wh / 2 - rim - 700;
  const pipe = [[tx, ty - 800], [tx, ty], [tx + 180, ty + 120], [tx + 420, ty + 60], [tx + 480, ty + 220]];
  tube(ctx, pipe, 140, 120, '#cfd6da', 12 * G.lw, 5, { hatch: { ang: .9, gap: 40, w: 4 } });
  shape(ctx, ell(tx + 480, ty + 240, 100, 52, 20), '#b0b8bd', 10 * G.lw, 6);
  for (const [bx] of [[tx - 380], [tx + 380]]) { shape(ctx, ell(bx + (bx < tx ? -380 : 0), ty - 400, 150, 150, 18), COL.coral, 12 * G.lw, 7, { off: [6, 8] }); }
  // the sock hanging from the spout, a drop falling
  sock(ctx, tx + 300, ty + 160, 3.6, 0, { toe: 1, seed: 21 });
  const dp = (dropT % 1.2) / 1.2;
  if (sockDrip) { const dy = ty + 160 + 420 + dp * (wy - wh / 2 - (ty + 580)); ctx.fillStyle = COL.sky; ctx.strokeStyle = COL.ink; ctx.lineWidth = 8 * G.lw; ctx.beginPath(); ctx.ellipse(tx + 360, dy, 22, 34, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
}

// ------------------------------------------------------------------ small food for the feast
export const food = {
  fish(ctx, x, y, s, seed = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); shape(ctx, catmull([[-90, 0], [-40, -44], [40, -40], [90, -8], [130, -38], [124, 36], [90, 8], [30, 44], [-40, 40]], 4, true), COL.orange, 5, seed, { hatch: { ang: .9, gap: 8, w: 1.3 }, off: [2, 3] }); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-58, -8, 11, 0, TAU); ctx.fill(); ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(-55, -8, 5, 0, TAU); ctx.fill(); ctx.restore(); },
  pie(ctx, x, y, s, seed = 2) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); shape(ctx, catmull([[-90, 0], [-80, -40], [-30, -70], [40, -70], [86, -40], [96, 0], [0, 14]], 4, true), '#e0a458', 5.5, seed, { hatch: { ang: .5, gap: 8, w: 1.4 }, off: [2, 3] }); for (let i = -2; i <= 2; i++) stroke(ctx, [[i * 26 - 10, -64], [i * 26 + 10, -20]], 4, seed + i, { taper: .3 }); ctx.restore(); },
  bread(ctx, x, y, s, seed = 3) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); shape(ctx, ell(0, -30, 110, 42, 20, .03, seed), '#e6b36a', 5.5, seed, { hatch: { ang: .5, gap: 8, w: 1.3 }, off: [2, 3] }); for (const dx of [-45, 0, 45]) stroke(ctx, [[dx - 8, -52], [dx + 14, -10]], 4, seed + dx, { taper: .3 }); ctx.restore(); },
  pine(ctx, x, y, s, seed = 4) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); for (let i = -2; i <= 2; i++) shape(ctx, catmull([[i * 22, -88], [i * 22 + 26, -150 - Math.abs(i) * -6], [i * 22 - 10, -190]], 3, true), COL.leaf, 4, seed + i, { off: [1, 1] }); shape(ctx, ell(0, -40, 56, 70, 20, .02, seed), COL.sun, 5.5, seed, { hatch: { ang: .8, gap: 8, w: 1.4, cross: true }, off: [2, 3] }); ctx.restore(); },
  melon(ctx, x, y, s, seed = 5) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); shape(ctx, catmull([[-80, -50], [0, -20], [80, -50], [60, 10], [0, 24], [-60, 10]], 4, true), COL.coral, 5.5, seed, { off: [2, 3] }); ctx.fillStyle = COL.ink; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(i * 24, -26 + Math.abs(i) * 4, 4, 6, .3, 0, TAU); ctx.fill(); } ctx.restore(); },
  sandwich(ctx, x, y, s, rot, seed = 6) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); shape(ctx, [[-60, -26], [60, -26], [60, -8], [-60, -8]], '#e6b36a', 4.5, seed, { off: [1, 2] }); shape(ctx, catmull([[-66, -8], [66, -8], [60, 4], [-64, 4]], 3, true), COL.leaf, 4, seed + 1); shape(ctx, [[-60, 4], [60, 4], [60, 24], [-60, 24]], '#e6b36a', 4.5, seed + 2, { off: [1, 2] }); ctx.restore(); },
};
