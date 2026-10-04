"""配乐 + 拟音 + 人声混音 → out/mix.wav
等距信息图的声音：卡林巴、马林巴、木鱼、沙锤、拨弦低音，全部 numpy 合成（无采样、无下载）。
G 大调五声（G A B D E），110.77 BPM。过程：叠加 → 隐私一句撤掉 → 数字静音 → 问题落下 → 收尾回暖。"""
import os, sys, json
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, lp, hp, bp, noise, t_, compress, limit, whoosh

rng = np.random.default_rng(23)               # 拟音随机种子独立，换曲不改音效
EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
META = next(e for e in EV if e['type'] == 'meta')
DUR, G0, BEAT = META['dur'], META['g0'], META['beat']
N = int(DUR * SR)
QUIET = (27.9, 28.2)                         # 提问前的数字静音（人声不停）
beat = lambda n: G0 + n * BEAT

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def hz(name):
    n = NOTE[name[0]]; i = 1
    if name[i] == '#': n += 1; i += 1
    elif name[i] == 'b': n -= 1; i += 1
    return 440.0 * 2 ** ((n + 12 * (int(name[i:]) + 1) - 69) / 12)

# ───────── 合成乐器（单声道）─────────
def kalimba(f, d=1.1, v=.8):
    t = t_(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / .5) + .16 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / .07) + .06 * np.sin(2 * np.pi * 9.1 * f * t) * np.exp(-t / .03)
    y[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
    y += hp(noise(d), 3500) * np.exp(-t / .004) * .05
    return y * v
def marimba(f, d=.8, v=.8):
    t = t_(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / .34) + .33 * np.sin(2 * np.pi * 4.0 * f * t) * np.exp(-t / .055) + .1 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t / .02)
    y[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
    return y * v
def wood(v=.6, f=880):
    d = .09; t = t_(d)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / .018) + bp(noise(d), 1500, 4000) * np.exp(-t / .008) * .6) * v
def pluck_bass(f, d=.7, v=.7):
    t = t_(d); y = np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * 2 * f * t) + .12 * np.sin(2 * np.pi * 3 * f * t)
    return lp(y * np.exp(-t / .3) * np.minimum(1, t / .004), 900) * v
def shaker(v=.5):
    d = .06; return bp(noise(d), 5500, 10000) * np.exp(-t_(d) / .016) * v
def bell(f, d=2.4, v=.6):
    t = t_(d); y = np.zeros_like(t)
    for m, a, tau in [(1, 1, 1.4), (2.0, .5, .9), (2.76, .45, .7), (4.07, .3, .4), (5.4, .18, .25)]: y += a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / tau)
    y[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR)); return y * v
def pad(freqs, d, v=.2, att=.6, rel=.9):
    t = t_(d + rel); y = np.zeros_like(t)
    for f in freqs:
        for c in (-4, 4): y += np.sin(2 * np.pi * f * 2 ** (c / 1200) * t + rng.random() * 6) + .15 * np.sin(2 * np.pi * 2 * f * t)
    y = lp(y / (len(freqs) * 2), 2400)
    return y * np.minimum(1, t / att) * np.where(t < d, 1, np.exp(-(t - d) / (rel / 4))) * v
def thunk(v=.7, f0=140, f1=55, d=.3):
    t = t_(d); ph = 2 * np.pi * (f1 * t + (f0 - f1) * .05 * (1 - np.exp(-t / .05)))
    return (np.sin(ph) * np.exp(-t / .09) + lp(noise(d), 1000) * np.exp(-t / .02) * .4) * v
def click(v=.5, f=2200):
    d = .03; t = t_(d); return (hp(noise(d), 2500) * np.exp(-t / .003) * .6 + np.sin(2 * np.pi * f * t) * np.exp(-t / .004) * .3) * v
def soft_whoosh(d, v=.5, up=False):
    w = lp(whoosh(d, 1.0), 4600); n = len(w); sh = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return w * sh * v

voice_b = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)
foley = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)

v = sf.read(os.path.join(HERE, 'src', 'voice.wav'), dtype='float32')[0]
if v.ndim > 1: v = v.mean(1)
v = hp(v, 70); v = compress(v, thr=.18, ratio=2.6)
v = v * (0.11 / max(1e-6, np.sqrt((v ** 2).mean())))
add(voice_b, v, 0, 1.0, 0)

