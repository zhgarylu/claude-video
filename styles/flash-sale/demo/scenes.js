// The ten scenes of "Mango Lane: Mega Markdown". Each is a pure function of film time t.
import { clamp, lerp, seg, ss, eio, eo, mulberry, TAU } from '/core/lib.js';
import { C, HEAD, LAB, text, textW, slam, draw01, starPath, burst, rrect, card, badge, strike, fillBg, rays, dots, stripes, hazard, marquee, confetti, coins, coin, ICONS, couponPath, cursor } from './draw.js';
import { T, GOODS, CELLS, CELLS_END, cellsLeft, TOTAL_WAS, TOTAL_NOW, SAVED } from './timeline.js';

const R = (deg) => deg * Math.PI / 180;
const wt = '800';                                   // Barlow Condensed ExtraBold
const ST = (o = {}) => ({ sw: 12, shadow: [10, 12, C.ink], ...o });

// ------------------------------------------------------------------ 1. intro: starburst, name, band, sticker, date
function intro(ctx, t) {
  const k = T.intro; rays(ctx, t, C.red, '#e51d14', 960, 500, 20, 0.1);
  slam(ctx, t - k.burst, 960, 500, 0, () => { ctx.rotate(t * 0.25); burst(ctx, 540, { n: 22, inner: 0.84, fill: C.yel, sw: 12, shadow: [16, 20] }); }, { from: 0.15, d: 0.1 });
  slam(ctx, t - k.name, 960, 430, R(-3), () => text(ctx, 'name', 'MANGO LANE', ST({ size: 250, sw: 14, shadow: [12, 14, C.ink], fill: C.white })));
  slam(ctx, t - k.band, 960, 640, R(-3), () => {
    rrect(ctx, -690, -85, 1380, 170, 14); ctx.fillStyle = C.ink; ctx.fill(); text(ctx, 'band', 'MEGA MARKDOWN', { size: 128, fill: C.yel, sw: 0, ls: 4 });
  }, { sq: 0.6 });
  slam(ctx, t - k.sticker, 1700, 230, R(12), () => {
    const pu = 1 + 0.05 * Math.exp(-(t % 0.5) * 8); ctx.scale(pu, pu);
    burst(ctx, 195, { n: 18, inner: 0.85, fill: C.white, sw: 8, shadow: [10, 12] });
    text(ctx, 'upto', 'UP TO', { y: -78, size: 60, font: LAB, weight: wt, fill: C.ink, ls: 3 }); text(ctx, 'sixty', '-60%', { y: 20, size: 128, fill: C.red });
  }, { from: 3 });
  slam(ctx, t - k.date, 960, 850, R(2), () => { card(ctx, 640, 150, { r: 24, sw: 9, shadow: [10, 12] }); text(ctx, 'date', 'SAT 12 OCT', { size: 96, fill: C.ink, ls: 3 }); });
  marquee(ctx, 985, 95, t, { bg: C.ink, fg: C.yel, words: ['MANGO LANE', 'MEGA MARKDOWN', 'SAT 12 OCT'] });
}

// ------------------------------------------------------------------ 2. kettle
function kettle(ctx, t) {
  const k = T.kettle, G = GOODS.kettle; dots(ctx, t, C.yel, C.yel2, 44, 1380, 560);
  slam(ctx, t - k.card, 560, 560, R(-3), () => {
    card(ctx, 680, 780); ctx.save(); ctx.translate(0, -50); ICONS.kettle(ctx, 250); ctx.restore();
    text(ctx, 'kname', G.name, { y: 300, size: 76, font: LAB, weight: wt, fill: C.ink });
  }, { from: 1, d: 0.12, dy: -800 });
  slam(ctx, t - k.was, 1400, 240, R(-2), () => { const w = text(ctx, 'was', '$' + G.was, { size: 190, fill: C.ink }); strike(ctx, w, 190, draw01(t - k.strike, 0.14)); }, { from: 1.7 });
  slam(ctx, t - k.now, 1400, 700, R(-2), () => {
    ctx.save(); ctx.translate(0, -10); burst(ctx, 335, { n: 20, inner: 0.86, fill: C.white, sw: 10, shadow: [12, 14] }); ctx.restore();
    text(ctx, 'nowl', 'NOW', { y: -150, size: 84, font: LAB, weight: wt, fill: C.ink, ls: 8 }); text(ctx, 'now', '$' + G.now, ST({ y: 25, size: 360, sw: 16, shadow: [14, 16, C.ink], fill: C.red }));
  }, { from: 2.2 });
  slam(ctx, t - k.badge, 880, 250, R(12), () => badge(ctx, 'off1', '-' + G.off + '%', 150, { fill: C.red, size: 108 }), { from: 3 });
}

