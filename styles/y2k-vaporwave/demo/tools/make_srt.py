"""Caption cues for the .srt (the film has no voice; the windows are picture, so only the caption is a subtitle)."""
import json, os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); B = lambda n: n * 60 / 68
cues = [{'t0': B(47), 't1': B(54.6), 'text': 'the sun has not set yet'}]
os.makedirs(os.path.join(D, 'out'), exist_ok=True); json.dump(cues, open(os.path.join(D, 'out', 'srt.json'), 'w'))
