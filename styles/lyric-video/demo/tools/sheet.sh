#!/bin/sh
# contact sheet of the film: sh tools/sheet.sh out.jpg cols w t1 t2 ...   (stills at each time, tiled)
cd "$(dirname "$0")/../../../.."
OUT=$1; COLS=$2; W=$3; shift 3
D=styles/lyric-video/demo; P=sh_$$_
RENDER_SLOTS=2 node core/render/still.mjs $D "$@" --out $D/out --prefix $P >/dev/null
FILES=""; for t in "$@"; do FILES="$FILES $(ls $D/out/${P}${t}.jpg 2>/dev/null || ls $D/out/${P}$(printf '%s' "$t").jpg)"; done
.venv/bin/python core/render/sheet.py $OUT $FILES --cols $COLS --w $W
rm -f $D/out/${P}*
