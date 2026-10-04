// Super 8 demo page: render(t) draws one film frame. t is quantised to 18 fps (the film frame f); the picture,
// the camera, the weave, grain, dust and scratches are all functions of f, so any frame renders alone.
// The page is rendered at 24 fps; every artefact is held on floor(t*18), so it reads as 18 fps.
import { clamp, lerp, seg, ss, eio, eo, vnoise, hash, mulberry, canvas, W, H, css, ell, lin, rad } from './engine/util.js';
import { Film, mechanics, damage } from './engine/film.js';
import { drawBeach } from './engine/beach.js';
import { drawStreet } from './engine/street.js';
import { drawCard } from './engine/card.js';
import { SHOTS, SPLICES, T, DUR, BAR, BEAT } from './timeline.js';

const FPS = 18, Q = new URLSearchParams(location.search);
window.DUR = DUR;
const out = document.getElementById('out');
const film = new Film(out);
const src = canvas(W, H), sctx = src.getContext('2d');
const dmg = canvas(W, H), dctx = dmg.getContext('2d');

// handheld: slow drift + a fast tremor + a breath in zoom
const hand = (ts, a = 1, s = 0) => ({
  x: ((vnoise(ts * .8 + s) - .5) * 34 + (vnoise(ts * 3.3 + s * 3) - .5) * 7) * a,
  y: ((vnoise(ts * .7 + s + 20) - .5) * 22 + (vnoise(ts * 3.7 + s * 5) - .5) * 6) * a,
  rot: ((vnoise(ts * .6 + s + 9) - .5) * .028 + (vnoise(ts * 2.9 + s) - .5) * .004) * a,
  z: (vnoise(ts * .5 + s + 4) - .5) * .02 * a,
});
const hunt = (s, amp = .9) => s < 0 ? amp : amp * Math.abs(Math.exp(-2.4 * s) * Math.cos(5.2 * s));
const shotOf = ts => SHOTS.find(s => ts >= s.t0 && ts < s.t1) || SHOTS[SHOTS.length - 1];

// the thumb over the lens: a big, out-of-focus, red-lit blob growing from the lower right
function thumb(ctx, k) {
  if (k <= 0) return;
  ctx.save(); ctx.filter = 'blur(26px)';
  const cx = W * (1.0 - .22 * k), cy = H * (1.35 - .72 * k), rx = 360 * k + 60, ry = 430 * k + 80;
  ctx.fillStyle = rad(ctx, cx, cy, 0, Math.max(rx, ry), [[0, '#8a4a38'], [.55, '#6a2f22'], [.85, '#c2503a'], [1, '#e0603a', 0]]);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, -.5, 0, 7); ctx.fill();
  ctx.restore();
}

window.READY = false;
Promise.all(['Caveat Brush', 'Courier Prime', 'Reenie Beanie'].map(n => document.fonts.load(`700 40px "${n}"`))).then(() => { window.READY = true; });

const BASE = { focus: .03, mb: 0, flash: 0, expo: 1, fade: 0, slip: 0, grain: .115, sat: .9, vig: .7, warm: 1, lift: 1.1, halo: .5, surr: .26 };

