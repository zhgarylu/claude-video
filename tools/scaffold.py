"""Start a new film style with everything that is the same every time already in place.

  python3 tools/scaffold.py <slug> --en "Name" --cn "名称" --category "Graphic & Type" [--aspect 16x9|9x16] [--num 94] [--dur 50] [--voice]

Creates styles/<slug>/ (it refuses if the folder exists):
  style.json, STYLE.md, DEMO.md        the headings MAINTAINING.md asks for, with a line telling you what goes under each
  demo/index.html, main.js             the page contract (render(t), DUR, EV, TEXTS, READY), a tempo grid, a title-card film that already builds
  demo/timeline.js                     BPM, bars, event helper; picture, type and sound all read this one file
  demo/mix.py                          score + foley from events.json (numpy only), optional narration from lines.json; -14 LUFS is mux.sh's job
  demo/build.sh                        events -> readcheck -> (voice -> asr check) -> mix -> video --resume -> mux -> styleframe -> poster
  demo/CREDITS, TREATMENT.md           the asset list and the three-structures sheet
Run `sh styles/<slug>/demo/build.sh` straight away: the placeholder film proves the toolchain works on this machine, then you replace main.js's
scenes with the style. It does NOT register the style (styleboard/build.py, MAINTAINING.md "Register") and it never touches other styles."""
import argparse, json, os, re, sys
ap = argparse.ArgumentParser(); ap.add_argument('slug'); ap.add_argument('--en', required=True); ap.add_argument('--cn', required=True)
ap.add_argument('--category', default='Graphic & Type', choices=['Hand-drawn & Painting', 'East Asian Traditions', 'Print & Printmaking', 'Graphic & Type', 'Information & Keynote', 'Cartoon & Anime', 'Games', 'Cinema & Eras', 'Materials & 3D'])
ap.add_argument('--aspect', default='16x9', choices=['16x9', '9x16']); ap.add_argument('--num'); ap.add_argument('--dur', type=float, default=50); ap.add_argument('--voice', action='store_true', help='add a narration step (Kokoro) to the build')
A = ap.parse_args()
if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', A.slug): sys.exit('slug: lowercase letters, digits and hyphens')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = os.path.join(ROOT, 'styles', A.slug)
if os.path.exists(S): sys.exit(S + ' already exists')
CATS = {'Hand-drawn & Painting': '手绘与绘画', 'East Asian Traditions': '东方传统', 'Print & Printmaking': '印刷与版画', 'Graphic & Type': '图形与排版', 'Information & Keynote': '信息与发布', 'Cartoon & Anime': '卡通与动画', 'Games': '游戏', 'Cinema & Eras': '电影与时代', 'Materials & 3D': '材质与 3D'}
nums = []
for f in os.listdir(os.path.join(ROOT, 'styles')):
    try: nums.append(int(json.load(open(os.path.join(ROOT, 'styles', f, 'style.json')))['num']))
    except Exception: pass
num = A.num or str(max([n for n in nums if n < 99] or [0]) + 1)
V = A.aspect == '9x16'; W, H = (1080, 1920) if V else (1920, 1080); SIZE = f'{W}x{H}'
os.makedirs(os.path.join(S, 'demo', 'stills'))
def w(rel, text, mode=None):
    p = os.path.join(S, rel); open(p, 'w', encoding='utf8').write(text)
    if mode: os.chmod(p, mode)
w('style.json', json.dumps({'slug': A.slug, 'num': num, 'en': A.en, 'cn': A.cn, 'category_en': A.category, 'category_cn': CATS[A.category], 'film': 'TODO film title',
   'line': 'TODO one sentence: what the demo film does in this style.', 'line_cn': 'TODO 一句话：样片用这个风格做了什么。', 'uses': ['TODO use case 1', 'TODO use case 2', 'TODO use case 3'], 'frame_sec': 10.0, 'dur': A.dur}, ensure_ascii=False, indent=1) + '\n')
