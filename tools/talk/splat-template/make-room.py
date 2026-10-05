"""A demo splat world (no download, no key): python3 make-room.py out.splat
A striped room with a checker floor and four coloured balls, ~260k gaussians (8 MB), in the antimatter15 .splat format that Spark loads."""
import sys, numpy as np
rng = np.random.default_rng(7); parts = []
def add(pos, scale, col, alpha=255):
    n = len(pos); rec = np.zeros(n, dtype=[('p', '<f4', 3), ('s', '<f4', 3), ('c', 'u1', 4), ('r', 'u1', 4)])
    rec['p'] = pos; rec['s'] = np.broadcast_to(scale, (n, 3)); rec['c'][:, :3] = col; rec['c'][:, 3] = alpha; rec['r'] = np.array([255, 128, 128, 128], np.uint8); parts.append(rec)
n = 60000; x = rng.uniform(-6, 6, n); z = rng.uniform(-8, 2, n); y = rng.normal(0, .005, n)
chk = ((np.floor(x) + np.floor(z)) % 2 == 0)[:, None]; add(np.c_[x, y, z], [.06, .01, .06], np.where(chk, [214, 190, 150], [96, 110, 128]).astype(np.uint8))
for axis, val, rg in [('z', -8, ((-6, 6), (0, 4))), ('x', -6, ((-8, 2), (0, 4))), ('x', 6, ((-8, 2), (0, 4)))]:
    n = 40000; a = rng.uniform(*rg[0], n); b = rng.uniform(*rg[1], n); pos = np.c_[a, b, np.full(n, val)] if axis == 'z' else np.c_[np.full(n, val), b, a]
    stripe = ((np.floor(a * 1.5) % 2) == 0)[:, None]; add(pos, [.07, .07, .01], np.where(stripe, [230, 120, 90], [240, 225, 200]).astype(np.uint8))
def sphere(c, r, col, n=20000):
    v = rng.normal(size=(n, 3)); v /= np.linalg.norm(v, axis=1)[:, None]; add(np.array(c) + v * r, [.03, .03, .03], np.tile(col, (n, 1)).astype(np.uint8))
sphere((-2, 1, -3), 1.0, [240, 200, 60]); sphere((1.5, .8, -4), .8, [70, 170, 220]); sphere((3.5, 1.4, -6), 1.4, [210, 70, 110], 30000)
y = rng.uniform(0, 3.6, 8000); a = rng.uniform(0, 6.28, 8000); add(np.c_[-4.2 + .35 * np.cos(a), y, -5 + .35 * np.sin(a)], [.03, .03, .03], np.tile([90, 200, 140], (8000, 1)).astype(np.uint8))
rec = np.concatenate(parts); rec.tofile(sys.argv[1] if len(sys.argv) > 1 else 'room.splat'); print(len(rec), 'splats')
