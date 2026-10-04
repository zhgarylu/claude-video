// A terraced street at departure time: houses, hedges, an estate car with an open tailgate, three of the family.
// Flat elevation (no vanishing point), as a handheld camera would frame a wide shot from the kerb.
import { W, H, css, shade, mixc, lin, rad, poly, ell, rrect, capsule, canvas, mulberry, hash, vnoise, clamp, lerp, seg, ss, eio, view } from './util.js';
import { person, POSE, blend } from './figure.js';

const SHL = canvas(W, H);
const ROAD_Y = 505, KERB_Y = 628;

function sky(ctx, cam, t) {
  view(ctx, cam, .2, () => {
    ctx.fillStyle = lin(ctx, 0, -100, 0, 330, [[0, '#4a8fc4'], [.5, '#9cc8df'], [1, '#f4e8cf']]); ctx.fillRect(-800, -300, 2700, 640);
    const r = mulberry(14);
    for (let i = 0; i < 6; i++) { const cx = -200 + r() * 1300 + t * 3, cy = 20 + r() * 110, s = 60 + r() * 90; for (let k = 0; k < 5; k++) { const ox = (r() - .5) * s * 2, rr = s * (.3 + r() * .4); ctx.fillStyle = rad(ctx, cx + ox, cy + (r() - .5) * 14, 0, rr, [[0, '#ffffff', .8], [1, '#fff4e4', 0]]); ctx.fillRect(cx + ox - rr, cy - rr, rr * 2, rr * 2); } }
  });
}

