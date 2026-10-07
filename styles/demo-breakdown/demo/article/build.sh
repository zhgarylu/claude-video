#!/bin/sh
# Rebuild the article demo from scratch: sh styles/demo-breakdown/demo/article/build.sh   (voice tier; a network once for edge-tts and Noto Sans SC)
# 1. the invented figures (source/*.png, Pillow)  2. the article folder (article.py)  3. the project page  4. the film (tools/breakdown/build.sh)  5. stills
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=$(cd "$HERE/../../../.." && pwd); S=$LIB/styles/demo-breakdown
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
cd "$LIB"
[ -f "$HERE/source/venn.png" ] || $PY "$HERE/make_figures.py"
[ -f "$HERE/article/article.json" ] || $PY tools/breakdown/article.py "$HERE/source/article.md" --out "$HERE/article" --meta "site=潮汐笔记（虚构）" licence=CC0
[ -f "$HERE/src/f1.png" ] || { mkdir -p "$HERE/src"; cp "$HERE/article/figures/"*.png "$HERE/src/"; }   # the sources breakdown.json names (new.py --article does this for a fresh project)
mkdir -p "$HERE/stills" "$HERE/out"
NAME=demo-breakdown-article OUT_DIR="$HERE/out/final" sh tools/breakdown/build.sh "$HERE" --vertical
cp "$HERE/out/final/demo-breakdown-article.mp4" "$HERE/out/final/demo-breakdown-article.srt" "$S/"
[ -f "$HERE/out/final/demo-breakdown-article-9x16.mp4" ] && cp "$HERE/out/final/demo-breakdown-article-9x16.mp4" "$S/"      # ignored by git like every film
M="$HERE/out/final/demo-breakdown-article.mp4"      # stills taken from the finished film: the quote while a phrase is highlighted, the first figure, the map
ffmpeg -v error -y -ss 12.5 -i "$M" -frames:v 1 -q:v 3 "$HERE/stills/article-quote.jpg"; ffmpeg -v error -y -ss 26 -i "$M" -frames:v 1 -q:v 3 "$HERE/stills/article-figure.jpg"; ffmpeg -v error -y -ss 47 -i "$M" -frames:v 1 -q:v 3 "$HERE/stills/article-map.jpg"
