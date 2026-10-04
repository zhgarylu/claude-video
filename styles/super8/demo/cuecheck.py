"""cuecheck: every visual hit (events.json, from timeline.js) must sit on the half-beat grid, and the music cues that
are meant to land on a visual hit (score.json, written by mix.py from its own bar arithmetic) must match it to the millisecond."""
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))['ev']
sc = json.load(open(os.path.join(HERE, 'score.json')))
BEAT = 60 / sc['bpm']; HALF = BEAT / 2
bad = 0
hits = [e for e in ev if e['type'] in ('stamp', 'splice', 'thunk', 'whip')]
print('visual hits on the half-beat grid:')
for e in hits:
    k = round(e['t'] / HALF); d = (e['t'] - k * HALF) * 1000
    print(f"  {e['type']:7s} {e['t']:8.4f}s  beat {k / 2:6.1f}  off {d:+.2f} ms"); bad += abs(d) > 1
pairs = [('thunk', 'strum_thunk', 0), ('stamp', 'card_notes', 0)]
print('visual hit vs music cue:')
tm = {e['type']: e['t'] for e in reversed(ev)}
first = lambda ty: min(e['t'] for e in ev if e['type'] == ty)
chk = [('tailgate thunk vs uke bass note', first('thunk'), sc['music_hits']['strum_thunk']),
       ('card stamp vs music-box entry', first('stamp'), sc['music_hits']['card_notes']),
       ('end stamp vs last music-box note', max(e['t'] for e in ev if e['type'] == 'stamp'), sc['music_hits']['end_note']),
       ('Dad enters (land) vs theme return', 26 * 1.0 * BEAT * 3, sc['music_hits']['theme_return']),
       ('first splice (beach) vs waltz start', [e['t'] for e in ev if e['type'] == 'splice'][1], sc['music_hits']['waltz'])]
for name, a, b in chk:
    d = (a - b) * 1000; print(f'  {name:40s} {a:8.4f} vs {b:8.4f}  {d:+.2f} ms'); bad += abs(d) > 1
print('cuecheck', 'FAIL' if bad else 'ok (0 ms)'); sys.exit(1 if bad else 0)
