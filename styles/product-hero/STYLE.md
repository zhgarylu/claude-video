# Product Hero Macro — Style Prompt

> Commercial product cinematography rendered in code: a macro studio shot of one object on a seamless backdrop, with a shallow depth of field, real-looking materials (brushed metal, leather, glaze, water), a travelling strip of light, a reflection in the floor, parts that separate and snap shut, and tight type that arrives late.
> References (grammar only): launch films and e-commerce hero loops where light moves across a surface and reveals it, macro rack-focus on a single material, exploded views on a beat, a price card at the end. Copy none of their products, silhouettes, typefaces, sounds or brand marks, and never name them in the film.

## 1. Essence, and what it is not

The object is the star and the light is the camera's partner. A frame reads as this style when it has: **one object** lit by large soft sources, **material that looks touched** (grain, brushing, condensation, glaze), **a focus plane you can see** (razor-thin at macro, soft bokeh behind), **a floor** that holds a faint reflection and a contact shadow, and **one accent colour** carried by the product.

Not the dark-field glass render (that style is black, transparent and refractive; this one is lit, opaque and tactile, and the backdrop is a colour). Not a flat catalogue photo (there is always a move and a focus choice). Not a keynote slide (the object is lit and moving; type is secondary).

The product and its brand are always **fictional**: no real silhouette, name, logo or typeface identity. A typographic wordmark is enough.

## 2. Materials & rendering

- **Real 3D, physically based**, in three.js (`MeshPhysicalMaterial`) with the library's `core/three/post.js`: physical depth of field, bloom above ~1.5, grade, 2x supersampling, Neutral tone mapping. Model in centimetres, near plane 2.
- **Studio = a few emissive cards baked to an environment map every frame** (PMREM of a tiny dark scene): a large soft top box, a tall key strip on one side, a weaker fill strip on the other, two narrow rim strips behind, a dim front card, a bounce card below, and **the sweep**: one narrow bright strip whose azimuth is animated. Because it is geometry in the environment, its highlight crosses metal, leather and glaze physically; never paint a 2D highlight. Build the rig relative to the camera azimuth (a turntable look) so reflections stay composed while the camera orbits. Keep the environment's own background dark (about 4 %): metals need dark to reflect.
- **Brushed metal**: `metalness 1`, roughness 0.3-0.45 with a streak map (rows of low-amplitude noise, tile ≈ 12 cm so one row is a few hundredths of a millimetre), `anisotropy ≈ 0.7`, rotated so highlights stretch along the axis. Re-map lathe UVs to centimetres or the streaks stretch.
- **Leather**: pebble grain from a Voronoi height map as `bumpMap` (cells ≈ 2-3 mm), sheen, low clearcoat, a soft colour map with darker patches; stitches as instanced thin capsules in a slightly darker thread, running along the seam.
- **Ceramic / glaze**: dielectric, clearcoat 1, clearcoat roughness ≈ 0.04, a barely visible orange-peel bump; its reflections must show the softboxes as clean rectangles.
- **Water and condensation**: squashed spheres (z about 0.6 of x) on the surface, `transmission 1`, `ior ≈ 1.45`, `thickness ≈ 1.6`, a slightly blue attenuation. Small drops are most of the effect; a few large ones are the subject. Droplets that belong to a part are children of it.
- **Backdrop**: a cove (floor curving into the wall, radius ≥ 150 cm so no horizon line) with its own shader: a pool of light behind the subject, darker edges, a dither against banding, and the contact shadow computed there. The floor is slightly transparent (alpha ≈ 0.65 near the object, rising with distance) over a **mirrored twin** of the product below the floor, which gives a reflection that fades with distance and is blurred by the depth of field. Everything in the environment must be symmetric about the floor plane so the twin is lit like the original.
- **Bokeh**: a few emissive discs far behind the product, only to become bokeh. Keep them dim (slightly above the backdrop) so they do not compete with type.
- **Depth of field is the lens**: aperture per shot (macro razor-thin, hero moderate, exploded view deep), focus on the subject, and a rack-focus blur for transitions.

## 3. Colour logic

