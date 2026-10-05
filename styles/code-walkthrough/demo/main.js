// "Code Walkthrough": a programming explainer drawn in code. render(t) is a pure function of the time t.
// The code on screen is search.py, run by verify.py with the real interpreter; every output line and every variable value comes from verified.js.
import { clamp, lerp, seg, ss, eio, mulberry } from '/core/lib.js';
import { tokenize } from './tok.js';
import { V } from './verified.js';
import * as S from './script.js';
import { EV, ev } from './timeline.js';
const W = 1920, H = 1080, cv = document.getElementById('c'), g = cv.getContext('2d');
const MONO = '"JetBrains Mono", ui-monospace, monospace', UI = 'Inter, system-ui, sans-serif';
const FS = 24, LH = 36, CW = FS * 0.6, GUT = 80;
await Promise.all([`500 ${FS}px "JetBrains Mono"`, `700 40px "JetBrains Mono"`, '600 22px Inter', '700 15px Inter', '500 18px Inter', '700 34px Inter'].map(f => document.fonts.load(f)));
await document.fonts.ready;

// ---------------------------------------------------------------- themes: the style's two invariant palettes
const DARK = { bg1: '#0a0d13', bg2: '#131925', panel: '#161b26', panel2: '#1b2231', line: '#2b3447', ink: '#e4e8ef', dim: '#7e89a0', gut: '#4c576d',
  kw: '#c792ff', fn: '#6cb6ff', call: '#6cb6ff', bi: '#4fd6c4', num: '#ff9e64', str: '#e6cf8b', com: '#6e7a92', op: '#93a4c4', id: '#e4e8ef',
  add: '#3ddc84', rem: '#ff5d73', focus: '#ffcc4d', info: '#5aa9ff', lo: '#5aa9ff', hi: '#f58ad8', mid: '#4fd6c4', cell: '#1d2535', shadow: 'rgba(0,0,0,.5)', cap: 'rgba(8,10,15,.78)', dark: true };
const LIGHT = { bg1: '#e6e9f0', bg2: '#f4f5f9', panel: '#ffffff', panel2: '#eff2f8', line: '#d3d9e6', ink: '#1c2230', dim: '#667087', gut: '#a4acbd',
  kw: '#7c3aed', fn: '#0b5fd1', call: '#0b5fd1', bi: '#007f74', num: '#c2410c', str: '#8a6300', com: '#8791a5', op: '#55638a', id: '#1c2230',
  add: '#10a04e', rem: '#d92d4a', focus: '#e8a000', info: '#1d6fe0', lo: '#1d6fe0', hi: '#c0309a', mid: '#00857a', cell: '#eef1f7', shadow: 'rgba(30,40,70,.2)', cap: 'rgba(255,255,255,.88)', dark: false };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
let kindColorOverride = null;
const kindColor = (th, k) => (k === 'x' && kindColorOverride) ? kindColorOverride : ({ info: th.info, bad: th.rem, good: th.add, focus: th.focus, dim: th.dim }[k] || th.info);

// ---------------------------------------------------------------- typing schedule: keystroke times for the buggy file
const SRCB = S.SRC.buggy, NLINES = SRCB.length;
const TYPE = (() => {
  const r = mulberry(7), times = [], keys = []; let t = 0.45;
  for (let i = 0; i < NLINES; i++) {
    const line = SRCB[i], ind = line.length - line.trimStart().length, tt = new Array(line.length); const fast = i >= 13;
    if (i === 2 || i === 4 || i === 13) t += .22 + r() * .06;                 // a beat of thought before the loop, the test, the driver
    for (let c = 0; c < ind; c++) tt[c] = t;                                // auto-indent arrives with the new line
    for (let c = ind; c < line.length; c++) {
      t += (fast ? .011 + r() * .007 : .014 + r() * .010) + (',(:.=['.includes(line[c - 1] || '') ? .022 : 0) + (line[c] === ' ' ? .002 : 0);
      tt[c] = t; keys.push({ t, ch: line[c] });
    }
    if (i < NLINES - 1) { t += .05; keys.push({ t, ch: '\n' }); t += .05 + r() * .04 + (line.trim() === '' ? -.04 : 0); }
    times.push(tt);
  }
  return { times, end: t, keys };
})();
for (const k of TYPE.keys) ev(k.t, k.ch === '\n' ? 'enter' : k.ch === ' ' ? 'space' : 'key', .7 + ((k.t * 997) % 1) * .3);
const typedCount = (i, t) => { const a = TYPE.times[i]; let n = 0; while (n < a.length && a[n] <= t) n++; return n; };
const lastKeyT = t => { let b = -9; for (const k of TYPE.keys) { if (k.t <= t) b = k.t; else break; } return b; };
window.TYPE_END = TYPE.end; ev(TYPE.end, 'typeend', 0);

