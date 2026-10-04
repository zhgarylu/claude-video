// cobalt.js: the underglaze painting engine.
// A Paint is a stack of timed brush operations rasterised into a data texture:
//   R = wash pigment (additive: every pass deepens the blue; overlaps pool)    G = line pigment (outlines, darker per unit)
//   B = "wet" (fresh strokes: darker and shinier until they dry)
// render(t) draws exactly the part of every stroke the brush has covered by time t; deterministic, any t in any order.
import { mulberry, clamp, seg, ss, lerp } from '/core/lib.js';
import { spline } from './vessel.js';

const WET = 1.3;

function sprite(rgb, soft) {
  const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
  const g = x.createRadialGradient(48, 48, 0, 48, 48, 48);
  const [r, gg, b] = rgb; const col = a => `rgba(${r},${gg},${b},${a})`;
  const k = 1 - soft;
  g.addColorStop(0, col(1)); g.addColorStop(Math.max(0.01, k * .9), col(1)); g.addColorStop(Math.min(.99, k + (1 - k) * .45), col(.45)); g.addColorStop(1, col(0));
  x.fillStyle = g; x.fillRect(0, 0, 96, 96); return c;
}

export class Paint {
  static n = 0;
  constructor(w, h, { seed = 1 } = {}) {
    this.uid = ++Paint.n; this.w = w; this.h = h; this.seed = seed; this.ops = []; this.sorted = true;
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    this.canvas = mk(); this.cache = mk(); this.cacheK = 0;
    this.ctx = this.canvas.getContext('2d', { alpha: false }); this.cctx = this.cache.getContext('2d', { alpha: false });
    this.spr = { r: sprite([255, 0, 0], .45), g: sprite([0, 255, 0], .3), b: sprite([0, 0, 255], .5), rs: sprite([255, 0, 0], .8) };
    this.clear(this.cctx);
  }
  clear(ctx) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.w, this.h); }
  // ---- adding operations (copies across the u-wrap seam are made here, once) ----
  add(op) {
    const W = this.w; let lo = 1e9, hi = -1e9;
    if (op.pts) for (const p of op.pts) { lo = Math.min(lo, p[0] - p[2]); hi = Math.max(hi, p[0] + p[2]); }
    if (op.poly) for (const p of op.poly) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); }
    if (op.x != null) { lo = op.x - (op.size || 0); hi = op.x + (op.size || 0) * 1.2; }
    if (op.clip) for (const p of op.clip) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); }
    if (op.wrap !== false) {
      if (lo < 0) this._push(shift(op, W)); if (hi > W) this._push(shift(op, -W));
    }
    this._push(op);
  }
  _push(op) { this.ops.push(op); this.sorted = false; this.lastT = null; }
  // stretch the whole timeline so painting ends at `total` seconds (the brush is only as slow as the story needs)
  fit(total, from = 0) { let m = 0; for (const o of this.ops) m = Math.max(m, o.t1); const k = (total - from) / (m - from); for (const o of this.ops) { o.t0 = from + (o.t0 - from) * k; o.t1 = from + (o.t1 - from) * k; } this.sorted = false; this.lastT = null; return k; }
  // piecewise time map: ring ops (wheel-turned lines) take exactly `ringDur` seconds, everything else is scaled by k; the timeline starts at `from`
  retime(k, ringDur, from = 0) {
    this.prep(); const rings = this.ops.filter(o => o.ring && !o.noTip).sort((a, b) => a.t0 - b.t0);
    const seen = new Set(); const R = []; for (const r of rings) { const key = r.t0 + ':' + r.t1; if (!seen.has(key)) { seen.add(key); R.push(r); } }
    const f = t => { let nat = 0, cnt = 0, out = null; for (const r of R) { if (t >= r.t1) { nat += r.t1 - r.t0; cnt++; } else if (t > r.t0) { out = from + k * (r.t0 - from - nat) + ringDur * cnt + (t - r.t0) / (r.t1 - r.t0) * ringDur; break; } else break; } return out ?? from + k * (t - from - nat) + ringDur * cnt; };
    for (const o of this.ops) { const a = f(o.t0), b = f(o.t1); o.t0 = a; o.t1 = b; }
    this.sorted = false; this.lastT = null; return f;
  }
  prep() {
    if (this.sorted) return; this.ops.sort((a, b) => a.t0 - b.t0); this.sorted = true; this.cacheK = 0; this.clear(this.cctx);
    for (const o of this.ops) if (o.pts && !o.L) {
      const L = [0]; for (let i = 1; i < o.pts.length; i++) L.push(L[i - 1] + Math.hypot(o.pts[i][0] - o.pts[i - 1][0], o.pts[i][1] - o.pts[i - 1][1])); o.L = L;
    }
  }
  // ---- drawing ----
  render(t) { if (t === this.lastT && this.lastRet) return this.lastRet; this.lastT = t; return (this.lastRet = this._render(t)); }
  _render(t) {
    this.prep();
    const ops = this.ops; let k = 0; while (k < ops.length && ops[k].t1 <= t - WET) k++;
    // contiguous prefix only (ops are sorted by start; a later op may end earlier, so stop at the first unfinished one)
    if (k < this.cacheK) { this.cacheK = 0; this.clear(this.cctx); }
    for (let i = this.cacheK; i < k; i++) this.drawOp(this.cctx, ops[i], 1, 0);
    this.cacheK = k;
    // nothing in flight: the cache is the picture, and the GPU texture need not be re-uploaded (same rev)
    if (k >= ops.length || ops[k].t0 >= t) { this.rev = 'c' + k; return this.cache; }
    this.rev = 'a' + (++Paint.n);
    const ctx = this.ctx; ctx.globalCompositeOperation = 'copy'; ctx.globalAlpha = 1; ctx.drawImage(this.cache, 0, 0);
    for (let i = k; i < ops.length; i++) {
      const o = ops[i]; if (o.t0 >= t) break;
      const p = clamp((t - o.t0) / (o.t1 - o.t0)); const wet = p < 1 ? 1 : clamp(1 - (t - o.t1) / WET);
      this.drawOp(ctx, o, o.ease ? o.ease(p) : p, wet);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    return this.canvas;
  }
  dab(ctx, spr, x, y, r, a) { if (a <= 0.002) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(spr, x - r, y - r, 2 * r, 2 * r); }
  drawOp(ctx, o, p, wet) {
    ctx.globalCompositeOperation = 'lighter';
    const saved = o.clip || o.hole; if (saved) ctx.save();
    if (o.clip) { ctx.beginPath(); o.clip.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.clip(); }
    if (o.hole && o.hole.length) { ctx.beginPath(); ctx.rect(-50, -50, this.w + 100, this.h + 100); for (const hp of o.hole) { hp.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); } ctx.clip('evenodd'); }
    if (o.type === 'stroke') this.drawStroke(ctx, o, p, wet);
    else if (o.type === 'edge') this.drawEdge(ctx, o, p);
    else if (o.type === 'text') this.drawText(ctx, o, p, wet);
    else if (o.type === 'fill') { ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${Math.round(255 * o.d * p)},0,0)`; ctx.beginPath(); o.poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); }
    if (saved) ctx.restore();
    ctx.globalAlpha = 1;
  }
  drawStroke(ctx, o, p, wet) {
    const P = o.pts, L = o.L, total = L[L.length - 1]; if (total <= 0 && P.length < 2) return;
    const end = total * p, spr = this.spr[o.ch || 'r'], sprW = o.ch === 'g' ? spr : (o.soft ? this.spr.rs : spr);
    const rng = mulberry((o.seed | 0) + 7);
    let i = 0, s = 0; const pos = [];
    const at = (s) => { while (i < P.length - 2 && L[i + 1] < s) i++; const a = P[i], b = P[i + 1], d = L[i + 1] - L[i] || 1, u = clamp((s - L[i]) / d); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u), b[0] - a[0], b[1] - a[1]]; };
    let step = 1;
    while (s <= end + 1e-6) {
      const q = at(s); const w = q[2], r = w * .5, d = q[3];
      step = Math.max(.9, w * .16);
      const jit = (rng() - .5) * w * .05;
      const a = d * step / (0.78 * w) * (o.k || 1);
      this.dab(ctx, sprW, q[0], q[1] + jit, r * 1.08, a);
      if (o.bristle && w > 9) {
        const n = o.bristle, nl = Math.hypot(q[4], q[5]) || 1, nx = -q[5] / nl, ny = q[4] / nl;
        for (let k = 0; k < n; k++) {
          const ph = (k + .5) / n - .5, h = ((k * 7919 + (o.seed | 0)) % 97) / 97;
          const wob = Math.sin(s * (.011 + h * .02) + h * 40) * .5 + .5;
          const off = ph * w * .86 + (rng() - .5) * w * .03;
          const rr = Math.max(.7, w * (.035 + h * .035));
          this.dab(ctx, spr, q[0] + nx * off, q[1] + ny * off, rr, d * (.02 + .08 * wob * wob) * step / Math.max(1, rr * .8) * (o.dry || 1));
        }
      }
      s += step;
    }
    if (wet > 0 && p > 0) {      // wet sheen on the freshly laid blue
      const from = Math.max(0, end - (o.wetLen || 140)); let s2 = from;
      const sb = this.spr.b;
      while (s2 <= end) { const q = at(s2); const fade = p < 1 ? clamp((s2 - from) / ((end - from) || 1)) : 1; this.dab(ctx, sb, q[0], q[1], q[2] * .55, wet * fade * .55 * Math.min(1, 6 / Math.max(2, q[2] * .2))); s2 += Math.max(2, q[2] * .35); }
    }
  }
  drawEdge(ctx, o, p) { // pigment pooled along a wash's rim (coffee-ring), clipped to the wash shape
    ctx.globalAlpha = 1; ctx.lineJoin = 'round';
    const pts = o.poly, n = pts.length, upto = Math.max(2, Math.floor(n * p));
    for (const [lw, a] of [[o.w * 2.2, o.d * .35], [o.w, o.d * .7]]) {
      ctx.strokeStyle = `rgb(${Math.round(255 * a)},0,0)`; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i < upto; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
  }
  drawText(ctx, o, p, wet) {
    ctx.font = o.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.beginPath();
    const s = o.size * 1.2; const x0 = o.x - s / 2, y0 = o.y - s / 2;
    if (o.wipe === 'right') ctx.rect(x0, y0, s * p, s); else ctx.rect(x0, y0, s, s * p);
    ctx.clip();
    ctx.filter = 'blur(1.1px)'; ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(${Math.round(255 * o.d * .62)},${Math.round(255 * o.d * .55)},${wet > 0 ? Math.round(255 * wet * .5) : 0})`;
    ctx.fillText(o.text, o.x, o.y);
    ctx.filter = 'none';
    ctx.fillStyle = `rgb(${Math.round(255 * o.d * .55)},${Math.round(255 * o.d * .4)},0)`; ctx.fillText(o.text, o.x + .6, o.y + .6);
    ctx.restore();
  }
  // where the brush tip is at t: {x, y, w, lift, active}
  tip(t) {
    this.prep(); const ops = this.ops;
    let cur = -1; for (let i = 0; i < ops.length; i++) { if (ops[i].t0 <= t && !ops[i].noTip) cur = i; else if (ops[i].t0 > t) break; }
    if (cur < 0) return null;
    const o = ops[cur], p = clamp((t - o.t0) / (o.t1 - o.t0));
    const pos = (o, p) => { if (o.pts) { const L = o.L, s = L[L.length - 1] * p; let i = 0; while (i < o.pts.length - 2 && L[i + 1] < s) i++; const a = o.pts[i], b = o.pts[i + 1], u = clamp((s - L[i]) / (L[i + 1] - L[i] || 1)); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; } if (o.type === 'text') return [o.x, o.y - o.size * .5 + o.size * p, o.size * .1]; return [o.poly[Math.min(o.poly.length - 1, Math.floor(o.poly.length * p))][0], o.poly[Math.min(o.poly.length - 1, Math.floor(o.poly.length * p))][1], 20]; };
    if (p < 1) { const q = pos(o, p); return { x: q[0], y: q[1], w: q[2], lift: 0, active: true }; }
    // between strokes: glide to the next start, lifted
    let nx = cur + 1; while (nx < ops.length && ops[nx].noTip) nx++;
    const q = pos(o, 1);
    if (nx < ops.length) { const n = pos(ops[nx], 0), g = clamp((t - o.t1) / Math.max(.05, ops[nx].t0 - o.t1)); const e = ss(g); const lift = Math.sin(Math.PI * g) * 1; return { x: lerp(q[0], n[0], e), y: lerp(q[1], n[1], e), w: q[2], lift: Math.max(lift, .25), active: false }; }
    return { x: q[0], y: q[1], w: q[2], lift: clamp((t - o.t1) / .5), active: false };
  }
}

