#!/bin/sh
# Rebuild "Day 3: I will not kill this starter" from scratch: sh styles/danmaku/demo/build.sh   (from any directory)
# Needs only the core tier: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps   (no voice: the crowd is the text)
# RENDER_SLOTS=2 is exported so several renders on one machine share the browser budget.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-2}
PY=.venv/bin/python; D=styles/danmaku/demo; O=styles/danmaku; NAME=danmaku
mkdir -p $D/out $D/fonts $D/stills
# 0. font (SIL OFL 1.1): Barlow Semi Condensed, for every comment and the player. Copied from another demo or fetched.
for f in BarlowSemiCondensed-Medium BarlowSemiCondensed-Bold BarlowSemiCondensed-ExtraBold; do
  [ -f $D/fonts/$f.ttf ] || curl -sL -o $D/fonts/$f.ttf https://github.com/google/fonts/raw/main/ofl/barlowsemicondensed/$f.ttf
done
[ -f $D/fonts/OFL-barlow.txt ] || curl -sL -o $D/fonts/OFL-barlow.txt https://github.com/google/fonts/raw/main/ofl/barlowsemicondensed/OFL.txt
node core/render/events.mjs $D                                      # 1. every bullet, bubble, fold, crack ... -> events.json
node core/render/readcheck.mjs $D                                   # 2. every comment and label stays fully in frame long enough
$PY $D/mix.py                                                       # 3. crowd blips + foley + score -> mix.wav
node core/render/video.mjs $D --fps 24 --workers 2 --out $D/out/video.mp4   # 4. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0       # 5. master: -14 LUFS, no grain (flat vector picture)
node core/render/still.mjs $D 43.6 --out $D/out --prefix sf_ && cp $D/out/sf_43.6.jpg $D/stills/styleframe.jpg   # 6. the gallery card
node core/render/still.mjs $D 1.6 --out $D/out --prefix po_ && cp $D/out/po_1.6.jpg $O/poster.jpg                 # 7. poster
