"""Cue check: every key picture hit sits on the music grid (72 BPM, 1/4 beat = 208 ms) or is declared free.
usage: .venv/bin/python styles/neon-sign/demo/tools/cuecheck.py [workdir]"""
import json, os, sys
W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TL = json.load(open(os.path.join(W, 'timeline.json'))); B = TL['BEAT']; T = TL['T']
hits = {k: T[k] for k in ['frame0', 'lettersFrom', 'open', 'off24', 'offBar', 'offHotel', 'lDead', 'blackout', 'restart', 'breaker']}
hits.update({'ret1 (music back)': TL['MUSIC']['back1'], 'dawn (chord)': TL['MUSIC']['dawn']})
bad = 0
for k, t in hits.items():
    q = t / (B / 2); off = (q - round(q)) * (B / 2) * 1000
    flag = 'ok ' if abs(off) < 60 else 'OFF'
    if flag == 'OFF': bad += 1
    print(f'{flag} {k:18s} {t:8.3f}s  beat {t / B:7.2f}  offset from 1/8 grid {off:+6.0f} ms')
print('cuecheck:', 'all on the grid (<= 60 ms)' if not bad else f'{bad} off the grid')
sys.exit(1 if bad else 0)
