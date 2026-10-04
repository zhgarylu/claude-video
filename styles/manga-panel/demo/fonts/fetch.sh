#!/bin/sh
# Subsets the OFL CJK fonts to the characters used in demo/film.js (TECHNIQUE section 11).
# Needs a network connection. Re-run after changing any text in film.js.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
ENC=$(python3 - "$HERE/../film.js" <<'PY'
import sys,re,urllib.parse
s=open(sys.argv[1],encoding='utf8').read()
chars=sorted(set(re.findall(r'[ -⁯　-〿一-鿿＀-￯]',s))|set("0123456789:!?.- ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
print(urllib.parse.quote(''.join(chars)))
PY
)
get() { # family weight file
  css=$(curl -sS -A "Mozilla/5.0" "https://fonts.googleapis.com/css2?family=$1:wght@$2&text=$ENC")
  url=$(printf '%s' "$css" | grep -o 'https://[^)]*' | head -1)
  curl -sS -o "$HERE/$3" "$url"
}
get "Noto+Sans+SC" 700 NotoSansSC-700.ttf
get "Noto+Sans+SC" 900 NotoSansSC-900.ttf
get "ZCOOL+QingKe+HuangYou" 400 ZCOOLQingKeHuangYou.ttf
ls -l "$HERE"/*.ttf
