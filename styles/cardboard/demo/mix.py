"""mix.py: score, cardboard foley and voice for "The Wave Inside", all synthesised.
Reads events.json (picture events) and caps.json (voice times); writes out/mix.wav, cues.json and ../cardboard.srt."""
import json, os, subprocess, sys
import numpy as np, soundfile as sf, soxr
from scipy.signal import lfilter
from scipy.ndimage import uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
import sfx
from sfx import SR, noise, bp, hp, lp, t_, norm, add

ev = json.load(open(os.path.join(HERE, 'events.json')))['ev']
caps = json.load(open(os.path.join(HERE, 'caps.json')))
DUR, BEAT, BPM = caps['dur'], caps['beat'], caps['bpm']
N = int((DUR + .8) * SR)
rng = np.random.default_rng(84)
buf = {k: np.zeros((N, 2)) for k in ('music', 'foley', 'room', 'voice')}
onsets = []
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
b = lambda n: n * BEAT           # beat n -> seconds

# ------------------------------------------------------------------ instruments
def marimba(m, vel=1.0, d=1.8):
    f = mid(m); tt = t_(d); tau = .55 if m < 60 else .34 if m < 72 else .2
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) + .35 * np.sin(2 * np.pi * f * 3.97 * tt) * np.exp(-tt / (tau * .22)) + .08 * np.sin(2 * np.pi * f * 9.2 * tt) * np.exp(-tt / .03)
    k = np.zeros_like(tt); n = int(.012 * SR); k[:n] = hp(noise(.012), 1500) * np.linspace(1, 0, n) * .25
    if m < 55: x += .3 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / tau)
    return (x + k) * vel * .55

def kalimba(m, vel=1.0, d=2.4):
    f = mid(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .95) + .22 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / .12) + .1 * np.sin(2 * np.pi * f * 2.0 * tt) * np.exp(-tt / .4)
    n = int(.006 * SR); x[:n] += hp(noise(.006), 3000) * .3
    return x * vel * .5

def pizz(m, vel=1.0, d=1.0):
    f = mid(m); n = int(SR / f); ex = lp(noise(n / SR), 3500); ex = ex / (np.abs(ex).max() + 1e-9)
    a = np.zeros(n + 2); a[0] = 1; a[n] -= .496; a[n + 1] -= .496
    sig = np.zeros(int(d * SR)); sig[:n] = ex
    y = lp(lfilter([1.0], a, sig), 4500)
    tt = t_(d); y = y + .35 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / .25) + .2 * np.sin(2 * np.pi * f * 3 * tt) * np.exp(-tt / .15)   # harmonics so the bass speaks on small speakers
    return y * vel * .9

def boxtap(v=1.0, hard=0.5):   # a knuckle on a cardboard carton
    d = .16; tt = t_(d); f = 210 + 120 * hard
    body = np.sin(2 * np.pi * f * tt * (1 - .08 * tt / d)) * np.exp(-tt / (.035 + .02 * (1 - hard)))
    nz = bp(noise(d), 500, 2600) * np.exp(-tt / .012) * (.5 + hard)
    return norm(body * .8 + nz * .6) * v * .55

def boxboom(v=1.0):            # a palm on a big empty box
    d = .3; tt = t_(d); f = 82 * (1 - .25 * np.minimum(tt / .15, 1))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .09) + .25 * lp(noise(d), 400) * np.exp(-tt / .03) + .35 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / .05)
    return norm(x) * v * .8

def brush(v=1.0, d=.09):       # card shaker / brush on board
    tt = t_(d); return bp(noise(d), 3500, 9000) * np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.5 * v * .25

def note(inst, t, m, vel=1.0, pan=0.0, tag=''):
    x = {'mar': marimba, 'kal': kalimba, 'piz': pizz}[inst](m, vel)
    add(buf['music'], x, t, 1.0, pan); onsets.append({'t': round(t, 4), 'inst': inst, 'midi': m, 'vel': round(vel, 2), 'tag': tag})
