"""Foley, score and voice -> mix.wav for "Round One: The Jar" (shonen battle). Everything is synthesised in numpy (no samples).
Reads timeline.json (tools/export_tl.mjs) and voices/. The score is original: taiko, brass stabs, a pulse bass, a music box.
usage: .venv/bin/python styles/shonen-battle/demo/mix.py
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

TL = json.load(open(os.path.join(HERE, 'timeline.json')))
EV, VO, DUR, BEAT = TL['EV'], TL['VO'], TL['DUR'], TL['BEAT']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(87)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def win(a, b, fa=.05, fb=.05): return np.clip((tt - a) / fa, 0, 1) * np.clip((b - tt) / fb, 0, 1)
def nrm(x): m = np.abs(x).max(); return x / m if m > 0 else x

# ----------------------------------------------------------------- instruments
def taiko(v=1.0, f=62, d=1.2):
    t = tv(d); ph = 2 * np.pi * np.cumsum(f * (1 + 1.1 * np.exp(-t / .05))) / SR
    x = np.sin(ph) * np.exp(-t / .26) + .35 * np.sin(2.3 * ph) * np.exp(-t / .09)
    x += lp(noise(d), 700) * np.exp(-t / .02) * .5 + hp(noise(d), 2500) * np.exp(-t / .004) * .25
    return x * v * np.clip(t / .002, 0, 1)
def brass(f, d=1.0, v=1.0, swell=.12, vib=0):
    t = tv(d); env = np.clip(t / swell, 0, 1) ** .8 * np.clip((d - t) / .12, 0, 1)
    fi = f * (1 + vib * .006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / .4, 0, 1))
    x = 0
    for det in (-.004, 0, .004):
        ph = 2 * np.pi * np.cumsum(fi * (1 + det)) / SR
        x = x + sum(np.sin(k * ph) / k ** .9 for k in range(1, 14))
    cut = 500 + 3200 * np.clip(t / (swell * 3 + .05), 0, 1) ** .7
    # time-varying brightness by crossfading two filtered versions
    a, b = lp(x, 700, 2), lp(x, 3800, 2); m = np.clip((cut - 700) / 3100, 0, 1)
    return (a * (1 - m) + b * m) * env * v * .25
def bassn(f, d=.5, v=1.0):
    t = tv(d); env = np.clip(t / .008, 0, 1) * np.exp(-t / (d * .7)) * np.clip((d - t) / .03, 0, 1)
    return (np.sin(2 * np.pi * f * t) + .5 * np.sin(4 * np.pi * f * t) + .25 * np.sin(6 * np.pi * f * t) + .12 * np.tanh(3 * np.sin(2 * np.pi * f * t))) * env * v
def mbox(f, d=1.6, v=1.0):   # music box / glass bell
    t = tv(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t + .3 * k) * np.exp(-t / (tau)) for k, (m, a, tau) in enumerate([(1, 1, .7), (2.76, .3, .25), (5.4, .12, .1), (8.9, .05, .05)]))
    x += hp(noise(d), 4000) * np.exp(-t / .004) * .06
    return x * v * np.clip(t / .001, 0, 1)
def padn(fs, d, v=1.0, a=1.0, r=1.2, cutoff=1300):
    t = tv(d); env = np.clip(t / a, 0, 1) * np.clip((d - t) / r, 0, 1); x = 0
    for f in fs:
        for dt in (-.6, 0, .7):
            x = x + ((2 * (((f + dt) * t) % 1) - 1) * .35 + np.sin(2 * np.pi * (f + dt) * t) * .4)
    return lp(x, cutoff, 2) * env * v / len(fs)

# ----------------------------------------------------------------- one-shot sounds (each returns mono)
def kiai(d, f0=300, v=1.0, vowel='a'):
    t = tv(d); f = f0 * (1 + .25 * np.clip(t / (d * .3), 0, 1) - .12 * np.clip((t - d * .6) / (d * .4), 0, 1)) * (1 + .02 * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = sum(np.sin(k * ph) / k ** .7 for k in range(1, 22)) + noise(d) * .25
    F = {'a': (850, 1250, 2900), 'o': (520, 900, 2700), 'e': (600, 1900, 2800)}[vowel]
    x = sum(g * bp(src, fr * .88, fr * 1.12, 2) for fr, g in zip(F, (1, .7, .35)))
    env = np.clip(t / .03, 0, 1) * np.clip((d - t) / .12, 0, 1) * (1 + .3 * np.exp(-t / .1))
    return np.tanh(nrm(x) * env * 1.8) * v
def slam(v=1.0):
    d = 1.0; t = tv(d); ph = 2 * np.pi * np.cumsum(70 * (1 + 1.4 * np.exp(-t / .04))) / SR
    x = np.sin(ph) * np.exp(-t / .2) + hp(noise(d), 1800) * np.exp(-t / .012) * .8 + bp(noise(d), 300, 1800) * np.exp(-t / .05) * .5
    x += (np.sin(2 * np.pi * 1850 * t) * .2 + np.sin(2 * np.pi * 2760 * t) * .12) * np.exp(-t / .15)
    return nrm(x) * v
def boom(v=1.0):
    d = 1.6; t = tv(d); ph = 2 * np.pi * np.cumsum(38 * (1 + 2.4 * np.exp(-t / .1))) / SR
    x = np.sin(ph) * np.exp(-t / .24) + lp(noise(d), 500) * np.exp(-t / .12) * .7 + hp(noise(d), 1500) * np.exp(-t / .04) * .6
    x += lp(brown(d), 160) * np.exp(-t / .3) * .6
    return nrm(x) * np.clip(t / .001, 0, 1) * v
def brown(d):
    w = np.cumsum(noise(d)); w -= np.linspace(w[0], w[-1], len(w)); return nrm(hp(w, 20))
def ting(v=1.0):
    d = 1.4; t = tv(d); x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in [(3136, 1, .5), (4698, .5, .3), (6272, .3, .2), (7900, .15, .1)])
    return nrm(x) * v
def tink(v=1.0):   # spoon on glass and steel: small, bright
    d = 1.6; t = tv(d); x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in [(2410, 1, .35), (3770, .6, .22), (5320, .35, .14), (1240, .4, .5)])
    x += hp(noise(d), 3000) * np.exp(-t / .002) * .5
    return nrm(x) * v
def tap(v=1.0):    # wooden spoon on a lid: tok, and the glass answering
    d = .5; t = tv(d); x = bp(noise(d), 900, 2400) * np.exp(-t / .008) + np.sin(2 * np.pi * 760 * t) * np.exp(-t / .03) * .8 + (np.sin(2 * np.pi * 2900 * t) * .3 + np.sin(2 * np.pi * 4100 * t) * .2) * np.exp(-t / .12)
    return nrm(x) * v
def drip(v=1.0):
    d = .5; t = tv(d); f = 1500 * np.exp(-t / .05) + 480
    return nrm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .07) * (t > 0)) * v
def hiss(d=.7, v=1.0):
    t = tv(d); env = np.clip(t / .12, 0, 1) * np.clip((d - t) / .15, 0, 1) * (1 + .4 * np.sin(2 * np.pi * 11 * t))
    return nrm(hp(noise(d), 3500) * env + bp(noise(d), 1200, 3000) * env * .2) * v
def popc(v=1.0):
    d = .5; t = tv(d); f = 260 + 700 * np.clip(t / .035, 0, 1)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .03) + bp(noise(d), 500, 3000) * np.exp(-t / .012) * .8 + np.sin(2 * np.pi * 165 * t) * np.exp(-t / .12) * .6
    return nrm(x) * v
def gulp(v=1.0):
    d = .4; t = tv(d); f = 220 * np.exp(-t / .09) + 70
    return nrm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .1) + bp(noise(d), 200, 900) * np.exp(-t / .02) * .5) * v
def swish(d=.16, v=1.0):
    t = tv(d); n = bp(noise(d), 2500, 9000, 2) * np.sin(np.pi * t / d) ** 2
    return nrm(n) * v
def tickc(k):
    d = .08; t = tv(d); f = 1250 if k % 2 == 0 else 1000
    return nrm(hp(noise(d), 2000) * np.exp(-t / .002) + np.sin(2 * np.pi * f * t) * np.exp(-t / .012) * .6)
def crackc(v=1.0):
    d = .9; t = tv(d); x = hp(noise(d), 2000) * np.exp(-t / .006) + lp(noise(d), 300) * np.exp(-t / .12) * 1.1 + np.sin(2 * np.pi * 55 * t) * np.exp(-t / .2) * .9
    for _ in range(9):
        s = int(rng.random() * .5 * SR); L = int(.05 * SR); x[s:s + L] += hp(noise(.05), 1200) * np.exp(-tv(.05) / .008) * (.2 + .4 * rng.random())
    return nrm(x) * v
def landc(v=1.0):   # a lid spinning down on a counter
    out = np.zeros(int(1.6 * SR)); t0 = 0.0; gap = .22; k = 0
    while t0 < 1.45 and gap > .012:
        tk = tv(.12); x = (np.sin(2 * np.pi * (1500 + 400 * rng.random()) * tk) * .5 + np.sin(2 * np.pi * 3200 * tk) * .3) * np.exp(-tk / .03) + hp(noise(.12), 3000) * np.exp(-tk / .003) * .4
        s = int(t0 * SR); out[s:s + len(x)] += x * (1 - t0 / 1.6) ; gap *= .78; t0 += gap; k += 1
    return nrm(out) * v
def charge(d, v=1.0):
    t = tv(d); u = t / d; f = 55 * 2 ** (u * 3.2)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + .5 * np.sin(2 * ph) + .3 * np.sin(3 * ph)) * (.15 + .85 * u ** 1.6)
    x += bp(noise(d), 800, 6000) * (u ** 2.4) * .5
    # a flutter of tremolo, faster as it builds
    x *= 1 + .35 * np.sin(2 * np.pi * np.cumsum(4 + 24 * u ** 2) / SR)
    return nrm(x) * np.clip(t / .5, 0, 1) * v

# ----------------------------------------------------------------- hall for the wet bus
irn = int(2.0 * SR); irx = np.arange(irn) / SR
ir = lp(noise(2.0), 5500) * np.exp(-irx / .55); ir[:int(.012 * SR)] = 0; k0, k1 = int(.012 * SR), int(.03 * SR); ir[k0:k1] *= np.linspace(0, 1, k1 - k0); ir /= np.sqrt((ir ** 2).sum())
def hall(x): return np.stack([fftconvolve(x[:, c], ir * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1)

fx = np.zeros((N, 2)); wet = np.zeros((N, 2)); music = np.zeros((N, 2)); voicebus = np.zeros((N, 2)); shout = np.zeros((N, 2))
# ----------------------------------------------------------------- events -> foley
for e in EV:
    k, t0 = e['type'], e['t']; v = e.get('v', 1.0)
    if k == 'cut':
        if e['shot'] in ('swing', 'hush', 'fist', 'lids', 'smile', 'floor', 'end', 'slump', 'charge'): continue
        add(fx, swish(.2, .5), t0 - .06, .22, rng.uniform(-.5, .5))
    elif k == 'tick': add(fx, tickc(int(t0)), t0, .16, -.1)
    elif k == 'ting': add(fx, ting(.6), t0, .22, .3); add(wet, ting(.6), t0, .15, .3)
    elif k == 'slam': add(fx, slam(.9), t0, .55); add(wet, slam(.6), t0, .35)
    elif k == 'boom':
        add(fx, boom(.9 * min(v, 1.2)), t0, .9); add(wet, boom(.5), t0, .5)
        add(fx, hp(noise(.8), 600) * np.exp(-tv(.8) / .18), t0, .3 * v)
    elif k == 'creak':
        for i in range(5): add(fx, sfx.creak(.5), t0 + i * .22, .22 + .05 * i, rng.uniform(-.3, .3))
        add(fx, lp(brown(1.2), 140) * np.sin(np.pi * tv(1.2) / 1.2) ** 2, t0, .5)
    elif k == 'kiai': add(shout, kiai(e['d'], 300, v, 'a'), t0, .8); add(wet, kiai(e['d'], 300, v, 'a'), t0, .2)
    elif k == 'sigh':
        d = .8; t = tv(d); x = bp(noise(d), 500, 2200) * np.clip(t / .08, 0, 1) * np.exp(-t / .3); add(fx, nrm(x), t0, .35)
    elif k == 'aura': add(fx, lp(noise(.9), 2500) * np.clip(tv(.9) / .9, 0, 1) ** 2, t0, .6); add(fx, sfx.ignite(.8), t0 + .1, .7)
    elif k == 'crack': add(fx, crackc(v), t0, .6 * v, rng.uniform(-.5, .5)); add(wet, crackc(v), t0, .25 * v)
    elif k == 'debris':
        for i in range(10): add(fx, sfx.clack(.6 + rng.random() * .6, .4), t0 + i * rng.uniform(.03, .09), .35, rng.uniform(-.8, .8))
    elif k == 'rumble': add(fx, sfx.rumble(1.6, 1.0), t0, .5)
    elif k == 'drip': add(fx, drip(.7), t0, .3, .2); add(wet, drip(.7), t0, .3, .2)
    elif k == 'tap': add(fx, tap(.8), t0, .5, -.1); add(wet, tap(.8), t0, .2)
    elif k == 'airhint': add(fx, hiss(.35, .6), t0, .18)
    elif k == 'whoosh': add(fx, sfx.whoosh(.7, 1.0), t0 - .1, .6)
    elif k == 'grab': add(fx, sfx.clack(1.3, .8), t0, .6); add(fx, swish(.12, .8), t0 - .05, .4); add(fx, sfx.thump(.7, 90), t0, .5)
    elif k == 'swish': add(fx, swish(.14, 1.0), t0 - .02, .8)
    elif k == 'tink': add(fx, tink(.7), t0, .5, .3); add(wet, tink(.7), t0, .35, .3)
    elif k == 'hiss': add(fx, hiss(e['d'], .8), t0, .5)
    elif k == 'pop': add(fx, popc(1.0), t0, .8); add(wet, popc(1.0), t0, .5)
    elif k == 'sparkle':
        for i, m in enumerate([88, 93, 96, 100, 105]): add(fx, mbox(mtof(m), .9, .8), t0 + i * .07, .12, -.5 + i * .25); add(wet, mbox(mtof(m), .9, .8), t0 + i * .07, .1)
    elif k == 'land': add(fx, landc(.8), t0, .35, .2)
    elif k == 'gulp': add(fx, gulp(.9), t0, .55); add(wet, gulp(.9), t0, .2)
    elif k == 'charge':
        add(fx, charge(e['d'], 1.0), t0, .38)
    elif k == 'sting': add(fx, slam(.8), t0, .6)

# ----------------------------------------------------------------- beds: the kitchen's fridge hum and light buzz, dropped out in the fight
hum = sum(a * np.sin(2 * np.pi * 50 * kk * tt + kk) for kk, a in zip((1, 2, 3, 4, 6), (1, .6, .25, .12, .06))) * .02
air = lp(noise(DUR), 500) * .02
bed_env = 1 - win(14.0, 24.6, .6, .6) * .7 - win(34.0, 43.4, 1.0, .05) * .7 - win(46.0, 47.0, .1, .5) * .0
bed_env = np.clip(bed_env, 0.15, 1) * (1 - win(43.4, 44.2, .02, .02))
bed = np.stack([(hum + air) * bed_env] * 2, 1)
bed[:int(.4 * SR)] *= 0

# ----------------------------------------------------------------- score (A minor, 120 BPM)
A = lambda m: mtof(m)
def groove(t0, t1, root=33, step=None, vel=1.0, taik=True, hat=True):
    """pulse bass in eighths, taiko on 1 and 3, hat ticks; one bar = 2.0 s"""
    t = t0; i = 0
    while t < t1 - 1e-6:
        beat = (t - t0) / BEAT
        r = root + [0, 0, 12, 0, 0, 7, 0, 12][int(round(beat * 2)) % 8] * 0
        pat = [0, 0, 12, 0, 0, 0, 7, 3]
        n = root + pat[int(round(beat * 2)) % 8]
        add(music, bassn(mtof(n), BEAT * .45, vel), t, .5)
        i += 1; t += BEAT / 2
    if taik:
        t = t0
        while t < t1 - 1e-6:
            b = int(round((t - t0) / BEAT)) % 4
            if b in (0, 2): add(music, taiko(.9 * vel, 62 if b == 0 else 70), t, .55, -.1)
            if b == 3: add(music, taiko(.45 * vel, 80, .5), t + BEAT / 2, .3, .2)
            t += BEAT
    if hat:
        t = t0
        while t < t1 - 1e-6:
            add(music, hp(noise(.05), 6000) * np.exp(-tv(.05) / .01), t + BEAT / 2, .05 * vel, .3); t += BEAT
# 0-4.5: nothing but the room; a low swell under the jar
add(music, np.sin(2 * np.pi * 36.7 * tv(2.6)) * np.sin(np.pi * tv(2.6) / 2.6) ** 1.5, 2.3, .22)
# 5.0 the title: brass stab on Am, then the groove from the face-off
for m in (45, 52, 57, 60, 64): add(music, brass(mtof(m), 2.0, 1.0, .02), 5.0, .22, (m - 55) / 30)
add(music, padn([mtof(45), mtof(52), mtof(57)], 3.2, .6, .5, 1.5), 5.0, .22)
groove(8.0, 14.0, 33, vel=.8)
# brass riff under the face-off: A C E D | C A G A
riff = [(0, 57, 1), (1, 60, 1), (2, 64, 1.5), (3.5, 62, .5), (4, 60, 1), (5, 57, 1), (6, 55, 1), (7, 57, 1)]
for bar0 in (10.0, 12.0):
    for b, m, d in riff: add(music, brass(mtof(m), d * BEAT * .9, .7, .03), bar0 + b * BEAT, .13, .2)
# 14-19: round one: a drone, a slow heart, tension strings
add(music, padn([mtof(33), mtof(40)], 3.2, .8, .4, .6, 600), 14.0, .3)
for i in range(8): add(music, taiko(.55, 52, .8), 14.5 + i * 0.5 * (1 if i < 4 else 1), .4 * (0.5 + i / 10))
add(music, padn([mtof(57), mtof(58), mtof(64)], 1.6, .7, 1.1, .1, 2200), 15.0, .18)
add(music, brass(mtof(45), 1.0, .8, .6), 16.1, .12)
add(music, np.sin(2 * np.pi * 33 * tv(2.4)) * np.exp(-tv(2.4) / 1.2), 17.0, .15)
# 19-25: round two: the power-up. riser, a wall of drums, the riff an octave up
add(music, nrm(lp(noise(.8), 6000) * np.clip(tv(.8) / .8, 0, 1) ** 2), 19.0, .2)
for m in (45, 52, 57, 60, 65): add(music, brass(mtof(m), 3.2, 1.0, .02), 19.8, .2, (m - 55) / 30)
add(music, taiko(1.2, 55, 1.6), 19.8, .8)
groove(20.0, 22.4, 41, vel=1.0)
for b, m, d in [(0, 69, 1), (1, 72, 1), (2, 76, 1.5), (3.5, 74, .5), (4, 72, 1), (5, 69, 1)]: add(music, brass(mtof(m), d * BEAT * .9, .7, .03), 20.0 + b * BEAT, .11, -.2)
groove(22.4, 24.9, 33, vel=.7, taik=False)
# 25-28 silence (the gate below also cuts any tail)
# 28-34: the flashback: a music box lullaby over a warm pad (C major leaning)
mel = [(0, 76), (1, 79), (2, 81), (3, 79), (4, 76), (5, 74), (6, 72), (7, 74), (8, 76), (9, 79), (10, 81), (11, 84), (12, 81), (13, 79), (14, 76), (16, 72)]
for b, m in mel: add(music, mbox(mtof(m), 1.8, 1.0), 28.0 + b * BEAT * 1.0, .28, -.2 + .1 * ((b % 4) - 1))
add(music, padn([mtof(48), mtof(55), mtof(64), mtof(67)], 6.4, .6, 1.2, 1.2, 1000), 28.0, .2)
# 34-44: the charge: a heartbeat that accelerates, a drone, brass swells; hard stop at 43.4
t = 34.0; gap = 1.0
while t < 43.4:
    add(music, taiko(.55 + .5 * (t - 34) / 9.4, 50, .7), t, .5)
    gap = max(.11, 1.0 * (1 - (t - 34) / 9.6) ** 1.35 + .1); t += gap
add(music, padn([mtof(33), mtof(40)], 10.0, .9, 1.5, .1, 700), 34.0, .35)
add(music, brass(mtof(45), 4.5, .8, 1.5), 38.5, .15); add(music, brass(mtof(52), 4.5, .8, 1.5), 38.5, .12)
add(music, brass(mtof(48), 2.5, .9, 1.2), 41.0, .13); add(music, brass(mtof(57), 2.5, .9, 1.2), 41.0, .12)
# 46: after the pop: the theme, major and warm
for m in (48, 55, 60, 64, 67, 72): add(music, brass(mtof(m), 1.8, .8, .04), 46.1, .13, (m - 60) / 30)
add(music, taiko(.8, 70, 1.0), 46.1, .4)
mel2 = [(0, 76), (1, 79), (2, 84), (3, 81), (4, 79), (5, 76), (6, 79), (7, 84), (8, 88), (10, 84)]
for b, m in mel2: add(music, mbox(mtof(m), 1.8, 1.0), 48.0 + b * BEAT, .26, .1 + .05 * (b % 3))
add(music, padn([mtof(48), mtof(55), mtof(64), mtof(67)], 5.0, .7, 1.0, 1.2, 1400), 47.2, .2)
for i, m in enumerate([36, 43, 36, 43, 41, 48, 41, 48]): add(music, bassn(mtof(m), .7, .8), 48.0 + i * BEAT * 1.0, .28)
# 52-57: the gag: walking pizzicato until the question; then nothing
walk = [36, 40, 43, 40, 38, 41, 45, 41, 36, 40, 43, 47]
for i, m in enumerate(walk):
    tn = 52.0 + i * BEAT
    if tn < 53.5: add(music, bassn(mtof(m), .25, .9), tn, .3)
# 57.3: the cliff-hanger stab
for m in (33, 45, 52, 57, 60, 64): add(music, brass(mtof(m), 2.6, 1.0, .02), 57.3, .22, (m - 55) / 30)
add(music, taiko(1.2, 52, 1.8), 57.3, .8)

# ----------------------------------------------------------------- gates: silences are scored
gate = np.ones(N)
for a, b in [(24.95, 28.0), (43.4, 44.1), (44.3, 45.9)]: gate *= 1 - win(a, b, .03, .02) * 1.0
music *= gate[:, None]
hush_fx = 1 - win(24.95, 28.0, .03, .02) * 0 - win(43.4, 44.0, .02, .02)
fx *= np.where(((tt > 43.4) & (tt < 44.0)), 0.0, 1.0)[:, None]
wet *= np.where(((tt > 43.4) & (tt < 44.0)), 0.0, 1.0)[:, None]
music_w = hall(music) * .22

# ----------------------------------------------------------------- voice
voice = np.zeros((N, 2)); vo = np.zeros(N)
for v in VO:
    x, sr = sf.read(os.path.join(HERE, 'voices', v['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64); x = hp(x, 80, 2)
    x = sfx.compress(x / np.abs(x).max(), .2, 3.5, .004, .09); x /= np.abs(x).max()
    if v['who'] == 'gran': x = lp(x, 6500, 2)
    add(voice, x, v['t'], .9, 0); add(wet, x, v['t'], .05)
    i0 = int(v['t'] * SR); vo[i0:i0 + len(x)] = 1
vo = uniform_filter1d(maximum_filter1d(vo, size=int(.35 * SR)), size=int(.2 * SR))
wetr = hall(wet) * .8

# ----------------------------------------------------------------- mix
D = lambda g: (1 - g * vo[:, None])
mix = (fx * 1.0 * D(.25) + shout * 1.1 + wetr * .7 + bed * 1.6 + music * .55 * D(.45) + music_w * .55 + voice * 1.0)
sf.write(os.path.join(HERE, 'out', 'premix.wav'), mix.astype(np.float32), SR)
out = np.zeros_like(mix)
for c in (0, 1):
    x = sfx.compress(mix[:, c], .13, 4.0, .003, .1); k = .2; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .2, .005)
sf.write(os.path.join(HERE, 'mix.wav'), out.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav', DUR, 's | rms dB: fx %.1f shout %.1f music %.1f voice %.1f bed %.1f mix %.1f peak %.2f' % (rms(fx), rms(shout), rms(music), rms(voice[voice != 0]), rms(bed), rms(out), np.abs(out).max()))
if os.environ.get('DIAG'):
    print('  t   fx   music voice  bed  mix')
    for a in range(0, int(DUR), 3):
        s = slice(a * SR, (a + 3) * SR)
        print('%3d %6.1f %6.1f %6.1f %6.1f %6.1f' % (a, rms(fx[s]), rms(music[s]), rms(voice[s]), rms(bed[s]), rms(out[s])))
