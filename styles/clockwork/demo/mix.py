"""mix.py: score, foley and voice for "The Slowest Link", all synthesised from events.json (the machine's own events).
The mechanism is the percussion section: every tick, click, ratchet and domino is a sound at the frame it happens.
Writes out/mix.wav, cues.json (music onsets + beat grid) and ../clockwork.srt."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
import sfx
from sfx import SR, noise, bp, hp, lp, env_exp, t_, norm, add, compress, limit

D = json.load(open(os.path.join(HERE, 'events.json')))
EV, DUR = D['ev'], D['dur']
S = next(e for e in EV if e['type'] == 'sched')
BEAT = 0.625
N = int((DUR + 1.0) * SR)
rng = np.random.default_rng(23)
bus = {k: np.zeros((N, 2)) for k in ('music', 'foley', 'tick', 'room', 'vox')}
onsets = []
mid = lambda m: 440 * 2 ** ((m - 69) / 12)

# ------------------------------------------------------------------ instruments
def tine(m, vel=1.0, d=2.2):
    """a music-box comb tooth: steel tine, one bright inharmonic partial, a fast click"""
    f = mid(m); tt = t_(d); tau = 1.3 if m < 72 else 0.9 if m < 84 else 0.5
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) + .28 * np.sin(2 * np.pi * f * 2.0 * tt) * np.exp(-tt / (tau * .5)) + .16 * np.sin(2 * np.pi * f * 6.27 * tt) * np.exp(-tt / .07) + .06 * np.sin(2 * np.pi * f * 11.2 * tt) * np.exp(-tt / .03)
    x[:int(.004 * SR)] += hp(noise(.004), 4000) * .35
    return x * vel * .5

def pluck(m, vel=1.0, d=1.2, bright=3000):
    f = mid(m); n = int(SR / f); ex = lp(noise(n / SR), bright); ex = ex / (np.abs(ex).max() + 1e-9)
    a = np.zeros(n + 2); a[0] = 1; a[n] -= .496; a[n + 1] -= .496
    sig = np.zeros(int(d * SR)); sig[:n] = ex
    y = lp(lfilter([1.0], a, sig), 2500)
    return y * vel * .9

def pad(ms, d, vel=1.0, trem=0.25):
    tt = t_(d); out = np.zeros_like(tt)
    for m in ms:
        f = mid(m)
        for det in (-0.07, 0.0, 0.08):
            ph = rng.random() * 6.28
            out += np.sin(2 * np.pi * f * (1 + det * .01) * tt + ph) + .3 * np.sin(2 * np.pi * f * 2 * (1 + det * .01) * tt + ph) + .12 * np.sin(2 * np.pi * f * 3 * tt + ph)
    out *= (1 - .15 * np.sin(2 * np.pi * trem * tt))
    e = np.minimum(np.minimum(tt / (d * .4), 1), np.minimum((d - tt) / (d * .4), 1)); e = np.clip(e, 0, 1) ** 1.5
    return lp(out, 1400) * e * vel * .06 / max(1, len(ms) ** .5)

def bell(f0=587.33, v=1.0, d=4.0):
    tt = t_(d); out = np.zeros_like(tt)
    for r, a, tau in [(0.5, .5, 3.2), (1.0, 1.0, 2.8), (1.19, .45, 2.0), (1.5, .35, 1.7), (2.0, .7, 1.4), (2.51, .3, 1.0), (3.0, .25, .8), (4.07, .22, .5), (5.43, .12, .3)]:
        out += a * np.sin(2 * np.pi * f0 * r * tt + rng.random() * 6) * np.exp(-tt / tau)
    out[:int(.01 * SR)] += hp(noise(.01), 1500) * .5
    return norm(out) * v

# ------------------------------------------------------------------ foley (material: brass, steel, bone, walnut)
def tick(tock, v=1.0):
    d = .14; tt = t_(d); f = 1850 if tock else 2350
    x = hp(noise(d), 2400) * env_exp(d, .0011) * 1.2
    x += (np.sin(2 * np.pi * f * tt) * env_exp(d, .02) + .35 * np.sin(2 * np.pi * f * 2.76 * tt) * env_exp(d, .009)) * .8
    x += np.sin(2 * np.pi * (410 if tock else 510) * tt) * env_exp(d, .012) * .55
    return norm(x) * v

def ratchet(v=1.0):
    d = .06; tt = t_(d)
    x = hp(noise(d), 3000) * env_exp(d, .0013) + np.sin(2 * np.pi * 1700 * tt) * env_exp(d, .009) * .6 + np.sin(2 * np.pi * 640 * tt) * env_exp(d, .018) * .45
    return norm(x) * v

def steel_click(v=1.0, f=3100):
    d = .09; tt = t_(d)
    x = hp(noise(d), 3500) * env_exp(d, .001) + np.sin(2 * np.pi * f * tt) * env_exp(d, .014) * .7 + np.sin(2 * np.pi * f * 1.51 * tt) * env_exp(d, .01) * .35
    return norm(x) * v

def bowl_ding(v=1.0, f0=1180):
    d = 1.2; tt = t_(d); x = np.zeros_like(tt)
    for r, a, tau in [(1, 1, .35), (2.76, .55, .2), (5.4, .3, .1), (8.9, .15, .05)]:
        x += a * np.sin(2 * np.pi * f0 * r * tt + rng.random() * 6) * np.exp(-tt / tau)
    return norm(x) * v

def felt_thump(v=1.0, f=95):
    d = .3; tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt * (1 - .25 * tt)) * env_exp(d, .06) + lp(noise(d), 420) * env_exp(d, .025) * .6) * v

def tonk(v=1.0):          # brass plank tipping on its hinge: a hollow metal knock and a short wood creak
    d = .35; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) for f, a, tau in [(410, 1, .12), (1090, .6, .07), (2230, .3, .04)])
    x += hp(noise(d), 1800) * env_exp(d, .003) * .8
    return norm(x) * v

def bone_clack(pitch=1.0, v=1.0, slow=1.0):
    d = .12 * (1 + (1 - slow) * 2); tt = t_(d); p = pitch * (.9 + rng.random() * .22) * (0.85 + .15 * slow)
    x = hp(noise(d), 1500) * env_exp(d, .004 / (0.5 + .5 * slow)) + sum(a * np.sin(2 * np.pi * f * p * tt) * np.exp(-tt / (tau / (0.55 + .45 * slow))) for f, a, tau in [(1180, .7, .025), (2350, .45, .012), (420, .5, .035)])
    return norm(x) * v

def whir(d, f_lo, f_hi, v=1.0, rate=3.2, depth=.3):
    """spring-motor whirr with the governor's flutter"""
    tt = t_(d); n = noise(d); out = np.zeros_like(tt)
    for k, (a, b) in enumerate([(f_lo, f_hi), (f_hi * 1.3, f_hi * 2.2)]):
        out += bp(n, a, b) * (1.0 if k == 0 else .35)
    out *= (1 - depth + depth * np.sin(2 * np.pi * rate * tt) ** 2)
    e = np.minimum(tt / .4, 1) * np.minimum((d - tt) / .3, 1)
    return norm(out) * e * v

