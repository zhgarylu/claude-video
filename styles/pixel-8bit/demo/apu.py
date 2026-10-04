"""A five-channel chip synthesiser for the 8-bit console sound: 2 pulse (4 duty cycles), triangle, noise (long / short LFSR), DPCM.

Everything is computed from the chip's own tables: 1.789773 MHz clock, 11-bit timer periods, 8-step duty sequencer,
32-step triangle, 15-bit LFSR with 16 noise periods, 4-bit volumes, envelopes clocked at 240 Hz, the nonlinear mixer.
Notes are quantised to the chip's timer values, so the tuning drifts the way the hardware's did.

    chip = Chip(frames=600)                       # 60 game frames per second
    chip.pulse(0, 0, 62, 24, vol=12, duty=1, env=2, arp=[0, 3, 7])   # channel 0, start frame 0, MIDI 62, 24 frames, arpeggio at 60 Hz
    chip.tri(10, 40, 24); chip.noise(0, 5, 4, vol=10, env=1)
    wav = chip.render()                           # float32 mono, 44.1 kHz
"""
import numpy as np
from scipy.signal import decimate, butter, sosfilt

CPU = 1789773.0
SR = 44100
OS = 4                                           # internal oversampling, so the square edges alias less than a naive loop
DUTY = np.array([[0, 1, 0, 0, 0, 0, 0, 0], [0, 1, 1, 0, 0, 0, 0, 0], [0, 1, 1, 1, 1, 0, 0, 0], [1, 0, 0, 1, 1, 1, 1, 1]])
TRI = np.array(list(range(15, -1, -1)) + list(range(16)))
NOISE_P = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068]
DPCM_P = [428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54]
Q = 4                                            # envelope blocks per game frame (240 Hz)


def lfsr(short):
    r, out = 1, []
    for _ in range(93 if short else 32767):
        out.append(r & 1)
        fb = (r & 1) ^ ((r >> (6 if short else 1)) & 1)
        r = (r >> 1) | (fb << 14)
    return np.array(out)


LFSR = {False: lfsr(False), True: lfsr(True)}
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)


class Chip:
    def __init__(self, frames):
        self.n = frames * Q
        z = lambda: np.zeros(self.n)
        self.ch = {k: {'t': z(), 'v': z(), 'd': z(), 'm': z()} for k in ('p0', 'p1', 'tri', 'noi')}
        self.dpcm_ev = []

    def _note(self, ch, f0, dur, vol, env, pitch, duty=0, mode=0):
        c = self.ch[ch]
        for q in range(int(dur * Q)):
            k = f0 * Q + q
            if k >= self.n: break
            fr = q // Q
            v = vol if env is None else max(0, vol - fr // env)      # decay one volume step every `env` frames
            if q >= dur * Q - 1: v = 0                                 # gate off on the last block
            c['v'][k] = v; c['t'][k] = pitch(q, fr); c['d'][k] = duty; c['m'][k] = mode

    def pulse(self, which, f0, midi, dur, vol=12, duty=2, env=None, arp=None, vib=0.0, slide=0.0):
        ch = 'p%d' % which
        def pitch(q, fr):
            m = midi + (arp[fr % len(arp)] if arp else 0) + slide * q / Q + (vib * np.sin(q / Q * 0.7) if fr > 6 else 0)
            return min(2047, max(8, round(CPU / (16 * hz(m)) - 1)))
        self._note(ch, f0, dur, vol, env, pitch, duty)

    def tri(self, f0, midi, dur, arp=None, slide=0.0):
        def pitch(q, fr):
            m = midi + (arp[fr % len(arp)] if arp else 0) + slide * q / Q
            return min(2047, max(2, round(CPU / (32 * hz(m)) - 1)))
        self._note('tri', f0, dur, 15, None, pitch)       # no volume control on this channel: it is on or off

    def noise(self, f0, dur, period=6, vol=12, env=1, mode=0, slide=0):
        self._note('noi', f0, dur, vol, env, lambda q, fr: int(np.clip(period + slide * fr, 0, 15)), 0, mode)

    def dpcm(self, f0, bits, rate=8):
        """bits: list of 0/1 (delta-modulated sample), played from frame f0; the 7-bit counter moves +-2 per bit."""
        self.dpcm_ev.append((f0, bits, rate))

    def render(self):
        spb = int(round(SR * OS / (60 * Q)))              # samples per envelope block
        total = self.n * spb
        out = {k: np.zeros(total) for k in ('p0', 'p1', 'tri', 'noi', 'dmc')}
        cps = CPU / (SR * OS)                             # chip cycles per internal sample
        pos = np.arange(total) * cps
        blk = np.repeat(np.arange(self.n), spb)
        for key in ('p0', 'p1'):
            c = self.ch[key]; t = c['t'][blk]; step = ((pos // (2 * (t + 1))) % 8).astype(int)
            out[key] = np.where(c['v'][blk] > 0, DUTY[c['d'][blk].astype(int), step] * c['v'][blk], 0)
        c = self.ch['tri']; t = c['t'][blk]; out['tri'] = np.where(c['v'][blk] > 0, TRI[((pos // (t + 1)) % 32).astype(int)], 0)
        c = self.ch['noi']; per = np.array(NOISE_P)[c['t'][blk].astype(int)]
        for mode in (0, 1):
            idx = ((pos // per) % len(LFSR[bool(mode)])).astype(int)
            sel = (c['m'][blk] == mode)
            out['noi'] = np.where(sel & (c['v'][blk] > 0), LFSR[bool(mode)][idx] * c['v'][blk], out['noi'])
        for f0, bits, rate in self.dpcm_ev:               # delta channel: counter walks 0..127
            level, run = 64, []
            for b in bits: level = min(125, level + 2) if b else max(2, level - 2); run.append(level)
            seg = np.repeat(run, int(DPCM_P[rate] / cps)); a = f0 * Q * spb; seg = seg[:max(0, total - a)]
            out['dmc'][a:a + len(seg)] = seg
        p = out['p0'] + out['p1']
        pulse = np.where(p > 0, 95.88 / (8128.0 / np.maximum(p, 1e-9) + 100), 0)          # the chip's nonlinear mixer
        x = out['tri'] / 8227 + out['noi'] / 12241 + out['dmc'] / 22638
        tnd = np.where(x > 0, 159.79 / (1 / np.maximum(x, 1e-12) + 100), 0)
        y = decimate(pulse + tnd, OS, ftype='fir')
        y = sosfilt(butter(1, 37, 'high', fs=SR, output='sos'), y)                           # the console's output high-pass
        y = sosfilt(butter(2, 14000, 'low', fs=SR, output='sos'), y)
        return (y / max(1e-9, np.abs(y).max()) * 0.9).astype(np.float32)
