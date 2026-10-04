# Vaporwave & Y2K Chrome - Style Prompt

> Late-90s and early-2000s digital nostalgia rebuilt as a small software 3D world: a banded low sun over a pink-cyan-violet sky, a perspective grid or checker floor, chrome and liquid-metal objects that reflect that same sky, candy-plastic bubbles, procedural marble and early-web dialog windows, seen through a tape-and-JPEG lens. It moves like a slowed and reverbed track: floating loops, a sinking sun, glitch cuts on the beat.
> References (grammar only): the gradient-sky-and-grid horizon of 1980s retro-futurism as recycled by internet vaporwave; Y2K product and title design; early desktop software. Copy no existing statue, logo, operating system, brand, album cover or typeface, and never name them in the film.

## 1. Essence, and what it is not

- **A gradient sky, not a photo**: hot pink at the horizon, violet above, a cyan veil, posterised streak clouds, a few stars, and a **banded sun** (slots that widen toward its lower edge) sitting low.
- **A floor in perspective**: a glowing grid scrolling toward the viewer, or a glossy pink-violet checkerboard, fading into haze.
- **Chrome that reflects the sky**: inflated 3D type and liquid-metal blobs showing a white-hot horizon line, dark floor below, sky above.
- **Candy plastic**: translucent bubbles with a window-shaped highlight, bright inner rim, refracted background.
- **Early-web furniture**: lavender-silver bevelled dialogs, gradient title bars, progress bars, a pixel cursor.
- **A damaged lens**: dither, JPEG chroma blocks, scanlines, tape tracking, glitch slices.

Not neon signage (neon-sign: tubes on a dark wall; here nothing is dark), not a CRT terminal (ascii-crt), not a HUD (hologram-hud: wireframe light on black), not found footage (backrooms: dim, decaying), not a keynote (dark-keynote: black stage).

## 2. Materials & rendering

Three passes over a world rendered in code:

- **Scene pass (raymarched, world space)**: signed-distance shapes. *Inflated type*: a word rasterised once into a signed-distance texture, given a rounded extrusion (bevel about 60 % of the half-thickness). *Liquid-metal blobs*: three or four smooth-unioned spheres on slow sine paths. *Marble busts and columns*: original ellipsoids, capsules, fluted shafts and plinths, veined by warped noise; never a real statue.
- **Chrome = environment mapping of the sky function.** Sample the sky function along the reflected ray with an exaggerated vertical term, so each letter crosses the horizon: a white line mid-letter, sky above, dark floor below. Add a contrast curve and a thin dark edge so metal separates from a pale sky.
- **Floor**: grid lines with analytic anti-aliasing (width grows with distance), glow, every fourth line brighter, fading to haze. The glossy checker blends in by one parameter and reflects the objects (one extra march).
- **Compose pass**: candy bubbles are analytic spheres drawn far to near (refraction by sampling the scene shifted by the normal, rim glow, a soft window highlight). Bloom from scene mips, thresholded high. A lens flare follows the sun. The 2D UI layer goes on top.
- **Post pass (screen space)**: glitch slices and block shifts keyed to the frame slot, chroma split, 8x8 chroma blocks, a VHS tracking band, scanlines at 8 % or less, ordered Bayer dither to about 40 levels so gradients keep a visible pattern.
- **UI and silhouettes (2D per frame)**: windows with a hard translucent drop shadow; palms as dark violet silhouettes with a pink offset rim; sparkles as four-point stars added with `lighter`. World-anchored: sky, floor, chrome, marble, bubbles. Screen space: the rest.

## 3. Colour logic

- **Three hue families**: pink/magenta, aqua/cyan, violet/indigo, plus **one warm sun** (yellow, shifting to orange then red as it sinks). Pink and cyan meet as lavender-white, never grey.
- **Nothing is black.** The darkest value is deep indigo-violet (about `#1a0a3a`), reached only by palms and chrome undersides.
- Chrome takes its colour from the sky; marble is pale lavender with cool shadows; each bubble has one candy tint (pink, aqua, violet, lemon, mint, coral).
- UI is lavender-silver (`#d4cdf4`, white and indigo bevels); saturation only in title bars and progress blocks.
- Value order: sun and chrome highlights > horizon sky > top sky > floor > palms. White is for highlights and sparkles, not fills.
- Example palette (not a rule): `#ff4fc3`, `#3fe8ff`, `#7a4dff`, sun `#ffe45e`, indigo `#24114f`.

## 4. Type & subtitles

- **Hero type is inflated chrome** (section 2): uppercase, heavy and wide, Unbounded Black (OFL), at most 12 letters, filling at least 1/4 of the frame width, lit by the same sky. It may spin about the vertical axis; face the camera when it must be read.
- **Window text**: Silkscreen Bold titles and buttons (17-20 px), VT323 body (26-32 px), both OFL. File names and menu words are invented.
- **Subtitles** are WordArt-like captions at the lower middle: Unbounded Bold 34-40 px, a white-pink-cyan-lilac gradient, a 3 px indigo outline, a hard offset shadow. Hold at least max(1.8 s, speech + 0.6 s). Words the story shows are windows, not captions.
- **Chinese type** (OFL CJK fonts, subset to the characters used, per TECHNIQUE section 11): hero words use Noto Sans SC Black (or ZCOOL QingKe HuangYou) as the glyph source for the inflated-chrome pipeline, at least 220 px tall, bevel at most 45 % of the stroke half-width. Window body: Noto Sans SC Medium (or DotGothic16), 26-30 px; captions: Noto Sans SC Bold with the same gradient and outline.

