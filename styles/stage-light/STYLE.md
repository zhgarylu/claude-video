# Stage Light Performance — Style Prompt

> A concert or music-video look made of light: a dark stage, faceless silhouettes, follow spots and moving-head beams sweeping through haze, an LED wall behind, a crowd of raised hands at the bottom of the frame. The light is the lead instrument: every cue is locked to the music's beat grid and sections.
> References (grammar only): arena and festival main-stage broadcasts and tour films (the light designer's cue stack, blackout before the drop, restrained colour per section), silhouette title sequences (a figure is always the darkest shape against something lit). Never copy a real act's staging, set, LED content, logo or melody, and never name one in the film.

## 1. Essence, and what it is not

- **The picture is made of additive light on black.** Beams, glows, pools and the LED wall add; the performers are the only things that subtract.
- **Faceless silhouettes**, drawn as clean flat shapes (singer at a mic stand, drummer, guitarist, bassist, dancers). Readable in profile of limbs and instruments, never detailed.
- **Haze makes the beams.** Beams are visible only because a drifting haze scatters them; haze density is a lighting parameter, not decoration.
- **Cues, not animation.** Lights switch, sweep, converge and flash on the bar grid. A beam that moves at no tempo is wrong.
- **One restrained palette per section**, and a blackout is a cue like any other.

Not a lyric video (type is secondary here), not a neon sign or a hologram HUD (no outlines or glow-on-glass: the light is volumetric, in a space), not a keynote (a keynote lights a speaker; this lights a performance).

## 2. Materials & rendering

- **Layers back to front:** black ground and floor, LED wall (in perspective) and its reflection on the glossy floor, haze glow, the beam layer, flash, risers and performers, a faint second pass of the beam layer over the performers (haze is also in front of them), lamp glows and streaks, particles, crowd, vignette, bloom.
- **Additive blending** (`lighter`) for everything luminous. Colour is summed, never painted over: where two beams cross the colour gets brighter and paler, which is the look.
- **Beams** are cones from a lamp to its target: a trapezoid in screen space from the projected lamp to the projected end (the floor, or a clipped point if the target is behind the lens), drawn as 2-3 nested widths with a linear gradient along the axis. A beam that hits the floor ends in an elliptical pool whose aspect follows the camera pitch. Render the beam layer at half resolution (it is soft), then modulate it by a **tileable noise haze texture that drifts** slowly (`destination-in`). Hot cores, lens glows and anamorphic streaks are drawn at full resolution on the lamps.
- **Performers** are a 2D skeleton solved per frame (hands and feet as targets, two-bone IK for elbows and knees), painted near-black with a thin **rim light** (the same shape offset up and sideways in the section colour, painted before the black body). A follow spot or front light is an additive gradient pass over the same shape. Never fill a performer with a bright flat colour.
- **World to screen is one function** (a camera with orbit, distance, height, aim): lamps, targets, wall, performers, crowd, confetti and sparks all go through it, so an orbit or crane keeps every light in place.
- **LED wall:** low-resolution pattern (about 190x80 cells) scaled with nearest-neighbour, a dot mask multiplied on, drawn in vertical slices to get perspective, and mirrored under the floor line for a reflection that fades with depth.
- **Particles are analytic in time** (confetti with drag, terminal speed and flutter; sparks as ballistic streaks), so any frame renders alone.
- **Bloom** is two small blurred copies of the frame added back at low strength; it must not turn the whole frame white.

## 3. Colour logic

- **The ground is black**, with a faint blue-black in the haze. The lit colours are few: **one or two hues per section**, a hot white only at the lamp cores and in flashes.
- The palette follows the song's sections: cold and white when dark, one cool hue while building, a warm-versus-cool pair at the drop, **a single colour in the break**, and every hue together only at the finale. The finale is the only place with three hues.
- Colours are saturated lamp colours (blue, magenta, violet, amber, white), never pastel and never greys; a section's rim light, beams, wall and haze glow share its hues.
- Value order: lamp cores > beams > wall > haze > performers (black) > crowd (blacker). The silhouettes are always the darkest thing in front of something lit.
- Example palette (from our demo): blue `#2878ff` / `#3ca0ff`; magenta `#ff2da0`; violet `#8c3cff`; amber `#ffac34`; hot white `#fff4e4`.

## 4. Type & subtitles

- Condensed grotesque capitals: **Bebas Neue** (OFL) for the act and song names, **Barlow Condensed** (OFL) for small captions, wide letter-spacing on small sizes.
- Titles belong to the show: a lower-third in screen space, a **wordmark on the LED wall** (set in the wall's low-resolution grid so it is chunky and dotted, projected with the wall), an end card on black under a single spot.
- Type never sits in a bright beam core. Hold a title at least 4 s; the wall wordmark at least 2.5 s while the camera keeps it fully in frame.

## 5. Motion quality

- **Locked to BPM.** Every light cue, sweep period, bounce and drummer's strike derives from one beat grid; sweep speeds are multiples of the bar. Sweep with an accumulated phase so a change of speed never jumps a beam.
- **Light breathes with the kick:** lamp intensity is a base times (0.78 + 0.22 x a decaying pulse from the last kick).
- **Performers** blend between scheduled poses on bar boundaries (0.3 s ease), with a body dip on every beat; the drummer's hands are computed from the actual drum hits, hovering between them.
- **Flashes decay, they do not rebound.** A flash is a fast rise (under 1 frame) and an exponential fall; the stage then holds, it does not drop to black afterwards.
- Frame rate 24 fps, everything animated on ones; the camera and light are smooth every frame.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| slow crane up with a push-in | a performer being found in the dark | an opening; a hero entrance |
| whip pan between two performers (motion blur) | the band as one machine | a count-in; a hand-over of the solo |
| orbit round the singer (yaw about the stage) | beams crossing, space | the peak of a build; a drop |
| crash pull-back with a crane up | the whole rig revealed at once | a drop; a reveal |
| dolly in on a locked figure | converging attention | the end of a build; a final chorus |
| low, slow crane up through the crowd | scale, longing | a break; a ballad |
| high wide, crane down | arrival from above | a finale |

- The subject fills at least a third of the frame height in the key shots (close hero shots at the build's end and the break).
- Allowed transitions: blackout, flash, whip with motion blur, the crash pull-back. No dissolves, no wipes, no hard cuts without a light cue on the cut.
- Titles in screen space stay out of the performer's area.

## 7. Sound palette

- **Band** (all synthesised): kick, snare, hats, crashes, toms; a sub-heavy bass with 2nd and 3rd harmonics; detuned saw pads; plucked arpeggios through a dotted-eighth ping-pong delay; a lead with slow vibrato; palm-muted distorted power-chord eighths; an electric-piano for the break; chord stabs on the big hits. Sidechain the pads, bass and guitar to the kick in the drop.
- **Foley tied to the picture:** lamp relay clicks and spot clacks, whip swooshes, flash impacts (a boom plus a bright burst scaled to the flash), confetti cannon thump and spray, spark hiss, power-down thunk after the final flash.
- **Ambience is a crowd:** murmur that follows the energy, roars on the big cues, a few voices on top, applause as dense clicks after the last hit.
- **Silence is a cue.** Keep at least two real near-silences (the beat before the drop and the opening of the break): gate music, bed and reverb to almost nothing, then the first sound after is the biggest. The final hit gets a ring-out and the crowd.
- Mix at -14 LUFS after the master. Synthetic bands get bass-heavy: keep 20-120 Hz about 3 dB under the rest.

## 8. Native moves

- **The blackout before the drop.** All lamps off on the last beat of the build, one pin spot on a raised hand, total silence, then a full-stage flash on the downbeat while the camera snaps wide. *Fits content like:* a product reveal at the end of a countdown; a trailer's title hit; a sports line-up before the whistle; a prize announcement.
- **Count-in wakes the rig.** Each stick click lights one lamp. *Fits content like:* a launch checklist where each item arms a system; a team introduction; a power-on sequence.
- **The cathedral.** Every head converges on one point (a person, a product) and the beams cross there. *Fits content like:* a keynote's single hero object; a trophy; a logo on a plinth.
- **One colour, rising sun.** The break strips to one hue and the LED wall brings up a single large shape. *Fits content like:* the sad middle of a story; a memorial; a before/after in which "after" is warm.
- **The LED wordmark.** The title lives on the wall, in the wall's own dots, and is in perspective. *Fits content like:* a song title; a product name; an event date.
- **Crowd of phone lights.** The foreground fills with small lights in the quiet part. *Fits content like:* a vigil; a user count that grows; a community moment.
- **Confetti and cold sparks on the beat.** *Fits content like:* a milestone; a win; a launch day.
- **Cathedral to silhouette:** end on one spot and a held pose.

## 9. Pitfalls of the medium

- **Epilepsy risk.** Never flash faster than the safe rate: flashes only on the beat grid, never more than 2 a second and **always below 3 Hz** in any one-second window, no red flashing, and no flash that rebounds to black. Verify on the finished file (a luminance-swing count per second, our demo's `flashcheck.py`).
- **Blown-out frames.** Additive light sums fast. Cap flashes at about 60% white, keep bloom small, keep the beams' alpha low and the wall's gain under 1; check the mean luminance of the drop and finale on a contact sheet.
- **Lost silhouettes.** If a performer is not the darkest shape against something lit, it vanishes. Keep rim light on, keep the wall or a beam behind them, and never fill them with a bright flat colour.
- **Beams without haze** look like flat triangles. Always modulate by drifting haze and give the cone a gradient and soft edges.
- **Beams that ignore the camera.** If targets are not world points, an orbit shows them sliding. Aim in the world.
- **A crowd that is too big.** Crowd rows close to the lens turn into dark tombstones. Window them by distance from the camera and fade the window's edges.
- **Lights out of time.** A cue that is two frames off the beat reads as wrong; derive every cue from the grid, never type seconds by hand.
- **Colour soup.** More than two hues in a section, apart from the finale, flattens the drop.
- **Text on a flashing wall.** Title text that is only readable between flashes fails the reading check: keep it on the wall's dark area and out of flash peaks.

## 10. Engine

Recipes in [`demo/`](demo/): `cam.js` (camera with orbit, crane, aim, near-plane clipping; `proj` and `clipNear`), `cues.js` (lamp state as a function of time: aim modes with blends, intensity, colour, flash list, follow spot, wall mode, haze), `lights.js` (haze texture, beam trapezoids, pools, follow-spot cone, LED wall slices and reflection, lamp glows, streaks, ghosts, risers), `rig.js` and `band.js` (skeleton with IK, rim and light passes, pose scheduling, drummer from hits), `fx.js` (crowd, confetti, sparks), `score.py` (the arrangement as data, written to `score.json`), `mix.py`, `tools/flashcheck.py`, `tools/audiocheck.py`. A minimal use of the engine for something that is not in the demo: a keynote opener lights a single product on a plinth with `rigAt`-style heads converging on one world point, a follow spot, and an LED wall pattern that is the product's name.

## 11. Variation space

You decide: the band and its instruments, the song (tempo, key, structure), where the silences go, the palette within section logic, the rig (number of heads, truss layout, side lights, strobes), the camera route, the wall content, the ending.

Three structures: **one song, one night** (intro, build, drop, break, finale); **a countdown** (a number on the wall, each tick wakes a lamp, ends on the launch flash); **an award show** (one nominee per lit spot, the winner gets the cathedral).
Three openings: one spot on a mic stand; a single lamp that wakes and swings across an empty stage; the crowd's phone lights in the dark before the band appears.
Three endings: a blackout with one spot left; a freeze on the last pose in a flash; the lamps rising to the ceiling and the house lights coming up on the empty stage.

**Use cases as information-order grammar (not a content swap):** a live-show promo shows the act's name first on the wall (first 3 s), the date on the drop, the ticket line on the end card; an event opener shows the sponsors one lamp at a time and the event title on the drop; a product launch holds the product in the dark until the cathedral, shows three specs on the wall during the break, and the name on the finale.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
