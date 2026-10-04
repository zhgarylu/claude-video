# Sand Animation — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Where the Sparrow Went* (58.4 s) · `sand-animation.mp4` · source in [`demo/`](demo/)

## Story & structure

A heap of poured sand is swept into a tree, the tree into a bird, the bird into a wave, the wave into a lighthouse, and the lighthouse's light falls back into a smaller heap that carries one sand-written word, "home." No cut, no voice, no captions: five morphs and one pour, with the lamp changing gel from gold to sea blue to sunset and back. The ending echoes the opening (a heap), but the heap now means home. It fits sand because every picture is literally the same grains, so "it was always the same sand" is the idea. Native moves spent: the pour (opening), the morph (five times; the tree to bird sweep is the signature), the lamp changes colour (twice), and a quiet blow-away-like drain in the last sweep.

## Shots

Camera straight down; the camera is a Catmull-Rom path through keys in `demo/main.js` (`CK`). Bars are 3.333 s at 72 BPM, bar 1 at 0.4 s.

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.4-6.1 | A thread of sand falls and builds a heap | wide, slow push to z 1.1 on the heap | pour |
| 2 | 7.07-13.7 | heap sweeps upward into a tree | push eases back to z 1.03 | morph, sweep direction up |
| 3 | 13.7-17.07 | the tree holds | locked-ish | read the picture |
| 4 | 17.07-23.7 | tree to bird: leaves rake into feathers | pull back to z 0.95 | signature morph |
| 5 | 23.7-27.07 | the bird holds; first silence to 25.5 | z 0.95 | near-silence |
| 6 | 27.07-33.7 | bird to wave, lamp to sea blue | drift left, push | morph + gel |
| 7 | 33.7-37.07 | the wave breaks | push to z 1.16 on the curl | macro grain, foam |
| 8 | 37.07-43.7 | wave to lighthouse, lamp to sunset | pull back to z 0.97 | morph + gel |
| 9 | 43.7-47.07 | the light fan holds; second silence to 45.5 | z 0.98 | near-silence |
| 10 | 47.07-53.7 | light falls to a heap; lamp back to gold; "home." is poured in | slow pull to z 1.0, then drift | drain, sand-written word |
| 11 | 53.7-58.4 | word and heap hold, music fades | slow push to z 1.05 | ending |

## Score structure

72 BPM, 4/4, D Dorian, everything synthesised in `demo/mix.py` (no samples). Bars 1-2: one handpan note on the first grain, then a glass-harmonica pad. Bars 3-5: handpan arpeggio, pad chords. Bars 6-7: kalimba melody for the bird; bar 8: gated silence 23.73-25.5 s, first sound after it a high kalimba note. Bars 9-11: handpan, brushed frame drum (bars 9-12), kalimba echoes, pad. Bars 12-13: bamboo-flute long notes; bar 14: gated silence 43.73-45.5, then one flute note. Bars 15-17: bowed vibraphone chords, sparse handpan, long final chord that fades. Foley is generated from the sweep windows: a narrowing hiss for the pour, a dry brush swish with grain ticks whose density follows a bell curve over each sweep, a low breath in the last sweep, quiet room tone. Music sits about 8 dB above the foley; `mux.sh` normalises to -14 LUFS.

## Palette & props

Lamp gels: gold-white (`gold`), sea blue (`sea`), sunset orange (`sunset`), crossfaded over about 6.7 s at sweeps 4, 5 and 6. Pictures: heap, tree (recursive branches, crown of loose clouds), gull (feathers as overlapping broad strokes), breaking wave (spiral curl, foam, spray), lighthouse (banded tower, light fan, rock), and the word "home." in IM Fell English rasterised to grains. About 380,000 grains.

## End card

None: no logo, no credit line. The film ends on the word "home." and the heap.

## Build notes

`demo/`: `sand.js` (engine), `shapes.js` (pictures), `main.js` (timeline, camera, gel, `EV`, `TEXTS`), `index.html`, `mix.py` (score and foley), `tools/cuecheck.py`, `build.sh`, `CREDITS`. Run `sh styles/sand-animation/demo/build.sh` from the library root (needs the core install: Node, `.venv` with numpy, scipy, soundfile). Rendering: about 0.3 s per frame per worker, 1,402 frames, 3 workers. Checks run on this film: `readcheck` (the word is reported from the start of the last sweep), `cuecheck` (every sweep on a downbeat and on a music onset within one frame; both silences really silent), `mux.sh` loudness, `blackdetect`. Tuning the look: `?kD=…&g2=…&gel=sea` query parameters. Size: the grain-heavy picture makes a 400 MB intermediate, so `build.sh` slims it (light temporal denoise, crf 27), muxes with `mux.sh` (grain 0, about -14 LUFS, true peak -1.6 dB), then re-encodes the video once more at crf 25 with the audio copied: about 86 MB. Audio pitfall: grain ticks near Nyquist made the AAC encoder overshoot by 6 dB, so the foley is low-passed at 8.5 kHz and the mix at 11 kHz before the soft limiter. Pitfall tied to this demo: the final heap blows out if its grains are not dimmed (`br *= 0.62` in `shapes.js`, function `home`).