def hit(kind, t, v=1.0, pan=0.0, hard=.5, tag=''):
    x = {'tap': lambda: boxtap(v, hard), 'boom': lambda: boxboom(v), 'brush': lambda: brush(v)}[kind]()
    add(buf['music'], x, t, 1.0, pan); onsets.append({'t': round(t, 4), 'inst': kind, 'midi': 0, 'vel': round(v, 2), 'tag': tag})

# ------------------------------------------------------------------ foley
def env_sin(d): tt = t_(d); return np.sin(np.pi * np.clip(tt / d, 0, 1))
def scrape_metal(d, v=1.0):      # blade dragged along a steel rule
    tt = t_(d); fl = .6 + .4 * np.abs(np.sin(2 * np.pi * (11 + 4 * np.sin(tt * 3)) * tt))
    x = bp(noise(d), 2800, 7500) * fl * (.3 + .7 * env_sin(d))
    return norm(x) * v * .22
def slice_card(d, v=1.0):        # a blade crunching through the flutes: grainy low crackle
    tt = t_(d); out = np.zeros_like(tt); n = int(d * 90)
    for _ in range(n):
        c = int(rng.random() * len(tt)); w = int((.003 + rng.random() * .01) * SR); g = np.hanning(min(w, len(tt) - c)) if c + 3 < len(tt) else np.array([])
        out[c:c + len(g)] += g * (rng.random() * .8 + .2)
    x = bp(noise(d), 350, 3200) * (.25 + out) * env_sin(d) ** .6
    return norm(x) * v * .55
def rasp(d, v=1.0, hz=34, lo=500, hi=3000):   # cardboard dragged across ridges: noise amplitude-pulsed at the flute rate
    tt = t_(d); am = (.45 + .55 * np.abs(np.sin(np.pi * hz * tt + .3 * np.sin(tt * 6)))) ** 1.5
    x = bp(noise(d), lo, hi) * am * (.2 + .8 * env_sin(d)) + .35 * lp(noise(d), 260) * env_sin(d)
    return norm(x) * v * .55
def whoosh_p(d, v=1.0, f0=1400):
    tt = t_(d); e = env_sin(d) ** 1.4; x = np.zeros_like(tt); n = noise(d)
    for i in range(0, len(n), 480):
        hi = min(len(n), i + 480); f = f0 + 1800 * np.sin(np.pi * min(1, i / len(n)))
        x[i:hi] = bp(n[max(0, i - 2000):hi], f * .6, f * 1.5)[-(hi - i):]
    return norm(x * e + .4 * lp(noise(d), 450) * e) * v * .5
def thud(v=1.0, f=70, d=.3):
    tt = t_(d); return norm(np.sin(2 * np.pi * f * (1 + .6 * np.exp(-tt / .03)) * tt) * np.exp(-tt / .07) + .35 * lp(noise(d), 600) * np.exp(-tt / .025)) * v * .8
def clunk(v=1.0):                # a tin set down on board: metal tonk + cardboard pat
    d = .5; tt = t_(d)
    ring = (np.sin(2 * np.pi * 612 * tt) * np.exp(-tt / .09) + .6 * np.sin(2 * np.pi * 1117 * tt) * np.exp(-tt / .05) + .4 * np.sin(2 * np.pi * 1840 * tt) * np.exp(-tt / .03))
    pat = lp(noise(d), 700) * np.exp(-tt / .02) + .6 * np.sin(2 * np.pi * 95 * tt) * np.exp(-tt / .06)
    return norm(ring * .45 + pat * .9) * v * .8
def creak_c(d, v=1.0, rise=1.0):  # stick-slip cardboard flex
    tt = t_(d); f0 = 90 + 40 * rise * tt / d; saw = 2 * ((tt * f0 * (1 + .1 * np.sin(2 * np.pi * 6 * tt))) % 1) - 1
    stick = np.abs(np.sin(2 * np.pi * (10 + 9 * rise * tt / d) * tt)) ** 3
    return norm(bp(saw, 250, 2400) * stick * env_sin(d) ** .7 + .2 * bp(noise(d), 1800, 5200) * stick) * v * .4
