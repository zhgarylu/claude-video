"""Score + foley + rain + voice -> out/mix.wav for "Thirty Coats".
Everything is synthesised in numpy (no samples, no downloads). Reads timeline.json (export_tl.mjs) and voices/ (tts.py).
usage: .venv/bin/python styles/lacquer-gold/demo/mix.py [workdir]
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve, sosfilt, butter, lfilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else HERE
TL = json.load(open(os.path.join(W, 'timeline.json')))
T, EV, VO, COATS = TL['T'], TL['EV'], TL['VO'], TL['COATS']
DUR, BEAT, BAR = TL['DUR'], TL['BEAT'], TL['BAR']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(75)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tl(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def env_exp(d, tau): return np.exp(-tl(d) / tau)
def bump(t, a, b, fa=.2, fb=.2): return np.clip((t - a) / fa, 0, 1) * np.clip((b - t) / fb, 0, 1)
def P(bar, beat=0): return (bar - 1) * BAR + beat * BEAT

def put(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414

# ------------------------------------------------------------------ instruments
def koto(f, d=2.4, v=1.0):
    """plucked string by modal synthesis: harmonics with a pluck-position comb and faster decay for the upper partials"""
    t = tl(d); x = np.zeros_like(t)
    for k in range(1, 15):
        a = np.exp(-.32 * k) / k ** .55 * abs(np.sin(k * np.pi / 5.3)) + .02
        tau = 1.5 / (1 + .5 * k) * (d / 2.4) ** .3
        x += a * np.sin(2 * np.pi * k * f * (1 + 6e-5 * k * k) * t) * np.exp(-t / tau)
    cl = hp(noise(.012), 2500) * env_exp(.012, .002)
    x[:len(cl)] += cl * .25
    x *= np.minimum(1, t / .002) * np.minimum(1, (d - t) / .05)
    return x / (np.abs(x).max() + 1e-9) * v

def flute(f, d=2.4, v=1.0, vib=1.0):
    """a breathy end-blown flute: soft attack, scooped entry, late vibrato, breath noise around the pitch"""
    t = tl(d); vibr = 1 + .006 * vib * np.clip((t - .5) / .6, 0, 1) * np.sin(2 * np.pi * 5.1 * t)
    scoop = 1 - .035 * np.exp(-t / .09)
    ph = 2 * np.pi * np.cumsum(f * vibr * scoop) / SR
    x = np.sin(ph) + .28 * np.sin(2 * ph) + .1 * np.sin(3 * ph) + .04 * np.sin(5 * ph)
    br = bp(noise(d), f * .9, f * 3.2, 2) * .5 * (.6 + .4 * np.sin(2 * np.pi * 5.1 * t))
    amp = np.minimum(1, t / .32) * np.minimum(1, (d - t) / .5)
    x = (x * .9 + br * .55) * amp
    return x / (np.abs(x).max() + 1e-9) * v

def pad(f, d=6.0, v=1.0):
    t = tl(d); x = np.zeros_like(t)
    for det in (-.0045, 0, .0045):
        for k, a in enumerate([1, .38, .16, .07, .03], 1):
            x += a * np.sin(2 * np.pi * f * (1 + det) * k * t + det * 40 + k)
    x = lp(x, min(2400, f * 6), 2)
    x *= np.minimum(1, t / (d * .3)) * np.minimum(1, (d - t) / (d * .35))
    return x / (np.abs(x).max() + 1e-9) * v

def bell(f, d=4.0, v=1.0):
    t = tl(d); x = np.zeros_like(t)
    for r, a, tau in [(1, 1, 2.2), (2.0, .45, 1.6), (2.76, .6, 1.3), (4.07, .3, .8), (5.4, .22, .6), (8.93, .08, .3)]:
        x += a * np.sin(2 * np.pi * f * r * t + r) * np.exp(-t / (tau * d / 4))
    x[:int(.02 * SR)] += hp(noise(.02), 2500) * env_exp(.02, .005) * .25
    return x / (np.abs(x).max() + 1e-9) * v

def taiko(v=1.0, f=72):
    d = .7; t = tl(d)
    x = np.sin(2 * np.pi * (f * 0.66 + f * .45 * np.exp(-t / .07)) * t * 1.0) * np.exp(-t / .22)
    x += lp(noise(d), 260, 2) * np.exp(-t / .03) * .7 + .25 * np.sin(2 * np.pi * f * 2.02 * t) * np.exp(-t / .1)
    return x / (np.abs(x).max() + 1e-9) * v

def shaker(v=1.0):
    d = .07; return hp(noise(d), 5000) * np.sin(np.pi * np.minimum(1, tl(d) / d)) ** 2 * v

def woodtap(f, v=1.0):
    d = .16; t = tl(d)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / .028) + .5 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t / .014)
    x[:int(.004 * SR)] += hp(noise(.004), 2500)
    return x / (np.abs(x).max() + 1e-9) * v

def tick(f, v=1.0, d=.4):
    t = tl(d); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (tau * d)) for r, a, tau in [(1, 1, .22), (1.5, .45, .14), (2.01, .5, .1), (3.1, .25, .06)])
    return x / (np.abs(x).max() + 1e-9) * v

def reverb(x, rt=1.9, wet=.22, seed=1):
    r = np.random.default_rng(seed); n = int(rt * 1.3 * SR); tq = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in (0, 1):
        ir = r.standard_normal(n) * np.exp(-tq / (rt / 6.9)); ir = lp(ir, 5200, 1); ir[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
        ir /= np.sqrt((ir ** 2).sum()); out[:, c] = fftconvolve(x[:, c], ir)[:len(x)]
    return x * (1 - wet) + out * wet * 1.8

# ------------------------------------------------------------------ the score
MUS = np.zeros((N, 2)); NOTE = {'D': 0, 'E': 2, 'G': 5, 'A': 7, 'B': 9}
def m(name, octv): return 12 * (octv + 1) + NOTE[name]
def K(at, name, octv, d=2.4, v=.7, pan=0.0): put(MUS, koto(mtof(m(name, octv)), d, 1.0), at, v, pan)
def F(at, name, octv, d=2.4, v=.6, pan=0.0, vib=1.0): put(MUS, flute(mtof(m(name, octv)), d, 1.0, vib), at, v, pan)
def PD(at, name, octv, d=6.0, v=.3, pan=0.0): put(MUS, pad(mtof(m(name, octv)), d, 1.0), at, v, pan)
def BL(at, name, octv, d=4.0, v=.5, pan=0.0): put(MUS, bell(mtof(m(name, octv)), d, 1.0), at, v, pan)

# bars 1-2: a drone and a few plucks that answer the drop
PD(0, 'D', 2, 7.4, .34); PD(0.4, 'A', 2, 7.0, .2)
K(0.0, 'D', 3, 3.0, .5); K(1.6, 'A', 3, 2.4, .4); K(3.2, 'D', 4, 2.4, .42, .15); K(4.0, 'E', 4, 2.0, .36, .25)
F(3.2, 'A', 4, 3.0, .26, -.15)
# bars 3-5: the ostinato, eighths then sixteenths; the drum joins in bar 4
PAT = [('D', 4), ('A', 4), ('B', 4), ('A', 4), ('D', 5), ('B', 4), ('A', 4), ('G', 4)]
t0 = T['coat0']
for i in range(int((P(6) - t0) / (BEAT / 2))):
    at = t0 + i * BEAT / 2
    if at >= P(5): break
    v = .26 + .22 * min(1, (at - t0) / 7.0)
    n, o = PAT[i % 8]; K(at, n, o, 1.1, v, -.3 + .6 * ((i % 4) / 3))
for i in range(16):           # bar 5: sixteenths, up an octave
    at = P(5) + i * BEAT / 4; n, o = PAT[(i // 1) % 8]
    K(at, n, o + (1 if i % 8 in (0, 4) else 0), .8, .46 + .01 * i, -.4 + .8 * (i % 5) / 4)
for b in (3, 4, 5):
    K(P(b), 'D', 2, 2.6, .55); K(P(b, 2), 'A', 2, 2.2, .45)
for b in (4, 5):
    for bt in (0, 2): put(MUS, taiko(1.0), P(b, bt), .5 if b == 4 else .62)
for i in range(32): put(MUS, shaker(1.0), P(5) + i * BEAT / 8, .06 + .01 * i)
PD(P(3), 'D', 3, 9.8, .22); PD(P(3), 'A', 3, 9.8, .14)
# bar 6: the cut. A bell, a held chord, and everything stops on the downbeat of bar 7
BL(P(6), 'D', 5, 3.2, .5); PD(P(6), 'D', 3, 3.4, .34); PD(P(6), 'A', 3, 3.4, .22); PD(P(6), 'E', 4, 3.4, .14)
K(P(6, 1), 'G', 4, 2.0, .38, .2); K(P(6, 3), 'D', 4, 1.6, .34, -.2)
# bar 9 on: the gold. The first note after the silence.
K(P(9), 'D', 4, 3.4, .95, -.05)
PD(P(9, 2), 'D', 2, 12.6, .3); PD(P(9, 2), 'A', 2, 12.6, .2)
mel = [(9, 2, 'E', 4, 1.6), (9, 3, 'G', 4, 1.6), (10, 0, 'A', 4, 2.6), (10, 2, 'G', 4, 1.2), (10, 3, 'E', 4, 1.2), (11, 0, 'B', 4, 1.6), (11, 1, 'A', 4, 1.6), (11, 2, 'G', 4, 1.6), (11, 3, 'A', 4, 1.6),
       (12, 0, 'D', 5, 3.4), (12, 2, 'B', 4, 2.0), (12, 3, 'A', 4, 2.4)]
for b, bt, n, o, d in mel: K(P(b, bt), n, o, d, .62, .1)
ARP = [('D', 3), ('A', 3), ('D', 4), ('A', 3)]
for b in (10, 11, 12):
    for i in range(8): K(P(b) + i * BEAT / 2, *ARP[i % 4], 1.4, .16 + .03 * (b - 10), -.35)
for b in (10, 11, 12):
    put(MUS, taiko(1.0, 66), P(b), .3)
    if b >= 11: put(MUS, taiko(1.0, 66), P(b, 2), .22)
# bars 13-14: the turn. A flute over wide chords.
for n, o, at, d in [('A', 4, 0, 1.7), ('B', 4, 1.6, 0.9), ('D', 5, 2.4, 1.7), ('B', 4, 4.0, 0.9), ('A', 4, 4.8, 1.6)]:
    F(P(13) + at, n, o, d, .5, .05)
PD(P(13), 'D', 2, 6.8, .34); PD(P(13), 'A', 2, 6.8, .22); PD(P(13), 'E', 3, 6.8, .16); PD(P(13), 'B', 3, 6.8, .1)
for i, (n, o) in enumerate([('D', 5), ('A', 4), ('E', 5), ('B', 4)]): K(P(13) + .8 * i * 2, n, o, 2.2, .22, -.4 + .27 * i)
for i in range(4): K(P(14) + .8 * i * 2 + .4, ['G', 'D', 'A', 'B'][i], 5 if i != 1 else 4, 2.0, .2, .4 - .27 * i)
# bar 15: almost nothing (the music gate takes it from 45.0 to 48.0). Bar 16: the resolve.
for i, (n, o) in enumerate([('D', 3), ('A', 3), ('D', 4), ('A', 4), ('D', 5)]): K(P(16) + i * .09, n, o, 5.0, .62 - .05 * i, -.2 + .1 * i)
BL(P(16), 'D', 5, 5.0, .45); PD(P(16), 'D', 2, 8.2, .36); PD(P(16), 'A', 2, 8.2, .22); PD(P(16), 'E', 3, 8.2, .12)
F(P(16, 1), 'D', 5, 3.6, .38); F(P(16, 1) + 3.8, 'A', 4, 3.0, .28)
K(P(17), 'D', 4, 3.6, .46); K(P(17, 2), 'A', 4, 3.0, .38, .1)
put(MUS, taiko(1.0, 60), T['seal'], .6); BL(T['seal'], 'D', 4, 5.0, .4)
K(52.8, 'D', 3, 4.0, .42); K(54.4, 'D', 5, 2.4, .3, .2)

MUS = reverb(MUS, 1.9, .26, 3)
# gates: the two silences (hard cuts, 25 ms fades)
def gate(buf, a, b, fade=.025):
    g = 1 - (np.clip((tt - a) / fade, 0, 1) * np.clip((b - tt) / fade, 0, 1))
    buf *= g[:, None]
gate(MUS, P(7), P(9)); gate(MUS, 45.0, 48.0 - 0.004)

# ------------------------------------------------------------------ foley and beds
FOL = np.zeros((N, 2)); AMB = np.zeros((N, 2))
# room tone and rain
room = lp(noise(DUR), 320, 2) * .02 + lp(np.cumsum(noise(DUR)) * 2e-5, 90, 1) * .0
AMB += room[:, None]
rain_lvl = np.interp(tt, [0, 5.6, 8, 14, 19.2, 25.6, 28.5, 30], [0, 0, .12, .28, .55, .55, .06, 0])
rl = bp(noise(DUR), 1600, 8500, 2) * .05 + lp(hp(noise(DUR), 500), 2500) * .035
AMB[:, 0] += rl * rain_lvl; AMB[:, 1] += np.roll(rl, 700) * rain_lvl
for i in range(240):          # single drops on the roof and on a leaf
    at = 6 + rng.random() * 22
    if rng.random() < rain_lvl[int(at * SR)] * 1.6 + .05:
        d = hp(noise(.04), 2200) * env_exp(.04, .006) * .4 + np.sin(2 * np.pi * (900 + 2400 * rng.random()) * tl(.04)) * env_exp(.04, .01) * .25
        put(AMB, d, at, .06 + .08 * rain_lvl[int(at * SR)], rng.random() * 2 - 1)
put(AMB, tick(1180, 1, .3), 22.9, .16, .35); put(AMB, tick(1560, 1, .3), 24.15, .12, -.4)
BL_AMB = np.zeros((N, 2)); put(BL_AMB, bell(mtof(57), 5.0, 1.0), 21.6, .22, -.2)   # a distant bell in the silence
BL_AMB = reverb(BL_AMB, 3.2, .6, 9)

def wipe(at, d=.8):
    x = noise(d); t = tl(d); out = np.zeros_like(x)
    for i in range(0, len(x), 960):
        f = 500 + 2600 * (i / len(x)); hi = min(len(x), i + 960)
        out[i:hi] = bp(x[max(0, i - 2000):hi], f * .6, f * 1.5)[-(hi - i):]
    out *= np.sin(np.pi * t / d) ** 1.5
    out += lp(noise(d), 240, 2) * np.sin(np.pi * t / d) ** 2 * .9
    return out / (np.abs(out).max() + 1e-9)
def brushdrag(d, f0=700):
    t = tl(d); x = bp(noise(d), f0, f0 * 5, 2) * (.6 + .4 * np.sin(2 * np.pi * 38 * t + np.cumsum(noise(d)) * 1e-3)) * (np.sin(np.pi * np.clip(t / d, 0, 1)) ** .6)
    return x / (np.abs(x).max() + 1e-9)
def sparkle(d, dens=140, f0=3500):
    out = np.zeros(int(d * SR))
    for k in range(int(d * dens)):
        a = rng.random() * d; g = hp(noise(.012), f0) * env_exp(.012, .002) * (.3 + .7 * rng.random())
        s = int(a * SR); e = min(len(out), s + len(g)); out[s:e] += g[:e - s]
    return out
def graver(d):
    t = tl(d); x = bp(noise(d), 2400, 7800, 2) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 21 * t))) * np.minimum(1, t / .2) * np.minimum(1, (d - t) / .3)
    x += lp(noise(d), 600, 2) * .25 * np.minimum(1, t / .3)
    return x / (np.abs(x).max() + 1e-9)
def airy(d):
    t = tl(d); x = noise(d); out = np.zeros_like(x)
    for i in range(0, len(x), 2400):
        f = 1500 + 4200 * (i / len(x)) ** 1.2; hi = min(len(x), i + 2400)
        out[i:hi] = bp(x[max(0, i - 4000):hi], f * .75, f * 1.3, 2)[-(hi - i):]
    sh = sum(np.sin(2 * np.pi * f * t * (1 + .1 * t / d)) * a for f, a in [(1175, 1), (1760, .6), (2349, .4), (2960, .25)]) * .12
    return (out / (np.abs(out).max() + 1e-9) * .8 + sh) * np.sin(np.pi * t / d) ** 2

SC = [m(n, o) for o in (5, 6) for n in 'DEGAB']       # tick pitches: D yo, two octaves
for e in EV:
    ty, at = e['type'], e['t']
    if ty == 'thread': put(FOL, bp(noise(.5), 300, 1200, 2) * env_exp(.5, .12) * .22, at - .1, .5, 0)
    elif ty == 'plop':
        t = tl(.3); pl = np.sin(2 * np.pi * (260 + 520 * (1 - np.exp(-t / .03))) * t) * np.exp(-t / .06) + .4 * np.sin(2 * np.pi * 120 * t) * np.exp(-t / .1)
        put(FOL, pl / np.abs(pl).max(), at, .55, 0)
        put(FOL, hp(noise(.5), 2000) * env_exp(.5, .09) * .15, at + .02, .5, 0)
        for k, dd in enumerate([.12, .26, .42]): put(FOL, tick(1400 + k * 330, 1, .3), at + dd, .12 - k * .03, -.3 + .3 * k)
    elif ty == 'wipe': put(FOL, wipe(.8), at, .46, 0)
    elif ty == 'drag': put(FOL, brushdrag(e['dur'] + .1), at, .5, -.5 if e['k'] % 2 == 0 else .5)
    elif ty == 'coat':
        n = e['n']; sp = (COATS[n] - COATS[n - 1]) if n < 30 else .3
        idx = min(len(SC) - 1, int((n - 1) / 30 * (len(SC))))
        if sp > .16: put(FOL, brushdrag(min(.35, sp * .8), 900) * .8, at, .22, -.5 if n % 2 else .5)
        put(FOL, woodtap(mtof(SC[idx]) * .5, 1.0), at, .24 + .14 * min(1, n / 30), -.2 + .4 * ((n * 7) % 5) / 4)
    elif ty == 'bell30': put(FOL, bell(mtof(m('D', 6)), 3.0, 1.0), at, .26, 0)
    elif ty == 'bell': pass
    elif ty == 'cut':
        put(FOL, graver(e['dur']), at, .46, .1)
        for k in range(10): put(FOL, tick(2400 + 300 * (k % 4), 1, .12), at + .3 + k * .14, .1, -.4 + .8 * rng.random())
    elif ty == 'gold':
        first = abs(at - T['gold0']) < .01
        f = mtof(SC[(int(abs(e['x'])) // 37 + int(at * 7)) % len(SC)]) * 2
        put(FOL, tick(f if not first else 2349, 1.0, .5 if first else .26), at, .5 if first else .16 + .0001 * min(400, e['len']), np.clip(e['x'] / 700, -.7, .7))
        if first: put(FOL, hp(noise(.5), 6500) * env_exp(.5, .09) * .12, at, .6, 0)
        dd = max(.1, e['dur']); put(FOL, bp(noise(dd), 4200, 9000, 2) * np.minimum(1, tl(dd) / .03) * np.minimum(1, (dd - tl(dd)) / .04) * .035, at, 1, np.clip(e['x'] / 700, -.7, .7))
    elif ty == 'sprinkle':
        s = sparkle(e['dur'], 260, 3000); put(FOL, s * 1.0, at, .5, -.1); put(FOL, bp(noise(e['dur']), 5000, 9500, 2) * np.sin(np.pi * np.clip(tl(e['dur']) / e['dur'], 0, 1)) * .04, at, 1, .1)
    elif ty == 'powderbrush':
        d = e['dur']; x = lp(noise(d), 4200, 2) * (np.sin(np.pi * np.clip(tl(d) / d, 0, 1)) ** 1.4) * (.65 + .35 * np.sin(2 * np.pi * 1.7 * tl(d)))
        put(FOL, x / np.abs(x).max(), at, .26, 0)
    elif ty == 'waves':
        for k in range(18): put(FOL, tick(mtof(SC[(k * 3) % len(SC)]) * 2, 1, .3), at + e['dur'] * k / 18, .12, -.6 + 1.2 * k / 18)
    elif ty == 'fret':
        for k in range(36): put(FOL, tick(mtof(SC[(k // 3) % len(SC)]) * 2, 1, .22), at + e['dur'] * (k / 36) ** 1.0, .09, np.sin(k * 1.7) * .7)
    elif ty == 'rule': put(FOL, bp(noise(e['dur']), 1800, 6000, 2) * np.sin(np.pi * np.clip(tl(e['dur']) / e['dur'], 0, 1)) * .06, at, 1, 0)
    elif ty == 'sheen': put(FOL, airy(e['dur']), at, .34, 0)
    elif ty == 'lift':
        t = tl(.5); pop = np.sin(2 * np.pi * (180 + 500 * np.exp(-t / .03)) * t) * np.exp(-t / .05); put(FOL, pop / np.abs(pop).max(), at, .5, 0)
        put(FOL, lp(noise(1.0), 900, 2) * np.sin(np.pi * np.clip(tl(1.0), 0, 1)) ** 2 * .12, at, 1, 0)
    elif ty == 'slide':
        d = e['dur']; x = bp(noise(d), 200, 1400, 2) * (np.sin(np.pi * np.clip(tl(d) / d, 0, 1)) ** 1.2); put(FOL, x / np.abs(x).max(), at, .3, 0)
        put(FOL, woodtap(150, 1.0), at + d, .5, 0)
    elif ty == 'seal':
        put(FOL, taiko(1.0, 80)[:int(.3 * SR)], at, .6, 0); put(FOL, tick(1100, 1, .25), at + .02, .4, .1); put(FOL, hp(noise(.1), 800) * env_exp(.1, .02) * .2, at, 1, 0)
    elif ty == 'glint': put(FOL, tick(3951, 1, .9), at, .2, .2)
FOL = reverb(FOL, 1.2, .14, 5)

# ------------------------------------------------------------------ voice
VOX = np.zeros((N, 2))
for v in VO:
    f = os.path.join(W, 'voices', v['id'] + '.wav')
    x, sr = sf.read(f)
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR)
    x = hp(x, 70, 2)
    x = sfx.compress(x, .1, 4.0, .004, .1); x = x / (np.abs(x).max() + 1e-9) * .8
    put(VOX, x, v['t'], 1.0, 0.0)
vox_env = np.convolve(np.abs(VOX).mean(1), np.ones(int(.12 * SR)) / int(.12 * SR), 'same')
vox_env = np.clip(vox_env / (np.percentile(vox_env[vox_env > 1e-4], 70) + 1e-9), 0, 1)
vox_env = np.convolve(vox_env, np.ones(int(.25 * SR)) / int(.25 * SR), 'same')
duck = 1 - .5 * vox_env
# the voice sits a little in the room
VOX = VOX * .92 + reverb(VOX, .9, .5, 7) * .12

# ------------------------------------------------------------------ hand the stems to the master
os.makedirs(os.path.join(W, 'out'), exist_ok=True)
np.savez(os.path.join(W, 'out', 'stems.npz'), MUS=MUS.astype(np.float32), FOL=FOL.astype(np.float32), AMB=AMB.astype(np.float32), BL=BL_AMB.astype(np.float32), VOX=VOX.astype(np.float32), vox_env=vox_env.astype(np.float32))
sys.path.insert(0, HERE)
from master import master
master(W)
