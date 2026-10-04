#!/bin/sh
# One command: picture timeline -> events -> checks -> frames -> score + foley -> subtitles -> mux (about -14 LUFS).
# Needs: node, ffmpeg, the library's .venv (setup.sh deps) and demo/fonts/*.ttf (run demo/fonts/fetch.sh once, see CREDITS).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/fonts/NotoSansSC-700.ttf" ] || sh "$HERE/fonts/fetch.sh"
mkdir -p "$HERE/out"
cd "$LIB"
node core/render/events.mjs "$HERE" --out "$HERE/out/events.json"
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
"$LIB/.venv/bin/python" "$HERE/tools/cuecheck.py"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/cues.json" "$HERE/../manga-panel.srt"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../manga-panel.mp4" 24 0
