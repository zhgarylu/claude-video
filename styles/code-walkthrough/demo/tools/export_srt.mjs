// script.js CUES -> out/srt.json (the same cues the page burns in). usage: node styles/code-walkthrough/demo/tools/export_srt.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(path.join(D, 'script.js'));
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'out', 'srt.json'), JSON.stringify(S.CUES.map(([t0, t1, text]) => ({ t0, t1, text })), null, 1));
console.log('out/srt.json:', S.CUES.length, 'cues');
