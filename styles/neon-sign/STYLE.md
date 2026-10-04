# Neon Signage — Style Prompt

> Glass tubes bent into letters and icons, filled with gas, lit along their length on a dark wall at night. The light is the subject: a thin hot line, a coloured bloom, and a wall that only exists where the sign reaches it.
> References (grammar only): real street neon and its workshop craft (bent tube, painted-out sections, electrode boots, transformer boxes); night street photography under shop signs (wet asphalt, coloured spill); the long-take, single-light-source night scenes of Hong Kong and Tokyo cinema (light as mood, signs that flicker as a character). Copy none of their signs, shopfronts, typefaces or shots, and never name them in the film.

## 1. Essence, and what it is not

A frame reads as neon at a glance when it has all of these:

- **Tubes, not strokes**: constant-width glass lines with round bends, a white-hot core, a saturated body, a faint glass edge.
- **Light that leaves the tube**: a bloom around it and a *coloured spill on the wall*, brick texture appearing only inside the glow.
- **A dark world**: near-black wall and street; nothing is lit except by the signs.
- **Physical hardware**: unlit glass, stand-off clips, rails, electrode boots, cables, a transformer box. A sign is an object on a wall.
- **Wet ground** under it, mirroring the tubes as rippled streaks.

Not a sci-fi HUD (hologram-hud: no UI furniture, no scan lines, no data; here the light sits on a physical wall), not a terminal (ascii-crt: no glyph grid, no phosphor, no screen), not a keynote glow (dark-keynote: its glow is a gradient on a flat screen; here every glow follows a bent tube and lights a surface), not a lightbox (paper-lantern: no paper layers, no warm backlit pulp).

## 2. Materials & rendering

- **Layers per frame (procedural, world space)**: *albedo* (brick wall + hardware, no light of its own) → *emitter* (every lit tube segment in its gas colour) → *light map* (ambient + emitter blurred at four radii, ~10 / 35 / 100 / 260 px at 1080p) → *scene = albedo × light map* → glass → emitter added at two blur radii (bloom) → cores → reflection → post bloom and vignette. The wall is texture × light, never a painted gradient.
- **Tube**: diameter ≈ 1 % of frame height for a title sign, 0.6–0.8 % for small text, never under ~7 px at 1080p. Body at full gas colour, core 30 % of the diameter mixed 25–40 % toward white (warm white ~45 %). Round caps and joins; the glass edge is a faint cool rim, visible mostly where the tube is unlit.
- **Letters are tubes**: a single-stroke uppercase alphabet bent with rounded corners (fillets 2–22 % of letter height), one to three tubes per letter. No outline fonts for signs. Icons (bowl, glass, cup, arrow, star, bolt) are the same tubes; a frame is one long tube with a small gap and two electrode ends.
- **Progressive lighting**: a dash offset on arc length; the front carries a small flare, behind it lit, ahead dark glass. Order follows how the tube is bent (stroke by stroke), not a left-to-right wipe. Jumps between tubes are painted out: dark glass, never lit.
- **Wall**: running-bond brick (128 × 46 world px, 4.5 px mortar), per-brick tone variation, soot and damp streaks under hardware, world-anchored grit multiplied on top.
- **Hardware in the albedo layer** (so it takes spill): clips every ~150–200 px of tube, thin rails behind long runs, dark glass boots with a metal cap at every electrode, cables sagging to a transformer box.
- **Wet street**: ground starts at a kerb in the lower fifth to quarter; its reflection is the scene above, flipped, drawn in 3 px strips with a horizontal wobble that grows with distance, blurred 3–4 px, fading with distance, stronger inside puddles. The reflected height must reach the lit tubes.
- **Screen space only**: bloom, vignette, final clip. Tubes, wall, hardware and reflection are world-anchored.

## 3. Colour logic

- **Neon gases only**: red-orange, orange, argon blue, green, pink, warm white. A sign tube has exactly one of them; a gradient inside a tube is a lie.
- **At most three gases in a frame**, and one of them dominates (≥ 50 % of the lit area). Neighbouring hues overlap additively where their glows meet; that mixing is the only blending allowed.
- **The ground is near-black and cool** (ambient 3–6 % blue-grey); brick shows warm only inside red/orange spill. Never a neutral grey wall, never a daylight tint, never a lit sky.
- **Value order**: core (near-white) > body (gas colour) > halo > wall spill > hardware > ambient wall. Unlit glass is grey-blue, ~20 % of the body in value.
- **White-hot is a tube property, not a colour**: pure white fills appear only on cores and the ignition flare.
- Example palette (not a rule): red-orange + argon blue + one small green line, on brick the colour of dried blood.

