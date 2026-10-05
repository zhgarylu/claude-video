# Lacquer & Gold — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Thirty Coats* (56 s) · `lacquer-gold.mp4` · source in [`demo/`](demo/)

English voice-over (Kokoro, voice `bf_emma`), burned-in inscription captions, `lacquer-gold.srt`. Picture, score and foley are all made in code.

## Story & structure

*A lid takes thirty coats of lacquer, and only then its gold.* One object, one goal, one turn: the film spends its middle on the thing you cannot see, the waiting, and the gold arrives last and smallest. Structure chosen from three candidates (a workshop journey, a cross-section descent, a patience ledger): the ledger, because it gives the material a reason to be shown and puts the silence exactly where the story turns. The full treatment is in `demo/TREATMENT.md`.

- Setup (0–7 s): a drop of sap, a brush, the first black coat on raw wood.
- Build (7–16 s): a side section; thirty coats stack up while a counter accelerates (one per beat, then per eighth, then flurries).
- Proof (16–19 s): a graver cuts a V-groove; nested bands show black, then vermilion, then brown: every coat is still there.
- Turn (19–26 s): a locked frame of the plain black lid; music cut on the downbeat, rain, one distant bell, the voice says "Nothing happens. That is the work."
- Payoff (26–45 s): the first gold line (the sound after the silence), a crane drawn stroke by stroke, powder sprinkled and brushed, clouds, sun, waves, the key-fret border closing; then the lid turns in the light as a sheen crosses it twice.
- Ending (45–56 s): "Now, open it." The lid lifts and slides away to show vermilion; a title is drawn in gold and a seal is pressed.

Native moves spent: the coat stack, the cut that shows every layer, the gold line that draws itself, sprinkle and brush, the sheen sweep, the turn, the lid that opens, the wet coat wipe.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0–2.8 | Macro of a sap drop swelling, falling into a dark pool | slow push-in | the hook; ripples and a small jet on landing |
| 2 | 2.8–5.6 | Top-down raw wood, a wide brush lays three bands of black | track with the brush, stepping down a band at a time | wet edge, bristle streaks that level out |
| 3 | 5.6–16.0 | Side-view section: wood, cloth, earth paste, then 30 coats | crane up from the wood, then pull back as the stack grows | counter 01 to 30; coats brushed, cured, polished |
| 4 | 16.0–18.4 | Graver cuts a V-groove | push-in to 2.0x | nested colour bands; curls of lacquer |
| 5 | 19.2–25.6 | The plain lid, window reflection, rain, light slowly warming | locked | the held breath; the only fully static shot |
| 6 | 25.6–38.4 | Top-down lid, gold lines and powder | push in on the head of the first line, follow the crane, pull out to the whole lid | gold line that draws itself, sprinkle and brush, rules, fret |
| 7 | 38.4–44.8 | Lid fills the frame, swings about its vertical axis | pull-out and pseudo-3D turn | sheen sweep twice; the red glow under the black rises with it |
| 8 | 44.8–48.8 | Lid lifts toward camera, slides off the top | lift (scale and shadow) | vermilion interior revealed |
| 9 | 48.8–56.0 | The box interior, title and seal | slow push-in | title drawn left to right, seal pressed, last glint |

Transitions 1→2, 2→3 and 4→5 are wet coat wipes (a band of fresh lacquer crossing the frame, horizontally, then vertically for the last).

Stills: [the drop](demo/stills/drop.jpg) · [the cut](demo/stills/cut.jpg) · [the first gold lines](demo/stills/gold-line.jpg) · [powder and brush](demo/stills/powder.jpg) · [the style frame, 40.4 s](demo/stills/styleframe.jpg) · [the lid opening](demo/stills/open.jpg) · [the title](demo/stills/title.jpg)

## Score structure

