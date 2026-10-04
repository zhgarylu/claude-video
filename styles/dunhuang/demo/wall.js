// wall.js: the cave wall under the paint.
// Builds the plaster relief (grit, trowel waves, cracks, flake steps), the pigment-loss and oxidation maps once per wall,
// then shades every frame: fresh paint -> weathered paint (per pixel, with a wake front) -> raking lamp light.
import { clamp, lerp, mulberry } from '/core/lib.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const smd = (a, b, x) => { const t = (x - a) / (b - a); return t <= 0 || t >= 1 ? 0 : 6 * t * (1 - t) / (b - a); };

function noiseMap(W, H, cell, seed) {
  const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, r = mulberry(seed), g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const out = new Float32Array(W * H), fx = new Float32Array(W), ix = new Int32Array(W);
  for (let x = 0; x < W; x++) { const gx = x / cell, x0 = Math.floor(gx), f = gx - x0; ix[x] = x0; fx[x] = f * f * (3 - 2 * f); }
  for (let y = 0; y < H; y++) {
    const gy = y / cell, y0 = Math.floor(gy), f = gy - y0, fy = f * f * (3 - 2 * f), r0 = y0 * gw, r1 = r0 + gw;
    for (let x = 0; x < W; x++) {
      const a = ix[x], u = fx[x];
      const top = g[r0 + a] + (g[r0 + a + 1] - g[r0 + a]) * u, bot = g[r1 + a] + (g[r1 + a + 1] - g[r1 + a]) * u;
      out[y * W + x] = top + (bot - top) * fy;
    }
  }
  return out;
}
function fbm(W, H, cell, oct, seed, gain = .5) {
  const out = new Float32Array(W * H); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const n = noiseMap(W, H, Math.max(1.5, cell / (1 << o)), seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

// cracks: random walks with branches, drawn to a canvas, then read back
function crackMap(W, H, seed, amount) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
  const r = mulberry(seed);
  const walk = (x, y, a, len, w, depth) => {
    let px = x, py = y, drift = (r() - .5) * .2;
    for (let d = 0; d < len; d += 5) {
      drift += (r() - .5) * .05; drift *= .88; a += drift + (r() < .06 ? (r() - .5) * .5 : 0);
      const nx = px + Math.cos(a) * 5, ny = py + Math.sin(a) * 5, ww = w * (1 - .7 * d / len);
      c.lineWidth = Math.max(.6, ww * .75); c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
      px = nx; py = ny;
      if (depth < 3 && r() < .02 * (1 - depth * .3)) walk(px, py, a + (r() < .5 ? -1 : 1) * (.5 + r() * .7), len * (.3 + r() * .25), w * .6, depth + 1);
      if (px < -20 || py < -20 || px > W + 20 || py > H + 20) break;
    }
  };
  const nMain = Math.round(9 * amount), nHair = Math.round(16 * amount);
  for (let i = 0; i < nMain; i++) walk(r() * W, r() * H, r() * 6.28, 380 + r() * 700, 1.4 + r() * 2.2, 0);
  for (let i = 0; i < nHair; i++) walk(r() * W, r() * H, r() * 6.28, 30 + r() * 120, .9 + r() * .6, 2);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const o = out.getContext('2d'); o.filter = 'blur(.7px)'; o.drawImage(cv, 0, 0);
  const d = o.getImageData(0, 0, W, H).data, m = new Float32Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4] / 255;
  return m;
}

function grad(src, W, H, k) {
  const gx = new Float32Array(W * H), gy = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; gx[i] = (src[i + 1] - src[i - 1]) * .5 * k; gy[i] = (src[i + W] - src[i - W]) * .5 * k;
  }
  return [gx, gy];
}

