# Dunhuang Mural — Style Prompt

> A cave-temple wall brought to life: mineral pigment on rough clay plaster, iron-wire lines, stepped halo shading, seen by one moving lamp. The wall is the subject: it weathers, wakes, flakes and re-forms.
> References (grammar only): the Mogao-type cave mural tradition (tiered registers, flying figures on streaming scarves among scattered flowers, lotus-coffer ceilings, repeating pattern borders, lead pigments that darkened with age); raking-light shots of lamp-lit rock art. Copy no real mural's composition, cave, figure or inscription; every pattern is generated.

## 1. Essence, and what it is not

- **A painted wall, not a painted sheet.** Plaster grit, trowel waves, cracks and flake edges are always visible, lit from the side by one warm lamp.
- **Flat mineral colour, stepped halos.** Opaque fills; each form darkens at its edge in 3 to 4 visible rings (quantan), never a smooth gradient.
- **Iron-wire line.** One springy, even contour, a little heavier where the brush pressed, tucked in at the ends.
- **Flight and pattern.** Figures drift among scattered flowers on streaming scarves; borders repeat (arched rosette cells, lattices, pennants, vine scrolls); ceilings are nested squares around a lotus.
- **Two ages at once.** Every picture exists fresh and weathered; the film can move the wall between them.

Not opera-cel animation: there, figures are acted cels over decorative backdrops on warm paper, with gold trim and stage poses. Here nothing is a cel; figures are painted into plaster and never acted (they drift, sway, stream), and lamp, relief and age carry the drama. Not ink wash (opaque pigment, no paper, no blank space), not ukiyo-e (no woodblock flatness), not paper-cut or shadow puppet (no cut-outs, no backlight), not flat vector pattern (grit, wear and lamp light are mandatory).

## 2. Materials & rendering

The plaster is built once per wall; paint is redrawn every frame; a shader does the rest.

- **Plaster (`buildWall`).** A height map: fine grit (cell ~3 px, amplitude ~1.7), trowel waves (~30 px, ~5.5), slow swell (~240 px, ~9), minus cracks (random walks with few branches, 1 to 2.5 px wide, 3 px deep). Flaking thresholds a loss map (noise plus edge, bottom and crack bias) at two depths: lime ground, then straw clay with flecks; its steps cast their own shading.
- **Paint layer.** Canvas 2D in wall coordinates: flat fills with `halo` rings (3 to 4 strokes of the darker same hue at 0.3 alpha, clipped inside) and `wire` iron lines (2.5 to 3.5 px at 1080p, width noise 0.7 to 1.3).
- **Ageing shader (`shadeFrame`)**, per pixel from the paint and four maps (wear, oxidation, grain, loss): white lead goes grey-brown where oxidation is high; cinnabar darkens toward brown-black; azurite greys; malachite dulls with dust; sand abrasion removes pigment grain by grain, thin lines first; loss exposes ground, then clay. Paint is sampled displaced by the relief gradient so edges sit in the grooves, not like vectors.
- **Wake.** An arrival-time field (linear, radial or any function of wall position, plus noise) against a progress `p`: behind the front the pixel is fresh, ahead it is weathered, and a thin band at the front lifts warm. Loss thresholds shift with `p`, so flakes grow and heal at the front.
- **Lamp.** One point light close to the wall (`z` ~130 to 150 px so light rakes), falloff `1/(1+(d/R)^1.9)`, `R` 600 to 650 px, warm tint, cool dim ambient (~10 %), soft filmic shoulder, slow flicker. Relief is Lambert relative to the flat wall.
- **Anchoring.** Plaster, cracks, paint and wake belong to the wall and move with the camera; the lamp is a point in wall space; the vignette is the lamp's falloff. Text plaques sit in a protected rect (wear scaled to ~0.1).
- **Generators:** scattered flowers and stars; lotus (1 to 3 petal rings); lozenge diaper; vine scroll; pennant fringe; arched rosette cells (abstract, no figures); lotus coffer; twisting two-faced ribbons; a flying-figure rig.

## 3. Colour logic

- **Pigments:** cinnabar, malachite, azurite, ochre, white lead (cream), soot, each with a light and a dark step; flesh is lead plus a little cinnabar. No pure white or black, no neon, no gold leaf, no glow.
- **One ground per register:** burnt earth red, deep malachite, pale lime or indigo, never the hue of the figure on it (white lead, azurite, malachite read on red; cinnabar, ochre on green).
- **Age keeps value order:** lights to khaki, reds to brick and maroon, blues to slate, greens to olive; bare plaster sits mid-range. A fully aged wall still shows ghosts of its drawing.
- **Warm lamp on cool dark:** lit side amber, shadow slightly blue.
- Example (not a rule): earth `#74301f`, cinnabar `#c4402a`, malachite `#3f8d66`, azurite `#2f64a6`, ochre `#cc903c`, lead `#f2ead3`.

## 4. Type & subtitles

- **Subtitles are inscription plaques** (tibang): a pale lime rectangle with a double border (cinnabar band, soot rule), soot text, world-anchored on empty ground, protected from erosion. At most 2 lines, 44 to 52 px at 1080p. They appear as the wake front crosses and leave by weathering out. Hold ≥ max(1.8 s, speech + 0.6 s).
- **Titles** are brushed on the wall in soot or cinnabar, large, sparse, with one small cinnabar seal.
- **Latin:** Noto Serif SC or Cormorant Garamond SemiBold.
- **Chinese type:** OFL CJK fonts only, subset to the characters used (TECHNIQUE §11): Noto Serif SC SemiBold for plaques and running text, Ma Shan Zheng for brushed titles and seals, optionally ZCOOL XiaoWei. Fetch via the Google Fonts CSS API `&text=`; `document.fonts.load` before the first frame.

