// the on-screen titles as subtitles: writes out/srt.json for core/render/srt.py
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const cues = [{ t0: 9.0, t1: 14.0, text: 'VANTA HARBOR\nSecond Sunrise (live)' }, { t0: 24.55, t1: 28.0, text: 'SECOND SUNRISE' }, { t0: 56.8, t1: 60.0, text: 'VANTA HARBOR\nSecond Sunrise (live)' }];
fs.mkdirSync(path.join(here, '../out'), { recursive: true }); fs.writeFileSync(path.join(here, '../out/srt.json'), JSON.stringify(cues));
