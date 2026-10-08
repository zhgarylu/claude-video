#!/bin/sh
# Render the fictional "official demo" (a 19 s portrait phone clip of an invented transcription app) to ../src/footage.mp4, with a quiet UI-sound track.
# Run from anywhere: sh styles/demo-breakdown/demo/news/footage/build.sh
set -e
cd "$(dirname "$0")/../../../../.."
D=styles/demo-breakdown/demo/news/footage; O=styles/demo-breakdown/demo/news/src; mkdir -p $O $D/out
[ -f $D/fonts/NotoSansSC.ttf ] || { mkdir -p $D/fonts; cp styles/demo-breakdown/demo/footage/fonts/NotoSansSC.ttf $D/fonts/ 2>/dev/null || cp styles/demo-breakdown/demo/fonts/NotoSansSC.ttf $D/fonts/; }
node core/render/events.mjs $D --size 1080x1920
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-3} --size 1080x1920 --out $D/out/video.mp4
.venv/bin/python $D/mix.py
ffmpeg -v error -y -i $D/out/video.mp4 -i $D/out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -r 24 -c:a aac -b:a 96k -shortest -movflags +faststart $O/footage.mp4
rm -rf $D/out
ls -la $O/footage.mp4
