// timeline.js 的字幕 → out/cues.json（srt.py 用）
import { CUES } from './timeline.js';
import fs from 'fs';
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./out/cues.json', import.meta.url), JSON.stringify(CUES.map(c => ({ t0: c.t0, t1: c.t1, text: c.text })), null, 1));
