// The crowd: the script of bullet comments, the lane scheduler, and the drawing of one comment.
// Physics: a comment enters at x=1920 at its spawn time and moves left at a constant speed v (px per player-second).
// The scheduler puts it in a lane where it can never overlap, or catch up with, another comment of that lane.
import { mulberry, hash } from '/core/lib.js';
import { Q } from './timeline.js';

export const W = 1920;
export const LANE_Y0 = 134, LANE_H = 50, NLANE = 17;          // lane 0 = top pin, 1..15 scroll, 16 = bottom pin
export const laneY = k => LANE_Y0 + LANE_H * k;
export const SIZES = { s: 32, m: 38, L: 58 };
export const ROLE = { w: '#ffffff', y: '#ffe14d', c: '#62e6ff', p: '#ff8fc9', g: '#8bf59a', r: '#ff5a4f', o: '#ffd36a' };
const FONT = s => `700 ${s}px "Barlow SC"`;
const GAP = 44, VBASE = 392;

// ---- the script: [tau, text, role, size?, extra?]. role: w crowd, y advice, c jokes, p hype, g counting, r alarm, o uploader (gold)
const S = [
  // STARTER: sparse, doubtful, then alive
  [0.00, 'Day 3. If he dies I am moving to a boat', 'o', 'm', { pin: 'top', dur: 5.0 }],
  [-2.8, 'day 3 gang', 'w'], [-2.5, 'I came for the drama', 'c'], [-1.6, 'is the jar judging me', 'c'], [-0.9, 'he already looks mad', 'w'],
  [0.47, 'first', 'w'], [0.94, 'sourdough? brave', 'w'], [1.56, 'he looks flat...', 'w'], [2.19, 'mine died on day 2', 'c'],
  [2.81, 'RIP in advance', 'c'], [3.44, 'float test: drop a spoonful in water', 'y'], [4.06, 'the rubber band marks the start level', 'y'],
  [4.375, 'SPOILER: wait for 0:44', 'r', 'm'], [5.0, 'STOP SPOILING', 'c'], [5.31, 'now I have to wait', 'w'],
  [5.62, 'BUBBLES!!', 'p'], [5.94, 'HE IS ALIVE', 'p', 'L'], [6.56, 'feed it 1:1:1 by weight', 'y'], [6.88, 'name him Doughnald', 'c'],
  // MIX: flour, the hydration quarrel
  [7.8, 'ok flour time', 'w'], [8.4, 'scale > cups. always.', 'y'], [8.95, 'FLOUR EVERYWHERE', 'c'], [9.5, 'the kitchen is a snow globe now', 'c'],
  [10.15, 'how much water tho', 'w'], [10.8, '70%', 'w', 's'], [11.1, 'no, 75', 'w', 's'], [11.4, 'it is 80 trust me', 'w'], [11.72, 'that is soup, not dough', 'c'],
  [12.2, 'everyone has an opinion on hydration', 'c'], [12.9, 'OP: it is 75%. relax everyone', 'o', 'm', { pin: 'bottom', dur: 3.8 }],
  [13.3, 'autolyse 30 min, let it rest', 'y'], [13.75, 'he will not rest', 'c'], [14.4, 'shaggy is correct', 'y'],
  // FOLD: the puddle, then the count
  [15.2, 'that is a puddle', 'w'], [15.62, 'give up', 'w'], [16.0, 'pour it out', 'w'], [16.4, 'it is a lake', 'c'], [16.9, 'trust the folds', 'y'],
  [17.5, '1', 'g', 'L'], [17.82, 'oh it is holding??', 'w'], [18.4, 'stretch and fold x4', 'y'],
  [19.375, '2', 'g', 'L'], [19.7, 'a little tighter', 'w'], [20.15, 'folding like he owes me money', 'c'],
  [21.25, '3', 'g', 'L'], [21.6, 'OK that is DOUGH now', 'p'], [22.1, 'wet your hands!', 'y'],
  [23.125, '4', 'g', 'L'], [23.45, 'SMOOTH', 'p', 'L'], [23.95, 'window pane test next', 'y'], [24.45, 'he did it??', 'w'],
  // PROOF: the crowd falls asleep
  [25.3, '4 hours later', 'c'], [26.25, 'me waiting for my life to start', 'c'], [27.2, 'zzz', 'w', 's'], [29.6, 'still rising', 'w', 's'],
  [31.9, 'is he sleeping', 'w', 's'],
  [33.1, 'DO NOT POKE IT', 'r', 'L'], [33.9, 'poke test: slow spring back means ready', 'y'], [34.5, 'READY', 'p'],
  // BAKE: calm, then the climb
  [35.3, 'lid on for the first half', 'y'], [36.1, 'no peeking', 'w'], [36.9, 'I am peeking', 'c'], [37.9, 'watch the score line', 'y'],
  [38.8, 'something is happening', 'w'], [39.55, 'IT IS MOVING', 'p', 'L'], [40.1, 'BRACE!!', 'r', 'L'],
  [44.0, '0:44 !!!!!', 'p', 'L'], [44.45, 'the spoiler was right', 'w'], [44.9, 'oven spring!!', 'y'],
  // CUT: crackle, warnings, the pause
  [45.6, 'listen to that crust', 'y'], [46.1, 'it is singing', 'c'], [46.65, 'let it cool!!', 'y'], [47.2, 'DO NOT CUT IT YET', 'r', 'L'],
  [47.8, 'still cooking inside', 'y'], [48.3, 'patience is a virtue', 'c'], [48.75, 'I cannot wait', 'w'], [49.2, 'knife is out...', 'w'], [49.55, 'oh no', 'r', 's'],
  // after the pause
  [50.4, 'CUT IT', 'p', 'L'], [50.85, 'crunch', 'w', 's'], [51.3, 'crumb crumb crumb', 'p'], [51.75, 'LOOK AT THAT CRUMB', 'p', 'L'], [52.3, 'open crumb!!', 'y'],
  [52.8, 'Doughnald is a legend', 'c'],
  [55.0, 'Day 4: bagels?', 'o', 'm', { pin: 'top', dur: 2.7 }],
  [54.7, 'DAY 4 YES', 'p', 's'], [54.55, 'or he riots', 'c', 's'],
];

