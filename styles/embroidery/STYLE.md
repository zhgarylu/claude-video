# Embroidery & Knit — Style Prompt

> Images built from thread on cloth. Every shape is made of visible stitches that grow point by point as a needle pulls the thread through; chunky textures are knitted yarn. The film is the act of stitching.
> References (grammar only): the Bayeux Tapestry and traditional samplers — a story told in a limited floss palette, with the stitch type as the drawing vocabulary; sashiko and Western visible mending — the repair as the decoration; handmade felt-and-wool stop-motion inserts — real fibre, real shadow, handmade tempo. Do not copy any specific pattern, sampler, character or title design, and never name them in the film.

## 1. Essence, and what it is not

- **Everything is thread.** Every coloured shape is built of individual stitches you can count: satin rows, stem-stitch ropes, French knots, running stitches, knit V's. There are no flat fills and no outlines drawn with a stroke.
- **The ground is cloth**: a visible plain weave (linen, cotton), felt, or a knit. The weave shows between and under the stitches.
- **Thread has direction and sheen.** A stitch is lit like a twisted cylinder; the brightness of a satin area changes with the angle of its stitches, so a petal's two halves read as two tones.
- **Things are made, not shown**: stitches grow in order, with a needle and a trailing thread; a finished stitch tightens from a loose bow.
- **Handwork scale**: satin and stem thread is 6–9 px wide at 1080p and the weave pitch is about 5 px: fine enough to read as cloth, big enough to read as stitches.

