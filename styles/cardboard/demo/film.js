// "The Wave Inside": render(t) draws any frame deterministically. Objects step on twos (12 drawings a second), camera and lamp stay smooth.
import * as THREE from 'three';
import { makeWorld } from './engine/world.js';
import { makeBoard, makeBend, rectPoly, makeBoardGeo } from './engine/board.js';
import { Decal, layout, drawMarker } from './engine/stroke.js';
import { makeTin, makeRule, makeKnife, makeBox, makeTape, makeTapeRoll, makeGlue, makeGlueGun, makeMarker, makeWave, scrapPoly } from './engine/props.js';
import { TH, LINER, PITCH } from './engine/tex.js';
import { hash, clamp, ss, mulberry } from '/core/lib.js';
import * as TL from './timeline.js';

const W = innerWidth, H = innerHeight;
const world = makeWorld(W, H);
const stage = document.getElementById('stage'); stage.appendChild(world.renderer.domElement);
const hud = document.createElement('canvas'); hud.id = 'hud'; hud.width = W; hud.height = H; stage.appendChild(hud);
const hx = hud.getContext('2d');
await document.fonts.load('700 40px Caveat'); await document.fonts.load('500 20px Barlow');
const caps = await fetch('caps.json').then(r => r.json()).catch(() => ({ captions: [] }));
const scene = world.scene, Vv = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = new URLSearchParams(location.search);
if (Q.get('noshadow')) world.key.castShadow = false;
if (Q.get('nofill')) world.fill.visible = false;

// ---- helpers -------------------------------------------------------------------------------------
const kf = (t, k, e = ss) => { if (t <= k[0][0]) return k[0][1]; for (let i = 0; i < k.length - 1; i++) if (t < k[i + 1][0]) { const u = e((t - k[i][0]) / (k[i + 1][0] - k[i][0])); return k[i][1] + (k[i + 1][1] - k[i][1]) * u; } return k[k.length - 1][1]; };
const lin = t => t;
const jit = (id, step, a) => (hash(id * 17.3 + step * 3.1) - .5) * 2 * a;       // handmade wobble, new every drawing
const seg = (t, a, b) => clamp((t - a) / (b - a));
const DEG = Math.PI / 180;
const fall = (t, t0, h, g = 150) => Math.max(0, h - .5 * g * Math.max(0, t - t0) ** 2);   // cm above rest for a drop starting at t0
const add = (...o) => { o.forEach(x => scene.add(x)); return o[0]; };
const show = (o, v) => { if (o.visible !== v) o.visible = v; };

// ---- S1: the cut ---------------------------------------------------------------------------------
const bA = add(makeBoard({ poly: rectPoly(-10, -5, 10, 0), flute: 'z', top: 'outer', bottom: 'pale', seed: 2 }));
const bB = add(makeBoard({ poly: rectPoly(-10, 0, 10, 5), flute: 'z', top: 'outer', bottom: 'pale', seed: 2 }));
bB.castShadow = false;
const rule = add(makeRule()); const knife = add(makeKnife());
const cutLine = new Decal({ w: 20.4, h: .6, ppc: 70, paint: (x, ppc, p) => {
  const x1 = (1 - p) * 20.4 * ppc; x.save(); x.lineCap = 'round';
  for (const [w, a] of [[.1, .35], [.055, .9]]) { x.strokeStyle = `rgba(36,20,8,${a})`; x.lineWidth = w * ppc; x.beginPath(); x.moveTo(20.4 * ppc, .3 * ppc); x.lineTo(x1, .3 * ppc + 1); x.stroke(); }
  x.restore(); } });
cutLine.mesh.position.set(0, TH + .01, 0); add(cutLine.mesh);

// ---- S2: the exploded sample ---------------------------------------------------------------------
const SS = 2.2, LT = LINER * SS;
const lBot = add(makeBoard({ poly: rectPoly(-7, -4.5, 7, 4.5), th: LT, flute: 'x', top: 'pale', bottom: 'outer', seed: 5 }));
const lTop = add(makeBoard({ poly: rectPoly(-7, -4.5, 7, 4.5), th: LT, flute: 'x', top: 'outer', bottom: 'pale', seed: 6 }));
const wave = add(makeWave({ len: 14, wid: 9, s: SS }));
const glueLines = [];
{ const gm = new THREE.MeshStandardMaterial({ color: '#f1e7c8', roughness: .35 }), n = Math.round(9 / (PITCH * SS));
  for (let i = 0; i < n; i++) for (const up of [1, 0]) { const z = -4.5 + (i + .5) * PITCH * SS + (up ? 0 : PITCH * SS / 2); if (z > 4.3) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.045 * SS, .045 * SS, 13.4, 6), gm); m.rotation.z = Math.PI / 2; m.userData = { z, up }; glueLines.push(m); scene.add(m); } }
