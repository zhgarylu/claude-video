# Corrugated Cardboard Craft — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Wave Inside* (54 s) · `cardboard.mp4` · source in [`demo/`](demo/)

## Story & structure

A bridge test on a cutting mat. A thin card cannot hold a tin; a craft knife opens a board to show the wave between its two liners; the same tin sits still on the board, which still bows under a second; a flat-pack folded into a taped, tab-locked beam carries three. Structure: **a test that fails, then does not** (weak, strong, stronger), with the explanation in the middle as an exploded stack. Native moves spent: the knife line that opens the flute (hook), exploded layers with marker flags (explanation), flat-pack to form with tab-and-slot, tape across the seam and hot-glue strings (payoff), a marker tag and a pull-up over the offcuts (ending).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0–7.0 | A knife runs along a steel rule; the board parts and the wave fills the frame | Low oblique, follows the blade left, then pushes to 3 cm from the edge, lens above the offcut | Knife line; the offcut does not cast a shadow so the profile is lit |
| wipe | 6.0–6.9 | a board panel slides across the lens (right to left) | – | board-edge transition |
| 2 | 7.0–15.0 | Liners and wave lift apart, three tape flags are written, they drop back | Top-down, orbit to a three-quarter view | Exploded layers; glue lines on the crests |
| wipe | 14.6–15.5 | a panel rises across the lens | – | |
| 3 | 15.0–25.7 | Two bridges between cartons: thin card, then board; tins dropped from above | Side-on lateral dolly, a push on the collapse, a second dolly, a push on the bow | The card snaps into a V and the tin tips; the board bows a little under two |
| wipe | 25.2–26.1 | a panel slides across (left to right) | – | |
| 4 | 25.7–36.2 | A cross-shaped net, numbered 1–3, folds into a tube; tabs rise through the lid slots; two tape bands; two hot-glue dabs | Locked top-down, crane down to three-quarter, push-ins on the tape and on each glue dab | Flat-pack to form; tape across the seam; glue string |
| 5 | 36.2–49.4 | Piers slide in, the beam lifts onto them, three tins land with a silence between | Medium side-on, slow push, then a pull-up | The proof; 1.5 s of near silence before the third tin |
| 6 | 49.4–54 | A cream tag lands on the mat and "SHAPE" is written in red marker | High three-quarter, locked | Echo of the opening: a hand-made mark |

## Score structure

112 BPM, G major pentatonic. Box taps and a kalimba pick-up in the hook; kalimba eighths over marimba bass in the explanation (taps on 2 and 4); sparse bells where the tins land and a tightening drone that stops dead at the snap (19.6–21.9 near silence); a groove of palm booms, knuckle taps, card shaker, pizzicato bass and marimba under the flat-pack; stripped bells for the proof with a full silence 43.6–45.15; a rising kalimba run for the pull-up; one marimba and kalimba chord when the tag is finished (51.2). Voice (Kokoro `bf_emma`) about 10 dB over the music; music ducked 50 % under speech; foley ducked 35 %. Foley is synthesised in `mix.py` from `events.json` (the same `EV` list as the picture).

## Palette & props

Outer kraft `#8c6a43`, inner liner `#b39468`, flute medium `#d9b27a`, masking tape `#e6d6a8`, packing tape `#c19a5f`, mat `#2c5a4b`, desk `#5a3f2b`, ink `#1d2733`, accent `#c2412c` (the tin, the tag). Props: steel rule, snap-off knife, hot-glue gun, marker pen, tape rolls, offcuts, four cartons used as piers, three tins (invented, lettered by hand), a thin card, a stiff board, the net.

## End card

None. The film ends on the tag under the lamp, held for 2.4 s; there is no sign-off or credit.

## Build notes

`sh styles/cardboard/demo/build.sh` runs voice (skipped if `voice/dur.json` exists), the speech check, caption export, event export, `readcheck`, the render (3 workers), `mix.py` and `mux.sh`. File map: `film.js` (per-frame state), `timeline.js` (grid, camera keys, wipes, events), `engine/` (see STYLE.md §10), `tools/export.mjs` (captions and voice times → `caps.json`), `voice/lines.json`, `CREDITS`, `TREATMENT.md`, `stills/`. Review stills: `node core/render/still.mjs styles/cardboard/demo --range 0:54:1.5`; debug camera: `--q 'cam=px,py,pz,lx,ly,lz'`. The 1296 frames take about 6-8 minutes on 3 workers at 2x supersampling on a shared machine. Stills the docs link: `demo/stills/styleframe.jpg` (5.4 s) and `s_*.jpg`. Pitfalls tied to this demo's props: the tins' lettering must face the lens (`rotation.y ≈ −0.95`); the flat-pack lid slots sit at lid-local z 2.5–3.1 so the tabs rise through them; piers are rotated a degree or two so they do not look CG.
