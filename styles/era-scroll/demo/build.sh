#!/bin/sh
# Rebuild the demo from scratch: sh styles/era-scroll/demo/build.sh   (1920x1080, 24 fps; core + voice tiers)
# Needs a network once: edge-tts (Microsoft's online voice) and the Google Fonts files. A crash mid-render loses nothing (video.mjs --resume).
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/era-scroll/demo; O=styles/era-scroll; NAME=era-scroll
mkdir -p $D/out $D/fonts $D/stills $D/voices
# fonts (SIL OFL 1.1, google/fonts): Noto Sans SC, Noto Serif SC, UnifrakturCook, Press Start 2P; listed in CREDITS
G=https://github.com/google/fonts/raw/main/ofl
[ -s $D/fonts/NotoSansSC.ttf ] || curl -sfL -o $D/fonts/NotoSansSC.ttf "$G/notosanssc/NotoSansSC%5Bwght%5D.ttf"
[ -s $D/fonts/NotoSerifSC.ttf ] || curl -sfL -o $D/fonts/NotoSerifSC.ttf "$G/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"
[ -s $D/fonts/UnifrakturCook-Bold.ttf ] || curl -sfL -o $D/fonts/UnifrakturCook-Bold.ttf $G/unifrakturcook/UnifrakturCook-Bold.ttf
[ -s $D/fonts/PressStart2P-Regular.ttf ] || curl -sfL -o $D/fonts/PressStart2P-Regular.ttf $G/pressstart2p/PressStart2P-Regular.ttf
for f in notosanssc notoserifsc unifrakturcook pressstart2p; do [ -s $D/fonts/OFL-$f.txt ] || curl -sfL -o $D/fonts/OFL-$f.txt $G/$f/OFL.txt; done
[ -f $D/voices/dur.json ] || $PY core/tts/tts_zh.py $D/lines.json $D/voices                  # narration (edge-tts, zh-CN-YunxiNeural)
$PY core/tts/asr_check.py $D/lines.json $D/voices --lang zh --model small                    # every line must be heard as written (lines.json "asr" holds the accepted mishearings)
node core/render/events.mjs $D
node core/render/readcheck.mjs $D
$PY $D/mix.py                                                                                # score, foley, voice -> mix.wav, and era-scroll.srt
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-3} --resume --out $D/out/video.mp4
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0
node core/render/still.mjs $D 52.4 --out $D/out --prefix sf_ && cp $D/out/sf_52.4.jpg $D/stills/styleframe.jpg   # the gallery card (frame_sec in style.json)
node core/render/still.mjs $D 70 --out $D/out --prefix po_ && cp $D/out/po_70.jpg $O/poster.jpg
