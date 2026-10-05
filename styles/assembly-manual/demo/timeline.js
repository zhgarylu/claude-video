// One timeline for picture, type and sound. 100 BPM: beat 0.6 s, bar 2.4 s. Pages start on bar lines.
// Local times (u) inside a page are seconds since the page started; the page slides in during u 0 to SLIDE.
export const BPM = 100, BEAT = 60 / BPM, BAR = 4 * BEAT, SLIDE = 0.55;
export const DUR = 58;
export const EV = [];                                   // sound events {t, type, v}; written once, up front, so events.mjs finds them
export const ev = (t, type, v = 1, extra = {}) => EV.push({ t: +t.toFixed(3), type, v, ...extra });

export const PAGES = [
  { id: 'cover', t0: 0, t1: 4.8, no: 0 },
  { id: 'parts', t0: 4.8, t1: 12, no: 2 },
  { id: 's1', t0: 12, t1: 19.2, no: 3, n: 1 },
  { id: 's2', t0: 19.2, t1: 28.8, no: 4, n: 2 },
  { id: 's3', t0: 28.8, t1: 36, no: 5, n: 3 },
  { id: 's4', t0: 36, t1: 40.8, no: 6, n: 4 },
  { id: 's5', t0: 40.8, t1: 48, no: 7, n: 5 },
  { id: 'done', t0: 48, t1: 58, no: 8 },
];
export const page = id => PAGES.find(p => p.id === id);

// Narration starts (seconds); text and caption come from lines.json, length from voices/dur.json.
export const VO = [['v1', .6], ['v2', 5.5], ['v3', 12.7], ['v4', 19.5], ['v5', 29.4], ['v6', 36.6], ['v7', 41.0], ['v8', 49.3]];

// Motions are [lineStart, flyStart, land] in page time; "land" is the snap. Offsets are from where the part waits.
export const T = {
  cover: { land: { base: .6, pole: 1.2, arm: 1.8, carafe: 2.4, ring: 3.0, cone: 3.6 }, fly: .5 },
  parts: { cell0: .8, cellStep: .3, tickA: 2.4, tickStep: .2, tickG: 4.0, tickH: 4.9 },
  s1: { num: .6, qty: 1.2, pole: [.9, 1.2, 1.8], scr: [[1.8, 2.1, 2.4], [2.4, 2.7, 3.0]], bub: 3.6, key: [4.2, 4.8], turn1: [4.8, 5.4], hop: [5.4, 5.7], turn2: [5.7, 6.3] },
  s2: { num: .6, qty: 1.2, arm: [1.2, 1.8, 3.0], inset: 4.8, bub: 5.4, turn: [6.0, 7.8] },
  s3: { num: .6, qty: 1.2, ring: [1.2, 1.8, 2.4], scr: [[4.2, 4.5, 4.8], [4.8, 5.1, 5.4]], dn: 3.6, ok: 6.0 },
  s4: { num: .6, qty: 1.2, cone: [1.2, 1.5, 2.4] },
  s5: { num: .6, qty: 1.2, carafe: [1.2, 1.8, 2.4], bub: 3.0, bubOff: 5.4 },
  done: { drop0: .6, dropStep: 1.2, drop1: 1.8, fall: .38, dot0: 2.4, dotStep: .24, bub: 4.8, badge: 1.2 },
};

const A = id => page(id).t0;
// ---- sound events, derived from the same numbers ----
for (const p of PAGES) if (p.id !== 'cover') ev(p.t0 - .1, 'whoosh', p.id === 'done' ? .35 : 1);
for (const [id, t] of VO) ev(t, 'vo', 1, { id });
{ const c = T.cover, a = A('cover'); for (const k in c.land) ev(a + c.land[k], 'snap', .8); }
{ const p = T.parts, a = A('parts'); for (let k = 0; k < 8; k++) ev(a + p.cell0 + k * p.cellStep, 'cell', .7);
  for (let k = 0; k < 6; k++) ev(a + p.tickA + k * p.tickStep, 'tick', .8); ev(a + p.tickG, 'tick', .9); ev(a + p.tickH, 'tick', 1); }
for (const id of ['s1', 's2', 's3', 's4', 's5']) { const a = A(id), s = T[id]; ev(a + s.num, 'num'); ev(a + s.qty, 'pop', .8); }
{ const s = T.s1, a = A('s1'); ev(a + s.qty + .3, 'pop', .6); ev(a + s.pole[2], 'snap'); ev(a + s.scr[0][2], 'snap', .6); ev(a + s.scr[1][2], 'snap', .6);
  ev(a + s.bub, 'zoom'); for (let u = s.turn1[0]; u < s.turn1[1]; u += .15) ev(a + u, 'ratchet', .8);
  for (let u = s.turn2[0]; u < s.turn2[1]; u += .15) ev(a + u, 'ratchet', .8); ev(a + s.turn2[1], 'click', 1); }
{ const s = T.s2, a = A('s2'); ev(a + s.arm[1], 'slide', .6); ev(a + s.arm[2], 'snap'); ev(a + s.inset, 'pop'); ev(a + s.bub, 'zoom');
  for (let u = s.turn[0]; u < s.turn[1]; u += .3) ev(a + u, 'ratchet', .9); ev(a + s.turn[1], 'click', 1); }
{ const s = T.s3, a = A('s3'); ev(a + s.qty + .3, 'pop', .6); ev(a + s.ring[1], 'slide', .6); ev(a + s.ring[2], 'snap'); ev(a + s.scr[0][2], 'snap', .6); ev(a + s.scr[1][2], 'snap', .6);
  ev(a + s.dn, 'pop'); ev(a + s.dn + .45, 'stamp'); ev(a + s.ok, 'ding', .7); }
{ const s = T.s4, a = A('s4'); ev(a + s.cone[2], 'snap', 1); }
{ const s = T.s5, a = A('s5'); ev(a + s.carafe[1], 'slide', .7); ev(a + s.carafe[2], 'snap', 1); ev(a + s.bub, 'zoom'); ev(a + s.bubOff, 'zoomoff', .5); }
{ const s = T.done, a = A('done'); ev(a + s.drop0 + s.fall, 'drop', 1);
  for (let k = 0; a + s.drop1 + k * s.dropStep < 57.4; k++) ev(a + s.drop1 + k * s.dropStep + s.fall, 'drop', .8);
  ev(a + s.badge, 'ding', 1); for (let k = 0; k < 5; k++) ev(a + s.dot0 + k * s.dotStep, 'tick', .8); ev(a + s.bub, 'zoom'); }

// captions: one per narration line, held for the line + 0.6 s (never under 1.8 s), cut when the next one starts
export function cues(lines, dur) {
  const out = VO.map(([id, t]) => { const l = lines.find(x => x.id === id); return { t0: t, t1: t + Math.max(1.8, (dur[id] || 1) + .6), text: l.cap || l.text, id }; });
  for (let k = 0; k < out.length - 1; k++) out[k].t1 = Math.min(out[k].t1, out[k + 1].t0 - .05);
  return out;
}