// ------------------------------------------------------------------ 3. bundle
function bundle(ctx, t) {
  const k = T.bundle, G = GOODS.bundle; stripes(ctx, t, C.red, '#e01a12', 100, -0.55, 30);
  slam(ctx, t - k.cardL, 470, 335, R(-4), () => { card(ctx, 600, 570); ctx.save(); ctx.translate(0, -45); ICONS.headphones(ctx, 185); ctx.restore(); text(ctx, 'n1', 'Halo Headphones', { y: 215, size: 60, font: LAB, weight: wt, fill: C.ink }); }, { from: 1, d: 0.12, dx: -1000 });
  slam(ctx, t - k.cardR, 1450, 335, R(4), () => { card(ctx, 600, 570); ctx.save(); ctx.translate(0, -35); ICONS.lamp(ctx, 190); ctx.restore(); text(ctx, 'n2', 'Dot Lamp', { y: 215, size: 60, font: LAB, weight: wt, fill: C.ink }); }, { from: 1, d: 0.12, dx: 1000 });
  slam(ctx, t - k.plus, 960, 335, 0, () => {
    ctx.beginPath(); ctx.arc(14, 16, 100, 0, TAU); ctx.fillStyle = C.ink; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 100, 0, TAU); ctx.fillStyle = C.yel; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(44, 0); ctx.moveTo(0, -44); ctx.lineTo(0, 44); ctx.stroke();
  }, { from: 2.5 });
  slam(ctx, t - k.tagNew, 230, 130, R(-14), () => badge(ctx, 'new', 'NEW', 125, { fill: C.yel, ink: C.ink, size: 92 }), { from: 3 });
  slam(ctx, t - k.twoFor, 360, 880, R(-3), () => text(ctx, 'two', '2 FOR', ST({ size: 130, sw: 10 })));
  slam(ctx, t - k.was, 800, 870, R(-2), () => { const w = text(ctx, 'was2', '$' + G.was, ST({ size: 160, sw: 9, shadow: [8, 10, C.ink] })); strike(ctx, w, 160, draw01(t - k.strike, 0.14), C.yel); }, { from: 1.7 });
  slam(ctx, t - k.now, 1380, 860, R(-2), () => text(ctx, 'now2', '$' + G.now, ST({ size: 310, sw: 16, fill: C.yel, shadow: [14, 16, C.ink] })), { from: 2.2 });
  slam(ctx, t - (k.now + 0.0), 1740, 740, R(10), () => badge(ctx, 'off2', '-' + G.off + '%', 115, { fill: C.white, ink: C.red, size: 82 }), { from: 3 });
}

