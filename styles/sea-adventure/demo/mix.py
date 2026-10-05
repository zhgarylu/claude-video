"""Sea, foley, an original 6/8 jig and the narration -> mix.wav for "Five Hats and One Sock".
Everything is synthesised with numpy (no samples). Reads events.json (core/render/events.mjs), timeline.json and voices/.
usage: .venv/bin/python styles/sea-adventure/demo/mix.py
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

TL = json.load(open(os.path.join(HERE, 'timeline.json'))); EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
VO = TL['VO']; DUR = TL['DUR']; N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(88)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def win(a, b, fa=.5, fb=.5): return np.clip((tt - a) / fa, 0, 1) * np.clip((b - tt) / fb, 0, 1)
def saw(f, t): return 2 * ((f * t) % 1) - 1

# ------------------------------------------------------------------ foley
def cat(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
def thud(f=70, d=.5, v=1.0): t = tv(d); return (np.sin(2 * np.pi * f * (1 + .6 * np.exp(-t / .03)) * t) * np.exp(-t / (d * .3)) + lp(noise(d), 300) * np.exp(-t / .02) * .4) * v
def whoosh(d=.4, v=1.0, up=True):
    t = tv(d); n = noise(d); f = (400 + 3000 * (t / d) ** 1.5) if up else (3400 - 3000 * (t / d)); out = np.zeros_like(n)
    for i in range(0, len(n), 480):
        hi = min(len(n), i + 480); fc = max(300, f[i]); out[i:hi] = bp(n[max(0, i - 1500):hi], fc * .7, min(fc * 1.4, 20000))[-(hi - i):]
    return out * np.sin(np.pi * t / d) ** 1.5 * v
def wood(f=300, d=.25, v=1.0): t = tv(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t / .035) + .5 * np.sin(2 * np.pi * f * 2.3 * t) * np.exp(-t / .02) + hp(noise(d), 1500) * np.exp(-t / .004) * .5) * v
def paper_n(d=.6, v=1.0): return hp(lp(noise(d), 5000), 1200) * (0.5 + 0.5 * np.sin(tv(d) * 90)) ** 2 * np.sin(np.pi * tv(d) / d) * v
def squeak(f0=900, d=.5, v=1.0, big=True):
    t = tv(d); f = f0 * (1 + .9 * np.sin(np.pi * (t / d) ** .7) ** 1) * (1 + .02 * np.sin(2 * np.pi * 42 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + .6 * np.sin(2 * ph) + .35 * np.sin(3 * ph) + .2 * np.sin(5 * ph)
    return bp(x, 400, 6000) * np.sin(np.pi * t / d) ** .6 * v
def bell(f, d=2.0, v=1.0): t = tv(d); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * k)) for m, a, k in [(1, 1, .35), (2.76, .5, .2), (5.4, .3, .1), (8.9, .15, .06)]) * v * np.clip(t / .002, 0, 1)
def pluck(f, d=.6, v=1.0):
    n = int(SR / f); buf = rng.uniform(-1, 1, n); out = np.zeros(int(d * SR))
    for i in range(len(out)): out[i] = buf[i % n]; buf[i % n] = .5 * (buf[i % n] + buf[(i + 1) % n]) * .9965
    return out * v * np.clip((d - tv(d)) / .05, 0, 1)
def laugh(d=.6, v=1.0, f0=190):
    """a stylised 'ha-ha-ha': formant bursts on a falling pitch"""
    out = np.zeros(int(d * SR)); t = tv(d)
    for k in range(5):
        a = k * d / 5.5; seg = tv(d / 6); f = f0 * (1.12 - .05 * k) * (1 + .15 * np.exp(-seg / .05))
        ph = 2 * np.pi * np.cumsum(f) / SR; src = saw(f * seg * 0 + 0, seg) * 0
        src = sum(np.sin(h * ph) / h for h in range(1, 16))
        y = bp(src, 650, 950) * 1.0 + bp(src, 1100, 1600) * .5 + hp(noise(d / 6), 3000) * .12
        e = np.clip(seg / .01, 0, 1) * np.exp(-seg / .06); out[int(a * SR):int(a * SR) + len(seg)] += y[:len(out) - int(a * SR)] * e[:len(out) - int(a * SR)]
    return out * v

fx = np.zeros((N, 2)); wet = np.zeros((N, 2)); bedbus = np.zeros((N, 2))
for e in EV:
    k, t0 = e['type'], e['t']
    if k == 'boom': add(fx, thud(55, .9, 1.1), t0, .6)
    elif k == 'whoosh': add(fx, whoosh(e.get('d', .4), .6), t0, .5, 0)
    elif k == 'pop': add(fx, (np.sin(2 * np.pi * 520 * tv(.12) * (1 + 2 * tv(.12))) * np.exp(-tv(.12) / .03)), t0, .3 + .0 * e.get('n', 0), .1)
    elif k == 'boing':
        t = tv(.35); f = 300 + 500 * np.exp(-t / .1) * np.cos(2 * np.pi * 9 * t); add(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12) * .5, t0, .35, -.3 + .2 * e.get('n', 0))
    elif k == 'unroll': add(fx, paper_n(.9, 1.0), t0, .5)
    elif k == 'pen':
        d = e['d']; s = lp(hp(noise(d), 1500), 7000) * (.5 + .5 * np.abs(np.sin(tv(d) * 40))) * np.clip(tv(d) / .05, 0, 1) * np.clip((d - tv(d)) / .08, 0, 1); add(fx, s, t0, .22 if not e.get('route') else .12, .2)
    elif k == 'thud': add(fx, thud(e.get('f', 80), .5), t0, .5)
    elif k == 'thwack': add(fx, cat(wood(180, .3, 1.0), paper_n(.25, .7), thud(90, .35)), t0, .8, -.6 + .3 * e['k'])
    elif k == 'stamp': add(fx, cat(thud(130, .3), hp(noise(.1), 2500) * np.exp(-tv(.1) / .01) * .5), t0, .55, -.6 + .3 * e['k'])
    elif k == 'tink': add(fx, bell(2900, .5, .6), t0, .35, .5)
    elif k == 'swing': add(fx, wood(120, .15) , t0, .0); [add(fx, wood(rng.uniform(140, 200), .12, .4), t0 + i * .26 * (1 + i * .15), .25, .5) for i in range(int(e['d'] / .3))]
    elif k == 'wavewipe': add(fx, whoosh(1.0, 1.0, True), t0, .8) ; add(fx, lp(noise(1.0), 1500) * np.sin(np.pi * tv(1.0)) ** 2, t0, .8)
    elif k == 'gull':
        for j in range(3):
            t = tv(.35); f = 1600 + 800 * np.sin(np.pi * t / .35) - 300 * j; ph = 2 * np.pi * np.cumsum(f) / SR; add(fx, bp(np.sin(ph) + .4 * np.sin(2 * ph), 800, 5000) * np.sin(np.pi * t / .35) * .3, t0 + j * .38, .45, .6 - .5 * j)
    elif k == 'creak':
        d = .5; t = tv(d); f = 90 + 40 * np.sin(2 * np.pi * 3 * t) + 60 * t / d; add(fx, bp(saw(np.cumsum(f) / SR, np.ones(len(t)) * 0 + 1) if False else (2 * ((np.cumsum(f) / SR) % 1) - 1), 300, 2500) * np.abs(np.sin(2 * np.pi * 21 * t)) ** 2 * np.sin(np.pi * t / d) * .5, t0, .5, -.2)
    elif k == 'splash': add(fx, lp(noise(.8), 2500 + 3000 * e['v']) * np.exp(-tv(.8) / (.12 + .2 * e['v'])) * 1.0, t0, .7 * e['v'] + .2) ; add(fx, thud(70, .5), t0, .5 * e['v'], 0)
    elif k == 'clang': add(fx, cat(bell(660, 1.0, .8), wood(900, .1)), t0, .35, -.2)
    elif k == 'rumble': add(fx, lp(noise(4.5), 140) * np.sin(np.pi * tv(4.5) / 4.5) ** .6 * 1.6, t0, .7)
    elif k == 'thunder': add(fx, hp(noise(.12), 1500) * np.exp(-tv(.12) / .01) * 1.2, t0, .9); add(fx, lp(noise(2.4), 260) * np.exp(-tv(2.4) / .7) * 2.2, t0 + .02, .9)
    elif k == 'drip':
        t = tv(.25); f = (900 if e['deep'] else 1500) * (1 + 1.2 * t / .25); add(wet, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .05) * .6, t0, .4, rng.uniform(-.3, .3))
        add(fx, bell(2200, .15, .1), t0, 0)
    elif k == 'bloop':
        t = tv(.2); f = 200 + 700 * t / .2; add(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .06) * .5, t0, .2, -.4 + .4 * e['n'])
    elif k == 'squeak':
        if e.get('big'): add(fx, squeak(1000, .9, 1.0), t0, .9, 0); add(fx, squeak(1500, .9, .5), t0 + .02, .5, .2); add(wet, squeak(1000, .9, 1.0), t0, .3)
        else: add(fx, squeak(1500 if e.get('hi') else 1100, .35, 1.0), t0, .5, .3)
    elif k == 'wind': add(fx, lp(noise(1.2), 900) * np.sin(np.pi * tv(1.2) / 1.2) * 1.2, t0, .6)
    elif k == 'step': add(fx, cat(wood(140, .15, 1.0), thud(100, .2)), t0, .5, -.2)
    elif k == 'glup': t = tv(.4); f = 300 * np.exp(-t / .08) + 90; add(fx, cat(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .1) * 1.0, squeak(700, .25, .3)), t0, .9)
    elif k == 'shuk': add(fx, cat(lp(hp(noise(.2), 400), 4500) * np.exp(-tv(.2) / .06) * 1.0, thud(90, .2) * .7), t0, .55, rng.uniform(-.4, .4))
    elif k == 'thunk': add(fx, cat(wood(110, .4, 1.2), thud(70, .5)), t0, .9)
    elif k == 'chest': d = .6; t = tv(d); f = 200 + 400 * t / d; add(fx, bp(2 * ((np.cumsum(f) / SR) % 1) - 1, 300, 2500) * np.abs(np.sin(2 * np.pi * 17 * t)) ** 2 * np.sin(np.pi * t / d), t0, .5)
    elif k == 'sparkle': [add(fx, bell(mtof(m), 1.6, .5), t0 + i * .09, .22, -.5 + i * .17) for i, m in enumerate([86, 90, 93, 98, 102, 105])]; [add(wet, bell(mtof(m), 1.6, .5), t0 + i * .09, .12) for i, m in enumerate([86, 90, 93, 98])]
    elif k == 'laugh': add(fx, laugh(.7, 1.0, 170 + 40 * (e['n'] % 3)), t0, .7, -.5 + .2 * e['n'])
    elif k == 'pullout': d = e['d']; add(fx, cat(whoosh(d, 1.0, False) * .8, lp(noise(d), 600) * np.sin(np.pi * tv(d) / d) * .8), t0, .5)
    elif k == 'end': pass

# ------------------------------------------------------------------ beds
sea_env = win(21.6, 34.4, 1.2, .1) + win(36.0, 42.0, .3, 1.5) * .6 + win(41.8, 52.5, 1.2, 1.5) * .45
swell = .6 + .4 * np.sin(2 * np.pi * tt / 6.5)
sea_n = lp(noise(DUR), 500) * .06 * swell + lp(noise(DUR), 2200) * .02 * np.clip(swell, 0, 1) ** 2
rain = hp(lp(noise(DUR), 7000), 1200) * .035 * win(30.4, 34.4, .6, .1)
hush = lp(noise(DUR), 160) * .02 * win(34.5, 36.0, .2, .05) + np.sin(2 * np.pi * 61 * tt) * .008 * win(34.5, 36.0, .6, .02)   # a low hum under the held breath
gulls = 0
workshop = lp(noise(DUR), 400) * .012 * win(0, 22.5, 1, 1)
bath = (lp(noise(DUR), 900) * .012 + np.sin(2 * np.pi * 120 * tt) * .003) * win(53.5, 57.0, 1.5, .4)
bed = (sea_n * sea_env + rain + hush + workshop + bath)
bed = np.stack([bed, np.roll(bed, 120)], 1)

# ------------------------------------------------------------------ the jig: 6/8, D major, original tune. eighth = 0.25 s, bar = 1.5 s
E8, BARL = .25, 1.5
CH = {'D': (38, [50, 54, 57]), 'C': (36, [48, 52, 55]), 'G': (31, [43, 47, 50]), 'Bm': (35, [47, 50, 54]), 'A': (33, [45, 49, 52]), 'Dm': (38, [50, 53, 57]), 'Bb': (34, [46, 50, 53]), 'F': (29, [45, 48, 53])}
PROG = ['D', 'D', 'C', 'G', 'D', 'Bm', 'A', 'D']
TUNE = [[66, 69, 74, 69, 66, 69], [74, 76, 78, 76, 74, 69], [72, 76, 79, 76, 72, 76], [71, 74, 79, 74, 71, 74], [78, 76, 74, 69, 66, 69], [74, 71, 66, 71, 74, 78], [76, 73, 69, 73, 76, 81], [78, 74, None, 74, 69, None]]
def reed(f, d, v=1.0, pan=0):
    t = tv(d); x = sum(saw(f * (1 + dt), t) for dt in (-.004, 0, .005)) * .33
    x = lp(x, 2400, 2) * (1 + .12 * np.sin(2 * np.pi * 5.5 * t)); return x * np.clip(t / .03, 0, 1) * np.clip((d - t) / .06, 0, 1) * v
def fiddle(f, d, v=1.0):
    t = tv(d); fv = f * (1 + .006 * np.sin(2 * np.pi * 5.6 * t) * np.clip(t / .15, 0, 1)); ph = np.cumsum(fv) / SR; x = 2 * (ph % 1) - 1
    x = bp(x, 400, 5200) + hp(noise(d), 4000) * .03; return x * np.clip(t / .04, 0, 1) * np.clip((d - t) / .05, 0, 1) * v
def bassnote(f, d=.45, v=1.0): t = tv(d); return (np.sin(2 * np.pi * f * t) + .5 * np.sin(4 * np.pi * f * t) + .25 * np.sin(6 * np.pi * f * t)) * np.exp(-t / (d * .6)) * np.clip((d - t) / .03, 0, 1) * np.clip(t / .004, 0, 1) * v
def tuba(f, d=.4, v=1.0): t = tv(d); x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 9)); return lp(x, 900, 2) * np.clip(t / .03, 0, 1) * np.clip((d - t) / .05, 0, 1) * v
def stomp(v=1.0): return cat(thud(60, .3, 1.0) * v, wood(220, .08, .3) * v)
def tamb(v=1.0): d = .12; t = tv(d); return cat(hp(noise(d), 5000) * np.exp(-t / .03) * v, bell(6500, .15, .1) * v)
music = np.zeros((N, 2))
def bar_t(b): return b * BARL
def jig(b0, nbars, melody=True, acc=True, bass=True, drums=True, fid=1.0, oct_up=0, vel=1.0, mel_inst='fiddle', tuba_bass=False):
    for i in range(nbars):
        b = b0 + i; ch = PROG[(b - 6) % 8] if b >= 6 else PROG[i % 8]; root, notes = CH[ch]; t0 = bar_t(b)
        if bass:
            for e8 in (0, 3):
                (add(music, tuba(mtof(root if e8 == 0 else root + 7), .4, .9 * vel), t0 + e8 * E8, .35, -.2) if tuba_bass else add(music, bassnote(mtof(root if e8 == 0 else root + 7), .5, vel), t0 + e8 * E8, .5, -.2))
        if acc:
            for e8 in (1, 2, 4, 5):    # oom-pah-pah
                if e8 in (1, 2) or e8 in (4, 5): add(music, sum(reed(mtof(n + 12 * (e8 > 2 and 0)), E8 * .9, .3 * vel) for n in notes), t0 + e8 * E8, .24, .25)
        if melody:
            for k, m in enumerate(TUNE[(b - 6) % 8] if b >= 6 else TUNE[i % 8]):
                if m is None: continue
                m = m + 12 * oct_up; d = E8 * (1.9 if (k in (2, 5) and TUNE[(b - 6) % 8][k + 1 if k < 5 else 0] is None) else .95)
                add(music, (fiddle(mtof(m), d, .7 * fid) if mel_inst == 'fiddle' else reed(mtof(m), d, .8 * fid)), t0 + k * E8, .3, .0 + .15 * (k - 2) / 3)
        if drums:
            for e8 in (0, 3): add(music, stomp(vel), t0 + e8 * E8, .45)
            for e8 in (1, 2, 4, 5): add(music, tamb(.7 * vel), t0 + e8 * E8, .13, .4)
# 0-3: stomps and shouts of accordion
for i, e8 in enumerate([0, 3, 6, 8, 9, 10]): add(music, stomp(1), e8 * E8, .5)
for t0 in (0.0, 0.75, 1.5, 2.25): add(music, sum(reed(mtof(n), .55, .5) for n in (50, 54, 57, 62)), t0, .26)
# 3-9: sparse plucks (the chart): tune on a plucked string over a held reed
for i, b in enumerate(range(2, 6)):
    for k, m in enumerate(TUNE[i % 8]):
        if m: add(music, pluck(mtof(m), .5, .6), bar_t(b) + k * E8, .25, -.3 + .1 * k)
    if i % 2 == 0: add(music, reed(mtof(50), 2.8, .35) + reed(mtof(57), 2.8, .25), bar_t(b), .2)
for b in range(2, 6): add(music, bassnote(mtof(38), .6), bar_t(b), .35)
# 9-22.5 posters: the jig builds
jig(6, 3, melody=False, acc=True, bass=True, drums=True, vel=.8)
jig(9, 6, melody=True, vel=.9, fid=1.0)
# 22.5-30 sailing: the full jig, a register up
jig(15, 5, melody=True, vel=1.0, fid=1.1, oct_up=0)
# 30-34.5 storm: D minor drive, tremolo fiddle, a thump on every beat
for i in range(3):
    b = 20 + i; ch = ['Dm', 'Bb', 'F'][i]; root, notes = CH[ch]; t0 = bar_t(b)
    for e8 in range(6): add(music, bassnote(mtof(root + (12 if e8 % 2 else 0)), .3, .8), t0 + e8 * E8, .5)
    for k in range(12): add(music, fiddle(mtof(notes[k % 3] + 12), .12, .6), t0 + k * E8 / 2, .3, .2)
    for e8 in (0, 3): add(music, stomp(1.2), t0 + e8 * E8, .55)
# 34.5-36 silence (gate below); 36-42 the duck: pompous tuba oom-pah, then a lopsided waltz of joy
jig(24, 2, melody=False, acc=True, bass=True, drums=False, tuba_bass=True, vel=1.0)
for i, m in enumerate([62, 66, 69, 74, 69, 66, 62, 57]): add(music, tuba(mtof(m - 12), .35, 1.0), 36.0 + 2.25 + i * .375 * 0 + i * .375, .3, -.2)
jig(27, 1, melody=True, acc=True, bass=True, drums=True, vel=1.0, mel_inst='reed')
# 42-46: the island: pizzicato on minor, creeping
for i in range(8):
    for k, m in enumerate([62, 65, 69, 65][:4]):
        add(music, pluck(mtof(m), .4, .5), 42.0 + i * .75 + k * .1875 * 1, .22 + .0, .3 - .1 * k)
for b in range(28, 31): add(music, bassnote(mtof(38), .6, .8), bar_t(b), .35)
# 45.75 chord stab, sparkle
for m, a in [(50, 1), (57, .8), (62, .7), (66, .8), (69, .6), (74, .6)]: add(music, reed(mtof(m), 1.4, a * .6), 45.75, .24)
add(music, bassnote(mtof(38), 1.2, 1.0), 45.75, .6)
# 46.5-48: a deflating slide (the left sock)
t = tv(1.4); f = 520 * np.exp(-t * 0.7); add(music, bp(2 * ((np.cumsum(f) / SR) % 1) - 1, 300, 3000) * np.clip((1.4 - t) / .3, 0, 1) * .6, 46.5, .22)
# 48-52.5 the feast: everything, a register up
jig(32, 3, melody=True, vel=1.15, fid=1.2, oct_up=1)
# 52.5-55.5: slow reed pad, the camera rising
for i, (b, ch) in enumerate([(35, 'D'), (36, 'G'), (37, 'D')]):
    root, notes = CH[ch]
    add(music, sum(reed(mtof(n), 1.6, .5) for n in notes), bar_t(b), .22)
    add(music, bassnote(mtof(root), 1.2, .8), bar_t(b), .3)
for k, m in enumerate([74, 78, 81, 78]): add(music, pluck(mtof(m), .8, .6), 52.5 + k * 0.75, .2, .3)
# 57.0: the last chord
for m, a in [(38, 1), (50, 1), (57, .9), (62, .8), (66, .8), (69, .7), (74, .6)]: add(music, reed(mtof(m), 3.0, a * .6), 57.0, .26)
add(music, fiddle(mtof(78), 2.6, .8), 57.0, .22, .2); add(music, stomp(1.2), 57.0, .6); add(music, bassnote(mtof(26), 2.5, 1.0), 57.0, .6); add(music, tamb(1.0), 57.0, .2)
# the silences: the held breath before the duck, and the drip before the last chord
gate = np.ones(N)
for a, b in [(34.5, 36.0), (55.5, 57.0)]: gate *= 1 - np.clip(np.minimum((tt - a) / .05, (b - tt) / .02), 0, 1) * ((tt > a) & (tt < b))
music *= gate[:, None]
# music is quieter in the posters' voice zones and under ducks: set below with the voice envelope
irm = lp(noise(1.6), 4000) * np.exp(-tv(1.6) / .45); irm /= np.sqrt((irm ** 2).sum())
music = music + np.stack([fftconvolve(music[:, c], irm * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .06
# the drip room (tile room reverb) for 'wet'
irw = lp(noise(2.2), 6000) * np.exp(-tv(2.2) / .8); irw /= np.sqrt((irw ** 2).sum())
wetr = np.stack([fftconvolve(wet[:, c], irw * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .9

# ------------------------------------------------------------------ voice
voice = np.zeros((N, 2)); vo = np.zeros(N)
for v in VO:
    x, sr = sf.read(os.path.join(HERE, 'voices', v['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64); x = hp(x, 80, 2)
    x = sfx.compress(x / np.abs(x).max(), .2, 3.5, .004, .09); x /= np.abs(x).max()
    add(voice, x, v['t'], .9, 0); add(wet, x, v['t'], .02)
    i0 = int(v['t'] * SR); vo[i0:i0 + len(x)] = 1
vo = uniform_filter1d(maximum_filter1d(vo, size=int(.3 * SR)), size=int(.2 * SR))
# ------------------------------------------------------------------ mix
duck_ = (1 - .45 * vo[:, None])
mix = fx * 1.6 * (1 - .25 * vo[:, None]) + wetr * 1.0 + bed * 8.0 + music * .34 * duck_ + voice * 1.0
sf.write(os.path.join(HERE, 'out', 'premix.wav'), mix.astype(np.float32), SR)
out = np.zeros_like(mix)
for c in (0, 1):
    x = sfx.compress(mix[:, c], .22, 3.0, .004, .12); k = .3; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .3, .005)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav', DUR, 's | rms dB: fx %.1f music %.1f voice %.1f bed %.1f mix %.1f peak %.2f' % (rms(fx), rms(music), rms(voice[voice != 0]), rms(bed), rms(out), np.abs(out).max()))
if os.environ.get('DIAG'):
    for a in range(0, int(DUR), 3):
        s = slice(a * SR, (a + 3) * SR); print('%3d fx %6.1f music %6.1f voice %6.1f bed %6.1f out %6.1f' % (a, rms(fx[s]), rms(music[s]), rms(voice[s]), rms(bed[s]), rms(out[s])))
