"""pixel-8bit.srt from the same event list: every 'msg' and 'text' event is one cue (the on-screen English lines)."""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(here, 'out/events.json')))['ev']
def ts(f):
    ms = round(f / 60 * 1000); return '%02d:%02d:%02d,%03d' % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)
cues = sorted([(e['f'], e['f1'], e['text']) for e in ev if e['type'] in ('msg', 'text')])
with open(os.path.join(here, '..', 'pixel-8bit.srt'), 'w', encoding='utf-8') as fh:
    for i, (a, b, t) in enumerate(cues, 1): fh.write(f'{i}\n{ts(a)} --> {ts(b)}\n{t}\n\n')
print(len(cues), 'cues')
