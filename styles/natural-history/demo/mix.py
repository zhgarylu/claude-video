"""Score, foley and voice for "Plate IV: The Spiral, in Four Makers" -> out/mix.wav (stereo, 48 kHz) and cues.json.
Everything is synthesised with numpy/scipy: Karplus-Strong harpsichord and pizzicato viola, a glass-harmonica pad,
a music-box celesta, graphite / dip-pen / wet-brush / paper foley from filtered noise. Event times come from events.json
(exported from the page), so the sound follows the picture. 72 BPM, D Dorian; pins, cuts and the page turn sit on the beat grid."""
import os, json, sys
import numpy as np, soundfile as sf, soxr
from scipy.signal import lfilter, fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import SR, t_, bp, lp, hp, noise, norm

ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; EV = ev['ev']
N = int(DUR * SR) + SR
rng = np.random.default_rng(21)
BPM = 72; BEAT = 60 / BPM; BAR = 4 * BEAT
SILENCES = [(12.05, 13.30), (54.60, 56.60)]          # the two real silences: nothing but the first sound after

def mk(): return np.zeros(N, np.float32)
def add(buf, snd, t, g=1.0):
    i = int(t * SR)
    if i < 0 or i >= N: return
    n = min(len(snd), N - i); buf[i:i + n] += snd[:n] * g
def fade(x, a=.003, b=.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x
mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)

# ---------- instruments
def ks(f, d, bright, damp, seed):
    r = np.random.default_rng(seed); n = int(SR / f); x = np.zeros(int(d * SR)); x[:n] = lp(r.standard_normal(n), bright, 1)
    a = np.zeros(n + 2); a[0] = 1; a[n] = -.5 * damp; a[n + 1] = -.5 * damp
    return lfilter([1], a, x)
def harpsichord(m, d=1.9, g=.8):
    f = mid(m); y = ks(f, d, 7500, .9985, m); y = hp(y, 140, 1) * .8 + y * .2
    tt = t_(d); click = hp(noise(.01), 2500) * np.exp(-t_(.01) / .002); y[:len(click)] += click * .4 * np.abs(y).max()
    y *= np.exp(-tt / 1.1)
    return fade(norm(lp(y, 6500, 1)) * g, .001, .08)
def pizz(m, d=1.2, g=.8):
    f = mid(m); y = ks(f, d, 2600, .997, m + 99); y *= np.exp(-t_(d) / .38)
    tt = t_(d); y += np.sin(2 * np.pi * f * tt) * np.exp(-tt / .15) * .25 * np.abs(y).max()
    return fade(norm(lp(y, 2400, 2)) * g, .002, .06)
def glass(m, d, g=.35, att=1.2, rel=1.2):
    f = mid(m); tt = t_(d); y = np.sin(2 * np.pi * f * tt) + .12 * np.sin(2 * np.pi * f * 2.003 * tt) + .05 * np.sin(2 * np.pi * f * 3.01 * tt) + .35 * np.sin(2 * np.pi * (f * 1.004) * tt)
    y *= (1 + .03 * np.sin(2 * np.pi * 4.4 * tt)); e = np.minimum(1, tt / att) * np.minimum(1, (d - tt) / rel)
    return norm(lp(y, 3500, 2) * e) * g
def bowed(m, d, g=.4, att=.9, rel=1.2):
    f = mid(m); tt = t_(d); vib = 1 + .004 * np.sin(2 * np.pi * 5.2 * tt) * np.minimum(1, tt / 1.0)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR; y = sum(np.sin(h * ph) / h ** 1.15 for h in range(1, 9))
    e = np.minimum(1, tt / att) * np.minimum(1, (d - tt) / rel)
    return norm(lp(y, 1500, 2) * e) * g
def celesta(m, d=2.0, g=.5):
    f = mid(m); tt = t_(d); y = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / tau) for r, a, tau in [(1, 1, .9), (2.76, .3, .3), (5.4, .15, .12)])
    return fade(norm(y) * g, .001, .1)

# ---------- foley
def scratch(d, lo, hi, g=1.0, taps=0):
    n = bp(noise(d), lo, hi, 2); tt = t_(d); e = np.sin(np.pi * tt / d) ** .8 * (.7 + .3 * np.sin(2 * np.pi * (7 + 5 * rng.random()) * tt))
    y = n * e
    return fade(norm(y) * g, .004, .02)
def pen_tick(g=.6):
    d = .02; return fade(norm(bp(noise(d), 1800, 6500) * np.exp(-t_(d) / .004)) * g, .0005, .004)
def brush(d, g=1.0):
    n = bp(noise(d), 350, 2400, 2); tt = t_(d); e = np.sin(np.pi * np.minimum(1, tt / d)) ** .7 * (.55 + .45 * np.abs(np.sin(2 * np.pi * .9 * tt + 1)))
    return fade(norm(n * e) * g, .05, .15)
