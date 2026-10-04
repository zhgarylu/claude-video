# Comic Panel Pop Art — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Butter Side Down* (47 s) · `comic-pop.mp4` · source in [`demo/`](demo/)

## Story & structure

Logline: a slice of toast slides off a 75 cm table, gets about half a turn, and lands butter side down; the "bad luck" is a number (0.5 turns), and a taller table would change the result.

Two comic pages. Page one is the event (table, fall, landing, number); a full-screen question panel covers it; page two is the what-if (75 cm vs 3 m vs the result, then a punchline strip). No voice: caption boxes, balloons and sound words carry the film, so the sound design is the performance. Native moves spent: the slam-in page (both pages), the push into the splat panel, a snap zoom into the dots behind the sound word, a split panel (the number panel opens into two), the sound word as subject (SPLAT!, 0.5, TA-DA!, CRUNCH!), caption boxes chaining, and a hard cut on a hit between pages.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.5–4.3 | table panel, toast tipping; fall panel with FLIP! | locked full page | slam-in page, two panels in the first 3 s |
| 2 | 6.4 | landing panel slams in, 3-frame freeze | locked | silence before, SPLAT! lands alone |
| 3 | 8.6–10.7 | push into the landing panel until its border leaves frame | push | the signature shot |
| 4 | 11.8–12.9 | snap zoom into the red dots behind SPLAT! | snap zoom | dots as the picture |
| 5 | 12.9–15.0 | pull back to the full page | pull | |
| 6 | 15.0–17.1 | number panel "0.5" slams in | locked | sound word as numeral |
| 7 | 17.1–23.6 | panel splits, camera slides onto the lower half's caption, then pulls back | split, slide | gutter reveal |
| 8 | 23.6–27.9 | full-screen sunburst question | hard slam | page break |
| 9 | 27.9–34.3 | three panels slam in (75 cm / 3 m / TA-DA!) | locked | hard cut on the first slam |
| 10 | 34.3–40.7 | punchline strip slams in; then push into the TA-DA panel | push | |
| 11 | 40.7–47.1 | pull back, silence, CRUNCH!, closing chord | pull, hold | |

## Score structure

112 BPM, 4/4, 22 bars (47.14 s). Page one in A minor (harmonic), page two in C major. Instruments: kit (kick, snare, hats, toms, cross-stick, crash), staccato bass, plucked surf guitar (Karplus–Strong through a feedback comb, tremolo-picked in the push), brass stabs on every slam, vibraphone for the data bars, organ for the question. Arc: groove (bars 0–1) → snare roll (bar 2) → silence 0.22 s → full-band stab with SPLAT! (bar 3) → half-time push (bars 4–6, a second silence 0.6 s before the snap zoom) → tom fill → vibraphone data section (bars 7–10) → organ question (11–12) → page two groove with a brass fanfare on TA-DA! (13–17) → stripped push (18–19) → fill, third silence 0.5 s, CRUNCH!, final stab (20–21). Music ducks 4 dB for 0.28 s under every slam and sound word; master is compressed and limited before the −14 LUFS mux.

## Palette & props

Inks `#e4372b` red, `#ffd21f` yellow, `#1a8fd8` blue (a lighter tint `#5cb8ee` for planes), black `#16110f`, white `#fffaf0`, paper `#f3ead3`. Hero prop: a slice of toast (crust ring in yellow with red dots = orange, crumb in cream with yellow dots, a butter pat with a white highlight), drawn from bezier paths; its two faces switch by cos(rotation). Other props: the table slab, a checker floor, the butter puddle, sunburst wedges, impact bursts. Register offset 5 px × 4 px for the whole film.

## End card

None: the film ends on the punchline strip (CRUNCH!). The LemoLab × Claude Opus 5.5 sign-off is not part of the picture.

## Build notes

- `demo/index.html`: the whole film. Data tables at the top of the film section: `PANELS` (polygons, entry time, split), `ITEMS` (every caption, balloon and sound word with its time), `CAM` (camera poses and times), `FREEZE`; all times are `bar(n, beat)` at 112 BPM. `window.EV` is built from the same tables; `window.TEXTS` comes from the lettering draw (for `readcheck`).
- Engine functions: `shape` (colour pass / line pass with occlusion), `dots`, `burst`, `rays`, `speedLines`, `blob`, `toast`, `caption`, `balloon`, `sfx`, `drawPanel` (slam, flash, shake, split, three passes), `camera`.
- `demo/mix.py` reads `out/events.json` and writes `out/mix.wav` (score + foley, numpy only).
- `sh demo/build.sh`: events, readcheck, video (about 2.5 min on 3 workers), mix, mux (grain 0, so dots stay crisp).
- Fonts: `demo/fonts/Bangers-Regular.ttf` is not committed; see `demo/CREDITS`.
- Pitfalls tied to this demo: the lettering box of every item is used for the readcheck, so a caption must sit inside the page (a box cut by the page edge counts as "never fully visible"); the toast face switch is a sprite trick, not 3D, so it only reads when the toast is face-on.