## 4. Type & subtitles

- **Sign lettering is the tube alphabet of §2**, uppercase, rounded; Latin letters and digits natively, simple icons for the rest. Other scripts are carried by the voice and the subtitles, or by an icon tube; Chinese sign characters follow the Chinese-type rule below.
- **Subtitles** are a small lit caption on the wall's dark lower band or over the kerb: a clean rounded sans (Barlow or Josefin Sans, OFL; for Chinese a subset of Noto Sans SC), 38–46 px, warm white at 85 % with a soft halo in the colour of the nearest sign, on a transparent ground. They switch on with a 2–3 frame stutter (off-on-off-on) and off at once. Hold ≥ max(1.8 s, speech + 0.6 s).
- **On-screen words that the story shows** are tube signs, not captions.
- Micro text on hardware (a label plate on a box) is optional, tiny, never read by the audience.
- **Chinese type** (OFL, subset to the characters used, per TECHNIQUE §11): subtitles use Noto Sans SC Medium. Sign characters are allowed only as **hollow double-line tube outlines** built from Noto Sans SC Black, as on real Chinese shop signs: one closed tube loop per stroke group, characters ≥ 220 px, at most 4 on screen. Never draw them as single-line tubes.

## 5. Motion quality

- **Light behaves, matter does not**: tubes, wall and hardware never move except with the camera. Everything animated is brightness: ignition, flicker, drop-out, colour change by switching sign.
- **Ignition**: front travels along the tube at 400–1500 world px/s, with a stutter of 3–6 frames on and off before the tube holds; the first light is dim and orange-pink, then sharpens into the gas colour.
- **Flicker model**: slow breathing (±2 %), sputter bursts (slots of 70–110 ms where brightness drops to 18–70 %), and rare full drop-outs. A *dead segment* (about 7 % brightness with a rare sputter) lives in one stroke of one letter and does not recover on its own. Flicker is hash-driven by time slot, never random per frame, so a frame renders the same alone or in a sequence.
- **Cuts and switches on beats**: lights going off, on or changing sign are hits; they must have a sound and a frame-exact edge. Easing is for the camera only (ease-in-out, slow); lights use steps and snaps.
- **Frame rate**: 24 fps, flicker on the frame grid (hold a brightness for 1–3 frames, no tweening between flicker states).
- Never animate tube thickness, never make a lit tube wobble.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Locked wide on one wall | A place, an address, patience | an opening; a closing time; a long listen |
| Slow lateral track along a street of signs | Passing time, a neighbourhood, a list | a night in a city; a menu; a timeline of years |
| Push toward one letter / tube | Attention; one fault or one detail | a dead segment; a signature; a brand mark |
| Pull back from a tube to the sign | Meaning arriving | a name resolving from a stroke |
| Tilt down to the wet street | The reflection as a second world | an ending; the sign as an echo; waiting |
| Cut to black on a switch-off | Absence | a closing; a power cut; the film's last beat |

Opening and ending come from the topic. Framing: one sign group is the subject and fills ≥ 1/3 of the frame width; lit tubes never touch the outer 4 % margin except in a macro; keep a dark band for subtitles. Transitions are **lights**: one sign off and another on, a power cut, a flash of ignition. No crossfade between two lit scenes, no wipes.

## 7. Sound palette

- **Ambience**: low mains hum (50/60 Hz with 2nd and 3rd harmonics) that swells with the lit area; very quiet high transformer buzz; distant traffic, wet tyres, rain or drips as the story needs.
- **Foley (all synthesised)**: relay clunk and thump on power; ignition crackle (high-passed noise bursts, fast decay) travelling along the tube; per-stroke ticks; glass fizzle on a sputter; a dying sign's falling hum; wet steps, splashes, a shutter, a door bell.
- **Music**: original; warm electric piano, pads, restrained bass, a sparse tape-delayed lead; the hum can be the tonic. Never synthwave cliché, never chiptune.
- **Silence**: hum alone under a lit sign; one tick before a switch. Gate the music at a switch-off, no fade; let the buzz decay.
- **Mix**: music −8 dB under voice; −14 LUFS; no grain in the mux. **Voice**: close, dry, unprocessed.

