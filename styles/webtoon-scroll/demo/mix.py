"""Sound for the "Webtoon Scroll" demo: rain and scroll beds, designed foley on every event, and a short ORIGINAL score (kalimba, ukulele-ish pluck, soft bass, shaker, woodblock) written for the scroll's tempo grid.
Everything is numpy/scipy synthesis: no samples, no recordings. Silence is part of the score: after the stop at 36.25 s and the beat before "I SAID NO." at 47.6 s.
usage: .venv/bin/python styles/webtoon-scroll/demo/mix.py   (after core/render/events.mjs)"""
import os, sys, json
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp, t_, env_exp, noise, norm
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
N = int(DUR * SR); rng = np.random.default_rng(11)
BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
fx = np.zeros((N, 2)); mus = np.zeros((N, 2)); bed = np.zeros((N, 2))
mt = lambda m: 440 * 2 ** ((m - 69) / 12)
tm = np.arange(N) / SR

def env_at(kind, default=0.0):
    pts = [(e['t'], e['v']) for e in EV if e['type'] == kind]
    if not pts: return np.full(N, default)
    xs, ys = zip(*pts); return np.interp(tm, xs, ys, left=ys[0], right=ys[-1])
def evs(kind): return [e for e in EV if e['type'] == kind]
def place(buf, x, at, gain=1.0, pan=0.0): sfx.add(buf, x.astype(np.float64), at, gain, pan)
def fade(x, a=.004, r=.01):
    x = x.copy(); na = min(len(x), int(a * SR)); nr = min(len(x), int(r * SR)); x[:na] *= np.linspace(0, 1, na); x[len(x) - nr:] *= np.linspace(1, 0, nr); return x
def glide(f0, f1, d, curve=1.0):
    tt = t_(d); f = f0 + (f1 - f0) * (tt / d) ** curve; return np.sin(2 * np.pi * np.cumsum(f) / SR)

# ------------------------------------------------------------------ beds: rain and the page sliding under a thumb
R = env_at('rain'); R = np.convolve(R, np.ones(2400) / 2400, mode='same')
rn = noise(DUR); rain_hi = hp(rn, 2500) * .55 + bp(rn, 800, 2500) * .35
rain_lo = lp(noise(DUR), 500) * .5
patter = (rng.random(N) > .9985) * rng.standard_normal(N); patter = bp(patter, 2000, 7000) * 2.0
rb = (rain_hi * .12 + rain_lo * .06 + patter * .05) * R
bed[:, 0] += rb; bed[:, 1] += np.roll(rb, 211)
S = env_at('speed'); S = np.convolve(S, np.ones(4800) / 4800, mode='same')
sw = bp(noise(DUR), 400, 3200) * np.clip(S - .25, 0, 1) ** 1.2 * .55
bed[:, 0] += sw; bed[:, 1] += np.roll(sw, 97)
# after the rain: a warm room-tone of the street and a few birds
warm = np.clip((tm - 41.0) / 3, 0, 1) * np.clip((DUR - tm) / 2, 0, 1)
bed += (lp(noise(DUR), 380) * .02 * warm)[:, None]
for tc in [43.6, 44.6, 45.2, 49.8, 51.3, 52.0]:
    f0 = 3200 + rng.random() * 800
    for k in range(3):
        c = glide(f0, f0 * 1.25, .07) * np.hanning(int(.07 * SR)) * .05; place(bed, c, tc + k * .11, 1.0, rng.uniform(-.5, .5))

# ------------------------------------------------------------------ foley
def flick(v=1.0):
    d = .22; x = hp(noise(d), 2200) * np.sin(np.pi * t_(d) / d) ** 3 * .6 + bp(noise(d), 900, 3000) * env_exp(d, .05) * .6
    return norm(fade(x)) * v
def blip(v=1.0):
    d = .1; return fade(glide(620, 980, d, .6) * env_exp(d, .035)) * v * .8
