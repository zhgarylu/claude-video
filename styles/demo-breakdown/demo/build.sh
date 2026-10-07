#!/bin/sh
# Rebuild the demo from scratch: sh styles/demo-breakdown/demo/build.sh   (core + voice tier; needs a network once for edge-tts and Noto Sans SC)
# 1. the invented source footage (skipped when demo/src/footage.mp4 exists; delete it to re-render)  2. the breakdown film  3. gallery card and poster
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=$(cd "$HERE/../../.." && pwd); S=$LIB/styles/demo-breakdown
[ -f "$HERE/src/footage.mp4" ] || sh "$HERE/footage/build.sh"
mkdir -p "$HERE/stills"
NAME=demo-breakdown OUT_DIR=$S sh "$LIB/tools/breakdown/build.sh" "$HERE" --vertical
cd "$LIB"
node core/render/still.mjs "$HERE" 42.5 --size 1920x1080 --out "$HERE/out" --prefix sf_ && cp "$HERE/out/sf_42.5.jpg" "$HERE/stills/styleframe.jpg"      # the gallery card (frame_sec in style.json)
# keep the style folder to what MAINTAINING.md lists: the 9:16 poster and the check report stay in demo/out (the 9:16 film is ignored by git like every film)
mv -f "$S/poster-9x16.jpg" "$HERE/out/" 2>/dev/null || true; rm -rf "$S/demo-breakdown-check"
