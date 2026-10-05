"""Sound for "Kettle Clash" (Versus Screen demo): an original driving loop at 120 BPM in A minor, then C major for the win, plus one designed sound per event
in events.json. Everything is numpy synthesis (no samples, no recordings, no voice).
usage: .venv/bin/python styles/versus-screen/demo/mix.py   (after core/render/events.mjs)"""
import os, sys, json
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(96)
class Snd(np.ndarray):                                  # arrays that add with zero padding, so sounds of different lengths can be summed
    def __add__(a, b):
        b = np.asarray(b); n = max(len(a), len(b)); o = np.zeros(n); o[:len(a)] += np.asarray(a); o[:len(b)] += b; return o.view(Snd)
    __radd__ = __add__
def snd(f):
    return lambda *a, **k: np.asarray(f(*a, **k)).view(Snd)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def saw(f, d, det=0.0):
    t = tv(d); ph = (f * (1 + det) * t) % 1; return 2 * ph - 1
def sweep_sine(f0, f1, d, k=12):
    t = tv(d); f = f1 + (f0 - f1) * np.exp(-t * k); return np.sin(2 * np.pi * np.cumsum(f) / SR)

# ----------------------------------------------------------------- instruments
def kick(v=1.0):
    t = tv(.42); x = sweep_sine(150, 46, .42, 22) * np.exp(-t / .17) + .25 * sweep_sine(300, 90, .42, 40) * np.exp(-t / .03)
    x += hp(noise(.42), 3000) * np.exp(-t / .004) * .18
    return x * v * np.clip(t / .0015, 0, 1)
def clap(v=1.0):
    d = .3; t = tv(d); x = 0
    for o in (0, .011, .023): x = x + np.roll(bp(noise(d), 1100, 3800), int(o * SR)) * np.exp(-np.maximum(t - o, 0) / .006) * (t >= o)
    x += bp(noise(d), 900, 3000) * np.exp(-t / .07) * .5
    return x * v
def hat(v=1.0, d=.05): t = tv(d); return hp(noise(d), 7000) * np.exp(-t / (d * .3)) * v
def ohat(v=1.0): d = .22; t = tv(d); return hp(noise(d), 6000) * np.exp(-t / .07) * v * .8
def bassn(f, d=.22, v=1.0):
    t = tv(d); env = np.clip(t / .004, 0, 1) * np.exp(-t / (d * .8)) * np.clip((d - t) / .02, 0, 1)
    x = lp(saw(f, d), 520, 2) + np.sin(2 * np.pi * f * t) * .5
    return np.tanh(x * 1.4) * env * v
def stab(fs, d=.3, v=1.0, cut=2600):
    t = tv(d); env = np.clip(t / .004, 0, 1) * np.exp(-t / (d * .45)) * np.clip((d - t) / .04, 0, 1); x = 0
    for f in fs:
        for dt in (-.006, .0, .006): x = x + saw(f, d, dt)
    return lp(x, cut, 2) * env * v / (len(fs) * 2.2)
def pluck(f, d=.18, v=1.0):
    t = tv(d); env = np.clip(t / .002, 0, 1) * np.exp(-t / (d * .4)); x = np.sign(np.sin(2 * np.pi * f * t)) * .6 + np.sin(2 * np.pi * f * 2 * t) * .3
    return lp(x, 4200, 2) * env * v
def riser(d, v=1.0):
    t = tv(d); p = t / d; n = noise(d); out = np.zeros_like(n); nb = 24
    for i in range(nb):                                    # a rising band: sweep the filter in blocks
        a, b = int(len(t) * i / nb), int(len(t) * (i + 1) / nb); c = 300 * (40 ** ((i + .5) / nb))
        out[a:b] = bp(n, c * .7, min(20000, c * 1.4), 2)[a:b]
    tone = np.sin(2 * np.pi * np.cumsum(80 * (14 ** p)) / SR) * .5
    return (out * 1.2 + tone) * p ** 1.8 * v
def gong(v=1.0, d=6.5):
    t = tv(d); x = 0
    for k, (m, a, tau) in enumerate([(1, 1, 2.8), (1.51, .8, 2.2), (2.04, .7, 1.9), (2.76, .6, 1.4), (3.37, .45, 1.0), (4.09, .35, .8), (5.43, .25, .5), (6.87, .12, .3)]):
        x = x + a * np.sin(2 * np.pi * 98 * m * t * (1 + .0007 * np.sin(2 * np.pi * (1.3 + k * .17) * t)) + k) * np.exp(-t / tau)
    x += lp(noise(d), 1800) * np.exp(-t / .25) * .6
    return x * v * np.clip(t / .004, 0, 1) * .5

