// Era painters, part 1: cave ochre, clay tablet, woodblock print, letterpress.
// Each painter draws in the era's own visual language (palette, marks, type) and owns its gags, token, burst and sounds.
import { clamp, lerp, seg, ss, eo, back, hash, vnoise, TAU } from '/core/lib.js';
import { W, H, GY, WSX, bake, hex, mixc, rgba, rr, blob, hatch, noiseTile, texFill, vignette, tagCard, bell, PAL } from './scroll.js';
import { lxAfter, V, ev, T, B } from './timeline.js';
const L0 = -B[0];                                           // the cave's local x at t = 0

const TX = (g, s, x, y, o = {}) => { g.save(); g.font = o.font || '500 28px "Noto Sans SC"'; g.fillStyle = o.fill || '#000'; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic'; if (o.alpha != null) g.globalAlpha = o.alpha; g.fillText(s, x, y); g.restore(); };

// =================================================================== 1. CAVE (ochre on rock)
function skeletonClip(g, bones, r) {                      // union of discs along bones, as one path
  for (const [a, b, rr_] of bones) { const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5)); for (let i = 0; i <= n; i++) { const x = lerp(a[0], b[0], i / n), y = lerp(a[1], b[1], i / n); g.moveTo(x + (rr_ ?? r), y); g.arc(x, y, rr_ ?? r, 0, TAU); } }
}
const HAND_BONES = [[[110, 190], [110, 200], 50], [[78, 150], [70, 70], 12], [[100, 130], [98, 40], 12], [[122, 130], [128, 30], 12], [[144, 138], [156, 56], 11], [[62, 190], [20, 140], 12]];
export function handSprite(v) {
  return bake('hand' + v, 230, 270, (g) => {
    const rnd = i => hash(i * 12.9 + v * 101);
    g.save(); g.beginPath(); HAND_BONES.forEach(([a, b, r]) => skeletonClip(g, [[a, b, r + 34]], 0)); g.clip();
    g.fillStyle = '#a63a22';
    for (let i = 0; i < 4200; i++) { const x = 5 + rnd(i) * 220, y = 5 + rnd(i + 3000) * 255, r = .7 + rnd(i + 6000) * 1.7; g.globalAlpha = .35 + rnd(i + 9000) * .55; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.restore();
    g.save(); g.beginPath(); HAND_BONES.forEach(([a, b, r]) => skeletonClip(g, [[a, b, r + 11]], 0)); g.clip(); g.globalAlpha = .9; g.fillStyle = '#a63a22'; g.fillRect(0, 0, 230, 270); g.restore();
    g.save(); g.beginPath(); HAND_BONES.forEach(([a, b, r]) => skeletonClip(g, [[a, b, r + 22]], 0)); g.clip(); g.globalAlpha = .55; g.fillStyle = '#b64427'; g.fillRect(0, 0, 230, 270); g.restore();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); HAND_BONES.forEach(([a, b, r]) => skeletonClip(g, [[a, b, r]], 0)); g.fill();
  });
}
const ANIM = {
  bison: { rx: 122, ry: 56, hump: 40, neck: [96, -22], head: [168, 14], hr: 32, leg: 74, lw: 17 },
  deer: { rx: 90, ry: 34, hump: 0, neck: [74, -34], head: [128, -86], hr: 19, leg: 104, lw: 10, antler: 1 },
  horse: { rx: 104, ry: 40, hump: 0, neck: [88, -30], head: [152, -76], hr: 23, leg: 102, lw: 12, mane: 1 },
  ibex: { rx: 80, ry: 34, hump: 0, neck: [66, -28], head: [112, -66], hr: 18, leg: 84, lw: 10, horn: 1 },
};
function animal(g, kind, col, ph = null) {
  const P = ANIM[kind]; g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.ellipse(0, 0, P.rx, P.ry, 0, 0, TAU); g.fill();
  if (P.hump) { g.beginPath(); g.ellipse(P.rx * .35, -P.ry * .8, P.hump * 1.6, P.hump, -.25, 0, TAU); g.fill(); }
  g.lineWidth = P.hr * 1.5; g.beginPath(); g.moveTo(P.rx * .55, -P.ry * .35); g.lineTo(P.head[0], P.head[1]); g.stroke();
  g.beginPath(); g.ellipse(P.head[0] + P.hr * .5, P.head[1] + P.hr * .1, P.hr * 1.5, P.hr, kind === 'bison' ? .35 : .5, 0, TAU); g.fill();
  const lg = [[-.62, 0], [-.62, 1], [.62, 0], [.62, 1]];
  lg.forEach(([fx, far], i) => {
    const a = ph == null ? (far ? .1 : -.08) * (fx > 0 ? 1 : -1) : Math.sin(ph + (fx > 0 ? 0 : Math.PI) + far * 1.6) * .6, kn = ph == null ? 0 : Math.max(0, Math.cos(ph + (fx > 0 ? 0 : Math.PI) + far * 1.6)) * .7;
    const x0 = P.rx * fx + far * 12, y0 = P.ry * .55, k = [x0 + Math.sin(a) * P.leg * .55, y0 + Math.cos(a) * P.leg * .55], f = [k[0] + Math.sin(a - kn) * P.leg * .55, k[1] + Math.cos(a - kn) * P.leg * .55];
    g.lineWidth = P.lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(k[0], k[1]); g.lineTo(f[0], f[1]); g.stroke();
  });
  g.lineWidth = 6; g.beginPath(); g.moveTo(-P.rx + 4, -P.ry * .3); g.quadraticCurveTo(-P.rx - 26, 0, -P.rx - 20, P.ry * .8); g.stroke();
  g.lineWidth = 5;
  if (P.antler) { for (const s of [0, 1]) { const x0 = P.head[0] + 8 - s * 12, y0 = P.head[1] - 16; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - 20 - s * 14, y0 - 58); g.moveTo(x0 - 10 - s * 7, y0 - 30); g.lineTo(x0 + 8 - s * 7, y0 - 52); g.moveTo(x0 - 18 - s * 12, y0 - 52); g.lineTo(x0 - 40 - s * 12, y0 - 62); g.stroke(); } }
  if (P.horn) { g.lineWidth = 6; g.beginPath(); g.moveTo(P.head[0] + 6, P.head[1] - 12); g.quadraticCurveTo(P.head[0] - 40, P.head[1] - 74, P.head[0] - 82, P.head[1] - 40); g.stroke(); }
  if (kind === 'bison') { g.lineWidth = 8; g.beginPath(); g.moveTo(P.head[0] + 14, P.head[1] - 16); g.quadraticCurveTo(P.head[0] + 36, P.head[1] - 52, P.head[0] + 6, P.head[1] - 60); g.stroke(); }
  if (P.mane) { g.lineWidth = 7; g.beginPath(); g.moveTo(P.rx * .45, -P.ry * .8); g.quadraticCurveTo(P.rx * .9, -P.ry * 1.5, P.head[0] - 16, P.head[1] - 20); g.stroke(); }
}
function animalSprite(kind, v) {
  return bake(`an_${kind}_${v}`, 460, 340, (g) => {
    g.translate(230, 190); const cols = ['#2c140c', '#7a2c1a', '#3b1c10'];
    animal(g, kind, cols[v % 3]); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 700; i++) { const x = (hash(i * 3.1 + v) - .5) * 400, y = (hash(i * 5.3 + v) - .5) * 260; g.globalAlpha = .25 + hash(i * 7.7) * .55; g.beginPath(); g.arc(x, y, .6 + hash(i * 1.9) * 1.8, 0, TAU); g.fill(); }
  });
}
const CAVE_KINDS = ['bison', 'deer', 'horse', 'ibex', 'bison', 'horse'];
const STAMP = L0 + V * 8.2 - 130 + 230;

