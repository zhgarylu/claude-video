#!/bin/sh
# Rebuild the demo from scratch: sh styles/webtoon-scroll/demo/build.sh   (from any directory; core tier only)
# A crash mid-render loses nothing: run it again and finished 96-frame blocks are reused (video.mjs --resume).
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/webtoon-scroll/demo; O=styles/webtoon-scroll; NAME=webtoon-scroll
mkdir -p $D/out $D/fonts $D/stills
# fonts (SIL OFL, Google Fonts), fetched once into demo/fonts/ (network); licences are listed in CREDITS
for f in comicneue/ComicNeue-Regular.ttf comicneue/ComicNeue-Bold.ttf comicneue/ComicNeue-BoldItalic.ttf bangers/Bangers-Regular.ttf; do
  [ -s $D/fonts/$(basename $f) ] || curl -sL -o $D/fonts/$(basename $f) https://raw.githubusercontent.com/google/fonts/main/ofl/$f
done
[ -s $D/fonts/OFL-comicneue.txt ] || curl -sL -o $D/fonts/OFL-comicneue.txt https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/OFL.txt
[ -s $D/fonts/OFL-bangers.txt ] || curl -sL -o $D/fonts/OFL-bangers.txt https://raw.githubusercontent.com/google/fonts/main/ofl/bangers/OFL.txt
node core/render/events.mjs $D --size 1080x1920
node core/render/readcheck.mjs $D --size 1080x1920
$PY $D/mix.py
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-2} --size 1080x1920 --resume --out $D/out/video.mp4
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 1
node core/render/still.mjs $D 5 --size 1920x1080 --out $D/out --prefix sf_ && cp $D/out/sf_5.jpg $D/stills/styleframe.jpg   # the gallery card: 16:9, three screens of the strip side by side (main.js wide())
node core/render/still.mjs $D 48.5 --size 1080x1920 --out $D/out --prefix po_ && cp $D/out/po_48.5.jpg $O/poster.jpg
