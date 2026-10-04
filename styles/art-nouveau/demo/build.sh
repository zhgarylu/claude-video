#!/bin/sh
# One command: voice -> check -> cues -> events -> picture -> score/foley mix -> master.  Run from anywhere: sh styles/art-nouveau/demo/build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/fonts/CormorantGaramond-Italic.ttf" ] || { echo "download Cormorant Garamond (OFL) into demo/fonts, see CREDITS"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
mkdir -p "$HERE/out" "$HERE/voices"
"$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voices"                  # Kokoro, offline (af_nicole)
"$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices"            # speech-to-text check
"$PY" "$HERE/make_cues.py"                                               # subtitle cues from the voice durations
node core/render/events.mjs "$HERE"
"$PY" "$HERE/cuecheck.py"                                                # every hit on the bar/beat grid
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"                                                     # score, foley, voice -> out/mix.wav
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../art-nouveau.mp4" 24 1
"$PY" core/render/srt.py "$HERE/srt_cues.json" "$HERE/../art-nouveau.srt"
echo "done: styles/art-nouveau/art-nouveau.mp4"
