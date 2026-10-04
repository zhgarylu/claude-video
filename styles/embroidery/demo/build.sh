#!/bin/sh
# One command: voice -> check -> events -> picture -> score/foley mix -> master.  Run from anywhere: sh styles/embroidery/demo/build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
mkdir -p "$HERE/out" "$HERE/voices"
"$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voices"                 # Kokoro, offline (af_nicole)
"$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices"            # speech-to-text check (homophones carry an "asr" override)
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"                                                     # score, foley, voice -> out/mix.wav
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../embroidery.mp4" 24 2
"$PY" core/render/srt.py "$HERE/cues.json" "$HERE/../embroidery.srt"
echo "done: styles/embroidery/embroidery.mp4"