// per-shot recipes: draw into sctx and return post-pass overrides
const SHOT = {
  card(lt, cam) {
    const wr = clamp((lt - .5) / 2.6);
    drawCard(sctx, { t: lt, cam: { ...cam, z: cam.z + 1.04 }, wr, stampT: lt - T.stamp });
    const a = 1.25 * Math.pow(clamp(1 - lt / 1.1), 1.6) + .12 * (1 - seg(lt, 1.1, 3));
    return { expo: 1.02, focus: .02 + hunt(lt - .35, .5) * .6, leak: [a * 1.5, Math.PI, 4.3, .85], flash: .9 * Math.pow(clamp(1 - lt / .28), 2) };
  },
  street(lt, cam) {
    const push = seg(lt, 0, 4.722), wk = seg(lt, 4.722, 5.0), ew = eio(wk);
    const x = lerp(lerp(150, 250, ss(push)), -300, ew), y = lerp(40, 215, ew), z = lerp(1.12 + .22 * push, 1.36 + .05 * seg(lt, 5, 8.33), ew);
    const wave = ss(seg(lt, 1.7, 2.3)) * (1 - ss(seg(lt, 4.0, 4.6)));
    drawStreet(sctx, { t: lt, wave, cam: { x: cam.x + x, y: cam.y + y, rot: cam.rot, z: cam.z + z } });
    return { focus: lt < 4.722 ? .02 + hunt(lt - .1, .55) * .7 : hunt(lt - 5.0, .9) * .9 + .02, mb: wk > 0 && wk < 1 ? .11 * Math.sin(Math.PI * wk) : 0 };
  },
  beach(lt, cam) {
    drawBeach(sctx, { t: lt, cam: { ...cam, x: cam.x + 80 + lerp(0, 90, ss(lt / 11.667)), y: cam.y + 35, z: cam.z + 1.22 }, tod: 0, pip: 'run' });
    return { focus: .02 + hunt(lt, .5) * .5, expo: 1 };
  },
  medium(lt, cam) {
    drawBeach(sctx, { t: lt + 11.7, cam: { ...cam, x: cam.x - 30 + lerp(0, 24, lt / 5), y: cam.y + 120, z: cam.z + 1.9 + .14 * ss(lt / 5) }, tod: 0, pip: 'none', dadX: 780, dadY: 660 });
    return { focus: .02 + hunt(lt, .7) * .6 };
  },
  golden(lt, cam) {
    drawBeach(sctx, { t: lt + 20, cam: { ...cam, x: cam.x + 220 - 14 * lt / 6.667, y: cam.y + 30, z: cam.z + 2.2 + .22 * ss(lt / 6.667) }, tod: 1, pip: 'stand', pipX: 700, dadX: 250, dadY: 650 });
    return { focus: .02 + hunt(lt, .7) * .6, warm: 1.2, halo: .6, expo: .98 };
  },
  handover(lt, cam) {
    // A: Pip big, reaching toward the lens. B: the thumb. C: down to sand, then up to the sky. D: whip across.
    const tk = ss(seg(lt, 1.667, 1.95)) * (1 - ss(seg(lt, 2.45, 2.7)));
    const down = ss(seg(lt, 1.8, 2.7)), up = ss(seg(lt, 3.7, 4.5)), back = ss(seg(lt, 4.55, 4.98));
    const wk = seg(lt, 5.0, 5.9), ew = eio(wk), shake = 1 + 2.4 * (down * (1 - up) + tk);
    let y = 74 + 250 * down - 560 * up + 330 * back + 0 * ew, z = 2.2 + .5 * down - .35 * up - .25 * back, rot = .32 * down - .55 * up + .22 * back;
    let x = 320 - 170 * down * (1 - up) + 140 * up;
    x = lerp(x, 300, ew); y = lerp(y, 20, ew); z = lerp(z, 1.45, ew); rot = lerp(rot, 0, ew);
    if (lt < 2.0) { x = 320; y = 74; z = 2.2; rot = 0; }
    const pipOn = lt < 2.05;
    drawBeach(sctx, { t: lt + 30, cam: { x: cam.x * shake + x, y: cam.y * shake + y, rot: cam.rot * shake + rot, z: cam.z + z }, tod: 1, pip: pipOn ? 'hand' : 'none', pipX: 800, who: lt < 2.0 ? 'dad' : 'pip', dadX: 240, dadY: 640 });
    thumb(sctx, tk);
    const dark = tk * .55;
    return { focus: lt < 1.667 ? Math.abs(Math.cos(lt * 2.2)) * .35 * (1 - seg(lt, .3, 1.3)) + .02 : (tk > 0 ? .85 : down > 0 && up < 1 ? .35 + .3 * Math.sin(lt * 5) ** 2 : .15), expo: 1 - dark, warm: 1.2, halo: .6,
      mb: wk > 0 && wk < 1 ? .1 * Math.sin(Math.PI * wk) : (up > 0 && up < 1 ? .03 : 0), leak: [tk * .55, 0, 8.1, .6] };
  },
  dad(lt, cam) {
    const walk = ss(seg(lt, .75, 1.0)) * (1 - ss(seg(lt, 2.4, 2.8))), dx = lerp(1100, 780, eio(seg(lt, .8, 2.8)));
    const push = ss(seg(lt, 4, 6.667));
    drawBeach(sctx, { t: lt + 40, cam: { ...cam, x: cam.x + 300, y: cam.y + 20 - 6 * push, z: cam.z + 1.45 + .28 * push }, tod: 1, pip: 'none', who: 'pip',
      dad: { x: dx, y: 520 + 10 * push, f: -1, walk, wave: ss(seg(lt, 3.0, 3.3)) * (1 - ss(seg(lt, 5.4, 5.8))), laugh: ss(seg(lt, 3.4, 3.6)) } });
    return { focus: lt < .6 ? .9 * (1 - lt / .6) + .05 : .02 + hunt(lt - 2.6, .45) * .45, warm: 1.2, halo: .6 };
  },
  burn(lt, cam) {
    const tt = lt + 6.667 + (lt > 1.0 ? Math.pow(lt - 1, 2) * 9 : 0), fd = Math.floor(lt * FPS);
    drawBeach(sctx, { t: tt, cam: { ...cam, x: cam.x + 300, y: cam.y + 14, z: cam.z + 1.7 }, tod: 1, pip: 'none', who: 'pip',
      dad: { x: 780, y: 530, f: -1, walk: 0, wave: 1 - seg(lt, .0, .8), laugh: 1 } });
    const slip = lt > .45 ? (fd % 5 === 0 ? .1 : 0) + (lt > 1.0 ? (fd % 3 === 0 ? -.22 * seg(lt, 1, 1.8) : .06 * Math.sin(fd * 2.3)) : 0) : 0;
    return { slip, flash: 3.4 * Math.pow(seg(lt, 1.05, 2.4), 2), leak: [2.2 * seg(lt, .3, 1.6), 0, 3.3, .9], leak2: [2 * seg(lt, .6, 1.9), Math.PI, 9.1, .9], warm: 1.2, halo: .6, expo: 1 + .25 * seg(lt, .8, 2.4), focus: .02 + .3 * seg(lt, 1.6, 2.4) };
  },
  end(lt, cam) {
    drawCard(sctx, { t: lt, cam: { ...cam, z: cam.z + 1.04 }, end: true, wr: clamp((lt - .25) / 1.9), stampT: lt - (T.stamp2 - 52.5) });
    const a = 1.4 * Math.pow(clamp(1 - lt / 1.0), 1.6);
    return { expo: 1.02, focus: .02 + hunt(lt - .25, .5) * .5, flash: 2.4 * Math.pow(clamp(1 - lt / .45), 2), leak: [a * 1.5, 0, 6.6, .85], leak2: [a, Math.PI, 2.1, .85], fade: .88 * ss(seg(lt, 3.55, 4.1667)) };
  },
};

