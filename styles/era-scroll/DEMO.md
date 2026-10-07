# Era Scroll Walk: our demo

**One example among many. Don't reuse its story, arc, shots, props or timings.**

Demo: *The Birth of a Phone / 一部手机的诞生* (89.4 s, 1920 x 1080, 24 fps, Chinese narration) · `era-scroll.mp4` · subtitles `era-scroll.srt` · source in [`demo/`](demo/)

An unofficial, educational film about real events and products (Morse's telegraph, Bell's patent, the first handheld call, the first SMS, the first iPhone). No logos, photographs or official artwork are used; every fact is listed with its source in [`demo/FACTS.md`](demo/FACTS.md).

## Story and structure

A courier with a satchel and a red scarf carries one message, "我来过" (I was here), through nine eras of sending words. A hand stencil on a cave wall is the first message; a phone on a desk is the last. In between each era is drawn in the visual language of its own time, and the message tag on the courier's satchel changes icon with every era (hand, wedges, seal, blackletter initial, dots and dashes, sound waves, a sunburst, an envelope), until the courier hands it to a phone, where it arrives as a chat bubble. The phone then lifts out of the desk scene, turns landscape and fills the frame: its photo grid holds a thumbnail of every era just walked.

Why it fits: the topic is a chain of media, so the format's own device (one world per period, one edge between them) does the explaining; each era needs one dated fact and one gag, which fits a 7 to 8 s slot; and the ending, where the screen contains the scroll, is only possible because the scroll is one object.

Native moves used: the edge sweep (eight times, always on a beat), re-tint through the body (ochre, clay, indigo and vermilion, black and cream, sepia, sage and gold, 70s earth, four LCD greens, full colour), stamp behind the walker (cuneiform pressed into the wall as he passes), message along a wire (telegraph pulses, a voice ribbon on the festoon, an envelope relayed by a mast), a rise into a screen, two real silences.

## Shot list

Frames: [style frame](demo/stills/styleframe.jpg) · [poster](poster.jpg)

| # | Time (s) | Era (plate) | Walker's gags | Camera | Fact |
|---|---|---|---|---|---|
| 1 | 0 to 14.2 | Cave: ochre on rock, torches, hand stencils (约4万年前) | presses his own hand to the wall (a new stencil blooms with dust); a painted deer wakes and bounds off the paper | slow push-in on the hand | hand stencil at least 39,900 years old |
| 2 | 14.2 to 20.0 | Clay: mud-brick wall of cuneiform, dusk ziggurats (约前3300年) | picks up a small tablet; signs are pressed into the wall behind him | none | earliest writing, Mesopotamia |
| 3 | 20.0 to 28.3 | Woodblock: ink, indigo, vermilion on laid paper, pavilion, pines (868年) | pushes a seal press (a red seal prints); his steps lift a row of printed sheets | none | Diamond Sutra |
| 4 | 28.3 to 35.8 | Letterpress: blackletter columns, rubrics, vines, a screw press (约1455年) | mirrored lead types hop and flip face-up (L U X); pulls the press bar | none | Gutenberg Bible |
| 5 | 35.8 to 44.2 | Telegraph: copperplate engraving in sepia, poles and wires (1844年) | taps a key; pulses race along the wires and a bird takes off | push-in on the key | first message, Washington to Baltimore |
| 6 | 44.2 to 51.7 | Telephone: Art Nouveau wallpaper, arched windows, whiplash (1876年) | a candlestick phone rings; he lifts the earpiece; a voice ribbon crosses the room and the second phone rings; he tips his cap | slow push-in | Bell's patent |
| 7 | 51.7 to 60.0 | Street: 70s flat sunburst, brownstones, a cab (1973年) | pulls out a brick phone, extends the aerial, waves of sunburst arcs; pigeons scatter | push-in | first handheld call |
| 8 | 60.0 to 67.5 | LCD: four greens, 4 px pixels, snow, a mast (1992年) | types MERRY CHRISTMAS; an envelope relays via the mast to a house; a snowman nods | push-in | first SMS |
| 9 | 67.5 to 72.9 | Desk: flat pastel vector, keyboard keys that sink under his feet (2007年) | walks the keyboard, stops, hands the tag to the phone (a ding, then silence is broken) | slow push-in | iPhone introduced |
| 10 | 72.9 to 78 | Hold: the bubble "我来过" arrives | | held | |
| 11 | 78 to 85 | The phone lifts, turns landscape, fills the frame; nine thumbnails pop in, a gold highlight runs along them in order | | rise into the screen | |
| 12 | 85 to 89.4 | End card: title, one line, the library sign-off | | | |

