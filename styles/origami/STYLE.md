# Origami Fold — Style Prompt

> Everything is one folded sheet of paper on a paper tabletop. A two-sided sheet folds along real crease lines into its subject, shows the fold diagram that explains the move, and unfolds back to flat to change scene.
> References (grammar only): origami instruction sheets (valley and mountain line conventions, fold arrows, numbered steps); crease-pattern drawings; rigid-origami engineering folds (pleats, tessellations); macro paper photography under one desk lamp. Never copy a model's published sequence, a diagram's artwork or a paper brand, and never name them in the film.

## 1. Essence, and what it is not

- **One sheet, two faces.** A different colour or print on each side, so every fold flips the colour you see. Layers, flaps and stacks all obey one hinge model.
- **Creases are the drawing.** A made crease keeps a thin worn line and a slight valley or ridge forever; unfolding the sheet shows the whole crease pattern as the record of what was done.
- **Real paper under a real lamp**: visible fibre, thickness at every cut edge, one soft key, contact shadows on a paper tabletop. Paper hinges, curls a little, lands and stays; it never stretches, squashes or wobbles.
- **The diagram is native.** Dashed valley lines, dash-dot mountain lines, curved fold arrows and numbered step badges sit over the photo in ink, exactly as in an instruction sheet.

Not a pop-up book (a stage of cut cards springing from a page), not a papercut (no scissors, no backlight), not stop-motion craft (no hands, no glue: the motion is exact and eased).

## 2. Materials & rendering

- **Fold model.** Polygon facets in the sheet's paper coordinates, flat at rest. A fold cuts the facets crossing a crease line and gives every piece on the moving side one more hinge rotation about an axis kept in the frame of a stationary neighbour. Valley folds swing the flap up and over, mountain folds behind. Any fold runs backwards.
- **Layers.** Flat folds reverse the order of the moving stack and set it on top (valley) or under (mountain); the hinge axis sits at the height of the stack edge, so a flap never sweeps through the layers beneath. Thickness is real geometry (≈ 0.2–0.3 mm on a 150 mm sheet): each cut edge is a cream strip, each layer its own surface.
- **No polygon may pass through another.** Sample every fold sequence: triangles of different facets (shrunk a few percent so a shared hinge does not count) must never intersect.
- **Flap curl.** A moving flap bows: far vertices lead by a few degrees at mid-fold and the bow vanishes on landing. Parallel accordion creases stay rigid.
- **Two-sided shading.** One material, front or back chosen by facing; colours are printed in sheet coordinates. Fibre is one height map (strands, grain) turned into a normal map.
- **Creases are analytic**, in the shader, from crease segments in sheet space: a narrow broken pale line (stronger with wear), soft shoulder darkening, a few degrees of normal tilt either side signed valley or mountain. They switch on when the fold is first made and stay.
- **Light.** One soft spotlight with a wide penumbra from the front-left, a weak cool fill, a dim studio environment, a large soft shadow map; ambient occlusion with a centimetre radius for contact shadows between layers; physical depth of field. Neutral tone mapping (ACES shifts paper colours).
- **Screen space vs world.** Paper, creases and fibre live in sheet space; vignette and grain in screen space; the diagram layer is 2D, drawn from world points through the camera.

## 3. Colour logic

- **A closed box of 3–4 paper colours per film**, dyed-looking and slightly desaturated, plus cream for edges and plain faces. No pure black or white: ink is deep indigo, white is cream.
- **The tabletop is a neutral warm greige paper**, darker than the cream and never the hue of the sheet that lies on it. The subject is always the most saturated thing in the frame.
- **Each face has its own role** (outside, inside, print); the story keeps the roles.
- **Diagram ink is one indigo** with a cream halo; on a dark face lines may switch to cream.
- Example palette (not a rule): persimmon `#f0a07a`, indigo `#7a97cf`, cream `#f1eadb`, tabletop `#d0cbbf`, ink `#1c2748`.

## 4. Type & subtitles

- **Typeface**: a rounded, even-stroke sans (Fredoka 500–700, OFL) for step badges, labels and subtitles; a soft serif (e.g. IM Fell English, OFL) for a title only if the film needs one.
- **Subtitles are printed labels**: a cream card with a hairline edge and indigo type, ≥ 36 px at 1080p, low in the frame on the tabletop, never on the sheet. Hold ≥ max(1.8 s, speech + 0.6 s). Labels slide in flat along the table and slide out.
- **Step badges**: a filled indigo circle with a cream numeral at the start of a fold line.
- **Titles are folded**: lettering formed by creases and shadow, or a card standing on the table; never a font flat over the film.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): Noto Sans SC (Medium or Bold) for labels and subtitles, ZCOOL XiaoWei or Noto Serif SC (Bold) for a title; keep Fredoka for numerals and Latin. Characters ≥ 40 px, slightly heavier than the Latin; re-subset after every text change.

## 5. Motion quality

