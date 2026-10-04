#!/bin/sh
# Rebuild "The Last Bowl on Pell Street" from scratch: sh styles/neon-sign/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
set -e
cd "$(dirname "$0")/../../.."
PY=.venv/bin/python; D=styles/neon-sign/demo; O=styles/neon-sign; NAME=neon-sign
mkdir -p $D/out $D/voices $D/fonts
# 0. font (SIL OFL 1.1, not committed): Barlow Medium for the burned-in captions
[ -f $D/fonts/Barlow-Medium.ttf ] || curl -sL -o $D/fonts/Barlow-Medium.ttf https://github.com/google/fonts/raw/main/ofl/barlow/Barlow-Medium.ttf
[ -f $D/fonts/OFL.txt ] || curl -sL -o $D/fonts/OFL.txt https://github.com/google/fonts/raw/main/ofl/barlow/OFL.txt
node $D/tools/export_tl.mjs $D                                   # 1. timeline.js → timeline.json (events, hum, score gates) + lines.json
$PY core/tts/tts.py $D/lines.json $D/voices                      # 2. Kokoro voice (bm_george), offline
$PY core/tts/asr_check.py $D/lines.json $D/voices                # 3. speech-to-text check of every line
node $D/tools/make_subs.mjs $D                                   # 4. captions: subs.json (burned in) + out/srt.json
$PY $D/tools/cuecheck.py $D                                      # 5. picture hits ↔ music grid
$PY $D/mix.py $D                                                 # 6. score + foley + beds + voice → mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt              # 7. .srt
node core/render/readcheck.mjs $D                                # 8. the burned-in captions are fed to window.TEXTS, so every caption is checked for reading time
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 9. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0         # 10. master: -14 LUFS, no grain (the bloom carries the softness)
node core/render/still.mjs $D 24.3 --q nosub=1 --out $D/out --prefix sf_ && cp $D/out/sf_24.3.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 41.5 --q nosub=1 --out $D/out --prefix po_ && cp $D/out/po_41.5.jpg $O/poster.jpg
