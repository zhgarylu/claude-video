// The beach: sky, sea with swash, wet and dry sand, windbreak, deckchair, people, gulls and the cameraman's shadow.
// World coordinates: x runs 0..960 at camera x = 0; the horizon sits at HY. People are scaled by depth (ppm).
import { W, H, css, shade, mixc, lin, rad, poly, ell, rrect, capsule, canvas, mulberry, hash, vnoise, clamp, lerp, seg, ss, eio, view } from './util.js';
import { person, POSE, blend } from './figure.js';

const HY = 290;
export const ppm = y => (y - HY) / 1.5;
export const shoreY = x => 392 - (x - 300) * .045;
const PAL = [   // 0 afternoon, 1 golden hour
  { skyT: '#3f86bd', skyM: '#8fc0da', skyH: '#efe6cc', seaFar: '#1f6f95', seaNear: '#5fb4b0', sand: '#cfa56c', sandD: '#a37748', wet: '#8f7152', sunX: .55, sunY: .42, tint: null },
  { skyT: '#4f86b4', skyM: '#d9b9a4', skyH: '#fbd9a0', seaFar: '#2b6d8b', seaNear: '#6bb1a6', sand: '#d09a5c', sandD: '#9a6a3c', wet: '#85664a', sunX: 1.35, sunY: .30, tint: [255, 208, 160] },
];
let SAND = null;
const SHL = canvas(W, H);
function sandTex() {
  if (SAND) return SAND;
  const c = canvas(512, 512), g = c.getContext('2d'), r = mulberry(77);
    for (let i = 0; i < 9000; i++) { const x = r() * 512, y = r() * 512, s = .6 + r() * 1.5, d = r(); g.fillStyle = d < .55 ? `rgba(110,80,40,${.10 + r() * .22})` : `rgba(255,250,235,${.15 + r() * .3})`; g.fillRect(x, y, s, s * (.6 + r() * .6)); }
  for (let i = 0; i < 40; i++) { const y = r() * 512; g.strokeStyle = 'rgba(120,90,50,.07)'; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * .03 + i) * 3); g.stroke(); }
  return SAND = c;
}

function sky(ctx, P, t, cam) {
  view(ctx, cam, .25, () => {
    ctx.fillStyle = lin(ctx, 0, -200, 0, HY + 4, [[0, P.skyT], [.55, P.skyM], [1, P.skyH]]);
    ctx.fillRect(-900, -400, 3400, HY + 404);
    // soft clouds: stacks of radial blobs, slowly drifting
    const r = mulberry(5);
    for (let i = 0; i < 9; i++) {
      const cx = -300 + r() * 1700 + t * (2 + r() * 2), cy = 40 + r() * 150, s = 70 + r() * 130, cw = 1.5 + r() * 1.8;
      for (let k = 0; k < 7; k++) {
        const ox = (r() - .5) * s * cw, oy = (r() - .5) * s * .22, rr = s * (.25 + r() * .4);
        ctx.fillStyle = rad(ctx, cx + ox, cy + oy + rr * .25, 0, rr, [[0, '#7d93ad', .28], [.7, '#8fa3b8', .1], [1, '#8fa3b8', 0]]);
        ctx.fillRect(cx + ox - rr, cy + oy - rr, rr * 2, rr * 2.4);
        ctx.fillStyle = rad(ctx, cx + ox, cy + oy - rr * .15, 0, rr, [[0, '#ffffff', .85], [.6, '#fff4e4', .38], [1, '#fff4e4', 0]]);
        ctx.fillRect(cx + ox - rr, cy + oy - rr, rr * 2, rr * 2);
      }
    }
    // low glow along the horizon
    ctx.fillStyle = lin(ctx, 0, HY - 90, 0, HY, [[0, '#fff2d6', 0], [1, '#fff6e0', .6]]); ctx.fillRect(-900, HY - 90, 3400, 92);
  });
}

function farLand(ctx, P, cam) {
  view(ctx, cam, .4, () => {
    // headland on the left, hazy
    ctx.fillStyle = lin(ctx, 0, HY - 60, 0, HY, [[0, '#9db0b8', .8], [1, '#c3c7c0', .9]]);
    ctx.beginPath(); ctx.moveTo(-400, HY + 2); ctx.bezierCurveTo(-300, HY - 26, -140, HY - 62, 10, HY - 40); ctx.bezierCurveTo(120, HY - 28, 220, HY - 12, 330, HY + 2); ctx.closePath(); ctx.fill();
  });
}

