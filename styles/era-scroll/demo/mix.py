"""Sound for "The Birth of a Phone" (Era Scroll Walk demo): narration from voices/, one original tune re-orchestrated for every era
(frame drum + bone flute, lyre, plucked zither, organ + harpsichord, telegraph clicks, celesta, electric piano, chip lead, soft pad + kalimba),
era ambiences that cross-fade before the torn edge arrives (J-cut), foley on every event in events.json, and two real silences.
Everything is synthesised with numpy/scipy: no samples, no recordings (the voice is edge-tts, see CREDITS).
usage: .venv/bin/python styles/era-scroll/demo/mix.py   (after core/render/events.mjs and the voices)"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp, t_, env_exp, noise, norm
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
LINES = {l['id']: l for l in json.load(open(os.path.join(HERE, 'lines.json')))}
N = int(DUR * SR); rng = np.random.default_rng(5)
BPM = 72; BEAT = 60 / BPM; BAR = 4 * BEAT; EIGHTH = BEAT / 2
fx = np.zeros((N, 2)); mus = np.zeros((N, 2)); bed = np.zeros((N, 2)); vo = np.zeros(N)
tm = np.arange(N) / SR
mt = lambda m: 440 * 2 ** ((m - 69) / 12)
def evs(kind): return [e for e in EV if e['type'] == kind]
def place(buf, x, at, gain=1.0, pan=0.0): sfx.add(buf, np.asarray(x, dtype=np.float64), at, gain, pan)
def fade(x, a=.003, r=.01):
    x = x.copy(); na = min(len(x), int(a * SR)); nr = min(len(x), int(r * SR)); x[:na] *= np.linspace(0, 1, na); x[len(x) - nr:] *= np.linspace(1, 0, nr); return x
def glide(f0, f1, d, curve=1.0):
    tt = t_(d); f = f0 + (f1 - f0) * (tt / d) ** curve; return np.sin(2 * np.pi * np.cumsum(f) / SR)
def sm(x, a, b): return np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
# era boundaries, read back from the events the page exported
TEARS = sorted(e['t'] for e in evs('tear'))           # edge meets the walker for eras 1..8 (0-based), at t - 0 (FRONT already taken off)
CK = [-1e9] + [t + .15 for t in TEARS]                # era k starts at CK[k]
CK.append(1e9)
STOP = evs('stop')[0]['t']; TS = STOP + .9
DING = [e['t'] for e in evs('ding')]; TH = min(DING)
LIFT = evs('phonelift')[0]['t']; TILES = [e['t'] for e in evs('tile')]; END = evs('end')[0]['t']
VOICES = {e['id']: e['t'] for e in evs('voice')}

# ------------------------------------------------------------------ instruments (mono, return arrays)
def pluck(f, d=.9, bright=.5, tau=.35):
    tt = t_(d); x = np.zeros(len(tt))
    for k in range(1, 9): x += np.sin(2 * np.pi * f * k * tt) * (bright ** (k - 1)) / k * np.exp(-tt / (tau / (1 + .4 * (k - 1))))
    return fade(x * np.minimum(1, tt / .002), 0, .02)
def bellt(f, d=1.6, tau=.5):
    tt = t_(d); x = np.zeros(len(tt))
    for r, a, k in [(1, 1, 1), (2.76, .5, .5), (5.4, .25, .25), (8.93, .12, .12)]: x += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / (tau * k + .02))
    return fade(x, .001, .05)
def flute(f, d=1.2, v=1.0):
    tt = t_(d); vib = 1 + .006 * np.sin(2 * np.pi * 5.2 * tt) * np.minimum(1, tt / .4); ph = np.cumsum(f * vib) / SR * 2 * np.pi
    x = np.sin(ph) + .25 * np.sin(2 * ph) + .06 * np.sin(3 * ph); br = bp(noise(d), f * .9, f * 3.5, 2) * .5
    e = np.minimum(1, tt / .12) * np.minimum(1, (d - tt) / .25) * (1 + .1 * np.sin(2 * np.pi * 3.1 * tt)); return (x * .7 + br) * e * v
def frame_drum(v=1.0, f=95):
    d = .5; x = glide(f * 1.5, f * .8, d, .25) * env_exp(d, .11) + bp(noise(d), 150, 900, 2) * env_exp(d, .05) * .5 + hp(noise(d), 3000) * env_exp(d, .01) * .2; return fade(norm(x)) * v
def hat(v=1.0, o=0): d = .18 if o else .05; return fade(hp(noise(d), 7000) * env_exp(d, .07 if o else .015)) * v * .5
def kick(v=1.0): d = .3; return fade(glide(140, 48, d, .3) * env_exp(d, .09) + hp(noise(d), 2500) * env_exp(d, .004) * .3) * v
def snare(v=1.0): d = .24; return fade(bp(noise(d), 1200, 7000) * env_exp(d, .06) + glide(220, 160, d) * env_exp(d, .05) * .5) * v * .8
def organ(f, d=2.0, v=1.0):
    tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * r * tt + .5 * i) for i, (r, a) in enumerate([(1, 1), (2, .6), (3, .35), (4, .25), (6, .12), (.5, .5)])) * np.minimum(1, tt / .06) * np.minimum(1, (d - tt) / .15)
    return norm(x) * v * .45
def epiano(f, d=1.0, v=1.0):
    tt = t_(d); idx = 2.2 * np.exp(-tt / .25); x = np.sin(2 * np.pi * f * tt + idx * np.sin(2 * np.pi * f * tt)) * np.exp(-tt / .6) + .3 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt / .05); return fade(x * np.minimum(1, tt / .004), 0, .03) * v * .6
def bass_saw(f, d=.5, v=1.0, cut=500):
    tt = t_(d); x = 2 * ((f * tt) % 1) - 1; x = lp(x, cut, 2) * np.exp(-tt / .35) + np.sin(2 * np.pi * f * tt) * .5 * np.exp(-tt / .4); return fade(x, .004, .03) * v
def chipsq(f, d=.25, v=1.0, duty=.25):
    tt = t_(d); x = np.where(((f * tt) % 1) < duty, 1., -1.) * np.minimum(1, (d - tt) / .02) * (1 - .3 * tt / d); return x * v * .35
def chiptri(f, d=.25, v=1.0):
    tt = t_(d); x = 2 * np.abs(2 * ((f * tt) % 1) - 1) - 1; return x * np.minimum(1, (d - tt) / .02) * v * .5
def padn(f, d=4.0, v=1.0):
    tt = t_(d); x = sum(np.sin(2 * np.pi * f * (1 + dt) * tt) + .5 * np.sin(2 * np.pi * f * 2 * (1 + dt) * tt) for dt in (-.004, 0, .004)); return lp(x, 1800, 2) * np.minimum(1, tt / 1.0) * np.minimum(1, (d - tt) / 1.5) * v * .3
def kalimba(f, d=.9, v=1.0):
    tt = t_(d); x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .35) + .3 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / .04); return fade(x, .001, .03) * v * .8
def woodblock(v=1.0): d = .1; return fade(glide(900, 700, d) * env_exp(d, .018) + bp(noise(d), 800, 2400) * env_exp(d, .01) * .4) * v
def gong(f=130, d=3.0, v=1.0):
    tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / (1.4 / r ** .3)) for r, a in [(1, 1), (1.47, .6), (2.09, .4), (2.8, .3), (3.6, .15)]); return fade(x * np.minimum(1, tt / .005), 0, .1) * v * .5

# ------------------------------------------------------------------ one tune, re-orchestrated per era (D minor pentatonic)
MEL = [[74, 77, 79, 81, 79, 77, 74, None], [77, 79, 81, 84, 81, 79, 77, None], [72, 74, 77, 79, 77, 74, 72, None], [69, 72, 74, 77, 74, 72, 69, None]]
ROOT = [38, 41, 36, 33]
def steps(t0, t1):
    n0 = int(np.ceil(t0 / EIGHTH - 1e-6)); n1 = int(np.floor(t1 / EIGHTH - 1e-6))
    for n in range(max(0, n0), n1 + 1): yield n * EIGHTH, (n // 8) % 4, n % 8
def mus_era(k, t0, t1, vel=1.0):
    for t, b, s in steps(t0, t1):
        m = MEL[b][s]; r = ROOT[b]; v = vel * (1 if s % 4 == 0 else .8)
        if k == 0:                                                         # frame drum, bone flute, a low drone
            if s in (0, 4): place(mus, frame_drum(.9 * v, 90), t, .8, -.2)
            if s in (2, 6) and b % 2: place(mus, frame_drum(.35, 120), t, .5, .2)
            if s == 0: place(mus, padn(mt(r), BAR, .5), t, .35, 0)
            if m and s in (0, 2, 3) and t > 3.2: place(mus, flute(mt(m - 12), EIGHTH * 2.2, .55), t, .6, .1)
        elif k == 1:                                                       # lyre
            if m: place(mus, pluck(mt(m - 12), .9, .55, .5), t, .6 * v, .15)
            if s in (0, 4): place(mus, pluck(mt(r), .9, .35, .6), t, .7, -.2); place(mus, frame_drum(.4, 110), t, .45, -.3)
            if s == 6: place(mus, woodblock(.4), t, .5, .3)
        elif k == 2:                                                       # plucked zither + woodblock + temple gong
            if m: place(mus, pluck(mt(m), 1.0, .6, .45), t, .55 * v, .2 * (1 if s % 2 else -1))
            if s in (2, 6): place(mus, woodblock(.8), t, .6, .3)
            if s == 0 and b % 2 == 0: place(mus, gong(mt(r + 12), 3.0, .6), t, .5, 0)
            if s == 0: place(mus, pluck(mt(r), 1.2, .3, .7), t, .7, -.2)
        elif k == 3:                                                       # organ chord + harpsichord
            if s == 0:
                for q in (0, 7, 12): place(mus, organ(mt(r + 12 + q), BAR * .98, .5), t, .45, 0)
            if m: place(mus, pluck(mt(m), .35, .85, .12), t, .55 * v, .25)
            if s in (0, 4): place(mus, pluck(mt(r), .6, .4, .3), t, .6, -.2)
        elif k == 4:                                                       # telegraph: staccato strings + key rhythm
            if m: place(mus, pluck(mt(m), .22, .7, .09), t, .5 * v, -.2 * (1 if s % 2 else -1))
            if s in (1, 3, 5): place(mus, woodblock(.5), t, .45, .35)
            if s in (0, 4): place(mus, pluck(mt(r), .5, .3, .2), t, .6, -.1)
        elif k == 5:                                                       # celesta + strings pad
            if m: place(mus, bellt(mt(m + 12), 1.4, .45), t, .35 * v, .25 * (1 if s % 2 else -1))
            if s == 0: place(mus, padn(mt(r + 24), BAR * 1.05, .7), t, .5, 0); place(mus, padn(mt(r + 31), BAR * 1.05, .6), t, .4, 0)
            if s in (0, 4): place(mus, pluck(mt(r), .7, .3, .35), t, .6, -.2)
        elif k == 6:                                                       # 70s: e-piano, bass groove, hat, kick, snare
            if m: place(mus, epiano(mt(m), 1.0, .8 * v), t, .5, .15)
            if s in (0, 3, 4, 7): place(mus, bass_saw(mt(r), .4, .8, 600), t, .65, -.1)
            if s in (0, 4): place(mus, kick(.9), t, .7, 0)
            if s in (2, 6): place(mus, snare(.8), t, .55, .1)
            place(mus, hat(.6, s % 4 == 3), t, .45, .3)
        elif k == 7:                                                       # chip tune
            if m: place(mus, chipsq(mt(m), EIGHTH * .9, .9 * v), t, .5, .1)
            if s in (0, 2, 4, 6): place(mus, chiptri(mt(r), EIGHTH * 1.8, .9), t, .55, -.1)
            if s % 2: place(mus, hat(.5), t, .35, .2)
            if s in (0, 4): place(mus, kick(.5), t, .45, 0)
        else:                                                              # today: pad, kalimba, soft kick
            if m: place(mus, kalimba(mt(m), .9, .9 * v), t, .5, .2 * (1 if s % 2 else -1))
            if s == 0: place(mus, padn(mt(r + 12), BAR * 1.05, .8), t, .5, 0); place(mus, padn(mt(r + 19), BAR * 1.05, .6), t, .35, 0)
            if s in (0, 4): place(mus, kick(.5), t, .35, 0); place(mus, bass_saw(mt(r), .6, .6, 400), t, .5, 0)
            if s % 2: place(mus, hat(.4), t, .25, .25)
# the opening breath is silence plus a drip; the first sound the viewer hears of the tune comes with the frame drum
for k in range(9):
    a = max(0.0, CK[k] - 1.2); b = (CK[k + 1] - 1.2) if k < 8 else TS - .6
    if k == 0: a = 2.4
    mus_era(k, a, b, 1.0)
# after the hand-over: a slow pad and kalimba under the last lines, then the grid and a long final chord
for t, b, s in steps(TH + .4, LIFT - .5):
    m = MEL[b][s]
    if s == 0: place(mus, padn(mt(ROOT[b] + 12), BAR * 1.05, .8), t, .55, 0); place(mus, padn(mt(ROOT[b] + 19), BAR * 1.05, .6), t, .35, 0)
    if m and s in (0, 2, 4): place(mus, kalimba(mt(m), 1.1, .7), t, .45, .2)
for i, t in enumerate(TILES):
    m = [74, 77, 79, 81, 84, 86, 84, 81, 86][i]; place(mus, bellt(mt(m + 12), 1.8, .5), t, .35, (i % 3 - 1) * .3)
sw = TILES[0] + 1.9
for q, m in enumerate([50, 57, 62, 65, 69, 74]): place(mus, padn(mt(m), END - sw + 2.5, .9), sw, .55, 0)
place(mus, gong(mt(38), 4.5, .8), END, .5, 0)
for q, m in enumerate([62, 69, 74, 76]): place(mus, bellt(mt(m + 12), 3.0, .8), END + .05 + q * .09, .35, (q - 1.5) * .2)
# the silences: (1) the walker stops and the world goes quiet until the tag lands; (2) the phone lifts and the room holds its breath
gate = np.ones(N)
def hole(a, b, f0=.12, f1=.05): global gate; gate = gate * (1 - np.clip((tm - a) / f0, 0, 1) * np.clip((b - tm) / f1, 0, 1))
hole(TS - .55, TH + .02); hole(LIFT - .1, LIFT + .9, .1, .1)

def drip_(v=1.0):
    d = .5; x = glide(2100, 1500, .06) * env_exp(.06, .02); y = np.zeros(int(d * SR)); y[:len(x)] = x
    for dl, g in [(.17, .35), (.33, .15)]: y[int(dl * SR):int(dl * SR) + len(x)] += x * g
    return norm(y) * v * .5
# ------------------------------------------------------------------ ambience, one bed per era, cross-faded ahead of the edge
def bed_era(k):
    d = DUR + 1; tt = t_(d); out = np.zeros(len(tt)); bo = lp(noise(d), 300, 2)
    if k == 0:
        out = lp(noise(d), 160, 2) * 1.2 + lp(noise(d), 60, 2) * 1.6 + hp(noise(d), 3000) * (rng.random(len(tt)) > .9992) * 1.5
    elif k == 1:
        wind = bp(noise(d), 200, 900, 2) * (.5 + .5 * np.sin(2 * np.pi * .13 * tt + 1)); crick = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 7 * tt) > .5) * (np.sin(2 * np.pi * .4 * tt) > -.2) * .03
        out = wind * .9 + crick
    elif k == 2:
        out = bp(noise(d), 300, 1400, 2) * (.5 + .5 * np.sin(2 * np.pi * .09 * tt)) * .5
    elif k == 3:
        out = lp(noise(d), 400, 2) * .7 + hp(noise(d), 4000) * (rng.random(len(tt)) > .9995) * 1.0
    elif k == 4:
        hum = sum(np.sin(2 * np.pi * f * tt + i) * a for i, (f, a) in enumerate([(112, .5), (224, .3), (336, .15)])) * (.8 + .2 * np.sin(2 * np.pi * .2 * tt)); out = bp(noise(d), 500, 2500, 2) * (.5 + .5 * np.sin(2 * np.pi * .17 * tt)) * .35 + hum * .1
    elif k == 5:
        out = lp(noise(d), 350, 2) * .8 + np.where((tt % BEAT) < .004, 1, 0) * .0
    elif k == 6:
        out = lp(noise(d), 600, 2) * 1.6 + bp(noise(d), 300, 1500, 2) * (.5 + .5 * np.sin(2 * np.pi * .21 * tt)) * .6
    elif k == 7:
        out = bp(noise(d), 200, 1200, 2) * (.5 + .5 * np.sin(2 * np.pi * .11 * tt)) * .6 + np.sin(2 * np.pi * 120 * tt) * .02
    else:
        out = lp(noise(d), 900, 2) * .45 + hp(noise(d), 5000) * .02
    return out[:N]
SCALE_BED = [1.5, 1.0, .9, 1.0, 1.0, 1.0, 1.0, 1.1, 1.0]
for k in range(9):
    a = CK[k]; b = CK[k + 1]
    w = sm(tm, a - 2.0, a - .4) * (1 - sm(tm, b - 2.0, b - .4)) if k else (1 - sm(tm, b - 2.0, b - .4))
    x = bed_era(k) * w * SCALE_BED[k] * .08
    bed[:, 0] += x; bed[:, 1] += np.roll(x, 311)
# era details in the beds: cave drips, torches; birds; clock tick; city horn
for t in [1.1, 3.0, 5.4, 6.9, 9.8, 12.2]: place(fx, drip_(.6), t, 1.0, rng.uniform(-.5, .5))
for t in np.arange(CK[5] + 1.0, CK[6] - 1.0, BEAT * 2):
    c = (np.sin(2 * np.pi * 1800 * t_(.03)) * env_exp(.03, .008)); place(bed, c, t, .05, .3)
for t in [CK[6] + 2.2, CK[6] + 6.0]: place(fx, glide(380, 380, .35) * np.sin(np.pi * t_(.35) / .35) ** .5 * .25 + glide(480, 480, .35) * np.sin(np.pi * t_(.35) / .35) ** .5 * .2, t, .35, -.6)

# ------------------------------------------------------------------ foley
def stepf(surf, v=1.0, side=0):
    d = .16; tt = t_(d)
    if surf == 'dirt': x = lp(noise(d), 900) * env_exp(d, .025) * 1.2 + np.sin(2 * np.pi * 95 * tt) * env_exp(d, .035) * .5
    elif surf == 'clay': x = lp(noise(d), 600) * env_exp(d, .03) + np.sin(2 * np.pi * 110 * tt) * env_exp(d, .05) * .8 + hp(noise(d), 3500) * env_exp(d, .006) * .2
    elif surf == 'wood': x = (np.sin(2 * np.pi * (180 + 20 * side) * tt) * env_exp(d, .04) + bp(noise(d), 500, 2200) * env_exp(d, .012) * .7) * 1.0
    elif surf == 'grass': x = hp(noise(d), 2500) * env_exp(d, .045) * .7 + lp(noise(d), 500) * env_exp(d, .02) * .6
    elif surf == 'stone': x = hp(noise(d), 1800) * env_exp(d, .008) * .9 + np.sin(2 * np.pi * 130 * tt) * env_exp(d, .03) * .5
    elif surf == 'snow': x = (hp(noise(d), 2000) * (rng.random(len(tt)) > .96) * 6 + hp(noise(d), 3000) * .3) * env_exp(d, .05) + lp(noise(d), 400) * env_exp(d, .03) * .5
    elif surf == 'key': x = bp(noise(d), 2000, 5000) * env_exp(d, .006) * 1.0 + np.sin(2 * np.pi * 420 * tt) * env_exp(d, .015) * .4
    else: x = lp(noise(d), 700) * env_exp(d, .02)
    return fade(norm(x)) * v * .7
def tear(v=1.0):
    d = 1.0; tt = t_(d); imp = (rng.random(len(tt)) > .985) * rng.standard_normal(len(tt)) * 2.5; x = bp(imp, 1500, 9000, 2) * np.minimum(1, tt / .08) * np.exp(-tt / .45) + hp(noise(d), 4000) * .12 * np.exp(-tt / .3)
    x += lp(noise(d), 300) * env_exp(d, .2) * .5; x += np.sin(2 * np.pi * 55 * tt) * env_exp(d, .12) * .6; return fade(norm(x), .005, .06) * v
def whoosh_(d=.4, v=1.0): tt = t_(d); return fade(bp(noise(d), 400, 4500, 2) * np.sin(np.pi * tt / d) ** 1.5) * v * .7
def thud(v=1.0, f=70): d = .4; return fade(glide(f * 1.6, f, d, .3) * env_exp(d, .1) + lp(noise(d), 300) * env_exp(d, .03) * .5) * v
def clack_(v=1.0, p=1.0): d = .1; return fade(bp(noise(d), 1500 * p, 5000 * p) * env_exp(d, .012) + np.sin(2 * np.pi * 900 * p * t_(d)) * env_exp(d, .02) * .5) * v * .8
def phone_ring(v=1.0):
    d = .55; tt = t_(d); x = (np.sin(2 * np.pi * 1180 * tt) + np.sin(2 * np.pi * 1420 * tt) + .4 * np.sin(2 * np.pi * 2460 * tt)) * (1 + .6 * np.sign(np.sin(2 * np.pi * 22 * tt))) * env_exp(d, .25); return fade(norm(x), .002, .05) * v * .6
def ding(v=1.0, f=1318): d = 1.4; tt = t_(d); return fade((np.sin(2 * np.pi * f * tt) + .4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / .1)) * np.exp(-tt / .45), .001, .05) * v * .6
def dtmf(i, d=.07):
    lo = [697, 770, 852, 941][i % 4]; hi = [1209, 1336, 1477][i % 3]; tt = t_(d); return fade((np.sin(2 * np.pi * lo * tt) + np.sin(2 * np.pi * hi * tt)) * .35, .003, .005)
def cooing(v=1.0): d = .3; return fade(glide(420, 300, d, .8) * np.sin(np.pi * t_(d) / d) ** 1.2 * .5 + lp(noise(d), 500) * .2 * np.sin(np.pi * t_(d) / d)) * v * .5
def flap(v=1.0):
    d = .5; x = np.zeros(int(d * SR))
    for k in range(7): c = hp(noise(.05), 600) * np.hanning(int(.05 * SR)); s = int(k * .06 * SR); x[s:s + len(c)] += c
    return x * v * .5
def gasp(v=1.0): d = .35; tt = t_(d); return fade(bp(noise(d), 800, 3500, 2) * np.sin(np.pi * tt / d) ** 1.3) * v * .6
def morse(dash, v=1.0): d = .16 if dash else .07; tt = t_(d); return fade((np.sin(2 * np.pi * 620 * tt) * .6 + bp(noise(d), 1500, 4000) * .4 * env_exp(d, .01)), .002, .01) * v * .9
def key_click(v=1.0): d = .06; return fade(bp(noise(d), 1200, 5000) * env_exp(d, .007) + np.sin(2 * np.pi * 300 * t_(d)) * env_exp(d, .01) * .6) * v
def zip_(v=1.0, dash=0): d = .5 if dash else .28; return fade(glide(500, 3200, d, .6) * np.exp(-t_(d) / d * 2.5) * .7 + hp(noise(d), 4000) * env_exp(d, .1) * .25) * v
def chip_(n, v=1.0): d = .05; return chipsq(mt(81 + [0, 4, 7, 12][n % 4]), d, v, .5) * 1.4
def pop_(v=1.0, f=1000): d = .12; return fade(glide(f, f * 1.8, d, .5) * env_exp(d, .04)) * v * .8
def swish(v=1.0): d = .6; tt = t_(d); return fade(hp(noise(d), 2500) * np.sin(np.pi * tt / d) ** 2) * v * .4
for e in EV:
    t, ty, v = e['t'], e['type'], e.get('v', 1.0); pan = 0
    if ty == 'step': place(fx, stepf(e.get('surf', 'dirt'), v, e.get('side', 0)), t, .85, -.1 if e.get('side', 0) else .1)
    elif ty == 'tear': place(fx, tear(1.0), t - .25, .9, 0); place(fx, thud(.6, 60), t - .02, .6, 0)
    elif ty == 'plate': place(fx, key_click(.6), t, .5, .6); place(fx, bellt(mt(96), .5, .1), t + .05, .1, .6)
    elif ty == 'stop': place(fx, thud(.35, 90), t, .5, 0)
    elif ty == 'handpress': place(fx, thud(.7, 100), t, .7, .1); place(fx, hp(noise(.2), 800) * env_exp(.2, .06) * .3, t, .4, .1)
    elif ty == 'dustpuff': place(fx, whoosh_(.35, .7), t, .5, .15); place(fx, bp(noise(.5), 1500, 6000) * env_exp(.5, .12) * .3, t, .4, .1)
    elif ty == 'gasp': place(fx, gasp(.8), t, .55, -.2)
    elif ty == 'hoof': place(fx, woodblock(.6), t, .6, .3);
    elif ty == 'pickup': place(fx, clack_(.8, .6), t, .6, 0); place(fx, whoosh_(.2, .5), t - .1, .3, 0)
    elif ty == 'stamp': place(fx, clack_(.6, .8), t, .5, rng.uniform(-.3, .3))
    elif ty == 'jar': place(fx, bellt(mt(55), .8, .12), t, .3, .3); place(fx, clack_(.5, .5), t, .4, .3)
    elif ty == 'seal': place(fx, thud(.9, 110), t, .9, 0); place(fx, clack_(.6, .7), t, .5, 0)
    elif ty == 'paper': place(fx, swish(.8), t, .5, rng.uniform(-.4, .4)); place(fx, hp(noise(.2), 3000) * env_exp(.2, .05) * .25, t, .4, 0)
    elif ty == 'clack': place(fx, clack_(.9, 1.0), t, .75, rng.uniform(-.3, .3))
    elif ty == 'screw': d = .9; place(fx, bp(noise(d), 300, 1200, 2) * (1 + .4 * np.sin(2 * np.pi * 9 * t_(d))) * np.sin(np.pi * t_(d) / d) * .5, t, .7, 0)
    elif ty == 'thump': place(fx, thud(1.0, 55), t, 1.0, 0)
    elif ty == 'sheet': place(fx, swish(1.0), t, .6, 0)
    elif ty == 'key': place(fx, key_click(1.0), t, .9, -.2); place(fx, morse(e.get('dash', 0), .5), t, .35, -.2)
    elif ty == 'pulse': place(fx, zip_(.8, e.get('dash', 0)), t, .45, .2)
    elif ty == 'wingflap': place(fx, flap(.9), t, .6, .4)
    elif ty == 'ring': place(fx, phone_ring(1.0), t, .7, rng.uniform(-.2, .2))
    elif ty == 'lift': place(fx, clack_(.8, .5), t, .7, 0); place(fx, bellt(mt(84), .6, .08), t, .15, 0)
    elif ty == 'voice-wave': place(fx, swish(1.0), t, .55, 0); place(fx, glide(300, 900, .6, .5) * np.sin(np.pi * t_(.6) / .6) * .25, t, .4, .2)
    elif ty == 'tip': place(fx, swish(.6), t, .3, 0)
    elif ty == 'brickpull': place(fx, whoosh_(.25, .7), t, .5, 0); place(fx, clack_(.6, .4), t + .18, .5, 0)
    elif ty == 'antenna': d = .35; place(fx, glide(900, 2600, d, 1.0) * env_exp(d, .3) * .4 + bp(noise(d), 2000, 6000) * .1, t, .5, 0)
    elif ty == 'dial':
        for i in range(7): place(fx, dtmf(i), t + i * .09, .45, 0)
    elif ty == 'ringback': place(fx, (np.sin(2 * np.pi * 440 * t_(.9)) + np.sin(2 * np.pi * 480 * t_(.9))) * .2 * np.minimum(1, t_(.9) / .02) * np.minimum(1, (0.9 - t_(.9)) / .05), t, .5, 0)
    elif ty == 'bell': place(fx, bellt(mt(79), 1.0, .2), t, .25, -.3)
    elif ty == 'pigeon': place(fx, cooing(1.0), t - .2, .4, -.2); place(fx, flap(1.0), t, .8, .3)
    elif ty == 'chip': place(fx, chip_(e.get('n', 0), .9), t, .45, .1)
    elif ty == 'send':
        for i, m in enumerate([76, 81, 84, 88, 93]): place(fx, chipsq(mt(m), .07, .9, .5), t + i * .07, .5, 0)
    elif ty == 'tower': place(fx, pop_(.7, 600), t, .35, .2); place(fx, pop_(.7, 800), t + .2, .3, .2)
    elif ty == 'recv':
        for i, m in enumerate([88, 93, 100]): place(fx, chipsq(mt(m), .09, .9, .5), t + i * .09, .5, 0)
    elif ty == 'nod': place(fx, pop_(.8, 400), t, .4, .2)
    elif ty == 'unhook': place(fx, clack_(.6, .5), t, .4, 0)
    elif ty == 'ding': place(fx, ding(1.0, 1318 if not e.get('hi') else 1760), t, .8 if not e.get('hi') else .5, 0)
    elif ty == 'bubble': place(fx, pop_(1.0, 800), t, .6, 0); place(fx, whoosh_(.25, .6), t - .1, .3, 0)
    elif ty == 'phonelift': place(fx, whoosh_(1.2, 1.0), t, .8, 0); place(fx, glide(200, 900, 1.2, 1.5) * np.sin(np.pi * t_(1.2) / 1.2) * .3, t, .5, 0)
    elif ty == 'tile': place(fx, pop_(.9, 700 + 70 * len([x for x in TILES if x < t])), t, .5, ((len([x for x in TILES if x < t])) % 3 - 1) * .3)
    elif ty == 'sweep': place(fx, swish(1.0), t, .5, 0)
    elif ty == 'end': pass

# ------------------------------------------------------------------ voice: compressed, then the score ducks under it
for l in LINES:
    t0 = VOICES[l]; w, sr = sf.read(os.path.join(HERE, 'voices', l + '.wav'))
    if w.ndim > 1: w = w.mean(1)
    if sr != SR: w = soxr.resample(w, sr, SR)
    s = int(round(t0 * SR)); e = min(N, s + len(w)); vo[s:e] += w[:e - s]
vo = sfx.compress(vo, .22, 3.0, .004, .1); vo = vo / max(np.abs(vo).max(), 1e-6) * .9
env = np.abs(vo); env = np.convolve(env, np.ones(int(.12 * SR)) / int(.12 * SR), mode='same'); duck = 1 - .78 * np.clip(env / .06, 0, 1)
duck = np.convolve(duck, np.ones(int(.1 * SR)) / int(.1 * SR), mode='same')

def verb(x, d, mix, tau, hpf=200):
    n = int(d * SR); ir = np.stack([hp(rng.standard_normal(n), hpf) * np.exp(-np.arange(n) / SR / tau) for _ in range(2)], 1) * .5
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1) * .05; return x + wet * mix
mus = verb(mus, 1.4, 1.0, .35); fx = verb(fx, .5, .5, .12)
mus *= gate[:, None] * duck[:, None]; bed_g = np.clip(gate + .45, 0, 1)
mus *= np.clip((DUR - tm) / 1.2, 0, 1)[:, None]
MG, BG, VG = .14, 2.6, 1.0
out = fx * .5 + mus * MG + bed * BG * bed_g[:, None] * duck[:, None]
out[:, 0] += vo * VG; out[:, 1] += vo * VG
for c in range(2):
    y = sfx.compress(out[:, c], .4, 3.0, .004, .1); y = .4 * np.tanh(y / .4); out[:, c] = sfx.limit(y, .28, .005)
out = np.clip(out, -1, 1); sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
def rms(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav', round(DUR, 2), 's | rms dB: voice %.1f fx %.1f music %.1f bed %.1f mix %.1f peak %.2f' % (rms(vo), rms(fx), rms(mus * MG), rms(bed), rms(out), np.abs(out).max()))
for a in range(0, int(DUR), 10):
    s = slice(a * SR, min(N, (a + 10) * SR)); print('%3d-%3d voice %6.1f fx %6.1f music %6.1f mix %6.1f' % (a, a + 10, rms(vo[s]), rms(fx[s]), rms(mus[s] * MG), rms(out[s])))

# ------------------------------------------------------------------ subtitles (.srt) from the same timeline
def ts(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return ('%02d:%02d:%06.3f' % (h, m, s)).replace('.', ',')
rows = []
order = sorted(LINES, key=lambda i: VOICES[i])
for i, l in enumerate(order):
    t0 = VOICES[l]; t1 = t0 + sf.info(os.path.join(HERE, 'voices', l + '.wav')).duration + .45
    rows.append('%d\n%s --> %s\n%s\n' % (i + 1, ts(t0), ts(t1), LINES[l]['text']))
open(os.path.join(HERE, '..', 'era-scroll.srt'), 'w', encoding='utf-8').write('\n'.join(rows))
