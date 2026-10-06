"""Sound for "Why is the sky blue?": narration from voices/, a light marimba-and-pluck score, pen and pop foley from events.json. numpy only."""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
BPM = 108; BEAT = 60 / BPM
N = int(DUR * SR); rng = np.random.default_rng(7)
mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros(N)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def put(buf, x, at, g=1.0, pan=0.0):
    s = int(round(at * SR)); e = min(N, s + len(x))
    if s < 0 or s >= N: return
    l = g * (1 - max(0, pan)); r = g * (1 + min(0, pan))
    buf[s:e, 0] += x[:e - s] * l; buf[s:e, 1] += x[:e - s] * r
def marimba(f, d=.5, v=1.0):
    t = np.arange(int(d * SR)) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / .16) + .35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / .05) + .12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / .02)
    return x * np.minimum(1, t / .002) * v
def pluck(f, d=.4, v=1.0):
    t = np.arange(int(d * SR)) / SR
    x = (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / .12)
    return x * np.minimum(1, t / .003) * v
def shaker(v=.5):
    x = sfx.hp(sfx.noise(.05), 6000, 2) * np.exp(-np.arange(int(.05 * SR)) / SR / .015); return x * v
# score: C major pentatonic, a 4-bar loop: bass on 1 and 3, a marimba figure on the offbeats, a shaker on the eighths
SCALE = [60, 62, 64, 67, 69, 72, 74, 76]
CH = [(48, [64, 67, 72]), (45, [64, 69, 72]), (53, [65, 69, 72]), (55, [62, 67, 71])]
FIG = [0, 2, 4, 2, 5, 4, 2, 3]
bars = int(DUR / (4 * BEAT)) + 1
for b in range(bars):
    root, ch = CH[b % 4]; t0 = b * 4 * BEAT
    ramp = min(1.0, .35 + b / 5)
    put(mus, pluck(mtof(root - 12), .5, .9), t0, .55 * ramp); put(mus, pluck(mtof(root - 12), .4, .8), t0 + 2 * BEAT, .45 * ramp)
    for i in range(8):
        at = t0 + i * BEAT / 2
        if i % 2 == 1 or b > 1: put(mus, marimba(mtof(SCALE[FIG[(i + b * 3) % 8]] + (0 if b % 4 != 2 else 0)), .5, .8), at, .32 * ramp, pan=(-.3 if i % 2 else .3))
        put(mus, shaker(.4 if i % 2 else .25), at, .3 * ramp)
    if b % 2 == 0:
        for k, n in enumerate(ch): put(mus, marimba(mtof(n), .9, .6), t0 + k * .02, .16 * ramp)
# foley
for e in EV:
    t, ty, v = e['t'], e['type'], e.get('v', 1)
    if ty == 'voice':
        w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
        if w.ndim > 1: w = w.mean(1)
        if sr != SR: w = soxr.resample(w, sr, SR)          # voice files are 24 kHz, the mix is 48 kHz
        s = int(round(t * SR)); vo[s:s + len(w)] += w[:N - s]
    elif ty == 'pop': put(fx, sfx.pop(1.0), t, .6 * v, pan=(hash((round(t * 10))) % 5 - 2) * .15)
    elif ty == 'whoosh': put(fx, sfx.whoosh(.45, 1.0), t, .55 * v)
    elif ty == 'ding': put(fx, sfx.ding(1.0), t, .5 * v)
    elif ty == 'stamp': put(fx, sfx.thump(1.0, 90), t, .9 * v); put(fx, sfx.click(1.0, 1.0), t, .5 * v); put(fx, marimba(mtof(72), .8, 1), t + .05, .5); put(fx, marimba(mtof(79), .8, 1), t + .12, .45)
    elif ty == 'sparkle':
        for k, n in enumerate([84, 88, 91, 96]): put(fx, marimba(mtof(n), .5, .8), t + k * .06, .22 * v, pan=-.4 + k * .27)
    elif ty == 'boing':
        d = .22; tt = np.arange(int(d * SR)) / SR; f = 300 + 500 * np.exp(-tt / .05); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .08); put(fx, x, t, .3 * v)
    elif ty == 'pen':
        d = e.get('dur', 1.0); x = sfx.bp(sfx.noise(d), 1800, 6500, 2); env = np.abs(np.sin(np.arange(len(x)) / SR * 9)) ** .6 * .7 + .15 * (rng.random(len(x)) > .985); put(fx, x * env * .06, t, v)
# voice: compress, then the music ducks under it
vo = sfx.compress(vo, .2, 3.0)
import scipy.signal as sg
env = np.abs(vo); win = int(.12 * SR); env = np.convolve(env, np.ones(win) / win, 'same'); duck = 1 - .5 * np.clip(env * 12, 0, 1)
duck = np.convolve(duck, np.ones(int(.15 * SR)) / int(.15 * SR), 'same')
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-9)
vg = 1.0
mix = mus * duck[:, None] * .8 + fx + np.stack([vo, vo], 1) * 1.6
mix = np.tanh(mix * .9) / np.tanh(.9)
mix = np.stack([sfx.limit(mix[:, 0], .6), sfx.limit(mix[:, 1], .6)], 1); mix = mix / np.abs(mix).max() * .8
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR); print('mix.wav', DUR, 's')
