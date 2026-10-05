# Cyanotype — Style Prompt

> The sun-print: paper brushed by hand with iron salts, exposed to daylight with things laid on it, washed in water. The film is a contact print that develops in front of the viewer: yellow-green, then Prussian blue, then white shapes blooming under water.
> References (grammar only): 19th-century botanical sun-print albums for the white-on-blue plate and the hand-lettered label; darkroom and alt-process craft films for the pace of one hand-made step at a time; contact sheets for the frame of many small prints. Never copy a real plate, plant list, caption or date, never name a real photographer or collection.

## 1. Essence, and what it is not

- **A photographic contact print, not a drawing**: every shape is a shadow of something that lay on the paper; edges are the object's own edge (sharp when it lay flat, soft when it was lifted).
- **Two stages of colour**: before the wash the paper is yellow-green, then slate and bronze; after the wash it is Prussian blue with paper-white (or pale cyan) shadows. The wash is the reveal.
- **A hand-coated sheet**: brush strokes, a bead of pooled coat at the edges, pin holes, an uneven border of bare paper with a torn, deckled edge.
- **Water leaves marks**: tide lines, drips, a wet sheen that fades as the print dries and darkens.
- **Hand lettering**: white gel pen on the blue, blue-black ink on the bare border.

Not a blueprint (no engineering drawing, no line grid, no dimension lines, no crisp CAD white-on-blue: a blueprint is drawn, a cyanotype is exposed). Not a negative-film inversion filter (the blue comes from a coating map and a dose, not a colour curve). Not an ink-wash or watercolour (no pigment flow; the density comes from light).

## 2. Materials & rendering

- **A sheet is a pipeline, not an image.** Keep four maps per sheet in sheet pixels: the *coat* (brushed thickness, 0 on the border), the *light* (how much UV passes whatever lies on the paper: 1 clear, 0 opaque, 0.1–0.5 for leaves and feathers), the *front* (the order in which water reaches each pixel) and the *tooth* (paper fibre). A state `{dose, wash, dry, brushKey}` turns them into pixels each frame.
- **Exposure**: density after the wash is `1 − exp(−(E/E0)^g)` with `E = dose × (light + fog × (1 − light))`; the toe (g > 1) makes short exposures pale and the stray-light term fogs thin objects when the exposure is too long. This is what makes a test strip honest.
- **Before the wash** the colour follows the dose along a lookup: lime → grey-green → slate → bronze. After the wash it follows a second lookup from paper white through pale cyan to deep Prussian. Dry prints are darker than wet ones (scale the density by 0.6–1.0).
- **The wash front** is an organic edge (noise-warped, never a straight wipe) with a thin bright rim; behind it the print is wet: highlights drifting in the flow direction, lighter colour.
- **Surfaces**: warm bare paper with fibres (draw several thousand short curved strokes once, read them back as a tooth map), a deckled edge from layered noise, a soft contact shadow under every sheet (stronger and wider when it is lifted). The room behind is dark linen (or a pale wall for hung prints), never a gradient backdrop.
- **Objects** (leaves, feathers, lace, a cut-paper plan) are drawn twice from the same geometry: grey transmission for the light map, colour for the sprite that falls, lies and lifts. All procedural; the print and the sprite must match because they are the same shapes.

## 3. Colour logic

- **Three families**: Prussian blue (the ink), paper cream (the ground and the whites), and a yellow-green that exists only before the wash. Everything else is either a neutral room (charcoal, slate, plaster) or the colour of the objects themselves.
- **Blue is never flat**: the density follows the coat map (brush marks, overlaps, beads) and the dose. Shadows are white or a pale cyan, never grey.
- **The yellow-green is a time marker**: it is on screen only for coated, unwashed paper, and the moment it turns blue is the story.
- **Light**: warm daylight is a screen overlay with dappled leaf shadows; it is on only while the sun is working.
- Example palette: paper `#f4f0e2`, Prussian ramp `#0a2250 → #2062a0 → #b2d7e4`, coat `#cfd87e`, room `#1e2428`, ink `#143a74`, gel pen `#fafcff`.

## 4. Type & subtitles

- **Gel pen** (an OFL handwriting face, e.g. Caveat Bold) for titles and notes on the blue, white; **blue-black ink** in the same hand on the bare border. Text is *written*: a clip that moves along the baseline with a small pen nib, never faded in.
- Sizes: title 150–220 px, labels 40–70 px. Hold a title at least 4 s; every label at least letters ÷ 15 + 1.5 s.
- **Subtitles are paper slips**: a deckle-edged cream strip at the bottom with a typewriter face (Courier Prime Bold or similar) in the ink blue, wiped on from the left; two lines above 50 characters. Hold ≥ max(1.8 s, speech + 0.6 s). Keep the lower 130 px of the frame free of the action.

## 5. Motion quality

