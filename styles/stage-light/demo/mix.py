"""Score, foley and crowd -> mix.wav for "Second Sunrise" (stage-light demo).
Everything is synthesised in numpy (no samples). The music is the arrangement in score.json (score.py); the foley is
placed from events.json (core/render/events.mjs), so every light cue has its sound on the same frame.
usage: .venv/bin/python styles/stage-light/demo/mix.py
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, bp, lp, hp

S = json.load(open(os.path.join(HERE, 'score.json')))
EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
DUR = S['dur']; BEAT = S['beat']; N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(90)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((np.asarray(m, float) - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def new(): return np.zeros((N, 2))
def saw(f, d, ph0=None):
    os_ = 2; n = int(round(d * SR)) * os_
    ph = ((np.arange(n) * f / (SR * os_)) + (rng.random() if ph0 is None else ph0)) % 1
    x = soxr.resample(2 * ph - 1, SR * os_, SR)
    m = int(round(d * SR)); return x[:m] if len(x) >= m else np.pad(x, (0, m - len(x)))
def adsr(d, a, dec, sus, rel):
    t = tv(d); e = np.minimum(t / max(a, 1e-4), 1) * (sus + (1 - sus) * np.exp(-t / max(dec, 1e-4)))
    return e * np.clip((d - t) / max(rel, 1e-4), 0, 1)
def plp(x, f_start, f_end, tau):                       # decaying low-pass sweep done as a few blended fixed filters
    t = tv(len(x) / SR); out = np.zeros_like(x); fs = np.geomspace(f_start, f_end, 4)
    wts = [np.exp(-t / tau * (3 - i) * .0 - 0) for i in range(4)]
    k = np.exp(-t / tau)
    ys = [lp(x, f, 2) for f in fs]
    # blend from the brightest to the darkest filter as the note decays
    pos = (1 - k) * 3
    for i in range(4):
        w = np.clip(1 - np.abs(pos - i), 0, 1); out += ys[i] * w
    return out

# ----------------------------------------------------------------- reverb and delay
def make_ir(rt, dark=6000):
    n = int(rt * SR); t = np.arange(n) / SR
    ir = [lp(rng.standard_normal(n), dark) * np.exp(-t / (rt / 5.5)) for _ in range(2)]
    k = int(.02 * SR); [i.__setitem__(slice(0, k), i[:k] * np.linspace(0, 1, k)) for i in ir]
    return [i / np.sqrt((i ** 2).sum()) for i in ir]
IR = make_ir(2.2)
def reverb(buf, wet=1.0):
    return np.stack([fftconvolve(buf[:, c], IR[c])[:N] for c in (0, 1)], 1) * wet
def pingpong(buf, dt, fb=.38, n=4):
    out = np.zeros_like(buf); d = int(dt * SR)
    for k in range(1, n + 1):
        sh = d * k; g = fb ** k
        if sh >= N: break
        if k % 2: out[sh:, 0] += buf[:N - sh, 1] * g; out[sh:, 1] += buf[:N - sh, 0] * g
        else: out[sh:, 0] += buf[:N - sh, 0] * g; out[sh:, 1] += buf[:N - sh, 1] * g
    return out

# ----------------------------------------------------------------- drums
def kick(v):
    d = .45; t = tv(d); f = 48 + 90 * np.exp(-t / .03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .16) + hp(noise(d), 2500) * np.exp(-t / .004) * .25
    return x * v
def snare(v):
    d = .35; t = tv(d)
    x = bp(noise(d), 1500, 9000) * np.exp(-t / .09) * .8 + np.sin(2 * np.pi * 185 * t) * np.exp(-t / .07) * .6 + np.sin(2 * np.pi * 330 * t) * np.exp(-t / .04) * .3
    return x * v
def hat(v, open_=False):
    d = .5 if open_ else .07; t = tv(d); x = hp(noise(d), 7000) * np.exp(-t / (.16 if open_ else .017)); return x * v * .5
def crash(v):
    d = 3.0; t = tv(d); x = hp(noise(d), 3500) * np.exp(-t / .9) + bp(noise(d), 6000, 12000) * np.exp(-t / 1.4) * .6; x *= np.minimum(t / .004, 1); return x * v * .5
def tom(f, v):
    d = .5; t = tv(d); fr = f * (1 + .6 * np.exp(-t / .05)); x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / .2) + hp(noise(d), 2000) * np.exp(-t / .005) * .2; return x * v
def stickc(v):
    d = .05; t = tv(d); return (bp(noise(d), 2500, 6000) * np.exp(-t / .004) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t / .008) * .6) * v
def rimshot(v):
    d = .08; t = tv(d); return (np.sin(2 * np.pi * 900 * t) * np.exp(-t / .012) + bp(noise(d), 1500, 5000) * np.exp(-t / .008)) * v * .5

drums = new(); dwet = new()
for t0, v in S['kick']: add(drums, kick(v), t0, .72)
for t0, v in S['snare']: add(drums, snare(v), t0, .6, -.1); add(dwet, snare(v), t0, .35, -.1)
for t0, v in S['hat']: add(drums, hat(v), t0, .6, .25)
for t0, v in S['ohat']: add(drums, hat(v, True), t0, .5, .3)
for t0, v in S['crash']: add(drums, crash(v), t0, .7, .1); add(dwet, crash(v), t0, .3, .1)
for t0, f, v in S['tom']: add(drums, tom(f, v), t0, .6, (-.4 if f > 140 else .4)); add(dwet, tom(f, v), t0, .2)
for t0 in S['stick']: add(drums, stickc(1.0), t0, .6)
for t0, v in S['rim']: add(drums, rimshot(v), t0, .5, .3)

# sidechain duck from the kick (drop and finale pump)
duck = np.ones(N)
for t0, v in S['kick']:
    if not (24 <= t0 < 40 or 48 <= t0 < 57): continue
    i = int(t0 * SR); n = int(.4 * SR); seg = 1 - .6 * np.exp(-np.arange(n) / (.14 * SR)); duck[i:i + n] = np.minimum(duck[i:i + n], seg[:max(0, min(n, N - i))])

# ----------------------------------------------------------------- tonal parts
bass = new(); pads = new(); arps = new(); leads = new(); gtrs = new(); eps = new(); stabs = new(); bells = new()
for t0, m, d, v in S['bass']:
    f = float(mtof(m)); x = lp(saw(f, d + .05), 700) * .6 + np.sin(2 * np.pi * f * tv(d + .05)) * .8 + np.sin(2 * np.pi * 2 * f * tv(d + .05)) * .18
    add(bass, x * adsr(d + .05, .005, .25, .75, .04), t0, v * .36)
for t0, notes, d, v in S['pad']:
    x = 0
    for m in notes:
        for dt in (-.4, 0, .5):
            x = x + saw(float(mtof(m)) + dt, d) * .3
    x = lp(x, 1500) * adsr(d, .7, 9, 1, .7)
    add(pads, x, t0, v * .22, 0)
for t0, m, d, v in S['arp']:
    f = float(mtof(m)); dd = max(d, .5); x = (saw(f, dd) + saw(f * 1.005, dd) * .7); x = plp(x, 6000, 1200, .12) * np.exp(-tv(dd) / .22)
    add(arps, x, t0, v * .42, ((m * 7) % 11) / 11 * 1.2 - .6)
for t0, m, d, v in S['lead']:
    f = float(mtof(m)); dd = d + .12; t = tv(dd); vib = 1 + .006 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - .25) / .3, 0, 1)
    ph = np.cumsum(f * vib) / SR; x = 0
    for k, a in ((1, 1), (2, .5), (3, .33), (4, .25), (5, .2), (6, .16), (8, .12)):
        x = x + a * np.sin(2 * np.pi * k * ph + k * .3)
    x = lp(x + saw(f * 1.004, dd) * .5, 5200) * adsr(dd, .012, 1, .85, .1)
    add(leads, x, t0, v * .55, .05)
for t0, notes, d, v in S['gtr']:
    x = 0
    for m in notes: x = x + saw(float(mtof(m)), d + .03) + saw(float(mtof(m)) * 1.006, d + .03) * .6
    x = np.tanh(x * 1.3) * .7; x = bp(x, 110, 3800, 2) * adsr(d + .03, .003, .08, .6, .03)
    add(gtrs, x, t0, v * .42, -.25 if int(t0 / BEAT) % 2 else .25)
for t0, m, d, v in S['ep']:
    f = float(mtof(m)); t = tv(d); idx = 2.2 * np.exp(-t / .35)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) * np.exp(-t / .9) + .15 * np.sin(2 * np.pi * 14 * f * t) * np.exp(-t / .05)
    add(eps, x * np.minimum(t / .004, 1), t0, v * .26, ((m * 5) % 9) / 9 * 1.0 - .5)
for t0, notes, d in S['stab']:
    x = 0
    for m in notes: x = x + saw(float(mtof(m)), d) + saw(float(mtof(m)) * 1.007, d) * .7
    x = lp(x, 4500) * np.exp(-tv(d) / (.45 if d < 2 else 1.0)) * np.minimum(tv(d) / .004, 1)
    add(stabs, x, t0, .22)
for t0, m, d in S['bell']:
    f = float(mtof(m)); t = tv(d); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (1.6 / r ** .5)) for r, a in ((1, 1), (2.76, .35), (5.4, .15), (.5, .4))); add(bells, x, t0, .22, .1)
# intro drone
drone = (np.sin(2 * np.pi * 55 * tt) + .4 * np.sin(2 * np.pi * 110 * tt + 1) + .25 * lp(saw(82.4, DUR), 400)[:N] * 1.0)
dr_env = np.clip(tt / 8, 0, 1) ** 1.5 * np.where(tt < 8, 1, np.exp(-(tt - 8) / 3)) * (tt < 40) * (1 - .0)
droneb = np.stack([drone * dr_env * .05] * 2, 1)

# ----------------------------------------------------------------- riser before the air gap, reverse cymbal
riser = new(); n0, n1 = int(16 * SR), int(23.5 * SR); L = n1 - n0
x = noise(L / SR); tr = np.arange(L) / L; fc = 300 * (9000 / 300) ** tr
# swept band-pass by blending a bank
bank = [bp(x, f * .7, f * 1.4) for f in np.geomspace(300, 9000, 12)]
pos = tr * 11; out = np.zeros(L)
for i, b in enumerate(bank): out += b * np.clip(1 - np.abs(pos - i), 0, 1)
riser[n0:n1, 0] = out * tr ** 2.2 * .5 * np.clip((1 - tr) / .004, 0, 1); riser[n0:n1, 1] = np.roll(out, 90) * tr ** 2.2 * .5 * np.clip((1 - tr) / .004, 0, 1)
rc = crash(1.0)[::-1][:int(1.6 * SR)]; add(riser, rc, 23.5 - len(rc) / SR + .0, .0)

# ----------------------------------------------------------------- foley from the picture events
fx = new(); fxwet = new()
def swoosh(d, f0, f1, v):
    t = tv(d); x = noise(d); tr = t / d; bank = [bp(x, f * .75, f * 1.3) for f in np.geomspace(f0, f1, 8)]
    pos = tr * 7; out = np.zeros(len(t))
    for i, b in enumerate(bank): out += b * np.clip(1 - np.abs(pos - i), 0, 1)
    return out * np.sin(np.pi * tr) ** 1.5 * v
def boom(v, d=1.2):
    t = tv(d); f = 34 + 70 * np.exp(-t / .09); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .45) + lp(noise(d), 300) * np.exp(-t / .25) * .5 + hp(noise(d), 4000) * np.exp(-t / .05) * .35) * v
for e in EV:
    k, t0 = e['type'], e['t']
    if k == 'spot':
        t = tv(.8); x = hp(noise(.8), 1500) * np.exp(-t / .004) * .5 + np.sin(2 * np.pi * 70 * t) * np.exp(-t / .12) * .9 + np.sin(2 * np.pi * 120 * t) * np.exp(-t / .5) * .12
        add(fx, x, t0, .55, 0); add(fxwet, x, t0, .25)
    elif k == 'headpop':
        t = tv(.35); x = hp(noise(.35), 1800) * np.exp(-t / .006) + bp(noise(.35), 2000, 7000) * np.exp(-t / .05) * .5 + np.sin(2 * np.pi * (900 + 600 * e['n']) * t) * np.exp(-t / .1) * .25
        add(fx, x, t0, .4, [-.5, -.15, .15, .5][e['n']]); add(fxwet, x, t0, .2)
    elif k == 'rigon':
        add(fx, swoosh(.5, 400, 7000, .5), t0 - .5, .5); add(fx, boom(.4, .8), t0, .5)
    elif k == 'whip':
        add(fx, swoosh(e['d'], 500, 5500, 1.0), t0, .55, 0); add(fxwet, swoosh(e['d'], 500, 5500, 1.0), t0, .2)
    elif k == 'pullback':
        add(fx, swoosh(1.0, 6000, 300, 1.0), t0, .5)
    elif k == 'zoomout':
        add(fx, swoosh(.7, 300, 6000, 1.0), t0, .5)
    elif k == 'flash':
        v = e['a']; add(fx, boom(v, 1.4), t0, .85 * min(1, v * 1.3), 0)
        if v > .5: add(fxwet, boom(v, 1.4), t0, .5)
        add(fx, hp(noise(.5), 3000) * np.exp(-tv(.5) / .08) * .5, t0, .3 * v)
    elif k == 'blackout' and t0 > 50:
        t = tv(.6); f = 180 * np.exp(-t / .12) + 40; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .2) + hp(noise(.6), 1200) * np.exp(-t / .01) * .4
        add(fx, x, t0, .5)
    elif k == 'confetti':
        t = tv(.3); thump = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t / .08) + 45) / SR) * np.exp(-t / .09)
        spr = bp(noise(1.8), 1500, 9000) * np.exp(-tv(1.8) / .55) * np.minimum(tv(1.8) / .02, 1)
        add(fx, thump * .9, t0, .5, e['x']); add(fx, spr, t0 + .03, .35, e['x']); add(fxwet, spr, t0 + .03, .25, e['x'])
    elif k == 'sparks':
        d = e['d'] + 1.2; t = tv(d); n_ = hp(noise(d), 4500) * (rng.random(len(t)) > .985) * 2.5
        add(fx, lp(n_, 14000) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** .5 * .5 + hp(noise(d), 6000) * .04 * np.sin(np.pi * t / d), t0, .35, e['x'])
    elif k == 'lamp':
        t = tv(.3); x = hp(noise(.3), 2500) * np.exp(-t / .005) * .6 + np.sin(2 * np.pi * (500 + 40 * e['n']) * t) * np.exp(-t / .12) * .25; add(fx, x, t0, .22, (e['n'] - 5.5) / 6)

# ----------------------------------------------------------------- crowd and room
def lpn(d): return lp(noise(d), 2400)
room = np.stack([bp(noise(DUR), 150, 2200) * .02, bp(noise(DUR), 150, 2200) * .02], 1)
amb = np.interp(tt, [0, 6, 8, 24, 24.2, 40, 40.5, 48, 56, 57, 60], [.5, .6, .8, 1.1, 1.5, 1.5, .5, 1.3, 1.6, .9, .7])
ambm = (1 + .35 * np.sin(2 * np.pi * tt / 3.1 + 1)) * amb
room = room * ambm[:, None] * (1 - .92 * ((tt >= 23.5) & (tt < 24.0)) - .92 * ((tt >= 40.0) & (tt < 41.0)))[:, None]
crowd = new()
def roar(d, v, lo=500):
    t = tv(d); env = np.minimum(t / (d * .12), 1) * np.exp(-np.maximum(t - d * .3, 0) / (d * .45))
    x = bp(noise(d), lo, 1600, 2) + .6 * bp(noise(d), 1800, 4200) + .5 * bp(noise(d), 250, 600)
    x = x * (1 + .35 * np.sin(2 * np.pi * 9 * t + 3 * np.sin(2 * np.pi * 1.3 * t)))
    return x * env * v
for t0, d, v in [(24.0, 3.0, .45), (48.0, 3.5, .5), (56.1, 4.0, .65), (7.9, 1.6, .25), (41.5, 2.0, .12)]:
    add(crowd, roar(d, v), t0, 1, 0)
for t0 in (24.1, 48.1, 56.2):                      # a few "woo" voices on top of each roar
    for j in range(6):
        t = tv(.7); f0 = rng.uniform(450, 800); f = f0 * (1 + .25 * np.sin(np.pi * t / .7))
        x = sum(a * np.sin(2 * np.pi * np.cumsum(f * h) / SR) for h, a in ((1, 1), (2, .5), (3, .3))) * np.sin(np.pi * t / .7) ** 1.5
        add(crowd, lp(x, 3500), t0 + rng.uniform(0, 1.6), .018, rng.uniform(-.8, .8))
# applause after the last hit
dens = np.clip((tt - 56.4) / 1.2, 0, 1) * np.where(tt > 56.4, 1, 0) * np.clip((DUR - tt) / 1.0 + 0.4, 0, 1)
cl = (rng.random(N) < dens * .06) * rng.standard_normal(N); cl = lp(hp(cl, 1200), 7000)
cl = np.convolve(cl, np.exp(-np.arange(int(.004 * SR)) / (.0012 * SR)), 'same')
crowd[:, 0] += cl * 1.2; crowd[:, 1] += np.roll(cl, 331) * 1.2

# ----------------------------------------------------------------- the gates: real silences
def gate(t0, t1, fade=.012, inv=True):
    g = np.ones(N); i0, i1 = int(t0 * SR), int(t1 * SR); g[i0:i1] = 0
    f = int(fade * SR); g[i0 - f:i0] = np.linspace(1, 0, f); g[i1:i1 + f] = np.linspace(0, 1, f); return g
G = gate(23.5, 24.0, .01) * gate(40.0, 41.0, .01)
# the bridge swell back in after silence 2: fade the pad in over 1.2 s after 41.0
swell = np.where((tt >= 41) & (tt < 42.4), np.clip((tt - 41) / 1.4, 0, 1) ** 1.5, 1.0)
# after the final hit (56.0) only its ring-out and the crowd remain
tail = np.where(tt < 56.0, 1.0, np.exp(-(tt - 56.0) / 1.1))

# ----------------------------------------------------------------- bus mix
def st(x, g): return x * g[:, None]
bass_b = st(bass, duck * G * tail); pad_b = st(pads, duck ** .7 * G * swell * tail)
drum_b = st(drums, G * np.where(tt < 56.0, 1, np.exp(-(tt - 56.0) / .6)))
music_dry = bass_b * 1.0 + pad_b + st(arps, G * tail) + st(leads, G * tail) + st(gtrs, duck ** .8 * G * tail) + st(eps, G * swell) + droneb * G[:, None] + st(riser, np.ones(N))
stab_b = st(stabs, G)                                      # keep the final stab's ring-out (not tailed)
bell_b = st(bells, np.ones(N))
echo = pingpong(st(leads, G * tail) * .5 + st(arps, G * tail) * .35, BEAT * .75, .35, 4)
send = st(leads, G * tail) * .35 + pad_b * .25 + st(eps, G) * .5 + bell_b * .9 + stab_b * .5 + dwet * 1.0 + fxwet * 1.0 + echo * .4
rev = reverb(send, 1.0) * np.where(tt < 40.0, 1, 1) [:, None]
rev = st(rev, G)
rev *= (1 - (tt >= 23.52) * (tt < 24.0))[:, None]          # the air gap stays dry: no reverb tail into it
mix = (drum_b * 1.0 + music_dry * 1.0 + stab_b + bell_b + echo * .5 + rev * .55 + fx * 1.0 + crowd * 1.0 + room * 1.0)
mix[:, 0] = sfx.limit(mix[:, 0], .92); mix[:, 1] = sfx.limit(mix[:, 1], .92)
fade = np.clip((DUR - tt) / .4, 0, 1)
mix *= fade[:, None]
pk = np.abs(mix).max(); print('peak', round(float(pk), 3))
sf.write(os.path.join(HERE, 'mix.wav'), (mix / max(pk, 1e-6) * .9).astype(np.float32), SR)
print('mix.wav', round(DUR, 2), 's')