def tinkle(v=1.0):
    out = np.zeros(int(.8 * SR))
    for k, m in enumerate([88, 91, 95]): x = np.sin(2 * np.pi * mt(m) * t_(.7)) * env_exp(.7, .12); out[int(k * .09 * SR):int(k * .09 * SR) + len(x)] += x[:len(out) - int(k * .09 * SR)] * .6
    return norm(out) * v * .5
def bwip(v=1.0, pitch=1.0, smug=0):
    if smug:
        d = .42; f = 300 * pitch * (1 + .35 * np.sin(np.pi * t_(d) / d)); sig = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        sig = lp(sig, 1400) * np.sin(np.pi * t_(d) / d) ** .7
    else:
        d = .26; f = 460 * pitch * (1 - .45 * (t_(d) / d)); sig = np.sin(2 * np.pi * np.cumsum(f) / SR + .6 * np.sin(2 * np.pi * 26 * t_(d))) + .35 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        sig = sig * env_exp(d, .12) * np.minimum(1, t_(d) / .01)
    return fade(norm(sig)) * v * .75
def step(v=1.0):
    d = .14; x = lp(noise(d), 700) * env_exp(d, .018) * 1.2 + hp(noise(d), 2500) * env_exp(d, .03) * .25 + np.sin(2 * np.pi * 110 * t_(d)) * env_exp(d, .03) * .5
    return norm(x) * v * .8
def splosh(v=1.0):
    d = .5; x = bp(noise(d), 300, 3500) * env_exp(d, .09) * 1.2
    for k in range(6): c = glide(500 + 700 * rng.random(), 1200 + 800 * rng.random(), .07) * np.hanning(int(.07 * SR)); x[int((.02 + k * .05) * SR):int((.02 + k * .05) * SR) + len(c)] += c * .5
    return norm(x) * v
def slip(v=1.0):
    d = .32; x = glide(1400, 260, d, .7) * env_exp(d, .14) * .6 + hp(noise(d), 1500) * env_exp(d, .08) * .4
    return norm(fade(x)) * v
def bonk(v=1.0, pitch=1.0):
    d = .22; tt = t_(d); f = 230 * pitch * (1 - .25 * tt / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .05) + .35 * np.sin(2 * np.pi * np.cumsum(f * 2.76) / SR) * env_exp(d, .02) + hp(noise(d), 2500) * env_exp(d, .004) * .4
    return norm(x) * v * .9
def splash(v=1.0):
    d = 1.6; x = bp(noise(d), 250, 6000) * env_exp(d, .25) * 1.0 + hp(noise(d), 3000) * env_exp(d, .5) * .35
    x[:int(.1 * SR)] *= np.linspace(.2, 1, int(.1 * SR))
    for k in range(18): c = glide(600 + 800 * rng.random(), 1400 + 1200 * rng.random(), .08) * np.hanning(int(.08 * SR)); s = int((.06 + rng.random() * .9) * SR); x[s:s + len(c)] += c * .4
    return norm(x) * v
def impact(v=1.0):
    d = .9; tt = t_(d); x = np.sin(2 * np.pi * np.cumsum(70 * (1 - .4 * tt / d)) / SR) * env_exp(d, .17) + lp(noise(d), 200) * env_exp(d, .05) * .6
    return norm(x) * v
def drip(v=1.0):
    d = .5; x = glide(2100, 1500, .06) * env_exp(.06, .02); y = np.zeros(int(d * SR)); y[:len(x)] = x
    for k, (dl, g) in enumerate([(.17, .35), (.33, .15)]): y[int(dl * SR):int(dl * SR) + len(x)] += x * g
    return norm(y) * v * .5
