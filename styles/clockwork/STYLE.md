# Clockwork & Chain Reaction — Style Prompt

> A mechanism that explains by moving: brass and steel gears with teeth that really mesh, cams and followers, levers, escapements, ramps, marble runs and dominoes wired into a chain where one trigger sets off the next, lit like a workshop bench.
> References (grammar only): chain-reaction films, where the audience must be able to predict the next link a moment before it fires; mechanical-watch macro cinematography, where metal reads through a few large soft reflections; music-box and marble-machine builders, where every motion is a note. Never copy a specific machine's layout, a watch movement's design, a known film's objects or a builder's tunes, and never name them in the film.

## 1. Essence, and what it is not

- **Real mechanisms, shown at a scale where you can count the teeth.** A gear pair has its tooth counts on screen or in the voice, and the ratio is the argument.
- **Causality is the drama.** Every event has a visible cause that happened first. The audience reads the chain left to right (or along one clear path) and can name the next link before it moves.
- **Warm workshop light on polished metal.** Brass and steel catch hard highlights from a few big soft sources; wood and felt stay matte and dark behind them.
- **The mechanism is the instrument.** Ticks, clicks, ratchets, rolls and clacks are both the sound effects and the percussion.
- **Time is a material.** A chain can wait, run in slow motion, run backwards (reset), or be traced afterwards into a map.

Not a blueprint or an exploded technical drawing (those are flat and line-based), not a brick or toy world (parts here are metal and precise, not plastic and cute), not a Rube Goldberg gag film (the chain argues something; its jokes serve the explanation), not steampunk costume (no goggles, no cogs as wallpaper: every gear is doing work).

## 2. Materials & rendering

- **3D with real reflections** (three.js, physically based materials). Metals are `metalness 1` with low roughness, a fine brushed bump, and a **procedural warm environment** (a dark room with a few emissive softboxes) for them to reflect. Without that reflected environment brass looks like orange plastic; with it, the gold is mostly the highlights.
- **Gears are built from their maths**: involute tooth profiles from a module and a tooth count; the driven gear's phase comes from the meshing law, so teeth always enter gaps. Check every pair with an overlap test over a full tooth period before using it. Gears sit in layers on standoff pillars; spoke windows and a hub make them read as made.
- **Surfaces**: brass, blackened iron, polished steel, bone (matte), dark walnut (veneer textures), felt. Edges are bevelled a hair (0.05 cm at cm scale) so they catch light.
- **Marbles are polished steel spheres**, with two thin dark equator rings so that rolling is visible.
- **Light follows the camera's target**: a warm key spot from upper left (soft shadows that give depth between layers), a faint cool fill, a warm rim from behind. Shadow detail is where the camera looks.
- **Depth of field and ambient occlusion** (`core/three/post.js`), rendered at 2× and downsampled. Close shots use shallow focus, wide shots almost none.
- **Everything physical is a deterministic function of time**: gears from the drive angle, balls from a numerical integration of rolling on the track, dominoes from a contact law. No state carried between frames.

## 3. Colour logic

- **Warm, low-key, and mostly two materials**: brass (the moving, working parts) against dark wood and iron (what holds them). Steel for what rolls and what turns fastest. Bone-white for the one thing that falls in numbers.
- **Light is the only high contrast**; the board stays at 15–25 % value so that gold reads as light.
- **One accent for "this is the point"**: a brighter, hatched gold on the cause map. No second hue. Cool colour appears only as a faint fill and as reflections of a distant window.
- Analysis layers (cause map, bars, tags) are drawn **as objects of the workshop**: engraved brass plates and tags, a ledger strip, never neon or UI blue.
- Example palette: board `#3f332c`, brass `#f2c872 / #d09a48`, steel `#e6eaee`, iron `#35373d`, bone `#e8dcc0`, ink `#2a1a0a`.

## 4. Type & subtitles

- **Plate lettering**: Courier Prime Bold for subtitles, numerals, ratio tags and plates (it reads as stamped or engraved brass); **Cormorant Garamond** for the few large words (titles, the headline number on the cause map) and **Barlow** for micro labels. All OFL.
- **Subtitles are brass plates** with two screws, dark brown ink, sliding up from the bottom edge like a drawer and out again. One line, 30–36 px. Hold ≥ max(1.8 s, speech + 0.6 s); a plate never overlaps the next.
- **Ratio and part tags** are small brass tags anchored to a world point (a gear mesh, a cam) through the camera's projection, so they follow the camera; hold ≥ 3 s.
- Large text sits over wood or dim areas; never over bright specular highlights.

