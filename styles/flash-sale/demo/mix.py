"""Score, foley and cues -> mix.wav for the flash-sale demo ("Mango Lane: Mega Markdown").
Everything is numpy: an original upbeat jingle (4-chord hook in C major, 120 BPM) and designed sound effects driven by events.json
(every slam, strike, price, tick has its own sound at the frame it lands). No samples, no recordings.
usage: .venv/bin/python styles/flash-sale/demo/mix.py   (after core/render/events.mjs)
"""
import sys, os, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
BEAT = .5; BAR = 2.0; E8 = .25
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(92)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def atk(x, a=.002): t = tv(len(x) / SR); return x * np.minimum(1, t / a)

# ------------------------------------------------------------------ instruments
def kick(v=1.0):
    d = .32; t = tv(d); f = 45 + 95 * np.exp(-t / .035); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .13)
    return atk(x + hp(noise(d), 3000) * np.exp(-t / .004) * .25) * v
def snare(v=1.0):
    d = .22; t = tv(d); return atk(bp(noise(d), 1500, 7500) * np.exp(-t / .06) + np.sin(2 * np.pi * 190 * t) * np.exp(-t / .05) * .6) * v
def clap(v=1.0):
    d = .26; out = np.zeros(int(d * SR))
    for q in (0, .011, .024): c = bp(noise(.05), 1100, 3200) * np.exp(-tv(.05) / .008); s = int(q * SR); out[s:s + len(c)] += c
    t = tv(d); out += bp(noise(d), 1000, 3000) * np.exp(-np.maximum(0, t - .03) / .07) * .6; return out * v
def hat(v=1.0, open_=False):
    d = .22 if open_ else .05; t = tv(d); return hp(noise(d), 7500) * np.exp(-t / (.07 if open_ else .012)) * v
def bassn(f, d=.4, v=1.0):
    t = tv(d); env = np.minimum(1, t / .004) * np.exp(-t / (d * .6)) * np.clip((d - t) / .03, 0, 1)
    return (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * 2 * f * t) + .22 * np.sin(2 * np.pi * 3 * f * t) + .1 * np.sin(2 * np.pi * 4 * f * t)) * env * v
def stab(ms, d=.22, v=1.0):
    t = tv(d); env = np.minimum(1, t / .003) * np.exp(-t / (d * .45)) * np.clip((d - t) / .02, 0, 1); x = 0
    for m in ms:
        f = mtof(m); x = x + sum(np.sin(2 * np.pi * f * k * t + k) / k for k in range(1, 7))
    return lp(x, 3200) * env * v / len(ms) * 1.6
def marimba(f, d=.5, v=1.0):
    t = tv(d); x = np.sin(2 * np.pi * f * t) * np.exp(-t / .28) + .5 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t / .045) + .25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .12)
    return atk(x, .002) * v * np.clip((d - t) / .05, 0, 1)
def bell(f, d=1.4, tau=.4):
    t = tv(d); return atk(sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (tau * s)) for m, a, s in [(1, 1, 1), (2.01, .35, .6), (2.76, .25, .35), (5.4, .12, .2)]))
def brass(f, d=.5, v=1.0):
    t = tv(d); vib = 1 + .004 * np.sin(2 * np.pi * 5.5 * t); ph = np.cumsum(f * vib) / SR; x = sum(np.sin(2 * np.pi * ph * k) / k for k in range(1, 9))
    return lp(x, 2600) * np.minimum(1, t / .03) * np.clip((d - t) / .08, 0, 1) * v * .4

