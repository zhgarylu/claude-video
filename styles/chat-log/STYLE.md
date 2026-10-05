# Chat Log: Style Prompt

> A story told entirely as a messenger conversation on a phone, or as a cropped screenshot of one: bubbles that pop in and push the chat upward, "is typing" dots, voice-message waveforms, photo and link cards, reactions, recalled and pinned messages, a group of several voices. The conversation has its own clock, and the film is judged by whether you can read it in time.
> References (grammar only): group-chat screenshots passed around as stories, screen-life films where typing and deleting are acting, and messenger apps in general for the parts (bubble, tail, ticks, typing dots). Never copy a real messenger's logo, bubble colours, icon set, layout or name; the interface here is invented.

## 1. Essence, and what it is not

- **A conversation is the whole film.** Everything on screen is something one of the people said, sent, reacted to or did to the chat (pinned, renamed, recalled). There is no narrator and no scene outside the phone, except a second surface beside it.
- **The chat has a clock.** Messages arrive when the story needs them; a message is on screen long enough to be read before the next one pushes it up. Timing is reading time.
- **Bubble physics is the animation.** Pop, push, collapse, bounce: the medium moves only by messages arriving and the view following them.
- **The camera is scroll and crop.** Stick to the newest message, scroll back through history, zoom to one bubble, crop like a screenshot.
- **Invented interface, real human texture.** Names, avatars, jokes, timestamps and the way people abbreviate do the work; the UI chrome stays quiet.

Not a screen recording of an app demo (see living-screencast: cursor, product workflow, real software), not a "text message" overlay on top of other footage, not kinetic typography (the words live in bubbles, not in space), not a social-media mockup with feeds and likes.

## 2. Materials & rendering

- **Flat vector on one 2D canvas.** The phone surface is its own coordinate space (our demo: 640 x 720 units: header 88, chat 552, input bar 80). A single camera maps it to the screen; everything that follows a subject (zoom to a bubble, crop rectangle) goes through the same function.
- **Bubbles**: rounded rectangle, corner radius about 22, the corner next to the avatar drops to about 7 on the last bubble of a run; soft shadow (blur 5, offset 1.5, low alpha); text and time label inside, ticks on sent messages.
- **Layout is a function of time**: every row has a height that grows as the message pops and shrinks when it is recalled; the view sticks to the bottom (scroll = content height minus view height). Never position a bubble by hand.
- **Wallpaper**: a tinted ground with a doodle tile (circles, crosses, squiggles, tiny speech bubbles) in a slightly darker tint, scrolling at about 0.8 of the content for depth.
- **People are small flat avatars** (head, hair, glasses, a colour ground), never letters or photos; picture messages and link thumbnails are drawn illustrations in the same flat language.
- **Behind the phone**: a deep, desaturated ground with a few soft colour blooms and a blurred giant ghost of the chat bubbles for depth. The phone has a soft drop shadow and a faint rim; no bezel, notch or device chrome.
- Draw icons (heart, laugh, ticks, play, mic) as vectors. Do not use emoji characters: their fonts differ per machine.

## 3. Colour logic

- **One brand accent** (an indigo in our demo) for the user's own bubbles and the interface's controls; **white bubbles** for everyone else; a **tinted wallpaper** (lilac, mint, sand) that is never white and never the accent.
- **One hue per sender**, used for the name label and the avatar ground. In a group of four or five, keep them clearly apart in hue, not just lightness. A character with a special role (a voice message, the surprise) may get a tinted bubble of her own.
- **Status colours are tiny**: seen ticks (a cool mint), reactions (red heart, yellow face). Recalled or system text is grey and italic or in a pale pill, never a colour.
- Avoid the green/blue pair that signals the big messengers; avoid a pure white screen. The backdrop is darker than the phone so the phone is the brightest thing in frame.
- Example palette: accent `#5a4be0`, wall `#ece6f5`, sender hues teal `#12806f`, orange `#b8530c`, magenta `#a82c78`, gold `#946200`, backdrop `#2d2046` to `#171029`.

## 4. Type & subtitles

- **One rounded humanist sans, OFL** (Nunito, Quicksand, Figtree, Manrope), in weights 600 for text, 700-800 for names and titles. Sizes in phone units: message 24-28, caption and card title 22-25, name label 16-18, time 13-15, header title 26-30, system line 17-19.
- At the base zoom a message must be at least about 36 px on a 1080p screen; zoom-ins go larger.
- **The messages are the text; there are no separate subtitles.** A voice message shows its transcript inside the bubble, every word visible and dim, lighting up as it is spoken. Export an `.srt` with one cue per message for accessibility; do not burn captions over the phone.
- Reading-time rule: a message stays fully in frame for max(1.5 s, letters / 15 + 1.5 s); a cropping zoom may take an older message out of frame only after that time. `readcheck.mjs` enforces it. Draw avatars without letters so they are not texts that come and go.

