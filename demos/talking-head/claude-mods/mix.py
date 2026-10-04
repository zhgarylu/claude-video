"""配乐 + 拟音 + 人声混音 → out/mix.wav
音乐、拟音都读 events.json（timeline.js 导出），D 大调五声，105 BPM，叠加→冻结→单和弦→减法。
合成乐器：马林巴、颤音琴、毡垫、低频脉冲、沙锤、玻璃点击、铃。无采样，无需下载。"""
import os, sys, json
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, lp, hp, bp, noise, t_, norm, compress, limit, whoosh

rng = np.random.default_rng(11)               # 拟音随机种子独立，换曲不改音效
EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
META = next(e for e in EV if e['type'] == 'meta')
DUR, G0, BAR = META['dur'], META['g0'], META['bar']
N = int(DUR * SR)
FREEZE = (15.98, 16.42)

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def hz(name):
    n = NOTE[name[0]]; i = 1
    if name[i] == '#': n += 1; i += 1
    elif name[i] == 'b': n -= 1; i += 1
    return 440.0 * 2 ** ((n + 12 * (int(name[i:]) + 1) - 69) / 12)
def cents(f, c): return f * 2 ** (c / 1200)

# ───────── 合成乐器（单声道）─────────
def marimba(f, d=.9, v=.8):
    t = t_(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / .38) + .35 * np.sin(2 * np.pi * 4.0 * f * t) * np.exp(-t / .06) \
        + .12 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t / .02)
    y[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
    return y * v
def vibes(f, d=2.6, v=.6):
    t = t_(d)
    trem = 1 + .22 * np.sin(2 * np.pi * 5.2 * t)
    y = (np.sin(2 * np.pi * f * t) + .16 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .3)) * np.exp(-t / 1.7) * trem
    y[:int(.004 * SR)] *= np.linspace(0, 1, int(.004 * SR))
    return y * v
def pad(freqs, d, v=.2, att=.7, rel=.9):
    t = t_(d + rel); y = np.zeros_like(t)
    for f in freqs:
        for c in (-4, 4):
            y += np.sin(2 * np.pi * cents(f, c) * t + rng.random() * 6) + .18 * np.sin(2 * np.pi * 2 * cents(f, c) * t)
    y = lp(y / (len(freqs) * 2), 2600)
    e = np.minimum(1, t / att) * np.where(t < d, 1, np.exp(-(t - d) / (rel / 4)))
    return y * e * v
def sub(f, d=.55, v=.6):
    t = t_(d); return np.sin(2 * np.pi * f * t) * np.exp(-t / .22) * v * np.minimum(1, t / .006)
def shaker(v=.5):
    d = .07; return bp(noise(d), 5200, 9500) * np.exp(-t_(d) / .02) * v
def glass(f, d=.7, v=.6):
    t = t_(d)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / .2) + .5 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / .07)
            + .25 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / .03)) * v
def bell(f, d=2.4, v=.6):
    t = t_(d); y = np.zeros_like(t)
    for m, a, tau in [(1, 1, 1.5), (2.0, .55, 1.0), (2.76, .5, .75), (4.07, .32, .45), (5.4, .2, .28)]:
        y += a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / tau)
    y[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
    return y * v
def felt_tick(v=.5):
    d = .06; t = t_(d)
    return (np.sin(2 * np.pi * 170 * t) * np.exp(-t / .012) * .7 + lp(noise(d), 2400) * np.exp(-t / .006) * .5) * v
def key_tick(v=.5):
    d = .045; t = t_(d)
    return (hp(noise(d), 3200) * np.exp(-t / .0025) * .55 + np.sin(2 * np.pi * 1900 * t) * np.exp(-t / .004) * .18
            + np.sin(2 * np.pi * 190 * t) * np.exp(-t / .01) * .4) * v
def felt_thunk(v=.7, f0=150, f1=60, d=.22):
    t = t_(d); ph = 2 * np.pi * (f1 * t + (f0 - f1) * .06 * (1 - np.exp(-t / .06)))
    return (np.sin(ph) * np.exp(-t / .08) + lp(noise(d), 1200) * np.exp(-t / .02) * .4) * v
def soft_whoosh(d, v=.5):
    w = lp(whoosh(d, 1.0), 4200); n = len(w)
    return w * np.sin(np.linspace(0, np.pi, n)) ** 1.5 * v
def bad_ping(big=False, v=.5):
    """“散”的声音家族：失谐几十音分、随机音色、随机声像"""
    base = rng.choice([311.1, 349.2, 415.3, 466.2, 554.4, 622.3, 740.0])
    f = cents(base, rng.uniform(-60, 60)) * (2 if rng.random() < .3 else 1)
    d = .3 if big else .16; t = t_(d); kind = rng.integers(0, 3)
    if kind == 0: y = np.sign(np.sin(2 * np.pi * f * t)) * .35 * np.exp(-t / .05)
    elif kind == 1: y = np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * f * 1.41 * t) * np.exp(-t / .03)) * np.exp(-t / .08)
    else: y = hp(noise(d), 1800) * np.exp(-t / .012) + np.sin(2 * np.pi * f * t) * np.exp(-t / .04) * .6
    return lp(y, 7000) * v * (1.3 if big else 1)

