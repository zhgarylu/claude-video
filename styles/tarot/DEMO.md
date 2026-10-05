# Tarot Cards — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Three Cards for a Yes* (58 s) · `tarot.mp4` · source in [`demo/`](demo/)

## Story & structure

A favour is asked and "yes" is already forming. A deck is shuffled, cut and dealt; three cards answer in turn: the **Lantern** (what, exactly, is being asked? say it in one sentence), the **Key** (what does it cost? count hours, not feelings), the **Tide** (will it matter in a year?). The Tide lands upside down, which in this deck means "not yet". The spread becomes a diagram (ASK · COST · TIME) with a red rule and a NOT YET seal; the cards sweep into a pile, the top one turns to its back, and a title ribbon is stamped across it.

Why it fits: a three-part judgment is exactly what a spread is for, and the reversal gives the film its turn. The tone is a straight-faced decision aid with a little humour; divination is the costume, not the claim.

Native moves spent: macro pull-back from the card back (opening), riffle shuffle and cut, the fan with a flip cascade (the whole deck shown once), the deal, three flips, the reversed card with a camera roll, the spread-as-diagram, the pile and the echo of the back.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0–5.3 | back of the top card fills the frame, then the deck on the cloth | pull-back 4.6× → 1.0× | opening macro; a thumb riffles the corner at 0.15 s |
| 2 | 5.3–8.4 | the deck splits, riffles, is cut | slow push 1.0 → 1.14 | shuffle and cut |
| 3 | 8.4–10.8 | eight cards fan out and flip in a cascade, then fold | pull out to 0.8 | the fan: the whole deck, once |
| 4 | 10.8–13.3 | three cards dealt face down in a row; the deck slides away | track right to the wide 0.62 | the deal (cards land on beats) |
| 5 | 13.3–24.0 | Lantern flips | push to 1.10 → 1.15 | flip 1 |
| 6 | 24.0–34.7 | lateral track to the Key; it flips | track 1.15 → 1.06 → 1.15 | flip 2; a key jingle arrives early (J-cut) |
| 7 | 34.7–37.3 | the last back, near-silence | drift to C, slow creep | silence |
| 8 | 37.3–42.2 | the Tide flips, upside down | roll 180° (reads upright), hold, roll on to 360° while pulling out | reversed card |
| 9 | 42.2–51.5 | top-down spread: ASK / COST / TIME stamped, rule, seal | near-still wide at 0.73–0.75 | spread becomes a diagram |
| 10 | 51.5–53.3 | the three cards sweep into a pile; the top turns to its back | push 0.75 → 1.05 | the pile |
| 11 | 53.3–58.0 | push into the back, title ribbon stamped across | push 1.05 → 2.6 | echo of shot 1; title held ≈ 4 s |

Stills: [the fan, 9.4 s](demo/stills/s_9.4.jpg) · [the deal, 12.0 s](demo/stills/s_12.0.jpg) · [the Key flips, 24.5 s](demo/stills/s_24.5.jpg) · [the roll, 39.3 s](demo/stills/s_39.3.jpg) · [the opening pull-back, 2.6 s](demo/stills/s_2.6.jpg) · [style frame, 50.2 s](demo/stills/styleframe.jpg)

## Score structure

D minor (harmonic), 90 BPM, 4/4, one bar = 2.667 s, 22 bars; progression Dm · Bb · Gm · A in four-bar loops.

- Bars 0–1 (0–5.3 s): drone (D3/A3) and one high bell; the room only.
- Bars 2–4: Karplus–Strong harp arpeggio in eighths; from bar 4 the frame-drum pulse (beats 1, 3, ghost on the "and" of 3).
- Bars 5–8 (Lantern): music-box melody in D6 register above the arpeggio.
- Bars 9–12 (Key): plucked sine bass, woodblock ticks on every eighth, a descending box melody.
- Bar 13 (34.7–37.3 s): **silence 1**, everything cut (music, room); the first sound back is the Tide's flip whoosh and snap, then one low bell (D3).
- Bars 14–18 (Tide and verdict): bowed-glass pad, half-time drum, a slow box melody doubled an octave down; the stamp at 49.3 s on the dominant (A).
- 50.3–51.3 s: **silence 2**, music and room cut; the pile begins with the cards' own sounds.
- Bars 19–21: the resolution (Dm), the box phrase falling to D4, a bell on the title at 53.3 s, and a last low bell with ring-out.

Foley and beds: riffle flicks (24 individually timed), cut slaps, card slides and landings on the cloth, flip whooshes with paper flutter, chalk for each label, carving scratches for the rule, the stamp, a tide wash (a J/L cut over the Tide card into the diagram), room tone and candle ticks. Mix: voice 5 dB over ducked music in the raw mix (the master is −14 LUFS); music is ducked by the voice envelope; sub-bass is high-passed at 28 Hz.

## Palette & props

Ink `#1c1b26`, paper `#ecdfc3`, vermilion `#c9422c`, cloth `#20403c`. Eight original cards: I Lantern (ink field, rays, a hooded walker), II Key (vermilion field, arch, crescent-moon bow), III Tide (paper field, sun, boat, scalloped waves), VII Compass, IX Moth, XII Bell, XV Ladder, XX Hourglass (the last five appear once, in the fan). The back: lattice, 12-leaf rosette, crescents and corner fans; point-symmetric. The seal: a cream disc with a ticked ink ring and "NOT YET" in vermilion, stamped at −6° rotation.

## End card

A swallow-tailed ink ribbon stamped across the card back: "THREE CARDS FOR A YES" in cream capitals with the italic line "ask · cost · time" in a lighter vermilion beneath. No credit line, no logo.

## Build notes

File map of `demo/`:

| File | Role |
|---|---|
| `index.html`, `main.js` | the page: table, deck, flip, camera, diagram, captions, title; `window.render/DUR/EV/TEXTS/READY` |
| `cards.js` | deck drawing: carved line, hand-cut fills, hatch, the eight emblems, card face and back |
| `timeline.js` | tempo, bars, event times (shuffle, deal, flips, diagram, pile), voice cues, `EV` sound events, music layers |
| `tools/export_tl.mjs`, `tools/make_subs.mjs` | timeline → `timeline.json`/`lines.json`; voice durations → `subs.json` (captions held per the reading rule) |
| `mix.py` | score + foley + room + voice → `mix.wav` |
| `build.sh` | the whole film in one command |
| `TREATMENT.md`, `CREDITS` | treatment and asset list |

Build order (`sh styles/tarot/demo/build.sh`): export timeline → Kokoro voice (`bf_emma`) → speech check → captions → mix → `.srt` → `readcheck` → render (≈ 1,390 frames, about 8–10 min with 3 workers) → mux (−14 LUFS) → styleframe and poster. Set `RENDER_SLOTS` if other renders run at the same time.

Review: contact sheets every 1–2 s (cut, fan, deal, flip, roll, diagram, pile), 0.3 s strips for the riffle and the pile, a black-frame check and an ebur128 pass on the final file. Pitfalls tied to this demo's props: the stack of 24 backs is drawn with only its top three as images (the rest are `drawLite` rectangles) to keep frames fast; the card backs are rendered at 4× so the opening macro stays sharp; the fan cards use stack positions 16–23 so the stack below shrinks to 16 while the fan is open.