// ---- generators: walls of short reactions and the chatter that fills the gaps
const WALL = ['!!!', '6666', 'OMG', 'EARS!!', 'LOOK AT IT', 'BLOOM', 'HE LIVES', 'YESSS', 'AAAAA', 'wow', 'BIG BOY', 'RISE', 'GOLDEN', 'SPRING!!', 'no way', 'oh my', 'HUGE', 'ALIVE', 'MY EYES'];
const WALL_ROLES = ['p', 'w', 'p', 'y', 'c', 'w', 'p', 'g'];
const REACT = ['so wholesome', 'BREAD', 'I want some', 'butter!!', 'proud mom', 'tears', 'take my coin', 'liked', 'saved', 'worth the wait', 'perfect', 'wow wow wow', 'bread god', 'lesson learned', 'a star'];
function gen(list, rng, t0, t1, step, pool, roles, sizes) {
  for (let t = t0; t < t1; t += step * (0.7 + 0.6 * rng())) {
    const txt = pool[Math.floor(rng() * pool.length)];
    list.push([t, txt, roles[Math.floor(rng() * roles.length)], sizes[Math.floor(rng() * sizes.length)], { gen: 1 }]);
  }
}
const rngA = mulberry(86);
const G = [];
gen(G, rngA, 40.6, 44.1, 0.1, WALL, WALL_ROLES, ['s', 'm', 'm', 'L']);
gen(G, rngA, 53.35, 54.6, 0.24, REACT, ['p', 'w', 'y', 'c', 'p'], ['s', 'm', 'm']);

