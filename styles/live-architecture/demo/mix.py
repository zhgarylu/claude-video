"""Sound for "What happens when you open a web page": narration from voices/, a soft pulse-and-pluck score, UI blips from events.json. numpy only."""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
BPM = 100; BEAT = 60 / BPM
N = int(DUR * SR); mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros(N)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def put(buf, x, at, g=1.0, pan=0.0):
    s = int(round(at * SR)); e = min(N, s + len(x))
    if s < 0 or s >= N: return
    pan = float(np.clip(pan, -1, 1)); l = g * (1 - max(0, pan)); r = g * (1 + min(0, pan))
    buf[s:e, 0] += x[:e - s] * l; buf[s:e, 1] += x[:e - s] * r
def pluck(f, d=.5, v=1.0):
    t = np.arange(int(d * SR)) / SR
    x = (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * 2 * f * t) + .12 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t / .13)
    return x * np.minimum(1, t / .003) * v
def pad(f, d, v=1.0):
    t = np.arange(int(d * SR)) / SR
    x = sum(np.sin(2 * np.pi * f * k * t + k) / k for k in (1, 2, 3)) * (np.minimum(1, t / .6) * np.minimum(1, (d - t) / .8))
    return sfx.lp(x, 1800, 2) * v
def blip(f0, f1, d=.12, v=1.0):
    t = np.arange(int(d * SR)) / SR; f = f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * .5)) * np.minimum(1, t / .002) * v
# score: A minor, a pad on the chords, a plucked eighth-note figure that thickens
CH = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]
FIG = [0, 2, 4, 7, 4, 2, 5, 4]; SC = [57, 60, 62, 64, 67, 69, 72, 74]
bars = int(DUR / (4 * BEAT)) + 1
for b in range(bars):
    root, ch = CH[b % 4]; t0 = b * 4 * BEAT; ramp = min(1.0, .3 + b / 6)
    for n in ch: put(mus, pad(mtof(n), 4 * BEAT + .4, .5), t0, .13 * ramp)
    put(mus, pluck(mtof(root - 12), .6, 1.0), t0, .5 * ramp); put(mus, pluck(mtof(root - 12), .5, .8), t0 + 2 * BEAT, .4 * ramp)
    if b >= 1:
        for i in range(8): put(mus, pluck(mtof(SC[FIG[(i + b) % 8]]), .35, .8), t0 + i * BEAT / 2, .16 * ramp * (1 if i % 2 == 0 else .6), pan=-.3 + .08 * i)
# events
for e in EV:
    t, ty, v, pan = e['t'], e['type'], e.get('v', 1), e.get('pan', 0)
    if ty == 'voice':
        w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
        if w.ndim > 1: w = w.mean(1)
        if sr != SR: w = soxr.resample(w, sr, SR)          # voice files are 24 kHz, the mix is 48 kHz
        s = int(round(t * SR)); vo[s:s + len(w)] += w[:N - s]
    elif ty == 'pop': put(fx, sfx.pop(1.0), t, .5 * v, pan)
    elif ty == 'blip': put(fx, blip(520, 880, .14), t, .22 * v, pan)
    elif ty == 'arrive': put(fx, blip(660, 520, .12), t, .2 * v, pan); put(fx, sfx.click(1.2, .5), t, .15, pan)
    elif ty == 'hit': put(fx, blip(660, 660, .3), t, .22 * v, pan); put(fx, blip(990, 990, .4), t + .09, .22 * v, pan)
    elif ty == 'miss': put(fx, blip(300, 170, .35), t, .3 * v, pan)
    elif ty == 'whoosh': put(fx, sfx.whoosh(.6, 1.0), t, .4 * v)
    elif ty == 'tag': put(fx, sfx.click(1.6, .6), t, .25 * v)
    elif ty == 'resolve':
        for k, n in enumerate((57, 64, 69, 72, 76)): put(fx, pluck(mtof(n), 1.4, 1.0), t + k * .07, .22 * v, pan=-.5 + k * .25)
vo = sfx.compress(vo, .2, 3.0)
env = np.abs(vo); win = int(.12 * SR); env = np.convolve(env, np.ones(win) / win, 'same'); duck = 1 - .45 * np.clip(env * 12, 0, 1)
k = int(.15 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
mix = mus * duck[:, None] * .85 + fx + np.stack([vo, vo], 1) * 1.6
mix = np.tanh(mix * .9) / np.tanh(.9)
mix = np.stack([sfx.limit(mix[:, 0], .55), sfx.limit(mix[:, 1], .55)], 1); mix = mix / np.abs(mix).max() * .8
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR); print('mix.wav', DUR, 's')