// opts: W,H,seed, crack (amount 0..1.5), loss (0..1: how much paint has fallen), edge (0..1: damage hugs the edges), wearBias
export function buildWall(o) {
  const { W, H, seed = 7 } = o, N = W * H;
  const grit = fbm(W, H, 3.2, 2, seed + 1), trowel = fbm(W, H, 30, 3, seed + 2), swell = fbm(W, H, 240, 2, seed + 3);
  const crack = crackMap(W, H, seed + 4, o.crack ?? 1);
  const crackSoft = new Float32Array(N);
  { // wide crack neighbourhood: cheap box blur by sampling a coarse grid
    const cs = 18, gw = Math.ceil(W / cs), gh = Math.ceil(H / cs), g = new Float32Array(gw * gh);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[((y / cs) | 0) * gw + ((x / cs) | 0)] += crack[y * W + x] / (cs * cs) * 14;
    const g2 = new Float32Array(g.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let s = 0, n = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) { s += g[yy * gw + xx]; n++; } } g2[y * gw + x] = s / n; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) crackSoft[y * W + x] = Math.min(1, g2[((y / cs) | 0) * gw + ((x / cs) | 0)]);
  }
  const lossN = fbm(W, H, 120, 4, seed + 5), eros = fbm(W, H, 9, 2, seed + 6), wearN = fbm(W, H, 260, 3, seed + 7), oxN = fbm(W, H, 190, 3, seed + 8), wn = fbm(W, H, 80, 3, seed + 9);
  const fine = fbm(W, H, 2, 1, seed + 10);
  const bump = new Float32Array(N), loss = new Float32Array(N);
  const wear = new Uint8Array(N), ox = new Uint8Array(N), grain = new Uint8Array(N), er8 = new Uint8Array(N), wn8 = new Uint8Array(N), cr8 = new Uint8Array(N);
  const edgeAmt = o.edge ?? .5, lossAmt = o.loss ?? .5, wb = o.wearBias ?? 0;
  for (let y = 0; y < H; y++) {
    const de = [y, H - 1 - y]; // damage is heavier at the bottom (rising damp, feet) and near the edges
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const d = Math.min(x, W - 1 - x, y * .8, (H - 1 - y) * 1.25) / (Math.min(W, H) * .5);
      const edge = 1 - sm(0, .55, d);
      const w = clamp(.62 * (wearN[i] - .5) * 2 + .5 + edgeAmt * edge * .55 + crackSoft[i] * .25 + wb, 0, 1);
      wear[i] = w * 255;
      loss[i] = clamp((lossN[i] - .5) * 1.5 + .5 + (w - .5) * .75 + crackSoft[i] * .22 + edgeAmt * edge * .35 - (.5 - lossAmt) * 1.2, -1, 2) + (fine[i] - .5) * .08;
      ox[i] = clamp((oxN[i] - .5) * 2.4 + .5 + .15 * (w - .5), 0, 1) * 255;
      grain[i] = fine[i] * 255; er8[i] = eros[i] * 255; wn8[i] = wn[i] * 255; cr8[i] = crack[i] * 255;
      bump[i] = (grit[i] - .5) * 1.7 + (trowel[i] - .5) * 5.5 + (swell[i] - .5) * 9 - crack[i] * 3.2;
    }
  }
  const [bgx, bgy] = grad(bump, W, H, 1), [lgx, lgy] = grad(loss, W, H, 1);
  return { W, H, loss, bgx, bgy, lgx, lgy, wear, ox, grain, er8, wn8, cr8 };
}

