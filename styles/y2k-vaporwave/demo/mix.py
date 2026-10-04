"""Score, foley and mix for "Installing Summer": slowed-and-reverbed pads, chopped chords, FM bells, sub bass, a tape-delay lead,
all synthesised with numpy (no samples). Reads events.json (window.EV exported by core/render/events.mjs); writes mix.wav.
Run from anywhere: .venv/bin/python styles/y2k-vaporwave/demo/mix.py"""
import json, os, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
BPM = 68; BEAT = 60 / BPM; BAR = 4 * BEAT
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; EV = ev['ev']
N = int((DUR + 3.0) * SR)
rng = np.random.default_rng(71)
B = lambda n: n * BEAT

def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x, axis=-1)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x, axis=-1)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x, axis=-1)
def tt(d): return np.arange(int(round(d * SR))) / SR
def noise(d): return rng.standard_normal(int(round(d * SR)))
def adsr(d, a, r):
    n = int(round(d * SR)); e = np.ones(n); na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 1.5; e[-nr:] *= np.linspace(1, 0, nr) ** 1.5; return e

def put(buf, x, at, g=1.0, pan=0.0):
    i = int(round(at * SR));
    if i >= buf.shape[1] or i < 0: return
    x = x[:buf.shape[1] - i]; l = g * np.cos((pan + 1) * np.pi / 4); r = g * np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(x)] += x * l; buf[1, i:i + len(x)] += x * r

def reverb(x, wet=1.0, decay=2.6, damp=5200):
    """washed hall: decaying noise IR, darker with time, a different IR per channel."""
    n = int(decay * 1.6 * SR); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = rng.standard_normal(n) * np.exp(-t / (decay / 3.2))
        ir = lp(ir, damp, 1) * .6 + lp(ir, 1400, 1) * .4
        ir[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
        ir /= np.sqrt((ir ** 2).sum()) + 1e-9
        out[c] = fftconvolve(x[c], ir)[:x.shape[1]] if x.ndim == 2 else 0
    return out * wet

# ---------------------------------------------------------------- instruments
def pad(notes, d, vel=1.0, bright=1500):
    t = tt(d); out = np.zeros_like(t)
    for m in notes:
        f = mtof(m)
        for det in (-7, 0, 6):
            ff = f * 2 ** (det / 1200); ph = rng.random()
            out += (2 * ((ff * t + ph) % 1) - 1) * .12
        out += np.sin(2 * np.pi * f * t) * .12
    out = lp(out, bright, 2) * adsr(d, .9, 1.4)
    return out * vel

def chop(notes, d, g=1.0):
    t = tt(d); out = np.zeros_like(t)
    for m in notes:
        f = mtof(m - 12)
        out += (2 * ((f * t) % 1) - 1) * .12 + np.sin(2 * np.pi * f * 2 * t) * .06
    return lp(out, 900, 2) * np.exp(-t / .12) * (1 - np.exp(-t / .004)) * g

def bell(m, d=3.0, g=1.0):
    t = tt(d); f = float(mtof(m)); idx = 3.0 * np.exp(-t / .35)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / .9)
    x += .35 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .5)
    return x * g * (1 - np.exp(-t / .002))

def bass(m, d=1.6, g=1.0):
    t = tt(d); f = float(mtof(m));
    x = np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * 2 * f * t) + .15 * np.sin(2 * np.pi * 3 * f * t)
    return x * np.exp(-t / .9) * (1 - np.exp(-t / .01)) * g

def lead(m, d, g=1.0):
    t = tt(d); f = float(mtof(m)); vib = 1 + .006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / .4)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.sin(ph) * .8 + np.sin(2 * ph) * .15 + (2 * ((ph / (2 * np.pi)) % 1) - 1) * .08
    return lp(x, 3000, 1) * adsr(d, .03, .35) * g

def tape_delay(x, time=BEAT * .75, fb=.5, mix=.55):
    n = int(time * SR); out = x.copy(); y = np.zeros_like(x)
    for k in range(1, 7):
        d = n * k;
        if d >= x.shape[-1]: break
        sh = np.zeros_like(x); sh[..., d:] = x[..., :-d]
        y += lp(hp(sh, 200, 1), 2600 - 250 * k, 1) * (fb ** k)
    return out + y * mix

def hat(g=1.0):
    d = .05; return hp(noise(d), 6500) * np.exp(-tt(d) / .012) * g

# ---------------------------------------------------------------- foley
def pop_snd():
    d = .5; t = tt(d); x = np.zeros_like(t)
    x += hp(noise(.01), 2500).tolist() + [0] * (len(t) - int(.01 * SR)) if False else 0
    for off, f in ((0, 740.0), (.09, 1108.0)):
        i = int(off * SR); s = np.sin(2 * np.pi * f * t[:len(t) - i]) * np.exp(-t[:len(t) - i] / .13) * (1 - np.exp(-t[:len(t) - i] / .004))
        s += .3 * np.sin(2 * np.pi * f * 2.01 * t[:len(t) - i]) * np.exp(-t[:len(t) - i] / .06)
        x[i:] += s
    c = hp(noise(.012), 2500) * np.exp(-tt(.012) / .003); x[:len(c)] += c * .8
    return x * .5

