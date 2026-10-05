"""翻牌显示屏 × 高铁站 的声音：人声是视频自带音轨；翻牌的哗啦声由页面算出的每 40 ms 翻牌数（events.json 的 flaps）合成；
再加大厅的空气底噪、很轻的和弦垫和脉冲。翻牌的位置（左右声像）来自格子所在的列。"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, LIB); sys.path.insert(0, os.path.join(LIB, 'tools', 'talk'))
from mix_helpers import load_voice, voice_env, duck, finish
from core.audio.sfx import SR, add, lp, hp, bp, noise, t_
E = json.load(open(os.path.join(HERE, 'events.json'))); EV = [e for e in E['ev'] if e['type'] == 'flaps']; DUR = E['dur']; N = int(DUR * SR)
rng = np.random.default_rng(11); hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

def clack(d=.035, f=None):                                         # 一片翻牌落下：很短的噪声 + 一点木质的“嗒”
    t = t_(d); f = f or rng.uniform(900, 1500)
    y = bp(noise(d), 1800, 6500) * np.exp(-t / .006) * .8 + np.sin(2 * np.pi * f * t) * np.exp(-t / .009) * .35
    y[:int(.0008 * SR)] *= np.linspace(0, 1, int(.0008 * SR)); return y
def pad(freqs, d, att=1.5):
    t = t_(d + 1.5); y = np.zeros_like(t)
    for f in freqs:
        for c in (-7, 7): y += np.sin(2 * np.pi * f * 2 ** (c / 1200) * t + hash((f, c)) % 6)
    y = lp(y / (len(freqs) * 2), 1400); return y * np.minimum(1, t / att) * np.where(t < d, 1, np.exp(-(t - d) * 2.5))

voice = np.zeros((N, 2), np.float32); v = load_voice(os.path.join(HERE, 'src', 'voice.wav'))[:N]; voice[:len(v), 0] = voice[:len(v), 1] = v
foley = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
# 翻牌
total = 0
for e in EV:
    n = int(e['n']); total += n; k = min(n, 24)                         # 同一档里最多铺 24 声，再用音量表示更多
    g = min(1.0, .10 + .06 * np.sqrt(n))
    for i in range(k): add(foley, clack(), e['t'] + rng.uniform(0, .04), g * rng.uniform(.5, 1.0) / np.sqrt(max(1, k / 4)), float(np.clip(e['x'] + rng.uniform(-.1, .1), -1, 1)))
print('flaps', total, 'bins', len(EV))
# 空气底噪（大厅）+ 很远的列车低频
w = np.cumsum(noise(DUR)); w -= np.linspace(w[0], w[-1], len(w)); w = hp(w, 30); w = w / np.abs(w).max()
amb[:, 0] += lp(w[:N], 500) * .006; amb[:, 1] += lp(w[::-1][:N], 500) * .006
# 和弦垫（A 小调）与稀疏的脉冲
add(music, pad([hz(45), hz(57), hz(64)], 9.0), .0, .09, 0); add(music, pad([hz(45), hz(57), hz(60), hz(64)], 10.0), 9.5, .09, 0); add(music, pad([hz(43), hz(55), hz(62), hz(67)], 11.0), 19.5, .09, 0)
for n in range(int(DUR / (60 / 96))):
    t0 = n * 60 / 96 + .2
    tt = t_(.05); add(music, np.sin(2 * np.pi * hz(93) * tt) * np.exp(-tt / .015), t0, .035, 0)
env = voice_env(voice)
mix = voice + music * duck(env, 6)[:, None] + foley * duck(env, 2.5)[:, None] * .9 + amb
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'mix.wav'), finish(mix).astype(np.float32), SR); print('mix ok', DUR, 's')