## 5. Motion quality

- **24 fps on ones.** Stepping would fight the continuous wind.
- **Wind is one phase.** Ribbons are splines with a travelling wave (1.3 to 1.7 cycles, phase ~2.6 rad/s), a twist that flips the two faces and goes edge-on thin, amplitude growing to the tail. Hems and hair flutter on the same clock with small offsets.
- **Figures drift:** slow bob (~7 px), a few degrees of pitch, limbs swaying within ~6 px. They never act, snap or bounce.
- **Registers slide** at constant speed, plaster and paint together, as if the lamp-bearer walks.
- **The lamp breathes:** intensity and position wander a few percent at 3 to 6 Hz; it can travel, dim, swing low and rise, and cuts out only at the film's end.
- **Fragments:** flakes lift, drift a few pixels and fade; in the wake they re-form from the edge inward.
- **Never moves:** plaster relief, cracks, finished pattern.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Lateral register slide | walking a wall by lamplight | a journey; a list; a history |
| Lamp sweep over a locked wall | revealing, reading | a discovery; a restoration |
| Slow push to a motif | attention to detail | a craft step; a single pattern |
| Raking swing (lamp angle changes, camera still) | relief appears or hides | a hidden layer; erasure |
| Tilt up a tiered wall | eras or stages stacked | genealogy; layers of a system |
| Pull back until pattern is the whole ceiling | scale and order | a summing-up; the rule behind many things |
| Locked frame in near-dark | waiting | before a turn; after a loss |

Framing: the lamp pool sits on the subject; a third of the frame may be dark. Figures fill 40 to 80 % of frame height at key moments; text on empty ground. Transitions: a wake front, register slide, lamp pass or flake-and-re-form; never a dissolve, wipe or zoom blur.

## 7. Sound palette

- **Silk-road room, not opera:** pipa (tremolo, sweeps; `core/audio/pluck.py`), harp plucks, dizi or bangdi air, xun (clay ocarina), frame drum for steps, small hand bells. Pentatonic with a raised-fourth colour, long ornamented notes.
- **Space and foley:** dark, short cave tail; sand sifting; lamp flutter and tick; brittle flake ticks, brush on lime, footsteps on gravel, cloth on stone for ribbons.
- **Silence is cave air:** zero the music, keep room tone and one drip or flake; the next sound is the film's most important.
- **Mix:** calm, close voice about 10 dB over music, music and ambience ducked; −14 LUFS.

## 8. Native moves

- **The wake.** A front crosses; behind it paint returns to first colour and flakes close. *Fits content like:* a restored heirloom; a brand returning to its roots; a memory coming into focus.
- **The lamp walk.** The camera is the lamp-bearer; registers slide and wake in its pool. *Fits content like:* a museum route; a supply chain; a day timeline.
- **Flake and re-form.** Fragments drift away or seat themselves. *Fits content like:* data loss and recovery; a mended object; a fading signal.
- **Raking light.** A low sideways lamp reveals relief or underdrawing. *Fits content like:* a hidden message; a maker's mark; a fingerprint.
- **Underdrawing before colour.** A cinnabar line draws itself, then pigments fill. *Fits content like:* a design process; recipe stages; a plan becoming a building.
- **The count.** A border of niches fills one by one as the lamp passes. *Fits content like:* volunteers; a year of days; a catalogue.

## 9. Pitfalls of the medium

- Evenly lit wall reads as a texture overlay → steep falloff, low lamp, a dark corner in frame.
- Vector-looking paint → displace by relief, width-noised wire, abrasion takes thin lines first.
- Weathering erases the picture → cap loss (~25 %), keep ghosts, protect plaques.
- Cracks as scribbles → long jagged walks, few branches, no hairline loops.
- Ribbons as flat strips → twist, two pigments, edge-on thinning, a travelling wave.
- Over-modelled faces → flat flesh, rouge, 3 to 4 rings, iron-wire features.
- Borders turning busy or loud → abstract cells, even spacing, two or three pigments per row.

## 10. Engine

In `demo/`: `wall.js` (`buildWall`, `shadeFrame`), `brush.js` (`PAL`, `wire`, `halo`, `tubePoly`, `limb`, `ribbon`), `motifs.js` (`groundFill`, `scatter`, `lotus`, `diaper`, `vine`, `pennants`, `cellBand`, `coffer`, `plaque`), `apsara.js` (`drawApsara(ctx, {x, y, s, flip, t, seed, hold, pal})`), `scenes.js` (compositions with their wake and lamp states), `index.html` (`?scene=&p=&anim=&raw=1`). Minimal new use: `lotus(ctx, 400, 300, 120)` on `groundFill(..., PAL.azurite)`, then `shadeFrame` with `wake: () => 2, p: 0` shows a roundel as found.

## 11. Variation space

You decide subject, registers, figures (or none), grounds, lamp route, pacing and score. All far from our demo:

- Structures: **one pattern, painted in order** (underdrawing, colour, age); **a ceiling from corner to centre**; **a ledger on a wall** (niches stand for items, each lit as named).
- Openings: **bare plaster with one cinnabar line drawing itself**; **a lamp flame filling the frame, pulling back to a wall**; **a crack opening onto colour beneath**.
- Endings: **the lamp leaves, one pigment stays visible**; **the wake reaches the frame edge and holds**; **the cave pulls away to one small lit patch**.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
