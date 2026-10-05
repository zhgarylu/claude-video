"""Score + press-room foley + voice -> mix.wav for "Print It True". Everything is synthesised in numpy (no samples).
Reads timeline.json (tools/export_tl.mjs) and voice/*.wav (core/tts/tts.py).
usage: .venv/bin/python styles/newsprint/demo/mix.py"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR, t_, bp, lp, hp, env_exp, norm
W = HERE
TL = json.load(open(os.path.join(W, 'timeline.json')))
T, EV, MUS, VO = TL['T'], TL['EV'], TL['MUSIC'], TL['VO']
DUR, BEAT, BAR = TL['DUR'], TL['BEAT'], TL['BAR']
N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(73)
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

# ------------------------------------------------------------------ the press-room bed (rotary press thrum)
rate = interp([(0, 0), (1.5, 2.0), (3.5, 4.0), (T['hush0'], 4.0), (T['hush0'] + .4, 4.0), (T['stamp'] + .9, 4.0), (T['hush1'], 4.0), (50.3, 4.0), (DUR, .3)])
ph = np.cumsum(rate) / SR
lvl = interp([(0, 0), (2.5, .5), (T['hush0'] - .05, .8), (T['hush0'] + .35, 0), (T['stamp'] + .8, 0), (T['stamp'] + 2.2, .85), (T['hush1'] - .05, .9), (T['hush1'] + .3, 0), (T['hush1End'] + .4, 0), (T['hush1End'] + 1.6, .55), (50.0, .6), (DUR, .15)])
chug = np.abs(np.sin(np.pi * ph)) ** 6                     # one chug per cycle
chug2 = np.abs(np.sin(np.pi * (ph * 2 + .15))) ** 14
n1 = lp(noise(DUR), 220, 2); n2 = bp(noise(DUR), 700, 2400, 2)
bed = (n1 * chug * 1.6 + n2 * chug2 * .22 + lp(noise(DUR), 90, 2) * .5) * lvl * .22
bed += np.sin(2 * np.pi * 50 * tt) * .02 * lvl                      # motor hum
bed = np.stack([bed, bed], 1)
bed[:, 1] = np.roll(bed[:, 1], 40)                                  # a little width
room = np.stack([lp(noise(DUR), 400, 2) * .012] * 2, 1) * interp([(0, .5), (T['hush0'], 1), (T['hush0'] + .2, .1), (T['stamp'] + 1, .1), (T['stamp'] + 2, 1), (DUR, 1)])[:, None]
bed += room

# ------------------------------------------------------------------ foley
def slug(i, big):
    d = .16; x = t_(d)
    p = 1 + .06 * ((i * 7) % 5 - 2)
    tr = hp(noise(d), 3000) * env_exp(d, .0012)
    ring = sum(a * np.sin(2 * np.pi * f * p * x + rng.random() * 6) * env_exp(d, tau) for f, a, tau in [(2400, .5, .018), (3900, .35, .01), (1650, .4, .03), (5200, .15, .006)])
    body = np.sin(2 * np.pi * (170 if big else 260) * p * x) * env_exp(d, .018) * .9
    # the slug falling in: a tiny whistle before the strike is left to the foley of the hit itself
    return norm(tr * .7 + ring + body) * (1.0 if big else .6)
def line_tick(k):
    d = .06; x = t_(d); f = 2100 + 260 * (k % 4)
    return norm(hp(noise(d), 4000) * env_exp(d, .0008) * .8 + np.sin(2 * np.pi * f * x) * env_exp(d, .007) * .5)
def rule_tss(d=.45):
    x = noise(d); return norm(bp(x, 4000, 9000) * np.minimum(1, t_(d) / .03) * np.exp(-t_(d) / .18))
def slap(v=1.0):
    d = .5; x = t_(d)
    a = lp(noise(d), 1800) * env_exp(d, .035) + bp(noise(d), 300, 1200) * env_exp(d, .09) * .6 + np.sin(2 * np.pi * 70 * x) * env_exp(d, .09) * 1.1
    return norm(a) * v
def paper_whoosh(d=.45):
    x = noise(d); e = np.sin(np.pi * t_(d) / d) ** 2; return norm(bp(x, 600, 5200, 2) * e) * .8
def stamp(big):
    d = 1.6 if big else .7; x = t_(d)
    thud = np.sin(2 * np.pi * (58 if big else 95) * x * (1 + .35 * np.exp(-x / .04))) * env_exp(d, .16 if big else .07) * 1.5
    crack = hp(noise(d), 1500) * env_exp(d, .008) * 1.0 + bp(noise(d), 200, 900) * env_exp(d, .05)
    metal = sum(np.sin(2 * np.pi * f * x) * env_exp(d, .25) * a for f, a in [(310, .14), (497, .1), (822, .06)]) if big else 0
    tail = lp(noise(d), 600) * env_exp(d, .5) * .25 if big else 0
    return norm(thud + crack * .8 + metal + tail) * (1.0 if big else .6)
def phone(d=1.5):
    x = t_(d); gate = (np.sin(2 * np.pi * 16 * x) > 0) * np.minimum(1, (d - x) / .05) * (x < .95)
    tone = sum(a * np.sin(2 * np.pi * f * x + 3 * np.sin(2 * np.pi * 16 * x)) for f, a in [(1180, 1), (1243, .8), (2360, .3), (3550, .12)])
    gate = uniform_filter1d(gate.astype(float), 60)
    tail = sum(a * np.sin(2 * np.pi * f * x) * env_exp(d, .25) for f, a in [(1180, .3), (2360, .1)]) * (x > .95)
    return norm(tone * gate + tail) * .75
def key(i):
    d = .05; x = t_(d); return norm(hp(noise(d), 2800) * env_exp(d, .001) + np.sin(2 * np.pi * (1800 + 90 * (i % 3)) * x) * env_exp(d, .005) * .6) * .55
def lift():
    d = .3; x = t_(d); return norm(bp(noise(d), 800, 3600) * np.sin(np.pi * x / d) ** 2 * .6 + hp(noise(d), 3500) * env_exp(d, .0012) * .5) * .5
def develop_ticks(buf, t0, d, pan=0):
    n = int(d * 900)
    for k in range(n):
        u = rng.random() ** .8; t = t0 + u * d; a = (.15 + .5 * rng.random()) * (.3 + u)
        add(buf, hp(noise(.012), 3500) * env_exp(.012, .0016) * a, t, .05, pan + (rng.random() - .5) * .8)
    h = bp(noise(d), 3000, 8000) * np.sin(np.pi * t_(d) / d) * .05; add(buf, h, t0, 1.0, 0)

fo = np.zeros((N, 2))
for e in EV:
    t, ty = e['t'], e['type']; pan = 0
    if ty == 'slug': add(fo, slug(e['i'], e.get('big')), t, .85, (e['i'] % 7 - 3) * .08)
    elif ty == 'line': add(fo, line_tick(e['k']), t, .22, -.4 + (e['k'] % 5) * .2)
    elif ty == 'rule': add(fo, rule_tss(), t, .3, 0)
    elif ty == 'cap': add(fo, line_tick(1), t, .35, .2); add(fo, line_tick(3), t + .07, .3, .2)
    elif ty == 'whoosh': add(fo, paper_whoosh(), t, .6, 0)
    elif ty == 'slap': add(fo, slap(), t, 1.0, 0)
    elif ty == 'stamp': add(fo, stamp(bool(e.get('big'))), t, 1.35 if e.get('big') else .9, 0)
    elif ty == 'phone': add(fo, phone(), t, .6, 0)
    elif ty == 'key': add(fo, key(e['i']), t, .5, .15)
    elif ty == 'lift': add(fo, lift(), t, .5, (e['i'] % 5 - 2) * .15)
    elif ty == 'deal': add(fo, paper_whoosh(.7), t, .55, -.3 - .2 * e['i']); add(fo, slap(.5), t + .62, .45, -.3 - .2 * e['i'])
    elif ty == 'develop': develop_ticks(fo, t, e['d'])
# the press winds down at the end: a last slow chug
for k in range(3):
    add(fo, lp(noise(.25), 160) * env_exp(.25, .08) * 1.2, 50.8 + k * (.55 + .25 * k), .5, 0)

# ------------------------------------------------------------------ music: a newsreel band, 120 BPM, D
IR = lp(noise(1.6), 5000) * np.exp(-np.arange(int(1.6 * SR)) / SR / .45); IR[:int(.01 * SR)] *= np.linspace(0, 1, int(.01 * SR))
def tine(m, d, v=.6):
    d = max(d, .15); x = t_(d + .4); f = mtof(m)
    s = sum(a * np.sin(2 * np.pi * f * k * x + ph0) * np.exp(-x / tau) for k, a, tau, ph0 in [(1, 1, .5, 0), (2, .35, .28, 1), (3, .18, .16, 2), (4.01, .1, .08, 0)])
    s = s + .35 * np.sin(2 * np.pi * f * x * 1.0 + 4 * np.exp(-x / .015)) * np.exp(-x / .09)      # tine FM bite
    s = s * np.minimum(1, x / .004) * np.minimum(1, (d + .4 - x) / .25)
    return s * v * .35
def bass(m, d, v=.8):
    d = max(d, .2); x = t_(d); f = mtof(m)
    s = np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * 2 * f * x) * np.exp(-x / .12) + .3 * np.sin(2 * np.pi * 3 * f * x) * np.exp(-x / .07)
    s += .12 * hp(noise(d), 1200) * env_exp(d, .006)
    return s * np.exp(-x / .42) * np.minimum(1, x / .006) * v * .5
def brush(acc=False, v=.5):
    d = .22 if acc else .09; x = t_(d); n = bp(noise(d), 3500, 11000, 2)
    return n * (np.minimum(1, x / (.03 if acc else .005))) * np.exp(-x / (.09 if acc else .03)) * v * .3
CH_A = [(38, [50, 53, 57, 62]), (43, [50, 55, 58, 62]), (45, [49, 55, 57, 64]), (38, [50, 53, 57, 62])]     # Dm Gm A7 Dm
CH_B = [(38, [50, 54, 57, 62]), (43, [50, 55, 59, 62]), (45, [52, 57, 61, 64]), (38, [50, 54, 57, 62])]     # D G A D
mus = np.zeros((N, 2))
def bar_t(b): return b * BAR
def play_bass(a, b, prog, v=.8, walk=True):
    bi = int(a / BAR)
    while bar_t(bi) < b - 1e-6:
        r, _ = prog[bi % 4]; nxt = prog[(bi + 1) % 4][0]
        notes = [r, r + 7, r + 12, nxt + 1 if (bi % 2) else nxt - 1] if walk else [r, None, r + 7, None]
        for k, m in enumerate(notes):
            t = bar_t(bi) + k * BEAT
            if m is not None and a - 1e-6 <= t < b: add(mus, bass(m, BEAT * .95, v), t, 1.0, -.1)
        bi += 1
def play_piano(a, b, prog, mode='comp', v=.6):
    bi = int(a / BAR)
    while bar_t(bi) < b - 1e-6:
        _, ch = prog[bi % 4]
        if mode == 'comp': hits = [(0.0, 1.5), (1.5, 1.0), (3.0, 1.0)]       # beats; charleston-ish
        elif mode == 'drive': hits = [(k * 1.0, 0.9) for k in range(4)]
        else: hits = [(0.0, 3.5)]
        for bt, du in hits:
            t = bar_t(bi) + bt * BEAT
            if not (a - 1e-6 <= t < b): continue
            for k, m in enumerate(ch):
                add(mus, tine(m + 12 * (mode == 'comp'), du * BEAT, v * (1 - .08 * k)), t + k * .012, 1.0, .15 + .05 * k)
        bi += 1
def play_arp(a, b, prog, v=.5):
    bi = int(a / BAR)
    while bar_t(bi) < b - 1e-6:
        _, ch = prog[bi % 4]
        for k in range(8):
            t = bar_t(bi) + k * BEAT / 2 * 1.0
            if a - 1e-6 <= t < b: add(mus, tine(ch[k % 4] + 12 + (12 if k % 4 == 3 else 0), BEAT * 1.2, v * (1 if k % 2 == 0 else .7)), t, 1.0, .1 * (k % 3 - 1))
        bi += 1
def play_brush(a, b, v=.5, lite=False):
    t = a
    while t < b - 1e-6:
        q = (t - a) / (BEAT / 2)
        k = int(round(q)); swing = (BEAT / 6) if k % 2 else 0
        beat = (k // 2) % 4
        if k % 2 == 0 and beat in (1, 3): add(mus, brush(True, v * 1.4), t, 1.0, .25)
        elif not lite or k % 2 == 0: add(mus, brush(False, v * (.9 if k % 2 == 0 else .55)), t + swing, 1.0, .25)
        t += BEAT / 2
# arrangement
play_bass(MUS['in'], 8.0, CH_A, .6); play_brush(MUS['in'], 8.0, .35, True)
play_bass(8.0, T['hush0'] - .02, CH_A, .8); play_piano(8.0, T['hush0'] - .02, CH_A, 'comp', .5); play_brush(8.0, T['hush0'] - .02, .5)
add(mus, bass(38 - 12 + 12, 1.4, .9), T['hush0'] - 1.0, 1.0, -.1)            # a held low D going into the silence
play_bass(MUS['back'], 34.0, CH_A, .9); play_piano(MUS['back'], 34.0, CH_A, 'drive', .55); play_brush(MUS['back'], 34.0, .7)
for m, d in [(50, 2.0), (53, 2.0), (57, 2.0), (62, 2.0)]: add(mus, tine(m + 12, d, .8), MUS['back'] - .02, 1.0, 0)   # the first stab after the stamp
play_bass(34.0, T['hush1'] - .1, CH_B, .85); play_piano(34.0, T['hush1'] - .1, CH_B, 'comp', .55); play_brush(34.0, T['hush1'] - .1, .55)
play_bass(MUS['back1'], 48.0, CH_B, .6, walk=False); play_arp(MUS['back1'], 48.0, CH_B, .5); play_brush(MUS['back1'], 46.0, .3, True)
# the correction bell (a struck bar) when the box is set
for k, f in enumerate([880, 1318, 1760]): add(mus, np.sin(2 * np.pi * f * t_(2.4)) * env_exp(2.4, .7) * .18 * (1 - .25 * k), T['p4Head'] + 12 * T['p4HeadDt'] + .2, 1.0, .3)
# final chord, D major, held while the press slows
for m in [50, 57, 62, 66, 69]: add(mus, tine(m, 4.0, .6), MUS['out'], 1.0, 0)
add(mus, bass(38, 3.0, 1.0), MUS['out'], 1.0, 0)
# gates: real silences
gate = np.ones(N)
for a, b in [(T['hush0'], MUS['back']), (T['hush1'], MUS['back1'])]:
    ia, ib = int(a * SR), int(b * SR); f = int(.04 * SR); gate[ia:ib] = 0; gate[max(0, ia - f):ia] = np.linspace(1, 0, ia - max(0, ia - f))
mus *= gate[:, None]
wet = np.stack([fftconvolve(mus[:, c], IR * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .05
wet *= gate[:, None]
music = mus + wet
music *= np.clip((tt - MUS['in']) / 1.0, 0, 1)[:, None]
for a, b in [(T['hush0'], MUS['back']), (T['hush1'], MUS['back1'])]:    # silence is silence: gate the foley beds too (done in the bed level); foley stays only where it belongs
    pass

# ------------------------------------------------------------------ voice
voice = np.zeros((N, 2)); vo_env = np.zeros(N)
for v in VO:
    x, sr = sf.read(os.path.join(W, 'voice', v['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64)
    x = hp(x, 80, 2); x = sfx.compress(x / np.abs(x).max(), .22, 3.5, .004, .09); x = x / np.abs(x).max()
    x = x + .07 * np.pad(x, (int(.04 * SR), 0))[:len(x)]                  # a short slap off the walls
    add(voice, x, v['t'], .85, 0)
    i0 = int(v['t'] * SR); vo_env[i0:i0 + len(x)] = 1
vo_env = uniform_filter1d(maximum_filter1d(vo_env, size=int(.5 * SR)), size=int(.25 * SR))

# ------------------------------------------------------------------ mix
duck_m = 1 - .55 * vo_env; duck_f = 1 - .3 * vo_env; duck_b = 1 - .2 * vo_env
mix = bed * 2.6 * duck_b[:, None] + fo * 1.1 * duck_f[:, None] + music * .035 * duck_m[:, None] + voice * 1.6
os.makedirs(os.path.join(W, 'out'), exist_ok=True)
def master(m):
    out = np.zeros_like(m)
    for c in (0, 1):
        x = sfx.compress(m[:, c], .06, 3.5, .005, .2); k = .15; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .12, .01)
    return out
mix = master(mix)
sf.write(os.path.join(W, 'mix.wav'), mix.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav %.1fs rms dB: bed %.1f fo %.1f music %.1f voice %.1f mix %.1f' % (DUR, rms(bed), rms(fo), rms(music), rms(voice[voice != 0]), rms(mix)))
def seg(a, b): return rms(mix[int(a * SR):int(b * SR)])
print('contrib dB: bed %.1f fo %.1f music %.1f voice %.1f' % (rms(bed*2.6), rms(fo*1.1), rms(music*.035), rms(voice[voice!=0]*1.6)))
print('silences: hush0 %.1f dB, hush1 %.1f dB (voice-free %.1f..%.1f)' % (seg(T['hush0'] + .1, T['stamp'] - .02), seg(T['hush1'] + .05, T['hush1End']), T['hush0'], T['stamp']))
