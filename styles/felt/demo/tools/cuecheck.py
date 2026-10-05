"""Do the picture's hits sit on the music grid? 108 BPM, 3/4: beats of 0.5556 s, eighths of 0.2778 s.
Pokes land on eighths; the wool is moved on twos (1/12 s), so a hit is also shown as its offset to the nearest drawing.
Exit 1 if a poke or key hit is more than 45 ms from the eighth grid."""
import json, os, sys
DEMO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev = json.load(open(os.path.join(DEMO, 'events.json')))['ev']
E = 60 / 108 / 2
KEY = {'tag', 'bounce', 'bounce_small', 'hop', 'beak', 'wing', 'tuft', 'bead', 'blink', 'peep', 'wipe', 'needle_down', 'lamp_off', 'roll'}
worst, bad, n = 0, 0, 0
for e in ev:
    if e['type'] != 'poke' and e['type'] not in KEY: continue
    off = (e['t'] / E) - round(e['t'] / E); ms = off * E * 1000; n += 1
    worst = max(worst, abs(ms))
    if abs(ms) > 45: bad += 1; print('off-grid %.3f %s %+.0f ms' % (e['t'], e['type'], ms))
print('%d hits checked, worst offset to the eighth grid %.0f ms (a drawing is 83 ms), %d off' % (n, worst, bad))
# the silence: no music event inside it, the peep is the first sound after it
mus = [e for e in ev if e['type'] == 'peep']
print('peep at %.3f (bar 25 = %.3f)' % (mus[0]['t'], 25 * 3 * 60 / 108))
sys.exit(1 if bad else 0)