def roll(pts, kind='b1'):
    t0, t1 = pts[0][0], pts[-1][0]; d = t1 - t0 + .05; tt = t_(d)
    ts = np.array([p[0] for p in pts]) - t0; vs = np.array([p[1] for p in pts]) / 200.0
    v = np.interp(tt, ts, vs, right=0)
    n = noise(d); lo = bp(n, 140, 420) ; mi = bp(n, 700, 1800); hi = bp(n, 2600, 6000)
    out = lo * v ** 1.0 * 1.2 + mi * v ** 1.5 * .8 + hi * v ** 2.2 * .5
    x = np.cumsum(v * 200.0) / SR                                # distance travelled (cm)
    if kind == 'b2':                                              # the corkscrew's wall: scrape at the turning rate
        turn = np.cumsum(v * 200.0 / 75.0) / SR
        out *= (0.75 + .25 * np.sin(2 * np.pi * turn))
    seam = 11.0 if kind == 'b1' else 14.0
    k = np.floor(x / seam); idx = np.where(np.diff(k) > 0)[0]
    for i in idx:
        c = hp(noise(.012), 2200) * env_exp(.012, .002) * (0.25 + v[i] * .6); j = i; out[j:j + len(c)] += c[:max(0, len(out) - j)] * 1.5
    e = np.minimum(tt / .06, 1) * np.minimum((d - tt) / .03, 1)
    return out * e * .5

def rewind_sound(d, v=1.0):
    tt = t_(d); n = noise(d); out = np.zeros_like(tt)
    ph = np.cumsum(1200 * np.exp(-3.0 * tt / d) + 150) / SR
    out += np.sin(2 * np.pi * ph) * .4 + .15 * np.sin(2 * np.pi * ph * 2.01)
    out += bp(n, 600, 3000) * .55
    # accelerating ratchet-like ticks, reversed in feel (swell then decay)
    pos = 0.0; r = 7.0
    while pos < d - .05:
        c = steel_click(.5, 2600) * (0.4 + .6 * np.sin(np.pi * pos / d)); i = int(pos * SR); out[i:i + len(c)] += c[:len(out) - i]
        pos += 1.0 / (r + 38 * (pos / d) ** 2)
    e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.3
    return norm(lp(out, 6000)) * e * v

