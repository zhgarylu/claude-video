# Split-flap Board: Style Prompt

> The mechanical departure board in motion: rows of hinged flap cards, every character a pair of halves that falls to show the next glyph, each change a scramble through the alphabet wheel before it settles, and a clatter whose density is the number of cells flipping.
> References (grammar only): station and airport split-flap displays of the 1950s-90s (Solari-type mechanisms in general) for the cell, the fall, the status colour and the ticker line; mechanical-clock and flip-clock motion for the digit wheel. Never copy a real station's timetable, a real operator's livery or a real board's typeface; use an OFL grotesque, thickened.

## 1. Essence, and what it is not

- **A physical mechanism with depth and hinges.** Every cell is two cards on a hinge; a character changes only by flaps falling, one at a time, forward.
- **The wheel only turns one way.** The cost of a change is the distance forward around the wheel (a step back costs almost a whole turn). That rule drives the look of every change: a scramble of intermediate glyphs, then a settle.
- **The sound is the star.** The clatter is derived from the flap events; the picture is built so that each landing is a sound.
- **Invented content only**: lines of text, times, places, ranks, a sentence.

Not a terminal (no glow, no scanlines, no monospace grid of light: see ascii-crt), not an LED matrix or a dot-matrix sign, not a digital "flip" transition (nothing flips unless a physical flap falls), not a clock widget.

## 2. Materials & rendering

- **Housing**: a black plate with a thin bevel, bolts, hanger rods, a recessed trough behind each row. Warm key light from above and slightly in front; a vignette; a faint moving sheen on the glass. No bloom, no neon.
- **Cell**: a rounded card in two halves (graphite, a touch lighter at the top edge, darker at the foot), a hinge slit with a highlight line below it and pin notches at both sides, a gap of 4 px or more between cells and a darker gap between rows. About 2:3 (width:height).
- **The fall** is drawn as foreshortening about the hinge: the upper half of the old card swings down (its height shrinks with the cosine of the angle, darkening as it turns away from the light), the lower half of the new card swings down to land (growing again, brighter). The card under it is in shadow until it is uncovered. Gravity easing (angle grows with time squared), a landing click on the last frame of each flap.
- **Texture of use**: flaps do not all move in lockstep; give each cell a slightly different flap rate (about ±6 %), start rows and columns in cascades, and let a dense burst shake the whole board by a pixel or two.
- **Render the glyphs once** per character, tone and scale into a cached face and draw its two halves; draw big magnifications from a higher-resolution face, not an upscaled one.
- Mux with a little grain (1), or none; the picture is dark and smooth.

## 3. Colour logic

- **Warm near-black and warm white.** Housing `#0b0a09`..`#24211d`, cards `#302c28`/`#1e1c19`, type `#f3e7ca`.
- **One amber and one signal green, used as status colours on whole cards**: amber `#f3b63c` card with dark ink for delays and warnings, green `#3aa86e` with light ink for done. The same amber as ink on a dark card for live numerals (clocks, counters). A third status colour only if the story needs one.
- Colour belongs to the flap, so it changes only as a flap falls; the stamp "changes colour" by turning cards, never by a fade.
- Examples: the cream and amber above; or a cooler white `#e9ecef` on blue-black with a red status; or all-amber type on black for a night-bus look.

## 4. Type & subtitles

- **One condensed-to-regular OFL grotesque for every glyph** (Barlow Medium, DIN-like faces, Roboto Condensed, B612), thickened by a stroke of about 5.5 % of the font size so it reads as heavy printed flaps. Capitals, digits and a few marks only; a wheel of 40 flaps is: space, A-Z, 0-9, colon, full stop, comma. A clock or counter module can have a wheel of its own (digits and a blank).
- **Glyphs sit on the hinge**: cap height about 55 % of the card height, centred; wide letters are squeezed in x to fit, never shrunk.
- **Text is fixed width**: columns, not kerning. Align by padding, centre by counting cells.
- **Subtitles are the board's own announcement strip**: a second, smaller row of cells under the main board (two rows, up to about 36 cells), in a dimmer ink, letters landing in time with the voice. The strip stays put when the camera moves.
- Labels in diagrams are small capitals with generous letter-spacing, in the housing's warm grey.

## 5. Motion quality

- **Every change is a scramble to settle**: a cell passes through every glyph between the old and the new one, at about 20 flaps a second (0.04-0.06 s each), so a long change is visibly long.
- **Cascades**: columns start a couple of hundredths of a second apart, rows a beat or less apart; a settle can be staggered so the last letters land in reading order (compute the start from the landing time and the number of flaps).
- **Never animate a position**: nothing slides. Rows "shift up" by every cell of each row re-writing itself to the row below's text, top row first.
- **A delay or status change** turns the whole status block to a coloured card; the same characters with a new tone cost a full turn of the wheel.
- **A counter on a digit wheel** is cheap (ten flaps and a blank): it can tick on every beat; land its last flap on the beat.
- Pick the flap duration so it is not an exact multiple of the frame time (24 fps), or you will only ever see settled states; 0.04-0.06 s with per-cell jitter avoids it.
- Hold a settled text at least (letters / 15 + 1.5) s.

## 6. Camera grammar

A vocabulary, not a route. The camera is a smooth 2D move (centre and scale) over the board, eased, never stepped.

