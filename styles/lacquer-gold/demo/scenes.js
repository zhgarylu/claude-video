// The scenes before the lid: the sap drop, the panel, the cross-section and the graver; and the wet-coat wipe.
import { W, H, C, mk, ctx2, clamp, lerp, ss, seg, ramp, eio, mulberry, hash, vnoise, TAU, rgba, windowSprite, blobSprite, woodTexture, hempPattern, flatBrush, tinted } from './lacq.js';
import { T, COATS, countAt } from './timeline.js';

// ---------------------------------------------------------------- shared
export function goldText(g, str, x, y, size, o = {}) {
  g.save(); g.font = `${o.weight || 500} ${size}px Cormorant, serif`; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
  if (o.spacing) g.letterSpacing = o.spacing + 'px';
  const gr = g.createLinearGradient(0, y - size * .8, 0, y + size * .15);
  gr.addColorStop(0, '#fff3c0'); gr.addColorStop(.45, '#e6bd58'); gr.addColorStop(.52, '#a87a24'); gr.addColorStop(1, '#d4a640');
  g.globalAlpha = o.alpha ?? 1;
  g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = size * .06; g.shadowOffsetY = size * .035; g.shadowOffsetX = size * .015;
  g.fillStyle = gr; g.fillText(str, x, y); g.restore();
}
const bokeh = (g, seed, n, a = .12) => {
  const R = mulberry(seed); g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) { const r = 40 + R() * 120; g.globalAlpha = a * (.4 + R() * .8); g.drawImage(blobSprite(64), R() * W - r, R() * H * .7 - r, r * 2, r * 2); }
  g.restore();
};
const darkBg = (g, a = '#1a0f0a', b = '#0e0907', c = '#050303') => { const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, a); bg.addColorStop(.7, b); bg.addColorStop(1, c); g.fillStyle = bg; g.fillRect(0, 0, W, H); };

