// Source footage as a function of time, for pages that expose window.render(t): the same on-disk mechanism as tools/talk/host.js
// (src/frames/NNNN.jpg extracted at the video's own frame rate, src/meta.json = {fps, frames, w, h, duration}; the frame shown at time t is
// floor(t * fps)), but frames are decoded on demand in a sliding window instead of all before READY: a full-frame 1080x1920 clip of 30 s is
// 5 GB decoded, which host.js's "decode everything" cannot hold. render(t) must therefore be async (video.mjs and still.mjs await it).
//
//   import { openFrames } from '/tools/remake/frames.js';
//   const fr = await openFrames('src');            // before window.READY = true
//   const im = await fr.frame(srcSeconds);          // inside async render(t)
export async function openFrames(base = 'src', { ahead = 12, keep = 6 } = {}) {
  const meta = await fetch(`${base}/meta.json`).then(r => r.json());
  const cache = new Map();
  const url = i => `${base}/frames/${String(i + 1).padStart(4, '0')}.jpg`;
  const load = i => {
    if (!cache.has(i)) { const im = new Image(); im.src = url(i); cache.set(i, im.decode().then(() => im, () => im)); }
    return cache.get(i);
  };
  const index = ts => Math.max(0, Math.min(meta.frames - 1, Math.floor(ts * meta.fps + 1e-4)));
  const first = await load(0);
  return {
    ...meta, first,
    index,
    async frame(ts) {
      const i = index(ts), p = load(i);
      for (let k = 1; k <= ahead; k++) if (i + k < meta.frames) load(i + k);
      for (const j of [...cache.keys()]) if (j < i - keep || j > i + ahead + keep) cache.delete(j);
      return p;
    },
  };
}
