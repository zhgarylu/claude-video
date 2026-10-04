"""Score, foley and voice for "Every Mend Begins with a Hole" -> out/mix.wav (stereo, 48 kHz).
Everything is synthesised (numpy/scipy): Karplus-Strong nylon guitar, kalimba, music box, felted piano, viola pad, foley from noise.
Event times come from events.json (exported from the page), so sound follows the picture."""
import sys, os, json, hashlib
import numpy as np, soundfile as sf, soxr
from scipy.signal import lfilter, fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import SR, t_, bp, lp, hp, noise, norm, env_exp

ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; EV = ev['ev']
N = int(DUR * SR) + SR
rng = np.random.default_rng(11)
def mk(): return np.zeros(N, np.float32)
def add(buf, snd, t, g=1.0):
    i = int(t * SR)
    if i < 0 or i >= N: return
    n = min(len(snd), N - i); buf[i:i + n] += snd[:n] * g
def fade(x, a=0.004, b=0.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x
mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)

# ---------- instruments
def guitar(m, d=1.6, g=0.9):
    f = mid(m); n = int(SR / f); x = np.zeros(int(d * SR)); b = lp(rng.standard_normal(n), 4200, 1); x[:n] = b
    a = np.zeros(n + 2); a[0] = 1; a[n] = -0.4985 * 0.999; a[n + 1] = -0.4985 * 0.999
    y = lfilter([1], a, x); y = lp(y, 3200, 2) * 0.9 + hp(y, 120, 1) * 0.1
    return fade(norm(y) * g, 0.002, 0.05)
def kalimba(m, d=1.6, g=0.8):
    f = mid(m); tt = t_(d); y = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.55) + 0.28 * np.sin(2 * np.pi * f * 5.4 * tt + 1) * np.exp(-tt / 0.07) + 0.12 * np.sin(2 * np.pi * f * 9.2 * tt) * np.exp(-tt / 0.03)
    y += hp(noise(0.03), 2000)[:1].sum() * 0
    tick = np.zeros_like(tt); k = hp(noise(0.012), 1800) * np.exp(-t_(0.012) / 0.003); tick[:len(k)] = k * 0.35
    return fade(norm(y + tick) * g, 0.001, 0.08)
def musicbox(m, d=2.2, g=0.6):
    f = mid(m); tt = t_(d); y = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / tau) for r, a, tau in [(1, 1, 0.9), (2.76, 0.35, 0.35), (5.4, 0.18, 0.15)])
    return fade(norm(y) * g, 0.001, 0.1)
def piano(m, d=2.4, g=0.7):
    f = mid(m); tt = t_(d); y = sum(a * np.sin(2 * np.pi * f * h * tt + 0.3 * h) * np.exp(-tt / (1.2 / h ** 0.7)) for h, a in [(1, 1), (2, .5), (3, .22), (4, .1)])
    y = lp(y, 1700, 2); y *= 1 - np.exp(-tt / 0.012)
    return fade(norm(y) * g, 0.004, 0.2)
def viola(m, d, g=0.5, att=0.7, rel=1.0):
    f = mid(m); tt = t_(d); vib = 1 + 0.004 * np.sin(2 * np.pi * 5.1 * tt) * np.minimum(1, tt / 1.2)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR; y = sum(np.sin(h * ph) / h ** 1.1 for h in range(1, 9))
    y = lp(y, 1500, 2); e = np.minimum(1, tt / att) * np.minimum(1, (d - tt) / rel)
    return norm(y * e) * g
def shaker(g=0.2):
    d = 0.07; return fade(bp(noise(d), 5500, 9500) * np.exp(-t_(d) / 0.02) * g, 0.002, 0.01)

# ---------- foley (pre-rendered variants, picked by event time)
def tick(c, g):
    d = 0.03; y = bp(noise(d), c * 0.7, c * 1.6) * np.exp(-t_(d) / 0.005) + np.sin(2 * np.pi * c * 0.09 * t_(d)) * np.exp(-t_(d) / 0.012) * 0.25
    return norm(y) * g
TICK_K = [tick(1900 + 250 * i, 1) for i in range(8)]     # on knit: duller
TICK_C = [tick(3600 + 500 * i, 1) for i in range(8)]     # on linen-like cloth: brighter
def zip_(L, d):
    d = float(np.clip(d, 0.06, 0.4)); n = noise(d); tt = t_(d)
    lo, hi = bp(n, 1400, 2600), bp(n, 3200, 6500); sw = np.linspace(0, 1, len(tt))
    y = (lo * (1 - sw) + hi * sw) * np.sin(np.pi * np.minimum(1, tt / d)) ** 1.3
    return norm(y) * min(1, L / 90)
def knot_tap(big=False):
    d = 0.09; tt = t_(d); y = np.sin(2 * np.pi * 760 * tt) * np.exp(-tt / 0.02) + 0.5 * np.sin(2 * np.pi * 1500 * tt) * np.exp(-tt / 0.01) + bp(noise(d), 800, 3000) * np.exp(-tt / 0.006)
    return norm(y) * (0.9 if big else 0.55)
