#!/bin/sh
# One command: sh styles/nianhua/demo/build.sh   (clone mode; set LIB=<library folder> in skill mode)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out/voice"
# voice: Kokoro (offline), then the speech-to-text check of every line
"$LIB/.venv/bin/python" core/tts/tts.py "$HERE/lines.json" "$HERE/out/voice"
"$LIB/.venv/bin/python" core/tts/asr_check.py "$HERE/lines.json" "$HERE/out/voice"
node "$HERE/tools/export.mjs"
node core/render/events.mjs "$HERE"
node core/render/readcheck.mjs "$HERE"
RENDER_SLOTS=${RENDER_SLOTS:-3} nice -n 10 node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
"$LIB/.venv/bin/python" "$HERE/tools/cuecheck.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../nianhua.mp4" 24 0
