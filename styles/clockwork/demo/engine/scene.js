// scene.js: builds every part of the chain as meshes from the machine's layout, and poses them from a machine state.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M, mesh, cyl, box, gear, escapeWheel, anchor, trough, camProfile, cupGeo, dominoMesh, plate, shapeOf, ext, walnut, canvasTex } from './parts.js';
import { ZT, PEND_L } from './machine.js';

const D2R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;

export function buildScene(world, m1, m2) {
  const { scene } = world, P = m1.P, root = new THREE.Group(); scene.add(root);
  const add = (o, parent = root) => { parent.add(o); return o; };
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const R = {};   // handles for update()

  // ================= the board, the bench, the room
  const wb = walnut([7, 1.4]);
  const board = mesh(new THREE.BoxGeometry(490, 102, 4), new THREE.MeshStandardMaterial({ ...wb, color: '#3f332c', roughness: 0.92, normalScale: new THREE.Vector2(0.6, 0.6) }), { shadow: false });
  board.position.set(205, 28, -2); add(board);
  for (const y of [78.2, -22.2]) { const rail = box(490, 1.6, 1.4, M.brassDark, 0.2); rail.position.set(205, y, 0.6); add(rail); }
  for (const x of [-38.5, 448.5]) { const rail = box(1.6, 102, 1.4, M.brassDark, 0.2); rail.position.set(x, 28, 0.6); add(rail); }
  const wb2 = walnut([14, 3]);
  const bench = mesh(new THREE.BoxGeometry(1600, 6, 340), new THREE.MeshStandardMaterial({ ...wb2, color: '#4a382c', roughness: 0.92 }), { shadow: false });
  bench.position.set(205, -25.5, 120); add(bench);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(2400, 700), new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 1 })); wall.position.set(205, 100, -130); add(wall);
  // a ruler along the bottom rail: scale you can read
  const ruler = canvasTex(4900, 64, (g, w, h) => {
    g.fillStyle = '#d9b265'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b1a0a'; g.font = '600 20px "Courier Prime"'; g.textAlign = 'center';
    for (let cm = 0; cm * 10 < w; cm++) { const x = cm * 10; const L = cm % 10 === 0 ? 26 : cm % 5 === 0 ? 18 : 10; g.fillRect(x, 0, 1.6, L); if (cm % 10 === 0 && cm > 0) g.fillText(String(cm), x, 46); }
  }, { wrap: false });
  const rul = mesh(new THREE.PlaneGeometry(490, 3.2), new THREE.MeshStandardMaterial({ map: ruler, metalness: 0.7, roughness: 0.45 }), { shadow: false }); rul.position.set(205 + 40 / 2 - 20, -19.6, 0.35); add(rul);
  rul.position.x = 205; ruler.repeat.set(1, 1);

  // ================= link 1: the escapement
  const [Wx, Wy] = P.W, [Ax, Ay] = P.A;
  const pillar = (x, y, z0, z1, r = 0.55) => { const c = cyl(r, z1 - z0, M.brassDark, 14); c.position.set(x, y, (z0 + z1) / 2); return add(c); };
  pillar(Wx, Wy, 0, 3.0, 0.8); pillar(Ax, Ay, 0, 5.4, 0.6);
  // movement plate behind the wheel (a brass bridge) so the escapement reads as a clock movement
  const bridge = mesh(ext(shapeOf([[-13, -12], [13, -12], [13, 15], [-13, 15]].map(([x, y]) => [x, y])), 0.5, 0.12), M.iron); bridge.position.set(Wx, Wy + 2, 1.0); add(bridge);
  R.wheel = at(escapeWheel(P.wheelN, P.wheelR, 0.8), Wx, Wy, 3.5); add(R.wheel);
  const pin = cyl(0.4, 1.4, M.steel, 14); pin.position.set(P.pinR * Math.cos(P.pin0), P.pinR * Math.sin(P.pin0), 1.1); R.wheel.add(pin);
  const dBig = cyl(4.1, 0.5, M.brassDark, 40); dBig.position.z = -0.9; R.wheel.add(dBig);
  R.pend = new THREE.Group(); R.pend.position.set(Ax, Ay, 0); add(R.pend);
  const anc = anchor(0.7); anc.position.z = 6.0; R.pend.add(anc);
  const rod = box(0.55, PEND_L, 0.55, M.steel, 0.15); rod.position.set(0, -PEND_L / 2, 7.2); R.pend.add(rod);
  const bobPts = [[0, -0.7], [3.2, -0.55], [3.75, 0], [3.2, 0.55], [0, 0.7]].map(([r, y]) => new THREE.Vector2(r, y));
  const bob = mesh(new THREE.LatheGeometry(bobPts, 48), M.brass); bob.rotation.x = Math.PI / 2; bob.position.set(0, -PEND_L, 7.2); R.pend.add(bob);
  const nut = cyl(0.9, 1.6, M.brassDark, 20); nut.position.set(0, -PEND_L + 3.9, 7.2); R.pend.add(nut);
  const piv = cyl(0.9, 2.6, M.steel, 20); piv.position.set(0, 0, 6.6); R.pend.add(piv);
  // lever (seesaw) the pin presses
  R.sg = new THREE.Group(); R.sg.position.set(P.Sg[0], P.Sg[1], 5.0); add(R.sg);
  const sgBar = box(P.sgL + P.sgR, 0.9, 2.6, M.brass, 0.15); sgBar.position.set((P.sgR - P.sgL) / 2, 0, 0); R.sg.add(sgBar);
  const sgCap = cyl(0.8, 3.2, M.steel, 16); R.sg.add(sgCap); pillar(P.Sg[0], P.Sg[1], 0, 3.3, 0.5);
  // release plank 1 (hinged at the right end; the rolling track continues from it)
  R.plank1 = new THREE.Group(); R.plank1.position.set(P.Pp1[0], P.Pp1[1], ZT); add(R.plank1);
  R.plank1.add(mesh(trough([[0.4, 0, 0], [-P.Lp1, 0, 0]]), M.brass));
  const hinge1 = cyl(0.7, 5.6, M.steel, 16); hinge1.position.set(0, -0.2, 0); R.plank1.add(hinge1);

  // ================= link 2: the ramp
  const rampPts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; rampPts.push([P.rampA0[0] + u * (P.rampA1[0] - P.rampA0[0]), P.rampA0[1] + u * (P.rampA1[1] - P.rampA0[1]), ZT]); }
  add(mesh(trough(rampPts), M.brass));
  for (let u = 0.12; u < 1; u += 0.22) { const x = lerp(P.rampA0[0], P.rampA1[0], u), y = lerp(P.rampA0[1], P.rampA1[1], u); const c = cyl(0.55, ZT - 1.3, M.brassDark, 12); c.position.set(x, y - 0.6, (ZT - 1.3) / 2); add(c); const f = cyl(1.2, 0.35, M.brass, 18); f.position.set(x, y - 0.6, 0.2); add(f); }
  const ball = () => { const b = mesh(new THREE.SphereGeometry(1.2, 48, 32), M.ball); b.castShadow = true; return b; };
  R.b1 = add(ball()); R.b2 = add(ball());
  // equator marks so the roll is visible
  for (const b of [R.b1, R.b2]) { const ring = mesh(new THREE.TorusGeometry(1.205, 0.045, 6, 32), M.iron, { shadow: false }); b.add(ring); const ring2 = ring.clone(); ring2.rotation.x = Math.PI / 2; b.add(ring2); }

  // ================= link 3: the tipper
  const [Px, Py] = P.Pv;
  R.beam = new THREE.Group(); R.beam.position.set(Px, Py, ZT); add(R.beam);
  R.beam.add(box(28, 1.0, 3.0, M.brass, 0.2));
  const cnt = mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 28), M.iron); cnt.rotation.x = Math.PI / 2; cnt.position.set(13.2, 0, 0); R.beam.add(cnt);
  R.cup = new THREE.Group(); add(R.cup); { const c = mesh(cupGeo(), M.brass); c.position.y = 1.5; R.cup.add(c); const h = box(0.5, 2.0, 0.5, M.steel, 0.1); h.position.y = 0.2; R.cup.add(h); }
  R.cup.scale.setScalar(1.0);
  pillar(Px, Py, 0, ZT - 0.5, 0.8);
  // stops
  // latch lever
  R.latch = new THREE.Group(); R.latch.position.set(P.Lv[0], P.Lv[1], ZT); add(R.latch);
  const lt = box(P.latchTail + P.latchHook, 0.8, 1.7, M.steel, 0.15); lt.position.set((P.latchHook - P.latchTail) / 2, 0, 0); R.latch.add(lt);
  const hook = box(1.4, 1.6, 1.7, M.brass, 0.15); hook.position.set(P.latchHook - 0.6, 1.0, 0); R.latch.add(hook);
  pillar(P.Lv[0], P.Lv[1], 0, ZT, 0.5);

  // ================= link 4: the spring motor and the gear train
  const [Dx, Dy] = P.D, [Ex, Ey] = P.E, [Fx, Fy] = P.F, mod = P.M;
  R.D = at(new THREE.Group(), Dx, Dy, 0); add(R.D);
  { const barrel = mesh(new THREE.CylinderGeometry(5.3, 5.3, 1.6, 48), M.brassDark); barrel.rotation.x = Math.PI / 2; barrel.position.z = 1.4; R.D.add(barrel);
    const face = mesh(new THREE.CircleGeometry(5.1, 64), new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.38, map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c99a48'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6b4818'; g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 6 * 2 * Math.PI; a += 0.05) { const r = 14 + a * 6.6; g.lineTo(256 + r * Math.cos(a), 256 + r * Math.sin(a)); } g.stroke(); g.fillStyle = '#e8c878'; g.beginPath(); g.arc(256, 256, 30, 0, 7); g.fill(); }, { wrap: false }) }), { shadow: false }); face.position.z = 2.24; R.D.add(face);
    const stop = cyl(0.35, 1.8, M.steel, 14); stop.position.set(4.6 * Math.cos(-80 * D2R), 4.6 * Math.sin(-80 * D2R), 2.6); R.D.add(stop);
    const p1 = gear(P.pair1[0], mod, 1.2, { mat: M.brass }); p1.position.z = 3.4; R.D.add(p1);
    const ax = cyl(0.5, 12, M.steel, 12); ax.position.z = 5.5; R.D.add(ax);
    const fly = new THREE.Group(); fly.position.z = 10.6; R.D.add(fly); fly.add(box(11, 1.6, 0.35, M.brass, 0.1)); const fh = cyl(1.0, 1.0, M.steel, 14); fly.add(fh);
    for (const sx of [-1, 1]) { const v = box(3.2, 1.6, 0.25, M.brassDark, 0.08); v.position.set(sx * 4.4, 0, 0.3); v.rotation.x = 0.6; fly.add(v); }
  }
  pillar(Dx, Dy, 0, 1.0, 0.7);
  R.E = at(new THREE.Group(), Ex, Ey, 0); add(R.E);
  { const g1 = gear(P.pair1[1], mod, 1.2, { mat: M.brass }); g1.position.z = 3.4; R.E.add(g1);
    const ax = cyl(0.55, 6.6, M.steel, 12); ax.position.z = 3.3; R.E.add(ax); }
  pillar(Ex, Ey, 0, 2.6, 0.7);
  R.P2 = {}; R.G2 = {};
  for (const [key, pair, mm] of [['a', m1.P.pair2, m1], ['b', m2.P.pair2, m2]]) {
    const gp = new THREE.Group(); gp.position.set(Ex, Ey, 0); add(gp); const pg = gear(pair[0], mod, 1.4, { mat: M.brass }); pg.position.z = 6.0; gp.add(pg); const sl = cyl(0.9, 1.6, M.steel, 14); sl.position.z = 4.7; gp.add(sl); R.P2[key] = gp;
    const gg = new THREE.Group(); gg.position.set(Fx, Fy, 0); add(gg); const gw = gear(pair[1], mod, 1.4, { mat: M.brass }); gw.position.z = 6.0; gg.add(gw); R.G2[key] = gg;
  }
  R.F = at(new THREE.Group(), Fx, Fy, 0); add(R.F);
  { const sh = cyl(0.55, 9.5, M.steel, 12); sh.position.z = 4.2; R.F.add(sh);
    const rat = new THREE.Group(); rat.position.z = 2.0; R.F.add(rat); R.ratchet = rat;   // ratchet wheel (turns with the cam shaft)
    const pts = []; const NR = P.RAT, A = 2 * Math.PI / NR; for (let k = 0; k < NR; k++) { pts.push([4.7 * Math.cos(k * A), 4.7 * Math.sin(k * A)], [5.6 * Math.cos(k * A + 0.9 * A), 5.6 * Math.sin(k * A + 0.9 * A)], [4.9 * Math.cos(k * A + 0.96 * A), 4.9 * Math.sin(k * A + 0.96 * A)]); }
    rat.add(mesh(ext(shapeOf(pts), 0.8, 0.05), M.steel));
    R.cam = new THREE.Group(); R.cam.position.z = 8.8; R.F.add(R.cam);
    const camMesh = mesh(ext(shapeOf(camProfile(5.0, 3.4)), 1.5, 0.08, 6), M.brass); R.cam.add(camMesh);
    const hubc = cyl(1.3, 1.9, M.steel, 20); R.cam.add(hubc);
    const mark = box(0.4, 1.8, 0.25, M.ebony, 0.05); mark.position.set(3.4, 0, 0.8); R.cam.add(mark);
  }
  pillar(Fx, Fy, 0, 1.2, 0.7);
  // pawl for the ratchet
  R.pawl = new THREE.Group(); R.pawl.position.set(Fx - 3.2, Fy + 6.4, 2.0); add(R.pawl);
  { const pw = box(6.4, 0.7, 1.0, M.brassDark, 0.1); pw.position.set(3.2, 0, 0); R.pawl.add(pw); const tip = box(1.0, 1.3, 1.0, M.steel, 0.1); tip.position.set(6.2, -0.6, 0); R.pawl.add(tip); pillar(Fx - 3.2, Fy + 6.4, 0, 2.2, 0.35); }
  // follower rod, guides, plank 2
  R.rod = new THREE.Group(); R.rod.position.set(Fx, 0, 8.8); add(R.rod);
  { const roller = cyl(0.8, 1.4, M.steel, 20); roller.position.set(0, Fy + P.camR + 0.8, 0); R.rod.add(roller);
    const len = P.Lp2 - 0.25 - 0.8; const r = mesh(new THREE.CylinderGeometry(0.42, 0.42, len, 14), M.steel); r.position.set(0, Fy + P.camR + 0.8 + len / 2, 0); R.rod.add(r);
    const top = box(1.6, 0.7, 2.4, M.brass, 0.1); top.position.set(0, Fy + P.camR + 0.8 + len + 0.2, 0); R.rod.add(top);
    const fork = box(0.3, 1.8, 0.3, M.steel, 0.05); fork.position.set(0, Fy + P.camR + 0.8 + 0.9, 1.1); R.rod.add(fork);
  }
  for (const gy of [Fy + P.camR + 4.5, Fy + P.camR + 11.5]) { const gd = box(3.4, 0.7, 2.6, M.brassDark, 0.1); gd.position.set(Fx - 0.0, gy, 8.8); add(gd); const gp2 = cyl(0.4, 8.0, M.brassDark, 10); gp2.position.set(Fx + 1.0, gy, 4.8); add(gp2); }
  R.plank2 = new THREE.Group(); R.plank2.position.set(P.Pp2[0], P.Pp2[1], ZT); add(R.plank2);
  R.plank2.add(mesh(trough([[0.4, 0, 0], [-P.Lp2, 0, 0]]), M.brass));
  { const h = cyl(0.7, 5.6, M.steel, 16); h.position.set(0, -0.2, 0); R.plank2.add(h); }
  pillar(P.Pp2[0], P.Pp2[1] - 1.0, 0, ZT - 0.5, 0.6);

  // ================= link 6: connector + the corkscrew + the level run
  add(mesh(trough(P.path2.map(p => p.slice())), M.brass));
  { const hx = P.helix; const topY = P.path2[2][1] + 2, botY = P.domY - 0.3;
    const pole = mesh(new THREE.CylinderGeometry(0.9, 0.9, topY - botY, 24), M.steel); pole.position.set(hx.xs, (topY + botY) / 2, hx.zs); add(pole);
    const cap = mesh(new THREE.SphereGeometry(1.4, 24, 16), M.brass); cap.position.set(hx.xs, topY + 0.8, hx.zs); add(cap);
    const foot = box(7, 1.2, 7, M.brassDark, 0.3); foot.position.set(hx.xs, botY - 0.6, hx.zs); add(foot);
    // a brass arm from the board to the foot
    const arm = mesh(new THREE.CylinderGeometry(0.6, 0.6, hx.zs, 12), M.brassDark); arm.rotation.x = Math.PI / 2; arm.position.set(hx.xs, botY - 0.6, hx.zs / 2); add(arm);
    // spokes from pole to track
    const hp = P.helixPts; for (let i = 20; i < hp.length; i += 30) { const p = hp[i]; const a = new THREE.Vector3(hx.xs, p[1] - 0.9, hx.zs), b = new THREE.Vector3(p[0], p[1] - 0.9, p[2]); const L = a.distanceTo(b); const s = mesh(new THREE.CylinderGeometry(0.32, 0.32, L, 8), M.brassDark); s.position.copy(a.clone().add(b).multiplyScalar(0.5)); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); add(s); }
    // supports for the connector
    for (const u of [0.35, 0.85]) { const p = [lerp(P.conn0[0], P.conn1[0], u), lerp(P.conn0[1], P.conn1[1], u)]; const c = cyl(0.5, ZT - 1.3, M.brassDark, 12); c.position.set(p[0], p[1] - 0.6, (ZT - 1.3) / 2); add(c); }
  }

  // ================= link 7: the shelf and the dominoes
  { const x0 = P.xDom0 - 6, x1 = P.xDom0 + 118, len = x1 - x0; const wb3 = walnut([5, 1]);
    const shelf = mesh(new THREE.BoxGeometry(len, 2.0, 46), new THREE.MeshStandardMaterial({ ...wb3, color: '#7a604c', roughness: 0.92 })); shelf.position.set((x0 + x1) / 2, P.domY - 1.0, 23); add(shelf);
    const lip = box(len, 0.9, 0.9, M.brassDark, 0.15); lip.position.set((x0 + x1) / 2, P.domY - 0.45, 46.3); add(lip);
    for (const bx of [x0 + 8, (x0 + x1) / 2, x1 - 8]) { const br = mesh(ext(shapeOf([[0, 0], [0, -12], [18, 0]]), 1.2, 0.1), M.brassDark); br.position.set(bx, P.domY - 2.0, 0.6); br.rotation.y = -Math.PI / 2; br.position.z = 0.6; /* bracket triangle in yz plane */ const t = new THREE.Group(); t.position.set(bx, P.domY - 2.0, 0); const tri = mesh(ext(shapeOf([[0, 0], [20, 0], [0, -14]]), 1.0, 0.1), M.brassDark); tri.rotation.y = -Math.PI / 2; tri.position.set(0, 0, 0); t.add(tri); add(t); }
  }
  R.dom = P.domPos.map((d, i) => {
    const og = new THREE.Group(); og.position.set(d.x, P.domY, d.z); og.rotation.y = -d.yaw; add(og);
    const ig = new THREE.Group(); og.add(ig); ig.add(dominoMesh(P.dom.H, P.dom.T, P.dom.W)); return ig;
  });

  // ================= link 8: hammer and bell (a hanging brass gong)
  { const last = P.domPos[P.domPos.length - 1]; const hx = last.x + 8.5, hz = last.z, hy = P.domY + 2.2;
    R.hammer = new THREE.Group(); R.hammer.position.set(hx, hy, hz); add(R.hammer);
    const lv = box(15, 0.9, 1.4, M.steel, 0.15); lv.position.set(3.0, 0, 0); R.hammer.add(lv);
    const tab = box(1.2, 3.2, 1.6, M.brass, 0.12); tab.position.set(-4.0, 1.4, 0); R.hammer.add(tab);
    const head = mesh(new THREE.SphereGeometry(1.15, 24, 16), M.brass); head.position.set(10.0, 0.6, 0); R.hammer.add(head);
    pillar(hx, hy, 0, hz - 0.5, 0.5); const pv = cyl(0.8, 3.0, M.steel, 16); pv.position.set(hx, hy, hz); add(pv);
    P.hammerGeo = { hx, hy, hz, headX: hx + 10, gongX: hx + 10 };
    // gong
    R.gong = new THREE.Group(); R.gong.position.set(hx + 10, hy + 15.5, hz); add(R.gong);
    const gongPts = [[0, 0.6], [1.6, 0.6], [2.0, 0.15], [6.6, 0.0], [7.0, 0.35], [7.0, -0.3], [6.5, -0.2], [2.0, -0.4], [0, -0.3]].map(([r, y]) => new THREE.Vector2(r, y));
    const gm = mesh(new THREE.LatheGeometry(gongPts, 56), M.brass); gm.rotation.x = Math.PI / 2; gm.position.y = -8.4; R.gong.add(gm);
    R.gongPivot = new THREE.Group(); R.gong.add(R.gongPivot);
    const bar = box(14.5, 0.9, 1.0, M.brassDark, 0.15); bar.position.set(0, 1.4, 0); R.gong.add(bar);
    for (const sx of [-5.5, 5.5]) { const cord = cyl(0.12, 9.6, M.felt, 6); cord.rotation.x = 0; cord.rotation.z = 0; const cc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8.8, 6), M.felt); cc.position.set(sx * 0.62, -3.0, 0); R.gong.add(cc); }
    const post1 = mesh(new THREE.CylinderGeometry(0.7, 0.7, 26, 16), M.brassDark); post1.position.set(hx + 10 - 8, hy + 10.5, hz - 0.0); add(post1); post1.position.z = hz - 3.0;
    const post2 = post1.clone(); post2.position.x = hx + 10 + 8; add(post2);
    const topbar = box(18, 1.0, 1.0, M.brassDark, 0.15); topbar.position.set(hx + 10, hy + 23.4, hz - 3.0); add(topbar);
    R.gong.position.z = hz - 3.0; R.gong.position.y = hy + 22.5;
    // the cords hang from the topbar; the gong disc hangs 8.6 below the pivot
  }

  // ================= number plates under each link
  const plates = [[1, 'ESCAPEMENT', Wx + 10], [2, 'RAMP', 100], [3, 'TIPPER', Px], [4, 'GEAR TRAIN', Dx + 10], [5, 'CAM', Fx + 12], [6, 'CORKSCREW', P.helix.xs], [7, 'DOMINOES', P.xDom0 + 45], [8, 'BELL', P.hammerGeo.gongX]];
  R.plates = plates.map(([n, name, x]) => { const pl = plate(17, 4.2, [{ text: String(n), font: '700 118px "Courier Prime"' }, { text: name, font: '700 62px "Courier Prime"' }]); pl.position.set(x, n === 7 || n === 8 ? -13.5 : -17.5, 0.5); add(pl); return pl; });
  R.plates.forEach((pl, i) => { if (i >= 5) pl.position.y = i === 5 ? -17.5 : -13.5; });

  // ================= the state -> poses
  R.pose = (S, S2, swap = 0) => {
    R.wheel.rotation.z = S.wheel;
    R.pend.rotation.z = S.pend;
    R.sg.rotation.z = S.sg;
    R.plank1.rotation.z = -S.tilt1;
    R.b1.position.set(S.b1.x, S.b1.y, ZT); R.b1.rotation.z = S.b1.roll;
    R.beam.rotation.z = -S.beam;
    R.cup.position.set(P.Pv[0] - P.beamR * Math.cos(S.beam), P.Pv[1] + P.beamR * Math.sin(S.beam), ZT);
    R.latch.rotation.z = -S.latch;
    R.D.rotation.z = S.D; R.E.rotation.z = S.E;
    R.F.rotation.z = S.G2; R.cam.rotation.z = S.cam - S.G2;
    // swap animation: swap 0 = pair a seated, 0..1 = a lifts out, then b drops in
    const useB = swap >= 0.5, lift = swap < 0.5 ? swap * 2 : (1 - swap) * 2;
    for (const key of ['a', 'b']) {
      const on = (key === 'b') === useB, ss = S2 && key === 'b' ? S2 : S;
      for (const g of [R.P2[key], R.G2[key]]) {
        g.visible = on || (swap > 0 && swap < 1 && false);
        const z = 50 * lift * lift * (3 - 2 * lift), y = 22 * lift * lift * (3 - 2 * lift);
        g.position.z = z; g.position.y = (g === R.P2[key] ? P.E[1] : P.F[1]) + y;
      }
      R.P2[key].rotation.z = ss.P2; R.G2[key].rotation.z = ss.G2;
    }
    // the ratchet wheel & pawl
    const tooth = 2 * Math.PI / P.RAT; const u = (((-S.ratchet) / tooth) % 1 + 1) % 1;
    R.pawl.rotation.z = -0.05 + 0.10 * (1 - u) * 0 + 0.07 * u;
    R.rod.position.y = S.rod; R.plank2.rotation.z = -S.tilt2;
    R.b2.position.set(S.b2.x, S.b2.y, S.b2.z); R.b2.rotation.z = S.b2.roll;
    for (let i = 0; i < R.dom.length; i++) R.dom[i].rotation.z = -S.dom[i];
    R.hammer.rotation.z = S.hammer * 26 * D2R;
    R.gong.rotation.z = S.bell;
  };
  return R;
}
