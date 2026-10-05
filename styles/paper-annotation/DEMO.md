# Paper Annotation — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *How to Read a Paper* (54 s, 16:9) · `paper-annotation.mp4` · source in [`demo/`](demo/)

## Story & structure

The paper is **fictional** ("Skim-then-Read: Faster Long-Document Question Answering by Reading Twice"); its text, figure and every number were invented for this demo and made to agree with each other. A badge on screen and the page footer say so.

Logline: a paper claims long-document question answering gets more than 50 % faster; we read it the way a careful reader would, asking what it claims, how it did it, what the evidence is, what it is compared with, and where it fails.

Arc: **hook** (the claim, "don't believe it yet") → **problem** (the sentence that states it) → **method** (a mini diagram: score the paragraphs, read only the top ones) → **evidence** (-58 % latency, -0.7 points; the two numbers ringed) → **page turn** to the figure and table → **warning** (self-reported, one baseline) → **limit** (the sentence about scattered answers) → **verdict** and a **three-question checklist**.

Native moves spent: say the claim then test it, mark then ring, margin notes, callout the baseline, chips as memory, close on a checklist.

## Pages and shots

| Time | Content | Camera |
|---|---|---|
| 0.6 to 7 | page 1 rises in; the fiction badge appears | overview |
| 7.5 to 13 | the first abstract sentence is highlighted; card "Problem" | push-in 1.7× |
| 13.4 to 20.5 | the method sentences are highlighted; card "Method" with a six-box score diagram | push-in |
| 20.9 to 28.5 | the result sentence is highlighted and the numbers ringed; card "Evidence" (-58 %, -0.7 pts); the page turns to page 2 | push-in, then pulls out for the turn |
| 29 to 35.5 | the figure's bars grow; the "Full" headers of Table 1 are ringed; card "Watch out" | push-in on the table |
| 36 to 41 | the limitations sentence is highlighted; card "Limit" | push-in |
| 41.4 to 46 | card "Verdict": concentrated answers yes, scattered ones maybe not | overview |
| 46.4 to 52 | card "Three questions" with three ticks | overview |

Line starts come from `voices/dur.json`; every highlight, ring and card is an offset from the line that names it.

Times in the tables are from the first (slightly faster) voice and drift by a few seconds at normal speed; the film re-times itself from the voice (`voices/dur.json`).

## Score structure

84 BPM, C major seventh family (Cmaj7, Am7, Dm7, G7): an electric-piano chord per bar, bass on 1 and 3, brush on the off-beats from bar 2, a sparse upper figure. It ducks 45 % under the voice. -14 LUFS, true peak about -3.5 dBFS.

## Palette & props

Desk `#14161a`, page `#f7f4ea`, ink `#23262b`, highlighter `#ffe14d`, red `#e5484d`, blue `#3a7bd5`, green `#2fa36b`, amber `#f2a33a`. Props: two typeset pages, a bar-chart figure, a table, a caption plate, six note cards.

## Build notes

`sh styles/paper-annotation/demo/build.sh` (needs a network once, for the edge-tts voice and the Google Fonts).

- `paper.js` is the engine: `typeset` (flows words and returns their boxes and the line rectangles of each segment), `drawWords`, `mark` (highlighter), `ring`, `pageShape`, `greyLines`, `card`, `desk`.
- `main.js` holds the paper's text and layout, the camera keyframes, the marks, rings and notes (as offsets from the voice lines), the HUD and the caption.
- `mix.py` places the narration (events of type `voice`), the score and the foley.
- Voice: edge-tts `zh-CN-XiaoxiaoNeural`; lines `p5` and `p8` have `asr` fields because the speech check hears 基线比 and 摘要 differently.
- `readcheck` flags the voice-synced captions as shorter than reading time; this is known.

Pitfalls met here: the table caption collided with the group header until every y was re-spaced; the HUD was invisible over the zoomed page until it got a dark plate; the translucent chips let the page show through under the cards (made opaque); a held frame was reported as frozen until a two-pixel camera drift was added.
