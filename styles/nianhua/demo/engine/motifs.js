// motifs.js: reusable auspicious motifs drawn through a Printer: coin, bat, cloud, lotus, peony, carp.
// All of them are original drawings; every one is a few flat shapes plus carved lines.
export function motifs(P) {
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const M = {};

  M.dot = (x, y, r) => P.fill('yellow', () => P.ell(x, y, r, r, 0, 8), { line: false, edge: 4 });

  // coin: round disc, square hole (even-odd ring), a short tassel
  M.coin = (x, y, r, col = 'yellow') => {
    P.fill(col, (c) => { P.ell(x, y, r, r, 0, 18); const s = r * .36; c.moveTo(x - s, y - s); c.lineTo(x - s, y + s); c.lineTo(x + s, y + s); c.lineTo(x + s, y - s); c.closePath(); }, { rule: 'evenodd', w: 6 });
    P.line((c) => { P.ell(x, y, r * .78, r * .78, 0, 18); }, 3);
  };

  // auspicious cloud: three puffs and a curl
  M.cloud = (x, y, s, col = 'indigo') => {
    const f = s < 0 ? -1 : 1, k = Math.abs(s);
    const E = (dx, dy, rx, ry) => P.fill(col, () => P.ell(x + dx * f * k, y + dy * k, rx * k, ry * k, 0, 16), { w: 6 });
    E(0, 0, 50, 36); E(-52, 16, 34, 26); E(54, 18, 38, 28);
    P.line((c) => { c.moveTo(x + 24 * f * k, y + 20 * k); c.quadraticCurveTo(x + 40 * f * k, y + 4 * k, x + 28 * f * k, y - 8 * k); c.quadraticCurveTo(x + 18 * f * k, y + 2 * k, x + 28 * f * k, y + 10 * k); }, 4);
    P.fill(col, (c) => { P.curve([[x - 90 * f * k, y + 40 * k], [x - 120 * f * k, y + 38 * k], [x - 138 * f * k, y + 22 * k], [x - 126 * f * k, y + 12 * k], [x - 108 * f * k, y + 22 * k], [x - 84 * f * k, y + 30 * k]], true); }, { w: 5 });
  };

  // bat (fu): spread wings with scalloped hems, a yellow body
  M.bat = (x, y, s, col = 'red') => {
    const f = s < 0 ? -1 : 1, k = Math.abs(s), X = (u) => x + u * f * k, Y = (v) => y + v * k;
    const half = [[0, -18], [34, -54], [88, -74], [132, -42], [108, -6], [98, 26], [80, 4], [66, 36], [48, 8], [30, 38], [12, 12]];
    const pts = half.map(([u, v]) => [X(u), Y(v)]).concat(half.slice().reverse().map(([u, v]) => [X(-u), Y(v)]));
    P.fill(col, () => P.poly(pts, true), { w: 6, edge: 7 });
    P.line((c) => { for (const sg of [1, -1]) { c.moveTo(X(10 * sg), Y(-6)); c.lineTo(X(76 * sg), Y(-34)); c.moveTo(X(10 * sg), Y(-2)); c.lineTo(X(92 * sg), Y(8)); c.moveTo(X(10 * sg), Y(4)); c.lineTo(X(60 * sg), Y(22)); } }, 3);
    P.fill('yellow', () => P.ell(X(0), Y(6), 14 * k, 26 * k, 0, 12), { over: true, w: 5 });
    P.fill('yellow', () => P.ell(X(0), Y(-24), 14 * k, 13 * k, 0, 10), { over: true, w: 5 });
    P.ink(() => { P.ell(X(-5), Y(-26), 2.6 * k, 2.6 * k, 0, 6); P.ell(X(5), Y(-26), 2.6 * k, 2.6 * k, 0, 6); });
    P.fill(col, () => P.poly([[X(-12), Y(-34)], [X(-16), Y(-52)], [X(-3), Y(-38)]], true), { over: true, w: 4 });
    P.fill(col, () => P.poly([[X(12), Y(-34)], [X(16), Y(-52)], [X(3), Y(-38)]], true), { over: true, w: 4 });
  };

  // lotus flower with its base at (x, y)
  M.lotus = (x, y, s = 1) => {
    const petal = (a, len, wid, col, o = {}) => {
      const pts = [[0, 0], [-wid, -len * .42], [-wid * .45, -len * .86], [0, -len], [wid * .45, -len * .86], [wid, -len * .42]].map(([u, v]) => { const [p, q] = rot(u * s, v * s, a); return [x + p, y + q]; });
      P.fill(col, () => P.curve(pts, true), { w: 6, ...o });
    };
    petal(-1.15, 96, 30, 'peach'); petal(1.15, 96, 30, 'peach');
    petal(-.62, 118, 32, 'peach'); petal(.62, 118, 32, 'peach');
    petal(0, 134, 34, 'peach');
    // vermilion tips over the peach
    for (const a of [-1.15, -.62, 0, .62, 1.15]) {
      const len = a === 0 ? 134 : Math.abs(a) > 1 ? 96 : 118, wid = 14;
      const pts = [[-wid, -len * .78], [0, -len * 1.0], [wid, -len * .78], [0, -len * .66]].map(([u, v]) => { const [p, q] = rot(u * s, v * s, a); return [x + p, y + q]; });
      P.fill('red', () => P.curve(pts, true), { over: true, line: false });
    }
    P.line((c) => { for (const a of [-.62, 0, .62]) { const [p, q] = rot(0, -20 * s, a), [p2, q2] = rot(0, -104 * s, a); c.moveTo(x + p, y + q); c.lineTo(x + p2, y + q2); } }, 3);
    // seed pod / stamens
    P.fill('yellow', () => P.ell(x, y + 6 * s, 30 * s, 14 * s, 0, 12), { over: true, w: 5 });
  };

  // peony: leaves, big red petals, a peach heart, a yellow centre
  M.peony = (x, y, s = 1) => {
    const f = s < 0 ? -1 : 1, k = Math.abs(s);
    P.fill('green', () => P.ell(x - 52 * f * k, y + 22 * k, 40 * k, 16 * k, -.3 * f, 12), { w: 5 });
    P.fill('green', () => P.ell(x + 54 * f * k, y + 24 * k, 40 * k, 16 * k, .3 * f, 12), { w: 5 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + .3; P.fill('red', () => P.ell(x + Math.cos(a) * 26 * k, y + Math.sin(a) * 24 * k, 26 * k, 22 * k, a, 12), { w: 5, edge: 7 }); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + .9; P.fill('peach', () => P.ell(x + Math.cos(a) * 12 * k, y + Math.sin(a) * 11 * k, 17 * k, 14 * k, a, 10), { over: true, w: 4 }); }
    P.fill('yellow', () => P.ell(x, y, 9 * k, 9 * k, 0, 8), { over: true, w: 4 });
  };

  // carp held upright, head at the top. (hx, hy) = top of the head.
  M.carp = (hx, hy) => {
    const X = u => hx + u, Y = v => hy + v;
    const half = (v) => { const T = [[40, 52], [110, 66], [190, 80], [270, 66], [345, 34]]; if (v <= 40) return 44 + v * .2; for (let i = 0; i < T.length - 1; i++) if (v <= T[i + 1][0]) { const t = (v - T[i][0]) / (T[i + 1][0] - T[i][0]); return T[i][1] + (T[i + 1][1] - T[i][1]) * t; } return 30; };
    // tail first
    P.fill('yellow', () => P.curve([[X(34), Y(342)], [X(92), Y(416)], [X(70), Y(476)], [X(24), Y(436)], [X(-8), Y(488)], [X(-44), Y(440)], [X(-76), Y(462)], [X(-48), Y(386)], [X(-28), Y(338)]], true), { w: 6, edge: 8 });
    P.line((c) => { for (const [a, b] of [[-30, 356, -60, 450], [-8, 356, -10, 470], [12, 356, 20, 440], [28, 356, 62, 440]]) { } c.moveTo(X(-20), Y(350)); c.lineTo(X(-52), Y(440)); c.moveTo(X(0), Y(354)); c.lineTo(X(-6), Y(464)); c.moveTo(X(16), Y(354)); c.lineTo(X(24), Y(430)); c.moveTo(X(30), Y(350)); c.lineTo(X(64), Y(420)); }, 3.5);
    // body outline
    const R = [], L = [];
    for (let v = 0; v <= 345; v += 35) { const w = half(Math.max(v, 40)) * (v < 40 ? .5 + v / 80 : 1); const sway = Math.sin(v / 345 * 3.0) * 14 + v * .035; R.push([X(sway + w), Y(v + 4)]); L.push([X(sway - w * .94), Y(v + 4)]); }
    const body = [[X(0), Y(-8)]].concat(R.slice(1), L.slice(1).reverse());
    P.fill('red', () => P.curve(body, true), { w: 7, edge: 11 });
    // belly crescent (yellow, knocks the red out)
    const bel = [], bin = [];
    for (let v = 60; v <= 335; v += 55) { const sway = Math.sin(v / 345 * 3.0) * 14 + v * .035, w = half(v); bel.push([X(sway - w * .9), Y(v)]); bin.push([X(sway - w * .42), Y(v)]); }
    P.fill('yellow', () => P.curve(bel.concat(bin.slice().reverse()), true), { w: 4, edge: 7 });
    // scales
    P.line((c) => {
      for (let v = 100, r = 0; v < 330; v += 30, r++) {
        const sway = Math.sin(v / 345 * 3.0) * 14 + v * .035, w = half(v);
        for (let u = -w * .42 + (r % 2) * 14; u < w * .78; u += 28) { c.moveTo(X(sway + u - 12), Y(v)); c.quadraticCurveTo(X(sway + u), Y(v + 20), X(sway + u + 12), Y(v)); }
      }
    }, 3.2);
    // gill, eye, mouth, barbels
    P.line((c) => { c.moveTo(X(-46), Y(94)); c.quadraticCurveTo(X(10), Y(124), X(66), Y(92)); }, 5);
    P.fill('yellow', () => P.ell(X(16), Y(54), 15, 15, 0, 10), { over: true, w: 5 }); P.ink(() => P.ell(X(18), Y(54), 7, 7, 0, 8));
    P.fill('red', () => P.curve([[X(-16), Y(2)], [X(0), Y(-6)], [X(16), Y(2)], [X(10), Y(14)], [X(-10), Y(14)]], true), { over: true, w: 5 });
    P.line((c) => { c.moveTo(X(18), Y(6)); c.bezierCurveTo(X(50), Y(-10), X(84), Y(20), X(96), Y(-6)); c.moveTo(X(-18), Y(6)); c.bezierCurveTo(X(-50), Y(-12), X(-84), Y(16), X(-98), Y(-10)); }, 4);
    // dorsal fin (right) and pectoral fin (left)
    P.fill('green', () => P.curve([[X(60), Y(132)], [X(112), Y(120)], [X(124), Y(190)], [X(106), Y(250)], [X(70), Y(262)]], true), { w: 5, edge: 8 });
    P.line((c) => { c.moveTo(X(70), Y(150)); c.lineTo(X(114), Y(150)); c.moveTo(X(72), Y(190)); c.lineTo(X(118), Y(196)); c.moveTo(X(72), Y(230)); c.lineTo(X(104), Y(240)); }, 3);
    P.fill('green', () => P.curve([[X(-56), Y(150)], [X(-100), Y(176)], [X(-96), Y(226)], [X(-56), Y(210)]], true), { w: 5, edge: 8 });
  };
  return M;
}
