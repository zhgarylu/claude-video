// Halden: an invented city and an invented network. Pure data + geometry (no DOM, no imports), so the page,
// the sound mix and the checks all read the same numbers.
// Coordinates are grid units (1 unit = U world pixels). The DIAGRAM is octilinear; the GEOGRAPHY is the same
// network warped into a "real" city (curved, rotated, uneven) with a river and streets.
export const U = 56;

export const PAPER = '#F4F0E8', INK = '#1D2433', GREY = '#8C93A0', PALE = '#D8D3C6';
export const RIVER_COL = '#CFE0E8', PARK_COL = '#D9E4CE';
export const LINES = [
  { id: 'copper', name: 'Copper', num: 1, color: '#E2582C', closed: false,
    pts: [[1, 12], [5, 8], [23, 8], [25, 10], [31, 10]],
    stops: ['kiln', 'mill', 'alder', 'pike', 'wren', 'salt', 'tide', 'lock', 'fair', 'reed'] },
  { id: 'violet', name: 'Violet', num: 2, color: '#7B3FA0', closed: false,
    pts: [[14, 1], [14, 15]],
    stops: ['fennel', 'orchard', 'bell', 'wren', 'lantern', 'sedge', 'marrow', 'tern'] },
  { id: 'fern', name: 'Fern', num: 3, color: '#2E9B58', closed: false,
    pts: [[3, 2], [6, 2], [16, 12], [23, 12], [25, 14], [30, 14]],
    stops: ['quill', 'hatch', 'drum', 'linden', 'pike', 'lantern', 'fenn', 'slate', 'osier', 'brack', 'gull'] },
  { id: 'ring', name: 'Ring', num: 4, color: '#1E5BC6', closed: true,
    pts: [[11, 3], [17, 3], [20, 6], [20, 11], [17, 14], [11, 14], [8, 11], [8, 6]],
    stops: ['orchard', 'gantry', 'ember', 'salt', 'cutler', 'fenn', 'marrow', 'anchor', 'pennant', 'alder', 'linden'] },
  { id: 'saffron', name: 'Saffron', num: 5, color: '#EBA400', closed: false,
    pts: [[19, 5], [26, 5], [28, 3], [31, 3]],
    stops: ['ember', 'gas', 'quarry', 'weld', 'ropery', 'rook'] },
];

export const STATIONS = {
  kiln: ['Kiln Road', 1, 12], mill: ['Mill Cross', 3, 10], alder: ['Alder Cross', 8, 8], pike: ['Pike Street', 12, 8],
  wren: ['Wren Junction', 14, 8], salt: ['Saltmarket', 20, 8], tide: ['Tidemill', 22, 8],
  lock: ['Lock Street', 24, 9], fair: ['Fairground', 27, 10], reed: ['Reed End', 31, 10],
  fennel: ['Fennel Gate', 14, 1], orchard: ['Orchard Row', 14, 3], bell: ['Bell Yard', 14, 5], lantern: ['Lantern Hill', 14, 10],
  sedge: ['Sedge', 14, 12], marrow: ['Marrow Gate', 14, 14], tern: ['Tern Dock', 14, 15],
  quill: ['Quill Lane', 3, 2], hatch: ['Hatch End', 5, 2], drum: ['Drum Hill', 7, 3], linden: ['Linden', 9, 5],
  fenn: ['Fenn Quay', 19, 12], slate: ['Slate Yard', 21, 12], osier: ['Osier', 24, 13],
  brack: ['Brackwater', 27, 14], gull: ['Gull Quay', 30, 14],
  gantry: ['Gantry', 18, 4], ember: ['Ember Wharf', 19, 5],
  cutler: ['Cutler', 20, 10], anchor: ['Anchor', 10, 13],
  pennant: ['Pennant', 8, 10],
  gas: ['Gaslight', 21, 5], quarry: ['Quarry Hill', 23, 5], weld: ['Weld Street', 25, 5], ropery: ['Ropery', 27, 4], rook: ['Rook Point', 31, 3],
};
export const ST = {};
for (const [id, [name, x, y]] of Object.entries(STATIONS)) ST[id] = { id, name, p: [x, y], lines: [] };
for (const L of LINES) for (const s of L.stops) { if (!ST[s]) throw new Error('unknown station ' + s); ST[s].lines.push(L.id); }

// the river: straightened in the diagram, meandering in the city
// a river from the west edge, bending down past the Ring's south-west to the south-east
export const RIVER_WP = [[-3, 4.5], [1.5, 4.5], [4.5, 7.5], [4.5, 11], [7.5, 14], [22, 14], [28, 20]];

// fare zones (diagram only): octilinear rings. Zone 1 is the Ring offset outward; zone 2 a larger octagon.
export const ZONE1_OFF = 0.5;
export const ZONE2 = [[8, 0.4], [22, 0.4], [26.5, 4.9], [26.5, 11.9], [22.5, 15.9], [7.5, 15.9], [3.6, 12], [3.6, 4.8]];

