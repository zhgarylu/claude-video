"""The song "Second Sunrise" as data: one arrangement, 120 BPM, A minor, 30 bars of 2.0 s.
It writes score.json, which BOTH the page (light cues, drummer's arms, crowd bounce) and mix.py (the audio) read,
so every cue in the picture is on the same grid as the music.
usage: .venv/bin/python styles/stage-light/demo/score.py
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT; NBARS = 30; DUR = NBARS * BAR
def T(bar, beat=0.0): return round((bar * 4 + beat) * BEAT, 4)     # bar is 0-based

SECS = [('intro', 0, 4), ('build', 4, 12), ('drop', 12, 20), ('bridge', 20, 24), ('finale', 24, 28), ('outro', 28, 30)]
def sec_of_bar(b):
    for n, a, z in SECS:
        if a <= b < z: return n
# chord per bar: name -> (bass root midi, voicing midi)
CH = {'Am': (33, [57, 60, 64]), 'F': (29, [53, 57, 60]), 'C': (36, [55, 60, 64]), 'G': (31, [55, 59, 62]),
      'Dm': (38, [53, 57, 62]), 'E': (28, [52, 56, 59])}
MAIN = ['Am', 'F', 'C', 'G']
def chord_of_bar(b):
    s = sec_of_bar(b)
    if s == 'bridge': return ['F', 'G', 'Dm', 'E'][b - 20]
    if s == 'outro': return 'Am'
    return MAIN[b % 4]

kick, snare, hat, ohat, crash, tom, stick, rim = [], [], [], [], [], [], [], []
bass, pad, arp, lead, ep, gtr, stab = [], [], [], [], [], [], []

for b in range(NBARS):
    s = sec_of_bar(b); ch = chord_of_bar(b); root, vo = CH[ch]
    # ---- drums
    if s == 'intro':
        if b >= 1: kick.append((T(b, 0), .55))
        if b == 3:
            for i in range(4): stick.append(T(b, i))
    elif s == 'build':
        k = b - 4
        for i in range(4): kick.append((T(b, i), .6 + .05 * k))
        for i in range(4): hat.append((T(b, i + .5), .4))
        if k >= 2:
            snare += [(T(b, 1), .7), (T(b, 3), .75)]
        if k >= 4:                       # 16th hats
            for i in range(4):
                hat += [(T(b, i + .25), .25), (T(b, i + .75), .25)]
        if b == 11:                      # snare roll, then the air gap on beat 3
            snare = [x for x in snare if not (T(b, 0) <= x[0] < T(b + 1))]
            for off, v in [(0, .6), (.5, .6), (1, .65), (1.5, .65), (2, .7), (2.25, .72), (2.5, .75), (2.75, .78),
                           (2.5 + 1 / 8, .8), (2.875, .85)]:
                snare.append((T(b, off), v))
            snare = [x for x in snare if x[0] < T(b, 2.9)]
            kick = [x for x in kick if not (T(b, 2.5) <= x[0] < T(b + 1))]
            hat = [x for x in hat if not (T(b, 2.5) <= x[0] < T(b + 1))]
        elif b == 10:
            pass
    elif s in ('drop', 'finale'):
        first = (b == 12 or b == 24)
        for i in range(4): kick.append((T(b, i), .95))
        if b % 2 == 1: kick.append((T(b, 3.5), .6))
        snare += [(T(b, 1), .9), (T(b, 3), .95)]
        for i in range(4):
            hat += [(T(b, i), .35), (T(b, i + .25), .22), (T(b, i + .75), .22)]
            ohat.append((T(b, i + .5), .5))
        if b in (12, 16, 24): crash.append((T(b, 0), 1.0))
        if b in (14, 18, 26):  crash.append((T(b, 0), .7))
        if b in (15, 19, 27):   # fill on the last bar of a phrase
            snare = [x for x in snare if not (T(b, 2.9) < x[0] < T(b + 1))]
            hat = [x for x in hat if not (T(b, 2.5) <= x[0] < T(b + 1))]
            ohat = [x for x in ohat if not (T(b, 2.5) <= x[0] < T(b + 1))]
            for j, (off, f) in enumerate([(2.5, 180), (2.75, 150), (3.0, 130), (3.25, 110), (3.5, 95), (3.75, 80)]):
                tom.append((T(b, off), f, .8))
            kick = [x for x in kick if not (T(b, 3.4) < x[0] < T(b + 1))]
        if b == 27:
            crash.append((T(b + 1, 0), 1.0))
    elif s == 'bridge':
        kick.append((T(b, 0), .6) if b > 20 else (T(b, 0), .0))
        kick[:] = [x for x in kick if x[1] > 0]
        rim += [(T(b, 2.5), .5), (T(b, 3.5), .4)] if b > 20 else []
    # ---- bass
    if s == 'build':
        for i in range(8):
            if b == 11 and i >= 6: continue
            bass.append((T(b, i * .5), root + (12 if i % 4 == 3 else 0), .42, .8))
    elif s in ('drop', 'finale'):
        for i in range(8):
            if i % 2 == 1 or i in (0,):       # off-beat bass with a pump on the one
                bass.append((T(b, i * .5), root + (12 if i == 5 else 0), .4 if i else .8, .95 if i else 1.0))
    elif s == 'bridge':
        bass.append((T(b, 0), root + (12 if ch == 'E' else 0), 3.8, .75))
    elif s == 'intro' and b >= 2:
        bass.append((T(b, 0), root, 3.9, .5))
    # ---- pad (sustained chord, one per bar)
    padv = {'intro': .35 if b >= 1 else .25, 'build': .45, 'drop': .55, 'bridge': .7, 'finale': .6, 'outro': .0}[s]
    if padv: pad.append((T(b, 0), vo, (3 * BEAT if b == 11 else BAR * 1.02), padv))
    # ---- arpeggio (plucks)
    pat = [0, 1, 2, 3, 2, 1, 2, 1]
    if s == 'intro' and b >= 1:
        for i in range(4):
            arp.append((T(b, i), vo[[0, 2, 1, 2][i]] + 12, .9, .35))
    elif s == 'build':
        for i in range(8):
            if b == 11 and i >= 6: continue
            n = (vo + [vo[0] + 12])[pat[i]] + 12
            arp.append((T(b, i * .5), n, .4, .45 + .04 * (b - 4)))
    elif s in ('drop', 'finale') and b % 2 == 0:       # thinner arps in the drop, the lead is the star
        for i in range(8):
            n = (vo + [vo[0] + 12])[pat[i]] + 12
            arp.append((T(b, i * .5), n, .3, .22))
    elif s == 'bridge':
        for i in range(8):
            n = (vo + [vo[0] + 12])[[0, 1, 2, 3, 2, 1, 0, 1][i]]
            ep.append((T(b, i * .5), n + 12, 1.1, .5 if b > 20 or i > 3 else .0))
        ep[:] = [x for x in ep if x[3] > 0 and x[0] >= T(21, 0)]
    # ---- guitar (palm-muted eighths in the drop and finale, open hits on the bar line)
    if s in ('drop', 'finale'):
        r5 = [root + 12, root + 19, root + 24]
        for i in range(8):
            if b in (15, 19, 27) and i >= 5: continue
            gtr.append((T(b, i * .5), r5, .16 if i % 4 else .45, .9 if i % 4 == 0 else .62))
    if s == 'finale' and b == 27:
        pass

# ---- lead melody (drop, finale): (beat in bar, midi, length in beats)
PH = {
    'Am': [(0, 76, 1.5), (1.5, 76, .5), (2, 74, 1), (3, 72, 1)],
    'F':  [(0, 69, 1.5), (1.5, 72, .5), (2, 77, 1), (3, 76, 1)],
    'C':  [(0, 79, 1.5), (1.5, 76, .5), (2, 72, 1), (3, 76, 1)],
    'G':  [(0, 74, 1.5), (1.5, 71, .5), (2, 67, 1), (3, 74, 1)],
}
PH2 = {   # second pass: higher, answering
    'Am': [(0, 81, 1.5), (1.5, 79, .5), (2, 76, 1), (3, 79, 1)],
    'F':  [(0, 77, 1.5), (1.5, 76, .5), (2, 72, 1), (3, 69, .75), (3.75, 72, .25)],
    'C':  [(0, 84, 1.5), (1.5, 79, .5), (2, 76, 1), (3, 79, 1)],
    'G':  [(0, 83, 1), (1, 81, .5), (1.5, 79, .5), (2, 74, 2)],
}
for b in list(range(12, 20)) + list(range(24, 28)):
    ch = chord_of_bar(b); table = PH if (b < 16 or 24 <= b) else PH2
    if 24 <= b: table = PH2 if b >= 26 else PH
    for beat, m, L in table[ch]:
        lead.append((T(b, beat), m, L * BEAT * .96, 1.0))
# bridge lead: slow, one note per bar then a small turn
for b, notes in [(21, [(0, 69, 4)]), (22, [(0, 71, 2), (2, 74, 2)]), (23, [(0, 69, 3), (3, 72, 1)]), (20, [(2, 72, 2)])]:
    for beat, m, L in notes:
        lead.append((T(b, beat), m, L * BEAT * .98, .8))
# the bell: first note after the bridge silence
bell = [(T(20, 2), 81, 3.0)]
# ---- stabs: chord hits that punctuate the drop starts and the end
stab += [(T(12, 0), [57, 64, 69, 72, 76], 1.6), (T(24, 0), [57, 64, 69, 72, 76], 1.6),
         (T(28, 0), [33, 45, 57, 64, 69, 72, 76, 81], 3.6)]
# the closing hit: crash + kick + stab
crash.append((T(28, 0), 1.2)); kick.append((T(28, 0), 1.0))

SECTIONS = [dict(id=n, t0=T(a), t1=T(z), bar0=a, bar1=z) for n, a, z in SECS]
CUES = dict(spot=0.5, count=T(3, 0), build=T(4, 0), airgap=T(11, 2.0), drop=T(12, 0), bridge=T(20, 0), bell=T(20, 2),
            finale=T(24, 0), final=T(28, 0), end=DUR)
out = dict(bpm=BPM, beat=BEAT, bar=BAR, dur=DUR, sections=SECTIONS, cues=CUES,
           chords=[dict(bar=b, t=T(b), name=chord_of_bar(b)) for b in range(NBARS)],
           beats=[round(i * BEAT, 4) for i in range(int(DUR / BEAT) + 1)],
           kick=kick, snare=snare, hat=hat, ohat=ohat, crash=crash, tom=tom, stick=stick, rim=rim,
           bass=bass, pad=pad, arp=arp, lead=lead, ep=ep, gtr=gtr, stab=stab, bell=bell)
# the air gap (beat 3 of bar 11) and the drop must hold no music at all: assert it here
gap0, gap1 = T(11, 2.95), T(12, 0)
for k in ('kick', 'snare', 'hat', 'ohat', 'crash', 'tom', 'bass', 'arp', 'gtr'):
    bad = [x for x in out[k] if gap0 < x[0] < gap1 - 1e-6]
    assert not bad, (k, bad)
json.dump(out, open(os.path.join(HERE, 'score.json'), 'w'))
print('score.json:', {k: len(v) for k, v in out.items() if isinstance(v, list)}, 'dur', DUR)
