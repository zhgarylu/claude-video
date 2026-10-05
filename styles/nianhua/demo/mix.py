"""mix.py: score, foley, ambience and voice for "Five Blocks to a Door", all synthesised (numpy/scipy), nothing sampled.
Reads events.json (sound events from the page) and caps.json (voice starts, beat grid). Writes out/mix.wav,
out/cues.json (every music onset, for cuecheck) and ../nianhua.srt.
The score is in G pentatonic (G A B D E) at 96 BPM; beat n is G0 + n * BEAT, so every struck action of the picture
is a grid point (cuecheck.py prints the error of each)."""
import json, os, sys, subprocess
import numpy as np, soundfile as sf, soxr
from scipy.signal import lfilter
from scipy.ndimage import uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
import sfx
from sfx import SR, noise, bp, hp, lp, env_exp, t_, norm, add

ev = sorted(json.load(open(os.path.join(HERE, 'events.json')))['ev'], key=lambda e: (e['t'], e['type']))
caps = json.load(open(os.path.join(HERE, 'caps.json')))
DUR, BEAT, G0 = caps['dur'], caps['beat'], caps['g0']
SEC = caps['sec']
N = int((DUR + .8) * SR)
buf = {k: np.zeros((N, 2)) for k in ('music', 'foley', 'room', 'voice')}
onsets = []
rng = np.random.default_rng(23)

# the voice lengths in timeline.js must still match the files
vd = json.load(open(os.path.join(HERE, 'out/voice/dur.json')))
for k, v in caps['vo'].items():
    assert abs(v['dur'] - vd[k]) < .01, f'voice {k}: timeline says {v["dur"]}, file is {vd[k]}'

mid = lambda m: 440 * 2 ** ((m - 69) / 12)
B = lambda n: G0 + n * BEAT          # beat n on the grid (n may be negative)
G2, D3, G3, A3, B3, D4, E4, G4, A4, B4, D5, E5, G5 = 43, 50, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76, 79

# ------------------------------------------------------------------ instruments
def pluck(m, vel=1.0, d=2.4, decay=.9972, bright=1.0):
    """plucked zither string: Karplus-Strong with a little wooden body"""
    f = mid(m); n = max(8, int(round(SR / f)))
    ex = lp(noise(n / SR + .0005), (1800 + 4200 * vel) * bright)[:n]; ex = ex / (np.abs(ex).max() + 1e-9)
    a = np.zeros(n + 2); a[0] = 1; a[n] = -.5 * decay; a[n + 1] = -.5 * decay
    sig = np.zeros(int(d * SR)); sig[:n] = ex
    y = lfilter([1.0], a, sig)
    y = y + .25 * bp(y, 180, 420)
    att = np.ones_like(y); att[:int(.002 * SR)] = np.linspace(0, 1, int(.002 * SR))
    return y * att * vel * .75

def muyu(v=1.0):
    d = .14; tt = t_(d); f = 520 - 90 * np.minimum(1, tt / .03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .035) + .5 * np.sin(2 * np.pi * 1180 * tt) * np.exp(-tt / .012)
    x[:int(.003 * SR)] += hp(noise(.003), 2500) * .5
    return norm(x) * v * .55

def clapper(v=1.0):
    d = .09; x = np.zeros(int(d * SR))
    for k, s in enumerate((0, .016)):
        i = int(s * SR); c = bp(noise(.03), 1500, 5200) * np.exp(-t_(.03) / .004) * (1 - .35 * k) + np.sin(2 * np.pi * 1150 * t_(.03)) * np.exp(-t_(.03) / .008) * .6
        x[i:i + len(c)] += c[:len(x) - i]
    return norm(x) * v * .6

def tanggu(v=1.0, big=False):
    d = .8 if big else .5; tt = t_(d); f = (48 if big else 62) + 90 * np.exp(-tt / .035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / (.32 if big else .2))
    skin = lp(noise(d), 1100) * np.exp(-tt / .03) * .6 + hp(noise(d), 2500) * np.exp(-tt / .006) * .35
    return norm(body + skin) * v * .9

