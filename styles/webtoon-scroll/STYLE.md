# Webtoon Scroll · 条漫竖滚体: Style Prompt

> A story told as one endlessly tall strip of full-colour panels, read on a phone by scrolling. The page never cuts: the "camera" is a vertical scroll whose speed is the pacing (a slow drift in a quiet moment, a whip down for action, a hard stop on a punchline), and the white gutters between panels are the timing (a tall gutter is a pause). Balloons, narration boxes and onomatopoeia are hand-lettered; a character can walk through several panels; the episode ends on a cliffhanger, an end bar and a like / subscribe row.
> References (grammar only): the vertical-scroll webcomic format as read on phones. What it teaches is how a gutter times a joke, how scroll speed paces an action, how a panel can bleed or break its frame. Never copy an existing series' characters, logo, lettering, layout or its app's interface; the characters, the lettering and the reader UI here are invented.

## 1. Essence, and what it is not

- **One strip, one direction.** Everything is on a single tall page that moves only up the screen. Panels are laid out top to bottom; there are no page turns, no wipes, no cuts.
- **Scroll is the camera, and its speed is the pacing.** Four speeds, each with a job: a slow **drift** (reading, walking, mood), a **glide** (moving to the next panel), a **whip** (action, a fall, a chase), a **stop** (a hard stop on a punchline, with a small jolt). A film at one scroll speed has failed.
- **The gutter is the timing.** A narrow gutter is a beat; a tall one is a pause or a silence. Words can live in a gutter (a tiny caption, a drip).
- **Panels are shaped by what they hold.** Borderless panels dissolve into the white gutter; framed panels have a soft rounded border. A panel is as tall as its moment needs, and one panel may be thousands of pixels long (a staircase, a fall).
- **Lettering is half the picture.** Speech balloons, thought clouds, narration boxes and sound words are drawn with the characters and may break the panel edge.
- **Episode furniture.** A series tag, an episode number, a progress bar, "tap to continue" and "swipe up" hints, and at the end a next-episode card, a rating row, a like / comment / share row and a subscribe button. The reader UI is invented and quiet.

Not a paged comic (see manga-panel: black and white, pages and spreads, a camera that cuts), not a motion comic that zooms across a static page, not a slideshow of panels, not a chat screenshot (see chat-log), not a screen recording of a reader app.

## 2. Look and rendering

- **Flat colour with soft cel shading, clean medium-weight ink outlines.** One base fill, one shade tone (a cast shadow on one side), one highlight. Outline about 6 px at 1080 px wide, round caps and joins, the same weight on every character and prop so they stay on-model from panel to panel.
- **Canvas 2D, a pure function of time.** The page is laid out once (panel list with heights and gutters); `render(t)` draws only the panels that intersect the view. The camera is one function `cam(t)`; every reveal time is derived from it.
- **Backgrounds are simple and graphic** (a few planes, a skyline, a wall, windows with lit squares), drawn in parallax layers. Rain and similar particles are procedural and seeded, never random per frame.
- **Characters are chibi-proportioned and drawn from one model**: a big head (about 40 % of the height), a simple coat or outfit, two-bone arms solved to a hand target, legs that can walk, sit or splay. Faces are built from a few parts (eyes, brows, mouth) so expression is set by one parameter each; an object with a personality (an umbrella with a face) follows the same rules.
- **Bleed and border.** Borderless panels fade to the page colour over the last 60 to 90 px at the top and bottom. Framed panels: ink border about 12 px, radius about 44 px, a thin pale inner line.
- **Motion blur only on a whip**: several sub-frame samples of the whole page, plus ink speed lines in the side margins. A glide or drift is never blurred.
- Draw every icon (star, heart, speech icon, arrows) as a vector. No emoji.

## 3. Colour

