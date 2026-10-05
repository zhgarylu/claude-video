"""Sound for "Drip 1" (assembly-manual demo): an original soft marimba loop in C major pentatonic (100 BPM), foley for every event in
events.json, and the narration. No samples. usage: .venv/bin/python styles/assembly-manual/demo/mix.py  (after events.mjs and the voice step)"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, add as sadd
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
BPM = 100; BEAT = 60 / BPM; BAR = 4 * BEAT
N = int(DUR * SR); music = np.zeros((N, 2)); fx = np.zeros((N, 2)); voice = np.zeros((N, 2))
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def T(d): return np.arange(int(d * SR)) / SR

# ---- score: marimba-like pluck (sine + a fast-dying 4th partial), soft bass with 2nd/3rd harmonics, shaker ----
def mar(m, d=.9, v=1.0):
    t = T(d); f = mtof(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / .32) + .35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .05) + .12 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .2)
    return x * np.minimum(1, t / .003) * v
def bass(m, d=.55, v=1.0):
    t = T(d); f = mtof(m); e = np.exp(-t / .22) * np.minimum(1, t / .006)
    return (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * 2 * f * t) + .22 * np.sin(2 * np.pi * 3 * f * t)) * e * v
def pad(ms, d, v=1.0):
    t = T(d); x = sum(np.sin(2 * np.pi * mtof(m) * t) + .3 * np.sin(2 * np.pi * mtof(m) * 2.003 * t) for m in ms)
    return x * np.minimum(1, t / .6) * np.minimum(1, (d - t) / 1.2) * v / len(ms)
def put(buf, x, at, g=1.0, pan=0.0):
    sadd(buf, x, at, g, pan)
CH = [([60, 64, 67, 72], 48), ([57, 60, 64, 69], 45), ([53, 57, 60, 65], 41 + 12), ([55, 59, 62, 67], 43 + 12)]
rng = np.random.default_rng(3)
def bar_on(b, a, z): return a <= b * BAR < z
for b in range(int(DUR / BAR) + 1):
    t0 = b * BAR; ch, bs = CH[b % 4]
    if t0 < 2.4 or 45.6 <= t0 < 50.4 or t0 >= DUR: continue
    full = 12 <= t0 < 43.2; thin = 43.2 <= t0 < 45.6; fin = t0 >= 50.4
    for k in range(8):                                         # arpeggio on eighths; the tune walks up and down the chord
        idx = [0, 1, 2, 1, 3, 2, 1, 2][k]
        if thin and k % 2: continue
        if not (full or fin) and k % 2: continue                # opening bars: quarter notes only
        put(music, mar(ch[idx] + (0 if k % 4 else 0), .9, .55 if k % 2 == 0 else .4), t0 + k * BEAT / 2, 1.0, -.25 + .5 * (k % 3) / 2)
    if full or fin or t0 >= 4.8: put(music, bass(bs - 12, .7, .8), t0, .9)
    if full or fin: put(music, bass(bs - 12, .45, .5), t0 + 2 * BEAT, .9)
    if full:
        for k in range(8):
            sh = sfx.hp(sfx.noise(.05), 5000) * sfx.env_exp(.05, .012); put(music, sh, t0 + k * BEAT / 2 + (BEAT / 4 if k % 2 else 0), .10 if k % 2 else .06)
    if fin: put(music, pad(ch, BAR + .6, .5), t0, .9)
    if thin: put(music, pad(ch[:3], BAR, .35), t0, .8)
music *= .42

# ---- foley, one sound per event ----
def S(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
def blip(f0, f1, d, tau):
    t = T(d); f = f0 + (f1 - f0) * t / d; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * np.minimum(1, t / .002)
def water(v=1.0):                                              # a drop landing: a plink with a bubble tail
    d = .45; t = T(d); y = np.zeros(int(d * SR)); y[:len(blip(1700, 760, .12, .035))] += blip(1700, 760, .12, .035)
    y2 = blip(1100, 1800, .2, .06) * .35; y[int(.05 * SR):int(.05 * SR) + len(y2)] += y2
    return y * v
def slide(d=.55, v=1.0):
    t = T(d); n = sfx.noise(d); y = sfx.bp(n, 500, 2200) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5; return y * v * .8
def paper(v=1.0):
    d = .55; t = T(d); n = sfx.noise(d); sw = np.zeros_like(n)
    for i in range(0, len(n), 480):
        hi = min(len(n), i + 480); f = 500 + 2200 * np.sin(np.pi * i / len(n)); seg = sfx.bp(n[max(0, i - 2000):hi], f * .7, f * 1.3)[-(hi - i):]; sw[i:hi] = seg
    return sfx.norm(sw * np.sin(np.pi * t / d) ** 2 * (1 - .4 * t / d)) * v
for e in EV:
    t, ty, v = e['t'], e['type'], e.get('v', 1)
    if ty == 'whoosh': put(fx, paper(.55 * v), t, 1.0, .1)
    elif ty == 'snap': put(fx, S(sfx.click(.85, .8 * v), sfx.clack(.7, .4 * v)), t, .9)
    elif ty == 'cell': put(fx, sfx.click(1.25, .5 * v), t, .6, -.2)
    elif ty == 'tick': put(fx, blip(2100, 2100, .06, .02) * .5 * v, t, .6)
    elif ty == 'num': put(fx, sfx.pop(.5 * v), t, .8)
    elif ty == 'pop': put(fx, sfx.pop(.4 * v), t, .8, .15)
    elif ty == 'zoom': put(fx, sfx.pop(.35), t - .02, .8, .3)
    elif ty == 'zoomoff': put(fx, sfx.pop(.3)[::-1], t, .7, .3)
    elif ty == 'ratchet': put(fx, sfx.click(1.6, .45 * v), t, .6, .3)
    elif ty == 'click': put(fx, S(sfx.click(1.0, .9), sfx.clack(1.2, .5)), t, .9); put(fx, blip(2600, 2600, .25, .08) * .25, t, .6)
    elif ty == 'slide': put(fx, slide(.55, .6 * v), t - .45, .7, .1)
    elif ty == 'stamp': put(fx, S(sfx.thump(.9, 95), sfx.clack(.6, .5)), t, .8)
    elif ty == 'ding': put(fx, sfx.ding(.45 * v), t, .8, 0)
    elif ty == 'drop': put(fx, water(.8 * v), t, 1.0, .05)
fx *= .8

# ---- voice: compress, level, place; duck the music under it ----
duck = np.ones(N)
vod = os.path.join(HERE, 'voices')
for e in EV:
    if e['type'] != 'vo': continue
    x, sr = sf.read(os.path.join(vod, e['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    if sr != SR:
        import soxr; x = soxr.resample(x, sr, SR)
    x = sfx.compress(x, .22, 3.0); x = x / max(1e-6, np.abs(x).max()) * .8
    s = int(e['t'] * SR); L = min(len(x), N - s); voice[s:s + L, 0] += x[:L]; voice[s:s + L, 1] += x[:L]
    duck[max(0, s - int(.1 * SR)):s + L + int(.25 * SR)] = np.minimum(duck[max(0, s - int(.1 * SR)):s + L + int(.25 * SR)], .55)
from scipy.ndimage import uniform_filter1d
duck = uniform_filter1d(duck, int(.15 * SR))
mix = music * duck[:, None] + fx * (1 - .15 * (duck[:, None] < .9)) + voice
fade = np.minimum(1, (DUR - np.arange(N) / SR) / .8); mix *= fade[:, None]
mix = np.stack([sfx.limit(mix[:, 0], .45, .005), sfx.limit(mix[:, 1], .45, .005)], 1)
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR); print('mix.wav', DUR, 's  peak', round(float(np.abs(mix).max()), 2))