## 5. Motion quality

- **24 fps, smooth.** The world floats on slow sines (0.3-0.9 rad/s): nothing is dead still, nothing shakes. The grid scrolls at a speed constant within a move; the sun descends monotonically.
- **Windows pop** in 4-6 frames with overshoot and close faster. Progress bars advance in blocks and may stall.
- **Chrome type spins** with an ease-out and settles facing the camera.
- **Glitch is an event**: a 0.3-0.5 s hit on a beat that decays exponentially; between hits the damage is steady and light.
- **Deterministic**: glitch and twinkle are hashed by time slot.
- Slow dollies, small orbits, a tilt, at most 1 degree of roll; never hand-held.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Slow dolly toward the sun | Longing, time passing | an opening; a countdown; a loading story |
| Low locked wide, horizon in the lower third | A place, a held moment | a title; a pause; a type reveal |
| Gentle orbit of a bust or blob | Looking at an object in a gallery | a product; a person; an artefact |
| Push toward a window | The one message that matters | an error; a prompt; a decision |
| Glitch cut | A jump on the beat | a change of place or idea; a memory flickering |

Opening and ending come from the topic. The hero fills at least 1/4 of the frame width or height; the horizon stays in the lower 40 %; windows sit in a corner or lower third, off the hero. Transitions are **glitches, pop-ups and the floor blending between grid and checker**: no crossfades, no wipes.

## 7. Sound palette

- **Slowed and reverbed, synthesised, no samples**: wide detuned pads, chopped chords (a held chord repeated with a gate and stutter, pitched down), soft bell keys, sub bass, a lead with long tape delay, hall reverb on everything but the kick. 60-80 BPM; minor ninth or major seventh colours.
- **Foley**: a click and a two-note chime per window pop; a glassy bloop per bubble; a metal shimmer on the chrome spin; a tape-stop on a glitch cut; a low riser under the sinking sun.
- **Silence is a stall**: on a hang the music gates out, leaving reverb tails and a faint hiss; the first sound after it matters most.
- **Mix**: warm and low-passed, music about -8 dB under voice, -14 LUFS, no grain in the mux. **Voice**: close, soft, dry, a little low-passed; never an announcer read.

## 8. Native moves

- **The window pops.** A dialog scales open with a chime; a stack is a rising argument. *Fits content like:* a feature list; terms and conditions; recipe steps.
- **The chrome spin.** A word spins in chrome and settles facing the camera. *Fits content like:* a name reveal; a season; a countdown digit.
- **The sun sinks.** One banded sun descends and reddens; the ending is when it is gone. *Fits content like:* a day; a trip; a deadline.
- **The grid becomes the floor.** The line grid dissolves into a glossy checker. *Fits content like:* data turning into a room; a feed into a gallery; a mood shift.
- **The hang.** A progress bar stalls near the end, the music gates out. *Fits content like:* waiting for a result; an awkward pause; the moment before good news.
- **The glitch cut.** On a beat the picture tears and lands in the next scene. *Fits content like:* a change of topic; a before/after.

## 9. Pitfalls of the medium

- **Washed-out pastel**: bloom, haze and sun glow together turn everything white. Threshold bloom high, haze only near the horizon, soft shoulder above 0.8.
- **Flat chrome**: a flat face reflecting the horizon is pink plastic. Use the vertical term, a dark underside and edge, the white horizon line.
- **Damage over the message**: a tracking band or glitch across a window or caption makes it unreadable. Aim the band away from the subject (a parameter); glitch the hits, not the holds.
- **Uncanny bust**: faces read as mannequins. Keep them abstract, in three-quarter or cropped views.
- **Grid moire and a frozen scroll**: sub-pixel lines shimmer; one cell per frame looks stopped. Widen lines with distance, avoid whole-cell speeds.
- **Real brands creeping in**: no start buttons, taskbars, logos or real icons.

## 10. Engine

In `demo/`: `shaders.js` (`SCENE`, `COMPOSE`, `POST`), `main.js` (WebGL2 set-up, `buildTextSDF(text, font)` with an exact distance transform, uniforms), `ui.js` (windows, progress bar, cursor, palms, sparkles, captions), `shots.js` (`stateAt(t)`: camera, sun, floor, objects, bubbles, windows). A minimal new state:

```js
uploadSDF(buildTextSDF('NIGHT', '900 330px Unbounded'));   // a different hero word
const S = { cam: { pos: [0, 1.2, 9], tgt: [0, 2.6, 0], fov: .88 }, sunY: .3, text: { on: 1, pos: [0, 3, -1.5], rot: 0, scale: .9 } };
```

## 11. Variation space

You decide the topic's metaphor, hero word or object, the sun's journey, camera path, scene order and pacing, within section 3. Far from our demo:

- Structures: **a gallery tour** (marble rooms, each with one object and one window); **a countdown** (chrome numbers spinning in turn under a changing sky); **a mixtape** (side A the grid, side B the checker, a glitch cut as the tape flips).
- Openings: **one window pops on a violet void**; **the sun first** (a banded sun on a gradient, then the grid draws in); **a chrome blob falls and settles**, its bloop the first sound.
- Endings: **the sun is gone, stars and one sparkle remain**; **every window closes in reverse**; **the grid keeps scrolling after the word has gone**.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
