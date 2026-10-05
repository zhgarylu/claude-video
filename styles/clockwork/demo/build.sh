#!/bin/sh
# One command: sh styles/clockwork/demo/build.sh   (clone mode; set LIB=<library folder> in skill mode)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
# voice: Kokoro (offline), checked by speech-to-text; skipped when the WAVs exist
[ -f "$HERE/voices/v01.wav" ] || "$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voices"
"$PY" "$HERE/tools/durs.py"
"$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices"
node core/render/events.mjs "$HERE"
node "$HERE/tools/mechcheck.mjs"
RENDER_SLOTS=${RENDER_SLOTS:-3} node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
node core/render/readcheck.mjs "$HERE"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../clockwork.mp4" 24 1