// ---------------------------------------------------------------- events from the score sheet (the mixer reads these)
S.FOCUS.forEach((k, i) => { if (i && !k.none) ev(k.t, 'focus', .8); });
S.STATE.forEach(k => { if ('lo' in k || 'hi' in k || 'mid' in k) ev(k.t, 'ptr', .8, { f: 'lo' in k ? 'lo' : 'hi' in k ? 'hi' : 'mid' }); if ('im' in k) ev(k.t + .1, 'val', .6); });
S.CHIPS.forEach(c => ev(c.t0, 'chip', .8, { kind: c.kind }));
for (let i = 0; i < 7; i++) ev(19.6 + i * .09, 'cell', .6, { i });
ev(S.T.swap, 'swap', .9); ev(S.T.split, 'swap', .7); ev(S.T.zoomA, 'zoom', .9); ev(S.T.zoomAend, 'zoom', .6); ev(S.T.zoomB, 'zoom', .6); ev(50.0, 'zoom', .5);
ev(S.T.run + 1.02, 'enter', 1); ev(S.T.out1, 'run', .9); ev(S.T.thud, 'thud', 1); ev(44.3, 'thud', .45);
ev(S.T.diff, 'diffin', .9); ev(S.T.fold, 'fold', .9);
ev(S.T.run2 + 1.0, 'enter', 1); ev(S.T.out2, 'run', .9); ev(52.7, 'ding', 1, { n: 0 }); ev(53.9, 'ding', 1, { n: 1 }); ev(55.5, 'blip', .7);
ev(S.T.flip, 'flip', 1); ev(59.3, 'row', .7); ev(59.9, 'row', .7); ev(60.8, 'row', .7); ev(61.8, 'chime', .9);
const CMD = 'python search.py', typeCmd = (t0, t) => Math.min(CMD.length, Math.max(0, Math.floor((t - t0) / .052)));
for (const t0 of [S.T.run, S.T.run2]) for (let i = 0; i < CMD.length; i++) ev(t0 + i * .052, 'key', .6);

// ---------------------------------------------------------------- geometry: one function from time to every pane rectangle
function layout(t) {
  const p = ss(seg(t, S.T.swap, S.T.swapEnd)), q = ss(seg(t, S.T.swap + .12, S.T.swapEnd + .25));
  return {
    E: { x: lerp(530, 50, p), y: 48, w: 860, h: 660 }, TM: { x: lerp(530, 50, p), y: 736, w: lerp(860, 1820, p), h: 232 },
    DG: { x: 950, y: 48, w: 920, h: 400, a: p, dx: (1 - p) * 120 }, WT: { x: 950, y: 468, w: 920, h: 240, a: q, dx: (1 - q) * 120 }, p,
  };
}
const FIN = layout(99), CODE_TOP = FIN.E.y + 44 + 10;
const codeX = L => L.E.x + GUT;
// rows: the editor's lines at time t. Line 3 becomes two rows while the diff plays (old folds out, new folds in).
function rows(t) {
  const grow = ss(seg(t, S.T.diff, S.T.diff + .6)), fold = ss(seg(t, S.T.fold, S.T.fold + .7)), R = [];
  for (let i = 0; i < NLINES; i++) {
    if (i === 2) {
      const hOld = t < S.T.diff ? 1 : 1 - fold, hNew = grow;
      R.push({ doc: 3, text: S.SRC.buggy[2], h: hOld, kind: t >= S.T.diff ? 'old' : 'n', mode: 'buggy' });
      if (hNew > 0.001) R.push({ doc: 3, text: S.SRC.fixed[2], h: hNew, kind: 'new', mode: 'fixed' });
    } else R.push({ doc: i + 1, text: SRCB[i], h: 1, kind: 'n' });
  }
  let y = CODE_TOP; for (const r of R) { r.y = y; y += r.h * LH; } return R;
}
const lineBox = (R, a, b) => { const rs = R.filter(r => r.doc >= a && r.doc <= b); return { y0: rs[0].y, y1: rs[rs.length - 1].y + rs[rs.length - 1].h * LH }; };
const lineMid = (R, n) => { const r = R.filter(x => x.doc === n).pop(); return r.y + r.h * LH / 2; };

// ---------------------------------------------------------------- focus system
function focusAt(t, R) {
  let k = 0; S.FOCUS.forEach((f, i) => { if (t >= f.t) k = i; });
  const c = S.FOCUS[k], p = k ? S.FOCUS[k - 1] : c, a = k ? ss(seg(t, c.t, c.t + .38)) : 1;
  const box = f => f.none ? null : lineBox(R, f.a, f.b);
  const bp = box(p), bc = box(c); let bar = null, barA = 0;
  if (bp && bc) { bar = { y0: lerp(bp.y0, bc.y0, a), y1: lerp(bp.y1, bc.y1, a) }; barA = 1; }
  else if (bc) { bar = bc; barA = a; } else if (bp) { bar = bp; barA = 1 - a; }
  const dim = lerp(p.none ? 0 : 1, c.none ? 0 : 1, a);
  const inF = (f, doc) => f.none ? 0 : (doc >= f.a && doc <= f.b ? 1 : 0);
  return { bar, barA, dim, w: doc => lerp(inF(p, doc), inF(c, doc), a), line: c.none ? (p.none ? 0 : p.a) : c.a, key: c };
}

