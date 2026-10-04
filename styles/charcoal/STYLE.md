# Charcoal Sketch Animation — Style Prompt

> Monochrome charcoal and graphite on heavy toothed paper, animated the way drawn-and-erased films are made: one sheet is drawn, rubbed with a thumb, partly erased and drawn again, and the ghosts of every earlier state stay on the paper.
> References (grammar only): the drawn-and-erased animation tradition (a single sheet photographed between changes, erasures leaving a visible memory); charcoal studio practice (toning a ground, lifting highlights with an eraser); academic life drawing (tonal massing plus a sharp accent line). Copy none of their images or music; never name them in the film.

## 1. Essence, and what it is not

- **One sheet, one world.** The whole film happens on the same paper. Change is made by hand on that sheet (draw, rub, lift, redraw), never by cutting to a new picture.
- **Pigment sits on the tooth.** Charcoal catches the peaks of the paper and leaves the valleys: light marks are speckle, heavy marks are velvet black.
- **Soft masses, sharp accents.** Tone is laid with the side of the stick and rubbed smooth with a thumb; a few hard lines with the tip carry the drawing.
- **Erasure is drawing.** Light is lifted out of dark with a kneaded eraser; what is erased never fully goes, and later marks are made over its stain.
- **The object is on screen**: pins, deckle edge, board, stick, eraser and their shadows.

Not one-line (that line never lifts; nothing is rubbed or erased), not ink-wash (wet ink, no grain, no ghosts), not urban-sketch (pen plus colour wash), not whiteboard (wiped to white with no trace). Here the paper has tooth, the medium is dry, and every wipe leaves a ghost.

## 2. Materials & rendering

- **The sheet is a stack of fields.** Per pixel: charcoal, graphite and sanguine density, a *smudge* field (how far the tooth is filled) and a *stain* field (what an eraser has lifted), over a fixed seeded *tooth* height field that belongs to the paper.
- **Deposit.** A dab adds pigment where `pressure × falloff × streak` plus a tooth term passes a soft threshold: peaks take pigment first, repeated passes close up to solid. Streaks run along the stroke (the stick's ridges).
- **Strokes** are dabs on a smoothed path with pressure attack and release, width noise, slight wobble and a fixed seed, so a replay gives the same stroke.
- **Smudge** drags pigment from behind along the stroke (short directional average, slight cross-blur), fills the valleys, lifts a few percent. Where the smudge field is high the tooth stops gating the tone and the mass reads smooth.
- **Erase** takes pigment mostly off the peaks, moves part of it into the stain field and lowers the smudge field. Repeated erasing converges to a pale stain, never to clean paper.
- **Compositing** is multiply-like onto warm paper: charcoal neutral near-black, graphite cooler silver with slight sheen, sanguine a multiplying ink (it darkens, never glows). A soft lamp from the upper left and a tooth emboss light paper and pigment alike.
- **Paper** is procedural and world-anchored: tooth (fine and coarse, slightly laid), mottle, fibres, deckle edge, a very dark wood board with the sheet's cast shadow. Grain must not shimmer when the camera moves.
- **Persistence.** The sheet at time *t* is a pure function of *t*: operations compile to time-stamped items and replay in a fixed order.
- **Overlays above the paper** (stick, eraser, thumb, pins, slip) are vector with a cast shadow that widens as the tool lifts. Vignette and grain live in screen space.

## 3. Colour logic

- **Neutral ground**: warm off-white cotton rag (about `#E2DAC8`). Pigment is neutral: near-black charcoal (`#18171A`), silver graphite (`#42454C`). No other colour exists in the world.
- **One accent**, sanguine red chalk (about `#9C3A2A` on paper) *or* a pale ochre wash, reserved for the one thing the film is about: a door, a lamp, a scarf, a flame. Never a coloured sky, ground or type; a few percent of the frame at most.
- **Values do the work.** Darks are near-black, lights are paper, mid-greys are smudged. Light is made by lifting: the brightest thing is clean paper inside dark, never white pigment.
- Pure black and white never appear: the darkest charcoal keeps grain, the lightest lift a stain.

## 4. Type & subtitles

- **Subtitles are a pencil slip**: a torn strip of paper pinned over the work, text in graphite with paper grain knocked out of the letters, a soft cast shadow, a slight tilt. Latin: **Caveat** (OFL) 500, 44–56 px at 1080p, two lines at most. Hold ≥ max(1.8 s, speech + 0.6 s).
- **Titles are written into the sheet** in charcoal (a glyph mask rubbed in left to right, several passes), so they can be smudged or erased like any mark. 150–260 px, loose; never a flat font over the film.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): **Ma Shan Zheng** or **Zhi Mang Xing** (hand brush, titles rubbed into the sheet); **Noto Serif SC** SemiBold or **LXGW WenKai** (pencil slip). Subset with the Google Fonts `&text=` request, load with `@font-face`, keep characters ≥ 48 px and knock out a little less grain than for Latin.
- Text is graphite on the slip, charcoal on the sheet, never the accent.

## 5. Motion quality