const HOUSES = [
  { c: '#a9573d', door: '#2f6b5e', bay: true, w: 214 }, { c: '#dccfa8', door: '#b8402c', bay: false, w: 196 }, { c: '#b2644a', door: '#2f4f86', bay: true, w: 214 },
  { c: '#bccaa2', door: '#d9a336', bay: false, w: 196 }, { c: '#a9573d', door: '#7b3a5e', bay: true, w: 214 }, { c: '#dccfa8', door: '#2f6b5e', bay: false, w: 196 },
];
function houses(ctx, cam) {
  view(ctx, cam, .85, () => {
    const base = 452, r = mulberry(8);
    let x = -330;
    HOUSES.forEach((h, i) => {
      const w = h.w, top = base - 262;
      ctx.fillStyle = css(h.c); ctx.fillRect(x, top, w, base - top);
      if (h.c === '#a9573d' || h.c === '#b2644a') { for (let k = 0; k < 360; k++) { ctx.fillStyle = r() < .5 ? 'rgba(60,20,10,.10)' : 'rgba(255,200,170,.07)'; ctx.fillRect(x + r() * w, top + r() * (base - top), 8 + r() * 6, 3); } for (let yy = top; yy < base; yy += 8) { ctx.fillStyle = 'rgba(40,16,8,.12)'; ctx.fillRect(x, yy, w, 1); } }
      else { for (let k = 0; k < 260; k++) { ctx.fillStyle = 'rgba(90,70,40,.06)'; ctx.fillRect(x + r() * w, top + r() * (base - top), 2, 2); } }
      // roof, chimney
      poly(ctx, [[x - 4, top + 2], [x + w + 4, top + 2], [x + w - 16, top - 54], [x + 16, top - 54]], '#4b4a54');
      ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x + 16, top - 54, w - 32, 6);
      ctx.fillStyle = '#8c4a38'; ctx.fillRect(x + w * .62, top - 98, 26, 46); ctx.fillStyle = '#b86a50'; ctx.fillRect(x + w * .62 - 3, top - 102, 32, 6);
      for (let k = 0; k < 2; k++) { ctx.fillStyle = '#c4703c'; ctx.fillRect(x + w * .62 + 3 + k * 12, top - 116, 8, 14); }
      // upper windows (white sashes, lace curtains)
      [.2, .62].forEach(u => { const wx = x + w * u, wy = top + 36, ww = 50, wh = 76; ctx.fillStyle = '#f3ecdc'; ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8); ctx.fillStyle = lin(ctx, 0, wy, 0, wy + wh, [[0, '#49666f'], [1, '#2f444b']]); ctx.fillRect(wx, wy, ww, wh); ctx.fillStyle = 'rgba(255,255,255,.18)'; poly(ctx, [[wx + 6, wy], [wx + 24, wy], [wx + 10, wy + wh], [wx - 6 + 6, wy + wh]], 'rgba(255,255,255,.14)'); ctx.fillStyle = '#f3ecdc'; ctx.fillRect(wx, wy + wh / 2 - 2, ww, 4); ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh); ctx.fillStyle = 'rgba(245,238,222,.55)'; ctx.fillRect(wx, wy, ww, 18); });
      // ground floor: door and bay or window
      const dx = x + w * (h.bay ? .12 : .1), dw = 44, dh = 104;
      ctx.fillStyle = '#f3ecdc'; ctx.fillRect(dx - 5, base - dh - 14, dw + 10, dh + 14);
      ctx.fillStyle = css(h.door); ctx.fillRect(dx, base - dh, dw, dh); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(dx + 6, base - dh + 8, dw - 12, 34); ctx.fillRect(dx + 6, base - dh + 52, dw - 12, 40);
      ctx.fillStyle = '#e8c66a'; ctx.fillRect(dx + dw - 10, base - dh / 2, 5, 5);
      ctx.fillStyle = lin(ctx, 0, base - dh - 14, 0, base - dh, [[0, '#2f444b'], [1, '#49666f']]); ctx.fillRect(dx, base - dh - 12, dw, 10);
      const bx = x + w * (h.bay ? .46 : .5), bw = h.bay ? 96 : 66;
      ctx.fillStyle = '#f3ecdc'; ctx.fillRect(bx - 5, base - 98, bw + 10, 94);
      ctx.fillStyle = lin(ctx, 0, base - 94, 0, base - 8, [[0, '#4b6a72'], [1, '#2f444b']]); ctx.fillRect(bx, base - 92, bw, 82);
      ctx.fillStyle = '#f3ecdc'; for (let k = 1; k < (h.bay ? 3 : 2); k++) ctx.fillRect(bx + bw * k / (h.bay ? 3 : 2) - 2, base - 92, 4, 82);
      ctx.fillStyle = 'rgba(245,238,222,.5)'; ctx.fillRect(bx, base - 92, bw, 22);
      ctx.fillStyle = 'rgba(255,255,255,.14)'; poly(ctx, [[bx + 8, base - 92], [bx + 30, base - 92], [bx + 12, base - 10], [bx - 8 + 8, base - 10]], 'rgba(255,255,255,.12)');
      x += w;
    });
    // hedges and low walls in front of the houses
    ctx.fillStyle = '#7a5a46'; ctx.fillRect(-340, base - 6, 1500, 28);
    for (let k = 0; k < 2400; k++) { ctx.fillStyle = r() < .5 ? 'rgba(40,20,10,.14)' : 'rgba(255,220,190,.10)'; ctx.fillRect(-340 + r() * 1500, base - 6 + r() * 28, 10, 3); }
    for (let i = 0; i < 38; i++) { const hx = -330 + i * 36 + (r() - .5) * 12, hy = base - 2 - r() * 6, rr = 22 + r() * 12; ell(ctx, hx, hy - 8, rr, rr * .75, i % 3 ? '#4d7a43' : '#5d8c4c'); ell(ctx, hx - 5, hy - 14, rr * .5, rr * .35, 'rgba(180,220,120,.35)'); }
  });
}

