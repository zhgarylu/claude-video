// The eight panels of the demo. Each entry has art(ctx,P) (clipped to the panel, drawn first) and over(ctx,P)
// (balloons and sound words, drawn unclipped after the border so they may break out of the panel).
// P = { b:[x0,y0,x1,y1], tc: content time on twos, k: seconds since the panel was revealed }
(function (G) {
const M = G.MG, C = G.CH;
const { TAU, INK, PAPER, clamp, lerp, ss, seg, pen, shape, tone, pathPoly, ellipsePts, gradLin, gradRad, focusLines, speedLines, sweat, sparkle, flower, burstPts, balloon, narration, sfx, mulberry } = M;
const T = () => G.TXT;
const poly = (...p) => p;
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const white = (ctx, p) => { ctx.fillStyle = PAPER; pathPoly(ctx, p); ctx.fill(); };
const black = (ctx, p) => { ctx.fillStyle = INK; pathPoly(ctx, p); ctx.fill(); };
const ART = {};

// A ---- wide establishing shot: clock tower, 17:58
ART.A = {
  art(ctx, P) {
    const [x0, y0, x1, y1] = P.b;
    // evening sky: dot gradient, dark at the top, empty at the horizon
    tone(ctx, rect(x0, y0, x1, y1), { k: 'dot', pitch: 5.5, ang: 45, f: gradLin(0, -470, 0, -318, 0.62, 0.0) });
    // sun with rays
    const sx = 560, sy = -342;
    focusLines(ctx, sx, sy, 56, 120, 46, 21, 0.9, true, rect(x0, y0, x1, y1));
    white(ctx, ellipsePts(sx, sy, 50, 50, 0, 40)); pen(ctx, ellipsePts(sx, sy, 50, 50, 0, 40), { w: 2.4, closed: true, sharp: true, step: 99, vary: 0.3 });
    // clouds: bumpy cumulus, flat white with a dotted belly
    const cloud = (cx, cy, w, h, seed) => {
      const rn = mulberry(seed), pts = []; const n = 7;
      for (let i = 0; i <= n; i++) { const u = i / n, x = cx - w + 2 * w * u, top = cy - h * Math.sin(Math.PI * u) * (0.75 + 0.5 * rn()); pts.push([x, top]); }
      pts.push([cx + w * 0.55, cy + h * 0.18], [cx, cy + h * 0.28], [cx - w * 0.6, cy + h * 0.18]);
      const sm = M.smoothPts(pts, true, 2); shape(ctx, sm, { w: 2.3, vary: 0.8, seed });
      tone(ctx, [[cx - w, cy - h * 0.1], [cx + w, cy - h * 0.1], [cx + w, cy + h], [cx - w, cy + h]].map(p => p), { k: 'solid', color: 'rgba(0,0,0,0)' });
      ctx.save(); pathPoly(ctx, sm); ctx.clip(); tone(ctx, [[cx - w, cy - h * 0.1], [cx + w, cy - h * 0.1], [cx + w, cy + h], [cx - w, cy + h]], { k: 'dot', pitch: 4.4, pct: 0.42, ang: 45 }); ctx.restore();
    };
    cloud(395, -418, 105, 24, 3); cloud(95, -438, 70, 17, 8); cloud(520, -398, 48, 13, 5);
    // far skyline, solid black with a regular window grid
    const rn = mulberry(5); let x = 30; const far = [[x0, -300]];
    while (x < 700) { const w = 26 + rn() * 34, h = 28 + rn() * 44; far.push([x, -300 - h], [x + w, -300 - h]); x += w + 4; }
    far.push([x1, -300]); black(ctx, far);
    ctx.fillStyle = PAPER; for (let wx = 36; wx < 690; wx += 9) for (let wy = -332; wy < -306; wy += 9) if (M.hash2(wx, wy, 4) > 0.55) ctx.fillRect(wx, wy, 3.2, 4.6);
    // clock tower
    const tx = 190, ty = -392;
    const body = rect(150, -440, 232, -270); shape(ctx, body, { sharp: true, w: 3, vary: 0.7 });
    tone(ctx, rect(190, -440, 232, -270), { k: 'line', pitch: 4.2, pct: 0.42, ang: 90 });
    shape(ctx, [[142, -440], [190, -480], [240, -440]], { fill: INK, sharp: true, w: 3, vary: 0.3 });
    for (const yy of [-430, -350]) pen(ctx, [[150, yy], [232, yy]], { w: 1.6, tin: 0, tout: 0, vary: 0 });
    white(ctx, ellipsePts(tx, ty, 33, 33, 0, 40)); pen(ctx, ellipsePts(tx, ty, 33, 33, 0, 40), { w: 3.6, closed: true, sharp: true, step: 99, vary: 0.5 });
    pen(ctx, ellipsePts(tx, ty, 28.5, 28.5, 0, 40), { w: 1, closed: true, sharp: true, step: 99, vary: 0 });
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 - Math.PI / 2, r0 = i % 3 ? 23 : 20, r1 = 27; pen(ctx, [[tx + Math.cos(a) * r0, ty + Math.sin(a) * r0], [tx + Math.cos(a) * r1, ty + Math.sin(a) * r1]], { w: i % 3 ? 1.2 : 2.4, tin: 0, tout: 0, vary: 0 }); }
    const mA = 58 / 60 * TAU - Math.PI / 2, hA = (5 + 58 / 60) / 12 * TAU - Math.PI / 2;
    pen(ctx, [[tx, ty], [tx + Math.cos(hA) * 15, ty + Math.sin(hA) * 15]], { w: 3.4, tin: 0.05, tout: 0.4, vary: 0 });
    pen(ctx, [[tx, ty], [tx + Math.cos(mA) * 24, ty + Math.sin(mA) * 24]], { w: 2.2, tin: 0.05, tout: 0.4, vary: 0 });
    black(ctx, ellipsePts(tx, ty, 2.6, 2.6, 0, 10));
    // roofs in front of the skyline, then the street
    let hx = -20; const rn2 = mulberry(9);
    while (hx < 700) {
      const w = 76 + rn2() * 50, top = -300 - rn2() * 14;
      const roof = [[hx, -282], [hx + 6, top + 8], [hx + w / 2, top - 14], [hx + w - 6, top + 8], [hx + w, -282]];
      shape(ctx, roof, { sharp: true, w: 2.4, vary: 0.8 }); tone(ctx, roof, { k: 'line', pitch: 4.4, pct: 0.5, ang: 20 });
      if (rn2() > 0.4) shape(ctx, rect(hx + w * 0.62, top - 14, hx + w * 0.62 + 9, top - 30), { fill: INK, sharp: true, w: 1.6 });
      hx += w - 3;
    }
    white(ctx, rect(x0 - 5, -282, x1 + 5, y1 + 5));
    pen(ctx, [[x0 - 5, -282], [x1 + 5, -282]], { w: 3, tin: 0, tout: 0, vary: 0 });
    tone(ctx, rect(x0 - 5, -282, x1 + 5, -274), { k: 'line', pitch: 3.6, pct: 0.5, ang: 0 });
    for (const [bx, by, s] of [[300, -458, 1], [330, -446, 0.8], [270, -444, 0.7]]) pen(ctx, [[bx - 9 * s, by - 3], [bx - 3 * s, by - 7 * s], [bx, by], [bx + 3 * s, by - 7 * s], [bx + 9 * s, by - 3]], { w: 2.2, tin: 0.15, tout: 0.15, vary: 0.2 });
    // a tiny runner crossing the street
    const px = 60 + clamp(P.k, 0, 8) * 30, ph = P.tc * 2.4;
    C.runner(ctx, { x: px, y: -277, s: 0.3, ph, lean: 0.3, dir: 1, headS: 30 });
  },
  over(ctx, P) { const t = T(); narration(ctx, { x: 628, y: -416, text: t.nar1, fs: 17, lw: 2 }); }
};

// B ---- shock close-up
ART.B = {
  art(ctx, P) {
    const [x0, y0, x1, y1] = P.b, cx = 505, cy = -108;
    tone(ctx, rect(x0, y0, x1, y1), { k: 'dot', pitch: 5.5, ang: 45, f: gradRad(cx, cy, 90, 230, 0.0, 0.5, true) });
    focusLines(ctx, cx, cy, 120, 330, 90, 17, 1.0, false, rect(x0, y0, x1, y1));
    const wob = Math.sin(P.tc * 40) * (P.k < 0.7 ? 1.6 : 0.0); // a short tremor after the shock lands
    C.girlHead(ctx, cx + wob, cy + 14, 212, { yaw: 0.28, rot: -0.05, eye: 1.0, eyeKind: 'open', pupil: 0.34, brow: 1, browY: 6, mouth: 'o', sweat: [[-70, -46, 6.5, -0.15], [-76, -24, 4.8, -0.2], [74, -30, 6, 0.2]], hairpin: true });
    // vertical despair lines on the forehead
    for (let i = 0; i < 6; i++) pen(ctx, [[cx - 80 + i * 22 + 8, cy - 104 + (i % 2) * 6], [cx - 80 + i * 22 + 10, cy - 62 - (i % 3) * 5]], { w: 2.6, tin: 0.05, tout: 0.3, vary: 0 });
  },
  over(ctx, P) { const t = T(); balloon(ctx, { x: 618, y: -176, text: t.shock, fs: 30, kind: 'burst', spikes: 10, seed: 4, lw: 2.6 }); }
};

// C ---- the start of the run
ART.C = {
  art(ctx, P) {
    const [x0, y0, x1, y1] = P.b;
    tone(ctx, rect(x0, y0, x1, y1), { k: 'line', pitch: 5.2, ang: 0, ox: -P.tc * 90, f: gradLin(x0, 0, x1, 0, 0.55, 0.0) });
    speedLines(ctx, [x0 - 20, y0, x1 + 20, y1], 0, 34, 31, [80, 260], [1.4, 4.2], false, [200, -110, 90, 130], P.tc * 60);
    // ground
    pen(ctx, [[x0, 26], [x1, 26]], { w: 2.6, tin: 0, tout: 0, vary: 0 });
    tone(ctx, rect(x0, 26, x1, 42), { k: 'line', pitch: 3.8, pct: 0.45, ang: 0, ox: -P.tc * 140 });
    // clear zone and the girl
    white(ctx, burstPts(200, -96, 118, 150, 16, 5, 0.1));
    C.runner(ctx, { x: 190, y: -84, s: 1.25, ph: P.tc * 2.0 + 0.1, lean: 0.34, dir: 1, face: { eye: 0.85, mouth: 'grit', brow: -0.8 } });
    // dust puffs behind the heel
    for (let i = 0; i < 3; i++) { const dx = 96 - i * 34 - (P.tc * 40) % 16, dy = 14 - i * 7, r = 16 - i * 3; const pts = []; for (let q = 0; q < 14; q++) { const a = q / 14 * TAU, rr = r * (q % 2 ? 0.8 : 1.05); pts.push([dx + Math.cos(a) * rr * 1.3, dy - Math.abs(Math.sin(a)) * rr * 0.1 + Math.sin(a) * rr * 0.85]); } shape(ctx, pts, { w: 2, vary: 0.8 }); }
  },
  over(ctx, P) { sfx(ctx, T().sfx_dash, 90, -170, 118, { ang: -4, skew: -0.2, vertical: true, sp: 0.95, rim: 0.12, seed: 14, trail: { ang: 0, n: 4 } }); }
};

// D ---- the sprint down the street
ART.D = {
  art(ctx, P) {
    const [x0, y0, x1, y1] = P.b, vp = [600, 206];
    tone(ctx, rect(x0, y0, x1, 230), { k: 'dot', pitch: 5.5, ang: 45, f: gradLin(0, 54, 0, 230, 0.55, 0.0, true) });
    // left wall of buildings running to the vanishing point
    const lw = [[0, 40], [540, 150], [540, 226], [0, 330]]; white(ctx, lw);
    tone(ctx, lw, { k: 'line', pitch: 5.5, pct: 0.46, ang: -5, f: gradLin(0, 0, 540, 0, 0.8, 0.1) });
    for (let i = 0; i < 6; i++) { const u0 = 0.06 + i * 0.16, u1 = u0 + 0.09; const pp = (u, v) => [lerp(0, 540, u), lerp(lerp(40, 150, u), lerp(330, 226, u), v)]; const wq = [pp(u0, 0.2), pp(u1, 0.2), pp(u1, 0.55), pp(u0, 0.55)]; white(ctx, wq); pen(ctx, wq, { w: 2, closed: true, sharp: true, step: 99, vary: 0.4 }); }
    pen(ctx, lw, { w: 3, closed: true, sharp: true, step: 99, vary: 0.8 });
    const rw = [[707, 80], [640, 160], [640, 232], [707, 262]]; white(ctx, rw); tone(ctx, rw, { k: 'line', pitch: 5, pct: 0.55, ang: 12 }); pen(ctx, rw, { w: 2.6, closed: true, sharp: true, step: 99, vary: 0.8 });
    // road: dotted ground that fades toward the horizon, kerb lines to the vanishing point
    const road = [[0, 330], [540, 226], [640, 232], [707, 262], [707, 500], [0, 500]];
    white(ctx, road); tone(ctx, road, { k: 'dot', pitch: 5.5, ang: 45, f: gradLin(0, 232, 0, 500, 0.0, 0.42, true) });
    pen(ctx, [[0, 344], [540, 230]], { w: 2.4, tin: 0, tout: 0, vary: 0 }); pen(ctx, [[0, 380], [600, 240]], { w: 1.4, tin: 0, tout: 0, vary: 0 });
    // radial speed lines from the vanishing point, a new set every two frames
    focusLines(ctx, vp[0], vp[1], 80, 820, 130, 5 + Math.floor(P.tc * 12 + 0.01) % 3, 1.15, false, rect(x0, y0, x1, y1));
    // clean halo so the lines stop around the runner
    white(ctx, burstPts(300, 280, 175, 205, 18, 7, 0.1));
    tone(ctx, ellipsePts(300, 462, 130, 11, 0, 20), { k: 'solid' });
    C.runner(ctx, { x: 292, y: 292, s: 1.8, ph: P.tc * 2.1 + 0.55, lean: 0.4, dir: 1, face: { eye: 0.8, mouth: 'shout', brow: -0.9, sweat: [[-72, -20, 9, -0.5], [-80, 10, 7, -0.7]] } });
  },
  over(ctx, P) {
    const t = T();
    sfx(ctx, t.sfx_run, 70, 275, 104, { ang: 0, vertical: true, skew: -0.14, sp: 0.9, rim: 0.12, arc: 0.0, seed: 27, fan: 0.0 });
    balloon(ctx, { x: 520, y: 150, text: t.run1, fs: 25, kind: 'oval', tail: [376, 190], lw: 2.6 });
  }
};

// E ---- the last bun
ART.E = {
  art(ctx, P) {
    const [x0, y0, x1, y1] = P.b, cx = -208, cy = -288;
    tone(ctx, rect(x0, y0, x1, y1), { k: 'dot', pitch: 5.5, ang: 45, f: gradRad(cx, cy, 70, 270, 0.0, 0.52, true) });
    // counter top (wood grain as line tone) with a front edge
    const top = [[x0 - 4, -226], [x1 + 4, -240], [x1 + 4, y1 + 6], [x0 - 4, y1 + 6]];
    white(ctx, top); tone(ctx, top, { k: 'line', pitch: 6, pct: 0.28, ang: 4 });
    pen(ctx, [[x0 - 4, -226], [x1 + 4, -240]], { w: 3.4, tin: 0, tout: 0, vary: 0 });
    tone(ctx, [[x0 - 4, -150], [x1 + 4, -160], [x1 + 4, y1 + 6], [x0 - 4, y1 + 6]], { k: 'solid' });
    pen(ctx, [[x0 - 4, -150], [x1 + 4, -160]], { w: 2, color: PAPER, tin: 0, tout: 0, vary: 0 });
    // tray and bun
    shape(ctx, ellipsePts(cx, cy + 40, 110, 24, 0, 28), { w: 3, vary: 0.8 }); tone(ctx, ellipsePts(cx + 20, cy + 44, 92, 14, 0, 24), { k: 'dot', pitch: 4, pct: 0.5, ang: 45 });
    C.bun(ctx, cx, cy, 1.1, {});
    // sparkles around the bun
    const tw = 0.82 + 0.18 * Math.sin(P.tc * 9);
    for (const [dx, dy, r] of [[-120, -62, 20], [112, -74, 15], [128, 6, 10], [-100, 18, 9], [20, -112, 11]]) sparkle(ctx, cx + dx, cy + dy, r * tw);
    // hanging sign
    pen(ctx, [[-98, -462], [-98, -430]], { w: 1.6, tin: 0, tout: 0, vary: 0 }); pen(ctx, [[-60, -462], [-60, -430]], { w: 1.6, tin: 0, tout: 0, vary: 0 });
    shape(ctx, rect(-116, -430, -42, -402), { sharp: true, w: 2.6, vary: 0.6 });
    ctx.save(); ctx.fillStyle = INK; ctx.font = '700 20px "Noto Sans SC"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('18:00', -79, -415); ctx.restore(); if (G.__rec && P.k > 0.34) G.__rec.push({ id: 'sign', text: '18:00', x0: -116, y0: -430, x1: -42, y1: -402 });
  },
  over(ctx, P) { narration(ctx, { x: -338, y: -420, text: T().nar2, fs: 19, lw: 2 }); }
};

// F ---- the other contender
ART.F = {
  art(ctx, P) {
    const [x0, y0, x1, y1] = P.b, cx = -520, cy = -268;
    tone(ctx, rect(x0, y0, x1, y1), { k: 'line', pitch: 5.2, ang: 0, ox: P.tc * 110, f: gradLin(x0, 0, x1, 0, 0.0, 0.55) });
    speedLines(ctx, [x0 - 20, y0, x1 + 20, y1], 0, 26, 41, [90, 260], [1.4, 4], false, [cx, cy, 120, 160], -P.tc * 60);
    white(ctx, burstPts(cx, cy, 130, 150, 14, 3, 0.08));
    C.manHead(ctx, cx, cy + 6, 172, { yaw: -0.3, rot: 0.06, eye: 0.85, pupil: 0.8, brow: -0.9, mouth: 'grit', sweat: [[52, -34, 9, 0.3], [58, -6, 7, 0.4]] });
  },
  over(ctx, P) { balloon(ctx, { x: -612, y: -410, text: T().man, fs: 24, kind: 'oval', tail: [-566, -352], lw: 2.6 }); }
};

// G ---- both hands, one bun
ART.G = {
  art(ctx, P) {
    const [x0, y0, x1, y1] = P.b, cx = -355, cy = 66;
    tone(ctx, rect(x0, y0, x1, y1), { k: 'dot', pitch: 5.5, ang: 45, f: gradRad(cx, cy, 80, 330, 0.0, 0.4, true) });
    focusLines(ctx, cx, cy - 6, 70, 520, 130, 33, 1.0, false, rect(x0, y0, x1, y1));
    white(ctx, burstPts(cx, cy + 34, 150, 78, 14, 4, 0.1));
    shape(ctx, ellipsePts(cx, cy + 82, 90, 15, 0, 20), { w: 2.6, vary: 0.8 });
    C.bun(ctx, cx, cy + 52, 0.78, {});
    const tk = clamp(P.k, 0, 3), reach = ss(seg(P.tc, P.t0 + 1.4, P.t0 + 3.0)); // hands slide in
    C.hand(ctx, lerp(-560, -492, reach), lerp(-70, 36, reach), 1.25, lerp(0.1, 0.5, reach), 'man', {});
    C.hand(ctx, lerp(-150, -218, reach), lerp(-70, 36, reach), 1.25, Math.PI - lerp(0.1, 0.5, reach), 'girl', {});
  },
  over(ctx, P) {
    const t = T(); balloon(ctx, { x: -148, y: -20, text: t.girl1, fs: 24, kind: 'burst', spikes: 9, seed: 6, lw: 2.6 });
    balloon(ctx, { x: -592, y: -22, text: t.man1, fs: 24, kind: 'burst', spikes: 9, seed: 8, lw: 2.6 });
    if (P.k >= P.hit) { const s = 1 + 0.5 * Math.max(0, 1 - (P.k - P.hit) * 9); sfx(ctx, t.sfx_pa, -355, -58, 92 * s, { ang: -6, skew: -0.2, rim: 0.14, sp: 0.66, seed: 31, style: 'solid', font: M.FONT_HEAVY }); }
  }
};

// H ---- the last bun, halved
ART.H = {
  art(ctx, P) {
    const [x0, y0, x1, y1] = P.b, cx = -372, cy = 372;
    tone(ctx, rect(x0, y0, x1, y1), { k: 'dot', pitch: 5.5, ang: 45, f: gradLin(0, 190, 0, 500, 0.0, 0.32) });
    // shoujo flowers scattered on a tone ground
    const rn = mulberry(61); for (let i = 0; i < 16; i++) { const fx = -690 + rn() * 650, fy = 200 + rn() * 290, d = Math.hypot(fx - cx, fy - cy); if (d < 120) continue; flower(ctx, fx, fy, 16 + rn() * 14, rn() * TAU); }
    for (let i = 0; i < 20; i++) { const fx = -700 + rn() * 660, fy = 196 + rn() * 300; if (Math.hypot(fx - cx, fy - cy) < 130) continue; sparkle(ctx, fx, fy, 5 + rn() * 7); }
    white(ctx, ellipsePts(cx, cy + 6, 200, 140, 0, 36));
    shape(ctx, ellipsePts(cx, cy + 66, 148, 22, 0, 26), { w: 3, vary: 0.8 });
    // two halves, apart, each with a flat cut face
    for (const sd of [-1, 1]) C.bun(ctx, cx + sd * 6, cy - 2, 1.3, { cut: sd < 0 ? 'L' : 'R', rot: sd * 0.05 });
    for (const [dx, dy, r] of [[-150, -60, 20], [160, -82, 24], [150, 24, 12], [-132, 28, 10]]) sparkle(ctx, cx + dx, cy + dy, r * (0.85 + 0.15 * Math.sin(P.tc * 8 + dx)));
    C.girlHead(ctx, -590, 452, 124, { yaw: 0.45, rot: 0.08, eye: 0.8, eyeKind: 'closed', mouth: 'smile', blush: true, arc: 0.9 });
    C.manHead(ctx, -152, 462, 112, { yaw: -0.4, rot: -0.07, eye: 0.8, eyeKind: 'closed', mouth: 'smile' });
  },
  over(ctx, P) {
    const t = T();
    balloon(ctx, { x: -372, y: 238, text: t.baker, fs: 24, kind: 'oval', tail: [-372, 188], lw: 2.6 });
    balloon(ctx, { x: -520, y: 292, text: t.ok, fs: 19, kind: 'oval', tail: [-560, 360], lw: 2.4 });
    balloon(ctx, { x: -224, y: 296, text: t.ok, fs: 19, kind: 'oval', tail: [-180, 372], lw: 2.4 });
  }
};

G.ART = ART;
})(window);