## 5. Motion quality

- **24 fps, smooth, on ones.** Mechanisms are precise; nothing is stepped. The camera is smooth every frame.
- **Physics sets the motion, not easing.** Rolling spheres accelerate at `5/7 g sin θ`; a tipper is a damped spring; dominoes fall by a contact law and each pushes the next; an escapement's wheel jumps one tooth per tick with a tiny recoil. Where something is driven (a spring motor), spin it up over a fraction of a second.
- **Dwell and snap**: a cam lifts quickly and holds; a latch drops and the next part answers one frame later.
- **Gears turn at constant ratio at all times**, including while the film warps time.
- **Time warp is part of the grammar**: slow motion on the release after a wait (the effect rate eases in and out over ≥ 0.25 s), time-lapse for repeats, true reverse for a reset. Sound follows the warp.
- A moment of **stillness is an action**: a link that waits should visibly be doing something small (a ratchet advancing, a pendulum swinging) so the stillness reads as waiting, not as a freeze.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Follow shot, leading the moving part by a third of the frame | momentum; "where is it going" | a rolling ball; a signal travelling; a package in transit |
| Push-in with a slight orbit | the detail that matters; counting teeth | a ratio; a component spec; a key mechanism |
| Slow lateral pan over idle parts | everything downstream is ready and waiting | a queue; dependencies; a supply chain |
| Whip back to the active part | the wait is over | a handoff; a release; a deadline |
| Slow motion tracking a cascade | cause and effect made legible | a chain reaction; a ripple of consequences |
| Pull out to the whole board, parts dimmed | the chain read as a map | an overview; a post-mortem; a summary |
| Time reverse along the chain | reset; undoing | a rollback; a replay; "again" |
| Locked macro on an escapement or cam | regularity; time | a heartbeat; a metronome; a schedule |

Framing: the active mechanism fills at least a third of the frame height at key moments; the camera sits slightly above the working plane (6–12°) so shelves and layers read. Text and plates sit low or in dim areas. Transitions are camera moves (a whip, a pull out), the chain itself carrying the eye; no dissolves except fades at the head and tail.

## 7. Sound palette

- **The mechanism is the percussion section.** Ticks (steel-on-steel, two alternating pitches tick/tock), ratchet pawl clicks, a spring motor's whirr with the governor's flutter, latch snaps, the knock of a hinged plank, felt-stopped thumps, bone clacks for dominoes, a bowl "ding" for a marble landing in a brass cup, a long inharmonic bell.
- **Rolling** is synthesised from speed: low rumble ∝ v, mid band ∝ v^1.5, bright band ∝ v^2.2, rail-joint ticks every fixed distance (so faster is denser), and a wall scrape at the turn rate in a spiral.
- **Score in the machine's instruments**: music-box comb (steel tines with a bright inharmonic partial), plucked bass (Karplus–Strong), a very soft detuned pad, the bell as the tonic. Pentatonic modes fit (a minor pentatonic while stuck, the major pentatonic once improved). One option: the picture and score share data — each domino is a note up the scale, so the cascade is literally a run.
- **The beat is the escapement's.** Choose a tempo from a real pendulum (`T = 2π√(L/g)`; a 38.8 cm pendulum ticks every 0.625 s = 96 BPM) and put the grid on the ticks.
- **Silence is a tool**: cut the music dead on a downbeat and let ratchet clicks and room tone carry a wait; make the first sound after a silence one of the most important sounds in the film.
- **Mix**: voice compressed, music ducked ~7 dB under it, foley ducked ~3 dB, ticks barely; −14 LUFS. Voice: calm, dry, measured (a British baritone suits a workshop).

## 8. Native moves

