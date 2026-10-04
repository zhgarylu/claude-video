// Layouts for talking-head films: where the presenter goes, and the helpers around them.
//
//   import { loadHost } from '/tools/talk/host.js';
//   import { splitLayout, pipLayout, worldLayout, captions, bullets, cuesFromWords, THEME } from '/tools/talk/layouts.js';
//
//   const host = await loadHost('src');
//   const L = worldLayout(host, { W: 1920, H: 1080, cards });      // or splitLayout(...) / pipLayout(...)
//   // in render(t):  L.drawGround(ctx, t); L.drawVideo(ctx, t); L.drawCards(ctx, t); captions.card(ctx, cues, t, { W, H });
//
// Every layout takes the loaded host and a few options, and returns an object with the rectangles it uses and draw functions.
// Colours and fonts come from a theme (`THEME` below is a neutral default); pass your style's own as `theme`.
// Nothing here knows about a style: the style's graphics are yours to draw in the space a layout leaves.
import { hostFrame, level } from './host.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const back = (t, s = 1.8) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
const TAU = Math.PI * 2, C30 = Math.cos(Math.PI / 6);
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

export const THEME = {
  ink: '#231A2C', paper: '#FBF7EE', ground: '#E7DCCA', groundTop: [235, 224, 206], groundBottom: [228, 217, 199],
  accent: '#7B5CF5', muted: '#5A5F6E', line: 'rgba(35,26,44,0.14)', panel: '#0A0F18',
  hues: { violet: '#7B5CF5', teal: '#1EA79B', mustard: '#F0B23B', coral: '#EF6F5E', sky: '#3E8FE8', graphite: '#5A5F6E' },
  font: (w, s) => `${w} ${s}px "Noto Sans SC", "PingFang SC", system-ui, sans-serif`,
};
const T = th => ({ ...THEME, ...(th || {}), hues: { ...THEME.hues, ...((th || {}).hues || {}) } });
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

