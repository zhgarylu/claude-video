"""Score, foley and room tone -> out/mix.wav for "Tide Flask" (product-hero demo). Everything is synthesised in numpy, no samples.
Reads events.json (core/render/events.mjs). 96 BPM, bar = 2.5 s, A minor pentatonic with the ninth.
usage: .venv/bin/python styles/product-hero/demo/mix.py
"""
import sys, os, json
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve, lfilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
from sfx import SR, bp, lp, hp

EVJ = json.load(open(os.path.join(HERE, 'events.json')))
EV = EVJ['ev']; DUR = EVJ['dur']
BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
N = int((DUR + 1.5) * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(91)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def tv(d): return np.arange(int(round(d * SR))) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
def norm(x, p=1.0): m = np.abs(x).max(); return x * (p / m) if m > 0 else x
def fade(x, a=.005, b=.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x
def smooth_rand(d, rate):
    n = int(d * rate) + 2; v = rng.random(n); x = np.interp(np.arange(int(d * SR)) / SR * rate, np.arange(n), v); return x

# ----------------------------------------------------------------- reverb (synthetic impulse responses)
def make_ir(sec, tau, cut):
    n = int(sec * SR); x = np.arange(n) / SR; ir = lp(noise(sec), cut) * np.exp(-x / tau)
    k0, k1 = int(.012 * SR), int(.03 * SR); ir[:k0] = 0; ir[k0:k1] *= np.linspace(0, 1, k1 - k0); return ir / np.sqrt((ir ** 2).sum())
IR_L, IR_R = make_ir(2.4, .75, 6000), make_ir(2.4, .75, 6000)
def verb(buf, wet):
    return np.stack([fftconvolve(buf[:, 0], IR_L)[:N], fftconvolve(buf[:, 1], IR_R)[:N]], 1) * wet

# ----------------------------------------------------------------- instruments
def ep(m, d, vel=.7):
    """soft electric piano: two FM pairs, bell-ish attack, long decay"""
    f = mtof(m); t = tv(d); idx = (1.6 * vel + .4) * np.exp(-t / .35)
    car = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    bell = np.sin(2 * np.pi * f * 4 * t + .6 * np.sin(2 * np.pi * f * 7 * t)) * np.exp(-t / .06) * .12
    sub = np.sin(2 * np.pi * f * .5 * t) * .15
    env = np.exp(-t / (.9 + 28 / f * 4)) * np.minimum(1, t / .004)
    return fade((car + bell + sub) * env * vel, .002, .05)
def pluck(m, d=1.6, vel=.6):
    f = mtof(m); n = int(SR / f); a = .996
    x = np.zeros(int(d * SR)); b = rng.uniform(-1, 1, n) * np.hanning(n * 2)[n:][::-1] ; x[:n] = rng.uniform(-1, 1, n)
    den = np.zeros(n + 2); den[0] = 1; den[n] = -a / 2; den[n + 1] = -a / 2
    y = lfilter([1], den, x); y = lp(y, 5200); return fade(norm(y) * vel * np.exp(-tv(d) / 1.1), .001, .1)
def pad(ms, d, vel=.3):
    t = tv(d); out = np.zeros_like(t)
    for m in ms:
        f = mtof(m)
        for dt in (-.0035, 0, .0041):
            ph = 2 * np.pi * f * (1 + dt) * t + rng.random() * 6
            out += (np.sin(ph) + .35 * np.sin(2 * ph) + .12 * np.sin(3 * ph)) * .33
    out = lp(out, 1500); a = np.minimum(1, t / 1.1) * np.minimum(1, (d - t) / 1.4)
    return out * a * vel / np.sqrt(len(ms))
def sub(m, d=.55, v=1.0):
    t = tv(d); f = mtof(m)
    return (np.sin(2 * np.pi * f * t * (1 + .08 * np.exp(-t / .02))) + .22 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t / (d * .38)) * np.minimum(1, t / .006) * v

CH = {'Am9': [45, 52, 55, 59, 60], 'F7': [41, 48, 52, 57, 60], 'C7': [48, 55, 59, 64, 67], 'G6': [43, 50, 52, 59, 62]}
# chord per bar (bar index -> chord); None = no harmony
PROG = {2: 'Am9', 3: 'F7', 4: 'Am9', 5: 'C7', 6: 'G6', 7: 'F7', 8: 'Am9', 9: 'F7', 10: 'C7', 11: 'G6', 12: 'F7',
        14: 'F7', 15: 'C7', 16: 'G6', 17: 'Am9', 18: 'Am9', 19: 'C7', 20: 'F7'}
MELODY = {  # bar -> [(beat, midi, beats, vel)]
    3: [(0, 76, 1.5, .55), (2.5, 74, .5, .4), (3, 72, 1, .5)], 4: [(0, 69, 2, .5), (2, 72, 1, .45), (3, 74, 1, .5)],
    5: [(0, 76, 1, .55), (1.5, 79, .5, .4), (2, 76, 1, .5), (3, 74, 1, .45)], 6: [(0, 74, 1.5, .5), (2, 71, 1, .45), (3, 69, 1, .45)],
    7: [(0, 72, 2, .5), (2.5, 76, 1.5, .5)], 8: [(0, 76, 1, .55), (1, 74, 1, .5), (2, 72, 2, .5)], 9: [(0, 69, 1.5, .5), (2, 72, 1, .45), (3, 77, 1, .5)],
    10: [(0, 76, 2, .5), (3, 79, 1, .4)], 11: [(0, 74, 2, .45), (2.5, 71, 1.5, .4)], 12: [(0, 72, 2.5, .4)],
    15: [(0, 76, 1, .55), (1, 79, .5, .4), (2, 76, 1, .5), (3, 83, 1, .4)], 16: [(0, 74, 1, .55), (1.5, 76, .5, .45), (2, 79, 2, .55)],
    18: [(0, 76, 2, .5), (2.5, 72, .5, .4), (3, 69, 1, .45)], 19: [(0, 71, 1.5, .45), (2, 76, 2, .5)], 20: [(0, 69, 4, .4)],
}
# music gain over time: silences at 32.3-34.5 (before the snap) and 41.8-42.5
def mgain(t0, t1, f0=.3, f1=.3): return np.clip((tt - t0) / f0, 0, 1) * np.clip((t1 - tt) / f1, 0, 1)
MG = mgain(1.8, 32.25, 1.0, .35) + mgain(34.55, 41.75, .5, .25) * 1.0 + mgain(42.5, 52.5 + 1.0, .02, 3.2)
MG = np.clip(MG, 0, 1)
PULSE = mgain(5.0, 32.2, .2, .2) + mgain(35.0, 41.7, .1, .15) + mgain(42.5, 46.4, .2, .3)

mus = np.zeros((N, 2)); drm = np.zeros((N, 2))
# opening swell: A1 sub rising under the first reveal
t = tv(5.2); sw = (np.sin(2 * np.pi * 55 * t) + .3 * np.sin(2 * np.pi * 110 * t)) * (np.sin(np.pi * np.minimum(1, t / 5.2)) ** 2) * .5
add(drm, sw, 0.0, .55)
for bar, name in PROG.items():
    t0 = bar * BAR; ms = CH[name]
    add(mus, pad(ms[1:], BAR + 1.2, .5), t0, .55, -.1)
    if bar in (13,): continue
    # electric piano chord, strummed
    for j, m in enumerate(ms[:4]):
        add(mus, ep(m + (12 if j > 1 else 0), BAR * 1.1, .55 - j * .04), t0 + j * .028, .5, (j - 1.5) * .12)
    for (b, m, ln, v) in MELODY.get(bar, []):
        add(mus, ep(m, ln * BEAT + .9, v), t0 + b * BEAT, .38, .18)
    # 8th-note plucks, from the first full chord bars, sparse in the quiet sections
    dense = bar >= 14 or bar in (8, 9)
    arp = [ms[1] + 12, ms[2] + 12, ms[3] + 12, ms[2] + 12, ms[4] + 12, ms[3] + 12, ms[2] + 12, ms[1] + 24]
    if bar >= 3:
        for k in range(8):
            if not dense and k % 2 == 0: continue
            if bar >= 17 and k % 2 == 0: continue
            add(mus, pluck(arp[k], 1.4, .5), t0 + k * BEAT / 2 + 0.002, .17 * (1 if k % 2 else .7), -.4 + (k % 4) * .27)
    # pulse: sub on beats 1 and 3 (every beat in the last build)
    if bar >= 2:
        for b in ([0, 1, 2, 3] if 14 <= bar <= 16 else [0, 2]):
            add(drm, sub(ms[0] if b != 2 else ms[0] + 0, .5, .8), t0 + b * BEAT, .5 * (1.0 if b == 0 else .8))
mus *= MG[:, None]; drm *= PULSE[:, None] + mgain(0, 5.0, .01, .01)[:, None] * 0 + (mgain(0.0, 5.0, .01, .01)[:, None])
# end card tail: a held high A and E, ring out
add(mus, pad([57, 64, 69], 5.5, .45), 47.0, .35, .1)
# ----------------------------------------------------------------- foley
raw = np.zeros((N, 2)); send = np.zeros((N, 2))
def whoosh(d, v=1, lo=260, hi=2600):
    n = noise(d + .3); tt_ = tv(d + .3); out = np.zeros_like(n); L = len(n)
    for i in range(0, L, 480):
        hi_i = min(L, i + 480); f = lo + (hi - lo) * np.sin(np.pi * min(1, i / L)) ** 1.5
        seg = bp(n[max(0, i - 3000):hi_i], f * .6, f * 1.5)[-(hi_i - i):]; out[i:hi_i] = seg
    env = np.sin(np.pi * np.minimum(1, tt_ / (d + .3))) ** 2
    return fade(norm(out * env) * v, .02, .05)
def drop(v=1):
    d = .22; t = tv(d); f = 900 + 1500 * np.exp(-t / .03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return fade((np.sin(ph) * np.exp(-t / .05) + .4 * np.sin(ph * 1.5 + 1) * np.exp(-t / .03)) * v * .6 + hp(noise(d), 3000) * np.exp(-t / .002) * .15, .001, .05)
def slide(d, v=1):
    n = bp(noise(d), 1800, 5200, 2) * (.3 + .7 * smooth_rand(d, 22)) ** 2; e = np.sin(np.pi * tv(d) / d) ** 1.5
    return fade(norm(n * e) * .5 * v, .05, .1)
def rub(d, v=1):
    n = bp(noise(d), 500, 2600, 2) * (.15 + .85 * smooth_rand(d, 9)) ** 1.5; n += lp(noise(d), 300) * (.2 + smooth_rand(d, 6)) * .4
    return fade(norm(n * np.sin(np.pi * tv(d) / d) ** 1.2) * v, .08, .15)
def clink(v=1):
    d = 1.4; t = tv(d); x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in [(3180, 1, .22), (5070, .55, .13), (7390, .3, .07), (1590, .35, .3)])
    return fade((x + hp(noise(d), 4000) * np.exp(-t / .003) * .5) * v * .5, .0005, .05)
def tick(f=1700, v=1, d=.09):
    t = tv(d); return fade((np.sin(2 * np.pi * f * t) * np.exp(-t / .012) + hp(noise(d), 2500) * np.exp(-t / .002) * .5 + np.sin(2 * np.pi * f * .5 * t) * np.exp(-t / .02) * .5) * v * .5, .0004, .02)
def twist(d, v=1):
    out = np.zeros(int((d + .3) * SR)); n = 9
    for k in range(n):
        at = .05 + k * (d - .2) / n * (0.9 + .1 * k / n); c = tick(1300 + k * 60, .5 + .5 * k / n, .08)
        out[int(at * SR):int(at * SR) + len(c)] += c
    rr = rub(d, .5); out[:len(rr)] += rr[:len(out)]
    s = int((d + .02) * SR); k = tick(900, 1.2, .12); out[s:s + len(k)] += k
    return out * v
def part(v=1):
    x = np.pad(tick(2100, .9, .12), (0, int(.2 * SR))); a = lp(noise(.25), 900) * np.exp(-tv(.25) / .06) * .3; x[:len(a)] += a
    return x * v
def snap(v=1):
    out = np.zeros(int(1.8 * SR))
    for i, at in enumerate([0, .018, .036, .056, .08]):
        c = tick(2400 - i * 160, 1.0 - i * .1, .12); out[int(at * SR):int(at * SR) + len(c)] += c
    t = tv(1.2); out[:len(t)] += (np.sin(2 * np.pi * 62 * t * (1 + .25 * np.exp(-t / .05))) * np.exp(-t / .22) * 1.0 + lp(noise(1.2), 400) * np.exp(-t / .03) * .4)
    r = hp(clink(1)[:len(out)], 1500) * .35; out[:len(r)] += r
    return out * v
def cut(v=1):
    d = .62; t = tv(d); n = bp(noise(d), 300, 3400, 2) * (t / d) ** 2 * np.sin(np.pi * np.minimum(1, t / d * .5 + .5)) ** 1
    x = np.pad(n, (0, int(.4 * SR))); t2 = tv(.4); tap = (np.sin(2 * np.pi * 120 * t2 * (1 + .3 * np.exp(-t2 / .03))) * np.exp(-t2 / .08)) * .8
    x[int(d * SR):int(d * SR) + len(tap)] += tap; return norm(x) * v * .8
def chime(v=1):
    d = 4.0; t = tv(d); x = np.zeros_like(t)
    for f, a, tau in [(880, 1, 1.6), (1318.5, .45, 1.2), (1760, .3, .9), (2637, .18, .5), (3520, .1, .3)]:
        x += a * np.sin(2 * np.pi * f * t + .5 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / .05)) * np.exp(-t / tau)
    return fade(norm(x) * v * .55, .001, .3)
for e in EV:
    k, t0, v = e['type'], e['t'], e.get('v', 1)
    if k == 'whoosh': add(raw, whoosh(e['dur'], v * .55), t0, .5, 0); add(send, whoosh(e['dur'], v * .5), t0, .3, 0)
    elif k == 'cut': add(raw, cut(v), t0, .5)
    elif k == 'drop': add(raw, drop(v), t0, .5, .1); add(send, drop(v), t0, .4)
    elif k == 'slide': add(raw, slide(e['dur'], v), t0, .45, -.05)
    elif k == 'rub': add(raw, rub(e['dur'], v), t0, .6, -.15)
    elif k == 'clink': add(raw, clink(v), t0, .5, .1); add(send, clink(v), t0, .45)
    elif k == 'twist': add(raw, twist(e['dur'], v), t0, .55, -.1)
    elif k == 'part': add(raw, part(v), t0, .6, rng.uniform(-.4, .4)); add(send, part(v), t0, .3)
    elif k == 'snap': add(raw, snap(v), t0, .9); add(send, snap(v), t0, .5)
    elif k == 'tick': add(raw, tick(1500, v, .1), t0, .45, .15)
    elif k == 'ui': add(raw, tick(3300, v * .5, .05), t0, .25, 0.3)
    elif k == 'chime': add(raw, chime(v), t0, .6); add(send, chime(v), t0, .6)
# room tone: very low, pink-ish, a little air above
room = np.zeros((N, 2))
for c in (0, 1):
    room[:, c] = lp(noise(N / SR), 420) * .06 + hp(lp(noise(N / SR), 6500), 2500) * .004
# the silence before the snap and before the end card: room tone dips just slightly but stays (it is the room)
ra = 1 - .5 * (mgain(32.3, 33.7, .2, .2) + mgain(41.8, 42.5, .2, .1)); room *= ra[:, None]

mus_w = verb(mus, .22) ; drm_w = verb(drm, .08); fx_w = verb(send, .55)
mix = mus * 1.0 + mus_w + drm * 1.0 + drm_w + raw * 1.0 + fx_w + room
for c in (0, 1):
    pk = np.abs(mix[:, c]).max()
mix = mix[:int((DUR + 0.0) * SR)]
mix /= max(1e-6, np.abs(mix).max()) / .85
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix.wav', len(mix) / SR, 's, peak', np.abs(mix).max())