- **Trigger → chain.** One small event sets off the next, each a different mechanism. *Fits content like:* a deployment pipeline; an assembly line; the steps of an application process.
- **The ratio.** A pinion drives a wheel: count the teeth, say the ratio, show what is traded (speed for force). *Fits content like:* leverage in a team; exchange rates; how a bicycle's gears work.
- **The wait.** One link is slow; everything after it stands ready. Pan across the waiting parts, then whip back. *Fits content like:* a bottleneck in a factory; a slow approval; a dependency on one supplier.
- **The tick.** An escapement regulates a whole system and gives the film its beat. *Fits content like:* a production schedule; a heartbeat; a market's trading day.
- **The cascade.** Dominoes in slow motion after a wait. *Fits content like:* contagion; a price shock moving through a supply chain; a chain of consequences.
- **The cause map.** After the run, dim the world and trace the chain as numbered nodes with a to-scale time bar; the long link shows itself. *Fits content like:* a post-mortem; a billing breakdown; a recipe's critical path.
- **Swap one part.** Change a single gear, cam or lever and run it again. *Fits content like:* an A/B test; a process improvement; a product variant.
- **The reset.** Run the chain backwards at speed; dominoes stand up, balls roll uphill. *Fits content like:* a rollback; "once more from the top"; a refund.

## 9. Pitfalls of the medium

- **Orange plastic**: brass lit by lights only, with no environment to reflect → build the warm room and raise the environment intensity; keep roughness ≤ 0.3.
- **A glossy board**: veneer roughness maps reflect the softbox as a big hot blob → give wood a fixed roughness ≈ 0.9.
- **Teeth that do not mesh**: tooth shapes made by hand intersect over a cycle → build involutes and run the overlap test; derive the driven gear's phase from the meshing law.
- **Everything the same speed** → vary the pace on purpose: a fast link, a wait, a slow-motion release.
- **A wait that looks like a freeze** → keep something small moving (ratchet, pendulum) and keep the sound alive.
- **A chain whose cause is hidden** → place each mechanism so the trigger is in frame at least a beat before the effect; lead the camera.
- **Part tags drifting off their gear** → project them through the same camera as the picture every frame.
- **Dominoes that fall all at once** → solve their contact law with a stiff damped contact and a reaction on the pusher, not a fixed delay.

## 10. Engine

In `demo/`: `engine/gears.js` (involute outlines, `meshAngle`, `meshCheck`: pure maths, runs in node), `engine/machine.js` (the whole chain as `state(tau)`; layout derived part by part; marble integration, tipper, spring train with a cam, domino contact law, an `events` list and the link durations for the map), `engine/parts.js` (materials, gear/escape-wheel/anchor/cam/trough/bell geometry, brass plates), `engine/scene.js` (builds meshes from the layout, `pose(state)`), `engine/world.js` (renderer, warm environment, lights that follow the target, post chain), `timeline.js` (machine time → film time, the film's schedule, the voice lines), `main.js` (camera shots, overlay: subtitle plates, tags, cause map; `window.render`, `EV`, `TEXTS`), `mix.py` (score, foley and voice from the events), `tools/mechcheck.mjs` (physics gates). A minimal use that is not in the demo: `gearOutline(18, 0.4)` and `meshAngle(18, 24, phi, theta)` give two meshing gears for any other machine; `buildMachine({pair2: [20, 40]})` re-runs the whole chain with another ratio. File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the topic's chain: which mechanisms stand for which steps, where the long link sits, the palette within the colour logic (brass and iron, or silver and blue-black for a cold lab), the layout (a long board, a tower, a ring), the opening, the ending and whether the film is traced, reset or left unfinished. All far from our demo:

- Structures: **a single object's journey through a factory** (a coin dropped in the first cup travels a chain of different mechanisms, each labelled by a plate, to a vending-machine-like end); **a countdown clock whose gears drive everything** (each wheel of one big movement triggers a different small automaton, read like a calendar); **a failure and its repair** (a chain that jams at link 5, the camera follows the stalled energy back to the cause, a part is replaced, and it runs).
- Openings: **a tilted ball in a bowl** held by a single latch; **a cuckoo-style door** that opens and releases a spring; **the first domino standing alone** in the dark, lit by one lamp.
- Endings: **the last domino leaning and not falling** (the chain waits for you); **the whole mechanism rewinding to its first state and the lamp going out**; **a bell that rings the same note as the first tick, an octave lower**.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
