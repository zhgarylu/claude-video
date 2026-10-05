#!/bin/sh
# Rebuild the demo from scratch: sh styles/paper-annotation/demo/build.sh   (core tier only; needs a network once for edge-tts and the Google Fonts files)
# A crash mid-render loses nothing: run it again and finished 96-frame blocks are reused (video.mjs --resume).
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/paper-annotation/demo; O=styles/paper-annotation; NAME=paper-annotation
mkdir -p $D/out $D/fonts $D/stills
# fonts (SIL OFL 1.1, google/fonts): Noto Sans SC (text), Source Serif 4 (the paper); listed in CREDITS
G=https://github.com/google/fonts/raw/main/ofl
[ -f $D/fonts/NotoSansSC.ttf ] || curl -sfL -o $D/fonts/NotoSansSC.ttf "$G/notosanssc/NotoSansSC%5Bwght%5D.ttf"
[ -f $D/fonts/SourceSerif4.ttf ] || curl -sfL -o $D/fonts/SourceSerif4.ttf "$G/sourceserif4/SourceSerif4%5Bopsz,wght%5D.ttf"
[ -f $D/fonts/OFL-notosanssc.txt ] || curl -sfL -o $D/fonts/OFL-notosanssc.txt $G/notosanssc/OFL.txt
[ -f $D/fonts/OFL-sourceserif.txt ] || curl -sfL -o $D/fonts/OFL-sourceserif.txt $G/sourceserif4/OFL.txt
[ -f $D/voices/dur.json ] || $PY core/tts/tts_zh.py $D/lines.json $D/voices                  # narration (edge-tts, zh-CN-XiaoxiaoNeural)
$PY core/tts/asr_check.py $D/lines.json $D/voices --lang zh --model small                    # every line must be heard as written (lines.json "asr" holds an accepted mishearing)
node core/render/events.mjs $D --size 1920x1080
node core/render/readcheck.mjs $D --size 1920x1080 || echo "readcheck: voice-synced subtitles are shorter than reading time (known, see DEMO.md)"
$PY $D/mix.py
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-2} --size 1920x1080 --resume --out $D/out/video.mp4
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0
node core/render/still.mjs $D 38.0 --size 1920x1080 --out $D/out --prefix sf_ && cp $D/out/sf_38.0.jpg $D/stills/styleframe.jpg   # the gallery card (frame_sec in style.json)
node core/render/still.mjs $D 8.0 --size 1920x1080 --out $D/out --prefix po_ && cp $D/out/po_8.0.jpg $O/poster.jpg