# ------------------------------------------------------------------ the score
music = np.zeros((N, 2)); drums = np.zeros((N, 2))
CH = {'C': ([60, 64, 67], 36), 'G': ([59, 62, 67], 31), 'Am': ([57, 60, 64], 33), 'F': ([57, 60, 65], 29)}
HOOK = [  # (eighth, midi, length in eighths) per hook bar A B C D
    [(0, 76, 1), (1, 79, 1), (2, 81, 1), (3, 79, 1), (4, 76, 2), (6, 72, 1), (7, 74, 1)],
    [(0, 74, 1), (1, 79, 1), (2, 83, 1), (3, 81, 1), (4, 79, 2), (6, 74, 1), (7, 71, 1)],
    [(0, 72, 1), (1, 76, 1), (2, 81, 1), (3, 84, 1), (4, 81, 2), (6, 76, 1), (7, 79, 1)],
    [(0, 77, 1), (1, 81, 1), (2, 84, 1), (3, 81, 1), (4, 77, 1), (5, 79, 1), (6, 81, 2)],
]
HOOKCH = ['C', 'G', 'Am', 'F']
def bar_t(b): return b * BAR
def groove(b, ch, lvl=1.0, hats=8, backbeat=True, four=True):
    t0 = bar_t(b); chord, root = CH[ch]
    for i in range(4):
        if four or i in (0, 2): add(drums, kick(), t0 + i * BEAT, .9 * lvl)
    if backbeat:
        for i in (1, 3): add(drums, clap(), t0 + i * BEAT, .55 * lvl, .1)
    for e in range(hats):
        step = BAR / hats; off = e % 2 == 1 and hats == 8
        add(drums, hat(.5 + .25 * (e % 2), open_=(off and e % 4 == 3)), t0 + e * step, .22 * lvl, -.3 + .6 * (e % 3) / 2)
    # bouncy bass
    for e, o in ((0, 0), (1.5 * 2 // 2, 0), (3, 12), (4, 0), (6, 7), (7, 12)):
        pass
    for e, o in ((0, 0), (3, 12), (4, 0), (6, 7), (7, 12)): add(music, bassn(mtof(root + o), .3 if e in (3, 7) else .42, 1.0), t0 + e * E8, .5)
    # off-beat chord stabs
    for e in (2, 5): add(music, stab(chord, .2, .8), t0 + e * E8, .22, .25)
def hook(b, i, lvl=1.0, octv=0, dbl=False):
    t0 = bar_t(b)
    for e, m, ln in HOOK[i % 4]:
        add(music, marimba(mtof(m + octv), ln * E8 * 1.9, 1.0), t0 + e * E8, .3 * lvl, .1)
        if dbl: add(music, marimba(mtof(m + octv + 12), ln * E8 * 1.5, .6), t0 + e * E8 + .004, .16 * lvl, -.2)
def hookbrass(b, i, lvl=1.0):
    t0 = bar_t(b)
    for e, m, ln in HOOK[i % 4]: add(music, brass(mtof(m - 12), ln * E8 * 1.8 + .1, 1.0), t0 + e * E8, .14 * lvl, 0)
def pad(ms, d, v=1.0, a=.3):
    t = tv(d); env = np.minimum(1, t / a) * np.clip((d - t) / .5, 0, 1); x = 0
    for m in ms:
        f = mtof(m)
        for dt in (-.5, .5): x = x + np.sin(2 * np.pi * (f + dt) * t) * .4 + (2 * (((f + dt) * t) % 1) - 1) * .15
    return lp(x, 1800) * env * v / len(ms)

# bars 0-5 (0-12 s): intro and the first two drops
for b in range(0, 6):
    groove(b, HOOKCH[b % 4], 1.0); hook(b, b, 1.0, dbl=(b >= 4))
# the opening hit: crash + sub on the downbeat of the film
add(music, pad([48, 55, 60, 64, 67], 1.6, .8, .01), 0, .2)
# bars 6-9 (12-20 s): the stock bar. Am F Am G, 16th hats, no lead, a pad, a riser into the coupon
TENSE = ['Am', 'F', 'Am', 'G']
for j, b in enumerate(range(6, 10)):
    ch = TENSE[j]; groove(b, ch, .85, hats=16, backbeat=(j >= 2)); add(music, pad(CH[ch][0], BAR, .9, .5), bar_t(b), .22)
    for e in range(8):
        if j >= 1: add(music, marimba(mtof(CH[ch][0][e % 3] + 12), .25, .7), bar_t(b) + e * E8, .15, -.3 + .6 * (e % 4) / 3)
# 'ONLY 3 LEFT' at 16.5: a held chord
add(music, pad([45, 57, 60, 64], 3.0, 1.0, .01), 16.5, .3)
# riser through bar 9
tr = tv(2.0); riser = bp(noise(2.0), 300, 8000) * (tr / 2) ** 2 * .5 + np.sin(2 * np.pi * np.cumsum(180 + 900 * (tr / 2) ** 2) / SR) * (tr / 2) ** 2 * .3
add(music, riser, 18.0, .35)
# bars 10-12 (20-26 s): the coupon. No drums: bass, plucks, the hook in fragments; everything stops at the rip (22.4) and returns at 23.0
for j, b in enumerate((10, 11, 12)):
    ch = HOOKCH[j]; chord, root = CH[ch]
    for e in (0, 3, 4, 7): add(music, bassn(mtof(root + (12 if e in (3, 7) else 0)), .3, 1.0), bar_t(b) + e * E8, .42)
    for e in (2, 5): add(music, stab(chord, .2, .6), bar_t(b) + e * E8, .16, .3)
    for i in range(4): add(drums, hat(.5), bar_t(b) + i * BEAT + E8, .12)
hook(11, 1, .8); hook(12, 2, .8)
add(music, marimba(mtof(76), .8, 1.0), 20.1, .25)      # the ticket lands
# the build into the cart: snare roll bar 12 (24-26)
for e in range(8): add(drums, snare(.5 + .5 * e / 7), 25.0 + e * E8 * 0.5 * (1 if e < 4 else 1), .3 * (.4 + e / 8))
# bars 13-16 (26-34 s): cart and grid; the hook, bigger
for b in range(13, 17):
    groove(b, HOOKCH[(b - 13) % 4], 1.05, hats=16 if b >= 15 else 8); hook(b, b - 13, 1.0, dbl=True)
# bars 17-19 (34-40 s): the countdown. A kick on every beat, the snare roll accelerates, the riser climbs
for j, b in enumerate((17, 18, 19)):
    ch = ['Am', 'F', 'G'][j]; chord, root = CH[ch]; t0 = bar_t(b)
    for i in range(4): add(drums, kick(), t0 + i * BEAT, .95)
    for e in range(8): add(music, bassn(mtof(root + (12 if e % 2 else 0)), .22, 1.0), t0 + e * E8, .42)
    for e in range(16): add(drums, hat(.4 + .3 * (e % 2)), t0 + e * E8 / 2, .18)
    if j == 0: add(music, pad(chord, BAR, .8, .3), t0, .2)
t = 36.0
while t < 38.0 - 1e-6: add(drums, snare(.6), t, .35); t += BEAT
t = 38.0
while t < 39.0 - 1e-6: add(drums, snare(.7), t, .4); t += E8
t = 39.0
while t < 39.5 - 1e-6: add(drums, snare(.85), t, .45 + (t - 39.0) * .5); t += E8 / 2
tr = tv(5.5); rs = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (tr / 5.5 * 2)) / SR) * (tr / 5.5) ** 1.5 * .25 + bp(noise(5.5), 800, 9000) * (tr / 5.5) ** 3 * .4
add(music, rs, 34.0, .35)
# bars 20-23 (40-48 s): the sale is live; brass joins the hook
for b in range(20, 24):
    groove(b, HOOKCH[(b - 20) % 4], 1.15, hats=16, ); hook(b, b - 20, 1.0, dbl=True); hookbrass(b, b - 20, 1.0 if b < 22 else .8)
