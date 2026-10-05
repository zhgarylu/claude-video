"""Track the board face through the host video: a homography per frame from the reference frame's board plane to each frame.
Frame-to-frame Lucas-Kanade on a band-passed, contrast-normalised image (numpy/scipy only), robust (Tukey) against the host's arms.
Output: src/track.json = { ref, corners (reference px, full-res), H: [[9 numbers per frame]] (full-res, ref plane -> frame) }."""
import os, sys, json, glob
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

HERE = os.path.dirname(os.path.abspath(__file__)); FR = sorted(glob.glob(os.path.join(HERE, 'src', 'frames', '*.jpg')))
REF = 12                                                           # frame 0013 (0.5 s): the whole board face is in view
# inside edge of the amber frame in the reference frame (full-res px): TL, TR, BR, BL
CORNERS = np.array(json.load(open(os.path.join(HERE, 'corners.json')))['ref'], float) if os.path.exists(os.path.join(HERE, 'corners.json')) else np.array([[669, 165], [1021, 37], [1021, 576], [669, 500]], float)

def load(i):
    g = np.asarray(Image.open(FR[i]).convert('L'), np.float32) / 255
    g = g.reshape(g.shape[0] // 2, 2, g.shape[1] // 2, 2).mean((1, 3))      # half-res
    bp = g - gaussian_filter(g, 8); bp /= np.sqrt(gaussian_filter(bp * bp, 14) + 1e-4)
    return bp
def pyr(bp):
    out = []
    for s in (3.0, 1.6, .8):
        b = gaussian_filter(bp, s); gy, gx = np.gradient(b); out.append((b, gx, gy))
    return out

h, w = load(REF).shape
poly = CORNERS / 2                                                    # half-res
# template points: a grid over the board quad (reference, half-res)
yy, xx = np.mgrid[0:h:2, 0:w:2]; P = np.stack([xx.ravel(), yy.ravel()], 1).astype(np.float64)
from PIL import ImageDraw
_m = Image.new('L', (w, h), 0); ImageDraw.Draw(_m).polygon([tuple(p) for p in poly], fill=255); _m = np.asarray(_m) > 0
P = P[_m[P[:, 1].astype(int), P[:, 0].astype(int)]]
c = poly.mean(0); s = 120.0
Pn = (P - c) / s
def to_n(p): return (p - c) / s
def to_px(p): return p * s + c

def warp(H, Pn):
    q = np.c_[Pn, np.ones(len(Pn))] @ H.T; return q[:, :2] / q[:, 2:3], q[:, 2]
def sample(img, qn):
    px = to_px(qn); return map_coordinates(img, [px[:, 1], px[:, 0]], order=1, mode='constant', cval=np.nan)

def refine(H, T, levels, mask0):
    theta = H.flatten()[:8].copy()
    for li, (b, gx, gy) in enumerate(levels):
        for it in range(14):
            Hc = np.append(theta, 1).reshape(3, 3); q, wd = warp(Hc, Pn)
            I = sample(b, q); Ix = sample(gx, q); Iy = sample(gy, q)
            ok = mask0 & np.isfinite(I) & np.isfinite(Ix) & (wd > 1e-3)
            if ok.sum() < 300: return None
            r = (I - T[li])[ok]
            mad = np.median(np.abs(r - np.median(r))) * 1.4826 + 1e-3; cc = 4.685 * mad
            wgt = np.where(np.abs(r) < cc, (1 - (r / cc) ** 2) ** 2, 0.0)
            x, y = Pn[ok, 0], Pn[ok, 1]; ww = wd[ok]; u, v = q[ok, 0], q[ok, 1]
            Ixs, Iys = Ix[ok] * s, Iy[ok] * s                                   # gradients per normalised unit
            J = np.zeros((ok.sum(), 8))
            J[:, 0] = Ixs * x / ww; J[:, 1] = Ixs * y / ww; J[:, 2] = Ixs / ww
            J[:, 3] = Iys * x / ww; J[:, 4] = Iys * y / ww; J[:, 5] = Iys / ww
            J[:, 6] = -(Ixs * u + Iys * v) * x / ww; J[:, 7] = -(Ixs * u + Iys * v) * y / ww
            A = J.T @ (J * wgt[:, None]); g = J.T @ (wgt * r)
            dth = np.linalg.solve(A + 1e-3 * np.diag(np.diag(A)) + 1e-9 * np.eye(8), -g)
            theta += dth
            if np.abs(dth).max() < 2e-4: break
    return np.append(theta, 1).reshape(3, 3)

def track(order, imgs_cache):
    Hs = {REF: np.eye(3)}; prev = REF; Hprev = np.eye(3); lv_prev = pyr(load(REF)); bad = 0
    for k in order:
        lv = pyr(load(k))
        # template = previous frame's appearance at the previous warp of the reference points
        qprev, wdp = warp(Hprev, Pn); T = [sample(b, qprev) for (b, _, _) in lv_prev]
        m0 = np.isfinite(T[-1]) & (wdp > 1e-3) & np.all([np.isfinite(t) for t in T], 0)
        Hn = refine(Hprev.copy(), T, lv, m0)
        if Hn is None or not np.isfinite(Hn).all(): Hn = Hprev; bad += 1
        Hs[k] = Hn; Hprev = Hn; lv_prev = lv
        if k % 30 == 0: print('frame', k, 'bad', bad, flush=True)
    return Hs

END = int(os.environ.get('LIMIT', len(FR)))
fw = track(range(REF + 1, min(END, len(FR))), None)
bw = track(range(REF - 1, -1, -1), None)
Hs = {**fw, **bw, REF: np.eye(3)}
N = np.array([[1 / s, 0, -c[0] / s], [0, 1 / s, -c[1] / s], [0, 0, 1]])          # half-res px -> normalised
S = np.diag([.5, .5, 1])                                                           # full -> half
out = []
for k in range(len(FR)):
    if k not in Hs: Hs[k] = Hs[max(Hs)]
    Hf = np.linalg.inv(N) @ Hs[k] @ N                                              # half-res px ref -> half-res px frame
    Hfull = np.linalg.inv(S) @ Hf @ S; Hfull /= Hfull[2, 2]; out.append(Hfull.flatten().tolist())
json.dump({'ref': REF, 'corners': CORNERS.tolist(), 'H': out}, open(os.path.join(HERE, 'src', 'track.json'), 'w'))
print('tracked', len(out), 'frames')