# ----------------------------------------------------------------- event sounds
def thump(v=1.0, f=60, d=.5): t = tv(d); return sweep_sine(f * 2.6, f, d, 18) * np.exp(-t / (d * .38)) * v
def crunch(v=1.0, d=.25): t = tv(d); return bp(noise(d), 500, 6000) * np.exp(-t / .04) * v
def metal(f, d=.5, v=1.0):
    t = tv(d); x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / tau) for m, a, tau in [(1, 1, .18), (2.76, .5, .1), (5.4, .3, .06), (8.9, .15, .03)]); return x * v * np.clip(t / .001, 0, 1)
def zing(v=1.0, d=.35): t = tv(d); f = 9000 - 5500 * (t / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .1) * v * .5 + hp(noise(d), 5000) * np.exp(-t / .08) * v * .5
def beep(f, d=.09, v=1.0):
    t = tv(d); return np.sign(np.sin(2 * np.pi * f * t)) * np.clip(t / .002, 0, 1) * np.clip((d - t) / .01, 0, 1) * .5 * v
def fillx(k, n, v=1.0):
    f = 520 * 2 ** (k / n * 1.3); t = tv(.05); return (np.sin(2 * np.pi * f * t) * .6 + bp(noise(.05), 2000, 6000) * .25) * np.exp(-t / .014) * v
def whoosh(d=.4, v=1.0, up=True):
    t = tv(d); p = t / d; env = np.sin(np.pi * p) ** 1.6; n = noise(d); out = np.zeros_like(n); nb = 12
    for i in range(nb):
        a, b = int(len(t) * i / nb), int(len(t) * (i + 1) / nb); c = 500 * (8 ** (((i + .5) / nb) if up else (1 - (i + .5) / nb)))
        out[a:b] = bp(n, c * .6, c * 1.6, 2)[a:b]
    return out * env * v * 1.4

for _n in ('thump', 'crunch', 'metal', 'zing', 'beep', 'fillx', 'whoosh', 'riser', 'stab', 'gong'): globals()[_n] = snd(globals()[_n])
def make(e):
    ty, v = e['type'], e.get('v', 1.0); k = e.get('k', 0)
    if ty == 'slam': return thump(.9 * v, 62, .4) + crunch(.3, .15) + whoosh(.2, .25, False)[:int(.2 * SR)]
    if ty == 'banner': return thump(1.0 * v, 52, .55) + crunch(.4, .2) + metal(660, .4, .25)
    if ty == 'sticker': return fillx(8, 10, .9) + metal(1500, .25, .35)
    if ty == 'tick': return fillx(2 + k, 8, .8) + hp(noise(.02), 3000) * .15 * np.exp(-tv(.02) / .005)
    if ty == 'lock': return metal(880, .5, .5) + thump(.5, 80, .3) + metal(1320, .4, .25)
    if ty == 'whoosh': return whoosh(.45, .8 * v)
    if ty == 'sweep': return whoosh(.4, .9) + hp(noise(.3), 5000) * np.exp(-tv(.3) / .12) * .3
    if ty == 'crack': return crunch(1.2, .3) + thump(1.0, 48, .7) + zing(.5)
    if ty == 'land': return thump(1.0 * v, 56, .5) + metal(310, .6, .35) + crunch(.4, .12)
    if ty == 'plate': return whoosh(.22, .5)[:int(.22 * SR)] + metal(520, .35, .4) + crunch(.3, .08)
    if ty == 'riser': return riser(e.get('dur', 1.5), .9)
    if ty == 'vs': return thump(1.6, 44, 1.2) + crunch(1.0, .5) + metal(220, 1.2, .45) + hp(noise(1.0), 4000) * np.exp(-tv(1.0) / .35) * .6 + zing(.6)
    if ty == 'beep': return beep([523, 523, 523][min(k, 2)], .12, 1.0) + thump(.5, 70, .2)
    if ty == 'go': return beep(1046, .35, 1.0) + beep(1568, .35, .6) + thump(1.2, 50, .6) + hp(noise(.6), 5000) * np.exp(-tv(.6) / .2) * .5
    if ty == 'fill': return fillx(k, e.get('of', 16), .75)
    if ty == 'ko': return thump(1.7 * v, 46, .9) + crunch(1.1, .35) + metal(180, .8, .5) + metal(3100, .5, .22) + hp(noise(.5), 4500) * np.exp(-tv(.5) / .12) * .6
    if ty == 'spark': return zing(.9, .4) + metal(2400, .4, .25)
    if ty == 'chunk': return thump(.9, 70, .4) + crunch(.7, .25) + whoosh(.25, .3, False)[:int(.25 * SR)]
    if ty == 'pip': return metal(1175, .35, .5) + fillx(12, 12, .5)
    if ty == 'row': return thump(.5, 90, .2) + fillx(6, 8, .7)
    if ty == 'tickmark': return metal(1760, .3, .4)
    if ty == 'score': return thump(1.7 * v, 44, 1.0) + crunch(1.0, .4) + stab([57, 60, 64, 69] and [mtof(m) for m in (45, 57, 60, 64)], .7, 1.4, 3600) * .9 + zing(.5)
    if ty == 'gong': return gong(1.15)
    if ty == 'close': return thump(1.3, 38, 1.2) + whoosh(.6, .6, False)
    return None