/** A small isometric cube, used as the colour chip on cards and legends. */
export function isoCube(ctx, x, y, s, color) {
  const tone = c => ({ top: mixc(c, '#FFF6E8', .22), L: c, R: mixc(c, '#231A2C', .24) }), t3 = tone(color);
  const pt = (a, b, c) => [x + (a - b) * C30 * s, y + ((a + b) / 2 - c) * s];
  const f = (arr, cl) => { ctx.beginPath(); arr.forEach(([a, b, c], i) => { const [px, py] = pt(a, b, c); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.fillStyle = cl; ctx.fill(); ctx.strokeStyle = cl; ctx.lineWidth = .6; ctx.stroke(); };
  f([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], t3.top); f([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], t3.L); f([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], t3.R);
}

// ───────────────────────────── split: host panel on one side, the style's UI on the other ─────────────────────────────
/**
 * Host panel on the left or right, content area for the rest. Good for software tours (the host is about a third of the frame).
 * options: W, H, side ('left'|'right'), margin (48), bottom (132: the band under the panels for captions), gap (50), radius (28), filter (CSS filter for the footage), pill (voice indicator, true)
 * returns { host: rect, content: rect, drawHost(ctx, t, { exit }), drawPanel(ctx, rect?, { fill, border }) }
 */
export function splitLayout(host, o = {}) {
  const th = T(o.theme), W = o.W ?? 1920, H = o.H ?? 1080, m = o.margin ?? 48, gap = o.gap ?? 50, r = o.radius ?? 28, aspect = host.w / host.h;
  const hh = H - m - (o.bottom ?? 132), hw = Math.round(hh * aspect), left = (o.side ?? 'left') === 'left';
  const hr = { x: left ? m : W - m - hw, y: m, w: hw, h: hh };
  const cr = { x: left ? m + hw + gap : m, y: m, w: W - 2 * m - hw - gap, h: hh };
  return {
    host: hr, content: cr,
    drawHost(ctx, t, { exit = 0 } = {}) {
      if (exit >= 1) return;
      const k = 1 - exit, cx = hr.x + hr.w / 2, cy = hr.y + hr.h / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(Math.max(1e-4, k), Math.max(1e-4, Math.pow(k, 1.6))); ctx.translate(-cx, -cy);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 50; ctx.fillStyle = th.panel; rr(ctx, hr.x, hr.y, hr.w, hr.h, r); ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, hr.x, hr.y, hr.w, hr.h, r); ctx.clip();
      if (o.filter ?? true) ctx.filter = o.filter === true || o.filter == null ? 'brightness(0.92) saturate(0.94)' : o.filter;
      ctx.drawImage(hostFrame(host, t), hr.x, hr.y, hr.w, hr.h); ctx.filter = 'none';
      let g = ctx.createLinearGradient(0, hr.y + hr.h - 220, 0, hr.y + hr.h); g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(1, 'rgba(5,7,12,0.5)'); ctx.fillStyle = g; ctx.fillRect(hr.x, hr.y, hr.w, hr.h);
      g = ctx.createRadialGradient(cx, cy, hr.w * .4, cx, cy, hr.h * .7); g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(1, 'rgba(5,7,12,0.4)'); ctx.fillStyle = g; ctx.fillRect(hr.x, hr.y, hr.w, hr.h);
      if (o.pill ?? true) {                                    // a "speaking" indicator: a dot and five bars that follow the voice
        const px = hr.x + 22, py = hr.y + 22, e = level(host, t);
        rr(ctx, px, py, 104, 38, 19); ctx.fillStyle = 'rgba(8,12,20,0.62)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(px + 20, py + 19, 4.5, 0, TAU); ctx.fill();
        for (let i = 0; i < 5; i++) { const bh = 4 + 20 * clamp(e * (.55 + .45 * Math.abs(Math.sin(Math.floor(t * 12) * 12.9898 + i * 78.233))), 0, 1); ctx.fillStyle = 'rgba(233,238,248,0.88)'; rr(ctx, px + 40 + i * 11, py + 19 - bh / 2, 5, bh, 2.5); ctx.fill(); }
      }
      ctx.restore();
      ctx.strokeStyle = th.line; ctx.lineWidth = 1; rr(ctx, hr.x, hr.y, hr.w, hr.h, r); ctx.stroke();
      ctx.restore();
    },
    drawPanel(ctx, rect = cr, { fill = 'rgba(8,12,20,0.94)', border = th.line, radius = r, shadow = true } = {}) {
      ctx.save(); if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 50; } rr(ctx, rect.x, rect.y, rect.w, rect.h, radius); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
      ctx.strokeStyle = border; ctx.lineWidth = 1; rr(ctx, rect.x, rect.y, rect.w, rect.h, radius); ctx.stroke();
    },
  };
}

// ───────────────────────────── pip: the host in a corner window ─────────────────────────────
/**
 * A small window in a corner (about 7% of the frame by default); everything else is the style's.
 * options: W, H, corner ('tr'|'tl'|'br'|'bl'), width (330), margin (40), radius (22), border, lw (3), shadow, crop {x,y,w,h} (source rectangle, to zoom on the face)
 * returns { rect, draw(ctx, t, { exit }) } (exit 0..1 slides the window out of the frame)
 */
export function pipLayout(host, o = {}) {
  const th = T(o.theme), W = o.W ?? 1920, H = o.H ?? 1080, w = o.width ?? 330, h = Math.round(w * (o.crop ? o.crop.h / o.crop.w : host.h / host.w)), m = o.margin ?? 40, c = o.corner ?? 'tr';
  const rect = { x: c.endsWith('r') ? W - m - w : m, y: c.startsWith('t') ? m : H - m - h, w, h }, up = c.startsWith('t');
  return {
    rect,
    draw(ctx, t, { exit = 0, time } = {}) {
      if (exit >= 1) return;
      const y = rect.y + (up ? -1 : 1) * exit * (h + 2 * m), r = o.radius ?? 22, im = hostFrame(host, time ?? t), cr = o.crop || { x: 0, y: 0, w: host.w, h: host.h };
      ctx.save(); ctx.shadowColor = o.shadow ?? 'rgba(35,26,44,0.28)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8; ctx.fillStyle = th.paper; rr(ctx, rect.x, y, w, h, r); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.save(); rr(ctx, rect.x, y, w, h, r); ctx.clip(); ctx.drawImage(im, cr.x, cr.y, cr.w, cr.h, rect.x, y, w, h); ctx.restore();
      if (o.lw ?? 3) { ctx.strokeStyle = o.border ?? th.ink; ctx.lineWidth = o.lw ?? 3; rr(ctx, rect.x, y, w, h, r); ctx.stroke(); }
      ctx.restore();
    },
  };
}

