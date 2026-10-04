// fold.js: a small rigid-origami simulator.
// A Sheet is a set of convex polygon facets (paper coordinates u,v in metres, rest pose in the XZ plane, front face up).
// fold() cuts the facets that cross a crease line, and every piece on the moving side gets that fold added to its chain.
// A fold is a hinge rotation about an axis that is stored in the frame of a stationary reference facet, so folds can
// overlap in time (an accordion collapsing) and any fold can be run backwards (unfolding) without recomputation.
// Paper lies in the world with top-view coordinates (X right, Y up-screen) = (x, -z); +y is up.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const eio = t => { t = Math.min(1, Math.max(0, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

function rotAbout(P, D, ang) {
  const m = new THREE.Matrix4().makeRotationAxis(D, ang);
  const a = new THREE.Matrix4().makeTranslation(P.x, P.y, P.z), b = new THREE.Matrix4().makeTranslation(-P.x, -P.y, -P.z);
  return a.multiply(m).multiply(b);
}

// Sutherland-Hodgman on one convex polygon; s[i] is the signed value of vertex i; keep where sign*s >= 0.
// Edge flags: bnd[i] says edge i -> i+1 is a cut edge of the sheet (gets thickness); the new chord edge is not.
function clip(poly, bnd, s, sign) {
  const E = 1e-9, out = [], ob = [], cut = [], n = poly.length;
  const push = (p, f) => { const q = out[out.length - 1]; if (q && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-9) { ob[ob.length - 1] = f; return; } out.push(p); ob.push(f); };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = sign * s[i], b = sign * s[j], ina = a >= -E, inb = b >= -E;
    const cross = (a > E && b < -E) || (a < -E && b > E);
    const p = cross ? (() => { const t = a / (a - b); return [poly[i][0] + (poly[j][0] - poly[i][0]) * t, poly[i][1] + (poly[j][1] - poly[i][1]) * t]; })() : null;
    if (Math.abs(a) <= E) cut.push(poly[i]);
    if (cross) cut.push(p);
    if (ina && inb) push(poly[i], bnd[i]);
    else if (ina && !inb) { if (Math.abs(a) <= E) push(poly[i], false); else { push(poly[i], bnd[i]); push(p, false); } }
    else if (!ina && inb) { if (Math.abs(b) > E) push(p, bnd[i]); }
  }
  if (out.length > 1) { const f = out[0], l = out[out.length - 1]; if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-9) { out.pop(); ob.pop(); } }
  // chord = the two cut points farthest apart
  let best = 0, ch = [];
  for (let i = 0; i < cut.length; i++) for (let j = i + 1; j < cut.length; j++) { const d = Math.hypot(cut[i][0] - cut[j][0], cut[i][1] - cut[j][1]); if (d > best) { best = d; ch = [cut[i], cut[j]]; } }
  return { poly: out, bnd: ob, cut: ch };
}
const area = poly => { let a = 0; for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; a += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1]; } return a / 2; };

export class Sheet {
  // o: { w, h, th (paper thickness, m), seg (target mesh spacing, m), at: [x,y] top-view position of the sheet centre, rot }
  constructor(o = {}) {
    this.w = o.w ?? .15; this.h = o.h ?? o.w ?? .15; this.th = o.th ?? .00026; this.seg = o.seg ?? .0065;
    const a = this.w / 2, b = this.h / 2;
    this.facets = [{ id: 0, poly: [[-a, -b], [a, -b], [a, b], [-a, b]], bnd: [true, true, true, true], ops: [], slot0: 0, sd: [], tag: {} }];
    this.nextId = 1; this.ops = []; this.chords = [];
    this.origin = new THREE.Vector3(o.at?.[0] ?? 0, o.y ?? 0, -(o.at?.[1] ?? 0)); this.rotY = o.rot ?? 0;
    this.curlDefault = o.curl ?? .22;
  }
  // progress of op k at time t, from its key list [[t,p],...] with eased segments
  pAt(op, t) {
    const K = op.keys;
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (t < K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * op.ease((t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]));
    return K[K.length - 1][1];
  }
  peakAt(op, t) {   // the largest progress reached up to t: a crease stays once it has been made
    let m = Math.max(0, op.keys[0][0] <= t ? op.keys[0][1] : 0);
    for (let i = 1; i < op.keys.length; i++) { if (op.keys[i][0] <= t) m = Math.max(m, op.keys[i][1]); else if (op.keys[i - 1][0] < t) m = Math.max(m, this.pAt(op, t)); }
    return m;
  }
  solveAxes(ps) {
    const ax = [];
    for (let k = 0; k < this.ops.length; k++) {
      const op = this.ops[k], M = new THREE.Matrix4();
      for (const kk of op.refOps) M.premultiply(ax[kk].R);
      const P = op.Pl.clone().applyMatrix4(M), D = op.Dl.clone().transformDirection(M);
      const ang = op.angle * ps[k], sh = (op.shift || 0) * ps[k];
      const R = ang === 0 ? new THREE.Matrix4() : rotAbout(P, D, ang);
      if (sh) R.premultiply(new THREE.Matrix4().makeTranslation(0, sh, 0));
      ax.push({ P, D, ang, sh, R });
    }
    return ax;
  }
  chainM(ops, ax) { const M = new THREE.Matrix4(); for (const k of ops) M.premultiply(ax[k].R); return M; }
  slotOf(f, ps) { let s = f.slot0; for (const d of f.sd) s += (d.to - d.from) * smooth((Math.abs(ps[d.k]) - .3) / .4); return s; }
  slotFinal(f) { let s = f.slot0; for (const d of f.sd) s += d.to - d.from; return s; }