add(music, pad([48, 55, 60, 64, 67], 2.0, .9, .02), 40.0, .3); add(drums, 0 * snare(), 40, 0)
# bar 24 (48-50): the final cadence: C major, bell arpeggio, a long tail
add(drums, kick(), 48.0, 1.0); add(music, stab([48, 60, 64, 67, 72], .6, 1.0), 48.0, .4, 0); add(music, bassn(mtof(36), 1.2, 1.0), 48.0, .6)
add(music, brass(mtof(60), 1.2, 1.0), 48.0, .18); add(music, brass(mtof(67), 1.2, 1.0), 48.0, .15)
for i, m in enumerate((72, 76, 79, 84, 88)): add(music, bell(mtof(m), 1.8, .5), 48.0 + .25 * i, .16, -.4 + .2 * i)
add(music, pad([48, 55, 60, 64, 67, 72], 2.0, 1.0, .02), 48.0, .28)

# ------------------------------------------------------------------ sound effects
fx = np.zeros((N, 2)); wet = np.zeros((N, 2))
def thump(f=90, d=.22, tau=.07, drop=.5): t = tv(d); return atk(np.sin(2 * np.pi * np.cumsum(f * (1 - drop * np.minimum(1, t / d))) / SR) * np.exp(-t / tau))
def whoosh(d=.2, f0=500, f1=5000, v=1.0):
    n = noise(d); t = tv(d); f = np.geomspace(f0, f1, len(t)); out = np.zeros_like(n)
    for i in range(0, len(n), 480):
        hi = min(len(n), i + 480); out[i:hi] = bp(n[max(0, i - 2000):hi], f[i] * .7, min(f[i] * 1.4, 20000))[-(hi - i):]
    return out * np.sin(np.pi * t / d) ** 1.5 * v