// ---- the geography: a deterministic warp of the diagram -------------------------------------------------
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
export function warp(x, y) {
  let X = x + 2.1 * Math.sin(.42 * y + .7) + .9 * Math.sin(.75 * x + .35 * y + 1.3);
  let Y = y + 1.7 * Math.sin(.36 * x + 1.9) + .8 * Math.sin(.8 * y - .3 * x + .4);
  const cx = 16, cy = 8, a = -.2, dx = X - cx, dy = Y - cy;
  X = cx + dx * Math.cos(a) - dy * Math.sin(a); Y = cy + dx * Math.sin(a) + dy * Math.cos(a);
  const r = Math.hypot(X - cx, (Y - cy) * 1.4), k = 1 + .12 * Math.tanh((r - 8) / 6);
  return [cx + (X - cx) * k, cy + (Y - cy) * k];
}
const jit = (x, y, amp) => [(hash(x * 12.9 + y * 78.2) - .5) * amp, (hash(x * 39.3 + y * 11.1 + 5) - .5) * amp];

// A path is a list of waypoints {d:[x,y] diagram px, g:[x,y] geography px, w: morph delay, st: station id | null, corner: bool}
const MORPH_CENTRE = [14, 8];
export function delayOf(x, y) {   // seconds after the morph starts, quantised to eighth notes (0.25 s)
  const d = Math.hypot(x - MORPH_CENTRE[0], y - MORPH_CENTRE[1]);
  return Math.round(d * .2 / .25) * .25;
}
function mkWp(x, y, st, corner, mid, scatter, k = 1) {
  const g = warp(x, y), j = mid ? jit(x, y, scatter * k) : [0, 0];
  return { d: [x * U, y * U], g: [(g[0] + j[0]) * U, (g[1] + j[1]) * U], w: delayOf(x, y), st: st || null, corner: !!corner, u: [x, y] };
}
function buildPath(pts, closed, stopIds, spacing, scatter) {
  const n = pts.length, out = [], segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const A = pts[i], B = pts[(i + 1) % n], len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const ux = (B[0] - A[0]) / len, uy = (B[1] - A[1]) / len;
    const on = [];   // stations lying on this segment (strictly between ends, or at A)
    for (const id of stopIds || []) {
      const [x, y] = ST[id].p, t = (x - A[0]) * ux + (y - A[1]) * uy, perp = Math.abs((x - A[0]) * uy - (y - A[1]) * ux);
      if (perp < 1e-6 && t > 1e-6 && t < len - 1e-6) on.push({ t, id });
    }
    on.sort((a, b) => a.t - b.t);
    const stopAtA = (stopIds || []).find(id => ST[id].p[0] === A[0] && ST[id].p[1] === A[1]);
    out.push(mkWp(A[0], A[1], stopAtA, true, false, scatter));
    const marks = [0, ...on.map(o => o.t), len];
    for (let k = 0; k < marks.length - 1; k++) {
      const a = marks[k], b = marks[k + 1], nm = Math.max(0, Math.ceil((b - a) / spacing) - 1);
      for (let m = 1; m <= nm; m++) { const t = a + (b - a) * m / (nm + 1); out.push(mkWp(A[0] + ux * t, A[1] + uy * t, null, false, true, scatter, Math.max(0, Math.min(1, Math.min(t, len - t) / 2)))); }
      if (k < on.length) out.push(mkWp(A[0] + ux * on[k].t, A[1] + uy * on[k].t, on[k].id, false, false, scatter));
    }
  }
  if (!closed) { const E = pts[n - 1]; const id = (stopIds || []).find(s => ST[s].p[0] === E[0] && ST[s].p[1] === E[1]); out.push(mkWp(E[0], E[1], id, true, false, scatter)); }
  return out;
}
for (const L of LINES) L.wps = buildPath(L.pts, L.closed, L.stops, 1.5, .55);
export const RIVER_PATH = buildPath(RIVER_WP, false, [], 1.5, 1.6);

// ---- zone polygons ---------------------------------------------------------------------------------------
export function offsetConvex(poly, d) {   // outward offset of a convex polygon given clockwise (screen) order
  const n = poly.length, lines = [];
  for (let i = 0; i < n; i++) {
    const A = poly[i], B = poly[(i + 1) % n], dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy);
    const nx = dy / l, ny = -dx / l;   // outward normal for clockwise order in a y-down system
    lines.push([A[0] + nx * d, A[1] + ny * d, dx / l, dy / l]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i + n - 1) % n], b = lines[i];
    const den = a[2] * b[3] - a[3] * b[2], t = ((b[0] - a[0]) * b[3] - (b[1] - a[1]) * b[2]) / den;
    out.push([a[0] + a[2] * t, a[1] + a[3] * t]);
  }
  return out;
}
export const ZONE1 = offsetConvex(LINES[3].pts, ZONE1_OFF);

