// Era painters, part 2: copperplate telegraph, Art Nouveau telephone, 1973 pop street, 1992 LCD pixel, today's flat desk.
import { clamp, lerp, seg, ss, eo, back, hash, vnoise, TAU } from '/core/lib.js';
import { W, H, GY, WSX, bake, hex, mixc, rgba, rr, blob, hatch, noiseTile, texFill, vignette, tagCard, bell, drawWorld } from './scroll.js';
import { lxAfter, V, ev, T, B, C, TS, T_LIFT, T_GRID, WX_END, BEAT } from './timeline.js';

// =================================================================== 5. TELEGRAPH (1844: copperplate engraving, sepia on cream)
const EN = { paper: '#efe6cc', ink: '#2a2118', mid: '#6e5a3c', faint: '#b9a67f' };
const wireY = (x, y0) => { const P = 640, u = (((x % P) + P) % P) / P; return y0 + 70 * 4 * u * (1 - u); };
function pole(g, x, base, top) {
  g.strokeStyle = EN.ink; g.fillStyle = EN.paper; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x - 11, base); g.lineTo(x - 8, top); g.lineTo(x + 8, top); g.lineTo(x + 11, base); g.closePath(); g.fill(); g.stroke();
  g.lineWidth = 1.6; for (let y = top + 14; y < base; y += 9) { g.beginPath(); g.moveTo(x - 9 + (y - top) * .003, y); g.lineTo(x - 2, y + 3); g.stroke(); }
  g.fillStyle = EN.paper; g.lineWidth = 3.5; g.fillRect(x - 70, top + 8, 140, 14); g.strokeRect(x - 70, top + 8, 140, 14);
  for (const d of [-52, 52]) { g.fillStyle = EN.paper; g.beginPath(); g.moveTo(x + d - 8, top + 8); g.lineTo(x + d - 5, top - 14); g.lineTo(x + d + 5, top - 14); g.lineTo(x + d + 8, top + 8); g.closePath(); g.fill(); g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + d - 6, top - 6); g.lineTo(x + d + 6, top - 6); g.stroke(); g.lineWidth = 3.5; }
}
const KEYX = lxAfter(2.2) + 260;
const TAPS = [.34, .46, .62, .76];                       // gag progress at which the key is tapped (dot dot dash dot)
const PULSE_V = 1500;
const WIRE0 = lxAfter(1.0);                              // phase of the wire poles in local x (poles every 640 px)
export const wire = {
  id: 'wire', paper: EN.paper, rim: '#f7f0dc', camLx: 1100,
  gags: [{ x: lxAfter(1.9), len: 560 }, { x: lxAfter(5.3), len: 500 }],
  walk: { id: 'wire', pal: { scarf: '#2a2118', cap: '#cdbd96', coat: '#6b5a40' }, line: '#1f1710', lw: 3.6, rim: '#efe6cc', rw: 2.5, ramp: ['#1f1710', '#4a3a28', '#8c7757', '#e6dbbd', '#f6efd8'] },
  step: 'grass', push: { b0: 1.8, b1: 4.4, z: 1.22 },
  burst: { n: 50, size: 14, g: 300, spin: 2, draw: (g, s, i, p, r) => { g.strokeStyle = EN.ink; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + i; g.moveTo(Math.cos(a) * s * .3, Math.sin(a) * s * .3); g.lineTo(Math.cos(a) * s, Math.sin(a) * s); } g.stroke(); g.fillStyle = EN.paper; g.beginPath(); g.arc(0, 0, s * .22, 0, TAU); g.fill(); } },
  token: (g) => tagCard(g, { fill: EN.paper, line: EN.ink, w: 54, h: 66, r: 4 }, (g) => { g.fillStyle = EN.ink; g.beginPath(); g.arc(-14, -8, 4.5, 0, TAU); g.fill(); g.beginPath(); g.arc(-2, -8, 4.5, 0, TAU); g.fill(); g.fillRect(6, -12, 18, 8); g.beginPath(); g.arc(-14, 10, 4.5, 0, TAU); g.fill(); g.fillRect(-6, 6, 18, 8); }),
  pose(c) {
    const p0 = c.gp(0), p1 = c.gp(1), tap = Math.max(...TAPS.map(a => bell(p0, a - .05, a, a + .02, a + .07)));
    const w = bell(p0, .12, .3, .82, .98), look = bell(p1, .0, .2, .6, 1);
    return { armN: w > .001 ? { x: c.X(KEYX - 30), y: GY - 236 + tap * 18, w } : null, lean: .12 * w, look: -.28 * look, mouth: look, stop: .0 };
  },
  bg(g, c) {
    g.fillStyle = EN.paper; g.fillRect(0, 0, W, H); texFill(g, noiseTile(51, 256, 12, 4), 0, 0, W, H, { alpha: .3, op: 'multiply', ox: -c.cam * .5, scale: 2 });
    // engraved sky: horizontal lines, dense and heavy at the top, thinning to the horizon
    g.fillStyle = EN.ink; for (let y = 0; y < 600; y += 6) { const k = Math.pow(1 - y / 600, 1.5); g.fillRect(0, y, W, .5 + 3.2 * k); }
    // clouds (paper holes in the lines, outlined, shaded underneath), slow parallax
    c.at(g, .2, (a, b) => { for (let i = Math.floor(a / 700) - 1; i < b / 700 + 1; i++) { const x = i * 700 + 200 + hash(i * 2) * 200, y = 200 + hash(i * 7) * 220, s = .8 + hash(i * 3) * .6; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); blob(g, 0, 0, 200, 50, i * 3.3, 16, .2); g.fillStyle = EN.paper; g.fill(); g.strokeStyle = EN.ink; g.lineWidth = 3; g.stroke(); g.save(); g.beginPath(); blob(g, 0, 0, 200, 50, i * 3.3, 16, .2); g.clip(); hatch(g, [-210, 0, 210, 60], -.5, 7, 1.6, EN.ink, .75); g.restore(); g.restore(); } }, 400);
    // hills: outlines with cross-hatching
    for (const [k, base, amp, seed, gap] of [[.4, 700, 150, 2.1, 8], [.65, 760, 90, 6.3, 6]]) c.at(g, k, (a, b) => {
      g.beginPath(); g.moveTo(a, 900); for (let x = a; x <= b + 20; x += 20) g.lineTo(x, base - amp * (.6 * vnoise(x / 240 + seed) + .4 * vnoise(x / 70 + seed * 2))); g.lineTo(b + 20, 900); g.closePath(); g.fillStyle = EN.paper; g.fill(); g.lineWidth = 3; g.strokeStyle = EN.ink; g.stroke();
      hatch(g, [a, base - amp, b, 900], -.7, gap, 1.5, EN.ink, .9); hatch(g, [a, base - amp * .5, b, 900], .7, gap * 1.5, 1.2, EN.ink, .6);
      for (let i = Math.floor(a / 140) - 1; i < b / 140 + 1; i++) { if (hash(i * 3.1 + seed) < .5) continue; const x = i * 140 + hash(i + seed) * 90, y = base - amp * (.6 * vnoise(x / 240 + seed) + .4 * vnoise(x / 70 + seed * 2)) + 8, r = 22 + hash(i * 9) * 20; g.beginPath(); blob(g, x, y - r * .6, r, r * .8, i * 1.3 + seed, 10, .22); g.fillStyle = EN.paper; g.fill(); g.lineWidth = 2.5; g.stroke(); g.save(); g.beginPath(); blob(g, x, y - r * .6, r, r * .8, i * 1.3 + seed, 10, .22); g.clip(); hatch(g, [x - r, y - r * 1.6, x + r, y + r], .9, 4, 1.3, EN.ink, .9); g.restore(); }
    }, 100);
    // meadow: engraved parallel lines
    c.at(g, 1, (a, b) => {
      g.fillStyle = EN.paper; g.fillRect(a, 832, b - a, H - 832); g.fillStyle = EN.ink;
      for (let y = 838; y < H; y += 5) { const k = (y - 832) / 250; g.fillRect(a, y, b - a, .8 + 1.2 * k); }
      g.fillRect(a, 830, b - a, 3);
      for (let i = Math.floor(a / 56) - 1; i < b / 56 + 1; i++) { if (hash(i * 7.1) < .4) continue; const x = i * 56 + hash(i) * 40; g.strokeStyle = EN.ink; g.lineWidth = 2; g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(x, 836); g.quadraticCurveTo(x + k * 3, 812, x + k * 9, 796 - Math.abs(k) * 4 + hash(i + k) * 8); } g.stroke(); }
    });
    // poles and wires
    c.at(g, 1, (a, b) => {
      for (const [y0, off] of [[360, 0], [378, 0], [396, 0]]) { g.strokeStyle = EN.ink; g.lineWidth = 2; g.beginPath(); for (let x = Math.floor(a / 20) * 20 - 20; x <= b + 20; x += 20) { const yy = wireY(x - WIRE0, y0 + 0), px = x; x === Math.floor(a / 20) * 20 - 20 ? g.moveTo(px, yy) : g.lineTo(px, yy); } g.stroke(); }
      for (let i = Math.floor((a - WIRE0) / 640) - 1; i < (b - WIRE0) / 640 + 1; i++) pole(g, WIRE0 + i * 640, 836, 330);
    }, 200);
    // the key box on a post, by the road
    c.at(g, 1, () => {
      g.fillStyle = EN.paper; g.strokeStyle = EN.ink; g.lineWidth = 3.5; g.fillRect(KEYX - 7, 600, 14, 236); g.strokeRect(KEYX - 7, 600, 14, 236);
      g.beginPath(); rr(g, KEYX - 52, 540, 104, 64, 6); g.fill(); g.stroke(); hatch(g, [KEYX - 52, 540, KEYX + 52, 604], .8, 5, 1.2, EN.ink, .8);
      const tap = Math.max(...TAPS.map(a => bell(c.gp(0), a - .05, a, a + .02, a + .07)));
      g.lineWidth = 3.5; g.beginPath(); g.moveTo(KEYX - 38, 536 - 0); g.lineTo(KEYX + 34, 530 + tap * 10); g.stroke(); g.fillStyle = EN.ink; g.beginPath(); g.arc(KEYX + 34, 528 + tap * 10, 10, 0, TAU); g.fill();
    });
    // pulses run along the wire, and the bird on it takes off
    const g0 = this.gags[0];
    const pulses = TAPS.map((a, i) => ({ t0: (c.wlx - (g0.x + g0.len * a)) / V, kind: i === 2 ? 2 : 1 }));
    c.at(g, 1, () => {
      for (const p of pulses) { const dt = p.t0; if (dt < 0 || dt > 4) continue; const x = KEYX + dt * PULSE_V, y = wireY(x - WIRE0, 378);
        g.save(); g.translate(x, y); g.fillStyle = EN.paper; g.strokeStyle = EN.ink; g.lineWidth = 2.4; const r = 11 * p.kind; g.beginPath(); g.ellipse(0, 0, r * (p.kind === 2 ? 1.8 : 1), r, 0, 0, TAU); g.fill(); g.stroke(); for (let k = 0; k < 8; k++) { const ang = k / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(ang) * (r + 4) * (p.kind === 2 ? 1.5 : 1), Math.sin(ang) * (r + 4)); g.lineTo(Math.cos(ang) * (r + 16), Math.sin(ang) * (r + 16)); g.stroke(); } g.restore(); }
      const bx = KEYX + 1180, first = (pulses[0].t0 * PULSE_V + KEYX), left = first > bx - 20, fly = Math.max(0, (first - bx + 20) / PULSE_V);
      const by = wireY(bx - WIRE0, 378) - 14, ox = fly > 0 ? fly * 340 : 0, oy = fly > 0 ? -Math.min(fly, 1.6) * 280 + fly * fly * 20 : 0;
      if (fly < 3) { g.save(); g.translate(bx + ox, by + oy); g.fillStyle = EN.ink; g.beginPath(); g.ellipse(0, 0, 18, 10, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(14, -3); g.lineTo(26, -6); g.lineTo(15, 2); g.fill(); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-34, 8); g.lineTo(-30, -2); g.fill(); if (fly > 0) { const fl = Math.sin(fly * 40) * 22; g.beginPath(); g.moveTo(-2, -4); g.lineTo(-8, -26 - fl); g.lineTo(8, -10); g.closePath(); g.fill(); } else { g.fillRect(-2, 9, 2, 8); g.fillRect(6, 9, 2, 8); } g.restore(); }
    });
    // heavy engraved edge: a plate-mark vignette
    vignette(g, .18);
  },
  events(k) {
    const g0 = this.gags[0], g1 = this.gags[1];
    TAPS.forEach((a, i) => { const t = T(k, g0.x + g0.len * a); ev(t, 'key', 1, { dash: i === 2 ? 1 : 0 }); ev(t + .03, 'pulse', .8, { dash: i === 2 ? 1 : 0 }); });
    ev(T(k, g0.x + g0.len * TAPS[0]) + 1180 / PULSE_V, 'wingflap', .8);
  },
};