const flagMat = (txt, seed) => new Decal({ w: 4.6, h: 1.8, ppc: 90, opaque: false, paint: (x, ppc, p) => {
  x.fillStyle = '#e6d6a8'; x.beginPath(); x.moveTo(.15 * ppc, .06 * ppc); x.lineTo(4.45 * ppc, 0); x.lineTo(4.5 * ppc, 1.75 * ppc); x.lineTo(.08 * ppc, 1.8 * ppc); x.closePath(); x.fill();
  x.fillStyle = 'rgba(120,90,50,.12)'; for (let i = 0; i < 120; i++) x.fillRect(Math.random() * 0 + ((i * 53) % 410), ((i * 29) % 160), 3, 1);
  const lay = layout(txt, seed); const px = 1.05 * ppc; return drawMarker(x, lay, p, (4.6 * ppc - lay.width * px) / 2, .38 * ppc, px, '#1d2733', .16); } });
const flags = { top: flagMat('LINER', 3), mid: flagMat('WAVE', 4), bot: flagMat('LINER', 8), gap: flagMat('GAP', 9) };
for (const f of Object.values(flags)) { f.mesh.rotation.x = 0; f.mesh.renderOrder = 4; f.mat.side = THREE.DoubleSide; f.mat.depthWrite = false; f.mat.polygonOffset = false; add(f.mesh); }
const marker = add(makeMarker()); marker.visible = false; marker.scale.setScalar(.8);
const penTo = (d, tip, vertical) => { if (!tip) { marker.visible = false; return; } d.mesh.updateMatrixWorld(); const p = d.mesh.localToWorld(Vv(tip[0] / d.ppc - d.w / 2, d.h / 2 - tip[1] / d.ppc, 0)); marker.position.copy(p); marker.rotation.set(vertical ? 1.0 : 0, 0, vertical ? -.2 : -.38); marker.visible = true; };


// ---- S3: two bridges ------------------------------------------------------------------------------
const piers = [-28, -8, 8, 28].map((x, i) => { const p = add(makeBox(6, 7, 7, i + 1)); p.position.x = x; return p; });
const pierWord = (w, seed) => new Decal({ w: 5, h: 2.6, ppc: 60, paint: (x, ppc, p) => { const lay = layout(w, seed); const px = 1.1 * ppc; return drawMarker(x, lay, p, (5 * ppc - lay.width * px) / 2, .75 * ppc, px, '#1d2733', .15); } });
const wThin = pierWord('THIN', 12), wWave = pierWord('WAVE', 13);
for (const [d, i] of [[wThin, 0], [wWave, 2]]) { d.mesh.rotation.x = 0; d.mesh.position.set(piers[i].position.x, 3.2, 3.6); d.mesh.rotation.y = [.03, 0, .02][i]; d.mesh.renderOrder = 4; add(d.mesh); }
const spanL = add(makeBend({ L: 20, W: 7, th: .1, seed: 7 })), spanR = add(makeBend({ L: 20, W: 7, th: TH, seed: 8 }));
const tins = Array.from({ length: 6 }, (_, i) => add(makeTin(2.4, 5.6, 'HEAVY'))); tins.forEach((t, i) => { t.rotation.y = -1.8 + (i % 3 - 1) * .1; });
const cub = u => (3 * u - u ** 3) / 2;
const uOf = s => Math.min(s, 1 - s) * 2;