def tick_snd():
    d = .04; return (hp(noise(d), 3000) * np.exp(-tt(d) / .004) + np.sin(2 * np.pi * 1800 * tt(d)) * np.exp(-tt(d) / .006) * .5) * .35

def bloop_snd():
    d = .45; t = tt(d); f = 420 + 520 * (1 - np.exp(-t / .05)); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / .1) * (1 - np.exp(-t / .003)) * .45

def glitch_snd():
    d = .6; t = tt(d); f = 900 * np.exp(-t / .12) + 50; ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    gate = (np.sin(2 * np.pi * 26 * t) > -.2).astype(float)
    x = lp(saw, 2500, 1) * np.exp(-t / .18) * .5 + hp(noise(d), 2000) * np.exp(-t / .08) * gate * .5
    q = np.floor(x * 6) / 6  # bit crush
    return (x * .6 + q * .4) * .8

def shimmer_snd(d=1.8):
    t = tt(d); n = noise(d); x = np.zeros_like(t)
    f = 800 * (6000 / 800) ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * .4 + np.sin(ph * 1.5) * .2 + hp(n, 5000) * .15
    return x * np.sin(np.pi * t / d) ** 1.5 * .45

def riser_snd(d):
    t = tt(d); n = noise(d); y = np.zeros_like(t);
    for i, f in enumerate(np.linspace(300, 4200, 12)): pass
    f = 200 * (3500 / 200) ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * .3 + hp(lp(n, 6000, 1), 600, 1) * .25 * (t / d)) * (t / d) ** 2 * .6

def clack_snd():
    d = .12; t = tt(d); return (hp(noise(d), 800) * np.exp(-t / .004) + np.sin(2 * np.pi * 220 * t) * np.exp(-t / .03) * .8) * .6

def close_snd():
    d = .2; t = tt(d); f = 700 * np.exp(-t / .05) + 150; ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t / .05) + hp(noise(d), 3000) * np.exp(-t / .004) * .6) * .5

def sparkle_snd():
    x = np.zeros(int(3.5 * SR))
    for i, m in enumerate((96, 100, 103, 108)):
        s = bell(m, 3.2, .35); at = int(i * .07 * SR); x[at:at + len(s)] += s[:len(x) - at]
    return x

# ---------------------------------------------------------------- score
CH = {  # midi
  'Fm9': [54, 57, 61, 64, 68], 'D9': [50, 54, 57, 61, 64], 'Bm11': [47, 54, 57, 62, 64], 'C#m7': [49, 56, 59, 64, 68],
  'D#11': [50, 54, 57, 61, 68], 'Amaj7': [45, 52, 56, 61, 64], 'Emaj7': [52, 56, 59, 63, 68]}
ROOT = {'Fm9': 42, 'D9': 38, 'Bm11': 35, 'C#m7': 37, 'D#11': 38, 'Amaj7': 33, 'Emaj7': 40}
PROG = {0: 'Fm9', 1: 'D9', 2: 'Fm9', 3: 'D9', 4: 'Bm11', 5: 'C#m7', 6: 'Fm9', 7: 'D9', 10: 'D#11', 11: 'Amaj7', 12: 'Emaj7', 13: 'Fm9'}
MEL = {  # bar -> [(beat offset, midi, beats)]
  5: [(0, 78, 1.5), (2, 76, 1), (3, 73, 1)], 6: [(0, 81, 1.5), (2, 78, 2)], 7: [(0, 76, 1.5), (2, 73, 1), (3, 71, 1)],
  10: [(2, 90, 1.5)], 11: [(0, 90, 1.5), (2, 88, 1), (3, 85, 1)], 12: [(0, 93, 1.5), (2, 90, 1), (3, 88, 1)], 13: [(0, 85, 4)]}

dry = np.zeros((2, N)); lead_bus = np.zeros((2, N)); bell_bus = np.zeros((2, N)); fx = np.zeros((2, N)); fxwet = np.zeros((2, N))
# the music exists in [0, B(32)] and [B(42), B(56)]; the hang is its absence
for bar in range(14):
    if bar not in PROG: continue
    ch = PROG[bar]; t0 = bar * BAR
    d = BAR + 1.0
    if bar <= 1 or bar == 13: vel = .75
    else: vel = 1.0
    if bar == 13: d = BAR * .8
    put(dry, pad(CH[ch], d, vel), t0, .55, 0)
    put(dry, bass(ROOT[ch], 2.0, .8), t0, .6, 0)
    if 2 <= bar <= 7 or 10 <= bar <= 12:
        start = B(42) if bar == 10 else t0
        pats = [1, 0, 1, 1, 0, 1, 0, 1]
        for k in range(8):
            at = t0 + k * BEAT / 2
            if at < start - 1e-6 or not pats[k]: continue
            put(dry, chop(CH[ch], .3, 1.0), at, .5 if bar < 5 else .42, -.25 if k % 2 else .25)
        put(dry, bass(ROOT[ch], 1.2, .7), t0 + 2.5 * BEAT, .45, 0)
    if 5 <= bar <= 7 or 11 <= bar <= 12:
        for j in range(4):
            put(dry, hat(.6), t0 + (j + .5) * BEAT, .35, .3 if j % 2 else -.3)
    for off, m, ln in MEL.get(bar, []):
        put(lead_bus, lead(m, ln * BEAT, 1.0), t0 + off * BEAT, .38, .1)
    if bar in (2, 3, 4, 5, 6, 7, 11, 12):  # sparse bell on the second bar beat
        put(bell_bus, bell(78 if bar % 2 else 73, 3.0, .6), t0 + 2 * BEAT, .32, -.2)