// ───────────────────────────── world: the host video is the main picture, cards annotate it ─────────────────────────────
/**
 * For a host video that already lives in a styled world and acts the story out. The video fills most of the height, its four edges
 * are feathered and the ground colour follows the video's own corner colours every frame, so it melts into the canvas.
 * Left and right columns hold callout cards with leaders to objects in the video.
 * options: W, H, height (0.89 = fraction of H), feather {side, top, bottom}, endAt (second when the video shrinks away; omit for never),
 *          endScale (0.56), endCenter [x, y], fadeAt (second when it has faded out), cards [], dots (faint isometric dot lattice, true)
 * returns { video, scale, toScreen(t, vx, vy), drawGround(ctx, t), drawVideo(ctx, t, { time }), drawCards(ctx, t), allocate() }
 *   card = { id, side:'L'|'R', hue, title, sub?, tag?, t0, t1, anchor:[[t, vx, vy], …], objEnd?, y? }  (anchor in the video's own pixels)
 */
export function worldLayout(host, o = {}) {
  const th = T(o.theme), W = o.W ?? 1920, H = o.H ?? 1080, vh = Math.round(H * (o.height ?? .889)), vw = Math.round(vh * host.w / host.h);
  const video = { x: Math.round((W - vw) / 2), y: o.top ?? 0, w: vw, h: vh }, S = vh / host.h, fe = { side: 46, top: 24, bottom: 70, ...(o.feather || {}) };
  const cards = o.cards || [], endCenter = o.endCenter ?? [330, H * .46];
  const xf = t => {
    const p = o.endAt == null ? 0 : ss(seg(t, o.endAt, o.endAt + .75));
    return { sc: lerp(1, o.endScale ?? .56, p), cx: lerp(video.x + vw / 2, endCenter[0], p), cy: lerp(video.y + vh / 2, endCenter[1], p), p };
  };
  const toScreen = (t, vx, vy) => { const f = xf(t); return [f.cx + (vx / host.w - .5) * vw * f.sc, f.cy + (vy / host.h - .5) * vh * f.sc]; };
  const sc8 = document.createElement('canvas'); sc8.width = sc8.height = 8; const sx8 = sc8.getContext('2d', { willReadFrequently: true });
  const vc = document.createElement('canvas'); vc.width = vw; vc.height = vh; const vctx = vc.getContext('2d');
  const anchorAt = (c, t) => { const a = c.anchor; if (t <= a[0][0] || a.length === 1) return [a[0][1], a[0][2]]; for (let i = 0; i < a.length - 1; i++) if (t <= a[i + 1][0]) { const u = seg(t, a[i][0], a[i + 1][0]); return [lerp(a[i][1], a[i + 1][1], u), lerp(a[i][2], a[i + 1][2], u)]; } const l = a[a.length - 1]; return [l[1], l[2]]; };
  const edge = (t, time) => { sx8.drawImage(hostFrame(host, time ?? t), 0, 0, 8, 8); const px = (x, y) => sx8.getImageData(x, y, 1, 1).data, a = px(0, 0), b = px(7, 0), c = px(0, 7), d = px(7, 7), m = (p, q) => [0, 1, 2].map(i => Math.round((p[i] + q[i]) / 2)); return [m(a, b), m(c, d)]; };

  const api = {
    video, scale: S, toScreen, left: { x: 0, y: 0, w: video.x, h: H }, right: { x: video.x + vw, y: 0, w: W - video.x - vw, h: H },
    allocate() {                                              // card heights: next to their anchors, at least 150 px apart on the same side
      for (const side of ['L', 'R']) {
        const lo = side === 'L' ? 180 : 140, placed = [];
        for (const c of cards.filter(c => c.side === side).sort((a, b) => a.t0 - b.t0)) {
          if (c.y) { placed.push(c); continue; }
          const a = anchorAt(c, c.t0), want = clamp(a[1] * S, lo, H - 240), cand = [0, 150, -150, 300, -300, 450, -450].map(d => want + d).filter(y => y >= lo && y <= H - 240);
          c.y = cand.find(y => placed.every(p => !(p.t0 < c.t1 && c.t0 < p.t1) || Math.abs(p.y - y) >= 150)) ?? want; placed.push(c);
        }
      }
    },
    drawGround(ctx, t, { time } = {}) {
      const [top, bot] = edge(t, time), k = o.endAt == null ? 1 : 1 - ss(seg(t, o.endAt, o.endAt + .8)), mx = (v, base) => v.map((x, i) => Math.round(lerp(base[i], x, k)));
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${mx(top, th.groundTop)})`); g.addColorStop(1, `rgb(${mx(bot, th.groundBottom)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (o.dots ?? true) { ctx.fillStyle = 'rgba(35,26,44,0.11)'; const k2 = 56; for (let i = -20; i < 50; i++) for (let j = -20; j < 50; j++) { const x = W / 2 + (i - j) * C30 * k2 * .5, y = H * .37 + (i + j) * .5 * k2 * .5; if (x < 0 || x > W || y < 0 || y > H) continue; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); } }
    },
    drawVideo(ctx, t, { time } = {}) {
      const f = xf(t), fade = o.fadeAt == null ? 1 : 1 - ss(seg(t, o.fadeAt - .4, o.fadeAt)); if (fade <= 0) return;
      vctx.globalCompositeOperation = 'source-over'; vctx.clearRect(0, 0, vw, vh); vctx.drawImage(hostFrame(host, time ?? t), 0, 0, vw, vh); vctx.globalCompositeOperation = 'destination-in';
      let g = vctx.createLinearGradient(0, 0, vw, 0); const F = fe.side / vw; g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(F, '#000'); g.addColorStop(1 - F, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); vctx.fillStyle = g; vctx.fillRect(0, 0, vw, vh);
      g = vctx.createLinearGradient(0, 0, 0, vh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(fe.top / vh, '#000'); g.addColorStop(1 - fe.bottom / vh, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); vctx.fillStyle = g; vctx.fillRect(0, 0, vw, vh);
      ctx.save(); ctx.globalAlpha = fade; ctx.drawImage(vc, f.cx - vw * f.sc / 2, f.cy - vh * f.sc / 2, vw * f.sc, vh * f.sc); ctx.restore();
    },
    drawCards(ctx, t, { texts } = {}) { for (const c of cards) drawCallout(ctx, c, t, { th, toScreen, anchorAt, video, texts, font: th.font }); },
  };
  api.allocate();
  return api;
}

/** One callout card with a leader to a point in the video. Used by worldLayout; exported so a style can restyle it. */
export function drawCallout(ctx, c, t, { th, toScreen, anchorAt, video, texts, font }) {
  if (t < c.t0 || t > c.t1 + .05) return;
  ctx.font = font(700, 46); const tw = ctx.measureText(c.title).width; ctx.font = font(500, 26); const sw = c.sub ? ctx.measureText(c.sub).width : 0;
  const w = Math.max(330, Math.max(tw, sw) + 128), h = c.sub ? 124 : 94;
  const u = back(seg(t, c.t0, c.t0 + .4), 1.7), out = 1 - ss(seg(t, c.t1 - .35, c.t1)), a = clamp(u * 2) * out; if (a <= 0) return;
  const dir = c.side === 'L' ? -1 : 1, edge = c.side === 'L' ? video.x - 36 : video.x + video.w + 37;
  const x = (c.side === 'L' ? edge - w : edge) + dir * (1 - clamp(u)) * 50 + dir * (1 - out) * 40, y = c.y - h / 2, col = th.hues[c.hue] || c.hue || th.accent;
  ctx.save(); ctx.globalAlpha = a;
  const [ax, ay] = toScreen(t, ...anchorAt(c, t)), sx = c.side === 'L' ? x + w : x, sy = c.y;
  const p = ss(seg(t, c.t0 + .12, c.t0 + .55)) * (1 - ss(seg(t, c.objEnd ?? 1e9, (c.objEnd ?? 1e9) + .3)));   // the leader retracts when its object leaves the video
  ctx.strokeStyle = th.ink; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lerp(sx, ax, p), lerp(sy, ay, p)); ctx.stroke();
  if (p > .92) { ctx.beginPath(); ctx.arc(ax, ay, 9, 0, TAU); ctx.fillStyle = th.paper; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(ax, ay, 3.2, 0, TAU); ctx.fillStyle = col; ctx.fill(); }
  ctx.shadowColor = 'rgba(35,26,44,0.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; rr(ctx, x, y, w, h, 16); ctx.fillStyle = 'rgba(251,247,238,0.98)'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = th.ink; ctx.lineWidth = 3; rr(ctx, x, y, w, h, 16); ctx.stroke();
  isoCube(ctx, x + 44, y + h / 2 + 12, 20, col);
  ctx.font = font(700, 46); ctx.fillStyle = th.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; const ty = c.sub ? y + 56 : y + h / 2 + 16; ctx.fillText(c.title, x + 84, ty);
  if (c.sub) { ctx.font = font(500, 26); ctx.fillStyle = th.muted; ctx.fillText(c.sub, x + 84, y + 96); }
  if (c.tag) { ctx.font = font(700, 20); const tg = ctx.measureText(c.tag).width + 26; rr(ctx, x + w - tg - 14, y - 14, tg, 30, 15); ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = th.paper; ctx.textAlign = 'center'; ctx.fillText(c.tag, x + w - tg / 2 - 14, y + 7); }
  ctx.restore();
  if (texts && u > .95 && out > .98) texts.push({ id: 'card-' + c.id, text: c.title, x0: x + 84, y0: ty - 38, x1: x + 84 + tw, y1: ty + 8 });   // for window.TEXTS / readcheck
}

