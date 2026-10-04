"""Score, foley and room tone for "The Blue Only Arrives in the Fire". Everything is synthesised in numpy (no samples).
Reads out/events.json (brush strokes and fixed beats from the picture), writes out/mix.wav and out/score.json (music onsets, for cuecheck).
100 BPM: one beat = 0.6 s, one bar = 2.4 s; D pentatonic (D E F# A B)."""
import json, os, sys
import numpy as np
from scipy.signal import lfilter, butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
BEAT = 0.6
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = float(ev['dur'])
N = int(DUR * SR)
rng = np.random.default_rng(20260704)
L = np.zeros(N); R = np.zeros(N)
score = []                                   # (t, name) of every music onset


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def add(buf_l, buf_r, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    a = max(0, -i); b = min(len(x), N - i)
    gl = gain * np.cos((pan + 1) * np.pi / 4); gr = gain * np.sin((pan + 1) * np.pi / 4)
    buf_l[i + a:i + b] += x[a:b] * gl; buf_r[i + a:i + b] += x[a:b] * gr
def put(x, t, gain=1.0, pan=0.0): add(L, R, x, t, gain, pan)
def noise(n): return rng.standard_normal(n)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lp', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'hp', fs=SR, output='sos'), x)
def bp(x, f0, f1, o=2): return sosfilt(butter(o, [f0, f1], 'bp', fs=SR, output='sos'), x)
def env(n, a, r, curve=2.0):
    e = np.ones(n); na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 1.5; e[-nr:] *= np.linspace(1, 0, nr) ** curve; return e

# ------------------------------------------------------------------ instruments
def pluck(m, dur, bright=.5, decay=.9965, slide_from=None):
    """Karplus-Strong string via a comb filter; an optional slide resamples the note from another pitch."""
    f = hz(m); Nd = int(SR / f); n = int(dur * SR)
    x = np.zeros(n); burst = noise(Nd + 2); burst = lp(burst, 800 + 7000 * bright, 1) if Nd > 12 else burst
    x[:Nd + 2] = burst
    a = np.zeros(Nd + 3); a[0] = 1; a[Nd] = -decay * .5; a[Nd + 1] = -decay * .5
    y = lfilter([1.0], a, x)
    y = y / (np.max(np.abs(y)) + 1e-9)
    if slide_from is not None:
        ratio = hz(slide_from) / f
        r = np.linspace(ratio, 1.0, n) ** 1.0
        r = 1 + (r - 1) * np.exp(-np.linspace(0, 5, n))
        pos = np.cumsum(r); pos = np.clip(pos, 0, n - 1); y = np.interp(pos, np.arange(n), y)
    return y * env(n, .002, min(.3, dur * .3), 1.5)
def dizi(m, dur, vib=.004, breath=.05):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(m) * (1 + vib * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / .35))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + .38 * np.sin(2 * ph) + .14 * np.sin(3 * ph) + .05 * np.sin(4 * ph)
    y += breath * bp(noise(n), 2500, 5500) * 4
    return y * env(n, .09, .35, 1.2) * .55
def drum(dur=.6, f0=95):
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (f0 * np.exp(-t * 5) + 48) * t) * np.exp(-t * 7) + .35 * lp(noise(n), 500) * np.exp(-t * 18)
    return y
def bowl(m, dur=5.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    y = sum(a * np.sin(2 * np.pi * f * k * t + p) * np.exp(-t / d) for k, a, d, p in [(1, 1, 2.8, 0), (2.76, .5, 1.6, .7), (5.4, .25, .8, 1.3), (8.9, .1, .4, 2.1)])
    return y * np.minimum(1, t / .004)
def chime(f, dur=.9):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.41 * t)) * np.exp(-t * (6 + f / 700)) * np.minimum(1, t / .002)
def whoosh(dur, f0, f1, rev=False):
    n = int(dur * SR); x = noise(n)
    out = np.zeros(n); k = 24
    for i in range(k):
        a, b = int(i * n / k), int((i + 1) * n / k); f = f0 * (f1 / f0) ** (i / (k - 1))
        out[a:b] = bp(x, max(60, f * .6), min(SR / 2.2, f * 1.6), 1)[a:b]
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.3
    if rev: e = e[::-1]
    return out * e

def mus(t, name): score.append((round(t, 3), name))

# ------------------------------------------------------------------ music (D pentatonic, 100 BPM)
B = lambda b: b * BEAT
def guqin(b, m, dur=3.0, g=.55, slide=None, pan=-.2):
    put(pluck(m, dur, .35, .9972, slide), B(b), g, pan); mus(B(b), 'guqin')
