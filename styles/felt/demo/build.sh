#!/bin/sh
# One command: sh styles/felt/demo/build.sh   (clone mode; set LIB=<library folder> in skill mode)
# Needs the voice files in out/voice/ (see lines.json; step 0 makes them when they are missing).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out/voice"
if [ ! -f "$HERE/out/voice/dur.json" ]; then
  "$LIB/.venv/bin/python" core/tts/tts.py "$HERE/lines.json" "$HERE/out/voice"
fi
"$LIB/.venv/bin/python" core/tts/asr_check.py "$HERE/lines.json" "$HERE/out/voice"
node core/render/events.mjs "$HERE"
RENDER_SLOTS=${RENDER_SLOTS:-3} node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
"$LIB/.venv/bin/python" "$HERE/tools/cuecheck.py"
node core/render/readcheck.mjs "$HERE"
"$LIB/.venv/bin/python" "$HERE/tools/srt.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../felt.mp4" 24 1