// ───────────────────────────── bullets: a list that builds up in a content area (for split and pip) ─────────────────────────────
/**
 * Items appear one by one in a rectangle. item = { title, sub?, hue?, t0, t1? }
 * options: theme, titleSize (44), gap (28), max (5: only the latest items stay), top/left offsets inside the rect, texts (array to push readcheck entries into)
 */
export function bullets(ctx, items, t, rect, o = {}) {
  const th = T(o.theme), ts = o.titleSize ?? 44, gap = o.gap ?? 28, x0 = rect.x + (o.left ?? 56);
  const live = items.filter(it => t >= it.t0 && (!it.t1 || t < it.t1 + .3)).slice(-(o.max ?? 5));       // only the latest few stay on screen
  let y = rect.y + (o.top ?? 90);
  for (const it of live) {
    const h = it.sub ? ts + 38 : ts + 8, u = back(seg(t, it.t0, it.t0 + .4), 1.6), out = it.t1 ? 1 - ss(seg(t, it.t1 - .3, it.t1)) : 1;
    const col = th.hues[it.hue] || it.hue || th.accent; ctx.save(); ctx.globalAlpha = clamp(u * 2) * out; ctx.translate((1 - clamp(u)) * -30, 0);
    isoCube(ctx, x0, y - ts * .15, 18, col);
    ctx.font = th.font(700, ts); ctx.fillStyle = o.color ?? th.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(it.title, x0 + 40, y + ts * .3);
    if (it.sub) { ctx.font = th.font(500, ts * .55); ctx.fillStyle = o.subColor ?? th.muted; ctx.fillText(it.sub, x0 + 40, y + ts * .3 + ts * .75); }
    ctx.restore();
    if (o.texts && u > .95 && out > .98) { ctx.font = th.font(700, ts); o.texts.push({ id: 'bullet-' + it.title, text: it.title, x0: x0 + 40, y0: y - ts * .7, x1: x0 + 40 + ctx.measureText(it.title).width, y1: y + ts * .4 }); }
    y += h + gap;
  }
}

