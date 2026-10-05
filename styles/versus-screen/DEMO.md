# Versus Screen: the demo film

**One example among many. Don't reuse its story, arc, shots, props or timings.**

"Kettle Clash" (56 s, no voice): two invented electric kettles, the steel Brisk B5 and the glass Pebble P2, fight four rounds on price, boil time, keep-warm and capacity. Brisk wins three, Pebble one, and the film ends on the one reason to pick Pebble.

## Story and structure

A select screen (what are we comparing?), the slash cut and the two entrances, a near-silence, VS, a three-two-one countdown, four rounds of 8 s, a tally, a second near-silence, WINNER. Three acts on a 120 BPM grid (28 bars). The numbers live in one table (`ROUNDS` in `timeline.js`): Brisk $39 / 169 s / 54 °C / 1.7 L against Pebble $54 / 207 s / 68 °C / 1.2 L. The boil times are computed (1 kg of water, 20 to 100 °C, 90 % efficient, 2200 W and 1800 W); the winners, deltas, life bars, win ticks and the 3 to 1 score are derived from the table, so they cannot disagree.

## Shot list

| Time | Shot |
|---|---|
| 0.0-5.5 | Select screen: six invented kettles in a grid; a coral cursor hops three tiles and locks Brisk, a cyan cursor hops two and locks Pebble; the grid zooms and fades |
| 5.5-9.0 | Slash drawn top to bottom, the halves wipe out into the arena; Brisk slides in from the left (6.0, lands 6.25), its plate; Pebble from the right (7.0, lands 7.25), its plate; near-silence 7.75-8.5; VS slams at 8.5 (3-frame hit-stop, shake, colour split, white flash); life bars slide in |
| 9.0-12.0 | VS shrinks away; countdown 3, 2, 1 on the beat; GO! |
| 12-44 | Four rounds. Each: banner ROUND n (0 s), stat name (0.5), rule chip (0.75), test caption (1.0), bars fill in 16 steps (1.5-3.5), hit at 4.0 (hit-stop, delta slam, sparks, loser recoil and impact slash), life chunk (4.25), win tick (4.5), slow drift, wipe (7.7) |
| 44-48.5 | FINAL TALLY: four rows with ticks, then 3 – 1 with hit-stop |
| 48.0-49.0 | Near-silence (the arena is empty) |
| 49-55.4 | Gong, WINNER, BRISK B5, a crown drops on the lid, sunburst and confetti; two caption bars; slow push-in |
| 55.4-56 | Black slash wipe closes the film |

## Score structure

120 BPM, A minor for the fight and C major for the verdict. Select: soft kick, hats, bass, a small pluck line. Entrance: bass pulse and a clap build, silence 7.75-8.5 (riser ends first). Fight: full groove (four-on-the-floor kick, clap 2 and 4, hats, open hat, bass, stabs on the offbeats); the banner bar of each round is lighter (no stabs); a hat roll under each bar fill; the pluck lead enters in round 3. Verdict: stripped back, a riser into the 1 s silence, kick and gong at 49.0, then the groove in C major with the lead, a final chord at 55.0. The music is cut for the frames of every hit-stop and ducks under impacts.

## Palette and props

Coral `#ff4d3a`, cyan `#25d6ee`, arena `#090a12`, ink `#07070c`, gold `#ffd45a`, pale `#fff3c4`. Props: the Brisk B5 (steel body with a diagonal team band, LED slot, dark handle), the Pebble P2 (double-wall glass, water with bubbles, ring light), four more kettles on the select grid, a crown, a sunburst.

## End card

None: WINNER, the two caption bars (CHEAPER · FASTER · BIGGER; SIP SLOWLY? PEBBLE KEEPS 68 °C VS 54 °C AFTER 2 HOURS) and a black slash wipe. The kettles, brand names and test figures are invented; no real product. No sign-off or credit on screen.

## Build notes and code entry points

`sh styles/versus-screen/demo/build.sh` rebuilds everything (core tier only; it fetches the two OFL fonts, runs readcheck, mixes, renders with `--resume` and masters to −14 LUFS). Entry points: `demo/timeline.js` (tempo, the `ROUNDS` data, every event and hit, the hit-stop windows), `demo/main.js` (`render(t)`: `uOf` is the frame-skip hit-stop, `camera` the punch/shake/chroma, `drawRound`, `drawVerdict`, the sweep), `demo/kettle.js` (the two kettles as paths), `demo/mix.py` (score and foley from `events.json`).