  // Define a fold. a, b: top-view points of the crease line. side: which side moves ('L' or 'R' of a->b).
  // kind: 'valley' (flap goes over the top) or 'mountain' (flap goes behind). keys: [[t,p],...] or [t0,t1].
  // mode 'pre': the line is placed on the state after all earlier folds; 'rest': on the flat sheet (parallel creases, accordion).
  fold(o) {
    const k = this.ops.length, mode = o.mode ?? 'pre';
    const [ax_, ay_] = o.a, [bx_, by_] = o.b, len = Math.hypot(bx_ - ax_, by_ - ay_), dx = (bx_ - ax_) / len, dy = (by_ - ay_) / len;
    const m = (o.side ?? 'L') === 'L' ? 1 : -1;
    const ps0 = this.ops.map(() => mode === 'pre' ? 1 : 0), axs = this.solveAxes(ps0);
    const sig = (kind) => kind === 'mountain' ? -1 : 1;
    const angle = (o.angle ?? Math.PI) * sig(o.kind ?? 'valley');
    const out = [], moving = [], stationary = [], chords = [];
    let dmax = 0;
    for (const f of this.facets) {
      if (o.select && !o.select(f)) { out.push(f); stationary.push(f); continue; }
      const M = this.chainM(f.ops, axs);
      const vw = f.poly.map(([u, v]) => new THREE.Vector3(u, 0, -v).applyMatrix4(M));
      const w = vw.map(p => ((bx_ - ax_) * (-p.z - ay_) - (by_ - ay_) * (p.x - ax_)) / len);
      const pos = w.some(x => m * x > 1e-7), neg = w.some(x => m * x < -1e-7);
      const mk = (c) => ({ id: this.nextId++, poly: c.poly, bnd: c.bnd, ops: f.ops.slice(), slot0: f.slot0, sd: f.sd.slice(), tag: { ...f.tag } });
      if (pos && !neg) { const g = f; g.ops = g.ops.slice(); g.ops.push(k); out.push(g); moving.push({ f: g, w, M }); w.forEach(x => dmax = Math.max(dmax, Math.abs(x))); continue; }
      if (!pos) { out.push(f); stationary.push(f); continue; }
      const cp = clip(f.poly, f.bnd, w, m), cn = clip(f.poly, f.bnd, w, -m);
      if (cp.poly.length < 3 || cn.poly.length < 3 || Math.abs(area(cp.poly)) < 1e-9 || Math.abs(area(cn.poly)) < 1e-9) { // a sliver: treat by centroid
        const cen = w.reduce((a, b) => a + b, 0) / w.length; if (m * cen > 0) { f.ops = f.ops.concat([k]); out.push(f); moving.push({ f, w, M }); } else { out.push(f); stationary.push(f); } continue;
      }
      const P = mk(cp), N = mk(cn); P.ops.push(k);
      if (cp.cut.length >= 2) chords.push({ a: cp.cut[0], b: cp.cut[1], k, flip: M.elements[5] < 0 });
      out.push(P, N); moving.push({ f: P, w, M }); stationary.push(N);
      w.forEach(x => { if (m * x > 0) dmax = Math.max(dmax, Math.abs(x)); });
    }
    this.facets = out;
    // flat folds stack: the flap reverses its layer order and lands on top (valley) or below (mountain).
    // The hinge axis sits at the height of the stack edge it wraps around, and a common lift places the flap on the stack.
    let ya = 0, shift = 0;
    if (o.slots !== false && Math.abs(Math.abs(angle) - Math.PI) < 1e-6 && mode === 'pre') {
      const st = stationary.map(f => this.slotFinal(f)), top = st.length ? Math.max(...st) : -1, bot = st.length ? Math.min(...st) : 0;
      const mv = moving.map(x => this.slotFinal(x.f)), Smax = Math.max(...mv), Smin = Math.min(...mv);
      moving.forEach((x, i) => { const s = mv[i]; const to = angle > 0 ? top + 1 + (Smax - s) : bot - 1 - (s - Smin); x.f.sd.push({ k, from: s, to }); });
      if (angle > 0) { const yaS = Math.max(top, Smax); ya = yaS * this.th; shift = (top + 1 + Smax - 2 * yaS) * this.th; }
      else { const yaS = Math.min(bot, Smin); ya = yaS * this.th; shift = (bot - 1 + Smin - 2 * yaS) * this.th; }
    }
    // reference facet: the stationary piece nearest to the line
    let ref = null, best = 1e9;
    for (const f of stationary) {
      const M = this.chainM(f.ops, axs);
      for (const [u, v] of f.poly) { const p = new THREE.Vector3(u, 0, -v).applyMatrix4(M); const d = Math.abs(((bx_ - ax_) * (-p.z - ay_) - (by_ - ay_) * (p.x - ax_)) / len); if (d < best) { best = d; ref = f; } }
    }
    if (!ref) ref = this.facets[0];
    const Mref = this.chainM(ref.ops, axs), inv = Mref.clone().invert();
    const Pw = new THREE.Vector3(ax_, ya, -ay_);
    const sx = -dy * m, sy = dx * m;                  // moving direction in top view
    const s3 = new THREE.Vector3(sx, 0, -sy), Dw = new THREE.Vector3().crossVectors(s3, UP).normalize();
    const op = {
      k, mode, angle, shift, kind: o.kind ?? 'valley', Pw, Dw, Pl: Pw.clone().applyMatrix4(inv), Dl: Dw.clone().transformDirection(inv),
      refOps: ref.ops.slice(), keys: Array.isArray(o.keys?.[0]) ? o.keys : [[o.keys[0], 0], [o.keys[1], 1]], ease: o.ease ?? eio,
      curl: o.curl ?? this.curlDefault, dmax: Math.max(dmax, 1e-4), wear: o.wear ?? .5, label: o.label,
    };
    if (o.rest != null) { const K = op.keys, last = K[K.length - 1]; if (last[1] === 0) last[1] = o.rest; }
    this.ops.push(op);
    for (const c of chords) this.chords.push({ ...c, a: c.a.slice(), b: c.b.slice(), kind: (op.kind === 'valley') !== !!c.flip ? 'valley' : 'mountain' });
    return op;
  }
  // Unfold every op, last fold first, one after the other (never overlapping: where creases cross, the
  // fold angles of a flat-foldable vertex are coupled, so independent progress is only valid one op at a time).
  // The creases stay (peakAt remembers them); the paper lies flat again and the shader keeps a small crease tilt.
  unfoldAll(t0, dur, gap = .05) {
    const n = this.ops.length, w = (dur - gap * (n - 1)) / n;
    this.ops.forEach((op, k) => {
      const last = op.keys[op.keys.length - 1], i = n - 1 - k, a = t0 + i * (w + gap);
      op.keys.push([a, last[1]], [a + w, 0]);
    });
  }
  // local top-view point (X, Y) at height h -> world, through the sheet's placement
  toWorld(X, Y, h = 0) { const c = Math.cos(this.rotY), s = Math.sin(this.rotY), x = X, z = -Y; return new THREE.Vector3(x * c + z * s + this.origin.x, h + this.origin.y, -x * s + z * c + this.origin.z); }
  // final world position of a facet's polygon at time t (for diagrams, picking points)
  worldPoly(f, t) {
    const ps = this.ops.map(op => this.pAt(op, t)), ax = this.solveAxes(ps), M = this.chainM(f.ops, ax);
    return f.poly.map(([u, v]) => new THREE.Vector3(u, 0, -v).applyMatrix4(M));
  }
  worldPoint(f, uv, t) { return this.worldPoly({ ...f, poly: [uv] }, t)[0]; }