# ───────── 总线 ─────────
voice_b = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)
foley = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)

# 人声：高通 + 轻压缩 + 电平
v = sf.read(os.path.join(HERE, 'src', 'voice.wav'), dtype='float32')[0]
if v.ndim > 1: v = v.mean(1)
v = hp(v, 70); v = compress(v, thr=.18, ratio=2.6)
v = v * (0.11 / max(1e-6, np.sqrt((v ** 2).mean())))
add(voice_b, v, 0, 1.0, 0)

# ───────── 音乐：D 大调五声，105 BPM ─────────
bar = lambda i: G0 + i * BAR
E8, S16 = BAR / 8, BAR / 16
MAR8 = ['D4', 'A4', 'F#4', 'A4', 'D5', 'A4', 'F#4', 'E4']
MAR16 = ['D5', 'F#5', 'A5', 'F#5', 'E5', 'A5', 'B5', 'A5', 'D5', 'F#5', 'A5', 'B5', 'A5', 'F#5', 'E5', 'D5']
def mar(t, name, g=.5, shift=0, pan=0):
    f = hz(name) * 2 ** (shift / 12); add(music, marimba(f, .8, 1), t, g, pan)
def vib(t, name, d=2.2, g=.3, pan=0): add(music, vibes(hz(name), d, 1), t, g, pan)
def padc(t, names, d, g=.16, att=.7): add(music, pad([hz(n) for n in names], d, 1, att), t, g, 0)
def bass(t, name, g=.4): add(music, sub(hz(name), .6, 1), t, g, 0)

# bar0 开场：单音 + 空拍
vib(bar(0), 'D5', BAR * 1.1, .26); mar(bar(0) + BAR / 2, 'D4', .4)
# 看得见：逐小节叠加（bar1–3）
for b, idxs, vn in [(1, (0, 4), 'A4'), (2, (0, 2, 4, 6), 'F#5'), (3, tuple(range(8)), 'E5')]:
    for i in idxs: mar(bar(b) + i * E8, MAR8[i], .42 + .04 * (i % 2), pan=-.15 + .3 * (i % 2))
    vib(bar(b), vn, BAR * .95, .22, .2)
padc(bar(2), ['D3', 'A3', 'F#4'], BAR * 2.1, .15, att=1.2)
for k in range(4): bass(bar(3) + k * BAR / 4, 'D2', .34)
# 管得住：脉冲 + 稀疏（bar4–6），冻结前
padc(bar(4), ['D3', 'A3', 'D4'], BAR * 2.4, .13, att=.6)
for b in (4, 5, 6):
    for k in range(4):
        tt = bar(b) + k * BAR / 4
        if tt < FREEZE[0]: bass(tt, 'D2', .26)
    for i in (0, 4):
        tt = bar(b) + i * E8
        if tt < FREEZE[0]: mar(tt, MAR8[i], .3, shift=-12, pan=-.2)
