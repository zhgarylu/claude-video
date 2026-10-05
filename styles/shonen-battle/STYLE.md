# Shonen Battle — Style Prompt

> The visual grammar of 1990s battle manga and anime, drawn in code: heavy hand-inked outlines, flat cel colour with one hard shadow, speed and focus lines, impact frames, stacked-flame auras, and above all a rhythm of long holds broken by three-frame explosions of action. Everything is serious and enormous, whatever it is about.
> References (grammar only): the weekly boys' action serials and their TV adaptations of the 1990s for the drawing of effort, the aura, the power-up and the face-off; sports and fighting anime for held frames, limited animation and the impact frame; title-card and next-episode-preview conventions for lettering. Never copy a character, a hairstyle signature, a named technique, a logo, a series title or a layout. Invent the hero, the rival and the world.

## 1. Essence, and what it is not

- **Timing is the style.** A frame becomes "shonen" when it is held and then released: a long charge (a held drawing, a trembling line, a rising hum), then an explosion that lasts three frames, then a hush. Drawing without this rhythm is just a cartoon.
- **Heavy ink, flat colour.** Every shape has a thick outline that is thicker on the shadow side, one flat fill, and at most one hard-edged shadow shape. No gradients on characters, no soft shading, no gloss.
- **Lines of force.** Speed lines and focus lines (集中線) are the camera's emotion: they converge on the thing that matters and stay readable.
- **Effort is drawn on the body.** Clenched teeth, a vein mark, sweat drops, trembling outlines, hair and cloth lifted by the aura, cracks in the ground, debris rising.
- **Scale is a joke or a threat, never an accident.** The stakes are stated at maximum; the subject may be an exam, a recipe or a rival product. Comic and heroic are the same grammar at different sizes.
- **Invented content only**: an original hero, an original rival (a person, a rival team, an object, a number), an original setting.

Not a manga page (see manga-panel: no screentone-only black and white, no reading order of panels), not a western comic (see comic-pop: no halftone-and-primary-colour print look, no speech balloons as the main device), not a smooth modern anime (no fluid in-betweens, no bloom, no depth of field), not a 3D fighting game.

## 2. Materials & rendering

- **Line**: a rounded outline of 6–11 px at 1080p, drawn as two passes (a thinner one and a heavier one offset to the lower right) so the weight changes with the light. Ink colour is a near-black with a blue or violet cast (`#0d0b16`), never pure black on coloured shapes.
- **Boil**: re-jitter every outline point by 1–2 px every second frame (12 fps), so held drawings shimmer like hand-inked cels. Seed the jitter from the frame number: the render must stay deterministic.
- **Fill**: flat colour, plus one hard shadow shape clipped inside the outline (a band on the side away from the light, a crescent under the chin or fringe). Highlights are white shapes, not gradients.
- **Backgrounds**: either a painted-flat set (a few tones, hatching for texture) or an abstract field (flat colour with focus or speed lines). Combat moments leave the set and go abstract.
- **Aura**: three to four stacked flame silhouettes (dark, mid, light, white core), each a spiky arch whose tongues are re-rolled at 12 fps. It is drawn behind the figure, wider than the body and taller than the head, and it also lights the figure (tint the skin and cloth a little toward the aura colour).
- **Impact frame**: one or two frames where the picture is replaced by a black-and-white, high-contrast version (threshold the frame, invert the first frame, plain on the second) with a burst and focus lines. Drawn from the real frame, so it always matches the shot.
- **Effects are drawn shapes**: cracks are jagged tapering fissures with a light edge, dust is a cluster of outlined circles, debris is flat polygons with a shadow edge. No particles with soft alpha edges, no blur.
- **Light grain only** at the mux (1); the picture is crisp.

## 3. Colour logic

- **Two sides, two hues.** The hero's side and the rival's side each get one hue family with three values (deep, mid, light) used for aura, rim light and name plates; they must be far apart (cyan against violet, orange against blue, green against magenta).
- **Saturated, flat, high contrast.** Backgrounds in combat are darker than the figures; effort scenes use the hero's hue as the field.
- **Calm scenes drop the hue**: reflection, memory and aftermath are warm cream, peach or pale blue with screentone dots and no lines of force. Calm is a colour shift as much as a pacing one.
- **Black and white are for the impact only.** A black-and-white frame in a coloured film is an event; don't use it for style.
- **One signal colour for danger or victory words** (a hot pink or yellow) shared by lettering shadows, bursts and plates.
- Example palette: ink `#0d0b16`, skin `#f7c9a1` / `#dd9970`, hero cyan `#0a93ad` `#1fe7d2` `#9ff8ee`, rival violet `#7a22d8` `#d03ee6` `#ff4a8a`, impact yellow `#ffe14a`.

## 4. Type & subtitles