- A neutral, slightly warm backdrop in the mid-light range (putty, oat, stone, a light grey-green), vignetted darker toward the edges. The backdrop is a colour, not black and not pure white.
- **One accent hue, carried by the product** (a glaze, an anodised ring, a cable). The same hue colours numerals, the call-to-action and the progress mark in the type layer. Everything else is the metals' own tints, a natural material colour (leather, wood, rubber) and the backdrop.
- Neutral light: warm-white softboxes, slightly cool rim. Highlights roll off through tone mapping; nothing is clipped to a flat white patch.
- Type is near-black ink on the light backdrop, with the accent for numbers.

## 4. Type & subtitles

- One licence-free geometric or grotesque sans (OFL) in a light weight for display (200-300) and a regular/medium for callouts; wide tracking only for small caps (kicker, brand line), tight tracking for large lines.
- Roles: **tagline** (100-160 px, two lines at most), **kicker** (24-28 px caps), **callout** = a number in the accent + a headline (56-64 px) + one line of body (28-32 px), **part labels** (24-28 px) joined to the part by a thin leader that grows to the label, **big numeral** (400 px) for a single claim, **price** and a **pill** for the call to action on the end card.
- Type lives in the negative space the composition leaves (lens shift moves the product to one side, text to the other) and alternates sides between shots. Never over the busiest bokeh or the brightest highlight.
- Reading rule: hold ≥ max(1.8 s, characters ÷ 15 + 1.5 s). Fades in over about half a second, rises a few pixels; no typewriter, no bounce.
- Callout anchors, leaders and day-line marks are driven by the same world→screen projection as the render; never hand-type screen positions for things that follow a part.

## 5. Motion quality

- 24 fps, **everything eased**: ease-in-out for camera moves and sweeps, ease-out for parts leaving, a short ease-in for a snap. No linear moves.
- **One or two camera moves per shot** (a slide, a dolly, an orbit), slow. Never handheld.
- The light moves more than the object. A sweep takes 3-6 s to cross a material.
- Exploded view: parts separate along the axis in a staggered ease-out, hover with a small bob and tilt, then close in a very short ease-in that lands on a beat with a click. The axis can tilt a little for a diagonal.
- Condensation grows and appears slowly; a sliding drop sticks, then goes, and stretches along its travel.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Macro slide with a sliding highlight | The material before the product | an opening; a texture; a promise made visible |
| Low 3/4 hero, slow push and a small orbit | Declaration, the whole object | a name; a tagline; a reveal |
| Tracking up a surface while orbiting | Craft, tactility | a finish; a seam; a handle |
| Orbit above a small part | Detail with jewellery lighting | a cap; a button; a lens |
| Pull-back wide on an exploded column | Construction, honesty | internals; modules; what is inside the box |
| Slow close orbit with the light travelling | Time on the object | durability; battery life; ageing |
| Low wide with the reflection, product off-centre | The sign-off | price; availability; a call to action |

Framing: the subject fills at least a third of the frame height at key moments, or deliberately a tenth in an exploded wide; the product sits on a third and the text on the other. Transitions are made from the lens: pull focus to the near plane, dip the exposure, change the camera under the blur, pull back. Allowed: light-wipe reveal (screen-space diagonal edge with a warm glow), rack-focus cut. Forbidden: hard cuts without a focus or light cue, default dissolves, whip pans.

## 7. Sound palette

- Quiet, warm, close: **soft whooshes** for light sweeps and cuts (band-passed air, never a siren), **clicks** (metal, ceramic, rubber) for parts, caps and snaps, **leather rub**, **water plinks and a wet squeak** for droplets, a **low sine pulse** on beats 1 and 3 as the restrained heartbeat, a **chime** for the price. Every visible action has a sound; UI ticks are tiny.
- Music: electric piano (FM), sparse plucks, a warm pad, a sub pulse; small intervals, a pentatonic mode with a lifted ninth. No big drums, no risers beyond one swell. Reverb on music and ambience, dry foley.
- Silence is the tool: stop the pulse and the chords for a beat before the snap and again before the end card, so the first sound after is a click or a chime.
- A room tone sits under everything. Loudness −14 LUFS.
- Voice is optional; if used, close, calm and warm, compressed, 10 dB above the music.

## 8. Native moves

