# Needle Felting — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Mostly Air* (52 s) · `felt.mp4` · source in [`demo/`](demo/)

## Story & structure

A handful of wool is mostly air. A cloud of undyed fleece floats down onto a foam pad; a felting needle begins to poke it, and a counter tag (0, 40, 400, 1,200, 2,500, 3,800, 4,000 pokes) marks how much air each stage has lost. The camera pulls back from macro to show the cloud is a pinch on a craft table, the cloud becomes a firm ball that bounces and holds its shape, a second ball rolls in and becomes a head, a cone becomes a beak, two flat layers are pressed on as wings, a tuft of rust wool is laid on the breast and poked until the edge dissolves fibre by fibre, and two bead eyes go in. Then the film's one real silence: the bird sits, blinks, and peeps. The camera pulls back to the whole table, the needle is laid down, and the lamp clicks off.

Why it fits: the needle is the medium's one physical fact (barbs, tangling fibres, volume lost to density), so a poke counter is both rhythm and narrative; the macro-to-table reveal uses the fuzz at both scales; the colour blend and the flat wing layers are moves only felt does this way. Narration in British English (Kokoro `bf_emma`), burned-in subtitles on felt patches.

Frames: [hook](demo/stills/hook.jpg) · [poke](demo/stills/poke.jpg) · [reveal](demo/stills/reveal.jpg) · [ball](demo/stills/ball.jpg) · [build](demo/stills/build.jpg) · [blend](demo/stills/blend.jpg) · [face](demo/stills/styleframe.jpg) · [end](demo/stills/end.jpg).

## Shots

| # | Time (s) | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–3.3 | Cloud of fleece floats down and is set on the pad (bar 1 downbeat, dent and puff) | macro, fixed, slow push | air to mass; the hook |
| 2 | 3.3–13.3 | Needle pokes; dents, puffs, fibres dragged out on the barbs; the cloud shrinks in steps | low side view on the top silhouette, then pull back and rise to a table-wide shot | poke and dent; the scale reveal (**signature**) |
| 3 | 13.3–19.7 | Firm ball; tag 400; three bounces | low three-quarter, slow orbit | density proof |
| — | 19.2–20.2 | Wool wipe | blurred lumps of roving cross the lens | cut hidden under it |
| 4 | 19.7–28.3 | Second ball rolls in and climbs on; beak drops in; wings fly in and are pressed on; tail and feet pop | medium, then high three-quarter | ball and worm; flat layer |
| 5 | 28.3–35.6 | Rust tuft laid on and poked; patch edge dissolves | push in to a close view of the breast | blend |
| — | 35.6–36.7 | Wool wipe | same grammar | |
| 6 | 36.1–41.7 | Two bead eyes; silence; blink; peep | locked close on the face | the turn |
| 7 | 41.7–52 | Pull back to the table; needle laid down; the lamp goes out | pull back and rise to a wide with the lamp | echo of shot 2, reversed |

## Score structure

108 BPM, 3/4, G major pentatonic, synthesised in `demo/mix.py`. Bars 0–1: mains hum and two single felt-piano notes. Bars 2–7 (3.3–13.3 s): felt-piano waltz (bass on 1, dyads on 2 and 3) with a first melody from bar 4. Bars 8–11: a music-box melody joins. Bars 12–16: fuller, with a pad and music-box arpeggios. Bars 17–21: pad swell under the blend, a rising music-box line. Bar 22: a held chord falls away. **Silence 38.75–41.65 s**: only the lamp's hum and room tone (and one far drawer at 39.9). The peep at 41.67 s (bar 25) is the first sound after it. Bars 25–29: the theme returns, softer; the last chord on bar 30 rings after the lamp clicks off at 49.7 s. Pokes sit on the eighth-note grid; `demo/tools/cuecheck.py` confirms all 88 hits are within 5 ms of it. Mix: music ducked ~6 dB under the voice, voice about 10 dB above it.

## Palette & props

Oatmeal fleece `#D6CAB4`, dusty slate `#7F95A8`, rust `#C4694A`, mustard `#D3A64A`, moss `#86966A`, dusty rose `#D5A199`. Props: a walnut table (CC0 PBR textures), a grey-green foam block, a linen strip with five coils of roving, a felting needle with a barbed tip in a turned wooden holder, a desk lamp (CC0 model, visible only in the last shot). The bird: oatmeal body and head, mustard cone beak, slate wings and tail, mustard feet, a rust breast blended in, two black beads. A single point light stands in for the lamp.

## End card

None: the film ends on the table in the dark after the lamp clicks off. (No sign-off, logo or credit on screen.)

## Build notes

`sh demo/build.sh` renders everything: voice check, events, the video (~9 min on 3 workers), mix, cue check, readcheck, subtitles, mux.

| File | What it is |
|---|---|
| `demo/index.html`, `demo/main.js` | the page; the bird's rig and the needle's poke cycle as functions of the drawing time, wisps and puffs, camera shots, wool wipes, lamp |
| `demo/wool.js` | fibre textures, the shell material, blob / worm / lathe geometry, ribbon wisps |
| `demo/set.js` | the craft table, foam pad, roving nests, needle, lamp, shadow decals |
| `demo/overlay.js` | felt subtitle patches, the counter tag |
| `demo/timeline.js` | bars, voice starts, captions, tags, pokes, sound events (exported to `events.json`) |
| `demo/mix.py` | score, foley, ambience, voice; writes `out/mix.wav` |
| `demo/lines.json`, `demo/tools/` | voice lines; `srt.py` (cue check + `felt.srt`), `cuecheck.py` |

Order: voice (`core/tts/tts.py`, `asr_check.py`) → `events.mjs` → `video.mjs` → `mix.py` → `cuecheck.py` → `readcheck.mjs` → `srt.py` → `mux.sh`.

Pitfalls tied to this demo's props: `pow()` with a negative base in the fuzz shader (rim term) produced NaN pixels that bloom turned into black squares; each wool mesh needs its own material (per-mesh uniforms); the wipe lumps are parented to the camera and use long fuzz so the depth of field turns them to cloud. Debug switches in the page: `?cam=x,y,z,lx,ly,lz,fov` overrides the camera, `?nowisp=1`, `?noover=1`, `?hide=part,part`.
