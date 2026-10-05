# Vector Oscilloscope: our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Hold the Fifth* (56 s) · `vector-scope.mp4` · source in [`demo/`](demo/)

## Story & structure

Logline: two tones drift toward a simple ratio until the picture they draw stands still; then we learn the music itself has been steering the beam.

The film is one journey with one want: the second tone wants to lock. A dot becomes a line and a circle (a tone has a shape); each channel is shown alone (a horizontal and a vertical line) and then both together; the right channel slides up to a fifth and is a little sharp, so the figure turns (the beat); the turning slows; at 3:2 it stops, brightens and a lamp lights; the score drops out for a real silence. After it come the counting of touches (three across the top, two down the side), a short ladder of other locks (octave, fourth, major third) that join a memory rack of frozen figures, a detune into a tangle, and the reveal: the camera pulls back to the whole instrument while the same fifth walks through three roots (the shape does not change, only the pitch). A second silence, then the score writes PLAYED stroke by stroke, the beam collapses to a dot, and the camera closes on the graticule centre again.

Native moves spent: sound draws the picture (everywhere), drift and lock (peak, 21.3 s), counting by touches, memory rack, out of ratio, text written by the score (ending), level meter and frequency ruler (side panels), power-on and collapse (bookends).

What is on the scope stem and what is not: the stem is the tone layer (the sine pairs, plus the word). The picture is drawn from exactly those samples. Voice, bass, kick, hat, blips, hum and foley are heard but not drawn. The mix applies a gentle roll-off to the word for the speakers; the picture uses the unfiltered samples.

Stills: [style frame (the lock)](demo/stills/styleframe.jpg), [counting touches](demo/stills/touches.jpg), [tangle](demo/stills/tangle.jpg), [reveal](demo/stills/reveal.jpg), [the word](demo/stills/word.jpg).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0-4.6 | power-on, dot, diagonal line, circle | macro on the graticule centre (x2.4) pulling out to x1.0 | opening; phase opens a mono line into a circle |
| 2 | 3.7-6.7 | left only (horizontal line), right only (vertical line) | medium, slow push | what X and Y are |
| 3 | 6.7-10.7 | both: a unison circle that tilts; R slides up | medium | the frequency ruler and Hz counters move |
| 4 | 10.7-21.3 | fifth, a little sharp: the figure turns and slows | slow push to x1.12 | the beat; detents tick with each full turn |
| 5 | 21.3-22.4 | LOCK: the figure freezes, brightens, lamp, bell | push x1.1, a 3 % thump | peak; the tone then fades into a spiral and a dot |
| 6 | 22.4-24.3 | silence: beam parked | hold | near silence (hum dipped, 21 dB under the film) |
| 7 | 24.3-29.3 | the fifth returns; the box and numbered touches (1 2 3 / 1 2) | slow pull to x1.05 | counting by touches, found in the samples |
| 8 | 29.3-37.3 | octave, fourth, major third, each with a camera thump | locked, x1.0 | memory rack fills with replayed figures |
| 9 | 37.3-42.7 | pulled out of ratio: tangle, OUT OF RATIO | push to x1.28 | kick and hat enter |
| 10 | 42.7-49.0 | reveal: whole instrument, the fifth walks A, E, A | pull back to x0.62 | meters, knobs, extension modules |
| 11 | 49.0-50.4 | silence | push to x1.0 | gain knob turns up to 1.5 |
| 12 | 50.4-54.3 | PLAYED grows stroke by stroke | slow push | text written by the score |
| 13 | 54.3-56.0 | collapse to a dot, dot fades, graticule macro | close on the centre (x2.6) | echoes shot 1 |

## Score structure

BPM 90, 4/4 (bar 2.667 s), 21 bars. Roots A, E, G, D on the tones; bass an octave or two below. Sections change on bar lines.

- 0 to 10.7 s: no grid. Mains hum, relay, a mono tone, then single channels, then a circle; the R tone glides up from 220 to 330 Hz (9.3 to 10.7 s).
- 10.7 to 21.3 s (bars 4 to 7): A sine bass at 55 Hz under the drifting fifth (220 + 330 Hz). A detent click per full turn of the figure (the page and the mix both read them from `scope.json`). 2 % to 8 % harmonics make the beat audible.
- 21.33 s: bell, relay, bass thump; tone off at 22.3 s.
- Silence 1: 22.35 to 24.3 s, tones and bass gated, hum dipped 13 dB.
- 24.3 to 29.3 s: the fifth returns with a relay tick; touch blips.
- 29.3 to 37.3 s (bars 11 to 13): kick on the quarter, hat on the off-beat, an eighth-note sine sequence from the root's harmonic series with a ping-pong echo, one bass note per shape.
- 37.3 to 42.6 s (bars 14, 15): full kick and hats, bass pulse on G; the major third is pulled to the square root of two.
- 42.7 to 49.0 s: the fifth walked through A, E, A; slow low bass roots; no drums.
- Silence 2: 49.3 to 50.4 s.
- 50.4 to 54.5 s: the word as a note of about 105 to 330 Hz (its pitch falls as more letters are added); a key tick per letter.
- 54.5 s: collapse sweep, thump, a last relay at 55.45 s.

Mix: voice about 10 dB over the tones; tones ducked 6 dB under voice; two-pass loudnorm to -14 LUFS, no grain.

## Palette & props

P31 green (`#19D264` glow, `#50FF96` mid, `#E1FFEC` core) on black glass; graticule `#308C5C` at 62 %; panel `#161E19`; etch labels `#568C70`. The instrument ("VS-81") is invented: input meters, a log frequency ruler, ratio readout, three lamps (X-Y, TUNE, LOCK), a four-cell memory rack, knobs and BNC jacks on side modules, vents, screws.

## End card

None. The film ends on a macro of the graticule centre, as it began. No title card and no sign-off.

## Build notes

File map of `demo/`:

- `timeline.json`: the single source of times (voice starts, tone changes, lock, notes, word, power-off); read by `scope.py`, `mix.py`, `main.js`, `tools/make_caps.mjs`.
- `scope.py`: builds the stem (L, R, Z). The unison-to-fifth section solves the sharpness so that the figure arrives at the chosen relative phase exactly at the lock time. `tools/preview_scope.py` draws the stem at chosen times to `out/prev_scope.png` in a second.
- `mix.py`: runs `scope.py`, writes `out/scope.bin` (int16 L, R, Z interleaved at 48 kHz) and `out/scope.json` (a 50 Hz table of both frequencies, the detent times, the letter times), the score, foley and voice, then `out/mix.wav`.
- `main.js`, `engine/beam.js`, `engine/vtext.js`: the page. `?nosub=1` hides captions (used for the style frame).
- `tools/gen_font.py` -> `vfont.json`; `tools/make_caps.mjs` -> `caps.json`, `out/srt.json`.
- Build order: `sh demo/build.sh` (font, voice, ASR check, captions, mix, srt, events, readcheck, frames, master, stills). About 3 minutes of rendering at 3 workers.
- Rendering cost: about 50 ms per frame (a window of 0.37 s of samples, 17,000 segments in 70 batched paths, three passes, two blurred copies).

Pitfalls tied to this demo:

- The lock figure's phase is solved from the drift curve; change the timeline and re-run `mix.py` or the figure will lock lopsided.
- The numerals of the touch count are found by scanning one period of the samples at a fixed time; they stay put because the locked figure is static.
- The Hz counters and etched panel texts are not reported to `readcheck` (chrome); the labels that carry content are.
