"""Score and foley for "The Bend" -> out/mix.wav (stereo, 48 kHz) and out/score_cues.json.
Everything is synthesised (numpy/scipy). Foley follows the hand operations in events.json (exported from the page),
the score is written on a 60 BPM grid (one beat = 1 s, one bar = 4 s, D Dorian) and every film hit lands on a note onset
taken from the same events.json, so picture and music cannot drift."""
import os, json, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import SR, t_, bp, lp, hp, noise, norm, compress, limit

ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR, EV = ev['dur'], ev['ev']
HIT = {e['id']: e['t'] for e in EV if e['type'] == 'hit'}
OPS = [e for e in EV if e['type'] in ('stroke', 'smudge', 'erase', 'text')]
CAPS = [e for e in EV if e['type'] == 'cap']
N = int(DUR * SR) + SR
rng = np.random.default_rng(64)
mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)
SILENCE = [(24.0, 25.0), (44.0, 45.0)]            # the two near-silences: before the first erasure of a year-three, and before the house is lifted

def stereo(): return np.zeros((N, 2), np.float32)
def put(buf, x, at, g=1.0, pan=0.0):
    i = int(round(at * SR))
    if i < 0 or i >= N: return
    n = min(len(x), N - i); a = np.sqrt(0.5 * (1 - pan)); b = np.sqrt(0.5 * (1 + pan))
    buf[i:i + n, 0] += x[:n] * g * a; buf[i:i + n, 1] += x[:n] * g * b
def fade(x, a=0.004, b=0.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na and na < len(x): x[:na] *= np.linspace(0, 1, na)
    if nb and nb < len(x): x[-nb:] *= np.linspace(1, 0, nb)
    return x
def smooth_env(n, a=0.25, b=0.35):
    u = np.linspace(0, 1, n); return np.minimum(1, u / a) * np.minimum(1, (1 - u) / b)

# ---------------------------------------------------------------- instruments
def pizz(m, d=1.3, g=0.9):                    # plucked bass: Karplus-Strong with a boosted 2nd and 3rd harmonic so it speaks on small speakers
    f = mid(m); n = int(SR / f); x = np.zeros(int(d * SR)); x[:n] = lp(rng.standard_normal(n), 1600, 1)
    a = np.zeros(n + 2); a[0] = 1; a[n] = -0.4992; a[n + 1] = -0.4992
    y = lfilter([1], a, x); tt = t_(d)
    y = y / (np.abs(y).max() + 1e-9) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / 0.25) + 0.18 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt / 0.15)
    return fade(norm(lp(y, 900, 2)) * g, 0.002, 0.08)
def cello(m, d, g=0.5, att=1.2, rel=1.6):
    f = mid(m); tt = t_(d); vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.0 * tt) * np.minimum(1, tt / 1.5)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR; y = sum(np.sin(h * ph + 0.4 * h) / h ** 1.05 for h in range(1, 12))
    y = lp(y, 1100, 2); e = np.minimum(1, tt / att) * np.minimum(1, (d - tt) / rel)
    return norm(y * e) * g
def piano(m, d=2.6, g=0.7):                    # felted piano: soft attack, few harmonics, low-passed
    f = mid(m); tt = t_(d); y = sum(a * np.sin(2 * np.pi * f * h * tt + 0.3 * h) * np.exp(-tt / (1.4 / h ** 0.7)) for h, a in [(1, 1), (2, .45), (3, .18), (4, .08)])
    y = lp(y, 1500, 2) * (1 - np.exp(-tt / 0.014))
    return fade(norm(y) * g, 0.004, 0.25)
def vibes(m, d=4.0, g=0.5, bowed=True):        # bowed vibraphone: slow swell, a metallic 2nd partial, slow tremolo
    f = mid(m); tt = t_(d); trem = 1 + 0.18 * np.sin(2 * np.pi * 4.2 * tt)
    y = (np.sin(2 * np.pi * f * tt) + 0.22 * np.sin(2 * np.pi * f * 3.98 * tt) * np.exp(-tt / 1.2) + 0.1 * np.sin(2 * np.pi * f * 9.8 * tt) * np.exp(-tt / 0.3)) * trem
    e = np.minimum(1, tt / (0.5 if bowed else 0.004)) * np.minimum(1, (d - tt) / 1.4) * (np.exp(-tt / 2.4) * 0.6 + 0.4 if not bowed else 1)
    return norm(y * e) * g
def framedrum(g=0.9, f=84):
    d = 0.9; tt = t_(d); body = np.sin(2 * np.pi * (f + 40 * np.exp(-tt / 0.03)) * tt) * np.exp(-tt / 0.22)
    skin = lp(noise(d), 1400, 1) * np.exp(-tt / 0.05) * 0.5
    return fade(norm(body + skin) * g, 0.001, 0.2)