# ----------------------------------------------------------------- score
mus = np.zeros((N, 2)); rev = np.zeros((N, 2))
def music_gain():                                           # sections, the near-silences, and hit-stop gaps
    g = np.ones(N)
    def seg_(a, b, v, fa=.03, fb=.03): g[:] *= 1 - (1 - v) * np.clip((tt - a) / fa, 0, 1) * np.clip((b - tt) / fb, 0, 1)
    seg_(7.75, 8.5, 0.0, .05, .02)                           # silence 1: the room holds its breath before VS
    seg_(48.0, 49.0, 0.0, .04, .01)                          # silence 2: before the winner
    for e in EV:
        if e['type'] in ('vs', 'ko', 'score', 'gong', 'go'): seg_(e['t'] - .005, e['t'] + .125, .0, .004, .01)   # hit-stop: the music is cut for the three held frames
        if e['type'] in ('vs', 'ko', 'score', 'gong'): seg_(e['t'] + .125, e['t'] + .6, .55, .01, .3)          # then ducks under the impact
    return g
def bar_chords(t0, t1, chords, roots, hat_v=.55, kick_on=True, stab_on=True, lead=False, clap_on=True, bass_on=True, vel=1.0, kick_v=1.0):
    b = 0
    while t0 + b * BAR < t1 - 1e-6:
        T = t0 + b * BAR; ch = chords[b % len(chords)]; r = roots[b % len(roots)]
        for i in range(8):
            ts = T + i * BEAT / 2
            if ts >= t1: break
            if i % 2 == 0 and kick_on: add(mus, kick(.75 * vel * kick_v), ts, 1.0)
            if i in (2, 6) and clap_on: add(mus, clap(.8 * vel), ts, 1.0, .08)
            add(mus, hat(.7 * hat_v * vel * (1.0 if i % 2 else .55)), ts, 1.0, -.2 if i % 2 else .2)
            if i % 4 == 3: add(mus, ohat(.5 * vel), ts, 1.0, .25)
            if bass_on and i not in (3, 7):
                add(mus, bassn(mtof(r + (12 if i == 5 else 0)), BEAT * .45, .75 * vel), ts, 1.0)
            if stab_on and i in (3, 7): add(rev, stab([mtof(m) for m in ch], BEAT * .6, .9 * vel), ts, 1.0, .05 if i == 3 else -.05)
        if lead:
            seq = [ch[0], ch[1], ch[2], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]] * 2
            for i in range(16):
                ts = T + i * BEAT / 4
                if ts < t1: add(rev, pluck(mtof(seq[i] + 12), .2, .45 * vel), ts, 1.0, -.3 if i % 2 else .3)
        b += 1
AM = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]; AMR = [45, 41, 48, 43]
CM = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]]; CMR = [48, 43, 45, 41]
# select screen: light groove, bass and a small pluck line
bar_chords(0, 5.5, AM, AMR, hat_v=.4, kick_on=True, stab_on=False, clap_on=False, vel=.6, kick_v=.6)
for i, m in enumerate([69, 72, 76, 72, 79, 76, 72, 69] * 3):
    ts = 0.5 + i * BEAT / 2
    if ts < 5.4: add(rev, pluck(mtof(m), .2, .4), ts, 1.0, -.2 + .4 * (i % 2))
