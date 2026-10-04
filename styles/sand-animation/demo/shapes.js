// shapes.js: the pictures, described as sand (strokes = finger trails, blobs = heaps, clouds = scattered grains).
// World is 1920 x 1080. Every function returns a SAND.Shape.
(function () {
  const { Shape, mulberry, gauss } = SAND;
  const mirrorX = (pts, cx) => pts.map(p => [2 * cx - p[0], p[1]]);

  // a heap poured from one point: wide base, soft peak
  function mound(cx = 960, base = 960, rx = 330, ry = 250) {
    const s = new Shape('mound'); s.vis = 0.42; s.haze = 0.05;
    s.blob(cx, base - ry * 0.3, rx, ry * 0.6, 1.0, { soft: 0.6 });
    s.blob(cx, base - ry * 0.5, rx * 0.55, ry * 0.5, 1.3, { soft: 0.75 });
    s.blob(cx, base - ry * 0.75, rx * 0.22, ry * 0.3, 1.5, { soft: 0.85, br: 1.1 });
    s.blob(cx, base + 6, rx * 1.25, 14, 0.9, { soft: 0.5 });
    return s;
  }

  // a broadleaf tree: trunk, recursive branches, foliage as clouds of loose grains
  function tree(cx = 960, ground = 985, seed = 5) {
    const r = mulberry(seed), s = new Shape('tree'); s.vis = 0.92; s.haze = 0.05;
    // ground and roots
    s.blob(cx, ground + 6, 380, 22, 1.0, { soft: 0.6 });
        s.stroke([[cx - 20, ground - 30], [cx - 90, ground - 4], [cx - 190, ground + 8]], 40, 6, 1, { ph: 3 });
    s.stroke([[cx + 20, ground - 30], [cx + 100, ground - 2], [cx + 200, ground + 6]], 40, 6, 1, { ph: 4 });
    // trunk (slightly leaning, tapering)
    const trunk = [[cx - 4, ground], [cx - 14, ground - 90], [cx + 6, ground - 180], [cx - 8, ground - 265], [cx + 4, ground - 340]];
    s.stroke(trunk, 112, 44, 1.15, { ph: 5, wob: 0.1 });
    const tips = [];
    function branch(x, y, ang, len, w, depth) {
      const pts = [[x, y]]; let a = ang, px = x, py = y;
      for (let j = 0; j < 4; j++) { a += (r() - 0.5) * 0.5 + (ang < -Math.PI / 2 ? 0.05 : -0.05); px += Math.cos(a) * len / 4; py += Math.sin(a) * len / 4; pts.push([px, py]); }
      s.stroke(pts, w, Math.max(5, w * 0.5), 1.1, { ph: r() * 6, wob: 0.12 });
      if (depth > 0) {
        const mid = pts[2];
        branch(mid[0], mid[1], a - 0.6 - r() * 0.35, len * 0.62, w * 0.5, depth - 1);
        branch(px, py, a + 0.45 + r() * 0.3, len * 0.74, w * 0.55, depth - 1);
        branch(px, py, a - 0.35 - r() * 0.3, len * 0.72, w * 0.52, depth - 1);
      } else tips.push([px, py]);
    }
    const top = trunk[trunk.length - 1], up = -Math.PI / 2;
    branch(top[0], top[1], up - 0.95, 200, 46, 2);
    branch(top[0], top[1], up + 0.95, 200, 46, 2);
    branch(top[0], top[1], up - 0.38, 215, 50, 2);
    branch(top[0], top[1], up + 0.34, 215, 50, 2);
    branch(top[0], top[1], up, 170, 42, 2);
    branch(cx + 4, ground - 230, up - 1.25, 190, 36, 2);
    branch(cx - 6, ground - 210, up + 1.2, 200, 36, 2);
    // crown: lumpy overlapping clouds around the branch tips and in between
    const crown = [];
    const cy = ground - 540;
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r());
      crown.push([cx + Math.cos(a) * rr * 400, cy + Math.sin(a) * rr * 215 + (Math.sin(a) > 0 ? -20 : 0), 62 + r() * 58]);
    }
    tips.forEach(t => crown.push([t[0] + gauss(r) * 20, t[1] + gauss(r) * 16, 52 + r() * 40]));
    crown.forEach(c => s.cloud(c[0], c[1], c[2], 0.22 + r() * 0.1, { br: 0.72 }));
    // a few loose leaves in the air
    for (let i = 0; i < 18; i++) s.cloud(cx + (r() - 0.5) * 900, cy + 120 + r() * 360, 5 + r() * 4, 0.5, { br: 1.0 });
    return s;
  }

  // a gull in a wide glide: swept wings of broad feather streaks, a small body, a forked tail
  function bird(cx = 960, cy = 470, seed = 9) {
    const r = mulberry(seed), s = new Shape('bird'); s.vis = 0.74; s.haze = 0.06;
    const side = (sgn, lift) => {
      const X = x => cx + sgn * x, edge = [[X(60), cy + 40], [X(190), cy - 25 - lift * 0.3], [X(360), cy - 95 - lift], [X(560), cy - 90 - lift * 1.1], [X(770), cy - 10 - lift * 0.6], [X(900), cy + 92 - lift * 0.2]];
      // wing mass, then the leading edge on top
      const under = [[X(70), cy + 70], [X(240), cy + 52 - lift * 0.3], [X(450), cy + 40 - lift], [X(650), cy + 70 - lift * 0.8], [X(800), cy + 130 - lift * 0.4]];
      s.poly(edge.concat(under.slice().reverse()), 1.9, { edge: 9, br: 0.9 });
      s.stroke(edge, 92, 12, 1.5, { ph: sgn * 2 + 1, pow: 0.8, wob: 0.1, br: 1.1 });
      // feathers: broad finger drags down and back from the leading edge, overlapping like laid sand
      const nF = 15;
      for (let i = 0; i < nF; i++) {
        const q = 0.05 + i / nF * 0.95, idx = q * (edge.length - 1), i0 = Math.floor(idx), f = idx - i0;
        const a = edge[i0], b = edge[Math.min(edge.length - 1, i0 + 1)], px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f + 30;
        const len = (110 + 210 * Math.sin(Math.PI * Math.min(1, q * 0.85 + 0.12))) * (0.92 + r() * 0.16);
        const sweepX = sgn * (28 + 80 * q), ex = px + sweepX, ey = py + len;
        s.stroke([[px, py], [px + sweepX * 0.2, py + len * 0.45], [ex, ey]], 52 - 14 * q, 9, 1.2, { ph: r() * 6, pow: 0.75, wob: 0.22, br: 1.0, soft: 0.5 });
      }
      for (let i = 0; i < 4; i++) {
        const t = edge[edge.length - 1], ph = i * 0.2;
        s.stroke([[t[0] - sgn * 80 + sgn * i * 10, t[1] - 20 + i * 5], [t[0] + sgn * (20 + i * 15), t[1] + 70 + ph * 80], [t[0] + sgn * (36 + i * 26), t[1] + 150 + ph * 160]], 26, 4, 1.0, { ph: i });
      }
    };
    side(-1, 0); side(1, 22);
    // body, head, beak, tail
    s.stroke([[cx, cy - 20], [cx + 2, cy + 70], [cx, cy + 170]], 104, 30, 1.7, { soft: 0.5, wob: 0.04, br: 1.05 });
    s.blob(cx + 6, cy - 54, 34, 36, 1.7, { soft: 0.5, br: 1.1 });
    s.stroke([[cx + 28, cy - 62], [cx + 62, cy - 54], [cx + 88, cy - 36]], 18, 4, 1.4, {});
    for (let i = -2; i <= 2; i++) s.stroke([[cx + i * 8, cy + 160], [cx + i * 26, cy + 250], [cx + i * 52, cy + 335]], 36 - Math.abs(i) * 4, 5, 1, { ph: i, wob: 0.1 });
    s.place(0.8, cx, cy + 60, 0, 30);
    return s;
  }

  // a breaking wave: a heavy back, a curl of spiral, foam grains and spray, swell lines in front
  function wave(cx = 960, seed = 3) {
    const r = mulberry(seed), s = new Shape('wave'); s.vis = 0.88; s.haze = 0.05;
    const back = [[140, 832], [330, 812], [620, 764], [860, 664], [1010, 530], [1110, 412], [1207, 320]];
    const C = [1214, 452], curl = [];
    for (let k = 0; k <= 11; k++) {
      const th = -Math.PI / 2 - 0.05 + k / 11 * 4.35, rad = 132 - 80 * (k / 11);
      curl.push([C[0] + Math.cos(th) * rad, C[1] + Math.sin(th) * rad]);
    }
    const spine = back.concat(curl.slice(1));
    // body of the wave: the back (narrow at the foot, heavy at the shoulder), then the curl; broad washes under it
    s.stroke(back, 36, 124, 1.5, { ph: 1.5, pow: 1.0, wob: 0.12, br: 1.1, tapE: 0 });
    s.stroke(curl, 124, 16, 1.5, { ph: 2.5, pow: 0.8, wob: 0.1, br: 1.15, tapS: 0 });
    for (let j = 1; j <= 3; j++) s.stroke(back.slice(1, 7 - j + 1).map(p => [p[0] + 20 * j, p[1] + 84 * j * 0.9]), 110, 40, 0.55, { ph: j, soft: 0.6, br: 0.9, wob: 0.2 });
    // water-surface lines following the back, offset down: broad finger drags
    for (let j = 1; j <= 4; j++) {
      const off = 46 * j, ptsJ = back.slice(0, 7 - Math.floor(j / 2)).map((p, i, a) => [p[0] + off * 0.45 + j * 5, p[1] + off * (1 - 0.18 * i / a.length)]);
      s.stroke(ptsJ, 44 - j * 4, 10, 1.1, { ph: j * 1.3, wob: 0.2, br: 1.0 });
    }
    for (let k = 0; k < 11; k++) { const q = curl[k]; s.cloud(q[0] + gauss(r) * 8, q[1] + gauss(r) * 8, 20 + r() * 20, 1.3, { br: 1.3 }); }
    for (let k = 0; k < 22; k++) { const a = -0.2 - r() * 1.7, d = 120 + r() * 260; s.cloud(C[0] + 60 + Math.cos(a) * d, C[1] - 90 + Math.sin(a) * d * 0.8, 8 + r() * 14, 1, { br: 1.3 }); }
    s.cloud(C[0] + 140, C[1] - 130, 170, 0.14, { br: 1 });
    for (let j = 0; j < 3; j++) {
      const y = 915 + j * 46, pts = [];
      for (let x = 40; x <= 1900; x += 220) pts.push([x + gauss(r) * 10, y + Math.sin(x * 0.008 + j * 1.9) * 15]);
      s.stroke(pts, 36 - j * 6, 24 - j * 4, 1.0, { ph: j * 2, wob: 0.25 });
    }
    for (let j = 0; j < 2; j++) {
      const y = 810 + j * 50, pts = [];
      for (let x = 1340; x <= 1880; x += 135) pts.push([x, y + Math.sin(x * 0.01 + j) * 14]);
      s.stroke(pts, 34, 12, 1.0, { ph: j });
    }
    return s;
  }

  // a lighthouse: banded tower, lantern, a fan of light, rock and sea
  function lighthouse(cx = 960, seed = 2) {
    const r = mulberry(seed), s = new Shape('lighthouse'); s.vis = 0.88; s.haze = 0.06;
    const topY = 400, botY = 905, tw = 66, bw = 128;
    const wAt = y => tw + (bw - tw) * (y - topY) / (botY - topY);
    for (let b = 0; b < 5; b++) {
      const y0 = topY + b * (botY - topY) / 5, y1 = topY + (b + 1) * (botY - topY) / 5;
      s.poly([[cx - wAt(y0), y0], [cx + wAt(y0), y0], [cx + wAt(y1), y1], [cx - wAt(y1), y1]], b % 2 ? 0.5 : 1.3, { edge: 4, br: b % 2 ? 0.95 : 1.1 });
    }
    s.stroke([[cx - wAt(topY) - 26, topY - 8], [cx, topY - 10], [cx + wAt(topY) + 26, topY - 8]], 30, 30, 1.6, { wob: 0.05 });
    s.blob(cx, topY - 62, 56, 48, 2.2, { soft: 0.4, br: 1.3 });
    s.poly([[cx - 66, topY - 100], [cx + 66, topY - 100], [cx, topY - 172]], 1.4, { edge: 3 });
    s.cloud(cx, topY - 62, 130, 0.7, { br: 1.4 });
    // light: two soft wedges and a few finger streaks inside them
    const lx = cx + 70, ly = topY - 62;
    s.poly([[lx, ly - 18], [cx + 960, topY - 330], [cx + 960, topY + 130], [lx, ly + 18]], 0.38, { edge: 14, br: 1.0 });
    s.poly([[cx - 70, ly - 18], [cx - 960, topY - 330], [cx - 960, topY + 130], [cx - 70, ly + 18]], 0.34, { edge: 14, br: 1.0 });
    for (let i = 0; i < 4; i++) { const rise = (i - 1.5) * 90;
      s.stroke([[lx + 20, ly], [cx + 480, topY - 62 + rise * 0.5], [cx + 900, topY - 62 + rise]], 46 - Math.abs(i - 1.5) * 8, 6, 0.8, { br: 1.1, wob: 0.12, soft: 0.5 });
      s.stroke([[cx - 90, ly], [cx - 480, topY - 62 + rise * 0.5], [cx - 900, topY - 62 + rise]], 46 - Math.abs(i - 1.5) * 8, 6, 0.7, { br: 1.0, wob: 0.12, soft: 0.5 });
    }
    s.blob(cx, botY + 38, 340, 76, 1.1, { soft: 0.5 }); s.blob(cx - 130, botY + 30, 180, 52, 1.1, { soft: 0.55 }); s.blob(cx + 170, botY + 30, 210, 48, 1.1, { soft: 0.55 });
    for (let j = 0; j < 3; j++) {
      const y = 990 + j * 34, pts = [];
      for (let x = 60; x <= 1860; x += 200) pts.push([x + gauss(r) * 8, y + Math.sin(x * 0.009 + j * 2.2) * 12]);
      s.stroke(pts, 30, 20, 0.9, { ph: j, wob: 0.25 });
    }
    return s;
  }

  function home(cx = 960) {
    const s = mound(cx, 990, 300, 190); s.vis = 0.5; s.els.forEach(e => { e.br *= 0.62; });
    s.text('home.', cx, 560, 170, 3.0, { br: 1.15 });
    return s;
  }

  window.SHAPES = { home, mound, tree, bird, wave, lighthouse };
})();
