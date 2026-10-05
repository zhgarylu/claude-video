#!/bin/sh
# Rebuild "Tide Flask" from scratch: sh styles/product-hero/demo/build.sh   (from any directory)
# Needs the core tier only: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps   (a GPU for the WebGL render)
# RENDER_SLOTS=3 is exported so several renders on one machine share the browser budget.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/product-hero/demo; O=styles/product-hero; NAME=product-hero
mkdir -p $D/out $D/fonts $D/stills
# 0. font (SIL OFL 1.1): Jost, variable weight. Copied from another demo or fetched.
[ -f $D/fonts/Jost.ttf ] || curl -sL -o $D/fonts/Jost.ttf "https://github.com/google/fonts/raw/main/ofl/jost/Jost%5Bwght%5D.ttf"
[ -f $D/fonts/OFL-jost.txt ] || curl -sL -o $D/fonts/OFL-jost.txt https://github.com/google/fonts/raw/main/ofl/jost/OFL.txt
node core/render/events.mjs $D                                      # 1. sound events -> events.json
node core/render/readcheck.mjs $D                                   # 2. every title and callout stays long enough
$PY $D/mix.py                                                       # 3. score + foley + room tone -> out/mix.wav
node core/render/video.mjs $D --fps 24 --workers 2 --out $D/out/video.mp4   # 4. every frame (WebGL, about 0.25 s a frame)
sh core/render/mux.sh $D/out/video.mp4 $D/out/mix.wav $O/$NAME.mp4 24 1     # 5. master: -14 LUFS, light grain
node core/render/still.mjs $D 9.2 --out $D/out --prefix sf_ && cp $D/out/sf_9.2.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 3.4 --out $D/out --prefix po_ && cp $D/out/po_3.4.jpg $O/poster.jpg