# entrance: the bass pulse alone with a snare-ish build, then the drop (silence by music_gain)
bar_chords(5.5, 7.75, AM, AMR, hat_v=.5, stab_on=False, clap_on=False, vel=.85)
for i in range(9): add(mus, clap(.35 + .06 * i), 6.85 + i * .1 - i * i * .0045, 1.0)
# the fight: Am F C G; round banners (first bar of each round) are lighter, later rounds add the lead
add(mus, kick(1.2), 8.5, 1.0)
bar_chords(8.5, 12.0, AM, AMR, vel=1.0, stab_on=True)
import json as _j; NR = len(_j.load(open(os.path.join(HERE, 'data.json')))['rounds']); V0 = 12 + 8 * NR
for n in range(1, NR + 1):
    s = 12 + 8 * (n - 1)
    bar_chords(s, s + 2, AM, AMR, vel=.9, stab_on=False, lead=False, clap_on=(n > 1))          # banner bar: bass and drums, no stabs
    bar_chords(s + 2, s + 8, AM[(2 * (n % 2)) % 4:] + AM, AMR[(2 * (n % 2)) % 4:] + AMR, vel=1.0, stab_on=True, lead=(n >= 3))
    for i in range(8): add(mus, hat(.5 + .08 * i, .06), s + 3.0 + i * .125, 1.0, -.3 + .08 * i)    # a hat roll under the bar fill
# the verdict: stripped back, a riser into the silence, then the gong and C major
bar_chords(V0, V0 + 4, AM, AMR, vel=.8, kick_on=False, clap_on=False, stab_on=False, hat_v=.5)
add(rev, riser(1.6, .9), V0 + 2.4, 1.0)
add(mus, kick(1.4), V0 + 5.0, 1.0)
bar_chords(V0 + 5.0, V0 + 11.0, CM, CMR, vel=1.05, stab_on=True, lead=True)
add(rev, stab([mtof(m) for m in (48, 60, 64, 67, 72)], 1.2, 1.5, 3800), V0 + 11.0, 1.0)
mus = mus * music_gain()[:, None]; rev = rev * music_gain()[:, None]
# a small hall on the stabs, pluck and risers
ir = rng.standard_normal(int(1.1 * SR)) * np.exp(-np.arange(int(1.1 * SR)) / SR / .28); ir = lp(ir, 5000, 1); ir[:int(.012 * SR)] *= 0; ir /= np.abs(ir).sum() / 6
wet = np.stack([fftconvolve(rev[:, 0], ir)[:N], fftconvolve(rev[:, 1], ir[::-1] * .9)[:N]], 1)
music = mus + rev * .75 + wet * .5

# ----------------------------------------------------------------- event sounds
fx = np.zeros((N, 2)); fxw = np.zeros((N, 2))
for e in EV:
    x = make(e)
    if x is None: continue
    big = e['type'] in ('vs', 'ko', 'score', 'gong', 'riser', 'go', 'crack')
    add(fxw if big else fx, x, e['t'], 1.0, e.get('pan', 0.0))
fxwet = np.stack([fftconvolve(fxw[:, 0], ir)[:N], fftconvolve(fxw[:, 1], ir)[:N]], 1)
sfx_mix = fx + fxw * .9 + fxwet * .35
# a quiet arena bed: a low crowd murmur that swells on the beat
bed = lp(noise(DUR), 700, 2) * (.05 + .03 * np.clip((tt - 5.5) / 3, 0, 1)); bed = bed * (1 - .9 * ((tt > V0 + 4.0) & (tt < V0 + 5.0)))
bedst = np.stack([bed, np.roll(bed, 900)], 1)

# music about 3 dB under the effects at the hits; the mux normalises to -14 LUFS
mix = np.stack([hp(music[:, 0], 35, 2), hp(music[:, 1], 35, 2)], 1) * .55 + sfx_mix * .8 + bedst
mix = np.tanh(mix * .9) / np.tanh(.9)
mix = np.stack([sfx.limit(mix[:, 0], .45), sfx.limit(mix[:, 1], .45)], 1)
pk = np.abs(mix).max(); mix = mix / pk * .8
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR); print('mix.wav', DUR, 's, peak', round(float(pk), 2))
