#!/bin/sh
# Rebuild the demo from scratch: sh styles/versus-screen/demo/build.sh   (from any directory; core tier only)
# A crash mid-render loses nothing: run it again and finished 96-frame blocks are reused (video.mjs --resume).
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/versus-screen/demo; O=styles/versus-screen; NAME=versus-screen
mkdir -p $D/out $D/fonts $D/stills
# fonts (SIL OFL 1.1, google/fonts repository): Big Shoulders Display (display), Chakra Petch (UI); listed in CREDITS
G=https://github.com/google/fonts/raw/main/ofl
[ -f $D/fonts/BigShouldersDisplay.ttf ] || curl -sfL -o $D/fonts/BigShouldersDisplay.ttf "$G/bigshouldersdisplay/BigShouldersDisplay%5Bwght%5D.ttf"
[ -f $D/fonts/ChakraPetch-Bold.ttf ] || curl -sfL -o $D/fonts/ChakraPetch-Bold.ttf "$G/chakrapetch/ChakraPetch-Bold.ttf"
[ -f $D/fonts/ChakraPetch-Medium.ttf ] || curl -sfL -o $D/fonts/ChakraPetch-Medium.ttf "$G/chakrapetch/ChakraPetch-Medium.ttf"
[ -f $D/fonts/OFL-bigshoulders.txt ] || curl -sfL -o $D/fonts/OFL-bigshoulders.txt "$G/bigshouldersdisplay/OFL.txt"
[ -f $D/fonts/OFL-chakra.txt ] || curl -sfL -o $D/fonts/OFL-chakra.txt "$G/chakrapetch/OFL.txt"
node core/render/events.mjs $D --size 1920x1080
node core/render/readcheck.mjs $D --size 1920x1080
$PY $D/mix.py
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-2} --size 1920x1080 --resume --out $D/out/video.mp4
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0
node core/render/still.mjs $D 17.5 --size 1920x1080 --out $D/out --prefix sf_ && cp $D/out/sf_17.5.jpg $D/stills/styleframe.jpg   # the gallery card (frame_sec in style.json)
node core/render/still.mjs $D 3.0 --size 1920x1080 --out $D/out --prefix po_ && cp $D/out/po_3.0.jpg $O/poster.jpg