def chime(v=1.0):
    out = np.zeros(int(2.4 * SR))
    for k, m in enumerate([72, 76, 79, 84]):
        x = (np.sin(2 * np.pi * mt(m) * t_(2.0)) + .3 * np.sin(2 * np.pi * mt(m) * 2.01 * t_(2.0))) * env_exp(2.0, .5); s = int(k * .13 * SR); out[s:s + len(x)] += x * .5
    return norm(out) * v * .6
def fwoomp(v=1.0):
    d = .55; tt = t_(d); inflate = lp(noise(d), 1800) * np.sin(np.pi * np.minimum(1, tt / .3) / 2) * env_exp(d, .22)
    body = glide(110, 240, d, .5) * env_exp(d, .12); thud = glide(150, 60, .12) * env_exp(.12, .04)
    x = inflate * .8 + body * .8; x[:len(thud)] += thud * 1.0; x += hp(noise(d), 3000) * env_exp(d, .03) * .25
    return norm(x) * v
def sparkle(v=1.0):
    out = np.zeros(int(1.4 * SR))
    for k in range(9): m = [96, 100, 103, 107, 108][k % 5] + (k // 5) * 0; x = np.sin(2 * np.pi * mt(m) * t_(.4)) * env_exp(.4, .09); s = int((k * .07 + rng.random() * .02) * SR); out[s:s + len(x)] += x * (.5 - k * .03)
    return norm(out) * v * .5
def thumpstop(v=1.0):
    d = .4; tt = t_(d); x = np.sin(2 * np.pi * np.cumsum(95 * (1 - .35 * tt / d)) / SR) * env_exp(d, .09) + hp(noise(d), 1500) * env_exp(d, .01) * .5 + lp(noise(d), 400) * env_exp(d, .03)
    return norm(x) * v
def buzz(v=1.0):
    out = np.zeros(int(.8 * SR))
    for k in range(2):
        d = .14; x = np.sign(np.sin(2 * np.pi * 150 * t_(d))) * .4 + np.sin(2 * np.pi * 300 * t_(d)) * .3; x = lp(x, 1200) * np.hanning(int(d * SR)); s = int(k * .22 * SR); out[s:s + len(x)] += x
    return norm(out) * v * .6
def gulp(v=1.0):
    d = .3; x = glide(220, 80, d, .6) * np.sin(np.pi * t_(d) / d) ** .6 + lp(noise(d), 600) * env_exp(d, .05) * .3
    return norm(lp(x, 900)) * v * .9
def star(v=1.0, pitch=0):
    m = [84, 86, 88, 91, 93][int(pitch) % 5]; d = .6; x = (np.sin(2 * np.pi * mt(m) * t_(d)) + .3 * np.sin(2 * np.pi * mt(m) * 3 * t_(d))) * env_exp(d, .15)
    return norm(fade(x)) * v * .6
def like(v=1.0):
    d = .3; x = glide(420, 900, .12) * env_exp(.12, .06); y = np.zeros(int(.7 * SR)); y[:len(x)] = x; y += np.pad(tinkle(1)[:int(.7 * SR) - 3000], (3000, 0))[:len(y)] * .8
    return norm(y) * v * .8
def strain(v=1.0): return sfx.creak(.9) * v
def tick(v=1.0):
    d = .03; return norm(hp(noise(d), 3000) * env_exp(d, .004)) * v * .5
def narr(v=1.0):
    d = .25; x = bp(noise(d), 700, 2600) * np.sin(np.pi * t_(d) / d) ** 2; return norm(fade(x)) * v * .45
def whoosh_big(v=1.0):
    d = 1.0; x = sfx.whoosh(d, 1.0) * 1.0 + glide(180, 900, d, 1.6) * .06 * np.sin(np.pi * t_(d) / d)
    return norm(x) * v
def tugend(v=1.0):
    d = .5; x = lp(noise(d), 1200) * env_exp(d, .12) * .8 + glide(300, 140, d) * env_exp(d, .2) * .25; return norm(x) * v * .6
def card(v=1.0): return norm(flick(1) * .6 + sfx.pop(1)[:int(.22 * SR)].repeat(1)[:int(.22 * SR)] * .0) * v

FX = {'flick': lambda e: flick(e['v']), 'swipe': lambda e: flick(.6), 'logo': lambda e: sfx.pop(.8 * e['v']), 'narr': lambda e: narr(), 'blip': lambda e: blip(e['v']), 'tagjingle': lambda e: tinkle(e['v']),
      'click': lambda e: sfx.click(1.0, .9), 'bwip': lambda e: bwip(e['v'], e.get('pitch', 1.0), e.get('smug', 0)), 'strain': lambda e: strain(.5), 'creak': lambda e: sfx.creak(.8 * e['v']),
      'tugend': lambda e: tugend(), 'step': lambda e: step(e['v']), 'splosh': lambda e: splosh(.9), 'slip': lambda e: slip(.9), 'whoosh': lambda e: whoosh_big(.9),
      'bonk': lambda e: bonk(e['v'], e.get('pitch', 1.0)), 'splash': lambda e: splash(1.0), 'impact': lambda e: impact(.9), 'drip': lambda e: drip(e['v']), 'chime': lambda e: chime(e['v']),
      'fwoomp': lambda e: fwoomp(1.0), 'sparkle': lambda e: sparkle(.8), 'thump': lambda e: thumpstop(.8), 'ding': lambda e: sfx.ding(.5), 'buzz': lambda e: buzz(.8), 'gulp': lambda e: gulp(.8),
      'card': lambda e: flick(.8), 'star': lambda e: star(1.0, e.get('pitch', 0)), 'like': lambda e: like(.9), 'subpop': lambda e: sfx.pop(.7), 'uiblip': lambda e: tick(.8)}
PAN = {'step': lambda e: -.25 if e.get('side') else .25}
for e in EV:
    if e['type'] in FX:
        x = FX[e['type']](e); pan = PAN.get(e['type'], lambda _: 0)(e)
        place(fx, x, e['t'], 1.0, pan)
# the hard stop at 36.25 takes the whole mix with it: a brief duck of everything but the impact tail
# ------------------------------------------------------------------ score: C major pentatonic, 96 BPM, one bar = 2.5 s
def kal(m, d, v=1.0):                                           # kalimba / tine: bright, short, woody
    tt = t_(d); f = mt(m); x = sum(a * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt / tau) for h, a, tau in [(1, 1, .5), (2.0, .25, .18), (5.4, .22, .05), (8.7, .08, .03)])
    return fade(x * v, .002, .02)