export const cave = {
  id: 'cave', paper: '#caa174', rim: '#ecd7b0', camLx: 1100,
  gags: [{ x: L0 + V * 8.2 - 130, len: 300 }, { x: L0 + V * 11.1, len: 420 }],
  walk: { id: 'cave', pal: { scarf: '#f0c27a', cap: '#d79a52' }, line: '#1d120a', lw: 4.5, rim: 'rgba(240,200,140,.45)', rw: 3, ramp: ['#1a0f08', '#4d2d17', '#9c6431', '#e0a762', '#f7dba8'] },
  step: 'dirt', push: { t0: 7.7, t1: 9.6, z: 1.2 },
  burst: { n: 40, size: 16, g: 700, draw: (g, s, i, p, r) => { g.fillStyle = ['#c98f4f', '#a85a30', '#7a4426', '#e6b878'][i % 4]; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, rr_ = s * (.6 + .6 * hash(i * 7 + k)); g.lineTo(Math.cos(a) * rr_, Math.sin(a) * rr_); } g.closePath(); g.fill(); } },
  token: (g) => tagCard(g, { fill: '#b78452', line: '#2a160c', w: 54, h: 62 }, (g) => { g.drawImage(handSprite(0), -17, -22, 34, 40); }),
  pose(c) {
    const p0 = c.gp(0), p1 = c.gp(1), w = bell(p0, .12, .4, .6, .9), l = bell(p1, .05, .3, .7, 1);
    return { armN: w > .001 ? { x: c.X(STAMP), y: 652, w } : null, lean: .16 * w, stop: .0, look: -.32 * l + .1 * w, mouth: l, brow: l * 4 };
  },
  bg(g, c) {
    const t = c.t;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3c2416'); gr.addColorStop(.18, '#7d5233'); gr.addColorStop(.55, '#a56e42'); gr.addColorStop(.8, '#8a5834'); gr.addColorStop(1, '#2a180d');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const n1 = noiseTile(3, 256, 6, 4), n2 = noiseTile(9, 256, 12, 3);
    texFill(g, n1, 0, 0, W, H, { alpha: .75, op: 'multiply', ox: -c.cam, scale: 2.4 });
    texFill(g, n2, 0, 0, W, H, { alpha: .35, op: 'overlay', ox: -c.cam * .98, scale: 1.2 });
    // roof stalactites, far then near
    for (const [k, col, sc] of [[.7, '#2a170d', .8], [1, '#1b0f08', 1.1]]) c.at(g, k, (a, b) => {
      for (let i = Math.floor(a / 70) - 1; i < b / 70 + 1; i++) { const h = (30 + hash(i * 3.3 + k * 9) * 110) * sc, x = i * 70 + hash(i * 1.1) * 30, w = 26 + hash(i * 7.1) * 34; g.fillStyle = col; g.beginPath(); g.moveTo(x - w, -4); g.quadraticCurveTo(x - w * .3, h * .5, x + (hash(i) - .5) * 10, h); g.quadraticCurveTo(x + w * .3, h * .5, x + w, -4); g.fill(); }
    });
    // cracks and wall lumps (on the wall plane)
    c.at(g, 1, (a, b) => {
      for (let i = Math.floor(a / 260) - 1; i < b / 260 + 1; i++) {
        let x = i * 260 + hash(i * 2.3) * 200, y = 100 + hash(i * 4.1) * 340; g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 8; s++) { x += (hash(i * 9 + s) - .4) * 50; y += 20 + hash(i * 5 + s * 3) * 50; g.lineTo(x, y); }
        g.lineWidth = 2 + hash(i) * 2; g.strokeStyle = 'rgba(30,14,6,.45)'; g.stroke(); g.lineWidth = 1; g.strokeStyle = 'rgba(255,220,170,.18)'; g.translate(2, 0); g.stroke(); g.translate(-2, 0);
      }
      // painted frieze: animals on the upper wall
      for (let i = Math.floor(a / 520) - 1; i < b / 520 + 1; i++) {
        if (hash(i * 3.7) < .15) continue;
        const kind = CAVE_KINDS[Math.abs(i) % CAVE_KINDS.length], sc = .85 + hash(i * 9.1) * .45, x = i * 520 + 200 + hash(i * 2.9) * 100, y = 250 + hash(i * 6.3) * 140;
        if (kind === 'deer' && i === 3) continue;                               // gag 2 paints its own deer
        g.save(); g.translate(x, y); g.rotate((hash(i * 1.7) - .5) * .1); g.scale(sc, sc); g.globalAlpha = .93; g.drawImage(animalSprite(kind, Math.abs(i)), -230, -190); g.restore();
      }
      // hand stencils along the lower wall
      for (let i = Math.floor(a / 190) - 1; i < b / 190 + 1; i++) {
        if (hash(i * 5.1) < .42) continue; const x = i * 190 + hash(i * 1.3) * 90, y = 575 + hash(i * 7.7) * 130, s = .62 + hash(i * 4.4) * .25, fl = hash(i * 2.2) > .5 ? -1 : 1;
        g.save(); g.translate(x, y); g.rotate((hash(i * 8.8) - .5) * .7); g.scale(s * fl, s); g.globalAlpha = .88; g.drawImage(handSprite(i & 3), -115, -135); g.restore();
      }
    });
    // gag 1: the courier's own hand appears on the wall
    const gp0 = c.gp(0);
    if (gp0 > .48) {
      const u = (gp0 - .48) / .52, k = back(clamp(u * 3.2), 2.2);
      c.at(g, 1, () => { g.save(); g.translate(STAMP + 20, 646); g.scale(.78 * k, .78 * k); g.globalAlpha = .95; g.drawImage(handSprite(2), -115, -135); g.restore(); });
    }
    // gag 2: a painted deer wakes up and bounds along the wall
    {
      const tt = (c.wlx - this.gags[1].x) / V, gx = this.gags[1].x + 520, live = ss(seg(tt, 0, .25)), run = Math.max(0, tt - .2);
      const dx = gx + run * 640 + (hash(1.7) * 0), y = 330 - Math.abs(Math.sin(run * 9)) * 26 * live;
      if (tt < 2.2) c.at(g, 1, () => {
        g.save(); g.translate(dx, y); g.scale(1.05, 1.05); g.globalAlpha = .95 * (1 - ss(seg(tt, 1.5, 2.2)));
        const sp = bake('deerlive', 460, 340, () => { }); void sp;
        g.fillStyle = '#2c140c'; animal(g, 'deer', '#2c140c', live > 0 ? run * 18 : null); g.restore();
        if (live > 0) { g.fillStyle = 'rgba(60,24,12,.5)'; for (let i = 0; i < 12; i++) { const px = dx - 90 - i * 46; if (px > gx - 60 && i < run * 14) { g.beginPath(); g.arc(px, y + 60 + Math.sin(i * 2) * 8, 3.6 - i * .15, 0, TAU); g.fill(); } } }
      });
    }
    // torches throw a flickering warm light
    c.at(g, 1, (a, b) => {
      for (let i = Math.floor(a / 1500) - 1; i < b / 1500 + 1; i++) {
        const x = i * 1500 + 700, f = .85 + .15 * Math.sin(t * 17 + i * 2) * Math.sin(t * 7.3 + i);
        g.fillStyle = '#1a0e08'; g.fillRect(x - 5, 380, 10, 130); g.fillStyle = '#4a2a14'; g.fillRect(x - 12, 370, 24, 16);
        g.save(); g.globalCompositeOperation = 'lighter'; const rg = g.createRadialGradient(x, 340, 10, x, 340, 520 * f); rg.addColorStop(0, 'rgba(255,170,70,.42)'); rg.addColorStop(.35, 'rgba(230,110,40,.16)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - 560, 0, 1120, H); g.restore();
        g.fillStyle = '#ff9a2a'; g.beginPath(); g.ellipse(x, 345, 14 * f, 30 * f, 0, 0, TAU); g.fill(); g.fillStyle = '#ffe08a'; g.beginPath(); g.ellipse(x, 352, 7 * f, 16 * f, 0, 0, TAU); g.fill();
      }
    });
    // floor
    c.at(g, 1, (a, b) => {
      g.beginPath(); g.moveTo(a, H); for (let x = a; x <= b + 20; x += 20) g.lineTo(x, 792 + vnoise(x / 90) * 20 + vnoise(x / 23) * 6); g.lineTo(b + 20, H); g.closePath();
      const fg = g.createLinearGradient(0, 780, 0, H); fg.addColorStop(0, '#4a2c18'); fg.addColorStop(.25, '#2d1a0e'); fg.addColorStop(1, '#150b06'); g.fillStyle = fg; g.fill();
      g.strokeStyle = 'rgba(230,180,120,.28)'; g.lineWidth = 2; g.stroke();
      for (let i = Math.floor(a / 60) - 1; i < b / 60 + 1; i++) { if (hash(i * 3.3) < .5) continue; const x = i * 60 + hash(i) * 40, y = 830 + hash(i * 7) * 220, s = 4 + hash(i * 2) * 12; g.fillStyle = `rgba(${90 + hash(i) * 50},${60 + hash(i) * 30},40,.55)`; g.beginPath(); g.ellipse(x, y, s * 1.6, s, 0, 0, TAU); g.fill(); }
    });
  },
  fg(g, c) {
    // ochre dust where the hand lands
    const g0 = this.gags[0], ts = (c.wlx - (g0.x + 130)) / V;
    if (ts > 0 && ts < 1.2) {
      c.at(g, 1, () => {
        for (let i = 0; i < 22; i++) { const a = hash(i * 3.1) * TAU, r = (30 + hash(i * 5.7) * 90) * eo(ts / 1.2), x = STAMP + Math.cos(a) * r, y = 646 + Math.sin(a) * r * .8 + ts * 40 * hash(i) + ts * ts * 60; g.globalAlpha = (1 - ts / 1.2) * .7; g.fillStyle = i % 3 ? '#b4552e' : '#e0a867'; g.beginPath(); g.arc(x, y, 3 + hash(i * 1.3) * 6 * (1 - ts / 1.7), 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      });
    }
    // drifting dust motes in the torch light, then a heavy vignette
    for (let i = 0; i < 26; i++) { const x = ((hash(i * 4.4) * W * 1.4 - c.cam * (.3 + hash(i) * .5) + c.t * (8 + i)) % (W * 1.4) + W * 1.4) % (W * 1.4) - 200, y = 100 + hash(i * 2.7) * 700 + Math.sin(c.t * .9 + i) * 14; g.fillStyle = `rgba(255,210,150,${.12 + .2 * hash(i * 9)})`; g.beginPath(); g.arc(x, y, 1.4 + hash(i) * 1.8, 0, TAU); g.fill(); }
    vignette(g, .55);
  },
  events(k) {
    const g0 = this.gags[0], g1 = this.gags[1];
    ev(T(k, g0.x + 130 - 60), 'handpress', .9); ev(T(k, g0.x + 130), 'dustpuff', .9);
    ev(T(k, g1.x + 20), 'gasp', .7); for (let i = 0; i < 6; i++) ev(T(k, g1.x + 60 + i * 55), 'hoof', .5 + .06 * i);
  },
};

// =================================================================== 2. CLAY TABLET (cuneiform on mud brick, dusk)
const CLAY = { sky0: '#2c2750', sky1: '#e8a064', sky2: '#f3cf94', clay: '#c7955b', clayD: '#8d5f34', clayL: '#e3b983', brick: '#b88650', ink: '#3a2312' };
// one wedge sign: a head (triangle) with a tail line, bevelled
function wedge(g, x, y, a, s, col, hi, sh) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = sh; g.beginPath(); g.moveTo(1.5 * s, 1.5 * s); g.lineTo(12 * s + 1.5 * s, -7 * s + 1.5 * s); g.lineTo(12 * s + 1.5 * s, 7 * s + 1.5 * s); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(10 * s, 0); g.lineTo(28 * s, -1.3 * s); g.lineTo(28 * s, 1.5 * s); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.lineTo(12 * s, -7 * s); g.lineTo(12 * s, 7 * s); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(10 * s, 0); g.lineTo(28 * s, -1 * s); g.lineTo(28 * s, 1 * s); g.closePath(); g.fill();
  g.strokeStyle = hi; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(12 * s, -7 * s); g.stroke(); g.restore();
}
// a sign = a neat cluster of wedges (vertical, horizontal, diagonal), picked from a few templates
const SIGNS = [[[0, 0, 1], [15, 0, 1], [30, 0, 1]], [[0, 0, 0], [0, 14, 0], [34, 4, 1]], [[0, 0, 1], [16, 0, 1], [0, 26, 0], [0, 40, 0]], [[0, 0, 2], [16, 10, 2], [34, 2, 1]], [[0, 4, 0], [20, 0, 1], [36, 0, 1], [20, 28, 0]], [[0, 0, 1], [0, 26, 1], [24, 12, 0]]];
function sign(g, x, y, seed, s, col = '#6b4020', hi = '#f3d4a0', sh = '#3a2010') {
  const tpl = SIGNS[Math.floor(hash(seed * 3.1) * SIGNS.length) % SIGNS.length], ang = [0, Math.PI / 2, Math.PI / 4];
  for (const [dx, dy, k] of tpl) wedge(g, x + dx * s, y + dy * s - 14 * s, ang[k], s * .78, col, hi, sh);
}
function zig(g, x, y, w, h, col, col2) {                        // stepped tower silhouette
  const n = 5; for (let i = 0; i < n; i++) { const ww = w * (1 - i / n * .75), hh = h / n; g.fillStyle = i % 2 ? col2 : col; g.fillRect(x - ww / 2, y - (i + 1) * hh, ww, hh + 1); }
  g.fillStyle = col2; g.beginPath(); g.moveTo(x - 20, y - h - 2); g.lineTo(x + 20, y - h - 2); g.lineTo(x + 10, y - h - 22); g.lineTo(x - 10, y - h - 22); g.fill();
  g.fillStyle = rgba('#1a1030', .5); for (let i = 0; i < 3; i++) g.fillRect(x - 14 + i * 14, y - 30, 8, 30);
}
export const tablet = {
  id: 'tablet', paper: '#c9965c', rim: '#e9cfa4', camLx: 1100,
  gags: [{ x: lxAfter(1.5), len: 300 }, { x: lxAfter(3.3), len: 760 }],
  walk: { id: 'tablet', pal: { scarf: '#f4d9a2', cap: '#e6b873' }, line: '#3a1f10', lw: 4.5, rim: 'rgba(250,225,180,.5)', rw: 3, ramp: ['#2c170c', '#6e3b1e', '#b87743', '#eab67a', '#fbe3b8'] },
  step: 'clay', push: null,
  burst: { n: 44, size: 14, g: 650, draw: (g, s, i, p, r) => { wedge(g, -10, 0, i * 1.3, s * .25, '#8a542c', '#f3d4a0', '#3a2010'); } },
  token: (g) => tagCard(g, { fill: '#d6a56a', line: '#3a1f10', w: 56, h: 62, r: 6 }, (g) => { sign(g, -14, -14, 5, 1.2, '#6b4020', '#f3d4a0', '#3a2010'); sign(g, -2, 8, 9, 1.1, '#6b4020', '#f3d4a0', '#3a2010'); }),
  pose(c) {
    const p0 = c.gp(0), p1 = c.gp(1), crouch = bell(p0, .06, .3, .5, .72), hold = ss(seg(p0, .55, .9)) * (1 - ss(seg(p1, 0, .3)));
    const w = Math.max(crouch, hold);
    return { crouch: crouch * .7, lean: .2 * crouch, stop: crouch * .5, armN: w > .01 ? { x: lerp(640 + 88, 640 + 70, hold), y: lerp(GY - 62, GY - 250, hold), w: clamp(w * 1.5) } : null, look: -.15 * hold + .12 * crouch };
  },
  held(g, c, J) {
    const p0 = c.gp(0), p1 = c.gp(1), hold = ss(seg(p0, .5, .9)), tuck = ss(seg(p1, 0, .32));
    if (hold <= 0 || tuck >= 1) return;
    const hx = J.aN.H[0] + 30, hy = J.aN.H[1] - 10, bx = J.bag[0], by = J.bag[1] + 6, k = 1 - tuck, x = lerp(bx, hx, k), y = lerp(by, hy, k), s = lerp(.35, 1, k);
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-.18 * k); g.fillStyle = '#d6a56a'; g.strokeStyle = '#3a1f10'; g.lineWidth = 4; g.beginPath(); rr(g, -48, -32, 96, 64, 8); g.fill(); g.stroke(); sign(g, -36, -14, 3, 1.15, '#6b4020', '#f3d4a0', '#3a2010'); sign(g, -2, -14, 8, 1.15, '#6b4020', '#f3d4a0', '#3a2010'); sign(g, -20, 10, 14, 1.0, '#6b4020', '#f3d4a0', '#3a2010'); g.restore();
  },
  bg(g, c) {
    const t = c.t;
    const sk = g.createLinearGradient(0, 0, 0, 640); sk.addColorStop(0, CLAY.sky0); sk.addColorStop(.45, '#8f5a7a'); sk.addColorStop(.75, CLAY.sky1); sk.addColorStop(1, CLAY.sky2); g.fillStyle = sk; g.fillRect(0, 0, W, H);
    // stars + low sun
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,240,210,${.25 + .5 * hash(i)})`; g.beginPath(); g.arc(hash(i * 3.3) * W, hash(i * 7.1) * 280, .8 + hash(i * 2) * 1.2, 0, TAU); g.fill(); }
    // far: a low sun, ziggurats and palms, slow parallax
    { const rg = g.createRadialGradient(1300, 300, 10, 1300, 300, 520); rg.addColorStop(0, 'rgba(255,230,160,.9)'); rg.addColorStop(.3, 'rgba(255,170,100,.4)'); rg.addColorStop(1, 'rgba(255,170,100,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, 620); }
    c.at(g, .45, (a, b) => {
      for (let i = Math.floor(a / 900) - 1; i < b / 900 + 1; i++) { zig(g, i * 900 + 420 + hash(i) * 120, 330, 300 + hash(i * 3) * 120, 170 + hash(i * 5) * 70, '#6a4064', '#7b4a68'); }
      for (let i = Math.floor(a / 190) - 1; i < b / 190 + 1; i++) { if (hash(i * 2.2) < .45) continue; const x = i * 190 + hash(i) * 90; g.strokeStyle = '#3d2848'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, 330); g.lineTo(x + 6, 250); g.stroke(); for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + 6, 250); g.quadraticCurveTo(x + 6 + Math.cos(k * 1.05 - 2.6) * 36, 224 + Math.sin(k) * 6, x + 6 + Math.cos(k * 1.05 - 2.6) * 60, 258 + Math.sin(k * 1.05 - 2.6) * 22); g.stroke(); } }
    }, 80);
    // mid: the giant tablet wall; rows of wedge signs are pressed in behind the courier as he walks
    const rowH = 80, top = 262, bottom = 646;
    c.at(g, 1, (a, b) => {
      g.fillStyle = '#d9ab6e'; g.fillRect(a - 10, top, b - a + 20, bottom - top + 10);
      const cg = g.createLinearGradient(0, top, 0, bottom); cg.addColorStop(0, 'rgba(255,236,190,.35)'); cg.addColorStop(.6, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(90,50,20,.3)'); g.fillStyle = cg; g.fillRect(a - 10, top, b - a + 20, bottom - top + 10);
      g.fillStyle = 'rgba(255,240,200,.65)'; g.fillRect(a - 10, top, b - a + 20, 5); g.fillStyle = 'rgba(80,40,14,.55)'; g.fillRect(a - 10, top - 6, b - a + 20, 6);
      const wlx = c.wlx;
      for (let r = 0; r < 4; r++) {
        const y = top + 20 + r * rowH; g.fillStyle = 'rgba(80,40,14,.45)'; g.fillRect(a - 10, y + rowH - 22, b - a + 20, 2.5); g.fillStyle = 'rgba(255,240,200,.5)'; g.fillRect(a - 10, y + rowH - 19.5, b - a + 20, 1.5);
        for (let i = Math.floor(a / 98) - 1; i < b / 98 + 1; i++) {
          const x = i * 98 + 10; if (hash(i * 3.7 + r * 11.3) < .1) continue;
          const behind = wlx - 20 - x - (r % 2) * 40 + (3 - r) * 0; if (behind < 0 && x > 0) continue;
          const k = ss(clamp(behind / 120));
          g.save(); g.globalAlpha = Math.min(1, k * 1.3); g.translate(0, (1 - k) * -14); sign(g, x, y + 28, i * 7 + r * 31, 1.55, '#5d3a1e', '#fbe6b8', '#2f1a0a'); g.restore();
        }
      }
      for (let i = Math.floor(a / 300) - 1; i < b / 300 + 1; i++) { g.strokeStyle = 'rgba(60,28,10,.3)'; g.lineWidth = 2; g.beginPath(); let x = i * 300 + hash(i) * 200, y = top; g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (hash(i * 5 + s) - .5) * 40; y += 30 + hash(i * 3 + s) * 40; g.lineTo(x, y); } g.stroke(); }
    }, 60);
    texFill(g, noiseTile(21, 256, 8, 4), 0, top, W, bottom - top, { alpha: .22, op: 'multiply', ox: -c.cam, scale: 2 });
    // ground: packed clay with reeds in a ditch behind
    c.at(g, 1, (a, b) => {
      g.fillStyle = '#7b5230'; g.fillRect(a, 646, b - a, H - 646);
      const gg = g.createLinearGradient(0, 646, 0, H); gg.addColorStop(0, '#a77543'); gg.addColorStop(.35, '#8d5f34'); gg.addColorStop(1, '#4a2c17'); g.fillStyle = gg; g.fillRect(a, 646, b - a, H - 646);
      g.fillStyle = 'rgba(40,20,8,.45)'; g.fillRect(a, 640, b - a, 12);                        // wall base shadow
      for (let i = Math.floor(a / 70) - 1; i < b / 70 + 1; i++) { if (hash(i * 3.1) < .45) continue; const x = i * 70 + hash(i) * 50, y = 700 + hash(i * 7) * 360; g.fillStyle = rgba('#3a2010', .25); g.beginPath(); g.ellipse(x, y, 18 + hash(i) * 20, 4 + hash(i * 3) * 5, 0, 0, TAU); g.fill(); }
      // reed bundles standing against the wall
      for (let i = Math.floor(a / 460) - 1; i < b / 460 + 1; i++) { const x = i * 460 + 250; for (let k = 0; k < 9; k++) { const h = 110 + hash(i * 9 + k) * 80, sw = Math.sin(c.t * 1.4 + k + i) * 3; g.strokeStyle = k % 2 ? '#8a9a3c' : '#a8b050'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + k * 7, 700); g.quadraticCurveTo(x + k * 7 + sw, 700 - h / 2, x + k * 11 - 20 + sw * 2, 700 - h); g.stroke(); } }
    });
    // gag 1: a pile of small tablets; the courier takes the top one
    c.at(g, 1, () => {
      const px = this.gags[0].x + 160, p0 = c.gp(0), taken = p0 > .5 ? 1 : 0;
      for (let i = 0; i < 5 - taken; i++) { const w = 100 - i * 6; g.fillStyle = '#d3a06a'; g.strokeStyle = '#4a2810'; g.lineWidth = 3; g.beginPath(); rr(g, px - w / 2 + (i % 2) * 6, 790 - i * 20, w, 22, 5); g.fill(); g.stroke(); for (let k = 0; k < 4; k++) sign(g, px - w / 2 + 14 + k * 20 + (i % 2) * 6, 794 - i * 20, i * 4 + k, .38); }
      // a clay jar that rocks as the courier passes
      const jx = this.gags[1].x + 360, q = clamp((c.wlx - (jx - 260)) / 340), rock = Math.sin(q * 14) * (1 - q) * .12 * (q > 0 && q < 1 ? 1 : 0);
      g.save(); g.translate(jx, 830); g.rotate(rock); g.fillStyle = '#b47a44'; g.strokeStyle = '#3a1f10'; g.lineWidth = 4; g.beginPath(); g.moveTo(-26, -150); g.quadraticCurveTo(-72, -70, -42, 0); g.lineTo(42, 0); g.quadraticCurveTo(72, -70, 26, -150); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#7a4a26'; g.fillRect(-30, -160, 60, 14); g.strokeRect(-30, -160, 60, 14);
      g.strokeStyle = '#3a1f10'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-58 + k * 6, -100 + k * 20); g.quadraticCurveTo(0, -80 + k * 20 + 14, 58 - k * 6, -100 + k * 20); g.stroke(); } g.restore();
    });
  },
  fg(g, c) {
    // the stylus: the courier writes a new sign while walking: wedge sparks follow the walker's hand
    const g1 = this.gags[1], q = clamp((c.wlx - g1.x) / g1.len);
    if (q > 0 && q < 1) {
      for (let i = 0; i < 6; i++) { const u = clamp(q * 6 - i); if (u <= 0 || u >= 1) continue; const x = WSX + 90 + i * 8 - u * 60, y = GY - 330 - 40 * u; g.save(); g.globalAlpha = 1 - u; wedge(g, x, y, -.6 + i, 1.1, '#6b4020', '#f3d4a0', '#3a2010'); g.restore(); }
    }
    vignette(g, .32);
  },
  events(k) { const g0 = this.gags[0], g1 = this.gags[1]; ev(T(k, g0.x + 80), 'pickup', .9); for (let i = 0; i < 5; i++) ev(T(k, g1.x + 100 + i * 140), 'stamp', .5); ev(T(k, g1.x + 360 - 220), 'jar', .8); },
};


// =================================================================== 3. WOODBLOCK PRINT (868: ink, indigo, vermilion on laid paper)
const WP = { paper: '#e8dbb0', paper2: '#d9c893', ink: '#1c1a22', indigo: '#27407a', verm: '#c2412d' };
const SUTRA = '如是我闻一时佛在舍卫国祇树给孤独园与大比丘众千二百五十人俱尔时世尊食时着衣持钵入舍卫大城乞食';
function ridge(g, a, b, base, amp, seed, step = 14) {
  g.beginPath(); g.moveTo(a, base + 400); for (let x = a; x <= b + step; x += step) g.lineTo(x, base - amp * (.55 * vnoise(x / 170 + seed) + .35 * vnoise(x / 61 + seed * 3) + .1 * vnoise(x / 17 + seed * 5)) - amp * .3);
  g.lineTo(b + step, base + 400); g.closePath();
}
function pine(g, x, y, s, seed) {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round';
  g.strokeStyle = WP.ink; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(14 * (hash(seed) - .5) * 4, -90, 6, -190); g.stroke();
  for (let k = 0; k < 4; k++) { const cx = (hash(seed + k) - .5) * 70, cy = -180 - k * 36, rx = 70 - k * 8; g.beginPath(); g.ellipse(cx, cy, rx, 22, (hash(seed * 2 + k) - .5) * .3, 0, TAU); g.fillStyle = WP.paper; g.fill(); g.lineWidth = 3.5; g.strokeStyle = WP.ink; g.stroke(); for (let n = -5; n <= 5; n++) { g.beginPath(); g.moveTo(cx + n * rx / 5.5, cy - 4); g.lineTo(cx + n * rx / 5 + n * 1.5, cy + 16); g.lineWidth = 2; g.stroke(); } }
  g.restore();
}
function sheetText(g, x, y, text, size, col, cols = 1, lh = 1.12) { g.save(); g.font = `600 ${size}px "Noto Serif SC"`; g.fillStyle = col; g.textAlign = 'center'; const per = Math.ceil(text.length / cols); for (let c = 0; c < cols; c++) for (let i = 0; i < per; i++) { const ch = text[c * per + i]; if (ch) g.fillText(ch, x - c * size * 1.3, y + i * size * lh); } g.restore(); }
const SEAL = lxAfter(2) + 150;
export const wood = {
  id: 'wood', paper: WP.paper, rim: '#f6edcf', camLx: 1100,
  gags: [{ x: lxAfter(2), len: 340 }, { x: lxAfter(5.3), len: 700 }],
  walk: { id: 'wood', pal: { scarf: '#c2412d', cap: '#efe4bd' }, line: '#1c1a22', lw: 5, rim: '#e8dbb0', rw: 2, post: true, off: [3, 2], ramp: ['#1c1a22', '#27407a', '#c2412d', '#d9c893', '#efe4bd'] },
  step: 'wood', push: null,
  burst: { n: 46, size: 12, g: 360, spin: 1.5, draw: (g, s, i, p, r) => { if (i % 3 === 0) { g.fillStyle = WP.verm; g.fillRect(-s / 2, -s / 2, s, s); } else { g.fillStyle = WP.ink; g.beginPath(); g.ellipse(0, 0, s * .45, s * .8, 0, 0, TAU); g.fill(); g.fillStyle = WP.paper; g.fillRect(-1, -s * .6, 2, s * .6); } } },
  token: (g) => tagCard(g, { fill: WP.paper, line: WP.ink, w: 54, h: 66, r: 3 }, (g) => { g.fillStyle = WP.verm; g.fillRect(-14, -14, 28, 28); g.fillStyle = WP.paper; g.font = '700 22px "Noto Serif SC"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('印', 0, 1); }),
  pose(c) {
    const p0 = c.gp(0), w = bell(p0, .1, .35, .55, .8), p1 = c.gp(1), up = bell(p1, .1, .3, .5, .8);
    return { armN: w > .001 ? { x: c.X(SEAL - 30), y: GY - 300 + 40 * Math.max(0, Math.sin(clamp((p0 - .35) / .25) * Math.PI)) * 1.2, w } : null, lean: .08 * w, look: -.3 * up, mouth: up };
  },
  bg(g, c) {
    g.fillStyle = WP.paper; g.fillRect(0, 0, W, H);
    // laid paper: faint chain lines and a mottled fibre texture
    texFill(g, noiseTile(31, 256, 24, 4), 0, 0, W, H, { alpha: .22, op: 'multiply', ox: -c.cam, scale: 1.5 });
    g.fillStyle = 'rgba(120,90,40,.07)'; for (let y = 0; y < H; y += 9) g.fillRect(0, y, W, 1.4);
    // far mountains: outline + hatch + mist
    for (const [k, base, amp, seed, sh] of [[.3, 560, 270, 1.3, .5], [.55, 640, 190, 4.7, .8]]) c.at(g, k, (a, b) => {
      ridge(g, a, b, base, amp, seed); g.fillStyle = WP.paper; g.fill(); g.lineWidth = 4; g.strokeStyle = WP.ink; g.stroke();
      ridge(g, a, b, base, amp, seed); hatch(g, [a, base - amp, b, base + 100], -1.15, 9, 1.8, WP.ink, sh);
      g.fillStyle = 'rgba(232,219,176,.85)'; for (let i = Math.floor(a / 600) - 1; i < b / 600 + 1; i++) { g.beginPath(); g.ellipse(i * 600 + 200 + k * 100, base - amp * .35, 280, 24, 0, 0, TAU); g.fill(); }
    }, 100);
    // pines (mid)
    c.at(g, .8, (a, b) => { for (let i = Math.floor(a / 520) - 1; i < b / 520 + 1; i++) { if (hash(i * 3.1) < .3) continue; pine(g, i * 520 + 130 + hash(i) * 200, 700, .7 + hash(i * 5) * .4, i * 3.3); } }, 60);
    // pavilion with banners (near plane)
    c.at(g, 1, (a, b) => {
      for (let i = Math.floor(a / 1700) - 1; i < b / 1700 + 1; i++) {
        const x = i * 1700 + 600; if (i === 0 && false) continue;
        g.save(); g.translate(x, 0);
        // platform + steps
        g.fillStyle = WP.paper2; g.strokeStyle = WP.ink; g.lineWidth = 4; g.fillRect(-300, 770, 600, 60); g.strokeRect(-300, 770, 600, 60); for (let s = 0; s < 6; s++) { g.beginPath(); g.moveTo(-300 + s * 100, 770); g.lineTo(-300 + s * 100, 830); g.lineWidth = 2; g.stroke(); }
        // columns
        for (const cx of [-250, -90, 90, 250]) { g.fillStyle = WP.verm; g.fillRect(cx - 14, 470, 28, 300); g.lineWidth = 4; g.strokeRect(cx - 14, 470, 28, 300); g.fillStyle = WP.paper2; g.fillRect(cx - 22, 760, 44, 14); g.strokeRect(cx - 22, 760, 44, 14); }
        // roof
        g.beginPath(); g.moveTo(-380, 478); g.quadraticCurveTo(-300, 470, -240, 420); g.quadraticCurveTo(0, 340, 240, 420); g.quadraticCurveTo(300, 470, 380, 478); g.lineTo(380, 492); g.quadraticCurveTo(300, 488, 250, 520); g.lineTo(-250, 520); g.quadraticCurveTo(-300, 488, -380, 492); g.closePath(); g.fillStyle = WP.ink; g.fill();
        g.strokeStyle = WP.paper; g.lineWidth = 2; for (let k = -9; k <= 9; k++) { g.beginPath(); g.moveTo(k * 24, 372 + Math.abs(k) * 4); g.lineTo(k * 26, 500); g.stroke(); }
        g.beginPath(); g.moveTo(-150, 372); g.quadraticCurveTo(0, 300, 150, 372); g.lineTo(100, 340); g.quadraticCurveTo(0, 276, -100, 340); g.closePath(); g.fillStyle = WP.indigo; g.fill(); g.strokeStyle = WP.ink; g.lineWidth = 4; g.stroke();
        g.fillStyle = WP.ink; g.fillRect(-4, 240, 8, 70);
        // hanging sutra banners between columns
        for (const bx of [-170, 0, 170]) { g.fillStyle = WP.paper; g.fillRect(bx - 34, 524, 68, 230); g.lineWidth = 3; g.strokeStyle = WP.ink; g.strokeRect(bx - 34, 524, 68, 230); g.fillStyle = WP.ink; g.fillRect(bx - 40, 520, 80, 8); sheetText(g, bx + 12, 560, SUTRA.slice((Math.abs(i) * 11 + (bx + 170) / 17) % 20 | 0, ((Math.abs(i) * 11 + (bx + 170) / 17) % 20 | 0) + 6) + '佛说', 30, WP.ink, 2, 1.17); }
        g.restore();
      }
    }, 80);
    // ground strokes and grass tufts
    c.at(g, 1, (a, b) => {
      g.strokeStyle = WP.ink; g.lineWidth = 3.5; g.beginPath(); g.moveTo(a, 832); for (let x = a; x <= b + 30; x += 30) g.lineTo(x, 832 + (vnoise(x / 60) - .5) * 8); g.stroke();
      for (let i = Math.floor(a / 70) - 1; i < b / 70 + 1; i++) { if (hash(i * 7.1) < .35) continue; const x = i * 70 + hash(i) * 50; g.lineWidth = 2.2; g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(x, 840); g.quadraticCurveTo(x + k * 4, 818, x + k * 11, 800 - Math.abs(k) * 4 + hash(i + k) * 8); } g.stroke(); }
      // lower border: double rule like the edge of a printed leaf
      g.fillStyle = WP.ink; g.fillRect(a, 905, b - a, 5); g.fillRect(a, 918, b - a, 2);
      for (let i = Math.floor(a / 120) - 1; i < b / 120 + 1; i++) { g.save(); g.translate(i * 120 + 60, 985); g.strokeStyle = WP.indigo; g.lineWidth = 4; g.beginPath(); for (let k = 0; k < 3; k++) g.arc(0, k * 6, 38 - k * 12, Math.PI, 0); g.stroke(); g.restore(); }
    });
    // gag 1: the seal press
    const g0 = this.gags[0], p0 = c.gp(0), press_ = bell(p0, .3, .5, .55, .85), printed = p0 > .52;
    c.at(g, 1, () => {
      g.fillStyle = '#d6c08a'; g.fillRect(SEAL - 120, 770, 240, 60); g.lineWidth = 4; g.strokeStyle = WP.ink; g.strokeRect(SEAL - 120, 770, 240, 60);
      g.fillStyle = WP.paper; g.fillRect(SEAL - 100, 756, 200, 16); g.strokeRect(SEAL - 100, 756, 200, 16);
      if (printed) { const k = back(clamp((p0 - .52) * 5), 2.5); g.save(); g.translate(SEAL, 746); g.scale(k, k); g.fillStyle = WP.verm; g.fillRect(-34, -34, 68, 68); g.fillStyle = WP.paper; g.font = '700 46px "Noto Serif SC"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('金刚', 0, -1, 56); g.restore(); }
      const dy = press_ * 70; g.fillStyle = '#9b6a3a'; g.fillRect(SEAL - 12, 470 + dy, 24, 190); g.strokeRect(SEAL - 12, 470 + dy, 24, 190); g.fillRect(SEAL - 50, 440 + dy, 100, 34); g.strokeRect(SEAL - 50, 440 + dy, 100, 34); g.fillStyle = WP.verm; g.fillRect(SEAL - 30, 660 + dy, 60, 40); g.strokeRect(SEAL - 30, 660 + dy, 60, 40);
    });
    // gag 2: printed sheets that lift into the air in the courier's wake
    const g1 = this.gags[1];
    c.at(g, 1, () => {
      for (let i = 0; i < 9; i++) {
        const sx = g1.x + 90 + i * 68, q = (c.wlx - (sx - 60)) / V; const base = 800;
        const u = clamp(q / 2.2); const y = base - 30 * (i % 2) - (q > 0 ? Math.sin(Math.min(1, u) * Math.PI) * 260 * (.6 + .4 * hash(i)) + u * 80 : 0), rot = q > 0 ? q * (2 + hash(i * 2) * 3) : 0, x = sx + (q > 0 ? q * 70 : 0);
        g.save(); g.translate(x, y); g.rotate(Math.sin(rot) * .6); g.scale(1, Math.abs(Math.cos(rot * .5)) * .6 + .4); g.fillStyle = WP.paper; g.fillRect(-26, -36, 52, 72); g.lineWidth = 3; g.strokeStyle = WP.ink; g.strokeRect(-26, -36, 52, 72); g.fillStyle = WP.ink; for (let r = 0; r < 5; r++) g.fillRect(-18 + (r % 2), -28 + r * 12, 36 - (r * 7 % 9), 5); g.restore();
      }
    });
    // misregistered vermilion wash drifting over the paper, then a soft mottled vignette
    vignette(g, .22);
  },
  events(k) { const g0 = this.gags[0], g1 = this.gags[1]; ev(T(k, g0.x + 120), 'seal', 1); for (let i = 0; i < 5; i++) ev(T(k, g1.x + 40 + i * 70), 'paper', .5); },
};

// =================================================================== 4. LETTERPRESS (c. 1455: blackletter, rubrics, gold, vine margins)
const LP = { page: '#efe3bf', page2: '#e2d3a6', ink: '#17130f', red: '#b3321f', blue: '#2b4a8a', gold: '#cfa13a', wood: '#4a3322', wood2: '#33231a' };
const VULG = ['In principio creavit Deus caelum et terram.', 'Terra autem erat inanis et vacua, et tenebrae', 'erant super faciem abyssi: et spiritus Dei', 'ferebatur super aquas. Dixitque Deus: Fiat', 'lux. Et facta est lux. Et vidit Deus lucem', 'quod esset bona: et divisit lucem a tenebris.', 'Appellavitque lucem Diem, et tenebras Noctem.', 'Factumque est vespere et mane, dies unus.', 'Dixit quoque Deus: Fiat firmamentum in medio', 'aquarum: et dividat aquas ab aquis. Et fecit', 'Deus firmamentum, divisitque aquas, quae erant', 'sub firmamento, ab his, quae erant super', 'firmamentum. Et factum est ita. Vocavitque', 'Deus firmamentum, Caelum: et factum est'];
function textColumn(v) {
  return bake('col' + v, 600, 660, (g) => {
    g.font = '700 40px UnifrakturCook'; g.fillStyle = LP.ink; g.textBaseline = 'alphabetic';
    for (let i = 0; i < 13; i++) { const s = VULG[(i + v * 3) % VULG.length]; g.save(); const w = g.measureText(s).width; g.translate(40, 80 + i * 46); g.scale(Math.min(1.12, 520 / w), 1); g.fillText(i === 0 && v % 2 === 0 ? s.slice(1) : s, i === 0 && v % 2 === 0 ? 70 : 0, 0); g.restore(); }
    if (v % 2 === 0) { g.fillStyle = LP.gold; g.fillRect(34, 36, 62, 62); g.fillStyle = LP.blue; g.fillRect(38, 40, 54, 54); g.fillStyle = LP.red; g.font = '700 78px UnifrakturCook'; g.fillText('I', 54, 90); g.strokeStyle = LP.gold; g.lineWidth = 2; g.strokeRect(38, 40, 54, 54); }
    g.fillStyle = LP.red; g.font = '700 32px UnifrakturCook'; if (v % 2) g.fillText('Capitulum ' + (v + 1), 40, 44);
  });
}
function vine(g, x0, y0, len, seed, t, dir = 1) {
  g.save(); g.lineCap = 'round'; g.strokeStyle = LP.blue; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0);
  const pts = []; for (let i = 0; i <= 24; i++) { const y = y0 + dir * i * len / 24, x = x0 + Math.sin(i * .7 + seed) * 22; pts.push([x, y]); g.lineTo(x, y); } g.stroke();
  pts.forEach(([x, y], i) => { if (i % 3 !== 1) return; const s = i % 6 === 1 ? 1 : -1; g.fillStyle = i % 2 ? LP.red : LP.gold; g.beginPath(); g.ellipse(x + s * 18, y, 11, 6, s * .5 + Math.sin(t * 2 + i) * .08, 0, TAU); g.fill(); g.strokeStyle = LP.ink; g.lineWidth = 1.2; g.stroke(); if (i % 6 === 4) { g.fillStyle = LP.red; g.beginPath(); g.arc(x - s * 10, y + 4, 6, 0, TAU); g.fill(); } });
  g.restore();
}
const SORTS = ['L', 'U', 'X'];
export const press = {
  id: 'press', paper: LP.page, rim: '#f8f0d4', camLx: 1100,
  gags: [{ x: lxAfter(1.7), len: 520 }, { x: lxAfter(5.3), len: 640 }],
  walk: { id: 'press', pal: { scarf: '#b3321f', cap: '#cfa13a' }, line: '#17130f', lw: 4.5, rim: '#efe3bf', rw: 2.5, ramp: ['#17130f', '#4a4036', '#9d9078', '#eadfc0', '#fbf5df'] },
  step: 'wood', push: null,
  burst: { n: 46, size: 20, g: 600, spin: 2, draw: (g, s, i, p, r) => { g.fillStyle = i % 4 === 0 ? '#e0583f' : (i % 2 ? '#f6ecc8' : LP.gold); g.font = `700 ${s * 2.4}px UnifrakturCook`; g.textAlign = 'center'; g.fillText('AEIOUTRSNMLCDPQxyz'[i % 18], 0, 0); } },
  token: (g) => tagCard(g, { fill: LP.page, line: LP.ink, w: 54, h: 66, r: 3 }, (g) => { g.fillStyle = LP.gold; g.fillRect(-18, -22, 36, 36); g.fillStyle = LP.blue; g.fillRect(-15, -19, 30, 30); g.fillStyle = LP.red; g.font = '700 38px UnifrakturCook'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('A', 0, -3); }),
  pose(c) {
    const p0 = c.gp(0), p1 = c.gp(1), look = bell(p0, .1, .3, .7, 1), pull = bell(p1, .25, .5, .6, .85);
    const barx = c.X(this.gags[1].x + 420 + 30 * Math.cos(clamp((p1 - .3) / .3) * Math.PI));
    return { look: -.28 * look, mouth: look, armN: pull > .001 ? { x: barx, y: GY - 268, w: pull } : null, lean: .12 * pull };
  },
  bg(g, c) {
    g.fillStyle = LP.page; g.fillRect(0, 0, W, H); texFill(g, noiseTile(41, 256, 9, 4), 0, 0, W, H, { alpha: .45, op: 'multiply', ox: -c.cam, scale: 2 });
    const pg = g.createLinearGradient(0, 0, 0, H); pg.addColorStop(0, 'rgba(120,80,30,.18)'); pg.addColorStop(.25, 'rgba(0,0,0,0)'); g.fillStyle = pg; g.fillRect(0, 0, W, H);
    // page columns with their marginalia (the "page plane")
    c.at(g, 1, (a, b) => {
      for (let i = Math.floor(a / 640) - 1; i < b / 640 + 1; i++) {
        const x = i * 640, v = ((i % 4) + 4) % 4; g.drawImage(textColumn(v), x, 96); g.strokeStyle = LP.ink; g.globalAlpha = .6; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 14, 104); g.lineTo(x + 14, 730); g.moveTo(x + 590, 104); g.lineTo(x + 590, 730); g.stroke(); g.globalAlpha = 1;
        vine(g, x + 622, 120, 560, i * 1.7, c.t, 1);
        if (i % 3 === 1) { g.save(); g.translate(x + 622, 640 + Math.sin(c.t * 2 + i) * 3); g.fillStyle = LP.red; g.beginPath(); g.ellipse(0, 0, 20, 14, 0, 0, TAU); g.fill(); g.fillStyle = LP.ink; g.beginPath(); g.arc(14, -6, 8, 0, TAU); g.fill(); g.fillStyle = LP.gold; g.beginPath(); g.moveTo(20, -6); g.lineTo(34, -2); g.lineTo(20, 0); g.fill(); g.restore(); }
      }
      g.fillStyle = LP.ink; g.fillRect(a, 742, b - a, 4); g.fillRect(a, 752, b - a, 1.5);
    });
    // bench: the press bed, wood with lead type scattered
    c.at(g, 1, (a, b) => {
      const wg = g.createLinearGradient(0, 760, 0, H); wg.addColorStop(0, LP.wood); wg.addColorStop(1, LP.wood2); g.fillStyle = wg; g.fillRect(a, 836, b - a, H - 836);
      g.fillStyle = '#6e4d34'; g.fillRect(a, 832, b - a, 10); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 880; y < H; y += 46) g.fillRect(a, y, b - a, 3);
      for (let i = Math.floor(a / 80) - 1; i < b / 80 + 1; i++) { if (hash(i * 4.4) < .5) continue; const x = i * 80 + hash(i) * 40, y = 900 + hash(i * 9) * 140; g.save(); g.translate(x, y); g.rotate((hash(i * 3) - .5) * 1.2); g.fillStyle = '#8a8d94'; g.fillRect(-5, -14, 10, 28); g.fillStyle = '#c4c7cd'; g.fillRect(-5, -14, 10, 4); g.restore(); }
    });
    texFill(g, noiseTile(43, 256, 5, 3), 0, 832, W, H - 832, { alpha: .35, op: 'multiply', ox: -c.cam, scale: 3 });
    // gag 1: mirrored sorts hop and flip to print the right way round
    const g0 = this.gags[0];
    c.at(g, 1, () => {
      SORTS.forEach((ch, i) => {
        const bx = g0.x + 230 + i * 110, q = clamp((c.wlx - (bx - 200)) / 260), h = Math.sin(q * Math.PI) * 190 * (q > 0 && q < 1 ? 1 : 0), fl = q > .5 ? 1 : -1, sq = Math.abs(Math.cos(q * Math.PI));
        g.save(); g.translate(bx, 832 - h); g.fillStyle = '#8a8d94'; g.strokeStyle = LP.ink; g.lineWidth = 3; g.beginPath(); rr(g, -30, -96, 60, 96, 4); g.fill(); g.stroke(); g.fillStyle = '#b8bbc2'; g.fillRect(-30, -96, 60, 12); g.fillStyle = q > 0 ? LP.ink : '#3c3e44'; g.font = '700 70px UnifrakturCook'; g.textAlign = 'center'; g.save(); g.scale(fl * (.2 + .8 * Math.max(sq, q > .3 && q < .7 ? 0 : 1)), 1); g.fillText(ch, 0, -20); g.restore(); g.restore();
        if (q >= 1) { g.save(); g.globalAlpha = .9; g.fillStyle = LP.red; g.font = '700 70px UnifrakturCook'; g.textAlign = 'center'; g.fillText(ch, bx, 640 - (SORTS.length - i) * 0); g.restore(); }
      });
    });
    // gag 2: the screw press: a bar the courier pulls
    const g1 = this.gags[1], p1 = c.gp(1), ang = ss(clamp((p1 - .3) / .3)) * Math.PI * .9, px = g1.x + 420;
    c.at(g, 1, () => {
      const wood = '#7b5636', dk = '#3a2616';
      g.lineWidth = 4; g.strokeStyle = dk; g.fillStyle = wood;
      for (const s of [-1, 1]) { g.fillRect(px + s * 120 - 26, 330, 52, 506); g.strokeRect(px + s * 120 - 26, 330, 52, 506); }
      g.fillRect(px - 170, 300, 340, 64); g.strokeRect(px - 170, 300, 340, 64);
      const drop = bell(p1, .35, .55, .6, .85) * 70; g.fillRect(px - 90, 660 + drop - 70, 180, 40); g.strokeRect(px - 90, 660 + drop - 70, 180, 40);
      g.fillStyle = '#9a7a52'; g.fillRect(px - 16, 364, 32, 266 + drop - 70); g.strokeRect(px - 16, 364, 32, 266 + drop - 70);
      const bl = 220, bx = Math.cos(ang) * bl, by = 440;
      g.fillStyle = dk; g.beginPath(); g.moveTo(px - bx, by - 10 * Math.sin(ang)); g.lineTo(px + bx, by + 10 * Math.sin(ang)); g.lineWidth = 14; g.strokeStyle = dk; g.lineCap = 'round'; g.stroke(); g.fillStyle = '#9a7a52'; g.beginPath(); g.arc(px + bx, by + 10 * Math.sin(ang), 14, 0, TAU); g.fill();
      g.beginPath(); g.arc(px - bx, by - 10 * Math.sin(ang), 14, 0, TAU); g.fill();
      g.fillStyle = LP.page; g.fillRect(px - 76, 826, 152, 14); g.strokeStyle = LP.ink; g.lineWidth = 3; g.strokeRect(px - 76, 826, 152, 14);
      if (p1 > .6) { const k = clamp((p1 - .6) * 3); g.save(); g.translate(px, 820 - 60 * k); g.fillStyle = LP.page; g.fillRect(-70, -70, 140, 110); g.strokeRect(-70, -70, 140, 110); g.fillStyle = LP.ink; g.font = '700 28px UnifrakturCook'; g.textAlign = 'center'; g.fillText('In principio', 0, -22); g.fillStyle = LP.red; g.font = '700 54px UnifrakturCook'; g.fillText('lux', 0, 28); g.restore(); }
    });
    vignette(g, .25);
  },
  events(k) { const g0 = this.gags[0], g1 = this.gags[1]; SORTS.forEach((s, i) => ev(T(k, g0.x + 230 + i * 110 + 20), 'clack', .8)); ev(T(k, g1.x + 100), 'screw', .8); ev(T(k, g1.x + 270), 'thump', 1); ev(T(k, g1.x + 330), 'sheet', .7); },
};
