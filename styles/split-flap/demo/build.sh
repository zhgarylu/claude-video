#!/bin/sh
# Rebuild "The Long Way Round" from scratch: sh styles/split-flap/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# RENDER_SLOTS=3 is exported so several renders on one machine share the browser budget.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/split-flap/demo; O=styles/split-flap; NAME=split-flap
mkdir -p $D/out $D/voices $D/fonts
# 0. font (SIL OFL 1.1): Barlow Medium, thickened in code for the flap type and the strip. Copied from another demo or fetched.
[ -f $D/fonts/Barlow-Medium.ttf ] || curl -sL -o $D/fonts/Barlow-Medium.ttf https://github.com/google/fonts/raw/main/ofl/barlow/Barlow-Medium.ttf
[ -f $D/fonts/OFL-barlow.txt ] || curl -sL -o $D/fonts/OFL-barlow.txt https://github.com/google/fonts/raw/main/ofl/barlow/OFL.txt
$PY core/tts/tts.py $D/lines.json $D/voices                         # 1. Kokoro voice (bf_emma), offline
$PY core/tts/asr_check.py $D/lines.json $D/voices                   # 2. speech-to-text check of every line
node $D/tools/export_tl.mjs                                         # 3. timeline.json + out/srt.json (checks voice lengths and the grid)
node core/render/events.mjs $D                                      # 4. every flap landing -> events.json
node core/render/readcheck.mjs $D                                   # 5. every settled text stays long enough
$PY $D/mix.py                                                       # 6. foley from the events + score + voice -> mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt                 # 7. .srt
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 8. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 1       # 9. master: -14 LUFS, a little grain
node core/render/still.mjs $D 35.2 --out $D/out --prefix sf_ && cp $D/out/sf_35.2.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 9.0 --out $D/out --prefix po_ && cp $D/out/po_9.0.jpg $O/poster.jpg