// ------------------------------------------------------------------ 4. backpack and the draining stock bar
const BX = 1000, BW = 28, BG = 6, BY = 570, BH = 120;
function stock(ctx, t) {
  const k = T.stock, G = GOODS.pack; rays(ctx, t, C.ink, '#26120f', 1380, 560, 22, 0.08);
  hazard(ctx, -60, 0, 2040, 62, t, 40); hazard(ctx, -60, 1018, 2040, 62, t, -40);
  slam(ctx, t - k.card, 500, 540, R(-3), () => { card(ctx, 660, 800); ctx.save(); ctx.translate(0, -50); ICONS.pack(ctx, 260); ctx.restore(); text(ctx, 'pname', G.name, { y: 320, size: 80, font: LAB, weight: wt, fill: C.ink }); }, { from: 1, d: 0.12, dy: -800 });
  slam(ctx, t - k.was, 1110, 225, R(-2), () => { const w = text(ctx, 'was3', '$' + G.was, ST({ size: 130, sw: 8, shadow: [8, 10, C.red] })); strike(ctx, w, 130, draw01(t - k.strike, 0.14), C.red); }, { from: 1.7 });
  slam(ctx, t - k.now, 1500, 235, R(-2), () => text(ctx, 'now3', '$' + G.now, ST({ size: 270, sw: 14, fill: C.yel, shadow: [12, 14, C.red] })), { from: 2.2 });
  slam(ctx, t - k.badge, 830, 150, R(12), () => badge(ctx, 'off3', '-' + G.off + '%', 105, { fill: C.red, size: 76 }), { from: 3 });
  // stock bar
  const left = cellsLeft(t);
  if (t >= k.bar) {
    const a = ss(seg(t, k.bar, k.bar + 0.12)); ctx.save(); ctx.globalAlpha *= a;
    text(ctx, 'instock', 'IN STOCK', { x: BX, y: 445, size: 84, font: LAB, weight: wt, fill: C.white, align: 'left', ls: 6 });
    const done = t >= k.drain0 + k.drainN * k.drainStep + 0.05;
    text(ctx, 'stockn', String(left), { x: BX + 810, y: 440, size: 120, fill: left <= 6 ? C.red : C.yel, align: 'right', sw: 0, rep: done });
    rrect(ctx, BX - 18, BY - BH / 2 - 16, 810 + 36, BH + 32, 18); ctx.fillStyle = '#2b1c17'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = C.white; ctx.stroke();
    for (let i = 0; i < CELLS; i++) {
      const x = BX + i * (BW + BG), n = i + 1;
      if (n <= left) { ctx.fillStyle = n <= 6 ? C.red : n <= 12 ? C.orange : C.yel; ctx.fillRect(x, BY - BH / 2, BW, BH); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, BY - BH / 2, BW * 0.3, BH); }
      else { ctx.fillStyle = '#3a2a24'; ctx.fillRect(x, BY - BH / 2, BW, BH); }
    }
    // drained cells fall away (cell n leaves when left < n; the last cell leaves first)
    for (let j = 0; j <= k.drainN; j++) {
      const n = CELLS - j, u = t - (k.drain0 + j * k.drainStep); if (u < 0 || u > 0.7) continue;
      const x = BX + (n - 1) * (BW + BG) + BW / 2, y = BY + 1100 * u * u - 90 * u + (j % 2 ? 0 : 20), r = ((n * 37) % 11 - 5) * 0.5;
      ctx.save(); ctx.globalAlpha = 1 - u / 0.7; ctx.translate(x + r * 80 * u, y); ctx.rotate(r * u * 3); ctx.fillStyle = n <= 6 ? C.red : n <= 12 ? C.orange : C.yel; ctx.fillRect(-BW / 2, -BH / 2, BW, BH); ctx.restore();
    }
    ctx.restore();
  }
  slam(ctx, t - k.only, 1450, 830, R(-2), () => {
    rrect(ctx, 14 - 400, 16 - 110, 800, 220, 20); ctx.fillStyle = C.yel; ctx.fill(); rrect(ctx, -400, -110, 800, 220, 20); ctx.fillStyle = C.red; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = C.white; ctx.stroke();
    text(ctx, 'only', 'ONLY 3 LEFT', { size: 160, fill: C.white, sw: 0, ls: 2 });
  }, { from: 2.2 });
  slam(ctx, t - k.limited, 855, 880, R(-12), () => badge(ctx, 'ltd', 'LIMITED', 125, { fill: C.yel, ink: C.ink, size: 66, n: 18 }), { from: 3 });
}

