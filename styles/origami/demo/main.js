// Origami proof: shots are chosen with ?shot=<name>; render(t) draws any frame deterministically.
import * as THREE from 'three';
import { makeWorld } from './engine/world.js';
import { creaseLine, foldArrow, badge, legend, INK } from './engine/diagram.js';
import { halving, diagonal, fan, creaseSheet } from './models.js';

const W = innerWidth, H = innerHeight, Q = new URLSearchParams(location.search), SHOT = Q.get('shot') || 'seq';
const world = makeWorld(W, H);
document.getElementById('stage').appendChild(world.renderer.domElement);
const hud = document.createElement('canvas'); hud.id = 'hud'; hud.width = W; hud.height = H; document.getElementById('stage').appendChild(hud);
const hx = hud.getContext('2d');
await document.fonts.load('700 30px Fredoka');

const DUO = { front: '#f0a07a', back: '#7390cc', backPattern: 'dots', patternColor: '#f2ebdb' };           // persimmon / indigo with white dots
const FAN = { front: '#7a97cf', back: '#f1eadb', backPattern: 'waves', patternColor: '#c9bfa8' };   // cream waves / persimmon
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const hold = (p) => [[0, p], [100, p]];

const SHOTS = {};

// three frames of one fold sequence: the third halving of a sheet (four layers fold together)
SHOTS.seq = () => {
  const s = halving(3, { t0: .4, gap: 1.4, dur: 1, at: [0, 0] });
  world.mount(s, { ...DUO, seed: 11 });
  const P = (x, y, h = .0012) => s.toWorld(x, y, h);
  return {
    cam: () => ({ pos: [.06, .235, .165], look: [.035, 0, .028], aper: 1.2, fov: 28 }),
    hud: (ctx, t) => {
      const r = Math.min(1, Math.max(0, (t - 3.0) / .5)), o = Math.min(1, Math.max(0, (4.6 - t) / .4));
      if (r <= 0 || o <= 0) return; ctx.globalAlpha = o;
      creaseLine(ctx, world, P(.0375, -.088), P(.0375, .013), { kind: 'valley', reveal: r, scale: .9 });
      foldArrow(ctx, world, P(.071, -.02), P(.006, -.02, .003), { lift: .045, scale: .9, reveal: r });
      const p = world.px(P(.0375, .026)); badge(ctx, p[0], p[1], '3', { scale: .95 }); ctx.globalAlpha = 1;
    },
  };
};

// the hero: a diagonal fold in flight, with its diagram, and a pleated fan behind
SHOTS.hero = () => {
  const s = diagonal({ w: .16, at: [-.02, -.005], rot: 0, keys: hold(.42), curl: .32 });
  world.mount(s, { ...DUO, seed: 21 });
  const f = fan({ n: 9, w: .15, h: .11, at: [.17, .085], rot: .22, keys: hold(.5) });
  world.mount(f, { ...FAN, seed: 5 });
  const L = .08, P = (x, y, h = .001) => s.toWorld(x, y, h);
  return {
    cam: () => ({ pos: [.06, .39, .30], look: [.02, .0, -.02], aper: 2.6, fov: 30, focus: .49 }),
    hud: (ctx) => {
      creaseLine(ctx, world, P(-L - .012, -L - .012), P(L + .012, L + .012), { kind: 'valley', scale: 1.05 });
      foldArrow(ctx, world, P(-L * .88, L * .88, .002), P(L * .86, -L * .86, .003), { lift: .075, scale: 1.05 });
      const p = world.px(P(-L - .022, -L - .022)); badge(ctx, p[0], p[1], '1', { scale: 1.1 });
    },
  };
};

// crease pattern: five halvings folded and unfolded again; the lines left behind are the picture
SHOTS.creases = () => {
  const s = creaseSheet(5, { w: .17, unfoldDur: 3, corner: true });
  world.mount(s, { ...DUO, seed: 31 });
  return {
    cam: () => ({ pos: [.0, .47, .12], look: [.0, 0, .0], up: [0, 0, -1], aper: 1.6, fov: 28 }),
    hud: (ctx, t) => {
      const ck = world.sheets[0]; const sh = ck.sheet; if (t < 6.6) return; const nz = sh.chords.length;
      for (const c of sh.chords) {
        const A = sh.toWorld(c.a[0], c.a[1], .0006), B = sh.toWorld(c.b[0], c.b[1], .0006);
        creaseLine(ctx, world, A, B, { kind: c.kind, scale: .5, thin: true, col: c.kind === 'valley' ? '#fbf3e2' : INK });
      }
      legend(ctx, 70, H - 160, { scale: 1 });
    },
  };
};

// the pleated fan alone, low and close
SHOTS.fan = () => {
  const f = fan({ n: 12, w: .22, h: .12, at: [0, 0], rot: -.12, keys: hold(.62) });
  world.mount(f, { ...FAN, seed: 9 });
  return { cam: () => ({ pos: [-.005, .15, .245], look: [-.048, .012, .0], aper: 5, fov: 28, focus: .29 }) };
};

const scene = SHOTS[SHOT]();
window.DUR = 8;
window.render = (t) => {
  world.update(t); world.cam(Q.get('cam') ? { pos: Q.get('cam').split(',').slice(0, 3).map(Number), look: Q.get('cam').split(',').slice(3, 6).map(Number), aper: 0, fov: 30 } : scene.cam(t)); world.render();
  hx.clearRect(0, 0, W, H); if (scene.hud && !Q.get('nohud')) scene.hud(hx, t);
};
window.READY = true;
