#!/bin/sh
# Rebuild "Ten More Minutes" from scratch: sh styles/lyric-video/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
# The vocal is spoken in rhythm (Kokoro cannot sing); the score is synthesised in numpy. RENDER_SLOTS=2 keeps the browser budget small.
set -e
cd "$(dirname "$0")/../../.."
export RENDER_SLOTS=${RENDER_SLOTS:-2}
PY=.venv/bin/python; D=styles/lyric-video/demo; O=styles/lyric-video; NAME=lyric-video
mkdir -p $D/out $D/voices/placed $D/fonts $D/stills
# 0. fonts (SIL OFL 1.1): Anton for the hook, Archivo (variable weight) for everything else
[ -f $D/fonts/Anton-Regular.ttf ] || curl -sL -o $D/fonts/Anton-Regular.ttf https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf
[ -f $D/fonts/Archivo-VF.ttf ]    || curl -sL -o $D/fonts/Archivo-VF.ttf 'https://github.com/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf'
[ -f $D/fonts/OFL-anton.txt ]     || curl -sL -o $D/fonts/OFL-anton.txt https://github.com/google/fonts/raw/main/ofl/anton/OFL.txt
[ -f $D/fonts/OFL-archivo.txt ]   || curl -sL -o $D/fonts/OFL-archivo.txt https://github.com/google/fonts/raw/main/ofl/archivo/OFL.txt
$PY core/tts/tts.py $D/lines.json $D/voices                         # 1. Kokoro voice (am_michael), offline: spoken, not sung
$PY core/tts/asr_check.py $D/lines.json $D/voices                   # 2. speech-to-text check of every line
$PY $D/tools/place.py                                               # 3. put every line on the 100 BPM grid (anchor words on beats, stretch within 15 %); writes words.json for the karaoke fill
node core/render/events.mjs $D                                      # 4. kicks, snares, hits, moves -> events.json
node core/render/readcheck.mjs $D                                   # 5. every word stays on screen long enough to read
$PY $D/mix.py                                                       # 6. beat + bass + keys + foley + voice -> mix.wav
$PY $D/tools/srt_make.py && $PY core/render/srt.py $D/out/srt.json $O/$NAME.srt   # 7. the lyrics as .srt
node core/render/video.mjs $D --fps 24 --workers 2 --out $D/out/video.mp4          # 8. every frame
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0                # 9. master: -14 LUFS, no grain (flat graphics)
node core/render/still.mjs $D 43.1 --out $D/out --prefix sf_ && cp $D/out/sf_43.1.jpg $D/stills/styleframe.jpg
node core/render/still.mjs $D 1.9 --out $D/out --prefix po_ && cp $D/out/po_1.9.jpg $O/poster.jpg
