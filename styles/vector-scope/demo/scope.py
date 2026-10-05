"""The scope stem: the left and right channels that drive X and Y, plus a Z (beam intensity) channel.
This is the film's tone layer, synthesised with numpy. The page draws the picture from these exact samples (out/scope.bin).
Everything is a function of timeline.json; nothing here is random."""
import os, json
import numpy as np
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
T, DUR = TL['T'], TL['DUR']
N = int(round(DUR * SR))
PSI = 0.0  # relative phase of a locked figure: ratio-symmetric figures (checked in tools/preview_scope.py)

def smooth(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)

def build():
    L = np.zeros(N); R = np.zeros(N); Z = np.zeros(N)
    info = {'detents': [], 'letters': [], 'fl': None, 'fr': None}
    FL = np.zeros(N); FR = np.zeros(N)           # frequencies for the page's readout (Hz, 0 when silent)

    def idx(t): return int(round(t * SR))

    def tone(t0, t1, fl, fr, aL=.85, aR=.85, phL0=0., phR0=0., harm=0., fi=.012, fo=.012, record=True):
        i0, i1 = idx(t0), idx(t1); n = i1 - i0; tau = np.arange(n) / SR
        fl = fl(tau) if callable(fl) else np.full(n, float(fl))
        fr = fr(tau) if callable(fr) else np.full(n, float(fr))
        phL = phL0 + 2 * np.pi * np.cumsum(fl) / SR
        phR = phR0 + 2 * np.pi * np.cumsum(fr) / SR
        env = np.minimum(smooth(tau / fi) if fi > 0 else 1, smooth((n / SR - tau) / fo) if fo > 0 else 1)
        L[i0:i1] += aL * env * (np.sin(phL) + harm * np.sin(3 * phL + .7)) if np.isscalar(harm) else aL * env * (np.sin(phL) + harm[:n] * np.sin(3 * phL + .7))
        h = harm if np.isscalar(harm) else harm[:n]
        R[i0:i1] += aR * env * (np.sin(phR) + h * np.sin(2 * phR + 1.9))
        Z[i0:i1] = np.maximum(Z[i0:i1], 1.0)
        if record:
            FL[i0:i1] = fl * (aL > 0); FR[i0:i1] = fr * (aR > 0)
        return phL, phR

    # ---- 1. opening: a mono tone is a diagonal line; opening the phase makes it a circle
    openA, openB = T['openA'], T['openB']
    tone(T['monoIn'], T['monoOut'], 220, 220, .85, .85, 0, 0, 0, fi=.5, fo=.1,
         )
    # the phase opening is applied by re-synthesising R with psi(t)
    i0, i1 = idx(T['monoIn']), idx(T['monoOut']); n = i1 - i0; tau = np.arange(n) / SR; t_abs = T['monoIn'] + tau
    R[i0:i1] = 0
    psi = np.pi / 2 * smooth((t_abs - openA) / (openB - openA))
    env = np.minimum(smooth(tau / .5), smooth((n / SR - tau) / .1))
    R[i0:i1] = .85 * env * np.sin(2 * np.pi * 220 * tau + psi)

    # ---- 2. one channel at a time, then both
    tone(T['lOnly0'], T['lOnly1'], 220, 0, .85, 0, record=True)
    tone(T['rOnly0'], T['rOnly1'], 0, 220, 0, .85, record=True)

    # ---- 3. both: unison circle, R glides up to a fifth, drifts sharp, slows, locks
    t0 = T['both']; t1 = T['toneOff']
    i0, i1 = idx(t0), idx(t1); n = i1 - i0; tau = np.arange(n) / SR; ta = t0 + tau
    g0, g1, lock = T['glide0'], T['glide1'], T['lock']
    glide = smooth((ta - g0) / (g1 - g0))
    P = 1.6
    u = np.clip((ta - g1) / (lock - g1), 0, 1)
    drift = (1 - u) ** P * (ta >= g1)                       # shape of the sharpness, 1 at g1 -> 0 at lock
    uni = 0.25 * (ta < g0)                                  # a slow tilt of the unison ellipse
    harm = .08 * smooth((ta - g0) / (g1 - g0))
    def run(d0):
        fr = 220 + 110 * glide + uni + d0 * drift
        phL = 2 * np.pi * np.cumsum(np.full(n, 220.)) / SR
        phR = np.pi / 2 + 2 * np.pi * np.cumsum(fr) / SR
        return fr, phL, phR
    il = idx(lock) - i0
    _, phL, phR = run(0.)
    rel0 = phR[il] - 1.5 * phL[il]
    area_per_hz = float(np.sum(drift[:il + 1]) / SR)         # seconds-equivalent: phase added = 2 pi d0 * area
    need = (PSI - rel0) % (2 * np.pi)
    best = None
    for k in range(0, 8):
        d0 = (need + 2 * np.pi * k) / (2 * np.pi * area_per_hz)
        if best is None or abs(d0 - 2.6) < abs(best - 2.6): best = d0
    d0 = best
    fr, phL, phR = run(d0)
    info['d0'] = float(d0)
    env = np.minimum(smooth(tau / .012), smooth((n / SR - tau) / .2))
    L[i0:i1] += .85 * env * (np.sin(phL) + harm * np.sin(3 * phL + .7))
    R[i0:i1] += .85 * env * (np.sin(phR) + harm * np.sin(2 * phR + 1.9))
    Z[i0:i1] = 1.0
    FL[i0:i1] = 220; FR[i0:i1] = fr
    # the beat: one detent per full turn of the figure (relative phase of the fifth)
    rel = (phR - 1.5 * phL) / (2 * np.pi)
    k0 = np.floor(rel[idx(g1) - i0])
    for k in range(int(k0) + 1, int(rel[il]) + 1):
        j = int(np.searchsorted(rel, k)); info['detents'].append(round(float(ta[min(j, n - 1)]), 4))

    # ---- 4. the fifth returns after the silence
    tone(T['return'], T['octave'] - .05, 220, 330, .85, .85, 0, PSI, harm=.08, fi=.012, fo=.03)

    # ---- 5. gallery: octave, fourth, major third (phases reset in the gaps so every figure opens as drawn)
    tone(T['octave'], T['fourth'] - .06, 165, 330, .85, .85, 0, 0.0, harm=.05, fo=.03)
    tone(T['fourth'], T['third'] - .06, 220, 220 * 4 / 3, .85, .85, 0, 0.0, harm=.05, fo=.03)
    # major third, then pulled out of ratio (tangle)
    t0, t1 = T['third'], T['reveal'] - .12
    i0, i1 = idx(t0), idx(t1); n = i1 - i0; tau = np.arange(n) / SR; ta = t0 + tau
    s = smooth((ta - T['detune0']) / (T['tangle'] - T['detune0']))
    wob = 1.0 * np.sin(2 * np.pi * 0.9 * (ta - T['detune0'])) * s * (ta > T['detune0'])
    fl = np.full(n, 196.); fr = 245 + (196 * np.sqrt(2) - 245) * s + 6 * wob
    phL = 2 * np.pi * np.cumsum(fl) / SR; phR = 2 * np.pi * np.cumsum(fr) / SR
    env = np.minimum(smooth(tau / .012), smooth((n / SR - tau) / .05))
    L[i0:i1] += .85 * env * (np.sin(phL) + .1 * np.sin(3 * phL + .7))
    R[i0:i1] += .85 * env * (np.sin(phR) + .1 * np.sin(2 * phR + 1.9))
    Z[i0:i1] = 1.0; FL[i0:i1] = 196; FR[i0:i1] = fr

    # ---- 6. reveal: the same fifth walked through three roots (the shape does not change, the pitch does)
    for (a, b, f) in [(T['reveal'], T['step1'], 220.), (T['step1'], T['step2'], 165.), (T['step2'], T['off2'], 220.)]:
        tone(a, b - .05 if b != T['off2'] else b, f, f * 1.5, .85, .85, 0, PSI, harm=.08, fo=.04 if b != T['off2'] else .5)

    # ---- 7. the word, written by the score: a 110 Hz note whose cycle is the path of the letters
    import math
    vf = json.load(open(os.path.join(HERE, 'vfont.json')))
    word = 'PLAYED'; adv = 1.7
    pts = []; xcur = 0.0; starts = []
    for ch in word:
        g = vf[ch]; starts.append(len(pts))
        for s_ in g['s']:
            for k, (x, y) in enumerate(s_): pts.append((x + xcur, y, 1 if k else 0))        # z=0 marks the first point of a stroke (the jump to it)
        xcur += g['w'] + adv
    xs = np.array([p[0] for p in pts]); ys = np.array([p[1] for p in pts]); zs = np.array([p[2] for p in pts])
    wtot = xs.max() - xs.min(); sc = 1.9 / wtot
    X = (xs - xs.min() - wtot / 2) * sc * 1.0; Y = -(ys - 3.0) * sc
    seglen = np.hypot(np.diff(X), np.diff(Y)); wgt = np.where(zs[1:] == 1, 1.0, 0.18)
    cum = np.concatenate([[0], np.cumsum(seglen * wgt)]); S = cum[-1]
    for ci, st in enumerate(starts): info['letters'].append({'ch': word[ci], 'u': float(cum[st] / S)})
    w0, w1 = T['word0'], T['word1']
    ci_ = idx(w0); cx = []; cy = []; cz = []; cf = []
    t_end = T['fade']
    while ci_ < idx(t_end):
        tt_ = ci_ / SR
        u = float(smooth((tt_ - w0) / (w1 - w0)))
        u = max(u, 0.012) if tt_ < w1 else 1.0
        s_end = u * S
        m = int(110 + 190 * min(1.0, u / .6))
        s_ = np.unique(np.concatenate([np.linspace(0, s_end, m), cum[cum < s_end], [s_end]]))      # every vertex is always sampled: corners stay sharp
        x = np.interp(s_, cum, X); y = np.interp(s_, cum, Y)
        jj = np.clip(np.searchsorted(cum, s_, side='right') - 1, 0, len(zs) - 2)
        z = zs[jj + 1].astype(float)
        fx = np.linspace(x[-1], x[0], 18)[1:-1]; fy = np.linspace(y[-1], y[0], 18)[1:-1]
        cx.append(np.concatenate([x, fx])); cy.append(np.concatenate([y, fy])); cz.append(np.concatenate([z, np.zeros(len(fx))]))
        nc = len(x) + len(fx); cf.append((ci_, nc)); ci_ += nc
    cxa = np.concatenate(cx); cya = np.concatenate(cy); cza = np.concatenate(cz)
    i0 = idx(w0); n = min(len(cxa), N - i0)
    fadeenv = np.ones(n); tt2 = (np.arange(n)) / SR + w0
    fadeenv *= smooth((tt2 - w0) / .05) * smooth((T['powerOff'] - tt2) / .2)
    amp = .8
    L[i0:i0 + n] += amp * cxa[:n] * fadeenv; R[i0:i0 + n] += amp * cya[:n] * fadeenv
    Z[i0:i0 + n] = np.maximum(Z[i0:i0 + n], cza[:n] * fadeenv)
    # the pitch of the word is its refresh rate: one cycle = one pass over all the letters written so far
    for (c0, nc) in cf:
        if c0 + nc <= N: FL[c0:c0 + nc] = SR / nc; FR[c0:c0 + nc] = SR / nc
    info['word_t0'] = w0

    # ---- Z: parked spot where nothing plays (from the dot ignition until the power-off)
    park = np.zeros(N)
    ta = np.arange(N) / SR
    park = .30 * smooth((ta - T['dot']) / .25) * smooth((T['powerOff'] + 1.0 - ta) / .45)
    Zf = np.maximum(Z, park)
    return L, R, Zf, FL, FR, info

def write_bin(L, R, Z, path):
    a = np.stack([np.clip(L, -1, 1), np.clip(R, -1, 1), np.clip(Z, 0, 1)], 1)
    a = np.round(a * np.array([32767, 32767, 32767])).astype('<i2')
    open(path, 'wb').write(a.tobytes())

if __name__ == '__main__':
    L, R, Z, FL, FR, info = build()
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    write_bin(L, R, Z, os.path.join(HERE, 'out', 'scope.bin'))
    print('scope.bin', len(L) / SR, 's  d0=%.3f' % info['d0'], 'detents', len(info['detents']))
