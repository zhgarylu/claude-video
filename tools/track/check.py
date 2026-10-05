"""Draw the tracked surface on a contact sheet, to check a track before building on it.

  .venv/bin/python tools/track/check.py <film dir> [--track src/track.json] [--n 12] [--out track-check.jpg]

Picks n frames evenly, draws the reference quad warped by each frame's homography (green) and its centre cross, writes one sheet.
Reads the quad from the track file. A good track keeps the green quad on the surface's frame in every cell; if it slides, the surface was
hidden for too long, or the reference corners were off - re-run board.py with a better reference frame."""
import os, sys, json, glob, argparse
import numpy as np
from PIL import Image, ImageDraw
ap = argparse.ArgumentParser(); ap.add_argument('film'); ap.add_argument('--track', default='src/track.json'); ap.add_argument('--n', type=int, default=12); ap.add_argument('--out', default='track-check.jpg')
A = ap.parse_args(); F = os.path.abspath(A.film)
T = json.load(open(os.path.join(F, A.track))); FR = sorted(glob.glob(os.path.join(F, 'src', 'frames', '*.jpg')))
C = np.array(T['corners']); H = [np.array(h).reshape(3, 3) for h in T['H']]
idx = np.linspace(0, min(len(FR), len(H)) - 1, A.n).round().astype(int); cells = []
def ap_(h, p): q = h @ np.array([p[0], p[1], 1.0]); return q[:2] / q[2]
for k in idx:
    im = Image.open(FR[k]).convert('RGB'); d = ImageDraw.Draw(im, 'RGBA')
    q = [tuple(ap_(H[k], p)) for p in C]; d.polygon(q, outline=(0, 255, 90, 255), width=4)
    c = np.mean(q, 0); d.line([(c[0] - 18, c[1]), (c[0] + 18, c[1])], fill=(255, 60, 60), width=4); d.line([(c[0], c[1] - 18), (c[0], c[1] + 18)], fill=(255, 60, 60), width=4)
    d.text((12, 10), 'frame %d' % k, fill=(255, 255, 255, 255)); cells.append(im.resize((640, int(640 * im.height / im.width))))
cols = 3; rows = (len(cells) + cols - 1) // cols; ch = cells[0].height
sheet = Image.new('RGB', (640 * cols, ch * rows))
for i, im in enumerate(cells): sheet.paste(im, ((i % cols) * 640, (i // cols) * ch))
out = os.path.join(F, A.out); sheet.save(out, quality=88); print(out)
