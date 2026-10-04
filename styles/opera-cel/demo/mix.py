#!/usr/bin/env python3
"""Score, foley, ambience and voices -> out/mix.wav, all from events.json (the same timeline as the picture).
Jingju percussion (gongs, cymbals, bangu, drum) and jinghu / erhu / pipa / dizi are synthesised with numpy; nothing is sampled."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, lp, hp, noise, env_exp, t_, norm, compress, limit

BEAT, BAR = .625, 2.5
bar = lambda n, b=1: (n - 1) * BAR + (b - 1) * BEAT
ev = json.load(open(os.path.join(HERE, 'events.json'))); DUR = ev['dur']; EVS = ev['ev']
LINES = json.load(open(os.path.join(HERE, 'lines.json')))
vd = json.load(open(os.path.join(HERE, 'voices', 'dur.json')))
rng = np.random.default_rng(39)
N = int(DUR * SR) + SR
mus = np.zeros((N, 2)); fol = np.zeros((N, 2)); amb = np.zeros((N, 2)); vox = np.zeros((N, 2))
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def m(name):
    s = name[0]; o = int(name[-1]); acc = name[1:-1].count('#') - name[1:-1].count('b'); return 12 * (o + 1) + NOTE[s] + acc

# ---------------------------------------------------------------- percussion
def gong(f0, dur, fall=.0, rise=.0, bright=1.0, v=1.0, beat=0):
    d = dur; tt = t_(d); out = np.zeros(len(tt))
    glide = 1 + fall * -np.minimum(tt / .9, 1) + rise * np.minimum(tt / .25, 1)
    for r, a, tau in [(1, 1, d * .32), (1.58, .8, d * .28), (2.17, .7, d * .2), (2.76, .55, d * .16), (3.52, .45 * bright, d * .1), (4.9, .35 * bright, d * .07), (6.7, .2 * bright, d * .05)]:
        ph = 2 * np.pi * np.cumsum(f0 * r * glide) / SR
        b = 1 + beat * np.sin(2 * np.pi * (2.2 + r) * tt)
        out += a * np.sin(ph + rng.random() * 6) * np.exp(-tt / tau) * b
    out += hp(noise(.12), 900) * env_exp(.12, .02)[:len(tt)].mean() * 0 if False else 0
    n = int(.08 * SR); out[:n] += bp(noise(.08), 500, 5000) * np.exp(-t_(.08) / .012) * .8
    return norm(out) * v
def cymbal(v=1.0, dur=1.1, high=3200):
    tt = t_(dur); x = hp(noise(dur), high) * np.exp(-tt / (dur * .28))
    for f in [4100, 5370, 6930, 8210, 9650]: x += .08 * np.sin(2 * np.pi * f * tt + rng.random() * 6) * np.exp(-tt / (dur * .25))
    x[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
    return norm(x) * v
def bangu(v=1.0):
    d = .09; tt = t_(d); x = bp(noise(d), 1800, 6500) * np.exp(-tt / .012) + np.sin(2 * np.pi * 1450 * tt) * np.exp(-tt / .02) * .5 + np.sin(2 * np.pi * 820 * tt) * np.exp(-tt / .03) * .3
    return norm(x) * v
def drum(v=1.0, f=62):
    d = .5; tt = t_(d); fr = f * (1 + 1.2 * np.exp(-tt / .04)); x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt / .16) + lp(noise(d), 500) * np.exp(-tt / .012) * .5
    return norm(x) * v
def block(v=1.0, f=900):
    d = .12; tt = t_(d); return norm(np.sin(2 * np.pi * f * tt) * np.exp(-tt / .02) + .5 * np.sin(2 * np.pi * f * 1.9 * tt) * np.exp(-tt / .012)) * v

# ---------------------------------------------------------------- strings and wind
def contour(f0, f1, slide, n):          # frequency track: hold f0, slide to f1 over the first `slide` fraction
    u = np.clip(np.arange(n) / max(1, slide * n), 0, 1); return f0 + (f1 - f0) * (u * u * (3 - 2 * u))
def bowed(f0, dur, vel=.7, f1=None, slide=.12, vib=5.4, vdepth=.012, bright=1.0, dark=False):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = contour(f0 if f1 is None else f1, f0, 0, n) if False else (np.full(n, f0) if f1 is None else contour(f1, f0, slide, n))
    vibr = 1 + vdepth * np.sin(2 * np.pi * vib * np.maximum(tt - .18, 0)) * np.minimum(np.maximum(tt - .15, 0) / .25, 1)
    ph = 2 * np.pi * np.cumsum(f * vibr) / SR
    x = sum((1 / h ** (1.1 if not dark else 1.7)) * np.sin(h * ph) for h in range(1, 14 if not dark else 8))
    x = bp(x, 500, 4800 if not dark else 2400, 2) * .9 + x * .1
    x += hp(noise(dur), 2500) * .02 * vel
    env = np.minimum(tt / .05, 1) * np.minimum((dur - tt) / .09 + .0, 1).clip(0, 1) * (.85 + .15 * np.minimum(tt / .3, 1))
    return norm(x * env) * vel
def jinghu(f0, dur, vel=.7, f1=None): return bowed(f0, dur, vel, f1, .1, 6.2, .011, 1.0)
def erhu(f0, dur, vel=.6, f1=None): return bowed(f0, dur, vel, f1, .14, 5.0, .02, .8, True)
def pipa(freq, dur, vel=.7, trem=0):
    def one(fq, d, a):
        Nn = int(round(SR / fq)); L = int(d * SR); x = np.zeros(L); x[:Nn] = (noise(Nn / SR) * .9 + 1) * 0 + (rng.standard_normal(Nn) * a)
        x[:Nn] = lp(x[:Nn], 5200 * a + 2500) if Nn > 20 else x[:Nn]
        den = np.zeros(Nn + 2); den[0] = 1; den[Nn] = -.5 * .996; den[Nn + 1] = -.5 * .996
        y = lfilter([1], den, x); y += .35 * np.concatenate([np.zeros(int(.004 * SR)), y])[:L]
        return y
    if not trem: return norm(one(freq, dur, 1.0)) * vel
    out = np.zeros(int(dur * SR)); step = int(SR / 15)
    for i, s in enumerate(range(0, len(out), step)):
        seg = one(freq, .5, 1.0) * (1 - .35 * np.exp(-i / 7)); e = min(len(out), s + len(seg)); out[s:e] += seg[:e - s] * (.5 + .5 * (i % 2 == 0) * .4)
    return norm(out * np.minimum((dur - t_(dur)) / .3 + 0, 1).clip(0, 1)) * vel
def dizi(f0, dur, vel=.6, f1=None):
    n = int(dur * SR); tt = np.arange(n) / SR; f = np.full(n, f0) if f1 is None else contour(f1, f0, .1, n)
    vibr = 1 + .007 * np.sin(2 * np.pi * 5.2 * tt) * np.minimum(tt / .4, 1); ph = 2 * np.pi * np.cumsum(f * vibr) / SR
    x = np.sin(ph) + .35 * np.sin(2 * ph) + .12 * np.sin(3 * ph) + bp(noise(dur), 3200, 7000) * .09
    env = np.minimum(tt / .06, 1) * np.minimum((dur - tt) / .1, 1).clip(0, 1)
    return norm(x * env) * vel

# ---------------------------------------------------------------- foley
def whoosh(d=.3, v=1.0, up=True):
    n = noise(d); tt = t_(d); fr = np.linspace(500, 3800, len(tt)) if up else np.linspace(3800, 500, len(tt)); out = np.zeros_like(n)
    for i in range(0, len(n), 960):
        hi = min(len(n), i + 960); f = fr[i]; seg = bp(n[max(0, i - 2000):hi], f * .6, f * 1.4)[-(hi - i):]; out[i:hi] = seg
    return norm(out * np.sin(np.pi * tt / d) ** 1.5) * v
def silk_snap(v=1.0): d = .25; tt = t_(d); return norm(hp(noise(d), 1800) * np.exp(-tt / .018) * 1.2 + bp(noise(d), 600, 2500) * np.exp(-tt / .07) * .25) * v
def clang(v=1.0):
    d = .55; tt = t_(d); x = bp(noise(d), 1500, 7000) * np.exp(-tt / .02)
    for f, a in [(1210, .7), (1930, .6), (3310, .5), (4870, .35)]: x += a * np.sin(2 * np.pi * f * tt + rng.random() * 6) * np.exp(-tt / (.16 + .04 * a))
    return norm(x) * v
def thud(v=1.0): d = .45; tt = t_(d); return norm(np.sin(2 * np.pi * 70 * (1 + .6 * np.exp(-tt / .05)) * tt) * np.exp(-tt / .1) + lp(noise(d), 900) * np.exp(-tt / .02)) * v
def stone_bite(v=1.0):
    d = .5; tt = t_(d); th = np.zeros(len(tt)); q = thud(1); th[:len(q)] = q[:len(tt)]
    return norm(th * .8 + hp(noise(d), 1500) * np.exp(-tt / .05) * .9 + bp(noise(d), 300, 1200) * np.exp(-tt / .15) * .4) * v
def drip(v=1.0): d = .25; tt = t_(d); f = 1400 + 900 * (1 - np.exp(-tt / .03)); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .05)) * v
def step(v=1.0): d = .12; tt = t_(d); return norm(lp(noise(d), 1100) * np.exp(-tt / .018) + np.sin(2 * np.pi * 130 * tt) * np.exp(-tt / .03) * .5) * v
def wind(d, lvl=1.0):
    x = bp(noise(d), 180, 1300, 2); tt = t_(d); lfo = .55 + .45 * np.sin(2 * np.pi * tt / 7.3 + 1) * np.sin(2 * np.pi * tt / 3.1)
    return norm(x * lfo) * lvl
def doors(d, v=1.0):
    tt = t_(d); x = lp(noise(d), 160) * (.6 + .4 * np.sin(2 * np.pi * 7 * tt)) + bp(noise(d), 120, 500) * .4
    for k in range(5): s = int(rng.random() * d * SR * .8); c = hp(noise(.12), 800) * env_exp(.12, .03); x[s:s + len(c)] += c[:len(x) - s] * .5
    return norm(x * np.sin(np.pi * np.minimum(tt / d, 1)) ** .6) * v

# ---------------------------------------------------------------- events -> foley and percussion
for e in EVS:
    t = e['t']; v = e.get('v', 1.0); ty = e['type']
    if ty == 'gong_big': add(mus, gong(86, 4.2, fall=.07, bright=.5, v=1, beat=.1), t, .55 * v, -.1)
    elif ty == 'gong_small': add(mus, gong(430, 1.3, rise=.1, bright=1.2, beat=.15), t, .45 * v, .15)
    elif ty == 'cymbal': add(mus, cymbal(1, 1.1), t, .3 * v, .25)
    elif ty == 'snap': add(fol, silk_snap(1), t, .6, 0); add(fol, whoosh(.18, 1, True), t - .08, .35, 0)
    elif ty == 'cut': add(fol, whoosh(.14, 1, False), t - .05, .25, 0)
    elif ty == 'strike': add(fol, whoosh(.22, 1, True), t - .14, .5, -.1); add(fol, thud(.8), t, .45, 0); add(mus, bangu(1), t, .5, .1); add(mus, gong(430, .9, rise=.1, bright=1.2), t, .25, .1); add(mus, cymbal(1, .7), t, .22, .2)
    elif ty == 'clash': add(fol, clang(1), t, .5 * v, .1); add(fol, whoosh(.2, 1, False), t - .12, .3, .1); add(mus, cymbal(1, .9), t, .2, .1)
    elif ty == 'bite': add(fol, stone_bite(1), t, .7, -.1); add(fol, thud(1), t, .5, 0); add(mus, gong(86, 2.5, fall=.07, bright=.4, v=1), t, .35, 0)
    elif ty == 'zoom': add(fol, whoosh(.25, 1, True), t - .15, .5, 0); add(mus, drum(1, 55), t, .45, 0)
    elif ty == 'drip': add(fol, drip(1), t, .5, -.2)
    elif ty == 'tug': add(fol, stone_bite(.5), t, .35, 0); add(fol, silk_snap(.8), t + .05, .35, 0); add(fol, whoosh(.5, 1, True), t + .1, .3, 0)
    elif ty == 'stroke':   # the bronze disc: the most important sound of the film
        d = gong(150, 7.0, fall=.015, bright=.9, v=1, beat=.35); add(mus, d, t, .85, 0); add(fol, clang(1), t, .35, 0); add(fol, thud(1), t, .5, 0)
    elif ty == 'water': pass

# bar-driven percussion rolls and drum figures
def roll(t0, t1, v0, v1, fn=bangu, pan=0):   # accelerating roll
    t = t0; gap = .11
    while t < t1:
        u = (t - t0) / (t1 - t0); add(mus, fn(1), t, lerp(v0, v1, u), pan); gap = max(.035, .12 * (1 - u * .72)); t += gap
lerp = lambda a, b, u: a + (b - a) * u
roll(bar(5), bar(5, 2), .12, .4, bangu, -.1)                      # gate: a rolling rise
for b in (2, 3, 4): add(mus, bangu(1), bar(5, b), .6, .1); add(mus, drum(1, 60), bar(5, b), .5, 0)
roll(bar(8, 4), bar(9), .15, .45); roll(bar(9, 4), bar(10), .15, .5); roll(bar(10, 4), bar(11), .15, .6)   # jijifeng before each strike
for bb in (8, 9, 10):
    for b in (2, 3): add(mus, block(.7, 900), bar(bb, b), .25, -.2)
    add(mus, drum(1, 58), bar(bb, 3), .35, 0)
roll(bar(11, 2), bar(12, 2), .1, .3, drum, 0)                     # low drum roll
for b in range(1, 5): add(mus, block(.5, 780), bar(2, b), .16, -.25)    # glide: wood block quarters
for bb in (3, 4):
    for b in range(1, 5): add(mus, block(.5, 780), bar(bb, b), .16, -.25)
for bb in range(16, 20):                                          # release: soft small gong on beat 1, block on 3
    add(mus, gong(430, .9, rise=.08, bright=.8), bar(bb), .12, .2); add(mus, block(.5, 900), bar(bb, 3), .12, -.2)
for bb in (6, 7): add(mus, cymbal(1, 1.0), bar(bb), .12, .25)
# tableau: all together
for b in (1, 2, 3, 4): add(mus, bangu(1), bar(20, b), .3 if b == 1 else .18, .1)
add(mus, cymbal(1, 1.4), bar(20), .3, .2); add(mus, gong(86, 3.5, fall=.07, bright=.5), bar(20), .35, 0)
add(mus, gong(430, 1.2, rise=.1, bright=1.2), bar(21, 3), .25, .15)

# ---------------------------------------------------------------- melody
def note(inst, t, name, dur_beats, vel=.7, pan=0, gain=.4, slide=None, **kw):
    f = mid(m(name)); f1 = mid(m(slide)) if slide else None; d = dur_beats * BEAT
    x = {'jinghu': jinghu, 'erhu': erhu, 'dizi': dizi}[inst](f, d + .12, vel, f1) if inst != 'pipa' else pipa(f, d + 1.2, vel, kw.get('trem', 0))
    add(mus, x, t, gain, pan)
def phrase(n, inst, notes, gain=.4, pan=0):
    for tup in notes:
        b, nm, ln = tup[:3]; vel = tup[3] if len(tup) > 3 else .7; sl = tup[4] if len(tup) > 4 else None
        t = bar(n, 1) + (b - 1) * BEAT
        if sl == 'trem': note(inst, t, nm, ln, vel, pan, gain, None, trem=1)
        else: note(inst, t, nm, ln, vel, pan, gain, sl)
Dm = ['D4', 'F4', 'G4', 'A4', 'C5', 'D5']
# glide (bars 2-4): pipa walks, jinghu answers
phrase(2, 'pipa', [(1, 'D4', .5), (1.5, 'A3', .5), (2, 'D4', .5), (2.5, 'F4', .5), (3, 'G4', 1), (4, 'F4', .5), (4.5, 'D4', .5)], .5, -.25)
phrase(3, 'pipa', [(1, 'D4', .5), (1.5, 'A3', .5), (2, 'D4', .5), (2.5, 'F4', .5), (3, 'A4', 1), (4, 'G4', .5), (4.5, 'F4', .5)], .5, -.25)
phrase(4, 'pipa', [(1, 'D4', .5), (1.5, 'F4', .5), (2, 'G4', .5), (2.5, 'A4', .5), (3, 'C5', 1), (4, 'A4', 1)], .5, -.25)
phrase(3, 'jinghu', [(1, 'A4', 2, .6), (3, 'C5', 1.5, .65, 'A4')], .3, .3)
phrase(4, 'jinghu', [(1, 'D5', 3, .7, 'C5'), (4, 'C5', 1, .6)], .3, .3)
# gate (bar 5): erhu drone
phrase(5, 'erhu', [(1, 'D4', 4, .6)], .38, -.1)
# standoff (bars 6-7): erhu alone
phrase(6, 'erhu', [(1, 'A4', 1.5, .6), (2.5, 'G4', .5, .55), (3, 'F4', 1, .55), (4, 'D4', 1, .5)], .38, 0)
phrase(7, 'erhu', [(1, 'F4', 1, .55), (2, 'G4', 1, .6), (3, 'A4', 1.5, .65, 'G4'), (4.5, 'C5', 1.5, .6)], .38, 0)
# fight (8-10): jinghu fast figures answered by pipa
phrase(8, 'jinghu', [(2.5, 'D5', .5, .7), (3, 'F5', .5, .72), (3.5, 'G5', .5, .75), (4, 'A5', .5, .78)], .3, .25)
phrase(9, 'jinghu', [(2.5, 'A5', .5, .75), (3, 'G5', .5, .72), (3.5, 'F5', .5, .72), (4, 'D5', .5, .7)], .3, .25)
phrase(10, 'jinghu', [(2, 'D5', .5, .75), (2.5, 'F5', .5, .75), (3, 'G5', .5, .78), (3.5, 'A5', .5, .8), (4, 'C6', .5, .82)], .3, .25)
for bb in (8, 9, 10): phrase(bb, 'pipa', [(1, 'D3', 1, .8), (2, 'A3', .5, .6), (3, 'D3', 1, .7)], .5, -.2)
# bite (11-12): tremolo pipa
phrase(11, 'pipa', [(1.5, 'D4', 3.5, .7, 'trem')], .45, -.1)
phrase(12, 'pipa', [(1, 'A3', 4, .7, 'trem')], .45, -.1)
# release (16-19): major pentatonic colour, flowing
dm = lambda b, n, ln=.5, v=.6: (b, n, ln, v)
for bb in (16, 17, 18, 19):
    phrase(bb, 'pipa', [dm(1, 'D4'), dm(1.5, 'E4'), dm(2, 'F#4'), dm(2.5, 'A4'), dm(3, 'B4'), dm(3.5, 'A4'), dm(4, 'F#4'), dm(4.5, 'E4')], .42, -.3)
phrase(16, 'dizi', [(1, 'A5', 2, .55), (3, 'B5', 1, .6), (4, 'A5', 1, .55)], .3, .3)
phrase(17, 'dizi', [(1, 'F#5', 1.5, .55), (2.5, 'A5', .5, .55), (3, 'D6', 2, .62, 'B5')], .3, .3)
phrase(18, 'jinghu', [(1, 'D5', 1, .6), (2, 'F#5', 1, .62, 'E5'), (3, 'A5', 2, .68, 'F#5')], .3, .25)
phrase(19, 'dizi', [(1, 'B5', 1, .6), (2, 'A5', 1, .58), (3, 'F#5', 1, .55), (4, 'D5', 1, .55)], .3, .3)
# tableau (20-21)
phrase(20, 'jinghu', [(1, 'D5', 2, .65), (3, 'A5', 2, .7, 'F#5')], .32, .25)
phrase(20, 'erhu', [(1, 'D4', 4, .6)], .34, -.1)
phrase(20, 'pipa', [dm(1, 'D4', 1, .8), dm(2, 'A4', 1, .7), dm(3, 'D5', 1, .7), dm(4, 'F#5', 1, .65)], .45, -.25)
phrase(21, 'pipa', [(1, 'D4', 4, .7)], .5, -.2)
phrase(21, 'dizi', [(1, 'A5', 3, .5)], .28, .3)

# ---------------------------------------------------------------- walking: soft boots on timber while she glides
walk_t0, walk_t1 = bar(2), 9.7
tt_ = walk_t0
while tt_ < walk_t1:
    if not (6.1 < tt_ < 6.9): add(fol, step(1), tt_, .22 + .05 * rng.random(), -.1 + .2 * rng.random())
    tt_ += 1 / 3
for e in EVS:
    pass
# silk sleeve cracks on each held-pose landing
for h in (bar(1, 4), bar(8), bar(9), bar(10)): add(fol, whoosh(.2, 1, False), h + .05, .25, 0)
# the gate doors grind open, then water, then birds
add(fol, doors(2.2, 1), bar(15) + .35, .6, 0)
# ---------------------------------------------------------------- ambience
add(amb, wind(DUR + .5, 1), 0, .1, 0)
sil0, sil1 = bar(13), bar(15)    # the silence: wind rises a little, nothing else
w2 = wind(sil1 - sil0 + 1.0, 1) * np.sin(np.pi * t_(sil1 - sil0 + 1.0) / (sil1 - sil0 + 1.0)); add(amb, w2, sil0 - .5, .1, .1)
# water: pink noise bed rising from the stroke, with gurgle
t0 = bar(15) + .15; dW = DUR - t0
tt = t_(dW); wn = bp(noise(dW), 300, 2600, 2) * (1 - np.exp(-tt / 1.6)) * (.6 + .4 * np.sin(2 * np.pi * tt / 2.3))
gur = bp(noise(dW), 700, 1800, 2) * (np.abs(np.sin(2 * np.pi * tt * 3.1 + np.sin(tt * 1.7))) ** 3) * (1 - np.exp(-tt / 2.5)) * .5
add(amb, (wn + gur) * np.minimum((dW - tt) / 3, 1).clip(0, 1) * .8, t0, .22, 0)
# birds in the valley and at the open gate
for k in range(26):
    tb = bar(16) + 1.2 + k * .35 + rng.random() * .25
    if tb > bar(19) + 1.5: break
    d = .14; tt2 = t_(d); f0 = 2400 + rng.random() * 1400; ch = np.sin(2 * np.pi * np.cumsum(f0 * (1 + .4 * np.sin(2 * np.pi * 18 * tt2) + 1.2 * tt2)) / SR) * np.sin(np.pi * tt2 / d) ** 2
    add(amb, ch, tb, .035 + .03 * rng.random(), -.6 + 1.2 * rng.random())
# ---------------------------------------------------------------- voices (compressed, placed on the timeline)
for L in LINES:
    w, sr = sf.read(os.path.join(HERE, 'voices', L['id'] + '.wav'))
    if w.ndim > 1: w = w.mean(1)
    if sr != SR:
        import soxr; w = soxr.resample(w, sr, SR)
    t = [e['t'] for e in EVS if e['type'] == 'voice' and e['id'] == L['id']][0]
    w = compress(w.astype(np.float32), .22, 4.0); w = norm(w, .9)
    add(vox, w, t, .9, -.35 if L['id'].startswith('ql') else .35)
# ---------------------------------------------------------------- duck, balance, write
vox_env = np.abs(vox).max(1)
from scipy.ndimage import uniform_filter1d, maximum_filter1d
duck = 1 - .6 * np.clip(uniform_filter1d(maximum_filter1d(vox_env, int(.5 * SR)), int(.25 * SR)) * 3, 0, 1)
mus_l = limit(mus[:, 0], .95); mus_r = limit(mus[:, 1], .95)
mix = np.stack([mus_l, mus_r], 1) * duck[:, None] * .85 + fol * .9 + amb + vox * 1.0
mix = mix[:int(DUR * SR)]
# bus: a gentle linked compressor so the gong peaks do not set the loudness, then a look-ahead limiter
mono_env = np.abs(mix).max(1); thr = .2; a_, r_ = np.exp(-1 / (.004 * SR)), np.exp(-1 / (.18 * SR)); e = 0.0; g = np.ones(len(mix))
for i in range(len(mix)):
    c = mono_env[i]; e = a_ * e + (1 - a_) * c if c > e else r_ * e + (1 - r_) * c
    g[i] = (thr + (e - thr) / 3.0) / e if e > thr else 1.0
mix = mix * g[:, None] * 1.4
mix = np.stack([limit(mix[:, 0], .76), limit(mix[:, 1], .76)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix', mix.shape, 'peak', float(np.abs(mix).max()))
