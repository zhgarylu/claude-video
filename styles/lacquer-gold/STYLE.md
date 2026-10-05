# Lacquer & Gold — Style Prompt

> East Asian lacquerware in motion: deep black and vermilion lacquer with a glassy, layered gloss, and gold that is drawn by brush, sprinkled as powder and caught by a moving light. Everything arrives by being applied (brushed, drawn, sprinkled, wiped) and the light is a character.
> References (grammar only): Japanese maki-e and Chinese 描金 / 戗金 / 剔红 lacquer traditions for how gold sits on black, how layers show in a cut, and how motifs are framed by a key-fret border; craft-documentary and luxury-packaging cinematography for slow macro tracks and the single light sweep that turns an object. Never copy a specific museum piece, maker's mark or existing pattern sheet, never use a real brand, and never name a lacquer maker in the film.

## 1. Essence, and what it is not

- **A black that has depth**: not flat black, but a warm, glassy surface that shows a soft window reflection and a darker glow of red under the light.
- **Gold with a raised edge**: lines have a taper, a bright upper-left rim and a shaded lower-right rim, and cast a small shadow; gold powder is a field of tiny grains in several tones, dense at one edge and thinning out.
- **Layers are the subject**: many thin coats, a cut that shows them, a lid that opens on the colour underneath. Time is made visible as thickness.
- **The light moves**: a window reflection, a sheen band, mother-of-pearl flecks that only catch the light where it passes. A still lacquer frame is a dead frame.
- **Patience in the rhythm**: strokes are deliberate, holds are long, the music leaves room, and a silence is part of the craft.

Not a luxury-brand "gold foil on black" (a flat metallic gradient has no raised edge and no moving light), not a dark-mode UI with a gold accent, not Chinese ink wash (no wet bleeding, no white paper), not a red paper-cut or a Dunhuang mural (those are flat or pigment; here everything is glossy and layered).

## 2. Materials & rendering

- **Layer order, bottom to top**: table (dark wood, very low contrast) → object body with a bevelled lip and a soft cast shadow → lacquer face (base gradient, a red glow beneath the black, window reflection, sheen band, pearl flecks) → gold layer → tools (brush, tube, graver).
- **Gold layer**: its own screen-resolution canvas under the world's camera transform. Each stroke is three passes (body, shaded rim to the lower right, bright rim to the upper left) with a taper and a little width noise. Powder is drawn first and the lines over it. A metallic gradient and the moving sheen use `source-atop`, so they touch only gold. The layer is composited with a small drop shadow, plus a blurred additive copy while the light passes, so the gold seems to sit inside the coat.
- **Gold powder**: rejection-sampled grains in four tones with a density gradient (from an edge, or radial) and stray grains outside the shape that a soft brush sweeps away. Sprinkling is a fall with a short streak, ordered across the shape.
- **Window reflection**: a blurred multi-pane window sprite, fading toward its bottom, drawn with `screen`; cool by day, warmer toward evening. It is attached to the object and shifts when the object turns.
- **Turning an object**: re-draw the flat render in thin vertical strips scaled by perspective; reflections, sheen and the "deep" glow are parameters of the flat render.
- **Cut sections**: side view, one rectangle per coat with a bright polished line and a dark seam; a V-groove is nested chevrons that show colours beneath the surface.
- Procedural and world-anchored: gold, powder, pearl, grain of wood. In screen space: vignette, subtitles, the title.

## 3. Colour logic

- **A warm lacquer black is the ground** (never pure `#000`; about 4–8 % luminance with a lighter reflection area). It is the neutral that everything sits on.
- **Gold is the only light colour**, used for line, powder, type and sheen. Its ramp runs from a deep shade through mid gold to a pale highlight; highlights are never white until the sheen peaks.
- **Vermilion is reserved for what lies underneath or inside**: coats seen in a section, the colour revealed by a cut, the inside of a box, a seal. Never red type on black, and never red decoration on the face of the object.
- **Raw wood and cloth** (a tan) appear only as the material before lacquer, and always before the black goes on.
- **Mother-of-pearl** is a few pale teal and pink flecks, never a large area.
- **Value order**: black < vermilion < gold < sheen highlight. One light source direction (upper left); shadows fall lower right.
- Example palette: lacquer `#0c0807`, brown `#2a1810`, vermilion `#b3261a` / `#6e130d`, gold `#7b5513` / `#c4952f` / `#ecc766` / `#fff1b8`, wood `#b98650`.

