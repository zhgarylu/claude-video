"""words.json -> out/srt.json (one cue per sung line, from its first word to a beat after its last word, never past the next line)."""
import json, os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = json.load(open(os.path.join(D, 'words.json'))); ids = sorted(W); cues = []
for k, i in enumerate(ids):
    ws = W[i]['words']; t0 = max(0, ws[0][1] - .05); t1 = ws[-1][2] + .5
    if k + 1 < len(ids): t1 = min(t1, W[ids[k + 1]]['words'][0][1] - .04)
    cues.append({'t0': round(t0, 2), 't1': round(max(t1, t0 + 1.2), 2), 'text': W[i]['text'].replace(' ,', ',')})
os.makedirs(os.path.join(D, 'out'), exist_ok=True); json.dump(cues, open(os.path.join(D, 'out', 'srt.json'), 'w'), indent=1)
print(len(cues), 'cues')
