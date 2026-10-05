"""Score + foley + room + voice -> mix.wav for "Three Cards for a Yes".
Everything is synthesised in numpy (no samples). Reads timeline.json (tools/export_tl.mjs) and voices/ (core/tts/tts.py).
usage: .venv/bin/python styles/tarot/demo/mix.py [workdir]   (default: the demo folder)
"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import lfilter, sosfilt, butter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, t_, bp, lp, hp, env_exp, norm, compress, limit

W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else HERE
TL = json.load(open(os.path.join(W, 'timeline.json')))
T, EV, VO, DUR, BEAT, BAR = TL['T'], TL['EV'], TL['VO'], TL['DUR'], TL['BEAT'], TL['BAR']
N = int((DUR + 1.0) * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(74)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def stereo(): return np.zeros((N, 2))
def place(buf, x, at, gain=1.0, pan=0.0):
    sfx.add(buf, x, at, gain, pan)
def bump(t, a, b, fa=.2, fb=.2): return np.clip((t - a) / fa, 0, 1) * np.clip((b - t) / fb, 0, 1)
SIL = TL['MUSIC']['silence']

# ================================================================= instruments
def ks(f, d, decay=.9965, bright=.55, vol=1.0):
    """plucked string (Karplus-Strong as a comb filter): the harp of the arpeggio"""
    n = int(round(SR / f - .5)); L = int(d * SR)
    x = np.zeros(L); burst = noise(n / SR + 1e-9)[:n]; burst = lfilter([1 - bright, bright], [1], burst) if bright < 1 else burst
    x[:n] = burst - burst.mean()
    a = np.zeros(n + 2); a[0] = 1; a[n] = -decay / 2; a[n + 1] = -decay / 2
    y = lfilter([1], a, x); return norm(y) * vol

def box(f, d=1.6, vol=1.0):
    """music-box tine: a few inharmonic partials with fast decays, and a tiny comb click"""
    x = t_(d); y = np.zeros_like(x)
    for r, a, tau in [(1, 1, .55), (2.0, .30, .25), (3.01, .14, .14), (5.93, .10, .06), (8.1, .05, .03)]:
        y += a * np.sin(2 * np.pi * f * r * x + rng.random() * 6) * np.exp(-x / tau)
    y[:200] += hp(noise(200 / SR), 4000) * .25 * np.linspace(1, 0, 200)
    return norm(y) * vol * np.minimum(1, x / .002)

def bell(f, d=4.0, vol=1.0, low=False):
    """struck bell: the classic minor-third bell partials"""
    x = t_(d); y = np.zeros_like(x)
    for r, a, tau in [(.5, .55, 2.6), (1, 1, 2.2), (1.19, .7, 1.7), (1.5, .35, 1.2), (2.0, .55, 1.4), (2.51, .25, .9), (3.0, .3, .8), (4.07, .15, .45), (5.43, .08, .3)]:
        y += a * np.sin(2 * np.pi * f * r * x + rng.random() * 6) * np.exp(-x / (tau * (1.35 if low else 1)))
    y += hp(noise(d), 3000) * np.exp(-x / .01) * .25
    return norm(y) * vol * np.minimum(1, x / .0015)

def glass(f, d, vol=1.0):
    """bowed glass / harmonica pad: slow attack, a little vibrato"""
    x = t_(d); vib = 1 + .0035 * np.sin(2 * np.pi * 5.1 * x) * np.minimum(1, x / .8)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR; y = np.zeros_like(x)
    for r, a in [(1, 1), (2, .38), (3, .16), (4, .07)]:
        for det in (-.0013, .0013): y += a * np.sin(ph * r * (1 + det) + rng.random() * 6) * .5
    env = np.minimum(1, x / .7) * np.minimum(1, (d - x) / .9)
    return y * env * vol

def drone(f, d, vol=1.0):
    x = t_(d); y = np.zeros_like(x); ph = 2 * np.pi * np.cumsum(f * (1 + .001 * np.sin(2 * np.pi * .13 * x))) / SR
    for k in range(1, 9): y += np.sin(ph * k + k) / k ** 1.3
    a = .5 + .5 * np.sin(2 * np.pi * .07 * x); y = lp(y, 420) * (1 - a * .6) + lp(y, 1100) * a * .6; return y * vol

def thump(f=95, d=.4, v=1.0, nz=.4):
    x = t_(d); y = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-x / .03))) / SR) * np.exp(-x / .11) + lp(noise(d), 380) * np.exp(-x / .03) * nz
    return norm(y) * v

def drum(v=1.0):
    return thump(88, .5, v, .55)

def tick(f=1900, v=1.0):
    d = .05; x = t_(d); return norm(np.sin(2 * np.pi * f * x) * np.exp(-x / .007) + hp(noise(d), 2500) * np.exp(-x / .004) * .5) * v

# ================================================================= foley (paper, card stock, cloth, wood)
def flick(v=1.0):
    d = .035; x = t_(d); return norm(bp(noise(d), 2200, 7500) * np.exp(-x / .006) + np.sin(2 * np.pi * 3100 * x) * np.exp(-x / .004) * .25) * v
def cardslap(v=1.0, f=210):
    d = .12; x = t_(d); return norm(bp(noise(d), 700, 5200) * np.exp(-x / .012) + np.sin(2 * np.pi * f * x * (1 - .5 * x)) * np.exp(-x / .028) * .8 + lp(noise(d), 500) * np.exp(-x / .02) * .4) * v
def land(v=1.0):
    d = .16; x = t_(d); return norm(lp(noise(d), 1900) * np.exp(-x / .014) + np.sin(2 * np.pi * 120 * x * (1 - 1.5 * x)) * np.exp(-x / .035) * .9 + bp(noise(d), 2500, 6000) * np.exp(-x / .004) * .3) * v
def slide(d=.4, v=1.0):
    x = t_(d); n = bp(noise(d), 500, 3200, 2); shape = np.sin(np.pi * np.clip(x / d, 0, 1)) ** 1.5
    return norm((n + bp(noise(d), 4000, 8500) * .15) * shape * (1 + .35 * np.sin(2 * np.pi * 37 * x))) * v
def whoosh(d=.5, v=1.0, up=True):
    n = noise(d); out = np.zeros_like(n); L = len(n)
    for i in range(0, L, 480):
        hi = min(L, i + 480); u = i / L; f = 500 + 2400 * (np.sin(np.pi * u) if up else 1 - u)
        out[i:hi] = bp(n[max(0, i - 2000):hi], f * .6, f * 1.5)[-(hi - i):]
    return norm(out * np.sin(np.pi * t_(d) / d) ** 2) * v
def paper_flutter(d=.5, v=1.0):
    x = t_(d); g = (rng.random(len(x)) > .985).astype(float); g = lp(g * 8, 900); return norm(hp(noise(d), 1800) * np.abs(g) * np.sin(np.pi * x / d)) * v
def chalk(v=1.0):
    d = .22; x = t_(d); n = bp(noise(d), 2800, 7500) * (np.sin(2 * np.pi * 26 * x) * .5 + .8) * np.sin(np.pi * x / d) ** .6
    return norm(n + np.sin(2 * np.pi * 1450 * x) * np.exp(-x / .06) * .25) * v
def scratch(d, v=1.0):
    x = t_(d); n = bp(noise(d), 2200, 6800) * (1 + .5 * np.sin(2 * np.pi * 19 * x + 1)) * np.minimum(1, x / .05) * np.minimum(1, (d - x) / .1)
    return norm(n) * v
def stamp(v=1.0):
    d = 1.2; x = t_(d); y = thump(62, d, 1.0, .9); y[:int(.12 * SR)] += bp(noise(.12), 400, 3500) * np.exp(-t_(.12) / .02)
    y = y + bell(880, d, .0) * 0
    return norm(y) * v
def surf(d, v=1.0):
    n = lp(noise(d), 1400, 2); x = t_(d); swell = .55 + .45 * np.sin(2 * np.pi * x / 4.6 - 1.2)
    return n * swell * v

# ================================================================= beds: room tone, candle crackle, silences
room = lp(noise(DUR + 1), 220, 2) * .05 + lp(noise(DUR + 1), 2400, 1) * .004
room_gain = np.ones(N);
for a, b in SIL: room_gain *= 1 - .5 * bump(tt, a - .15, b + .1, .4, .15)
amb = stereo()
amb[:len(room), 0] += room; amb[:len(room), 1] += np.roll(room, 311)
for k in range(150):                          # candle ticks, sparse
    t = rng.random() * DUR
    if any(a <= t <= b for a, b in SIL): continue
    place(amb, hp(noise(.02), 2500) * np.exp(-t_(.02) / .003) * rng.random(), t, .015, rng.random() * 2 - 1)
amb *= room_gain[:, None]

# ================================================================= score
mus = stereo(); bar_t = lambda b: b * BAR
PROG = {0: 'Dm', 1: 'Dm', 2: 'Dm', 3: 'Bb', 4: 'Gm', 5: 'Dm', 6: 'Bb', 7: 'Gm', 8: 'A', 9: 'Dm', 10: 'Bb', 11: 'Gm', 12: 'A',
        14: 'Dm', 15: 'Gm', 16: 'Bb', 17: 'A', 18: 'A', 19: 'Dm', 20: 'Dm', 21: 'Dm'}
TONES = {'Dm': (62, 65, 69), 'Bb': (58, 62, 65), 'Gm': (55, 58, 62), 'A': (57, 61, 64)}
ROOT = {'Dm': 38, 'Bb': 34 + 12, 'Gm': 43, 'A': 45}
ROOT['Bb'] = 46
def layer(b, lo, hi): return lo <= b < hi
# drone: D3 + A3 held, swelling in sections; one long note per section
for b0, b1, g in [(0, 5, .5), (5, 13, .55), (14, 19, .55), (19, 22, .6)]:
    t0, d = bar_t(b0), (b1 - b0) * BAR + 1.2
    y = drone(146.83, d, 1.0) + drone(220.0, d, .5)
    env = np.minimum(1, t_(d) / 1.8) * np.minimum(1, (d - t_(d)) / 1.2)
    place(mus, y * env, t0, g * .12, 0)
# arpeggio (harp pluck), eighth notes
PAT = [0, 1, 2, 1, 0, 1, 2, 1]
for b in list(range(2, 13)) + list(range(14, 19)):
    ch = PROG[b]; tn = TONES[ch]
    for e in range(8):
        t = bar_t(b) + e * BEAT / 2; m = tn[PAT[e]] + (0 if e % 4 else 0)
        if b >= 14 and e % 2: continue
        v = (.5 + .25 * (e % 4 == 0)) * (0.6 if b < 5 else 1.0)
        place(mus, ks(mtof(m), 1.4, .9955, .5, 1.0), t, .11 * v, -.35 + .15 * e / 8)
# frame drum pulse
for b in list(range(4, 13)) + list(range(14, 19)):
    for e, v in [(0, 1), (4, .75), (6, .35)] if b < 14 else [(0, 1), (4, .8)]:
        place(mus, drum(v), bar_t(b) + e * BEAT / 2, .22 * v, 0)
# bass (bars 9-12 and 14-18), plucked sine with 2nd and 3rd harmonics
def bass(f, d=1.2):
    x = t_(d); y = (np.sin(2 * np.pi * f * x) + .5 * np.sin(4 * np.pi * f * x) + .25 * np.sin(6 * np.pi * f * x)) * np.exp(-x / .5) * np.minimum(1, x / .004)
    return norm(y)
for b in list(range(9, 13)) + list(range(14, 19)):
    r = ROOT[PROG[b]]
    for e, ln in [(0, 1), (3, .7), (4, .9)] if b < 14 else [(0, 1), (4, .7)]:
        place(mus, bass(mtof(r), 1.1), bar_t(b) + e * BEAT / 2, .2 * ln, 0)
# clockwork ticks (the Key)
for b in range(9, 13):
    for e in range(8):
        place(mus, tick(2200 if e % 2 else 1700, 1.0), bar_t(b) + e * BEAT / 2, .045 * (1 if e % 4 == 0 else .55), .5 if e % 2 else -.5)
# music-box melody: (bar-in-phrase, eighth, midi, length in eighths)
M1 = [(0, 0, 81, 2), (0, 2, 86, 2), (0, 4, 89, 3), (0, 7, 88, 1), (1, 0, 86, 2), (1, 2, 82, 2), (1, 4, 86, 4), (2, 0, 82, 2), (2, 2, 86, 2), (2, 4, 91, 3), (2, 7, 89, 1), (3, 0, 88, 2), (3, 2, 85, 2), (3, 4, 81, 4)]
M2 = [(0, 0, 89, 2), (0, 2, 88, 2), (0, 4, 86, 2), (0, 6, 81, 2), (1, 0, 86, 2), (1, 2, 89, 2), (1, 4, 86, 4), (2, 0, 82, 2), (2, 2, 79, 2), (2, 4, 82, 2), (2, 6, 86, 2), (3, 0, 85, 3), (3, 3, 88, 1), (3, 4, 81, 4)]
M3 = [(0, 0, 86, 4), (0, 4, 81, 4), (1, 0, 79, 4), (1, 4, 82, 4), (2, 0, 82, 3), (2, 4, 86, 4), (3, 0, 85, 4), (3, 4, 88, 4), (4, 0, 85, 8)]
for base, notes, vol in [(5, M1, .36), (9, M2, .36), (14, M3, .30)]:
    for pb, e, m, ln in notes:
        place(mus, box(mtof(m), 2.2), bar_t(base + pb) + e * BEAT / 2, vol, .25)
        if base == 14: place(mus, box(mtof(m - 12), 2.4), bar_t(base + pb) + e * BEAT / 2 + .012, vol * .35, -.25)
# glass pad on the Tide, Dm / Gm / Bb / A
for b in range(14, 19):
    tn = TONES[PROG[b]]; d = BAR + .8
    for m in tn: place(mus, glass(mtof(m), d, 1.0), bar_t(b) - .2, .055, 0)
# the end: resolution (bar 19-21)
for pb, e, m, ln in [(0, 4, 86, 2), (0, 6, 81, 2), (1, 0, 77, 4), (1, 4, 74, 4)]:
    place(mus, box(mtof(m), 3.0), bar_t(19) + 4 * BEAT / 2 * 0 + pb * BAR + e * BEAT / 2 + 0.67, .32, .2)
for m in (50, 57, 62, 65, 69): place(mus, glass(mtof(m), 6.8, 1.0), bar_t(19) + .67, .06, 0)
place(mus, bell(mtof(74), 6.0, 1.0), T['title'], .30, 0)             # the title
place(mus, bell(mtof(62), 5.5, 1.0, True), bar_t(21), .22, 0)          # last ring-out
place(mus, bell(mtof(86), 4.0, 1.0), bar_t(1), .13, .3)                # first bell of the film
# silences: a hard, short fade out and back in
msk = np.ones(N)
for a, b in SIL:
    msk *= 1 - bump(tt, a - .06, b, .06, .02) * (1 - 0)
mus *= msk[:, None]

# ================================================================= foley from the event list
fol = stereo()
for e in EV:
    t, ty, p = e['t'], e['type'], e.get('pan', 0); v = e.get('v', 1.0)
    if ty == 'card': place(fol, flick(), t, .26 * v, p)
    elif ty == 'riffle':
        for i in range(e['n']): place(fol, flick(), t + i * .05, .2 + .08 * (i % 3), -.3 + .6 * (i % 2))
    elif ty == 'slide': place(fol, slide(.42, 1.0), t, .30, p)
    elif ty == 'slap': place(fol, cardslap(1.0, 190), t, .55 * v, 0)
    elif ty == 'fan':
        place(fol, slide(.5, 1.0), t, .22, 0)
        for i in range(8): place(fol, flick(), t + .05 + i * .06 * (1 if not e.get('rev') else .5), .15, -.5 + i / 7)
    elif ty == 'tick': place(fol, flick(), t, .2 * v, p)
    elif ty == 'land': place(fol, land(), t, .55 * v, p)
    elif ty == 'flip':
        place(fol, whoosh(.6, 1.0), t, .30, 0); place(fol, paper_flutter(.7, 1.0), t + .05, .22, 0)
    elif ty == 'snap': place(fol, cardslap(1.0, 240), t, .50 * v, 0); place(fol, land(), t + .02, .3, 0)
    elif ty == 'bell':
        if e.get('low'): place(fol, bell(mtof(50), 6.0, 1.0, True), t, .34, 0)
        else: place(fol, bell(mtof(74), 5.0, 1.0), t, .2, 0)
    elif ty == 'roll':
        place(fol, whoosh(1.5, 1.0, up=not e.get('rev')), t - .1, .26, 0); place(fol, glass(mtof(74 if not e.get('rev') else 62), 1.6, 1.0), t - .1, .06, 0)
    elif ty == 'chalk': place(fol, chalk(), t, .32, p)
    elif ty == 'scratch': place(fol, scratch(e['d'], 1.0), t, .20, 0)
    elif ty == 'stamp': place(fol, stamp(), t, .75, 0); place(fol, land(), t + .01, .4, 0)
# J-cut: the key jingle arrives half a second before the camera does; L-cut: the tide washes over the cut into the diagram
jing = np.zeros(int(.7 * SR)); x = t_(.7)
for i, f in enumerate([4100, 5200, 3600, 6100, 4700]):
    s = int((.03 + i * .05) * SR); z = np.sin(2 * np.pi * f * t_(.5)) * np.exp(-t_(.5) / .06); jing[s:s + len(z)] += z[:len(jing) - s] * (.7 - i * .08)
place(fol, jing, 23.45, .10, .3)
sd = 7.0; place(fol, surf(sd) * np.minimum(1, t_(sd) / 1.5) * np.minimum(1, (sd - t_(sd)) / 2.0), 38.2, .085, 0)
place(fol, bp(noise(sd), 2500, 8000) * (surf(sd) ** 2) * np.minimum(1, t_(sd) / 2) * np.minimum(1, (sd - t_(sd)) / 2), 38.2, .03, 0)

# ================================================================= voice
voice = stereo()
for v in VO:
    w, sr = sf.read(os.path.join(W, 'voices', v['id'] + '.wav'))
    if w.ndim > 1: w = w.mean(1)
    w = soxr.resample(w, sr, SR); w = hp(w, 70); w = compress(w, .12, 3.0, .004, .1); w = norm(w, .9)
    place(voice, w, v['t'], 1.0, 0)
venv = np.abs(voice[:, 0]); k = int(.04 * SR)
venv = np.convolve(venv, np.ones(k) / k, 'same'); venv = np.minimum(1, venv / (np.percentile(venv[venv > 1e-3], 70) + 1e-9))
venv = lp(venv, 4, 1)

# ================================================================= mix
duck_m = 1 - .68 * np.clip(venv, 0, 1); duck_f = 1 - .30 * np.clip(venv, 0, 1)
music = mus * duck_m[:, None] * 0.85
foley = fol * duck_f[:, None]
mix = music * 1.0 + foley * 1.0 + amb * 1.0 + voice * 0.95
# gentle master: lows cleanup and a soft limiter per channel
mix = np.stack([limit(sosfilt(butter(2, 28, 'high', fs=SR, output='sos'), mix[:, c]), .92) for c in range(2)], 1)
mix = mix[:int(DUR * SR)]
sf.write(os.path.join(W, 'mix.wav'), mix.astype(np.float32), SR)

# report: voice vs music, bands
def rms(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
vm = voice[:int(DUR * SR), 0]; on = np.abs(vm) > 1e-3
print('voice rms (speaking) %.1f dB, music rms %.1f dB, foley rms %.1f dB' % (rms(vm[on]), rms(music[:int(DUR * SR)][on[:len(music[:int(DUR*SR)])]]), rms(foley[:int(DUR * SR), 0])))
S = np.abs(np.fft.rfft(mix[:, 0])) ** 2; fr = np.fft.rfftfreq(len(mix), 1 / SR)
band = lambda a, b: 10 * np.log10(S[(fr >= a) & (fr < b)].sum() + 1e-12)
print('band energy dB: 20-120 %.1f | 120-500 %.1f | 500-2k %.1f | 2k-8k %.1f' % (band(20, 120), band(120, 500), band(500, 2000), band(2000, 8000)))
print('peak %.3f' % np.abs(mix).max(), '->', os.path.join(W, 'mix.wav'))