## 4. Type & subtitles

- **One family**: Cormorant Garamond (OFL). Titles in the roman at 110–170 px with +6 to +10 % letter-spacing, filled with a vertical gold gradient (pale top, deep waist) and a small drop shadow. Numerals use the font's old-style figures. Micro labels in small caps with wide spacing (24–30 px).
- **Subtitles are inscription plates**: italic, 48–54 px, pale gold on a translucent black lacquer strip with a gold hairline on its top edge and a tiny key-fret mark at each end, bottom-centre, fading in over 0.3 s. A plate never sits on top of the subject's focus.
- **Chinese**: only as marks drawn in code (a seal, a character built from strokes); no running text.
- Reading time: hold every caption at least max(1.8 s, speech + 0.6 s, letters ÷ 15 + 1.5 s); keep a title card at least 4 s.

## 5. Motion quality

- **24 fps, smooth**: no stepping, no jitter. Easing is slow in and out (smoothstep, ease-in-out cubic); the exception is a gold line, which moves at constant speed with a taper.
- **Arrival is application**: a coat is brushed across, a line is drawn with a wet bead at its head, powder falls and is swept, a band of lacquer wipes the frame. Nothing fades in, nothing bounces.
- **Weight**: a lid lifts slowly and its shadow grows; a sheen takes 2–3 s to cross; a drop swells, stretches and snaps.
- **Rhythm of work**: a stroke takes 0.2–1.2 s, a coat 0.4 s at first and a twentieth of a second at the end of a count; accelerate by dividing the interval.
- **What never moves**: the lacquer face does not deform, and gold does not wobble once drawn.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Macro track with the brush | work being done, close and slow | a craft step; a signature; applying a coat |
| Crane up a cross-section | growth, accumulation | a count; a build-up; years |
| Push into a cut | proof, the one detail that matters | a layer; a flaw; a proof point |
| Locked frame with moving reflections | waiting, time passing without action | a delay; a decision; reading time |
| Push and follow along a drawing line | attention led by the hand | a route; a story told in line |
| Pull out and turn (pseudo-3D) | the object as a whole, light going deep | a product reveal; a conclusion |
| Lift toward camera, then slide off | opening, revelation | a gift; a chapter; an invitation |

Framing: the subject fills at least a third of the frame height at key moments; a flat top-down view is the default for gold work. Subtitles live on the bottom plate. **Transitions are inside the medium**: a wet coat wipe (a band of fresh black lacquer with bright specular edges sweeps across and uncovers the next shot) or a camera move that stays in the same world. No fades and no hard cuts, except a deliberate cut into silence.

## 7. Sound palette

- **Instruments**: a plucked koto-like string (modal or Karplus–Strong synthesis, bright attack, fast upper decay), a breathy end-blown flute with a scooped entry and late vibrato, a low drum (a soft taiko), long bells with inharmonic partials, slow pad drones. **Pentatonic yo scale** (for example D E G A B) so any foley tick can be tuned into the harmony.
- **Foley follows lacquerware**: a wet brush drag, a wood tap per coat (pitched up the scale as the count rises), a graver scrape, a tiny metal tick per gold stroke, powder as granular high noise, a sheen as an airy glass swell, a lid as a soft pop then a wood slide, a seal as a low thump and a ceramic knock.
- **Ambience**: room tone and rain on a roof (damp air is how lacquer cures). Rain is what remains when the music is cut.
- **Silence is a tool**: at least two near-silences. Cut the music on a downbeat with a 25 ms fade, leave rain and room tone only, and make the first sound after the silence one of the film's key sounds (the first gold tick, a lid popping).
- **Mix**: voice about 10 dB above music, music ducked under it, reverb on music and foley only slightly on the voice, −14 LUFS. Keep pad notes above about 65 Hz; the low end is thin by design.
- **Voice**: calm, close and unhurried (speed about 0.9), short declarative sentences with room around them.

## 8. Native moves

A menu: use the ones your story needs.

