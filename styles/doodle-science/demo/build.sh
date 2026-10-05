#!/bin/sh
# Rebuild the demo from scratch: sh styles/doodle-science/demo/build.sh   (9:16, 1080x1920)
#                                ASPECT=16x9 sh styles/doodle-science/demo/build.sh   (the same film in 1920x1080)
# Needs a network once: edge-tts (Microsoft's online voice) and the Google Fonts files. A crash mid-render loses nothing (video.mjs --resume).
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/doodle-science/demo; O=styles/doodle-science; NAME=doodle-science
if [ "${ASPECT:-9x16}" = 16x9 ]; then SIZE=1920x1080; QA="--q aspect=16x9"; NAME=doodle-science-16x9; else SIZE=1080x1920; QA=""; fi
mkdir -p $D/out $D/fonts $D/stills
# fonts (SIL OFL 1.1, google/fonts): ZCOOL QingKe HuangYou (titles, subtitles), Ma Shan Zheng (handwritten labels); listed in CREDITS
G=https://github.com/google/fonts/raw/main/ofl
[ -f $D/fonts/ZCOOLQingKeHuangYou.ttf ] || curl -sfL -o $D/fonts/ZCOOLQingKeHuangYou.ttf $G/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf
[ -f $D/fonts/MaShanZheng.ttf ] || curl -sfL -o $D/fonts/MaShanZheng.ttf $G/mashanzheng/MaShanZheng-Regular.ttf
[ -f $D/fonts/OFL-zcool.txt ] || curl -sfL -o $D/fonts/OFL-zcool.txt $G/zcoolqingkehuangyou/OFL.txt
[ -f $D/fonts/OFL-mashan.txt ] || curl -sfL -o $D/fonts/OFL-mashan.txt $G/mashanzheng/OFL.txt
[ -f $D/voices/dur.json ] || $PY core/tts/tts_zh.py $D/lines.json $D/voices                  # narration (edge-tts, zh-CN-YunxiNeural)
$PY core/tts/asr_check.py $D/lines.json $D/voices --lang zh --model small                    # every line must be heard as written (lines.json "asr" holds the one accepted mishearing)
node core/render/events.mjs $D --size $SIZE $QA
node core/render/readcheck.mjs $D --size $SIZE $QA || echo "readcheck: voice-synced subtitles and drifting comments are shorter than reading time (known, see DEMO.md)"
$PY $D/mix.py
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-2} --size $SIZE $QA --resume --out $D/out/$NAME-video.mp4
sh core/render/mux.sh $D/out/$NAME-video.mp4 $D/mix.wav $O/$NAME.mp4 24 1
if [ "${ASPECT:-9x16}" = 9x16 ]; then
  node core/render/still.mjs $D 32.2 --size $SIZE --out $D/out --prefix sf_ && cp $D/out/sf_32.2.jpg $D/stills/styleframe.jpg   # the gallery card (frame_sec in style.json)
  node core/render/still.mjs $D 3.0 --size $SIZE --out $D/out --prefix po_ && cp $D/out/po_3.0.jpg $O/poster.jpg
fi