def ukes(m, d, v=1.0):                                          # nylon pluck
    tt = t_(d); f = mt(m); x = sum((1 / h) * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt / (.9 / (h ** .7))) for h in range(1, 8)); x += lp(noise(.02).repeat(1), 3000).mean() * 0
    c = hp(noise(min(d, .03)), 2000) * env_exp(min(d, .03), .005) * .3; x[:len(c)] += c
    return fade(x * v * .5, .002, .03)
def bassn(m, d, v=1.0):
    tt = t_(d); f = mt(m); x = (np.sin(2 * np.pi * f * tt) + .45 * np.sin(4 * np.pi * f * tt) + .22 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt / (d * .55 + .1))
    return fade(lp(x, 900) * v, .006, .04)
def padn(m, d, v=1.0):
    tt = t_(d); f = mt(m); x = sum(np.sign(np.sin(2 * np.pi * f * (1 + dt) * tt)) for dt in (-.003, 0, .004)) * .12; x = lp(x, 1100, 2)
    e = np.minimum(1, tt / .6) * np.minimum(1, (d - tt) / .6); return x * e * v
def shake(v=1.0):
    d = .07; return hp(noise(d), 5000) * env_exp(d, .018) * v * .35
def wood(v=1.0):
    d = .06; return (np.sin(2 * np.pi * 1050 * t_(d)) * env_exp(d, .01) + .3 * np.sin(2 * np.pi * 1700 * t_(d)) * env_exp(d, .006)) * v * .5