## Score structure

72 BPM, D minor pentatonic with a short four-bar melody that never changes, only its instruments do: drone, frame drum and bone flute (cave), lyre, plucked zither with woodblock and a gong, organ and harpsichord, staccato strings with telegraph clicks, celesta and string pad, 70s electric piano with a bass groove and a drum kit, a chip lead with a triangle bass, then a pad with a kalimba. The first 2.4 s are silence and drips; the walker's steps land on the eighth notes and every edge lands on a beat. **Silence 1**: music and steps out from the stop until the tag lands (a bell, the first sound after silence). **Silence 2**: the whole bed goes out for a beat when the phone lifts; the tiles pop in as a pentatonic ladder, then one long chord and a gong at the end card.

## Palette and props

Per era (examples): cave `#3c2416` to `#a56e42`, red ochre `#a63a22`; clay `#d9ab6e`, dusk `#2c2750` to `#f3cf94`; woodblock paper `#e8dbb0`, ink `#1c1a22`, indigo `#27407a`, vermilion `#c2412d`; letterpress page `#efe3bf`, rubric `#b3321f`, gold `#cfa13a`; engraving paper `#efe6cc`, ink `#2a2118`; Nouveau sage `#a7b58a`, teal `#2f4a45`, gold `#c9a24a`, rose `#d6998f`; 70s orange `#e8742a`, mustard `#eab62f`, avocado `#7d8c2f`, brown `#5b3a29`; LCD `#0f2214 #2d4f33 #7ba14c #cfe39a`; desk wall `#d6e6f1`, desk `#f2d2a6`. The courier: coat `#2f4e8f`, scarf `#e0453a`, cap `#f0b83c`, satchel `#b9783f`.

## End card

The title, one line of copy and the owner's gallery address (https://zhgarylu.github.io/claude-video/gallery/) on cream paper. The sign-off belongs to this library's demo only; a user's film carries no sign-off of the library or its owner and no copy of this card.

## Build notes and code entry points

`sh styles/era-scroll/demo/build.sh` rebuilds everything (core and voice tiers; fonts and the voice need a network once). Rendering takes about 8 minutes with three workers, the mix about a minute.

- `demo/timeline.js`: pace (300 px/s), era boundaries snapped to the beat, voice start times, plate texts, the walker's world position, the stop.
- `demo/scroll.js`: engine (compositor, torn edge, walker rig and styles, burst, plate, helpers).
- `demo/eras1.js`, `eras2.js`, `eras3.js`: the nine era painters, the phone and the gallery.
- `demo/main.js`: era assembly, thumbnails, camera push-ins, subtitles, end card, sound events, `TEXTS`.
- `demo/mix.py`: score, ambiences, foley, voice, master and the `.srt`.
- `demo/lines.json`, `voices/`: narration (edge-tts Yunxi), checked with `asr_check.py` (one accepted mishearing for the telegraph line).

Pitfalls tied to this demo: the cave's local x runs from -2600, so its gags are placed from the start time rather than from a crossing; the SMS text box needs a 1100 px gag so it stays on screen for its reading time; `readcheck` needs the end card to hold 3.7 s.