function sea(ctx, P, t, cam) {
  view(ctx, cam, .65, () => {
    const x0 = -700, x1 = 1900;
    // water body down to a generous shore line (the shore itself is drawn with the sand)
    ctx.fillStyle = lin(ctx, 0, HY, 0, 440, [[0, P.seaFar], [.55, '#4f9eab'], [1, P.seaNear]]);
    ctx.fillRect(x0, HY, x1 - x0, 300);
    // horizon haze
    ctx.fillStyle = lin(ctx, 0, HY, 0, HY + 30, [[0, '#e9efe6', .75], [1, '#e9efe6', 0]]); ctx.fillRect(x0, HY, x1 - x0, 30);
    // wave rows: short light dashes with perspective spacing
    const r = mulberry(21);
    for (let i = 0; i < 46; i++) {
      const u = i / 46, y = HY + 8 + Math.pow(u, 1.7) * 190, sc = .35 + u * 1.5;
      const nsegs = Math.round(28 - u * 14);
      for (let k = 0; k < nsegs; k++) {
        const x = x0 + r() * (x1 - x0) + Math.sin(t * .35 + i) * 10 * sc, len = (14 + r() * 40) * sc, a = .10 + r() * .22 * (.4 + u);
        ctx.fillStyle = r() < .72 ? `rgba(255,252,240,${a})` : `rgba(20,70,90,${a * 1.2})`;
        ctx.fillRect(x, y + Math.sin(t * .8 + x * .02 + i) * 1.1 * sc, len, Math.max(1, 1.5 * sc));
      }
    }
    // a few white caps
    for (let i = 0; i < 9; i++) { const u = r(), y = HY + 40 + u * 120, x = x0 + r() * (x1 - x0), L = 30 + u * 70 + Math.sin(t + i) * 5; ctx.fillStyle = `rgba(255,255,250,${.22 + u * .3})`; ctx.fillRect(x, y, L, 2 + u * 2.5); }
    // pier on the right: deck, piles, pavilion
    const dy = 326;
    ctx.fillStyle = 'rgba(120,128,140,.82)';
    ctx.fillRect(760, dy, 700, 7);
    ctx.fillStyle = 'rgba(100,108,120,.75)';
    for (let x = 770; x < 1450; x += 18) ctx.fillRect(x, dy + 7, 3, 24 - (x - 770) * .012);
    ctx.fillStyle = 'rgba(205,190,180,.9)'; ctx.fillRect(776, dy - 30, 70, 30);
    ctx.fillStyle = 'rgba(110,96,100,.9)'; poly(ctx, [[770, dy - 30], [811, dy - 52], [852, dy - 30]], 'rgba(120,104,108,.9)');
    ctx.fillStyle='rgba(130,112,112,.9)'; ctx.fillRect(810, dy - 66, 2, 16);
    ctx.fillStyle = 'rgba(100,90,96,.7)'; for (let i = 0; i < 5; i++) ctx.fillRect(782 + i * 13, dy - 22, 6, 14);
    ctx.fillStyle = 'rgba(110,116,128,.6)'; for (let x = 900; x < 1400; x += 60) ctx.fillRect(x, dy - 12, 2, 12);
    // a distant sailing boat
    const bx = 330, by = HY + 14; ctx.fillStyle = '#f7f1e2'; poly(ctx, [[bx, by], [bx, by - 28], [bx + 14, by]], '#f7f1e2'); poly(ctx, [[bx - 3, by], [bx - 3, by - 20], [bx - 12, by]], '#efe6d2');
    ctx.fillStyle = '#5a4a46'; ctx.fillRect(bx - 12, by, 28, 2.5);
  });
}

