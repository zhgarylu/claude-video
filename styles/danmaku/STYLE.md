# Danmaku Comments: Style Prompt

> A video player whose bullet comments (danmaku) fly right to left across a picture in lanes: the crowd is narrator, chorus and joke-teller at once, density is emotion, and the picture under it is a simple, well-drawn scene the crowd talks about.
> References (grammar only): the comment-over-video culture of Japanese and Chinese video sites (lanes, pinned top and bottom lines, colour-coded comments, time-stamped replies, the pile-up at the peak) and the player chrome of any modern video site (progress bar with chapters, play/pause, like/coin/favourite). Never copy a real site's logo, colours, icon set, layout or name; the player is invented.

## 1. Essence, and what it is not

- **The story is carried by the crowd.** The picture shows what happens; the comments say what it means, predict it, argue about it and joke over it.
- **Lane physics.** Every comment enters at the right edge and moves left at a constant speed, in a lane, and never overlaps another comment.
- **Density is the emotion.** A few lines is doubt or sleep; a wall of the same short word is awe.
- **The player is the frame.** Title, progress bar in chapters, a clock, an input box and three buttons stay fixed; the player's own state (play, pause, chapter, button burst) is part of the story.
- **Invented content only**: an invented player, uploader, video and crowd.

Not a subtitle track (comments are many voices, not one caption), not a chat-room screenshot (they fly, in lanes), not a screen recording (the picture is drawn, flat and diagrammatic), not a social-media UI mock-up (the player never takes over the frame).

## 2. Materials & rendering

