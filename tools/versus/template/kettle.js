// The two contenders are the user's two product photos, cut out with the Vision foreground mask (assets/*.png, spout on the left).
// Local units: base at y = 0, about 300 units tall, facing LEFT unless o.flip is false (then it is mirrored to face right). No drawn kettles here.
const TAU = Math.PI * 2;
let scratch = null;
// o: {photo: HTMLImageElement, silhouette: '#rrggbb' (draw as a dark shape), x, y, s, sy, flip, rot, accent, flash (0..1), glow}
export function drawKettle(g, o) {
  const im = o.photo, k = 300 / im.naturalHeight, w = im.naturalWidth * k, h = 300;
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = 1100; scratch.height = 340; }
  const c = scratch.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1100, 340); c.drawImage(im, (1100 - w) / 2, 320 - h, w, h);
  if (o.silhouette) { c.globalCompositeOperation = 'source-in'; c.fillStyle = o.silhouette; c.fillRect(0, 0, 1100, 340); }
  else if ((o.flash || 0) > 0.01) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(255,250,235,${Math.min(1, o.flash)})`; c.fillRect(0, 0, 1100, 340); }
  c.globalCompositeOperation = 'source-over';
  g.save(); g.translate(o.x, o.y); g.rotate(o.rot || 0); g.scale((o.flip ? 1 : -1) * o.s, o.s * (o.sy || 1));
  if (o.accent && !o.silhouette) { g.shadowColor = o.accent; g.shadowBlur = 26 * (o.glow ?? .6); }
  g.drawImage(scratch, -550, -320); g.restore();
}
