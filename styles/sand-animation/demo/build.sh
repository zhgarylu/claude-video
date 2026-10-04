#!/bin/sh
# One command: sh styles/sand-animation/demo/build.sh   (clone mode; in skill mode set LIB=<library folder>)
# events -> score + sand foley (mix.py) -> frames (3 workers) -> slim the noisy intermediate -> mux to -14 LUFS -> poster -> cue check.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
# grain-heavy frames make a 400 MB intermediate: a light temporal denoise and crf 27 bring the film to ~80 MB
ffmpeg -y -loglevel error -i "$HERE/out/video.mp4" -vf "hqdn3d=1.0:1.0:3:3" -c:v libx264 -preset medium -crf 27 -pix_fmt yuv420p "$HERE/out/video_s.mp4"
sh core/render/mux.sh "$HERE/out/video_s.mp4" "$HERE/out/mix.wav" "$HERE/out/film_full.mp4" 24 0
# mux.sh encodes at crf 19 (~125 MB for this noisy picture); one more video pass with the audio copied untouched gives ~86 MB
ffmpeg -y -loglevel error -i "$HERE/out/film_full.mp4" -c:v libx264 -preset medium -crf 25 -pix_fmt yuv420p -c:a copy -movflags +faststart "$HERE/../sand-animation.mp4"
node core/render/still.mjs "$HERE" 20.9 --prefix poster_ --out "$HERE/out"
cp "$HERE/out/poster_20.9.jpg" "$HERE/../poster.jpg"
"$LIB/.venv/bin/python" "$HERE/tools/cuecheck.py"
