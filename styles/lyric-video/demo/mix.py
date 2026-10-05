"""Score, foley and voice -> mix.wav for "Ten More Minutes" (lyric video). Everything but the voice is synthesised here in numpy: no samples.
The beat comes from events.json (core/render/events.mjs), so the sound and the pulsing shapes read the same kick times. The harmony comes from song.json.
The voice is the placed spoken lines (tools/place.py), compressed and layered; in the choruses a doubled layer and a dotted-eighth echo are added.
usage: .venv/bin/python styles/lyric-video/demo/mix.py   (DIAG=1 prints the level per 4 seconds)
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

S = json.load(open(os.path.join(HERE, 'song.json'))); EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']
BPM = S['bpm']; BEAT = 60 / BPM; BAR = 4 * BEAT; STEP = BEAT / 4; DUR = EVJ['dur']; N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(89)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def stereo(): return np.zeros((N, 2))
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def h01(x): return (np.sin(x * 127.1 + 311.7) * 43758.5453) % 1
sec_of_bar = lambda b: next(s for s in S['sections'] if s['bar'] <= b < s['bar'] + s['n'])
sec_at = lambda t: sec_of_bar(min(S['bars'] - 1, int(t / BAR + 1e-9)))

# ----------------------------------------------------------------- drum voices
def kick(v=1.0):
    d = .55; t = tv(d); f = 46 + 120 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / .2) + .35 * np.sin(2 * ph) * np.exp(-t / .05)
    x += hp(noise(d), 2500) * np.exp(-t / .004) * .35
    return x * v / 1.4
def snare(v=1.0):
    d = .3; t = tv(d); x = bp(noise(d), 1100, 8000) * np.exp(-t / .1) * .9 + np.sin(2 * np.pi * 185 * t) * np.exp(-t / .06) * .6 + np.sin(2 * np.pi * 330 * t) * np.exp(-t / .03) * .25
    return x * v * .75
def clap(v=1.0):
    d = .35; t = tv(d); x = np.zeros_like(t)
    for k, o in enumerate((0, .011, .023, .036)):
        s = int(o * SR); n = bp(noise(d), 900, 4500) * np.exp(-t / (.01 if k < 3 else .12)); x[s:] += n[:len(x) - s]
    return x * v * .55
def hat(v=1.0, open_=False):
    d = .35 if open_ else .07; t = tv(d); x = hp(noise(d), 7000, 2) * np.exp(-t / (.11 if open_ else .014)); return x * v * .4
def crash(v=1.0):
    d = 2.2; t = tv(d); return (hp(noise(d), 4200) * np.exp(-t / .55) + bp(noise(d), 7000, 12000) * np.exp(-t / .9) * .5) * v * .5 * np.clip(t / .004, 0, 1)
def tick(v=1.0):
    d = .08; t = tv(d); return (np.sin(2 * np.pi * 3300 * t) * np.exp(-t / .006) + .5 * np.sin(2 * np.pi * 1300 * t) * np.exp(-t / .012) + hp(noise(d), 3000) * np.exp(-t / .002) * .6) * v * .6
def beep(v=1.0):
    d = .24; t = tv(d); out = np.zeros_like(t)
    for o in (0, .105):
        s = int(o * SR); tp = t[:int(.07 * SR)]; x = (np.sin(2 * np.pi * 2093 * tp) + .35 * np.sin(2 * np.pi * 3 * 2093 * tp) + .15 * np.sin(2 * np.pi * 5 * 2093 * tp)) * np.clip(np.minimum(tp / .003, (.07 - tp) / .004), 0, 1)
        out[s:s + len(x)] += x
    return out * v * .35
def riser(dur):
    t = tv(dur); u = t / dur; n = noise(dur); out = np.zeros_like(n)
    for i in range(0, len(n), 960):
        hi = min(len(n), i + 960); f = 400 + 7000 * u[i] ** 2.2; out[i:hi] = bp(n[max(0, i - 3000):hi], f * .6, f * 1.5)[-(hi - i):]
    sw = np.sin(2 * np.pi * np.cumsum(180 + 1500 * u ** 2) / SR) * .25
    return (out * 1.2 + sw) * u ** 2 * .8
def hush_swell(): return None

# ----------------------------------------------------------------- word and move sounds
def hit(size=1.0, hook=0):
    d = .3; t = tv(d); f = 52 + 90 * np.exp(-t * 26); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / .1) * (.8 + .5 * min(size, 1.4)) + hp(noise(d), 1800) * np.exp(-t / .006) * (.35 if hook else .2)
    if hook: x += np.sin(2 * np.pi * 1500 * t) * np.exp(-t / .02) * .12
    return x * .5
def pop(v=1.0):
    d = .2; t = tv(d); f = 700 * np.exp(-t * 12) + 180; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .05) * v * .55
def thud(v=1.0):
    d = .4; t = tv(d); f = 90 * np.exp(-t * 9) + 38; return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12) + lp(noise(d), 700) * np.exp(-t / .03) * .5) * v * .8
def zip_(v=1.0):
    d = .35; t = tv(d); f = 700 + 5200 * (t / d) ** 2; return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .3 + bp(noise(d), 3000, 9000) * .4) * np.sin(np.pi * t / d) ** 2 * v * .5
def knock(v=1.0):
    d = .18; t = tv(d); return (np.sin(2 * np.pi * 210 * t) * np.exp(-t / .03) + lp(noise(d), 1800) * np.exp(-t / .006) * .9) * v * .8
def creak(v=1.0):
    d = .55; t = tv(d); f0 = 90 * (1 + .6 * t / d); saw = 2 * ((np.cumsum(f0 * (1 + .25 * np.sin(2 * np.pi * 11 * t))) / SR) % 1) - 1
    return bp(saw, 350, 2600) * (np.abs(np.sin(2 * np.pi * 17 * t)) ** 2) * np.sin(np.pi * t / d) * v * .8
def crack_(v=1.0):
    d = .25; t = tv(d); return (hp(noise(d), 1800) * np.exp(-t / .004) + hp(noise(d), 900) * np.exp(-t / .05) * .3 + np.sin(2 * np.pi * 130 * t) * np.exp(-t / .03) * .4) * v * .9
def jingle(v=1.0):
    d = 1.2; t = tv(d); x = 0
    for k in range(6):
        s = int((k * .045 + h01(k) * .02) * SR); f = 3400 * (1 + .28 * h01(k + 3)); y = (np.sin(2 * np.pi * f * t[:len(t) - s]) + .4 * np.sin(2 * np.pi * f * 2.76 * t[:len(t) - s])) * np.exp(-t[:len(t) - s] / .12)
        z = np.zeros_like(t); z[s:] = y; x = x + z
    return x * v * .12
def echo_ping(v=1.0):
    d = 1.4; t = tv(d); return (np.sin(2 * np.pi * 880 * t) * np.exp(-t / .5) + .3 * np.sin(2 * np.pi * 1320 * t) * np.exp(-t / .3)) * v * .12
def sink(v=1.0):
    d = .9; t = tv(d); f = 520 * np.exp(-t * 2.4) + 90; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.minimum(t / d, 1)) * .25 * v
def rise_(v=1.0):
    d = 1.1; t = tv(d); f = 160 * np.exp(t * 1.9); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .22 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * .08) * np.sin(np.pi * np.minimum(t / d, 1) ** .7) * v
def whoosh(d=.45, v=1.0):
    t = tv(d); n = noise(d); out = np.zeros_like(n)
    for i in range(0, len(n), 960):
        hi = min(len(n), i + 960); f = 400 + 5200 * np.sin(np.pi * i / len(n)); out[i:hi] = bp(n[max(0, i - 3000):hi], f * .6, f * 1.5)[-(hi - i):]
    return out * np.sin(np.pi * t / d) ** 2 * v * 1.8

# ----------------------------------------------------------------- the song: roots and voicings per bar
ROOT = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36, 'Gm': 43, 'A': 45, 'D': 38}
VOI = {'Dm': [50, 57, 62, 65, 69], 'Bb': [53, 58, 62, 65, 70], 'F': [53, 57, 60, 65, 69], 'C': [55, 60, 64, 67, 72], 'Gm': [55, 58, 62, 67, 70], 'A': [57, 61, 64, 67, 69], 'D': [50, 57, 62, 66, 69]}
TRI = {'Dm': [62, 65, 69], 'Bb': [58, 62, 65], 'F': [60, 65, 69], 'C': [60, 64, 67], 'Gm': [58, 62, 67], 'A': [57, 61, 64], 'D': [62, 66, 69]}
def chord_of(bar):
    s = sec_of_bar(bar); i = bar - s['bar']; k = s['id']
    if k in ('v1', 'v2'): return ['Dm', 'Bb', 'F', 'C'][i]
    if k in ('p1', 'p2'): return ['Gm', 'A'][i]
    if k in ('c1', 'c2'): return ['Bb', 'F', 'C', 'Dm'][i]
    if k == 'bridge': return ['Bb', 'Gm'][i]
    if k == 'end': return 'D'
    return 'Dm'
def ep(f, d=1.4, v=1.0):
    t = tv(d); idx = 2.4 * np.exp(-t / .3) + .3
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) * np.exp(-t / (d * .55)) + .22 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .06)
    return x * v * np.clip(t / .003, 0, 1) * np.clip((d - t) / .05, 0, 1)
def pluck(f, d=.35, v=1.0):
    t = tv(d); x = 0
    for k in range(1, 9): x = x + np.sin(2 * np.pi * f * k * t + k) / k * np.exp(-t * (6 + 5 * k))
    return x * v * np.clip(t / .002, 0, 1) * .8
def bass(f, d=.5, v=1.0):
    t = tv(d); fe = f * (1 + 1.2 * np.exp(-t * 45)); ph = 2 * np.pi * np.cumsum(fe) / SR
    env = np.clip(t / .004, 0, 1) * np.exp(-t / (d * .65)) * np.clip((d - t) / .04, 0, 1)
    return (np.sin(ph) + .42 * np.sin(2 * ph) + .2 * np.sin(3 * ph)) * env * v
def pad(ms, d, v=1.0, a=.5, r=.8, bright=1.0):
    t = tv(d); env = np.clip(t / a, 0, 1) * np.clip((d - t) / r, 0, 1); x = 0
    for m in ms:
        for dt in (-.7, 0, .8):
            f = mtof(m) + dt; saw = 0
            for k in range(1, 9): saw = saw + np.sin(2 * np.pi * f * k * t + k * dt) / k
            x = x + saw
    return lp(x * env, 900 + 900 * bright, 2) * v / (len(ms) * 2.2)

drums, music, bassb, fx, wetf = stereo(), stereo(), stereo(), stereo(), stereo()
kicks = []
for e in EV:
    ty, t0, v = e['type'], e['t'], e.get('v', 1.0)
    if ty == 'kick': add(drums, kick(v), t0, .95, 0); kicks.append(t0)
    elif ty == 'snare': add(drums, snare(v), t0, .8, .05)
    elif ty == 'clap': add(drums, clap(v), t0, .8, -.05); add(wetf, clap(v), t0, .25)
    elif ty == 'hat': add(drums, hat(v), t0, .5, .25 * (1 if h01(t0 * 7) > .5 else -1))
    elif ty == 'ohat': add(drums, hat(v, True), t0, .5, -.25)
    elif ty == 'crash': add(drums, crash(v), t0, .9, 0)
    elif ty == 'tick': add(fx, tick(v), t0, .5, .3 * (1 if h01(t0 * 5) > .5 else -1))
    elif ty == 'beep': add(fx, beep(v), t0, .7, 0)
    elif ty == 'riser': add(fx, riser(e['dur']), t0, .55)
    elif ty == 'hit': add(fx, hit(e.get('size', 1), e.get('hook', 0)), t0, .6, 0)
    elif ty == 'pop': add(fx, pop(v), t0, .6, .1)
    elif ty == 'thud': add(fx, thud(v), t0, .6, 0)
    elif ty == 'zip': add(fx, zip_(v), t0, .5, .2)
    elif ty == 'knock': add(fx, knock(v), t0, .6, -.1)
    elif ty == 'creak': add(fx, creak(v), t0, .5, .1)
    elif ty == 'crack': add(fx, crack_(v), t0, .6, 0)
    elif ty == 'jingle': add(fx, jingle(v), t0, .6, .2)
    elif ty == 'echo': add(wetf, echo_ping(v), t0, .5)
    elif ty == 'sink': add(fx, sink(v), t0, .5, 0)
    elif ty == 'rise': add(fx, rise_(v), t0, .5, 0)
    elif ty == 'whoosh': add(fx, whoosh(.45), t0, .6, 0)

# bass follows the kick events
for e in EV:
    if e['type'] != 'kick': continue
    t0 = e['t']; k = sec_at(t0)['id']
    if k in ('v1', 'v2', 'c1', 'c2', 'p1', 'p2', 'intro'): add(bassb, bass(mtof(ROOT[chord_of(int(t0 / BAR + 1e-9))]), .55 if k.startswith('c') else .45, e.get('v', 1)), t0, .9 if k.startswith('c') else .75)
for bar in range(S['bars']):
    s = sec_of_bar(bar); k = s['id']; ch = chord_of(bar); b0 = bar * BAR; r = ROOT[ch]
    if k in ('bridge',): add(bassb, bass(mtof(r), BAR * .95, .7), b0, .5)
    if k == 'end': add(bassb, bass(mtof(38), BAR * 1.9, 1.0), b0, .8) if bar == 24 else None
    if k == 'joke': add(bassb, bass(mtof(38), BEAT * 1.4, .8), b0, .5)
    # --- chords
    if k in ('v1', 'v2'):
        for st, d, v in ((0, BEAT * 1.3, .55), (6, BEAT * .9, .4), (10, BEAT * 1.5, .45)):
            for j, m in enumerate(VOI[ch][1:4]): add(music, ep(mtof(m), d + .3, v), b0 + st * STEP + j * .004, .13, (j - 1) * .3)
        if k == 'v2' and (bar - s['bar']) % 2 == 1:
            for i, m in enumerate((TRI[ch][2] + 12, TRI[ch][1] + 12)): add(music, pluck(mtof(m), .4, .5), b0 + (12 + i) * STEP, .10, .3)
    elif k == 'intro':
        for j, m in enumerate(VOI[ch][1:4]): add(music, ep(mtof(m), 2.2, .7), b0 + j * .004, .13, (j - 1) * .3)
    elif k in ('p1', 'p2'):
        add(music, pad(VOI[ch], BAR + .2, 1.0, .4, .4, .6 + .4 * (bar - s['bar'])), b0, .22)
        for st in range(0, 16, 2): add(music, pluck(mtof(TRI[ch][(st // 2) % 3] + 12), .22, .6), b0 + st * STEP, .05 + .02 * (bar - s['bar']), -.25 + .5 * (st / 16))
    elif k in ('c1', 'c2'):
        hot = k == 'c2'
        add(music, pad(VOI[ch], BAR + .3, 1.0, .05, .5, 1.0), b0, .24 if hot else .2)
        for st, d, v in ((0, BEAT * 1.0, .7), (3, BEAT * .6, .5), (6, BEAT * .9, .55), (10, BEAT * 1.4, .6)):
            for j, m in enumerate(VOI[ch][1:4]): add(music, ep(mtof(m), d + .2, v), b0 + st * STEP + j * .004, .15, (j - 1) * .35)
        pat = [0, 1, 2, 1, 0, 1, 2, 1] if not hot else [0, 1, 2, 1, 2, 1, 2, 1]
        for st in range(0, 16, 2 if not hot else 1):
            m = TRI[ch][pat[(st // (2 if not hot else 1)) % len(pat)]] + 12 + (12 if hot and st % 4 == 2 else 0)
            add(music, pluck(mtof(m), .22, .8), b0 + st * STEP, .08 if not hot else .075, -.4 + .8 * (st / 16))
    elif k == 'bridge':
        add(music, pad(VOI[ch], BAR + .6, .7, .9, .9, .2), b0, .13 if bar == 21 else .1)
        for q in range(4 if bar == 21 else 3): add(music, ep(mtof(TRI[ch][q % 3] + 12), 1.6, .6), b0 + q * BEAT, .13, -.2 + .15 * q)
    elif k == 'joke' and True:
        for j, m in enumerate(VOI['Dm'][1:4]): add(music, ep(mtof(m), 1.6, .5), b0 + .02 + j * .004, .1, (j - 1) * .3)
    elif k == 'end':
        if bar == 24:
            add(music, pad(VOI['D'], 2 * BAR + .6, 1.0, .05, 3.0, 1.0), b0, .28)
            for j, m in enumerate(VOI['D'][1:]): add(music, ep(mtof(m + 12 * (j > 2)), 3.2, .9), b0 + j * .004, .15, (j - 1.5) * .25)
            for q, m in enumerate((74, 78, 81, 86)): add(music, pluck(mtof(m), .5, .8), b0 + (6 + q) * STEP * 1.5, .07, -.3 + .2 * q)

# ----------------------------------------------------------------- voice
VOX = stereo(); vo = np.zeros(N); WET = stereo(); ECHO = stereo()
lines = {l['id']: l for l in S['lines']}
irx = np.arange(int(.9 * SR)) / SR; ir = lp(noise(.9), 6000) * np.exp(-irx / .18); ir[:int(.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
for lid, ln in lines.items():
    x, sr = sf.read(os.path.join(HERE, 'voices', 'placed', lid + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64); x = hp(x, 90, 2); x = x / max(np.abs(x).max(), 1e-6)
    x = sfx.compress(x, .22, 3.2, .004, .09); x += bp(x, 2200, 4200) * .25; x /= np.abs(x).max()
    t0 = ln['bar'] * BAR; k = sec_of_bar(ln['bar'])['id']
    g = {'bridge': .8, 'joke': .85}.get(k, 1.0)
    add(VOX, x, t0, .95 * g, 0)
    add(WET, x, t0, .12)
    if k in ('c1', 'c2'):      # gang layer: the same line a hair late and a hair off, wide; and the dotted-eighth echo
        y = soxr.resample(x, SR, int(SR * 1.011)); y = soxr.resample(y, int(SR * 1.011), SR) if False else np.interp(np.arange(len(x)) * 1.011, np.arange(len(x)), x)
        add(VOX, y, t0 + .016, .3, -.7); add(VOX, np.interp(np.arange(len(x)) * .991, np.arange(len(x)), x), t0 + .011, .3, .7)
        add(ECHO, x, t0, 1.0)
    if k == 'p1' or k == 'p2': add(ECHO, x, t0, .5)
    i0 = int(t0 * SR); vo[i0:i0 + len(x)] = np.maximum(vo[i0:i0 + len(x)], np.abs(x))
vo = uniform_filter1d(maximum_filter1d((vo > .03).astype(float), size=int(.28 * SR)), size=int(.18 * SR))
# echo: dotted eighth, two repeats, dark
dly = int(BEAT * .75 * SR); echo = np.zeros_like(ECHO)
for r_, gn in ((1, .2), (2, .09)):
    for c in (0, 1): echo[r_ * dly:, c] += lp(ECHO[:N - r_ * dly, c], 3200) * gn * (1 if c == (r_ % 2) else .6)
wetv = np.stack([fftconvolve(WET[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .8

# ----------------------------------------------------------------- beds: night air, day birds
bed = stereo()
night = lp(noise(DUR), 500) * .02 + np.sin(2 * np.pi * 50 * tt) * .003
for s in S['sections']:
    a, b = s['bar'] * BAR, (s['bar'] + s['n']) * BAR
    if s['id'] in ('v1', 'bridge', 'joke', 'intro'): m = np.clip((tt - a) / .8, 0, 1) * np.clip((b - tt) / .5, 0, 1); bed[:, 0] += night * m; bed[:, 1] += night * m * .95
birds = np.zeros(N)
for k in range(9):
    a = 11 * BAR + .5 + k * 2.4 + h01(k) * 1.2
    for n_ in range(3 + int(h01(k + 4) * 3)):
        t0 = a + n_ * .13; d = .09; t = tv(d); f = (3200 + 1500 * h01(k * 3 + n_)) * (1 + .35 * (t / d) * (1 if h01(n_ + k) > .5 else -1))
        c_ = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2; i0 = int(t0 * SR)
        if i0 + len(c_) < N and t0 < 15 * BAR: birds[i0:i0 + len(c_)] += c_ * .05
bed[:, 0] += birds; bed[:, 1] += np.roll(birds, int(.004 * SR))

# ----------------------------------------------------------------- silences and ducking
gate = np.ones(N)
def mute(a, b, fa=.04, fb=.03): global gate; gate *= 1 - np.clip(np.minimum((tt - a) / fa, (b - tt) / fb), 0, 1) * ((tt > a) & (tt < b))
for s in S['sections']:
    if s['id'] in ('p1', 'p2'): mute((s['bar'] + s['n']) * BAR - 1.5 * STEP, (s['bar'] + s['n']) * BAR - .02)       # the breath before the drop
mute(22 * BAR + 2.6 * BEAT, 23 * BAR - .02, .08, .02)                                                              # the bridge falls silent before "Okay."
kd = np.ones(N)
for t0 in kicks:      # sidechain pump: the pads and keys breathe with the kick (the same kicks the shapes pulse to)
    i0 = int(t0 * SR); n = int(.3 * SR); kd[i0:i0 + n] = np.minimum(kd[i0:i0 + n], 1 - (.55 if sec_at(t0)['id'] in ('c1', 'c2') else .25) * np.exp(-np.arange(min(n, N - i0)) / SR / .1))
duck_v = 1 - .45 * vo
music *= (kd * gate * duck_v)[:, None]; bassb *= (gate * (1 - .32 * vo))[:, None]; drums *= (gate * (1 - .22 * vo))[:, None]; fx *= (1 - .3 * vo)[:, None]
# the last two seconds fade
fade = np.clip((DUR - tt) / 2.2, 0, 1) ** 1.2

# ----------------------------------------------------------------- mix
mix = (drums * .85 + bassb * .5 + music * 2.1 + fx * 1.0 + bed * 1.0 + VOX * 2.2 + wetv * 1.0 + echo * 1.0 + fftconvolve(wetf[:, 0], ir)[:N, None] * np.array([[.4, .4]])) * fade[:, None]
sf.write(os.path.join(HERE, 'out', 'premix.wav'), mix.astype(np.float32), SR)
out = np.zeros_like(mix)
for c in (0, 1):
    x = sfx.compress(mix[:, c], .3, 2.6, .006, .1); k_ = .5; x = k_ * np.tanh(x / k_); out[:, c] = sfx.limit(x, .5, .005)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav %.1fs | rms dB: drums %.1f bass %.1f music %.1f fx %.1f voice %.1f mix %.1f peak %.2f' % (DUR, rms(drums), rms(bassb), rms(music), rms(fx), rms(VOX[VOX != 0]), rms(out), np.abs(out).max()))
from scipy.signal import welch
f_, P_ = welch(out.mean(1), SR, nperseg=8192); tot = P_.sum(); print('energy share: <120 Hz %.0f%%  120-500 %.0f%%  500-4k %.0f%%  >4k %.0f%%' % tuple(100 * P_[(f_ >= a) & (f_ < b)].sum() / tot for a, b in ((0, 120), (120, 500), (500, 4000), (4000, 30000))))
if os.environ.get('DIAG'):
    print('  t    drums bass music  fx  voice  mix')
    for a in range(0, int(DUR), 4):
        s_ = slice(a * SR, (a + 4) * SR); print('%3d %6.1f %5.1f %5.1f %5.1f %5.1f %5.1f' % (a, rms(drums[s_]), rms(bassb[s_]), rms(music[s_]), rms(fx[s_]), rms(VOX[s_]), rms(out[s_])))