- **Sound words and shouts** in a heavy comic display face (Bangers, OFL) set large, tilted 4–8 degrees, with a thick ink outline and an offset hard shadow in the signal colour. They pop in at 2x scale and settle in about 0.25 s, then jitter slightly while held.
- **Plates, meters, cards and subtitles** in a condensed heavy grotesque (Anton, OFL): white on an ink parallelogram with a thin coloured stripe along one edge. Plates slide in from the side with an ease-out.
- **Round cards and titles** slam to the middle, then glide to a corner and stay as a label.
- **Meters** (power, grip, health) are segmented bars with a number; the number changes only in steps that stay readable (hold each reading at least letters/15 + 1.5 s); the bar may move continuously.
- **Subtitles** are a slanted ink bar at the bottom with a coloured underline, one speaker colour each; hold ≥ max(1.8 s, speech + 0.6 s).
- Keep every word readable at thumbnail size; shouts are one word.

## 5. Motion quality

- **Held, then exploded.** Most of the time nothing but the outlines moves (boil), the aura flickers at 12 fps and a tremble grows. Action lasts two or three frames at 24 fps, usually on a smear (a ghost trail and a bright arc) and into an impact frame.
- **On threes and twos.** Expression and pose changes step at 8 fps (on threes); flames and boil at 12 fps; the camera, shake and zoom run every frame.
- **Easing**: slow ease-in for charge (cubic or stronger), hard cuts for action, exponential decay for shake. No linear moves, no bouncy springs on anything heroic.
- **Screen shake**: amplitude = size of the hit, decaying with a time constant of 0.2-0.6 s; a sustained tremble (3-10 px) under any charge.
- **Reactions are panels**: a slanted inset or a diagonal split with a white gutter shows a face reacting; it appears in one frame and is not animated in.
- **What never moves**: lines of force do not scroll smoothly; they re-roll every second frame.

## 6. Camera grammar

A vocabulary, not a route. The camera is a 2D move (centre, scale, a few degrees of roll) over drawn art, cut hard in action and slow in tension.

| Move | What it expresses | Can serve |
|---|---|---|
| Extreme close-up of the eyes in a strip panel | resolve, fear, recognition | an opening; a decision; a reveal about to land |
| Low angle on a full figure with a looming aura | power, readiness | a launch; a comeback; a team entering |
| Diagonal split screen with a lightning gutter | face-off, comparison | rivals; before and after; two products or options |
| Slow push on a held drawing | a charge building | a deadline; a long wait; training |
| Hard cut to a 3-frame action, then the impact frame | the release | a hit; a launch; a decision made |
| Dutch tilt with focus lines on a threat | menace | the antagonist; a problem; a number that is too big |
| Fast whip tilt following an object upward and back | consequence | something launched; a result; an escape |
| Wide, high angle on the wrecked set | the cost | an aftermath; a joke about consequences |
| Hold on a quiet face, panel inset | the beat after | humour; relief; emotion |

Rules: the subject fills at least a third of the frame height at key moments; lines of force converge on the subject; text never covers the face or the point of impact. Transitions are drawn: a slanted black wedge with a coloured edge, a diagonal wipe, an impact flash; no dissolves.

## 7. Sound palette

- **Impacts**: a deep sine that drops in pitch (a taiko-like thump) with a short noise crack on top and a long sub tail; the bigger the visual, the longer the tail, but the silence after matters more.
- **Whooshes and swishes** (band-passed noise swept up, 0.12-0.5 s) on every fast move and cut.
- **Charge**: a rising hum made of stacked harmonics with a tremolo that speeds up, wind noise, rattling debris; a heartbeat of taiko that accelerates by halving the interval.
- **Shouts**: short, formant-shaped vowels (a rising pitch with vibrato and breath), mixed above the music; voice-over is a deep, plain narrator.
- **Foley**: cracks (noise burst + stone ticks), debris clatter, glass and metal pings (inharmonic bell partials), fabric and air.
- **Score**: taiko, low brass stabs and short riffs, a pulse bass in eighths, hat ticks; for the calm moments a music box or soft bells over a warm pad. Minor, driving, 110-150 BPM in action; slow or absent in tension. Bursts sit on the grid.
- **Silence is the loudest sound.** Cut everything (music, foley, room tone) for 0.3-3 s before the release and after a defeat; the first sound after the silence is the hit or a very small sound that should have been the hit.
- **Mix**: duck music about 5 dB under voice; shouts and impacts are the loudest layer; a short hall on the wet bus; −14 LUFS with a limiter (impacts have a high crest).

## 8. Native moves

A menu: use the ones your story needs.

