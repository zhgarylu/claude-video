# Needle Felting — Style Prompt

> Needle-felted wool, shot like hand-made stop-motion: soft rounded volumes whose skin is matted fibre with a halo of loose ends, dyed-wool colours gone slightly chalky, one warm lamp over a craft table, and a barbed needle that makes everything.
> References (grammar only): the close, patient tabletop work of felt and wool-toy stop-motion shorts and craft-tutorial reels (one lamp, objects set down and nudged, the maker's tools as the main sound). Never copy a known felt character, mascot, title or logo.

## 1. Essence, and what it is not

- **The surface is matted fibre**: dense, matte, slightly uneven, with fibre direction you can see up close and a fuzz of loose ends that catches the lamp at the silhouette.
- **Volumes are soft and simple**: balls, rolled worms, flat layers, cones. A character is built from them; nothing is sculpted to a sharp edge.
- **Stop-motion on twos**: 12 drawings per second, small hand-made irregularities, the fibres settling differently on every drawing. Camera and light stay smooth.
- **The needle is the maker**: every shape arrives by being poked into place, and the poke is the film's rhythm.

Not embroidery (no thread, no stitches, nothing outlined by yarn), not claymation (no wax, no fingerprints, no glossy highlight on the body), not knit (no visible yarn loops or rows), not a plush render (no long silky hair, no sheen, no fur that flows): felt is short, tangled, matte.

## 2. Materials & rendering

- **Shell fuzz**: every wool object is a skin plus 18–40 shells pushed out along the normal; each shell keeps only the texels whose fibre height reaches it. Finished felt has a fuzz of 2–4 % of the object's radius; raw wool (a loose cloud, roving) 20–40 %.
- **Fibres are drawn once** into a tileable texture (R = the fibre's tone, G = its height ramp, B = coverage). Matted wool uses random directions (triplanar projection, so poles and seams do not show); roving uses parallel fibres along the tube. Two scales are blended so the tile never repeats visibly. Tone variation per fibre is the whole of the "colour texture".
- **Loose ends**: a few dozen camera-facing ribbons per object (0.02–0.04 cm wide, 0.4–1 cm long, curled and drooping, rebuilt on every drawing) stand off the surface. Too many reads as fur; too few reads as plastic.
- **Hand-made irregularity** per drawing: a 1–2 % vertex wobble re-seeded on every drawing, a tiny fibre-texture offset, a ±0.01 cm position jitter on every piece that is moved by hand.
- **Dents**: each poke presses a Gaussian dent (radius ~0.5 cm, depth 0.1–0.5 cm) into the wool for a few drawings, relaxing to a faint scar, with a puff of 6–8 wisps from the hole and, as the needle leaves, two or three fibres stretched from the surface to the barbs.
- **Light**: one warm lamp (a point light) with wrapped diffuse, a dim cool sky and a warm ground bounce; fuzz is lit from every side, brightens at grazing angles, and is darker at the root. Contact shadows are blob decals; render at 2× with MSAA and a physical depth of field (`core/three/post.js`). Props (walnut, foam, linen, steel, wood, a lamp) use ordinary PBR with a low environment map.
- **Blends** are chosen fibre by fibre: each fibre belongs to one of two colours and a noisy mask with a growing soft edge decides which, so a hard patch becomes a speckled gradient.

## 3. Colour logic

- A **muted, chalky dyed-wool palette**: nothing above ~60 % saturation. Natural fleece (oatmeal `#D6CAB4`), then a few dyes: dusty slate `#7F95A8`, rust `#C4694A`, mustard `#D3A64A`, moss `#86966A`, dusty rose `#D5A199`, charcoal `#2D2A28`. Use two or three per scene.
- **Warm lamp, deep warm-brown dark** around it (`#0A0705` to `#2A1C12`); light falls off to black at the edges, which gives the "one lamp on a table" feel.
- One **accent colour** carries the story (here a rust breast); the rest stays near the fleece.
- Props are real materials (dark walnut, a foam block, undyed linen, bare steel, pale wood), a step less saturated than the wool.
- Eyes and tiny hard things (beads) are the only glossy objects, and they are black.

## 4. Type & subtitles

- **Fredoka** (OFL, in `core/fonts/`), weight 600, rounded and soft like cut felt. One family for the whole film.
- **Subtitles are felt patches**: an oat-coloured rounded patch with a fibre rim (hundreds of short outward strokes) and speckled inner fibres, dark brown text, near the bottom, one line. Pop in with a small back-ease scale; fade out. Never over the subject's face.
- **Labels and counters are appliqué tags**: rust felt with cream letters, pinned in a corner, each number held ≥ 2.5 s; a new number flips in with a small overshoot.
- No outlines, no drop shadows, no glow on text.

## 5. Motion quality

- **On twos**: the wool, the needle and every hand-moved prop step at 12 drawings per second; the camera, the lamp and the wool wipe move on ones. A stepped camera reads as lag.
- **A poke is four drawings**: hover, touch, deepest, out; the deepest drawing lands on the beat. Runs of pokes sit on eighth notes; between runs the needle lifts and travels.
- **Things are placed, not morphed**: a piece arrives by a short arc (hop, roll, slide), lands with 8–15 % squash for two drawings, and settles. Shapes are never smoothly morphed; size changes come from pokes (a cloud shrinks in steps, a surface densifies).
- **Anticipation and follow-through** are small and hand-sized: a ball bends slightly before it hops; a landed piece rocks once.
- Simple eases (smoothstep) on camera; no spring bounce outside the hand-made arcs.

## 6. Camera grammar

A vocabulary, not a route. Opening and ending come from the topic.

| Move | What it expresses | Can serve |
|---|---|---|
| Macro hold on the fuzz | the material itself | a raw material; a texture; the start of a build |
| Pull back and rise from macro | a scale reveal (a cloud is a pinch) | a product; a tiny thing in a big place; a first look at the workshop |
| Low three-quarter orbit | a firm object proving itself | a test; a result; a turn-around |
| Top-down | flat layers and plans | wings, appliqué, a landscape, a pattern |
| Push to a surface | detail work; a change in the material | a blend; a repair; a texture swap |
| Locked close shot | stillness; a character looks back | the turn; a reaction |
| Slow pull to the whole table | context and ending | the finished piece among its tools |

Depth of field is shallow in close shots (the background goes to soft bokeh) and gentler in wide ones. **Transitions are made of wool**: a lump of roving crosses the lens, blurred and close, and the cut happens under it.

## 7. Sound palette

- **Music**: felted-hammer upright piano (mellow, short), music box, soft pad of detuned sines, a low hum; a waltz or a slow 6/8 pulse suits the hand-made rhythm. Stay in a pentatonic or simple major mode.
- **Foley follows the materials**: needle stab (a soft thud into foam plus a faint "ssk" of barbs through fibre and a settling rustle), wool rustle for rolling and brushing, soft thump for a landing, puff for a tuft, tiny glass tick for a bead, cloth "pf" for a blink, steel tick and wood clack when the needle is put down, a lamp switch click.
- **Ambience**: room tone and the lamp's mains hum, which stops when the lamp does.
- **Silence**: the hum alone, before the turn. The first sound after it should be small and alive (a peep, a blink).
- **Mix**: voice compressed and ≥ 8 dB over music, music ducked ~6 dB under voice, −14 LUFS; foley dry and close.
- **Voice**: warm, close, unhurried (a British female voice like Kokoro `bf_emma` suits it); short sentences.

## 8. Native moves

A menu: use the ones your story needs.

- **Poke and dent.** A needle press, a dent, a puff of loose fibre, the fibres hooked and dragged. *Fits content like:* any build step; a count; a repair.
- **Air to mass.** A loose cloud of fibre pressed down to a firm ball; the surface densifies and the fuzz shortens. *Fits content like:* a product being made; an idea condensing; a savings or a progress count.
- **Blend.** Two wools laid on and poked until the edge dissolves fibre by fibre. *Fits content like:* two ingredients; two teams; day to night; a gradient.
- **Flat layer.** A thin felt shape pressed on as appliqué. *Fits content like:* a map layer; wings, leaves, clothes; a label.
- **Ball and worm.** Characters built from balls and rolled worms. *Fits content like:* a family; a mascot; a set of pieces.
- **Roving.** Long parallel fibre in a coil, used as a colour palette or a path. *Fits content like:* a colour range; a route; a timeline.
- **Wool wipe.** A lump of wool crossing the lens as the transition. *Fits content like:* any scene change.

## 9. Pitfalls of the medium

- Long straight hair turns felt into fur → short fuzz, curl and clump variation, a few loose ends only.
- Shell banding at silhouettes → enough shells (≥ 22 for a visible ball, ≥ 36 for raw cloud) and fuzz that thins out.
- `pow()` of a slightly negative number is NaN and shows as a black square after bloom → clamp inside every `pow`.
- A shared shell material cannot carry per-mesh uniforms (set `uniformsNeedUpdate` in `onBeforeRender`) → one material per mesh.
- Fibre texture swimming when an object scales → scale the texture by the world size of the mesh, and length by the inverse scale.
- Whole-texture shifts per drawing look like a sliding skin → shift by a few texels only, and leave the "boil" to the vertex wobble and the wisps.
- Airy wool with holes shows black → keep the base skin mostly present (solid ≥ 0.6) and let the fuzz do the airiness.

## 10. Engine

In `demo/`: `wool.js` (fibre textures, the shell material, blob / worm / lathe geometry, the ribbon wisps), `set.js` (table, foam pad, roving nests, needle, lamp, blob shadows), `main.js` (the bird's rig as functions of the drawing time, the needle's poke cycle, wisps and puffs, camera, wool wipes, lamp), `overlay.js` (felt subtitle patches and the counter tag), `timeline.js` (bars, voice starts, captions, pokes, sound events), `mix.py`, `tools/` (subtitle and cue checks), `build.sh`. File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the maker's subject, the characters, the palette within the chalky range, the structure and the ending. All far from our demo:

- Structures: **a landscape grown from flat to round** (a felt appliqué hillside whose layers are pressed up into hills, one season per layer); **a colour mix** (two wools meet and the needle blends them through a full spectrum while a story about two people plays in the same colours); **a repair** (a worn patch on a knitted jumper is covered with a needle-felted bee, poke by poke); **a recipe in wool** (food built from felt, with the steps counted on tags).
- Openings: **the finished piece wearing its stray fibres**, then the camera pulls into one fibre; **a pair of hands' shadow** at the lamp's edge, no hands shown; **a drawer opening on rolls of roving**.
- Endings: **the piece set down among the tools and the lamp clicking off**; **the piece carried out of frame and the foam block left with a ring of dents**; **the roving rolled back up**.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