function shift(op, dx) {
  const c = Object.assign({}, op);
  if (op.pts) { c.pts = op.pts.map(p => [p[0] + dx, p[1], p[2], p[3]]); c.L = op.L; }
  if (op.poly) c.poly = op.poly.map(p => [p[0] + dx, p[1]]);
  if (op.clip) c.clip = op.clip.map(p => [p[0] + dx, p[1]]);
  if (op.x != null) c.x = op.x + dx; c.noTip = true; c.wrap = false; return c;
}

// ------------------------------------------------------------------
// Pen: schedules brush operations one after another and builds strokes with brush pressure.
export class Pen {
  constructor(paint, t0 = 0, speed = 420, seed = 1) { this.paint = paint; this.t = t0; this.speed = speed; this.rng = mulberry(seed * 977 + 13); this.n = seed * 100; this.holes = null; }
  pause(s) { this.t += s; return this; }
  occlude(polys) { this.holes = polys && polys.length ? polys : null; return this; }
  dot(x, y, w = 14, d = .8) { return this.stroke([[x, y], [x + 3, y + 1]], { w, d, taper: [0, 0], straight: true, minW: 1, speed: 120, soft: true, wetLen: 20 }); }
  // ctrl: control points [[x,y],…]; opts: w (px), w1, taper [in,out] fractions, d (density), ch, dry, bristle, soft, speed, jitter
  dense(ctrl, o = {}) {
    const C = o.straight ? ctrl : spline(ctrl, 8);
    // resample at 3 px
    const pts = []; let acc = 0, total = 0; const L = [0];
    for (let i = 1; i < C.length; i++) { total += Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]); L.push(total); }
    const n = Math.max(2, Math.ceil(total / 3)); let j = 0;
    const w0 = o.w ?? 10, w1 = o.w1 ?? w0, [tin, tout] = o.taper ?? [.12, .22];
    const rng = this.rng;
    for (let k = 0; k <= n; k++) {
      const s = k / n * total; while (j < C.length - 2 && L[j + 1] < s) j++;
      const u = clamp((s - L[j]) / (L[j + 1] - L[j] || 1)); const f = k / n;
      let w = lerp(w0, w1, f);
      const a = tin > 0 ? ss(f / tin) : 1, b = tout > 0 ? ss((1 - f) / tout) : 1;
      w *= (o.minW ?? .18) + (1 - (o.minW ?? .18)) * a * b;
      w *= 1 + (o.jitter ?? .04) * Math.sin(k * .21 + this.n) + (rng() - .5) * .02;
      const dd = (o.d ?? .3) * (o.dFn ? o.dFn(f) : 1) * (0.85 + .15 * Math.sin(k * .09 + this.n * 3.1));
      pts.push([lerp(C[j][0], C[j + 1][0], u), lerp(C[j][1], C[j + 1][1], u), Math.max(.8, w), dd]);
    }
    this.n++; return { pts, total };
  }
  stroke(ctrl, o = {}) {
    const { pts, total } = this.dense(ctrl, o);
    const dur = clamp(total / (o.speed ?? this.speed), .08, 5);
    this.paint.add({ type: 'stroke', pts, ch: o.ch || 'r', t0: this.t, t1: this.t + dur, bristle: o.bristle ?? 0, dry: o.dry, soft: o.soft, clip: o.clip, hole: o.hole || this.holes, seed: (this.n * 31) | 0, k: o.k, wetLen: o.wetLen, ease: o.ease, ring: o.ring });
    this.t += dur + (o.gap ?? .05); return this;
  }
  // outline: thin dark line (G channel)
  line(ctrl, o = {}) { return this.stroke(ctrl, Object.assign({ ch: 'g', w: 9, d: .5, taper: [.08, .2], speed: this.speed * 1.1 }, o)); }
  text(text, x, y, size, font, o = {}) { const dur = o.dur ?? .7; this.paint.add({ type: 'text', text, x, y, size, font, d: o.d ?? .8, wipe: o.wipe || 'down', t0: this.t, t1: this.t + dur }); this.t += dur + (o.gap ?? .1); return this; }
  // wash a polygon with hatch strokes along `angle`; density grades from `d0` (at the base, u=0) to `d1` (tip, u=1) along the axis `axis` ([x0,y0]→[x1,y1])
  wash(poly, o = {}) {
    const ang = o.angle ?? 0, sp = o.spacing ?? 20, passes = o.passes ?? 2, [d0, d1] = o.dens ?? [.28, .16];
    const axis = o.axis || [[poly.reduce((s, p) => s + p[0], 0) / poly.length, Math.max(...poly.map(p => p[1]))], [poly.reduce((s, p) => s + p[0], 0) / poly.length, Math.min(...poly.map(p => p[1]))]];
    const ax = axis[1][0] - axis[0][0], ay = axis[1][1] - axis[0][1], al2 = ax * ax + ay * ay || 1;
    const gradAt = (x, y) => clamp(((x - axis[0][0]) * ax + (y - axis[0][1]) * ay) / al2);
    const ca = Math.cos(-ang), sa = Math.sin(-ang);
    const R = p => [p[0] * ca - p[1] * sa, p[0] * sa + p[1] * ca], Ri = p => [p[0] * ca + p[1] * sa, -p[0] * sa + p[1] * ca];
    const rp = poly.map(R); const ymin = Math.min(...rp.map(p => p[1])), ymax = Math.max(...rp.map(p => p[1]));
    const t0 = this.t; let tt = t0; const dur = o.dur ?? Math.max(.4, (poly.length ? polyLen(poly) : 200) / this.speed * .8);
    const chordsAll = [];
    for (let pass = 0; pass < passes; pass++) {
      const off = pass * sp * .5 + (pass ? this.rng() * sp * .3 : 0);
      for (let y = ymin + sp * .5 + off; y < ymax; y += sp) {
        const xs = []; for (let i = 0; i < rp.length; i++) { const a = rp[i], b = rp[(i + 1) % rp.length]; if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) chordsAll.push([[xs[k] - sp * .2, y], [xs[k + 1] + sp * .2, y], pass, (y - ymin) / ((ymax - ymin) || 1)]);
      }
    }
    const n = chordsAll.length;
    chordsAll.forEach((c, i) => {
      const a = Ri(c[0]), b = Ri(c[1]); const wob = (this.rng() - .5) * sp * .5;
      const mid = [(a[0] + b[0]) / 2 - (b[1] - a[1]) * .02 * (this.rng() - .5), (a[1] + b[1]) / 2 + wob * .3];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 2) return;
      const pts = []; const m = Math.max(3, Math.ceil(len / 6));
      for (let k = 0; k <= m; k++) {
        const f = k / m, x = lerp(a[0], b[0], f) + (mid[0] - (a[0] + b[0]) / 2) * Math.sin(Math.PI * f), y = lerp(a[1], b[1], f) + (mid[1] - (a[1] + b[1]) / 2) * Math.sin(Math.PI * f);
        const g = gradAt(x, y); const dd = lerp(d0, d1, g) * (o.dFn ? o.dFn(g) : 1) * (o.crossFn ? o.crossFn(c[3]) : 1) * (.8 + .4 * this.rng()) * (c[2] ? .7 : 1);
        pts.push([x, y, sp * (c[2] ? 1.8 : 2.2) * (.9 + .2 * this.rng()), dd * (0.55 + .45 * ss(Math.min(f, 1 - f) * 5))]);
      }
      const ts = t0 + (i / n) * dur * .85, te = ts + Math.min(.5, len / 600 + .06);
      this.paint.add({ type: 'stroke', pts, ch: 'r', clip: o.noClip ? null : poly, hole: o.hole || this.holes, t0: ts, t1: te, bristle: o.bristle ?? 3, soft: true, seed: (this.n++ * 17) | 0, dry: .6, wetLen: 60, noTip: i % 3 !== 0 });
    });
    if (o.rim !== false) this.paint.add({ type: 'edge', poly: poly.concat([poly[0]]), clip: poly, w: o.rimW ?? 6, d: o.rimD ?? .16, t0: t0 + dur * .5, t1: t0 + dur, noTip: true });
    this.t = t0 + dur + (o.gap ?? .05); return this;
  }
}
const polyLen = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };
