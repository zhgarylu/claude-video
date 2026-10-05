"""Foley, score and crowd -> mix.wav for the danmaku demo ("Day 3: I will not kill this starter").
The crowd's sound is derived from events.json: one blip per bullet comment (timbre by colour role, pitch from the F major
pentatonic by lane), so the chatter is part of the harmony and its density is the picture's. Everything is numpy, no samples.
usage: .venv/bin/python styles/danmaku/demo/mix.py   (after core/render/events.mjs)
"""
import sys, os, json
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

EVJ = json.load(open(os.path.join(HERE, 'events.json')))
EV = EVJ['ev']; DUR = EVJ['dur']
META = [e for e in EV if e['type'] == 'meta'][0]; K = META['K']; BAR = META['BAR']; BEAT = BAR / 4
PA, PB = META['PAUSE']['at'], META['PAUSE']['at'] + META['PAUSE']['len']      # film time of the pause
F = lambda tau: tau if tau < PA else tau + (PB - PA)                              # player time -> film time
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(86)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def ramp(a, b, fa=.3, fb=.3): return np.clip((tt - a) / fa, 0, 1) * np.clip((b - tt) / fb, 0, 1)
def sm(x, a, b): return np.clip((x - a) / (b - a), 0, 1)

# ----------------------------------------------------------------- the crowd: one blip per bullet, by colour role
PENT = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86]            # F G A C D, two octaves
def blip(role, m, size):
    big = size > 50
    if role == 'w':        # soft key tick
        d = .09; t = tv(d); f = mtof(m + 12)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / .018) + hp(noise(d), 3000) * np.exp(-t / .0015) * .5
    elif role == 'y':      # advice: marimba-like ping
        d = .5; t = tv(d); f = mtof(m)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / .16) + .4 * np.sin(2 * np.pi * f * 3.97 * t) * np.exp(-t / .03)
    elif role == 'c':      # jokes: boop with an upward glide
        d = .22; t = tv(d); f = mtof(m) * (0.85 + .15 * np.minimum(1, t / .06))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .07)
    elif role == 'p':      # hype: sparkle
        d = .5; t = tv(d); f = mtof(m + 12)
        x = (np.sin(2 * np.pi * f * t) + .6 * np.sin(2 * np.pi * f * 1.5 * t + 1) + .3 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t / .12) * (1 + .4 * np.sin(2 * np.pi * 22 * t))
    elif role == 'g':      # counting: wood block
        d = .18; t = tv(d); f = 900 if not big else 700
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / .03) + .5 * np.sin(2 * np.pi * f * 2.4 * t) * np.exp(-t / .015)
    elif role == 'r':      # alarm: a short buzzer
        d = .22; t = tv(d); f = 196 if not big else 147
        x = lp(np.sign(np.sin(2 * np.pi * f * t)) * (1 + .3 * np.sin(2 * np.pi * 7 * t)), 1600) * np.exp(-t / .09)
    else:                  # uploader: bell
        d = 1.6; t = tv(d); f = mtof(m)
        x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (.5 * s)) for k, a, s in [(1, 1, 1), (2.01, .35, .6), (2.76, .25, .35), (5.4, .12, .2)])
    x = x * np.minimum(1, t / .002)
    return x / (np.abs(x).max() + 1e-9)
crowd = np.zeros((N, 2)); GAIN = {'w': .30, 'y': .38, 'c': .34, 'p': .34, 'g': .6, 'r': .46, 'o': .5}
for e in EV:
    if e['type'] not in ('bullet', 'pin'): continue
    idx = (e['lane'] * 3 + e['n']) % len(PENT)
    if e['role'] == 'g': idx = 4 + (e['n'] % 3)
    big = e['size'] > 50
    g = GAIN[e['role']] * (1.5 if big else 1.0) * (.8 + .2 * ((e['n'] * 37) % 10) / 10)
    add(crowd, blip(e['role'], PENT[idx] - (12 if big else 0), e['size']), e['t'], g * .13, -.8 + 1.6 * (e['lane'] - 1) / 15)

# ----------------------------------------------------------------- foley
fx = np.zeros((N, 2)); wet = np.zeros((N, 2))
def thump(f=70, d=.3, tau=.08): t = tv(d); return np.sin(2 * np.pi * f * (1 - .25 * t / d) * t) * np.exp(-t / tau)
def bell(f, d=1.6, tau=.5):
    t = tv(d); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (tau * s)) for m, a, s in [(1, 1, 1), (2.01, .35, .6), (2.76, .25, .35), (5.4, .12, .2)])
def squish(d=.25): t = tv(d); return lp(noise(d), 700) * np.exp(-t / .07) * (1 + np.sin(2 * np.pi * (40 - 90 * t) * t))
def crackle_burst(n=5, span=.09, f0=5200):
    out = np.zeros(int(.2 * SR))
    for _ in range(n):
        at = rng.random() * span; c = bp(noise(.01), f0 * (.6 + .9 * rng.random()), min(18000, f0 * 2.2)) * np.exp(-tv(.01) / .0018); s = int(at * SR); out[s:s + len(c)] += c * (.4 + .6 * rng.random())
    return out
tick_i = 0
for e in EV:
    k, t0 = e['type'], e['t']
    if k == 'pop':         # a bubble breaks at the surface
        d = .12; t = tv(d); f = 380 + 700 * rng.random(); x = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.6 * t / d)) / SR) * np.exp(-t / .03) + hp(noise(d), 2500) * np.exp(-t / .004) * .25
        add(fx, x, t0, .22, -.2 + .4 * rng.random())
    elif k == 'band':      # the rubber band twangs once
        t = tv(.6); add(fx, np.sin(2 * np.pi * (180 + 16 * np.sin(2 * np.pi * 13 * t)) * t) * np.exp(-t / .16) * .8, t0, .28)
    elif k == 'flour':
        d = e['dur']; t = tv(d + .4); env = np.clip(t / .05, 0, 1) * np.where(t < d, 1, np.exp(-(t - d) / .12))
        x = bp(noise(d + .4), 1400, 6500) * env * .6 + lp(noise(d + .4), 300) * np.exp(-t / .5) * .7
        add(fx, x, t0, .5, .3); add(wet, x, t0, .1, .3)
    elif k == 'pour':
        d = e['dur']; t = tv(d + .3); env = np.clip(t / .08, 0, 1) * np.where(t < d, 1, np.exp(-(t - d) / .08))
        x = bp(noise(d + .3), 600, 3500) * env * (.6 + .4 * np.sin(2 * np.pi * (9 + 6 * t) * t) ** 2) + bp(noise(d + .3), 150, 400) * env * .4
        add(fx, x, t0, .45, -.3)
    elif k == 'stir':
        t = tv(.9); x = bp(noise(.9), 900, 2800) * (np.sin(np.pi * np.minimum(1, t / .9)) ** 2) * .6
        for q in (.15, .55): c = np.sin(2 * np.pi * 2350 * tv(.25)) * np.exp(-tv(.25) / .05); add(fx, c, t0 + q, .12, .1)
        add(fx, x, t0, .3, .1)
    elif k == 'stretch':   # dough being pulled: a slow wet creak
        d = .9; t = tv(d); f = 300 + 300 * t / d
        x = bp(noise(d), 200, 900) * np.sin(np.pi * t / d) ** 2 * (0.6 + .4 * np.sin(2 * np.pi * 17 * t)) + np.sin(2 * np.pi * np.cumsum(f * (1 + .02 * np.sin(2 * np.pi * 9 * t))) / SR) * np.sin(np.pi * t / d) ** 2 * .08
        add(fx, x, t0 + .3, .5)
    elif k == 'fold':      # the fold lands: squish and a slap
        add(fx, squish(.3) * .9 + thump(75, .3, .07) * .9, t0, .75)
    elif k == 'tick':      # the clock, sped up: tick, tock
        n = e['n']; f = 2300 if n % 2 == 0 else 1700; t = tv(.06)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / .006) + hp(noise(.06), 3500) * np.exp(-t / .0018) * .6
        add(fx, x, t0, .6 if n > 0 else .3, -.15 if n % 2 == 0 else .15)
    elif k == 'poke':
        add(fx, thump(95, .25, .05) * .9 + np.pad(squish(.2), (0, int(.05 * SR))) * .5, t0, .55)
    elif k == 'oven':      # the door latch
        c = hp(noise(.05), 1200) * np.exp(-tv(.05) / .004) + np.sin(2 * np.pi * 420 * tv(.05)) * np.exp(-tv(.05) / .01)
        add(fx, c, t0, .7); add(fx, thump(60, .5, .12), t0 + .02, .5)
    elif k == 'crack':     # the crust sings
        add(fx, crackle_burst(5 + int(rng.random() * 4)), t0, .55, e['u'] * .7)
    elif k == 'pause':     # the player's own click
        add(fx, np.sin(2 * np.pi * 1500 * tv(.05)) * np.exp(-tv(.05) / .008), t0, .22)
    elif k == 'resume':
        add(fx, np.sin(2 * np.pi * 1900 * tv(.04)) * np.exp(-tv(.04) / .008), t0 - .01, .16)
    elif k == 'cut':       # serrated blade through the crust: the first loud sound after the silence
        d = e['dur']; t = tv(d + .2)
        stroke = (np.abs(np.sin(2 * np.pi * (26 / (2 * np.pi)) * t / 2)) ** 1.5)
        x = bp(noise(d + .2), 1200, 7000) * stroke * np.exp(-np.maximum(0, t - d) / .05) * 1.0 + hp(noise(d + .2), 5000) * (rng.random(len(t)) > .985) * 1.2
        add(fx, x, t0, .85)
        for q in (0.0, .24, .5): add(fx, crackle_burst(9, .12, 3600), t0 + q, .9)
        add(fx, thump(55, .35, .09), t0 + d - .05, .55)
    elif k == 'turn':      # the half falls open
        add(fx, np.pad(thump(65, .4, .1) * .8, (0, int(.1 * SR))) + lp(noise(.5), 900) * np.exp(-tv(.5) / .12) * .6, t0 + .4, .55)
    elif k == 'press':     # three rings fill: a rising tone, one per button
        d = e['dur']; t = tv(d)
        for j, m in enumerate((65, 69, 72)): add(fx, np.sin(2 * np.pi * np.cumsum(mtof(m + 12 * t / d * 2)) / SR) * (t / d) ** 1.6 * .5, t0, .12, -.4 + .4 * j)
    elif k == 'burst':     # coin, heart, star: a bright major chord and sparkles
        for j, m in enumerate((65, 69, 72, 76, 79)): add(fx, bell(mtof(m + 12), 2.4, .6), t0 + .02 * j, .26, -.5 + .25 * j); add(wet, bell(mtof(m + 12), 2.4, .6), t0 + .02 * j, .12)
        add(fx, thump(52, .6, .14) * .9, t0, .7)
        for q in range(14): add(fx, bell(mtof(PENT[(q * 3) % 10] + 12), .5, .15), t0 + .06 * q, .09 * (1 - q / 18), -.9 + 1.8 * (q % 5) / 4)
    elif k == 'type':      # keyboard taps
        t = tv(.04); x = hp(noise(.04), 1500) * np.exp(-t / .005) + np.sin(2 * np.pi * (1100 + 70 * (e['n'] % 5)) * t) * np.exp(-t / .006) * .6
        add(fx, x, t0, .3, .05)
    elif k == 'send':
        add(fx, bell(mtof(88), 1.4, .4), t0, .12); add(wet, bell(mtof(88), 1.4, .4), t0, .1)
        t = tv(.3); add(fx, bp(noise(.3), 800, 5000) * np.sin(np.pi * t / .3) ** 2 * .5, t0 - .05, .3)
    elif k == 'chapter':   # a chapter mark ticks past
        add(fx, np.sin(2 * np.pi * 1320 * tv(.12)) * np.exp(-tv(.12) / .03) * .6, t0, .1)
    elif k == 'payoff':    # the spoiler comes true
        add(fx, thump(48, 1.0, .25) * 1.0, t0, .9)
        for j, m in enumerate((53, 60, 65, 69, 72)): add(fx, bell(mtof(m), 2.6, .8), t0 + .03 * j, .22, -.4 + .2 * j); add(wet, bell(mtof(m), 2.6, .8), t0 + .03 * j, .12)
# the oven: spring crackles (small, rising in number) and the riser for the wall
sp = [e for e in EV if e['type'] == 'spring'][0]; ts, ds = sp['t'], sp['dur']
for i in range(90):
    u = rng.random() ** 0.7; at = ts + u * ds
    add(fx, crackle_burst(3 + int(rng.random() * 3), .05, 2600 + 2000 * u), at, .14 + .18 * u, -.8 + 1.6 * rng.random())
wl = [e for e in EV if e['type'] == 'wall'][0]; w0, wd = wl['t'], wl['dur']
t = tv(wd - .4); rise = (t / (wd - .4)) ** 2
riser = bp(noise(wd - .4), 400, 9000) * rise * .6 + np.sin(2 * np.pi * np.cumsum(120 + 700 * rise) / SR) * rise * .25
add(fx, riser, w0, .5)

# ----------------------------------------------------------------- beds
fade_in = np.clip(tt / 1.2, 0, 1)
room = (lp(noise(DUR), 380) * .04 + sum(a * np.sin(2 * np.pi * 50 * k * tt + k) for k, a in zip((1, 2, 3), (1, .4, .15))) * .007) * fade_in
fan = (lp(noise(DUR), 900) * .06 + np.sin(2 * np.pi * 118 * tt) * .012) * sm(tt, 35.3, 36.2) * (1 - sm(tt, 45.0, 46.0) * .85)
hushA = 1 - .8 * ramp(PA - .05, PB + .05, .15, .15)                                  # the pause: the room almost stops
bed = np.stack([(room + fan) * hushA, (room + fan) * hushA], 1)
# wind in the proof (while the crowd sleeps)
wind = bp(noise(DUR), 300, 900) * ramp(F(26.5), F(33.5), 1.5, 1.2) * .018 * (1 + .5 * np.sin(2 * np.pi * .2 * tt))
bed += np.stack([wind, wind], 1)

# ----------------------------------------------------------------- score: F major, 96 BPM, bar 2.5 s
def rhodes(f, d=1.6, v=1.0):
    t = tv(d); x = (np.sin(2 * np.pi * f * t) + .28 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .5) + .12 * np.sin(2 * np.pi * 6.9 * f * t) * np.exp(-t / .03)) * np.exp(-t / (d * .55))
    x *= (1 + .08 * np.sin(2 * np.pi * 4.6 * t)); return x * v * np.minimum(1, t / .004) * np.clip((d - t) / .08, 0, 1)
def bassn(f, d=1.0, v=1.0):
    t = tv(d); env = np.minimum(1, t / .01) * np.exp(-t / (d * .55)) * np.clip((d - t) / .05, 0, 1)
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * 2 * f * t) + .2 * np.sin(2 * np.pi * 3 * f * t)) * env * v
def pad(ms, d, v=1.0, a=1.0, r=1.4):
    t = tv(d); env = np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1); x = 0
    for m in ms:
        f = mtof(m)
        for dt in (-.6, 0, .7): x = x + (2 * (((f + dt) * t) % 1) - 1) * .3 + np.sin(2 * np.pi * (f + dt) * t) * .4
    return lp(x, 1400, 2) * env * v / len(ms)
def shaker(v=1.0): d = .05; t = tv(d); return hp(noise(d), 6000) * np.exp(-t / .012) * v
music = np.zeros((N, 2))
CHORD = {'F': (41, [57, 60, 64, 69, 72]), 'Dm': (38, [57, 62, 65, 69, 72]), 'Bb': (46, [58, 62, 65, 69, 74]), 'C': (36, [55, 60, 64, 67, 72])}
PROG = ['F', 'Dm', 'Bb', 'C']
PAT = [0, 2, 3, 1, 4, 3, 2, 1]                                  # eighth-note arpeggio shape
def bar_t(b): return (b - 1) * BAR
def arp(b, ch, vel, step=1, oct=0):
    root, ns = CHORD[ch]
    for i, p in enumerate(PAT):
        if i % step == 0: add(music, rhodes(mtof(ns[p] + oct), 1.1, vel * (1 if i % 2 == 0 else .72)), bar_t(b) + i * BEAT / 2, .22, -.3 + .6 * (i % 4) / 3)
def bassline(b, ch, v=.9, beats=(0, 2.5)):
    root, _ = CHORD[ch]
    for bt in beats: add(music, bassn(mtof(root), BEAT * 1.6, v), bar_t(b) + bt * BEAT, .5, 0)
def shake(b, v=.5, sub=2):
    for i in range(8): add(music, shaker(v * (1 if i % 2 == 0 else .6)), bar_t(b) + i * BEAT / 2 + (.02 if i % 2 else 0), .18, .4 if i % 2 else -.4)
# bars 1-3: Rhodes alone, the sceptical crowd
for b in (1, 2, 3): arp(b, PROG[(b - 1) % 4], .7 if b > 1 else .55, step=2)
# bars 4-6: bass and shaker join (mix)
for b in (4, 5, 6): arp(b, PROG[(b - 1) % 4], .8); bassline(b, PROG[(b - 1) % 4]); shake(b, .45)
# bars 7-10: the fold count: the pulse thickens, and one rising stab per fold on the count
for b in (7, 8, 9, 10): arp(b, PROG[(b - 1) % 4], .85); bassline(b, PROG[(b - 1) % 4], 1.0, (0, 1, 2, 3)); shake(b, .6)
for j, (tf, ms) in enumerate(zip(K['folds'], ([53, 60, 65, 69], [57, 64, 69, 72], [60, 67, 72, 76], [62, 69, 74, 77]))):
    for i, m in enumerate(ms): add(music, rhodes(mtof(m), 1.8, .8), F(tf) + i * .012, .2, -.3 + .2 * i)
