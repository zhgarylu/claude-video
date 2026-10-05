#!/bin/sh
# One command to render this film: sh films/<name>/build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-$(cd "$HERE/../.." && pwd)}; export LIB; NAME=$(basename "$HERE")
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -f "$HERE/src/frames/0001.jpg" ] || { echo "run first: sh $LIB/tools/talk/prep.sh <host.mp4> $HERE"; exit 1; }
[ -f "$HERE/src/matte/0001.png" ] || { echo "no person matte: run sh $LIB/tools/matte/run.sh $HERE (macOS only)"; exit 1; }
[ -d "$HERE/node_modules/@sparkjsdev/spark" ] || { echo "run: npm install --prefix $HERE @sparkjsdev/spark@2.3.1 three@0.180.0"; exit 1; }
cd "$LIB"; mkdir -p "$HERE/out"
SIZE=$(node -e "const f=JSON.parse(require('fs').readFileSync('$HERE/film.json','utf8'));console.log((f.aspect||'16x9')==='9x16'?'1080x1920':'1920x1080')")
node core/render/events.mjs "$HERE" --size $SIZE
node core/render/video.mjs "$HERE" --fps 24 --workers 2 --size $SIZE --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node "$HERE/cues.mjs"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues.json" "$HERE/$NAME.srt"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 0
