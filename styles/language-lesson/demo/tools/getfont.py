"""getfont.py <Family+Name> <w1,w2,..> <out-prefix> : subset of a Google font (OFL) for the characters in fonts/chars.txt -> <out-prefix>-<weight>.ttf"""
import sys, re, urllib.parse, os, subprocess
fam, ws, pre = sys.argv[1:4]; D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
text = open(os.path.join(D, 'chars.txt'), encoding='utf-8').read()
css = subprocess.run(['curl', '-sL', '-m', '60', f'https://fonts.googleapis.com/css2?family={fam}:wght@{ws.replace(",", ";")}&text={urllib.parse.quote(text)}'], capture_output=True, text=True).stdout
for blk in re.findall(r'@font-face\s*\{(.*?)\}', css, re.S):
    w = re.search(r'font-weight:\s*(\d+)', blk).group(1); u = re.search(r'url\(([^)]+)\)', blk).group(1)
    out = os.path.join(D, f'{pre}-{w}.ttf')
    subprocess.run(['curl', '-sL', '-m', '120', '-o', out, u], check=True); print('fetched', out)