// ---------------------------------------------------------------- text collection for readcheck
let TEXTS_NOW = [], CAM = { z: 1, cx: 960, cy: 540 }, collect = true;
const reg = (id, text, x0, y0, x1, y1, al = 1) => {
  if (!collect || al < .08) return; const z = CAM.z, f = (x, y) => [(x - CAM.cx) * z + W / 2, (y - CAM.cy) * z + H / 2], a = f(x0, y0), b = f(x1, y1);
  TEXTS_NOW.push({ id, text, x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
};
const mono = (str, x, y, size = FS) => { for (let i = 0; i < str.length; i++) if (str[i] !== ' ') g.fillText(str[i], x + i * size * .6, y); };
const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

// ---------------------------------------------------------------- state tracks (pointers, watch values)
function trk(f, t) {
  const ks = S.STATE.filter(k => f in k); let v = null, a = 0, ch = -9;
  for (let i = 0; i < ks.length; i++) {
    if (t < ks[i].t) break; const pv = i ? ks[i - 1][f] : ks[i][f], p = i ? ss(seg(t, ks[i].t, ks[i].t + .5)) : 1;
    v = lerp(pv, ks[i][f], p); a = i ? 1 : ss(seg(t, ks[i].t, ks[i].t + .4)); ch = ks[i].t; v = { v, raw: ks[i][f] };
  }
  return v ? { v: v.v, raw: v.raw, a, ch } : { v: null, raw: null, a: 0, ch: -9 };
}

// ---------------------------------------------------------------- panes
function panel(x, y, w, h, title, th, alpha = 1, right = '') {
  g.save(); g.globalAlpha = alpha; g.shadowColor = th.shadow; g.shadowBlur = 40; g.shadowOffsetY = 14; g.fillStyle = th.panel; rr(x, y, w, h, 16); g.fill(); g.restore();
  g.save(); g.globalAlpha = alpha; g.strokeStyle = th.line; g.lineWidth = 1.5; rr(x, y, w, h, 16); g.stroke();
  g.fillStyle = th.panel2; g.beginPath(); g.roundRect(x + 1, y + 1, w - 2, 36, [15, 15, 0, 0]); g.fill();
  g.font = `700 14px ${UI}`; g.letterSpacing = '2px'; g.fillStyle = th.dim; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(title, x + 20, y + 20);
  if (right) { g.letterSpacing = '0px'; g.font = `500 16px ${MONO}`; g.textAlign = 'right'; g.fillText(right, x + w - 20, y + 20); }
  g.letterSpacing = '0px'; g.restore();
}
function pill(x, y, text, kind, th, al = 1, opts = {}) {            // x,y = left, vertical centre
  g.save(); g.globalAlpha = al; g.font = `${opts.mono ? 600 : 600} ${opts.size || 21}px ${opts.mono ? MONO : UI}`; const w = g.measureText(text).width + 28, h = (opts.size || 21) + 18, c = kindColor(th, kind);
  g.fillStyle = th.dark ? rgba(c, .2) : rgba(c, .14); g.strokeStyle = rgba(c, .8); g.lineWidth = 1.6; rr(x, y - h / 2, w, h, h / 2); g.fill(); g.stroke();
  g.fillStyle = th.dark ? c : c; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, x + 14, y + 1); g.restore(); return { w, h };
}
function measurePill(text, size = 21, mono = false) { g.save(); g.font = `600 ${size}px ${mono ? MONO : UI}`; const w = g.measureText(text).width + 28; g.restore(); return w; }

function editor(t, L, th, R, F) {
  const E = L.E; panel(E.x, E.y, E.w, E.h, 'EDITOR', th, 1);
  // tab
  g.fillStyle = th.panel; rr(E.x + 14, E.y + 6, 190, 38, [10]); g.fill();
  g.font = `600 18px ${UI}`; g.fillStyle = th.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(S.FILE, E.x + 62, E.y + 26);
  g.fillStyle = rgba(th.kw, 1); g.beginPath(); g.arc(E.x + 40, E.y + 26, 6, 0, 7); g.fill();
  g.font = `600 14px ${UI}`; g.fillStyle = th.dim; g.textAlign = 'right'; g.fillText('Python', E.x + E.w - 18, E.y + 26);
  const cx0 = codeX(L), ytop = E.y + 44, ybot = E.y + E.h - 28;
  g.save(); g.beginPath(); g.rect(E.x + 1, ytop, E.w - 2, ybot - ytop); g.clip();
  // focus bar
  if (F.bar && F.barA > .01) {
    g.fillStyle = rgba(th.focus, (th.dark ? .13 : .2) * F.barA); g.fillRect(E.x + 1, F.bar.y0, E.w - 2, F.bar.y1 - F.bar.y0);
    g.fillStyle = rgba(th.focus, .95 * F.barA); g.fillRect(E.x + 1, F.bar.y0, 4, F.bar.y1 - F.bar.y0);
  }
  // rows
  for (const r of R) {
    if (r.h < .01) continue; const full = r.kind === 'new' ? r.text : r.text; let n = full.length;
    if (r.kind === 'n' || r.kind === 'old') n = r.doc === 3 && r.mode === 'buggy' ? typedCount(2, t) : (r.kind === 'n' ? typedCount(r.doc - 1, t) : full.length);
    if (r.doc !== 3 && r.kind === 'n') n = typedCount(r.doc - 1, t);
    const typingNow = t < TYPE.end + .2, show = n > 0 || (full.trim() === '' && t >= TYPE.times[r.doc - 1]?.[0]);
    const cy = r.y + r.h * LH / 2, al = lerp(1, th.dark ? .28 : .35, F.dim * (1 - F.w(r.doc)));
    g.save(); g.beginPath(); g.rect(E.x + 1, r.y, E.w - 2, r.h * LH); g.clip();
    if (r.kind === 'old') { g.fillStyle = rgba(th.rem, .16 * (r.h > .98 ? 1 : r.h)); g.fillRect(E.x + 1, r.y, E.w - 2, r.h * LH); }
    if (r.kind === 'new') { const stay = ss(seg(t, S.T.fold, S.T.fold + 1.2)); g.fillStyle = rgba(th.add, (.18 - .1 * stay) * Math.min(1, r.h)); g.fillRect(E.x + 1, r.y, E.w - 2, r.h * LH); g.fillStyle = rgba(th.add, .9); g.fillRect(E.x + 1, r.y, 4, r.h * LH); }
    g.translate(0, cy); g.scale(1, Math.max(r.h, .001)); g.globalAlpha = al * Math.min(1, .25 + r.h);
    g.font = `500 ${FS}px ${MONO}`; g.textBaseline = 'middle'; g.textAlign = 'right';
    // gutter: number, or the diff sign
    const oldGone = r.kind === 'new' && t > S.T.fold + .35, sign = r.kind === 'old' ? '−' : r.kind === 'new' && !oldGone ? '+' : '';
    g.fillStyle = r.kind === 'old' ? th.rem : r.kind === 'new' ? th.add : th.gut; g.fillText(sign || (show || t > TYPE.end ? String(r.doc) : ''), E.x + 54, 1);
    g.textAlign = 'left';
    if (show && n > 0) {
      let x = cx0, k = 0; const toks = tokenize(full, 'py'); const dragged = [];
      for (const tk of toks) {
        if (k >= n) break; const s = tk.s.slice(0, n - k); k += tk.s.length;
        g.fillStyle = tk.k === 'ws' ? th.ink : th[{ kw: 'kw', fn: 'fn', call: 'call', bi: 'bi', num: 'num', str: 'str', com: 'com', op: 'op', id: 'id' }[tk.k]]; mono(s, x, 1); x += s.length * CW;
      }
      if (r.kind === 'old') {                                              // the culprit < and a strike-through that draws itself
        const col = full.indexOf('<'), st = ss(seg(t, S.T.diff + .5, S.T.diff + 1.2));
        g.fillStyle = rgba(th.rem, .9); g.fillRect(cx0 + col * CW - 2, 14, CW + 4, 3);
        g.fillRect(cx0, 0, (x - cx0) * st, 2);
      }
      if (r.kind === 'new') { const col = full.indexOf('<'); g.fillStyle = rgba(th.add, 1); g.fillRect(cx0 + col * CW - 2, 14, 2 * CW + 4, 3); }
      reg('L' + r.doc + (r.kind === 'n' ? '' : r.kind), full, cx0, r.y, cx0 + full.length * CW, r.y + r.h * LH, r.h > .8 ? al : 0);
    }
    g.restore();
  }
  // caret: a block while typing, a thin line that blinks otherwise
  if (t < TYPE.end + .6) {
    let li = 0; for (let i = 0; i < NLINES; i++) if (TYPE.times[i][0] !== undefined && TYPE.times[i][0] <= t) li = i;
    const n = typedCount(li, t), lk = lastKeyT(t), on = (t - lk < .5) || Math.floor(t / .53) % 2 === 0, cr = R.find(r => r.doc === li + 1);
    if (on && cr && t >= .2) { g.fillStyle = rgba(th.ink, .85); g.fillRect(cx0 + n * CW, cr.y + 5, 2.5, LH - 10); }
  }
  g.restore();
  // status bar
  const sy = E.y + E.h - 28; g.fillStyle = th.panel2; g.beginPath(); g.roundRect(E.x + 1, sy, E.w - 2, 27, [0, 0, 15, 15]); g.fill();
  g.font = `500 15px ${UI}`; g.fillStyle = th.dim; g.textBaseline = 'middle'; g.textAlign = 'left';
  let tl = 1; for (let i = 0; i < NLINES; i++) if (TYPE.times[i][0] <= t) tl = i + 1; const ln = F.line || (t < TYPE.end + .3 ? tl : 16); g.fillText(`Ln ${Math.min(16, ln || 16)}, Col 1     Python ${S.PYV}     UTF-8`, E.x + 18, sy + 14);
  // zoom marker around the token under discussion
  const mk = ss(seg(t, S.T.zoomA + .5, S.T.zoomA + 1.1)) * (1 - ss(seg(t, 46.0, 46.4)));
  if (mk > .01) {
    const r3 = R.find(r => r.doc === 3), col = 13, x = cx0 + col * CW, y = r3.y + 3, pul = .6 + .4 * Math.sin(t * 5);
    g.strokeStyle = rgba(th.focus, mk * (.6 + .4 * pul)); g.lineWidth = 2.4; rr(x - 5, y, CW + 10, LH - 6, 6); g.stroke();
  }
  const mk2 = ss(seg(t, 46.7, 47.2)) * (1 - ss(seg(t, 50.0, 50.6)));
  if (mk2 > .01) { const r3 = R.filter(r => r.doc === 3).pop(), x = cx0 + 13 * CW, y = r3.y + 3; g.strokeStyle = rgba(th.add, mk2); g.lineWidth = 2.4; rr(x - 5, y, 2 * CW + 10, LH - 6, 6); g.stroke(); }
}

function chips(t, L, th, R) {
  const E = L.E;
  S.CHIPS.forEach((c, i) => {
    const a = ss(seg(t, c.t0, c.t0 + .3)) * (1 - ss(seg(t, c.t1 - .3, c.t1))); if (a < .02) return;
    const rs = R.filter(r => r.doc === c.line), r = rs[rs.length - 1], cy = r.y + r.h * LH / 2, w = measurePill(c.text), x = E.x + E.w - 22 - w + (1 - a) * 16;
    const txt = c.line === 3 && t >= S.T.diff ? S.SRC.fixed[2] : r.text, ex = codeX(L) + txt.trimEnd().length * CW + 12, col = kindColor(th, c.kind);
    g.save(); g.globalAlpha = a; g.strokeStyle = rgba(col, .65); g.lineWidth = 1.6; g.setLineDash([3, 4]);
    if (x - 6 > ex + 8) { g.beginPath(); g.moveTo(ex, cy); g.lineTo(x - 6, cy); g.stroke(); }
    g.setLineDash([]); g.fillStyle = col; g.beginPath(); g.arc(ex, cy, 3.5, 0, 7); g.fill(); g.restore();
    pill(x, cy, c.text, c.kind, th, a); reg('chip' + i, c.text, x + 14, cy - 12, x + w - 14, cy + 12, a);
  });
}

function terminal(t, L, th) {
  const TM = L.TM; panel(TM.x, TM.y, TM.w, TM.h, 'TERMINAL', th, 1, '~/search');
  const split = ss(seg(t, S.T.split, S.T.split + .7)), wA = TM.w * (1 - .5 * split), xA = TM.x + 26, xB = TM.x + wA + 20, y0 = TM.y + 38 + 28;
  g.save(); g.beginPath(); g.rect(TM.x + 1, TM.y + 38, TM.w - 2, TM.h - 39); g.clip();
  g.font = `500 ${FS}px ${MONO}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  const run = (x, t0, tout, out, who, ann, annT0) => {
    const nc = typeCmd(t0, t); g.fillStyle = th.add; g.fillText('$', x, y0); g.fillStyle = th.ink; mono(CMD.slice(0, nc), x + 2 * CW, y0);
    if (nc > 0) reg('cmd' + who, CMD, x + 2 * CW, y0 - 14, x + (2 + CMD.length) * CW, y0 + 14, 1);
    const showOut = t >= tout; let cur = nc < CMD.length || t < tout;
    if (showOut) out.forEach((s, i) => {
      const y = y0 + (i + 1) * 36, bad = who === 'A' && t >= S.T.wrong, a = ss(seg(t, tout + i * .05, tout + i * .05 + .12));
      if (bad && i < 2) { const w = ss(seg(t, S.T.wrong, S.T.wrong + .3)); g.fillStyle = rgba(th.rem, .2 * w); g.fillRect(x - 10, y - 17, 420, 34); }
      g.globalAlpha = a; g.fillStyle = bad && i < 2 ? th.rem : th.ink; mono(s, x + 2 * CW, y); g.globalAlpha = 1;
      reg('out' + who + i, s, x + 2 * CW, y - 14, x + (2 + s.length) * CW, y + 14, a);
      const an = ann.find(q => q.line === i && t >= (q.t ?? annT0));
      if (an) {
        const aa = ss(seg(t, an.t ?? annT0, (an.t ?? annT0) + .3)), kind = an.kind || 'bad', c = kindColor(th, kind);
        g.font = `600 20px ${UI}`; g.globalAlpha = aa; g.fillStyle = c; g.fillText(an.text, x + 2 * CW + 160 + (1 - aa) * 10, y + 1); g.globalAlpha = 1;
        reg('ann' + who + i, an.text, x + 2 * CW + 160, y - 12, x + 2 * CW + 160 + g.measureText(an.text).width, y + 12, aa); g.font = `500 ${FS}px ${MONO}`;
      }
    });
    if (showOut) cur = false;
    const lk = Math.floor(t / .53) % 2 === 0; if ((cur || (showOut && t - tout > .3)) && (lk || cur)) {
      const cy = showOut ? y0 + (out.length + 1) * 36 : y0; g.fillStyle = rgba(th.ink, .8);
      if (showOut) { g.fillStyle = th.add; g.fillText('$', x, cy); g.fillStyle = rgba(th.ink, .8); g.fillRect(x + 2 * CW, cy - 12, CW * .7, 24); } else g.fillRect(x + (2 + nc) * CW, cy - 12, CW * .7, 24);
    }
  };
  run(xA, S.T.run, S.T.out1, V.buggy, 'A', S.ANN1, S.T.wrong);
  if (split > .01) {
    g.globalAlpha = split; run(xB, S.T.run2, S.T.out2, V.fixed, 'B', S.ANN2, 0); g.globalAlpha = 1;
    g.fillStyle = th.line; g.fillRect(xB - 12, TM.y + 46, 2, TM.h - 60);
    g.globalAlpha = split; const pb = measurePill('before', 18); pill(xA + wA - 20 - pb - 4, TM.y + 66, 'before', 'bad', th, split, { size: 18 }); const pa = measurePill('after', 18); pill(xB + (TM.w - wA) - 52 - pa, TM.y + 66, 'after', 'good', th, split, { size: 18 }); g.globalAlpha = 1;
    reg('before', 'before', xA + wA - 20 - pb + 10, TM.y + 56, xA + wA - 30, TM.y + 78, split); reg('after', 'after', xB + (TM.w - wA) - 52 - pa + 10, TM.y + 56, xB + (TM.w - wA) - 62, TM.y + 78, split);
  }
  g.restore();
}

function diagram(t, L, th) {
  const D = L.DG; if (D.a < .01) return; const dx = D.dx, x = D.x + dx;
  g.save(); g.globalAlpha = D.a; panel(x, D.y, D.w, D.h, 'DIAGRAM', th, 1, 'nums = [2, 5, 8, 12, 16, 23, 38]');
  const x0 = x + (D.w - (7 * 100 + 6 * 14)) / 2, cy0 = D.y + 130, vals = [2, 5, 8, 12, 16, 23, 38], lo = trk('lo', t), hi = trk('hi', t), mid = trk('mid', t);
  const loV = lo.v ?? 0, hiV = hi.v ?? 6, ptrOn = lo.a > 0 || hi.a > 0, cxOf = p => x0 + p * 114 + 50;
  // the "no candidates" glow under the live window
  if (ptrOn) {
    const wa = Math.min(1, Math.max(lo.a, hi.a)), a0 = cxOf(loV) - 58, a1 = cxOf(hiV) + 58;
    g.fillStyle = rgba(th.focus, (th.dark ? .1 : .16) * wa); rr(a0, cy0 - 14, a1 - a0, 128, 14); g.fill();
  }
  const found = ss(seg(t, 52.1, 52.5)), cand = ss(seg(t, 36.5, 37.0)) * (1 - ss(seg(t, 42.5, 42.9))), bugRing = ss(seg(t, 42.7, 43.1)) * (1 - ss(seg(t, 46.0, 46.5)));
  for (let i = 0; i < 7; i++) {
    const ap = ss(seg(t, 19.6 + i * .09, 19.6 + i * .09 + .35)); if (ap <= 0) continue; const alive = ptrOn ? clamp(i - loV + 1, 0, 1) * clamp(hiV - i + 1, 0, 1) : 1, cx = cxOf(i);
    const sc = .85 + .15 * ap; g.save(); g.translate(cx, cy0 + 50); g.scale(sc, sc); g.globalAlpha = D.a * ap * lerp(.3, 1, alive);
    g.fillStyle = th.cell; g.strokeStyle = th.line; g.lineWidth = 2; rr(-50, -50, 100, 100, 14); g.fill(); g.stroke();
    if (i === 4) { if (cand > .01) { g.fillStyle = rgba(th.focus, .25 * cand); rr(-50, -50, 100, 100, 14); g.fill(); g.strokeStyle = rgba(th.focus, cand); g.lineWidth = 3.5; rr(-50, -50, 100, 100, 14); g.stroke(); } 
      if (found > .01) { g.fillStyle = rgba(th.add, .25 * found); rr(-50, -50, 100, 100, 14); g.fill(); g.strokeStyle = rgba(th.add, found); g.lineWidth = 4; rr(-50, -50, 100, 100, 14); g.stroke(); }
      if (bugRing > .01) { g.strokeStyle = rgba(th.rem, bugRing); g.lineWidth = 3.5; g.setLineDash([9, 7]); rr(-56, -56, 112, 112, 18); g.stroke(); g.setLineDash([]); } }
    g.fillStyle = th.ink; g.font = `700 40px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(vals[i]), 0, 3);
    g.font = `500 19px ${MONO}`; g.fillStyle = th.dim; g.fillText(String(i), 0, 78); g.restore();
    if (ap > .9) reg('cell' + i, String(vals[i]), cx - 20, cy0 + 28, cx + 20, cy0 + 72, D.a * lerp(.3, 1, alive));
  }
  // pointers: lo and hi above the cells, mid below
  const ptr = (name, tr, up, label, col, side) => {
    if (tr.a < .01) return; const cx = cxOf(tr.v), y = up ? cy0 - 8 : cy0 + 100 + 22;
    g.save(); g.globalAlpha = D.a * tr.a; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3;
    const stem0 = up ? cy0 - 44 : cy0 + 100 + 80, tip = up ? cy0 - 10 : cy0 + 100 + 44;
    g.beginPath(); g.moveTo(cx, stem0); g.lineTo(cx, tip + (up ? -6 : 6)); g.stroke();
    g.beginPath(); if (up) { g.moveTo(cx - 9, tip - 10); g.lineTo(cx + 9, tip - 10); g.lineTo(cx, tip + 2); } else { g.moveTo(cx - 9, tip + 10); g.lineTo(cx + 9, tip + 10); g.lineTo(cx, tip - 2); } g.fill();
    const w = measurePill(label, 22, true), px = side < 0 ? cx - w - 8 : side > 0 ? cx + 8 : cx - w / 2;
    pill(px, up ? cy0 - 52 : cy0 + 100 + 92, label, 'x', { ...th, info: col, dark: th.dark }, 1, { mono: true, size: 22 });
    g.restore(); reg('ptr' + name, label, px + 14, (up ? cy0 - 52 : cy0 + 192) - 14, px + w - 14, (up ? cy0 - 52 : cy0 + 192) + 14, D.a * tr.a);
  };
  // pill colours come from the pointer: pass a theme whose 'x' kind maps to it
  const pt = (name, tr, up, label, col, side) => { const th2 = { ...th, x: col }; kindColorOverride = col; ptr(name, tr, up, label, col, side); kindColorOverride = null; };
  pt('lo', lo, true, 'lo', th.lo, -1); pt('hi', hi, true, 'hi', th.hi, 1); pt('mid', mid, false, 'mid', th.mid, 0);
  // the note
  let nk = -1; S.NOTES.forEach((n, i) => { if (t >= n.t) nk = i; });
  S.NOTES.forEach((n, i) => {
    const a = ss(seg(t, n.t, n.t + .3)) * (i === nk ? 1 : 0) + (i === nk - 1 ? 1 - ss(seg(t, S.NOTES[i + 1].t, S.NOTES[i + 1].t + .25)) : 0); if (a < .02) return;
    const c = kindColor(th, n.kind); g.font = `600 23px ${UI}`; const w = g.measureText(n.text).width + 44, px = x + D.w / 2 - w / 2, py = D.y + D.h - 30;
    g.globalAlpha = D.a * a; g.fillStyle = th.dark ? rgba(c, .16) : rgba(c, .12); rr(px, py - 20, w, 40, 20); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(px + 20, py, 5, 0, 7); g.fill();
    g.fillStyle = th.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(n.text, px + 34, py + 1); g.globalAlpha = 1; reg('note' + i, n.text, px + 34, py - 12, px + w - 10, py + 12, D.a * a);
  });
  g.restore();
}

