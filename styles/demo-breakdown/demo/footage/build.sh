#!/bin/sh
# Render the fictional source footage (a 30 s "screen recording" of an invented note app) to ../src/footage.mp4, with a quiet UI-sound track.
# Run from anywhere: sh styles/demo-breakdown/demo/footage/build.sh
set -e
cd "$(dirname "$0")/../../../.."
D=styles/demo-breakdown/demo/footage; O=styles/demo-breakdown/demo/src; mkdir -p $O $D/out
node core/render/events.mjs $D
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-3} --out $D/out/video.mp4
.venv/bin/python $D/mix.py
ffmpeg -v error -y -i $D/out/video.mp4 -i $D/out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -r 24 -c:a aac -b:a 96k -shortest -movflags +faststart $O/footage.mp4
ls -la $O/footage.mp4
