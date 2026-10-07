#!/bin/sh
# One command for a demo-breakdown project:  sh tools/breakdown/build.sh <project dir> [--vertical]
#   prep (voice + asr check, frames, timeline) → events → readcheck → lint → mix → subtitles → render → master (-14 LUFS) → posters → check.py
# --vertical also renders a 9:16 version (<name>-9x16.mp4, same sound) when the project is 16:9.
# Environment: NAME (output name, default = project folder name), NOVOICE=1 (reuse work/voices), WORKERS (default 3), OUT_DIR (where the film, srt and posters go; default = the project)
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=$(cd "$HERE/../.." && pwd); export LIB
P=$(cd "$1" && pwd) || { echo "usage: sh tools/breakdown/build.sh <project dir> [--vertical]"; exit 2; }
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
NAME=${NAME:-$(basename "$P")}; OUT=${OUT_DIR:-$P}; mkdir -p "$OUT" "$P/out"
cd "$LIB"
ASPECT=$($PY -c "import json;print(json.load(open('$P/breakdown.json')).get('aspect','16x9'))")
[ "$ASPECT" = 9x16 ] && SIZE=1080x1920 || SIZE=1920x1080
$PY tools/breakdown/prep.py "$P" ${NOVOICE:+--no-voice}
node core/render/events.mjs "$P" --size $SIZE
node core/render/readcheck.mjs "$P" --size $SIZE --q dry=1 || echo "readcheck: some text is on screen for less than its reading time: lengthen the shot ('dur') or shorten the text"
node tools/breakdown/lint.mjs "$P" --size $SIZE || echo "lint: fix the overlaps above (move a card to the other side, shorten a label, change a marker's dir)"
$PY tools/breakdown/mix.py "$P"
$PY core/render/srt.py "$P/out/cues.json" "$OUT/$NAME.srt"
node core/render/video.mjs "$P" --fps 24 --workers ${WORKERS:-3} --size $SIZE --resume --out "$P/out/video.mp4"
sh core/render/mux.sh "$P/out/video.mp4" "$P/out/mix.wav" "$OUT/$NAME.mp4" 24 0
AT=$($PY -c "import json;t=json.load(open('$P/timeline.json'));h=[s for s in t['shots'] if s['type']=='hook'] or t['shots'];print(round(h[0]['t0']+min(h[0]['dur']*.6, 3.2),2))")
node core/render/still.mjs "$P" $AT --size 1920x1080 --q "poster=1&aspect=16x9&at=$AT" --out "$P/out" --prefix po_ >/dev/null && cp "$P/out/po_$AT.jpg" "$OUT/poster.jpg"
node core/render/still.mjs "$P" $AT --size 1080x1920 --q "poster=1&aspect=9x16&at=$AT" --out "$P/out" --prefix pv_ >/dev/null && cp "$P/out/pv_$AT.jpg" "$OUT/poster-9x16.jpg"
if [ "$2" = "--vertical" ] && [ "$ASPECT" != 9x16 ]; then
  node core/render/video.mjs "$P" --fps 24 --workers ${WORKERS:-3} --size 1080x1920 --q aspect=9x16 --resume --out "$P/out/video-9x16.mp4"
  sh core/render/mux.sh "$P/out/video-9x16.mp4" "$P/out/mix.wav" "$OUT/$NAME-9x16.mp4" 24 0
  node tools/breakdown/lint.mjs "$P" --size 1080x1920 --q "dry=1&aspect=9x16" || true
fi
$PY tools/check.py "$OUT/$NAME.mp4" --srt "$OUT/$NAME.srt" || true
echo "done: $OUT/$NAME.mp4"