function watch(t, L, th, F) {
  const Wt = L.WT; if (Wt.a < .01) return; const x = Wt.x + Wt.dx;
  g.save(); g.globalAlpha = Wt.a; panel(x, Wt.y, Wt.w, Wt.h, 'WATCH', th, 1, 'call stack and locals');
  // call stack
  const frames = [{ name: '<module>', line: 16, on: ss(seg(t, 19.3, 19.8)) }, { name: 'binary_search(items, target)', line: F.line || 0, on: Math.max(ss(seg(t, 21.0, 21.4)) * (1 - ss(seg(t, 45.0, 45.4))), ss(seg(t, 51.4, 51.8)) * (1 - ss(seg(t, 55.2, 55.6)))) }];
  g.textBaseline = 'middle'; g.textAlign = 'left';
  const yb = Wt.y + 62; [frames[1], frames[0]].forEach((f, i) => {
    if (f.on < .02) return; const y = yb + i * 32, top = i === 0;
    g.globalAlpha = Wt.a * f.on; g.fillStyle = top ? rgba(th.focus, .16) : 'transparent'; if (top) { rr(x + 14, y - 15, Wt.w - 28, 30, 8); g.fill(); }
    g.fillStyle = top ? th.focus : th.dim; g.beginPath(); g.moveTo(x + 24, y - 6); g.lineTo(x + 24, y + 6); g.lineTo(x + 33, y); g.fill();
    g.font = `500 20px ${MONO}`; g.fillStyle = th.ink; g.fillText(f.name, x + 46, y + 1); g.textAlign = 'right'; g.fillStyle = th.dim; g.font = `500 17px ${UI}`; g.fillText('search.py : ' + f.line, x + Wt.w - 24, y + 1); g.textAlign = 'left';
    reg('fr' + i, f.name, x + 46, y - 12, x + 46 + f.name.length * 12, y + 12, Wt.a * f.on);
  });
  g.globalAlpha = Wt.a; g.fillStyle = th.line; g.fillRect(x + 20, Wt.y + 136, Wt.w - 40, 1.5);
  const tiles = [['target', trk('target', t), th.ink], ['lo', trk('lo', t), th.lo], ['hi', trk('hi', t), th.hi], ['mid', trk('mid', t), th.mid], ['items[mid]', trk('im', t), th.ink]];
  tiles.forEach(([name, tr, col], i) => {
    const tw = (Wt.w - 40) / 5, tx = x + 20 + i * tw, flash = tr.ch > -1 ? 1 - ss(seg(t, tr.ch, tr.ch + .9)) : 0;
    if (flash > .01) { g.fillStyle = rgba(th.focus, .22 * flash); rr(tx + 4, Wt.y + 148, tw - 8, 76, 10); g.fill(); }
    g.font = `700 14px ${UI}`; g.letterSpacing = '1px'; g.fillStyle = th.dim; g.textAlign = 'left'; g.fillText(name.toUpperCase(), tx + 16, Wt.y + 166); g.letterSpacing = '0px';
    const txt = tr.a > .05 ? String(tr.raw) : '–'; g.font = `700 40px ${MONO}`; g.fillStyle = tr.a > .05 ? col : th.gut; g.fillText(txt, tx + 16, Wt.y + 201);
    if (tr.a > .05) reg('w' + i, txt, tx + 16, Wt.y + 180, tx + 16 + txt.length * 24, Wt.y + 222, Wt.a);
  });
  g.restore();
}

