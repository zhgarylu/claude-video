"""Subtitles for the film's on-screen type: every text event in out/events.json becomes a cue (the words are the picture's own lettering)."""
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ev = [e for e in json.load(open(os.path.join(D, 'out', 'events.json')))['ev'] if e['type'] == 'text']
words = [e for e in ev if not e['text'].replace('.', '').replace('×', '').replace(' ', '').isdigit() and '+' not in e['text']]
def fmt(t):
    ms = int(round(t * 1000)); return '%02d:%02d:%02d,%03d' % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)
out = []
for i, e in enumerate(words, 1):
    out.append(f"{i}\n{fmt(e['t'])} --> {fmt(e['t1'])}\n{e['text']}\n")
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '..', 'constructivist.srt')
open(dst, 'w').write('\n'.join(out))
print(len(words), 'cues ->', dst)