function sandAndShore(ctx, P, t, cam) {
  view(ctx, cam, 1, () => {
    const x0 = -700, x1 = 1900;
    // wet sand then dry sand as bands following the slanted shore
    const swash = x => 9 * Math.sin(t * .8 + x * .011) + 4 * Math.sin(t * 1.7 + x * .031) + 2;
    const sandPath = () => { ctx.beginPath(); ctx.moveTo(x0, 900); for (let x = x0; x <= x1; x += 24) ctx.lineTo(x, shoreY(x) + 20); ctx.lineTo(x1, 900); ctx.closePath(); };
    sandPath(); ctx.fillStyle = lin(ctx, 0, 340, 0, 800, [[0, P.sandD], [.3, P.sand], [1, '#d9b57e']]); ctx.fill();
    // dry sand texture, scaled by depth in strips
    const tex = ctx.createPattern(sandTex(), 'repeat');
    ctx.save(); sandPath(); ctx.clip();
    for (let y = 340; y < 860; y += 20) {
      const s = clamp(ppm(y + 10) / 140, .25, 3.2);
      tex.setTransform(new DOMMatrix().scale(s, s * .55).translate(0, 0));
      ctx.globalAlpha = .9; ctx.fillStyle = tex; ctx.fillRect(x0, y, x1 - x0, 21);
    }
    ctx.restore();
    // wet band
    ctx.beginPath(); ctx.moveTo(x0, shoreY(x0) + 70);
    for (let x = x0; x <= x1; x += 24) ctx.lineTo(x, shoreY(x) + 50 + 5 * Math.sin(x * .02));
    for (let x = x1; x >= x0; x -= 24) ctx.lineTo(x, shoreY(x) - 4 + swash(x));
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, 360, 0, 450, [[0, P.wet], [.5, '#bda27a'], [1, P.wet]]); ctx.fill();
    // reflection of the sky in the wet sand
    ctx.save(); ctx.clip(); ctx.fillStyle = lin(ctx, 0, 350, 0, 440, [[0, '#f4ead2', .0], [.35, '#f1e6cc', .32], [1, '#f1e6cc', 0]]); ctx.fillRect(x0, 350, x1 - x0, 140); ctx.restore();
    // water over the shore: surf, swash lines, foam lace
    const r = mulberry(9);
    ctx.beginPath(); ctx.moveTo(x0, shoreY(x0) - 40);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, shoreY(x) - 4 + swash(x) + 3 * Math.sin(x * .11 + t * 2));
    ctx.lineTo(x1, shoreY(x1) - 40); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, 360, 0, 440, [[0, P.seaNear, 0], [.7, '#9bd0c0', .85], [1, '#cfe9dc', .95]]); ctx.fill();
    for (let k = 0; k < 4; k++) {
      ctx.beginPath(); const off = -4 - k * 14, a = .9 - k * .22;
      for (let x = x0; x <= x1; x += 6) { const y = shoreY(x) + off + swash(x + k * 90) * (1 - k * .15) + 2.5 * Math.sin(x * .13 + k * 2 + t * 2.4) * (1 - k * .2); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = `rgba(255,255,248,${a})`; ctx.lineWidth = 4.5 - k * .8; ctx.lineJoin = 'round'; ctx.stroke();
    }
    for (let i = 0; i < 420; i++) { const x = x0 + r() * (x1 - x0), y = shoreY(x) - 18 + swash(x) + r() * 22, s = .8 + r() * 2.8; ctx.fillStyle = `rgba(255,255,250,${.35 + r() * .5})`; ctx.fillRect(x, y, s * 1.8, s * .8); }
    // ripples and footprints on dry sand
    for (let i = 0; i < 26; i++) { const x = 20 + r() * 1200 - 200, y = 440 + r() * 300; ell(ctx, x, y, (20 + r() * 40) * ppm(y) / 140, (2 + r() * 2) * ppm(y) / 140, `rgba(130,100,60,${.10 + r() * .1})`); ell(ctx, x, y - 2, (18 + r() * 30) * ppm(y) / 140, 1, `rgba(255,248,230,.18)`); }
    for (let i = 0; i < 18; i++) { const x = 330 + i * 31 + (i % 2) * 6, y = 600 - i * 3.4 + (i % 2) * 5, s = ppm(y) / 150; ell(ctx, x, y, 10 * s, 4.6 * s, 'rgba(120,90,56,.34)'); ell(ctx, x - 1, y - 1, 8 * s, 3 * s, 'rgba(255,246,224,.16)'); }
  });
}