def pipa(b, m, dur=1.6, g=.4, pan=.25):
    put(pluck(m, dur, .8, .994), B(b), g, pan); mus(B(b), 'pipa')
def dz(b, m, beats, g=.5, pan=0.05):
    put(dizi(m, beats * BEAT), B(b), g, pan); mus(B(b), 'dizi')
def dr(b, g=.6, f0=95): put(drum(.6, f0), B(b), g, 0); mus(B(b), 'drum')

# near silence 0-5.4: one low bowl
put(bowl(38, 6.0), 0.3, .2, 0); mus(0.3, 'bowl')
# 5.4 (beat 9) - 21: the painting. guqin alone, then pipa joins
for b, m, d, s in [(9, 38, 3.2, None), (12, 45, 2.4, None), (14, 47, 3.2, 45), (17, 38, 3.2, None), (20, 50, 2.8, None), (22, 52, 2.4, None), (24, 45, 3.0, 47), (27, 38, 3.2, None), (30, 50, 2.6, None), (32, 52, 2.4, None), (34, 45, 3.0, 47)]:
    guqin(b, m, d, .5, s)
for i, (b, m) in enumerate([(22, 57), (24, 59), (26, 62), (28, 64), (30, 62), (32, 59), (34, 57)]): pipa(b, m, 1.6, .34)
# 23.4 (beat 39) - 30.0 (beat 50): into the painting: dizi melody over a soft frame drum
for b, m, bt in [(39, 74, 3), (42, 71, 2), (44, 69, 3), (47, 66, 2), (49, 64, 1)]: dz(b, m, bt, .5)
for b in (39, 43, 47): dr(b, .5)
for b in (41, 45, 49): dr(b, .22, 140)
guqin(39, 38, 3.5, .5); guqin(47, 45, 3.0, .45, 47)
for i, (b, m) in enumerate([(40, 62), (42, 64), (44, 66), (46, 69), (48, 66)]): pipa(b, m, 1.2, .28)
# 30.0-33.6: silence for the kiln (roar only); 33.6 (beat 56): the tap on glaze, then a guqin harmonic
put(chime(2300, 1.4), B(56), .55, .1); mus(B(56), 'tap')
put(pluck(62, 4.0, .2, .9985), B(56) + .05, .35, -.1); mus(B(56) + .05, 'guqin')
for b, m, d in [(60, 45, 3.0), (64, 38, 4.0)]: guqin(b, m, d, .45)
for b, m in [(59, 62), (60, 66), (61, 69), (62, 71), (63, 69)]: pipa(b, m, 1.4, .3)
dz(61, 74, 3, .32)
# 38.4 (beat 64): the vase shatters; 43.2 (beat 72): settles. the final theme thins to one note
dr(64, .8, 80)
for b, m, bt in [(72, 69, 3), (75, 66, 2), (77, 64, 3), (80, 62, 2), (82, 66, 4)]: dz(b, m, bt, .4)
for b, m, d, s in [(72, 38, 4.0, None), (76, 45, 3.0, None), (80, 47, 3.0, 45), (84, 50, 3.0, None)]: guqin(b, m, d, .48, s)
for b, m in [(73, 62), (75, 64), (77, 66), (79, 69), (81, 66), (83, 64), (85, 62)]: pipa(b, m, 1.5, .3)
guqin(88, 50, 5.0, .4)
put(bowl(38, 6.0), B(72), .5, 0); mus(B(72), 'bowl')

