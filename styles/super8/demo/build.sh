#!/bin/sh
# One command: picture (24 fps, artefacts held on 18 fps film frames) + score/projector/foley + mux. Run from anywhere.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE"
"$LIB/.venv/bin/python" "$HERE/mix.py"
"$LIB/.venv/bin/python" "$HERE/cuecheck.py"
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../super8.mp4" 24 0
ffmpeg -y -loglevel error -ss 18 -i "$HERE/../super8.mp4" -frames:v 1 -q:v 2 "$HERE/../poster.jpg"
