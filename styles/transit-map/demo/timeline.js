// One timeline for picture, voice, score, foley and subtitles. Pure data: no DOM, runs in the page and in Node.
// 120 BPM, 4/4: a beat is 0.5 s, a bar 2 s; bar n starts at 2(n-1) s. Key G.
import { LINES, ST, delayOf, ROUTE } from './network.js';

export const BPM = 120, BEAT = 0.5, BAR = 2.0, DUR = 54.0;

export const T = {
  ping0: 0.25,                      // the dot on blank paper
  river0: 1.4, river1: 3.4,         // the river sweeps in
  pen: { fern: 3.0, copper: 3.5, violet: 4.0, ring: 4.5, saffron: 5.0 }, penDur: 1.8,
  morph0: 8.5,                      // the first vertex (centre of the city) starts to straighten
  lock: 14.0,                       // everything is on the grid: chime, then silence
  cartouche: 13.5,
  silence0: 14.1, silence1: 15.0,
  legend: 15.0,                     // legend panel wiped in
  angGhost: 16.0, angSnap: 17.5,    // a 30 degree stroke snaps to 45
  rosette: [15.75, 16.5, 17.25],
  swatch: [20.5, 21.0, 21.5, 22.0, 22.5], caliper: 22.0,
  rowStop: 23.5, calloutStop: 24.0, calloutChange: 25.0,
  zoneRow: 27.0, zone2: 27.5, zone1: 28.0, zoneTags: 28.5,
  marker: 30.5, flag: 33.0, dim0: 33.5, dim1: 34.5, journeyCard: 34.0,
  dep1: 35.0, arr1: 37.5, dep2: 38.5, arr2: 41.5, dep3: 42.5, arr3: 45.5,
  craneOut: 45.5, legendOut: 49.5, finalPulse: 50.0, title: 50.0,
};

// voice lines (ids match lines.json); `stripe` is the colour of the line the caption is talking about
export const VO = [
  { id: 'v1', t: 1.8, stripe: 'ink', text: 'This is Halden. Rivers bend, rails curve, and nothing lines up.' },
  { id: 'v2', t: 8.0, stripe: 'copper', text: 'So the map tells a useful lie. It throws away distance, and keeps the connections.' },
  { id: 'v3', t: 15.15, stripe: 'fern', text: 'Rule 1. Horizontal, vertical, or 45 degrees. Nothing else.' },
  { id: 'v4', t: 20.05, stripe: 'violet', text: 'Rule 2. One line, one colour, one weight.' },
  { id: 'v5', t: 23.3, stripe: 'ring', text: 'Rule 3. A tick is a stop. A ring is a change.' },
  { id: 'v6', t: 26.9, stripe: 'saffron', text: 'Zones tell you what it costs.' },
  { id: 'v7', t: 30.4, stripe: 'ink', text: 'You are here, at Quill Lane. The lantern festival is at Rook Point.' },
  { id: 'v8a', t: 35.0, stripe: 'fern', text: 'Fern line, change at Linden.' },
  { id: 'v8b', t: 38.5, stripe: 'ring', text: 'Round the Ring, change at Ember Wharf.' },
  { id: 'v8c', t: 42.7, stripe: 'saffron', text: 'Saffron to the end.' },
  { id: 'v9', t: 46.7, stripe: 'ink', text: "A map doesn't show the city. It shows you the way." },
];

// ---- the train ------------------------------------------------------------------------------------------------
export const LEGS = [
  { t0: T.dep1, t1: T.arr1 }, { t0: T.dep2, t1: T.arr2 }, { t0: T.dep3, t1: T.arr3 },
];
const sm = u => u * u * u * (u * (6 * u - 15) + 10);   // smootherstep
const dsm = u => 30 * u * u * (1 - u) * (1 - u);
// where the train is: leg index (0..2) and 0..1 along it; `speed` is in legs per second (for the wheel sound)
export function trainState(t) {
  if (t < LEGS[0].t0) return { leg: 0, f: 0, moving: false, speed: 0, dwell: false };
  for (let i = 0; i < LEGS.length; i++) {
    const L = LEGS[i];
    if (t < L.t1) { const u = (t - L.t0) / (L.t1 - L.t0); return { leg: i, f: sm(u), moving: true, speed: dsm(u) / (L.t1 - L.t0), dwell: false }; }
    const next = LEGS[i + 1];
    if (!next || t < next.t0) return { leg: next ? i + 1 : i, f: next ? 0 : 1, moving: false, speed: 0, dwell: !!next };
  }
}