// ------------------------------------------------------------------ 5. the coupon: slam, price, perforation, tear
const CW = 1400, CH = 520, CSPLIT = 400;
function coupon(ctx, t) {
  const k = T.coupon; rays(ctx, t, C.ink, '#2a0f0c', 960, 520, 24, 0.07);
  const rip = k.rip, ur = t - rip;
  const kick = ur > 0 ? -26 * Math.exp(-ur * 9) * Math.cos(ur * 30) : 0;                         // the main ticket recoils at the rip
  slam(ctx, t - k.slam, 1110 + kick, 520, R(-4), () => {
    const x = -CW / 2;
    // shadows
    ctx.save(); ctx.translate(16, 18); couponPath(ctx, 'main', CW, CH, CSPLIT); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = 20; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    couponPath(ctx, 'main', CW, CH, CSPLIT); ctx.fillStyle = C.yel; ctx.fill(); ctx.lineWidth = 20; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke();
    // inner frame
    rrect(ctx, x + 40, -CH / 2 + 34, CSPLIT + CW / 2 - 40 - 70, CH - 68, 14); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.setLineDash([22, 12]); ctx.stroke(); ctx.setLineDash([]);
    const cx = -150;
    slam(ctx, t - k.extra, cx, -218, 0, () => text(ctx, 'extra', 'EXTRA', { size: 90, font: LAB, weight: wt, fill: C.red, ls: 22 }), { from: 1.8 });
    slam(ctx, t - k.off, cx, -15, 0, () => text(ctx, 'off', '$10 OFF', { size: 245, fill: C.ink, sw: 0, shadow: [10, 12, C.red] }), { from: 2.2 });
    slam(ctx, t - k.code, cx, 180, 0, () => { rrect(ctx, -320, -52, 640, 104, 14); ctx.fillStyle = C.ink; ctx.fill(); text(ctx, 'code', 'CODE MANGO10', { size: 78, font: LAB, weight: wt, fill: C.yel, ls: 6 }); }, { from: 1.8 });
    // perforation
    ctx.save(); ctx.beginPath(); ctx.moveTo(CSPLIT, -CH / 2 + 30); ctx.lineTo(CSPLIT, CH / 2 - 30); ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.setLineDash([16, 14]); ctx.stroke(); ctx.restore();
    // shine sweep over the main part
    const sh = seg(t, k.shine, k.shine + 0.5); if (sh > 0 && sh < 1) { ctx.save(); couponPath(ctx, 'main', CW, CH, CSPLIT); ctx.clip(); ctx.translate(lerp(-900, 700, sh), 0); ctx.rotate(0.35); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-45, -600, 90, 1200); ctx.fillRect(60, -600, 28, 1200); ctx.restore(); }
    // the stub: peels at the top about the bottom of the perforation, then falls
    const pivot = [CSPLIT, CH / 2]; let ang = 0, px = 0, py = 0, al = 1;
    if (t < rip) { const p = seg(t, k.peel, rip); ang = R(34) * p * p + R(1.5) * Math.sin(t * 80) * p; }
    else { const v = [520, -420]; ang = R(34) + 6.5 * ur; px = v[0] * ur; py = v[1] * ur + 0.5 * 2600 * ur * ur; al = 1 - seg(ur, 0.5, 0.9); }
    if (al > 0) {
      ctx.save(); ctx.globalAlpha *= al; ctx.translate(pivot[0] + px, pivot[1] + py); ctx.rotate(ang); ctx.translate(-pivot[0], -pivot[1]);
      ctx.save(); ctx.translate(16, 18); couponPath(ctx, 'stub', CW, CH, CSPLIT); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = 20; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
      couponPath(ctx, 'stub', CW, CH, CSPLIT); ctx.fillStyle = C.red; ctx.fill(); ctx.lineWidth = 20; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.save(); ctx.translate(550, 0); ctx.rotate(Math.PI / 2); text(ctx, 'stub', 'NO. 0042', { size: 96, font: LAB, weight: wt, fill: C.white, ls: 8, rep: t < rip }); ctx.restore();
      ctx.restore();
    }
  }, { from: 2.4, d: 0.1 });
  // paper bits at the rip
  if (ur > 0) { ctx.save(); ctx.translate(0, 0); confetti(ctx, ur, 1500, 640, 36, 11, 0.7, 0.55); ctx.restore(); }
  if (t >= k.fine) slam(ctx, t - k.fine, 960, 905, 0, () => text(ctx, 'fine', 'ORDERS OVER $30', { size: 88, font: LAB, weight: wt, fill: C.cream, ls: 8 }), { from: 1.4, d: 0.12 });
}