# ---------------------------------------------------------------- foley
def op_sound(e):
    d = max(e['d'], 0.06); n = int(d * SR); u = np.linspace(0, 1, n)
    speed = np.sin(np.pi * u) ** 0.8                                              # the hand speeds up and slows down
    if e['type'] in ('stroke', 'text'):
        r, lay = e['r'], e['layer']
        lo_f, hi_f = (350, 1500) if r >= 40 else (700, 3200) if r >= 14 else (1500, 6500)      # a broad stroke rasps low, a tip line scratches high
        if lay == 'G': lo_f, hi_f = lo_f * 1.8, hi_f * 1.2
        base = noise(d)[:n]
        a = bp(base, lo_f, min(hi_f, 9000), 2); b = bp(base, hi_f * 0.8, min(hi_f * 2, 10000), 2)
        grain = np.abs(lp(noise(d)[:n], 220, 2)); grain = grain / (grain.max() + 1e-9)
        y = (a * (1 - 0.7 * speed) + b * 0.7 * speed) * (0.35 + 0.65 * grain) * speed * smooth_env(n, 0.15, 0.3)
        g = (0.6 if r >= 14 else 0.35) * (0.6 if lay == 'G' else 1.0) * min(1.0, 0.25 + e['len'] / 800)
    elif e['type'] == 'smudge':
        y = lp(noise(d)[:n], 1700, 2) * (0.5 + 0.5 * np.abs(lp(noise(d)[:n], 40, 1)) / 0.15) * smooth_env(n, 0.3, 0.4) * speed ** 0.5
        g = 0.55
    else:                                                                          # erase: crumble and squeak
        crumb = hp(noise(d)[:n], 1800, 1) * (rng.random(n) < 0.012) * 3
        squeak = np.zeros(n); k = 0
        while k < n:
            L = int(rng.uniform(0.03, 0.09) * SR)
            if rng.random() < 0.5 and k + L < n:
                f = rng.uniform(1300, 2400); tt = np.arange(L) / SR
                squeak[k:k + L] += np.sin(2 * np.pi * f * (1 + 0.1 * tt / (L / SR)) * tt) * np.hanning(L) * 0.25
            k += L + int(rng.uniform(0.02, 0.12) * SR)
        y = (bp(noise(d)[:n], 1800, 5200, 2) * 0.35 + crumb * 0.6 + squeak) * smooth_env(n, 0.2, 0.3) * (0.5 + speed)
        g = 0.55 if e['r'] >= 14 else 0.38
    return fade(y * g, 0.004, 0.02)

def paper_sound(d=0.5):                                                             # a slip laid on, or slid off
    n = int(d * SR); u = np.linspace(0, 1, n); y = bp(noise(d)[:n], 500, 3500, 2) * np.sin(np.pi * u) ** 1.5 * (0.5 + 0.5 * np.abs(lp(noise(d)[:n], 30, 1)) / 0.1)
    return fade(y * 0.5, 0.01, 0.05)
def wood_tick(g=0.7):
    d = 0.12; tt = t_(d); return fade((np.sin(2 * np.pi * 320 * tt) * np.exp(-tt / 0.02) + bp(noise(d), 800, 3000) * np.exp(-tt / 0.01) * 0.4) * g, 0.0005, 0.02)
def clock_tick(g=0.09):
    d = 0.05; tt = t_(d); return (bp(noise(d), 1800, 4200) * np.exp(-tt / 0.006)) * g

# ---------------------------------------------------------------- build
foley = stereo(); music = stereo(); room = stereo()
for e in OPS:
    y = op_sound(e); put(foley, y, e['t'], 1.0, (e['x'] - 0.5) * 0.9)
for c in CAPS:
    put(foley, paper_sound(0.45), c['t'], 0.8, -0.35)
    put(foley, paper_sound(0.6), c['t'] + c['d'] - 0.2, 0.5, -0.35)
put(foley, wood_tick(0.8), DUR - 5.2, 0.8, 0.3)                                      # the stick set down at the end

# room tone: warm brown noise, window air, a far clock that stops in the near-silences
brown = np.cumsum(rng.standard_normal(N)); brown = hp(brown, 40, 1); brown = lp(brown, 500, 2); brown = brown / np.abs(brown).max()
air = bp(rng.standard_normal(N), 300, 1800, 1); air = air / np.abs(air).max()
room[:, 0] += brown * 0.014 + air * 0.003; room[:, 1] += brown * 0.014 + air * 0.003
for s in np.arange(1.0, DUR, 1.0):
    if any(a - 0.05 <= s <= b + 0.05 for a, b in SILENCE): continue
    put(room, clock_tick(), s, 1.0, 0.5)

cues = []                                                                             # (time, id) of every score note that carries a film hit
def note(inst, t, *a, pan=0.0, g=1.0, cue=None):
    put(music, inst(*a), t, g, pan)
    if cue: cues.append({'id': cue, 't': round(t, 3)})
D2, A2, F2, G2, C3, D3 = 38, 45, 41, 43, 48, 50