// ---- S4: the flat-pack beam ------------------------------------------------------------------------
const BL = 34, BW = 4.4, TT = TH;
const beamAll = add(new THREE.Group());
const root = new THREE.Group(); root.position.set(0, TT, -BW / 2); beamAll.add(root);
const slotX = [[-12.4, -8.8], [-1.8, 1.8], [8.8, 12.4]];
const slots = slotX.map(([a, b]) => [[a, 2.5], [b, 2.5], [b, 3.1], [a, 3.1]]);   // slots in the lid, near its free edge
const panel = (poly, holes = [], seed = 20) => { const m = makeBoard({ poly, holes, flute: 'x', top: 'pale', bottom: 'outer', seed }); m.position.y = -TT; return m; };
const pivot = (parent, z) => { const g = new THREE.Group(); g.position.set(0, 0, z); parent.add(g); return g; };
const scoreLine = (parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(BL, .03, .16), new THREE.MeshStandardMaterial({ color: '#3b2512', roughness: 1 })); m.position.set(0, -.012, 0); parent.add(m); };
root.add(panel(rectPoly(-BL / 2, 0, BL / 2, BW), [], 21));
const pS1 = pivot(root, BW); pS1.add(panel(rectPoly(-BL / 2, 0, BL / 2, BW), [], 22)); scoreLine(pS1);
const pT = pivot(pS1, BW); pT.add(panel(rectPoly(-BL / 2, 0, BL / 2, BW), slots, 23)); scoreLine(pT);
const pS2o = pivot(root, 0); const pS2 = new THREE.Group(); pS2.rotation.y = Math.PI; pS2o.add(pS2); pS2.add(panel(rectPoly(-BL / 2, 0, BL / 2, BW), [], 24)); scoreLine(pS2);
const pF = pivot(pS2, BW - .5); pF.add(panel(rectPoly(-BL / 2, 0, BL / 2, 1.8), [], 25)); scoreLine(pF);
const pTabs = slotX.map(([a, b], i) => { const g = pivot(pF, 1.8); g.add(panel(rectPoly(a + .1, 0, b - .1, 1.25), [], 30 + i)); return g; });
const numeral = (ch, seed) => new Decal({ w: 4, h: 3.2, ppc: 50, paint: (x, ppc, p) => { const lay = layout(ch, seed); const px = 2.2 * ppc; return drawMarker(x, lay, p, (4 * ppc - lay.width * px) / 2, .5 * ppc, px, '#1d2733', .15); } });
const nums = [[pS1, '1', 31, -3], [pS2, '2', 32, 5], [pT, '3', 33, -4]].map(([pv, ch, sd, xx]) => { const d = numeral(ch, sd); d.mesh.position.set(xx, .014, BW / 2); pv.add(d.mesh); d.ch = ch; d.sd = sd; return d; });
const fz = (kind, c, seed) => { const o = BW / 2 + 0; const pts = []; const ch = .3; const Y0 = .5, YT = TT + BW + TT, Z1 = BW / 2 + TT, Z0 = -BW / 2 - TT;   // wrap path in the YZ plane, chamfered corners
  const raw = [[Y0, Z1], [YT - ch, Z1], [YT, Z1 - ch], [YT, Z0 + ch], [YT - ch, Z0], [Y0, Z0]]; for (const [y, z] of raw) pts.push([c, y, z]);
  return makeTape({ pts, wdir: [1, 0, 0], wid: 2.6, kind, seed, outFrom: new THREE.Vector3(c, (TT + BW) / 2 + 0.2, 0), lift: .02, n: 80 }); };
const bands = [-5.3, 5.3].map((c, i) => { const b = fz('pack', c, 40 + i); beamAll.add(b); b.userData.grow(0); return b; });
const glues = [14.6, -14.6].map(x => { const g = makeGlue(); g.position.set(x, TT + BW + TT + .02, 0); beamAll.add(g); return g; });
const gun = add(makeGlueGun()); gun.visible = false; gun.scale.setScalar(.45);
const gunTip = Vv(-2.3 * .45, 3.2 * .45, 0);
const piersB = []; // the same four piers move into place for the beam

