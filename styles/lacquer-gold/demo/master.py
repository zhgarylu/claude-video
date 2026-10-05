"""Stems (out/stems.npz, written by mix.py) -> out/mix.wav at -14 LUFS with a linked look-ahead limiter.
usage: .venv/bin/python styles/lacquer-gold/demo/master.py [workdir]   (re-run on its own to rebalance without re-synthesising)"""
import sys, os, numpy as np, soundfile as sf
from scipy.signal import sosfilt, butter, lfilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
SR = sfx.SR
GAIN = dict(mus=float(os.environ.get('G_MUS', .55)), duck=float(os.environ.get('DUCK', .6)), fol=float(os.environ.get('G_FOL', .8)), vox=float(os.environ.get('G_VOX', 1.9)))
TARGET, CEIL = -14.0, float(os.environ.get('CEIL', .7))

def lufs(x):   # ITU-R BS.1770 integrated loudness (K-weighting at 48 kHz, 400 ms blocks, absolute and relative gates)
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]
    y = np.stack([lfilter(b2, a2, lfilter(b1, a1, x[:, c])) for c in range(2)], 1)
    n, hop = int(.4 * SR), int(.1 * SR)
    z = np.array([[(y[i:i + n, c] ** 2).mean() for c in range(2)] for i in range(0, len(y) - n, hop)]).sum(1)
    l = -.691 + 10 * np.log10(z + 1e-12); g = l > -70
    rel = -.691 + 10 * np.log10(z[g].mean()) - 10; g &= l > rel
    return -.691 + 10 * np.log10(z[g].mean())

def limit_linked(x, ceil):
    m = np.abs(x).max(1); lim = sfx.limit(m, ceil); gain = np.where(m > 1e-9, lim / np.maximum(m, 1e-9), 1.0)
    return x * np.minimum(1, gain)[:, None]

def master(W):
    S = np.load(os.path.join(W, 'out', 'stems.npz')); MUS, FOL, AMB, BL, VOX, ve = [S[k] for k in ('MUS', 'FOL', 'AMB', 'BL', 'VOX', 'vox_env')]
    duck = 1 - GAIN['duck'] * ve
    mix = MUS * (GAIN['mus'] * duck[:, None]) + FOL * (GAIN['fol'] * (1 - .22 * ve))[:, None] + AMB + BL + VOX * GAIN['vox']
    mix = np.stack([sfx.hp(mix[:, 0], 30, 2), sfx.hp(mix[:, 1], 30, 2)], 1)
    mix = mix + .7 * np.stack([sfx.lp(mix[:, 0], 150, 2), sfx.lp(mix[:, 1], 150, 2)], 1)      # the pads and drum speak a little lower
    mix = np.stack([sfx.lp(mix[:, 0], 14000, 2), sfx.lp(mix[:, 1], 14000, 2)], 1)             # no energy above 14 kHz: keeps the AAC encoder from overshooting on the sparkle
    g = 1.0
    for _ in range(7):
        y = limit_linked(mix * g, CEIL); L = lufs(y)
        if abs(L - TARGET) < .05: break
        g *= 10 ** ((TARGET - L) / 20)
    y = limit_linked(mix * g, CEIL)
    sf.write(os.path.join(W, 'out', 'mix.wav'), y.astype(np.float32), SR)
    pk = np.abs(y).max()
    vm = np.convolve(np.abs(VOX).mean(1), np.ones(int(.2 * SR)) / int(.2 * SR), 'same') > .02
    rm = lambda a: 20 * np.log10(np.sqrt((a[vm] ** 2).mean()) + 1e-9)
    print('master: %.2f LUFS, sample peak %.2f dBFS (ceiling %.2f), gain %.2f dB' % (lufs(y), 20 * np.log10(pk), 20 * np.log10(CEIL), 20 * np.log10(g)))
    print('while speaking (dB rms):  voice %.1f  music %.1f  foley %.1f  ambience %.1f' % (rm(VOX.mean(1) * GAIN['vox'] * g), rm((MUS * (GAIN['mus'] * duck[:, None])).mean(1) * g), rm(FOL.mean(1) * GAIN['fol'] * g), rm((AMB + BL).mean(1) * g)))
    sp = np.abs(np.fft.rfft(y[:, 0])) ** 2; fr = np.fft.rfftfreq(len(y), 1 / SR); band = lambda a, b: 10 * np.log10(sp[(fr >= a) & (fr < b)].sum() + 1e-9)
    print('band energy dB  20-120: %.1f  120-500: %.1f  500-2k: %.1f  2k-8k: %.1f' % (band(20, 120), band(120, 500), band(500, 2000), band(2000, 8000)))

if __name__ == '__main__':
    master(os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else HERE)