def sparkle(n=8, span=.5, f0=3000):
    out = np.zeros(int((span + .3) * SR))
    for _ in range(n):
        at = rng.random() * span; c = bell(f0 * (.8 + .9 * rng.random()), .25, .08); s = int(at * SR); out[s:s + len(c)] += c[:len(out) - s] * (.4 + .6 * rng.random())
    return out
def crackle(n=6, span=.1, f0=4200):
    out = np.zeros(int((span + .05) * SR))
    for _ in range(n):
        at = rng.random() * span; c = bp(noise(.01), f0 * (.6 + .9 * rng.random()), min(18000, f0 * 2.2)) * np.exp(-tv(.01) / .002); s = int(at * SR); out[s:s + len(c)] += c * (.4 + .6 * rng.random())
    return out
def P(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
tickn = 0
for e in EV:
    k, t0 = e['type'], e['t']; w = e.get('w', 1); pan = e.get('pan', 0)
    if k == 'impact':
        add(fx, P(thump(60, .9, .25, .6), lp(noise(1.2), 2500) * np.exp(-tv(1.2) / .4) * .5), t0, .9); add(fx, sparkle(14, .6, 3500), t0 + .05, .2)
    elif k == 'slam':
        add(fx, whoosh(.11, 400, 4500, .6), t0 - .11, .25 * (.6 + .2 * w), pan)
        add(fx, P(thump(110 - 12 * w, .2, .06 + .02 * w), hp(noise(.06), 2000) * np.exp(-tv(.06) / .006) * .7), t0, .22 + .12 * w, pan)
    elif k == 'sticker':
        t = tv(.12); add(fx, whoosh(.08, 800, 5000, .5), t0 - .08, .18, .3); add(fx, P(np.sin(2 * np.pi * np.cumsum(500 + 1400 * t / .12) / SR) * np.exp(-t / .04), thump(150, .1, .03) * .8), t0, .25, .3)
    elif k == 'strike':
        add(fx, whoosh(.14, 1200, 8000, 1.0), t0, .38, 0)
    elif k == 'strikehit':
        if e.get('soft'): add(fx, hp(noise(.03), 3000) * np.exp(-tv(.03) / .005), t0, .12)
        else: add(fx, P(thump(130, .15, .04) * .9, hp(noise(.04), 2500) * np.exp(-tv(.04) / .005)), t0, .4)
    elif k == 'price':
        add(fx, whoosh(.1, 500, 5000, .6), t0 - .1, .25); add(fx, thump(90, .26, .08), t0, .5)
        for j, f in enumerate((1760, 2349, 2794)): add(fx, bell(f, .9, .25), t0 + .035 * j, .17 - .03 * j); add(wet, bell(f, .9, .25), t0 + .035 * j, .08)
    elif k == 'plus':
        t = tv(.25); add(fx, np.sin(2 * np.pi * np.cumsum(260 + 520 * np.sin(np.pi * np.minimum(1, t / .25)) + 30 * np.sin(2 * np.pi * 18 * t)) / SR) * np.exp(-t / .1), t0, .3)
    elif k == 'bar':
        add(fx, bell(1568, .5, .15), t0, .15)
    elif k == 'cell':
        f = e['f']; t = tv(.04); add(fx, P(np.sin(2 * np.pi * (700 + 2200 * f) * t) * np.exp(-t / .006), hp(noise(.04), 3500) * np.exp(-t / .003) * .6), t0, .32 + .15 * f, -.3 + .6 * (e['n'] % 2))
        if e['n'] % 5 == 4: add(fx, thump(100 - 30 * f, .12, .03), t0, .3)
    elif k == 'only':
        t = tv(.45); buz = np.sign(np.sin(2 * np.pi * 115 * t)) + np.sign(np.sin(2 * np.pi * 121 * t)); add(fx, lp(buz, 1800) * np.minimum(1, t / .005) * np.exp(-t / .22) * .5, t0, .55)
        add(fx, thump(55, .8, .2, .5), t0, .8); add(fx, crackle(10, .15, 3500), t0, .3)
    elif k == 'peel':
        d = e['dur']; t = tv(d); env = (t / d) ** 2
        cr = np.zeros(len(t))
        for _ in range(int(60 * d)):
            u = rng.random() ** .6; s = int(u * (len(t) - 200)); c = hp(noise(.004), 2500) * np.exp(-tv(.004) / .001); cr[s:s + len(c)] += c[:len(cr) - s] * (.3 + u)
        add(fx, bp(noise(d), 1500, 6500) * env * .5 + cr * .6, t0, .45)
    elif k == 'rip':
        d = .35; t = tv(d); x = bp(noise(d), 700, 9000) * np.exp(-t / .1) * (.6 + .4 * (rng.random(len(t)) > .6)); add(fx, P(x, crackle(18, .25, 3000) * .8, thump(70, .3, .08) * .6), t0, .85)
        add(fx, hp(noise(.6), 5000) * np.exp(-tv(.6) / .15), t0 + .1, .16)
    elif k == 'shine':
        t = tv(.5); add(fx, P(np.sin(2 * np.pi * np.cumsum(2400 + 3200 * t / .5) / SR) * np.sin(np.pi * t / .5) ** 2 * .5, sparkle(5, .3, 4500) * .5), t0, .14, .2)
    elif k == 'row':
        for q in (0, .045): add(fx, P(hp(noise(.03), 2200) * np.exp(-tv(.03) / .005), np.sin(2 * np.pi * 1700 * tv(.03)) * np.exp(-tv(.03) / .006) * .5), t0 + q, .28)
        add(fx, whoosh(.12, 600, 3000, .5), t0 - .1, .14, -.3)
    elif k == 'ring':    # cash register: drawer thunk, two bells, coin spill
        add(fx, P(thump(80, .3, .1) * .9, hp(noise(.05), 1800) * np.exp(-tv(.05) / .008)), t0 - .02, .6)
        for j, (f, d) in enumerate(((2093, .0), (2637, .12), (3136, .22))): add(fx, bell(f, 1.2, .5), t0 + d, .22); add(wet, bell(f, 1.2, .5), t0 + d, .12)
        add(fx, sparkle(22, .9, 3500), t0 + .1, .22)
    elif k == 'coins':
        add(fx, sparkle(18, .8, 4200), t0, .2)
    elif k == 'tick':
        last = e.get('last', 0)
        t = tv(.07); add(fx, P(np.sin(2 * np.pi * (1500 if last else 2000) * t) * np.exp(-t / .01), hp(noise(.07), 3000) * np.exp(-t / .002) * .6), t0, .5 if last else .35)
        add(fx, thump(100, .2, .06), t0, .45 if last else .25)
        if last: t2 = tv(.14); add(fx, np.sin(2 * np.pi * 880 * t2) * np.exp(-t2 / .08) * .5, t0, .3)
    elif k == 'tick2':
        t = tv(.05); add(fx, np.sin(2 * np.pi * 1200 * t) * np.exp(-t / .006) * .6, t0, .2)
    elif k == 'boom':
        add(fx, P(thump(52, 1.4, .35, .7), lp(noise(1.6), 3500) * np.exp(-tv(1.6) / .5) * .5), t0, .95); add(fx, hp(noise(1.5), 6000) * np.exp(-tv(1.5) / .5), t0, .22)
    elif k == 'horn':
        d = 1.0; t = tv(d); x = sum(np.sin(2 * np.pi * np.cumsum(f * (1 + .006 * np.sin(2 * np.pi * 6 * t))) / SR) + .5 * np.sin(2 * np.pi * np.cumsum(f * 2 * (1 + .006 * np.sin(2 * np.pi * 6 * t))) / SR) for f in (440, 554, 659))
        add(fx, lp(np.sign(x) * .5 + x * .3, 2400) * np.minimum(1, t / .02) * np.exp(-t / .6) * np.clip((d - t) / .1, 0, 1), t0 + .02, .35)
    elif k == 'confetti':
        add(fx, P(bp(noise(.1), 600, 3500) * np.exp(-tv(.1) / .03), thump(200, .1, .02) * .6), t0, .4); add(fx, sparkle(26, 1.0, 3800), t0, .2)
    elif k == 'cursor':
        d = e['dur']; add(fx, whoosh(d, 400, 1500, .5), t0, .1, .3)
    elif k == 'click':
        for q, f in ((0, 1800), (.07, 1200)): t = tv(.03); add(fx, P(np.sin(2 * np.pi * f * t) * np.exp(-t / .005), hp(noise(.03), 3000) * np.exp(-t / .002) * .5), t0 + q, .5)
        add(fx, bell(1318, 1.0, .35), t0 + .03, .22); add(fx, bell(1976, 1.0, .3), t0 + .13, .18); add(wet, bell(1318, 1.0, .35), t0 + .03, .1)
    elif k == 'wipe':
        d = e['dur']; add(fx, whoosh(d, 300, 7000, 1.0), t0, .3, 0)
    elif k == 'cut':
        add(fx, P(thump(75, .22, .06) * .9, hp(noise(.05), 2000) * np.exp(-tv(.05) / .008)), t0, .4)

# ------------------------------------------------------------------ the silences, hall, mix
gate = np.ones(N)
def mute(a, b, fi=.012):
    global gate
    gate *= 1 - ((tt >= a) & (tt < b)) * np.clip(np.minimum((tt - a) / fi + 1, (b - tt) / .02), 0, 1) * 1.0
mute(19.8, 20.0); mute(22.42, 23.0); mute(39.5, 40.0)
fxgate = np.ones(N)
for a, b in ((39.52, 40.0),): fxgate *= 1 - ((tt >= a) & (tt < b))
music *= gate[:, None]; drums *= gate[:, None]
# a tiny "stop" on the tape: tail of the rip is allowed to ring (fx not gated at 22.42)
# a small hall for the wet bus
irn = int(1.2 * SR); irx = np.arange(irn) / SR
ir = lp(noise(1.2), 6000) * np.exp(-irx / .3); ir[:int(.01 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
from scipy.signal import fftconvolve
wetr = np.stack([fftconvolve(wet[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1)
# sidechain: the music and drums duck a little under big sound effects
env = np.zeros(N)
for e in EV:
    if e['type'] in ('slam', 'price', 'ring', 'only', 'boom', 'impact', 'rip', 'click'):
        s = int(e['t'] * SR); env[s:s + int(.22 * SR)] = np.maximum(env[s:s + int(.22 * SR)], np.exp(-np.arange(min(int(.22 * SR), N - s)) / (.07 * SR)))
duck = 1 - .3 * env
mix = (music * 0.6 + drums * 0.65) * duck[:, None] + fx * fxgate[:, None] * 1.9 + wetr * 1.9
out = np.zeros_like(mix)
for c in (0, 1):
    x = sfx.compress(mix[:, c], .25, 3.0, .004, .12); kk = .3; x = kk * np.tanh(x / kk); out[:, c] = sfx.limit(x, .2, .005)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav', DUR, 's | rms dB: music %.1f drums %.1f fx %.1f mix %.1f peak %.2f' % (rms(music), rms(drums), rms(fx), rms(out), np.abs(out).max()))
if os.environ.get('DIAG'):
    for a in range(0, int(DUR), 5):
        s = slice(a * SR, (a + 5) * SR); print('%3d music %6.1f drums %6.1f fx %6.1f out %6.1f' % (a, rms(music[s]), rms(drums[s]), rms(fx[s]), rms(out[s])))