// ---- layout
let LIST = null;
export function layout(ctx) {
  const rng = mulberry(7);
  const items = [...S, ...G].map(a => ({ t: a[0], text: a[1], role: a[2], size: a[3] || 'm', ex: a[4] || {} }));
  items.sort((a, b) => a.t - b.t || (a.ex.gen ? 1 : -1));
  const lanes = Array.from({ length: NLANE }, () => []);
  const out = [], dropped = [];
  let n = 0;
  for (const it of items) {
    const fs = SIZES[it.size], hero = !it.ex.gen;
    ctx.font = FONT(fs);
    const w = Math.ceil(ctx.measureText(it.text).width) + 8;
    const chars = [...it.text].filter(c => !/\s/.test(c)).length;
    const t0 = Math.round(it.t / Q) * Q;
    if (it.ex.pin) {
      const lane = it.ex.pin === 'top' ? 0 : NLANE - 1;
      out.push({ id: 'c' + n++, text: it.text, role: it.role, fs, w, t0, dur: it.ex.dur, pin: it.ex.pin, lane, y: laneY(lane), v: 0, x0: (W - w) / 2, kind: 'pin', chars });
      continue;
    }
    const need = chars / 15 + 1.5 + 0.18;                          // seconds fully in frame, with margin (readcheck rule)
    let v = VBASE * (0.9 + 0.2 * hash(n * 3.1 + 1));
    v = Math.min(v, (W - w) / need);
    if (it.size === 'L') v = Math.min(v, 380);
    const span = it.size === 'L' ? 2 : 1;
    const endT = t0 + (W + w) / v;
    const cand = [];
    const zoomed = t0 > 38.0 && t0 < 45.5;                         // while the crowd's frame is zoomed, keep out of the lanes it would crop
    for (let k = 1; k + span - 1 <= NLANE - 2; k++) {
      const yy = laneY(k) + (span === 2 ? LANE_H / 2 : 0);
      if (zoomed && (yy - fs * 0.6 < 206 || yy + fs * 0.6 > 858)) continue;
      let ok = true, lastT = -9;
      for (let s = 0; s < span && ok; s++) for (const o of lanes[k + s]) {
        // new comment b behind a: its head must stay GAP behind a's tail until a has left
        const aEnd = o.t0 + (W + o.w) / o.v;
        const f = tt => (W - v * (tt - t0)) - ((W - o.v * (tt - o.t0)) + o.w + GAP);   // >= 0 means clear
        if (o.t0 > t0 + 1e-6) { ok = false; break; }                               // keep spawn order inside a lane
        if (f(t0) < 0 || f(Math.min(aEnd, endT)) < 0) { ok = false; break; }
        lastT = Math.max(lastT, o.t0);
      }
      if (ok) cand.push({ k, lastT, j: hash(n * 7.7 + k) });
    }
    if (!cand.length) { if (hero) throw new Error('no lane for hero comment: ' + it.text + ' at ' + it.t); dropped.push(it.text); continue; }
    cand.sort((a, b) => (a.lastT + a.j * 1.2) - (b.lastT + b.j * 1.2));
    const c = it.size === 'L' ? cand[Math.floor(hash(n) * Math.min(4, cand.length))] : cand[0];
    const lane = c.k;
    const y = laneY(lane) + (span === 2 ? LANE_H / 2 : 0);
    const cm = { id: 'c' + n++, text: it.text, role: it.role, fs, w, t0, v, lane, span, y, kind: 'run', chars, end: endT };
    for (let s = 0; s < span; s++) lanes[lane + s].push(cm);
    out.push(cm);
  }
  LIST = out;
  if (dropped.length) console.warn('dropped fillers:', dropped.length);
  return out;
}
export const comments = () => LIST;

// ---- state at player time tau: left x of a running comment, or null when not on screen
export function posOf(c, tau) {
  if (c.kind === 'pin') {
    if (tau < c.t0 || tau >= c.t0 + c.dur) return null;
    return { x: c.x0, a: Math.min(1, (tau - c.t0) / 0.25, (c.t0 + c.dur - tau) / 0.3) };
  }
  if (tau < c.t0) return null;
  const x = W - c.v * (tau - c.t0);
  if (x + c.w < -20) return null;
  return { x, a: 1 };
}

const strokeCol = 'rgba(8,10,18,0.86)';
export function drawComment(ctx, c, p) {
  ctx.font = FONT(c.fs); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  const x = p.x + 4, y = c.y;
  ctx.globalAlpha = (c.kind === 'pin' ? 1 : 0.94) * Math.max(0, p.a);
  if (c.role === 'o') {                                    // the uploader's bullet sits on a gold plate
    ctx.fillStyle = 'rgba(30,22,6,0.62)'; ctx.strokeStyle = 'rgba(255,211,106,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x - 16, y - c.fs * 0.78, c.w + 24, c.fs * 1.56, c.fs * 0.78); ctx.fill(); ctx.stroke();
  }
  ctx.lineWidth = Math.max(4, c.fs * 0.17); ctx.strokeStyle = strokeCol; ctx.strokeText(c.text, x, y + 1);
  ctx.fillStyle = ROLE[c.role]; ctx.fillText(c.text, x, y + 1);
  ctx.globalAlpha = 1;
}
export const FONT_LOAD = ['700 38px "Barlow SC"', '500 22px "Barlow SC"', '800 30px "Barlow SC"'];
