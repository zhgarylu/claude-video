# Origami Fold — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Seventh Fold* (50 s) · `origami.mp4` · source in [`demo/`](demo/)

## Story & structure

A long strip of paper, indigo with white dots on one face and persimmon on the other, is folded in half on a paper tabletop. Each fold lands on a beat and the stack doubles: 2, 4, 8 layers, then 16 and 32 flash by, and at 64 it is as thick as it is wide. The seventh fold lifts, strains against the stack and drops back: the film's one silence. The strip is unfolded last fold first, and its creases are drawn as a valley and mountain diagram. The same strip is then pleated: seven creases close together into a zig-zag wing, then one pull opens it. The ending holds the flat strip with both crease patterns while the lamp dims.

Why it fits: a count that hits a wall is exactly what repeated folding is, the layers are real geometry, and a flat sheet can show its whole history as a crease pattern. Native moves used: halving, the fold diagram step, the crease-pattern reveal, the accordion collapse, the fold that flips the colour (the red face is always the top of the stack).

Facts shown are in [`demo/FACTS.md`](demo/FACTS.md).

## Shots

| # | Time (s) | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–10 | Folds 1–6, landing on beats 3, 6, 9, 12, 14, 16 | wide top-down, then pushing in on the packet as it shrinks, tilting to oblique | halving; fold diagram step (dashed line, arrow, badge) before every fold |
| 2 | 10–17.5 | 64 layers, then the seventh fold lifts and drops back | end-on low macro: the stack's cross-section with its rounded fold edge | the wall; silence |
| 3 | 17.5–25 | Unfolding, last fold first; the crease pattern is drawn | pull-back to a top-down plan | crease-pattern reveal |
| 4 | 25.6–34.4 | Eight pleats collapse together, then hold | low oblique, the paper wing in frame | accordion collapse |
| 5 | 34.4–40 | One pull: the strip opens flat | pull-back, tilting up | the pull |
| 6 | 41–50 | Flat strip with the pleat creases bold over the halving pattern, lamp dims | top-down hold | reading time; end |

## Score structure

96 BPM (0.625 s per beat), 4/4, D minor pentatonic, synthesised in `mix.py` (marimba, kalimba, pizzicato by additive and Karplus-Strong synthesis, no samples). Marimba ostinato in eighths from 0 to 12 s (D, F, G, A bar roots) with a kalimba accent on every fold landing (beats 3, 6, 9, 12, 14, 16); no music from 12 to 17.5 s (beats 19.2–28): strain creaks and a drop only, over room tone; kalimba returns on beat 28 with a falling phrase while the strip unfolds; pizzicato ostinato from beat 41 with a rising kalimba line across the collapse; a marimba D chord on beat 50 when the wing is fully gathered; a rising marimba phrase on the pull from beat 55; near-silence from beat 62.4 to 66; a slower theme from beat 66 and one last note on beat 78. `tools/cuecheck.py` confirms all seven picture hits sit on a beat with a music onset. Mix: music ducked 25 % under loud foley; no voice-over.

## Palette & props

Strip 340 × 85 mm, th 0.12 mm: indigo `#8ea6d4` with cream dots on the front, persimmon `#ecaa88` on the back; tabletop `#d0cbbf`; diagram ink `#1c2748`; captions on cream cards, Fredoka 600. One spot lamp, front-left. No other props.

## End card

None. The film ends on the crease patterns with the lamp dimmed. (The "LemoLab × Claude Opus 5.5" sign-off is not part of this demo.)

## Build notes

- `sh styles/origami/demo/build.sh` runs everything: `tools/export.mjs` (timeline → `caps.json`), `events.mjs`, `foldcheck.mjs strip` (no facet passes through another, sampled through the whole film), the render (3 workers), `mix.py` (score, foley, `cues.json`, `origami.srt`), `tools/cuecheck.py`, `readcheck.mjs`, `mux.sh`.
- Files: `timeline.js` (times, beats, captions, camera keys), `models.js` (`strip()`: six halvings, the seventh, the unfold, the pleats), `film.js` (page, camera, diagram layer, captions, sound events), `engine/` (see STYLE §10), `proof/` (the style-frame shots, `?shot=hero|seq|creases|fan`).
- Parallel folds only: all creases in this film are parallel, so the hinge graph is a chain. Halving folds, pleats and their unfolds are checked; creases that cross would need the folds one after another.
- Thick stacks: every inner edge shared by two facets gets a curled ribbon, so the fold edge of a 64-layer stack is rounded and closed; the cross-section in shot 2 shows the nested rolls.
- Pitfalls tied to this demo: the unfold must run one fold at a time (overlapping unfolds of nested layers cross); the camera for shot 2 looks along the strip, so its look point sits at the strip's end (z = 0.04).
- Render about 20–40 min on a loaded laptop (1200 frames, 4096 shadow map, 2× supersampled post).