75 BPM, 4/4 (beat 0.8 s, bar 3.2 s), the yo scale on D (D E G A B). Instruments: modal-synthesis koto, breathy flute, pads, bells, soft taiko, a shaker for the final coats.

| Bars | Time | Music |
|---|---|---|
| 1–2 | 0–6.4 | drone, three sparse koto plucks, a flute line entering at 3.2 s |
| 3–5 | 6.4–16.0 | koto ostinato in eighths, taiko joins in bar 4, sixteenths and a shaker in bar 5; bell on coat 30 |
| 6 | 16.0–19.2 | bell, a held chord, two plucks |
| 7–8 | 19.2–25.6 | **silence 1**: music cut on the downbeat (25 ms fade); rain, a distant bell at 21.6, a drop on a leaf at 22.9 |
| 9–12 | 25.6–38.4 | **the first gold tick and a single koto D at 25.6**; drone, melody in quarters, arpeggio from bar 10, soft taiko |
| 13–14 | 38.4–44.8 | flute over wide pad chords, sheen foley |
| 15 | 44.8–48.0 | **silence 2**: music gated from 45.0 to 48.0, the voice says "Now, open it.", the lid pops at 46.4 |
| 16–17 | 48.0–54.4 | arpeggio resolve on D, bell, flute; a low thump and a bell at the seal (52.0); a last pluck at 54.4 |

Sound as transitions: the rain begins under the panel scene (5.6 s) and carries across the cut to the section; it is the only thing left in the silence. Every picture hit in `timeline.js` sits on the eighth-note grid (`demo/tools/cuecheck.py`).

## Palette & props

Lacquer `#0c0807`, vermilion `#b3261a`, gold `#c4952f` with shade `#7b5513` and highlight `#fff1b8`, raw wood `#b98650`. Props, all drawn in code: sap drop, flat lacquer brush, hemp cloth, graver, powder tube, soft brush, lacquer lid and box, a crane (original composition), ruyi clouds, a sun disc, seigaiha waves, a key-fret border, mother-of-pearl flecks, a seal (金) built from strokes.

## End card

The title "Thirty Coats" is drawn in gold over the vermilion interior with a hairline under it and the seal pressed at the lower right. No credits and no sign-off text in the picture.

## Build notes

`sh styles/lacquer-gold/demo/build.sh` (set `RENDER_SLOTS=3` when the machine is shared). Needs the core and voice tiers. Render time is a few minutes at three workers; the mix (`mix.py` then `master.py`) takes about two minutes when the machine is free; `master.py` can be re-run alone from `out/stems.npz` to rebalance (voice about 10.6 dB above the music while speaking, linked look-ahead limiter, -14 LUFS).

| File | What it is |
|---|---|
| `timeline.js` | the one clock: times, voice lines, coat times, gold schedule, events |
| `motifs.js` | geometry of the gold design and its schedule (DOM-free; the mixer reads its events) |
| `lacq.js` | gold stroke, powder, pearl, textures, tools, seal |
| `lid.js` | the top-down object scene and the pseudo-3D turn |
| `scenes.js` | drop, panel, section and graver, wet-coat wipe, gold text |
| `main.js`, `index.html` | page contract (`DUR`, `render`, `READY`, `EV`, `TEXTS`), captions, title, seal |
| `mix.py`, `master.py`, `tools/*` | score, foley, rain and voice stems; balance and loudness; timeline export; captions; grid check; whisper on the finished film |

Review: contact sheets every 2 s, 0.2 s strips of the cut and the lift, one full-speed viewing with sound. Pitfalls tied to this demo's props: the crane's raised wing is wide, so powder density alternates between feather sectors to keep the feather lines readable; the panel's wood is a matte surface, so the window reflection is drawn only inside the coated bands; the mix is low-passed at 14 kHz because the AAC encoder overshoots on the bright powder sparkle (a +4 dB true-peak surprise otherwise); the lid's slide-off must carry the gold layer with it (the gold canvas is drawn in the lid's own transform).
