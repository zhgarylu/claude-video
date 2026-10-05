#!/bin/sh
# Rebuild "Five Hats and One Sock": sh styles/sea-adventure/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-2}
PY=.venv/bin/python; D=styles/sea-adventure/demo; O=styles/sea-adventure; NAME=sea-adventure
mkdir -p $D/out $D/voices $D/fonts $D/stills
# 0. fonts (SIL OFL 1.1, from the google/fonts repository)
get() { [ -f $D/fonts/$2 ] || curl -sfL -o $D/fonts/$2 https://github.com/google/fonts/raw/main/ofl/$1/$2; }
get bangers Bangers-Regular.ttf; get rye Rye-Regular.ttf; get pirataone PirataOne-Regular.ttf; get patrickhand PatrickHand-Regular.ttf; get caveatbrush CaveatBrush-Regular.ttf
get bangers OFL.txt && mv -f $D/fonts/OFL.txt $D/fonts/OFL-bangers.txt 2>/dev/null || true
$PY core/tts/tts.py $D/lines.json $D/voices                         # 1. Kokoro voice (bm_george), offline
$PY core/tts/asr_check.py $D/lines.json $D/voices                   # 2. speech-to-text check of every line
node $D/tools/export_tl.mjs                                         # 3. timeline.json + out/srt.json (checks voice lengths)
node core/render/events.mjs $D                                      # 4. sound events -> events.json
node core/render/readcheck.mjs $D                                   # 5. every on-screen text stays long enough
$PY $D/mix.py                                                       # 6. sea, foley, jig, voice -> mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt                 # 7. .srt
node core/render/video.mjs $D --fps 24 --workers 2 --out $D/out/video.mp4   # 8. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 1       # 9. master: -14 LUFS, a little grain
node core/render/still.mjs $D 37.5 --out $D/out --prefix sf_ && cp $D/out/sf_37.5.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 20.0 --out $D/out --prefix po_ && cp $D/out/po_20.0.jpg $O/poster.jpg
