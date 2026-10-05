# Tarot Cards — Style Prompt

> A deck of linocut cards on a cloth: bordered portrait cards with a numeral, one bold emblem and a title banner; ornate point-symmetric card backs; a table where cards are shuffled, dealt, flipped, spread and gathered. Information arrives as cards turn over.
> References (grammar only): European playing-card and divination-deck printing of the 15th–19th centuries (woodcut, line engraving, stencil colour) for the frame–numeral–emblem–banner layout and the off-register spot colour; 20th-century linocut and relief printing for the carved, tapering line; the card tricks of title sequences for hitting a flip on a beat. Never copy the figures, compositions or names of any existing deck (no Fool, Magician, wheel, tower or any layout from a known deck); invent the deck from the topic's own objects. Never name a real deck in the film.

## 1. Essence, and what it is not

- **A card is a small poster**: cream stock, a heavy double frame, a roman numeral at the top, a single emblem in a window, a swallow-tailed title banner at the foot. The emblem is an object (a lantern, a key, a tide), not a portrait of a person, so the deck can be invented for any topic.
- **Carved, not drawn**: every line swells and tapers like a gouge cut; fields are flat ink with cream carved flicks and print dropouts.
- **Two inks and a paper**: near-black ink, one vermilion spot colour, cream stock, on a dark cloth. Nothing else.
- **The back is a brand**: an ornate, point-symmetric back (a lattice, a rosette, crescents) means a reversed card cannot be told from an upright one until it turns.
- **Things happen by turning over**: the unit of information is a flip. The world is a tabletop seen from above.

Not a casino film (no suits, pips or chips), not a mystic's room with candles and smoke, not a paper pop-up (the cards are flat, with a soft shadow), not a medieval woodcut (the print is clean and graphic, the humour modern).

## 2. Materials & rendering

- **Card**: 420 × 700 local units (ratio 3:5), corner radius ≈ 24, drawn once into a 2× offscreen canvas (the back at 4×, because it fills the frame in close-ups). Layers: stock (mottle, fibre, speckle) → outer frame 7 u and inner rule 2.4 u → numeral band → emblem window (framed 5 u) → banner → footer ornament → bevel (a dark edge line and a pale inner line).
- **Line**: a tapered polygon along a resampled path, with width noise (±22 %) and a normal-direction tremor (< 1 u). Straight lines are never stroked with `lineTo` at constant width. Fills are cut with jittered vertices (±1 u), so edges look hand-cut.
- **Fields**: ink, vermilion or cream, each broken by gouge flicks (short tapered strokes), hatching in parallel runs with random breaks, and print dropouts (tiny paper-coloured specks). Use at most one vermilion field per card.
- **Flip**: a card is an image sliced into 48–72 vertical strips, each with its own perspective scale, so it turns in true perspective; the back side is mirrored correctly, the face reads unmirrored; shade the strips that turn away. At rest (|sin| < 0.004) draw it as one image: strips leave seams.
- **Cloth**: world-anchored weave tile plus a tone-on-tone damask lattice; it moves with the camera so the cards sit on it. Soft drop shadows fall to the lower right and grow when a card is lifted. A warm light pool and a dark vignette are screen-space.
- **Stacks**: only the top three cards of a stack are images, the rest cream rounded rectangles with a dark edge, each offset by a fixed step (and a fixed tiny tilt) so a stack has thickness.

## 3. Colour logic

- **Ink + paper + one spot colour.** The spot (vermilion) marks the numerals, one field, flames, suns and stamps; it is the only warm saturated colour. A second spot colour is not allowed; shades of it (a darker overprint, a lighter wash) are.
- **The cloth is the dark complement** of the spot (deep green or blue-green for vermilion) and carries only cream text and cream ink lines. Do not put vermilion text on the cloth.
- **Value order**: cloth darkest, card backs next, ink fields, then paper. The cards must pop against the cloth; keep a cream border on every card back.
- Example palette (not a rule): ink `#1c1b26`, paper `#ecdfc3`, vermilion `#c9422c`, cloth `#20403c`.

