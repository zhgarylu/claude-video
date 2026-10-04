"""events.json -> cues.json for core/render/srt.py: one cue per pencil slip."""
import json, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ev = json.load(open(os.path.join(D, 'events.json')))['ev']
cues = [{'t0': e['t'] + 0.3, 't1': e['t'] + e['d'] - 0.3, 'text': e['text'].replace('\n', ' ')} for e in ev if e['type'] == 'cap']
json.dump(cues, open(os.path.join(D, 'cues.json'), 'w'), indent=1)
print(len(cues), 'cues')