// ---------------------------------------------------------------- 1. the sap drop
function dropPath(g, cx, cy, r, k) {
  g.beginPath(); g.moveTo(cx, cy - r * k);
  g.bezierCurveTo(cx + r * .12, cy - r * k * .5, cx + r, cy - r * .7, cx + r, cy + r * .12);
  g.arc(cx, cy + r * .12, r, 0, Math.PI, false);
  g.bezierCurveTo(cx - r, cy - r * .7, cx - r * .12, cy - r * k * .5, cx, cy - r * k); g.closePath();
}
function sapDrop(g, cx, cy, r, k, a = 1) {
  g.save(); g.globalAlpha = a;
  dropPath(g, cx, cy, r, k);
  const gr = g.createRadialGradient(cx - r * .3, cy - r * .2, r * .05, cx, cy, r * 1.2);
  gr.addColorStop(0, '#b0702a'); gr.addColorStop(.35, '#6d3412'); gr.addColorStop(.8, '#2c1107'); gr.addColorStop(1, '#170803');
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  // light coming through: a warm glow low on the shadow side
  const lo = g.createRadialGradient(cx + r * .35, cy + r * .55, 0, cx + r * .35, cy + r * .55, r * .9);
  lo.addColorStop(0, 'rgba(255,170,70,.55)'); lo.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = lo; g.fillRect(cx - r * 2, cy - r * 3, r * 4, r * 6);
  g.restore();
  g.strokeStyle = 'rgba(255,190,110,.5)'; g.lineWidth = Math.max(1, r * .04); g.beginPath(); g.arc(cx, cy + r * .12, r * .94, Math.PI * .1, Math.PI * .62); g.stroke();
  // window highlight, crescent + dot
  g.strokeStyle = 'rgba(255,247,232,.92)'; g.lineWidth = r * .1; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy + r * .12, r * .74, Math.PI * 1.06, Math.PI * 1.5); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(cx - r * .42, cy - r * .3, r * .07, 0, TAU); g.fill();
  g.restore();
}
export function drawDrop(g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  darkBg(g, '#2a1912', '#140c09', '#070404'); bokeh(g, 4, 9, .12);
  const bl = g.createRadialGradient(960, 420, 40, 960, 420, 900); bl.addColorStop(0, 'rgba(150,84,36,.38)'); bl.addColorStop(.5, 'rgba(90,46,20,.2)'); bl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = bl; g.fillRect(0, 0, W, H);
  const z = 1 + .1 * ramp(t, 0, 3.4);
  g.translate(960, 520); g.scale(z, z); g.translate(-960, -520);
  const y0 = 790;
  // the pool
  const pg = g.createLinearGradient(0, y0, 0, H + 200); pg.addColorStop(0, '#34200f'); pg.addColorStop(.12, '#160c06'); pg.addColorStop(1, '#040202');
  g.fillStyle = pg; g.fillRect(-300, y0, W + 600, H);
  const hl = g.createLinearGradient(-200, 0, W + 200, 0); hl.addColorStop(0, 'rgba(255,214,160,0)'); hl.addColorStop(.5, 'rgba(255,224,180,.55)'); hl.addColorStop(1, 'rgba(255,214,160,0)');
  g.fillStyle = hl; g.fillRect(-200, y0 - 1, W + 400, 3);
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = .2; g.drawImage(tinted(windowSprite(), 'warmw', '#ffc890'), 560, y0 + 6, 800, 200); g.restore();
  // the thread and the drop
  const sw = ramp(t, 0, T.drop), swell = ss(sw);
  let cx = 960, cy, r, k;
  const tTop = -60;
  if (t < T.drop) {
    r = 44 + 56 * swell; cy = 330 + 200 * swell; k = 1.7 + .7 * swell;
    const neck = lerp(60, 16, swell), yTop = cy - r * k;
    g.fillStyle = '#2a1308';
    g.beginPath(); g.moveTo(cx - 62, tTop);
    g.bezierCurveTo(cx - 40, yTop * .5, cx - neck / 2, yTop * .8, cx - neck / 2, yTop + 8);
    g.lineTo(cx + neck / 2, yTop + 8);
    g.bezierCurveTo(cx + neck / 2, yTop * .8, cx + 40, yTop * .5, cx + 62, tTop); g.closePath();
    const tg = g.createLinearGradient(cx - 62, 0, cx + 62, 0); tg.addColorStop(0, '#1d0d05'); tg.addColorStop(.35, '#7c4418'); tg.addColorStop(.5, '#4c2410'); tg.addColorStop(1, '#170803');
    g.fillStyle = tg; g.fill();
    g.strokeStyle = 'rgba(255,240,215,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 8, tTop + 30); g.lineTo(cx - neck * .22, yTop); g.stroke();
    sapDrop(g, cx, cy, r, k);
  } else if (t < T.land) {
    const dt = t - T.drop, y1 = 530, GR = 2 * (770 - y1) / ((T.land - T.drop) ** 2), v = GR * dt;
    cy = y1 + .5 * GR * dt * dt; r = 100 - 6 * dt / (T.land - T.drop); k = 2.1 + v / 1500;
    // the thread snaps back up
    const ret = ss(dt / .28), yEnd = lerp(y1 - 100 * 2.4 + 20, tTop, ret);
    if (ret < 1) {
      g.fillStyle = '#3b1b0a'; g.beginPath(); g.moveTo(cx - 62, tTop); g.lineTo(cx - 8 * (1 - ret) - 2, yEnd); g.lineTo(cx + 8 * (1 - ret) + 2, yEnd); g.lineTo(cx + 62, tTop); g.closePath(); g.fill();
      g.fillStyle = '#7c4418'; g.beginPath(); g.arc(cx, yEnd, 11 * (1 - ret) + 3, 0, TAU); g.fill();
    }
    sapDrop(g, cx, cy, r, k);
    // its reflection in the pool, approaching
    if (cy > y0 - 300) { g.save(); g.beginPath(); g.rect(0, y0, W, H); g.clip(); g.globalAlpha = .38 * clamp((cy - (y0 - 300)) / 300); g.translate(0, 2 * y0); g.scale(1, -1); sapDrop(g, cx, cy, r, k * .8); g.restore(); }
  } else {
    // landed: rings, a crown of beads, the jet
    const dt = t - T.land;
    for (let i = 0; i < 4; i++) {
      const rr = (dt - i * .13) * 640; if (rr <= 0) continue;
      const a = clamp(1 - dt / 1.4) * (1 - i * .22);
      g.strokeStyle = `rgba(255,214,160,${.6 * a})`; g.lineWidth = 3 - i * .5; g.beginPath(); g.ellipse(cx, y0 + 18, rr, rr * .13, 0, 0, TAU); g.stroke();
      g.strokeStyle = `rgba(0,0,0,${.5 * a})`; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, y0 + 22, rr, rr * .13, 0, 0, TAU); g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const vx = (i - 4) * 55 + (hash(i) - .5) * 20, vy = -(300 + hash(i * 3) * 220), x = cx + vx * dt, y = y0 + 6 + vy * dt + .5 * 1900 * dt * dt;
      if (y < y0 + 6 && dt < .7) { g.fillStyle = `rgba(120,64,22,${1 - dt / .75})`; g.beginPath(); g.arc(x, y, 5 + hash(i * 7) * 4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,220,.8)'; g.fillRect(x - 2, y - 3, 2, 2); }
    }
    const jh = 230 * Math.sin(clamp(dt / .55) * Math.PI) ** 1.2 * (1 - clamp(dt / .6) * .2);
    if (dt < .6) { g.fillStyle = '#6d3412'; g.beginPath(); g.moveTo(cx - 14, y0 + 8); g.quadraticCurveTo(cx - 6, y0 - jh * .6, cx, y0 - jh); g.quadraticCurveTo(cx + 6, y0 - jh * .6, cx + 14, y0 + 8); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,240,215,.7)'; g.fillRect(cx - 4, y0 - jh * .8, 2, jh * .5); }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------------------------------------------------------------- 2. the panel: three coats of black go on
let WOOD = null, WOOD2 = null, HEMP = null;
const PASS = 2 / 3;
const PBANDS = [[40, 380], [380, 720], [720, 1060]];
export const brushX = (t, k) => {
  const u = clamp((t - (T.brush0 + k * PASS)) / PASS), e = ss(u) * .55 + u * .45;
  return k % 2 === 0 ? lerp(-100, 2500, e) : lerp(2500, -100, e);
};
export function drawPanel(g, t) {
  if (!WOOD) WOOD = woodTexture(3400, 2000, 3);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const z = 1.12;
  // camera: follows the brush sideways, steps down a band at a time
  const k = clamp(Math.floor((t - T.brush0) / PASS), 0, 2), tp = t - (T.brush0 + k * PASS);
  const bx = k >= 0 ? brushX(Math.max(t, T.brush0), k) : -100;
  const camY = lerp(210, 890, ss(seg(t, T.brush0 + .45, T.brush0 + 2.3))) - 0;
  const camX = clamp(lerp(1300, bx, .85), 760, 1840);
  g.translate(960, 540); g.scale(z, z); g.translate(-camX, -camY);
  g.drawImage(WOOD, -300, -400);
  // the coat: three bands, the brush leads
  const coated = [];
  for (let b = 0; b < 3; b++) {
    const tb0 = T.brush0 + b * PASS; if (t < tb0) continue;
    const x = brushX(t, b), dir = b % 2 === 0 ? 1 : -1, done = t >= tb0 + PASS;
    const [y0, y1] = PBANDS[b], x0 = dir > 0 ? -300 : x, x1 = dir > 0 ? x : 2900;
    coated.push([x0, y0, x1 - x0, y1 - y0 + 6, dir, x, done, tb0]);
  }
  for (const [x0, y0, w, h, dir, x, done, tb0] of coated) {
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    const bg = g.createLinearGradient(0, y0, 0, y0 + h); bg.addColorStop(0, '#2c1b14'); bg.addColorStop(.3, '#0f0908'); bg.addColorStop(.8, '#0a0605'); bg.addColorStop(1, '#1c120d');
    g.fillStyle = bg; g.fillRect(x0, y0, w, h);
    // wood grain shows faintly through the first, thin coat
    g.globalAlpha = .1; g.drawImage(WOOD, -300, -400); g.globalAlpha = 1;
    // bristle streaks that level out behind the brush
    const age = Math.max(0, t - tb0 - PASS * .2);
    for (let i = 0; i < 38; i++) {
      const yy = y0 + 6 + i * (h / 38) + hash(i * 1.7 + tb0) * 6, a = (.16 + .14 * hash(i * 3.3)) * Math.exp(-age / 0.5);
      g.strokeStyle = i & 1 ? `rgba(255,214,170,${a})` : `rgba(0,0,0,${a * 1.6})`; g.lineWidth = 1 + hash(i) * 2; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + w, yy + (hash(i + 9) - .5) * 4); g.stroke();
    }
    // the window in the wet lacquer (the wood stays matte: this is drawn only inside the coated band, in screen space)
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen'; g.globalAlpha = .34 + .2 * ss(seg(t, tb0 + .3, tb0 + 1.4));
    g.drawImage(windowSprite(), 470 + 70 * Math.sin(t * .5), 70, 860, 960);
    g.restore();
    // the wet edge
    if (!done) {
      const sl = g.createLinearGradient(x - dir * 30, 0, x - dir * 520, 0); sl.addColorStop(0, 'rgba(255,236,210,.30)'); sl.addColorStop(1, 'rgba(255,236,210,0)');
      g.save(); g.fillStyle = sl; g.fillRect(Math.min(x - dir * 30, x - dir * 520), y0 + h * .22, 490, h * .2); g.restore();
      const ex = x, gl = g.createLinearGradient(ex - dir * 60, 0, ex + dir * 6, 0);
      gl.addColorStop(0, 'rgba(255,214,160,0)'); gl.addColorStop(.85, 'rgba(255,214,160,.35)'); gl.addColorStop(1, 'rgba(255,236,205,.9)');
      g.fillStyle = gl; g.fillRect(Math.min(ex, ex - dir * 60), y0, 60 + 6, h);
    }
    // a glossy top and bottom lip along the band
    g.fillStyle = 'rgba(255,230,200,.2)'; g.fillRect(x0, y0, w, 2.5); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x0, y0 + h - 8, w, 3);
  }
  // the brush
  for (const [x0, y0, w, h, dir, x, done, tb0] of coated) if (!done) {
    flatBrush(g, x, (y0 + y0 + h) / 2, h / .94, dir > 0 ? -.35 : -(Math.PI - .35), 600, 1, .55);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  // vignette
  const vg = g.createRadialGradient(960, 540, 400, 960, 540, 1150); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- 3. the cross-section
const CT = 16, TOP = -30 - CT * 30, SLAB = 3600;
const coatCol = i => {   // i = 1..30
  const v = (hash(i * 5.1) - .5) * 10;
  if (i <= 6) return [74 + v, 42 + v / 2, 26];
  if (i <= 18) return [176 + v * 1.5, 40 + v / 2, 28 + v / 3];
  return [20 + v / 2, 13 + v / 3, 11];
};
const rgbs = (c, k = 0) => `rgb(${clamp(c[0] + k, 0, 255) | 0},${clamp(c[1] + k * .8, 0, 255) | 0},${clamp(c[2] + k * .7, 0, 255) | 0})`;
const topY = i => -30 - CT * i;
export function sectionCam(t) {
  const n = countAt(t), top = n > 0 ? topY(n) : -30;
  const k = ss(seg(t, T.coat0 - .3, T.coatN));
  let z = lerp(1.75, 1.0, k), scrTop = lerp(600, 400, k);
  // arrival: a low look at the wood, rising to the first coat
  const rise = ss(seg(t, T.wipe2[1] - .4, T.coat0 + .6));
  let cy = top + (540 - scrTop) / z + lerp(210, 0, rise);
  if (t >= T.cut0) {
    const kk = ss(seg(t, T.cut0, T.cut1 + .6)), z0 = z, y0 = cy;
    z = lerp(z0, 2.0, kk); cy = lerp(y0, TOP + 95, kk);
  }
  return { x: 0, y: cy, z };
}
export function drawSection(g, t) {
  if (!WOOD2) { WOOD2 = woodTexture(3600, 1400, 17); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  darkBg(g, '#1c110c', '#100a07', '#060403'); bokeh(g, 9, 7, .08);
  const cam = sectionCam(t), z = cam.z;
  g.translate(960, 540); g.scale(z, z); g.translate(-cam.x, -cam.y);
  const X0 = -SLAB / 2;
  // wood core
  g.drawImage(WOOD2, X0, 0, SLAB, 900);
  const sh = g.createLinearGradient(0, 0, 0, 160); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(X0, 0, SLAB, 160);
  // cloth and earth paste
  g.fillStyle = '#a88a5c'; g.fillRect(X0, -30, SLAB, 18);
  g.fillStyle = 'rgba(60,40,20,.5)'; for (let i = 0; i < 160; i++) { g.fillRect(X0 + hash(i) * SLAB, -30 + hash(i * 2.7) * 18, 2, 2); }
  g.save(); g.beginPath(); g.rect(X0, -12, SLAB, 12); g.clip(); g.fillStyle = hempPattern(g); g.fillRect(X0, -12, SLAB, 12); g.restore();
  // the coats
  const n = countAt(t), nTop = n;
  for (let i = 1; i <= 30; i++) {
    const ti = COATS[i - 1]; if (t < ti) break;
    const sp = (COATS[i] ?? (ti + .5)) - ti, dp = Math.min(.42, sp * .8), u = ramp(t, ti, ti + dp), dir = i & 1 ? 1 : -1;
    const x = dir > 0 ? lerp(X0, X0 + SLAB, u) : lerp(X0 + SLAB, X0, u), xa = dir > 0 ? X0 : x, xb = dir > 0 ? x : X0 + SLAB;
    const y = topY(i);
    const wet = 1 - ss(ramp(t, ti + dp, ti + dp + .55));
    g.fillStyle = rgbs(coatCol(i), wet * 36 + (i & 1 ? 9 : -5)); g.fillRect(xa, y, xb - xa, CT + .6);
    // the polished top line of every coat, and the seam under it
    g.fillStyle = `rgba(255,214,176,${.34 + .5 * wet})`; g.fillRect(xa, y, xb - xa, 1.6);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(xa, y + CT - 1.2, xb - xa, 1.6);
    if (u > 0 && u < 1) {
      const gl = g.createLinearGradient(x - dir * 70, 0, x + dir * 4, 0); gl.addColorStop(0, 'rgba(255,230,200,0)'); gl.addColorStop(1, 'rgba(255,240,215,.85)');
      g.fillStyle = gl; g.fillRect(Math.min(x, x - dir * 70), y - 1, 74, CT + 2);
    }
    // polishing: a felt pad rubs the cured coat and leaves a bright pass (only when there is time to see it)
    if (sp > .8) {
      const pu = ramp(t, ti + dp + .14, ti + dp + .5);
      if (pu > 0 && pu < 1) {
        const px = lerp(-760, 760, dir > 0 ? 1 - pu : pu), pyy = y - 2;
        const sg = g.createLinearGradient(px - 200 * (dir > 0 ? -1 : 1), 0, px, 0); sg.addColorStop(0, 'rgba(255,236,210,0)'); sg.addColorStop(1, 'rgba(255,236,210,.9)');
        g.fillStyle = sg; g.fillRect(Math.min(px, px - 200 * (dir > 0 ? -1 : 1)), y - 1, 200, 3);
        g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
        g.fillStyle = '#9a9ea4'; g.beginPath(); g.roundRect(px - 70, pyy - 30, 140, 30, 6); g.fill(); g.restore();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px - 64, pyy - 27, 128, 4);
      }
    }
    // brush, only when slow enough to see
    if (u > 0 && u < 1 && sp > .18) flatBrush(g, x, y - 1, 120, dir > 0 ? -1.05 : -(Math.PI - 1.05), 600, 1);
  }
  // fast phase: a single bright seam rises with the stack
  if (n > 14 && n < 30) { const y = topY(n); g.fillStyle = 'rgba(255,236,205,.35)'; g.fillRect(X0, y - 2, SLAB, 3); }
  // --- the graver and its V-groove (T.cut0 .. T.cut1)
  const Dm = 330, D = Dm * ss(seg(t, T.cut0 + .25, T.cut1)), surf = TOP;
  if (D > 1) {
    const hwOf = d => d * .85;
    const M = Math.max(1, Math.ceil(D / CT));
    // clear the notch (what was cut away), then paint the walls as nested bands
    g.save(); g.beginPath(); g.moveTo(-hwOf(D), surf - 2); g.lineTo(hwOf(D), surf - 2); g.lineTo(0, surf + D); g.closePath(); g.clip();
    g.fillStyle = '#0a0605'; g.fillRect(-400, surf - 4, 800, D + 8);
    for (let m = 0; m < M; m++) {
      const f = 1 - m / M, apx = surf + D;
      g.beginPath(); g.moveTo(-hwOf(D) * f, apx - D * f); g.lineTo(hwOf(D) * f, apx - D * f); g.lineTo(0, apx); g.closePath();
      const coat = clamp(30 - Math.floor((m / M) * 1.55 * (D / CT)), 1, 30);
      g.fillStyle = rgbs(coatCol(coat), -2); g.fill();
      g.strokeStyle = rgbs(coatCol(coat), 105); g.lineWidth = 2.4; g.stroke();
    }
    g.restore();
    // bright cut lip
    g.strokeStyle = 'rgba(255,236,210,.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-hwOf(D), surf); g.lineTo(0, surf + D); g.lineTo(hwOf(D), surf); g.stroke();
    // the graver: a steel V tip on a shank
    if (t < T.cut1 + .5) {
      const a = 1 - ramp(t, T.cut1, T.cut1 + .5), ax = 0, ay = surf + D;
      g.save(); g.globalAlpha = a; g.translate(ax, ay); g.rotate(.32);
      const sg = g.createLinearGradient(-20, 0, 20, 0); sg.addColorStop(0, '#444850'); sg.addColorStop(.45, '#aeb4be'); sg.addColorStop(1, '#2c2f36');
      g.fillStyle = sg; g.beginPath(); g.moveTo(0, 0); g.lineTo(-17, -42); g.lineTo(17, -42); g.closePath(); g.fill();
      g.fillRect(-12, -330, 24, 290);
      g.fillStyle = '#5b3a1e'; g.fillRect(-18, -520, 36, 190);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-8, -320, 3, 270);
      g.restore();
    }
    // curls of lacquer peeling off
    for (let i = 0; i < 14; i++) {
      const tc = T.cut0 + .35 + i * .11, dt = t - tc; if (dt < 0 || dt > .9) continue;
      const dd = Dm * ss(seg(tc, T.cut0 + .25, T.cut1)), sx = (hash(i * 2.3) - .5) * 40, sy = surf + dd * .85;
      const vx = (hash(i * 9.1) - .3) * 260, vy = -(160 + hash(i * 4.4) * 220), x = sx + vx * dt, y = sy + vy * dt + 700 * dt * dt;
      g.save(); g.globalAlpha = 1 - dt / .9; g.translate(x, y); g.rotate(dt * (6 + i % 3) * (i & 1 ? 1 : -1));
      g.lineCap = 'round'; g.strokeStyle = i % 3 ? '#140c0a' : '#9c2418'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 9, 0.3, 4.6); g.stroke();
      g.strokeStyle = 'rgba(255,230,200,.7)'; g.lineWidth = 1.2; g.beginPath(); g.arc(-1, -1, 9, 3.6, 4.5); g.stroke(); g.restore();
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the counter: lives in the dark above the stack
  if (t < T.cut0 + .6) {
    const n = countAt(t), nt = n > 0 ? COATS[n - 1] : -9, pulse = 1 + .14 * Math.exp(-(t - nt) * 9);
    const a = t < T.coat0 - .2 ? 0 : 1 - ramp(t, T.cut0 - .1, T.cut0 + .6);
    if (a > 0) {
      g.save(); g.translate(1620, 252); g.scale(pulse, pulse);
      goldText(g, String(n).padStart(2, '0'), 0, 0, 220, { align: 'right', weight: 500, alpha: a });
      g.restore();
      goldText(g, 'COATS', 1620, 322, 26, { align: 'right', weight: 600, spacing: 10, alpha: a * .85 });
    }
  }
  const vg = g.createRadialGradient(960, 540, 450, 960, 540, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- the wet-coat wipe
// p 0..1: a band of fresh black lacquer sweeps across; the new scene shows behind it, the old one ahead of it
export function wipeComposite(dst, nuw, p, dir = 1, vertical = false) {
  const e = lerp(-160, (vertical ? H : W) + 160, ss(p)), bw = 120;
  dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0);
  const wob = a => Math.sin(a * .012 + p * 5) * 16 + Math.sin(a * .031) * 6;
  // the new scene behind the edge
  dst.save(); dst.beginPath();
  if (!vertical) { dst.moveTo(0, 0); for (let y = 0; y <= H; y += 12) dst.lineTo(e + (y - 540) * .1 + wob(y), y); dst.lineTo(0, H); }
  else { dst.moveTo(0, 0); dst.lineTo(W, 0); for (let x = W; x >= 0; x -= 12) dst.lineTo(x, e + wob(x)); }
  dst.closePath(); dst.clip(); dst.drawImage(nuw, 0, 0); dst.restore();
  // the glossy band of black lacquer
  dst.save();
  if (!vertical) {
    dst.beginPath(); dst.moveTo(e - 40, 0); for (let y = 0; y <= H; y += 12) dst.lineTo(e + (y - 540) * .1 + wob(y), y); for (let y = H; y >= 0; y -= 12) dst.lineTo(e + bw + (y - 540) * .1 + wob(y + 99) * .8, y); dst.closePath();
    dst.clip();
    const g1 = dst.createLinearGradient(e, 0, e + bw, 0);
    g1.addColorStop(0, '#2a1912'); g1.addColorStop(.12, '#0d0807'); g1.addColorStop(.7, '#090605'); g1.addColorStop(.92, '#1d130e'); g1.addColorStop(1, '#3b271b');
    dst.fillStyle = g1; dst.fillRect(e - 80, 0, bw + 200, H);
    const gl = dst.createLinearGradient(e, 0, e + bw, 0);
    gl.addColorStop(0, 'rgba(255,236,210,.0)'); gl.addColorStop(.05, 'rgba(255,236,210,.85)'); gl.addColorStop(.1, 'rgba(255,236,210,0)'); gl.addColorStop(.86, 'rgba(255,220,180,0)'); gl.addColorStop(.95, 'rgba(255,220,180,.45)'); gl.addColorStop(1, 'rgba(255,220,180,0)');
    dst.fillStyle = gl; dst.fillRect(e - 80, 0, bw + 200, H);
    // a window glint travelling inside the band
    dst.globalCompositeOperation = 'screen'; dst.globalAlpha = .35; dst.drawImage(windowSprite(), e + 10, H * (.2 + .3 * p), 90, 420);
  } else {
    dst.beginPath(); dst.moveTo(0, e - 40); for (let x = 0; x <= W; x += 12) dst.lineTo(x, e + wob(x)); for (let x = W; x >= 0; x -= 12) dst.lineTo(x, e + bw + wob(x + 99) * .8); dst.closePath(); dst.clip();
    const g1 = dst.createLinearGradient(0, e, 0, e + bw);
    g1.addColorStop(0, '#2a1912'); g1.addColorStop(.12, '#0d0807'); g1.addColorStop(.7, '#090605'); g1.addColorStop(.92, '#1d130e'); g1.addColorStop(1, '#3b271b');
    dst.fillStyle = g1; dst.fillRect(0, e - 80, W, bw + 200);
    const gl = dst.createLinearGradient(0, e, 0, e + bw);
    gl.addColorStop(0, 'rgba(255,236,210,0)'); gl.addColorStop(.05, 'rgba(255,236,210,.85)'); gl.addColorStop(.1, 'rgba(255,236,210,0)'); gl.addColorStop(.9, 'rgba(255,220,180,.4)'); gl.addColorStop(1, 'rgba(255,220,180,0)');
    dst.fillStyle = gl; dst.fillRect(0, e - 80, W, bw + 200);
  }
  dst.restore(); dst.restore();
}