## 5. Motion quality

- **Smooth, never stepped** (24 fps, no stepping): the medium is software.
- **A message pops**: scale 0.55 to 1 with a small overshoot (about 0.3 s) about its tail corner, alpha in over the first 0.13 s; at the same time the row's height grows with an ease-in-out so older messages are pushed up in the same motion. A sent message rises from the input bar and the draft clears.
- **Typing dots** bounce in a travelling wave (about 1.9 Hz); the status line under the title crossfades to "...is typing" with an 8 px slide.
- **Recall** collapses the bubble to a grey line (about 0.5 s) while the row shrinks; reactions pop onto the bubble edge with a small overshoot; a pinned banner slides down and swaps text with a vertical roll; renaming deletes the old title at about 22 characters a second and types the new one.
- **Scrolling back** is a 0.9 s ease, held, then eased back; it must never be faster than the eye can follow.
- Nothing slides inside a bubble: text sits still once it has arrived.

## 6. Camera grammar

A vocabulary, not a route. The camera is a smooth centre-and-scale move over the phone surface (plus an optional sideways shift in screen pixels).

| Move | What it expresses | Can serve |
|---|---|---|
| Stick to the newest (default, zoom about 1.5) | the pace of a live conversation | a plan being made; an argument; a Q and A |
| Tight on one bubble (zoom 2.3-3.3) | one message is the point | a confession; a number; a punchline; a voice message |
| Slow push to the typing dots | waiting for an answer | suspense; an apology; a reveal about to land |
| Scroll back to the top | history, what was said before | evidence; a log; "look what we wrote" |
| Pan the phone aside for a second surface | what someone else sees | dramatic irony; a notification; a status board |
| Crop frame closing, flash, crop becomes the frame | "this is the part to keep" | an ending; a quote; a result |
| Wide hold, no move | reading time | a list; a timeline; a pile of reactions |

Framing rules: the newest message sits in the lower third; the whole phone is in frame at the base zoom, with the side space used for a second surface or the ghost, never left as a flat fill for long; a vertical film (`--size 1080x1920`) fits the phone at about 3x. Transitions are scrolls, recalls, pans and the crop; no dissolves, no wipes.

## 7. Sound palette