- **The light wipe.** The frame starts almost black and a diagonal edge of light crosses it, revealing the surface behind. *Fits content like:* a product reveal; a before/after of a finish; a title that appears out of a dark room.
- **The sliding drop.** A drop sticks, lets go, leaves beads behind and a streak of focus around it. *Fits content like:* a cold drink; a waterproof claim; a skincare serum; anything that should feel fresh.
- **The sweep over a material.** One strip of light crosses leather, steel or glaze while the camera creeps. *Fits content like:* a handle finish; a watch bracelet; a phone back; a paint colour.
- **Rack-focus cut.** Pull focus to nothing, move, pull back. *Fits content like:* any change of subject in a product film; a jump from macro to wide.
- **The exploded column.** Parts stagger apart on the axis, labels draw to them, then everything snaps shut on a beat. *Fits content like:* a headphone; a coffee machine; a sneaker's layers; a battery pack; packaging with its inserts.
- **The day line.** One big numeral and a progress line while the light travels: a claim shown as a duration. *Fits content like:* battery hours; warranty years; a 24-hour hold; a delivery promise.
- **The price card.** The product steps aside; wordmark, name, price, a pill, held longer than feels necessary. *Fits content like:* a store listing; a pre-order; an event ticket.

## 9. Pitfalls of the medium

- **Clipped highlights.** A sweep strip that is too bright flattens into white. Tone-map with Neutral, keep bloom threshold above the rig, check the brightest frame of every sweep.
- **Stretched textures on lathe parts.** Lathe UVs follow profile points, not centimetres: re-map `v` or leather becomes wood and brushing becomes ribbing.
- **A product that is a toy.** Single-radius cylinders look cheap: round every edge (a 0.2-0.4 cm arc), add grooves and a lip, give the cap a real underside.
- **Reflection that does not match.** The mirrored twin only works if the lighting is symmetric about the floor and the twin is the same object with the same transform; anything attached to a part (droplets) must move with it.
- **Type over bokeh or highlights.** Readability dies on the brightest disc: keep bokeh dim, type in the clean half, test on the brightest frame.
- **Shallow focus in the wrong place.** A razor-thin plane on the wrong surface reads as an error: set the focus distance from the subject every shot and keep the aperture low when the subject spans depth.
- **Fake marks.** No real logo, silhouette or typeface lookalike; a typographic wordmark and an invented domain (`.example`).
- **A speed-ramp sweep.** A sweep that crosses in one second looks like a flash: 3-6 s.
- **Droplets that look like bubbles.** Too transparent and too round: flatten them, add thickness and a blue attenuation, vary sizes, keep most of them tiny.

## 10. Engine

In `demo/`: `main.js` (renderer, cove shader, bokeh, per-frame environment rig, mirrored twin, post pass for the light wipe, camera from shot tables, type and callout layer, `TEXTS`), `product.js` (lathe profiles with UV re-mapping, materials, ribbon sweep for a strap, instanced stitches and droplets), `textures.js` (brushed-roughness, leather grain, leather colour and glaze canvases, seeded), `timeline.js` (shots as from/to keys, cuts, the sweep track, exploded-view times, type table, sound events), `mix.py`. Minimal use for another product: write your parts as lathe profiles, assign the five material recipes, list shots as `{t0, t1, a: {tgt, az, el, dist, shift, aper}, b: {…}}`, and keep the rig in `setEnv`.

## 11. Variation space

You decide the product, the brand, the accent hue and backdrop colour, the materials, the story and the length. Far from our demo:

- Structures: **a launch teaser** (silhouette in a dark room, a light wipe, name, date); **a feature trio** (three close-ups, each ending on a number); **an unboxing** (lid, tissue, the object lifted into a pool of light); **a maker's note** (the process of one part as a macro oner).
- Openings: **a cap unscrewing at the edge of the frame**; **a reflection first, the object arriving above it**; **a rotating turntable in a pool of light, no type**.
- Endings: **the object turning to a profile and vanishing into the backdrop**; **a small box with a single line of text**; **the first shot's macro again, one detail changed**.

Scenes in a darker key (black backdrop, rim only) and lighter (white cyclorama, hard shadows) are in range: keep the one accent and the physical light.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
