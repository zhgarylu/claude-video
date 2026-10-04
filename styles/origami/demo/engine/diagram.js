// diagram.js: the origami diagram layer: dashed valley lines, dash-dot mountain lines, curved fold arrows, step badges.
// Drawn in 2D over the 3D frame, from world points through the camera, so it follows every camera move.
import * as THREE from 'three';

export const INK = '#1c2748', HALO = 'rgba(247,242,230,.92)';

// project a world point; returns [x, y, visible]
export const proj = (world, v) => world.px(v);

function stroke(ctx, pts, { w = 3, col = INK, dash = null, halo = true, cap = 'round' } = {}) {
  ctx.save(); ctx.lineCap = cap; ctx.lineJoin = 'round';
  if (halo) { ctx.strokeStyle = HALO; ctx.lineWidth = w + 4.5; ctx.setLineDash([]); path(ctx, pts); ctx.stroke(); }
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); path(ctx, pts); ctx.stroke(); ctx.restore();
}
function path(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); }

// reveal in [0,1]: how much of the polyline is drawn (lines grow along themselves)
function part(pts, reveal) {
  if (reveal >= 1) return pts; if (reveal <= 0) return [];
  let L = 0; const ls = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(d); L += d; }
  let r = L * reveal; const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { if (r >= ls[i - 1]) { out.push(pts[i]); r -= ls[i - 1]; } else { const t = r / ls[i - 1]; out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]); break; } }
  return out;
}

// a crease line between two world points. kind: 'valley' (dashes) or 'mountain' (dash and dot)
export function creaseLine(ctx, world, A, B, { kind = 'valley', reveal = 1, scale = 1, col = INK, thin = false } = {}) {
  const n = 24, pts = []; for (let i = 0; i <= n; i++) pts.push(world.px(A.clone().lerp(B, i / n)));
  const s = thin ? 1 : scale, dash = kind === 'valley' ? [13 * s, 8 * s] : [20 * s, 6 * s, 3.5 * s, 6 * s];
  stroke(ctx, part(pts, reveal), { w: thin ? 2 : 3 * s, col, dash, halo: !thin });
}

// a curved fold arrow from world A to world B, bulging up by `lift` metres (the path the flap will travel).
// `back` draws a small hollow tail for "fold and unfold".
export function foldArrow(ctx, world, A, B, { lift = .09, reveal = 1, scale = 1, col = INK, sideways = 0 } = {}) {
  const C = A.clone().lerp(B, .5); C.y += lift * 2; const side = new THREE.Vector3().subVectors(B, A); side.set(-side.z, 0, side.x).normalize().multiplyScalar(sideways); C.add(side);
  const n = 32, pts = [], w3 = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; const p = new THREE.Vector3().addScaledVector(A, a).addScaledVector(C, b).addScaledVector(B, c); w3.push(p); pts.push(world.px(p)); }
  const shown = part(pts, reveal); stroke(ctx, shown, { w: 3.2 * scale, col });
  if (reveal > .98) {   // arrowhead (solid, as in diagrams)
    const p1 = pts[n], p0 = pts[n - 3], a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), L = 26 * scale, hw = 11 * scale;
    ctx.save(); ctx.translate(p1[0], p1[1]); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(4 * scale, 0); ctx.lineTo(-L, -hw); ctx.lineTo(-L * .72, 0); ctx.lineTo(-L, hw); ctx.closePath();
    ctx.fillStyle = col; ctx.strokeStyle = HALO; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); ctx.restore();
  }
}

// the step badge: a numbered circle, like the step numbers in an instruction sheet
export function badge(ctx, x, y, text, { scale = 1, alpha = 1, font = '700 30px Fredoka, sans-serif' } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; const r = 26 * scale;
  ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.fillStyle = HALO; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = INK; ctx.fill();
  ctx.fillStyle = '#f6f0e2'; ctx.font = font.replace('30px', Math.round(30 * scale) + 'px'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 2 * scale); ctx.restore();
}

// a key for the two crease kinds, in screen space (a paper-card plate with ink samples)
export function legend(ctx, x, y, { scale = 1, valley = 'valley fold', mountain = 'mountain fold', col = INK } = {}) {
  const s = scale, w = 330 * s, h = 112 * s;
  ctx.save();
  ctx.fillStyle = 'rgba(247,242,230,.94)'; ctx.strokeStyle = 'rgba(28,39,72,.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10 * s); ctx.fill(); ctx.stroke();
  ctx.font = `600 ${Math.round(27 * s)}px Fredoka, sans-serif`; ctx.fillStyle = col; ctx.textBaseline = 'middle';
  [[valley, [13 * s, 8 * s], 36], [mountain, [20 * s, 6 * s, 3.5 * s, 6 * s], 78]].forEach(([label, dash, dy]) => {
    ctx.setLineDash(dash); ctx.lineWidth = 3 * s; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x + 24 * s, y + dy * s); ctx.lineTo(x + 124 * s, y + dy * s); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillText(label, x + 142 * s, y + dy * s + 1);
  });
  ctx.restore();
}