- **The app's own sounds are the foley**: a received message is a soft bubble pop tuned to a pentatonic note, a different note per sender, so the conversation is also the melody; a sent message is a higher pop with a short rising air; key ticks while someone types (a few per second, tiny); a typing blip for the dots; a two-note bell for a system event; a paper-crumple and falling tone for a recall; a tiny sparkle for a reaction; a chunk for a pin; a soft two-tone tick for "seen"; a camera shutter for the crop.
- **Voice messages are real voice** (TTS or the user's recording), a little warmer than the pops; everything else ducks 40-50 % under it.
- **Ambience**: a quiet room tone, always present, so silence is not digital black.
- **Music**: small and tonal (kalimba or music box, soft bass, a pad, a shaker), in a pentatonic key so any pop fits any chord; no drums. It thins or stops for the typing dots.
- **Silence is the main tool**: while someone is typing, nothing but the room, the dots' blip and the keys. The first sound after the wait (a message, a voice) is one of the film's biggest.
- Mix: pops loudest outside voice, music about 6-8 dB under them, voice about 6 dB above pops; −14 LUFS with a limiter.

## 8. Native moves

A menu: use the ones your story needs.

- **The typing dots that stop and start.** *Fits content like:* a reply that will change everything; a boss deciding; an apology being drafted.
- **Recall (unsend).** A bubble collapses into "X recalled a message" and the rows pull up. *Fits content like:* a leaked secret; a wrong price; an argument backing down.
- **A voice message with a live transcript.** Play button, waveform filling, words lighting. *Fits content like:* an interview answer; a customer review; a recipe spoken by a grandmother.
- **Scroll back.** The view climbs to the top of the history and returns. *Fits content like:* a project recapped in one pass; earlier clauses of a contract; the evidence for an accusation.
- **Quote-reply.** A bubble that cites an earlier one. *Fits content like:* a callback joke; an answer to an hour-old question; a correction.
- **Reactions pile up.** Icons and tiny avatars on a bubble edge. *Fits content like:* a vote; applause; who has read the memo.
- **Pinned banner swap.** *Fits content like:* the current plan; the rule of the day; a deadline that moves.
- **Photo and link cards.** *Fits content like:* a product shot; a receipt; a chart sent as an image.
- **System lines and the seen-by row.** *Fits content like:* a turn in the plot; a handover; a team that has all read it.
- **A second surface.** The phone slides aside; a lock screen, a status board or another chat appears. *Fits content like:* the other side's view; notifications; a dashboard fed by the chat.
- **The screenshot crop.** Handles close in, shutter, the crop fills the frame. *Fits content like:* an ending; a pull quote; "the part to keep".

## 9. Pitfalls of the medium

- **Messages faster than reading.** Give every message its reading time; a rush is for short words ("WAIT"). Fix: fewer words, or a longer gap, never a faster scroll.
- **Zooming away from unread bubbles.** A tight zoom crops older messages; start it after they have had their time (`readcheck.mjs` reports it).
- **Walls of text in a bubble.** Real chats break a thought into two or three short messages.
- **Bubbles measured before the font loads.** Measure after `document.fonts.ready`, or the time label overlaps the text.
- **Letters and emoji as decoration.** Avatar initials appear and vanish as unreadable texts, and emoji fonts differ per machine: draw avatars and icons.
- **Looking like a real app.** Keep colours, tail shape, icons and name invented and plain.
- **Inconsistent chat logic.** Sent bubbles stay on one side, a sender keeps one colour, timestamps never go backwards, nobody answers before the question arrives.
- **Too many voices.** More than five senders cannot be told apart at a glance.
- **Dead wide frames.** A phone alone in 16:9 leaves two flat panels: use the ghost, a second surface or a vertical render.
- **Typing dots** under 1.5 s do not read as suspense; over about 4 s without change feel stalled: stop and restart them.

## 10. Engine

In `demo/`: `chat.js` (class `Chat`: measures bubbles once, `layout(t)` for time-dependent row heights and scroll, `draw(ctx, t)` for wallpaper, bubbles, header, pinned banner and input bar; `itemBox(id, t)` for camera targets; `ghosts(t)`; helpers `avatar()`, picture drawings; texts register themselves for the reading check), `script.js` (the story as data: people, items, camera table, banners, crop; `events()` for sound cues and `cues()` for subtitles), `main.js` (camera resolve and blend, backdrop with ghost chat, a second surface, the screenshot crop, `TEXTS`), `mix.py` (the app's sounds, score, voice), `tools/export_srt.mjs`. File list and build steps: [DEMO.md](DEMO.md) "Build notes".

A different chat in a few lines: `new Chat([{ id:'a', who:'me', kind:'text', text:'Where is my order?', t:0.5, time:'9:00' }, { id:'b', who:'bot', kind:'typing', t:1.8, tEnd:3 }, { id:'c', who:'bot', kind:'link', title:'Order 4821, out for delivery', domain:'track.example', t:3, time:'9:00' }], { people, voice, title, members, pins, recallLabel })`, then `chat.draw(ctx, t)` inside a camera transform that maps the 640 x 720 phone to the screen.

## 11. Variation space

You decide the topic, the people (two to five), the app's name or none, the colours inside the colour logic, the language, the period (a flip-phone SMS list, a work chat, a game lobby), the camera route and the pacing. Far from our demo:

- Structures: **a negotiation** (a number that moves, ending on the deal); **a support chat** (user asks, product answers with cards, ends on the fixed state); **a year in a family chat** (scroll back through seasons to the first message); **a countdown** (a team coordinating a launch).
- Openings: **the typing dots alone** on an empty chat; **a notification banner** over a lock screen; **a pinned message** and nothing else.
- Endings: **a message left unread** (one tick); **"X left the chat"**; **a voice message begins and the film stops on the play button**.

**Use cases as information order** (how long each layer stays):

- **Data or a report**: the question (3 s), the figure as a card or picture (4-5 s), a one-line reaction (2 s), then the detail. Charts go in as picture messages, never as text rows.
- **A list or checklist**: one message per item, 2.5-3.5 s each, the pinned banner keeps the count, a seen-by row closes it.
- **A timeline**: timestamps drive the film (a clock in the status line), long gaps as a date pill, a scroll-back recap at the end.
- **A product or process explainer**: the user asks (short), the product types (dots 1-2 s), answers with a card, a quote-reply points at the exact step.
- **A story**: setup in short bubbles, a system line for the turn, one wait (typing dots), one voice or image as the answer, a reaction pile, the last line as a crop.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