# bars 11-14: the proof: the music leaves; only one held chord dies away, then a single note at the poke
add(music, pad([53, 60, 65], 3.0, .6, .4, 1.6), bar_t(11), .25)
add(music, rhodes(mtof(77), 2.4, .7), F(K['ready']) - .1, .22, 0)
# bars 15-19: bake: pad and bass pulse, the riser, the wall
add(music, pad([53, 60, 65, 69], 5.0, .8, .8, 1.2), bar_t(15), .3)
for b in (15, 16): bassline(b, PROG[(b - 1) % 4], .8, (0, 2)); arp(b, PROG[(b - 1) % 4], .6, step=2)
for b in (17, 18): arp(b, PROG[(b - 1) % 4], .9); bassline(b, PROG[(b - 1) % 4], 1.0, (0, 1, 2, 3)); shake(b, .6)
# the wall: sixteenth arpeggios climbing, then the payoff chord
t0 = F(K['wall0']); t1 = F(K['payoff'])
n16 = int((t1 - t0) / (BEAT / 4))
for i in range(n16):
    m = [65, 69, 72, 74, 77, 81][i % 6] + 12 * (i // 12 % 2); add(music, rhodes(mtof(m), .35, .6 + .4 * i / n16), t0 + i * BEAT / 4, .17, -.4 + .8 * (i % 5) / 4)
for m in (53, 60, 65, 69, 72, 76): add(music, rhodes(mtof(m), 3.0, .9), t1, .22, (m - 64) / 24)
add(music, bassn(mtof(29), 3.0, 1.0), t1, .8)
# bars 19-20: the cooling loaf: calm, then the tension builds toward the pause
add(music, pad([53, 60, 64, 69], 2.6, .6, .5, 1.0), bar_t(19) + 0, .22)
arp(19, 'F', .5, step=2); arp(20, 'Dm', .45, step=2)
tens = ramp(F(48.0), PA - .04, 1.4, .02) * (np.sin(2 * np.pi * np.cumsum(220 + 90 * sm(tt, 47.8, 50.0)) / SR) * .3 + np.sin(2 * np.pi * 55 * tt) * .3)
music += np.stack([tens * .5, tens * .5], 1)
# bar 22+: after the silence, the crumb: warm chord, the burst, the opening motif returns
tr = F(K['turn0']) + .5
add(music, pad([53, 60, 65, 69, 72], 2.3, .9, .6, 1.0), tr, .32)
for i, m in enumerate((72, 76, 79, 84)): add(music, rhodes(mtof(m), 1.4, .7), tr + .1 + i * BEAT / 2, .2)
tb = F(K['burst'])
for m in (53, 60, 65, 69, 72, 76, 79): add(music, rhodes(mtof(m), 3.2, .9), tb, .2, (m - 66) / 26)
add(music, bassn(mtof(29), 2.8, 1.0), tb, .8)
add(music, pad([53, 60, 65, 69, 72], 3.4, .9, .3, 1.4), tb, .3)
last = bar_t(23)
for i, p in enumerate([0, 2, 3, 1]): add(music, rhodes(mtof(CHORD['F'][1][p]), 1.3, .55), last + i * BEAT, .2, -.2 + .15 * i)
add(music, rhodes(mtof(77), 3.0, .6), bar_t(24) + BEAT, .2, 0)
# silences: the proof (the crowd asleep) and the pause. Everything but the room goes quiet.
gate = np.ones(N)
for a, b, fi in ((F(26.4), F(34.0), .2), (PA - .0, PB - .03, .0)):
    gate *= 1 - ((tt > a) & (tt < b)) * np.clip(np.minimum((tt - a) / max(fi, .05), (b - tt) / .05), 0, 1)
# the held chord before the proof plays through its first moments
music *= gate[:, None]
# also silence the crowd and the score during the pause, not the clock-like foley of the proof
pausemask = 1 - ((tt > PA) & (tt < PB))
crowd *= pausemask[:, None]
# a small hall
irn = int(1.5 * SR); irx = np.arange(irn) / SR
ir = lp(noise(1.5), 6000) * np.exp(-irx / .35); ir[:int(.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
wetr = np.stack([fftconvolve(wet[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1)
music_r = np.stack([fftconvolve(music[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .08
crowd_r = np.stack([fftconvolve(crowd[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .25

# ----------------------------------------------------------------- mix
# keep the crowd audible but under the picture's own sounds; the score ducks a little under the chatter peaks
dens = np.zeros(N)
for e in EV:
    if e['type'] == 'bullet': dens[int(e['t'] * SR):int((e['t'] + .25) * SR)] += 1
from scipy.ndimage import uniform_filter1d
dens = uniform_filter1d(np.minimum(dens, 8), size=int(.4 * SR))
mix = (crowd * (6.0) + crowd_r * 6.0 + fx * 1.0 + wetr * 1.0 + bed * 3.0 + (music + music_r) * (.26 * (1 - .12 * dens[:, None])))
sf.write(os.path.join(HERE, 'out', 'premix.wav'), mix.astype(np.float32), SR)
out = np.zeros_like(mix)
for c in (0, 1):
    x = sfx.compress(mix[:, c], .25, 3.0, .004, .12); k = .35; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .3, .005)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav', DUR, 's | rms dB: crowd %.1f fx %.1f music %.1f bed %.1f mix %.1f peak %.2f' % (rms(crowd), rms(fx), rms(music), rms(bed), rms(out), np.abs(out).max()))
if os.environ.get('DIAG'):
    print('  t   crowd   fx   music  bed   out')
    for a in range(0, int(DUR), 3):
        s = slice(a * SR, (a + 3) * SR)
        print('%3d %6.1f %6.1f %6.1f %6.1f %6.1f' % (a, rms(crowd[s]), rms(fx[s]), rms(music[s]), rms(bed[s]), rms(out[s])))
