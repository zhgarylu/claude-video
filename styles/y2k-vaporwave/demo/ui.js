// 2D overlay: early-web windows (generic bevelled dialogs), pixel cursor, palm silhouettes, sparkles, captions.
// Nothing here imitates a real operating system: the chrome is lavender-silver with a pink→violet→cyan title bar.
import { clamp, lerp, seg, ss, back, hash, TAU } from '/core/lib.js';

export const COL = {
  face: '#d4cdf4', hi: '#ffffff', mid: '#9d93d8', shade: '#5a4aa0', dark: '#24114f', ink: '#2a1a66',
  pink: '#ff4fc3', cyan: '#3fe8ff', violet: '#7a4dff', sun: '#ffe45e',
};

// pop-open: fast overshoot, a bit of squash. p = 0..1 open, negative close handled by caller (pass 1-p reversed)
export function popScale(p) { const k = back(clamp(p), 2.4); return { s: lerp(.55, 1, k), a: ss(clamp(p * 5)) }; }

function bevel(ctx, x, y, w, h, inv = false, face = COL.face) {
  ctx.fillStyle = face; ctx.fillRect(x, y, w, h);
  const a = inv ? COL.shade : COL.hi, b = inv ? COL.hi : COL.shade;
  ctx.fillStyle = a; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
  ctx.fillStyle = b; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h);
  ctx.fillStyle = inv ? COL.dark : COL.mid; ctx.fillRect(x + 2, y + h - 4, w - 4, 2); ctx.fillRect(x + w - 4, y + 2, 2, h - 4);
}
function button(ctx, x, y, w, h, label, pressed = false, dim = false) {
  bevel(ctx, x, y, w, h, pressed);
  ctx.font = '700 17px Silkscreen'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = dim ? COL.mid : COL.ink; ctx.fillText(label, x + w / 2 + (pressed ? 2 : 0), y + h / 2 + 1 + (pressed ? 2 : 0));
}

// the three title-bar buttons: tiny glyphs
function capButtons(ctx, x, y) {
  for (let i = 0; i < 3; i++) {
    const bx = x + i * 30; bevel(ctx, bx, y, 26, 24);
    ctx.fillStyle = COL.ink;
    if (i === 0) ctx.fillRect(bx + 7, y + 15, 10, 3);
    if (i === 1) { ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.strokeRect(bx + 7, y + 6, 11, 10); ctx.fillRect(bx + 7, y + 6, 11, 3); }
    if (i === 2) { ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + 8, y + 7); ctx.lineTo(bx + 18, y + 17); ctx.moveTo(bx + 18, y + 7); ctx.lineTo(bx + 8, y + 17); ctx.stroke(); }
  }
}

export function progressBar(ctx, x, y, w, h, frac, t = 0) {
  bevel(ctx, x, y, w, h, true, '#f3efff');
  const ix = x + 6, iy = y + 6, iw = w - 12, ih = h - 12, bw = 16, gap = 4;
  const n = Math.floor(iw / (bw + gap)), lit = Math.floor(n * clamp(frac));
  for (let i = 0; i < lit; i++) {
    const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
    const k = i / Math.max(1, n - 1);
    const c = k < .5 ? mix3([63, 232, 255], [190, 120, 255], k * 2) : mix3([190, 120, 255], [255, 79, 195], (k - .5) * 2);
    g.addColorStop(0, rgb(mix3(c, [255, 255, 255], .65))); g.addColorStop(.45, rgb(c)); g.addColorStop(1, rgb(mix3(c, [60, 20, 110], .35)));
    ctx.fillStyle = g; ctx.fillRect(ix + i * (bw + gap), iy, bw, ih);
  }
}
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const rgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;

