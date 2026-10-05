#!/bin/sh
# Rebuild "She Knows" from scratch: sh styles/chat-log/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# RENDER_SLOTS=2 keeps the machine usable while it renders.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-2}
PY=.venv/bin/python; D=styles/chat-log/demo; O=styles/chat-log; NAME=chat-log
mkdir -p $D/out $D/voices $D/fonts
# 0. font (SIL OFL 1.1): Nunito, variable weight. Fetched once.
[ -f $D/fonts/Nunito.ttf ] || curl -sL -o $D/fonts/Nunito.ttf "https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf"
[ -f $D/fonts/OFL-nunito.txt ] || curl -sL -o $D/fonts/OFL-nunito.txt https://github.com/google/fonts/raw/main/ofl/nunito/OFL.txt
$PY core/tts/tts.py $D/lines.json $D/voices                         # 1. Kokoro voice (bf_isabella), offline: Nana's voice message
$PY core/tts/asr_check.py $D/lines.json $D/voices                   # 2. speech-to-text check of the line
node core/render/events.mjs $D                                      # 3. every pop, key, typing blip, recall -> events.json
node core/render/readcheck.mjs $D                                   # 4. every message stays long enough
$PY $D/mix.py                                                       # 5. foley + score + voice -> mix.wav
node $D/tools/export_srt.mjs && $PY core/render/srt.py $D/out/srt.json $O/$NAME.srt   # 6. .srt
node core/render/video.mjs $D --fps 24 --workers 2 --out $D/out/video.mp4   # 7. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0       # 8. master: -14 LUFS, no grain (flat colour, crisp type)
node core/render/still.mjs $D 38.2 --out $D/out --prefix sf_ && cp $D/out/sf_38.2.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 31.5 --out $D/out --prefix po_ && cp $D/out/po_31.5.jpg $O/poster.jpg
