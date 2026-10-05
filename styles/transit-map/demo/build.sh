#!/bin/sh
# Rebuild "Three Angles to Anywhere" from scratch: sh styles/transit-map/demo/build.sh   (from any directory)
# Needs the core + voice tiers: sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
set -e
cd "$(dirname "$0")/../../.."
PY=.venv/bin/python; D=styles/transit-map/demo; O=styles/transit-map; NAME=transit-map
mkdir -p $D/out $D/voices $D/fonts $D/stills
# 0. font (SIL OFL 1.1, not committed): Barlow Medium for every label and caption
[ -f $D/fonts/Barlow-Medium.ttf ] || curl -sL -o $D/fonts/Barlow-Medium.ttf https://github.com/google/fonts/raw/main/ofl/barlow/Barlow-Medium.ttf
[ -f $D/fonts/OFL.txt ] || curl -sL -o $D/fonts/OFL.txt https://github.com/google/fonts/raw/main/ofl/barlow/OFL.txt
node $D/tools/netcheck.mjs                                       # 1. the network is octilinear, stations sit on their lines, lines cross only at interchanges
node $D/tools/placelabels.mjs                                    # 2. every station name placed flush to its line without collisions (labels.json)
node $D/tools/export_tl.mjs $D                                   # 3. timeline.js → timeline.json (events, voice cues, journey legs)
$PY core/tts/tts.py $D/lines.json $D/voices                      # 4. Kokoro voice (bf_emma), offline
$PY core/tts/asr_check.py $D/lines.json $D/voices                # 5. speech-to-text check of every line
node $D/tools/make_subs.mjs $D                                   # 6. captions: out/srt.json (the page computes the same captions from voices/dur.json)
$PY $D/tools/cuecheck.py $D                                      # 7. picture hits ↔ music grid
$PY $D/mix.py $D                                                 # 8. score + foley + beds + voice → mix.wav
$PY core/render/srt.py $D/out/srt.json $O/$NAME.srt              # 9. .srt
node core/render/readcheck.mjs $D                                # 10. every on-screen text (labels, legend, callouts, title) stays long enough to read
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video.mp4   # 11. every frame (set RENDER_SLOTS=3 to share the machine)
sh core/render/mux.sh $D/out/video.mp4 $D/mix.wav $O/$NAME.mp4 24 0         # 12. master: -14 LUFS, no grain (flat vector picture)
node core/render/still.mjs $D 14.6 --out $D/out --prefix sf_ && cp $D/out/sf_14.6.jpg $D/stills/styleframe.jpg   # 13. the gallery card
node core/render/still.mjs $D 52.5 --out $D/out --prefix po_ && cp $D/out/po_52.5.jpg $O/poster.jpg
