#!/bin/sh
# One command: picture timeline -> events -> frames -> score + foley -> mux (about -14 LUFS).
# Needs: node, ffmpeg, the library's .venv (setup.sh deps), and demo/fonts/Bangers-Regular.ttf (see CREDITS).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/fonts/Bangers-Regular.ttf" ] || { echo "missing demo/fonts/Bangers-Regular.ttf (OFL, https://github.com/google/fonts/tree/main/ofl/bangers)"; exit 1; }
mkdir -p "$HERE/out"
cd "$LIB"
node core/render/events.mjs "$HERE" --out "$HERE/out/events.json"
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../comic-pop.mp4" 24 0