def knock():
    d = 0.2; tt = t_(d); y = np.sin(2 * np.pi * 175 * tt) * np.exp(-tt / 0.06) + 0.7 * np.sin(2 * np.pi * 410 * tt) * np.exp(-tt / 0.03) + 0.4 * np.sin(2 * np.pi * 820 * tt) * np.exp(-tt / 0.015) + lp(noise(d), 2500) * np.exp(-tt / 0.008) * 0.6
    return norm(y)
def whoosh(d=0.8, lo=300, hi=2600):
    tt = t_(d); y = bp(noise(d), lo, hi, 2) * np.sin(np.pi * tt / d) ** 2; return norm(y)
def rub(d, g=1.0):
    tt = t_(d); y = bp(noise(d), 250, 1800, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * tt)) * np.sin(np.pi * tt / d) ** 1.2; return norm(y) * g
def metal_click(f1=5200, f2=7900):
    d = 0.25; tt = t_(d); y = hp(noise(d), 3500) * np.exp(-tt / 0.002) + 0.5 * np.sin(2 * np.pi * f1 * tt) * np.exp(-tt / 0.05) + 0.35 * np.sin(2 * np.pi * f2 * tt) * np.exp(-tt / 0.03) + 0.4 * np.sin(2 * np.pi * 3100 * tt) * np.exp(-tt / 0.07)
    return norm(y)
def shear(d=0.3): tt = t_(d); return norm(hp(noise(d), 4000) * np.sin(np.pi * tt / d) ** 2 * (1 + 0.3 * np.sin(2 * np.pi * 70 * tt)))

foley = mk(); music = mk(); voice = mk(); room = mk()
pick = lambda t, n: int(hashlib.md5(f'{t:.3f}'.encode()).hexdigest(), 16) % n
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'pierce': add(foley, (TICK_K if e['kind'] == 'knit' else TICK_C)[pick(t, 8)], t + 0.02, 0.16 + 0.04 * (pick(t + 1, 5) / 4))
    elif ty == 'zip': add(foley, zip_(e['len'], e['dur']), t + 0.05, 0.10)
    elif ty == 'knot': add(foley, knot_tap(bool(e.get('big'))), t, 0.55 if e.get('big') else 0.2 * min(1, e['r'] / 10))
    elif ty == 'knock': add(foley, knock(), t, 0.9); add(foley, knock(), t + 0.14, 0.45)
    elif ty == 'flip': add(foley, whoosh(0.8), t - 0.05, 0.32); add(foley, rub(0.6, 0.5), t + 0.1, 0.18)
    elif ty == 'lift': add(foley, rub(1.6, 1.0), t, 0.3); add(foley, whoosh(1.2, 200, 1500), t + 0.1, 0.18)
    elif ty == 'cloth': add(foley, rub(1.8, 1.0), t, 0.25)
    elif ty == 'unravel':
        for k in range(46):
            tk = t + (k / 46) ** 0.8 * e['dur']; add(foley, TICK_K[pick(tk, 8)], tk, 0.22 * (1 - k / 70))
        add(foley, rub(e['dur'] + 0.5, 1.0), t - 0.2, 0.3)
    elif ty == 'label':
        for k in range(9): add(foley, TICK_C[pick(t + k, 8)], t + 0.02 + k * 0.032, 0.14)
        add(foley, zip_(60, 0.25), t, 0.16)
    elif ty == 'labelout': add(foley, rub(0.45, 1.0), t, 0.2)
    elif ty == 'shear': add(foley, shear(0.35), t, 0.22)
    elif ty == 'snip': add(foley, metal_click(), t, 0.8); add(foley, metal_click(4700, 7200), t + 0.045, 0.35); add(foley, rub(1.2, 1.0), t + 0.3, 0.12)
    elif ty == 'voice':
        w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
        if w.ndim > 1: w = w.mean(1)
        if sr != SR: w = soxr.resample(w, sr, SR)
        add(voice, w.astype(np.float32), t, 1.0)

# ---------- score (D dorian, 74 BPM, beat 0.8108 s)
BEAT = 60 / 74; EIGHTH = BEAT / 2; BAR = BEAT * 4
CH = {'Dm': [50, 57, 62, 65, 69], 'G': [43, 50, 55, 59, 62], 'Am': [45, 57, 60, 64, 69]}  # bass, then arpeggio tones
def arp(buf, t0, chord, pat=(0, 2, 1, 2, 3, 2, 1, 2), g=0.5):
    tones = CH[chord]
    for i, p in enumerate(pat): add(buf, guitar(tones[p], 1.5), t0 + i * EIGHTH, g * (1.0 if i % 4 == 0 else 0.62))
O1 = 4.05
# opening on the sleeve: two-note ostinato
for k in range(8):
    tk = O1 + k * BEAT
    if tk < 10.4: add(music, guitar(50 if k % 2 == 0 else 57, 1.6), tk, 0.5)