## 4. Type & subtitles

- **One family**: an old-style roman with a true italic, OFL (IM Fell English, shipped in `core/fonts/`; Cormorant Garamond or EB Garamond also work). Capitals with wide tracking (4–8 px at 33 px, 8–12 px at 84 px) for numerals, banners and labels; italic for secondary lines.
- **Roles**: banner title (≈ 33 u on the card), numeral (≈ 50 u, vermilion), diagram label (≈ 80 u on the cloth, cream, with an italic line beneath at ≈ 45 u), end-title ribbon (≈ 84 px), caption (≈ 42 px italic).
- **Subtitles are a printed label**: a cream paper strip with a double ink rule, centred at the foot, set in italic; it fades up with a small lift. It never covers the card the story is about, so hero cards are framed to end above it (card height ≤ 78 % of the frame while a caption is on).
- Text that sits on the cloth is cream; on a card it is ink or vermilion; on a ribbon it is cream. Hold every text ≥ max(1.8 s, speech + 0.6 s).

## 5. Motion quality

- **Smooth 24 fps**, not stepped: the cards are objects on a table. Moves use ease-out for throws and slides (fast start, soft landing) and ease-in-out for lifts and flips.
- **Weight**: a thrown card arcs (lift 40–70 u), grows 6–12 % in the air, lands with a small squash (a 4–5 % scale ripple that dies in 0.2 s) and a soft thump. A flipping card rises ≈ 20 % and its shadow shrinks and softens.
- **Appearances**: text is stamped (scale 1.25 → 1, fade in 0.2 s), lines are carved (they grow along their length), a seal is stamped (scale 1.9 → 0.93 → 1, with a ripple). Disappearances are quick fades.

## 6. Camera grammar

A top-down tabletop camera with centre, zoom and roll.

| Move | What it expresses | Can serve |
|---|---|---|
| Pull-back from a macro of the back | the ritual starts; the object has a surface | an opening; a reveal of scale; a chapter start |
| Push-in on one card (to 75–80 % of the frame height) | attention; this card matters | a flip; one criterion in a list; a verdict |
| Lateral track to the next card | the next item; the same table | a sequence of criteria; a timeline; a comparison |
| Wide, near-still hold on a spread | patience; the whole is visible | the set-up; a pause before the turn; reading time |
| Roll (rotate the whole table 180°, then back) | see it from the other side; the reversal | a reversed card; a counter-argument; a change of viewpoint |
| Pull out to a top-down diagram | the cards become a figure | a framework; a summary; a take-away list |
| Push into the pile or the back, past full frame | closing; the echo of the opening | an ending; a title; a loop |

Framing rules: keep a hero card ≥ 60 % of the frame height; spreads keep ≥ 5 % margin; captions live in the bottom 120 px; text on the cloth is world-anchored. Transitions are made by the cards themselves (a flip, a sweep into a pile, a roll); never a dissolve, never a hard cut.

## 7. Sound palette

- **Instruments**: plucked harp (Karplus–Strong), music-box tines, struck bells (the minor-third bell partials), bowed-glass pad, a low drone, frame drum, a plucked sine bass with 2nd and 3rd harmonics, woodblock ticks. Modal writing (harmonic minor, Dorian, Phrygian); an unhurried tempo where an eighth note is a card flick.
- **Foley is paper, card stock and cloth**: a flick (3–7 kHz burst), a riffle (a run of flicks), a slap (stack on cloth: 200 Hz thump + mid noise), a landing (soft low thump), a slide (swept band noise, 0.4 s), a flip (air whoosh + paper flutter), a snap on landing, chalk and carving scratches for lines, a heavy stamp with a short shimmer. Add a room tone and sparse candle ticks.
- **Silence**: cut the music and the room hard before the turn and let the first sound be a card's own (the flip, then one low bell). Leave at least one long near-silence.
- **J-cuts and L-cuts**: let a motif (a jingle, a tide wash) arrive before its card or run over the cut.
- **Mix**: voice compressed and ~10 dB over the music; music ducked ~7 dB under the voice, foley ducked ~3 dB; −14 LUFS; keep 20–120 Hz within a few dB of the mids.
- **Voice**: calm, dry, a little amused; short sentences; say the card names plainly.

