// script.js + timeline.json -> out/srt.json (one cue per burned-in caption). usage: node styles/language-lesson/demo/tools/export_srt.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { build } = await import(path.join(D, 'script.js'));
const TL = JSON.parse(fs.readFileSync(path.join(D, 'timeline.json'), 'utf8'));
const S = build(TL);
const cues = S.caps.map(c => ({ t0: +c.t0.toFixed(2), t1: +c.t1.toFixed(2), text: c.parts.map(p => p[1]).join('').replace(/\s+/g, ' ').trim() }));
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'out', 'srt.json'), JSON.stringify(cues, null, 1));
console.log('out/srt.json:', cues.length, 'cues');