  // ---- mesh -------------------------------------------------------------------------------------
  build() {
    const h = this.seg, facets = this.facets, nops = this.ops.length;
    const axOnes = this.solveAxes(this.ops.map(() => 1));
    const P = [], UV = [], PA = [], IDX = [], SEGR = [];
    const vf = [];       // per facet: { start, count, ops, d: Float32Array(count*nops_f), edges: boundary runs }
    const L = Math.max(this.w, this.h);
    const segsOf = (f) => {   // chords near this facet (bbox + 3 mm), with their ops
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [u, v] of f.poly) { x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
      const mg = .003; return this.chords.filter(c => Math.max(c.a[0], c.b[0]) > x0 - mg && Math.min(c.a[0], c.b[0]) < x1 + mg && Math.max(c.a[1], c.b[1]) > y0 - mg && Math.min(c.a[1], c.b[1]) < y1 + mg);
    };
    const segData = []; // [ax,ay,bx,by, op, wear, 0, 0]
    for (const f of facets) {
      const poly = f.poly, n = poly.length, cx = poly.reduce((a, p) => a + p[0], 0) / n, cy = poly.reduce((a, p) => a + p[1], 0) / n;
      // boundary points: each edge split into ceil(len/h) parts
      const ring0 = [], runs = [];
      for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n], el = Math.hypot(b[0] - a[0], b[1] - a[1]), ns = Math.max(1, Math.ceil(el / h));
        const start = ring0.length;
        for (let j = 0; j < ns; j++) ring0.push([a[0] + (b[0] - a[0]) * j / ns, a[1] + (b[1] - a[1]) * j / ns]);
        runs.push({ i, start, ns, bnd: f.bnd[i] });
      }
      let rmax = 0; for (const p of ring0) rmax = Math.max(rmax, Math.hypot(p[0] - cx, p[1] - cy));
      const K = Math.max(1, Math.round(rmax / h));
      const start = P.length, nb = ring0.length;
      for (let r = 0; r < K; r++) { const s = 1 - r / K; for (const p of ring0) { const u = cx + (p[0] - cx) * s, v = cy + (p[1] - cy) * s; P.push([u, v]); } }
      P.push([cx, cy]); const ctr = P.length - 1;
      for (let r = 0; r < K; r++) {
        for (let i = 0; i < nb; i++) {
          const j = (i + 1) % nb, a = start + r * nb + i, b = start + r * nb + j;
          if (r < K - 1) { const c = start + (r + 1) * nb + i, d = start + (r + 1) * nb + j; IDX.push(a, b, d, a, d, c); }
          else IDX.push(a, b, ctr);
        }
      }
      const count = P.length - start;
      // winding: make sure triangles face +y at rest (polygon CCW in uv); flip if the facet polygon is CW
      // (clip keeps orientation, so facets stay CCW)
      const mine = segsOf(f), sStart = segData.length;
      for (const c of mine) segData.push([c.a[0], c.a[1], c.b[0], c.b[1], c.k, this.ops[c.k].wear, c.kind === 'mountain' ? -1 : 1, 0]);
      for (let i = start; i < P.length; i++) SEGR.push([sStart, mine.length]);
      // per-vertex distances to each op's axis in its pre-state
      const fo = f.ops, d = new Float32Array(count * fo.length);
      for (let vi = 0; vi < count; vi++) {
        const [u, v] = P[start + vi];
        for (let q = 0; q < fo.length; q++) {
          const op = this.ops[fo[q]];
          const pos = new THREE.Vector3(u, 0, -v);
          if (op.mode === 'pre') for (const j of fo) { if (j >= fo[q]) break; pos.applyMatrix4(axOnes[j].R); }
          d[vi * fo.length + q] = new THREE.Vector3().subVectors(pos, op.Pw).cross(op.Dw).length();
        }
      }
      vf.push({ f, start, count, fo, d, runs, nb, ring0n: nb });
    }
    const nV = P.length;
    const pos = new Float32Array(nV * 3), uvA = new Float32Array(nV * 2), paperA = new Float32Array(nV * 2), segrA = new Float32Array(nV * 2);
    for (let i = 0; i < nV; i++) { paperA[i * 2] = P[i][0]; paperA[i * 2 + 1] = P[i][1]; uvA[i * 2] = P[i][0] / this.w + .5; uvA[i * 2 + 1] = P[i][1] / this.h + .5; segrA[i * 2] = SEGR[i][0]; segrA[i * 2 + 1] = SEGR[i][1]; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nV * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvA, 2)); geo.setAttribute('paper', new THREE.BufferAttribute(paperA, 2)); geo.setAttribute('segr', new THREE.BufferAttribute(segrA, 2));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(IDX), 1));
    // edge strips (paper thickness) along boundary runs
    const E = [], EI = [], eref = [];     // eref: [vertex index in P, side] per strip vertex
    for (const x of vf) {
      for (const run of x.runs) {
        if (!run.bnd) continue;
        const base = E.length;
        for (let j = 0; j <= run.ns; j++) { const vi = x.start + (run.start + j) % x.nb; E.push(vi, vi); }
        for (let j = 0; j < run.ns; j++) { const a = base + j * 2; EI.push(a, a + 2, a + 3, a, a + 3, a + 1); }
      }
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(E.length * 3), 3));
    eg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(E.length * 3), 3));
    eg.setIndex(new THREE.BufferAttribute(new Uint32Array(EI), 1));
    // hinge ribbons: every inner edge shared by two facets gets a curled strip bridging them (the rounded fold edge)
    const KS = 6, hmap = new Map(), pairs = [];
    const key = (p, q) => { const f = v => v.toFixed(6); const a = f(p[0]) + ',' + f(p[1]), b = f(q[0]) + ',' + f(q[1]); return a < b ? a + '|' + b : b + '|' + a; };
    for (const x of vf) {
      const poly = x.f.poly;
      for (const run of x.runs) {
        if (run.bnd) continue;
        const k = key(poly[run.i], poly[(run.i + 1) % poly.length]), idx = []; for (let j = 0; j <= run.ns; j++) idx.push(x.start + (run.start + j) % x.nb);
        const e = { x, idx, ns: run.ns }; if (hmap.has(k)) { const o = hmap.get(k); if (o.ns === e.ns) pairs.push({ a: o, b: e }); hmap.delete(k); } else hmap.set(k, e);
      }
    }
    const HP = [], HU = [], HI = [], hsl = [];
    pairs.forEach((pr, pi) => {
      const base = HP.length;
      for (let j = 0; j <= pr.a.ns; j++) for (let q = 0; q <= KS; q++) { const vi = pr.a.idx[j]; HP.push(vi); }
      const W = KS + 1;
      for (let j = 0; j < pr.a.ns; j++) for (let q = 0; q < KS; q++) { const i0 = base + j * W + q; HI.push(i0, i0 + 1, i0 + W + 1, i0, i0 + W + 1, i0 + W); }
      pr.base = base; pr.ca = pr.a.x.start + pr.a.x.count - 1; pr.cb = pr.b.x.start + pr.b.x.count - 1;
    });
    const hg = new THREE.BufferGeometry(), nH = HP.length, hU = new Float32Array(nH * 2), hPa = new Float32Array(nH * 2);
    HP.forEach((vi, i) => { hU[i * 2] = uvA[vi * 2]; hU[i * 2 + 1] = uvA[vi * 2 + 1]; hPa[i * 2] = paperA[vi * 2]; hPa[i * 2 + 1] = paperA[vi * 2 + 1]; });
    hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nH * 3), 3)); hg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nH * 3), 3));
    hg.setAttribute('uv', new THREE.BufferAttribute(hU, 2)); hg.setAttribute('paper', new THREE.BufferAttribute(hPa, 2)); hg.setAttribute('segr', new THREE.BufferAttribute(new Float32Array(nH * 2), 2));
    hg.setIndex(new THREE.BufferAttribute(new Uint32Array(HI), 1));
    this.mesh = { geo, eg, hg, pairs, KS, vf, E, nV, segData, axOnes };
    this.mesh.stripIdx = E;
    return this.mesh;
  }
  // write positions for time t. returns { ps } for the caller (crease strengths)
  update(t) {
    const { geo, eg, vf, E } = this.mesh, nops = this.ops.length;
    const ps = this.ops.map(op => this.pAt(op, t)), ax = this.solveAxes(ps);
    const pos = geo.attributes.position.array, v = new THREE.Vector3(), tmp = new THREE.Vector3(), rot = new THREE.Matrix4();
    const org = this.origin, c = Math.cos(this.rotY), s = Math.sin(this.rotY);
    for (const x of vf) {
      const f = x.f, fo = x.fo, nf = fo.length;
      // precompute per-op axis data
      const A = fo.map(k => ax[k]);
      for (let vi = 0; vi < x.count; vi++) {
        const idx = x.start + vi, u = geo.attributes.paper.array[idx * 2], w = geo.attributes.paper.array[idx * 2 + 1];
        v.set(u, 0, -w);
        for (let q = 0; q < nf; q++) {
          const op = this.ops[fo[q]], a = A[q], p = ps[fo[q]];
          if (Math.abs(p) < 1e-6) continue;
          const dd = x.d[vi * nf + q] / op.dmax, bow = op.curl * Math.sin(Math.PI * Math.min(1, Math.abs(p))) * smooth(dd) * Math.sign(op.angle) * (Math.abs(op.angle) > 2 ? 1 : .4);
          const ang = a.ang + bow;
          if (ang === 0) continue;
          // Rodrigues about (a.P, a.D)
          tmp.copy(v).sub(a.P);
          const cs = Math.cos(ang), sn = Math.sin(ang), D = a.D, dot = D.dot(tmp);
          const cx = D.y * tmp.z - D.z * tmp.y, cy = D.z * tmp.x - D.x * tmp.z, cz = D.x * tmp.y - D.y * tmp.x;
          v.set(tmp.x * cs + cx * sn + D.x * dot * (1 - cs) + a.P.x, tmp.y * cs + cy * sn + D.y * dot * (1 - cs) + a.P.y + a.sh, tmp.z * cs + cz * sn + D.z * dot * (1 - cs) + a.P.z);
        }
        pos[idx * 3] = v.x * c + v.z * s + org.x; pos[idx * 3 + 1] = v.y + org.y; pos[idx * 3 + 2] = -v.x * s + v.z * c + org.z;
      }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.attributes.normal.needsUpdate = true;
    // strips
    const ep = eg.attributes.position.array, en = eg.attributes.normal.array, N = geo.attributes.normal.array, h = this.th * .46;
    for (let i = 0; i < E.length; i++) {
      const vi = E[i], sd = (i & 1) ? -1 : 1;
      ep[i * 3] = pos[vi * 3] + N[vi * 3] * h * sd; ep[i * 3 + 1] = pos[vi * 3 + 1] + N[vi * 3 + 1] * h * sd; ep[i * 3 + 2] = pos[vi * 3 + 2] + N[vi * 3 + 2] * h * sd;
    }
    eg.attributes.position.needsUpdate = true; eg.computeVertexNormals();
    // hinge ribbons: quadratic curve from one facet's edge point to the other's, bulging away from the sheet
    const { hg, pairs, KS } = this.mesh, hp = hg.attributes.position.array, A = new THREE.Vector3(), B = new THREE.Vector3(), M = new THREE.Vector3(), O = new THREE.Vector3(), C = new THREE.Vector3();
    for (const pr of pairs) {
      const ns = pr.a.ns, W = KS + 1;
      const cm = M.set((pos[pr.ca * 3] + pos[pr.cb * 3]) / 2, (pos[pr.ca * 3 + 1] + pos[pr.cb * 3 + 1]) / 2, (pos[pr.ca * 3 + 2] + pos[pr.cb * 3 + 2]) / 2).clone();
      const i0 = pr.a.idx[0], i1 = pr.a.idx[ns];
      const T = new THREE.Vector3(pos[i1 * 3] - pos[i0 * 3], pos[i1 * 3 + 1] - pos[i0 * 3 + 1], pos[i1 * 3 + 2] - pos[i0 * 3 + 2]).normalize();
      for (let j = 0; j <= ns; j++) {
        const ia = pr.a.idx[j], ib = pr.b.idx[ns - j];
        A.set(pos[ia * 3], pos[ia * 3 + 1], pos[ia * 3 + 2]); B.set(pos[ib * 3], pos[ib * 3 + 1], pos[ib * 3 + 2]);
        const len = A.distanceTo(B); M.copy(A).add(B).multiplyScalar(.5); O.copy(M).sub(cm); O.addScaledVector(T, -O.dot(T)); O.normalize();
        C.copy(M).addScaledVector(O, len * .85);
        for (let q = 0; q <= KS; q++) {
          const t = q / KS, u = 1 - t, o = (pr.base + j * W + q) * 3;
          if (len < 1e-5) { hp[o] = A.x; hp[o + 1] = A.y; hp[o + 2] = A.z; continue; }
          hp[o] = u * u * A.x + 2 * u * t * C.x + t * t * B.x; hp[o + 1] = u * u * A.y + 2 * u * t * C.y + t * t * B.y; hp[o + 2] = u * u * A.z + 2 * u * t * C.z + t * t * B.z;
        }
      }
    }
    hg.attributes.position.needsUpdate = true; hg.computeVertexNormals();
    return ps;
  }
}
