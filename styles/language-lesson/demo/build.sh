#!/bin/sh
# Rebuild "Three Little Words" (language-lesson demo) from scratch: sh styles/language-lesson/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice. Fonts are fetched from Google Fonts once (network).
# RENDER_SLOTS keeps the machine usable while it renders (default 3).
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-3}
PY=.venv/bin/python; D=styles/language-lesson/demo; O=styles/language-lesson; NAME=language-lesson; SZ=1080x1920
mkdir -p $D/out $D/voices $D/fonts
sh $D/tools/fonts.sh                                            # 0. fonts (SIL OFL): Nunito, Caveat, Noto Sans SC / JP / IPA / Arabic, subset to the characters used
$PY $D/tools/split_lines.py
$PY core/tts/tts.py $D/out/lines_en.json $D/voices                     # 1a. Kokoro, offline: af_heart reads the English examples
$PY core/tts/tts_zh.py $D/out/lines_zh.json $D/voices                  # 1b. edge-tts (Microsoft, NEEDS NETWORK): zh-CN-XiaoxiaoNeural, the Mandarin teacher. Kokoro's offline Mandarin was not intelligible to Whisper (see DEMO.md)
$PY core/tts/asr_check.py $D/out/lines_en.json $D/voices --lang en --model large-v3-turbo && cp $D/voices/words.json $D/voices/words_en.json   # 2. speech-to-text check (word timings of the repeated sentences)
$PY core/tts/asr_check.py $D/out/lines_zh.json $D/voices --lang zh --model large-v3-turbo
$PY $D/tools/plan.py                                                   # 3. the clock: voice lines end to end, marks, word timings, mouth envelope
node core/render/events.mjs $D --size $SZ                              # 4. every card, chip, tick, ding -> events.json
node core/render/readcheck.mjs $D --size $SZ                           # 5. every on-screen text stays long enough
$PY $D/mix.py                                                          # 6. score + foley + voice -> mix.wav
node $D/tools/export_srt.mjs && $PY core/render/srt.py $D/out/srt.json $O/$NAME.srt   # 7. .srt
node core/render/video.mjs $D --fps 24 --workers 2 --size $SZ --out $D/out/video.mp4   # 8. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0   # 9. master: -14 LUFS, no grain (flat colour, crisp type)
# stills: the gallery card is a 16:9 composition of the same page (the gallery crops cards to 16:9); the poster is the 9:16 cover
SF=$($PY -c "import json;print(json.load(open('$O/style.json'))['frame_sec'])")
node core/render/still.mjs $D $SF --size 1920x1080 --out $D/out --prefix sf_ && cp $D/out/sf_$SF.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 3.6 --size $SZ --out $D/out --prefix po_ && cp $D/out/po_3.6.jpg $O/poster.jpg
$PY $D/tools/stills.py | while read NAME T; do node core/render/still.mjs $D $T --size $SZ --out $D/out --prefix fr_ >/dev/null && cp $D/out/fr_$T.jpg $D/stills/frame_$NAME.jpg; done
node core/render/still.mjs $D 10 --size $SZ --q 'show=cards' --out $D/out --prefix cards_ && cp $D/out/cards_10.jpg $D/stills/alt_cards.jpg
