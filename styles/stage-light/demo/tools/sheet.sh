#!/bin/sh
# contact sheet of out/<prefix>*.jpg in time order: sh tools/sheet.sh <prefix> <cols> <w> <out>
cd "$(dirname "$0")/../../../.."
D=styles/stage-light/demo/out
.venv/bin/python core/render/sheet.py "$4" $(ls $D/$1*.jpg | python3 -c "import sys,re;f=sys.stdin.read().split();print(' '.join(sorted(f,key=lambda p:float(re.findall(r'_([0-9.]+)\.jpg',p)[0]))))") --cols $2 --w $3
