// "What happens when you open a web page": a live architecture diagram. render(t) draws any frame, deterministically.
import { clamp, seg, ss, eio } from '/core/lib.js';
import { C, SANS, MONO, rr, rgba, backdrop, edge, pat, plen, node, badge, zone, packet } from './arch.js';
import { DUR, EV, ev, LINES, S, E } from './timeline.js';
const W = 1920, H = 1080, cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all([document.fonts.load(`700 30px "Noto Sans SC"`, '浏览器'), document.fonts.load(`500 22px "Noto Sans SC"`, '浏览器'), document.fonts.load(`600 24px "JetBrains Mono"`, 'GET')]);
let TX = [];
const txt = (id, text, x, y, o = {}) => { const { size = 30, w = 500, col = C.text, align = 'left', font = SANS, alpha = 1 } = o; g.save(); g.globalAlpha = alpha; g.font = `${w} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(text, x, y); const m = g.measureText(text).width; g.restore(); if (alpha > .5) TX.push({ id, text, x0: align === 'center' ? x - m / 2 : x, y0: y - size, x1: align === 'center' ? x + m / 2 : x + m, y1: y + size * .25 }); };

// ---------------------------------------------------------------- the diagram: nodes, edges, zones (world coordinates)
const N = {
  browser: { x: 240, y: 560, w: 230, h: 130, label: '浏览器', tag: '你', icon: 'browser', col: C.cyan },
  dns: { x: 700, y: 300, w: 230, h: 130, label: '域名系统', tag: 'DNS', icon: 'dns', col: C.violet },
  cdn: { x: 700, y: 640, w: 230, h: 130, label: '边缘节点', tag: 'CDN', icon: 'cdn', col: C.amber },
  lb: { x: 1130, y: 560, w: 230, h: 130, label: '负载均衡', tag: '分流', icon: 'lb', col: C.cyan },
  appA: { x: 1430, y: 380, w: 230, h: 130, label: '应用服务器 A', tag: '', icon: 'server', col: C.mint },
  appB: { x: 1430, y: 760, w: 230, h: 130, label: '应用服务器 B', tag: '', icon: 'server', col: C.mint },
  cache: { x: 1745, y: 280, w: 230, h: 130, label: '缓存', tag: '内存里的快取', icon: 'cache', col: C.mint },
  db: { x: 1745, y: 810, w: 230, h: 130, label: '数据库', tag: '最终的数据', icon: 'db', col: C.coral },
};
const E_ = {                                                           // each edge runs from the first node to the second; legs may run it backwards
  bd: [[240, 495], [240, 300], [585, 300]],
  bc: [[355, 560], [470, 560], [470, 640], [585, 640]],
  cl: [[815, 640], [925, 640], [925, 560], [1015, 560]],
  la: [[1245, 540], [1300, 540], [1300, 380], [1315, 380]],
  lb2: [[1245, 580], [1300, 580], [1300, 760], [1315, 760]],
  ac: [[1545, 360], [1590, 360], [1590, 280], [1630, 280]],
  ad: [[1545, 405], [1745, 405], [1745, 745]],
};
const ZONES = [{ x: 90, y: 150, w: 300, h: 810, label: '你这边', at: 'browser' }, { x: 490, y: 150, w: 440, h: 810, label: '互联网边缘', at: 'dns' }, { x: 1010, y: 150, w: 870, h: 810, label: '机房', at: 'lb' }];
const NODE_AT = { browser: S.h1 + .3, dns: S.l2 + .1, cdn: S.l3 + .1, lb: S.l5 + .35, appA: S.l6 + .05, appB: S.l6 + .3, cache: S.l7 + .1, db: S.l8 + .1 };
// legs: a packet travelling along edges. [line, offset, duration, edge, reversed?, colour, label, kind]
const LEGS = [
  ['l2', .9, 1.2, 'bd', 0, C.cyan, 'example.com?', ''], ['l2', 2.5, 1.2, 'bd', 1, C.amber, 'IP 地址', ''],
  ['l3', .6, 1.0, 'bc', 0, C.cyan, '握手', ''], ['l3', 1.7, 1.0, 'bc', 1, C.violet, '证书', ''], ['l3', 2.8, 1.0, 'bc', 0, C.mint, '加密通道', ''],
  ['l4', .9, 1.0, 'bc', 0, C.cyan, 'GET /logo.png', ''], ['l4', 2.4, 1.0, 'bc', 1, C.mint, '直接给你', 'hit'],
  ['l5', .5, 1.0, 'bc', 0, C.cyan, 'GET /我的订单', ''], ['l5', 1.7, 1.2, 'cl', 0, C.cyan, '转发', ''],
  ['l6', .5, 1.0, 'la', 0, C.cyan, '请求 → A', ''], ['l6', 1.6, 1.0, 'lb2', 0, C.cyan, '下一个 → B', ''],
  ['l7', .5, .9, 'ac', 0, C.cyan, '有吗？', ''], ['l7', 1.6, .9, 'ac', 1, C.mint, '有！', 'hit'],
  ['l8', .3, .8, 'ac', 0, C.cyan, '有吗？', ''], ['l8', 1.1, .8, 'ac', 1, C.coral, '没有', 'miss'], ['l8', 1.9, .9, 'ad', 0, C.cyan, '查询', ''], ['l8', 2.8, .9, 'ad', 1, C.amber, '结果', ''], ['l8', 3.6, .8, 'ac', 0, C.amber, '存一份', ''],
  ['l9', .2, 1.0, 'la', 1, C.amber, '页面数据', ''], ['l9', 1.0, 1.0, 'cl', 1, C.amber, '页面数据', ''], ['l9', 1.8, 1.1, 'bc', 1, C.amber, '页面数据', ''],
].map(([line, off, dur, edgeId, rev, col, label, kind]) => { const pts = rev ? [...E_[edgeId]].reverse() : E_[edgeId]; return { t0: S[line] + off, dur, pts, id: edgeId, rev, col, label, kind }; });
const END_NODE = { bd: ['dns', 'browser'], bc: ['cdn', 'browser'], cl: ['lb', 'cdn'], la: ['appA', 'lb'], lb2: ['appB', 'lb'], ac: ['cache', 'appA'], ad: ['db', 'appA'] };
const arriveNode = L => END_NODE[L.id][L.rev ? 1 : 0];
// tags that pop up beside a node: [line, offset, duration, node, text, colour, dx, dy]
const TAGS = [['l4', 3.4, 3.4, 'cdn', '命中 HIT', C.mint, 0, -105], ['l7', 2.6, 3.0, 'cache', '命中', C.mint, 0, -100], ['l8', 1.1, 3.1, 'cache', '未命中', C.coral, 0, -100], ['l8', 4.2, 0.0, 'db', '', C.coral, 0, 0],
  ['l10', .4, 3.6, 'cdn', '拦住：静态内容', C.amber, 0, -105], ['l10', 1.2, 3.5, 'cache', '拦住：重复查询', C.mint, 0, -100], ['l10', 2.0, 3.7, 'db', '最后才到这里', C.coral, 0, -105]].filter(x => x[2] > 0);
// camera: overview, in on the machine room, back out
const CAM = [[0, 960, 540, 1], [S.l5 + 2.0, 960, 540, 1], [S.l5 + 3.3, 1470, 600, 1.18], [S.l9 + .9, 1470, 600, 1.18], [S.l9 + 2.3, 960, 540, 1]];
function cam(t) { let k = 0; while (k < CAM.length - 1 && t >= CAM[k + 1][0]) k++; if (k >= CAM.length - 1) return CAM[CAM.length - 1].slice(1); const a = CAM[k], b = CAM[k + 1], u = eio(seg(t, a[0], b[0])); return [0, 1, 2, 3].slice(1).map(i => a[i] + (b[i] - a[i]) * u); }
const STEP = { l2: ['1', '查地址 · DNS'], l3: ['2', '握手 · 加密'], l4: ['3', '边缘节点命中'], l5: ['4', '进机房 · 负载均衡'], l6: ['4', '分给一台服务器'], l7: ['5', '先问缓存'], l8: ['6', '没有 → 查数据库'], l9: ['7', '原路返回'], l10: ['', '为什么这样设计'], l11: ['', '一句话'] };

// ---------------------------------------------------------------- sound events (pushed once, up front)
for (const l of LINES) ev(S[l.id], 'voice', 1, { id: l.id });
for (const [k, tt] of Object.entries(NODE_AT)) ev(tt, 'pop', .6, { pan: (N[k].x - 960) / 1000 });
for (const L of LEGS) { ev(L.t0, 'blip', .5, { pan: (L.pts[0][0] - 960) / 1000 }); ev(L.t0 + L.dur, L.kind === 'hit' ? 'hit' : L.kind === 'miss' ? 'miss' : 'arrive', .6, { pan: (L.pts[L.pts.length - 1][0] - 960) / 1000 }); }
for (const [k, tt] of [[1, CAM[2][0]], [2, CAM[4][0]]]) ev(tt - 1.3 + (k === 1 ? 0 : -0.3), 'whoosh', .5);
for (const [line, off] of TAGS.map(x => [x[0], x[1]])) ev(S[line] + off, 'tag', .5);
ev(E.l11 - 1.2, 'resolve', .9);

// ---------------------------------------------------------------- drawing
function world(t) {
  const first = {};                                                    // first time each edge is used: it draws on just before
  for (const L of LEGS) first[L.id] = Math.min(first[L.id] ?? 1e9, L.t0);
  for (const z of ZONES) zone(g, z, z.label, seg(t, NODE_AT[z.at] - .5, NODE_AT[z.at] + .3));
  for (const [id, pts] of Object.entries(E_)) { const p = seg(t, first[id] - .3, first[id] + .5); edge(g, pts, p, { col: '#2e3d63', w: 4 }); }
  for (const L of LEGS) { const u = seg(t, L.t0, L.t0 + L.dur); if (u > 0 && u < 1) edge(g, L.pts, u, { col: L.col, w: 5, glow: .8 }); else if (u >= 1) edge(g, L.pts, 1, { col: rgba(L.col, .0), w: 1 }); }
  // node glow: while a packet is on its way in, and a decaying pulse after it arrives
  const act = {};
  for (const L of LEGS) { const n = arriveNode(L), end = L.t0 + L.dur, d = t - end; const a = d >= 0 ? Math.exp(-d / .55) : Math.max(0, (t - L.t0) / L.dur) * .35; act[n] = Math.max(act[n] || 0, a); const s = END_NODE[L.id][L.rev ? 0 : 1]; const d0 = t - L.t0; if (d0 >= 0) act[s] = Math.max(act[s] || 0, Math.exp(-d0 / .5) * .8); }
  for (const [k, n] of Object.entries(N)) node(g, n, seg(t, NODE_AT[k], NODE_AT[k] + .5), Math.max(act[k] || 0, .07 + .06 * Math.sin(t * 2.2 + n.x * .01)), t);
  for (const L of LEGS) { const u = (t - L.t0) / L.dur; if (u > 0 && u < 1) packet(g, L.pts, ss(u) * .98 + .01, { col: L.col, label: L.label }); }
  for (const [line, off, dur, nd, text, col, dx, dy] of TAGS) { const a = seg(t, S[line] + off, S[line] + off + .3) * (1 - seg(t, S[line] + off + dur - .3, S[line] + off + dur)); if (a > 0) { const m = badge(g, text, N[nd].x + dx, N[nd].y + dy, col, a, 26); if (a > .95) TX.push({ id: 'tag_' + nd + line, text, x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1, world: 1 }); } }
  // the closing arrow: near is fast, far is slow
  const ca = seg(t, S.l11 + .4, S.l11 + 1.6);
  if (ca > 0) {
    const y = 952, x0 = 150, x1 = 1780, grad = g.createLinearGradient(x0, 0, x1, 0); grad.addColorStop(0, C.mint); grad.addColorStop(.5, C.amber); grad.addColorStop(1, C.coral);
    g.save(); g.globalAlpha = ss(ca); g.lineWidth = 8; g.lineCap = 'round'; g.strokeStyle = grad; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + (x1 - x0) * ss(ca), y); g.stroke(); g.restore();
    txt('near', '近 · 快', x0, y - 22, { size: 34, w: 700, col: C.mint, alpha: ss(ca) }); txt('far', '远 · 慢', x1, y - 22, { size: 34, w: 700, col: C.coral, align: 'right', alpha: ss(ca) });
  }
}
function hud(t) {
  // title and step
  txt('title', '一次网页请求的旅程', 60, 66, { size: 36, w: 700 });
  const cur = [...LINES].reverse().find(l => t >= S[l.id] - .1), st = cur && STEP[cur.id];
  if (st) {
    const a = ss(seg(t, S[cur.id] - .1, S[cur.id] + .25));
    g.save(); g.globalAlpha = a; if (st[0]) { g.beginPath(); g.arc(78, 112, 17, 0, 6.3); g.fillStyle = C.cyan; g.fill(); g.fillStyle = C.bg; g.font = `700 24px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(st[0], 78, 113); } g.restore();
    txt('step_' + cur.id, st[1], st[0] ? 108 : 60, 121, { size: 30, w: 600, col: C.cyan, alpha: a });
  }
  // the subtitle: a dark pill at the bottom
  const l = LINES.find(l => t >= S[l.id] - .05 && t < E[l.id] + .5); if (!l) return;
  const a = ss(seg(t, S[l.id] - .05, S[l.id] + .12)) * (1 - ss(seg(t, E[l.id] + .25, E[l.id] + .5)));
  g.save(); g.globalAlpha = a; g.font = `600 46px ${SANS}`; let lines = [l.text];
  if (g.measureText(l.text).width > 1500) { const mid = l.text.length / 2; let best = Math.ceil(mid), bd = 1e9;[...l.text].forEach((ch, i) => { if ('，。！？；：'.includes(ch) && i < l.text.length - 1) { const d = Math.abs(i + 1 - mid); if (d < bd) { bd = d; best = i + 1; } } }); lines = [l.text.slice(0, best), l.text.slice(best)]; }
  const wmax = Math.max(...lines.map(s => g.measureText(s).width)), bh = lines.length * 62 + 22, by = 1052 - bh;
  rr(g, W / 2 - wmax / 2 - 36, by - 6, wmax + 72, bh, 22); g.fillStyle = 'rgba(8,12,22,.88)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(141,155,184,.35)'; g.stroke();
  g.fillStyle = C.text; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; lines.forEach((s, i) => { g.fillText(s, W / 2, by + 52 + i * 62); if (a > .9) TX.push({ id: 'sub_' + l.id + i, text: s, x0: W / 2 - g.measureText(s).width / 2, y0: by + 14 + i * 62, x1: W / 2 + g.measureText(s).width / 2, y1: by + 64 + i * 62 }); });
  g.restore();
}
function render(t) {
  TX = []; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; backdrop(g, W, H);
  g.fillStyle = 'rgba(120,170,255,.5)'; for (let i = 0; i < 34; i++) { const sp = 6 + (i * 7 % 13), x = (i * 211 % 1920 + t * sp) % 1920, y = (i * 137 % 1080 - t * sp * .6 % 1080 + 1080) % 1080; g.globalAlpha = .12 + .1 * Math.sin(t * 1.3 + i); g.beginPath(); g.arc(x, y, 1.6 + (i % 3) * .5, 0, 6.3); g.fill(); } g.globalAlpha = 1;
  const [cx, cy, s] = cam(t);
  g.save(); g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-cx, -cy); world(t); g.restore();
  hud(t);
  const f = Math.max(1 - ss(seg(t, 0, .35)), ss(seg(t, DUR - .6, DUR))); if (f > 0) { g.fillStyle = C.bg; g.globalAlpha = f; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
}
window.DUR = DUR; window.EV = EV; window.render = render;
window.TEXTS = t => { render(t); return TX; };
render(0); window.READY = true;