function windbreak(ctx, x, y, t, sh) {
  const m = ppm(y), h = 1.25 * m, pw = .62 * m, cols = ['#c9442d', '#f1e8d2', '#d7a33a', '#f1e8d2', '#c9442d'];
  const sway = Math.sin(t * 1.3 + x) * 1.2;
  if (sh) { poly(ctx, [[x, y], [x + 3.2 * pw, y], [x + 3.2 * pw + .55 * h, y - .42 * h], [x + .55 * h, y - .42 * h]], '#3a2616'); return; }
  const pts = [0, 1, 2, 3, 4, 5].map(i => [x + i * pw * .62, y - .06 * m * Math.sin(i * 1.7) * 0]);
  for (let i = 0; i < 5; i++) {
    const xa = x + i * pw * .66, xb = xa + pw * .66, ya = y + (i % 2 ? 4 : 0) * m / 120, yb = y + ((i + 1) % 2 ? 4 : 0) * m / 120;
    ctx.fillStyle = css(cols[i]); ctx.beginPath(); ctx.moveTo(xa, ya - h); ctx.quadraticCurveTo((xa + xb) / 2 + sway, ya - h - 2, xb, yb - h); ctx.lineTo(xb, yb); ctx.lineTo(xa, ya); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(60,30,10,${.07 + (i % 2) * .05})`; ctx.fillRect(xa + 1, ya - h, pw * .66 - 1, h);
  }
  for (let i = 0; i <= 5; i++) { const px = x + i * pw * .66; capsule(ctx, px, y + 3, px, y - h - 7, Math.max(2.5, .03 * m), '#7b5a38'); }
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, y - h, pw * 3.3, 3);
}

function deckchair(ctx, x, y, sh) {
  const m = ppm(y);
  if (sh) { ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, -.55, .42, 0, 0); ctx.fillStyle = '#3a2616'; ctx.fillRect(-.2 * m, -.9 * m, .9 * m, .9 * m); ctx.restore(); return; }
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  // frame
  const fr = '#8a6a44';
  capsule(ctx, -.34 * m, 0, -.08 * m, -.46 * m, .045 * m, fr); capsule(ctx, .5 * m, 0, .24 * m, -.46 * m, .045 * m, fr);
  capsule(ctx, -.12 * m, -.05 * m, -.36 * m, -.95 * m, .045 * m, fr);
  // canvas: back and seat, striped in turquoise/white/orange
  const bands = ['#2f8c8a', '#f2ead4', '#e0792b', '#f2ead4', '#2f8c8a', '#f2ead4'];
  const L = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const seatA = [-.1 * m, -.44 * m], seatB = [.46 * m, -.4 * m], backTop = [-.36 * m, -.92 * m];
  for (let i = 0; i < 6; i++) { const u0 = i / 6, u1 = (i + 1) / 6; poly(ctx, [L(seatA, seatB, u0), L(seatA, seatB, u1), L([-.02 * m, -.36 * m], [.5 * m, -.32 * m], u1), L([-.02 * m, -.36 * m], [.5 * m, -.32 * m], u0)], css(bands[i])); }
  poly(ctx, [[-.1 * m, -.44 * m], [-.36 * m, -.92 * m], [-.28 * m, -.95 * m], [-.0 * m, -.46 * m]], '#2f8c8a');
  capsule(ctx, .46 * m, -.4 * m, .5 * m, 0, .04 * m, fr);
  ctx.restore();
}

function blanket(ctx, x, y, sh) {
  const m = ppm(y), w = 1.9 * m, d = 1.0 * m;
  const P4 = [[x, y], [x + w, y], [x + w + .35 * m, y - d * .55], [x + .35 * m, y - d * .55]];
  if (sh) return;
  poly(ctx, P4, '#efe3cc');
  ctx.save(); ctx.beginPath(); P4.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); ctx.clip();
  for (let i = 0; i < 12; i++) { const u = i / 12; ctx.fillStyle = 'rgba(190,52,38,.55)'; poly(ctx, [[x + w * u, y], [x + w * (u + .045), y], [x + w * (u + .045) + .35 * m, y - d * .55], [x + w * u + .35 * m, y - d * .55]], 'rgba(190,52,38,.5)'); }
  for (let i = 0; i < 6; i++) { const yy = y - d * .55 * i / 6; poly(ctx, [[x + .35 * m * i / 6, yy], [x + w + .35 * m * i / 6, yy], [x + w + .35 * m * i / 6, yy - d * .55 * .05], [x + .35 * m * i / 6, yy - d * .55 * .05]], 'rgba(190,52,38,.5)'); }
  ctx.restore();
  // basket and thermos
  ctx.fillStyle = '#b07a3e'; rrect(ctx, x + .35 * m, y - .38 * m, .5 * m, .3 * m, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,170,.25)'; for (let i = 0; i < 6; i++) ctx.fillRect(x + .38 * m + i * .08 * m, y - .38 * m, 2, .3 * m);
  ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = .03 * m; ctx.beginPath(); ctx.arc(x + .6 * m, y - .38 * m, .2 * m, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#2f6f6c'; rrect(ctx, x + 1.05 * m, y - .46 * m, .16 * m, .32 * m, 4); ctx.fill(); ctx.fillStyle = '#e8e0cf'; ctx.fillRect(x + 1.05 * m, y - .5 * m, .16 * m, .07 * m);
}

function gull(ctx, x, y, s, ph) { ctx.strokeStyle = 'rgba(250,246,236,.95)'; ctx.lineWidth = Math.max(1.4, s * .16); ctx.lineCap = 'round'; ctx.beginPath(); const fl = Math.sin(ph) * s * .7; ctx.moveTo(x - s, y - fl * .6); ctx.quadraticCurveTo(x - s * .4, y - s * .35 - fl, x, y); ctx.quadraticCurveTo(x + s * .4, y - s * .35 - fl, x + s, y - fl * .6); ctx.stroke(); }

function bucket(col) { return (ctx, hx, hy, f, sh) => { if (sh) return; ctx.fillStyle = css(col); poly(ctx, [[hx - 9, hy + 2], [hx + 9, hy + 2], [hx + 7, hy + 20], [hx - 7, hy + 20]], css(col)); ctx.fillStyle = shade(col, .25); ctx.fillRect(hx - 9, hy + 2, 18, 3); }; }

// the cameraman's shadow: head, shoulders, raised arm and camera, rising from the bottom edge.
// It is attached to the camera, not to the beach: screen space, swaying with a little of the handheld motion.
function dadShadow(ctx, cam, o) {
  const x = (o.x ?? 200) - cam.x * .15, y = (o.y ?? 690) - cam.y * .15, s = o.s || 1, a = o.alpha ?? .55, lf = o.lift || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s * 1.12); ctx.rotate(.2 + (o.rot || 0));
  ctx.filter = 'blur(1.4px)';
  ctx.fillStyle = `rgba(52,32,20,${a})`; ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath(); ctx.moveTo(-86, 170); ctx.bezierCurveTo(-82, 66, -46, 36, -16, 30); ctx.lineTo(-12, 12); ctx.lineTo(14, 12); ctx.lineTo(18, 30); ctx.bezierCurveTo(52, 36, 86, 66, 90, 170); ctx.closePath(); ctx.fill();
  ell(ctx, 2, -16, 21, 30, ctx.fillStyle);                                     // head
  ctx.lineWidth = 19; ctx.lineCap = 'round'; ctx.lineJoin = 'round';          // raised right arm bent up to the eye
  ctx.beginPath(); ctx.moveTo(62, 52); ctx.lineTo(96, 16 + lf); ctx.lineTo(48, -16 + lf); ctx.stroke();
  ctx.fillRect(12, -36 + lf, 50, 28); ctx.fillRect(58, -44 + lf, 16, 34);     // camera body and lens barrel, pointing up-screen at the family
  ctx.restore();
}

// o: {t, cam, tod, shot} -> draws the whole beach into ctx
export function drawBeach(ctx, o) {
  const t = o.t, cam = o.cam, P = PAL[o.tod || 0], tod = o.tod || 0;
  sky(ctx, P, t, cam); farLand(ctx, P, cam); sea(ctx, P, t, cam); sandAndShore(ctx, P, t, cam);
  // distant bathers and strollers (tiny, flat)
  const far = [];
  const r = mulberry(31);
  for (let i = 0; i < 6; i++) { const f = i % 2 ? -1 : 1, x = 700 + i * 120 + r() * 60 + f * t * 16, y = shoreY(x) + 6 + r() * 12, ph = t * (2 + r()) + i; far.push({ x, y, m: ppm(y), f, kind: 'adult', pose: POSE.walk(ph * 2.2), top: ['#3b6e8c', '#7a4d8c', '#e8dcc0', '#4a6a4a', '#8a8f9c', '#b8c4d0'][i % 6], bottom: ['#2c3e5e', '#e8dcc0', '#4a3a2e'][i % 3], skin: '#d9a47c', hair: '#3a2a1c', hairStyle: 'short' }); }
  // swimmers' heads
  view(ctx, cam, .65, () => { for (let i = 0; i < 6; i++) { const x = 420 + i * 120 + Math.sin(t * .6 + i) * 6, y = HY + 80 + (i % 3) * 22 + Math.sin(t * 1.2 + i * 2) * 1.2; ell(ctx, x, y, 3.2, 3.4, '#d9a47c'); ell(ctx, x, y - 1.6, 3.6, 2.2, ['#e8e0cf', '#3b6e8c', '#c8442f'][i % 3]); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - 6, y + 3, 12, 1.4); } });
  const items = [];
  // shadows first: one pass for everything that stands on sand
  const wbX = 70, wbY = 530, dcX = 330, dcY = 560, bkX = 40, bkY = 640;
  const mum = { x: dcX + .1 * ppm(dcY) , y: dcY + 3, m: ppm(dcY), f: 1, kind: 'adult', top: '#f3ead6', dress: true, dressCol: '#d9692c', dressTrim: '#f3ead6', skin: '#dcae88', hair: '#4a2c1c', hairStyle: 'bob', hat: '#f6f0e0', hatBand: '#d9692c', sleeveless: true,
    pose: { hh: .43, hx: -.02, tn: 1.5, kn: 1.4, tf: 1.38, kf: 1.3, lean: -.28, nod: .05, an1: 2.5 + .22 * Math.sin(t * 6), an2: .5 * Math.sin(t * 6 + 1), af1: .5, af2: .5, hem: .38, mouth: 0, sunX: 0 } };
  const ned = { x: 590, y: shoreY(590) + 92, m: ppm(shoreY(590) + 92), f: 1, kind: 'toddler', top: '#3b78a8', shorts: true, bottom: '#e8dcc0', skin: '#e2b490', hair: '#8a5a2e', hairStyle: 'curls',
    pose: { hh: .1, tn: 1.55, kn: 2.3, tf: 1.5, kf: 2.25, lean: 1.0, nod: -.3, an1: 1.9 + .35 * Math.sin(t * 5), an2: .6, af1: 1.7, af2: .5, mouth: 0 }, hold: null };
  const mode = o.pip || 'run';
  const px = mode === 'run' ? lerp(250, 1060, eio(seg(t, .3, 11.4))) : (o.pipX ?? 700), py = mode === 'hand' ? 530 : shoreY(px) + (mode === 'run' ? 80 : 75);
  const ph = t * 11, wv = Math.sin(t * 7);
  const pipBase = { x: px, y: py, m: ppm(py), f: 1, kind: 'child', top: '#f6c431', dress: false, shorts: true, bottom: '#f6c431', skin: '#e2b08a', hair: '#7a3f1d', hairStyle: 'pony', sleeveless: true };
  let pip = null;
  if (mode === 'run') pip = { ...pipBase, pose: { ...POSE.run(ph, .9), hh: undefined, an1: 2.7 + .3 * Math.sin(ph), an2: .4, af1: -.9, af2: .7, brow: 1 }, hold: (c, hx, hy, f, sh) => { if (sh) return; c.fillStyle = '#d8402f'; poly(c, [[hx, hy - 2], [hx - 34, hy + 10 + Math.sin(ph) * 3], [hx - 42, hy + 36], [hx - 4, hy + 18]], '#d8402f'); } };
  if (mode === 'stand') pip = { ...pipBase, f: o.pipF ?? 1, pose: { ...POSE.stand(0), tn: .06, kn: .06, tf: -.05, kf: .05, lean: -.04, an1: 2.65 + .3 * wv, an2: .3 + .5 * Math.sin(t * 7 + 1), af1: .2, af2: .3, mouth: 1, brow: 1, pony: t * 3, nod: .1 } };
  if (mode === 'hand') pip = { ...pipBase, f: -1, pose: { ...POSE.stand(0), tn: .16, kn: .1, tf: -.12, kf: .1, lean: .12 + .02 * Math.sin(t * 3), an1: 1.55 + .06 * wv, an2: .1, af1: 1.35, af2: .15, mouth: .7 + .3 * Math.sin(t * 6), brow: 1, pony: t * 2, nod: .0, look: 0 } };
  const D = o.dad, dad = D ? (() => { const m = ppm(D.y), ph2 = D.x * .05, sw = D.walk ?? 0, w = D.wave ?? 0, lau = D.laugh ?? 0, sh = Math.sin(t * 8), pose = blend(blend(POSE.stand(0), POSE.walk(ph2), sw), { an1: 2.55 + .3 * sh, an2: .4 + .5 * Math.sin(t * 8 + 1), mouth: 1 }, w * .0 + 0);
    const p2 = { ...pose, an1: pose.an1 * (1 - w) + (2.55 + .3 * sh) * w, an2: pose.an2 * (1 - w) + (.4 + .5 * Math.sin(t * 8 + 1)) * w, mouth: lau > 0 ? .6 + .4 * Math.sin(t * 11) : 0, brow: lau > 0 ? 1 : 0, nod: lau * .08 * Math.sin(t * 11), lean: (pose.lean ?? 0) - lau * .06 };
    return { x: D.x, y: D.y, m, f: D.f ?? -1, kind: 'adult', top: '#5b82ae', bottom: '#3f4b68', skin: '#d6a07a', hair: '#2a1d15', hairStyle: 'short', sleeveless: false, pose: p2 }; })() : null;
  if (mode === 'stand') for (let i = far.length - 1; i >= 0; i--) if (Math.abs(far[i].x - px) < 150) far.splice(i, 1);
  const shadowOpt = { sunX: P.sunX, sunY: P.sunY };
  // shadows: drawn opaque on their own layer, then laid on the sand once (no double-dark overlaps)
  const shc = SHL.getContext('2d'); shc.clearRect(0, 0, W, H);
  view(shc, cam, 1, () => {
    windbreak(shc, wbX, wbY, t, true); deckchair(shc, dcX, dcY, true);
    [mum, ned, pip, dad].filter(Boolean).forEach(p => person(shc, { ...p, ...shadowOpt }, true));
    ell(shc, 470 + 6, 640 + 12, 17, 4.5, '#3a2616');
  });
  ctx.save(); ctx.globalAlpha = tod ? .42 : .34; ctx.filter = 'blur(1.2px)'; ctx.drawImage(SHL, 0, 0); ctx.restore();
  view(ctx, cam, 1, () => {
    blanket(ctx, bkX, bkY, false);
    windbreak(ctx, wbX, wbY, t, false);
    far.forEach(p => person(ctx, p));
    person(ctx, ned);
    // bucket and the hole being dug
    ell(ctx, 620, ned.y + 4, 22, 6, 'rgba(70,50,30,.45)');
    ctx.fillStyle = '#d8402f'; poly(ctx, [[608, ned.y - 26], [632, ned.y - 26], [628, ned.y - 6], [612, ned.y - 6]], '#d8402f'); ctx.fillStyle = '#f0c2b0'; ctx.fillRect(608, ned.y - 26, 24, 3);
    deckchair(ctx, dcX, dcY, false);
    person(ctx, mum);
    if (dad) person(ctx, dad);
    if (pip) person(ctx, pip);
    // beach ball
    const bx = 470, by = 640, br = 16; 
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.clip(); ctx.fillStyle = '#f1e8d2'; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    ['#d8402f', '#2f86a8', '#e8b32a'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, br * 1.2, i * 2.1 + .5, i * 2.1 + 1.2); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = rad(ctx, bx - 6, by - 6, 0, 22, [[0, '#fff', .5], [1, '#fff', 0]]); ctx.fillRect(bx - br, by - br, br * 2, br * 2); ctx.restore();
    // gulls
    for (let i = 0; i < 4; i++) gull(ctx, 120 + i * 190 + Math.sin(t * .4 + i) * 40 + t * 12, 120 + (i % 2) * 54 + Math.sin(t * .7 + i * 2) * 10, 7 + (i % 3) * 2.2, t * 8 + i * 2);
  });
  const who = o.who ?? 'dad';
  if (who === 'dad') dadShadow(ctx, cam, { x: o.dadX ?? 690, y: o.dadY ?? 625, s: 1.15, rot: -.05, lift: Math.sin(t * 1.3) * 1.5, alpha: o.dadAlpha ?? (tod ? .6 : .52) });
  if (who === 'pip') dadShadow(ctx, cam, { x: 300, y: 690, s: .62, rot: -.12 + .05 * Math.sin(t * 2), lift: Math.sin(t * 2.1) * 3, alpha: tod ? .6 : .52 });
  if (P.tint) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, P.tint.map(v => v * .96)], [.55, P.tint], [1, P.tint.map(v => v * .86)]]); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  return { pip, mum, ned };
}