- **24 fps, on ones.** Camera, light and fold are smooth every frame; a fold is a pure function of time.
- **A fold has three phases**: a small lift off the table (~4 frames), an ease-in-out swing, and a landing that stops dead. Never a spring or overshoot: paper does not bounce.
- **Parallel creases move together; creases that cross, and stacks that nest, fold one after another**, never overlapping.
- **Diagram lines draw themselves** before the paper follows: dashed line grows along the crease, then the arrow.
- **What never moves**: the tabletop, the lamp, a finished crease.

## 6. Camera grammar

A vocabulary, not a route: a real lens over a table, top-down for plans, oblique for forms.

| Move | What it expresses | Can serve |
|---|---|---|
| Locked top-down | a plan, a pattern, an instruction sheet | a crease pattern; a count; a before/after |
| Slow push-in on the hinge | the exact place the paper bends | the key fold; a mechanism |
| Low oblique macro, shallow focus | form, thickness, layers | a finished shape; stacked folds |
| Overhead pull-back | the packet is small, the sheet was big | a scale reveal; a summary |
Framing rules: at key beats the folded subject fills at least a third of the frame height; the diagram never hides the hinge; subtitles sit on the table. Transitions are made of paper: the sheet unfolds back to its crease pattern and the pattern folds into the next subject, or a sheet slides across the frame. No dissolves, no wipes that are not paper.

## 7. Sound palette

- **Foley carries the film**: a fold is a dry paper swish with a soft crease crackle; a landing a tiny felt tap; a stack of layers a thick pat; unfolding a longer fibrous rustle; an accordion closing fast rustles rising in pitch; a drawn diagram line a faint pencil tick.
- **Music**: small, dry, wooden and close: marimba, kalimba, pizzicato strings, celesta, brushes; plucked and tapped attacks, pentatonic or modal; no cinematic strings or pads.
- **Ambience**: a quiet room, a faint lamp hum. **Silence** before the fold that matters; the first sound after it is the crease.
- **Mix**: voice high-passed and compressed, ~10 dB above the music, music ducked under speech; −14 LUFS; grain ≤ 1.5. Voice: calm, precise, a teacher's, few words per fold.

## 8. Native moves

A menu: use the ones your story needs.

- **The fold that flips the colour.** A flap swings over and the sheet changes colour. *Fits content like:* a before/after; a product's inside revealed; a decision with two sides.
- **Halving.** Each fold doubles the layers and halves the area; the stack's thickness grows visibly. *Fits content like:* exponential growth; a recursive process; compounding savings or doubling time.
- **Crease-pattern reveal.** The sheet unfolds to flat and its creases appear as a drawn diagram with valley and mountain lines. *Fits content like:* a record of past steps; the plan behind a result; a change of scene.
- **Accordion collapse.** Parallel pleats close together, the sheet packs into a block, then one pull opens it. *Fits content like:* compact packaging; a deployable structure; a timeline folded into a day.
- **Fold diagram step.** Dashed line, arrow and badge precede each fold. *Fits content like:* a how-to; an assembly guide; a recipe's technique.

## 9. Pitfalls of the medium

- **Coplanar layers flicker** → give each layer its own height from its stack order, and a real thickness.
- **A flap that sweeps through the stack** → hinge axis at the height of the stack edge, never at the table.
- **Overlapping folds that cross or nest** pass through each other → one after another; only parallel pleats move together.
- **Crease shading drawn wide** reads as a smudge → pale line a few tenths of a mm, broken by noise.
- **Saturated paper turns neon under strong light** → paler dyes, softer light.
- **A turned sheet shows the wrong face** → choose the face by facing, never by a flipped scale.
- **Thick stacks** need the rounded fold edge (a curled strip at each hinge) or they look cut.

## 10. Engine

In `demo/engine/` (three.js r170 + Canvas2D): `fold.js` (`Sheet`: `fold({a, b, side, kind, keys, mode, angle, curl})`, `build`, `update(t)`, `toWorld`; hinge chain, layer stacking, rounded fold-edge ribbons), `paper.js` (textures, shader creases), `world.js` (`makeWorld`: lamp, table, camera, post; `mount`), `diagram.js` (`creaseLine`, `foldArrow`, `badge`, `legend`). `demo/models.js` has example sequences, `demo/foldcheck.mjs` the intersection test, `demo/timeline.js` the beat grid. Proof shots: `node core/render/still.mjs styles/origami/demo/proof 0.5 --q 'shot=hero'` (also `seq`, `creases`, `fan`). A minimal fold not in the demo: `const s = new Sheet({ w: .15 }); s.fold({ a: [-1, .02], b: [1, .02], side: 'L', kind: 'mountain', keys: [0, 1] }); world.mount(s, { front: '#c9d6a0', back: '#f1eadb' });`.

## 11. Variation space

You decide the subject, the sheet's two faces, the number and kind of folds, the camera, the pacing and the story. All far from our demo:

- Structures: **an instruction sheet that performs itself** (numbered steps, each ending on a held model); **one sheet, several lives** (one crease pattern folded into three forms, each reached through the flat sheet); **a sheet that unfolds a letter**.
- Openings: **the crease pattern on screen**, folding itself; **a fold caught mid-swing**; **a stack of identical sheets**, one sliding out.
- Endings: **the finished form stands alone**; **the sheet unfolds to flat**, its pattern the last image; **the paper slides off the table**, carrying the model.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