## 8. Native moves

A menu: use the ones your story needs.

- **The flip.** A card turns about its vertical axis, back to face, lifted, in perspective; the face is revealed at the edge-on moment. *Fits content like:* the reveal of a criterion; a before/after; an answer to a question asked a beat earlier.
- **The three-card spread.** Three cards dealt face down and turned one at a time. *Fits content like:* past–present–future; problem–cost–time; three options or three roles.
- **Shuffle and cut.** A riffle of two halves, a cut, a square-up. *Fits content like:* randomness made fair; mixing ingredients; "anything could come up".
- **The fan.** Eight cards open from the pivot and flip in a cascade, then fold back. *Fits content like:* a team of roles; a menu of options; the full set before one is chosen.
- **The reversed card.** A card dealt upside down so that its face arrives inverted; roll the camera to read it, then roll back. *Fits content like:* a risk; "not yet"; the counter-case; a weakness inside a strength.
- **The spread becomes a diagram.** The cards stay; cream labels are stamped beneath, a red rule joins them, a seal is stamped. *Fits content like:* a framework summary; a checklist; a verdict.
- **The pile.** The cards sweep together, thump, and the top one turns to its back. *Fits content like:* closing a case; an ending that echoes the opening; "one deck, many films".

## 9. Pitfalls of the medium

- **Faces that look alike** → vary the field colour (ink / vermilion / paper) and the emblem's silhouette.
- **Strip seams in a flip** → overlap strips by 0.7 px, draw rest poses as one image.
- **Back that reveals the reversal** → keep the back point-symmetric; only the face is oriented.
- **A caption over the card that matters** → size the hero shot to leave the bottom 120 px.
- **Stacks that look like one card** → a visible per-card offset, and cheap edge-only cards below the top three.
- **Divination framing taken too seriously** → keep it playful; never medical, legal or financial predictions; the cards pose questions, they do not decide.

## 10. Engine

In `demo/`: `cards.js` (the drawing kit and the deck: `tstroke` tapered carved line, `poly` hand-cut fill, `hatch`, `flicks`, `speckle`, `PICS` the emblems, `face()` and `back()`, `buildDeck()` returns the canvases; fonts via `loadFonts()`), `main.js` (the table: `drawCard` strip flip with shadow, `drawLite`, stacks, riffle, cut, fan, deal, pile; camera keys through `track`; cloth; the diagram and seal; captions; the title ribbon; the page contract and `TEXTS`), `timeline.js` (tempo, bars, every event time and the sound-event list `EV`, shared with `mix.py`), `mix.py` (score, foley, room, voice), `tools/export_tl.mjs` and `tools/make_subs.mjs`. File map and build order: [DEMO.md](DEMO.md) "Build notes".

A new card (not in the demo): add `owl(c, R) { /* carve with disc(), poly(), line(), flicks() in the 332 × 430 window */ }` to `PICS` and `{ id: 'owl', num: 'IV', title: 'THE OWL' }` to `DECK`; `drawCard(ctx, 'owl', { x, y, rot: 0, th: Math.PI / 2, lift: 1.1 }, cam)` draws it half-turned.

## 11. Variation space

You decide the deck (eight to twenty-two original emblems drawn from the topic's own objects), the colour pair within the logic above, the cloth, the numbering (roman, none, or the topic's own), the story, the order of moves, the camera path, the opening and the ending. All far from our demo:

- Structures: **a day as a deck** (one card per hour, the pile read at the end); **a profile** (five cards laid out as a person, the blind spot reversed); **a vote** (a fan of options, cards removed one by one until one is left face up).
- Openings: **an empty cloth** and a pool of light, then a card slides in; **a card spinning on its corner** that falls flat; **a fan snapping shut** into a deck.
- Endings: **one card face up** on an empty table; **a ring of backs** with one card missing; **the spread dissolving into the cloth's damask**.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