// ---- events for the mixer ------------------------------------------------------------------------------------------
export function events() {
  const ev = [];
  ev.push({ t: T.ping0, type: 'ping', v: 1, f: 392 });
  ev.push({ t: T.finalPulse, type: 'ping', v: 1, f: 196 });
  ev.push({ t: T.river0, type: 'river', d: T.river1 - T.river0 });
  for (const [k, t] of Object.entries(T.pen)) ev.push({ t, type: 'pen', d: T.penDur, line: k });
  // corner snaps: the morph wave reaches each corner of each line (distinct vertices only)
  const seen = new Set();
  for (const L of LINES) for (let i = 0; i < L.wps.length; i++) {
    const w = L.wps[i]; if (!w.corner) continue; if (!L.closed && (i === 0 || i === L.wps.length - 1)) continue;
    const key = w.u.join(','); if (seen.has(key)) continue; seen.add(key);
    ev.push({ t: T.morph0 + w.w + .5, type: 'snap', x: w.u[0] / 32 * 2 - 1, k: ev.length });
  }
  // ticks and rings set down as stations lock
  const sts = Object.values(ST).map(s => ({ s, t: T.morph0 + delayOf(s.p[0], s.p[1]) + 1.0 })).sort((a, b) => a.t - b.t);
  sts.forEach(({ s, t }, i) => ev.push({ t, type: s.lines.length > 1 ? 'ringset' : 'tickset', x: s.p[0] / 32 * 2 - 1, i }));
  ev.push({ t: T.lock, type: 'lock' });
  ev.push({ t: T.legend, type: 'wipe' });
  ev.push({ t: T.angGhost, type: 'ghost' }, { t: T.angSnap, type: 'angsnap' });
  T.rosette.forEach((t, k) => ev.push({ t, type: 'spoke', k }));
  T.swatch.forEach((t, k) => ev.push({ t, type: 'swatch', k }));
  ev.push({ t: T.caliper, type: 'caliper' });
  ev.push({ t: T.rowStop, type: 'pop', k: 0 }, { t: T.calloutStop, type: 'callout', k: 0 }, { t: T.calloutChange, type: 'callout', k: 1 });
  ev.push({ t: T.zoneRow, type: 'pop', k: 1 });
  ev.push({ t: T.zone2, type: 'zone', k: 0 }, { t: T.zone1, type: 'zone', k: 1 }, { t: T.zoneTags, type: 'zone', k: 2 });
  ev.push({ t: T.marker, type: 'drop' }, { t: T.flag, type: 'flag' });
  ev.push({ t: T.dim0, type: 'dim' });
  ev.push({ t: T.journeyCard, type: 'pop', k: 2 });
  LEGS.forEach((L, i) => { ev.push({ t: L.t0 - .2, type: 'doors', open: false }, { t: L.t1 + .1, type: 'doors', open: true }); if (i < 2) ev.push({ t: L.t1, type: 'chime', k: i }); });
  ev.push({ t: T.arr3, type: 'arrive' });
  ev.push({ t: T.legendOut, type: 'wipe' });
  ev.push({ t: T.title, type: 'plate' });
  return ev.sort((a, b) => a.t - b.t);
}

// ---- subtitles: each caption starts with the speech and holds max(1.8 s, speech + 0.75 s) (never less than speech + 0.6 s)
export function subtitles(dur) {
  const subs = VO.map(v => { const d = dur[v.id]; if (!(d > 0)) throw new Error('no duration for ' + v.id); return { id: v.id, t0: v.t, t1: +Math.min(v.t + Math.max(1.8, d + 0.75), T.title + 0.1).toFixed(3), text: v.text, stripe: v.stripe, speech: d }; });
  for (let i = 0; i < subs.length - 1; i++) if (subs[i].t1 > subs[i + 1].t0 - 0.05) subs[i].t1 = +(subs[i + 1].t0 - 0.05).toFixed(3);
  return subs;
}
export { ROUTE };
