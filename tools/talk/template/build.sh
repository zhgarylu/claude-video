#!/bin/sh
# One command to render this film: sh films/<name>/build.sh   (LIB = the library folder; default two levels up)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}
export LIB
NAME=$(basename "$HERE")
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/src/frames/0001.jpg" ] || { echo "run first: sh $LIB/tools/talk/prep.sh <host.mp4> $HERE"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node "$HERE/cues.mjs"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues.json" "$HERE/$NAME.srt"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 0