def kick(v=1.0):
    d = .25; tt = t_(d); return (np.sin(2 * np.pi * np.cumsum(110 * (1 - .6 * np.minimum(1, tt / .12))) / SR) * env_exp(d, .07)) * v * .8
def snare(v=1.0):
    d = .18; return (bp(noise(d), 1500, 8000) * env_exp(d, .05) + np.sin(2 * np.pi * 190 * t_(d)) * env_exp(d, .03) * .4) * v * .7

def note(buf, fn, t, m, d, v=1.0, pan=0.0):
    if t < 0 or t >= DUR: return
    place(buf, fn(m, d, v), t, 1.0, pan)
def bar_t(b): return b * BAR                                     # bar index from 0
C_MAJ = {'C': (48, [60, 64, 67]), 'F': (53, [60, 65, 69]), 'G': (55, [59, 62, 67]), 'Am': (57, [60, 64, 69]), 'Em': (52, [59, 64, 67]), 'Dm': (50, [62, 65, 69])}
def comp(buf, t0, t1, prog, mel=True, shaker=True, wb=False, vel=1.0, bass=True, ukes_on=True, sw=0):
    n = int(round((t1 - t0) / BAR))
    for b in range(n):
        ch = prog[b % len(prog)]; root, tri = C_MAJ[ch]; tb = t0 + b * BAR
        if bass:
            note(buf, bassn, tb, root, BEAT * 1.6, .9 * vel); note(buf, bassn, tb + 2 * BEAT, root + (7 if ch != 'Am' else 3), BEAT * 1.2, .65 * vel)
        if ukes_on:
            for k, off in enumerate([0, 1.5, 2, 3.5]): note(buf, ukes, tb + (off + (sw if k % 2 else 0)) * BEAT, tri[k % 3], BEAT * .9, .55 * vel, -.2)
        if shaker:
            for k in range(8): place(buf, shake(.6 + .4 * (k % 2 == 0)), tb + (k * .5 + (sw * .5 if k % 2 else 0)) * BEAT, vel, .3)
        if wb:
            for off in (1, 3): place(buf, wood(.8), tb + off * BEAT, vel, .2)
SCALE = [60, 62, 64, 67, 69, 72, 74, 76]                         # C D E G A C D E
def mel(buf, tb, idxs, vel=1.0, oct=0):                          # idxs: (beat offset, scale index, length in beats)
    for off, i, ln in idxs: note(buf, kal, tb + off * BEAT, SCALE[i] + oct, ln * BEAT * 1.2, .8 * vel, .15)

# A · the hook and the hall (0 - 10 s): kalimba and a bass note per bar, shaker from bar 3
comp(mus, 0.0, 10.0, ['C', 'Am', 'F', 'G'], shaker=False, ukes_on=False, vel=.8)
mel(mus, bar_t(1), [(0, 2, 1), (1, 3, 1), (2, 4, 1.5), (3.5, 3, .5)], .8); mel(mus, bar_t(2), [(0, 4, 1), (1, 3, 1), (2, 2, 1), (3, 1, 1)], .7); mel(mus, bar_t(3), [(0.0, 3, 1.5), (2, 2, .5), (2.5, 1, .5), (3, 0, 1)], .7)
for b in range(2, 4):
    for k in range(8): place(mus, shake(.5), bar_t(b) + k * .5 * BEAT, 1.0, .3)