- **24 fps, smooth**; the print itself changes continuously (exposure and wash are functions of time), the objects move with weight.
- **Objects fall, rest and lift**: a short drop with an ease-in and a tiny settle, a lift with a growing shadow and a fade; sheets lift with scale, tilt and shadow.
- **Exposure is time-lapse**: seconds stand for minutes, and a card drawn off in jerks on the beat gives bands.
- **Wet things move down**: sheen slides in the direction water runs; drips gather, hang and fall with gravity.
- Pen strokes ease; a card slides with a hard stop; glass slides with a slower ease and a clink at the end.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Slow push on a whole sheet | the print is the subject | a reveal; a title; a quiet reading moment |
| Lateral pan with a moving edge | a process advancing across the paper | a test strip; a timeline; a row of cases |
| Push into a few fibres | the one detail that matters | a decision; evidence; a fact to remember |
| Pull out to a line of prints | scale, a collection, "there are more" | an archive; a series; an ending |
| Sheet-lift | change of subject without a cut | a new chapter; a new step; time passing |
| Locked frame, held | reading time, patience | exposure; drying; a pause before the turn |

Framing: the sheet fills at least 60 % of the frame height at key moments, captions never cover the action, labels sit on the border or on flat blue. Transitions come from the medium: a sheet lifted off the one below, an exposure flash (sun floods the frame), a wash front. No dissolves or wipes.

## 7. Sound palette

- **Music**: soft, dry and a little glassy: thumb-piano tines, a bowed-glass pad, small bells, a round sine bass, a quiet shaker. A pentatonic mode keeps it open; the picture and the score can share data (one note per band of a test strip).
- **Foley is the matter of the medium**: running and dripping water, brush bristles on paper, wet slaps, leaves and feathers landing, a glass pane sliding and clinking, a card scraping, a pen scratching, a sun hum with a high shimmer, wooden pegs.
- **Silence** is a tool: let the room go still before the turn (a single drip is enough) and let the first sound after it be a long, low one (a bowl).
- **Mix**: voice about 10 dB above the music, music ducked under speech, −14 LUFS. No reverb on foley; a short bright room on the music only.
- **Voice**: calm, close, plain sentences; a clear narrator beats a characterful one.

## 8. Native moves

- **Exposure develops.** Coated paper goes from yellow-green to blue-grey under the sun. *Fits content like:* a time-lapse of anything slowly changing; waiting; a before/after.
- **The wash-out reveal.** Water runs over a grey sheet and the covered shapes bloom white. *Fits content like:* a discovery; a diagnosis; a hidden structure appearing.
- **Test strip.** A card is drawn off in steps; each band has had a different dose. *Fits content like:* settings and trade-offs; a price tier list; a how-much-is-enough question.
- **Objects lifted, ghosts left.** Whatever lay on the sheet rises and its pale shape stays. *Fits content like:* absence, memory, a removed building, a person who left.
- **Negative to positive.** A transparency print turns lights into darks. *Fits content like:* a map from a plan; a family photograph; a scan.
- **Double exposure.** Two sets of objects, two sun times; their shadows overlap. *Fits content like:* two eras of a place; a before and after of a city block; a collaboration.
- **Drying darkens.** The print deepens as it dries, tide lines appear. *Fits content like:* patience; ageing; a thing that improves with time.
- **Contact frame.** A line or sheet of many small prints. *Fits content like:* an archive; a season; a catalogue.

## 9. Pitfalls of the medium

- **Straight wash edges and flat fills** look like a vector wipe → warp the front with noise, give it a rim, and let coat marks show through.
- **Pure grey shadows** read as a greyscale filter → shadows are white or pale cyan; fog from long exposure is blue-grey, not neutral.
- **Everything the same blue** → vary the dose (bands, thin objects), the coat thickness and the dry state.
- **Too-clean sheets** → keep fibre, pin holes, a bead at the coat edge, an uneven border.
- **Dark sun overlays** crush the exposure scenes → keep the dappled multiply light below about 35 %.
- **Wide soft sheens** make the print look like clouds → stretch them along the direction the water runs.

## 10. Engine

In `demo/`: `engine/plate.js` (the sheet pipeline: `new Plate({w,h,seed,coat,front,sheen,tide})`, `setLight(draw, blur)`, `render(state)`), `engine/shapes.js` (`frond`, `feather`, `fan`, `umbel`, `grass`, `plan`, each in `'mask'` or `'color'` mode), `engine/noise.js`, `main.js` (sheet lift, card, glass, brush, pen text, wall and line, caption slips), `timeline.js` (times, camera keys, one event list for picture and sound), `mix.py` (score, foley, mix). A minimal sheet that is not in the demo:

```js
const p = new Plate({ w: 900, h: 600, seed: 3, coat: { x0: 60, x1: 840, y0: 50, y1: 540, strokeH: 190 } });
p.setLight(g => umbel(g, 450, 260, 160, { mode: 'mask' }), 0.8);
ctx.drawImage(p.render({ dose: 6, wash: 2, dry: 1 }), 0, 0);
```

File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the subject, what lies on the sheet, the structure, the opening, the ending, the room, the camera path and the score within the colour logic. All far from our demo:

- Structures: **a double exposure** (two eras of one street, a plan and a photograph, printed in turn onto one sheet); **a contact frame** (nine small prints, one per day; the last is empty because the object was lifted); **a map made from a model** (a cut-paper plan of a neighbourhood is laid down and the sun draws the district, with a negative flipped into a positive).
- Openings: **bare paper and a brush** laying the coat before anything is said; **a sheet pulled from a tray** dripping, with the picture already visible; **a hand-written label** in white on a blue that is still empty.
- Endings: **objects lifted off** and the ghosts stay, to silence; **the print drying** on a line as the room goes dark; **a negative flipped into a positive** that turns out to be a face the film never named.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