w('STYLE.md', f'''# {A.en} · {A.cn}

> Invariants only (MAINTAINING.md): no story, arc, beat table, durations or end card here. Delete these hints as you fill each section.

## 1. What it is
One paragraph: the medium it imitates and what makes it unmistakable in one frame.
## 2. Look
Materials and rendering: what is drawn, how it is lit, what is never allowed.
## 3. Colour
A palette with roles (ground, ink, accent, answer, warning). Say which colours never mix.
## 4. Type
Faces (OFL only), sizes in relation to the frame, where text may sit, reading-time rule.
## 5. Motion
How things enter, move and leave; easing; what is on a grid and what is free. Anything locked to a tempo says so.
## 6. Camera grammar
What the camera may do (locked, push-in, cut, scroll), and what it may not.
## 7. Sound palette
The score's instruments and key, the foley vocabulary, where silence is used.
## 8. Native moves
The signature moves of this medium, each with one line on when to use it.
## 9. Pitfalls
What goes wrong in this medium and how to avoid it.
## 10. Range of variation
How far a film can vary the style without leaving it.

[Demo](DEMO.md)
''')
w('DEMO.md', f'''# {A.en}: the demo film

**One example among many. Don't reuse its story, arc, shots, props or timings.**

## Story and structure
## Shot list
## Score structure
## Palette and props
## End card
## Build notes and code entry points
`sh styles/{A.slug}/demo/build.sh` rebuilds everything (core tier only). Entry points: `demo/main.js` (scenes), `demo/timeline.js` (tempo and events), `demo/mix.py` (sound).
''')
w('demo/CREDITS', 'Fonts: (name, licence, URL). Only CC0, CC BY or OFL. Everything else in this film is generated by the code in this folder.\n')
w('demo/TREATMENT.md', '''# Treatment
## Structure A
## Structure B
## Structure C
## Chosen, and why
''')
w('demo/timeline.js', f'''// One timeline for picture, type and sound. Change BPM and everything that reads BAR follows.
export const BPM = 100, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const DUR = {A.dur};
export const EV = [];                                   // sound events: {{t, type, v}}; main.js pushes them as it draws, core/render/events.mjs exports them
export const ev = (t, type, v = 1, extra = {{}}) => EV.push({{ t: +t.toFixed(3), type, v, ...extra }});
// the placeholder film: three beats, one per bar
export const BEATS = [
  {{ t0: 0, t1: BAR * 2, text: '{A.en}', sub: 'placeholder: replace main.js' }},
  {{ t0: BAR * 2, t1: BAR * 4, text: 'It builds.', sub: 'events, readcheck, mix, render, master' }},
  {{ t0: BAR * 4, t1: {A.dur}, text: 'Now make it yours.', sub: 'STYLE.md first, then the scenes' }},
];
''')
w('demo/index.html', f'''<!doctype html>
<html><head><meta charset="utf-8"><title>{A.en}</title>
<style>html,body{{margin:0;background:#101114;overflow:hidden}}canvas{{position:absolute;left:0;top:0;display:block}}</style>
</head><body><canvas id="c" width="{W}" height="{H}"></canvas>
<script type="module" src="main.js"></script></body></html>
''')
w('demo/main.js', f'''// "{A.en}": placeholder film. render(t) draws any frame, deterministically (no Date.now, no Math.random: seed with mulberry).
import {{ clamp, seg, ss, mulberry }} from '/core/lib.js';
import {{ DUR, EV, BEATS, BAR, ev }} from './timeline.js';
const W = {W}, H = {H}, cv = document.getElementById('c'), g = cv.getContext('2d');
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';           // replace with the style's OFL faces (@font-face in index.html) and await document.fonts.load(...)
let TEXTS_NOW = [];
for (const b of BEATS) ev(b.t0 + .05, 'hit', .8);                          // events are pushed once, up front, so events.mjs finds them
function drawBeat(b, t) {{
  const a = ss(seg(t, b.t0, b.t0 + .5)) * (1 - ss(seg(t, b.t1 - .4, b.t1))), y = H * .5 - (1 - ss(seg(t, b.t0, b.t0 + .6))) * 40;
  g.globalAlpha = a; g.fillStyle = '#f2efe8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${{Math.round(W * .06)}}px ${{FONT}}`; g.fillText(b.text, W / 2, y); const w1 = g.measureText(b.text).width;
  g.font = `400 ${{Math.round(W * .022)}}px ${{FONT}}`; g.fillStyle = '#a9a69d'; g.fillText(b.sub, W / 2, y + W * .06); const w2 = g.measureText(b.sub).width;
  g.globalAlpha = 1;
  if (a > .02) TEXTS_NOW.push({{ id: 'b' + BEATS.indexOf(b), text: b.text, x0: W / 2 - w1 / 2, y0: y - W * .04, x1: W / 2 + w1 / 2, y1: y + W * .04 }}, {{ id: 's' + BEATS.indexOf(b), text: b.sub, x0: W / 2 - w2 / 2, y0: y + W * .04, x1: W / 2 + w2 / 2, y1: y + W * .08 }});
}}
function render(t) {{
  TEXTS_NOW = []; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#101114'; g.fillRect(0, 0, W, H);
  for (const b of BEATS) if (t >= b.t0 && t < b.t1) drawBeat(b, t);
}}
window.DUR = DUR; window.EV = EV; window.render = render;
window.TEXTS = t => {{ render(t); return TEXTS_NOW; }};                   // every visible text with its full string and box, for readcheck
render(0); window.READY = true;
''')
w('demo/mix.py', f'''"""Sound for the "{A.en}" demo: a small numpy score and one sound per event in events.json. No samples.
usage: .venv/bin/python styles/{A.slug}/demo/mix.py   (after core/render/events.mjs)"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'core', 'audio'))
import sfx
from sfx import SR
EVJ = json.load(open(os.path.join(HERE, 'events.json'))); EV = EVJ['ev']; DUR = EVJ['dur']
BPM = 100; BEAT = 60 / BPM
N = int(DUR * SR); mix = np.zeros((N, 2)); rng = np.random.default_rng(1)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def tone(f, d, v=1.0):
    t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * f * t) * np.exp(-t / (d * .4)) * np.minimum(1, t / .005) * v
def add(x, at, gain=1.0):
    s = int(round(at * SR)); e = min(N, s + len(x))
    if 0 <= s < N: mix[s:e, 0] += x[:e - s] * gain; mix[s:e, 1] += x[:e - s] * gain
# score: a four-note pattern on the beat (A minor pentatonic)
for i, m in enumerate([57, 60, 64, 67] * int(DUR / (4 * BEAT) + 1)):
    add(tone(mtof(m), BEAT * .9, .18), i * BEAT)
# one sound per event: replace with the style's foley (see styles/flash-sale/demo/mix.py for a full set)
for e in EV:
    if e['type'] == 'hit': add(tone(mtof(45), .6, .5 * e.get('v', 1)), e['t'])
vo = os.path.join(HERE, 'voices')
if os.path.isdir(vo) and os.path.exists(os.path.join(vo, 'dur.json')):                    # narration, if build.sh made it: place each line (see lines.json) where you want it
    pass
mix = np.tanh(mix * .9) * .8
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR); print('mix.wav', DUR, 's')
''')
voice_steps = '''[ -f $D/voices/dur.json ] || $PY core/tts/tts.py $D/lines.json $D/voices   # narration (Kokoro, offline)
$PY core/tts/asr_check.py $D/lines.json $D/voices                       # every line must be heard as written
''' if A.voice else ''
if A.voice: w('demo/lines.json', json.dumps([{'id': 'l1', 'text': 'Replace this line.', 'voice': 'af_heart', 'speed': 0.95}], indent=1) + '\n')
w('demo/build.sh', f'''#!/bin/sh
# Rebuild the demo from scratch: sh styles/{A.slug}/demo/build.sh   (from any directory; core tier only)
# A crash mid-render loses nothing: run it again and finished 96-frame blocks are reused (video.mjs --resume).
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${{RENDER_SLOTS:-3}}
PY=.venv/bin/python; D=styles/{A.slug}/demo; O=styles/{A.slug}; NAME={A.slug}
mkdir -p $D/out $D/fonts $D/stills
# fonts (OFL): fetch here, and list them in CREDITS
node core/render/events.mjs $D --size {SIZE}
node core/render/readcheck.mjs $D --size {SIZE}
{voice_steps}$PY $D/mix.py
node core/render/video.mjs $D --fps 24 --workers ${{WORKERS:-2}} --size {SIZE} --resume --out $D/out/video.mp4
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 1
node core/render/still.mjs $D 10.0 --size {SIZE} --out $D/out --prefix sf_ && cp $D/out/sf_10.0.jpg $D/stills/styleframe.jpg   # the gallery card (set frame_sec in style.json)
node core/render/still.mjs $D 3.0 --size {SIZE} --out $D/out --prefix po_ && cp $D/out/po_3.0.jpg $O/poster.jpg
''', 0o755)
print(f'created styles/{A.slug}/ (num {num}, {SIZE}). Next: sh styles/{A.slug}/demo/build.sh   then write STYLE.md and replace the scenes in demo/main.js.')
