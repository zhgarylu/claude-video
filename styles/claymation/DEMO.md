# Claymation / Stop-motion — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Proof* (51 s) · `claymation.mp4` · source in [`demo/`](demo/)

## Story & structure

A lump of dough called Pip sits on a hand-built kitchen counter at 3 a.m., worried that it will never rise. The night goes by (the clock races, the window turns from moon to dawn). Pip strains twice to get bigger and slumps twice. At dawn the maker's giant finger comes in, holds, and pokes. A held silence with a dent in the cheek; the finger leaves; the dent springs out and Pip rises, hops, and is replaced under a puff of flour by a golden loaf with the same face, scored on top and with one fingerprint on its side. The camera pulls back from the set into the studio and the title lands on a clay plate.

Why it fits: one subject, one want, one turn, and the turn is the medium's own move (the poke). Native moves spent: **the poke** (peak), **boiling world** (the held dent, the night), **morph and replace** (dough to loaf under a flour puff), **the maker's hand** (the finger, its fingerprint on the loaf), **the set reveal** (the pull-out to the studio).

No voice-over. Two captions and the title are the only words; the film is readable without them.

## Shots

| Shot | Time | Framing and move | Why |
|---|---|---|---|
| worry | 0–6 | medium, eye level, slow push; caption "3 a.m. Still the same size." | empathy first; the face is the hook |
| night | 6–16 | slow lateral track along the counter at the height of the jars, the window ending in the frame; sky goes moon to sun | time passing through the set; the clock hands race |
| strain | 16–24 | medium-close, locked, tiny push; two stretches that end in slumps | comedy timing, held poses |
| enter | 24–29.7 | low, wide, oblique; the finger comes in from the right | the scale reveal of the maker |
| poke | 29.7–35.9 | macro on the cheek; focus racks from finger to eye; a 2.4 s held dent | consequence, touch |
| rise | 35.9–42.3 | eye-level medium, pulled back; crouch, stretch, hop, landing squash; caption "It just needed a poke." | payoff |
| loaf | 42.3–46.2 | slow orbit of the loaf towards the fingerprint | signature |
| pull | 46.2–50.8 | pull back and up into the studio; the title plate lands | set reveal, ending |

Cuts at 6.1 and 24.1 are made under a clay lump that sweeps across the lens (the transition grammar); the others cut on an action.

## Score structure

Synthesised in `demo/mix.py` (no samples): kalimba, pizzicato and ukulele-like plucks, marimba, glockenspiel, a nasal bassoon, soft pads. 84 BPM, rubato-free but sparse. D minor pentatonic until the poke, D major after it.

- 0–6 a worried kalimba motif over a thin pad; 6–16 an eighth-note arpeggio that gathers, the clock ticking faster; 16–24 the bassoon strains and slumps on each failed rise; 24–28.6 a one-note pizzicato ostinato and a drone crescendo as the finger comes.
- **Two real silences**: 28.6–30.2 (music and clock stop before the contact) and 31.4–33.8 (the held dent: only room tone). The first sound after the second silence is the dent "pop".
- 34.5 one glockenspiel note, then a marimba pickup; 36.5–41.4 the major-key rise (marimba melody, plucked chords, clay slaps on beats 2 and 4); 41.4 a glockenspiel run under the flour puff and a bell on the swap; 42.5–46 a warm marimba arpeggio and birds; 46.2 the last chord, glockenspiel notes landing with the title.

Foley: thumb squelch, clay press, a soft squeak for the strain, drag for the finger, a boing for the rise, thuds for landings, flour puff, clay slap on every caption pop. Sound as transition: the clock keeps ticking over the cut at 6.1 and the finger's drag begins before it appears (24.4).

## Palette and props

Dough cream `#ecd3a0`, terracotta counter `#b9674b`, deep teal painted wall `#3f7480`, mustard trim `#e0a62a`, rose cheeks `#e58c86`, sage jars `#93b08a`, bead ink `#2b2420`; the loaf is a darker baked brown-orange. Props: flour sack, shelf with three jars and a plant, a pendant lamp, a clock, a window with a painted sky, a rolling pin; a studio with two lamp stands and spare lumps for the pull-out.

## End card

The title plate "Proof." (rolled letters on a teal slab) is the end card. The library's sign-off lives here only: **LemoLab × Claude Opus 5.5**. (It is not drawn in the film.)

## Build notes and code entry points

`demo/build.sh` renders the picture (`core/render/video.mjs`, 24 fps, 3 workers, about 12 minutes on Apple silicon), synthesises the sound (`mix.py`, from `events.json`) and masters it with `core/render/mux.sh` to −14 LUFS.

- `demo/clay.js`: `lump(spec, material)` and `worm(spec, material)` build noise-displaced clay; `build(k)` re-seeds the silhouette per drawing (the boil); `clayMat({fing, pscale, stamp})` is the material: a triplanar fingerprint and noise bump in object space, patchy prints, a stamp decal for the loaf, marbled vertex colours.
- `demo/set.js`: the hand-built kitchen, window sky that changes with a `phase` value, the studio and the flour puff.
- `demo/main.js`: Pip's performance as keyframed functions of the drawing time (`pose(ts)`), cameras per shot, the clay wipe, caption plates drawn after the depth of field, `render(t)` and `TEXTS(t)`.
- `demo/timeline.js`: shots, captions and the sound events one place; `mix.py` reads them through `events.json`.
- Stepping: `render(t)` poses and rebuilds clay only when the drawing index `round(t × 12)` changes; camera, light and sky use the exact `t`.
- Pitfalls specific to this demo: a boxy loaf makes the ellipsoid formula for face placement bury eyes and brows (add a z offset); the dent bump is a function of the unit direction so the finger tip must sit at `surface − 0.28` along it; the title plate must not play the vanish animation at the very end.