// a window: {x,y,w,h, title, p (pop 0..1), kind, ...}
export function drawWindow(ctx, W, t) {
  const { s, a } = popScale(W.p); if (a <= 0.01) return;
  const cx = W.x + W.w / 2, cy = W.y + W.h / 2;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(cx, cy); ctx.scale(s, s * (1 + (1 - s) * .5)); ctx.translate(-cx, -cy);
  // hard drop shadow (retro, offset, translucent violet)
  ctx.fillStyle = 'rgba(40,10,90,.42)'; ctx.fillRect(W.x + 12, W.y + 12, W.w, W.h);
  bevel(ctx, W.x, W.y, W.w, W.h);
  // title bar
  const tb = ctx.createLinearGradient(W.x, 0, W.x + W.w, 0);
  tb.addColorStop(0, '#ff4fc3'); tb.addColorStop(.5, '#8a5cff'); tb.addColorStop(1, '#3fe8ff');
  ctx.fillStyle = tb; ctx.fillRect(W.x + 5, W.y + 5, W.w - 10, 34);
  const gl = ctx.createLinearGradient(0, W.y + 5, 0, W.y + 39);
  gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,40,.25)');
  ctx.fillStyle = gl; ctx.fillRect(W.x + 5, W.y + 5, W.w - 10, 34);
  ctx.font = '700 19px Silkscreen'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(40,10,90,.6)'; ctx.fillText(W.title, W.x + 17, W.y + 24); ctx.fillStyle = '#fff'; ctx.fillText(W.title, W.x + 15, W.y + 22);
  capButtons(ctx, W.x + W.w - 100, W.y + 10);
  // client area
  const cx0 = W.x + 8, cy0 = W.y + 44, cw = W.w - 16, ch = W.h - 52;
  bevel(ctx, cx0, cy0, cw, ch, true, COL.face);
  W.draw && W.draw(ctx, cx0 + 4, cy0 + 4, cw - 8, ch - 8, t, W);
  ctx.restore();
}

// content painters
export const painters = {
  install(ctx, x, y, w, h, t, W) {
    gem(ctx, x + 44, y + 52, 30, t);
    ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '30px VT323';
    ctx.fillText(W.line1 || 'Installing Summer 1.0', x + 96, y + 40);
    ctx.fillStyle = COL.shade; ctx.fillText(W.line2 || 'copying: sunscreen.dll', x + 96, y + 72);
    progressBar(ctx, x + 22, y + 104, w - 44, 46, W.frac || 0, t);
    ctx.fillStyle = COL.ink; ctx.textAlign = 'right'; ctx.font = '30px VT323'; ctx.fillText(Math.floor((W.frac || 0) * 100) + '%', x + w - 24, y + 182);
    ctx.textAlign = 'left'; ctx.fillStyle = COL.shade; ctx.fillText(W.line3 || 'about 1 afternoon remaining', x + 24, y + 182);
    button(ctx, x + w - 232, y + h - 54, 100, 38, '< BACK', false, true); button(ctx, x + w - 122, y + h - 54, 100, 38, 'CANCEL', false, false);
  },
  dialog(ctx, x, y, w, h, t, W) {
    gem(ctx, x + 56, y + 56, 34, t);
    ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '32px VT323';
    const L = W.lines || ['Setup is complete.']; L.forEach((s, i) => ctx.fillText(s, x + 112, y + 46 + i * 34));
    const bs = W.buttons || ['OK'];
    bs.forEach((b, i) => button(ctx, x + w - (bs.length - i) * 128 + 12, y + h - 58, 112, 40, b, W.press === i));
  },
  list(ctx, x, y, w, h, t, W) {
    ctx.font = '26px VT323'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    bevel(ctx, x + 10, y + 8, w - 20, h - 20, true, '#f7f4ff');
    (W.items || []).forEach((it, i) => {
      const yy = y + 40 + i * 30; const on = i < (W.done || 0);
      ctx.fillStyle = on ? COL.violet : COL.mid; ctx.fillRect(x + 26, yy - 16, 14, 14); if (on) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 29, yy - 13, 8, 8); }
      ctx.fillStyle = on ? COL.ink : COL.mid; ctx.fillText(it, x + 52, yy);
    });
  },
};

// a faceted candy gem as the "program icon": generic, no brand shapes
function gem(ctx, x, y, r, t) {
  const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.25, '#ffd1f2'); g.addColorStop(.7, '#ff4fc3'); g.addColorStop(1, '#6a2cc8');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#24114f'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(x - r * .35, y - r * .42, r * .28, r * .14, -.6, 0, TAU); ctx.fill();
}

// ---- pixel cursor (generic arrow) ----
const ARROW = [
  '1', '11', '121', '1221', '12221', '122221', '1222221', '12222221', '122222221', '1222222221', '12222211111', '1221221', '121 1221', '11  1221', '1    1221', '     1221', '      11'];
export function cursor(ctx, x, y, s = 3, press = false) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (press) ctx.translate(1, 1);
  ARROW.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = row[i]; if (c === ' ') continue; ctx.fillStyle = c === '1' ? '#1a0a3a' : '#fff'; ctx.fillRect(i * s, j * s, s, s); } });
  ctx.restore();
}