def scrape(d, v=1.0):
    tt = t_(d); out = bp(noise(d), 900, 4200) * (0.6 + .4 * np.sin(2 * np.pi * 34 * tt)) ; e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** .8
    return norm(out) * e * v

# ------------------------------------------------------------------ helpers
def scale(deg, mode='min', root=62):
    off = [0, 3, 5, 7, 10] if mode == 'min' else [0, 2, 4, 7, 9]
    return root + off[deg % 5] + 12 * (deg // 5)
def note(t, m, vel=1.0, pan=0.0, inst='tine', d=None):
    x = tine(m, vel) if inst == 'tine' else pluck(m, vel) if inst == 'pluck' else None
    add(bus['music'], x, t, 1.0, pan); onsets.append(round(t, 4))

# ------------------------------------------------------------------ room tone
tt = t_(DUR + 1.0)
room = lp(noise(DUR + 1.0), 380) * .018 + bp(noise(DUR + 1.0), 80, 200) * .02
bus['room'][:, 0] = room[:N]; bus['room'][:, 1] = np.roll(room, 311)[:N]
fade_room = np.ones(N); bus['room'] *= fade_room[:, None]

# ------------------------------------------------------------------ foley from the machine's events
tickT = []
for e in EV:
    ty, t = e['type'], e['t']
    if ty == 'tick':
        x = tick(e.get('tock', False)); tickT.append(t); add(bus['tick'], x, t, .9 if e.get('run') != 3 or e['k'] > 0 else 1.1, -0.2 if e.get('tock') else -0.1)
    elif ty == 'roll1start' and False: pass
    elif ty == 'roll':
        add(bus['foley'], roll(e['pts'], e['id']), e['pts'][0][0], .9, -0.2 if e['id'] == 'b1' else 0.15)
    elif ty == 'land':
        add(bus['foley'], bowl_ding(), t, .8, 0.0); add(bus['foley'], felt_thump(.5, 140), t, .5)
    elif ty == 'clunk':
        add(bus['foley'], felt_thump(1.0, 85), t, .8); add(bus['foley'], steel_click(.5, 2000), t, .5)
    elif ty == 'latch':
        add(bus['foley'], steel_click(1.0, 3300), t, .9, 0.2); add(bus['foley'], whir(.6, 400, 1600, .5), t + .02, .5, 0.2)
    elif ty == 'ratchet':
        add(bus['foley'], ratchet(1.0), t, .85 + .1 * rng.random(), 0.3)
    elif ty == 'lift':
        add(bus['foley'], tonk(1.0), t, 1.0, 0.1)
    elif ty == 'domino':
        sl = min(1.0, e.get('rate', 1) * 1.4)
        add(bus['foley'], bone_clack(1.0, 1.0, sl), t, .6, -0.4 + 0.8 * e['i'] / max(1, e['n'] - 1))
    elif ty == 'hit':
        add(bus['foley'], felt_thump(.9, 110), t, .6); add(bus['foley'], bone_clack(.8, 1.0), t, .6)
    elif ty == 'bell':
        add(bus['foley'], steel_click(.7, 2600), t - .02, .6, 0.3)
    elif ty == 'rewind':
        add(bus['foley'], rewind_sound(e['t1'] - t), t, .85)
    elif ty == 'swap':
        d = e['t1'] - t
        for tc, vv in ((0.2, 1), (1.1, 1)): add(bus['foley'], scrape(.9, .8), t + tc, .5, -0.2)
        add(bus['foley'], tonk(.8), t + .75, .7, 0.0); add(bus['foley'], tonk(.8), t + 1.9, .6, 0.0)
        for tc in (2.0, 2.15): add(bus['foley'], scrape(.8, .8), t + tc + .6, .5, .2)
        add(bus['foley'], felt_thump(.7, 120), t + 3.0, .6); add(bus['foley'], steel_click(1.0, 3600), t + 3.02, .8); add(bus['foley'], steel_click(1.0, 2800), t + 3.12, .6)
    elif ty == 'maptick':
        add(bus['foley'], steel_click(.45, 2200 + 140 * e['id']), t, .5, 0.0)
# the spring motor + its gear train hum between the latch and the lift
for run in (1, 2):
    la = next(e for e in EV if e['type'] == 'latch' and e['run'] == run); li = next(e for e in EV if e['type'] == 'lift' and e['run'] == run)
    d = li['t'] - la['t'] + .25; tt = t_(d)
    w = S['wD'] / (2 * np.pi)                                   # D's turns per second
    hum = sum(np.sin(2 * np.pi * (w * 12 * h) * tt + rng.random() * 6) * (1.0 / h) for h in (8, 9, 10, 12)) * (1 - .35 * np.sin(2 * np.pi * 2 * w * tt) ** 2)
    ramp = np.minimum(tt / .5, 1) * (1 - np.clip((tt - (d - .25)) / .25, 0, 1))
    add(bus['foley'], (norm(hum) * .25 + whir(d, 500, 1500, .9, rate=2 * w, depth=.35) * .5) * ramp, la['t'] + .03, .5, 0.1)

# ------------------------------------------------------------------ music
def grid(t0, k): return t0 + k * BEAT
G1, G2, G3 = 0.0, S['RUN2'], S['END0']
def ostinato(t0, k0, k1, mode, vel=1.0, bass=True):
    pats = [[5, 2, 7, 2, 8, 2, 7, 2], [4, 2, 7, 2, 8, 7, 5, 2], [5, 2, 7, 2, 9, 8, 7, 2], [4, 2, 7, 2, 8, 7, 5, 4]]   # scale degrees (root = D4, so 5 = D5)
    for k in range(k0, k1):
        bar = (k - k0) // 4; p = pats[bar % 4]
        for h in range(2):
            i = ((k - k0) % 4) * 2 + h
            if i >= 8: continue
            deg = p[((k - k0) % 4) * 2 + h]
            note(grid(t0, k) + h * BEAT / 2, scale(deg, mode), vel * (1.0 if h == 0 and (k - k0) % 4 == 0 else .62 if h == 0 else .45), pan=-0.25 + .5 * ((k + h) % 2))
        if bass and (k - k0) % 2 == 0:
            root = [38, 38, 36, 33][bar % 4] if mode == 'min' else [38, 38, 43, 40][bar % 4]
            add(bus['music'], pluck(root, .9, 1.2), grid(t0, k), 1.0, -0.1); onsets.append(round(grid(t0, k), 4))
        elif bass:
            add(bus['music'], pluck([45, 45, 43, 40][bar % 4] if mode == 'min' else [45, 45, 50, 47][bar % 4], .5, 0.7), grid(t0, k), .8, -0.1)
# run 1: pad under the ticks, then the box enters on beat 7 and stops dead at beat 17
add(bus['music'], pad([38, 45], 9.0, 1.0), 1.4, 1.0)
ostinato(G1, 7, 17, 'min', 1.0)
note(grid(G1, 17), scale(8, 'min'), .8, 0.0)                     # last note, then silence
# the cascade: each domino is a note up the scale; slow-motion stretches the run into a glissando
doms = [e for e in EV if e['type'] == 'domino' and e['run'] == 1]
for e in doms:
    note(e['t'], scale(2 + int(e['i'] * 0.55), 'min', 62), .5 + .25 * (e['i'] / 26), pan=-0.5 + e['i'] / 26)
hit1 = next(e for e in EV if e['type'] == 'hit' and e['run'] == 1); bell1 = next(e for e in EV if e['type'] == 'bell' and e['run'] == 1)
add(bus['music'], pad([26, 38, 45], 5.0, 1.4), hit1['t'] - .3, 1.0)
add(bus['foley'], bell(587.33, 1.0), bell1['t'], 1.0, 0.1); onsets.append(round(bell1['t'], 4))
# map: one note per link when the tracer reaches it (picture and score share the tracer)
mt = [e for e in EV if e['type'] == 'maptick']
for e, deg in zip(mt, [5, 7, 8, 9, 10, 12, 13, 14]):
    note(e['t'], scale(deg, 'min'), .75, pan=-0.4 + .1 * e['id'])
add(bus['music'], pad([38, 45, 50], S['MAP1'] - S['MAP0'] + .5, 1.0), S['MAP0'] - .2, 1.0)
# rewind: a swell that the foley's rewind sound rides on; sparse notes while the gears are swapped
sw = next(e for e in EV if e['type'] == 'swap')
for k, deg in enumerate([9, 8, 7, 5]): note(sw['t'] + .6 + k * .9, scale(deg, 'min'), .55, pan=.1 * k - .15)
# run 2: major mode, the box never stops (no long wait), a woodblock join
ostinato(G2, 7, 15, 'maj', 1.1)
note(grid(G2, 15), scale(8, 'maj'), .8)
doms2 = [e for e in EV if e['type'] == 'domino' and e['run'] == 2]
for e in doms2: note(e['t'], scale(2 + int(e['i'] * 0.55), 'maj', 62), .55 + .25 * (e['i'] / 26), pan=-0.5 + e['i'] / 26)
bell2 = next(e for e in EV if e['type'] == 'bell' and e['run'] == 2)
add(bus['foley'], bell(587.33, 1.0), bell2['t'], 1.0, 0.1); onsets.append(round(bell2['t'], 4))
cm = S['CMP0'] + 2.6
for k, deg in enumerate([5, 7, 9, 12]): note(cm + k * .16, scale(deg, 'maj'), .8, pan=-0.3 + .2 * k)
add(bus['music'], pad([38, 45, 54], S['CMP1'] - S['CMP0'] + .5, 1.1), S['CMP0'] - .2, 1.0)
# the ending: after the second silence the first tick is the loudest thing; a single box note, a quiet open fifth under the title
note(G3 + 2.5, scale(5, 'maj'), .9)
add(bus['music'], pad([38, 45, 50], DUR - S['END0'] + .8, 1.3, .15), G3 + .8, 1.0)
note(G3 + 4.4, scale(7, 'maj'), .6, 0.1); note(G3 + 5.0, scale(5, 'maj'), .5, -0.1)

# ------------------------------------------------------------------ voice
vdur = {}
vo = {e['id']: e['t'] for e in EV if e['type'] == 'voice'}
voc = np.zeros(N)
for vid, t in vo.items():
    w, sr = sf.read(os.path.join(HERE, 'voices', vid + '.wav'));
    if w.ndim > 1: w = w.mean(1)
    if sr != SR: w = resample_poly(w, SR, sr)
    vdur[vid] = len(w) / SR
    w = compress(w, thr=.12, ratio=3.0); w = w / (np.sqrt(np.mean(w ** 2)) + 1e-9) * .09
    i = int(t * SR); voc[i:i + len(w)] += w[:N - i]
bus['vox'][:, 0] = voc; bus['vox'][:, 1] = voc
# duck: music -7 dB and sound effects -3 dB while the voice speaks
from scipy.ndimage import uniform_filter1d
venv = uniform_filter1d(np.abs(voc), int(.12 * SR)); venv = np.clip(venv / (venv.max() * .35 + 1e-9), 0, 1); venv = uniform_filter1d(venv, int(.25 * SR))
bus['music'] *= (1 - .55 * venv)[:, None]; bus['foley'] *= (1 - .25 * venv)[:, None]; bus['tick'] *= (1 - .08 * venv)[:, None]

# ------------------------------------------------------------------ master
gain = {'music': 1.9, 'foley': 1.0, 'tick': 1.15, 'room': 1.0, 'vox': 1.0}
mix = sum(bus[k] * gain[k] for k in bus)
# fade out at the end
fo = np.clip((DUR - np.arange(N) / SR) / 1.1, 0, 1); mix *= fo[:, None]
for c in (0, 1): mix[:, c] = limit(mix[:, c], .92)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR, subtype='FLOAT')
json.dump({'onsets': sorted(onsets), 'beat': BEAT, 'ticks': tickT}, open(os.path.join(HERE, 'cues.json'), 'w'))
# band-energy report
f = np.abs(np.fft.rfft(mix[:, 0])) ** 2; fr = np.fft.rfftfreq(N, 1 / SR); tot = f.sum()
print('energy 20-120 Hz: %.1f%%, 120-1k: %.1f%%, 1k+: %.1f%%' % (100 * f[(fr > 20) & (fr < 120)].sum() / tot, 100 * f[(fr >= 120) & (fr < 1000)].sum() / tot, 100 * f[fr >= 1000].sum() / tot))
# subtitles: same timing rule as the picture
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return ('%02d:%02d:%06.3f' % (h, m, s)).replace('.', ',')
subs = {e['id']: e['sub'] for e in EV if e['type'] == 'voice'}
out = []
for i, (vid, t) in enumerate(sorted(vo.items(), key=lambda kv: kv[1])):
    t0, t1 = t, t + max(vdur[vid] + .6, 1.9); out.append('%d\n%s --> %s\n%s\n' % (i + 1, ts(t0), ts(t1), subs[vid]))
open(os.path.join(HERE, '..', 'clockwork.srt'), 'w').write('\n'.join(out))
json.dump(vdur, open(os.path.join(HERE, 'voices', 'dur_mix.json'), 'w'))
print('mix written', mix.shape, 'voices', len(vo))