// ------------------------------------------------------------------ 6. the receipt adds up
const ROWS = [['Pebble Kettle', 48, '$29'], ['Halo + Dot Lamp', 178, '$99'], ['Trail Pack', 65, '$39'], ['Coupon MANGO10', null, '-$10']];
function cart(ctx, t) {
  const k = T.cart; rays(ctx, t, C.red, '#e51d14', 1580, 520, 20, 0.12);
  // receipt paper with torn zig-zag ends
  ctx.save(); ctx.translate(14, 16); ctx.fillStyle = C.ink; rcpt(ctx); ctx.restore(); ctx.fillStyle = C.cream; rcpt(ctx);
  ctx.save(); ctx.fillStyle = C.ink;
  for (let i = 0; i < 46; i++) { const w = 3 + ((i * 7) % 5) * 2.2; ctx.fillRect(190 + i * 19, 910, w, 50); }
  ctx.restore();
  ROWS.forEach((r, i) => {
    const y = 245 + i * 128;
    slam(ctx, t - k.rows[i], 0, 0, 0, () => {
      text(ctx, 'r' + i, r[0], { x: 190, y, size: 70, font: LAB, weight: wt, fill: C.ink, align: 'left' });
      if (r[1]) { ctx.save(); ctx.translate(790, y); const w = text(ctx, 'ro' + i, '$' + r[1], { size: 66, fill: '#7d6a50' }); strike(ctx, w, 66, draw01(t - (k.rows[i] + 0.1), 0.1), C.red); ctx.restore(); }
      text(ctx, 'rn' + i, r[2], { x: 1175, y: y + 3, size: 84, fill: i === 3 ? C.red2 : C.ink, align: 'right' });
    }, { from: 1, d: 0.1, dx: -500, sq: 0 });
  });
  ctx.save(); ctx.beginPath(); ctx.moveTo(180, 735); ctx.lineTo(1180, 735); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.setLineDash([18, 12]); ctx.stroke(); ctx.restore();
  slam(ctx, t - k.total, 0, 0, 0, () => {
    text(ctx, 'tot', 'TOTAL', { x: 190, y: 815, size: 96, fill: C.ink, align: 'left' });
    ctx.save(); ctx.translate(690, 815); const w = text(ctx, 'tot0', '$' + TOTAL_WAS, { size: 84, fill: '#7d6a50' }); strike(ctx, w, 84, draw01(t - k.strike, 0.12), C.red); ctx.restore();
  }, { from: 1, d: 0.1, dy: -150, sq: 0 });
  slam(ctx, t - k.newTotal, 1155, 815, R(-2), () => text(ctx, 'tot1', '$' + TOTAL_NOW, { size: 150, fill: C.red, align: 'right', sw: 0, shadow: [6, 8, C.ink] }), { from: 2 });
  // you save
  slam(ctx, t - k.save, 1560, 510, 0, () => {
    ctx.rotate(t * 0.3); burst(ctx, 310, { n: 20, inner: 0.84, fill: C.yel, sw: 10, shadow: [14, 16] }); ctx.rotate(-t * 0.3);
    text(ctx, 'ys', 'YOU SAVE', { y: -172, size: 82, fill: C.ink, ls: 3 });
    const v = Math.round(SAVED * eo(seg(t, k.save, k.save + 0.5))), done = t >= k.save + 0.55;
    text(ctx, 'saved', '$' + (done ? SAVED : v), ST({ y: 45, size: 225, sw: 12, fill: C.red, shadow: [10, 12, C.ink], rep: done }));
  }, { from: 2.4 });
  if (t > k.save && t < k.save + 1.5) coins(ctx, t - k.save, 1560, 700, 24, 5);
}
function rcpt(ctx) {
  ctx.beginPath(); const x0 = 130, x1 = 1230, y0 = 100, y1 = 990, z = 22; ctx.moveTo(x0, y0 + z);
  for (let x = x0; x < x1; x += z * 2) { ctx.lineTo(x + z, y0); ctx.lineTo(x + z * 2, y0 + z); }
  ctx.lineTo(x1, y1 - z); for (let x = x1; x > x0; x -= z * 2) { ctx.lineTo(x - z, y1); ctx.lineTo(x - z * 2, y1 - z); } ctx.closePath(); ctx.fill();
}

