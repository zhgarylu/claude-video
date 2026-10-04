#!/usr/bin/env python3
"""Score, foley, cave ambience and the voice -> out/mix.wav, from events.json (the picture's own timeline) and the 72 BPM bar grid.
Pipa, harp, dizi, xun, frame drum and bells are synthesised with numpy (Karplus-Strong strings, breathy flute partials, modal bells); nothing is sampled."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter, resample_poly
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, bp, lp, hp, noise, t_, norm, compress, limit

BEAT = 60 / 72; BAR = BEAT * 4; DUR = 16 * BAR
bar = lambda n, b=1: (n - 1) * BAR + (b - 1) * BEAT
ev = json.load(open(os.path.join(HERE, 'events.json'))); EVS = ev['ev']
LINES = json.load(open(os.path.join(HERE, 'lines.json')))
TL = {'l1': bar(2, 3), 'l2': bar(5), 'l3': bar(6, 4), 'l4': bar(12), 'l5': bar(14, 4)}
vd = json.load(open(os.path.join(HERE, 'voices', 'dur.json')))
rng = np.random.default_rng(72)
N = int(DUR * SR) + SR
mus = np.zeros((N, 2)); fol = np.zeros((N, 2)); amb = np.zeros((N, 2)); vox = np.zeros((N, 2))
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def m(name): s = name[0]; o = int(name[-1]); acc = name[1:-1].count('#') - name[1:-1].count('b'); return 12 * (o + 1) + NOTE[s] + acc
hz = lambda p: 440 * 2 ** ((p - 69) / 12)
def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i < 0: return
    n = min(len(x), N - i); l = np.sqrt((1 - pan) / 2) * 1.4142 * .707 * 1.4142 / 1.4142; r = np.sqrt((1 + pan) / 2)
    buf[i:i + n, 0] += x[:n] * gain * np.sqrt((1 - pan) / 2) * 1.414; buf[i:i + n, 1] += x[:n] * gain * np.sqrt((1 + pan) / 2) * 1.414

# ---------------------------------------------------------------- instruments
def ks(f, dur, bright=.5, decay=.997, pos=.2):
    N0 = max(8, int(round(SR / f - .5))); n = int(dur * SR) + N0 * 2
    x = np.zeros(n); e = rng.standard_normal(N0); e = lfilter([1 - bright], [1, -bright], e); x[:N0] = e - e.mean()
    x[:N0] *= 1 - .6 * np.abs(np.linspace(-1, 1, N0)) ** 1.0          # pluck-position taper
    a = np.zeros(N0 + 2); a[0] = 1; a[N0] = -decay * .5; a[N0 + 1] = -decay * .5
    y = lfilter([1], a, x); feff = SR / (N0 + .5)
    idx = np.arange(int(dur * SR)) * (feff / f); y = np.interp(idx, np.arange(len(y)), y)
    return y
def pipa(p, dur, vel=.8):
    y = ks(hz(p), max(dur, .9) + .6, .35 + .2 * vel, .9965) * (.5 + vel); n = len(y)
    th = bp(noise(.03), 1500, 7000) * np.exp(-t_(.03) / .006); y[:len(th)] += th * .6 * vel
    return norm(y) * vel * .8
def pipa_trem(p, dur, vel=.8):
    out = np.zeros(int((dur + .8) * SR)); step = 1 / 13.0
    for k in range(int(dur / step) + 1):
        a = pipa(p, .25, vel * (.55 + .45 * np.exp(-k * step / (dur * .8)))) ; i = int(k * step * SR); n = min(len(a), len(out) - i)
        if n > 0: out[i:i + n] += a[:n] * .55
    return out
def pipa_run(ps, spacing, vel=.8):
    out = np.zeros(int((len(ps) * spacing + 1.5) * SR))
    for k, p in enumerate(ps): a = pipa(p, 1.0, vel * (.8 + .2 * k / len(ps))); i = int(k * spacing * SR); n = min(len(a), len(out) - i); out[i:i + n] += a[:n] * .8
    return out
def harp(p, dur, vel=.7):
    y = ks(hz(p), dur + 1.4, .22, .9985) * .9; return norm(y) * vel * .9
def dizi(p, dur, vel=.7, vib=5.2):
    f = hz(p); n = int((dur + .35) * SR); tt = np.arange(n) / SR
    env = np.minimum(1, tt / .12) * np.minimum(1, np.maximum(0, (dur + .3 - tt) / .3)) * (1 + .12 * np.sin(2 * np.pi * 4 * tt))
    fi = f * (1 + .004 * np.sin(2 * np.pi * vib * tt) * np.minimum(1, tt / .6))
    ph = 2 * np.pi * np.cumsum(fi) / SR
    y = np.sin(ph) + .28 * np.sin(2 * ph) + .1 * np.sin(3 * ph) + .04 * np.sin(4 * ph)
    br = bp(rng.standard_normal(n), f * 1.5, f * 5) * .22 * (.4 + .6 * np.minimum(1, tt / .1))
    return norm((y + br) * env) * vel * .55
def xun(p, dur, vel=.8):
    f = hz(p); n = int((dur + .5) * SR); tt = np.arange(n) / SR
    env = np.minimum(1, tt / .35) * np.minimum(1, np.maximum(0, (dur + .45 - tt) / .5))
    ph = 2 * np.pi * np.cumsum(f * (1 + .003 * np.sin(2 * np.pi * 4.3 * tt))) / SR
    y = np.sin(ph) + .3 * np.sin(2 * ph) + .08 * np.sin(3 * ph) + lp(rng.standard_normal(n), 900) * .06
    return norm(y * env) * vel * .8
def bell(f, dur=2.2, vel=.6):
    tt = t_(dur); y = np.zeros(len(tt))
    for r, a, tau in [(1, 1, dur * .45), (2.76, .5, dur * .3), (5.4, .3, dur * .18), (8.9, .15, dur * .1)]: y += a * np.sin(2 * np.pi * f * r * tt + rng.random() * 6) * np.exp(-tt / tau)
    y[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR)); return norm(y) * vel
def fdrum(vel=.8, f=95):
    d = .45; tt = t_(d); fr = f * (1 + .7 * np.exp(-tt / .05)); x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt / .12) + lp(noise(d), 700) * np.exp(-tt / .02) * .5
    return norm(x) * vel

# ---------------------------------------------------------------- score
def phrase(buf, b0, pat, inst, vel=.8, pan=0.0, gain=1.0):
    for beat, nm, db, *o in pat:
        t0 = bar(b0) + beat * BEAT; p = m(nm); d = db * BEAT
        x = {'pipa': lambda: pipa(p, d, vel), 'trem': lambda: pipa_trem(p, d, vel), 'harp': lambda: harp(p, d, vel), 'dizi': lambda: dizi(p, d, vel), 'xun': lambda: xun(p, d, vel)}[inst]()
        put(buf, x, t0, gain, pan)
# bar 1: one hand bell on the first niche
put(mus, bell(hz(m('D6')), 2.4, .5), 1.6667, .8, .25)
# bars 2-3: frame drum on 1 and 3, a harp pluck per two beats
for b in (2, 3):
    for k in (0, 2): put(mus, fdrum(.75 - .15 * (k == 2)), bar(b) + k * BEAT, .7, -.1)
phrase(mus, 2, [(2, 'D4', 2), (3.5, 'A3', 1)], 'harp', .6, -.3); phrase(mus, 3, [(0, 'E4', 2), (2, 'F#4', 1), (3, 'D4', 1)], 'harp', .6, -.3)
# bars 4-5: dizi long note, pipa melody
phrase(mus, 4, [(0, 'D5', 3.8)], 'dizi', .7, .3, .8)
phrase(mus, 4, [(0, 'D4', 1), (1, 'A4', .5), (1.5, 'B4', .5), (2, 'D5', 1), (3, 'A4', 1)], 'pipa', .8, -.1)
phrase(mus, 5, [(0, 'F#5', 1.5), (1.5, 'E5', .5), (2, 'D5', 1), (3, 'B4', 1)], 'pipa', .8, -.1)
for b in (4, 5):
    for k in (0, 2): put(mus, fdrum(.6), bar(b) + k * BEAT, .6, -.1)
# bars 6-7: pipa tremolo and a harp counter-line
phrase(mus, 6, [(0, 'A4', 2), (2, 'B4', 1), (3, 'D5', 1)], 'pipa', .8, -.1); put(mus, pipa_trem(m('A4'), 1.7, .75), bar(6), .7, -.1)
phrase(mus, 7, [(0, 'E5', 2), (2, 'D5', 1), (3, 'A4', 1)], 'pipa', .8, -.1); put(mus, pipa_trem(m('E5'), 1.7, .7), bar(7), .6, -.1)
for b in (6, 7):
    phrase(mus, b, [(0, 'D3', 1), (1, 'A3', 1), (2, 'D4', 1), (3, 'A3', 1)], 'harp', .55, .35)
# bars 8-9: drum eighths, pipa sweeps
for b in (8, 9):
    for k in range(8 if b == 8 else 6): put(mus, fdrum(.55 + .2 * (k % 2 == 0)), bar(b) + k * BEAT / 2, .6, -.1)
up = [m(n) for n in ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5']]
put(mus, pipa_run(up, BEAT / 2, .85), bar(8), .7, -.1); put(mus, pipa_run(up[::-1], BEAT / 2, .85), bar(8, 3), .7, .1)
put(mus, pipa_run([m('A4'), m('B4'), m('D5'), m('E5'), m('F#5'), m('A5')], BEAT / 2, .9), bar(9), .7, 0)
# bar 9 beat 4 .. 33.3: nothing (the breath). Bars 11-13: xun first, then pipa and harp in unison
put(mus, xun(m('D3'), 3.0, .8), 33.4, .9, 0)
uni = lambda b0, pat: (phrase(mus, b0, pat, 'pipa', .85, -.1, .9), phrase(mus, b0, pat, 'harp', .7, .1, .9))
uni(11, [(1.5, 'D5', 1.5), (3, 'F#5', 1)]); uni(12, [(0, 'E5', 1), (1, 'D5', 1), (2, 'B4', 1), (3, 'A4', 1)]); uni(13, [(0, 'B4', 1), (1, 'D5', 1), (2, 'A4', 1), (3, 'D4', 1)])
phrase(mus, 12, [(0, 'A4', 3.8)], 'dizi', .6, .3, .7)
# bars 14-15: one harp, dizi alone
phrase(mus, 14, [(0, 'D4', 2), (2, 'A4', 2)], 'harp', .7, 0); phrase(mus, 15, [(0, 'F#4', 2), (2, 'E4', 2)], 'harp', .65, 0)
phrase(mus, 14, [(.5, 'D5', 3.5)], 'dizi', .6, .2, .8); phrase(mus, 15, [(.5, 'A4', 3.4)], 'dizi', .55, .2, .7)
# bar 16: one bell on the last lit niche
put(mus, bell(hz(m('D6')), 3.0, .5), bar(16), .7, .2)

# ---------------------------------------------------------------- foley
def tick(v=1.0): d = .05; return norm(bp(noise(d), 2500, 9000) * np.exp(-t_(d) / .008) + np.sin(2 * np.pi * 3100 * t_(d)) * np.exp(-t_(d) / .012) * .3) * v
def grain(v=1.0): d = .12; return norm(bp(noise(d), 1200, 6500) * np.exp(-t_(d) / .03) * (rng.random(int(d * SR)) > .5)) * v
def step(v=1.0): d = .16; return norm(bp(noise(d), 400, 3500) * np.exp(-t_(d) / .035) + lp(noise(d), 160) * np.exp(-t_(d) / .05) * 1.2) * v
def cloth(v=1.0, d=.9): n = noise(d); x = bp(n, 250, 1800) * np.sin(np.pi * np.linspace(0, 1, len(n))) ** 2; return norm(x) * v
def sift(v=1.0, d=3.0): return norm(hp(noise(d), 2500) * np.exp(-t_(d) / 1.0) * (.5 + .5 * np.sin(t_(d) * 40))) * v
def sink(v=1.0, d=1.6): tt = t_(d); return norm(lp(noise(d), 900) * np.exp(-tt / .5) + np.sin(2 * np.pi * np.cumsum(180 * np.exp(-tt / .6)) / SR) * np.exp(-tt / .5) * .4) * v
for e in EVS:
    t0, ty, v, pan = e['t'], e['type'], e.get('v', 1), e.get('pan', 0)
    if ty == 'cellwake': put(fol, grain(.8), t0, .5, pan); put(fol, tick(.7), t0 + .02, .35, pan)
    elif ty == 'grain': put(fol, grain(.9), t0, .22 * v, pan)
    elif ty == 'step': put(fol, step(.8), t0, .26 * v, rng.uniform(-.1, .1))
    elif ty == 'swing': put(fol, cloth(1, 1.2), t0, .3, -.3)
    elif ty == 'cloth': put(fol, cloth(1, rng.uniform(.8, 1.3)), t0, .17 * v, pan)
    elif ty == 'flake': put(fol, tick(1), t0, .4 * v, rng.uniform(-.4, .4))
    elif ty == 'ring': put(fol, bell(hz(m('D5')) * (1 + .26 * (1 - v)) , 1.8, .5), t0, .45, 0)
    elif ty == 'sift': put(fol, sift(1, 3.2), t0, .22, 0)
    elif ty == 'sink': put(fol, sink(1), t0, .4, 0)
    elif ty == 'plaque': put(fol, grain(.5), t0, .13, 0)

# ---------------------------------------------------------------- ambience: cave air, dust, the lamp's flutter
tt = np.arange(N) / SR
air = lp(rng.standard_normal(N), 380, 2) * .4 + lp(rng.standard_normal(N), 90, 2) * 1.0
flame_env = lp(rng.standard_normal(N), 14) * .8 + .2
flame = bp(rng.standard_normal(N), 700, 2600) * np.clip(flame_env, 0, 1) ** 2 * .35
dim = np.interp(tt, [0, 3, 9.4, 10, 10.6, 22.8, 23.33, 23.9, 27.6, 29.8, 33.3, 33.7, 35.6, 43.3, 50, 52.2, DUR], [.06, 1, 1, .04, 1, 1, .04, 1, 1, .07, .05, .05, 1, 1, .55, .4, .12])
amb[:, 0] = amb[:, 1] = (air * .55 + flame * np.sqrt(dim)) * .1
for k in range(24): put(amb, grain(.6), 1 + k * 2.1 + rng.random(), .06, rng.uniform(-.7, .7))      # dust sifting now and then

# ---------------------------------------------------------------- voice
dens = np.zeros(N)
for l in LINES:
    w, sr = sf.read(os.path.join(HERE, 'voices', l['id'] + '.wav'))
    if w.ndim > 1: w = w.mean(1)
    if sr != SR: w = resample_poly(w, SR, sr)
    w = compress(w.astype(np.float64), .12, 3.0); put(vox, w, TL[l['id']], 1.0, 0)
    i = int(TL[l['id']] * SR); n = min(len(w), N - i); dens[i:i + n] = 1
duck = 1 - .6 * lp(dens, 3.0, 1); duck = np.clip(duck, .38, 1)
for b in (mus, amb, fol): b *= duck[:, None] if b is not fol else (1 - .35 * (1 - duck))[:, None]
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mus *= .55 / max(rms(mus), 1e-6) * .12; vox *= (.12 * 3.1) / max(rms(vox), 1e-6)
fol *= .9; amb *= 1.0
mix = mus + fol + amb + vox
mix = np.stack([limit(compress(mix[:, c], .5, 2.0), .9) for c in (0, 1)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix', mix.shape, 'dur', len(mix) / SR)
