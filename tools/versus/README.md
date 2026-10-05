# tools/versus: two product photos in, a Versus Screen film and a fact sheet out

```bash
.venv/bin/python tools/versus/make.py <name> --a a.jpg --b b.jpg --name-a "A 名" --name-b "B 名" \
  --price-a 49 --price-b 59 --noun 手冲壶 \
  --round "容量|350|500|high|listing|商品页第 2 屏|ml" --round "手柄|裸金属|皮革包裹|B|photo" --build
```

Round = `name|A|B|rule|basis[|source[|unit]]`, or `--rounds-file rounds.csv` with the same columns. 2–4 rounds; with both prices given a price round comes first.

- **numbers**: rule `low` / `high`; `¥ $ €` go in front of the number, other units (ml, g) after. The winner follows from the numbers.
- **words**: rule `A` / `B` says who is better (your judgement, listed in the fact sheet).
- **basis**: `user` / `listing` / `measured` need a `source`; `photo` (judged from the picture) is stamped "不是实测" on screen. A tie or a 2:2 result stops the build: the style needs a winner.

Output in `films/<name>/`: the film (`<name>.mp4`), `facts.md` (every number, its basis and source, what to check before publishing), `data.json` (edit and re-run `build.sh` to change wording), `assets/` (cut-outs: look at the edges).

Needs: macOS 14+ for the Vision cut-out (otherwise a flat light background is keyed out, or give PNGs with alpha); the core tier; the first build downloads Noto Sans SC (OFL, ~17 MB). Photos should point left (spout / front); `--flip-a` / `--flip-b` mirror them. Texts are Chinese; `--text select=… sub=… ask=… chip1=… chip2=…` overrides the wording.
