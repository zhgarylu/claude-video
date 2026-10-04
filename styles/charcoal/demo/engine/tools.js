// Things that sit ABOVE the paper: the stick, pencil, eraser and thumb with their cast shadows, drawing pins,
// the caption slip. All vector, drawn per frame in world space (the sheet transform is already applied) except the slip.
import { mulberry, clamp, lerp } from '/core/lib.js';
import { W, H, MARGIN } from './sheet.js';

function shadowed(ctx, lift, fn) {
  ctx.save(); ctx.filter = `blur(${5 + lift * 7}px)`; ctx.fillStyle = `rgba(0,0,0,${0.30 - lift * 0.1})`;
  ctx.translate(12 + lift * 34, 17 + lift * 44); fn(); ctx.restore();
}
function bodyPath(ctx, len, w0, w1, tipTaper) {
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tipTaper, -w0 / 2); ctx.lineTo(len, -w1 / 2); ctx.lineTo(len, w1 / 2); ctx.lineTo(tipTaper, w0 / 2); ctx.closePath();
}

export function drawTool(ctx, tl, z = 1) {
  if (!tl) return;
  const { tool, x, y, lift } = tl;
  const lf = clamp(lift), ks = 0.8 / z;
  ctx.save(); ctx.translate(x, y); ctx.scale(ks, ks);
  if (tool === 'stick' || tool === 'sanguine') {
    const ang = -Math.PI * 0.20, len = 300, w = 24; const red = tool === 'sanguine';
    const draw = (shadow) => {
      ctx.save(); ctx.rotate(ang); ctx.translate(0, -lf * 26);
      bodyPath(ctx, len, 7, w, 26);
      if (shadow) { ctx.fill(); } else {
        const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
        if (red) { g.addColorStop(0, '#b5503c'); g.addColorStop(0.45, '#8f3524'); g.addColorStop(1, '#5c2016'); }
        else { g.addColorStop(0, '#4a4540'); g.addColorStop(0.4, '#2a2623'); g.addColorStop(1, '#141210'); }
        ctx.fillStyle = g; ctx.fill();
        // crumbly tip
        ctx.fillStyle = red ? '#6a2619' : '#0e0d0c'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, -3.5); ctx.lineTo(26, 3.5); ctx.closePath(); ctx.fill();
        // paper wrap on the far half
        const wg = ctx.createLinearGradient(0, -w / 2, 0, w / 2); wg.addColorStop(0, '#e7dfcb'); wg.addColorStop(0.5, '#cdc3ab'); wg.addColorStop(1, '#8e8570');
        ctx.fillStyle = wg; ctx.fillRect(len * 0.5, -w / 2 + 0.5, len * 0.5, w - 1);
        ctx.fillStyle = 'rgba(40,36,30,0.55)'; ctx.fillRect(len * 0.5, -w / 2 + 0.5, 3, w - 1);
        ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(26, -w / 2 + 1.5, len - 26, 2);
      }
      ctx.restore();
    };
    shadowed(ctx, lf, () => draw(true)); draw(false);
  } else if (tool === 'graphite') {
    const ang = -Math.PI * 0.24, len = 280, w = 11;
    const draw = (shadow) => {
      ctx.save(); ctx.rotate(ang); ctx.translate(0, -lf * 22);
      if (shadow) { bodyPath(ctx, len, 2, w, 60); ctx.fill(); }
      else {
        // wooden cone, graphite core, lacquered body
        ctx.fillStyle = '#c9b99a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, -w / 2); ctx.lineTo(60, w / 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3c3d40'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -2.2); ctx.lineTo(16, 2.2); ctx.closePath(); ctx.fill();
        const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, '#5a5c60'); g.addColorStop(0.5, '#2e3033'); g.addColorStop(1, '#17181a');
        ctx.fillStyle = g; ctx.fillRect(60, -w / 2, len - 60, w);
        ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(60, -w / 2 + 1.2, len - 60, 1.6);
      }
      ctx.restore();
    };
    shadowed(ctx, lf, () => draw(true)); draw(false);
  } else if (tool === 'eraser') {
    // a block of kneaded eraser: a rounded slab with a lit top face, a darker front edge, charcoal worked into one corner
    const slab = (dy) => { ctx.beginPath(); ctx.roundRect(-62, -34 + dy, 124, 68, 14); };
    const draw = (shadow) => {
      ctx.save(); ctx.translate(40, -40 - lf * 28); ctx.rotate(-0.38);
      if (shadow) { slab(14); ctx.fill(); }
      else {
        slab(14); ctx.fillStyle = '#4a4946'; ctx.fill();                                  // the front edge
        slab(0); const g = ctx.createLinearGradient(-62, -34, 62, 34); g.addColorStop(0, '#b4b3ae'); g.addColorStop(0.6, '#8f8e8a'); g.addColorStop(1, '#6d6c68');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.save(); slab(0); ctx.clip();
        const dg = ctx.createRadialGradient(-44, 22, 2, -44, 22, 50); dg.addColorStop(0, 'rgba(22,20,18,0.62)'); dg.addColorStop(1, 'rgba(22,20,18,0)'); ctx.fillStyle = dg; ctx.fillRect(-70, -40, 140, 80);
        const dg2 = ctx.createRadialGradient(30, -10, 2, 30, -10, 30); dg2.addColorStop(0, 'rgba(22,20,18,0.28)'); dg2.addColorStop(1, 'rgba(22,20,18,0)'); ctx.fillStyle = dg2; ctx.fillRect(-70, -40, 140, 80);
        ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillRect(-60, -33, 120, 3);
        ctx.restore();
      }
      ctx.restore();
    };
    shadowed(ctx, lf, () => draw(true)); draw(false);
  } else if (tool === 'thumb') {
    // a smudge-stained thumb: soft, cool and grey, dirty at the tip, with ridge arcs of its print; never skin-coloured, never an outline
    const draw = (shadow) => {
      ctx.save(); ctx.translate(26, -22 - lf * 20); ctx.rotate(-0.6);
      ctx.filter = shadow ? 'none' : 'blur(3px)';
      ctx.beginPath(); ctx.moveTo(0, -42); ctx.bezierCurveTo(90, -50, 200, -58, 290, -72); ctx.lineTo(290, 72); ctx.bezierCurveTo(200, 58, 90, 50, 0, 42); ctx.bezierCurveTo(-56, 40, -56, -40, 0, -42); ctx.closePath();
      if (shadow) ctx.fill(); else {
        const g = ctx.createLinearGradient(-50, 0, 290, 0); g.addColorStop(0, 'rgba(34,32,30,0.62)'); g.addColorStop(0.22, 'rgba(96,94,90,0.44)'); g.addColorStop(1, 'rgba(150,148,142,0.0)');
        ctx.fillStyle = g; ctx.fill();
        ctx.save(); ctx.clip(); ctx.filter = 'none'; ctx.strokeStyle = 'rgba(20,18,16,0.32)'; ctx.lineWidth = 1.6;
        for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(-8, 2, 14 + i * 7, 10 + i * 5.2, 0, -1.2, 1.2); ctx.stroke(); }
        ctx.restore();
      }
      ctx.restore();
    };
    shadowed(ctx, lf, () => draw(true)); draw(false);
  }
  ctx.restore();
}

