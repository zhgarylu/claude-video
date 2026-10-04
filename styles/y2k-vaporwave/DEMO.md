# Vaporwave & Y2K Chrome — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Installing Summer* (49.4 s) · `y2k-vaporwave.mp4` · source in [`demo/`](demo/)

## Story & structure

A setup wizard installs one summer. The progress bar crawls while a banded sun sinks over a scrolling grid; each stretch of the bar is another place (a horizon, a marble gallery on a checker floor, a liquid-metal room where dialogs stack up and ask "Sunset detected. Ignore?"). The bar hangs at 99 % while the music gates out and only reverb tails and tape hiss remain. Then the install completes on a glitch hit, the word SUMMER spins into place in chrome, and the last dialog ("Restart now?") is dismissed with LATER; the windows close in reverse and the sun is gone.

Native moves spent: *the window pops* (every dialog, with a chime), *the sun sinks* (the clock of the whole film), *the grid becomes the floor* (the cut into the gallery), *the hang* (the turn), *the chrome spin* (the payoff), *the glitch cut* (the five room changes). There is no narration: the words are in the windows and one caption.

## Shots

| Time | Shot | Camera | Native move / note |
|---|---|---|---|
| 0–7.1 | Horizon, liquid-metal blob, palms, one window pops on beat 2 | slow push, low | window pop; hook is the chime |
| 7.1–17.6 | Abstract head-and-hair bust and two columns on a glossy checker; file list and installer in the lower corners | lateral drift 3.6 units | glitch cut in; grid becomes the floor |
| 17.6–28.2 | Blob room: NOTICE and WARNING dialogs stack, cursor crosses | rise (camera up 1.0 to 1.9) | stacked windows; riser under the sun |
| 28.2–35.3 | Gallery again, locked, installer at 99 %, sun at the horizon | almost locked | the hang; music gated |
| 35.3–45.9 | Low wide: palms frame the horizon; at 37.1 s the bar completes on a glitch hit and SUMMER spins in | dolly 11 to 8.6, tilt up | chrome spin; the signature shot |
| 45.9–49.4 | Same frame: Restart dialog, cursor clicks LATER, windows close | locked | windows pop and close; last sparkle |

## Score structure

68 BPM, 4/4 (beat 0.882 s, bar 3.529 s), F# minor 9 with major-seventh colours in the reveal. Chord loop F#m9, Dmaj9, then Bm11, C#m7 in the blob room; reveal D maj7#11, Amaj7, Emaj7; close F#m9 thinning. Layers: detuned saw pads, chopped chords pitched an octave down, FM bells, sub bass, a lead with tape delay, filtered-noise hats, all through a synthetic hall reverb. Silence 1: the music gates out at 28.2 s and stays out until 37.1 s (one bell at 33.5 s, a quiet riser from 35.3 s). Silence 2 is the reverb tail of the last sparkle chime. Every one of the 32 picture events sits on the half-beat grid (`demo/tools/cuecheck.py`, offset 0 ms). Measured loudness −14 LUFS.

## Palette & props

Pink `#ff4fc3`, cyan `#3fe8ff`, violet `#7a4dff`, a sun that goes from yellow to red, indigo `#24114f`, UI lavender `#d4cdf4`. Props: the chrome word SUMMER, a liquid-metal blob, an abstract marble head (blank face, swept hair) on a plinth, fluted columns, six candy bubbles, palms, sparkles, generic installer and dialog windows, a pixel cursor. File names and dialog texts are invented; see `demo/FACTS.md`.

## End card

None. The film ends on the grid under a sky with no sun. There is no LemoLab sign-off in this demo.

## Build notes

- `sh styles/y2k-vaporwave/demo/build.sh` (needs the core tier only; fonts download on first run). Render: about 6 minutes for 1186 frames on 3 workers on a loaded machine.
- File map: `index.html` (page), `main.js` (WebGL2 set-up, text signed-distance builder, uniforms, `window.EV`, `window.TEXTS`), `shaders.js` (`SCENE`, `COMPOSE`, `POST`), `ui.js` (windows, palms, sparkles, captions), `shots.js` (`stateAt(t)`, all times in beats), `mix.py` (score, foley, mix), `tools/cuecheck.py`, `tools/make_srt.py`.
- Review loop used: contact sheet every 3.1 s, stills at the glitch hits, a spectrum and per-2-s level check of the mix, `blackdetect`, `readcheck`.
- Pitfalls tied to this demo: the abstract bust has no face on purpose (a modelled face read as a mannequin); the install window text is the same across shots, so `TEXTS` reports only the changing lines; the tracking band sits at the top of the frame (`vhsY`) where no window or type lives.
