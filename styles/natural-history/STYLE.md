# Natural History Plate — Style Prompt

> A nineteenth-century hand-coloured scientific plate that comes alive: specimens are drawn in pen on warm foxed paper, washed with watercolour, labelled with figure numbers, leader lines and Latin names, and pinned to the page. The film is the making of a page of knowledge.
> References (grammar only): the engraved-and-hand-coloured zoological and botanical plates of the 1800s (specimens grouped on a ruled plate, "Fig." numbers, italic binomials, scale bars, sectional insets); herbarium sheets and pinned insect drawers; field-notebook pencil under-drawing. Never copy a real plate or title, or name one in the film.

## 1. Essence, and what it is not

1. **The sheet is an object**: warm laid paper, foxing, a pressed plate mark, a ruled border, a deckled edge. Everything on it is *on the paper*, never floating above it.
2. **Specimens are made in three passes you can watch**: graphite construction and outline, then fine pen ink (outline, hairline detail, stipple), then transparent watercolour laid last and left a little loose of the line.
3. **Information is part of the picture**: figure numbers, leader lines ending in a dot, Latin names, small-caps captions, scale bars and sectional or magnified insets. A plate without labels is only a drawing.
4. **Washes pool and granulate**: pigment collects darker at the edge of every wash, drifts in density, blooms in the odd back-run and settles into the grain of the paper.
5. **Things are pinned**: a finished specimen is fixed to the sheet by a brass pin; the plate is a collection that grows.

Not an engraving (`engraving`: monochrome burin, tone from hatching; here pen line, stipple and colour), not loose painterly watercolour (`watercolor`: washes without a drawn skeleton), not an isometric infographic (`iso-infographic`), not a sepia photo filter.

## 2. Materials & rendering

- **Paper** (world space, 1.5×): cream `~#f4e8cc`, mottling, fibre and grain, chain-line shadows, age toning toward the edges, foxing in clusters, an embossed plate mark (dark inside the top-left edge, light outside the bottom-right) and a double rule inset from it; a noisy deckle edge. On a pull-back it lies on dark baize with a soft shadow.
- **Pen ink** is one warm near-black (`~#2b1d12`), composited with *multiply*. A stroke is a polygon strip whose width follows the nib angle (thick down-stroke, hairline across), with a small blot where the nib lands and a flicked taper. Outlines ~1.5–3 px, veins and growth lines 0.4–0.7 px. Shadow-side contours are heavier. **Tone is stipple**: dots of 0.4–1.1 px from a jittered grid, probability following a tone field above a threshold, never a grey fill.
- **Wash engine**: each part is polygons plus a tone field (one light, upper left, for the whole film). Per pixel: pigment from tone and a slow density drift; **edge pooling** from a blurred mask; **blooms** (a lighter patch with a hard darker rim); **granulation** from world-anchored noise; colour mixed between a thin and a deep pigment. A 1–1.5 px misregistration against the ink and a pixel of spill. Layers *multiply*, so ink and paper show through.
- **Pencil**: graphite `~#625b52`, 0.6–0.8 px, doubled and wandering, with compass circles, axes and guide curves; it fades to a quarter when the wash is laid.
- **Labels and pins**: text is set letter by letter from a faint bleed to full ink; leaders are hairlines ending in a 2–3 px dot; the pin is a brass dome with a highlight and a cast shadow that shortens as it lands. Paper, ink, wash, text and pins are world-anchored; only the lamp pool and vignette are screen space.

## 3. Colour logic

- **Paper and ink are the two constants**; colour is wash only, in muted earth and mineral pigments, transparent, never opaque and never on lettering, rules or margins.
- **Each specimen has its own small palette** (two or three pigments plus a cool shadow wash), chosen from nature (sienna stripes on a pearl shell, yellow-green leaf with blue-green shade, chrome yellow petals); the plate as a whole stays within warm neutrals with one or two stronger notes.
- Colour arrives after the line; unwashed outlines are normal.
- Pins are the only metallic marks. No pure white or black: the lightest value is the paper, the darkest the ink.
- Example (not a rule): sienna `#b4642a`, pearl `#efe4cc`, leaf `#6c8a2c` over `#dfe590`, chrome yellow `#f7d443`.

## 4. Type & subtitles

- **Roman small capitals** for plate titles, captions and authorities (title 28–34 px with 0.2–0.25 em tracking; captions 20–24 px); **italic** for Latin binomials, part names and figure labels (20–26 px); both in a period face such as **IM Fell English** (OFL; roman and italic are in `core/fonts/`). Small caps are made from the face's capitals at ~78 % size. "Fig." italic, numerals roman.
- Subtitles are **captions on the plate**: a line of italic set under the figure it speaks about, or a ruled slip at the foot of the page, never a bar over the picture. Hold ≥ max(1.8 s, speech + 0.6 s). Text is *set* left to right, never faded in as a block.
- **Chinese type**: OFL CJK fonts subset to the characters used (TECHNIQUE §11): **Noto Serif SC** (SemiBold) for titles and captions in place of small caps, **LXGW WenKai** (OFL, kai hand) for italic-role labels and part names, at 1.15× the Latin size. Latin binomials stay italic, with the Chinese name beside them.

## 5. Motion quality

