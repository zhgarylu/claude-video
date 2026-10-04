"""cues.json (on-screen subtitles) and the .srt from the voice durations and timeline.json.  The banner stays up for
speech + 0.9 s and never less than the reading time the DIRECTOR guide asks for (letters / 15 + 1.5 s) plus the roll-up."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(HERE, 'timeline.json')))
lines = {l['id']: l for l in json.load(open(os.path.join(HERE, 'lines.json')))}
dur = json.load(open(os.path.join(HERE, 'voices/dur.json')))
cues = []
for k, at in tl['voice'].items():
    text = lines[k]['text']; d = dur[k]
    t0 = at - 0.2
    t1 = t0 + max(d + 0.2 + 0.9, len(text) / 15 + 1.5 + 0.35 + 0.45)
    cues.append({'id': k, 't0': round(t0, 2), 't1': round(t1, 2), 'text': text})
for a, b in zip(cues, cues[1:]):
    if a['t1'] > b['t0'] - 0.1: print('subtitle overlap', a['id'], b['id'], a['t1'], b['t0']); sys.exit(1)
json.dump(cues, open(os.path.join(HERE, 'cues.json'), 'w'), indent=1)
json.dump([{'t0': c['t0'] + .2, 't1': c['t1'] - .4, 'text': c['text']} for c in cues], open(os.path.join(HERE, 'srt_cues.json'), 'w'), indent=1)
print('cues ok', [(c['id'], c['t0'], c['t1']) for c in cues])