function road(ctx, cam, t) {
  view(ctx, cam, 1, () => {
    const x0 = -900, x1 = 2000, r = mulberry(4);
    ctx.fillStyle = lin(ctx, 0, 470, 0, 500, [[0, '#b7a998'], [1, '#c7b8a2']]); ctx.fillRect(x0, 470, x1 - x0, 40);           // far pavement
    for (let x = x0; x < x1; x += 70) { ctx.fillStyle = 'rgba(70,50,30,.2)'; ctx.fillRect(x, 470, 2, 36); }
    ctx.fillStyle = '#d8ccb8'; ctx.fillRect(x0, ROAD_Y - 4, x1 - x0, 6); ctx.fillStyle = 'rgba(60,40,20,.3)'; ctx.fillRect(x0, ROAD_Y + 2, x1 - x0, 4);   // far kerb
    ctx.fillStyle = lin(ctx, 0, ROAD_Y, 0, KERB_Y, [[0, '#6d6a68'], [1, '#5a5654']]); ctx.fillRect(x0, ROAD_Y + 2, x1 - x0, KERB_Y - ROAD_Y);   // tarmac
    for (let i = 0; i < 4200; i++) { ctx.fillStyle = r() < .5 ? 'rgba(20,16,14,.18)' : 'rgba(220,210,190,.14)'; const y = ROAD_Y + 4 + r() * (KERB_Y - ROAD_Y); ctx.fillRect(x0 + r() * (x1 - x0), y, 1.5 + (y - ROAD_Y) * .012, 1.2); }
    ctx.fillStyle = 'rgba(30,24,20,.26)'; for (let i = 0; i < 6; i++) { const y = ROAD_Y + 20 + i * 18; ctx.fillRect(x0 + r() * 600, y, 280 + r() * 500, 1.5); }
    // near kerb and pavement
    ctx.fillStyle = '#d6cab4'; ctx.fillRect(x0, KERB_Y, x1 - x0, 12); ctx.fillStyle = '#a89a84'; ctx.fillRect(x0, KERB_Y + 12, x1 - x0, 5);
    ctx.fillStyle = lin(ctx, 0, KERB_Y + 17, 0, 820, [[0, '#bdb09a'], [1, '#a39682']]); ctx.fillRect(x0, KERB_Y + 17, x1 - x0, 260);
    for (let x = x0; x < x1; x += 120) { ctx.fillStyle = 'rgba(60,44,28,.22)'; ctx.fillRect(x, KERB_Y + 17, 2.5, 260); }
    for (let y = KERB_Y + 17, k = 0; y < 820; y += 46 + k * 10, k++) { ctx.fillStyle = 'rgba(60,44,28,.2)'; ctx.fillRect(x0, y, x1 - x0, 2.5); }
    for (let i = 0; i < 2500; i++) { ctx.fillStyle = r() < .5 ? 'rgba(60,44,28,.12)' : 'rgba(255,245,225,.12)'; ctx.fillRect(x0 + r() * (x1 - x0), KERB_Y + 18 + r() * 240, 2, 2); }
  });
}