Not paper-cut or felt-craft collage (those are cut shapes with flat edges; here edges are made of thread ends), not cross-stitch pixel art (no grid of X's unless the story asks for a sampler), not a knitted-wool stop-motion toy (that is a 3D object; this is a flat worked surface seen from above).

## 2. Materials & rendering

- **The thread segment is the unit of rendering.** One stitch is one capsule from point *a* to point *b*: a gradient across its width (lit edge, highlight, body, shadow edge; light from the upper left), 3–4 fibre strands along it, slanted twist marks every ~0.6 × width, rounded ends that sink into small dark entry holes, and a short soft cast shadow on the cloth. A satin area is hundreds of these side by side; the ridged look comes from each stitch shadowing its neighbour.
- **Sheen by direction.** Per stitch, measure how far its axis lies across the light direction; highlight strength and body tone scale with it (gloss 0.4–0.7 for cotton and rayon floss, ≤ 0.15 for wool yarn). Add ±3 % tone per stitch.
- **Stitch vocabulary** (each is generated, not painted):
  - *Satin*: parallel or fanned stitches edge to edge; a leaf is two halves of slanted stitches meeting at a vein; a disc gets a tone dome.
  - *Stem / outline*: each stitch advances three steps and rises half-way back, leaving a slanted rope.
  - *French knot*: a bobbly coil with a dimple and a sink ring, 8–14 px.
  - *Running stitch*: dashes. Couching, chain and blanket stitch are allowed variants.
  - *Satin lettering*: text rasterised to a mask, then filled with parallel stitches (no outline).
  - *Knit*: a grid of V's, each V two plied yarn legs with a halo of fibres; rows are drawn bottom to top so each row tucks under the one above; a hole shows the dark inside of the garment; a darn is warp first, then weft woven over and under, with the warp redrawn over the weft at every "under".
- **Cloth**: plain weave drawn as individual over/under crossings (per-thread tone, slubs, a lit top edge and a shaded bottom edge on each crossing) with soft mottling. Felt is a screen-space fibre texture. The hoop is a wooden band with grain, a brass screw bracket and a soft cast shadow.
- **World-anchored vs screen space**: weave, stitches, knit and thread shadows belong to the cloth and scale and move with the camera (canvas shadow offsets and blur are screen pixels: scale them by the zoom by hand). Vignette and film grain live in screen space.
- **Light is fixed**: one soft key from the upper left for the whole film. Nothing glows; no emissive thread.

## 3. Colour logic

- **A closed floss box of 6–8 colours per film**, like a thread box: muted, dyed-looking hues (madder red, mustard, moss, indigo, ecru, charcoal, one teal or rose). Pure black and pure white are never used; charcoal and ecru stand in.
- **The ground is neutral and warm** (oatmeal linen, undyed cotton) or one deep dyed colour (a knit, felt). The cloth is never the same hue as the thread that sits on it.
- **One main colour carries the subject; one contrasting colour is reserved for the repair, the point, the thing the film is about.** Greens and neutrals do the supporting work.
- Value order: the focal stitches are the lightest or most saturated thing in the frame; the surroundings (felt table, hoop, the rest of the knit) fall toward dark in a vignette.
- Example palette (not a rule): linen `#D8CBAE`, madder `#B0372B`, mustard `#D8A52F`, moss `#5F8236`, indigo `#2C4B82`, ecru `#EFE6CF`, charcoal `#2C2A2F`, felt `#303E42`.

## 4. Type & subtitles

- **Subtitles are woven labels**: a cream twill tape with a stitched selvage (running stitch along both edges), carrying text lettered in satin stitch (3–3.5 px thread, charcoal or the film's dark colour). A rounded, even-stroke face (e.g. Fredoka 600, OFL) survives being made of 3 px stitches; hairline serifs do not. Text height ≥ 36 px at 1080p.
- **Titles are lettered directly on the cloth** in satin stitch (large strokes, 6–8 px thread) or in backstitch script, growing letter by letter in writing order. Never a font drawn flat over the film.
- Reading time: hold ≥ max(1.8 s, speech + 0.6 s). A label arrives by being "sewn on" (selvage stitches first, then the letters) and leaves by sliding off the frame.
- Text colours come from the floss box. Keep the label clear of the working area.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): ZCOOL XiaoWei or Noto Serif SC (Bold) as the glyph source for woven-tape lettering. Take the outline, fill it with satin-stitch rows along the stroke direction, and keep characters ≥ 56 px so the stitches stay countable. Dense characters need a thicker weight than Latin.

## 5. Motion quality

- **24 fps, on ones.** The needle and the thread move smoothly; every stitch is eased in time (ease-out along its length: pulled through fast, slowing as it seats).
- **A stitch has three phases**: the needle arrives (anticipation, ~3 frames), the thread is pulled through from `a` to `b`, and it settles from a loose bow into a taut line (~0.2 s). A knot pops with a small overshoot spring.
- **Stitch order is choreography**: the order stitches are laid is the order the eye reads the picture. Fill from one side to the other, base to tip, centre outwards. Start slowly, then accelerate as the pattern becomes rhythmic.
- **The needle is lifted off the cloth**: slightly foreshortened, with a larger, softer shadow than the thread, and a thread that hangs in a loose curve to a free end lying on the cloth.
- **What never moves**: the weave and the pattern already stitched. Cloth breathes at most 1–2 px; nothing is rubber-elastic; knit does not wobble.
- Cloth can be pulled and released, a hoop turned, thread unpicked (growth in reverse).

## 6. Camera grammar

A vocabulary, not a route. The camera looks straight down at the cloth like a person leaning over a table; depth comes from layers (felt, hoop, cloth, stitches, lifted needle).

| Move | What it expresses | Can serve |
|---|---|---|
| Locked top-down, whole hoop | an object being made; calm | a title; a progress shot; a finished piece |
| Slow push-in to the needle | attention; a moment of skill | a first stitch; a delicate detail; a decision |
| Macro with a lateral glide | texture and sheen: the stitches are the landscape | a material close-up; a process lesson |
| Pan along a seam or a stem | following the thread of the story | a timeline; a journey; a list |
| Pull-back to the whole garment, room or person | the small repair belongs to a life | a reveal; a link between scales |
| Hoop turns over | the back of the work: the knots behind the clean front | honesty; effort; behind the scenes |
| Hold on the finished surface | reading time | a decision; an insert; a thank-you |

Framing rules: at key beats the stitched subject fills at least a third of the frame height; the needle and its thread stay inside the frame; subtitles sit on the label, off the work. Transitions are made of cloth and thread: a cloth sliding across as a wipe, a hoop being swapped, a pulled thread unravelling the previous image, a knit row folding into the next scene. No default fades or cross-dissolves.

## 7. Sound palette

- **Music**: small, handmade, acoustic: nylon-string guitar or ukulele, kalimba, celesta or music box, felted piano, a hand-played shaker, a soft viola or cello line, a hummed voice. Plucked and tapped attacks (the same grammar as a needle) over sustained bowed notes. No synth pads, no big-band or cinematic strings.
- **Foley carries the film**: the needle piercing cloth (a soft tick, brighter on linen than on knit), the thread pulled through (a thin dry zip whose pitch rises with the length pulled), a knot popping (a very small tap), scissors snipping floss, a wooden hoop knocking the table, the brass screw turning, wool rubbing, a cloth laid down.
- **Ambience**: a quiet room, a clock or kettle far away, fabric movement; a low, warm room tone under everything.
- **Silence is a tool**: a held beat before the last stitch or before the needle comes down on the key point; the first sound afterwards is the thread being pulled.
- **Mix**: music ducks ~5 dB under voice and foley ~3 dB; −14 LUFS; light film grain (grain ≤ 2).
- **Voice**: close, warm, unhurried, as if from the person at the table; few lines, placed on stitch beats.

## 8. Native moves

A menu: use the ones your story needs.

- **Growing stitch by stitch.** A shape appears only as fast as the needle can make it; the order of stitches is the reading order. *Fits content like:* a skyline built row by row; a bar chart whose bars are satin columns; a recipe's ingredients appearing in the order they are used.
- **The thread pull.** A long stitch is yanked tight and the cloth puckers along it, closing a gap. *Fits content like:* two sides of a contract drawn together; a split in a plan closed; a tear in anything being shut.
- **Knit unravels and re-knits.** Pulling one thread dissolves a knit row by row; run backwards it re-forms. *Fits content like:* a habit coming apart; a supply chain; a product that can be repaired instead of replaced.
- **Darning and the visible mend.** A hole is crossed by warp threads, then woven with weft: the repair is more beautiful than the original. *Fits content like:* a company fixing a mistake; a town rebuilding; a skill passed on.
- **The back of the work.** The hoop flips and shows the tangled knots and carried threads that make the clean front possible. *Fits content like:* the effort behind a launch; a long trip's logistics; a craftsperson's studio.
- **Thread as a line that travels.** One running stitch crosses the cloth as a path, route or graph line, then becomes a fabric edge. *Fits content like:* a hike; a delivery route; a data series.
- **Re-stitching in a new colour.** The same shape sewn over in another floss: new stitches lie over old. *Fits content like:* seasons; a rebrand; before and after.

## 9. Pitfalls of the medium

- **Vector-flat fills**: any shape without visible stitches reads as a graphic. Fill with stitches, even tiny ones.
- **Thread too thin or too uniform**: below ~4 px the sheen and twist vanish and the picture becomes a noisy gradient. Keep satin ≥ 6 px; vary tone ±3 % per stitch.
- **All stitches lying the same way**: one angle across a petal looks like paint. Change direction by region (leaf halves, petal fans).
- **Straight, rigid threads**: real floss bows slightly until pulled; give loose stitches a small bow that relaxes.
- **Shadows that do not scale**: canvas shadow offsets and blur are screen pixels; scale them with zoom or macro shots look flat.
- **Satin stitches that run too long** (> ~30 px at 1080p) look loose; split long runs (long-and-short).
- **Knit as a repeating bitmap**: vary row tone, stitch size and let the edge fray; keep a mid-dark ground behind the V's so the legs read.
- **A needle with no thread**: the needle is always tied to the thread that makes the stitch, in that stitch's colour.
- **A perfectly clean hoop on a perfectly clean weave**: add grain, a clipped end, a stray thread.
- **Text drawn flat**: if the type is not stitched it breaks the world.

## 10. Engine

In `demo/engine/`: `thread.js` (the rasterizer: `thread`, `knot`, `needle`, `loose`, the palette and colour helpers, the fixed light and `ENV.z`), `fabric.js` (`linen` plain weave, `felt`, `hoopRing`), `scene.js` (stitch makers `stemStitch`, `satinLeaf`, `fanPetal`, `satinDisc`, `satinText`, `knotItem`; the timeline `seq` / `at`; `Scene`, which draws every stitch up to time `t`, pulls the current one through and places the needle), `knit.js` (`knitGround`, `frayInto`, `darn`). `demo/film.js` composes them into shots and `demo/index.html` exposes `render(t)`; a still of a shot comes from `node core/render/still.mjs styles/embroidery/demo <t> --q 'shot=hoop'` (also `darn`, `macro`). A minimal drawing that is not in the demo: `new Scene().add(seq(stemStitch([{x:200,y:800},{x:900,y:300}], {col: FLOSS.indigo, seed: 1}), 0, 3)).draw(ctx, 2)` on a `linen` ground.

## 11. Variation space

You decide the subject, the ground (linen, felt, knit, canvas), the floss box, what is stitched in which order, where the needle works, how the thread is pulled, the camera and the story. All far from our demo:

- Structures: **a map sewn live** (a route running-stitched across felt while landmarks are French-knotted at each stop); **a chart that grows** (bars as satin columns, a line as a thread climbing a grid, knots for outliers); **a sampler lesson** (alphabet and borders stitched in the order they are taught, ending in a name).
- Openings: **a single knot pulled tight** in the middle of the frame; **a skein falling open** into the first stitched line; **the hoop swung into place** over an empty cloth.
- Endings: **the thread is cut** and the loose end curls away; **the hoop flips to show the back**; **the stitched picture is lifted off the table** and becomes a patch on a jacket.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