# 冻结后：所有声音进同一个调式——Dmaj9 一个和弦
t0 = FREEZE[1] + .02
for n, g in [('D4', .26), ('A4', .22), ('E5', .2), ('F#5', .2)]: vib(t0 + .02 * ['D4', 'A4', 'E5', 'F#5'].index(n), n, 1.5, g, 0)
padc(t0, ['D3', 'A3', 'E4', 'F#4'], 1.2, .17, att=.12)
# 用得顺：十六分马林巴 + 沙锤（bar7–9）
CH = {7: ['D3', 'A3', 'F#4'], 8: ['B2', 'F#3', 'D4'], 9: ['D3', 'A3', 'E4']}
ROOT = {7: ['D2', 'A1', 'D2', 'A1'], 8: ['B1', 'F#2', 'B1', 'F#2'], 9: ['D2', 'A1', 'E2', 'A1']}
for b in (7, 8, 9):
    padc(bar(b), CH[b], BAR * 1.05, .14, att=.25)
    for k in range(4): bass(bar(b) + k * BAR / 4, ROOT[b][k], .3)
    for i in range(16):
        tt = bar(b) + i * S16
        mar(tt, MAR16[i], .26 + (.1 if i % 4 == 0 else 0), pan=-.3 + .6 * ((i % 8) / 7))
        add(music, shaker(1), tt, .07 + (.05 if i % 4 == 2 else 0), .25 if i % 2 else -.25)
    vib(bar(b), ['D5', 'B4', 'E5'][b - 7], BAR * .95, .2, .25)
# 减法：bar10 半，bar11 更少
for i in (0, 2, 4, 6): mar(bar(10) + i * E8, MAR8[i], .34, pan=.1)
padc(bar(10), ['D3', 'A3', 'E4'], BAR * 1.1, .14, att=.3)
for i in (0, 4): mar(bar(11) + i * E8, MAR8[i], .28)
padc(bar(11), ['D3', 'A3'], BAR * 1.0, .1, att=.3)
# 终和弦：落在“马上生效”(29.05)
tF = bar(12)
for k, n in enumerate(['D4', 'A4', 'E5', 'F#5', 'B5']): vib(tF + .025 * k, n, 2.5, .26 - .02 * k, -.2 + .1 * k)
padc(tF, ['D3', 'A3', 'E4', 'F#4'], 1.3, .2, att=.08)
bass(tF, 'D2', .5)
mar(tF, 'D5', .5)

# ───────── 拟音 ─────────
rp = lambda a=.12: rng.uniform(-a, a)
for e in EV:
    ty, t, g = e['type'], e['t'], e.get('gain', 1)
    if ty == 'key': add(foley, key_tick(1), t, .32 * g, rp())
    elif ty == 'bad': add(foley, bad_ping(bool(e.get('big')), 1), t, .38 * g, rng.uniform(-.7, .7))
    elif ty == 'mk': add(foley, marimba(hz(e['pitch']), .55, 1), t, (.5 if e.get('accent') else .36) * g, 0)
    elif ty == 'whoosh': add(foley, soft_whoosh(e['dur'], 1), t, .3 * g, 0)
    elif ty == 'felt': add(foley, felt_thunk(1, 170, 70, .2), t, .38 * g, 0)
    elif ty == 'grain':
        d = .03; tt = t_(d); f = rng.uniform(2200, 5200)
        y = (np.sin(2 * np.pi * f * tt) * np.exp(-tt / .006) + hp(noise(d), 2500) * np.exp(-tt / .004))
        add(foley, y, t, .2 * g, rng.uniform(-.7, .7) if e.get('bad') else rp(.2))
    elif ty == 'glass': add(foley, glass(hz(e['pitch']), .8, 1), t, .5 * g, 0)
    elif ty == 'thunk':
        add(foley, felt_thunk(1, 120, 48, .5), t, .75 * g, 0); add(foley, glass(hz('D5'), 1.0, 1), t + .01, .3, 0)
    elif ty == 'enter': add(foley, felt_thunk(1, 200, 90, .12), t, .42 * g, 0); add(foley, key_tick(1), t, .3 * g, 0)
    elif ty == 'chord':
        for k, n in enumerate(['D5', 'F#5', 'A5']): add(foley, marimba(hz(n), .8, 1), t + .03 * k, .34 * g, 0)
    elif ty == 'chime':
        add(foley, bell(hz('A6'), 2.4, 1), t, .38 * g, 0); add(foley, bell(hz('D7'), 2.0, 1), t + .06, .24 * g, 0)
    elif ty == 'reload':
        d = .72; tt = t_(d); sh = bp(noise(d), 3000, 9500) * np.sin(np.linspace(0, np.pi, len(tt))) ** 2
        add(foley, sh, t, .22 * g, 0)
        for k, n in enumerate(['D6', 'A6', 'E7', 'F#6', 'B6']): add(foley, glass(hz(n), .9, 1), t + .05 + .07 * k, .2, rng.uniform(-.5, .5))