// S: { cam:{x,y,z}, p (wake progress), wake:(wx,wy)=>arrival 0..1, band, wearAmt, freshWear, lamp:{x,y,z,R,i}, amb, relief, lossK }
export function shadeFrame(out, paint, wall, S) {
  const W = out.canvas.width, H = out.canvas.height;
  const src = paint.getContext('2d').getImageData(0, 0, W, H).data;
  const img = out.createImageData(W, H), dst = img.data;
  const { loss, bgx, bgy, lgx, lgy, wear, ox, grain, er8, wn8, cr8 } = wall, WW = wall.W, WH = wall.H;
  const { cam, lamp } = S, K = S.relief ?? 1, bw = S.band ?? .05;
  const lampCol = lamp.col || [1, .79, .5], amb = S.amb ?? .2, ambCol = S.ambCol || [.55, .6, .8];
  const wearAmt = S.wearAmt ?? 1, freshWear = S.freshWear ?? .05;
  const G1 = [.72, .65, .52], G2 = [.58, .45, .32];
  for (let y = 0; y < H; y++) {
    const wy = cam.y + y / cam.z, wyi = Math.min(WH - 1, Math.max(0, Math.round(wy)));
    for (let x = 0; x < W; x++) {
      const wx = cam.x + x / cam.z, wxi = Math.min(WW - 1, Math.max(0, Math.round(wx)));
      const wi = wyi * WW + wxi, pi = (y * W + x) * 4;
      let kp = 1; if (S.keep) for (const q of S.keep) if (wx > q[0] && wx < q[2] && wy > q[1] && wy < q[3]) kp = .12;
      const dxp = Math.max(0, Math.min(W - 1, x + Math.round(bgx[wi] * 1.1 * kp))), dyp = Math.max(0, Math.min(H - 1, y + Math.round(bgy[wi] * 1.1 * kp))), si = (dyp * W + dxp) * 4;   // paint settles into the plaster grooves
      let r = src[si] / 255, g = src[si + 1] / 255, b = src[si + 2] / 255;
      // ---- wake: how weathered is this pixel right now
      const arr = S.wake(wx, wy) + (wn8[wi] / 255 - .5) * (S.wakeJit ?? .12);
      const d = S.p - arr;
      let fr = sm(-bw, bw, d);                       // 1 = fresh
      if (S.depart) fr *= 1 - sm(-bw, bw, S.p - S.depart(wx, wy) - (wn8[wi] / 255 - .5) * (S.wakeJit ?? .12));
      const a = ((1 - fr) * wearAmt + fr * freshWear) * kp;  // weathering strength
      const front = Math.exp(-(d / (bw * .9)) * (d / (bw * .9)));
      const wr = wear[wi] / 255, oxv = ox[wi] / 255, gr = grain[wi] / 255, er = er8[wi] / 255, cr = cr8[wi] / 255;
      // ---- pigment chemistry
      const Y = .3 * r + .59 * g + .11 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = (mx - mn) / (mx + .001);
      const wl = sm(.5, .78, Y) * (1 - Math.min(1, sat * 1.7));              // white lead
      const rd = clamp((r - Math.max(g, b)) * 2.6 - .12, 0, 1);              // cinnabar / red lead
      const bl = clamp((b - r) * 3.2, 0, 1), gn = clamp((g - r) * 3, 0, 1) * (1 - bl);
      const k = a * (.25 + .85 * oxv);
      r *= 1 - k * wl * .30; g *= 1 - k * wl * .44; b *= 1 - k * wl * .62;
      r *= 1 - k * rd * .34; g *= 1 - k * rd * .62; b *= 1 - k * rd * .58;
      const gy2 = Y * .9 + .06;
      r = lerp(r, gy2, a * bl * .5); g = lerp(g, gy2 * 1.02, a * bl * .45); b = lerp(b, gy2 * .95, a * bl * .38);
      r = lerp(r, r * .8 + .06, a * gn * .5); b = lerp(b, b * .7, a * gn * .4);
      const dust = a * (.12 + .3 * wr);
      r = lerp(r, .60, dust * .5); g = lerp(g, .50, dust * .5); b = lerp(b, .38, dust * .5);
      // ---- sand abrasion: pigment rubbed off grain by grain
      const s1 = a * (.2 + .8 * wr);
      const ab = sm(.52, .78, s1 * .95 + (er - .5) * .5 + (gr - .5) * .55 - .14);
      const gtone = .92 + .16 * (gr - .5) * 2 + .1 * (er - .5);
      r = lerp(r, G1[0] * gtone * (1 - .18 * oxv), ab * .88); g = lerp(g, G1[1] * gtone * (1 - .22 * oxv), ab * .88); b = lerp(b, G1[2] * gtone * (1 - .3 * oxv), ab * .88);
      // ---- paint loss (flaking) with two depths; heals as a -> 0
      const le = loss[wi] - (1 - a) * 1.1 * (S.lossK ?? 1);
      const l1 = sm(.5, .545, le), l2 = sm(.84, .88, le);
      if (l1 > 0) {
        const t2 = gtone * (.9 + .2 * (gr - .5));
        r = lerp(r, lerp(G1[0] * .96, G2[0] * t2, l2), l1); g = lerp(g, lerp(G1[1] * .96, G2[1] * t2, l2), l1); b = lerp(b, lerp(G1[2] * .96, G2[2] * t2, l2), l1);
        const fl = (er > .86 && l2 > .5) ? .75 : 1; r *= fl; g *= fl; b *= fl;   // straw flecks in the bare clay
      }
      // fresh pigment has a little body (a grain of the binder)
      const pg = .955 + .09 * gr; r *= pg; g *= pg; b *= pg;
      // ---- cracks darken
      const cd = cr * (.2 + .45 * a) * (kp < 1 ? .15 : 1); r *= 1 - cd * .75; g *= 1 - cd * .75; b *= 1 - cd * .65;
      // ---- wake front: warm pop of colour as the mural returns
      if (front > .02) { const f = front * .5 * (S.frontK ?? 1); r += f * .30; g += f * .17; b += f * .04; }
      // ---- relief normal (grit + cracks + flake steps that follow the loss threshold)
      const dl1 = smd(.5, .545, le) * 1.6, dl2 = smd(.84, .88, le) * 2.4, dl = dl1 + dl2;
      const kk = K * (kp < 1 ? .35 : 1), nx = -(bgx[wi] + lgx[wi] * dl) * kk, ny = -(bgy[wi] + lgy[wi] * dl) * kk, inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      // ---- lamp
      const dx = lamp.x - wx, dy = lamp.y - wy, Lz = lamp.z, dist = Math.sqrt(dx * dx + dy * dy + Lz * Lz);
      const nl = (nx * dx + ny * dy + Lz) * inv / dist, flat = Lz / dist;
      const diff = Math.max(0, nl) / flat;
      const q = (dx * dx + dy * dy) / (lamp.R * lamp.R), att = lamp.i / Math.pow(1 + q, lamp.fall ?? 1.9);
      const ao = 1 - cd * .6 - Math.min(.35, (l1 - l2 * .4) * .0);
      const Lr = (amb * ambCol[0] + att * diff * lampCol[0]) * ao, Lg = (amb * ambCol[1] + att * diff * lampCol[1]) * ao, Lb = (amb * ambCol[2] + att * diff * lampCol[2]) * ao;
      r *= Lr; g *= Lg; b *= Lb;
      // gentle filmic shoulder
      const GN = S.gain ?? 1.75; r = 1 - Math.exp(-r * GN); g = 1 - Math.exp(-g * GN); b = 1 - Math.exp(-b * GN);
      dst[pi] = r * 255; dst[pi + 1] = g * 255; dst[pi + 2] = b * 255; dst[pi + 3] = 255;
    }
  }
  out.putImageData(img, 0, 0);
}