// ───────────────────────────── captions ─────────────────────────────
const cueAt = (cues, t) => cues.find(c => t >= c.t0 && t < c.t1);
export const captions = {
  /** A paper card with an ink border that draws itself and a text wipe (map-label look). */
  card(ctx, cues, t, { W = 1920, H = 1080, theme, y, size = 42 } = {}) {
    const th = T(theme), c = cueAt(cues, t); if (!c) return;
    ctx.font = th.font(500, size); const tw = ctx.measureText(c.text).width, cw = tw + 128, ch = size + 36, x = W / 2 - cw / 2, yy = y ?? H - 140;
    const k = eo(seg(t, c.t0, c.t0 + .22)), out = 1 - seg(t, c.t1 - .1, c.t1);
    ctx.save(); ctx.globalAlpha = out; ctx.fillStyle = 'rgba(251,247,238,0.97)'; rr(ctx, x, yy, cw, ch, 14); ctx.fill();
    ctx.strokeStyle = th.ink; ctx.lineWidth = 3; ctx.setLineDash([cw * 2 + ch * 2]); ctx.lineDashOffset = (1 - clamp(k * 2)) * (cw * 2 + ch * 2); rr(ctx, x, yy, cw, ch, 14); ctx.stroke(); ctx.setLineDash([]);
    isoCube(ctx, x + 40, yy + ch / 2 + 7, 11, th.accent);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 70, yy, (cw - 70) * ss((k - .35) / .65), ch); ctx.clip();
    ctx.font = th.font(500, size); ctx.fillStyle = th.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(c.text, x + 70, yy + ch / 2 + 2); ctx.restore(); ctx.restore();
  },
  /** A dark translucent pill with an accent "speaking" dot (keynote look). */
  pill(ctx, cues, t, { W = 1920, H = 1080, theme, y, size = 36 } = {}) {
    const th = T(theme), c = cueAt(cues, t); if (!c) return;
    ctx.font = th.font(500, size); const wd = ctx.measureText(c.text).width, pw = wd + 96, ph = size + 30, x = W / 2 - pw / 2, k = eo(seg(t, c.t0, c.t0 + .16)), out = 1 - seg(t, c.t1 - .1, c.t1), yy = (y ?? H - 66) - ph / 2 + (1 - k) * 10;
    ctx.save(); ctx.globalAlpha = k * out; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 22; rr(ctx, x, yy, pw, ph, ph / 2); ctx.fillStyle = 'rgba(12,17,28,0.86)'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1; rr(ctx, x, yy, pw, ph, ph / 2); ctx.stroke();
    ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(x + 30, yy + ph / 2, 5, 0, TAU); ctx.fill();
    ctx.font = th.font(500, size); ctx.fillStyle = '#E9EEF8'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(c.text, x + 54, yy + ph / 2 + 1); ctx.restore();
  },
};