function recap(t, th) {
  const a = ss(seg(t, 58.95, 59.6)); if (a < .01) return;
  g.fillStyle = rgba('#eef0f6', .72 * a); g.fillRect(0, 0, W, H);
  const cw = 1180, ch = 600, cx = (W - cw) / 2, cy = 110 + (1 - a) * 20; g.save(); g.globalAlpha = a;
  panel(cx, cy, cw, ch, 'RULE OF THUMB', th, 1);
  g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = `500 22px ${UI}`; g.fillStyle = th.dim; g.fillText('Keep looping while', cx + 56, cy + 92);
  g.font = `700 64px ${MONO}`; g.fillStyle = th.ink; const hx = cx + 56; let xx = hx; [['while', 'kw'], [' lo ', 'id'], ['<=', 'op'], [' hi', 'id'], [':', 'op']].forEach(([s, k]) => { g.fillStyle = th[k]; mono(s, xx, cy + 160, 64); xx += s.length * 38.4; });
  reg('rule', 'while lo <= hi:', hx, cy + 124, xx, cy + 196, a);
  const rowsT = [['lo < hi', 'two or more candidates', 59.9, 'add'], ['lo == hi', 'exactly one candidate', 59.3, 'add'], ['lo > hi', 'none left: stop', 60.8, 'rem']];
  rowsT.forEach(([op, txt, t0, c], i) => {
    const ra = ss(seg(t, t0, t0 + .4)), y = cy + 262 + i * 88; if (ra < .01) return; g.globalAlpha = a * ra;
    g.fillStyle = rgba(th[c], .12); rr(cx + 56, y - 34, cw - 112 - 190, 68, 14); g.fill(); g.fillStyle = th[c]; g.fillRect(cx + 56, y - 34, 6, 68);
    g.font = `700 36px ${MONO}`; g.fillStyle = th.ink; mono(op, cx + 90, y + 1, 36); g.font = `600 30px ${UI}`; g.fillText(txt, cx + 310, y + 1);
    g.font = `700 20px ${UI}`; g.letterSpacing = '2px'; g.textAlign = 'right'; g.fillStyle = th[c]; g.fillText(c === 'add' ? 'KEEP LOOPING' : 'STOP', cx + cw - 56 - 190 - 24, y + 1); g.letterSpacing = '0px'; g.textAlign = 'left';
    reg('r' + i, op + ' ' + txt, cx + 90, y - 20, cx + 310 + g.measureText(txt).width, y + 20, a * ra);
  });
  const ba = ss(seg(t, 61.8, 62.3)); if (ba > .01) {
    g.globalAlpha = a * ba; g.strokeStyle = th.add; g.lineWidth = 4; g.beginPath(); const bx = cx + cw - 56 - 190 + 18, y0 = cy + 262 - 34, y1 = cy + 262 + 88 + 34;
    g.moveTo(bx - 10, y0); g.lineTo(bx, y0); g.lineTo(bx, y1); g.lineTo(bx - 10, y1); g.stroke();
    g.fillStyle = th.add; g.font = `700 30px ${MONO}`; g.textAlign = 'left'; mono('lo <= hi', bx + 14, (y0 + y1) / 2 - 18, 30);
    g.font = `700 16px ${UI}`; g.letterSpacing = '2px'; g.fillText('SO LOOP', bx + 14, (y0 + y1) / 2 + 16); g.letterSpacing = '0px'; g.font = `700 30px ${MONO}`;
    reg('bracket', 'lo <= hi SO LOOP', bx + 14, (y0 + y1) / 2 - 36, bx + 14 + 8 * 18, (y0 + y1) / 2 + 30, a * ba);
  }
  g.restore();
}