- **24 fps, on ones.** Ink is replayed in drawing order at a hand's pace: outline first, then interior lines, stipple last; wash spreads like a loaded brush from a touch point with a darker wet front that dries out of the rim.
- **Order is the choreography**: pencil → ink → wash → label → pin, one specimen at a time or overlapping by a beat; speed up as the plate fills.
- **Nothing is elastic.** A specimen never scales or bounces in; only pins drop (a short fall, a tiny ring) and pages turn.
- Pages turn, sheets slide, loupes open: slow starts, eased ends. The paper only moves with the camera.

## 6. Camera grammar

The camera looks straight down on a sheet lying on a table.

| Move | What it expresses | Can serve |
|---|---|---|
| Macro on blank paper | the first mark | construction lines; a detail to come |
| Slow push to a part | attention; the thing the label names | a structure; a texture; a measurement |
| Lateral track along the plate | reading order | a list; a comparison; a collection |
| Pull-back to the plate | the pattern across specimens | a reveal; a link between scales |
| Turn to the next page | the next case | a new chapter; a before/after |

Framing rules: at key beats the figure fills ≥ ⅓ of the frame height; the sheet fills the frame, or baize and deckle are shown deliberately on a pull-back; labels live in the paper around the figure. Transitions are made of paper and ink: a page turn, a sheet slid aside, a cut line crossing a figure. No fades or cross-dissolves between worlds.

## 7. Sound palette

- **Music**: small, dry, chamber: harpsichord or clavichord, pizzicato viola or cello, glass harmonica or celesta, soft recorder; plucked while ink is laid, a held bowed note when colour arrives. No cinematic strings or pads.
- **Foley carries the film**: graphite and dip-pen scratch, a wet brush swish, paper rustle and turning pages, a brass tick for the pin, a ruler's click.
- **Ambience**: a quiet study, a far clock.
- **Mix**: music ducks ~5 dB under voice and foley; −14 LUFS; light grain. **Voice**: a calm naturalist, few lines placed on the pin.

## 8. Native moves

A menu: use the ones your story needs.

- **The three passes.** Pencil construction, ink, then colour on one subject. *Fits content like:* a product anatomy; a recipe's ingredient; an engine part.
- **The pin.** A finished specimen drops its pin and its label is set. *Fits content like:* a list of findings; a timeline; a team.
- **The halving.** A dashed cut line crosses a figure and a sectional view is drawn beside it. *Fits content like:* a fruit, a battery, a building floor.
- **The loupe.** A ring opens on a detail and a magnified figure with its own scale bar is drawn in the margin. *Fits content like:* a pollen grain, a chip's die, a thread weave.
- **Pages that turn.** The sheet lifts and curls; the next plate holds only construction lines. *Fits content like:* chapters; seasons; before and after.
- **One guide, many figures.** A construction curve laid in pencil is reused by every figure. *Fits content like:* one growth law across species; a brand grid; one trend across regions.

## 9. Pitfalls of the medium

- Uniform width reads as vector art → drive width from nib angle and noise.
- Flat fills read as clip-art → pool the edge, drift the density, granulate.
- Wash exactly inside the ink reads as a colouring book → offset and spill.
- Stipple everywhere turns the plate sandy → shadow side only.
- Leaders crossing labels read as errors → route with clearance, dot on the part.
- Overlaps without occlusion → `cut` / `clip` the back part.
- Layers cached at 1× blur on a 2× push → cache at 2×.

## 10. Engine

In `demo/engine/`: `util.js` (seeded `Noise`, curves), `paper.js` (`buildPaper`, `buildTable`), `ink.js` (`stroke`, `InkSet` ordered replay, `stipple`, `pencilOf`), `wash.js` (`part`, `washSpecimen`, `revealWash`), `specimen.js` (`makeSpecimen`, `drawSpecimen` with `pencil / ink / wash` progress), `labels.js` (`inkText`, `figNo`, `leader`, `scaleBar`, `pin`, `cutLine`) and organism generators with anatomy parameters: `nautilus.js`, `snail.js`, `fern.js`, `sunflower.js`. `demo/film.js` composes the plate and timeline; `node core/render/still.mjs styles/natural-history/demo <t>` renders any moment. A minimal drawing that is not in the demo: `makeSpecimen({ parts:[part({polys:[ellipse(500,500,120,70)], tone:(x,y)=>(y-430)/140})], ink:new InkSet().add(stroke(ellipse(500,500,120,70),{w:2.4})) })`, then `drawSpecimen(ctx, sp, {pencil:1, ink:1, wash:1})` over `buildPaper()`.

## 11. Variation space

You decide the subject, specimens, layout, pigments (within the colour logic), order of passes, camera and story. Any organism or object can be a specimen if its anatomy is built as parameters.

- Structures: **a book of plates** (one case per page); **a dissection** (whole → halved → magnified, labels in teaching order); **a collection grows** (a new pin each week).
- Openings: **compass circles on blank paper**; **a loupe over a finished plate**; **a specimen lifted away, leaving its pencil ghost**.
- Endings: **the plate closed into a folio**; **one natural-size figure alone**; **a new sheet with only construction lines**.

Information order: a species card (name → three labels → scale → range); a process plate (parts as figures in the order used, one pin each); a glossary (term → figure → one line).

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