def snap(v=1.0):
    d = .25; tt = t_(d); return norm(hp(noise(d), 900) * np.exp(-tt / .012) + 1.2 * lp(noise(d), 300) * np.exp(-tt / .06) + .5 * np.sin(2 * np.pi * 120 * tt) * np.exp(-tt / .08)) * v * .9
def crumple(d, v=1.0):
    tt = t_(d); out = np.zeros_like(tt)
    for _ in range(int(d * 120)):
        c = int(rng.random() * len(tt)); w = int((.002 + rng.random() * .006) * SR)
        if c + 3 < len(tt): g = np.hanning(min(w, len(tt) - c)); out[c:c + len(g)] += g * (rng.random() * .9 + .1) * np.exp(-tt[c] / (d * .7))
    return norm(bp(noise(d), 1200, 6500) * out) * v * .5
def roll_t(d, v=1.0):
    tt = t_(d); return norm(lp(noise(d), 300) * (.5 + .5 * np.abs(np.sin(2 * np.pi * (7 + 5 * tt / d) * tt))) * env_sin(d) + .2 * bp(noise(d), 1500, 3500) * env_sin(d)) * v * .55
def marker_sq(d, v=1.0):         # felt marker strokes: squeaks, one per stroke
    tt = t_(d); out = np.zeros_like(tt); s = 0.0
    while s < d - .05:
        L = .08 + rng.random() * .13; i0 = int(s * SR); n = min(int(L * SR), len(tt) - i0); u = np.linspace(0, 1, n)
        f = 2200 + 900 * rng.random() + 700 * u; ph = 2 * np.pi * np.cumsum(f) / SR
        out[i0:i0 + n] += (np.sin(ph) * .3 + bp(noise(L), 3000, 7500)[:n] * .5) * np.sin(np.pi * u) ** 1.2
        s += L + .03 + rng.random() * .06
    return norm(out) * v * .22
def tape_rip(d, v=1.0):          # packing tape pulled off the roll, then smoothed down
    tt = t_(d); am = (.5 + .5 * np.sin(2 * np.pi * (135 + 40 * np.sin(tt * 9)) * tt)) ** 1.5 * (.6 + .4 * rng.random(len(tt)))
    rip = bp(noise(d), 1800, 12000) * am * (np.clip(tt / .08, 0, 1)) * np.clip((d - tt) / .1, 0, 1)
    sm = np.zeros_like(tt); k = int(.22 * SR); sm[-k:] = bp(noise(.22), 900, 4000)[:k] * np.hanning(k) * .25 if k < len(tt) else 0
    return norm(rip + sm) * v * .6
def squelch(v=1.0):
    d = .3; tt = t_(d); f = 260 * np.exp(-tt / .1) + 80; return norm(lp(noise(d), 1200) * np.exp(-tt / .06) * (.5 + .5 * np.sin(2 * np.pi * f * tt)) + .4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .1)) * v * .6
def tick(v=1.0):
    d = .03; return norm(hp(noise(d), 4500) * np.exp(-t_(d) / .0025) + .5 * np.sin(2 * np.pi * 2300 * t_(d)) * np.exp(-t_(d) / .004)) * .25 * v
def pat_c(v=1.0):
    d = .12; tt = t_(d); return norm(lp(noise(d), 1400) * np.exp(-tt / .02) + .5 * np.sin(2 * np.pi * 140 * tt) * np.exp(-tt / .04)) * v * .6
def press(v=1.0):               # a tab pressed into its slot
    d = .12; tt = t_(d); return norm(hp(noise(d), 2500) * np.exp(-tt / .004) + 1.0 * lp(noise(d), 500) * np.exp(-tt / .03) + .4 * np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / .04)) * v * .6
def settle(v=1.0):
    d = .22; tt = t_(d); return norm(lp(noise(d), 900) * np.exp(-tt / .035) + .3 * bp(noise(d), 2000, 5000) * np.exp(-tt / .05)) * v * .6