| Move | What it expresses | Can serve |
|---|---|---|
| Wide, slowly pushing | the board as a whole, the size of the job | an opening; a board that fills; an ending |
| Push to one row or one column | reading a single line; a status | a delay; a ranking position; a result |
| Push to the clock | a countdown | a launch; a deadline; a final |
| Dive into a hinge and open it | the mechanism, the reason for the sound | an explanation of why something takes as long as it does |
| Section view beside the front view | cause (the wheel) next to effect (the card) | how a thing works |
| Fast pull-back to wide | the event has happened and everything moves | a result; a departure; a reveal |
| Slow push on a few big cells | a sentence | a quote; a name; a last line |

Transitions are made of the medium: the gap between two cards opening into the section drawing (both halves part like a shutter), a row re-writing, a whole board falling blank. No dissolves.

## 7. Sound palette

- **The flap click is the unit of the score.** One click per flap landing (the end of each flap's fall), from a bank of variants (card, stop, brightness), panned by column, a little room hall. A cell scrambling 30 flaps is 30 clicks; a board starting up is a wall of them. The sound's density therefore follows the picture exactly; derive it from the events, never hand-place it.
- **Small cells (a caption strip) click higher and quieter; the section view's flaps are close and dry**, with a touch of case metal. Inside the case the hall disappears; a tone from the case replaces the room's air. Bring the next scene's room back before the picture does.
- **Other mechanisms**: relay clunk at power-on, ratchet and pawl "tink", a heavy thunk for a long fall landing, the shutter whomp as the gap opens and closes, a station chime, a train horn.
- **The score sits between the bursts**: mallet (marimba, vibraphone), soft bass, a held pad; little or no drum kit (the flaps are the percussion). Modal (dorian or aeolian), 90-110 BPM, notes on eighths. Put the bursts on the grid and the score in the gaps.
- **Silence is a native move**: let the board stop. The first sound after a silence (a pawl, one flap, the whole board falling) should be one of the loudest ideas in the film.
- **Mix**: the clatter is the loudest layer outside voice; duck it about 6 dB under voice; keep the voice clear (compress it, no reverb beyond a slap); −14 LUFS with a limiter, because bursts have a very high crest.

## 8. Native moves

A menu: use the ones your story needs.

- **Scramble-to-settle.** Any text arriving. *Fits content like:* a schedule filling; a name; a price.
- **Power-on test.** Every cell cycles the whole wheel in a wave. *Fits content like:* an opening; a reset; a new season.
- **Rows shift up.** A line is added or removed and the rest re-write upward. *Fits content like:* a queue; a log; a feed.
- **The status stamp.** A block of cards turns amber, green or red. *Fits content like:* delays; stock levels; pass/fail.
- **The countdown clock.** Digit wheels ticking on the beat. *Fits content like:* a launch; a deadline; a race start.
- **The ranking reorders.** Names and scores re-write and the lines change places. *Fits content like:* a leaderboard; chart positions; election night.
- **The alphabet wheel in section.** Side view of the flap stacks, the ratchet and the pawl, beside the front view. *Fits content like:* any explanation of cost, order or "why this takes so long".
- **The sentence spelled cell by cell.** Letters land one after another; the scrambles around them are the build-up. *Fits content like:* a quote; a dedication; a message.
- **The board falls blank.** Every cell turns to blank at once. *Fits content like:* an ending; a clearing; a hush.

## 9. Pitfalls of the medium

- A flap duration that equals the frame time shows only settled states: no motion, and a dead picture. Use 0.04-0.06 s with per-cell jitter.
- Everything starting at once becomes a static-like roar and hides the picture: cascade by column and row.
- Too many cells changing under a voice: duck the clatter, and hold a settled text long enough to read.
- Hold times: a text that is re-written within a couple of seconds of settling cannot be read (the check requires letters / 15 + 1.5 s). A camera move that takes a text out of frame ends its hold.
- An overlay strip that sits on the board hides the lower row when the camera is zoomed out of the wide frame: aim the camera so important rows stay above it.
- A step "back" is expensive, not impossible: wire the story around that cost rather than animating a reverse.
- Characters must be on the wheel (no lower case, no hyphen unless you add it): spell numbers as digits and drop other punctuation.
- Counter digit wheels need a blank flap too if cells must start and end empty.
- Don't mirror styles/ascii-crt: no phosphor, no scanlines, no cursor; the type here is printed on cards that move.

## 10. Engine

In `demo/`: `flap.js` (the wheel, Cell with flap schedule, `write()` with start, landing time, explicit times, tones; one sound event per landing), `film.js` (the board geometry, the script of writes, camera table and shutter), `draw.js` (cached card faces, the hinged fall, housing, the section drawing with flap stacks, ratchet and pawl), `timeline.js` (key times, voice lines, caption rows), `main.js` (page contract, camera shake from flap density, texts for the reading check), `mix.py` (click bank, hall, one-off sounds, score, voice, master), `tools/export_tl.mjs`. File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the places, the lines, the status vocabulary, the colours, the board's size, whether there are stamps, a clock or a ranking, and the story. All far from our demo:

- Structures: **a ranking night** (a leaderboard that reorders as scores come in, ending on one name); **a countdown** (a single big clock and the board around it filling as it runs down); **a message board** (a quote assembled word by word, then dismantled); **a season** (the same board rewritten for four seasons, each rewrite a different length).
- Openings: **a single cell** falling alone; **the board dark, one row lighting**; **the sound alone over black**, then the first row.
- Endings: **all cells blank**, a hush, one flap; **the board cycling forever** (a screensaver loop that never settles); **one row stamped green** while the rest fall.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