def pin_tick():
    d = .35; tt = t_(d)
    y = np.sin(2 * np.pi * 2380 * tt) * np.exp(-tt / .05) + .6 * np.sin(2 * np.pi * 4090 * tt) * np.exp(-tt / .03) + .35 * np.sin(2 * np.pi * 6200 * tt) * np.exp(-tt / .018) + hp(noise(d), 3000) * np.exp(-tt / .002) * .5
    y += np.sin(2 * np.pi * 170 * tt) * np.exp(-tt / .02) * .6
    return norm(y)
def ruler_click():
    d = .12; tt = t_(d); return norm(np.sin(2 * np.pi * 1300 * tt) * np.exp(-tt / .012) + hp(noise(d), 1500) * np.exp(-tt / .003) + .4 * np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt / .02))
def glass_ting():
    d = 1.2; tt = t_(d); return norm(sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) for f, a, tau in [(2870, 1, .35), (4510, .5, .25), (7020, .25, .15), (1430, .3, .45)]))
def page_turn(d):
    tt = t_(d); n = bp(noise(d), 400, 4500, 2); e = (tt / d) ** 1.2 * np.sin(np.pi * np.minimum(1, tt / d * 1.05)) ** .6
    rus = hp(noise(d), 2500) * (np.abs(np.sin(2 * np.pi * 9 * tt)) ** 3) * (tt / d) * .25
    return fade(norm(n * e + rus) * .9, .05, .1)

foley = mk(); music = mk(); voice = mk(); room = mk()
for e in EV:
    t, ty, d = e['t'], e['type'], e.get('dur', 0)
    if ty == 'pencil':
        k = 0; tc = t
        while tc < t + d - .1:
            L = .07 + .13 * rng.random(); add(foley, scratch(L, 2200, 6200, 1), tc, .10 * (.5 + rng.random())); tc += L + .03 + .12 * rng.random()
    elif ty == 'pen':
        tc = t
        while tc < t + d - .1:
            L = .1 + .25 * rng.random(); add(foley, pen_tick(), tc, .13); add(foley, scratch(L, 3000, 8500, 1), tc + .01, .13 * (.5 + rng.random())); tc += L + .05 + .2 * rng.random()
    elif ty == 'brush': add(foley, brush(d), t, .20)
    elif ty == 'pin': add(foley, pin_tick(), t, .75)
    elif ty == 'cut':
        add(foley, ruler_click(), t - .02, .6)
        for k in range(int(d / .09)): add(foley, pen_tick(.5), t + k * .09, .1)
        add(foley, ruler_click(), t + d, .35)
    elif ty == 'ring': add(foley, glass_ting(), t, .30); add(foley, scratch(d, 3000, 7000, 1), t, .11)
    elif ty == 'text': add(foley, pen_tick(), t, .06); add(foley, scratch(.35, 3500, 8000, 1), t + .02, .06)
    elif ty == 'page': add(foley, page_turn(d + .3), t - .1, .55)
    elif ty == 'voice':
        w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
        if w.ndim > 1: w = w.mean(1)
        if sr != SR: w = soxr.resample(w, sr, SR)
        add(voice, w.astype(np.float32), t, 1.0)

# ---------- score. bars cycle Dm, C, Am, G (D Dorian), 72 BPM, grid origin t = 0.
CH = {'Dm': [50, 57, 62, 65, 69], 'C': [48, 55, 60, 64, 67], 'Am': [45, 57, 60, 64, 69], 'G': [43, 50, 55, 59, 62]}
CYC = ['Dm', 'C', 'Am', 'G']
def arp(t0, chord, step, pat, g, inst=harpsichord, octave=0):
    tones = CH[chord]
    for i, p in enumerate(pat): add(music, inst(tones[p] + 12 * octave if p else tones[p], 1.7), t0 + i * step, g * (1.0 if i % 4 == 0 else .66))
for b in range(0, int(DUR / BAR) + 1):
    t0 = b * BAR; ch = CYC[b % 4]
    if t0 < 3.2: continue
    if t0 < 7.4:                                   # ink begins: one low pizzicato and a sparse harpsichord thread
        add(music, pizz(CH[ch][0], 1.6), t0, .5); arp(t0 + BEAT, ch, BEAT, [2, 3, 2], .42)
    elif t0 < 12.2:                                # colour arrives: harmonica pad, soft eighths
        arp(t0, ch, BEAT / 2, [1, 2, 3, 2, 4, 2, 3, 2], .38); add(music, pizz(CH[ch][0], 1.6), t0, .45)
    elif t0 < 27.9 and t0 >= 13.3:                  # the halving and the loupe: steady eighths, pizzicato counter-line
        arp(t0, ch, BEAT / 2, [1, 2, 3, 2, 4, 3, 2, 3], .5); add(music, pizz(CH[ch][0], 1.4), t0, .55); add(music, pizz(CH[ch][1], 1.2), t0 + 2 * BEAT, .4)
    elif t0 < 36:                                  # three makers: eighths with a driving pizzicato
        arp(t0, ch, BEAT / 2, [1, 2, 3, 2, 4, 3, 2, 3], .5)
        for k in range(4): add(music, pizz(CH[ch][0 if k % 2 == 0 else 1], 1.0), t0 + k * BEAT, .5)
    elif t0 < 47.2:                                # acceleration: sixteenths
        arp(t0, ch, BEAT / 4, [1, 2, 3, 2, 4, 3, 2, 3, 1, 2, 3, 4, 3, 2, 3, 2], .36)
        for k in range(4): add(music, pizz(CH[ch][0 if k % 2 == 0 else 2], 1.0), t0 + k * BEAT, .5)
    elif t0 < 54.5:                                # the close: long chords, bowed
        arp(t0, ch, BEAT, [1, 2, 3, 4], .5); add(music, bowed(CH[ch][1] + 12, BAR + .4, .22), t0, 1.0)
