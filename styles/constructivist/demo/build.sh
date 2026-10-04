#!/bin/sh
# One command: picture timeline -> events -> reading check -> frames -> score + foley -> cue check -> subtitles -> mux (about -14 LUFS).
# Needs: node, ffmpeg, the library's .venv (setup.sh deps), and demo/fonts/Barlow-Medium.ttf (see CREDITS).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/fonts/Barlow-Medium.ttf" ] || { echo "missing demo/fonts/Barlow-Medium.ttf (OFL, google/fonts repository, ofl/barlow)"; exit 1; }
mkdir -p "$HERE/out"
cd "$LIB"
node core/render/events.mjs "$HERE" --out "$HERE/out/events.json"
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
"$LIB/.venv/bin/python" "$HERE/tools/cuecheck.py"
"$LIB/.venv/bin/python" "$HERE/tools/mksrt.py" "$HERE/../constructivist.srt"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../constructivist.mp4" 24 1
