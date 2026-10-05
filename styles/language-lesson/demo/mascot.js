// mascot.js: Pip, a round owl-teacher built from a few original shapes (egg body, round glasses, a pencil behind one ear tuft).
import { C, rr } from './kit.js';
const rad = d => d * Math.PI / 180;

// pose values: wl/wr = wing angle from "hanging" (0 = down, 90 = out, 180 = up; negative = across the chest)
export const POSES = {
  idle:  { wl: 10, wr: 10, tilt: 0, lx: 0, ly: 0, bl: 0, br: 0, ba: 0, sq: 0, lean: 0 },
  ask:   { wl: 12, wr: 118, tilt: -5, lx: .2, ly: -.3, bl: .8, br: .9, ba: 0, sq: 0, lean: 0 },          // a wing up: "my question"
  think: { wl: 12, wr: -88, tilt: 7, lx: .7, ly: -.9, bl: .1, br: .7, ba: .4, sq: 0, lean: 0 },         // wing on the chin, eyes up and away
  point: { wl: 10, wr: 62, tilt: 4, lx: .2, ly: .8, bl: .2, br: .2, ba: 0, sq: 0, lean: .04 },           // wing out and down toward the card
  clue:  { wl: 10, wr: 74, tilt: 6, lx: .3, ly: 1, bl: .6, br: .2, ba: .2, sq: 0, lean: .06 },
  cheer: { wl: 150, wr: 150, tilt: 0, lx: 0, ly: -.2, bl: .9, br: .9, ba: 0, sq: 1, lean: 0 },
  read:  { wl: 40, wr: 40, tilt: 0, lx: 0, ly: .2, bl: .3, br: .3, ba: 0, sq: .15, lean: 0 },           // "repeat after me", wings open
  wave:  { wl: 12, wr: 140, tilt: 6, lx: .1, ly: -.1, bl: .7, br: .7, ba: 0, sq: .6, lean: 0 },
};
export const blend = (a, b, k) => { const o = {}; for (const key in a) o[key] = a[key] + (b[key] - a[key]) * k; return o; };

const wing = (ctx, ang, fill) => {
  ctx.save(); ctx.rotate(-rad(ang));
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(40, 8, 50, 92, 12, 152); ctx.bezierCurveTo(-4, 164, -22, 104, -28, 40); ctx.bezierCurveTo(-30, 14, -14, 0, 0, 0);
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = 'rgba(42,33,24,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, 70); ctx.lineTo(0, 100); ctx.moveTo(-8, 60); ctx.lineTo(-12, 90); ctx.stroke();
  ctx.restore();
};