# B · the close-up and the tug (10 - 22.5 s): wood ticks join, the pulse tightens while she pulls
comp(mus, 10.0, 17.5, ['C', 'Am', 'F', 'G'], wb=True, vel=.85)
mel(mus, 10.0, [(0, 2, 1), (1, 4, 1), (2, 3, 1), (3, 2, 1)], .6); mel(mus, 12.5, [(0, 4, 1), (1, 3, .5), (1.5, 2, .5), (2, 3, 2)], .6)
t = 17.5
for k in range(int((22.0 - 17.5) / (BEAT / 2))):                    # tug: a tight ostinato on A and E, squeezing
    tt0 = t + k * BEAT / 2; note(mus, bassn, tt0, 45 if k % 4 < 2 else 52, BEAT * .4, .5 + .3 * (k / 16));
    if k % 2 == 1: place(mus, wood(.7), tt0, 1.0, -.2)
for k, (m, off) in enumerate([(69, 0), (66, .55), (63, 1.1), (57, 1.8)]):   # "...fine": a sad slide down on a muted tone
    place(mus, lp(glide(mt(m), mt(m - 2), .5) * env_exp(.5, .25), 900) * .5, 20.6 + off, 1.0, 0)
# C · the walk (22.5 - 30.6 s): a dragging minor stroll, pizzicato on the off-beat
comp(mus, 22.5, 30.625, ['Am', 'F', 'Am', 'Em'], shaker=False, wb=True, vel=.75, sw=.18)
for b, idxs in enumerate([[(1, 4, 1), (2.5, 3, .5), (3, 2, 1)], [(0, 3, 1), (1.5, 2, 1), (3, 1, 1)], [(1, 4, 1), (2, 5, 1), (3.5, 4, .5)], [(0, 3, 1.5), (2, 2, 1), (3, 1, 1)]]): mel(mus, 22.5 + b * BAR, idxs, .55, -12)
# D · the rise to the whip (30.6 - 33.1 s): a drone and an accelerating tick
place(mus, padn(45, 3.0, .6), 30.4, 1.0, 0)
tt0 = 30.625
for k in range(40):
    u = k / 40; at = tt0 + (2.5 * u ** 1.5)
    if at < 33.1: place(mus, wood(.5 + .5 * u), at, 1.0, 0)
