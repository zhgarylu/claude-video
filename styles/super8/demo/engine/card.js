// Title card: a hand-lettered felt-pen card taped to a pine table, a rubber date stamp, a shell and the pen.
// Lettering can be "written on" (o.wr 0..1) glyph by glyph; every glyph is jittered like a hand, not a font.
import { W, H, css, lin, rad, poly, ell, rrect, capsule, canvas, mulberry, hash, clamp, seg, view } from './util.js';

let TABLE = null;
function table() {
  if (TABLE) return TABLE;
  const c = canvas(W + 200, H + 200), g = c.getContext('2d'), r = mulberry(12);
  g.fillStyle = lin(g, 0, 0, 0, c.height, [[0, '#b27a44'], [.5, '#a06a38'], [1, '#8e5c2f']]); g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 260; i++) {                                          // wood grain
    const y0 = r() * c.height, amp = 2 + r() * 6, fr = .004 + r() * .01, ph = r() * 9;
    g.strokeStyle = r() < .6 ? `rgba(70,38,14,${.05 + r() * .09})` : `rgba(230,180,120,${.04 + r() * .06})`; g.lineWidth = .7 + r() * 1.8;
    g.beginPath(); for (let x = 0; x <= c.width; x += 24) g.lineTo(x, y0 + Math.sin(x * fr + ph) * amp + (x * .01)); g.stroke();
  }
  for (const y of [190, 470]) { g.fillStyle = 'rgba(40,20,8,.55)'; g.fillRect(0, y, c.width, 3); g.fillStyle = 'rgba(255,220,170,.18)'; g.fillRect(0, y + 3, c.width, 2); }
  for (let i = 0; i < 4; i++) { const x = 120 + r() * 800, y = 40 + r() * 600; g.fillStyle = 'rgba(60,30,12,.28)'; g.beginPath(); g.ellipse(x, y, 7 + r() * 5, 4, 0, 0, 7); g.fill(); }   // knots
  return TABLE = c;
}

// felt-pen text: per-glyph jitter, a fill plus a same-colour stroke (the marker's wet edge) and a darker second pass
export function felt(ctx, text, x, y, size, font, col, o = {}) {
  const rot = o.rot || 0, jit = o.jit ?? 1, wr = o.wr ?? 1, seed = o.seed || 1, r = mulberry(seed);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `${size}px "${font}"`; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const n = text.length, shown = wr * n; let px = 0;
  const total = ctx.measureText(text).width + (o.track || 0) * (n - 1);
  px = o.center ? -total / 2 : 0;
  for (let i = 0; i < n; i++) {
    const ch = text[i], w = ctx.measureText(ch).width, a = clamp(shown - i);
    const jr = (r() - .5) * .07 * jit, jy = (r() - .5) * size * .05 * jit, js = 1 + (r() - .5) * .06 * jit;
    if (a > 0) {
      ctx.save(); ctx.translate(px + w / 2, jy + (o.arc ? Math.sin((i / Math.max(1, n - 1) - .5) * 2.4) * -size * .1 * o.arc : 0)); ctx.rotate(jr + (o.arc ? ((i / Math.max(1, n - 1)) - .5) * .22 * o.arc : 0)); ctx.scale(js, js);
      if (a < 1) { ctx.beginPath(); ctx.rect(-w / 2 - 4, -size, (w + 8) * a, size * 1.5); ctx.clip(); }
      ctx.fillStyle = css(col); ctx.strokeStyle = css(col); ctx.lineWidth = size * .045;
      ctx.fillText(ch, -w / 2, 0); ctx.strokeText(ch, -w / 2, 0);
      ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = 'rgba(120,40,30,.35)'; ctx.lineWidth = size * .018; ctx.strokeText(ch, -w / 2 + 1.2, 1);   // darker edge where the ink pools
      ctx.restore();
    }
    px += w + (o.track || 0);
  }
  ctx.restore();
}

function squiggle(ctx, x0, y0, x1, y1, amp, col, w, seed, prog = 1) {
  const r = mulberry(seed); ctx.strokeStyle = css(col); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); const N = 40, K = Math.floor(N * prog);
  for (let i = 0; i <= K; i++) { const u = i / N; ctx.lineTo(x0 + (x1 - x0) * u + (r() - .5) * 1.6, y0 + (y1 - y0) * u + Math.sin(u * 22 + seed) * amp + (r() - .5) * 1.6); } ctx.stroke();
}

