// sand.js: the sand-table engine. Plain script, no modules; exposes window.SAND.
//   1. Shape      describe a picture as strokes / blobs / polygons / clouds; sample() turns it into N grains
//   2. chain()    re-order each shape's grains so grain i travels A_k[i] -> A_k+1[i] in coherent bands
//   3. grainsAt() every grain's position at time t (hold / sweep morph / pour): a pure function of t
//   4. Table      accumulate grains into a density field, blur it at four radii, light it from beneath
(function () {
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  function vn2(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), h = (a, b) => hash(a * 12.9898 + b * 78.233);
    return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy); }
  function gauss(r) { let u = 0; while (u < 1e-9) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }

  // ---------- Shape ----------
  // catmull-rom through pts -> dense polyline (step px)
  function smooth(pts, step = 3) {
    const out = [], n = pts.length;
    const P = i => pts[clamp(i, 0, n - 1) | 0];
    for (let i = 0; i < n - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), m = Math.max(2, Math.ceil(L / step));
      for (let j = 0; j < m; j++) {
        const t = j / m, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    out.push(pts[n - 1].slice());
    return out;
  }
  function pip(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

  class Shape {
    constructor(name) { this.name = name; this.els = []; this.vis = 0.9; this.haze = 0.06; this.xf = null; }
    // scale the finished picture about (cx, cy) and move it by (dx, dy)
    place(s, cx, cy, dx = 0, dy = 0) { this.xf = [s, cx, cy, dx, dy]; return this; }
    // stroke: a finger-drawn trail. w0->w1 width, dens = grains per px^2 relative, br = grain brightness
    stroke(pts, w0, w1, dens = 1, o = {}) {
      const poly = smooth(pts, 3), n = poly.length, cum = [0];
      for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
      const L = cum[n - 1], pw = o.pow || 1, wob = o.wob == null ? 0.14 : o.wob, ph = o.ph || 0;
      const tS = o.tapS == null ? 0.07 : o.tapS, tE = o.tapE == null ? 0.07 : o.tapE, tapf = s => { const a = tS > 0 ? Math.min(1, s / tS) : 1, b = tE > 0 ? Math.min(1, (1 - s) / tE) : 1; return 0.12 + 0.88 * Math.sqrt(Math.sin(Math.min(a, b) * Math.PI / 2)); };
      const hw = i => { const s = cum[i] / L; return 0.5 * lerp(w0, w1, Math.pow(s, pw)) * tapf(s) * (1 + wob * Math.sin(s * L * 0.021 + ph) * Math.sin(s * L * 0.0073 + ph * 2)); };
      const wcum = [0]; for (let i = 1; i < n; i++) wcum.push(wcum[i - 1] + hw(i) * (cum[i] - cum[i - 1]));
      this.els.push({ k: 'stroke', poly, cum, wcum, hw, L, mass: wcum[n - 1] * 2 * dens, br: o.br || 1, soft: o.soft == null ? 0.38 : o.soft });
      return this;
    }
    // blob: elliptical heap. soft 0 = flat disc, 1 = gaussian pile
    blob(cx, cy, rx, ry, dens = 1, o = {}) {
      this.els.push({ k: 'blob', cx, cy, rx, ry, rot: o.rot || 0, soft: o.soft == null ? 0.5 : o.soft, mass: Math.PI * rx * ry * dens * (o.soft > 0.7 ? 0.5 : 0.8), br: o.br || 1 });
      return this;
    }
    cloud(cx, cy, r, dens = 0.3, o = {}) { return this.blob(cx, cy, r, (o.sy || 1) * r, dens, Object.assign({ soft: 0.9 }, o)); }
    // poly: filled region of sand with a fuzzy edge
    poly(pts, dens = 1, o = {}) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
      this.els.push({ k: 'poly', pts, x0, x1, y0, y1, edge: o.edge == null ? 3 : o.edge, mass: Math.abs(a) / 2 * dens, br: o.br || 1 });
      return this;
    }
    // text: a word rasterised from a font and sampled as grains (the font must be loaded before sample())
    text(str, cx, cy, size, dens = 2, o = {}) {
      const c = document.createElement('canvas'); c.width = 1920; c.height = Math.ceil(size * 1.6) + 20;
      const g = c.getContext('2d'); g.font = `${o.weight || 400} ${size}px '${o.font || 'IM Fell English'}'`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff';
      const base = Math.round(size * 1.15); g.fillText(str, 960, base);
      const d = g.getImageData(0, 0, c.width, c.height).data, pts = [];
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 128) pts.push(x - 960 + cx, y - base + cy);
      this.els.push({ k: 'mask', pts: Float32Array.from(pts), mass: pts.length / 2 * dens, br: o.br || 1.1 });
      return this;
    }
    // sample n visible grains + hidden reservoir + haze; returns {x,y,w}
    sample(N, seed, W = 1920, H = 1080) {
      const r = mulberry(seed), X = new Float32Array(N), Y = new Float32Array(N), Wt = new Float32Array(N);
      const nvis = Math.round(N * this.vis), nhaze = Math.round(N * this.haze), nshape = nvis - nhaze;
      const total = this.els.reduce((s, e) => s + e.mass, 0);
      let c = 0;
      const xf = this.xf, put = (x, y, w) => { if (xf) { x = xf[1] + (x - xf[1]) * xf[0] + xf[3]; y = xf[2] + (y - xf[2]) * xf[0] + xf[4]; } if (c < N) { X[c] = x; Y[c] = y; const pile = 0.55 + 0.9 * (0.6 * vn2(x / 61, y / 61) + 0.4 * vn2(x / 19 + 7, y / 19)); Wt[c] = w * pile * Math.exp(0.36 * gauss(r)); c++; } };
      this.els.forEach((e, ei) => {
        const cnt = Math.round(nshape * e.mass / total);
        for (let q = 0; q < cnt; q++) {
          if (e.k === 'stroke') {
            // s by inverse CDF of width (constant areal density)
            const target = r() * e.wcum[e.wcum.length - 1];
            let lo = 0, hi = e.wcum.length - 1; while (lo < hi - 1) { const m = (lo + hi) >> 1; if (e.wcum[m] < target) lo = m; else hi = m; }
            const i = lo, p = e.poly[i], p2 = e.poly[Math.min(i + 1, e.poly.length - 1)];
            let tx = p2[0] - p[0], ty = p2[1] - p[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
            const h = e.hw(i); let o;
            if (r() < 0.86) o = clamp(gauss(r) * e.soft, -1.15, 1.15) * h; else o = gauss(r) * (0.95 * h + 2.5);   // core + stray edge grains
            put(p[0] - ty * o + gauss(r) * 0.8, p[1] + tx * o + gauss(r) * 0.8, e.br);
          } else if (e.k === 'blob') {
            const sq = Math.sqrt(r()), a = r() * TAU;
            let rr = lerp(sq, clamp(Math.abs(gauss(r)) * 0.46, 0, 1.3), e.soft);
            const lx = Math.cos(a) * rr * e.rx, ly = Math.sin(a) * rr * e.ry, cr = Math.cos(e.rot), sr = Math.sin(e.rot);
            put(e.cx + lx * cr - ly * sr, e.cy + lx * sr + ly * cr, e.br);
          } else if (e.k === 'mask') {
            const j = ((r() * e.pts.length / 2) | 0) * 2; put(e.pts[j] + gauss(r) * 0.9, e.pts[j + 1] + gauss(r) * 0.9, e.br);
          } else {
            for (let tries = 0; tries < 40; tries++) {
              const x = lerp(e.x0, e.x1, r()), y = lerp(e.y0, e.y1, r());
              if (pip(e.pts, x, y)) { put(x + gauss(r) * e.edge, y + gauss(r) * e.edge, e.br); break; }
            }
          }
        }
      });
      // haze: stray grains across the glass, thicker near the picture
      const nShapeGrains = c;
      for (let q = 0; q < nhaze; q++) {
        if (r() < 0.55 && nShapeGrains > 0) { const j = (r() * nShapeGrains) | 0; put(X[j] + gauss(r) * 90, Y[j] + gauss(r) * 90, 0.3 + 0.3 * r()); }
        else put(r() * W, r() * H, 0.25 + 0.3 * r());
      }
      // hidden reservoir (below the table edge): whatever is left of the N grains
      while (c < N) { X[c] = -200 + r() * (W + 400); Y[c] = H + 60 + r() * 500; Wt[c] = 0.7; c++; }
      return { x: X, y: Y, w: Wt, visible: nvis };
    }
  }

  // ---------- Chain: grain i of shape k+1 is matched to grain i of shape k ----------
  // Knothe-Rosenblatt style: slice along the sweep direction into strips, then sort by the perpendicular coordinate
  // inside each strip. The result is that neighbouring grains travel together, like sand pushed by a hand.
  function matchTo(ax, ay, S, theta, strips = 26) {
    const N = ax.length, dx = Math.cos(theta), dy = Math.sin(theta);
    const bkey = new Float32Array(N), bper = new Float32Array(N), akey = new Float32Array(N), aper = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      akey[i] = ax[i] * dx + ay[i] * dy; aper[i] = -ax[i] * dy + ay[i] * dx;
      bkey[i] = S.x[i] * dx + S.y[i] * dy; bper[i] = -S.x[i] * dy + S.y[i] * dx;
    }
    const ia = new Uint32Array(N), ib = new Uint32Array(N); for (let i = 0; i < N; i++) { ia[i] = i; ib[i] = i; }
    ia.sort((i, j) => akey[i] - akey[j]); ib.sort((i, j) => bkey[i] - bkey[j]);
    const chunk = Math.ceil(N / strips);
    for (let c = 0; c < N; c += chunk) {
      ia.subarray(c, Math.min(N, c + chunk)).sort((i, j) => aper[i] - aper[j]);
      ib.subarray(c, Math.min(N, c + chunk)).sort((i, j) => bper[i] - bper[j]);
    }
    const nx = new Float32Array(N), ny = new Float32Array(N), nw = new Float32Array(N);
    for (let j = 0; j < N; j++) { nx[ia[j]] = S.x[ib[j]]; ny[ia[j]] = S.y[ib[j]]; nw[ia[j]] = S.w[ib[j]]; }
    return { x: nx, y: ny, w: nw, visible: S.visible };
  }

  // ---------- The sand: all grains, all keyframes, one function of time ----------
  class Sand {
    // shapes: array of Shape; trans[k]: {t0,t1, mode:'sweep'|'pour', theta, bandW, bulge, swirl, sag, spray, strips}; trans[0] is the pour from the nozzle
    constructor(shapes, trans, N, seed = 11, W = 1920, H = 1080) {
      this.N = N; this.W = W; this.H = H; this.trans = trans;
      this.K = [];   // keyframe grain sets, index-matched
      const r = mulberry(seed + 99);
      const src = { x: new Float32Array(N), y: new Float32Array(N), w: new Float32Array(N).fill(0.8) };
      const nz = trans[0].nozzle || [W / 2, -80];
      for (let i = 0; i < N; i++) { src.x[i] = nz[0] + gauss(r) * 3.2; src.y[i] = nz[1] - r() * 200; }
      this.src = src;
      shapes.forEach((sh, k) => {
        const S = sh.sample(N, seed + k * 17, W, H);
        this.K.push(k === 0 ? S : matchTo(this.K[k - 1].x, this.K[k - 1].y, S, trans[k].theta, trans[k].strips || 26));
      });
      // per-grain constants
      this.h = new Float32Array(N); this.h2 = new Float32Array(N); this.ph = new Float32Array(N); this.ang = new Float32Array(N);
      for (let i = 0; i < N; i++) { this.h[i] = r(); this.h2[i] = r(); this.ph[i] = r() * TAU; this.ang[i] = r() * TAU; }
      this.prep = {};
      this.PX = new Float32Array(N); this.PY = new Float32Array(N); this.PW = new Float32Array(N);
    }
    A(k) { return k < 0 ? this.src : this.K[k]; }
    // per-transition constants: delay, duration, band bulge for every grain
    prepare(k) {
      if (this.prep[k]) return this.prep[k];
      const T = this.trans[k], N = this.N, a = this.A(k - 1), b = this.K[k];
      const dx = Math.cos(T.theta), dy = Math.sin(T.theta), px = -dy, py = dx;
      const kmid = new Float32Array(N), band = new Float32Array(N);
      const dur = T.t1 - T.t0, bw = T.bandW || 70;
      for (let i = 0; i < N; i++) {
        const mx = T.mode === 'pour' ? b.x[i] : 0.5 * (a.x[i] + b.x[i]), my = T.mode === 'pour' ? b.y[i] : 0.5 * (a.y[i] + b.y[i]);
        kmid[i] = T.mode === 'pour' ? -my + this.h[i] * 90 : mx * dx + my * dy;
        const u = (mx * px + my * py) / bw, j = Math.floor(u), f = u - j;
        const v0 = hash(j * 7.13 + k * 31.7) * 2 - 1, vm = hash((j - 1) * 7.13 + k * 31.7) * 2 - 1;
        band[i] = f < 0.06 ? lerp(vm, v0, 0.5 + f / 0.12) : v0;
      }
      const srt = Float32Array.from(kmid).sort(), lo = srt[(N * 0.03) | 0], hi = srt[(N * 0.97) | 0];
      const delay = new Float32Array(N), dd = new Float32Array(N), amp = new Float32Array(N);
      const durF = T.durF || 0.52;
      for (let i = 0; i < N; i++) {
        const rk = clamp((kmid[i] - lo) / (hi - lo));
        const cb = T.comb == null ? 0.22 : T.comb, n = clamp(rk * (1 - cb) + cb * (0.5 + 0.5 * band[i]) + (this.h2[i] - 0.5) * 0.02);
        dd[i] = durF * dur * (0.78 + 0.5 * Math.pow(this.h[i], 1.6));
        delay[i] = n * (dur - durF * dur * 1.28);
        amp[i] = band[i];
      }
      return (this.prep[k] = { delay, dd, amp, dx, dy, px, py, lo, hi, durF });
    }
    // fills PX, PY, PW with the grain state at t (world coordinates)
    at(t) {
      const N = this.N, PX = this.PX, PY = this.PY, PW = this.PW;
      // which stage?
      let k = -1; for (let q = 0; q < this.trans.length; q++) { if (t >= this.trans[q].t0) k = q; }
      const T = this.trans[Math.max(k, 0)];
      const inTrans = k >= 0 && t < T.t1 + 0.0001;
      const hold = k < 0 ? -1 : inTrans ? -2 : k;       // hold index: shape k fully formed
      if (k < 0) { for (let i = 0; i < N; i++) { PX[i] = this.src.x[i]; PY[i] = this.src.y[i] - 400; PW[i] = 0; } return; }
      const sh = k, ph = this.ph, h2 = this.h2;
      if (!inTrans) {
        const B = this.K[sh];
        const dr = 0.9;
        for (let i = 0; i < N; i++) {
          PX[i] = B.x[i] + dr * Math.sin(t * 0.55 + ph[i]) * (0.4 + h2[i]);
          PY[i] = B.y[i] + dr * Math.cos(t * 0.47 + ph[i] * 1.7) * (0.4 + h2[i]);
          PW[i] = B.w[i];
        }
        return;
      }
      const P = this.prepare(k), a = this.A(k - 1), b = this.K[k];
      const dur = T.t1 - T.t0, lt = t - T.t0, bulge = T.bulge == null ? 150 : T.bulge, swirl = T.swirl == null ? 28 : T.swirl, sag = T.sag == null ? 40 : T.sag, spray = T.spray == null ? 16 : T.spray;
      const sw = T.seed || k * 3.1;
      const pour = T.mode === 'pour';
      for (let i = 0; i < N; i++) {
        const p = clamp((lt - P.delay[i]) / P.dd[i]);
        const ax = a.x[i], ay = a.y[i], bx = b.x[i], by = b.y[i];
        if (pour) {
          if (p <= 0) { PX[i] = ax; PY[i] = ay; PW[i] = 0; continue; }
          const q = clamp((p - 0.8) / 0.2), ex = q * q * (3 - 2 * q), ey = Math.pow(p, 1.8);
          PX[i] = lerp(ax, bx, ex); PY[i] = lerp(ay, by, ey);
          PW[i] = 0.8 + (b.w[i] - 0.8) * ey;
          continue;
        }
        if (p <= 0) { PX[i] = ax + 0.9 * Math.sin(t * 0.55 + ph[i]) * (0.4 + h2[i]); PY[i] = ay + 0.9 * Math.cos(t * 0.47 + ph[i] * 1.7) * (0.4 + h2[i]); PW[i] = a.w[i]; continue; }
        if (p >= 1) { PX[i] = bx + 0.9 * Math.sin(t * 0.55 + ph[i]) * (0.4 + h2[i]); PY[i] = by + 0.9 * Math.cos(t * 0.47 + ph[i] * 1.7) * (0.4 + h2[i]); PW[i] = b.w[i]; continue; }
        const e = p * p * (3 - 2 * p), s = Math.sin(Math.PI * e), s2 = s * s;
        let x = ax + (bx - ax) * e, y = ay + (by - ay) * e;
        const bl = P.amp[i] * bulge * s;
        x += P.px * bl; y += P.py * bl;
        // swirl: a slow coherent eddy field, sampled at the grain's start so neighbours curl together
        x += Math.sin(ay * 0.0071 + sw) * swirl * s + Math.cos(ax * 0.0053 - sw * 1.3) * swirl * 0.6 * s;
        y += Math.cos(ax * 0.0064 + sw * 0.7) * swirl * s + sag * s2;
        x += Math.cos(this.ang[i]) * spray * s2 * this.h2[i]; y += Math.sin(this.ang[i]) * spray * s2 * this.h2[i];
        PX[i] = x; PY[i] = y;
        PW[i] = a.w[i] + (b.w[i] - a.w[i]) * e;
      }
    }
  }

  // ---------- Table: density -> light ----------
  const GELS = {
    gold:   [[0, 5, 3, 2], [0.1, 44, 22, 7], [0.3, 176, 100, 32], [0.55, 244, 176, 78], [0.8, 255, 226, 152], [1, 255, 247, 226]],
    sea:    [[0, 2, 4, 9], [0.1, 6, 24, 54], [0.3, 18, 92, 160], [0.55, 84, 176, 222], [0.8, 184, 232, 250], [1, 240, 252, 255]],
    sunset: [[0, 8, 3, 2], [0.1, 58, 16, 7], [0.3, 192, 74, 20], [0.55, 250, 132, 42], [0.8, 255, 196, 112], [1, 255, 238, 206]],
  };
  const LUTN = 1024;
  function lut(stops) {
    const out = new Float32Array(LUTN * 3);
    for (let i = 0; i < LUTN; i++) {
      const L = i / (LUTN - 1); let q = 0; while (q < stops.length - 2 && L > stops[q + 1][0]) q++;
      const s0 = stops[q], s1 = stops[q + 1], f = clamp((L - s0[0]) / (s1[0] - s0[0]));
      for (let c = 0; c < 3; c++) out[i * 3 + c] = lerp(s0[1 + c], s1[1 + c], f);
    }
    return out;
  }
  const LUTS = {}; for (const k in GELS) LUTS[k] = lut(GELS[k]);

  function boxBlur(src, dst, w, h, r, tmp) {
    // one horizontal + one vertical running-sum box (radius r) with clamped edges
    const n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const o = y * w; let s = 0;
      for (let x = -r; x <= r; x++) s += src[o + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) { tmp[o + x] = s / n; s += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) { dst[y * w + x] = s / n; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
    }
  }
  function gaussBlur(src, w, h, sigma, work) {
    // three box passes ~ gaussian
    const r = Math.max(1, Math.round(Math.sqrt(12 * sigma * sigma / 3 + 1) / 2 - 0.5)), a = work.a, b = work.b, tmp = work.t;
    a.set(src); boxBlur(a, b, w, h, r, tmp); boxBlur(b, a, w, h, r, tmp); boxBlur(a, b, w, h, r, tmp);
    return b;
  }

  class Table {
    constructor(canvas, W = 1920, H = 1080) {
      this.c = canvas; this.W = W; this.H = H; this.ctx = canvas.getContext('2d');
      this.D = new Float32Array(W * H);
      this.lw = W >> 2; this.lh = H >> 2;
      this.LD = new Float32Array(this.lw * this.lh);
      this.E = new Float32Array(this.lw * this.lh);
      this.work = { a: new Float32Array(this.lw * this.lh), b: new Float32Array(this.lw * this.lh), t: new Float32Array(this.lw * this.lh) };
      this.img = this.ctx.createImageData(W, H);
      this.opt = { kD: 0.55, g1: 0.42, g2: 0.24, g3: 0.11, s1: 2.0, s2: 6.5, s3: 22, lamp: 0.05, lampSpot: 0.07, exposure: 1.0 };
    }
    // cam = {cx, cy, z}; gel = {a, b, m}: ramp name a -> b by m
    draw(sand, cam, gel) {
      const { W, H, D, lw, lh, LD, E, work, opt } = this, N = sand.N, PX = sand.PX, PY = sand.PY, PW = sand.PW;
      D.fill(0);
      const z = cam.z, ox = W / 2 - cam.cx * z, oy = H / 2 - cam.cy * z, tw = 1;
      for (let i = 0; i < N; i++) {
        const w = PW[i]; if (w <= 0) continue;
        const sx = PX[i] * z + ox - 0.5, sy = PY[i] * z + oy - 0.5;
        const ix = Math.floor(sx), iy = Math.floor(sy);
        if (ix < -1 || iy < -1 || ix >= W || iy >= H) continue;
        const fx = sx - ix, fy = sy - iy, gx = 1 - fx, gy = 1 - fy, o = iy * W + ix, ww = w * tw;
        if (ix >= 0 && iy >= 0) D[o] += ww * gx * gy;
        if (ix + 1 < W && iy >= 0) D[o + 1] += ww * fx * gy;
        if (ix >= 0 && iy + 1 < H) D[o + W] += ww * gx * fy;
        if (ix + 1 < W && iy + 1 < H) D[o + W + 1] += ww * fx * fy;
      }
      // low-res mean density
      for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
        let s = 0; const o = (y * 4) * W + x * 4;
        for (let j = 0; j < 4; j++) { const oo = o + j * W; s += D[oo] + D[oo + 1] + D[oo + 2] + D[oo + 3]; }
        LD[y * lw + x] = s / 16;
      }
      E.fill(0);
      const G1 = gaussBlur(LD, lw, lh, opt.s1, work); for (let i = 0; i < E.length; i++) E[i] += opt.g1 * G1[i];
      const G2 = gaussBlur(LD, lw, lh, opt.s2, work); for (let i = 0; i < E.length; i++) E[i] += opt.g2 * G2[i];
      const G3 = gaussBlur(LD, lw, lh, opt.s3, work); for (let i = 0; i < E.length; i++) E[i] += opt.g3 * G3[i];
      const la = LUTS[gel.a], lb = LUTS[gel.b || gel.a], m = gel.m || 0, data = this.img.data, kD = opt.kD * opt.exposure;
      for (let y = 0; y < H; y++) {
        const fy = (y + 0.5) / 4 - 0.5, y0 = clamp(Math.floor(fy), 0, lh - 1), y1 = Math.min(lh - 1, y0 + 1), ty = fy - Math.floor(fy);
        const dy2 = (y / H - 0.5) / 0.62;
        for (let x = 0; x < W; x++) {
          const fx = (x + 0.5) / 4 - 0.5, x0 = clamp(Math.floor(fx), 0, lw - 1), x1 = Math.min(lw - 1, x0 + 1), tx = fx - Math.floor(fx);
          const e0 = lerp(E[y0 * lw + x0], E[y0 * lw + x1], tx), e1 = lerp(E[y1 * lw + x0], E[y1 * lw + x1], tx);
          const dx2 = (x / W - 0.5) / 0.7, spot = Math.exp(-(dx2 * dx2 + dy2 * dy2) * 1.4);
          let e = kD * D[y * W + x] + lerp(e0, e1, ty) * opt.exposure + opt.lamp + opt.lampSpot * spot;
          const L = 1 - Math.exp(-e), li = Math.min(LUTN - 1, (L * (LUTN - 1)) | 0) * 3, o = (y * W + x) * 4;
          data[o] = lerp(la[li], lb[li], m); data[o + 1] = lerp(la[li + 1], lb[li + 1], m); data[o + 2] = lerp(la[li + 2], lb[li + 2], m); data[o + 3] = 255;
        }
      }
      this.ctx.putImageData(this.img, 0, 0);
          }
  }

  window.SAND = { Shape, Sand, Table, mulberry, gauss, hash, clamp, lerp, smooth, GELS, TAU };
})();