# ───────── 音乐：叠加 → 撤掉 → 静默 → 回暖 ─────────
ARP = ['G4', 'B4', 'D5', 'E5', 'D5', 'B4', 'A4', 'B4']
ARP_HI = ['G5', 'B5', 'D6', 'E6', 'D6', 'B5', 'A5', 'B5']
ROOT = ['G2', 'G2', 'D3', 'E2']
def kal(t, name, g=.4, pan=0): add(music, kalimba(hz(name), 1.1, 1), t, g, pan)
def mar(t, name, g=.3, pan=0): add(music, marimba(hz(name), .8, 1), t, g, pan)
def bass(n, name, g=.4): add(music, pluck_bass(hz(name), .7, 1), beat(n), g, 0)

B = lambda t: int(round((t - G0) / BEAT))
s1, s2, s3, sp, s4 = B(7.0), B(13.54), B(18.98), B(24.85), B(28.32)      # 场景起点所在的拍（口播第 2/3/4 句、隐私一句、提问）
# S0 开场：单音 → 每拍一音
kal(beat(0), 'G4', .45)
for n in range(2, s1):
    kal(beat(n), ARP[(n * 2) % 8], .3 + .02 * n, pan=-.2 + .4 * (n % 2))
    if n >= s1 - 5: add(music, shaker(1), beat(n) + BEAT / 2, .06, .2)
for n in range(s1 - 5, s1, 2): bass(n, 'G2', .32)
# S1 本体：完整八分琶音 + 低音；后半加马林巴反拍
for n in range(s1, s2):
    for h in range(2):
        i = ((n - s1) * 2 + h) % 8; tt = beat(n) + h * BEAT / 2
        kal(tt, ARP[i], .3, pan=-.3 + .6 * (i / 7))
        if n >= s1 + 6 and h == 1: mar(tt, ARP[(i + 3) % 8], .2, pan=.3)
        add(music, shaker(1), tt + BEAT / 4, .05, .25 if h else -.25)
    bass(n, ROOT[(n - s1) % 4], .36)
# S2 延伸：加木鱼二四拍，后半高八度
for n in range(s2, s3):
    arp = ARP_HI if n >= s2 + 6 else ARP
    for h in range(2):
        i = ((n - s2) * 2 + h) % 8; tt = beat(n) + h * BEAT / 2
        kal(tt, arp[i], .28, pan=-.3 + .6 * (i / 7))
        add(music, shaker(1), tt + BEAT / 4, .055, .25 if h else -.25)
    if n % 2 == 1: add(music, wood(1), beat(n), .22, .2)
    bass(n, ROOT[(n - s2) % 4], .36)
    if n >= s2 + 8: mar(beat(n) + BEAT / 2, ARP[(n * 3) % 8], .2, .3)
# S3 小企业版：热闹；隐私一句起撤掉到只剩低音和一个高音
for n in range(s3, sp):
    for h in range(2):
        i = ((n - s3) * 2 + h) % 8; tt = beat(n) + h * BEAT / 2
        kal(tt, ARP_HI[i], .26, pan=-.3 + .6 * (i / 7)); mar(tt, ARP[(i + 2) % 8], .16, .3)
        add(music, shaker(1), tt + BEAT / 4, .06, .25 if h else -.25)
    add(music, wood(1), beat(n), .2, -.2); bass(n, ROOT[(n - s3) % 4], .38)
for n in range(sp, s4 - 1, 2): bass(n, 'G2', .34); kal(beat(n), 'B5', .2, .2)
add(music, pad([hz('G2'), hz('D3')], BEAT * 4, 1, .8), beat(sp), .09, 0)
# S4 提问：数字静音后第一声 —— 低音 + 铃（最重要的一声）
bass(s4, 'G2', .5); add(music, bell(hz('G5'), 2.6, 1), beat(s4), .3, 0)
add(music, pad([hz('G2'), hz('D3'), hz('B3')], BEAT * 5, 1, .7), beat(s4), .12, 0)
# 回暖收尾：琶音回来，终和弦
sO, sF = B(30.0), B(32.5)
for n in range(sO, sF):
    for h in range(2):
        i = ((n - sO) * 2 + h) % 8; kal(beat(n) + h * BEAT / 2, ARP_HI[i], .22 + .01 * (n - sO), pan=-.3 + .6 * (i / 7))
    if n % 2 == 0: bass(n, ROOT[(n - sO) % 4], .34)
tF = beat(sF)
for k, nm in enumerate(['G4', 'B4', 'D5', 'A5', 'E6']): kal(tF + .03 * k, nm, .34 - .03 * k, -.25 + .125 * k)
add(music, bell(hz('G5'), 3.0, 1), tF, .3, 0); bass(sF, 'G2', .5)
add(music, pad([hz('G2'), hz('D3'), hz('B3'), hz('A4')], 2.2, 1, .25), tF, .16, 0)

