# Letterpress Newspaper — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Print It True* (53 s) · `newsprint.mp4` · source in [`demo/`](demo/)

## Story & structure

Logline: a small-town paper prints a fire that never happened, then sets the truth in the same size of type.

Four editions of *The Tallow Bay Lantern* (an invented paper) across one day. 6 a.m.: "FIRE AT CANDLE MILL", with a halftone photograph of smoke over a mill. Noon: "MILL FIRE: THREE HURT", EXTRA. A telephone rings, the wire tape prints "NO FIRE AT MILL. HOLD THE PRESS.", everything goes silent, and a STOP PRESS stamp strikes. The headline's slugs lift out, "IT WAS THE OVEN" is set in their place, and the photograph's dots swell and shrink into the real picture (a bakery's new flue, steam at dawn, the mill quiet in the distance). Evening final: a ruled box "WE WERE WRONG" at the same type size as the first headline, then "OVEN'S FIRST LOAF FEEDS THE STREET" over a queue of neighbours. The four pages are dealt out in a row, the camera pushes into the correction, and the film ends on the masthead while the press winds down.

Native moves spent: headline set slug by slug (opening), type pulled and re-set (the turn), halftone developing and morphing (the evidence), stop-press stamp (the peak), stack of editions and the dealt row (the structure), wire tape (the call), boxed notice at headline size (the ending). The story is invented; no real paper, person, firm or place appears.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0–3.5 | macro on the headline forme | locked, slow drift | slugs fall, 8 per second, one clack each |
| 2 | 3.5–9.9 | the page appears | pull back to the upper page | masthead set, rules grow, columns cast, photograph develops |
| 3 | 9.9–13.4 | the photograph | push in until the dots show | cutline set |
| 4 | 13.4–20.7 | edition 2 drops on the stack | wide hold, tilt down at the end | headline re-set fast, EXTRA stamp |
| 5 | 20.7–25.5 | the wire tape | tilt down to the table, slow push | telephone bell, tape types, silence |
| 6 | 25.5–27.0 | STOP PRESS | whip back to the page, hit and shake | the peak |
| 7 | 27.0–36.6 | headline pulled and re-set; photograph morphs | medium hold, then push into the photograph | slugs lift out; dots swell and shrink into another picture |
| 8 | 36.6–43.25 | edition 4 drops; the correction box is set | pull out to the stack, push to the box | box at headline size |
| 9 | 43.25–47.0 | the editions dealt in a row | pull out to the row | four headlines, the day at a glance |
| 10 | 47.0–52.6 | the correction | push back to the page top | the note; the press winds down |

Stills: [slugs falling, 1.5 s](demo/stills/s_1.5.jpg) · [the first page, 8.5 s](demo/stills/s_8.5.jpg) · [the stamp, 26.4 s (the gallery frame)](demo/stills/styleframe.jpg) · [the photograph after the morph, 33 s](demo/stills/s_33.jpg) · [the dealt row, 45.8 s](demo/stills/s_45.8.jpg)

## Score structure

120 BPM, 4/4 (1 bar = 2 s), D. Tine piano, upright bass, brushes, a struck-bar bell, and a rotary press thrum as the pulse of the bed.

- 0–4 s: press only (thrum fades in), slugs clack.
- 4–8: bass and brushes, light. 8–24: full band in D minor (Dm, Gm, A7, Dm), piano on the off-beats.
- **24.0–25.5: silence #1** (no bed, no music; the telephone has just stopped and the tape finished). The stamp at 25.5 is the first sound after it. Music returns at 26.0 with a four-note stab.
- 26–34: driving piano on every beat, walking bass. 34–43: D major (D, G, A, D), full band; the bell when the correction box is set.
- **43.0–43.25: silence #2**, broken by the first deal of paper. 43.25–50: sparse piano arpeggios, half-note bass, brushes fade.
- 50: a held D major chord; the press slows and its last three chugs fall behind the end.

Voice: Kokoro `bm_fable`, compressed, about 10 dB above the music, music ducked 9 dB under it. Sound as transition: the thrum cuts at 24.0 and the telephone bell overlaps the camera's tilt (J-cut); the thrum and the press return under the correction (L-cut over the cut to the row).

## Palette & props

Paper `#d7cfb5` (three slightly different stocks), ink `#1b1814`, stamp red `#c0281d` (stamps and the EXTRA tab only), table `#292826`. Props: three pages (6 a.m., noon/late, evening), a wire tape with a print head, steel slugs, two stamps, three painted photographs.

## End card

None: the last frame is the evening page, masthead and correction box in view, with the final caption gone. No credits, no sign-off.

## Build notes

Files in `demo/`: `index.html`, `main.js` (camera, stack and deal, tape, captions, `TEXTS`), `timeline.js` (all times, camera keys, sound events), `engine/type.js`, `engine/halftone.js`, `engine/page.js`, `engine/copy.js` (invented column copy), `lines.json` (voice script), `tools/` (`export_tl.mjs`, `make_caps.mjs`, `cuecheck.py`), `mix.py`, `build.sh`, `CREDITS`, `fonts/`.

Build: `sh styles/newsprint/demo/build.sh` (needs the core and voice tiers). Order: timeline export, Kokoro voice, speech check, captions, cue check, mix, `.srt`, readcheck, render (about 12 minutes on a laptop at 3 workers), mux with a little grain, styleframe at 26.4 s and poster.

`TEXTS` reports the headlines, decks, cutlines, stamps, the wire tape and the correction note; body columns, the tide table and the advertisements are texture (invented sentences, not reported), and subtitles are checked through the `.srt`. Pitfalls tied to this demo: the photographs are painted for a 5.4 px dot pitch and need big shapes; the row shot relies on `place()` in `main.js` (page transforms) for both drawing and `TEXTS`; the stamp placement is chosen to sit on the empty right of the two-line headlines.