# ------------------------------------------------------------------ foley from the picture's events
for e in ev['ev']:
    t = float(e['t']); ty = e['type']
    if ty in ('stroke', 'pstroke', 'ring'):
        d = max(.06, float(e.get('dur', .2))); n = int(d * SR); w = float(e.get('w', 20))
        lo = 1800 + 2600 * (1 - min(1, w / 80)); x = bp(noise(n), lo, lo * 2.4) * env(n, d * .15, d * .4, 1.0)
        g = .05 * (1.8 if ty == 'ring' else 1.0) * (.55 if ty == 'pstroke' else 1.0)
        put(x, t, g, .0)
    elif ty == 'touch': put(lp(noise(int(.05 * SR)), 1800) * np.hanning(int(.05 * SR)), t, .25)
    elif ty == 'tap': put(chime(2000, .6), t, .22, .1)
    elif ty == 'iris': put(whoosh(e['dur'], 200, 2500), t, .22); put(np.sin(2 * np.pi * np.cumsum(np.linspace(120, 420, int(e['dur'] * SR))) / SR) * np.sin(np.linspace(0, np.pi, int(e['dur'] * SR))), t, .12)
    elif ty == 'iris-close': put(whoosh(e['dur'], 200, 2500, rev=True), t, .2)
    elif ty == 'heat':      # kiln roar: brown noise swelling, plus ticking
        n = int(e['dur'] * SR); x = lp(noise(n), 260, 3) * np.linspace(0, 1, n) ** 2 * 6 + lp(noise(n), 1200, 2) * np.linspace(0, 1, n) ** 3 * .6
        put(x, t, .18)
        for _ in range(int(e['dur'] * 9)):
            tt = t + rng.random() * e['dur']; put(chime(rng.uniform(3000, 6500), .06) * .6, tt, .06 * (tt - t) / e['dur'], rng.uniform(-.8, .8))
    elif ty == 'flash': put(drum(.7, 60) * 1.4, t, .4); put(lp(noise(int(.5 * SR)), 3000) * np.exp(-np.linspace(0, 8, int(.5 * SR))), t, .25)
    elif ty == 'fire':      # cooling ticks, sparse
        for k in range(26):
            tt = t + 1.2 + k * (e['dur'] - 1.0) / 26 * (1 + .6 * rng.random()); put(chime(rng.uniform(3500, 7500), .05), tt, .05 * (1 - k / 30), rng.uniform(-.8, .8))
    elif ty == 'shatter':
        for k in range(46):
            tt = t + .02 + rng.random() ** 1.6 * 1.4; put(chime(rng.uniform(1500, 6500), .5), tt, rng.uniform(.05, .13), rng.uniform(-.9, .9))
        put(lp(noise(int(.6 * SR)), 5000) * np.exp(-np.linspace(0, 7, int(.6 * SR))), t, .3)
    elif ty == 'assemble':
        for k in range(40):
            tt = t + rng.random() * e['dur'] * .9; put(chime(1500 + 4800 * (tt - t) / e['dur'] * rng.uniform(.8, 1.1), .35), tt, rng.uniform(.05, .11), rng.uniform(-.9, .9))
    elif ty == 'settle': put(drum(.8, 70), t, .4)
# wheel hum while painting (ring strokes are louder), room tone and a distant drip
n = N; t_all = np.arange(n) / SR
wheel = (np.sin(2 * np.pi * 54 * t_all) + .4 * np.sin(2 * np.pi * 108 * t_all)) * ((t_all > 5.2) & (t_all < 21.3)) * np.minimum(1, np.maximum(0, np.minimum(t_all - 5.2, 21.3 - t_all)) / .5)
wheel += lp(noise(n), 400) * ((t_all > 5.2) & (t_all < 21.3)) * .8
wheel *= 1 + .5 * np.sin(2 * np.pi * (.5 / 1.0) * t_all)
L += wheel * .025; R += wheel * .025
room = lp(noise(n), 500) * .008 + lp(noise(n), 120) * .01
L += room; R += np.roll(room, 200)
for td in (2.2, 3.4, 4.1):
    d = chime(1300 + 200 * td, .4) * .6; put(d, td, .08, -.3)
# birds, far away, near the end
for tb in (46.2, 47.0, 51.1):
    n2 = int(.25 * SR); f = np.linspace(3400, 4600, n2) * (1 + .06 * np.sin(np.linspace(0, 40, n2))); y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.hanning(n2); put(y, tb, .03, .6)
# the picture's brush strokes of the kiln flash silence: duck everything for 0.9 s after the flash for the held silence
# the held silence after the flash (32.4-33.6) is in the score itself: no music onsets there
fade = np.ones(n); fade[int((DUR - .9) * SR):] = np.linspace(1, 0, n - int((DUR - .9) * SR))
L = L - .5 * lp(L, 150, 2); R = R - .5 * lp(R, 150, 2)
L *= fade; R *= fade
# soft limiter and write
pk = max(np.max(np.abs(L)), np.max(np.abs(R)))
sc = .9 / pk
L = np.tanh(L * sc * 1.2) / np.tanh(1.2); R = np.tanh(R * sc * 1.2) / np.tanh(1.2)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
import soundfile as sf
sf.write(os.path.join(HERE, 'out', 'mix.wav'), np.stack([L, R], 1).astype(np.float32), SR, subtype='FLOAT')
json.dump({'bpm': 100, 'beat': BEAT, 'onsets': sorted(score)}, open(os.path.join(HERE, 'out', 'score.json'), 'w'))
print('mix.wav', DUR, 's, peak', pk)