## 8. Native moves

- **The tube lights along its path.** A name draws itself as light travels the glass, with a flare at the front. *Fits content like:* a restaurant's name at opening; a progress bar for a build or campaign; a signature being written.
- **A dead segment.** One stroke never lights; a faint sputter shows it is alive. *Fits content like:* the one broken part in a working system; a missing person in a family list; the one wrong number.
- **A sign switches word.** Two layers of tubes (two gases), one dark while the other lights, swapped on a beat. *Fits content like:* OPEN → CLOSED; before / after; day price → night price.
- **The street answers.** The puddle shows a sign the wall no longer has. *Fits content like:* a memory; a rival across the road; the last customer's view.
- **Spill takes over the scene.** A sign comes on and what surrounds it changes colour. *Fits content like:* a face revealed; a launch lighting a stage; a day-night turn.
- **Power cut and restart.** All drop, a thump, they return one by one in the order the story chooses. *Fits content like:* a blackout and recovery; a shift change; a crowd falling quiet.

## 9. Pitfalls of the medium

- **Cream or yellow cores**: a red body + near-white core + several halos pushes G and B up additively. Core mix 25–40 %, halos ≤ 0.45 alpha at wide radii only.
- **Grey rim round lit tubes**: glass edge ≤ 20 % alpha; a hint, not an outline.
- **Reflection that is not there**: a kerb too far below the sign reflects only dark wall. Put the kerb where the reflection reaches the tubes.
- **A mirror street**: crisp flat reflection reads as a pool. Blur 3–4 px, wobble growing with distance, a fade, stronger mirror only in puddles.
- **Small text turns to mush**: give small text its own thinner tube (≈ 7 px) and a larger letter height.
- **Hardware you cannot see**: albedo too dark vanishes. Keep it ~30–40 % grey and put one piece (box, boots, cables) inside a glow.
- **Wall as a flat tint**: always multiply brick albedo by the light map.
- **Flicker that jitters**: hash by 70–110 ms slots and hold; never random per frame.
- **A sign with no power**: every sign has an electrode pair and a wire; lighting follows the real tube path including painted-out jumps.

## 10. Engine

In `demo/`: `neon.js` (the layered renderer: wall + hardware as albedo, emitter, light map, glass, bloom, wet-street reflection; `drawGas`, `renderScene`, `prepSign`, `pointAt`, hardware helpers `rail / clip / boot / cable / box / pipe`), `glyphs.js` (the single-stroke tube alphabet, `neonText`, `icon`, `frame`, `fillet`, `tube`), `main.js` (the scenes; a sign is `{strokes, d, I(t), lit(t), fp, fr, seed}` and a stroke may carry `dead:[[a,b]]`). A minimal new sign:

```js
const w = neonText('PIZZA', 400, 300, 160, GAS.pink);          // strokes in world px
const sign = prepSign({ strokes: w.strokes, seed: 7, lit: t => t * 900 }); // lit along its path at 900 px/s
renderScene(ctx, { signs: [sign], cam: () => ({ cx: 960, cy: 540, z: 1 }), d: 12, street: { hy: 800 } }, t);
```

## 11. Variation space

You decide the shop, the street, the colours (within §3), the opening, the ending, the camera path and the pacing. Far from our demo:

- Structures: **a street at closing time** (a lateral track passes signs as each goes dark, ending on the one still lit); **a sign shop** (a tube is bent, sealed, filled and lit for the first time, ending on the finished piece on a wall); **a one-word argument** (two signs facing each other across a road, switching words in turn).
- Openings: **black, then a single stutter** (a lone tube catches and fails twice before holding); **rain on glass** (blurred coloured lights resolve into a sign as the wiper passes); **the hum first** (the lights come on in the sound before the picture).
- Endings: **the sign switched off by a hand** (a transformer thump, the afterimage fades on the wet street); **dawn takes the colour** (daylight rises and the glow loses to it, the tubes become grey glass); **one tube left lit** (every other sign off, a single letter holding in the dark).

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
