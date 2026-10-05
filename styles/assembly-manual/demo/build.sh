#!/bin/sh
# Rebuild "Drip 1" from scratch: sh styles/assembly-manual/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# A crash mid-render loses nothing: run it again and finished 96-frame blocks are reused (video.mjs --resume).
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/assembly-manual/demo; O=styles/assembly-manual; NAME=assembly-manual
mkdir -p $D/out $D/fonts $D/stills $D/voices
# 0. fonts (SIL OFL 1.1): Hanken Grotesk (text) and Nunito (rounded numerals), variable weight. Fetched once.
G=https://github.com/google/fonts/raw/main/ofl
[ -f $D/fonts/HankenGrotesk.ttf ] || curl -sL -o $D/fonts/HankenGrotesk.ttf "$G/hankengrotesk/HankenGrotesk%5Bwght%5D.ttf"
[ -f $D/fonts/OFL-hanken.txt ] || curl -sL -o $D/fonts/OFL-hanken.txt $G/hankengrotesk/OFL.txt
[ -f $D/fonts/Nunito.ttf ] || curl -sL -o $D/fonts/Nunito.ttf "$G/nunito/Nunito%5Bwght%5D.ttf"
[ -f $D/fonts/OFL-nunito.txt ] || curl -sL -o $D/fonts/OFL-nunito.txt $G/nunito/OFL.txt
[ -f $D/voices/dur.json ] || $PY core/tts/tts.py $D/lines.json $D/voices   # 1. narration (Kokoro af_nicole, offline)
$PY core/tts/asr_check.py $D/lines.json $D/voices                          # 2. every line must be heard as written
node core/render/events.mjs $D --size 1920x1080                            # 3. every snap, click, drop -> events.json
node core/render/readcheck.mjs $D --size 1920x1080                         # 4. every label stays long enough
$PY $D/mix.py                                                              # 5. loop + foley + voice -> mix.wav
node $D/tools/export_srt.mjs && $PY core/render/srt.py $D/out/srt.json $O/$NAME.srt   # 6. .srt (the same cues are burned in)
node core/render/video.mjs $D --fps 24 --workers ${WORKERS:-2} --size 1920x1080 --resume --out $D/out/video.mp4   # 7. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0       # 8. master: -14 LUFS, no grain (flat paper, crisp lines)
node core/render/still.mjs $D 53.0 --size 1920x1080 --out $D/out --prefix sf_ && cp $D/out/sf_53.0.jpg $D/stills/styleframe.jpg   # 9. the gallery card (frame_sec in style.json)
node core/render/still.mjs $D 3.6 --size 1920x1080 --out $D/out --prefix po_ && cp $D/out/po_3.6.jpg $O/poster.jpg
