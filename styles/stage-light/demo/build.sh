#!/bin/sh
# Rebuild "Second Sunrise" from scratch: sh styles/stage-light/demo/build.sh   (from any directory)
# Needs only the core tier: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps   (no voice: the film is instrumental)
# RENDER_SLOTS=3 is exported so several renders on one machine share the browser budget.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/stage-light/demo; O=styles/stage-light; NAME=stage-light
mkdir -p $D/out $D/fonts
# 0. fonts (SIL OFL 1.1): Bebas Neue (titles, LED wordmark) and Barlow Condensed Medium (small caption). Fetched once.
[ -f $D/fonts/BebasNeue-Regular.ttf ] || curl -sL -o $D/fonts/BebasNeue-Regular.ttf https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf
[ -f $D/fonts/OFL-bebasneue.txt ] || curl -sL -o $D/fonts/OFL-bebasneue.txt https://github.com/google/fonts/raw/main/ofl/bebasneue/OFL.txt
[ -f $D/fonts/BarlowCondensed-Medium.ttf ] || curl -sL -o $D/fonts/BarlowCondensed-Medium.ttf https://github.com/google/fonts/raw/main/ofl/barlowcondensed/BarlowCondensed-Medium.ttf
[ -f $D/fonts/OFL-barlowcondensed.txt ] || curl -sL -o $D/fonts/OFL-barlowcondensed.txt https://github.com/google/fonts/raw/main/ofl/barlowcondensed/OFL.txt
$PY $D/score.py                                                     # 1. the song as data: beat grid, sections, drum hits, notes -> score.json
node core/render/events.mjs $D                                      # 2. every light cue's sound event -> events.json
node core/render/readcheck.mjs $D                                   # 3. every title stays long enough
$PY $D/mix.py                                                       # 4. music + foley + crowd (all synthesised) -> mix.wav
$PY $D/tools/audiocheck.py                                          # 5. silences, band balance, clipping
node $D/tools/srt.mjs && $PY core/render/srt.py $D/out/srt.json $O/$NAME.srt   # 6. .srt of the three titles
node core/render/video.mjs $D --fps 24 --workers 2 --out $D/out/video.mp4   # 7. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 1       # 8. master: -14 LUFS, a little grain
$PY $D/tools/flashcheck.py $O/$NAME.mp4                             # 9. photosensitivity: flashes per second in the final film
node core/render/still.mjs $D 49.6 --out $D/out --prefix sf_ && cp $D/out/sf_49.6.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 45.0 --out $D/out --prefix po_ && cp $D/out/po_45.0.jpg $O/poster.jpg
