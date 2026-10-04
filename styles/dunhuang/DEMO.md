# Borrowed Lamplight (借灯) — how our demo was made

**One example among many. Don't reuse its story, arc, shots, props or timings.** Read [STYLE.md](STYLE.md) for what stays fixed; everything below is this film's own choice.

## Story and structure

53.3 s, 1920×1080, 24 fps, Chinese voice-over (edge-tts, Yunxi) with the lines also painted as inscription plaques. No characters act: the wall holds flying figures, a pipa player, lotus roundels and patterns, and the camera is a lamp-bearer walking by. All designs and lines are original; no cave number, date or historical claim appears on screen (see [demo/FACTS.md](demo/FACTS.md)); the borders are abstract rosette cells, and no religious figure is shown.

**Structure: "the lamp walk."** A borrowed lamp wakes each register it passes and leaves it to weather again. The turn is a breath of darkness before the ceiling wakes; the ending echoes the opening (one pattern cell, last lit).

| # | Shot | s |
|---|---|---|
| 1 | Dark weathered wall; the flame blooms at the right edge; one cell wakes on beat 3 | 0.0 to 3.3 |
| 2 | Lateral slide along a border; cells wake one by one; plaque 1 | 3.3 to 10.0 |
| 3 | Lamp swings across a cut; tilt up into the flying register; the first figure wakes; plaque 2 | 10.0 to 16.7 |
| 4 | Push to the face and lotus; a pipa player enters; plaque 3 | 16.7 to 23.3 |
| 5 | Another lamp swing; three registers slide past, accelerating; flakes re-form in the pool | 23.3 to 30.0 |
| 6 | Near-dark; one flake falls | 30.0 to 33.3 |
| 7 | The lamp rises under a lotus coffer; it wakes from its centre; plaque 4, then the title | 33.3 to 43.3 |
| 8 | A weathering wave from the right; ribbons still blow; plaque 5 | 43.3 to 50.0 |
| 9 | One cell stays lit; the flame sinks | 50.0 to 53.3 |

Voice (Yunxi, `-10%`; each line checked with speech-to-text, the model hears homophones of 醒 and 丝带, so `lines.json` carries `asr` fields): 「洞里没有光，只有一盏借来的灯。」「灯走到哪里，墙就醒到哪里。」「丝带还在吹，风是画进去的。」「一格一格，每一笔都有人用手画过。」「颜色会退，线条还在。」

## Score structure

72 BPM, 4/4, 3.333 s a bar, 16 bars, one timeline (`timeline.js`); D pentatonic with a raised fourth. Everything is synthesised in `mix.py` (Karplus-Strong pipa and harp, additive dizi and xun, modal bells, frame drum).

| Bars | Section | Instruments |
|---|---|---|
| 1 | flame | room tone, one hand bell |
| 2–3 | the count | frame drum on 1 and 3, harp |
| 4–5 | first register | dizi long note, pipa melody |
| 6–7 | detail | pipa tremolo, harp counter-line |
| 8–9 | walking fast | drum eighths, pipa sweeps |
| 9 beat 4–10 | breath | cave air only; one flake |
| 11–13 | coffer | xun, then pipa and harp in unison; a bell for each ring waking |
| 14–15 | remains | harp, dizi |
| 16 | echo | one bell, a last hiss; room tone to zero |

`cuecheck.py` compares every hit with the grid (0 ms).

## Build notes and code entry points

- `timeline.js`: bars, shots, voice lines and plaque windows. `film.js`: four walls (A border, B flying register, C three registers, D coffer ceiling), their paint, the camera of every shot, the lamp's brightness curve (`DIM`), arrival-time functions (`arrA..arrD`, `depD`) that drive the wake and the weathering wave, flake debris born at those times, and the sound events.
- The wake is expressed in seconds: `S.p = t`, `S.wake(x, y)` returns when the front reaches a wall point; `S.depart` returns when paint leaves again. Cuts between walls happen while the lamp swings away (the `DIM` dips at 10.0 and 23.3).
- `wall.js`, `brush.js`, `motifs.js` (`cellBand` is the abstract border), `apsara.js` (a flying rig with underskirt, scarves, `hold: 'pipa'`).
- Fonts: `subset_fonts.py` fetches Noto Serif SC and Ma Shan Zheng subsets (OFL). Page loads must not block on `top-level await`; the page sets `READY` from an async function.
- `sh styles/dunhuang/demo/build.sh` does fonts, voice check, events, checks, render, mix, mux, subtitles and poster. A render of a wall takes about 1 s per frame on a busy machine, so expect 15 to 40 minutes with 3 workers.
- End card: none; the demo ends on the last lit cell.