function captions(t, th) {
  const c = S.CUES.find(q => t >= q[0] - .001 && t < q[1]); if (!c) return;
  const a = ss(seg(t, c[0], c[0] + .15)) * (1 - ss(seg(t, c[1] - .15, c[1])));
  g.save(); g.globalAlpha = a; g.font = `600 34px ${UI}`; const w = g.measureText(c[2]).width + 60, x = (W - w) / 2, y = 1030;
  g.fillStyle = th.cap; rr(x, y - 30, w, 60, 30); g.fill(); g.fillStyle = th.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c[2], W / 2, y + 2); g.restore();
}

// ---------------------------------------------------------------- camera: one world -> screen function, with a token to look at
function tokenPos(tok) { const L = FIN, x = codeX(L) + tok.col * CW + CW / 2, y = CODE_TOP + (tok.line - 1) * LH + LH / 2; return [x + (tok.dx || 0), y + (tok.dy || 0)]; }
function camAt(t) {
  const res = c => c.tok ? { z: c.z, cx: tokenPos(c.tok)[0], cy: tokenPos(c.tok)[1] } : { z: c.z, cx: W / 2, cy: H / 2 };
  let k = 0; S.CAMS.forEach((c, i) => { if (t >= c.t) k = i; }); const c = S.CAMS[k], cur = res(c); if (k === 0 || !c.d) return cur;
  const a = seg(t, c.t, c.t + c.d); if (a >= 1) return cur; const e = ss(a), pv = res(S.CAMS[k - 1]);
  return { z: pv.z * Math.pow(cur.z / pv.z, e), cx: lerp(pv.cx, cur.cx, e), cy: lerp(pv.cy, cur.cy, e) };
}

