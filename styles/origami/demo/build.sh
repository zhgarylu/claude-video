#!/bin/sh
# One command: sh styles/origami/demo/build.sh   (clone mode; set LIB=<library folder> in skill mode)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
node "$HERE/tools/export.mjs"
node core/render/events.mjs "$HERE"
node "$HERE/foldcheck.mjs" strip
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
"$LIB/.venv/bin/python" "$HERE/tools/cuecheck.py"
node core/render/readcheck.mjs "$HERE"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../origami.mp4" 24 1