window.render = (tIn) => {
  const f = Q.get('f') != null ? +Q.get('f') : Math.floor(tIn * FPS + 1e-4), ts = f / FPS;
  const S = Q.get('shot') ? SHOTS.find(s => s.id === Q.get('shot')) : shotOf(ts), lt = Q.get('shot') ? ts : ts - S.t0;
  const cam = hand(ts, S.id === 'card' || S.id === 'end' ? .25 : 1, S.id.length);
  const post = { ...BASE, f, leak: [0, 0, 0, 0], leak2: [0, 0, 0, 0], ...SHOT[S.id](lt, cam) };
  post.leak ||= [0, 0, 0, 0]; post.leak2 ||= [0, 0, 0, 0];
  // splices: a flash, a slip of the frame line and a short leak from the top edge, for three film frames
  if (!Q.get('shot')) for (const sp of SPLICES) {
    const fd = Math.floor((ts - sp.t) * FPS + 1e-4);
    if (fd >= 0 && fd < 4) { post.flash += [.9, .5, .2, 0][fd] * sp.amp; post.slip += [.09, -.04, 0, 0][fd] * sp.amp; post.leak2 = [[1.4, -1.5708, sp.t * 3, .8], [.9, -1.5708, sp.t * 3, .8], [.4, -1.5708, sp.t * 3, .8], [0, 0, 0, 0]][fd]; }
  }
  const m = mechanics(f); post.jx = m.jx; post.jy = m.jy; post.rot = m.rot; post.lamp = m.lamp;
  sctx.save(); sctx.setTransform(1, 0, 0, 1, 0, 0);
  damage(dctx, f);
  film.draw(src, dmg, post);
  sctx.restore();
  return { f, shot: S.id, lt };
};

// text on the screen, for readcheck (boxes in 1920x1080 pixels; full text from its first visible frame)
window.TEXTS = (t) => {
  const f = Math.floor(t * FPS + 1e-4), ts = f / FPS, S = shotOf(ts), lt = ts - S.t0, o = [];
  if (S.id === 'card') {
    const wr = clamp((lt - .5) / 2.6);
    if (wr > 0) o.push({ id: 'title', text: 'ALDERSEA', x0: 470, y0: 250, x1: 1450, y1: 480 });
    if (wr > .55) o.push({ id: 'sub', text: "summer '76", x0: 670, y0: 580, x1: 1240, y1: 700 });
    if (lt >= T.stamp) o.push({ id: 'stamp', text: '14 AUG 76', x0: 1040, y0: 720, x1: 1500, y1: 930 });
  }
  if (S.id === 'end') {
    const wr = clamp((lt - .25) / 1.9);
    if (wr > 0) o.push({ id: 'end', text: 'Dad was here too.', x0: 520, y0: 260, x1: 1400, y1: 700 });
    if (lt >= T.stamp2 - 52.5) o.push({ id: 'stamp2', text: '14 AUG 76', x0: 1040, y0: 720, x1: 1500, y1: 930 });
  }
  return o;
};

// sound events for the mixer (all on the timeline grid; see mix.py)
window.EV = [
  { t: 0, type: 'start' },
  ...[.5, .7, .95, 1.15, 1.35, 1.5, 2.1, 2.3, 2.5, 2.75, 3.0].map(t => ({ t, type: 'pen' })),
  { t: T.stamp, type: 'stamp' },
  ...SPLICES.map(s => ({ t: s.t, type: 'splice', amp: s.amp })),
  { t: T.thunk, type: 'thunk' }, { t: T.thunk + BAR, type: 'thunk', v: .6 },
  { t: T.whip, type: 'whip' }, { t: 11.2, type: 'bucket' },
  { t: T.thumb0, type: 'thumb' }, { t: T.whip2, type: 'whip', v: .8 },
  { t: T.enter, type: 'step' }, { t: T.enter + .35, type: 'step' }, { t: T.enter + .7, type: 'step' }, { t: T.enter + 1.05, type: 'step' }, { t: T.enter + 1.4, type: 'step' },
  { t: T.burn0, type: 'burn' },
  ...[T.card2 + .3, T.card2 + .8, T.card2 + 1.3, T.card2 + 1.8].map(t => ({ t, type: 'pen' })),
  { t: T.stamp2, type: 'stamp' },
];
