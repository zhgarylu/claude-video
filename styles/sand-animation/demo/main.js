// main.js: timeline (pictures, sweeps, gel, camera) -> window.render(t). One timeline feeds picture, score and checks (window.EV).
(async function () {
  const { Sand, Table, clamp } = SAND;
  const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 380000);
  const W = 1920, H = 1080, D2R = Math.PI / 180;
  await document.fonts.load("170px 'IM Fell English'"); await document.fonts.ready;
  const shapes = [SHAPES.mound(), SHAPES.tree(), SHAPES.bird(), SHAPES.wave(), SHAPES.lighthouse(), SHAPES.home()];
  // 72 BPM, 4/4: bar = 3.333 s, bar 1 starts at 0.4 s. Sweeps start on the downbeats of bars 3, 6, 9, 12, 15 and last two bars.
  const BAR = 240 / 72, B0 = 0.4, bar = k => B0 + (k - 1) * BAR;
  const trans = [
    { t0: bar(1), t1: bar(1) + 5.67, mode: 'pour', theta: 0, nozzle: [960, -90] },
    { t0: bar(3), t1: bar(5), mode: 'sweep', theta: 90 * D2R, bandW: 64, bulge: 80, swirl: 16, sag: 30, comb: 0.2, durF: 0.46 },
    { t0: bar(6), t1: bar(8), mode: 'sweep', theta: -20 * D2R, bandW: 58, bulge: 55, swirl: 12, sag: 18, comb: 0.2, durF: 0.4, seed: 2 },
    { t0: bar(9), t1: bar(11), mode: 'sweep', theta: 160 * D2R, bandW: 66, bulge: 80, swirl: 18, sag: 24, comb: 0.2, durF: 0.46, seed: 4 },
    { t0: bar(12), t1: bar(14), mode: 'sweep', theta: -90 * D2R, bandW: 60, bulge: 80, swirl: 16, sag: 16, comb: 0.2, durF: 0.46, seed: 6 },
    { t0: bar(15), t1: bar(17), mode: 'sweep', theta: 90 * D2R, bandW: 70, bulge: 70, swirl: 14, sag: 110, comb: 0.2, durF: 0.46, seed: 8 },
  ];
  const DUR = 58.4;
  const sand = new Sand(shapes, trans, N, 11);
  const table = new Table(document.getElementById('c'), W, H);
  for (const k in table.opt) if (Q.get(k) != null) table.opt[k] = +Q.get(k);
  const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

  // lamp gel: one at a time, a slow crossfade that starts 1 s before each sweep and ends at its close
  const GS = [['gold', 0], ['sea', trans[3].t0], ['sunset', trans[4].t0], ['gold', trans[5].t0]];
  function gel(t) {
    let k = 0; for (let i = 0; i < GS.length; i++) if (t >= GS[i][1]) k = i;
    const a = GS[k], b = GS[Math.min(k + 1, GS.length - 1)];
    if (k === GS.length - 1) return { a: a[0], b: a[0], m: 0 };
    return { a: a[0], b: b[0], m: smooth(b[1] - 1.0, b[1] + 5.67, t) };
  }

  // camera: keys [t, cx, cy, z], Catmull-Rom through them
  const CK = [[0, 960, 540, 1.0], [bar(1) + 5.67, 960, 650, 1.1], [trans[1].t0, 960, 640, 1.08], [trans[1].t1, 960, 560, 1.03], [trans[2].t0, 960, 545, 1.03],
    [trans[2].t0 + 4, 960, 540, 0.98], [trans[2].t1, 960, 540, 0.95], [trans[3].t0, 980, 540, 0.96], [trans[3].t1 - 1, 900, 560, 1.02],
    [trans[3].t1 + 1.6, 1040, 500, 1.16], [trans[4].t0 + 1, 1000, 520, 1.1], [trans[4].t1, 960, 540, 0.97], [trans[5].t0, 960, 540, 0.98],
    [trans[5].t1, 960, 590, 1.0], [DUR, 960, 600, 1.05]];
  function cam(t) {
    if (t <= CK[0][0]) return { cx: CK[0][1], cy: CK[0][2], z: CK[0][3] };
    let i = 0; while (i < CK.length - 2 && t > CK[i + 1][0]) i++;
    const p0 = CK[Math.max(0, i - 1)], p1 = CK[i], p2 = CK[i + 1], p3 = CK[Math.min(CK.length - 1, i + 2)];
    const u = clamp((t - p1[0]) / (p2[0] - p1[0])), u2 = u * u, u3 = u2 * u;
    const cr = c => {
      const L = p2[0] - p1[0], m1 = (p2[c] - p0[c]) / (p2[0] - p0[0]) * L, m2 = (p3[c] - p1[c]) / (p3[0] - p1[0]) * L;
      return (2 * u3 - 3 * u2 + 1) * p1[c] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[c] + (u3 - u2) * m2;
    };
    return { cx: cr(1), cy: cr(2), z: cr(3) };
  }

  const gelName = Q.get('gel');
  window.DUR = DUR;
  window.EV = [{ t: trans[0].t0, t1: trans[0].t1, type: 'pour' }].concat(trans.slice(1).map((T, i) => ({ t: T.t0, t1: T.t1, type: 'sweep', n: i + 1 })),
    [{ t: GS[1][1] - 1, t1: GS[1][1] + 5.67, type: 'gel', to: 'sea' }, { t: GS[2][1] - 1, t1: GS[2][1] + 5.67, type: 'gel', to: 'sunset' }, { t: GS[3][1] - 1, t1: GS[3][1] + 5.67, type: 'gel', to: 'gold' }]);
  window.BAR = { len: BAR, t0: B0 };
  window.TEXTS = t => t >= trans[5].t1 - 1.0 ? [{ id: 'home', text: 'home.', x0: 560, y0: 380, x1: 1360, y1: 640 }] : [];
  window.render = t => {
    sand.at(t);
    table.draw(sand, cam(t), gelName ? { a: gelName, b: gelName, m: 0 } : gel(t));
  };
  window.SANDDBG = { sand, table, trans };
  window.READY = true;
})();
