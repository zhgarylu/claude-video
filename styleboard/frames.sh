#!/bin/sh
# 把各风格 demo 的风格帧收进图鉴：styles/<slug>/demo/stills/styleframe.jpg → img/<slug>_0.jpg
# sh styleboard/frames.sh [slug]：给了 slug 只做这一个风格（新风格用这个，免得把所有卡片重新编码一遍）
cd "$(dirname "$0")"
ONLY="${1:-*}"
[ "$ONLY" = "*" ] || [ -f "../styles/$ONLY/demo/stills/styleframe.jpg" ] || { echo "frames.sh: no styles/$ONLY/demo/stills/styleframe.jpg" >&2; exit 1; }
for f in ../styles/$ONLY/demo/stills/styleframe.jpg; do
  s=$(basename "$(dirname "$(dirname "$(dirname "$f")")")")
  ffmpeg -v error -y -i "$f" -vf scale=1280:-1 -q:v 3 "img/${s}_0.jpg" && echo "$s"
done
ONLY="$ONLY" python3 - <<'PY'
import json, glob, os
c = json.load(open('img/credits.json'))
for p in glob.glob(f"../styles/{os.environ['ONLY']}/demo/stills/styleframe.jpg"):
    s = p.split('/')[2]; c[f'{s}_0.jpg'] = {'frame': True}
json.dump(c, open('img/credits.json', 'w'), ensure_ascii=False, indent=1)
PY
python3 build.py
