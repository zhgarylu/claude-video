"""Score + foley + voice -> out/mix.wav for "Reading the Sun". Everything is synthesised in numpy (no samples).
Reads timeline.json (tools/export_tl.mjs) and voice/*.wav (core/tts/tts.py).
usage: .venv/bin/python styles/cyanotype/demo/mix.py"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, t_, bp, lp, hp, env_exp, norm
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
T, EV, VO, HITS = TL['T'], TL['EV'], TL['VO'], TL['HITS']
DUR, BEAT, BAR = TL['DUR'], TL['BEAT'], TL['BAR']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(79)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4); x = np.stack([x * l, x * r], 1) * 1.414
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s] * gain
def interp(pts): return np.interp(tt, [p[0] for p in pts], [p[1] for p in pts])
def fade(x, a=.01, b=.02):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x

# ------------------------------------------------------------------ instruments
def kalimba(m, d=1.2, v=1.0):
    x = t_(d); f = mtof(m)
    s = np.sin(2 * np.pi * f * x) * env_exp(d, .45) + .35 * np.sin(2 * np.pi * f * 5.4 * x) * env_exp(d, .05) + .12 * np.sin(2 * np.pi * f * 9.2 * x) * env_exp(d, .03)
    s += hp(noise(d), 3000) * env_exp(d, .004) * .12                      # the thumb on the tine
    return fade(s * v, .002, .05)
def bell(m, d=3.0, v=1.0):
    x = t_(d); f = mtof(m)
    s = sum(a * np.sin(2 * np.pi * f * r * x + ph) * env_exp(d, tau) for r, a, tau, ph in [(1, 1, 1.4, 0), (2.76, .5, .7, 1), (5.4, .3, .35, 2), (8.9, .12, .2, 3)])
    return fade(s * v * .6, .001, .1)
def pad(m, d, v=1.0):                                                      # bowed glass: slow attack, a little drift
    x = t_(d); f = mtof(m); vib = 1 + .0025 * np.sin(2 * np.pi * 4.7 * x + m)
    s = np.sin(2 * np.pi * f * np.cumsum(vib) / SR) + .35 * np.sin(2 * np.pi * 2 * f * np.cumsum(vib) / SR + 1) + .12 * np.sin(2 * np.pi * 3 * f * x)
    e = np.minimum(1, x / 0.9) * np.minimum(1, (d - x) / 0.7)
    return s * e * v * .5
def bass(m, d=.6, v=1.0):
    x = t_(d); f = mtof(m)
    return fade((np.sin(2 * np.pi * f * x) + .45 * np.sin(2 * np.pi * 2 * f * x) + .2 * np.sin(2 * np.pi * 3 * f * x)) * env_exp(d, .22) * v, .004, .05)
def bowl(m, d=7.0, v=1.0):
    x = t_(d); f = mtof(m)
    s = sum(a * np.sin(2 * np.pi * f * r * x) * env_exp(d, tau) * (1 + .15 * np.sin(2 * np.pi * (.8 + .3 * k) * x)) for k, (r, a, tau) in enumerate([(1, 1, 3.2), (2.71, .55, 2.0), (5.15, .3, 1.1), (8.3, .12, .6)]))
    return fade(s * v * .55, .003, .3)
def shaker(v=1.0, d=.09):
    return fade(bp(noise(d), 5000, 11000) * env_exp(d, .025) * v, .001, .01)

# ------------------------------------------------------------------ foley
def drip(v=1.0):
    d = .45; x = t_(d); f = 1500 + 900 * (1 - np.exp(-x / .03))
    a = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .05)
    a += .5 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * env_exp(d, .02)
    a += lp(noise(d), 900) * env_exp(d, .01) * .3
    return fade(a * v * .5, .001, .05)
def plop(v=1.0):                                                         # a heavy drop into a tray
    d = 1.4; x = t_(d); f = 520 * np.exp(-x / .09) + 140
    a = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .16)
    a += lp(noise(d), 2500) * env_exp(d, .03) * .5
    for k, dd in enumerate([.18, .34, .5]): a += np.roll(np.sin(2 * np.pi * (700 + 90 * k) * x) * env_exp(d, .05), int(dd * SR)) * .25 * (1 - .3 * k)
    return fade(a * v * .7, .001, .1)
def water(d, v=1.0, k=0):
    n = noise(d + .2)
    burble = 0.55 + 0.45 * np.clip(lp(noise(d + .2), 9, 2) * 6 + .5, 0, 1)
    a = bp(n, 350, 3200, 2) * burble + hp(noise(d + .2), 5000) * .12
    e = np.minimum(1, t_(d + .2) / .5) * np.minimum(1, (d + .2 - t_(d + .2)) / .6)
    return (a * e)[:int(round(d * SR))] * v
def brush_stroke(d, v=1.0):
    n = int(round(d * SR)); x = np.arange(n) / SR
    body = bp(noise(d), 1200, 7000, 2) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 9 * x + 1)))     # bristles dragging
    body += lp(noise(d), 600) * .25
    e = np.minimum(1, x / .08) * np.minimum(1, (d - x) / .15) * (.6 + .4 * np.sin(np.pi * x / d))
    return body * e * v
def thump_leaf(v=1.0):
    d = .35; x = t_(d)
    a = np.sin(2 * np.pi * 95 * x) * env_exp(d, .05) * .8 + hp(lp(noise(d), 4500), 1800) * env_exp(d, .05) * .6
    return fade(a * v, .001, .05)
def thump_feather(v=1.0):
    d = .6; x = t_(d)
    return fade(bp(noise(d), 1500, 6500) * np.minimum(1, x / .05) * env_exp(d, .12) * v * .5 + np.sin(2 * np.pi * 70 * x) * env_exp(d, .05) * .3, .002, .1)
def thump_card(v=1.0):
    d = .3; x = t_(d)
    return fade(np.sin(2 * np.pi * 70 * x) * env_exp(d, .06) + lp(noise(d), 800) * env_exp(d, .03) * .5, .001, .04) * v
def slide(d, v=1.0, glass=False):
    n = noise(d); x = t_(d); f0, f1 = (2500, 6000) if glass else (500, 2200)
    a = bp(n, f0, f1, 2) * np.minimum(1, x / .06) * np.minimum(1, (d - x) / .08) * (.7 + .3 * np.sin(2 * np.pi * 14 * x))
    return a * v
def clink(v=1.0):
    d = .9; x = t_(d)
    a = sum(g * np.sin(2 * np.pi * f * x) * env_exp(d, tau) for f, g, tau in [(3300, 1, .22), (4950, .6, .14), (7100, .4, .09), (2100, .4, .3)])
    return fade(a * v * .45 + hp(noise(d), 6000) * env_exp(d, .004) * .3, .0005, .1)
def scrape(d, v=1.0):
    return fade(bp(noise(d), 700, 3500) * np.minimum(1, t_(d) / .05) * v * .8, .01, .04)
def tick(v=1.0):
    d = .08; x = t_(d)
    return fade(np.sin(2 * np.pi * 1250 * x) * env_exp(d, .012) * v + hp(noise(d), 3500) * env_exp(d, .003) * .5 * v, .0005, .01)
def pen(d, v=1.0):
    n = int(round(d * SR)); x = np.arange(n) / SR
    a = hp(noise(d), 3500) * (.3 + .7 * np.abs(np.sin(2 * np.pi * 7 * x + 2))) + bp(noise(d), 900, 2400) * .15
    return fade(a * v * .5, .02, .04)
def whoosh(d, v=1.0):
    n = noise(d); x = np.arange(len(n)) / SR
    lo = bp(n, 300, 1800, 1); hi = bp(n, 1800, 7500, 1)
    k = (x / d)[:, None] if False else (x / d)
    return (lo * (1 - k) + hi * k) * np.sin(np.pi * x / d) ** 1.5 * v * .9
def peg(v=1.0):
    d = .12; x = t_(d)
    return fade((np.sin(2 * np.pi * 480 * x) * env_exp(d, .015) + hp(noise(d), 2500) * env_exp(d, .004) * .8) * v, .0005, .02)
def sun_hum(d, v=1.0):
    x = t_(d); trem = .6 + .4 * np.sin(2 * np.pi * 5.5 * x)
    s = np.sin(2 * np.pi * 110 * x) * .5 + np.sin(2 * np.pi * 165 * x) * .3 + hp(noise(d), 4000) * .05 * trem + np.sin(2 * np.pi * 2637 * x) * .04 * trem + np.sin(2 * np.pi * 3520 * x) * .03 * (1 - trem)
    return s * np.minimum(1, x / 1.0) * np.minimum(1, (d - x) / .5) * v
def flash_swell(d=1.1, v=1.0):
    x = t_(d); n = hp(noise(d), 3000) * (x / d) ** 2 * np.exp(-((x - d) / .03) ** 2 * 0)
    return fade((n * .4 + sum(np.sin(2 * np.pi * f * x) * (x / d) ** 3 for f in (1480, 1976, 2637)) * .12) * v, .01, .15)

# ------------------------------------------------------------------ foley layer from the shared event list
fo = np.zeros((N, 2)); bed = np.zeros((N, 2)); score_ev = []
for e in EV:
    t, ty, g = e['t'], e['type'], e.get('g', 1.0)
    d = max(.1, e.get('t1', t + .3) - t)
    pan = (hash(round(t, 2)) % 7 - 3) * .06
    if ty == 'water': add(bed, np.stack([water(d, g * .45), water(d, g * .45)], 1), t, 1.0, 0)
    elif ty == 'drip': add(fo, drip(g * .8), t, 1.0, pan)
    elif ty == 'drop': add(fo, plop(g), t, 1.0, 0)
    elif ty == 'bell': add(fo, bell(78, 3.0, .5), t, 1.0, .2)
    elif ty == 'pen': add(fo, pen(d, g * .6), t, 1.0, -.1)
    elif ty == 'lift': add(fo, whoosh(d, g * .5), t, 1.0, .15)
    elif ty == 'brush': add(fo, brush_stroke(d, g * .9), t, 1.0, -.15 if e['j'] % 2 else .15)
    elif ty == 'thump':
        k = e.get('kind'); add(fo, thump_feather(g) if k == 'feather' else thump_card(g) if k == 'card' else thump_leaf(g), t, 1.0, pan)
    elif ty == 'slide': add(fo, slide(d, .5, e.get('kind') == 'glass'), t, 1.0, .1)
    elif ty == 'clink': add(fo, clink(1.0), t, 1.0, .05)
    elif ty == 'scrape': add(fo, scrape(d, .8), t, 1.0, -.1)
    elif ty == 'band': add(fo, tick(.8), t, 1.0, 0); score_ev.append(e)
    elif ty == 'sun': add(bed, np.stack([sun_hum(d + .6, .13)] * 2, 1), t - .3, 1.0, 0); add(fo, flash_swell(1.0, .8), t - 0.9, 1.0, 0)
    elif ty == 'peg': add(fo, peg(g), t, 1.0, 0)
    elif ty == 'feather': add(fo, thump_feather(.6), t, 1.0, .3)
    elif ty == 'bloom': add(fo, flash_swell(1.4, .5 * g), t - 1.0, 1.0, 0)
    elif ty == 'bowl': score_ev.append(e)
# ambience under everything: a quiet room, with the air going still in the silence
room = lp(noise(DUR), 500, 2) * .006
sil0, sil1 = T['silence']
roomlvl = interp([(0, .6), (sil0 - .2, 1), (sil0 + .2, .12), (sil1 - .1, .12), (sil1 + .1, 1), (DUR, 1)])
bed += np.stack([room * roomlvl] * 2, 1)

# ------------------------------------------------------------------ score: F# minor pentatonic, 96 BPM, 4/4
CH = [[54, 61, 64, 69], [50, 57, 62, 66], [57, 61, 64, 69], [52, 59, 64, 68]]     # F#m  D  A  E
PENT = [54, 57, 59, 61, 64, 66, 69, 71, 73, 76, 78]
mus = np.zeros((N, 2))
def bar_t(i): return i * BAR
def play_pad(a, b, v=.5):
    i = int(a / BAR + 1e-6)
    while bar_t(i) < b - 1e-6:
        t0 = bar_t(i); t1 = min(b, t0 + BAR + .5)
        if t0 >= a - 1e-6:
            for k, m in enumerate(CH[i % 4]): add(mus, pad(m, t1 - t0, v * (1 - .1 * k)), t0, 1.0, (k - 1.5) * .25)
        i += 1
def play_bass(a, b, v=.6, eighths=False):
    i = int(a / BAR + 1e-6)
    while bar_t(i) < b - 1e-6:
        root = CH[i % 4][0] - 12 if CH[i % 4][0] >= 54 else CH[i % 4][0]
        root = max(root, 38 + (i % 4 == 1) * 0)
        steps = [(0, 1.0), (1, .6), (2, .8), (3, .6)] if not eighths else [(k * .5, .9 if k % 2 == 0 else .5) for k in range(8)]
        for bt, vel in steps:
            t = bar_t(i) + bt * BEAT
            if a - 1e-6 <= t < b - 1e-6: add(mus, bass(root + (12 if bt % 2 == 1 else 0), .5, v * vel), t, 1.0, 0)
        i += 1
MOT = [(0, 5), (1.5, 7), (2, 6), (2.5, 4), (3.5, 5)]        # (beat, index into PENT)
def play_motif(a, b, v=.5, shift=0, every=1):
    i = int(a / BAR + 1e-6)
    while bar_t(i) < b - 1e-6:
        if (i % every) == 0:
            for bt, ix in MOT:
                t = bar_t(i) + bt * BEAT
                if a - 1e-6 <= t < b - 1e-6: add(mus, kalimba(PENT[max(0, min(len(PENT) - 1, ix + shift))], 1.2, v * (1 if bt % 1 == 0 else .7)), t, 1.0, ((ix % 5) - 2) * .15)
        i += 1
def play_arp(a, b, v=.35):
    i = int(a / BAR + 1e-6)
    while bar_t(i) < b - 1e-6:
        ch = CH[i % 4]
        for k in range(8):
            t = bar_t(i) + k * BEAT / 2
            if a - 1e-6 <= t < b - 1e-6: add(mus, bell(ch[k % 4] + 12 + (12 if k % 4 == 3 else 0), 1.6, v * (1 if k % 2 == 0 else .6)), t, 1.0, ((k % 3) - 1) * .3)
        i += 1
def play_shaker(a, b, v=.3):
    t = a
    while t < b - 1e-6:
        k = int(round((t - a) / (BEAT / 2)))
        if k % 2 == 1: add(mus, shaker(v), t, 1.0, .3)
        elif k % 4 == 2: add(mus, shaker(v * .5), t, 1.0, -.3)
        t += BEAT / 2

s0 = T['sun0']; sil0, sil1 = T['silence']
# hook: pad and a bell only, the water carries it
play_pad(0, 7.5, .45); play_motif(5.0, 7.5, .35, 0)
# coat: the thumb-piano motif arrives with the brush
play_pad(7.5, 12.5, .5); play_bass(7.5, 12.5, .5); play_motif(8.75, 12.5, .5, 0, every=1); play_shaker(10.0, 12.5, .25)
# dry / blind: hush before the sun
play_pad(12.5, s0 - .3, .45); play_motif(12.5, 13.7, .35, -1)
add(mus, bell(78, 3, .7), s0 + .02, 1.0, 0)
# strip: six notes, one per band uncovered; bass on the beat and a soft shaker
play_pad(s0, 27.5, .5); play_bass(15.0, 27.5, .55); play_shaker(15.0, 27.5, .3)
for e in score_ev:
    if e['type'] == 'band': add(mus, kalimba([66, 69, 71, 73, 76, 78][6 - e['k']], 2.0, .9), e['t'], 1.0, (6 - e['k'] - 2.5) * .22)
# wash: pad opens, the motif turns around an octave down
play_pad(27.5, sil0 - .1, .55); play_motif(28.75, sil0 - .1, .4, -2, every=2); play_arp(27.5, sil0 - .1, .22)
# silence, then the first sound after it
for e in score_ev:
    if e['type'] == 'bowl': add(mus, bowl(42, 7.0, .9), e['t'], 1.0, 0); add(mus, bowl(54, 5.0, .4), e['t'], 1.0, 0)
# real sheet: pulse and celesta
play_pad(40.0, 60, .5); play_bass(40.0, 57.5, .6, eighths=False); play_shaker(41.25, 57.5, .3); play_arp(42.5, 52.5, .3)
play_motif(47.5, 57.5, .45, 0, every=2)
for m in [66, 69, 73, 76]: add(mus, bell(m, 4.0, .5), T['wash2'][0], 1.0, 0)
add(mus, bass(30, 3.0, .8), T['wash2'][0], 1.0, 0)
# end: the last chord and one bell on the final drop
for m in [54, 61, 66, 68, 73]: add(mus, bell(m, 4.0, .35), 57.5, 1.0, 0)
add(mus, bell(78, 3.0, .6), TL['END_BELL'], 1.0, .2)
# gates: real silences (music) and the pre-sun hush
gate = np.ones(N)
def gate_range(a, b, f=.15):
    ia, ib = int(a * SR), int(b * SR); fa = int(f * SR)
    gate[ia:ib] = 0; gate[max(0, ia - fa):ia] = np.minimum(gate[max(0, ia - fa):ia], np.linspace(1, 0, ia - max(0, ia - fa)))
gate_range(sil0, sil1 - .0, .3)
gate_range(s0 - .3, s0, .2)
mus *= gate[:, None]
# a short bright room for the music
ir_n = int(.9 * SR); IR = noise(.9) * np.exp(-np.arange(ir_n) / SR / .22); IR = lp(IR, 5500)
wet = np.stack([fftconvolve(mus[:, c], IR * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .035
wet *= gate[:, None]
music = mus + wet

# ------------------------------------------------------------------ voice
voice = np.zeros((N, 2)); vo_env = np.zeros(N)
for v in VO:
    x, sr = sf.read(os.path.join(HERE, 'voice', v['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64)
    x = hp(x, 80, 2); x = sfx.compress(x / np.abs(x).max(), .22, 3.5, .004, .09); x = x / np.abs(x).max()
    x = x + .06 * np.pad(x, (int(.035 * SR), 0))[:len(x)]
    add(voice, x, v['t'], .85, 0)
    i0 = int(v['t'] * SR); vo_env[i0:i0 + len(x)] = 1
vo_env = uniform_filter1d(maximum_filter1d(vo_env, size=int(.5 * SR)), size=int(.25 * SR))

# ------------------------------------------------------------------ mix
duck_m = 1 - .55 * vo_env; duck_f = 1 - .25 * vo_env; duck_b = 1 - .35 * vo_env
mix = bed * 1.7 * duck_b[:, None] + fo * 1.0 * duck_f[:, None] + music * .05 * duck_m[:, None] + voice * 1.6
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
def master(m):
    out = np.zeros_like(m)
    for c in (0, 1):
        x = sfx.compress(m[:, c], .06, 3.2, .005, .2); k = .15; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .12, .01)
    return out
mix = master(mix)
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav %.1fs rms dB: bed %.1f fo %.1f music %.1f voice %.1f mix %.1f' % (DUR, rms(bed * 1.7), rms(fo), rms(music * .05), rms(voice[voice != 0] * 1.6), rms(mix)))
seg = lambda a, b: rms(mix[int(a * SR):int(b * SR)])
print('silence %.2f..%.2f: %.1f dB (drip at 38.05); pre-sun hush %.1f dB; whole film %.1f dB' % (sil0, sil1, seg(sil0 + .1, sil1 - .1), seg(s0 - .25, s0 - .02), seg(0, DUR)))
