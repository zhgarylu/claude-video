"""Subtitles for Mostly Air: cues come from the same CAPS the picture draws (via events.json).
Checks every cue against the spoken words (word times from the speech check) and the hold rules, then writes felt.srt."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); DEMO = os.path.dirname(HERE)
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(DEMO, '..', '..', '..'))
ev = json.load(open(os.path.join(DEMO, 'events.json')))['ev']
caps = sorted([e for e in ev if e['type'] == 'cap'], key=lambda e: e['t'])
voice = {e['id']: e['t'] for e in ev if e['type'] == 'voice'}
words = json.load(open(os.path.join(DEMO, 'out', 'voice', 'words.json')))
seq = []   # (letters, abs_start, abs_end)
SPELL = {'40': 'forty', '400': 'fourhundred', '4,000': 'fourthousand'}
for vid in sorted(voice, key=lambda v: voice[v]):
    for w, a, b in words[vid]: seq.append((re.sub(r'[^a-z]', '', SPELL.get(w.strip('.,'), w).lower()), voice[vid] + max(0, a), voice[vid] + max(0.05, b)))
cues, bad, i = [], 0, 0
for c in caps:
    need = len(re.sub(r'[^a-z]', '', c['text'].lower())); got = 0; first = i
    while i < len(seq) and got < need - 1: got += len(seq[i][0]); i += 1
    s0, s1 = seq[first][1], seq[i - 1][2]
    hold = c['t1'] - c['t']
    ok = c['t'] <= s0 + .2 and c['t'] >= s0 - .7 and c['t1'] >= s1 + .2 and hold >= 1.8 - 1e-6
    if not ok: bad += 1
    print(('ok  ' if ok else 'BAD ') + '%.2f-%.2f hold %.2f | speech %.2f-%.2f | %s' % (c['t'], c['t1'], hold, s0, s1, c['text']))
    cues.append({'t0': c['t'], 't1': c['t1'], 'text': c['text']})
json.dump(cues, open(os.path.join(DEMO, 'out', 'cues.json'), 'w'))
subprocess.check_call([os.path.join(LIB, '.venv', 'bin', 'python'), os.path.join(LIB, 'core', 'render', 'srt.py'), os.path.join(DEMO, 'out', 'cues.json'), os.path.join(os.path.dirname(DEMO), 'felt.srt')])
sys.exit(1 if bad else 0)