// drawing pins in the paper's corners
export function drawPins(ctx, inset = 40) {
  const P = [[MARGIN + inset, MARGIN + inset], [W - MARGIN - inset, MARGIN + inset], [MARGIN + inset, H - MARGIN - inset], [W - MARGIN - inset, H - MARGIN - inset]];
  P.forEach(([x, y], k) => {
    ctx.save(); ctx.translate(x, y);
    // paper dent / ripple around the pin
    const rg = ctx.createRadialGradient(0, 0, 8, 0, 0, 46); rg.addColorStop(0, 'rgba(0,0,0,0.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 46, 0, 7); ctx.fill();
    ctx.save(); ctx.filter = 'blur(4px)'; ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(9, 12, 17, 13, 0.5, 0, 7); ctx.fill(); ctx.restore();
    const g = ctx.createRadialGradient(-5, -6, 1, 0, 0, 17); g.addColorStop(0, '#f2f2ef'); g.addColorStop(0.35, '#b5b6b3'); g.addColorStop(1, '#4f504f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-5, -6, 4.5, 2.6, -0.7, 0, 7); ctx.fill();
    ctx.restore();
  });
}

// a torn slip of paper with graphite handwriting, in SCREEN space
let grainTile = null;
function grain() {
  if (grainTile) return grainTile; const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), id = x.createImageData(256, 256), r = mulberry(99);
  for (let i = 0; i < 256 * 256; i++) { id.data[i * 4 + 3] = r() < 0.34 ? 255 : 0; } x.putImageData(id, 0, 0); return (grainTile = c);
}
export function drawSlip(ctx, text, cx, cy, { size = 52, alpha = 1, font = "500 52px Caveat", tilt = -0.012, w = null } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(tilt);
  ctx.font = font; const lines = text.split('\n'), tw = Math.max(...lines.map(l => ctx.measureText(l).width)), lh = size * 1.05;
  const pw = (w ?? tw) + 74, ph = lines.length * lh + 44, r = mulberry(5 + text.length);
  // deckle polygon
  const poly = []; const seg = 36;
  for (let i = 0; i <= seg; i++) poly.push([-pw / 2 + pw * i / seg, -ph / 2 + (r() - 0.5) * 3.2]);
  for (let i = 1; i <= 8; i++) poly.push([pw / 2 + (r() - 0.5) * 3, -ph / 2 + ph * i / 8]);
  for (let i = 1; i <= seg; i++) poly.push([pw / 2 - pw * i / seg, ph / 2 + (r() - 0.5) * 3.2]);
  for (let i = 1; i < 8; i++) poly.push([-pw / 2 + (r() - 0.5) * 3, ph / 2 - ph * i / 8]);
  const path = () => { ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); };
  ctx.save(); ctx.filter = 'blur(7px)'; ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.translate(6, 10); path(); ctx.fill(); ctx.restore();
  path(); const pg = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2); pg.addColorStop(0, '#e6decb'); pg.addColorStop(1, '#d8cfb8'); ctx.fillStyle = pg; ctx.fill();
  ctx.save(); path(); ctx.clip(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#000'; for (let i = 0; i < 180; i++) ctx.fillRect(-pw / 2 + r() * pw, -ph / 2 + r() * ph, 1 + r() * 2, 1); ctx.restore();
  // graphite text with tooth: draw text, then knock out grain
  const tc = document.createElement('canvas'); tc.width = Math.ceil(pw); tc.height = Math.ceil(ph); const t = tc.getContext('2d');
  t.font = font; t.fillStyle = '#35373b'; t.textBaseline = 'middle'; t.textAlign = 'left';
  lines.forEach((l, i) => t.fillText(l, 37, ph / 2 + (i - (lines.length - 1) / 2) * lh + 2));
  t.globalCompositeOperation = 'destination-out'; t.fillStyle = t.createPattern(grain(), 'repeat'); t.globalAlpha = 0.55; t.fillRect(0, 0, tc.width, tc.height);
  ctx.drawImage(tc, -pw / 2, -ph / 2);
  ctx.restore();
}

export function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
