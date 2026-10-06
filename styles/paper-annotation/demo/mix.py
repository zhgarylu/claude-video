"""Sound for "How to read a paper": narration from voices/, a warm lo-fi score, marker / pen / paper foley from events.json. numpy only."""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
BPM = 84; BEAT = 60 / BPM
N = int(DUR * SR); mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros(N); rng = np.random.default_rng(5)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def put(buf, x, at, g=1.0, pan=0.0):
    s = int(round(at * SR)); e = min(N, s + len(x))
    if s < 0 or s >= N: return
    pan = float(np.clip(pan, -1, 1)); l = g * (1 - max(0, pan)); r = g * (1 + min(0, pan))
    buf[s:e, 0] += x[:e - s] * l; buf[s:e, 1] += x[:e - s] * r
def keys(f, d=1.2, v=1.0):                                              # an electric-piano-ish tone: sine + a soft bell partial that decays fast
    t = np.arange(int(d * SR)) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / .6) + .3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .25) + .15 * np.sin(2 * np.pi * f * 7.1 * t) * np.exp(-t / .05)
    return x * np.minimum(1, t / .004) * v
def bass(f, d=.7, v=1.0):
    t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * f * t) * np.exp(-t / .3) * np.minimum(1, t / .01) * v
def brush(v=.5):
    d = .09; x = sfx.hp(sfx.noise(d), 4000, 2) * np.exp(-np.arange(int(d * SR)) / SR / .03); return x * v
# score: Cmaj7 - Am7 - Dm7 - G7, keys on the chord, a bass on 1 and 3, a brush on the off-beats; sparse at first
CH = [(36, [60, 64, 67, 71]), (33, [57, 60, 64, 67]), (38, [62, 65, 69, 72]), (31, [59, 62, 65, 67])]
bars = int(DUR / (4 * BEAT)) + 1
for b in range(bars):
    root, ch = CH[b % 4]; t0 = b * 4 * BEAT; ramp = min(1.0, .4 + b / 5)
    for k, n in enumerate(ch): put(mus, keys(mtof(n), 2.4, 1.0), t0 + k * .015, .12 * ramp, pan=-.2 + k * .13)
    put(mus, bass(mtof(root), .9, 1.0), t0, .5 * ramp); put(mus, bass(mtof(root), .6, .8), t0 + 2 * BEAT, .4 * ramp)
    if b >= 1:
        for i in range(8):
            if i % 2 == 1: put(mus, brush(.6), t0 + i * BEAT / 2, .3 * ramp, pan=.3)
        for k, n in enumerate([ch[2], ch[3], ch[1], ch[2]]): put(mus, keys(mtof(n + 12), .8, 1.0), t0 + (1 + k) * BEAT * .75 + .2, .1 * ramp, pan=.3)
for e in EV:
    t, ty, v = e['t'], e['type'], e.get('v', 1)
    if ty == 'voice':
        w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
        if w.ndim > 1: w = w.mean(1)
        if sr != SR: w = soxr.resample(w, sr, SR)          # voice files are 24 kHz, the mix is 48 kHz
        s = int(round(t * SR)); vo[s:s + len(w)] += w[:N - s]
    elif ty == 'paper': d = .5; x = sfx.lp(sfx.noise(d), 2500, 2) * np.hanning(int(d * SR)) ** 2; put(fx, x, t, .5 * v)
    elif ty == 'turn': d = .7; x = sfx.bp(sfx.noise(d), 600, 4500, 2) * np.hanning(int(d * SR)); put(fx, x, t, .55 * v)
    elif ty == 'mark':
        d = e.get('dur', 1.5); x = sfx.bp(sfx.noise(d), 1200, 3800, 2); env = (.55 + .45 * np.sin(np.arange(len(x)) / SR * 38)) * np.minimum(1, np.arange(len(x)) / SR / .08) * np.minimum(1, (d - np.arange(len(x)) / SR) / .1); put(fx, x * env * .1, t, v, pan=-.2)
    elif ty == 'circle':
        d = e.get('dur', .7); x = sfx.bp(sfx.noise(d), 2200, 7000, 2); env = np.abs(np.sin(np.arange(len(x)) / SR * 14)) ** .7 * np.minimum(1, (d - np.arange(len(x)) / SR) / .08); put(fx, x * env * .07, t, v, pan=-.2)
    elif ty == 'note': put(fx, sfx.pop(1.0), t, .45 * v, pan=.3); put(fx, keys(mtof(79), .6, 1.0), t + .02, .1 * v, pan=.3)
    elif ty == 'tick': put(fx, sfx.click(1.4, .8), t, .3 * v, pan=.3); put(fx, keys(mtof(84), .5, 1.0), t + .01, .12 * v, pan=.3)
    elif ty == 'bars':
        for k in range(2): put(fx, keys(mtof(72 + 4 * k), .5, 1.0), t + .25 * k, .1 * v)
    elif ty == 'stamp': put(fx, sfx.thump(1.0, 100), t, .6 * v); put(fx, sfx.click(1.0, 1.0), t, .3)
    elif ty == 'resolve':
        for k, n in enumerate((60, 67, 72, 76, 79)): put(fx, keys(mtof(n), 1.8, 1.0), t + k * .08, .16 * v, pan=-.5 + k * .25)
vo = sfx.compress(vo, .2, 3.0)
env = np.abs(vo); win = int(.12 * SR); env = np.convolve(env, np.ones(win) / win, 'same'); duck = 1 - .45 * np.clip(env * 12, 0, 1)
k = int(.15 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
mix = mus * duck[:, None] * .9 + fx + np.stack([vo, vo], 1) * 1.6
mix = np.tanh(mix * .9) / np.tanh(.9)
mix = np.stack([sfx.limit(mix[:, 0], .55), sfx.limit(mix[:, 1], .55)], 1); mix = mix / np.abs(mix).max() * .8
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR); print('mix.wav', DUR, 's')
