// script.js -> out/srt.json (one cue per message; Nana's voice message carries its transcript). usage: node styles/chat-log/demo/tools/export_srt.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(path.join(D, 'script.js'));
fs.mkdirSync(path.join(D, 'out'), { recursive: true });
fs.writeFileSync(path.join(D, 'out', 'srt.json'), JSON.stringify(S.cues(), null, 1));
console.log('out/srt.json:', S.cues().length, 'cues');
