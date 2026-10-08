#!/bin/sh
# Rebuild the news-digest demo from scratch: sh styles/demo-breakdown/demo/news/build.sh   (voice tier; a network once for edge-tts and Noto Sans SC)
# 1. the invented "official demo" footage (skipped when demo/news/src/footage.mp4 exists)  2. the film (tools/breakdown/build.sh)  3. stills
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=$(cd "$HERE/../../../.." && pwd); S=$LIB/styles/demo-breakdown
[ -f "$HERE/src/footage.mp4" ] || sh "$HERE/footage/build.sh"
mkdir -p "$HERE/stills" "$HERE/out"
NAME=demo-breakdown-news OUT_DIR="$HERE/out/final" sh "$LIB/tools/breakdown/build.sh" "$HERE"
cp "$HERE/out/final/demo-breakdown-news.mp4" "$HERE/out/final/demo-breakdown-news.srt" "$S/"      # the .mp4 is ignored by git like every film
M="$HERE/out/final/demo-breakdown-news.mp4"      # stills taken from the finished film: the hook, the source's number frozen, the conclusion
ffmpeg -v error -y -ss 4 -i "$M" -frames:v 1 -q:v 3 "$HERE/stills/news-hook.jpg"; ffmpeg -v error -y -ss 24 -i "$M" -frames:v 1 -q:v 3 "$HERE/stills/news-freeze.jpg"; ffmpeg -v error -y -ss 66 -i "$M" -frames:v 1 -q:v 3 "$HERE/stills/news-conclusion.jpg"
