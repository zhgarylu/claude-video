# Woodblock New Year Print — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Five Blocks to a Door* (56 s) · `nianhua.mp4` · source in [`demo/`](demo/)

## Story & structure

Logline: a carved plank prints a child with a carp and a lotus, one colour block at a time; the print goes up on a door beside a mirrored guardian pair, the old year tears when the door is opened, and the plank, not the paper, is what stays.

Structure (a list that turns): **block** (key-line, ink, paper, rub, peel) → **five colour blocks**, one voice of the score per block, until the red lands → **the door**: paste, the pair printed twice at double speed, banner, couplets, a seal strip over the seam → **near-silence**, firecrackers, the doors open and the strip tears → **inside**, the child's print on the wall → **the bench again**, the same first thump. It is a how-it-is-made explainer that ends on a turn (the print is made to be used up) instead of on the finished picture.

Native moves spent: colour passes one at a time (scene B), mis-register and settle (a close-up while the voice says no block fits perfectly), the key-line pass at the start and the last pass snapping the picture still (red), the mirrored pair with swapped colours (scene C), paste and press, the door reveal, the tear, the block as the real object, firecracker red.

Voice: Kokoro `bm_fable`, 13 short lines, 36 s of speech in a 56 s film. All music and sound are synthesised.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0–1.0 | black, then the first thump | none | the film starts in silence and a block lands |
| 2 | 1.0–6.0 | top-down on the key block (reversed art), title slip on the table, roller inks the lines | slow push from wide | carved plank; ink sweeps right to left |
| 3 | 6.0–9.1 | paper laid, rubbed with the baren, the lines show through | push, tilt down with the baren | rubbing; ghost lines |
| 4 | 9.1–10.4 | the sheet peels, narrows to a line and flips, lifts, travels right | camera follows the sheet | the peel; block left behind |
| 5 | 10.4–21.4 | five colour blocks on the bench (plank, ink bowl), five sweeps | face push, pull, low pan, push | one pass per voice word; chips collect |
| 6 | 21.4–25.4 | extreme close-up of the face while the registration gap is shown | push to 2.0 and hold | the error is looked at, then forgiven |
| 7 | 25.4–31.0 | red lands, the picture is still; brush rings round the carp and the lotus | push, pan to the lotus, pull | the climax colour |
| 8 | 30.4–31.0 | a sheet-slide transition into the courtyard | none | in-medium wipe |
| 9 | 31.0–33.5 | close on the paste brush, left leaf then right leaf | lateral track | paste |
| 10 | 33.5–37.2 | the pair printed twice, colours swapped, passes at double speed | symmetric wide, slow push | the mirrored pair |
| 11 | 37.2–41.0 | banner, two couplets, seal strip | tilt up, pull, push on the seam | dressing the door |
| 12 | 41.0–44.1 | wide on the shut door, lanterns lit, a hair of light at the seam | slow push | the silence |
| 13 | 44.1–47.0 | crackers burst bottom to top, doors open, the strip tears | locked, then dolly through | the signature shot |
| 14 | 47.0–50.4 | inside: the child print on the wall, red paper bits falling | slow push | what the door guarded |
| 15 | 50.4–56.0 | sheet-slide to the bench: ink, paper, rub, peel, a thump, a held shot | locked, slight push | the same first thump |

## Score structure

96 BPM (beat 0.625 s), G pentatonic. Beat n is `13.5 + 0.625 n` s and every struck picture event is on that grid (`tools/cuecheck.py` prints the error: 0 ms). Sections:

- **A** (1.0–10.4): low drone, a gong on the first thump, wooden-fish ticks, a five-note plucked phrase arriving with the paper.
- **B** (10.4–30.4): one voice per colour pass: wooden fish (peach), bass pluck (yellow), arpeggio (green), drum and clapper (indigo); while the register is looked at (21–25) the score thins to a drone and sparse plucks, with two deliberately off-grid clapper ticks; the red adds a big gong and drum and a bamboo-flute melody.
- **C** (30.4–42.3): eighth-note clapper and ostinato, a plucked note per pass climbing the scale, a chord and gong when the banner lands.
- **Near-silence** (42.3–44.1): everything out, only courtyard wind. The first sound after it is the string of firecrackers, with a gong and a big drum under it.
- **D–E** (44.1–51): flute and plucks as the doors open, thinning to sparse plucks under the last narration.
- **F** (51–56): the opening ticks and phrase again, then the final gong, drum and chord on the thump; the drone rings out in a held silence.

Mix: voice compressed and 10 dB above the music, music ducked 50 percent under the voice, foley 7.5 dB under the voice, room tone about 24 dB under; about -14 LUFS.

## Palette & props

Palette as in STYLE.md (vermilion, leaf green, mustard, indigo, peach, key black, warm paper). Table: dark walnut; block: pear wood; courtyard: dusk-blue brick with red lacquer leaves.

Props and prints, all original and drawn in code: a child seated on a lotus leaf hugging a carp and holding a lotus under a yellow sun disc with clouds, bats and a coin, in a vermilion frame with coin dots; a general in a golden helmet with two pheasant plumes, flags, a halberd, a beast-face breastplate and a wide robe (printed twice, reversed, with armour and robe colours swapped); a lintel banner with a fringe, a roundel with the one drawn character (year), bats, coins and peonies; two couplet strips of coin chains and a peony; a seal strip of coins; lanterns and firecracker strings.

## End card

None. The film ends on the bench: the fresh key-line sheet resting on the carved block, the title slip on the table, a held silence.

## Build notes

File map of `demo/`:

| File | What it is |
|---|---|
| `index.html`, `main.js` | the page contract (`render(t)`, `DUR`, `EV`, `TEXTS`, `READY`), scene switching, slide transitions, camera shake |
| `timeline.js` | scenes, voice starts, pass schedule, subtitles, sound events (the only place times are written) |
| `engine/printer.js` | the pass machine (shapes declared once, run once per pass) |
| `engine/sheet.js` | layers, cached composites, registration, sweep reveal |
| `engine/core.js` | seeded paper, wood, grain, blotch textures |
| `engine/motifs.js`, `art_child.js`, `art_guardian.js`, `art_door.js` | the drawings |
| `engine/scene_bench.js`, `engine/scene_door.js`, `engine/stage.js`, `engine/subs.js` | scenes A/B/F and C/D/E, camera and shared drawers, subtitles |
| `mix.py`, `tools/export.mjs`, `tools/cuecheck.py` | score, foley, voice mix; timeline export; cue check |
| `lines.json`, `build.sh`, `CREDITS`, `TREATMENT.md` | voice script (with the one `asr` spelling override), the one-command build, credits, treatment |

Build: `sh styles/nianhua/demo/build.sh` (voice, check, export, readcheck, render, mix, cuecheck, mux). Render: about 2 minutes at 3 workers. Review stills: `node core/render/still.mjs styles/nianhua/demo --range 0:56:1.5`.

Pitfalls tied to this demo: the Print caches (6 layers plus 7 composites at 1.5 px per unit) cost about 150 MB per page, so keep workers at 3; the kokoro voice reads "green" as "grain" when it opens a line (the line starts with "Then"); `mix.py` asserts that the voice durations in `timeline.js` still match the files.