// =================================================================== 6. TELEPHONE (Art Nouveau: whiplash curves, sage, gold, rose)
const AN = { cream: '#f0e4c8', sage: '#a7b58a', teal: '#2f4a45', gold: '#c9a24a', rose: '#d6998f', plum: '#6a3d4f', line: '#2a2a22', dusk: '#e9b78f' };
function whip(g, x, y, s, flip, col, lw) {                 // a whiplash flourish
  g.save(); g.translate(x, y); g.scale(s * flip, s); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(60, -30, 110, 10, 90, 50); g.bezierCurveTo(75, 80, 40, 60, 55, 40); g.bezierCurveTo(65, 30, 80, 40, 74, 52); g.stroke(); g.restore();
}
function lily(g, x, y, s, rot, col, col2) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.lineWidth = 3; g.strokeStyle = AN.line; for (let k = -2; k <= 2; k++) { g.save(); g.rotate(k * .45); g.fillStyle = k % 2 ? col : col2; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-20, -30, -14, -70, 0, -86); g.bezierCurveTo(14, -70, 20, -30, 0, 0); g.fill(); g.stroke(); g.restore(); } g.fillStyle = AN.gold; g.beginPath(); g.arc(0, -4, 8, 0, TAU); g.fill(); g.restore();
}
const PH1 = lxAfter(2.3) + 300, PH2 = lxAfter(2.3) + 1500;
function candle(g, x, y, ring, ringT, hook) {              // a candlestick telephone on a little table
  g.save(); g.translate(x, y); const sh = ring > 0 ? Math.sin(ringT * 70) * 3 * ring : 0; g.translate(sh, 0);
  g.lineWidth = 4; g.strokeStyle = AN.line;
  // table: curved legs
  g.fillStyle = AN.plum; g.beginPath(); rr(g, -110, 0, 220, 16, 8); g.fill(); g.stroke(); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 90, 16); g.bezierCurveTo(s * 120, 70, s * 60, 100, s * 80, 140); g.lineWidth = 9; g.stroke(); g.strokeStyle = AN.plum; g.lineWidth = 5; g.stroke(); g.strokeStyle = AN.line; g.lineWidth = 4; }
  // phone: base, stem, mouthpiece, hook with earpiece
  g.fillStyle = AN.gold; g.beginPath(); g.ellipse(0, -8, 62, 16, 0, 0, TAU); g.fill(); g.stroke(); g.fillRect(-9, -250, 18, 242); g.strokeRect(-9, -250, 18, 242);
  g.fillStyle = AN.teal; g.beginPath(); g.ellipse(0, -258, 34, 14, 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, -258, 14, 5, 0, 0, TAU); g.fillStyle = AN.line; g.fill();
  if (hook) { g.save(); g.translate(40, -190 - hook.lift); g.rotate(hook.rot); g.fillStyle = AN.gold; g.beginPath(); rr(g, -8, -44, 16, 88, 8); g.fill(); g.stroke(); g.fillStyle = AN.teal; g.beginPath(); g.ellipse(0, -48, 20, 10, 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, 48, 20, 10, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  g.restore();
}
export const phone = {
  id: 'phone', paper: AN.cream, rim: '#f8f0dc', camLx: 1100,
  gags: [{ x: lxAfter(2.0), len: 640 }, { x: lxAfter(5.7), len: 500 }],
  walk: { id: 'phone', pal: { scarf: '#c8645a', cap: '#c9a24a', coat: '#4d6a5a' }, line: '#2a2a22', lw: 5, rim: '#f0e4c8', rw: 2.5, ramp: ['#2a2a22', '#2f4a45', '#8a9a6a', '#e8d9ac', '#f6ecd0'] },
  step: 'wood', push: { b0: 2.0, b1: 4.8, z: 1.16 },
  burst: { n: 46, size: 15, g: 260, spin: 2, draw: (g, s, i, p, r) => { lily(g, 0, s * .5, s / 60, i, i % 2 ? AN.rose : AN.cream, AN.sage); } },
  token: (g) => tagCard(g, { fill: AN.cream, line: AN.line, w: 54, h: 66, r: 14 }, (g) => { g.strokeStyle = AN.teal; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(-8, 4, 8 + k * 8, -.9, .9); g.stroke(); } g.fillStyle = AN.gold; g.beginPath(); g.arc(-12, 4, 6, 0, TAU); g.fill(); }),
  pose(c) {
    const p0 = c.gp(0), p1 = c.gp(1), up = bell(p0, .3, .5, .72, .9), ear = ss(seg(p0, .45, .6)) * (1 - ss(seg(p0, .78, .92)));
    const tip = bell(p1, .2, .45, .6, .85);
    const hand = { x: lerp(c.X(PH1 + 40), 640 + 38, ear), y: lerp(826 - 140 + 118 - 190, GY - 300, ear) };
    return { armN: up > .001 ? { x: hand.x, y: hand.y + 6, w: up } : (tip > .001 ? { x: 640 + 26, y: GY - 338, w: tip } : null), lean: -.04 * ear, look: .1 * ear - .1 * tip, mouth: ear };
  },
  bg(g, c) {
    const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#e9dcb4'); sk.addColorStop(1, '#d7c79a'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
    // wallpaper: whiplash vines and lilies on sage stripes (a baked repeat)
    const wp = bake('anwall', 520, 760, (g) => {
      g.fillStyle = '#dfe2bd'; g.fillRect(0, 0, 520, 760); g.fillStyle = 'rgba(167,181,138,.35)'; for (let x = 0; x < 520; x += 130) g.fillRect(x, 0, 64, 760);
      for (let k = 0; k < 2; k++) { g.strokeStyle = AN.teal; g.globalAlpha = .55; g.lineWidth = 3; g.beginPath(); g.moveTo(130 + k * 260, 760); g.bezierCurveTo(60 + k * 260, 560, 200 + k * 260, 420, 130 + k * 260, 240); g.bezierCurveTo(100 + k * 260, 140, 150 + k * 260, 60, 130 + k * 260, 0); g.stroke(); g.globalAlpha = 1; lily(g, 130 + k * 260, 300, .56, k ? .2 : -.2, AN.rose, AN.cream); lily(g, 130 + k * 260 + 40, 560, .42, .7, AN.cream, AN.rose); whip(g, 130 + k * 260, 130, .55, k ? 1 : -1, AN.gold, 3); }
    });
    c.at(g, 1, (a, b) => { for (let i = Math.floor(a / 520) - 1; i < b / 520 + 1; i++) g.drawImage(wp, i * 520, 20); });
    // arched windows with a low sun and the telephone line outside
    c.at(g, .8, (a, b) => {
      for (let i = Math.floor(a / 1250) - 1; i < b / 1250 + 1; i++) {
        const x = i * 1250 + 640; g.save(); g.translate(x, 0);
        g.beginPath(); g.moveTo(-170, 800); g.lineTo(-170, 330); g.arc(0, 330, 170, Math.PI, 0); g.lineTo(170, 800); g.closePath(); g.fillStyle = AN.cream; g.fill(); g.lineWidth = 6; g.strokeStyle = AN.line; g.stroke();
        g.save(); g.beginPath(); g.moveTo(-150, 790); g.lineTo(-150, 330); g.arc(0, 330, 150, Math.PI, 0); g.lineTo(150, 790); g.closePath(); g.clip(); const wg = g.createLinearGradient(0, 160, 0, 800); wg.addColorStop(0, '#f3c7a0'); wg.addColorStop(.5, '#f6dcae'); wg.addColorStop(1, '#b8c6a0'); g.fillStyle = wg; g.fillRect(-170, 150, 340, 660);
        g.fillStyle = '#f2a56b'; g.beginPath(); g.arc(30, 560, 70, 0, TAU); g.fill(); g.fillStyle = '#7e9a7a'; g.beginPath(); g.moveTo(-170, 700); g.quadraticCurveTo(-60, 600, 30, 680); g.quadraticCurveTo(100, 620, 170, 690); g.lineTo(170, 800); g.lineTo(-170, 800); g.fill(); g.restore();
        g.strokeStyle = AN.line; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 180); g.lineTo(0, 790); g.moveTo(-150, 480); g.lineTo(150, 480); g.stroke(); for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(0, 330); g.lineTo(Math.cos(Math.PI + k * .78) * 150, 330 + Math.sin(Math.PI + k * .78) * 150); g.stroke(); }
        whip(g, -190, 760, .8, -1, AN.gold, 5); whip(g, 190, 760, .8, 1, AN.gold, 5);
        g.restore();
      }
    }, 240);
    // hanging line: a swooping festoon from the first telephone to the second
    c.at(g, 1, (a, b) => {
      const x0 = PH1, x1 = PH2; g.strokeStyle = AN.line; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, 546); g.bezierCurveTo(x0 + 300, 300, x1 - 300, 300, x1, 546); g.stroke();
      for (let i = 0; i < 6; i++) { const u = (i + .5) / 6, x = lerp(x0, x1, u), y = 546 - Math.sin(u * Math.PI) * 190; lily(g, x, y + 20, .22, Math.PI + Math.sin(c.t * 1.3 + i) * .1, AN.rose, AN.cream); }
    }, 100);
    // floor: teal boards with a gold whiplash inlay
    c.at(g, 1, (a, b) => {
      const fg = g.createLinearGradient(0, 826, 0, H); fg.addColorStop(0, '#3b5c54'); fg.addColorStop(1, '#22372f'); g.fillStyle = fg; g.fillRect(a, 826, b - a, H - 826);
      g.fillStyle = AN.gold; g.fillRect(a, 826, b - a, 7); g.fillStyle = AN.line; g.fillRect(a, 833, b - a, 3);
      for (let i = Math.floor(a / 210) - 1; i < b / 210 + 1; i++) whip(g, i * 210 + 30, 930, .9, i % 2 ? 1 : -1, 'rgba(201,162,74,.7)', 4);
    });
    // phones: the near one is the gag; the far one rings when the voice arrives
    const g0 = this.gags[0], p0 = c.gp(0), rt = c.wlx > g0.x - 700 && p0 < .3 ? 1 : 0, ringT = c.t;
    const hookLift = ss(seg(p0, .3, .5)) * (1 - ss(seg(p0, .78, .92)));
    // the voice ribbon: after the receiver is lifted, a wave travels along the festoon to the second phone
    const tv = (c.wlx - (g0.x + g0.len * .6)) / V, arrive = PH2 - PH1;
    c.at(g, 1, () => {
      candle(g, PH1, 826 - 140 + 118, rt * (1 - ss(seg(p0, .25, .35))), ringT, null);
      // ring arcs from the first phone
      if (rt && p0 < .3) { for (let k = 0; k < 3; k++) { const u = (c.t * 2.2 + k / 3) % 1; g.strokeStyle = rgba(AN.gold, 1 - u); g.lineWidth = 4; g.beginPath(); g.arc(PH1, 826 - 140 + 118 - 258 + 120 * 0, 40 + u * 70, -2.4, -.7); g.stroke(); g.beginPath(); g.arc(PH1, 826 - 140 + 118 - 258, 40 + u * 70, Math.PI + .7, Math.PI + 2.4); g.stroke(); } }
      const r2 = clamp((tv * 700 - (arrive - 220)) / 400);
      candle(g, PH2, 826 - 140 + 118, ss(seg(tv, arrive / 700, arrive / 700 + 1.3)) > 0 && tv < arrive / 700 + 1.8 ? 1 : 0, ringT, { lift: 0, rot: 0 });
      if (tv > 0 && tv < arrive / 700 + .3) {
        g.strokeStyle = AN.gold; g.lineWidth = 6; g.lineCap = 'round'; for (let k = 0; k < 14; k++) { const u = clamp(tv * 700 / arrive - k * .012), x = lerp(PH1, PH2, u), y = 546 - Math.sin(u * Math.PI) * 190 * (1 - 0 * u) + Math.sin(u * 60 - c.t * 12) * 12; g.globalAlpha = 1 - k / 14; g.beginPath(); g.arc(x, y, 7 - k * .35, 0, TAU); g.fillStyle = k % 2 ? AN.rose : AN.gold; g.fill(); } g.globalAlpha = 1;
      }
    });
    vignette(g, .15);
  },
  held(g, c, J) {                                           // the earpiece the courier lifts off the hook
    const g0 = this.gags[0], p0 = c.gp(0), lift = ss(seg(p0, .4, .55)) * (1 - ss(seg(p0, .8, .94)));
    if (lift <= 0) { c.at(g, 1, () => { g.save(); g.translate(PH1 + 40, 826 - 140 + 118 - 190); g.fillStyle = AN.gold; g.lineWidth = 4; g.strokeStyle = AN.line; g.beginPath(); rr(g, -8, -44, 16, 88, 8); g.fill(); g.stroke(); g.fillStyle = AN.teal; g.beginPath(); g.ellipse(0, -48, 20, 10, 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, 48, 20, 10, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }); return; }
    if (lift >= 1 && p0 > .94) return;
    const home = [c.X(PH1 + 40), 826 - 140 + 118 - 190], hand = J.aN.H, x = lerp(home[0], hand[0], lift), y = lerp(home[1], hand[1] - 12, lift);
    g.save(); g.strokeStyle = AN.line; g.lineWidth = 3; g.beginPath(); g.moveTo(c.X(PH1), 826 - 140 + 118 - 258); g.quadraticCurveTo((x + c.X(PH1)) / 2, Math.max(y, 700) + 80, x, y + 40); g.stroke();
    g.translate(x, y); g.rotate(lerp(0, -.5, lift)); g.fillStyle = AN.gold; g.lineWidth = 4; g.beginPath(); rr(g, -8, -44, 16, 88, 8); g.fill(); g.stroke(); g.fillStyle = AN.teal; g.beginPath(); g.ellipse(0, -48, 20, 10, 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, 48, 20, 10, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
  },
  events(k) { const g0 = this.gags[0], g1 = this.gags[1]; for (let i = 0; i < 6; i++) ev(T(k, g0.x + 20 + i * 36), 'ring', .8); ev(T(k, g0.x + g0.len * .45), 'lift', .9); ev(T(k, g0.x + g0.len * .6), 'voice-wave', .8); ev(T(k, g0.x + g0.len * .6) + (PH2 - PH1) / 700, 'ring', .9); ev(T(k, g1.x + g1.len * .3), 'tip', .6); },
};