- **The coat stack.** A side-view section where each coat is brushed across, cured and polished, with a counter that accelerates by dividing the interval. *Fits content like:* compounding savings or interest; the steps of a multi-day ritual; a long software release history.
- **The cut that shows every layer (剔红).** A graver cuts a V-groove and nested bands reveal the colours below. *Fits content like:* a proof point in a report; a cross-section of a building or a cake; an archive's timeline.
- **The gold line that draws itself (描金).** A stroke grows at constant speed with a wet bead at its head, over a taper. *Fits content like:* a route on a map; a signature or a name; a family tree or timeline growing.
- **Sprinkle and brush (maki-e).** Powder falls over a shape, strays are swept away. *Fits content like:* a festival decoration; a seasoning or spice product; a "finishing touch" step.
- **The sheen sweep.** A band of light crosses the glossy surface, pearl flecks flicker as it passes, a red glow rises under the black. *Fits content like:* a product reveal; a chapter break; an approval beat.
- **The turn.** The object swings about its vertical axis and reflections slide the other way. *Fits content like:* a phone case, a watch or a pen; a trophy; a menu card.
- **The lid opens.** The object lifts toward the camera and slides away to show the colour that was inside. *Fits content like:* a gift box; a wedding invitation; the final reveal of a project.
- **The wet coat wipe.** A band of fresh lacquer transitions the frame. *Fits content like:* any change of place or chapter.

## 9. Pitfalls of the medium

- Flat gold reads as a gradient → draw the lit and shaded rims, a taper and a shadow; let the sheen pass over it.
- Black becomes a hole → warm it, keep a reflection in the frame, run a black-frame check.
- Powder covers the line work → powder first, lines over it; thin the powder along feather or petal lines.
- Uniform powder looks like noise → grade the density, vary tones and size, keep strays and sweep them.
- A frozen reflection kills the gloss → move the window and the sheen, even slowly.
- Red turns decorative → keep vermilion for what is under or inside.
- Pseudo-3D strips show seams or empty corners → overlap strips by half a pixel; draw the flat render underneath first.
- Raw type on glossy lacquer is unreadable → use the inscription plate.
- The light angle drifts between shots → one light direction; the sheen follows camera rotation.
- Blur on every frame slows the render → blur only a copy of the gold layer, only while the light passes.
- Ornaments copied from real pieces → build motifs from your own splines and arcs.

## 10. Engine

In `demo/`: `lacq.js` (palette, `goldStroke` with raised edge and taper, `goldShade`, `goldGlow`, `buildPowder` / `drawPowder`, `buildPearl` / `drawPearl`, `windowSprite`, `sheenBand`, `woodTexture`, `hempPattern`, `flatBrush`, `seal`), `motifs.js` (`catmull`, `resample`, `lineStroke`, the crane, clouds, sun, waves and key-fret, and `schedule` which turns strokes into timed events), `lid.js` (`renderLid` for the whole top-down object scene, `drawTurned` for the pseudo-3D turn), `scenes.js` (the sap drop, the brushed panel, the cross-section with counter and graver, `wipeComposite`, `goldText`), `timeline.js` (one clock for picture, voice and score). A minimal example that draws something not in the demo:

```js
import { goldStroke, goldShade } from './lacq.js';
import { lineStroke } from './motifs.js';
const spiral = lineStroke(Array.from({ length: 12 }, (_, i) => [Math.cos(i * .8) * (140 - i * 9), Math.sin(i * .8) * (140 - i * 9)]), 7);
ctx.translate(960, 540); goldStroke(ctx, spiral, (t % 3) / 3); goldShade(ctx);   // a spiral that draws itself in 3 s
```

File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the object (a lid, a tray, a bowl, a scabbard, a screen, a card), the motif (waves, pines, peonies, characters, a map), the story shape, the voice and the palette within the colour logic. All far from our demo:

- Structures: **an heirloom's provenance** (one object across four generations, each adding a coat or a line, the sheen revealing wear); **a ceremony countdown** (an invitation whose gold lines are written one per hour until the guest list is complete); **a product in a single turn** (a pen or case rotating while its gold marks draw on, the turn being the only camera move).
- Openings: **one gold dot** appearing in a black void and growing a line; **rain on a window** reflected in a still black surface; **a single full-frame brush stroke** of black that becomes the title ground.
- Endings: **a seal pressed** and the frame turning vermilion; **the lid closing** while the window reflection stays last; **the gold lines retracing themselves** along the brush path back to one dot.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