- **The charge.** A held low-angle figure, rising aura, floating debris, a meter filling, a hum, a faster heartbeat, then a hard stop. *Fits content like:* a product launch countdown; the last minute before an exam, a pitch or a race; a quiet decision before a big announcement.
- **The three-frame release into the impact frame.** Wind-up, smear, contact, then one inverted and one plain black-and-white frame. *Fits content like:* the moment a feature ships; a finishing move in a sport; the punchline of an argument.
- **The face-off.** A diagonal split, two auras, two plates, a lightning gutter. *Fits content like:* a comparison of two options; two teams before a match; a customer problem against a solution.
- **The power meter.** A segmented bar and a number that jumps. *Fits content like:* stats, rankings and scores; a skill level; an effort level in a training piece.
- **Round cards.** A word slams to the middle and glides to the corner. *Fits content like:* chapters of a how-to; stages of a tournament; steps in a recipe.
- **The reaction panel.** A slanted inset of a face in one frame. *Fits content like:* surprise at a result; a customer reaction; an audience cut-in.
- **The aura shatter.** Flame shards fly off the defeated side. *Fits content like:* a problem solved; a rival overtaken; a bug fixed.
- **Floor cracks and rising debris.** Fissures grow from the feet. *Fits content like:* the weight of a decision; the force of a crowd; a deadline pressing down.
- **Hush after the hit.** The set returns calm, one small sound. *Fits content like:* a quiet reveal; relief; the joke after the epic.

## 9. Pitfalls of the medium

- **Drawing instead of timing.** Beautiful frames without the hold-and-burst rhythm look like a slide show. Fix: write the cue map first; put at least one silence and one three-frame action in the film.
- **Smeared or unreadable lines.** Speed and focus lines drawn too many, too thin or too long turn into noise and swallow the subject. Fix: 90-130 focus lines, a clear empty ring around the subject, outer rim thick and inner tips thin, re-roll every second frame; keep them lighter or darker than the field, never mid-grey.
- **Motion blur or tweening.** Smooth interpolation of poses kills the genre. Fix: hold drawings, step expressions at 8 fps, use a smear only for the action frames.
- **Constant intensity.** Every shot at full aura and full shake is flat. Fix: calm shots with no lines at all, shake only on hits.
- **Impact frame not from the shot.** A generic white flash is a dissolve. Fix: threshold the real frame, invert the first one, add a burst.
- **Text too brief.** A sound word that flashes for three frames cannot be read. Fix: let it pop in and hold for at least letters/15 + 1.5 s while it jitters.
- **Cracks like twigs.** Thin, curly, evenly branching lines read as plants. Fix: straight jagged segments, thick root tapering to a point, a light edge, few branches, and keep them on the ground plane.
- **Dust that looks like pasta.** Soft, translucent blobs. Fix: outlined clusters of circles with a flat shadow, drawn at full opacity and cut away by hold time, not alpha.
- **A hero in the middle of lines at full size with no room for text.** Keep a safe area for plates, meters and subtitles; compose the figure off-centre.
- **Copying a known pose, hairdo, move or sound.** Invent every signature element.

## 10. Engine

In `demo/`: `ink.js` (the toolbox: `shape` with the two-pass outline and boil, `ink`, `taper`, `tube` for limbs, `focusLines`, `speedLines`, `burst`, `aura(cx, baseY, rx, ry, intensity, colours)`, `cracks`, `puff`, `chunk`, `hatch`, `tone`), `art.js` (original characters and set: `haruHead`/`bust`/`haruStance`/`fist`, `jar`, `kitchen`, `spoon`; they show how to build a face with open/anger/iris/glint, a mouth bank and effort marks from a handful of polygons), `film.js` (shots, `lettering`, `plate`, `roundCard`, `hud` meter, `captions`, `shakeAt`, the impact frame trigger), `timeline.js` (shots, shake table, voice, sound events), `main.js` (page contract, the impact-frame filter, text list for the reading check), `mix.py` (taiko, brass, music box, formant shout, foley, hall, ducking). A minimal use of the toolbox:

```js
import { use, shape, focusLines, aura, cracks } from './ink.js'; use(ctx);
focusLines(960, 540, { n: 110, rIn: 380, rOut: 1700, col: '#fff' });
aura(960, 1000, 380, 800, 1, ['#0a93ad', '#1fe7d2', '#9ff8ee'], { t });
cracks(960, 980, 1, { len: 1100, k: .3, a0: 0, a1: Math.PI, floor: true });
```

## 11. Variation space

You decide the hero, the rival, the world, the palette pair, the stakes, the order of holds and bursts, and which native moves you spend. All far from our demo:

- Structures: **a tournament bracket** (three rounds against different opponents, each with its own meter and its own failure, the last won by changing the rules); **a training montage** (one hero, one weight, a meter that rises in steps and a scene change at each plateau, ending on a single understated hit); **a team entrance** (five figures walk into a split-screen line-up one at a time, each with a plate, ending in a joint pose and a title).
- Openings: **a title card slammed on black**; **a shoe on a track, the whole stadium silent**; **a close-up of a phone screen with a notification, shot as a draw**.
- Endings: **a held frame of the winner with the aura fading to nothing**; **the impact frame stays on screen and the credits roll over it**; **a "next time" card with a teaser of a bigger rival**.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
