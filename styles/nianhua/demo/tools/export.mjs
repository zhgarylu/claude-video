// export.mjs: write caps.json (voice starts, subtitles, grid) from timeline.js for mix.py and the srt.
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const T = await import(pathToFileURL(path.join(HERE, 'timeline.js')).href);
const caps = { dur: T.DUR, bpm: T.BPM, beat: T.BEAT, g0: T.G0, vo: Object.fromEntries(Object.entries(T.VO).map(([k, v]) => [k, { t: v[0], dur: v[1], text: v[2] }])), subs: T.SUBS.map((s) => ({ t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3), text: s.text })), sec: T.S };
fs.writeFileSync(path.join(HERE, 'caps.json'), JSON.stringify(caps, null, 1));
fs.writeFileSync(path.join(HERE, 'out', 'srt_cues.json'), JSON.stringify(caps.subs.map((s) => ({ t0: s.t0, t1: s.t1, text: s.text })), null, 1));
console.log('caps.json', caps.subs.length, 'cues');
