// One timeline for picture, score and checks: tempo grid, sections, word timings, drum pattern, sound events.
// song.json (sections, anchors) and words.json (word times in film seconds, from tools/place.py) are the inputs.
export const SONG = await (await fetch('song.json')).json();
const RAW = await (await fetch('words.json')).json();
export const BPM = SONG.bpm, BEAT = 60 / BPM, BAR = BEAT * 4, NB = SONG.bars, DUR = NB * BAR, STEP = BEAT / 4;
export const secOfBar = b => SONG.sections.find(s => b >= s.bar && b < s.bar + s.n);
export const secAt = t => secOfBar(Math.min(NB - 1, Math.max(0, Math.floor(t / BAR + 1e-9))));

// word times: starts rise, every word lasts at least 90 ms, a word ends where the next begins unless there is a real gap
export function cleanWords(ws) {
  const s = [], e = [];
  ws.forEach((w, i) => { s.push(Math.max(w[1], i ? s[i - 1] + 0.06 : w[1])); });
  ws.forEach((w, i) => {
    const nx = i + 1 < ws.length ? s[i + 1] : Infinity;
    let end = w[2] < s[i] + 0.09 ? s[i] + 0.09 : w[2];
    if (nx - end < 0.22) end = Math.max(s[i] + 0.09, nx);
    e.push(Math.min(end, nx > s[i] ? Math.max(nx, s[i] + 0.09) : end));
  });
  return ws.map((w, i) => ({ tok: w[0], t0: s[i], t1: e[i] }));
}
export const LINES = SONG.lines.map(l => ({ id: l.id, bar: l.bar, t: l.bar * BAR, sec: secOfBar(l.bar), text: RAW[l.id].text, words: cleanWords(RAW[l.id].words) }));

// ---------------------------------------------------------------- drum and click pattern, 16 steps a bar
const rng = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
export function buildEvents(extra) {
  const ev = [];
  const add = (t, type, o = {}) => ev.push({ t: +t.toFixed(4), type, ...o });
  const eighths = (b, v = .45, acc = .6) => { for (let s = 0; s < 16; s += 2) add(b + s * STEP, 'hat', { v: s % 4 == 2 ? acc : v }); };
  for (let bar = 0; bar < NB; bar++) {
    const b0 = bar * BAR, sec = secOfBar(bar), k = sec.id, i = bar - sec.bar, at = (s, type, o) => add(b0 + s * STEP, type, o);
    if (k == 'intro') { at(0, 'kick', { v: 1 }); at(10, 'kick', { v: .8 }); eighths(b0, .4, .5); at(12, 'beep'); at(14, 'beep'); }
    else if (k == 'v1' || k == 'v2') {
      [0, 6, 10].forEach(s => at(s, 'kick', { v: s ? .8 : 1 })); if (i == 3) at(14, 'kick', { v: .7 });
      [4, 12].forEach(s => at(s, 'snare', { v: .8 })); eighths(b0, k == 'v1' ? .32 : .4, k == 'v1' ? .45 : .55);
      if (k == 'v2') { at(13, 'hat', { v: .25 }); at(15, 'hat', { v: .3 }); if (i == 3) at(15, 'snare', { v: .5 }); }
      if (k == 'v1' && i == 0) at(0, 'beep', { v: .5 });
    }
    else if (k == 'p1' || k == 'p2') {
      if (i == 0) { [0, 4, 8, 12].forEach(s => at(s, 'kick', { v: .9 })); [4, 12].forEach(s => at(s, 'clap', { v: .8 })); eighths(b0, .45, .6); }
      else { [0, 4, 8].forEach(s => at(s, 'kick', { v: .9 })); [[8, .45], [10, .55], [12, .7], [13, .8]].forEach(([s, v]) => at(s, 'snare', { v })); add(b0, 'riser', { dur: 14 * STEP }); at(0, 'hat', { v: .5 }); [2, 4, 6].forEach(s => at(s, 'hat', { v: .5 })); }
    }
    else if (k == 'c1' || k == 'c2') {
      const kk = k == 'c1' ? [0, 3, 6, 10] : [0, 3, 6, 10, 14];
      kk.forEach(s => at(s, 'kick', { v: s ? .85 : 1 })); if (k == 'c1' && i == 3) at(14, 'kick', { v: .7 });
      [4, 12].forEach(s => at(s, 'clap', { v: .9 })); if (k == 'c2') at(12, 'snare', { v: .7 });
      for (let s = 0; s < 16; s++) { if ([2, 10].includes(s)) at(s, 'ohat', { v: .5 }); else at(s, 'hat', { v: s % 2 ? .22 : (s % 4 == 0 ? .45 : .33) }); }
      if (i == 0) at(0, 'crash', { v: 1 });
    }
    else if (k == 'bridge') { const n = i == 0 ? 4 : 3; for (let j = 0; j < n; j++) at(j * 4, 'tick', { v: .55 - j * .04 }); if (i == 1) add(b0 + 2.5 * BEAT, 'hush'); }
    else if (k == 'joke') { at(0, 'kick', { v: .7 }); at(14, 'beep', { v: 1 }); at(15, 'beep', { v: 1 }); }
    else if (k == 'end') {
      if (i == 0) { at(0, 'kick', { v: 1 }); at(0, 'crash', { v: .9 }); at(8, 'tick', { v: .5 }); at(12, 'tick', { v: .4 }); }
      else { at(0, 'tick', { v: .4 }); at(4, 'tick', { v: .3 }); at(10, 'beep', { v: .5 }); }
    }
  }
  (extra || []).forEach(e => ev.push(e));
  ev.sort((a, b) => a.t - b.t);
  return ev;
}
