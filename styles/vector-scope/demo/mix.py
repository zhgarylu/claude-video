"""Score + foley + voice -> out/mix.wav for "Hold the Fifth"; also out/scope.bin (the samples the page draws) and out/scope.json.
Everything is synthesised in numpy (no samples). Reads timeline.json, vfont.json, voice/*.wav.
usage: .venv/bin/python styles/vector-scope/demo/mix.py"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio')); sys.path.insert(0, HERE)
import sfx
from sfx import SR, t_, bp, lp, hp, env_exp, norm
import scope

TL = scope.TL; T = TL['T']; VO = TL['VO']; DUR = TL['DUR']; BEAT = TL['BEAT']; BAR = TL['BAR']
N = int(round(DUR * SR)); tt = np.arange(N) / SR
rng = np.random.default_rng(81)
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
def noise(d): return rng.standard_normal(int(round(d * SR)))
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4); x = np.stack([x * l, x * r], 1) * 1.414
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s] * gain
def interp(pts): return np.interp(tt, [p[0] for p in pts], [p[1] for p in pts])

# ------------------------------------------------------------------ the scope stem
L, R, Z, FL, FR, info = scope.build()
scope.write_bin(L, R, Z, os.path.join(OUT, 'scope.bin'))
ds = 960   # 50 Hz readout table
json.dump({'sr': SR, 'n': N, 'fl': [round(float(v), 2) for v in FL[::ds]], 'fr': [round(float(v), 2) for v in FR[::ds]], 'fps': SR / ds,
           'detents': info['detents'], 'letters': info['letters'], 'd0': info['d0']}, open(os.path.join(OUT, 'scope.json'), 'w'))
stem = np.stack([L, R], 1)
# the word is a buzzy 100 Hz note; for the speakers it gets a gentle roll-off (the picture is drawn from the unfiltered samples)
iw0, iw1 = int(T['word0'] * SR), int((T['powerOff'] + .1) * SR)
for c in (0, 1): stem[iw0:iw1, c] = lp(stem[iw0:iw1, c], 5500, 1)

# ------------------------------------------------------------------ bed: a mains hum and the fizz of a high-voltage supply
on = interp([(0, 0), (T['relay'], 0), (T['relay'] + .06, .6), (T['relay'] + 1.4, 1), (T['toneOff'], 1), (T['toneOff'] + .5, .22), (T['return'] - .1, .22), (T['return'], 1),
             (T['off2'] + .1, 1), (T['off2'] + .6, .22), (T['word0'] - .1, .22), (T['word0'], 1), (T['powerOff'], 1), (T['powerOff'] + .1, 0), (DUR, 0)])
hum = (np.sin(2 * np.pi * 100 * tt) * .5 + np.sin(2 * np.pi * 200 * tt + 1) * .22 + np.sin(2 * np.pi * 300 * tt + 2) * .1) * .028
hum += lp(noise(DUR), 160, 2) * .02
fizz = hp(noise(DUR), 5500, 2) * .0045 * (1 + .5 * np.sin(2 * np.pi * .13 * tt))
bed = np.stack([(hum + fizz) * on, (hum + fizz * np.roll(np.ones(N), 1)) * on], 1)

# ------------------------------------------------------------------ foley (all numpy)
def relay(v=1.0):
    d = .18; x = t_(d)
    a = hp(noise(d), 1800) * env_exp(d, .004) + sum(np.sin(2 * np.pi * f * x) * env_exp(d, tau) * g for f, tau, g in [(1250, .03, .5), (2650, .02, .35), (4100, .008, .15)])
    a += np.sin(2 * np.pi * 85 * x) * env_exp(d, .035) * .9
    return norm(a) * v
def tick(f=1900, v=1.0):
    d = .05; x = t_(d); return norm(hp(noise(d), 3500) * env_exp(d, .0012) * .5 + np.sin(2 * np.pi * f * x) * env_exp(d, .006)) * v
def detent(v=1.0):
    d = .08; x = t_(d); return norm(np.sin(2 * np.pi * 760 * x) * env_exp(d, .01) + bp(noise(d), 500, 2400) * env_exp(d, .004) * .7) * v
def ding(f=1760, v=1.0):
    d = 1.2; x = t_(d); return norm(sum(np.sin(2 * np.pi * f * k * x) * env_exp(d, tau) * g for k, tau, g in [(1, .32, 1), (1.5, .2, .35), (2.01, .12, .2)]) * np.minimum(1, x / .002)) * v
def blip(f, v=1.0, d=.09):
    x = t_(d); return np.sin(2 * np.pi * f * x) * env_exp(d, .022) * np.minimum(1, x / .002) * v
def thunk(f=62, d=.7, v=1.0):
    x = t_(d); return norm(np.sin(2 * np.pi * f * x * (1 + .5 * np.exp(-x / .05))) * env_exp(d, d / 4) + hp(noise(d), 1500) * env_exp(d, .004) * .3) * v
def whoosh_soft(d=1.2, v=1.0):
    x = noise(d); e = np.sin(np.pi * t_(d) / d) ** 2; return norm(bp(x, 400, 5000, 2) * e) * v
def collapse(d=1.0):
    x = t_(d); f = 1800 * np.exp(-x / .2) + 38; ph = 2 * np.pi * np.cumsum(f) / SR
    return norm(np.sin(ph) * np.minimum(1, (d - x) / .1) * (np.exp(-x / .45)) + hp(noise(d), 4000) * env_exp(d, .05) * .25)
def degauss(d=1.4):
    x = t_(d); return norm(np.sin(2 * np.pi * 100 * x + 3 * np.sin(2 * np.pi * 7 * x) * np.exp(-x / .3)) * np.exp(-x / .35) * np.minimum(1, x / .01)) * .7
fo = np.zeros((N, 2))
add(fo, relay(1.0), T['relay'], .8, -.1); add(fo, degauss(), T['relay'] + .06, .5, 0)
add(fo, hp(noise(1.2), 6000) * np.sin(np.pi * t_(1.2) / 1.2) ** 2 * .02, T['relay'] + .1, 1, 0)
add(fo, tick(2400, .5), T['dot'], .5, 0)
add(fo, tick(1500, .5), T['lOnly0'] - .02, .35, -.8); add(fo, tick(1500, .5), T['rOnly0'] - .02, .35, .8); add(fo, relay(.7), T['both'] - .02, .4, 0)
add(fo, relay(.7), T['glide0'], .4, 0)
for k, td in enumerate(info['detents']): add(fo, detent(1.0), td, .42 + .06 * min(k, 6), -.3 + (k % 3) * .3)
add(fo, ding(1760, 1.0), T['lock'], .55, 0); add(fo, relay(.9), T['lock'] - .01, .6, 0)
add(fo, relay(.8), T['return'], .5, 0)
for k in range(3): add(fo, blip(1480 + 220 * k, .9), T['touch3'] + .1 * k, .3, -.4 + .4 * k)
for k in range(2): add(fo, blip(1100 + 200 * k, .9), T['touch2'] + .1 * k, .3, .5 + .2 * k)
for k, key in enumerate(['octave', 'fourth', 'third']):
    add(fo, relay(.8), T[key] - .02, .5, 0); add(fo, tick(1700 + 250 * k, 1), T[key] + .25, .5, .55)
add(fo, relay(.7), T['reveal'] - .12, .4, 0)
add(fo, thunk(52, .9, 1), T['detune0'], .5, 0)
add(fo, whoosh_soft(2.6, 1), T['reveal'] - .2, .22, 0)
for lt in info['letters']:                       # key tick per letter, at the moment the pen reaches it
    u = lt['u']; lo, hi = 0., 1.
    for _ in range(40):
        mid = (lo + hi) / 2
        if scope.smooth(mid) < u: lo = mid
        else: hi = mid
    add(fo, tick(2000 + 120 * (ord(lt['ch']) % 5), .9), T['word0'] + (T['word1'] - T['word0']) * lo + .012, .38, .2)
add(fo, collapse(1.1), T['powerOff'], .6, 0); add(fo, thunk(48, 1.0, 1), T['powerOff'] + .02, .5, 0)
add(fo, relay(1.0), T['powerOff'] + .95, .55, 0)

# ------------------------------------------------------------------ music that is not on the scope: bass, kick, hat, blips
def bass(f, d, v=1.0):
    x = t_(d); s = np.sin(2 * np.pi * f * x) + .45 * np.sin(2 * np.pi * 2 * f * x) * np.exp(-x / .25) + .22 * np.sin(2 * np.pi * 3 * f * x) * np.exp(-x / .12)
    return s * np.minimum(1, x / .01) * np.minimum(1, (d - x) / .08) * v * .55
def kick(v=1.0):
    d = .3; x = t_(d); f = 46 + 90 * np.exp(-x / .035); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * env_exp(d, .11) + hp(noise(d), 2500) * env_exp(d, .003) * .25) * v
def hat(v=1.0, o=False):
    d = .22 if o else .05; return hp(noise(d), 7500) * env_exp(d, .07 if o else .012) * v * .35
mus = np.zeros((N, 2))
def A(t, f, d, v=1., pan=0.): add(mus, bass(f, d, v), t, 1.0, pan)
# drift: a root per two bars, held; the lock lands on a low A
for k in range(2): A(T['glide1'] + k * 2 * BAR, 55., 2 * BAR - .1, .8)
A(T['glide1'] + 4 * BAR, 55., T['toneOff'] - (T['glide1'] + 4 * BAR) - .05, .9)
# gallery: the bass follows the root (fL / 2 or / 4), one note per shape
A(T['return'] + .0, 55., 5.2, .5)
A(T['octave'], 82.5, 1.3, .9); A(T['fourth'], 55., 1.3, .9); A(T['third'], 98., 1.3, .9)
for b in range(int(round((T['third'] + 1.4) / BEAT)), int(round(T['reveal'] / BEAT))):        # quarter-note pulse through the tangle
    t = b * BEAT
    if t < T['reveal'] - .2: A(t, 98., BEAT * .8, .85)
# kick/hat: soft from bar 11, full in the tangle
for b in range(int(round(29.3333 / BEAT)), int(round((T['reveal'] - .1) / BEAT))):
    t = b * BEAT; full = t >= 37.3
    add(mus, kick(1.0 if full else .55), t, 1.0, 0)
    add(mus, hat(.7 if full else .4), t + BEAT / 2, 1.0, .3)
    if full: add(mus, hat(.4), t + BEAT / 4, 1.0, -.2); add(mus, hat(.5, True), t + 3 * BEAT / 4, 1.0, .35)
# blips: a sparse eighth-note sequence from the harmonic series of the current root, with a ping-pong echo
def blips(a, b, f0):
    t = a; k = 0; pat = [4, 6, 8, 6, 4, 8, 6, 12]
    while t < b - .01:
        f = f0 * pat[k % 8]; x = blip(f, .35)
        add(mus, x, t, 1.0, -.5); add(mus, x * .4, t + .75 * BEAT / 2 * 2 / 2 * 1.0, 1.0, .5); add(mus, x * .16, t + 1.5 * BEAT, 1.0, -.4)
        t += BEAT / 2; k += 1
blips(29.3333, T['octave'] - .1, 220.); blips(T['octave'], T['fourth'] - .1, 165.); blips(T['fourth'], T['third'] - .1, 220.); blips(T['third'], T['detune0'] - .1, 196.)
# reveal: slow low roots under the walking fifth
A(T['reveal'], 55., 2.6, .8); A(T['step1'], 82.5, 2.6, .8); A(T['step2'], 55., 1.0, .9)
# gate the real silences
gate = np.ones(N)
for a, b in [(T['toneOff'] + .05, T['return'] - .02)]:
    ia, ib = int(a * SR), int(b * SR); gate[ia:ib] = 0
gate[int((T['off2'] + .3) * SR):int(T['word0'] * SR - .02 * SR)] = 0
mus *= gate[:, None]
mus *= np.clip((tt - T['glide1']) / .5, 0, 1)[:, None] * (tt < T['powerOff'])[:, None]
# the quiet ring of a fading bass note must not creep into the silence (we gate it hard above)
# a touch of room for the non-scope music (short comb-ish reverb)
IR = lp(noise(1.2), 4500) * np.exp(-np.arange(int(1.2 * SR)) / SR / .3); IR[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
from scipy.signal import fftconvolve
wet = np.stack([fftconvolve(mus[:, c], IR * (1 if c == 0 else -1))[:N] for c in (0, 1)], 1) * .06
wet *= gate[:, None]
music = mus + wet

# ------------------------------------------------------------------ the scope stem as it is heard (hard left / hard right)
stem_gate = np.ones(N)
vol_stem = stem * 0.24

# ------------------------------------------------------------------ voice (mono, centre, not on the scope)
voice = np.zeros((N, 2)); vo_env = np.zeros(N)
for v in VO:
    x, sr = sf.read(os.path.join(HERE, 'voice', v['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
    x = soxr.resample(x, sr, SR).astype(np.float64)
    x = hp(x, 90, 2); x = sfx.compress(x / np.abs(x).max(), .22, 3.5, .004, .09); x = x / np.abs(x).max()
    add(voice, x, v['t'], .85, 0)
    i0 = int(v['t'] * SR); vo_env[i0:i0 + len(x)] = 1
vo_env = uniform_filter1d(maximum_filter1d(vo_env, size=int(.4 * SR)), size=int(.2 * SR))

# ------------------------------------------------------------------ mix
duck_s = 1 - .5 * vo_env; duck_m = 1 - .55 * vo_env; duck_f = 1 - .25 * vo_env
mix = bed * 1.9 + fo * 1.5 * duck_f[:, None] + vol_stem * 1.0 * duck_s[:, None] + music * .11 * duck_m[:, None] + voice * 1.55
def master(m):
    out = np.zeros_like(m)
    for c in (0, 1):
        x = sfx.compress(m[:, c], .08, 3.0, .005, .2); k = .2; x = k * np.tanh(x / k); out[:, c] = sfx.limit(x, .16, .01)
    return out
mix = master(mix)
sf.write(os.path.join(OUT, 'mix.wav'), mix.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav %.1fs rms dB: mix %.1f | stem %.1f music %.1f foley %.1f bed %.1f voice(active) %.1f' % (DUR, rms(mix), rms(vol_stem), rms(music * .11), rms(fo * 1.5), rms(bed * 1.9), rms(voice[voice != 0] * 1.55)))
def seg(a, b): return rms(mix[int(a * SR):int(b * SR)])
vm = vo_env > .5
print('during voice: voice %.1f stem %.1f music %.1f' % (rms(voice[vm] * 1.55), rms((vol_stem * duck_s[:, None])[vm]), rms((music * .11 * duck_m[:, None])[vm])))
print('silence 1 (%.1f..%.1f) %.1f dB, silence 2 %.1f dB, lock %.1f dB' % (T['toneOff'] + .1, T['return'] - .05, seg(T['toneOff'] + .1, T['return'] - .05), seg(T['off2'] + .4, T['word0'] - .05), seg(T['lock'] + .1, T['lock'] + .6)))
