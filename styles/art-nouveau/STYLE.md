# Art Nouveau — Style Prompt

> A Paris lithograph poster of 1890–1910 that grows: flat muted fills held by a firm brown contour of varying width, whiplash curves, botanical stylisation, a halo roundel behind the figure, lettering drawn to fit the frame. Motion is slow organic growth: stems extend, tips unfurl, mosaic is laid tessera by tessera.
> References (grammar only): belle-époque decorative panels and theatre posters (arch or roundel, figure before a halo, lettering inside the picture); Guimard's Métro entrances and Lalique glass (the plant as structure); Byzantine mosaic as Art Nouveau reused it. Never copy a poster, figure or typeface design, and never name them in the film.

## 1. Essence, and what it is not

- **One curve rules the frame**: the whiplash, a line whose curvature changes smoothly and ends in a spiral. Stems, hair, folds, lettering tails and filigree are the same curve.
- **Flat muted fills inside a firm dark-brown contour** that swells and thins with direction; one flat shade crescent per shape; no gradients, no airbrush.
- **A decorative frame holds the picture**: an arch or circle with a beaded band; a **halo roundel** (rays, pearls, a mosaic ring) behind the central figure; figure and plants may break the frame.
- **Dense but ordered**: lattice, tesserae, filigree and pearl borders stay pale so figure, flower and lettering read first.
- **Lettering belongs to the picture**: custom capitals that bend with the arch, end in curled sprouts and are drawn on in writing order.

Not Art Deco (no straight lines, machine symmetry or metallic gradient), not ukiyo-e (no woodgrain, no black key block), not stained glass (no leading, no backlight), not floral wallpaper (there is a focal figure).

## 2. Materials & rendering

- **The ink line** (`inkLine`, `shape`): a ribbon of varying width, not a stroked path. On a closed shape it is ~80 % thicker on the side away from the light (upper left); an open stroke swells in the middle and tapers at both ends. 2–4.5 px at 1080p, 5–6 px for the outermost shape. Dark brown, never black.
- **Flat fill + one shade crescent**: clip to the shape and fill what the shape shifted towards the light does not cover. Nothing else models form.
- **The whiplash generator** (`whip`): heading is a smooth function of arc length (slow wave, drift, a final clothoid curl) integrated to a path. Growth `g` extends it from the base; the growing end carries a fiddlehead curl that unwinds as `g` → 1.
- **Ribbons** (`ribbonPoly`): a width profile turns any whiplash path into a stem, blade, lock or fold; one half is a tone darker.
- **Botanicals**: bent-midrib leaves in two tones, sword blades, irises from petals on drooping axes (standards, falls, beard), small blossoms; a node wakes up when the growing tip has passed it.
- **Ornament generators**: roundel (disc, rays, pearls, mosaic ring), tessera fields clipped to any shape, pearls along any path, gilded scrolls (dark line under ochre, with leaves), beaded arches, a lattice of long leaves.
- **Paper**: a seamless tile of grain, mottling and fibres, multiplied over the frame and **anchored to the world** (it moves and scales with the camera); corner toning is screen space. Print is clean: no film damage, no misregistration.
- **Lettering** (`letters.js`): capital skeletons through control points, a broad-nib width model (thick verticals, thin horizontals), swell and taper, a dark outline under all strokes so overlaps merge, ochre fill, cream inline; any warp bends it along the frame.

## 3. Colour logic

- **A closed box of 7–9 muted, slightly greyed hues** plus dark brown: paper cream, gold ochre, sage and olive, dusty rose, lilac and violet, a teal. No pure black or white, nothing neon.
- **Ground**: paper cream or one low-saturation field (sage, rose, slate) with a pale lattice; the panel is lighter.
- **Gold ochre is the structural colour**: frame bands, roundel rim, pearls, lettering, scrolls; flat, never a gradient.
- **One cool accent** (lilac to violet) against warm hair and ochre; the dress takes a colour near the flower; sage carries the supporting plants.
- Value order: figure and flower darkest, frame and halo mid, lattice and tesserae lightest.
- Example (not a rule): paper `#EBDFC1`, ochre `#C99B3C`, sage `#9BAF84`, rose `#D9A59C`, lilac `#A7A0CE`, violet `#716AA9`, brown `#3B2515`.

## 4. Type & subtitles

- **Display lettering is built, not typed**: titles, inscriptions and plaques come from the letterform builder, ≥ 60 px cap height at 1080p, ochre with brown outline and cream inline, curled sprouts on terminals, at most one long tail per word. Inscriptions follow the arch or roundel.
- **Subtitles** sit on a ribbon banner with swallow-tail ends (cream, ochre fold, brown contour) that unrolls from the centre; **Cormorant Garamond** (OFL) SemiBold italic, 42–46 px, dark brown. Hold ≥ max(1.8 s, speech + 0.6 s).
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): subtitles in **Noto Serif SC** (SemiBold) or **ZCOOL XiaoWei**; for inscriptions take the glyph outlines of **ZCOOL XiaoWei** (or **LXGW WenKai**) and draw them with the same outline, ochre fill and inline, ≥ 72 px, set upright along the arc (each character rotated ≤ ~25°).

## 5. Motion quality

