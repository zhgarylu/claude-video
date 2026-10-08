// A demo-breakdown film. breakdown.json (the shot list) and timeline.json (from prep.py) drive everything; the drawing is in tools/breakdown/lib/.
// Edit breakdown.json, not this file, unless you are changing the look of a shot type.
import { createFilm } from '/tools/breakdown/lib/render.js';
const spec = await fetch('breakdown.json').then(r => r.json()), tl = await fetch('timeline.json').then(r => r.json());
await createFilm({ canvas: document.getElementById('c'), spec, tl, query: new URLSearchParams(location.search) });
