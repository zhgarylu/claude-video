"""events.json captions -> out/srt.json (cues for core/render/srt.py)"""
import json, os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev = json.load(open(os.path.join(D, 'events.json')))['ev']
cues = [{'t0': round(e['t'], 2), 't1': round(e['t1'], 2), 'text': e['text']} for e in ev if e['type'] == 'caption']
json.dump(cues, open(os.path.join(D, 'out', 'srt.json'), 'w'), indent=1); print(len(cues), 'cues')