function stamp(ctx, x, y, rot, text, k = 1, alpha = .88) {
  const t = canvas(300, 110), g = t.getContext('2d'), r = mulberry(88);
  g.strokeStyle = '#5b3f9d'; g.fillStyle = '#5b3f9d'; g.lineWidth = 4; g.strokeRect(6, 6, 288, 98); g.lineWidth = 1.6; g.strokeRect(14, 14, 272, 82);
  g.font = '700 50px "Courier Prime"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 150, 57);
  g.globalCompositeOperation = 'destination-out';                                           // ink starvation: dry specks and a lighter edge
  for (let i = 0; i < 520; i++) { g.fillStyle = `rgba(0,0,0,${.35 + r() * .65})`; const s = .6 + r() * 2.4; g.fillRect(r() * 300, r() * 110, s, s * (.5 + r())); }
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, 300, 14 + r() * 8);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = alpha; ctx.drawImage(t, -150, -55); ctx.restore();
}

function shell(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(30,14,6,.35)'; ctx.filter = 'blur(5px)'; ell(ctx, 8, 14, 52, 38, 'rgba(30,14,6,.45)'); ctx.filter = 'none';
  ctx.fillStyle = lin(ctx, -50, -40, 50, 40, [[0, '#e9c3ae'], [1, '#b8786a']]);
  ctx.beginPath(); ctx.moveTo(-14, 30); ctx.bezierCurveTo(-70, 20, -62, -52, 0, -58); ctx.bezierCurveTo(62, -52, 70, 20, 14, 30); ctx.closePath(); ctx.fill();
  for (let i = -5; i <= 5; i++) { ctx.strokeStyle = `rgba(150,80,60,${.35})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(i * 2.2, 28); ctx.quadraticCurveTo(i * 12, -10, i * 11.2, -50 + Math.abs(i) * 3.2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,245,235,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(i * 2.2 + 3, 28); ctx.quadraticCurveTo(i * 12 + 3, -10, i * 11.2 + 3, -50 + Math.abs(i) * 3.2); ctx.stroke(); }
  rrect(ctx, -16, 26, 32, 14, 5); ctx.fillStyle = '#e9c6b2'; ctx.fill();
  ctx.restore();
}

function pen(ctx, x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.filter = 'blur(4px)'; ctx.fillStyle = 'rgba(30,14,6,.4)'; rrect(ctx, -105, 8, 230, 32, 14); ctx.fill(); ctx.filter = 'none';
  ctx.fillStyle = lin(ctx, 0, -18, 0, 18, [[0, '#e2543a'], [.5, '#c9402b'], [1, '#8f2a1c']]); rrect(ctx, -110, -16, 170, 32, 14); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-100, -11, 150, 4);
  ctx.fillStyle = '#2a2420'; poly(ctx, [[60, -12], [96, -6], [100, 0], [96, 6], [60, 12]], '#2a2420');                       // felt tip
  ctx.fillStyle = '#d6402a'; poly(ctx, [[96, -5], [118, -2], [118, 2], [96, 5]], '#d6402a');
  ctx.fillStyle = '#efe6d0'; ctx.fillRect(40, -17, 22, 34);
  ctx.restore();
}

// o: {t, cam, wr (0..1 write-on progress, default 1)}
export function drawCard(ctx, o) {
  const cam = o.cam, wr = o.wr ?? 1, t = o.t || 0;
  view(ctx, cam, 1, () => {
    ctx.drawImage(table(), -100, -100);
    ctx.fillStyle = rad(ctx, 280, 180, 60, 900, [[0, [255, 226, 170], .28], [1, [255, 226, 170], 0]]); ctx.fillRect(-100, -100, W + 200, H + 200);
    ctx.save(); ctx.translate(W / 2 + 4, H / 2 - 6); ctx.rotate(-.035);
    // card with a soft shadow, slight bend
    ctx.save(); ctx.shadowColor = 'rgba(30,14,6,.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetX = 8; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#efe3c6'; rrect(ctx, -330, -235, 660, 470, 8); ctx.fill(); ctx.restore();
    ctx.fillStyle = lin(ctx, -330, -235, 330, 235, [[0, '#f7edd2'], [.6, '#efe3c6'], [1, '#dccca8']]); rrect(ctx, -330, -235, 660, 470, 8); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, 140, 0, 235, [[0, '#000', 0], [1, '#5a3a1a', .16]]); ctx.fillRect(-330, 140, 660, 95);
    const r = mulberry(404);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = r() < .5 ? 'rgba(120,90,50,.07)' : 'rgba(255,255,245,.12)'; ctx.fillRect(-330 + r() * 660, -235 + r() * 470, 1.4, 1.4); }   // card fibre
    ctx.strokeStyle = 'rgba(140,100,60,.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-318, -222); ctx.lineTo(318, -222); ctx.lineTo(318, 222); ctx.lineTo(-318, 222); ctx.closePath(); ctx.strokeStyle = 'rgba(200,60,40,.0)'; ctx.stroke();
    const st = o.stampT ?? 9;      // seconds since the stamp hit the card
    if (o.end) {
      felt(ctx, 'Dad was', -20, -78, 150, 'Caveat Brush', [42, 94, 168], { center: true, rot: -.02, seed: 21, wr: seg(wr, 0, .35), track: 3 });
      felt(ctx, 'here too.', 10, 64, 150, 'Caveat Brush', [42, 94, 168], { center: true, rot: .015, seed: 22, wr: seg(wr, .33, .72), track: 3 });
      squiggle(ctx, -200, 96, 230, 100, 3.4, [214, 64, 42], 6, 13, seg(wr, .72, .8));
      const dw = seg(wr, .78, 1);                                   // Pip's felt-pen doodle: a stick man with a camera
      if (dw > 0) { ctx.save(); ctx.translate(-230, 168); ctx.strokeStyle = css([232, 140, 30]); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const seq = [() => ctx.arc(0, -42, 14, 0, 6.3), () => { ctx.moveTo(0, -28); ctx.lineTo(0, 10); }, () => { ctx.moveTo(0, -18); ctx.lineTo(-18, 0); ctx.moveTo(0, -18); ctx.lineTo(20, -30); }, () => { ctx.moveTo(0, 10); ctx.lineTo(-12, 40); ctx.moveTo(0, 10); ctx.lineTo(12, 40); }, () => ctx.rect(14, -42, 22, 14)];
        seq.forEach((fn, i) => { if (dw * seq.length > i) { ctx.beginPath(); fn(); ctx.stroke(); } }); ctx.restore(); }
      if (st >= 0) { const k = 1 + .18 * Math.max(0, 1 - st / .1); stamp(ctx, 190, 188, .1, '14 AUG 76', k, .8); }
    } else {
    felt(ctx, 'ALDERSEA', 0, -52, 170, 'Caveat Brush', [214, 64, 42], { center: true, arc: .8, seed: 5, wr: seg(wr, 0, .55), track: 4 });
    squiggle(ctx, -250, -22, 252, -16, 3.6, [42, 94, 168], 7, 3, seg(wr, .5, .62));
    squiggle(ctx, -236, -2, 238, 4, 3.0, [42, 94, 168], 5, 8, seg(wr, .55, .66));
    felt(ctx, 'summer ’76', -10, 88, 92, 'Reenie Beanie', [42, 94, 168], { center: true, rot: -.02, seed: 9, wr: seg(wr, .62, .86), track: 2 });
    // doodles: a sun with rays, three waves
    const sw = seg(wr, .84, 1);
    if (sw > 0) {
      ctx.save(); ctx.translate(-236, 150); ctx.strokeStyle = css([232, 169, 30]); ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, 6.3 * clamp(sw * 2)); ctx.stroke();
      for (let i = 0; i < 9; i++) { if (sw * 9 > i + 2) { const a = i / 9 * 6.28; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 34, Math.sin(a) * 34); ctx.lineTo(Math.cos(a) * (46 + (i % 2) * 7), Math.sin(a) * (46 + (i % 2) * 7)); ctx.stroke(); } }
      ctx.restore();
      for (let k = 0; k < 3; k++) squiggle(ctx, -90 - k * 6, 150 + k * 22, 40 - k * 6, 148 + k * 22, 5, [42, 130, 168], 5.5, 20 + k, seg(sw, .3 + k * .15, .7 + k * .15));
    }
    if (st >= 0) { const k = 1 + .18 * Math.max(0, 1 - st / .1); stamp(ctx, 190, 190, -.07, '14 AUG 76', k); }
    }
    // masking tape at the top corners
    for (const [tx, ty, tr] of [[-300, -218, -.7], [304, -218, .72]]) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(tr); ctx.fillStyle = 'rgba(224,206,160,.78)'; ctx.fillRect(-42, -15, 84, 30); ctx.strokeStyle = 'rgba(140,110,70,.35)'; ctx.lineWidth = 1; ctx.strokeRect(-42, -15, 84, 30); ctx.restore(); }
    ctx.restore();
    shell(ctx, 100, 640, .8, .5); pen(ctx, 790, 650, -.18);
    // a few grains of sand on the table
    const rs = mulberry(66); for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(235,214,170,${.4 + rs() * .5})`; ctx.fillRect(rs() * W, 40 + rs() * 680, 2, 2); }
  });
}