// ---- streets, parks (geography only) ---------------------------------------------------------------------
function rng(seed) { let s = seed | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function makeStreets() {
  const R = rng(76), C = [15.5, 8.4], streets = [], parks = [];
  const wob = (pts, a) => pts.map(p => [p[0] + (R() - .5) * a, p[1] + (R() - .5) * a]);
  for (let k = 0; k < 18; k++) {   // arterials
    const ang = k / 18 * Math.PI * 2 + (R() - .5) * .25, pts = [];
    for (let i = 0; i <= 10; i++) { const r = 1 + i * 2.1, bend = Math.sin(i * .5 + k) * .35; pts.push([C[0] + Math.cos(ang + bend * .2) * r * 1.35, C[1] + Math.sin(ang + bend * .2) * r]); }
    streets.push({ w: 2.8, c: 0, pts: wob(pts, .5) });
  }
  for (const rad of [3.5, 6.5, 9.5, 12.5, 15.5]) {   // ring roads
    const pts = [], a0 = R() * 6, span = 4.6 + R() * 1.4;
    for (let i = 0; i <= 18; i++) { const a = a0 + span * i / 18; pts.push([C[0] + Math.cos(a) * rad * 1.35, C[1] + Math.sin(a) * rad * (.95 + R() * .1)]); }
    streets.push({ w: 2.4, c: 0, pts: wob(pts, .4) });
  }
  for (let k = 0; k < 110; k++) {   // side streets
    const base = streets[Math.floor(R() * 18)].pts, p0 = base[1 + Math.floor(R() * 9)], ang = R() * 6.28, pts = [p0];
    const n = 3 + Math.floor(R() * 3);
    for (let i = 1; i <= n; i++) { const q = pts[i - 1]; pts.push([q[0] + Math.cos(ang + (R() - .5) * .9) * (.9 + R()), q[1] + Math.sin(ang + (R() - .5) * .9) * (.9 + R())]); }
    streets.push({ w: 1.4, c: 1, pts });
  }
  for (let k = 0; k < 9; k++) {   // parks
    const cx = 3 + R() * 26, cy = 1 + R() * 14, rr = .9 + R() * 1.3, pts = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, r = rr * (.7 + R() * .6); pts.push([cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r]); }
    parks.push(pts);
  }
  return { streets, parks };
}

// ---- the journey ------------------------------------------------------------------------------------------
export const ROUTE = [
  { line: 'fern', from: 'quill', to: 'linden' },
  { line: 'ring', from: 'linden', to: 'ember' },
  { line: 'saffron', from: 'ember', to: 'rook' },
];
export const lineById = id => LINES.find(l => l.id === id);

// ---- checks (used by tools/netcheck.mjs) --------------------------------------------------------------------
export function netcheck() {
  const msgs = [];
  for (const L of [...LINES, { id: 'river', pts: RIVER_WP, closed: false }]) {
    const n = L.pts.length, segs = L.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const A = L.pts[i], B = L.pts[(i + 1) % n], dx = B[0] - A[0], dy = B[1] - A[1];
      const ok = dx === 0 || dy === 0 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 1e-9;
      if (!ok) msgs.push(`${L.id}: segment ${i} (${A} → ${B}) is not 0/45/90 degrees`);
      if (i < segs - 1 || L.closed) {
        const C = L.pts[(i + 2) % n], ex = C[0] - B[0], ey = C[1] - B[1];
        const a1 = Math.atan2(dy, dx), a2 = Math.atan2(ey, ex); let da = Math.abs(a2 - a1) * 180 / Math.PI; if (da > 180) da = 360 - da;
        if (da > 90.01) msgs.push(`${L.id}: sharp turn ${da.toFixed(0)}° at ${B}`);
      }
    }
  }
  for (const L of LINES) for (const s of L.stops) if (!L.wps.some(w => w.st === s)) msgs.push(`${L.id}: station ${s} is not on its line`);
  // lines crossing without a shared station
  const segsOf = L => { const o = [], n = L.wps.length, c = L.closed ? n : n - 1; for (let i = 0; i < c; i++) o.push([L.wps[i].u, L.wps[(i + 1) % n].u]); return o; };
  const inter = (a, b) => {
    const [p, r] = [a[0], [a[1][0] - a[0][0], a[1][1] - a[0][1]]], [q, s] = [b[0], [b[1][0] - b[0][0], b[1][1] - b[0][1]]];
    const den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null;
    const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / den, u = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / den;
    if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
    return [p[0] + r[0] * t, p[1] + r[1] * t];
  };
  for (let i = 0; i < LINES.length; i++) for (let j = i + 1; j < LINES.length; j++) {
    const seen = [];
    for (const a of segsOf(LINES[i])) for (const b of segsOf(LINES[j])) {
      const X = inter(a, b); if (!X) continue;
      if (seen.some(s => Math.hypot(s[0] - X[0], s[1] - X[1]) < 1e-6)) continue; seen.push(X);
      const st = Object.values(ST).find(s => Math.abs(s.p[0] - X[0]) < 1e-6 && Math.abs(s.p[1] - X[1]) < 1e-6 && s.lines.includes(LINES[i].id) && s.lines.includes(LINES[j].id));
      if (!st) msgs.push(`${LINES[i].id} x ${LINES[j].id} cross at ${X.map(v => +v.toFixed(2))} with no interchange`);
    }
  }
  return msgs;
}
