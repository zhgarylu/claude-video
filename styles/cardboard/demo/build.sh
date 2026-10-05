#!/bin/sh
# One command: sh styles/cardboard/demo/build.sh   (clone mode; set LIB=<library folder> in skill mode)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
# voice: Kokoro, offline; every line is checked back with speech-to-text (set FORCE_VOICE=1 to regenerate)
if [ ! -f "$HERE/voice/dur.json" ] || [ -n "$FORCE_VOICE" ]; then
  nice -n 10 "$PY" core/tts/tts.py "$HERE/voice/lines.json" "$HERE/voice"
fi
nice -n 10 "$PY" core/tts/asr_check.py "$HERE/voice/lines.json" "$HERE/voice"
node "$HERE/tools/export.mjs"
node core/render/events.mjs "$HERE"
node core/render/readcheck.mjs "$HERE"
RENDER_SLOTS=${RENDER_SLOTS:-3} nice -n 10 node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
nice -n 10 "$PY" "$HERE/mix.py"
nice -n 10 sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../cardboard.mp4" 24 1
