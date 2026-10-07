#!/bin/sh
# Offline smoke test of tools/remake: a 6 s synthetic clip (three coloured shots, a text caption, a sine tone) → analyze → check remake.json → structure plan → exact build.
#   sh tools/remake/selftest.sh [--render]        (--render also renders the exact project and compares it; needs Node + Chrome as in core/README.md)
# Speech and on-screen text are optional tiers: the checks for them run only where the tools exist (OCR: macOS with swiftc; words need a speech in the clip, so none are expected here).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-$(cd "$HERE/../.." && pwd)}; PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
T=$(mktemp -d "${TMPDIR:-/tmp}/remake-selftest.XXXXXX"); trap 'rm -rf "$T"' EXIT
FONT=$(ls "$LIB"/styles/*/demo/fonts/*.ttf 2>/dev/null | grep -i -E "NotoSansSC|Inter|Barlow" | head -1)
# ffmpeg here may lack drawtext: the caption is drawn with Pillow and overlaid
"$PY" - "$T/cap.png" "$FONT" <<'PY'
import sys
from PIL import Image, ImageDraw, ImageFont
im = Image.new('RGBA', (640, 360), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
f = ImageFont.truetype(sys.argv[2], 64) if sys.argv[2] else ImageFont.load_default()
d.text((320, 270), 'HELLO REMAKE', font=f, fill='white', anchor='mm', stroke_width=4, stroke_fill='black'); im.save(sys.argv[1])
PY
ffmpeg -v error -y -f lavfi -i "color=c=0x2a6fdb:s=640x360:r=24:d=2" -f lavfi -i "color=c=0xdb4a2a:s=640x360:r=24:d=2" -f lavfi -i "color=c=0x2adb7a:s=640x360:r=24:d=2" \
  -f lavfi -i "sine=frequency=440:duration=6:sample_rate=48000" -i "$T/cap.png" \
  -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0[b];[b][4:v]overlay=0:0,format=yuv420p[v]" -map "[v]" -map 3:a -c:v libx264 -c:a aac -shortest "$T/clip.mp4"
"$PY" "$HERE/remake.py" analyze "$T/clip.mp4" --out "$T/an" --lang en --no-asr
"$PY" - "$T/an/remake.json" "$FONT" <<'PY'
import json, sys
R = json.load(open(sys.argv[1])); bad = []
for k in ('schema', 'source', 'facts', 'shots', 'words', 'takes', 'texts', 'overlays', 'audio'):
    if k not in R: bad.append('missing ' + k)
if R.get('schema') != 'remake/1': bad.append('schema')
if len(R['shots']) != 3: bad.append('expected 3 shots, got %d' % len(R['shots']))
for s in R['shots']:
    for k in ('index', 't0', 't1', 'camera', 'palette', 'motion', 'anchor', 'words', 'texts'):
        if k not in s: bad.append('shot missing ' + k)
if abs(R['audio'].get('lufs', 0) or 0) < 1: bad.append('no loudness')
if not R['audio'].get('energy_db'): bad.append('no energy curve')
if sys.argv[2] and R['texts']:       # OCR ran
    t = R['texts'][0]
    for k in ('text', 't0', 't1', 'box', 'color', 'anchor', 'anchor_end', 'role'):
        if k not in t: bad.append('text missing ' + k)
    if 'HELLO' not in t['text'].upper(): bad.append('OCR read %r' % t['text'])
print('texts read:', [t['text'] for t in R['texts']] or 'none (OCR needs macOS; fine elsewhere)')
if bad: print('SELFTEST FAILED:', bad); sys.exit(1)
print('remake.json fields OK (%d shots, %d texts)' % (len(R['shots']), len(R['texts'])))
PY
"$PY" "$HERE/structure.py" plan "$T/an" --topic "selftest" --target 12 --lang en >/dev/null && grep -q "Remake sheet" "$T/an/TREATMENT.md" && echo "structure plan OK"
"$PY" "$HERE/exact.py" build "$T/clip.mp4" "$T/an" --out "$T/film" --rights own --captions keep >/dev/null && [ -f "$T/film/spec.json" ] && [ -f "$T/film/src/frames/0001.jpg" ] && echo "exact build OK"
if [ "$1" = "--render" ]; then
  "$PY" "$HERE/exact.py" render "$T/film" --workers 2 >/dev/null && "$PY" "$HERE/exact.py" compare "$T/film" --no-ocr | sed -n 3,8p
fi
echo "selftest passed"
