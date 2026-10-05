#!/bin/sh
# Rebuild "Mango Lane: Mega Markdown" from scratch: sh styles/flash-sale/demo/build.sh   (from any directory)
# Needs only the core tier: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps   (no voice: the prices are the text)
# RENDER_SLOTS=3 is exported so several renders on one machine share the browser budget.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/flash-sale/demo; O=styles/flash-sale; NAME=flash-sale
mkdir -p $D/out $D/fonts $D/stills
# 0. fonts (SIL OFL 1.1): Anton for headlines and prices, Barlow Condensed Bold/ExtraBold for labels. Fetched if missing.
G=https://github.com/google/fonts/raw/main/ofl
[ -f $D/fonts/Anton-Regular.ttf ] || curl -sL -o $D/fonts/Anton-Regular.ttf $G/anton/Anton-Regular.ttf
[ -f $D/fonts/OFL-anton.txt ] || curl -sL -o $D/fonts/OFL-anton.txt $G/anton/OFL.txt
for f in BarlowCondensed-Bold BarlowCondensed-ExtraBold; do [ -f $D/fonts/$f.ttf ] || curl -sL -o $D/fonts/$f.ttf $G/barlowcondensed/$f.ttf; done
[ -f $D/fonts/OFL-barlow.txt ] || curl -sL -o $D/fonts/OFL-barlow.txt $G/barlowcondensed/OFL.txt
node core/render/events.mjs $D                                      # 1. every slam, strike, price, tick -> events.json
node core/render/readcheck.mjs $D                                   # 2. every price and label stays fully in frame long enough
$PY $D/mix.py                                                       # 3. jingle + designed sfx from the events -> mix.wav
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-2} --out $D/out/video.mp4   # 4. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0       # 5. master: -14 LUFS, no grain (flat vector picture)
node core/render/still.mjs $D 7.0 --out $D/out --prefix sf_ && cp $D/out/sf_7.0.jpg $D/stills/styleframe.jpg   # 6. the gallery card
node core/render/still.mjs $D 2.5 --out $D/out --prefix po_ && cp $D/out/po_2.5.jpg $O/poster.jpg                # 7. poster