// ---- palms: dark violet silhouette with a pink rim light ----
export function palm(ctx, x, y, h, lean, t, flip = 1, seed = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
  const sway = Math.sin(t * .6 + seed) * .035;
  const pts = []; const N = 18;
  for (let i = 0; i <= N; i++) { const k = i / N; pts.push([lean * h * k * k + sway * h * k * k * 1.4, -h * k]); }
  const top = pts[N];
  for (const pass of [0, 1]) {
    const ox = pass === 0 ? 3.5 : 0, oy = pass === 0 ? -3 : 0;
    ctx.fillStyle = pass === 0 ? '#ff5fc8' : '#1c0846';
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const w = lerp(h * .028, h * .014, i / N); ctx.lineTo(pts[i][0] - w + ox, pts[i][1] + oy); }
    for (let i = N; i >= 0; i--) { const w = lerp(h * .028, h * .014, i / N); ctx.lineTo(pts[i][0] + w + ox, pts[i][1] + oy); }
    ctx.fill();
    for (let f = 0; f < 10; f++) {
      const ang = -Math.PI / 2 + (f - 4.5) * .40 + sway * 2 + Math.sin(t * .8 + f) * .02;
      const len = h * (.40 + .07 * hash(seed + f * 3.1)) * (1 - Math.abs(f - 4.5) * .02);
      const droop = h * (.20 + Math.abs(f - 4.5) * .04);
      const sx = top[0] + ox, sy = top[1] + oy;
      const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len * .8 + droop;
      const mx = sx + Math.cos(ang) * len * .55, my = sy + Math.sin(ang) * len * .95 - h * .04;
      const M = 26; let prev = [sx, sy];
      ctx.lineWidth = h * .006; ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy);
      const rib = [];
      for (let i = 0; i <= M; i++) {
        const k = i / M, px = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * mx + k * k * ex, py = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * my + k * k * ey;
        const dx = 2 * (1 - k) * (mx - sx) + 2 * k * (ex - mx), dy = 2 * (1 - k) * (my - sy) + 2 * k * (ey - my); const dl = Math.hypot(dx, dy) || 1;
        rib.push([px, py, dx / dl, dy / dl]); ctx.lineTo(px, py);
      }
      ctx.stroke();
      // leaflets: long thin triangles that sweep forward and droop
      for (let i = 2; i <= M; i++) {
        const [px, py, tx, ty] = rib[i], k = i / M;
        const L = h * .17 * Math.pow(Math.sin(Math.PI * Math.min(.98, k * .96 + .04)), .65) * (.85 + .15 * hash(seed + f * 7 + i));
        for (const sd of [-1, 1]) {
          const nx = -ty * sd, ny = tx * sd;
          const bx = px + (nx * .55 + tx * .55) * L, by = py + (ny * .55 + ty * .55) * L + L * .75;
          const w = h * .0075;
          ctx.beginPath(); ctx.moveTo(px - tx * w, py - ty * w); ctx.lineTo(bx, by); ctx.lineTo(px + tx * w, py + ty * w); ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

// four-point sparkle, additive
export function sparkle(ctx, x, y, s, a, col = '255,255,255', rot = 0) {
  if (a <= .01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * .8);
  g.addColorStop(0, `rgba(${col},${a * .9})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * .8, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * .06, -s * .06, s, 0); ctx.quadraticCurveTo(s * .06, s * .06, 0, s); ctx.quadraticCurveTo(-s * .06, s * .06, -s, 0); ctx.quadraticCurveTo(-s * .06, -s * .06, 0, -s); ctx.fill();
  ctx.restore();
}

// captions: WordArt-like chrome gradient with a hard shadow; never over the subject's middle
export function caption(ctx, text, x, y, a = 1, size = 38) {
  if (!text || a <= .01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${size}px Unbounded`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(30,8,80,.85)'; ctx.strokeText(text, x + 3, y + 4);
  ctx.lineWidth = 8; ctx.strokeStyle = '#2a1170'; ctx.strokeText(text, x, y);
  const g = ctx.createLinearGradient(0, y - size * .6, 0, y + size * .6);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.48, '#ffc9f0'); g.addColorStop(.52, '#7ff0ff'); g.addColorStop(1, '#d9b4ff');
  ctx.fillStyle = g; ctx.fillText(text, x, y);
  ctx.restore();
}