// ---- set dressing ----------------------------------------------------------------------------------
const dress = [];
{ const r = mulberry(9); const spots = [[-40, 18], [-46, 6], [-38, -18], [40, 16], [46, -6], [42, -20], [-12, 26], [14, 27], [-26, -26], [24, -27]];
  spots.forEach(([x, z], i) => { const m = add(makeBoard({ poly: scrapPoly(i + 1, 3 + r() * 3), flute: i % 2 ? 'x' : 'z', seed: 50 + i })); m.position.set(x, 0, z); m.rotation.y = r() * 6; dress.push(m); });
  const roll1 = add(makeTapeRoll('pack')); roll1.position.set(-36, 0, 22); const roll2 = add(makeTapeRoll('mask')); roll2.position.set(-30, 0, 26); roll2.scale.setScalar(.9);
  const pen = add(makeMarker()); pen.rotation.set(0, 0, -Math.PI / 2 + .1); pen.rotation.y = .6; pen.position.set(34, .6, 24); pen.scale.setScalar(1);
  dress.push(roll1, roll2, pen); }
const tag = new Decal({ w: 24, h: 6.2, ppc: 40, paint: (x, ppc, p, tp) => {
  x.fillStyle = '#e6d6a8'; x.beginPath(); x.moveTo(.3 * ppc, .1 * ppc); x.lineTo(23.7 * ppc, 0); x.lineTo(23.9 * ppc, 6.1 * ppc); x.lineTo(.1 * ppc, 6.2 * ppc); x.closePath(); x.fill();
  const lay = layout('SHAPE', 21); const px = 3.7 * ppc; return drawMarker(x, lay, tp, (24 * ppc - lay.width * px) / 2, 1.2 * ppc, px, '#c2412c', .15); } });
tag.mesh.position.set(0, .04, 12.5); add(tag.mesh);

// ---- camera --------------------------------------------------------------------------------------
const sph = (look, az, el, d) => ({ look, pos: [look[0] + d * Math.cos(el * DEG) * Math.sin(az * DEG), look[1] + d * Math.sin(el * DEG), look[2] + d * Math.cos(el * DEG) * Math.cos(az * DEG)] });
function catmull(keys, t, f) {      // keys: [t, ...numbers]; returns number array
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[i + 1], d = keys[Math.min(keys.length - 1, i + 2)];
  const u = clamp((t - b[0]) / (c[0] - b[0])), u2 = u * u, u3 = u2 * u, out = [];
  for (let k = 1; k < b.length; k++) {
    const m1 = (c[k] - a[k]) * .5 * (c[0] - b[0]) / ((c[0] - a[0]) || 1) * 2 * .5, m2 = (d[k] - b[k]) * .5 * (c[0] - b[0]) / ((d[0] - b[0]) || 1) * 2 * .5;
    out.push((2 * u3 - 3 * u2 + 1) * b[k] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * c[k] + (u3 - u2) * m2);
  }
  return out;
}
function cam(t) {
  const k = catmull(TL.CAM, t), s = sph([k[0], k[1], k[2]], k[3], k[4], k[5]);
  return { pos: s.pos, look: s.look, aper: k[6], fov: 28 };
}

// ---- wipe panels (cardboard sliding across the lens) ----------------------------------------------
const wipe = new THREE.Group(); world.camera.add(wipe);
const wipeBoard = makeBoard({ poly: rectPoly(-9, -5.2, 9, 5.2), flute: 'x', top: 'outer', bottom: 'outer', seed: 11 }); wipeBoard.castShadow = false; wipeBoard.rotation.x = -Math.PI / 2; wipeBoard.position.set(0, 0, 0); wipe.add(wipeBoard);
wipe.visible = false;
function doWipe(t) {
  let on = false;
  for (const w of TL.WIPES) if (t >= w.t0 && t <= w.t1) {
    on = true; const u = (t - w.t0) / (w.t1 - w.t0), e = u < .5 ? 2 * u * u : 1 - 2 * (1 - u) ** 2;
    const dir = w.dir; wipe.position.set(dir[0] * (1 - 2 * e) * 15, dir[1] * (1 - 2 * e) * 9, -11.5); wipe.rotation.set(0, dir[0] * -.34, dir[1] * .2 + (dir[0] ? 0 : 0)); wipeBoard.position.y = 0;
  }
  show(wipe, on);
}

