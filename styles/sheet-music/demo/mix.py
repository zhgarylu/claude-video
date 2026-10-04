"""Four Notes: score, foley and room, all synthesised from events.json (the same event list the picture reads).
Writes out/mix.wav plus one stem per voice (out/stem_*.wav, for cuecheck). numpy/scipy only, no samples."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
LIB = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import SR, bp, lp, hp, add, limit
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, 'out'); os.makedirs(OUT, exist_ok=True)
ev = json.load(open(os.path.join(D, 'events.json'))); DUR = ev['dur']; EV = ev['ev']
rng = np.random.default_rng(11)
N = int(DUR * SR)
tt = lambda d: np.arange(int(round(d * SR))) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
ss = lambda x: (lambda c: c * c * (3 - 2 * c))(np.clip(x, 0, 1))

def lead(f, d, v):
    L = d + .6; t = tt(L)
    vib = 1 + .0045 * np.sin(2 * np.pi * 5.3 * t) * ss((t - .4) / .5) * (d > 1.0)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    x = np.sin(ph) + .30 * np.sin(2 * ph) + .13 * np.sin(3 * ph) + .05 * np.sin(5.02 * ph)
    env = np.minimum(1, t / .008) * np.exp(-t / 1.6) * np.where(t < d, 1, np.exp(-(t - d) / .22))
    return x * env * v ** 1.2

def mallet(f, d, v):
    L = min(1.6, d + .5); t = tt(L); tau = .34 * (440 / f) ** .35
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / tau) + .22 * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t / (tau * .25)) + .07 * np.sin(2 * np.pi * 9.3 * f * t) * np.exp(-t / (tau * .12))
    return x * np.minimum(1, t / .0015) * v ** 1.2 * np.where(t < d + .1, 1, np.exp(-(t - d - .1) / .12))

def bass(f, d, v):
    L = d + .5; t = tt(L)
    x = np.sin(2 * np.pi * f * t) + .45 * np.sin(4 * np.pi * f * t) + .2 * np.sin(6 * np.pi * f * t)
    env = np.minimum(1, t / .008) * np.exp(-t / 2.2) * np.where(t < d, 1, np.exp(-(t - d) / .25))
    return hp(x * env * v ** 1.1, 32)

stems = {k: np.zeros((N, 2)) for k in ('lead', 'mallets', 'bass')}
pan = {'lead': -.12, 'mallets': .28, 'bass': 0.0}; gain = {'lead': .30, 'mallets': .26, 'bass': .34}
for e in EV:
    if e['type'] != 'note': continue
    k = ('lead', 'mallets', 'bass')[e['voice']]; f = hz(e['midi'])
    x = {'lead': lead, 'mallets': mallet, 'bass': bass}[k](f, e['dur'], e['vel'])
    p = pan[k] + (.25 * (e['midi'] - 62) / 24 if k == 'mallets' else 0)
    add(stems[k], x, e['t'], gain[k], float(np.clip(p, -.8, .8)))

# a small room: decaying noise impulse response
ir_t = tt(2.4); IR = np.stack([lp(rng.standard_normal(len(ir_t)), 5200) * np.exp(-ir_t / .62) for _ in range(2)], 1) * .03
def verb(x, wet):
    w = np.stack([fftconvolve(x[:, c], IR[:, c])[:N] for c in range(2)], 1)
    return x + w * wet
music = verb(stems['lead'], .3) + verb(stems['mallets'], .26) + verb(stems['bass'], .1)

# foley
fol = np.zeros((N, 2))
def pen(t0, t1, s):
    d = t1 - t0; t = tt(d); n = rng.standard_normal(len(t))
    x = bp(n, 1400, 6500) * (.45 + .55 * np.abs(np.sin(2 * np.pi * (7 + 5 * s) * t + .3 * np.sin(2 * np.pi * 1.7 * t))))
    x *= ss(t / .08) * ss((d - t) / .15) * (.7 + .3 * np.sin(2 * np.pi * 3 * t))
    x = hp(x, 900)
    pn = np.linspace(-.6, .6, len(x))
    L = x * np.cos((pn + 1) * np.pi / 4) * 1.414; R = x * np.sin((pn + 1) * np.pi / 4) * 1.414
    a = int(t0 * SR); fol[a:a + len(x), 0] += L * .11; fol[a:a + len(x), 1] += R * .11
def tick(t0, i):
    t = tt(.09); x = (np.sin(2 * np.pi * (1750 + 90 * (i % 3)) * t) * np.exp(-t / .012) * .8 + hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / .004) * .6)
    add(fol, x, t0, .16, .0)
def slide(t0, t1):
    d = t1 - t0; t = tt(d); n = rng.standard_normal(len(t)); u = t / d
    x = bp(n, 350, 900) * np.exp(-((u - .25) / .22) ** 2) + bp(n, 900, 2600) * np.exp(-((u - .5) / .25) ** 2) * 1.1 + bp(n, 2600, 6500) * np.exp(-((u - .75) / .2) ** 2) * .8
    x *= ss(t / .5) * ss((d - t) / .7)
    add(fol, x, t0, .13, 0.0)
for e in EV:
    if e['type'] == 'pen': pen(e['t'], e['t1'], e['s'])
    elif e['type'] == 'tick': tick(e['t'], e['i'])
    elif e['type'] == 'slide': slide(e['t'], e['t1'])

# room tone and paper air, the only sound before the pen and after the last chord
t = tt(DUR)[:N]; rt = lp(rng.standard_normal(N), 650) * .05 + bp(rng.standard_normal(N), 3000, 7000) * .006
rt *= (.8 + .2 * np.sin(2 * np.pi * .13 * t)) * ss(t / 1.2) * (1 - ss((t - (DUR - 3)) / 2.8) * .55)
room = np.stack([rt, np.roll(rt, 311)], 1)

mix = music * .95 + fol + room
mix[:, 0] = limit(mix[:, 0], .9); mix[:, 1] = limit(mix[:, 1], .9)
sf.write(os.path.join(OUT, 'mix.wav'), mix.astype(np.float32), SR)
for k, s in stems.items(): sf.write(os.path.join(OUT, f'stem_{k}.wav'), s.astype(np.float32), SR)
print('mix.wav', DUR, 's, peak', float(np.abs(mix).max()))