def S(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
PAN = lambda i: ((i * 37) % 11 - 5) / 20
for i, e in enumerate(ev):
    t, ty, v = e['t'], e['type'], e.get('v', 1.0); F = buf['foley']; d = e.get('dur', .5)
    if ty == 'set': add(F, S(thud(.35, 120, .15), tick(1)), t, .8, 0)
    elif ty == 'scrape': add(F, scrape_metal(d, v), t, .7, .1)
    elif ty == 'slice': add(F, slice_card(d, 1.0), t, .9, -.05)
    elif ty == 'ruleSlide': add(F, S(scrape_metal(d, .8), rasp(d, .25, 20, 1000, 4000)), t, .7, .15)
    elif ty == 'part': add(F, rasp(d, 1.0, 34, 500, 3200), t, 1.0, -.05)
    elif ty == 'board': add(F, S(rasp(d, .85, 18, 300, 2400), whoosh_p(d, .5, 900)), t, .9, 0)
    elif ty == 'lift': add(F, S(whoosh_p(.5, v, 1300), thud(.25, 150, .15)), t, .6, PAN(i))
    elif ty == 'marker': add(F, marker_sq(d, 1.0), t, .8, PAN(i))
    elif ty == 'settle': add(F, settle(v), t, .8, 0)
    elif ty == 'clunk': add(F, clunk(v), t, .95, PAN(i))
    elif ty == 'creak': add(F, creak_c(d, v, 1.0), t, .8, 0)
    elif ty == 'snap': add(F, snap(v), t, 1.0, 0)
    elif ty == 'crumple': add(F, crumple(d, 1.0), t, .9, 0)
    elif ty == 'roll': add(F, roll_t(d, 1.0), t, .8, .3)
    elif ty == 'thud': add(F, thud(v), t, .9, 0)
    elif ty == 'flap': add(F, S(whoosh_p(d, .6, 1100), rasp(d, .25, 26, 600, 2800)), t, .8, PAN(i)); add(F, thud(.3 * v, 110, .15), t + d - .04, .8, 0)
    elif ty == 'press': add(F, press(v), t, .9, PAN(i))
    elif ty == 'tape': add(F, tape_rip(d, 1.0), t, .85, 0); add(F, pat_c(.5), t + d, .8, 0)
    elif ty == 'glue': add(F, squelch(v), t, .8, 0)
    elif ty == 'string':
        add(F, bp(noise(d), 4000, 9000) * np.linspace(.35, 0, int(d * SR) if False else len(t_(d))) * .12, t, .6, 0)
        for k in range(4): add(F, tick(.5), t + d * (.15 + .18 * k), .7, 0)
    elif ty == 'place': add(F, S(thud(v, 90, .35), creak_c(.4, .4, 0.2)), t, .9, 0)
    elif ty == 'pat': add(F, pat_c(v), t, .9, 0)

# ------------------------------------------------------------------ room (lamp hum, quiet room)
L = DUR + .8; rt = lp(noise(L), 900) * .05 + .006 * np.sin(2 * np.pi * 100 * t_(L)) + .003 * np.sin(2 * np.pi * 200 * t_(L)) + hp(noise(L), 3000) * .002
fo = np.clip((L - t_(L)) / 1.6, 0, 1); buf['room'][:, 0] = buf['room'][:, 1] = rt[:N] * fo[:N]

# ------------------------------------------------------------------ score: 112 BPM, G major pentatonic (G A B D E)
G2, E2, D2, A2 = 43, 40, 38, 45
G3, A3, B3, D4, E4, G4, A4, B4, D5, E5, G5, A5, B5 = 55, 57, 59, 62, 64, 67, 69, 71, 74, 76, 79, 81, 83
bars = lambda n: n * 4                      # bar n -> beats
chord = [(G2, [G3, B3, D4]), (E2, [E4, G4, B3]), (D2, [D4, A3, E4]), (A2, [A3, D4, E4])]
# 1  hook (bars 0-2.99): box taps on the quarter, a kalimba pick-up as the halves part
for k in range(1, 12): hit('tap', b(k) + .0, vel := (.35 + .02 * k), pan=-.15, hard=.35, tag='hook')
for i, m in enumerate([D5, E5, G5]): note('kal', 3.62 + i * .16, m, vel=.5 + .1 * i, pan=.25, tag='part')
note('kal', b(8), G4, .6, .2, 'hook'); note('mar', b(8), G3, .6, 0, 'hook')
# 2  anatomy (bars 3-6): kalimba eighths over a marimba bass, the box taps on 2 and 4
for bar in range(3, 7):
    root, tri = chord[(bar - 3) % 4]
    for i in range(8):
        m = [tri[0] + 12, tri[2] + 12, tri[1] + 12, tri[2] + 12, tri[0] + 12, tri[1] + 12, tri[2] + 12, tri[1] + 12][i]
        note('kal', b(bars(bar) + i * .5), m, vel=.4 + .04 * (bar - 3) + (.12 if i % 4 == 0 else 0), pan=-.2 + .4 * (i % 2), tag='anat')
    note('mar', b(bars(bar)), root + 12, .7, -.1, 'anat'); note('mar', b(bars(bar) + 2), root + 19, .5, -.1, 'anat')
    hit('tap', b(bars(bar) + 1), .4, .1, .4, 'anat'); hit('tap', b(bars(bar) + 3), .45, .1, .5, 'anat')
note('kal', b(bars(6) + 3.5), B4, .7, .3, 'anat'); note('kal', b(bars(6) + 3.75), D5, .8, .3, 'anat')
# 3  test (bars 7-11): bells where the tins land, a drone that tightens, then silence
note('mar', b(bars(7)), G3, .55, 0, 'test'); note('mar', b(bars(7) + 2), D4, .5, 0, 'test')
note('kal', 17.5, G4, .8, .1, 'tin1'); note('kal', 17.5 + .001, D5, .45, .2, 'tin1')
tt = t_(2.0); drone = (np.sin(2 * np.pi * 98 * tt) + np.sin(2 * np.pi * 98.9 * tt) * .8 + .3 * np.sin(2 * np.pi * 196 * tt)) * np.sin(np.pi * np.clip(tt / 2.0, 0, 1)) ** 2 * (.5 + tt / 2)
add(buf['music'], drone * .22, 17.55, 1.0, 0); onsets.append({'t': 17.55, 'inst': 'drone', 'midi': 31, 'vel': .5, 'tag': 'tension'})
# near-silence 19.55 - 21.8 (only foley and room tone)
note('kal', 21.95, G4, .75, .1, 'tin2'); note('kal', 21.95 + .001, B4, .4, .2, 'tin2')
for i, m in enumerate([E5, D5, B4, G4]): note('kal', 22.8 + i * b(1), m, .45 - .04 * i, .3 - .1 * i, 'calm')
note('mar', 22.4, E4, .5, 0, 'calm'); note('mar', 24.55, D4, .5, 0, 'calm'); note('kal', 23.45, A4, .7, .1, 'tin3')
# 4  flat-pack groove (bars 12-17: 25.7 - 38.6)
for bar in range(12, 18):
    root, tri = chord[(bar - 12) % 4]; lev = .55 + .05 * min(bar - 12, 4)
    if bar >= 12 and bar < 17:
        hit('boom', b(bars(bar)), .9 * lev, 0, tag='groove'); hit('boom', b(bars(bar) + 2.5), .7 * lev, 0, tag='groove')
        hit('tap', b(bars(bar) + 1), .8 * lev, .1, .85, 'groove'); hit('tap', b(bars(bar) + 3), .8 * lev, .1, .85, 'groove')
        for i in range(8): hit('brush', b(bars(bar) + i * .5), (.45 if i % 2 else .7) * lev, .25 - .5 * (i % 2), tag='groove')
        for i, off in enumerate([0, 1.5, 2, 3.5]): note('piz', b(bars(bar) + off), root + (12 if i == 3 else 0), .7 * lev + .2, -.25, 'groove')
        for i, m in enumerate([tri[0] + 12, tri[2] + 12, tri[1] + 12, tri[2] + 12]): note('mar', b(bars(bar) + i * 1.0 + .5), m, .45 * lev + .1, .2, 'groove')
note('kal', b(bars(17)), G5, .55, .3, 'groove'); note('kal', b(bars(17) + 1), D5, .45, .3, 'groove')
# 5  the beam (bars 18-22: 38.6 - 49.3): sparse, then a hard stop
note('mar', 38.6, G3, .55, 0, 'beam'); note('mar', 38.6, D4, .4, 0, 'beam'); note('piz', 39.25, G2, .7, -.2, 'beam')
note('kal', 40.0, G4, .8, -.3, 'tinA'); note('kal', 42.0, B4, .8, .3, 'tinB'); note('mar', 41.1, E4, .45, 0, 'beam'); note('mar', 43.0, D4, .45, 0, 'beam')
# silence 43.6 - 45.15
note('kal', 45.2, D5, .95, 0, 'tinC'); note('kal', 45.2 + .001, G4, .6, 0, 'tinC'); note('mar', 45.2, G3, .8, 0, 'tinC')
for i, m in enumerate([G4, A4, B4, D5, E5, G5, A5, B5]): note('kal', 46.9 + i * .3, m, .4 + .05 * i, -.3 + .08 * i, 'pull')
for m, vv in ((G3, .8), (D4, .7), (G4, .7), (B4, .55)): note('mar', 51.2, m, vv, 0, 'tag')
note('kal', 51.2, D5, .7, .2, 'tag'); note('kal', 51.2 + .004, G5, .5, .3, 'tag'); note('piz', 51.2, G2, .8, 0, 'tag')

# ------------------------------------------------------------------ voice
vox = np.zeros(N)
for v in caps['voice']:
    x, sr = sf.read(os.path.join(HERE, 'voice', v['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR); x = hp(x, 90); x = sfx.compress(x, .12, 3.0, .004, .12); x = x / (np.abs(x).max() + 1e-9) * .8
    i0 = int(v['t'] * SR); vox[i0:i0 + len(x)] += x[:N - i0]
buf['voice'][:, 0] = buf['voice'][:, 1] = vox

# ------------------------------------------------------------------ mix
mus, fol, room, voc = buf['music'], buf['foley'], buf['room'], buf['voice']
for ch in (0, 1): fol[:, ch] = sfx.compress(fol[:, ch], .3, 2.5)
venv = uniform_filter1d(np.abs(vox), int(.12 * SR)); venv = np.clip(venv / (np.percentile(venv[venv > .01], 70) + 1e-9), 0, 1)
venv = uniform_filter1d(venv, int(.25 * SR))
mrms = np.sqrt(np.mean(mus[mus.any(1)] ** 2)); vrms = np.sqrt(np.mean(vox[np.abs(vox) > .02] ** 2))
mus *= vrms / mrms * .33          # voice about 10 dB over the music
fenv = np.abs(fol).max(axis=1); fduck = 1 - .25 * np.clip(uniform_filter1d(fenv, int(.1 * SR)) / .35, 0, 1)
mix = np.zeros_like(mus)
for ch in (0, 1):
    mix[:, ch] = mus[:, ch] * (1 - .5 * venv) * fduck + fol[:, ch] * (1.0 - .35 * venv) * 1.1 + room[:, ch] * 1.2 + voc[:, ch] * 1.35
    mix[:, ch] = sfx.limit(sfx.compress(sfx.lp(mix[:, ch], 15000, 4), .22, 3.5, .003, .12), .4)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out/mix.wav'), mix.astype(np.float32), SR)
json.dump({'bpm': BPM, 'beat': BEAT, 'onsets': onsets, 'grid': [round(i * BEAT, 4) for i in range(int(DUR / BEAT) + 1)]}, open(os.path.join(HERE, 'cues.json'), 'w'), indent=1)
json.dump([{'t0': c['t0'], 't1': c['t1'], 'text': c['text']} for c in caps['captions']], open(os.path.join(HERE, 'out/srt_cues.json'), 'w'))
subprocess.run([os.path.join(LIB, '.venv/bin/python'), os.path.join(LIB, 'core/render/srt.py'), os.path.join(HERE, 'out/srt_cues.json'), os.path.join(HERE, '../cardboard.srt')], check=True)
print('mix written', mix.shape, 'onsets', len(onsets), 'music/voice rms ratio dB', 20 * np.log10(vrms / (np.sqrt(np.mean(mus[mus.any(1)] ** 2)) + 1e-9)))