// ---- state per frame -----------------------------------------------------------------------------
const lamp0 = world.key.intensity;
function state(t, tq, st) {
  tins.forEach(o => show(o, false)); Object.values(flags).forEach(d => show(d.mesh, false));
  // S1
  const s1 = t < 7.2;
  [bA, bB, rule, knife, cutLine.mesh].forEach(o => show(o, s1));
  if (s1) {
    const cutP = kf(tq, [[1.0, 0], [3.3, 1]], lin);
    const kx = 9.5 - 19 * cutP + (tq > 3.3 ? -kf(tq, [[3.3, 0], [4.2, 10]]) : 0);
    const ky = TH - .05 + kf(tq, [[0.0, 2.4], [0.9, 0]]) + kf(tq, [[3.3, 0], [4.0, 4]]);
    knife.position.set(kx, ky + jit(1, st, .02), 0); knife.rotation.set(0, 0, 36 * DEG + jit(2, st, .004));
    show(knife, tq < 4.6 && !(tq > 3.3 && ky > 3.9));
    rule.position.set(0, TH + .07, -1.75 - kf(tq, [[3.3, 0], [4.1, 9]])); show(rule, tq < 4.2);
    cutLine.set(Math.round(cutP * 160), cutP); show(cutLine.mesh, tq < 3.7);
    const sl = kf(tq, [[3.6, 0], [4.6, 2.3]]); bB.position.set(jit(3, st, sl > 0 && sl < 2.3 ? .03 : 0), 0, sl); bB.rotation.y = sl * .5 * DEG;
  }
  // S2
  const s2 = t >= 6.4 && t < 15.6;
  [lBot, lTop, wave, ...glueLines].forEach(o => show(o, s2));
  if (s2) {
    const up1 = kf(tq, [[7.0, 0], [7.9, 4.6], [13.0, 4.6], [14.0, 0]]), up2 = kf(tq, [[7.3, 0], [8.1, 2.3], [13.2, 2.3], [14.1, 0]]);
    const gap = t > 13.6 ? 0 : 1;
    lBot.position.set(0, 0, 0); wave.position.set(0, LT + (TH * SS - 2 * LT) / 2 + up2, 0); lTop.position.set(0, TH * SS - LT + up1, 0);
    // settle bumps on contact
    lTop.position.y += -Math.max(0, Math.sin((tq - 14.0) * 40)) * .06 * (tq > 14 && tq < 14.4 ? 1 - (tq - 14) / .4 : 0);
    lTop.rotation.z = jit(4, st, .003) * (up1 > .1 && up1 < 4.5 ? 1 : 0); wave.rotation.z = jit(5, st, .003) * (up2 > .1 && up2 < 2.2 ? 1 : 0);
    const gl = kf(tq, [[7.9, 0], [8.4, 1], [13.0, 1], [13.5, 0]]);
    for (const g of glueLines) { const m = g.userData; g.position.set(0, wave.position.y + (m.up ? .187 : -.187) * 1 + (m.up ? .02 : -.02), m.z); g.scale.set(1, 1, 1); show(g, gl > .5); }
    // flags
    const fz = 4.55;
    flags.top.mesh.position.set(-4, lTop.position.y + 1.1, fz); flags.mid.mesh.position.set(0.2, wave.position.y + .95, fz + .2); flags.bot.mesh.position.set(4, 1.0, fz);
    const pw = (a, b) => seg(tq, a, b);
    flags.top.set('t' + Math.round(pw(8.0, 8.8) * 90), pw(8.0, 8.8)); flags.mid.set('m' + Math.round(pw(9.0, 9.8) * 90), pw(9.0, 9.8)); flags.bot.set('b' + Math.round(pw(9.9, 10.6) * 90), pw(9.9, 10.6));
    show(flags.top.mesh, tq >= 7.95 && tq < 13.9); show(flags.mid.mesh, tq >= 8.95 && tq < 13.9); show(flags.bot.mesh, tq >= 9.85 && tq < 13.9); show(flags.gap.mesh, false);
    for (const f of [flags.top, flags.mid, flags.bot]) { f.mesh.rotation.z = jit(f.last ? f.last.length : 1, st, .01) * 0; }
    const pens = [[flags.top, 8.0, 8.8], [flags.mid, 9.0, 9.8], [flags.bot, 9.9, 10.6]]; let tip = null, pd = null;
    for (const [d, a, b] of pens) if (tq > a && tq < b) { pd = d; }
    if (pd) { const idxs = pd === flags.top ? 'top' : pd === flags.mid ? 'mid' : 'bot'; const [a, b] = idxs === 'top' ? [8.0, 8.8] : idxs === 'mid' ? [9.0, 9.8] : [9.9, 10.6]; const lay = layout(idxs === 'mid' ? 'WAVE' : 'LINER', idxs === 'top' ? 3 : idxs === 'mid' ? 4 : 8); const px = 1.05 * pd.ppc; const tp = drawMarker(document.createElement('canvas').getContext('2d'), lay, seg(tq, a, b), (4.6 * pd.ppc - lay.width * px) / 2, .38 * pd.ppc, px); penTo(pd, tp, true); } else marker.visible = false;
  } else if (t >= 15.6) marker.visible = false;

  // S3
  const s3 = t >= 15 && t < 25.8;
  [...piers, spanL, spanR].forEach(o => show(o, s3 || (t >= 36.0)));
  show(wThin.mesh, s3); show(wWave.mesh, s3);
  if (s3) {
    piers.forEach((p, i) => { p.position.set([-28, -8, 8, 28][i], 3.5, 0); p.rotation.y = [.03, -.025, .02, -.035][i]; });
    const p1 = seg(tq, 16.2, 17.0), p2 = seg(tq, 21.0, 21.8);
    wThin.set('a' + Math.round(p1 * 60), p1); wWave.set('b' + Math.round(p2 * 60), p2);
    // thin card (left)
    const d = kf(tq, [[17.5, 0], [17.7, .4], [18.3, 1.4], [18.9, 2.7], [19.3, 3.6], [19.55, 6.0], [19.9, 6.3]]) + (tq > 18 && tq < 19.4 ? jit(61, st, .03) : 0);
    const k = kf(tq, [[18.7, 0], [19.45, 1]]), sx = 1 - .05 * seg(tq, 18.4, 19.5);
    spanL.userData.set(sg => -d * ((1 - k) * cub(uOf(sg)) + k * uOf(sg)), { sx }); spanL.position.set(-18, 7 + jit(62, st, 0), 0);
    // board (right)
    const d2 = kf(tq, [[21.9, 0], [22.0, .10], [22.5, .22], [23.4, .22], [23.5, .45], [24.1, .72], [25.0, .8]]);
    spanR.userData.set(sg => -d2 * cub(uOf(sg))); spanR.position.set(18, 7, 0);
    const drop = (t0, restY, h = 13, g = 220) => { const tf = t0 - Math.sqrt(2 * h / g); if (tq < tf) return null; const y = restY + Math.max(0, h - .5 * g * (tq - tf) ** 2); const b = tq > t0 ? Math.abs(Math.sin((tq - t0) * 18)) * .16 * Math.max(0, 1 - (tq - t0) / .3) : 0; return y + b; };
    // tin 1 on the thin card
    const rest1 = 7.1 - d; let y1 = drop(17.5, rest1); const tipP = seg(tq, 19.85, 20.45);
    show(tins[0], y1 !== null && t < 25.8);
    if (y1 !== null) { tins[0].position.set(-18 + 1.6 * tipP + jit(63, st, tq < 17.6 ? .02 : 0), (tipP > 0 ? 7.1 - 6.3 + 2.4 * (0.4 + .6 * ss(tipP)) : tq > 17.5 ? rest1 : y1), 0); tins[0].rotation.z = -tipP * 82 * DEG + (tq < 17.5 ? 5 * DEG : 0); }
    // tins 2 and 3 on the board
    const r2 = 7 + TH - d2 * cub(uOf(.5 - 2.5 / 20)), y2 = drop(21.9, r2), r3 = 7 + TH - d2 * cub(uOf(.5 + 2.5 / 20)), y3 = drop(23.4, r3);
    show(tins[1], y2 !== null); show(tins[2], y3 !== null);
    if (y2 !== null) { tins[1].position.set(15.5, tq > 21.9 ? r2 : y2, 0); tins[1].rotation.z = (tq < 21.9 ? 4 * DEG : 0); }
    if (y3 !== null) { tins[2].position.set(20.5, tq > 23.4 ? r3 : y3, 0); tins[2].rotation.z = (tq < 23.4 ? -4 * DEG : 0); }
  }
  // S4
  const s4 = t >= 25.5;
  show(beamAll, s4); show(gun, false);
  [...dress].forEach(o => show(o, true));
  if (s4) {
    const a = (k0, k1) => kf(tq, [[k0, 0], [k1, 1]]);
    pS1.rotation.x = -Math.PI / 2 * a(27.2, 27.9); pS2o.rotation.x = Math.PI / 2 * a(27.6, 28.3); pF.rotation.x = -Math.PI / 2 * a(28.3, 28.7); pT.rotation.x = -Math.PI / 2 * a(28.8, 29.5);
    pTabs.forEach((g, i) => g.rotation.x = Math.PI / 2 * kf(tq, [[29.7 + i * .15, 0], [29.9 + i * .15, 1]]));
    beamAll.position.set(0, 0, 0); pT.visible = !Q.get('nolid');
    // flat-pack is laid out toward +z: shift it so the folded beam ends up centred
    nums.forEach((n, i) => { const p = seg(tq, 26.3 + i * .25, 26.8 + i * .25); n.set('n' + Math.round(p * 40), p); });
    bands.forEach((b, i) => { const p = kf(tq, [[30.6 + i * .9, 0], [31.3 + i * .9, 1]], lin); b.userData.grow(p); });
    // glue
    glues.forEach((g, i) => { const t0 = 33.3 + i * 1.4; const spread = kf(tq, [[t0 + .5, 0], [t0 + .9, .46]]); const lift = kf(tq, [[t0 + 1.0, 0], [t0 + 1.9, 6]]); const th = kf(tq, [[t0 + 1.0, .16], [t0 + 1.7, .03]]); const brk = tq > t0 + 1.55; g.userData.set(spread, !brk && lift > 0 ? { h: lift, r: th } : null); });
    for (let i = 0; i < 2; i++) { const t0 = 33.3 + i * 1.4; if (tq >= t0 && tq < t0 + 2.0) { const x = [14.6, -14.6][i]; const gy = TT + BW + TT + .02 + .55 + kf(tq, [[t0, 7], [t0 + .5, 0], [t0 + 1.0, 0], [t0 + 1.9, 7]]); gun.position.set(x - gunTip.x + 0, gy - gunTip.y, 0 - gunTip.z); gun.rotation.set(0, 0, 0); show(gun, true); } }
    // piers + lift
    const slide = kf(tq, [[36.2, 1], [37.4, 0]]), px = 14 + 28 * slide;
    if (t >= 36.0) { piers[0].position.set(-px, 3.5, 0); piers[1].position.set(px, 3.5, 0); show(piers[2], false); show(piers[3], false); piers[0].scale.set(1, 1, 1); show(spanL, false); show(spanR, false); show(wThin.mesh, false); show(wWave.mesh, false); }
    const lu = seg(tq, 37.8, 39.2); beamAll.position.set(0, 7 * ss(lu) + 3 * Math.sin(Math.PI * lu), 0); if (lu > 0 && lu < 1) beamAll.rotation.set(jit(70, st, .004), jit(71, st, .006), jit(72, st, .004)); else beamAll.rotation.set(0, 0, 0);
    // tins on the beam
    const topY = 7 + TT + BW + TT;
    const bt = [[40.0, -8], [42.0, 8], [45.2, 0]];
    bt.forEach(([t0, x], i) => { const tn = tins[3 + i]; const y = ((t0, restY, h = 13, g = 220) => { const tf = t0 - Math.sqrt(2 * h / g); if (tq < tf) return null; const yy = restY + Math.max(0, h - .5 * g * (tq - tf) ** 2); return yy + (tq > t0 ? Math.abs(Math.sin((tq - t0) * 18)) * .16 * Math.max(0, 1 - (tq - t0) / .3) : 0); })(t0, topY, 12); show(tn, y !== null); if (y !== null) { tn.position.set(x, tq > t0 ? topY : y, 0); tn.rotation.z = tq < t0 ? (i % 2 ? -4 : 4) * DEG : 0; } });
    // tag
    const tl = kf(tq, [[49.3, 3], [49.55, 0]]); show(tag.mesh, tq >= 49.3); tag.mesh.position.y = .04 + tl; const tp = seg(tq, 49.9, 51.1); tag.set('g' + Math.round(tp * 60), 0, tp);
  } else { show(tag.mesh, false); }
}