# bars 1-2 (0-8): bowed drone, entering with the toning
put(music, cello(D3, 9.0, 0.35, 2.5, 1.5), 0.6, 1, -0.2)
# bars 3-5 (8-20): plucked bass on beats 1 and 3; felted piano enters at 12
for k, t in enumerate(np.arange(8.0, 24.0, 2.0)): note(pizz, t, [D2, A2, F2, A2, D2, A2, G2, A2][k % 8], 1.3, 0.8, pan=-0.15)
for t, m in [(12, 69), (14, 72), (15, 74), (16, 69), (18, 65), (19, 64), (20, 62), (22, 57)]: note(piano, t, m, 2.6, 0.55, pan=0.2)
# 24-25: nothing. 25: the first erasure of the film's turn, on a frame drum and the low D
note(framedrum, HIT['y3_erase'], 0.8, 84, pan=0.0, cue='y3_erase'); note(pizz, HIT['y3_erase'], D2, 2.0, 0.9, pan=-0.15)
note(piano, 26.0, 57, 2.6, 0.5, pan=0.2)
note(vibes, HIT['y3_draw'], 62, 5.0, 0.45, pan=0.0, cue='y3_draw')
for k, t in enumerate(np.arange(28.0, 33.0, 2.0)): note(pizz, t, [A2, F2, D2][k % 3], 1.3, 0.75, pan=-0.15)
note(framedrum, HIT['y7_erase'], 0.8, 78, cue='y7_erase'); note(pizz, HIT['y7_erase'], D2, 2.0, 0.9, pan=-0.15)
note(vibes, HIT['y7_draw'], 65, 5.0, 0.45, cue='y7_draw')
# bar 10 (36-41): the one acceleration: the plucked line divides, 2 s of half-beats, then 2 s of thirds
for t in np.arange(36.0, 38.0, 0.5): note(pizz, t, [D2, A2][int(t * 2) % 2], 0.9, 0.7, pan=-0.15)
for t in np.arange(38.0, 41.0, 1 / 3): note(pizz, t, [D2, A2, F2][int(round(t * 3)) % 3], 0.7, 0.6, pan=-0.15)
note(framedrum, HIT['y9_erase'], 0.9, 72, cue='y9_erase'); note(pizz, HIT['y9_erase'], D2, 2.0, 0.95, pan=-0.15)
note(vibes, HIT['y9_draw'], 62, 1.0 + 0.0, 0.5, cue='y9_draw')                       # cut to silence at 44 by the gate below
# 44-45: nothing. 45: the house is lifted off the paper
note(framedrum, HIT['house_erase'], 0.9, 70, cue='house_erase')
put(music, cello(D3, DUR - 45.0 - 0.4, 0.55, 1.5, 3.0), 45.0, 1, -0.2)
# 47-: the red door is drawn; a melody that rises with it, on piano and vibraphone
for t, m, g in [(47, 62, 0.6), (48.5, 65, 0.55), (50, 69, 0.6), (51, 74, 0.65), (52.5, 72, 0.5), (54, 69, 0.45)]:
    note(piano, t, m, 3.2, g, pan=0.2, cue='house_draw' if t == 47 else ('title' if t == 51 else None))
note(vibes, 51.0, 57, DUR - 51.0 - 0.6, 0.38, pan=0.0)
note(vibes, 51.0, 62, DUR - 51.0 - 0.6, 0.30, pan=0.1)

# the two silences: music and foley gate shut (room tone only, the clock stops)
def gate(buf):
    for a, b in SILENCE:
        i, j = int(a * SR), int(b * SR); f = int(0.12 * SR)
        buf[i - f:i] *= np.linspace(1, 0, f)[:, None]; buf[i:j] = 0; buf[j:j + 0] *= 1
gate(music); gate(foley)

# balance: foley carries the film; music sits about 5 dB under it; the low end is kept in check
def bal(x): return x / (np.sqrt(np.mean(x[x != 0] ** 2)) + 1e-9) if np.any(x != 0) else x
mus = bal(music) * 0.07; fol = bal(foley) * 0.13
# duck the music under loud foley
env = np.abs(fol).max(axis=1); k = int(0.12 * SR); env = np.convolve(env, np.ones(k) / k, 'same'); duck = 1 - 0.35 * np.clip(env / (env.max() + 1e-9) * 2.2, 0, 1)
mix = mus * duck[:, None] + fol + room
for c in range(2): mix[:, c] = hp(mix[:, c], 30, 1)
mix[:, 0] = limit(compress(mix[:, 0], 0.3, 2.5)); mix[:, 1] = limit(compress(mix[:, 1], 0.3, 2.5))
mix = mix[: int(DUR * SR)]
fo = int(1.2 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR, subtype='PCM_16')
json.dump(cues, open(os.path.join(HERE, 'out', 'score_cues.json'), 'w'))
print('mix', DUR, 's, peak', float(np.abs(mix).max()), 'cues', len(cues))
