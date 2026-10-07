// Footage as a function of time. prep.py extracts every clip shot to JPEG frames at the film's fps (work/frames/<shot>/NNNN.jpg + meta.json)
// and every freeze to one still (work/stills/<shot>.jpg), so rendering stays deterministic and any frame can be drawn alone.
// Frames are decoded on demand and only a few are kept (a minute of 1080p frames decoded at once would not fit in memory).
// Picture-in-picture uses drawPip() from tools/talk/host.js (the same rounded, bordered window the talking-head films use).
import { drawPip } from '/tools/talk/host.js';
export { drawPip };

export class Clip {
  constructor(base) { this.base = base; this.cache = new Map(); this.meta = null; }
  async init() { this.meta = await fetch(`${this.base}/meta.json`).then(r => r.json()); return this; }
  index(lt) { return Math.max(0, Math.min(this.meta.frames - 1, Math.floor(lt * this.meta.fps + 1e-4))); }
  async need(lt) {
    const i = this.index(lt); if (this.cache.has(i)) return;
    const im = new Image(); im.src = `${this.base}/${String(i + 1).padStart(4, '0')}.jpg`; await im.decode().catch(() => 0);
    this.cache.set(i, im);
    for (const k of this.cache.keys()) if (Math.abs(k - i) > 8) this.cache.delete(k);
  }
  frame(lt) { return this.cache.get(this.index(lt)) || null; }
}
export async function loadStill(url) { const im = new Image(); im.src = url; await im.decode().catch(() => 0); return im.naturalWidth ? im : null; }
