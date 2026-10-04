#!/usr/bin/env python3
"""opera-cel.srt from events.json (voice entries) and voices/dur.json: same timing as the burned-in subtitles."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))['ev']
dur = json.load(open(os.path.join(HERE, 'voices', 'dur.json')))
voices = [e for e in ev if e['type'] == 'voice']
cues = []
for i, e in enumerate(voices):
    t0 = e['t'] - .05; t1 = max(e['t'] + dur[e['id']] + .5, e['t'] + 1.8)
    if i + 1 < len(voices): t1 = min(t1, voices[i + 1]['t'] - .05)
    cues.append({'t0': round(t0, 3), 't1': round(t1, 3), 'text': e['text']})
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'opera-cel.srt')
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'
with open(out, 'w', encoding='utf8') as f:
    for i, c in enumerate(cues, 1): f.write(f"{i}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{c['text']}\n\n")
print('srt', len(cues), 'cues ->', out)