# ───────── 底噪：房间 + 风扇；危险段升高的线圈声 ─────────
tt = t_(DUR)[:N]
room = lp(np.cumsum(noise(DUR))[:N] * 0, 400)           # 占位，下面用 brown
w = np.cumsum(noise(DUR)); w -= np.linspace(w[0], w[-1], len(w)); w = hp(w, 25); w = w / np.abs(w).max()
amb[:, 0] += lp(w[:N], 500) * .006; amb[:, 1] += lp(w[::-1][:N], 500) * .006
fan = bp(noise(DUR)[:N], 140, 420) * .004
amb += fan[:, None]
coil_env = np.clip((tt - 12.4) / (FREEZE[0] - 12.4), 0, 1) * (tt < FREEZE[0])
coil = np.sin(2 * np.pi * (6300 + 40 * np.sin(2 * np.pi * .6 * tt)) * tt) * (.0015 + .009 * coil_env ** 1.5) * (tt >= 12.0)
amb += coil[:, None]

# ───────── 冻结：音乐 / 拟音 / 底噪 数字静音（人声不停）─────────
gate = np.ones(N, np.float32)
a, b = int(FREEZE[0] * SR), int(FREEZE[1] * SR)
gate[a:b] = 0; fi = int(.003 * SR)
gate[a - fi:a] = np.linspace(1, 0, fi); gate[b:b + fi] = np.linspace(0, 1, fi)
for bus in (music, foley, amb): bus *= gate[:, None]

# ───────── 侧链：人声下音乐 ≈ −8 dB，拟音 ≈ −3 dB ─────────
env = np.abs(voice_b[:, 0]); sos = butter(2, 9, 'low', fs=SR, output='sos')
env = np.clip(sosfiltfilt(sos, env), 0, None); env = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
duck_m = 1 - .6 * env; duck_f = 1 - .3 * env

MG, FG = float(os.environ.get('MG', .34)), float(os.environ.get('FG', .5))
vm = env > .3
def rms(x, m): return 20 * np.log10(np.sqrt((x[m] ** 2).mean()) + 1e-9)
print('voiced RMS dB  voice %.1f  music %.1f  foley %.1f' % (rms(voice_b[:, 0], vm), rms(music[:, 0] * duck_m * MG, vm), rms(foley[:, 0] * duck_f * FG, vm)))
print('peak dB        voice %.1f  music %.1f  foley %.1f' % tuple(20 * np.log10(np.abs(x).max() + 1e-9) for x in (voice_b, music * MG, foley * FG)))
mix = voice_b + music * duck_m[:, None] * MG + foley * duck_f[:, None] * FG + amb
# 片尾淡出
fo = int(.7 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
for c in (0, 1): mix[:, c] = limit(mix[:, c], .92)
out = os.path.join(HERE, 'out', 'mix.wav'); os.makedirs(os.path.dirname(out), exist_ok=True)
sf.write(out, mix.astype(np.float32), SR)
print('mix', out, 'rms voice %.1f dB' % (20 * np.log10(np.sqrt((voice_b ** 2).mean()) + 1e-9)),
      'music %.1f dB' % (20 * np.log10(np.sqrt(((music * duck_m[:, None]) ** 2).mean()) + 1e-9)),
      'foley %.1f dB' % (20 * np.log10(np.sqrt(((foley * duck_f[:, None]) ** 2).mean()) + 1e-9)))