add(music, kalimba(74, 2.2), 1.3, 0.5)                                    # the knot
# darn: four bars, Dm G Am Dm
O2 = O1 + 6 * BAR
for b, ch in enumerate(['Dm', 'G', 'Am', 'Dm']):
    t0 = O2 + b * BAR
    arp(music, t0, ch, g=0.85)
    for i in range(8): add(music, shaker(0.26 if i % 2 else 0.14), t0 + i * EIGHTH + (0.02 if i % 2 else 0), 1.0)
    if b in (1, 3):
        for m in CH[ch][:3]: add(music, piano(m + 12, 2.6), t0, 0.28)
# the hoop: melody (kalimba) over the same changes
O3 = 25.95
mel = [[(0, 74), (2, 77), (4, 81), (6, 79), (7, 77)], [(0, 79), (2, 83), (4, 81), (6, 79), (7, 76)], [(0, 81), (2, 84), (4, 81), (6, 79), (7, 77)], [(0, 74), (1, 77), (2, 81), (3, 84), (4, 86)]]
for b, ch in enumerate(['Dm', 'G', 'Am', 'Dm']):
    t0 = O3 + b * BAR
    arp(music, t0, ch, g=0.42) if b < 3 else None
    for p, m in mel[b]: add(music, kalimba(m, 1.8), t0 + p * EIGHTH, 0.42)
    if b < 3: add(music, piano(CH[ch][0] + 12, 3.0), t0, 0.24)
for i, m in enumerate([74, 77, 81, 84, 86]): pass
add(music, viola(50, 3.4, 0.5, 0.35, 0.5), O3 + 3 * BAR - 0.3, 0.3)
# the back of the work: viola alone
add(music, viola(50, 3.2, 0.55, 0.9, 1.2), 38.0, 0.55); add(music, viola(57, 3.0, 0.5, 1.1, 1.2), 38.3, 0.4)
# cadence while the hoop lifts
for i, m in enumerate([86, 81, 77, 74]): add(music, musicbox(m, 2.6), 41.0 + i * 0.95, 0.5)
add(music, viola(50, 3.4, 0.5, 0.8, 1.4), 41.2, 0.35)
add(music, kalimba(74, 3.0), 47.98, 0.55)                                    # on the snip
# hard silences
def gate(buf, a, b, f=0.06):
    ia, ib = int(a * SR), int(b * SR); n = int(f * SR)
    buf[ia:ib] *= 0
    buf[ia - n:ia] *= np.linspace(1, 0, n)
for a, b in [(23.55, 25.9)]:
    gate(music, a, b)
for a, b in [(44.6, 47.9)]:
    gate(music, a, b)

# reverb (small room) on music
def reverb(x, wet=0.2, sec=1.1):
    ir = noise(sec) * np.exp(-t_(sec) / 0.28); ir = lp(ir, 5000); ir[0] = 0
    y = fftconvolve(x, ir / np.abs(ir).sum() * 5.0)[:len(x)]; return x * (1 - wet) + y * wet
music = reverb(music, 0.22)
for a, b in [(23.6, 25.9), (44.7, 47.9)]: music[int(a * SR):int(b * SR)] *= 0

# room tone: soft, cut during the two silences
rt = lp(noise(DUR + 1.0), 450, 2) * 0.05 + lp(noise(DUR + 1.0), 120, 1) * 0.05
room[:len(rt)] = rt[:N]
for a, b in [(23.55, 25.95)]:
    ia, ib, n = int(a * SR), int(b * SR), int(0.15 * SR); room[ia:ib] *= 0.0; room[ia - n:ia] *= np.linspace(1, 0, n); room[ib:ib + n] *= np.linspace(0, 1, n)

# ducking under voice
env = np.abs(voice); k = int(0.08 * SR); env = np.convolve(env, np.ones(k) / k, 'same'); env = np.convolve((env > 0.01).astype(np.float32), np.hanning(int(0.35 * SR)) / np.hanning(int(0.35 * SR)).sum(), 'same')
duck_m = 1 - 0.44 * np.clip(env, 0, 1); duck_f = 1 - 0.3 * np.clip(env, 0, 1)
mix = music * 0.55 * duck_m + foley * 1.0 * duck_f + voice * 1.0 + room * duck_m
# stereo: slight width from a short decorrelated delay on music
L_, R_ = mix.copy(), mix.copy(); d = int(0.011 * SR); R_[d:] = mix[:-d] * 0.6 + R_[d:] * 0.4
out = np.stack([L_, R_], 1)[:int(DUR * SR)]
out = np.tanh(out * 2.8 / max(1e-6, np.abs(out).max()) * 0.8) / np.tanh(2.8 * 0.8)   # soft limiter: tame the foley transients
out = out / max(1e-6, np.abs(out).max()) * 0.72
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out.astype(np.float32), SR, subtype='PCM_24')
print('mix written', out.shape, 'peak', np.abs(out).max())
