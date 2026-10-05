"""Draw the scope stem at chosen times (last 25 ms of samples) to a contact sheet: a quick look at the figures."""
import sys, os, numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, '..')
sys.path.insert(0, D)
import scope
L, R, Z, FL, FR, info = scope.build()
ts = [float(a) for a in sys.argv[1:]] or [2.5, 4.5, 6.0, 8.0, 12, 16, 20, 21.2, 23, 26, 33, 34, 36, 41, 44, 52]
W = 300; cols = 4; rows = (len(ts) + cols - 1) // cols
im = Image.new('RGB', (W * cols, W * rows), (0, 0, 0)); dr = ImageDraw.Draw(im)
for k, t in enumerate(ts):
    i1 = int(t * scope.SR); i0 = i1 - int(.03 * scope.SR)
    ox, oy = (k % cols) * W + W // 2, (k // cols) * W + W // 2
    pts = [(ox + L[i] * W * .45, oy - R[i] * W * .45) for i in range(i0, i1)]
    for a, b, z in zip(pts, pts[1:], Z[i0:i1]):
        if z > .5: dr.line([a, b], fill=(90, 255, 150), width=1)
    dr.text((ox - W // 2 + 4, oy - W // 2 + 4), '%.2f fl %.0f fr %.1f' % (t, FL[i1], FR[i1]), fill=(200, 200, 200))
im.save(os.path.join(D, 'out', 'prev_scope.png')); print('ok', info.get('d0'))