// ---- captions: strips of masking tape on the lens, hand-lettered; they step on twos ---------------------
function drawCaption(c, t, st) {
  const a = Math.min(seg(t, c.t0, c.t0 + .22), 1 - seg(t, c.t1 - .2, c.t1)); if (a <= 0) return;
  hx.save(); hx.font = '700 56px Caveat, cursive'; const tw = hx.measureText(c.text).width, w = tw + 120, h = 92;
  const lift = (1 - a) * 26, x = (W - w) / 2 + jit(81, st, 1.2), y = H - 150 + lift + jit(82, st, 1.2);
  hx.globalAlpha = Math.min(1, a * 1.4); hx.translate(W / 2, y + h / 2); hx.rotate((-.5 + jit(83, st, .08)) * DEG); hx.translate(-W / 2, -(y + h / 2));
  hx.shadowColor = 'rgba(20,12,4,.35)'; hx.shadowBlur = 8; hx.shadowOffsetY = 4;
  const r = mulberry(c.text.length * 7 + 3); hx.fillStyle = '#e8d9ab'; hx.beginPath(); hx.moveTo(x, y);
  for (let i = 0; i <= 8; i++) hx.lineTo(x + w * i / 8, y + (i % 2 ? 1.5 : -1)); hx.lineTo(x + w + 4, y + 3);
  for (let j = 1; j < 8; j++) hx.lineTo(x + w + (j % 2 ? 9 : 3) + r() * 4, y + h * j / 8); hx.lineTo(x + w, y + h);
  for (let i = 8; i >= 0; i--) hx.lineTo(x + w * i / 8, y + h + (i % 2 ? 1 : -1.5)); hx.lineTo(x - 4, y + h - 3);
  for (let j = 7; j > 0; j--) hx.lineTo(x - (j % 2 ? 8 : 3) - r() * 4, y + h * j / 8); hx.closePath(); hx.fill();
  hx.shadowColor = 'transparent'; hx.fillStyle = 'rgba(150,115,60,.10)'; for (let i = 0; i < 70; i++) hx.fillRect(x + r() * w, y + r() * h, 5 + r() * 14, 1);
  hx.fillStyle = '#1d2733'; hx.textAlign = 'center'; hx.textBaseline = 'middle'; hx.fillText(c.text, W / 2, y + h / 2 + 4); hx.restore();
}
const LABELS = [['LINER', 8.0, 13.9, .1, .26, .35, .5], ['WAVE', 9.0, 13.9, .4, .5, .55, .64], ['LINER', 9.9, 13.9, .5, .6, .7, .78], ['THIN', 16.2, 25.2, .2, .3, .3, .6], ['WAVE', 21.0, 25.2, .2, .3, .3, .6], ['1', 26.3, 29.4, .3, .4, .35, .5], ['2', 26.55, 29.4, .45, .5, .4, .55], ['3', 26.8, 29.4, .55, .6, .35, .5], ['SHAPE', 49.9, 54, .38, .62, .66, .84]];
window.TEXTS = t => [
  ...caps.captions.filter(c => t >= c.t0 && t < c.t1).map(c => ({ id: c.id, text: c.text, x0: W * .18, y0: H - 150, x1: W * .82, y1: H - 58 })),
  ...LABELS.map(([tx, a, b, x0, x1, y0, y1], i) => (t >= a + .9 && t < b) ? { id: 'l' + i, text: tx, x0: W * x0, y0: H * y0, x1: W * x1, y1: H * y1 } : null).filter(Boolean)];

window.DUR = TL.DUR;
window.EV = TL.EV;

window.render = (t) => {
  t = clamp(t, 0, TL.DUR);
  const st = Math.floor(t * 12 + 1e-6), tq = st / 12;
  state(t, tq, st);
  const c = cam(t); if (Q.get('cam')) { const n = Q.get('cam').split(',').map(Number); c.pos = n.slice(0, 3); c.look = n.slice(3, 6); }
  world.cam(c); doWipe(t);
  world.key.intensity = lamp0 * (1 + .015 * Math.sin(t * 7.3));
  const mac = Math.min(seg(t, 3.4, 4.2), 1 - seg(t, 6.0, 6.6)); world.fill.intensity = .35 + 1.5 * mac; world.fill.position.set(mac > 0 ? -6 : 30, mac > 0 ? 4 : 40, mac > 0 ? 24 : 60);
  world.render();
  hx.clearRect(0, 0, W, H);
  for (const c of caps.captions) drawCaption(c, t, st);
};
window.__world = world; window.__scene = scene;
window.READY = true;