function car(ctx, x, y, s, open, sh) {
  const P = (u, v) => [x + u * s, y - v * s];
  const body = ['#4fa59f', '#ece1c6'];
  const path = pts => { ctx.beginPath(); pts.forEach(([u, v], i) => { const [a, b] = P(u, v); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.closePath(); };
  const outline = [[0, .27], [0, .74], [.2, .88], [1.32, .92], [1.86, 1.43], [4.2, 1.46], [4.34, .98], [4.4, .27]];
  if (sh) { path(outline); ctx.fillStyle = '#3a2616'; ctx.fill(); const [a, b] = P(4.2, 1.46), L = 1.05 * s; ctx.fillStyle = '#3a2616'; poly(ctx, [[a, b], [a + Math.cos(1.15) * L, b - Math.sin(1.15) * L], [a + Math.cos(1.15) * L + .1 * s, b - Math.sin(1.15) * L], [a + .1 * s, b]], '#3a2616'); return; }
  // roof rack and luggage (behind the roof line)
  ctx.strokeStyle = '#3c3a38'; ctx.lineWidth = .04 * s; ctx.lineCap = 'round';
  [2.0, 2.4, 3.6, 4.0].forEach(u => { const [a, b] = P(u, 1.46), [c, d] = P(u, 1.55); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(...P(1.95, 1.55)); ctx.lineTo(...P(4.05, 1.55)); ctx.stroke();
  ctx.fillStyle = '#8c5a3a'; rrect(ctx, ...P(2.25, 1.98), .95 * s, .43 * s, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,220,170,.25)'; ctx.fillRect(...P(2.25, 1.98), .95 * s, .05 * s);
  ctx.fillStyle = '#5c3a22'; ctx.fillRect(...P(2.45, 1.98), .05 * s, .43 * s); ctx.fillRect(...P(2.95, 1.98), .05 * s, .43 * s); ctx.fillStyle = '#d9b36a'; ctx.fillRect(...P(2.7, 1.84), .1 * s, .06 * s);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#f1e8d2' : '#c9442d'; ctx.fillRect(...P(3.3 + k * .12, 1.79), .12 * s, .24 * s); } ell(ctx, ...P(3.3, 1.67), .04 * s, .12 * s, '#c9442d'); ell(ctx, ...P(4.0, 1.67), .04 * s, .12 * s, '#f1e8d2');
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(...P(3.3, 1.56), .72 * s, .03 * s);
  // body: turquoise lower, cream cabin
  path(outline); ctx.fillStyle = lin(ctx, 0, y - 1.5 * s, 0, y - .3 * s, [[0, body[0]], [1, mixc(body[0], '#000000', .22)]]); ctx.fill();
  ctx.save(); path(outline); ctx.clip(); ctx.fillStyle = lin(ctx, 0, y - 1.46 * s, 0, y - .98 * s, [[0, '#f3e9d0'], [1, '#e2d4b4']]); ctx.fillRect(...P(0, 1.5), 4.5 * s, .52 * s);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(...P(0, .96), 4.5 * s, .03 * s); ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(...P(0, .5), 4.5 * s, .06 * s);
  ctx.fillStyle = '#c8cfd0'; ctx.fillRect(...P(0, .66), 4.5 * s, .035 * s);   // chrome side strip
  ctx.restore();
  // glass
  [[[1.5, 1.01], [1.86, 1.37], [2.52, 1.39], [2.52, 1.01]], [[2.6, 1.01], [2.6, 1.39], [3.52, 1.39], [3.52, 1.01]], [[3.6, 1.01], [3.6, 1.39], [4.1, 1.39], [4.17, 1.01]]].forEach((g, i) => {
    path(g); ctx.fillStyle = lin(ctx, 0, y - 1.4 * s, 0, y - 1.0 * s, [[0, '#566d73'], [1, '#2c3d42']]); ctx.fill();
    ctx.save(); path(g); ctx.clip(); ctx.fillStyle = 'rgba(255,250,235,.22)'; poly(ctx, [[...P(g[0][0] + .15, 1.4)], [...P(g[0][0] + .42, 1.4)], [...P(g[0][0] + .18, 1.0)], [...P(g[0][0] - .1, 1.0)]], 'rgba(255,250,235,.2)');
    ctx.fillStyle = 'rgba(30,24,22,.8)'; if (i < 2) { rrect(ctx, ...P(g[1][0] - .38 + (i ? .3 : .05), 1.15), .16 * s, .2 * s, 5); ctx.fill(); } ctx.restore();
  });
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; [[2.56, .95, 1.4], [3.56, .95, 1.4]].forEach(([u, v0, v1]) => { ctx.beginPath(); ctx.moveTo(...P(u, v0)); ctx.lineTo(...P(u, v1 - .35)); ctx.moveTo(...P(u, .45)); ctx.lineTo(...P(u, .95)); ctx.stroke(); });
  ctx.fillStyle = '#c8cfd0'; ctx.fillRect(...P(2.2, .9), .16 * s, .03 * s); ctx.fillRect(...P(3.2, .9), .16 * s, .03 * s);
  // lights and bumpers
  ell(ctx, ...P(.1, .68), .09 * s, .1 * s, '#f6efd8'); ell(ctx, ...P(.1, .68), .06 * s, .07 * s, '#fff9e4'); ctx.strokeStyle = '#cfd5d6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(...P(.1, .68), .09 * s, .1 * s, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#c24433'; ctx.fillRect(...P(4.33, .88), .07 * s, .2 * s);
  ctx.fillStyle = '#d4d9d9'; rrect(ctx, ...P(-.06, .5), .2 * s, .07 * s, 3); ctx.fill(); rrect(ctx, ...P(4.28, .5), .2 * s, .07 * s, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(...P(-.03, .495), .12 * s, .015 * s);
  // wheels
  [.85, 3.55].forEach(u => {
    ell(ctx, ...P(u, .31), .31 * s, .31 * s, '#1f1b19');
    ell(ctx, ...P(u, .3), .25 * s, .25 * s, '#242020'); ell(ctx, ...P(u, .3), .155 * s, .155 * s, '#cdd2d2'); ell(ctx, ...P(u, .3), .12 * s, .12 * s, '#e8ecea'); ell(ctx, ...P(u - .04, .34), .06 * s, .05 * s, 'rgba(255,255,255,.7)'); ell(ctx, ...P(u, .3), .04 * s, .04 * s, '#8a8f90');
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(...P(u, .3), .25 * s, .25 * s, 0, 0, 7); ctx.stroke();
  });
  // tailgate swung up: a plate with a window, held by a strut; cargo poking out
    const [hx, hy] = P(4.2, 1.46), L = 1.05 * s, ang = open;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(-ang); ctx.fillStyle = shade(body[1], -.1); rrect(ctx, 0, -.09 * s, L, .17 * s, 5); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -.08 * s, 0, .06 * s, [[0, '#6d8288'], [1, '#34464b']]); rrect(ctx, .07 * s, -.06 * s, L * .84, .1 * s, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,235,.3)'; ctx.fillRect(.14 * s, -.055 * s, L * .22, .03 * s); ctx.restore();
  ctx.strokeStyle = '#8b9190'; ctx.lineWidth = .02 * s; ctx.beginPath(); ctx.moveTo(...P(4.36, 1.05)); ctx.lineTo(hx + Math.cos(ang) * L * .45, hy - Math.sin(ang) * L * .45); ctx.stroke();
}

function tree(ctx, cam) {      // foreground foliage: dark leaves, bright dapples, out of focus in the film pass
  view(ctx, cam, 1.35, () => {
    const r = mulberry(61);
    capsule(ctx, -330, 760, -250, -40, 54, '#3d2c22'); capsule(ctx, -280, 120, -90, -20, 18, '#3d2c22'); capsule(ctx, -240, 40, 70, -70, 12, '#3d2c22');
    for (let i = 0; i < 90; i++) { const x = -330 + r() * 560, y = -90 + r() * 240, rr = 20 + r() * 34; ell(ctx, x, y, rr, rr * .7, r() < .6 ? '#2f5a2c' : '#47773a', r() * 3); if (r() < .45) ell(ctx, x - rr * .2, y - rr * .25, rr * .45, rr * .3, 'rgba(228,236,150,.5)'); }
  });
}

// o: {t, cam}
export function drawStreet(ctx, o) {
  const t = o.t, cam = o.cam, wv = o.wave ?? 0, sw = Math.sin(t * 9);
  sky(ctx, cam, t); houses(ctx, cam); road(ctx, cam, t);
  const carX = 305, carY = 604, cs = 122, open = 1.12 - .06 * Math.sin(t * 2);
  const mumPose = blend({ ...POSE.stand(0), tn: .3 + .06 * Math.sin(t * 2.4), kn: .15, tf: -.2, kf: .2, lean: .24 + .04 * Math.sin(t * 2.4), an1: 1.35, an2: .1, af1: 1.25, af2: .15, hem: .46, mouth: 0, look: -1 },
    { ...POSE.stand(0), tn: .08, kn: .08, tf: -.08, kf: .06, lean: -.02, an1: 2.5 + .22 * sw, an2: .5 * Math.sin(t * 9 + 1), af1: .1, af2: .2, hem: .46, mouth: 1, brow: 1, nod: -.1, look: 0 }, clamp(wv));
  const mum = { x: 905, y: 648, m: 138, f: -1, kind: 'adult', top: '#dca43a', dress: true, dressCol: '#3b5f8c', skin: '#dcae88', hair: '#4a2c1c', hairStyle: 'bob', sleeveless: false, pose: mumPose,
    hold: wv > .5 ? null : (c, hx, hy, f) => { c.fillStyle = '#b07a3e'; rrect(c, hx - 44, hy - 18, 54, 38, 6); c.fill(); c.fillStyle = 'rgba(255,230,170,.25)'; for (let i = 0; i < 6; i++) c.fillRect(hx - 40 + i * 9, hy - 18, 2.5, 38); c.strokeStyle = '#8a5a2a'; c.lineWidth = 4; c.beginPath(); c.arc(hx - 17, hy - 18, 22, Math.PI, 0); c.stroke(); } };
  const pph = t * 5;
  const pip = { x: 175, y: 668, m: 150, f: 1, kind: 'child', top: '#f6c431', shorts: true, bottom: '#3a5f8a', skin: '#e2b08a', hair: '#7a3f1d', hairStyle: 'pony', sleeveless: false,
    pose: { ...POSE.stand(0), tn: .12 * Math.sin(pph), kn: .1, tf: -.1 * Math.sin(pph), kf: .1, lean: -.05, an1: 2.55 + .3 * Math.sin(pph * 1.2), an2: .5 + .4 * Math.sin(pph * 1.2 + 1), af1: .55, af2: .5, mouth: 1, brow: 1, pony: pph, nod: .1 },
    hold: (c, hx, hy, f, sh) => { if (sh) { return; } c.strokeStyle = '#d8402f'; c.lineWidth = 5; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 20, hy - 34); c.stroke(); ell(c, hx + 24, hy - 42, 12, 8, '#d8402f', .5); } };
  const ned = { x: 748, y: 706, m: 168, f: -1, kind: 'toddler', top: '#3b78a8', shorts: true, bottom: '#e8dcc0', skin: '#e2b490', hair: '#8a5a2e', hairStyle: 'curls',
    pose: { hh: .06, hx: 0, tn: 1.5, kn: 1.5, tf: 1.42, kf: 1.48, lean: .08, nod: .05 + .03 * Math.sin(t * 1.7), an1: 1.2, an2: .6, af1: 1.0, af2: .5, mouth: 0 },
    hold: (c, hx, hy, f, sh) => { if (sh) return; ell(c, hx - 4, hy + 2, 13, 16, '#9a6a3e'); ell(c, hx - 4, hy - 12, 9.5, 9, '#9a6a3e'); ell(c, hx - 11, hy - 19, 4, 4, '#9a6a3e'); ell(c, hx + 3, hy - 19, 4, 4, '#9a6a3e'); ell(c, hx - 4, hy - 10, 5, 3.6, '#c79a6a'); ell(c, hx - 7, hy - 13, 1.3, 1.3, '#2a1a12'); ell(c, hx - 1, hy - 13, 1.3, 1.3, '#2a1a12'); } };
  // shadows on one layer (sun low, behind-left)
  const shc = SHL.getContext('2d'); shc.clearRect(0, 0, W, H);
  view(shc, cam, 1, () => {
    const so = { sunX: .75, sunY: .22 };
    car(shc, carX, carY, cs, open, true);
    [mum, pip, ned].forEach(p => person(shc, { ...p, ...so }, true));
  });
  ctx.save(); ctx.globalAlpha = .38; ctx.filter = 'blur(1.4px)'; ctx.drawImage(SHL, 0, 0); ctx.restore();
  view(ctx, cam, 1, () => {
    car(ctx, carX, carY, cs, open, false);
    if (wv > .5) { const bx = carX + 4.22 * cs, by = carY - 1.0 * cs; ctx.fillStyle = '#b07a3e'; rrect(ctx, bx - 8, by - 10, 56, 38, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,230,170,.25)'; for (let i = 0; i < 6; i++) ctx.fillRect(bx - 4 + i * 9, by - 10, 2.5, 38); }
    person(ctx, mum); person(ctx, ned); person(ctx, pip);
  });
  ctx.save(); ctx.filter = 'blur(5px)'; tree(ctx, cam); ctx.restore();
  // dapple of sun through the leaves on the road
  ctx.save(); ctx.globalCompositeOperation = 'screen'; const r = mulberry(5); for (let i = 0; i < 14; i++) { const x = 40 + r() * 400, y = 560 + r() * 140; ell(ctx, x + Math.sin(t + i) * 2, y, 12 + r() * 22, 6 + r() * 8, 'rgba(255,238,190,.1)'); } ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, [255, 240, 224]], [1, [255, 226, 190]]]); ctx.fillRect(0, 0, W, H); ctx.restore();
}