# reveal chord fill on the beat, with a high bell
put(dry, pad(CH['D#11'], BAR * 2, 1.2, 2500), B(42), .6, 0)
put(bell_bus, bell(90, 3, 1), B(42), .4, 0)
# gates: music silent in the hang, with a 30 ms ramp; the reverb tails (added after) keep the room
mask = np.ones(N)
def gate(a, b):
    i, j = int(a * SR), int(b * SR); mask[i:j] = 0
    r = int(.03 * SR); mask[i - r:i] = np.linspace(1, 0, r)
gate(B(32), B(42))
# thin the close: everything after B(55) fades
mask[int(B(55) * SR):] *= np.linspace(1, 0, N - int(B(55) * SR)) ** 2
mus = dry * mask; lead_m = lead_bus * mask; bell_m = bell_bus * mask
# glitch stutters on the dry music: a 24 Hz chop for 0.18 s
t = np.arange(N) / SR
for e in [e for e in EV if e['type'] == 'glitch']:
    i, j = int(e['t'] * SR), int((e['t'] + .18) * SR)
    mus[:, i:j] *= (np.sin(2 * np.pi * 22 * t[i:j]) > 0)
lead_m = tape_delay(lead_m)
music_dry = mus * .9 + lead_m * .8 + bell_m * .8
music_wet = reverb(mus * .5 + lead_m * .5 + bell_m * .9, 1.0, 3.0) * 1.1

# ---------------------------------------------------------------- foley and hiss
for e in EV:
    ty, at = e['type'], e['t']
    if ty == 'pop': put(fx, pop_snd(), at, .7, 0); put(fxwet, pop_snd(), at, .3, 0)
    elif ty == 'tick': put(fx, tick_snd(), at, .8, .2)
    elif ty == 'bloop': put(fx, bloop_snd(), at, .8, -.3); put(fxwet, bloop_snd(), at, .4, -.3)
    elif ty == 'glitch': put(fx, glitch_snd(), at - .02, .75, 0)
    elif ty == 'bell': put(fxwet, bell(66, 4.0, 1.0), at, .9, 0); put(fx, bell(66, 4.0, 1.0), at, .35, 0)
    elif ty == 'spin': put(fx, shimmer_snd(2.0), at, .9, 0); put(fxwet, shimmer_snd(2.0), at, .5, 0)
    elif ty == 'click': put(fx, clack_snd(), at, .8, .3)
    elif ty == 'close': put(fx, close_snd(), at, .8, 0); put(fxwet, close_snd(), at, .3, 0)
    elif ty == 'sparkle': put(fxwet, sparkle_snd(), at, .5, 0); put(fx, sparkle_snd(), at, .2, 0)
# the sun-sinking riser leads into the reveal; a quiet one under the blob room as well
put(fx, riser_snd(B(42) - B(40)), B(40), .35, 0)
put(fxwet, riser_snd(B(42) - B(40)), B(40), .2, 0)
put(fx, riser_snd(B(20) - B(16)) * .5, B(16), .35, 0)
hiss = bp(noise(DUR + 3), 2500, 9000) * .0045 * np.ones(N)[:int((DUR + 3) * SR)]
hissb = np.stack([hiss[:N], np.roll(hiss[:N], 77)])
wet_fx = reverb(fxwet, 1.0, 2.2)

mix = music_dry * .8 + music_wet * .55 + fx * .8 + wet_fx * .8 + hissb
# warm, slightly low-passed; remove DC and rumble; soft limit
mix = lp(mix, 11000, 1); mix = hp(mix, 28, 1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
# fade out the very end (the picture ends at DUR)
end = int(DUR * SR); mix[:, end - int(.25 * SR):end] *= np.linspace(1, 0, int(.25 * SR))
mix[:, end:] = 0
mix = mix[:, :end + int(.2 * SR)]
mix *= .5 / np.abs(mix).max()
out = os.path.join(HERE, 'mix.wav'); sf.write(out, mix.T.astype(np.float32), SR, subtype='FLOAT')
# band-energy report (TECHNIQUE section 5: keep 20-120 Hz about -3 dB under the rest)
sp = np.abs(np.fft.rfft(mix.mean(0))) ** 2; fr = np.fft.rfftfreq(mix.shape[1], 1 / SR)
lo = sp[(fr > 20) & (fr < 120)].sum(); rest = sp[(fr >= 120) & (fr < 8000)].sum()
print('mix.wav', mix.shape[1] / SR, 's  low/rest = %.1f dB' % (10 * np.log10(lo / rest)))