- **Two layers plus chrome**: the picture (flat vector scene, camera-able), the comment layer (screen space, its own optional zoom), the player chrome (screen space, never moves with the camera). Order: picture, comments, then the picture's **subject drawn again** over the comments (a mask: comments pass behind the loaf, the jar, the hero object), then chrome.
- **A comment** is bold semi-condensed type with a dark outline of about 17 % of the font size, 94 % opacity, no blur. Sizes come in three steps (about 32, 38, 58 px at 1080p); the largest occupies two lanes. Special roles (the uploader's) sit on a rounded dark plate with a gold edge.
- **Lanes**: 50 px pitch, the top and bottom lanes reserved for pinned comments (centred, still, fading in and out), the rest for scrolling ones. A scheduler assigns each comment a lane at build time so that its head always stays at least about 44 px behind the previous tail until that comment has left; hero comments (fixed time) take lanes first, filler may be dropped.
- **Speed**: constant per comment, about 330-400 px/s, slowed for long text so the whole comment stays fully on screen for at least (letters / 15 + 1.5) s; about 5-7 s from edge to edge. Spawn times snap to a 16th of the score's beat.
- **The picture** is flat colour with soft gradients and one or two shading shapes per object; mid-dark, so white comments read. A 10 % dark veil under the comments and a vignette are allowed. No bloom, no texture noise.
- Mux without grain.

## 3. Colour logic

- **Colour is a role, not decoration.** One colour per kind of voice, kept for the whole film: white for the ordinary crowd, yellow for advice, cyan for jokes, pink for hype and reactions, green for counting and agreement, red for warnings and spoilers, gold (on a plate) for the uploader. A film may re-assign them, but must keep them fixed and varied (no single colour above about half of the comments in a section).
- The player chrome is near-black with one accent (a warm coral in our demo) for progress and play state; the picture's palette is separate and never uses the accent as its main colour.
- The three buttons (like, coin, favourite) each have their own colour and are the only place that may flood with colour.

## 4. Type & subtitles

- **One OFL semi-condensed grotesque** for comments and chrome (Barlow Semi Condensed, Roboto Condensed, Archivo Narrow), in Medium, Bold and ExtraBold. For Chinese, subset an OFL CJK face (Noto Sans SC Bold) to the characters used.
- Comments are short: most 1-5 words, never above about 34 characters. A comment is on screen about 6 s and must be readable (the reading check requires letters / 15 + 1.5 s fully in frame).
- There are no subtitles: the comments are the text. If there is a voice, its captions are a pinned bottom comment of the uploader, not a separate strip.
- Chrome text (title, byline, chapter name, input placeholder, counts) is small, high contrast on a scrim. A clock that changes every second is a gauge, left out of the reading check.

## 5. Motion quality

- **Comments never ease.** Constant speed in a straight line is the medium's physics; they enter at the edge and leave beyond the other.
- **Pinned comments** fade in over about 0.25 s and out over 0.3 s, and do not move.
- **Pause** freezes every comment where it is, at the same instant as the picture; the crowd resumes at the same positions.
- **The picture** moves like a camera on a set: eased pushes and pans, time-lapses driven by one clock (the player's), animals and objects with anticipation and settle. Everything is a function of the player's clock, so a pause freezes it all.
- **Button burst**: ring fill while held, then tokens fly up from the buttons for about 1.4 s.

## 6. Camera grammar

The player is fixed; the picture and the comment layer may move.

| Move | What it expresses | Can serve |
|---|---|---|
| Wide, slow push on the picture | the scene and the crowd settling in | an opening; a calm stretch |
| Track along the set | steps in a sequence, progress | a process; a journey; a list of stations |
| Push to the hero object | what the crowd is looking at | a result; a detail the jokes are about |
| Zoom of the comment layer into the wall | the crowd as the subject | a peak; a pile-up; a collective gasp |
| Locked frame with a sparse crowd | waiting, sleep, boredom | a long process; a pause before a reveal |
| Pause (player stops, everything freezes) | the held breath | a tense moment; a freeze-frame joke |

Framing rules: the hero object fills at least a third of the frame height at its key moments; comments keep to the picture area (clip them when the layer is zoomed, and keep wall comments out of lanes the zoom would crop); the player chrome is never covered. Transitions are made of the medium (a track along the set, a chapter mark passing, a pause), not fades.

## 7. Sound palette

- **The crowd has a sound.** One short blip per comment, timbre by colour role (soft key tick for white, marimba ping for yellow, boop for cyan, sparkle for pink, wood block for green, buzzer for red, bell for gold), pitch from the score's scale by lane, time on the spawn (snapped to the grid). Dense walls become texture; the chatter is part of the harmony. Derive it from the events, never place by hand.
- **Player sounds**: a small click for pause and resume, a tick as a chapter passes, key taps while someone types, a rising tone while the buttons are held and a bright chord with sparkles at the burst.
- **Foley belongs to the picture** (materials of the scene), small and close; the picture's own sounds are louder than the crowd outside the peaks.
- **Score**: soft, a little lo-fi: electric piano, muted bass, pad, shaker; pentatonic or modal so any blip fits; it follows the crowd's mood and can leave completely.
- **Silence is a native move**: a sleeping crowd (comments stop, only a clock or room is left) and the pause (everything but the room stops). The first sound after it should be one of the strongest in the film.
- **Mix**: crowd under the foley, foley under nothing; −14 LUFS with a limiter.

## 8. Native moves

A menu: use the ones your story needs.

- **Doubt that turns.** The same line of crowd moves from sceptic to coach to chorus as the picture changes. *Fits content like:* a first attempt; a product demo that wins people over; a comeback match.
- **The counting chorus.** Comments count a repeated action aloud, in sync with it. *Fits content like:* exercise reps; folds, stitches or laps; a launch countdown.
- **The spoiler that comes true.** A time-stamped comment early on ("wait for 0:44") is paid off at that time. *Fits content like:* a heist; a goal; any reveal with a date.
- **The correction fight.** Comments argue numbers or facts and the uploader pins the answer. *Fits content like:* a recipe; a review; a tutorial with settings.
- **The crowd falls asleep.** Comments thin out and slow down while a long process runs. *Fits content like:* waiting; loading; a long process; a night shift.
- **The wall.** A pile-up of the same few short words, with the comment layer zoomed into it and the hero object masked in front. *Fits content like:* a peak; a goal; a reveal; a drop.
- **The held breath (pause).** The player pauses and every comment hangs in the air. *Fits content like:* a decision; a near miss; the second before a hit.
- **The press.** Like, coin and favourite ring up and burst. *Fits content like:* an ending; thanks; a climax.
- **The last bullet.** Someone types in the input box; the line appears as a pinned gold comment that echoes the first. *Fits content like:* a series teaser; a sign-off; a callback.

## 9. Pitfalls of the medium

- **Unreadable comments.** Too long, too fast, outline too thin, or crossing a bright spot. Keep to the lane physics and the reading rule; test on the brightest and busiest frame.
- **Too many at once.** About 8-14 in flight is a conversation; 25-30 is a wall and only for a peak. A wall of long comments is noise.
- **A crowd that sounds fake.** Identical lengths, one colour, regular timing. Vary length (1 to 34 characters), colour and rhythm, and let the content of the comments change with the story.
- **Hiding the picture.** Comments over the hero object for seconds. Use the mask (subject redrawn over the comments), keep the subject in the middle band, and let the crowd thin when the picture matters.
- **A zoomed comment layer crops text.** Keep wall comments to lanes the zoom keeps inside the frame; release the zoom before long comments spawn.
- **Clocks and counters as text.** A time stamp changes every second and cannot meet the reading check: leave gauges out and say so.
- **Comments that follow the camera.** They are screen-space; if the picture moves, they must not.
- **Looking like a real site.** Invent the name, logo, colours, icons and layout.

## 10. Engine

In `demo/`: `comments.js` (the script of comments, the lane scheduler `layout()`, `posOf()`, `drawComment()`), `timeline.js` (player time against film time, the pause, chapters, camera and zoom tracks), `scene.js` (the picture: parallax back wall, counter, stations, `drawSubjects` for the mask), `ui.js` (the invented player and its texts), `main.js` (page contract, layer order, TEXTS, the event list), `mix.py` (crowd blips, foley, score). Minimal use for another film: write your comments as `[time, text, role, size?, {pin, dur}?]`, call `layout(ctx)` after the font loads, and draw `posOf` / `drawComment` for each comment each frame. File list and build: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the video, the uploader, the crowd's voices, the language (English, Chinese, mixed), the colour roles, the scene and its camera, and the story. All far from our demo:

- Structures: **a match** (a sports clip where the crowd predicts, panics and celebrates, pause on the penalty); **a review** (a gadget unboxing with the crowd correcting specs and pinning the real numbers); **a haunted video** (found footage where the comments warn of what the picture does not show); **a lecture** (a chalk-board proof where the crowd completes the line before the teacher).
- Openings: **a pinned line alone on a black player**; **a wall already in flight at frame 0**; **the progress bar filling while the picture is still black**.
- Endings: **all comments fading, one pinned left**; **the player's replay button**; **the crowd typing the same word, line by line**.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
