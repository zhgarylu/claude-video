#!/bin/sh
# Rebuild "Round One: The Jar" from scratch: sh styles/shonen-battle/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# RENDER_SLOTS=2 is exported so several renders on one machine share the browser budget.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-2}
PY=.venv/bin/python; D=styles/shonen-battle/demo; O=styles/shonen-battle; NAME=shonen-battle
mkdir -p $D/out $D/voices $D/fonts $D/stills
# 0. fonts (SIL OFL 1.1): Bangers for sound words and shouts, Anton for plates, the meter and subtitles
for f in bangers/Bangers-Regular anton/Anton-Regular; do
  b=$(basename $f); n=$(echo $f | cut -d/ -f1)
  [ -f $D/fonts/$b.ttf ] || curl -sL -o $D/fonts/$b.ttf https://github.com/google/fonts/raw/main/ofl/$f.ttf
  [ -f $D/fonts/OFL-$n.txt ] || curl -sL -o $D/fonts/OFL-$n.txt https://github.com/google/fonts/raw/main/ofl/$n/OFL.txt
done
$PY core/tts/tts.py $D/lines.json $D/voices                         # 1. Kokoro voices (am_onyx narrator, bf_isabella grandmother), offline
$PY core/tts/asr_check.py $D/lines.json $D/voices                   # 2. speech-to-text check of every line
node $D/tools/export_tl.mjs                                         # 3. timeline.json + out/srt.json (checks voice lengths)
node core/render/readcheck.mjs $D                                   # 4. every on-screen text stays long enough
$PY $D/mix.py                                                       # 5. foley + score + shouts + voice -> mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt                 # 6. .srt
node core/render/video.mjs $D --fps 24 --workers 2 --out $D/out/video.mp4   # 7. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 1       # 8. master: -14 LUFS, a little grain
node core/render/still.mjs $D 20.5 --out $D/out --prefix sf_ && cp $D/out/sf_20.5.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 6.0 --out $D/out --prefix po_ && cp $D/out/po_6.0.jpg $O/poster.jpg
