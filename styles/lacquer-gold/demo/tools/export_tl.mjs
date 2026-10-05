// timeline.js → timeline.json (for the mixer) and lines.json (for the voice)
// usage: node styles/lacquer-gold/demo/tools/export_tl.mjs <workdir>
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = path.resolve(process.argv[2] || D);
const TL = await import(path.join(D, 'timeline.js'));
fs.writeFileSync(path.join(W, 'timeline.json'), JSON.stringify({ T: TL.T, DUR: TL.DUR, BPM: TL.BPM, BEAT: TL.BEAT, BAR: TL.BAR, EV: TL.EV, VO: TL.VO, COATS: TL.COATS, SECS: TL.SECS }, null, 1));
const lines = TL.VO.map(v => ({ id: v.id, text: v.text, voice: 'bf_emma', speed: 0.9 }));
fs.writeFileSync(path.join(W, 'lines.json'), JSON.stringify(lines, null, 1));
console.log('timeline.json,', lines.length, 'lines,', TL.EV.length, 'events');
