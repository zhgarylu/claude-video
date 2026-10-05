"""Find the white card the host holds, frame by frame. The card is smooth (low local variance), light (luma ~190-236) and a little blue;
the bright ceiling and floor are brighter or textured, so that mask isolates it. Writes src/card.json:
{ fps, frames: [ null | { q: [[x,y]*4 TL,TR,BR,BL, full-res px], hull: [[x,y]…] } ] }.
The page paints on the card only where it is card-white, so fingers stay in front."""
import os, json, glob
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, binary_closing, binary_fill_holes, binary_dilation, find_objects, uniform_filter
HERE = os.path.dirname(os.path.abspath(__file__)); FR = sorted(glob.glob(os.path.join(HERE, 'src', 'frames', '*.jpg')))
TR = json.load(open(os.path.join(HERE, 'src', 'track.json'))); C = np.array(TR['corners'], float)
def quad_of(k):
    H = np.array(TR['H'][k]).reshape(3, 3); q = np.c_[C, np.ones(4)] @ H.T; return q[:, :2] / q[:, 2:3]
def hull(P):                                                          # Andrew monotone chain
    P = sorted(set(map(tuple, P))); 
    if len(P) < 3: return P
    cr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo = []; 
    for p in P:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    up = []
    for p in reversed(P):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]
def candidates(k):
    im = np.asarray(Image.open(FR[k]).convert('RGB').resize((640, 360), Image.BILINEAR)).astype(float)
    l = .3 * im[..., 0] + .59 * im[..., 1] + .11 * im[..., 2]; br = im[..., 2] - im[..., 0]
    mean = uniform_filter(l, 3); sd = np.sqrt(np.maximum(uniform_filter(l * l, 3) - mean ** 2, 0))
    m = (l > 190) & (l < 238) & (sd < 4.5) & (br > 0) & (br < 26)
    b = Image.new('L', (640, 360), 0); ImageDraw.Draw(b).polygon([tuple(p / 2) for p in quad_of(k)], fill=255); board = np.asarray(b) > 0
    m &= ~binary_dilation(board, iterations=3)
    m = binary_fill_holes(binary_closing(m, iterations=1)); m[:, 575:] = False                       # the bright window at the far right is not a card
    r_, g_, b_ = im[..., 0], im[..., 1], im[..., 2]; skin = (r_ > 110) & (r_ > g_ + 8) & (g_ > b_ - 4) & (r_ - b_ > 26) & ((r_ - b_) < .5 * r_) & (l > 95) & (l < 235); near_skin = binary_dilation(skin, iterations=9)
    lab, n = label(m); out = []
    for i, sl in enumerate(find_objects(lab), 1):
        comp = lab[sl] == i; area = comp.sum()
        if area < 120 or area > 12000: continue
        ys, xs = np.nonzero(comp); ys = ys + sl[0].start; xs = xs + sl[1].start
        P = np.c_[xs, ys].astype(float); c0 = P.mean(0); u, s, vt = np.linalg.svd(P - c0, full_matrices=False); pr = (P - c0) @ vt.T
        lo, hi = pr.min(0), pr.max(0); L, S = hi[0] - lo[0] + 1, hi[1] - lo[1] + 1; rect = area / (L * S)
        touch = near_skin[ys, xs].mean()
        if rect < .6 or max(L, S) / max(1, min(L, S)) > 2.8 or touch < .03: continue
        corners = np.array([[lo[0], lo[1]], [hi[0], lo[1]], [hi[0], hi[1]], [lo[0], hi[1]]]) @ vt + c0
        out.append(dict(area=area, rect=rect, touch=touch, c=c0, quad=corners * 2, hull=np.array(hull(list(zip(xs, ys))), float) * 2))
    return out
res = []; prev = None
for k in range(len(FR)):
    if not (13.9 <= k / 24 <= 29.6): res.append(None); continue
    cs = candidates(k)
    if prev is not None:
        near = [c for c in cs if np.hypot(*(c['c'] - prev)) < 70]
        cs = near or ([] if np.random.rand() < 0 else cs)
    best = max(cs, key=lambda c: c['area'] * c['rect'] * (.3 + c['touch'])) if cs else None
    if best is not None: prev = best['c']
    elif prev is not None and (k % 24 == 0): prev = None                     # lose it after a second without a match
    if best is None: res.append(None); continue
    q = best['quad']; q = q[[int(np.argmin(q[:, 0] + q[:, 1])), int(np.argmax(q[:, 0] - q[:, 1])), int(np.argmax(q[:, 0] + q[:, 1])), int(np.argmin(q[:, 0] - q[:, 1]))]]   # TL, TR, BR, BL
    res.append({'q': q.round(1).tolist(), 'hull': best['hull'].round(1).tolist()})
    if k % 120 == 0: print(k, flush=True)
# fallback while the host pulls the card out and holds it high (13.8-17.4 s): the card is large and touches the bright ceiling, so pick the smooth-white component near (480, 290)
for k in range(len(FR)):
    if res[k] is not None or not (13.8 <= k / 24 <= 17.4): continue
    im = np.asarray(Image.open(FR[k]).convert('RGB').resize((640, 360), Image.BILINEAR)).astype(float)
    l = .3 * im[..., 0] + .59 * im[..., 1] + .11 * im[..., 2]; br = im[..., 2] - im[..., 0]; mean = uniform_filter(l, 3); sd = np.sqrt(np.maximum(uniform_filter(l * l, 3) - mean ** 2, 0))
    m = (l > 195) & (l < 238) & (sd < 3.8) & (br > 0) & (br < 26); m[:, 575:] = False; m = binary_fill_holes(binary_closing(m, iterations=1)); lab, n = label(m); best = None
    for i, sl in enumerate(find_objects(lab), 1):
        a = (lab[sl] == i).sum(); cx = (sl[1].start + sl[1].stop) * .5 * 2; cy = (sl[0].start + sl[0].stop) * .5 * 2; w = (sl[1].stop - sl[1].start) * 2; h = (sl[0].stop - sl[0].start) * 2
        if 350 <= a <= 2600 and abs(cx - 490) < 110 and abs(cy - 300) < 80 and 1.15 <= w / h <= 1.8 and a / (w * h / 4) > .55:
            sc = a - 3 * (abs(cx - 490) + abs(cy - 300))
            if best is None or sc > best[0]: best = (sc, cx, cy, w, h)
    if best: _, cx, cy, w, h = best; q = [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]]; res[k] = {'q': q, 'hull': q}
# fill gaps up to 0.5 s by interpolation, then smooth the corners over 5 frames
Q = [None if r is None else np.array(r['q'], float) for r in res]
k = 0
while k < len(Q):
    if Q[k] is None:
        j = k
        while j < len(Q) and Q[j] is None: j += 1
        if k > 0 and j < len(Q) and Q[k - 1] is not None and j - k <= 18:
            for m in range(k, j): u = (m - k + 1) / (j - k + 1); Q[m] = Q[k - 1] * (1 - u) + Q[j] * u
        k = j
    else: k += 1
sm = []
for k in range(len(Q)):
    if Q[k] is None: sm.append(None); continue
    nb = [Q[i] for i in range(max(0, k - 2), min(len(Q), k + 3)) if Q[i] is not None]; sm.append(np.mean(nb, 0))
res = [None if q is None else {'q': q.round(1).tolist()} for q in sm]
json.dump({'fps': 24, 'frames': res}, open(os.path.join(HERE, 'src', 'card.json'), 'w'))
n_all = sum(1 for k in range(len(FR)) if 12 <= k / 24 <= 29.6); print('found', sum(1 for r in res if r), 'of', n_all)