function background(th) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, th.bg2); gr.addColorStop(1, th.bg1); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = rgba(th.dark ? '#ffffff' : '#1c2230', th.dark ? .035 : .06); for (let y = 30; y < H; y += 60) for (let x = 30; x < W; x += 60) g.fillRect(x, y, 2, 2);
}

function scene(t, th, withRecap) {
  const cam = camAt(t); const sh = t > S.T.thud && t < S.T.thud + .5 ? Math.sin((t - S.T.thud) * 70) * 5 * Math.exp(-(t - S.T.thud) * 9) : 0;
  CAM = { ...cam, cy: cam.cy + sh }; background(th);
  g.save(); g.translate(W / 2, H / 2); g.scale(CAM.z, CAM.z); g.translate(-CAM.cx, -CAM.cy);
  const L = layout(t), R = rows(t), F = focusAt(t, R);
  editor(t, L, th, R, F); diagram(t, L, th); watch(t, L, th, F); terminal(t, L, th); chips(t, L, th, R);
  g.restore(); CAM = { z: 1, cx: W / 2, cy: H / 2 };
  if (withRecap) recap(t, th);
}
function render(t) {
  TEXTS_NOW = []; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  const wipe = ss(seg(t, S.T.flip, S.T.flipEnd));
  collect = wipe < 1; scene(t, DARK, false);
  if (wipe > 0) {
    const edge = -300 + wipe * (W + 600); g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(edge + 160, 0); g.lineTo(edge - 160, H); g.lineTo(0, H); g.closePath(); g.clip();
    collect = wipe >= 1; scene(t, LIGHT, true); g.restore();
    if (wipe < 1) { g.save(); g.strokeStyle = 'rgba(255,204,77,.9)'; g.lineWidth = 4; g.beginPath(); g.moveTo(edge + 160, 0); g.lineTo(edge - 160, H); g.stroke(); g.restore(); }
  }
  const th = wipe >= 1 ? LIGHT : DARK; captions(t, th);
  const fo = ss(seg(t, S.DUR - .9, S.DUR)); if (fo > 0) { g.fillStyle = rgba(LIGHT.bg1, fo); g.fillRect(0, 0, W, H); }
}
window.DUR = S.DUR; window.EV = EV; window.render = render;
window.TEXTS = t => { render(t); return TEXTS_NOW; };
render(0); window.READY = true;