// x,y = the feet; s = scale; P = pose + {mouth, blink, bob, hop, lookX, lookY}
export function drawPip(ctx, x, y, s, P) {
  const body = '#f6b53c', bodyDk = '#e39a1f', cream = '#fff1cf', beak = '#ff8a2a', INK = C.ink;
  ctx.save(); ctx.translate(x, y + (P.hop ? -P.hop : 0)); ctx.scale(s, s);
  // floor shadow
  ctx.save(); ctx.scale(1, .16); ctx.beginPath(); ctx.arc(0, 0, 150 * (1 - (P.hop || 0) / 400), 0, 7); ctx.fillStyle = 'rgba(5,8,30,.4)'; ctx.fill(); ctx.restore();
  ctx.rotate(P.lean || 0); ctx.scale(1, 1 + (P.bob || 0) * .012);
  // feet
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.translate(sx * 56, -6); ctx.fillStyle = beak; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i * 17, 4, 11, 15, i * .35, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  // back wings (hanging behind) are drawn in front of the body below; tufts first
  const head = () => {
    ctx.save(); ctx.translate(0, -300); ctx.rotate(rad(P.tilt || 0)); ctx.translate(0, 300);
    for (const sx of [-1, 1]) {                                           // ear tufts
      ctx.beginPath(); ctx.moveTo(sx * 142, -350); ctx.quadraticCurveTo(sx * 150, -445, sx * 112, -470); ctx.quadraticCurveTo(sx * 90, -430, sx * 58, -402); ctx.closePath();
      ctx.fillStyle = bodyDk; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke();
    }
    return () => ctx.restore();
  };
  const endHead = head();
  // pencil behind the right tuft
  ctx.save(); ctx.translate(132, -452); ctx.rotate(rad(34));
  rr(ctx, -9, -78, 18, 100, 4); ctx.fillStyle = C.yel; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 22); ctx.lineTo(0, 46); ctx.lineTo(9, 22); ctx.closePath(); ctx.fillStyle = '#f3d2a2'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3.5, 38); ctx.lineTo(0, 46); ctx.lineTo(3.5, 38); ctx.fillStyle = INK; ctx.fill();
  rr(ctx, -9, -96, 18, 20, 4); ctx.fillStyle = '#ff8fa8'; ctx.fill(); ctx.stroke(); ctx.restore();
  endHead();
  // egg body
  ctx.beginPath(); ctx.moveTo(0, -412); ctx.bezierCurveTo(98, -412, 164, -330, 168, -215); ctx.bezierCurveTo(171, -104, 122, -16, 0, -16);
  ctx.bezierCurveTo(-122, -16, -171, -104, -168, -215); ctx.bezierCurveTo(-164, -330, -98, -412, 0, -412);
  const g = ctx.createLinearGradient(0, -412, 0, -16); g.addColorStop(0, '#ffc454'); g.addColorStop(1, '#f2a62a'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke();
  // belly with scallops
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -118, 108, 98, 0, 0, 7); ctx.fillStyle = cream; ctx.fill();
  ctx.clip(); ctx.strokeStyle = 'rgba(190,140,60,.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let r = 0; r < 4; r++) for (let c = -3; c <= 3; c++) { const cx = c * 34 + (r % 2 ? 17 : 0), cy = -190 + r * 44; ctx.beginPath(); ctx.arc(cx, cy, 15, .15 * Math.PI, .85 * Math.PI); ctx.stroke(); }
  ctx.restore();
  // bow tie
  ctx.save(); ctx.translate(0, -176); ctx.fillStyle = C.teal; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sx * 46, -20); ctx.lineTo(sx * 46, 20); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fillStyle = '#17807f'; ctx.fill(); ctx.stroke(); ctx.restore();
  // head features
  const end2 = head();
  const lx = (P.lookX ?? P.lx) * 15, ly = (P.lookY ?? P.ly) * 12;
  ctx.fillStyle = 'rgba(255,120,110,.35)'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 112, -246, 24, 16, 0, 0, 7); ctx.fill(); }
  for (const sx of [-1, 1]) {
    const cx = sx * 66, cy = -312, R = 57;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
    const sq = Math.max(P.sq || 0, 0);
    if (sq > .55) { ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy + 14, 28, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.arc(cx + lx, cy + ly, 26, 0, 7); ctx.fillStyle = INK; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + lx - 8, cy + ly - 9, 8, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    }
    const bl = Math.max(P.blink || 0, 0); if (bl > 0) { ctx.fillStyle = '#f9b940'; ctx.fillRect(cx - R - 2, cy - R - 2, R * 2 + 4, (R * 2 + 4) * bl); ctx.fillStyle = INK; ctx.fillRect(cx - R - 2, cy - R - 2 + (R * 2 + 4) * bl - 3, R * 2 + 4, 5); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.stroke();
    // brow
    const rs = sx < 0 ? P.bl : P.br, by = -392 - rs * 15, ang = (P.ba || 0) * 12 * (sx < 0 ? 1 : -1);
    ctx.beginPath(); ctx.moveTo(cx - 30, by + ang); ctx.lineTo(cx + 30, by - ang); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-10, -314); ctx.quadraticCurveTo(0, -326, 10, -314); ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.stroke();      // bridge
  // beak
  const mo = Math.max(0, Math.min(1, P.mouth || 0));
  ctx.save(); ctx.translate(0, -262);
  ctx.beginPath(); ctx.moveTo(-20, 10 + mo * 14); ctx.quadraticCurveTo(0, 36 + mo * 18, 20, 10 + mo * 14); ctx.quadraticCurveTo(0, 18 + mo * 10, -20, 10 + mo * 14);
  ctx.fillStyle = '#e8721a'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke();
  if (mo > .06) { ctx.beginPath(); ctx.ellipse(0, 12 + mo * 6, 17, 4 + mo * 9, 0, 0, 7); ctx.fillStyle = '#6d2410'; ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-28, -4); ctx.quadraticCurveTo(0, -12, 28, -4); ctx.quadraticCurveTo(14, 20, 0, 30); ctx.quadraticCurveTo(-14, 20, -28, -4); ctx.closePath();
  ctx.fillStyle = beak; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  end2();
  // wings, in front
  for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 150, -214); ctx.scale(sx, 1); wing(ctx, sx < 0 ? P.wl : P.wr, bodyDk); ctx.restore(); }
  ctx.restore();
}
