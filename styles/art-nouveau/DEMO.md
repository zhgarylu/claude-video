# Art Nouveau — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Iris Hour* (52.5 s) · `art-nouveau.mp4` · source in [`demo/`](demo/)

## Story & structure

A single ochre line writes itself across blank paper and thickens into a vine. The vine carries the camera past three arched windows. In the first (winter) frost grows on the glass over a rhizome with a closed bud, while the voice says nothing happens and that is the work. In the second a keeper with closed eyes sits before a halo of mosaic; the score drops to near-silence for two and a half seconds, then one harp note. In the third the halo opens and the iris unfolds in three stages, each on a bar line, and the camera swings back to the keeper, whose eyes open. A vine-shaped band wipes across the screen and under it the title plate is written in thick-and-thin lettering whose sprouts curl into leaves.

Why it fits the style: the story is the plant's growth, and every beat is a native move: *the vine is the camera*, *the window as chapter*, *the halo opens*, *lettering grows from a stem*. The ending is not a flattened poster: it is the title being written, then held.

Native moves spent: the vine is the camera, the halo opens, the window as chapter, lettering grows from a stem, the frame fills (corner scrolls drawn on the plate).

## Shots

| # | Time | Framing / camera | Content |
|---|---|---|---|
| 1 | 0.0–5.5 | wide, slow push-in | the line writes itself, becomes a stem; the wall opens as a circle from its tip |
| 2 | 5.5–16.0 | medium, drift right, then a pan to window 2 (13.2–16) | window 1 grows upward; frost, mosaic floor, rhizome, blades, a closed bud; the vine's tip leads the pan |
| 3 | 16.0–25.0 | push-in to the keeper | window 2: halo laid tessera by tessera, the keeper grows (hair first); near-silence 22.5–25 |
| 4 | 25.0–40.0 | pan to window 3, push-in to the roundel (z 2.0), swing back to the keeper (36–38.2) | halo opens on bar 12, iris stages on bars 13, 14, 15, eyes open at 38.33 |
| 5 | 40.0–52.5 | vine wipe (40–42.5), locked plate | the plate builds; title written 45–48, held 4.5 s |

## Score structure

3/4 waltz, 72 bpm (a bar is 2.5 s), D Dorian. Harp alone for the line (bars 1–2); harp arpeggios Dm, G, Dm, Am with a cello pedal from bar 4; celesta melody and low flute over the keeper (bars 7–9); bar 10 is the near-silence (the clock, two drips); one harp note on bar 11; a harp run on each iris stage with the flute line and cello portamento (bars 12–17); pizzicato waltz and the theme on flute over the plate (bars 18–20); a final Dm chord held through bar 21. The voice ducks the score by about 6 dB. Every visual hit in `timeline.json` sits on the grid (`demo/cuecheck.py`).

## Palette and props

Paper `#EBDFC1`, ochre `#C99B3C`, sage `#9BAF84`, olive `#5F6E42`, rose `#D9A59C`, lilac `#A7A0CE`, violet `#716AA9`, teal `#8DB2A4`, brown `#3B2515`. Props: the vine, three arched windows, a rhizome, frost, the iris, the keeper (three-quarter view, lilac robe, copper hair), a halo roundel, ribbon banners for subtitles.

## End card

None: the film ends on the held title plate. (The LemoLab × Claude Opus 5.5 sign-off for this library demo is carried by `demo/CREDITS` only.)

## Build notes

`sh styles/art-nouveau/demo/build.sh` runs the whole chain (voice, ASR check, cues, events, cue check, read check, render with 3 workers, mix, master, subtitles). Needs the voice tier and `demo/fonts/` (Cormorant Garamond, see `demo/CREDITS`). Real-world facts: `demo/FACTS.md`.

## Code entry points

`demo/show.js`: the timeline `T`, camera keys `CAM`, vine tip keys `TIP`, `winter` / `waiting` / `bloom` (the windows), `world`, `plate`, `wipe` (the vine band: the old picture, the new picture clipped behind a whiplash edge, a sage band with leaves), `subtitle`, `EV` (events for the mixer). `demo/mix.py`: instruments (`ks`, `bowed`, `flute`, `celesta`), foley, the score by bar, the near-silence mask, voice ducking. `demo/make_cues.py`: subtitle cues from voice durations. Engine signatures are in STYLE.md section 10.

Minimal use of the engine for something not in the demo: `drawVine(ctx, {x:300,y:1000,ang:-1.5,len:700,wave:.4,curl:1.2,w0:12,w1:3,nodes:[{u:.4,kind:'leaf',side:1,size:150}]}, g)` with `g` from 0 to 1.