- **A limited palette per episode**: the page (warm white `#f7f5ee`), one ink (deep navy `#1b2340`), two or three environment hues, one hero colour for the character, one accent for lettering and UI. Our episode: slate and fog blues for rain; mustard for the heroine; coral and cream for the umbrella.
- **The palette can turn once, at the turn of the story** (rain blue to warm yellow and peach when the sun comes out). That change is a story event: do it at one panel, not gradually everywhere.
- **Ink is for lines and text only.** Colour fills never touch the page white except in the gutter itself.
- **Lettering colours**: speech on white, thought on white, narration on cream, a non-human voice on a pale tinted balloon with a squared shape. Sound words take a fill from the palette with a white or contrasting edge and a thick ink outline.
- Red and coral are for the accent and the hero object only; never colour one thing red on a red ground.

## 4. Type

- **Two faces, both OFL**: a friendly comic text face for balloons, narration and UI (Comic Neue, bold; capitals for speech, mixed case for UI), and a hand-lettered display face for titles and sound words (Bangers). Self-host both; no emoji or system fonts.
- **Sizes at 1080 px wide**: balloons 44 to 56 px, narration 36 to 40 px, UI 26 to 36 px, sound words 110 to 250 px, title 150 to 190 px. A balloon holds at most about 30 characters in two or three lines.
- **Balloon rules.** The tail points at the speaker's head; the balloon never crosses the frame edge; the text is centred with a padding of at least 0.6 x the text height. Thought clouds are a scalloped ellipse with a trail of three circles. A shout is a spiky burst. A non-human voice is a squared pale-blue balloon in italics.
- **Sound words** are outlined three times (shadow, ink, edge), pop in with a back-out scale, may shake while the sound lasts, and **may break the panel edge** (draw them above the clip).
- **Reading time.** Every text stays fully in frame for `characters / 15 + 1.5` s from the frame it first appears (`readcheck.mjs`). Either the scroll holds still while a balloon is read, or the text rides a slow parallax layer so it stays on screen. Long balloons are split.
- **Safe areas on a phone.** Keep every balloon, narration box and key face between y = 160 and y = 1700 of 1920 when the page is holding; the top 160 and bottom 220 px belong to the device and the reader UI.

## 5. Motion

- **Everything on the page moves only by the scroll** except what the story animates in place. Elements do not slide across the page by themselves except characters walking, falling or turning.
- **Reveal on scroll.** A panel's elements pop in when the panel enters the view (the first text a few tenths of a second after its panel is a third in), with a back-out scale (0.25 to 0.35 s) from the speaker or the sound's origin. A narration box slides in from its left edge.
- **Tempo grid.** The page speed is locked to a tempo (ours 96 BPM, a bar 2.5 s): every scroll segment starts and ends on a beat, and cues land on beats.
- **Scroll speed curves** (as fractions of a segment):
  - drift: 65 % linear + 35 % smoothstep, 50 to 300 px/s;
  - glide: smoothstep, 300 to 700 px/s;
  - whip: a 0.11 ramp-up, then constant speed (900 to 1,400 px/s), ending **without easing**, so it stops dead;
  - stop: `u^1.85`, accelerating into a hard stop.
  After a whip or a stop the page jolts: a damped overshoot of 24 to 40 px (`amp * sin(30 t) * exp(-9 t)`).
- **Parallax.** A layer with depth k shifts by `-(k-1) * (cam - cam0)`. Use k = 0.4 to 0.5 for a far skyline, 0.75 for a mid layer, 1.0 for the world, 1.25 to 1.3 for foreground railings and the heaviest rain, and k = 0.12 for lettering that must ride along a whip (so it can be read).
- **Zoom in place.** A panel may push in on its own content (1.00 to 1.15) while the page holds still; the page itself never zooms.
- **Characters** blend between a few poses; walks are phase-driven (leg lift, body bob, a slight sway); anticipation before a hit, follow-through after a stop.

## 6. Camera grammar