# glass harmonica pad: enters with the first wash, holds through the loupe, leaves for the silence
add(music, glass(62, 4.4, .34, 1.0, .5), 7.5, 1.0); add(music, glass(69, 4.4, .26, 1.4, .5), 7.5, 1.0)
for t0, d in [(14.17, 12.5), (27.5, 8.5), (36.0, 11.0)]:
    add(music, glass(62, d, .26, 1.3, 1.4), t0, 1.0); add(music, glass(69, d, .2, 1.6, 1.4), t0, 1.0)
# loupe: celesta bells while the roundel is drawn
for k, m in enumerate([86, 81, 84, 79, 82, 77, 81, 74]): add(music, celesta(m, 2.0), 23.6 + k * BEAT * .5, .32)
# the first sound after the first silence is the pin; the film's last long note follows the page turn
add(music, bowed(50, 3.8, .3, .8, 1.6), 59.0 - 0.05, 1.0)
for a, b in SILENCES: music[int(a * SR):int(b * SR)] = 0

def reverb(x, wet=.2, sec=1.0):
    ir = noise(sec) * np.exp(-t_(sec) / .26); ir = lp(ir, 5000); ir[0] = 0
    y = fftconvolve(x, ir / np.abs(ir).sum() * 5.0)[:len(x)]; return x * (1 - wet) + y * wet
music = reverb(music, .2)
for a, b in SILENCES: music[int((a + .08) * SR):int(b * SR)] = 0

# room tone: a quiet study, a far clock; cut in the silences
rt = lp(noise(DUR + 1.0), 420, 2) * .03 + lp(noise(DUR + 1.0), 110, 1) * .035
room[:len(rt)] = rt[:N]
for k in range(int(DUR)): add(room, norm(bp(noise(.03), 1100, 2400) * np.exp(-t_(.03) / .006)) * .02, k + .5, 1.0)
for a, b in SILENCES:
    ia, ib, n = int(a * SR), int(b * SR), int(.12 * SR); room[ia:ib] = 0; room[ia - n:ia] *= np.linspace(1, 0, n); room[ib:ib + n] *= np.linspace(0, 1, n)
# foley is silent inside the silences by construction (checked in cuecheck.py)

# voice: gentle compression, then ducking of music and foley under it
w = voice.copy(); w = np.tanh(w * 2.2) / np.tanh(2.2)
env = np.abs(voice); k = int(.08 * SR); env = np.convolve(env, np.ones(k) / k, 'same'); env = (env > .01).astype(np.float32)
env = np.convolve(env, np.hanning(int(.4 * SR)) / np.hanning(int(.4 * SR)).sum(), 'same')
mixm = music * .5 * (1 - .47 * np.clip(env, 0, 1)) + room * (1 - .4 * np.clip(env, 0, 1)); mixf = foley * (1 - .32 * np.clip(env, 0, 1))
vo = w / max(1e-6, np.abs(w).max()) * .55
mix = mixm + mixf * .9 + vo
d = int(.009 * SR); L_, R_ = mix.copy(), mix.copy(); R_[d:] = mix[:-d] * .55 + R_[d:] * .45
out = np.stack([L_, R_], 1)[:int(DUR * SR)]
out = np.tanh(out * 2.4 / max(1e-6, np.abs(out).max()) * .8) / np.tanh(2.4 * .8)
out = out / max(1e-6, np.abs(out).max()) * .72
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out.astype(np.float32), SR, subtype='PCM_24')
print('mix written', out.shape, 'peak', float(np.abs(out).max()))

# subtitle cues from the voice events
lines = {l['id']: l.get('sub', l['text']) for l in json.load(open(os.path.join(HERE, 'lines.json')))}
cues = [{'t0': round(e['t'], 2), 't1': round(e['t'] + max(1.8, e['dur'] + .6) + .15, 2), 'text': lines[e['id']]} for e in EV if e['type'] == 'voice']
json.dump(cues, open(os.path.join(HERE, 'cues.json'), 'w'), indent=1)
