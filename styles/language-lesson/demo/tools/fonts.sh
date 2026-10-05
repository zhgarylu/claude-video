#!/bin/sh
# Subset fonts for exactly the characters the film draws (Google Fonts CSS API with &text=). Needs network once; files are cached in demo/fonts/.
set -e
D=$(cd "$(dirname "$0")/.." && pwd); cd "$D/fonts"
PY=python3; $PY ../tools/chars.py
H=$(md5 -q chars.txt 2>/dev/null || md5sum chars.txt | cut -d" " -f1)
[ "$(cat .charhash 2>/dev/null)" = "$H" ] || { rm -f Noto*.ttf; echo "$H" > .charhash; }
TXT=$($PY -c "import urllib.parse;print(urllib.parse.quote(open('chars.txt',encoding='utf-8').read()))")
get() { # file family axis text
  [ -f "$1" ] && return 0
  URL=$(curl -sL -m 60 "https://fonts.googleapis.com/css2?family=$2:$3&text=$4" | grep -o 'https://[^)]*' | head -1)
  curl -sL -m 120 -o "$1" "$URL"; echo "fetched $1"
}
[ -f Nunito.ttf ] || curl -sL -o Nunito.ttf "https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf"
[ -f Caveat.ttf ] || curl -sL -o Caveat.ttf "https://github.com/google/fonts/raw/main/ofl/caveat/Caveat%5Bwght%5D.ttf"
[ -f OFL-nunito.txt ] || curl -sL -o OFL-nunito.txt https://github.com/google/fonts/raw/main/ofl/nunito/OFL.txt
[ -f OFL-caveat.txt ] || curl -sL -o OFL-caveat.txt https://github.com/google/fonts/raw/main/ofl/caveat/OFL.txt
rm -f NotoSC.ttf NotoJP.ttf NotoIPA.ttf NotoAr.ttf
[ -f NotoSC-900.ttf ] || $PY ../tools/getfont.py Noto+Sans+SC 500,700,800,900 NotoSC
[ -f NotoJP-900.ttf ] || $PY ../tools/getfont.py Noto+Sans+JP 500,700,800,900 NotoJP
[ -f NotoIPA-800.ttf ] || $PY ../tools/getfont.py Noto+Sans 400,800 NotoIPA
[ -f NotoAr-800.ttf ] || $PY ../tools/getfont.py Noto+Sans+Arabic 500,800 NotoAr
[ -f OFL-noto.txt ] || curl -sL -o OFL-noto.txt https://github.com/google/fonts/raw/main/ofl/notosans/OFL.txt
