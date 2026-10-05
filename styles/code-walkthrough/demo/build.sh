#!/bin/sh
# Rebuild the demo from scratch: sh styles/code-walkthrough/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice      Also needs python3 (the code on screen is run for real).
# A crash mid-render loses nothing: run it again and finished 96-frame blocks are reused (video.mjs --resume). RENDER_SLOTS keeps the machine usable.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/code-walkthrough/demo; O=styles/code-walkthrough; NAME=code-walkthrough
mkdir -p $D/out $D/fonts $D/stills
# 0. fonts (SIL OFL 1.1), fetched once: JetBrains Mono for the code, Inter for the interface
G=https://github.com/google/fonts/raw/main/ofl
[ -f $D/fonts/JetBrainsMono.ttf ] || curl -sL -o $D/fonts/JetBrainsMono.ttf "$G/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"
[ -f $D/fonts/Inter.ttf ] || curl -sL -o $D/fonts/Inter.ttf "$G/inter/Inter%5Bopsz,wght%5D.ttf"
[ -f $D/fonts/OFL-jetbrainsmono.txt ] || curl -sL -o $D/fonts/OFL-jetbrainsmono.txt $G/jetbrainsmono/OFL.txt
[ -f $D/fonts/OFL-inter.txt ] || curl -sL -o $D/fonts/OFL-inter.txt $G/inter/OFL.txt
python3 $D/verify.py                                                 # 1. run the two files shown in the film for real -> verified.js (every output and trace value on screen)
[ -f $D/voices/dur.json ] || $PY core/tts/tts.py $D/lines.json $D/voices   # 2. narration (Kokoro, am_michael, offline)
$PY core/tts/asr_check.py $D/lines.json $D/voices                    # 3. every line must be heard as written
node core/render/events.mjs $D --size 1920x1080                      # 4. every key, slide, tick, ding -> events.json
node core/render/readcheck.mjs $D --size 1920x1080                   # 5. every on-screen text stays long enough
$PY $D/mix.py                                                        # 6. foley + score + voice -> mix.wav
node $D/tools/export_srt.mjs && $PY core/render/srt.py $D/out/srt.json $O/$NAME.srt   # 7. .srt
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-2} --size 1920x1080 --resume --out $D/out/video.mp4   # 8. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0  # 9. master: -14 LUFS, no grain (flat colour, crisp type)
node core/render/still.mjs $D 31.5 --size 1920x1080 --out $D/out --prefix sf_ && cp $D/out/sf_31.5.jpg $D/stills/styleframe.jpg   # the gallery card (frame_sec in style.json)
node core/render/still.mjs $D 42.9 --size 1920x1080 --out $D/out --prefix po_ && cp $D/out/po_42.9.jpg $O/poster.jpg
