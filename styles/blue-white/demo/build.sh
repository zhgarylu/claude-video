#!/bin/sh
# One command: events -> picture -> score/foley mix -> master -> subtitles -> poster.  Run from anywhere: sh styles/blue-white/demo/build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE"
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"                                                     # score, foley, room tone -> out/mix.wav (no voice-over)
"$PY" "$HERE/cuecheck.py"                                                # hits on the beat grid and on music onsets
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../blue-white.mp4" 24 2
"$PY" core/render/srt.py "$HERE/cues.json" "$HERE/../blue-white.srt"
node core/render/still.mjs "$HERE" 52.0 --out "$HERE/out" --prefix poster_
cp "$HERE/out/poster_52.0.jpg" "$HERE/../poster.jpg"
echo "done: styles/blue-white/blue-white.mp4"