// ------------------------------------------------------------------ 7. six more deals
function grid(ctx, t) {
  const k = T.grid; dots(ctx, t, C.yel, C.yel2, 44, 960, 560);
  slam(ctx, t - k.banner, 960, 105, R(-1), () => text(ctx, 'ban', '6 MORE DEALS', ST({ size: 130, sw: 10, fill: C.white, shadow: [8, 10, C.ink] })), { from: 1.8, sq: 0.5 });
  GOODS.grid.forEach((g, i) => {
    const cx = [400, 960, 1520][i % 3], cy = i < 3 ? 410 : 805, t0 = k.cards[i], rot = R(i % 2 ? 1.5 : -1.5);
    slam(ctx, t - t0, cx, cy, rot, () => {
      card(ctx, 520, 350, { r: 30, sw: 9, shadow: [12, 14] });
      ctx.save(); ctx.translate(-150, -5); ICONS[g.icon](ctx, 100); ctx.restore();
      text(ctx, 'g' + i, g.name, { x: 105, y: -105, size: 50, font: LAB, weight: wt, fill: C.ink });
      ctx.save(); ctx.translate(105, -35); const w = text(ctx, 'go' + i, '$' + g.was, { size: 56, fill: '#7d6a50' }); strike(ctx, w, 56, draw01(t - (t0 + k.strikeLag), 0.12), C.red); ctx.restore();
      text(ctx, 'gn' + i, '$' + g.now, ST({ x: 105, y: 78, size: 140, sw: 8, shadow: [6, 8, C.ink], fill: C.red }));
      if (g.off) { ctx.save(); ctx.translate(-195, 105); ctx.rotate(-0.2); badge(ctx, 'goff', '-' + g.off + '%', 70, { fill: C.red, size: 50 }); ctx.restore(); }
    }, { from: 1.9, d: 0.1 });
  });
}

