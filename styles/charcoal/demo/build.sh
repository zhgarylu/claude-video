#!/bin/sh
# One command: events -> reading check -> picture -> score and foley mix -> cue check -> master -> subtitles.
# Run from anywhere: sh styles/charcoal/demo/build.sh
# Picture: each render worker owns a contiguous range of frames, so the sheet is replayed once up to its
# first frame and from then on only advances (the cache is the sheet itself, kept between frames).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE"
node core/render/readcheck.mjs "$HERE" --step 0.1
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"                                    # score and foley -> out/mix.wav, out/score_cues.json
"$PY" "$HERE/tools/cuecheck.py"                         # every film hit sits on a score note
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../charcoal.mp4" 24 0
"$PY" "$HERE/tools/mkcues.py"
"$PY" core/render/srt.py "$HERE/cues.json" "$HERE/../charcoal.srt"
echo "done: styles/charcoal/charcoal.mp4"