- **The page never cuts.** The only moves are scroll (drift, glide, whip, stop), zoom in place inside a panel, and parallax. No fades, wipes or jump cuts between panels.
- **Each panel is composed for a hold**: when the page rests, the panel's middle sits near the middle of the screen, with a little of the neighbouring panels above and below.
- **A tall gutter is a held shot.** The page rests, or drifts slowly, with white on screen.
- **A character walks through several panels** by being drawn consistently in each, positioned so the reading direction continues.
- **Action is vertical.** A fall, a stair, a climb is one very tall borderless panel, scrolled with a whip; the characters grow or shrink with depth.
- **End of episode.** The strip finishes on a UI page: next-episode card, rating, like row, subscribe. The film ends there; no fade.

## 7. Sound palette

- **Score**: a short original loop, light and playful: kalimba or tine, nylon pluck, soft bass, shaker, woodblock, and a warm pad for the sun. C major pentatonic by default, a minor colour for a slog. The score follows the scroll: sparse while drifting, ticking up before a whip, an arpeggio on the whip, **cut dead on the stop**.
- **Foley**: page flicks on glides, a soft whoosh bed that follows the scroll speed, impacts on hard stops, pops when balloons appear, designed sound for every sound word on screen, UI ticks. A non-human character speaks in short synthesised blips.
- **Silence**: at least two, placed with the gutter or the beat before a punchline; the first sound back is a key one.
- **Beds**: rain or room tone under everything, stopped on purpose when the story changes.

## 8. Native moves

- **Whip down**: a vertical chase or fall scrolled at 1,000 px/s with speed lines, parallax and a ride-along sound word.
- **Hard stop**: the page stops dead on a punchline, with a jolt.
- **The tall gutter**: white space as a silence, with one tiny caption.
- **Break the frame**: a sound word, a limb or a balloon crossing the panel edge into the gutter.
- **Walk through the panels**: one character, several panels, one direction.
- **Reveal on scroll**: elements pop as the panel enters.
- **Zoom in place** on a panel while the page holds.
- **Lettering as a character**: a sound word that shakes, a balloon that grows.
- **The end bar**: next-episode card, stars, a like that bursts, a subscribe pill.
- **Reader UI glimpsed at the edges**: a scroll thumb, a progress hairline, "swipe up", "tap to continue".

## 9. Pitfalls

- **Scrolling while someone speaks.** A balloon needs `characters / 15 + 1.5` s in frame; hold the page or put the balloon on a slow parallax layer.
- **Everything at one speed.** Use all four scroll moves; give the film a real silence.
- **Off-model characters.** Draw every pose from one rig; do not redraw a face per panel.
- **Balloons cut by the frame, or under the phone UI.** Keep them inside the safe area when the page holds; check the 160 px top and 220 px bottom.
- **Sound words that need to be read while moving.** Pin them to a slow layer or hold the page.
- **Motion blur on text.** Blur only on a whip, and only on the whip's pass; keep lettering on the layer that rides along.
- **Gutter fade on a panel that continues.** Only panels that are followed by a gutter fade to white; a panel that flows into the next (a staircase into its puddle) is one tall panel.
- **A palette that drifts.** Keep it to the episode's palette; turn it once.
- **Borrowed look.** No existing series' characters, lettering, logo or layout.

## 10. Range of variation

- **Aspect**: 9:16 is native; 4:5 and 1:1 work with narrower panels; 16:9 only as three phone-sized columns side by side (as the gallery card does).
- **Tone**: comedy (our demo), a quiet slice-of-life with long drifts and tall gutters, a thriller with short gutters and hard stops, a romance with soft pastel palette and rounded borders, a tutorial with numbered panels and diagrams.
- **Line**: from clean vector (ours) to a rough, hand-wobbled line; from flat to heavily shaded; the outline weight must still be the same everywhere.
- **Length**: 30 to 120 s; beyond that the page becomes very tall and the viewer needs section titles.
- **Voice**: silent with sound words (ours), or narration and character voices with subtitles in the narration boxes.
- **Reader UI**: any invented chrome, from none to a full end bar; the calls to action are optional.

[Demo](DEMO.md)