# ───────── 拟音 ─────────
rp = lambda a=.15: rng.uniform(-a, a)
for e in EV:
    ty, t, g = e['type'], e['t'], e.get('gain', 1)
    if ty == 'pop': add(foley, kalimba(hz(e['pitch']), .9, 1), t, .5 * g, rp(.3))
    elif ty == 'chime':
        add(foley, bell(hz('G6'), 2.2, 1), t, .38 * g, 0); add(foley, bell(hz('D6'), 2.0, 1), t + .07, .26 * g, 0)
    elif ty == 'drop': add(foley, thunk(1, 150, 60, .22), t, .5 * g, 0); add(foley, click(1), t, .22 * g, 0)
    elif ty == 'rise':
        d = .5; tt = t_(d); sw = np.sin(2 * np.pi * (220 * tt + 380 * tt ** 2 / (2 * d))) * np.sin(np.linspace(0, np.pi, len(tt))) ** 1.5
        add(foley, lp(sw, 3000) * .5 + soft_whoosh(d, .25), t, .3 * g, 0)
    elif ty == 'hop':
        d = .3; tt = t_(d); add(foley, np.sin(2 * np.pi * (300 * tt + 900 * tt ** 2 / (2 * d))) * np.exp(-tt / .12), t, .3 * g, 0)
    elif ty == 'whoosh': add(foley, soft_whoosh(e['dur'], 1), t, .3 * g, 0)
    elif ty == 'slide':
        d = .5; tt = t_(d); add(foley, bp(noise(d), 800, 5000) * np.sin(np.linspace(0, np.pi, len(tt))) ** 2, t, .22 * g, 0)
    elif ty == 'lock': add(foley, click(1, 1600), t, .5 * g, 0); add(foley, click(1, 2600), t + .09, .5 * g, 0); add(foley, thunk(1, 200, 90, .12), t + .09, .25 * g, 0)
    elif ty == 'lockdrop':
        add(foley, thunk(1, 120, 45, .55), t + .42, .8 * g, 0); add(foley, bell(hz('D4'), 1.4, 1), t + .43, .18 * g, 0)
        add(foley, soft_whoosh(.45, 1), t, .3 * g, 0)
    elif ty == 'tick': add(foley, click(1, 1900 + rng.uniform(-200, 200)), t, .3 * g, rp(.5))
    elif ty == 'ring': add(foley, bell(hz('D7'), 1.2, 1), t, .1 * g, rp(.5))

# ───────── 底噪：房间 ─────────
w = np.cumsum(noise(DUR)); w -= np.linspace(w[0], w[-1], len(w)); w = hp(w, 25); w = w / np.abs(w).max()
amb[:, 0] += lp(w[:N], 700) * .005; amb[:, 1] += lp(w[::-1][:N], 700) * .005

# ───────── 数字静音（人声不停）─────────
gate = np.ones(N, np.float32)
a, b = int(QUIET[0] * SR), int(QUIET[1] * SR); fi = int(.003 * SR)
gate[a:b] = 0; gate[a - fi:a] = np.linspace(1, 0, fi); gate[b:b + fi] = np.linspace(0, 1, fi)
for bus in (music, foley, amb): bus *= gate[:, None]

# ───────── 侧链：人声下音乐 ≈ −8 dB，拟音 ≈ −3 dB ─────────
env = np.abs(voice_b[:, 0]); sos = butter(2, 9, 'low', fs=SR, output='sos')
env = np.clip(sosfiltfilt(sos, env), 0, None); env = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
duck_m = 1 - .6 * env; duck_f = 1 - .3 * env
MG, FG = float(os.environ.get('MG', .34)), float(os.environ.get('FG', .55))
vm = env > .3
rms = lambda x, m: 20 * np.log10(np.sqrt((x[m] ** 2).mean()) + 1e-9)
print('voiced RMS dB  voice %.1f  music %.1f  foley %.1f' % (rms(voice_b[:, 0], vm), rms(music[:, 0] * duck_m * MG, vm), rms(foley[:, 0] * duck_f * FG, vm)))
print('peak dB        voice %.1f  music %.1f  foley %.1f' % tuple(20 * np.log10(np.abs(x).max() + 1e-9) for x in (voice_b, music * MG, foley * FG)))
mix = voice_b + music * duck_m[:, None] * MG + foley * duck_f[:, None] * FG + amb
fo = int(.9 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
for c in (0, 1): mix[:, c] = limit(mix[:, c], .92)
out = os.path.join(HERE, 'out', 'mix.wav'); os.makedirs(os.path.dirname(out), exist_ok=True)
sf.write(out, mix.astype(np.float32), SR)
print('mix', out)