// ------------------------------------------------------------------ 8. the countdown
function count(ctx, t) {
  const k = T.count, r = Math.max(0, k.clock1 - t), sec = Math.floor(r), cs = Math.floor((r - sec) * 100 + 1e-6), n = Math.floor(t - k.clock0);
  const dark = n % 2 === 1, bg = dark ? C.ink : C.red, fg = dark ? C.red : C.ink;
  rays(ctx, t, bg, dark ? '#261310' : '#e51d14', 960, 580, 24, dark ? -0.2 : 0.2);
  marquee(ctx, 0, 100, t, { bg: dark ? C.red : C.ink, fg: C.yel, words: ['SALE', 'MEGA MARKDOWN', 'SALE', 'MANGO LANE'], speed: 260 });
  marquee(ctx, 980, 100, t, { bg: dark ? C.red : C.ink, fg: C.yel, words: ['MANGO LANE', 'SALE', 'MEGA MARKDOWN', 'SALE'], speed: -260 });
  slam(ctx, t - k.label, 960, 255, R(-2), () => text(ctx, 'sstarts', 'SALE STARTS IN', ST({ size: 150, sw: 10, shadow: [10, 12, C.ink], fill: C.white })), { from: 1.8, sq: 0.5 });
  // the clock, glyph by glyph on a fixed pitch (not reported to TEXTS: it changes every frame)
  const kickT = t - Math.floor(t), kick = 1 + (sec <= 3 ? 0.1 : 0.06) * Math.exp(-kickT * 11), str = '00:' + String(sec).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
  ctx.save(); ctx.translate(960, 585); ctx.scale(kick, kick); const size = 420, pw = size * 0.5, cw = size * 0.27; ctx.font = `${size}px ${HEAD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const widths = [...str].map(c => (c === ':' || c === '.') ? cw : pw), tot = widths.reduce((a, b) => a + b, 0); let x = -tot / 2;
  const hot = sec < 3 ? C.white : C.yel;
  for (let pass = 0; pass < 3; pass++) {
    let xx = x;
    [...str].forEach((c, i) => { const cx = xx + widths[i] / 2; if (pass === 0) { ctx.fillStyle = C.ink; ctx.strokeStyle = C.ink; ctx.lineWidth = 36; ctx.strokeText(c, cx + 14, 16); ctx.fillText(c, cx + 14, 16); } else if (pass === 1) { ctx.strokeStyle = C.ink; ctx.lineWidth = 36; ctx.strokeText(c, cx, 0); } else { ctx.fillStyle = hot; ctx.fillText(c, cx, 0); } xx += widths[i]; });
  }
  ctx.restore();
  // bar draining
  const p = r / (k.clock1 - k.clock0); rrect(ctx, 260, 815, 1400, 56, 28); ctx.fillStyle = C.ink; ctx.fill(); rrect(ctx, 268, 823, Math.max(0, 1384 * p), 40, 20); ctx.fillStyle = sec < 3 ? C.white : C.yel; ctx.fill();
  slam(ctx, t - k.label - 0.25, 960, 915, 0, () => text(ctx, 'cdsub', 'SAT 12 OCT  ·  MEGA MARKDOWN', { size: 70, font: LAB, weight: wt, fill: C.white, ls: 6, sw: 6, stroke: C.ink }), { from: 1.4, d: 0.1 });
}

// ------------------------------------------------------------------ 9. the sale is live
function live(ctx, t) {
  const k = T.live; rays(ctx, t, C.yel, C.yel2, 960, 520, 24, 0.5);
  slam(ctx, t - k.burst, 960, 520, 0, () => { ctx.rotate(t * 0.4); burst(ctx, 800, { n: 26, inner: 0.82, fill: C.red, sw: 14, shadow: [20, 24] }); }, { from: 0.05, d: 0.12 });
  slam(ctx, t - k.title, 960, 470, R(-4), () => text(ctx, 'live', 'SALE IS LIVE!', ST({ size: 290, sw: 18, shadow: [16, 18, C.ink], fill: C.white })), { from: 2.4, d: 0.1 });
  slam(ctx, t - k.sub, 960, 735, R(2), () => { rrect(ctx, -420, -80, 840, 160, 14); ctx.fillStyle = C.ink; ctx.fill(); text(ctx, 'livesub', 'MANGO LANE', { size: 130, fill: C.yel, ls: 6 }); }, { from: 2, sq: 0.6 });
  confetti(ctx, t - k.burst, 160, 1140, 150, 21, 0.75, 1.15); confetti(ctx, t - k.burst, 1760, 1140, 150, 22, 0.75, 1.15); confetti(ctx, t - (k.burst + 0.5), 960, 1140, 110, 23, 1.0, 1.25);
  coins(ctx, t - (k.burst + 0.25), 960, 1100, 28, 9);
}

// ------------------------------------------------------------------ 10. end card with the button
function cta(ctx, t) {
  const k = T.cta; rays(ctx, t, C.red, '#e51d14', 960, 540, 22, 0.08);
  slam(ctx, t - k.name, 960, 160, R(-2), () => text(ctx, 'cname', 'MANGO LANE', ST({ size: 210, sw: 14, shadow: [12, 14, C.ink], fill: C.white })), { from: 2.2 });
  slam(ctx, t - k.offer, 960, 385, R(1.5), () => text(ctx, 'coffer', 'UP TO 60% OFF', ST({ size: 150, sw: 11, fill: C.yel })), { from: 2.2 });
  slam(ctx, t - k.dates, 960, 550, R(-2), () => { rrect(ctx, -560, -70, 1120, 140, 12); ctx.fillStyle = C.ink; ctx.fill(); text(ctx, 'cdates', 'SAT 12 – MON 14 OCT', { size: 88, fill: C.white, ls: 5 }); }, { from: 1.8, sq: 0.6 });
  // the button, pressed at k.click
  const pr = t - k.click, press = pr >= 0 ? Math.exp(-pr * 7) * Math.cos(pr * 28) : 0, idle = t > k.button + 0.6 ? 1 + 0.02 * Math.sin((t - k.button) * TAU * 1.0) : 1, down = pr >= 0 && pr < 0.14 ? 1 : 0;
  slam(ctx, t - k.button, 960, 765, 0, () => {
    ctx.scale(idle * (1 - 0.06 * down + 0.03 * press), idle * (1 - 0.1 * down - 0.04 * press));
    const dx = down ? 4 : 14, dy = down ? 5 : 16;
    rrect(ctx, -390 + dx, -85 + dy, 780, 170, 85); ctx.fillStyle = C.ink; ctx.fill();
    rrect(ctx, -390, -85, 780, 170, 85); ctx.fillStyle = C.yel; ctx.fill(); ctx.lineWidth = 11; ctx.strokeStyle = C.ink; ctx.stroke();
    text(ctx, 'shop', 'SHOP NOW', { x: -40, size: 108, fill: C.ink, ls: 4 });
    ctx.beginPath(); ctx.moveTo(250, -42); ctx.lineTo(250, 42); ctx.lineTo(320, 0); ctx.closePath(); ctx.fillStyle = C.red; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke();
  }, { from: 2, sq: 0.8 });
  slam(ctx, t - k.url, 960, 925, 0, () => text(ctx, 'url', 'mangolane.example/sale', { size: 74, font: LAB, weight: wt, fill: C.white, ls: 4, sw: 6, stroke: C.ink }), { from: 1.4, d: 0.12 });
  text(ctx, 'disc', 'MANGO LANE IS A FICTIONAL SHOP  ·  NO REAL OFFER', { x: 960, y: 1035, size: 38, font: LAB, weight: '700', fill: C.cream, ls: 4, alpha: ss(seg(t, k.disclaimer, k.disclaimer + 0.3)) });
  // ripple, confetti, cursor
  if (pr >= 0) {
    for (let i = 0; i < 2; i++) { const q = pr - i * 0.12; if (q > 0 && q < 0.6) { ctx.beginPath(); ctx.arc(1010, 790, 40 + q * 520, 0, TAU); ctx.lineWidth = 12 * (1 - q / 0.6); ctx.strokeStyle = `rgba(255,248,230,${1 - q / 0.6})`; ctx.stroke(); } }
    confetti(ctx, pr, 960, 720, 130, 31, 1.2, 1.0);
  }
  if (t >= k.cursor0) {
    const p = eio(seg(t, k.cursor0, k.click - 0.12)), cx = lerp(1560, 1010, p), cy = lerp(1010, 790, p) + (1 - p) * 0;
    cursor(ctx, cx, cy, down);
  }
}

export const SCENES = { intro, kettle, bundle, stock, coupon, cart, grid, count, live, cta };