- **24 fps, marks on ones, the hand deliberate.** Strokes ease in and out; nothing is tweened like a vector shape.
- **Drawn-and-erased change steps.** To move or change a subject, erase part of the old state and redraw the new one on twos to fours, so old positions fade into stain instead of vanishing.
- **Pigment never moves by itself.**
- **The tool leads.** It arrives, acts and leaves; its shadow tightens on contact and loosens as it lifts. The thumb is only a faint, cool, translucent presence, never a drawn hand.
- **Slow rhythm**, long holds; speed up by compressing the same hand actions, not by cutting.

## 6. Camera grammar

A vocabulary, not a route. The camera moves over the same sheet.

| Move | What it expresses | Can serve |
|---|---|---|
| Wide on the whole pinned sheet | the sheet as an object; accumulated time | an opening or closing image; a map |
| Slow push toward the working tool | attention; a decision | a first mark; a change about to happen |
| Lateral glide along the sheet | following a path | a journey; a list; a timeline |
| Macro on the grain | texture and touch | a tonal passage; an erasure up close |
| Pull-back revealing the ghosts | earlier states seen at once | a reveal of scale; a comparison of years |
| Hold on a finished state | reading time | a statement; a pause |

Framing: at key beats the subject fills at least a third of the frame height; edge and pins show in wide shots; text lives on the slip or in empty paper. Transitions are made by hand on the same sheet: a thumb wipe across a tonal field, an erasure that opens a light, a smudge that turns one shape into the next. No fades, dissolves or cuts to another sheet.

## 7. Sound palette

- **Music**: sparse, dry, close, acoustic: bowed or plucked low strings (cello, pizzicato bass), felted piano, bowed vibraphone, frame drum or brushes. Few notes, long decays. No synth pads, no big strings.
- **Foley carries the film**: charcoal rasp on toothed paper (pitch and noise follow pressure and speed), a thumb's dry whisper, the squeak and crumble of a kneaded eraser, a stick set on wood, paper creak.
- **Ambience**: a quiet studio, a far clock, a warm room tone.
- **Silence** before the eraser first touches what the film cares about; the eraser is the first sound after it.
- **Mix**: music ducks ~5 dB under foley and voice; −14 LUFS; grain ≤ 2. **Voice**: close, dry, few lines.

## 8. Native moves

A menu: use what the story needs.

- **Light by erasing.** Shapes are lifted out of a dark toned field. *Fits content like:* a night walk; a lit room in a dark city; the one open shop on a street.
- **The ghost stays.** An element is erased and redrawn elsewhere; the stain of its old place stays. *Fits content like:* a coastline over decades; a family moving house; edits to a plan made in the open.
- **The thumb wipe.** A smudge sweeps a tonal field and turns one scene's masses into the next. *Fits content like:* a change of season; a change of place; a memory dissolving.
- **Drawn-and-erased motion.** A figure moves by erase-and-redraw on twos, trailing ghosts. *Fits content like:* a walk across a town; a growing crowd.
- **Accent in sanguine.** The film's one warm thing, in red chalk, is last to be erased or first to be redrawn. *Fits content like:* a scarf in a crowd; a stove in a winter hut; the heart of a diagram.

## 9. Pitfalls of the medium

- **A pale pencil scribble**: build masses first (broad strokes, then a smudge); tip lines must reach near-black.
- **Salt-and-pepper noise**: unrubbed tone. Smudge until the grain thins.
- **Tone that vanishes in a smudge**: too long a drag averages it away. Short drag, partial strength.
- **Erasures as clean white holes**: leave a stain and keep the valleys; blend the area back with a smudge from its surroundings.
- **Round soft blobs for clouds or light** read as decals: lift with long, thin, tapered strokes.
- **Grain that shimmers** under camera moves: keep it in sheet space.

## 10. Engine

In `demo/engine/`: `sheet.js` (`buildPaper`: tooth, light, deckle, board; `Sheet`: the fields, `dab`, `smudge`, `erase`, `composite` of a dirty rectangle), `ops.js` (`Timeline`: `stroke`, `smudge`, `erase`, `text`, `advance(sheet, t)` on a 48 Hz clock, `toolAt(t)`), `tools.js` (`drawTool`, `drawPins`, `drawSlip`, `vignette`). `demo/film.js` composes the demo and `demo/index.html` exposes `render(t)`; a still: `node core/render/still.mjs styles/charcoal/demo <t> --q 'cam=cx,cy,z'` (`nocap=1`, `notool=1`). Minimal drawing not in the demo: `tl.stroke({ t0: 0, t1: 2, layer: 'C', r: 12, p: 1, pts: [{x:600,y:900},{x:1400,y:700},{x:2200,y:950}] }); tl.advance(sheet, 2)`, then `sheet.composite()`.

## 11. Variation space

You decide the subject, paper size and tone, whether a toned ground is used, what is erased and redrawn, where the accent goes, the camera and the story. All far from our demo:

- Structures: **a night walk** (a black toned field, a street lifted out as a figure passes, ghosts of its earlier steps); **a studio inventory** (still-life objects drawn and then removed, each leaving a ghost, ending on the empty table); **a letter and its replies** (handwriting rubbed in, smudged, answered in the margins).
- Openings: **the paper pinned** to the board, still blank; **tone rubbed in** until a horizon appears; **one eraser stroke** lifting a first light out of a black sheet.
- Endings: **the sheet is unpinned and lifted**, every ghost visible at once; **the last mark is the accent**, alone on a cleaned field; **everything rubbed back to a toned ground** but one shape.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