- **24 fps on ones**; growth is continuous, nothing is stepped.
- **Growth, not entrance**: things extend (stems, locks, scroll lines), unfurl (leaves, petals from a bud) or are laid piece by piece (tesserae, pearls). Nothing fades in, scales in from a point or slides in.
- **Easing**: ease-out, soft settle. Order is choreography: base to tip, structure first, ornament last.
- **Sway**: grown plants and hair drift slowly (period 6–8 s).
- Lettering is written in order, at the pace of a musical phrase.
- What never moves: the frame, the lattice, an inscription's baseline once written.

## 6. Camera grammar

A vocabulary, not a route. The camera is one world → screen function (zoom, pan) applied to everything, the paper tile included.

| Move | What it expresses | Can serve |
|---|---|---|
| Lateral pan along a growing vine | time as a stem | a timeline; a journey; chapters |
| Locked frame on a finished poster | reading time | a title; a decision; a quote |
| Slow push-in on the roundel | attention gathers | a reveal; a face; a product |
| Pull back from a detail to the whole panel | the part belongs to a design | a payoff; scale |
| Window to window along a vine | sequence in space | stages; seasons; rooms |

Framing: figure or flower fills ≥ a third of frame height at key beats; the roundel sits in the upper half of its panel; text lives in banners and arches, never over a face. Transitions are plant and frame: a vine growing across the cut, a window frame sliding over, a roundel opening on the next picture. No dissolves or generic wipes.

## 7. Sound palette

- **Belle-époque salon**: harp (arpeggios, glissandi), solo cello and violin with portamento, low flute and clarinet, celesta or music box, harmonium, pizzicato, soft bells. Waltz, barcarolle, habanera or slow nocturne. No big band, synth pads or cinematic strings.
- **Foley by material**: pen scratch for drawn lines, paper rustle, a ceramic tick per tessera, stem creak, leaf rustle, glass chime, a drip; quiet-room ambience.
- **Silence**: near-silence before the key stroke, then one tessera tick or harp note.
- **Voice**: calm, intimate; few lines on phrase starts. Music ducks ~6 dB under voice; −14 LUFS; grain ≤ 2.

## 8. Native moves

A menu: use the ones your story needs.

- **The vine is the camera.** A stem grows across the frame and the camera follows its tip past the panels hung along it. *Fits content like:* a product's year in four seasons; a city's tram lines as a timeline; a recipe from seed to table.
- **The halo opens.** A roundel draws its rim, lays its tesserae, and the figure appears as the last ring closes. *Fits content like:* introducing a person; an award; a product reveal.
- **Lettering grows from a stem.** An inscription is written in order and its sprouts uncurl into leaves. *Fits content like:* a title; a brand name; a poem line.
- **Hair, cloth or smoke becomes vine.** A figure's flowing lines continue into tendrils. *Fits content like:* a musician and her music; a river becoming a map; a scent.
- **The window as chapter.** Arched panels hold one idea each, a vine joins them. *Fits content like:* three stages of a product; morning, noon, night; before, during, after.
- **The frame fills.** Border, filigree and mosaic are laid as time passes. *Fits content like:* a countdown; votes counted; a map filled by visits.

## 9. Pitfalls of the medium

- **Wobble instead of whiplash**: keep curvature smooth, end in a clear spiral; **even contour** reads as clip art, so vary width and taper open strokes.
- **Too many hues or too much saturation** turns it to candy.
- **Ornament louder than subject, or Deco drift** (straight edges, hard symmetry, metallic gold): keep lattices pale, plants asymmetric, gold flat ochre; test at thumbnail size.
- **Letters from a font** break the poster: build them, bend them with the frame; keep sprouts short on small text.
- **Bad face**: few features (brow, lidded eye, one nose line, small lips), eyes lowered or half closed; no lashes, no gradient.
- **A NaN width profile at its ends** (pow of a tiny negative sine) makes a shape vanish silently: clamp before `pow`.
- **Locks as radial spokes** look like tentacles: use bundles of parallel strands ending in staggered spirals.

## 10. Engine

In `demo/engine/`: `ink.js` (palette, `inkLine`, `shape`, `whip`, `ribbonPoly`, `catmull`, `paperOverlay`), `flora.js` (`leaf`, `blade`, `stem`, `iris`, `blossom`, `drawVine`), `ornament.js` (`roundel`, `mosaicRing`, `mosaicField`, `pearls`, `frost`, `scroll`, `filigreeCorner`, `archFrame`, `wallpaper`, `banner`), `letters.js` (`layout`, `drawLayout`, `arcPos`), `keeper.js` (the figure). `demo/show.js` composes the film; a still: `node core/render/still.mjs styles/art-nouveau/demo <t>`. Minimal drawing: `drawVine(ctx, {x:300,y:1000,ang:-1.5,len:700,wave:.4,curl:1.2,w0:12,w1:3,nodes:[{u:.4,kind:'leaf',side:1,size:150}]}, g)`, `g` from 0 to 1.

## 11. Variation space

You decide subject, figure (or none), panel shape (arch, circle, tall rectangle, triptych), palette within the logic, species, structure, opening and ending. All far from our demo:

- Structures: **a perfume in four notes** (four roundels, a vine linking the bottles); **a theatre season** (a poster that rewrites its inscription per production); **a city line** (stops as windows along a vine-shaped route).
- Openings: **a single scroll line** drawing itself on blank paper; **a roundel rim** closing like a ring; **a seed** dropped into a mosaic floor.
- Endings: **the frame completes** and the poster flattens to a printed sheet; **the vine is cut** and its curl rests; **the roundel closes** on an empty halo.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
