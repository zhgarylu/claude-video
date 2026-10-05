"""Every key picture hit against the music grid (75 BPM): offsets from the nearest eighth note, in ms.
usage: .venv/bin/python styles/lacquer-gold/demo/tools/cuecheck.py [workdir]   (exit 1 if a hit is off the grid by > 12 ms)"""
import sys, os, json
W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TL = json.load(open(os.path.join(W, 'timeline.json'))); T, BEAT = TL['T'], TL['BEAT']
hits = {'drop leaves': T['drop'], 'drop lands': T['land'], 'wipe 1': T['wipe1'][0], 'first brush pass': T['brush0'], 'wipe 2': T['wipe2'][0], 'coat 1': T['coat0'],
        'graver enters': T['cut0'], 'wipe 3 (to the silence)': T['wipe3'][0], 'first gold line': T['gold0'], 'powder sprinkled': T['sprinkle0'], 'powder brushed': T['brush_p0'],
        'clouds and sun': T['cloud0'], 'waves': T['wave0'], 'frame rules': T['frame0'], 'key-fret': T['fret0'], 'the turn': T['turn0'], 'lid lifts': T['lift0'],
        'title': T['title0'], 'seal': T['seal']}
bad = 0
for k, t in hits.items():
    q = round(t / (BEAT / 2)); off = (t - q * BEAT / 2) * 1000
    flag = '' if abs(off) <= 12 else '   <-- OFF GRID'; bad += bool(flag)
    print(f'{k:26s} {t:7.3f} s  bar {int((t + 1e-6) // (BEAT * 4)) + 1:2d}  beat {(t + 1e-6) % (BEAT * 4) / BEAT + 1:4.1f}  {off:+6.1f} ms{flag}')
sys.exit(1 if bad else 0)