# E · the whip (33.125 - 36.25 s): 16th arpeggios down the stairs, then the stop takes everything
asc = [60, 64, 67, 72, 76, 72, 67, 64]; sx = BEAT / 4
for k in range(int(3.125 / sx)):
    at = 33.125 + k * sx; m = asc[k % 8] + (12 if (k // 8) % 2 else 0) - (12 if k > 14 else 0)
    note(mus, kal, at, m, sx * 2.2, .7, rng.uniform(-.3, .3))
    if k % 4 == 0: place(mus, kick(.9), at, 1.0, 0)
    if k % 4 == 2: place(mus, snare(.7), at, 1.0, 0)
    note(mus, bassn, at, 36 + 12 + (0 if (k // 4) % 2 else 5), sx * 1.4, .6)
# silence #1: 36.25 - 41.9 s, nothing but rain, drips and the splash tail (the score is cut dead at the stop)
mask = np.ones(N); i0 = int(36.25 * SR); mask[i0:] = 0; i1 = int(41.9 * SR); mask[i1:] = 1; mus_cut = mus.copy()
# F · the sun (41.9 s) and the opening (42.5 - 46.4 s): warm pad, then the full loop in C major
place(mus, padn(60, 2.4, .5), 41.9, 1.0, 0); place(mus, padn(67, 2.4, .4), 41.9, 1.0, 0)
comp(mus, 42.5, 46.9, ['C', 'F', 'G', 'C'], wb=True, vel=1.0, sw=0.0)
mel(mus, 42.5, [(0, 4, 1), (1, 5, 1), (2, 6, 1.5), (3.5, 5, .5)], 1.0, 0); mel(mus, 45.0, [(0, 5, 1), (1, 6, 1), (2, 7, 1.5), (3.5, 6, .5)], 1.0, 0)
# silence #2: 46.9 - 47.6 s, everything out; "I SAID NO." (the umbrella's bwip at 47.6) is the first sound back
mus_after = np.zeros((N, 2))
comp(mus_after, 47.9, 52.9, ['C', 'F', 'G', 'C'], shaker=False, ukes_on=False, vel=.55)
for off in range(8): place(mus_after, wood(.7), 47.9 + off * BEAT * 2 + BEAT, 1.0, -.2)
mel(mus_after, 50.4, [(0, 2, 1), (1, 3, 1), (2, 4, 1), (3, 3, 1)], .55, 0)
# G · the cliffhanger (53 - 55 s): a suspended chord that doesn't resolve, a low pulse
for m in (45, 52, 59, 66): place(mus_after, padn(m, 3.4, .45), 53.0, 1.0, 0)
for k in range(5): place(mus_after, kick(.8), 53.3 + k * BEAT, 1.0, 0)
# H · the end bar (57.5 s): the loop comes back bright; a held C at the end
comp(mus_after, 57.5, 62.5, ['C', 'F', 'G', 'C'], wb=True, vel=.9)
mel(mus_after, 57.5, [(0, 4, 1), (1, 5, 1), (2, 6, 1), (3, 5, 1)], .8); mel(mus_after, 60.0, [(0, 7, 1), (1, 6, 1), (2, 5, 1), (3, 4, 2)], .8)
place(mus_after, padn(60, 2.5, .6), 60.0, 1.0, 0); place(mus_after, padn(64, 2.5, .5), 60.0, 1.0, 0)
mus = mus * np.where(tm < 36.25, 1, 0)[:, None] + mus * np.where((tm >= 41.9) & (tm < 46.9), 1, 0)[:, None] + mus_after
mus *= np.clip((DUR - tm) / 1.5, 0, 1)[:, None]                  # tail out
# a little room: short exponential IR on the score, shorter on the fx
def verb(x, d, mix, tau):
    n = int(d * SR); ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR / tau)[:, None]; ir = hp(ir[:, 0], 200)[:, None] * np.ones((1, 2)) * .5 + ir * .0
    ir[:, 1] = hp(rng.standard_normal(n) * np.exp(-np.arange(n) / SR / tau), 200) * .5
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1) * .06; return x + wet * mix
mus = verb(mus, 1.0, 1.0, .25); fx = verb(fx, .6, .7, .15)
# silence #2: the whole mix goes out for the beat before the umbrella speaks (fade 0.15 s down, 0.03 s back up)
gate = np.ones(N); a0, a1 = 46.95, 47.58
gate -= np.clip((tm - a0) / .15, 0, 1) * np.clip((a1 + .03 - tm) / .03, 0, 1) * .97
gate = np.clip(gate, 0, 1)
mus *= gate[:, None]; fx *= gate[:, None]

# ------------------------------------------------------------------ master
MG, BG = .3, 1.8
def rms(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
# duck the bed and score under big foley (splash, the whip)
duck = np.ones(N)
for e in EV:
    if e['type'] in ('splash', 'impact', 'fwoomp', 'thump'): i = int(e['t'] * SR); duck[i:i + int(.5 * SR)] *= .55
duck = np.convolve(duck, np.ones(2400) / 2400, mode='same'); out = fx + (mus * MG + bed * BG) * duck[:, None]
for c in range(2):
    y = sfx.compress(out[:, c], .35, 3.0, .004, .12); y = .35 * np.tanh(y / .35); out[:, c] = sfx.limit(y, .5, .005)
out = np.clip(out, -1, 1)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
print('mix.wav', DUR, 's | rms dB: fx %.1f music %.1f bed %.1f mix %.1f peak %.2f' % (rms(fx), rms(mus * MG), rms(bed), rms(out), np.abs(out).max()))
for a in range(0, int(DUR), 5):
    s = slice(a * SR, min(N, (a + 5) * SR)); print('%3d-%3d fx %6.1f music %6.1f bed %6.1f mix %6.1f' % (a, a + 5, rms(fx[s]), rms(mus[s] * MG), rms(bed[s] * BG), rms(out[s])))
