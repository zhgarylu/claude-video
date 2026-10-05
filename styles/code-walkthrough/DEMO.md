# Code Walkthrough — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *One Character Short* (67 s) · `code-walkthrough.mp4` · source in [`demo/`](demo/)

## Story & structure

A bug post-mortem on a textbook binary search in Python. An empty editor; the function is typed live (a key per character, a beat of thought before the loop and before the test), then three lookups are run: 16, 38 and 7 in `[2, 5, 8, 12, 16, 23, 38]`. The terminal prints `16 -1`, `38 -1`, `7 -1`: two of the three are wrong, and the lines turn red with "expected 4" and "expected 6" as the error thud lands after a near-silence. The editor slides left; a diagram (the array as seven cells, then `lo` and `hi` pointers, then `mid`) and a watch panel (call stack, five variable tiles) grow in. The narration follows the search for 16 one turn at a time: `mid` is 3 and 12 is too small so `lo` becomes 4; `mid` is 5 and 23 is too big so `hi` becomes 4. Now `lo` and `hi` are both 4, one candidate left and it is 16, but the loop asks `lo < hi`: the camera zooms on the `<`, the chip says "4 < 4 is False", the loop exits through `return -1` and the diagram rings cell 4 as never checked. The diff follows: a green row `while lo <= hi:` grows under the red struck row, the old row folds out. The terminal splits into before and after; the run prints `16 4`, `38 6`, `7 -1` with two rising dings, and the trace's third step (`mid` 4, `items[mid]` 16) completes the diagram. The theme flips to light and a rule table closes the film: `lo < hi` two or more candidates, `lo == hi` exactly one candidate (both keep looping), `lo > hi` none left, stop; a bracket gives the loop condition `lo <= hi`.

Why it fits: a bug is the reason to read code slowly, and the bug here lives in a single character. The style's grammar each has a job: focus slides lead the investigation, chips carry the values, the zoom is the diagnosis, the diff is the cure, the terminal split is the proof. The opening question (three lookups) is answered by the same three lookups at the end.

Native moves used: live typing with caret, run in the terminal, error jolt, focus slide, step trace (pointer, tile and focus line in lockstep), chip with leader, diagram that grows, token zoom, diff fold with strike, before / after terminal split, theme flip, rule table.

## How the code was verified

`demo/verify.py` runs `demo/code/search_buggy.py` and `demo/code/search.py` with the real interpreter (Python 3.12.4 on the build machine) and writes `demo/verified.js`: the true stdout of each file (`16 -1 / 38 -1 / 7 -1` and `16 4 / 38 6 / 7 -1`) and the true line-by-line trace of `binary_search(nums, 16)` captured with `sys.settrace` for both files. It then asserts every number the narration and the chips use: the buggy loop stops after two turns, the fixed one has `(lo, hi, mid)` of `(0, 6, 3)`, `(4, 6, 5)`, `(4, 4, 4)`, the buggy trace returns `-1`. The page imports `verified.js`: the code text, the terminal output and the final `mid` / `items[mid]` all come from it, and the diagram's values come from `nums`. If the code is edited so the facts change, `build.sh` stops at that script.

## Shots

Frames: [styleframe](demo/stills/styleframe.jpg) · [poster](poster.jpg)

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.4-9.5 | the empty editor, the function typed, then the driver | locked, editor centred | typing with caret; only keys and room tone until 7.4 |
| 2 | 9.5-18.7 | `python search.py`; focus on the loop, the list; two lines wash red | locked, a 5 px jolt on the thud | run; error |
| 3 | 18.7-33.8 | pane swap; cells, `lo`, `hi`, `mid`; chips on lines 7, 8, 10 | the swap | grows with the narration; step trace |
| 4 | 33.8-39 | `lo` and `hi` both on cell 4, the cell ringed amber | locked | "one candidate left" |
| 5 | 39-43.9 | the `<` in `while lo < hi:` | zoom 2.14x, 1.0 s in | diagnosis |
| 6 | 43.9-46 | `return -1` focused, cell 4 ringed red dashed | zoom out, near-silence | conclusion |
| 7 | 46-50.9 | `<=` appears on a green row under the struck row | zoom 2.14x at 48.3, out at 50 | diff fold |
| 8 | 50.9-58.3 | terminal splits, rerun; the trace's third step | locked | before / after; dings |
| 9 | 58.3-67 | the rule table, bracket, `lo <= hi` | wipe, then locked | theme flip |

## Score structure

88 BPM (bar 2.73 s), original, numpy synthesis. 0-7.4 s no music: keys and room tone. A pad breathes in from 7.4. Section 1 (10.5 s): Am9 and F, sparse electric piano, with a gate that removes the music from 16.1 to 18.7 so the thud is heard alone. Section 2 (18.7 s): eighth-note arpeggios over Am9, F, C, Em7, hats from the third bar, pentatonic ticks on every pointer move and chip. Gate 43.9-46 (silence after "it quits without looking"; a small thud at 44.3). Section 3 (46 s): F, C, G, C, F, brighter, same motif an octave-colour up. Section 4 (58.3 s): one held C chord, a sub, and five high piano notes. The voice ducks the music about 5 dB; the mix is mastered by `mux.sh` (−14.0 LUFS, peak −3.5 dBFS).

## Palette & props

The style's dark theme for 58 s, then the light theme. Dark: ground `#0a0d13`→`#131925` with a dot grid, panels `#161b26`, ink `#e4e8ef`; green `#3ddc84` for add and right, red `#ff5d73` for remove and wrong, amber `#ffcc4d` for focus; pointer hues `lo` blue, `hi` pink, `mid` teal, which are also the chips' and tiles' hues. JetBrains Mono and Inter (OFL). Props drawn in code: the editor (tab, gutter, status bar), terminal, a seven-cell array diagram, the watch panel with a call stack of two frames, the rule table. No images.

## End card

None. The last image is the rule table in the light theme, faded to the light ground in the last 0.9 s. (The LemoLab × Claude Opus 5.5 sign-off is not drawn in this film.)

## Build notes

Files in `demo/`: `index.html`, `main.js` (panes, focus, rows and diff, diagram, watch, terminal, recap, camera, `TEXTS`), `script.js` (the score sheet: line starts, focus keys, state keys, chips, notes, camera keys, terminal annotations, captions), `tok.js` (the tokenizer), `verify.py` and `verified.js` (the real run), `code/` (the two Python files), `timeline.js` (the event list), `mix.py`, `tools/export_srt.mjs`, `build.sh`, `lines.json`, `CREDITS`, `TREATMENT.md`.

`sh styles/code-walkthrough/demo/build.sh` (core and voice tiers, plus `python3`) runs: font fetch, the real Python run, Kokoro (am_michael, speed 1.0), speech check, events, reading check, mix, srt, render (about 75 s with two workers), mux (no grain), styleframe and poster.

Pitfalls tied to this demo: code ligatures (the editor draws characters one at a time, otherwise `<=` becomes `≤`); the text collector (`TEXTS`) reports the call-stack frame's name but not its line number, which changes at every focus slide; every chip, note and tile is timed so that it is fully in frame for its reading time, including across the two token zooms (the zoom-out must finish before the pieces that were cut by the zoom are needed again); the voice says "low" and "high" and the captions say `lo` and `hi`; the narration lines are placed with `AT` in `script.js`, so a different voice or speed needs `AT` and the cue times re-derived from `voices/dur.json` and `voices/words.json`.
