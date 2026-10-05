// captions -> out/srt.json (same cues the page burns in). usage: node styles/assembly-manual/demo/tools/export_srt.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { cues } = await import(path.join(D, 'timeline.js'));
const lines = JSON.parse(fs.readFileSync(path.join(D, 'lines.json'))), dur = JSON.parse(fs.readFileSync(path.join(D, 'voices', 'dur.json')));
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
const c = cues(lines, dur).map(x => ({ t0: x.t0, t1: x.t1, text: x.text })); fs.writeFileSync(path.join(D, 'out', 'srt.json'), JSON.stringify(c, null, 1)); console.log('out/srt.json:', c.length, 'cues');