/**
 * Subtitle cues from the transcript (words.json from prep.sh). Each transcript segment is a sentence: cues break there, at pauses
 * longer than `gap`, after punctuation once a cue has `softChars` characters, and at `maxChars`. Each cue is held for
 * max(minHold, speech + tail) without running into the next one. Fix the text by hand afterwards: speech-to-text mishears names.
 */
export function cuesFromWords(segments, { maxChars = 28, softChars = 12, gap = .5, minHold = 1.8, tail = .6 } = {}) {
  const cues = []; let cur = null;
  const flush = () => { if (cur && cur.text.trim()) cues.push(cur); cur = null; };
  const end = /[，,。.！!？?、;；]$/;
  for (const s of segments) {
    flush();
    for (const w of s.words) {
      const raw = w.w; if (!raw.trim()) continue;
      if (cur && (w.t0 - cur.last > gap || (cur.text + raw).trim().length > maxChars || (end.test(cur.text.trim()) && cur.text.trim().length >= softChars))) flush();
      if (!cur) cur = { t0: w.t0, last: w.t1, text: '' };
      cur.text += raw; cur.last = w.t1;
    }
  }
  flush();
  const fix = t => { t = t.replace(/\s+/g, ' ').trim(); if (/[\u4e00-\u9fff]/.test(t)) t = t.replace(/,/g, '，').replace(/\?/g, '？').replace(/!/g, '！').replace(/\.$/, '。'); return t.replace(/[，、,。.]+$/, ''); };
  return cues.map((c, i) => {
    const next = cues[i + 1] ? cues[i + 1].t0 - .08 : Infinity, t0 = Math.max(0, c.t0 - .05);
    return { t0: +t0.toFixed(2), t1: +Math.min(next, Math.max(t0 + minHold, c.last + tail)).toFixed(2), text: fix(c.text) };
  });
}
