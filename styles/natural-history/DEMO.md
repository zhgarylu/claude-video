# Natural History Plate — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Plate IV: The Spiral, in Four Makers* (60 s) · `natural-history.mp4` · source in [`demo/`](demo/)

## Story & structure

A blank sheet on baize. Compass circles and a pencil spiral appear on bare paper at macro scale; a chambered shell is inked and coloured on that guide while the plate's title is set. A dashed cut line crosses it and the shell is drawn again halved, chambers and siphuncle showing; a ring is scribed round the siphuncle and a magnified roundel is drawn in the margin. Then three more makers are drawn in quick succession (a banded snail, a sunflower head whose florets sit at the golden angle, a fern crozier), each pinned. The camera pulls back to the finished plate with its captions and scale bars, a silence, and the page curls away to a new sheet that holds only construction lines.

Why it fits: the plate is the subject, so every beat is a native move: *the three passes* (pencil, ink, colour), *the pin*, *the halving*, *the loupe*, *one guide, many figures*, *pages that turn*. The through-line is one idea (a spiral that grows) shown four ways, not a list.

Native moves spent: the three passes, the pin, the halving, the loupe, pages that turn, one guide for many figures.

## Shots

24 fps. 72 BPM, one beat 0.833 s, one bar 3.33 s. Camera keys are `CAM` in `demo/film.js`; the sheet is larger than the plate so no key shows baize by accident.

| # | Time (s) | Shot | Camera | Note |
|---|---|---|---|---|
| 1 | 0–3.5 | Compass circles, axes and the guide spiral on blank paper | macro, zoom 2.7 | first mark in the first second |
| 2 | 3.5–7.5 | Fig. 1 inked; title set | push held, then pull to 1.15 | voice 1 |
| 3 | 7.5–12 | Stipple and wash bloom | 1.15 → 1.38 | harmonica pad enters |
| 4 | 12–13.3 | **Silence**; the first pin | locked | the pin is the first sound after |
| 5 | 13.3–15.4 | Dashed cut `a`–`b` across Fig. 1 | pan right, zoom 1.2 | the halving |
| 6 | 15–22 | Fig. 1a drawn and washed | 1.3 → 1.4 | voice 3 |
| 7 | 22.4–28 | Loupe ring, leader, margin roundel drawn | 1.4 → 1.5 | voice 4; celesta |
| 8 | 28.4–46.7 | Snail, sunflower, fern in overlapping passes, three pins | lateral track at 1.4, then 1.28 | acceleration, voices 5–7 |
| 9 | 46.7–54.6 | Captions, scale bars, closing voice | pull-back to the whole plate | voice 8 |
| 10 | 54.6–56.7 | **Silence** | locked | no room tone |
| 11 | 56.7–59.2 | Page curls away; next sheet with construction lines | locked | the paper curl is the first sound |
| 12 | 59.2–60 | Held; one bowed note | locked | |

## Score structure

D Dorian, bars cycle Dm, C, Am, G. Harpsichord arpeggios and pizzicato viola; a glass-harmonica pad enters with the first wash and leaves for the first silence; a music-box celesta rings through the loupe; eighths accelerate to sixteenths in the three-makers section; long bowed chords close; the last note follows the page turn. Pins, the cut line and the page turn land on beats 16, 17, 33, 41, 47, 56 and 68 (checked by `demo/tools/cuecheck.py`, 0 ms).

## Palette and props

Paper cream `#f4e8cc`, ink `#2b1d12`; pigments per specimen (sienna on pearl for the nautilus, yellow with a chestnut band wash for the snail, chrome yellow and a brown disc for the sunflower, yellow-green over blue-green for the fern); brass pins. Subtitles are italic on a deckled paper slip at the foot of the frame. Typeface IM Fell English (OFL). No sign-off or end card: the library credit is in the repository, not in the film.

## End card

None on the plate. The film ends on the next, blank sheet with its pencil guide.

## Build notes and code entry points

`sh styles/natural-history/demo/build.sh` runs Kokoro (bm_george) and `asr_check.py`, exports `events.json`, runs `tools/cuecheck.py` and `readcheck.mjs`, renders 1080p at 24 fps with 3 workers, synthesises the mix (`mix.py`), masters with `mux.sh` (about −14 LUFS) and writes the `.srt`. `film.js` holds the timeline (`TL`), the camera (`CAM`), the text items, the page curl (`curl`) and the loupe; the engine files are described in `STYLE.md` §10. `demo/FACTS.md` lists the sources for every real-world claim on screen. Specimens are generated from parameters: change `R`, `G`, `chambers` in `nautilus.js`, `bands` and `spire` in `snail.js`, `coil` and `pinnae` in `fern.js`, `n` and `angle` in `sunflower.js`.
