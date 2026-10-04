# Embroidery & Knit — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Every Mend Begins with a Hole* (50 s) · `embroidery.mp4` · source in [`demo/`](demo/)

## Story & structure

A teal wool sleeve. The film opens on the last stitch: a mustard French knot pulled tight, its thread lifting away. The camera drifts back and a hole opens in the knit, a loose yarn pulling away from its edge. Warp threads are laid across the hole and a darn is woven over and under, in a quiet room, ending in a real silence. A wooden hoop is knocked down over the darn and a flower grows on it stitch by stitch (stem, leaves, berries, satin petals, knots). At the peak the whole piece is turned over: the back is loops, long carried threads and knots, and the voice says so. It turns back, the hoop lifts away, the flower stays on the mended sleeve, a woven label says "Mend it. Wear it.", and scissors cut the working thread; the cut end curls and lies still.

Why it fits the style: the craft is the plot and every beat is a native move: *growing stitch by stitch* (flower), *darning and the visible mend* (the hole), *the back of the work* (the turn), a *knot* as both the first and the hidden image. The pull-back is deliberately small (the hoop lifts, the camera eases back) and the film ends on a cut, not on a wide shot of a person.

Native moves spent: growing stitch by stitch, darning and the visible mend, the back of the work, (the thread pull on every stitch), re-framing of one knot as opening and closing image.

## Shots

24 fps, one continuous top-down camera (keys in `demo/show.js`, `camKeys`). 74 BPM, one beat = 0.81 s, one bar = 3.24 s.

| # | Time (s) | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0–2.8 | Macro on the knit: a mustard knot is pulled tight, thread lifts | Locked, zoom 2.0 | the last stitch first |
| 2 | 2.8–5.5 | The sleeve; the knot stays as a mark | Glide out to the whole sleeve | cloth rub |
| 3 | 5.6–9.7 | A hole opens (ragged reveal, a yarn pulls away); label "Every mend begins with a hole." | Slow push | the problem in the style's own texture |
| 4 | 9.7–12.5 | Warp threads laid, needle in frame | Push to 1.3 | stitches grow in order |
| 5 | 12.5–23.3 | Weft woven over/under, rows accelerate then slow; label "Over, and under." | Drift, then a macro glide along the crossings (zoom 1.9) | darning |
| 6 | 23.5–25.7 | Silence | Locked | nothing but the held frame |
| 7 | 25.4–37.6 | Hoop knocked down over the darn; stem, leaves, berries, petals, knots | Locked, then a push to the flower | satin sheen by stitch angle |
| 8 | 38.0–40.3 | The piece turns over: the back; label "Under every clean stitch, there is a knot." | Flip (horizontal squash) | the back of the work |
| 9 | 40.6–44.0 | The hoop lifts and fades; the sleeve with the finished flower | Pull-back to zoom 1.2 | |
| 10 | 44.2–47.7 | Label "Mend it. Wear it."; thread appears from the flower | Locked | |
| 11 | 46.2–50 | Scissors slide in, snip at 47.9, scissors leave, the cut end curls and lies still | Locked | the cut is the ending |

## Score structure

Original, all synthesised (`demo/mix.py`): Karplus-Strong nylon guitar, kalimba, music box, felted piano, viola pad, shaker. D dorian, 74 BPM, 4/4.

| Cue | Time | Content |
|---|---|---|
| C0 | 0–4 | no music; one kalimba note on the knot (1.3) |
| C1 | 4–10.5 | two-note guitar ostinato (D3, A3) on the beat |
| C2 | 10.5–23.5 | four bars Dm, G, Am, Dm: guitar arpeggio, shaker eighths, felted piano chords on bars 2 and 4 |
| C3 | 23.5–25.9 | **silence** (music bus and room tone zeroed with reverb tails) |
| C4 | 25.95–37.8 | melody on kalimba over the same four chords; the last bar climbs D–F–A–C–D with the centre knots |
| C5 | 38–41 | viola alone (D3, A3) for the back of the work |
| C6 | 41–44.5 | music box phrase D6 A5 F5 D5 over a viola note |
| C7 | 44.6–47.9 | **silence** apart from the label and the scissors |
| C8 | 47.98 | one kalimba note on the snip |

Foley follows the picture through `events.json` (about 1950 events exported from the page): a soft tick per stitch (duller on knit, brighter on cloth), a thread zip whose length follows the stitch, knot taps, the hoop knock, cloth rubs, two flip whooshes, scissors shear and snip. Music ducks ~5 dB and foley ~3 dB under the voice; a tanh limiter tames foley transients before mastering (about −14 LUFS).

## Palette & props

Floss box: madder `#B0372B`, mustard `#D8A52F`, moss `#5F8236`, indigo `#2C4B82`, ecru `#F1DFB4` (warm), charcoal `#2C2A2F`, teal and rose in the style frames' skeins. Ground: teal wool knit `#3E6E7C`; felt `#1A2226` behind the flip. Props: a boxwood hoop with a brass screw, a needle, a darn, a woven twill label with a madder running-stitch selvage, red-handled scissors. Voice: Kokoro `af_nicole` at 0.86, four short lines.

## End card

None: the film ends on the cut thread and a fade to black. (The LemoLab × Claude Opus 5.5 sign-off for this library demo is carried by `demo/CREDITS` only.)

## Build notes

- `demo/index.html` loads `show.js` (the film) and, with `?shot=hoop|darn|macro`, the three style-frame shots in `film.js`.
- `demo/engine/`: `thread.js` (rasterizer), `fabric.js`, `scene.js` (stitch makers, timeline, needle), `knit.js` (knit, hole, darn). `show.js` holds the camera keys, the hole reveal, the flip, the back of the work, labels, scissors and the cut thread, and exports `window.EV`/`TEXTS`.
- Knit layers (whole and with the hole) are cached once per page at 2× so macro shots stay sharp; stitches are drawn live each frame.
- Commands: `sh styles/embroidery/demo/build.sh` (voice, speech check, events, video with 3 workers, mix, mux, srt). Full render ≈ 4 minutes.
- Pitfalls tied to this demo: the voice has two homophones (hole/whole, knot/nod), so `lines.json` carries an `asr` override for the speech check; `readcheck` requires each label to stay in frame for characters ÷ 15 + 1.5 s, which sets the label holds (4–6 s).
- Review stills in `demo/stills/`: `styleframe.jpg` (gallery card; hoop on linen), `frame_macro.jpg`, `frame_darn.jpg`.