def gong(f0, d=3.0, v=1.0, glide=0.0):
    tt = t_(d); parts = [(1, 1, 1.0), (1.47, .6, .8), (2.01, .55, .7), (2.76, .35, .5), (3.12, .3, .45), (4.2, .2, .3), (5.4, .12, .2)]
    x = np.zeros_like(tt)
    for r, a, tau in parts:
        fr = f0 * r * (1 + glide * np.exp(-tt / .1))
        x += a * np.sin(2 * np.pi * np.cumsum(fr) / SR + rng.random() * 6) * np.exp(-tt / (d * tau * .38)) * (1 + .12 * np.sin(2 * np.pi * (2 + r) * tt))
    x[:int(.012 * SR)] += lp(noise(.012), 5000) * .4
    return norm(x) * v * .8

def dizi(m, d, v=1.0):
    """bamboo flute: sine with a little second harmonic, breath noise and a late vibrato"""
    f = mid(m); tt = t_(d + .25)
    vib = 1 + .008 * np.sin(2 * np.pi * 5.2 * tt) * np.clip((tt - .25) / .4, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.sin(ph) + .28 * np.sin(2 * ph) + .08 * np.sin(3 * ph)
    breath = bp(noise(d + .25), 2800, 6000) * .06 + bp(noise(d + .25), f * .8, f * 1.3) * .05
    env = np.minimum(1, tt / .07) * np.where(tt < d, 1, np.exp(-(tt - d) / .09))
    return (x + breath) * env * v * .5

def drone(m, d, v=1.0):
    tt = t_(d); f = mid(m); saw = 2 * ((tt * f) % 1) - 1; x = lp(saw, 420) * .5 + np.sin(2 * np.pi * f * tt) * .6 + .2 * np.sin(2 * np.pi * f * 2 * tt)
    x *= 1 + .05 * np.sin(2 * np.pi * .37 * tt)
    env = np.minimum(1, tt / min(2.0, d * .4)) * np.minimum(1, (d - tt) / min(2.0, d * .4))
    return x * env * v * .6

def note(inst, t, m=None, vel=1.0, pan=0.0, tag='', **kw):
    x = {'pluck': lambda: pluck(m, vel, **kw), 'muyu': lambda: muyu(vel), 'clap': lambda: clapper(vel), 'drum': lambda: tanggu(vel, kw.get('big', False)),
         'gong': lambda: gong(kw['f0'], kw.get('d', 3.0), vel, kw.get('glide', 0)), 'dizi': lambda: dizi(m, kw['d'], vel), 'drone': lambda: drone(m, kw['d'], vel)}[inst]()
    add(buf['music'], x, t, 1.0, pan); onsets.append({'t': round(t, 4), 'inst': inst, 'midi': m, 'vel': round(vel, 2), 'tag': tag})

# ------------------------------------------------------------------ foley
def block_drop(v=1.0):
    d = .45; tt = t_(d); f = 70 + 60 * np.exp(-tt / .03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .12) + lp(noise(d), 380) * np.exp(-tt / .05) * .9
    wood = np.sin(2 * np.pi * 310 * tt) * np.exp(-tt / .035) * .5 + np.sin(2 * np.pi * 520 * tt) * np.exp(-tt / .02) * .3
    ck = hp(noise(d), 2200) * np.exp(-tt / .004) * .5
    return norm(body + wood + ck) * v

def block_set(v=1.0):
    d = .25; tt = t_(d)
    x = np.sin(2 * np.pi * (170 - 50 * np.minimum(1, tt / .04)) * tt) * np.exp(-tt / .05) + bp(noise(d), 500, 1800) * np.exp(-tt / .02) * .7 + hp(noise(d), 3000) * np.exp(-tt / .003) * .3
    return norm(x) * v * .8

def paper_land(v=1.0):
    d = .3; tt = t_(d)
    x = lp(noise(d), 650) * np.exp(-tt / .05) + bp(noise(d), 1500, 5500) * np.exp(-tt / .09) * .5 + np.sin(2 * np.pi * 110 * tt) * np.exp(-tt / .04) * .5
    return norm(x) * v * .75

def slap(v=1.0):
    d = .22; tt = t_(d)
    x = lp(noise(d), 3500) * np.exp(-tt / .012) + np.sin(2 * np.pi * 150 * tt) * np.exp(-tt / .04) * .7 + hp(noise(d), 4000) * np.exp(-tt / .004) * .4
    return norm(x) * v * .85

def press_end(v=1.0):
    d = .22; tt = t_(d)
    x = np.sin(2 * np.pi * 130 * tt) * np.exp(-tt / .03) + hp(noise(d), 3000) * np.exp(-tt / .003) * .6
    for s in (.018, .05):                        # the block settling: two tiny ticks
        i = int(s * SR); c = bp(noise(.01), 2000, 5000) * np.exp(-t_(.01) / .0025) * .35; x[i:i + len(c)] += c
    return norm(x) * v * .7

def brayer(dur, v=1.0):
    d = dur + .1; tt = t_(d); wob = .6 + .4 * np.sin(2 * np.pi * 9 * tt + 1.0) * np.sin(2 * np.pi * 2.3 * tt)
    x = bp(noise(d), 260, 2400) * wob + lp(noise(d), 160) * .8
    sq = lp(noise(d), 40) ** 2; x += hp(bp(noise(d), 800, 3500), 600) * np.clip(sq * 8, 0, 1) * .6
    env = np.minimum(1, tt / .08) * np.minimum(1, (d - tt) / .12)
    return norm(x) * env * v * .6

def baren(dur, v=1.0):
    d = dur + .1; tt = t_(d); rate = 5.8; ph = (tt * rate) % 1
    stroke = np.sin(np.pi * ph) ** 1.3
    x = bp(noise(d), 1500, 5200) * (.25 + stroke) + lp(noise(d), 300) * stroke * .7 + hp(noise(d), 6000) * stroke * .15
    env = np.minimum(1, tt / .1) * np.minimum(1, (d - tt) / .12)
    return norm(x) * env * v * .55

def peel(dur, v=1.0):
    d = dur + .1; tt = t_(d); dens = 40 + 400 * (tt / d) ** 1.5
    imp = (rng.random(len(tt)) < dens / SR).astype(float) * rng.random(len(tt))
    x = hp(imp, 1800) * 3 + hp(noise(d), 2500) * .12 * (tt / d)
    env = np.minimum(1, tt / .05) * np.minimum(1, (d - tt) / .08)
    return norm(lp(x, 9000)) * env * v * .6

def wipe(dur, v=1.0):
    d = dur + .1; tt = t_(d); e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.6
    x = bp(noise(d), 500, 3200) * e + lp(noise(d), 200) * e * .7 + hp(noise(d), 4000) * e * .15
    return norm(x) * v * .6

def paste(dur, v=1.0):
    d = dur + .1; tt = t_(d); lump = np.clip(lp(noise(d), 18) * 40, 0, 1)
    x = bp(noise(d), 350, 2600) * (.3 + lump) + hp(bp(noise(d), 1200, 4000), 900) * lump * .5
    sq = (rng.random(len(tt)) < 30 / SR).astype(float); x += bp(sq * 6, 600, 2400) * 1.5
    env = np.minimum(1, tt / .06) * np.minimum(1, (d - tt) / .1)
    return norm(x) * env * v * .6

def cracker(v=1.0, big=False):
    d = .5 if big else .3; tt = t_(d)
    x = hp(noise(d), 1200) * np.exp(-tt / .006) * 1.2 + np.sin(2 * np.pi * (90 + 90 * np.exp(-tt / .015)) * tt) * np.exp(-tt / (.06 if big else .03)) + lp(noise(d), 1800) * np.exp(-tt / .02) * .5
    n = int(3 + 6 * rng.random())                 # ricochet crackle
    for _ in range(n):
        i = int((.02 + rng.random() * .22) * SR); c = hp(noise(.006), 2500) * np.exp(-t_(.006) / .0012) * (.15 + .3 * rng.random())
        if i + len(c) < len(x): x[i:i + len(c)] += c
    return norm(x) * v

def hinge(dur, v=1.0):
    d = dur + .1; tt = t_(d); stick = (np.abs(np.sin(2 * np.pi * 9.5 * tt)) ** 2) * (.5 + .5 * np.sin(2 * np.pi * 1.7 * tt + 1))
    out = np.zeros_like(tt)
    for f0, a in ((170, 1.0), (205, .7)):
        f = f0 * (1 + .45 * tt / d); saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        out += bp(saw, 280, 1900, 2) * stick * a
    env = np.minimum(1, tt / .15) * np.minimum(1, (d - tt) / .3)
    return norm(out) * env * v * .5

def tear(v=1.0):
    d = .55; tt = t_(d); jag = np.abs(lp(noise(d), 60)) * 8
    x = hp(noise(d), 1400) * np.clip(jag, 0, 1) * np.minimum(1, tt / .02) * np.exp(-tt / .35) + lp(noise(d), 300) * .15 * np.exp(-tt / .1)
    imp = (rng.random(len(tt)) < 380 / SR).astype(float) * rng.random(len(tt)) * np.exp(-tt / .3); x += hp(imp, 2200) * 2
    return norm(x) * v * .9

def door_stop(v=1.0):
    d = .6; tt = t_(d); x = np.sin(2 * np.pi * (58 + 40 * np.exp(-tt / .04)) * tt) * np.exp(-tt / .18) + lp(noise(d), 300) * np.exp(-tt / .06) * .6 + hp(noise(d), 2500) * np.exp(-tt / .004) * .3
    return norm(x) * v * .8

# events -> foley (the picture decides when; this decides what)
FOLEY = {
    'block_drop': lambda e: (block_drop(e.get('v', 1)), .9, -.05), 'block_set': lambda e: (block_set(e.get('v', 1)), .8, .35),
    'paper_land': lambda e: (paper_land(e.get('v', 1)), .85, -.1), 'slap': lambda e: (slap(e.get('v', 1)), .85, 0.0),
    'press_end': lambda e: (press_end(e.get('v', 1)), .8, .15), 'brayer': lambda e: (brayer(e['dur'], e.get('v', 1)), .7, 0.0),
    'baren': lambda e: (baren(e['dur'], e.get('v', 1)), .7, 0.1), 'peel': lambda e: (peel(e['dur'], e.get('v', 1)), .7, -.1),
    'wipe': lambda e: (wipe(e['dur'], e.get('v', 1)), .6, 0.0), 'paste': lambda e: (paste(e['dur'], e.get('v', 1)), .7, 0.0),
    'hinge': lambda e: (hinge(e['dur'], e.get('v', 1)), .6, 0.0), 'tear': lambda e: (tear(e.get('v', 1)), .9, 0.0), 'door_stop': lambda e: (door_stop(e.get('v', 1)), .85, 0.0),
}
for e in ev:
    ty = e['type']
    if ty in FOLEY:
        x, g, pan = FOLEY[ty](e); add(buf['foley'], x, e['t'], g, pan)
    elif ty == 'crackers':
        for side, pan in ((0, -.6), (1, .6)):
            for i in range(12):
                add(buf['foley'], cracker(.55 + .35 * rng.random() + (.3 if i == 0 else 0), big=(i == 0)), e['t'] + i * .12 + side * .025, .8, pan)
        add(buf['foley'], gong(110, 2.4, .5), e['t'], .35, 0)     # the string's low boom
        add(buf['foley'], tanggu(.8, True), e['t'] + .02, .35, 0)

# ------------------------------------------------------------------ ambience
def swell(a, b, fi, fo, tt):
    return np.clip((tt - a) / fi, 0, 1) * np.clip((b - tt) / fo, 0, 1)
tt = np.arange(N) / SR
work = lp(noise(N / SR), 420) * .028 + lp(noise(N / SR), 120) * .03 + hp(noise(N / SR), 6000) * .0015
w_env = swell(1.0, 30.9, .05, 1.0, tt) + swell(50.4, DUR + .8, .8, .01, tt) * (1 - .0)
wind = bp(noise(N / SR), 220, 900) * (.5 + .5 * np.sin(2 * np.pi * .13 * tt + 1) ** 2) * .075 + bp(noise(N / SR), 1500, 2100, 2) * (.5 + .5 * np.sin(2 * np.pi * .21 * tt)) ** 3 * .012
d_env = swell(30.4, 50.8, 1.4, 2.4, tt) * (1 - .55 * np.clip((tt - 46.4) / 1.5, 0, 1))
room_ = work * np.clip(w_env, 0, 1) + wind * d_env
buf['room'][:, 0] = room_[:N]; buf['room'][:, 1] = np.roll(room_, 1500)[:N]

# ------------------------------------------------------------------ score
A0 = lambda n: 1.0 + n * BEAT                   # section A's grid (beat 0 = the first thump)
# A: the block. Low drone, wood ticks, the first plucked phrase arrives with the paper
note('drone', 1.2, G2, .7, tag='A', d=9.4)
note('drone', 5.2, D3, .35, tag='A', d=5.2, pan=.2)
note('gong', A0(0), None, .7, tag='thump', f0=96, d=3.5)
for n in list(range(4, 8)): note('muyu', A0(n), None, .32 + .05 * (n - 4), pan=-.3, tag='ink')
for n in range(8, 15, 2): note('muyu', A0(n), None, .45, pan=-.3, tag='tick')
for n, m, v in [(8, G4, .75), (9, D5, .6), (10, B4, .6), (11, A4, .55), (12, G4, .7), (13, E4, .5)]: note('pluck', A0(n), m, v, pan=.25, tag='A phrase')
for m in (B3, D4): note('pluck', A0(14), m, .5, pan=-.1, tag='land')
note('gong', A0(14), None, .4, tag='land', f0=420, d=2.0, glide=.02)
# B: five colour blocks. One voice joins at each pass
muy = [(n, .4) for n in range(0, 12, 2)] + [(n, .4) for n in range(20, 27, 2)]
for n, v in muy: note('muyu', B(n), None, v, pan=-.3, tag='B1')
for n in range(2, 12, 2): note('pluck', B(n), [G2, D3][(n // 2) % 2], .6, tag='B2 bass', d=1.6)
pat = [G4, A4, B4, D5, E5, D5, B4, A4]
for bar in range(6, 12, 4):                                  # green joins the melody at beat 6 (arpeggio in eighths)
    for i, m in enumerate(pat): note('pluck', B(bar) + i * BEAT / 2, m, .5 + .08 * (i % 2 == 0), pan=.3, tag='B3 arp')
for n in (9, 10, 11): note('drum', B(n), None, .6 if n == 9 else .4, tag='B4')
for n in range(9, 12): note('clap', B(n) + BEAT / 2, None, .4, pan=.3, tag='B4')
# the thin bars while the register is examined
for n, m in [(12, G4), (14, D5), (16, B4), (18, A4)]: note('pluck', B(n), m, .55, pan=.3, tag='thin', d=3.0)
note('drone', B(11), G2, .5, tag='thin', d=B(20) - B(11))
for n in (13.5, 15.5): note('clap', B(n), None, .3, pan=.4, tag='off-register')       # deliberately a little off the grid
# red lands: everything in
note('gong', B(20), None, .95, tag='red', f0=98, d=4.0); note('drum', B(20), None, 1.0, big=True, tag='red')
for m in (G3, D4, B4): note('pluck', B(20), m, .65, pan=0, tag='red chord', d=3)
for n in range(21, 27, 2): note('drum', B(n), None, .55, tag='B5')
for n in range(21, 27): note('clap', B(n) + BEAT / 2, None, .4, pan=.3, tag='B5')
for n, d, m in [(21, 1.4, D5), (22.5, .5, E5), (23, 1, D5), (24, 1, B4), (25, 1, A4), (26, 1.8, G4)]: note('dizi', B(n), m, .6, pan=-.1, tag='B5 melody', d=d * BEAT)
for n in range(20, 27): note('pluck', B(n), [G2, D3][n % 2], .55, tag='B5 bass', d=1.6)
# C: the door, in eighths
for n in range(32, 44):
    for k in range(2): note('clap', B(n) + k * BEAT / 2, None, .26 + .12 * (k == 1), pan=.35, tag='C clap')
for n in range(32, 44):
    note('drum', B(n), None, .5, tag='C drum')
for n in range(27, 44):
    for k in range(2): note('pluck', B(n) + k * BEAT / 2, [G3, D4][k], .4, pan=-.3, tag='C ostinato', d=1.2)
mel = [G4, A4, B4, D5, E5]
for i, t in enumerate([34.125, 34.75, 35.375, 36.0, 36.625]): note('pluck', t, mel[i], .8, pan=.2, tag='pass', d=2.5)
note('gong', B(39), None, .6, tag='lintel', f0=170, d=2.5)
for m in (G3, D4, G4): note('pluck', B(39), m, .7, tag='lintel chord', d=2.5)
note('pluck', B(40), E5, .7, pan=-.4, tag='couplet', d=2.5); note('pluck', B(41), D5, .7, pan=.4, tag='couplet', d=2.5)
note('pluck', B(42), G4, .6, tag='seal', d=3); note('drone', B(39), G2, .6, tag='C drone', d=B(46) - B(39))
# silence B(46)..burst: nothing but wind
# D: the burst and the door
note('gong', B(49), None, .85, tag='burst', f0=88, d=4.5); note('drum', B(49), None, 1.0, big=True, tag='burst')
note('drone', 44.5, G2, .6, tag='D drone', d=6.0); note('drone', 46.0, D3, .35, tag='D drone', d=5.0, pan=.2)
for i, m in enumerate([G3, D4, B4, D5]): note('pluck', 45.0 + i * .1, m, .6 - .05 * i, pan=-.2 + .15 * i, tag='open', d=3.5)
for n, d, m in [(52, 2, D5), (54, 1, E5), (55, 1, D5), (56, 1.5, B4), (58, 2.5, G4)]: note('dizi', B(n), m, .75, pan=-.1, tag='D melody', d=d * BEAT)
for n, m in [(53, A4), (56.5, D5), (57.5, B4)]: note('pluck', B(n), m, .5, pan=.3, tag='D pluck', d=2.5)
for n, m in [(60, G4), (62, D4)]: note('pluck', B(n), m, .45, pan=.1, tag='D sparse', d=3)
# F: the bench again
note('drone', 51.0, G2, .55, tag='F', d=4.5)
for n in range(61, 66, 2): note('muyu', B(n), None, .3, pan=-.3, tag='F tick')
t_end = F_flip = None
for e in ev:
    if e['type'] == 'block_drop' and e['t'] > 50: F_flip = e['t']
note('gong', F_flip, None, 1.0, tag='final', f0=96, d=5.0); note('drum', F_flip, None, 1.0, big=True, tag='final')
for m in (G3, D4, G4): note('pluck', F_flip + .02, m, .7, tag='final chord', d=4.0)
note('drone', F_flip, G2, .6, tag='final drone', d=DUR + .6 - F_flip)

# ------------------------------------------------------------------ voice
for k, v in caps['vo'].items():
    w, sr = sf.read(os.path.join(HERE, 'out/voice', k + '.wav'))
    if w.ndim > 1: w = w.mean(1)
    w = soxr.resample(w, sr, SR)
    w = hp(w, 85, 2); w = sfx.compress(w, .22, 3.2, .003, .09); w = w * 1.0
    add(buf['voice'], w, v['t'], 1.0, 0.0)

# ------------------------------------------------------------------ mix
venv = uniform_filter1d(np.abs(buf['voice']).max(axis=1), int(.18 * SR))
vd_ = np.clip(venv / .1, 0, 1)
duck = 1 - .62 * vd_
fduck = 1 - .42 * vd_
mus, fol, room, voi = buf['music'], buf['foley'], buf['room'], buf['voice']
for ch in (0, 1): fol[:, ch] = sfx.compress(fol[:, ch], .5, 2.5, .002, .1)
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
vr = rms(voi)
mus_g = vr / rms(mus) * 10 ** (-10.5 / 20)
fol_g = vr / rms(fol) * 10 ** (-7.5 / 20)
room_g = vr / rms(room) * 10 ** (-24 / 20)
mix = np.zeros_like(mus)
for ch in (0, 1):
    mix[:, ch] = mus[:, ch] * mus_g * duck + fol[:, ch] * fol_g * fduck + room[:, ch] * room_g + voi[:, ch] * 1.0
for ch in (0, 1): mix[:, ch] = sfx.limit(mix[:, ch], .9)
# a touch of warmth: gently lift low-mids
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out/mix.wav'), mix.astype(np.float32), SR)
json.dump({'beat': BEAT, 'g0': G0, 'onsets': onsets}, open(os.path.join(HERE, 'out/cues.json'), 'w'))
print(f'mix.wav {len(mix) / SR:.1f}s  music x{mus_g:.2f}  foley x{fol_g:.2f}  room x{room_g:.2f}  onsets {len(onsets)}')

# subtitles
subprocess.run([os.path.join(LIB, '.venv/bin/python'), os.path.join(LIB, 'core/render/srt.py'), os.path.join(HERE, 'out/srt_cues.json'), os.path.join(HERE, '../nianhua.srt')], check=True)
