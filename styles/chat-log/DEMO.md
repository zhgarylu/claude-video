# Chat Log — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *She Knows* (59.5 s) · `chat-log.mp4` · source in [`demo/`](demo/)

## Story & structure

A group chat called "Nana's 80th" on an invented messenger, seen on Priya's phone. Tomás: "Nobody tell Nana." Aunt Bee agrees ("Obviously."), Jun sends a drawn cake photo, Priya types a draft into the input bar and sends it, Tomás sends a link card for 24 folding chairs, and the plan gets pinned. Then Aunt Bee adds "folks so we all get the photos", and a system line says she added Nana Rose. A bell, a flurry of short capitals ("WAIT", "DELETE. EVERYTHING."), and the chat scrolls back to the top while three earlier messages are recalled one by one. The status line turns to "Nana Rose is typing…": two passages of dots with nothing else but the room, the dots' blip and nothing from the score. Her answer is a voice message whose transcript lights word by word (eight o'clock, the green dress, and the good chairs, not the plastic ones). Hearts pile on it, Tomás says "Yes ma'am", asks Bee whether she did it on purpose, and Bee quote-replies with the first-act word, "Obviously." Priya renames the group and the header edits itself to "Nana's 80th (she knows)". Nana types once more: "Notifications keep what you recall, dear." The phone slides aside and her lock screen shows the three recalled messages as banners. Crop handles close in, a shutter fires, and the crop becomes the last frame.

Why it fits: the story is only things people can do to a chat (add, type, recall, pin, rename), so every beat is a native move; the turn is a system line, the suspense is a status line, the answer is a voice message, and the joke that the recalls were pointless is answered by a second surface. Aunt Bee's first "Obviously." returns as her answer, and "Nobody tell Nana." returns as the first banner on Nana's lock screen.

Native moves used: tight hook bubble, draft typed in the input bar, photo and link cards, reactions, pinned banner and swap, system lines with a bell, scroll back, recall, typing dots that stop and start (twice), voice message with transcript, quote-reply, rename, seen-by row, a second surface, screenshot crop.

## Shots

Frames: [hook](demo/stills/frame_hook.jpg) · [scroll back](demo/stills/frame_scrollback.jpg) · [typing dots](demo/stills/frame_typing.jpg) · [voice message](demo/stills/frame_voice.jpg) · [crop](demo/stills/frame_crop.jpg) · [last frame](demo/stills/frame_end.jpg)

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0-2.2 | one bubble, large; the second arrives below | z 2.45 on the first bubble | hook; the sentence is the image |
| 2 | 2.2-11 | cake photo, a draft typed and sent, a link card, a pin | pull out to the whole phone (z 1.5), stick to the newest | photo and link cards; reactions; pinned banner |
| 3 | 11-17 | "Aunt Bee added Nana Rose", then short capitals | wide, slight push (1.62) | system line with a bell |
| 4 | 17-23 | scroll back to the top, three recalls, return | wide | recall; scroll back |
| 5 | 23-28.5 | typing dots, stops, starts | slow push to z 2.3 on the dots | silence 1 |
| 6 | 28.5-36.4 | voice message, transcript lighting | z 2.35 on the bubble | voice message |
| 7 | 36.4-45 | hearts, "Yes ma'am", the callback, the rename | wide (1.55) | reactions; quote-reply; rename; pin swap |
| 8 | 45-47.6 | typing dots again | push to z 1.9 on the dots | silence 2 |
| 9 | 47.6-53.9 | her last text; seen-by; the lock screen with three banners | phone slides left 220 px at z 1.5 | second surface |
| 10 | 53.9-59.5 | crop handles close, shutter, the crop fills the frame | z 3.3, centred on the last bubble | screenshot crop |

## Score structure

100 BPM (bar 2.4 s), D major pentatonic. Every received message is a pop tuned to a pentatonic note by sender and message number, so the chat is its own melody. Bars from 0 s: a thin bar, then kalimba eighths over D, Bm, G, A with soft bass on 1 and 3. At the ping (11.1 s) a held pad enters; from 12 s the arpeggio doubles to sixteenths over Bm, Em, A with a shaker, until the scroll back, where each recall triggers a four-note falling pluck. Silence 1: the score is gated off from about 22.7 s to 28.45 s; only the room tone, Nana's blips (every 0.42 s) and nothing else. The voice message sits on a very low held D pad; after it ends the groove returns (D, G, Bm, A, D, G) with the shaker. Silence 2 (44.8-47.6 s) again leaves blips and room tone. Her last message lands on a D major pad with a rising four-note kalimba figure; three notification bells rise with the banners; the shutter is followed by a high D and a low D that ring out to the end. Mix: pops and bells about 6 dB over the score, the score ducked 50 % under the voice, −14 LUFS (measured −14.0, peak −1.9 dBFS).

## Palette & props

Phone `#ece6f5` wallpaper with a doodle tile, white bubbles, accent indigo `#5a4be0` for Priya's bubbles and controls, Nana's bubbles `#ffeab0` with brown ink. Sender hues: Tomás teal, Jun orange, Aunt Bee magenta, Nana Rose gold; each has a flat avatar (beard, glasses, bun, white curls). Props drawn in code: a cake photo with an "8" and "0" candle, a four-chair thumbnail for the link card (invented store, domain `hirewell.example`), a waveform, hearts and a laugh face. Backdrop: plum `#2d2046` to `#171029` with four colour blooms and a blurred giant ghost of the bubbles. Nunito (OFL).

## End card

None. The last image is the cropped screenshot of Nana's last message with the seen-by row, held about 2.3 s after the crop settles.

## Build notes

Files in `demo/`: `index.html`, `main.js` (camera, backdrop, lock screen, crop, `TEXTS`), `chat.js` (the messenger engine), `script.js` (the story as data, sound cues, subtitle cues), `mix.py`, `tools/export_srt.mjs`, `build.sh`, `lines.json` (Nana's voice message), `CREDITS`, `TREATMENT.md`.

`sh styles/chat-log/demo/build.sh` (needs the core and voice tiers) runs: font fetch, Kokoro voice (bf_isabella, speed 0.84), speech check, events export, reading check, mix, srt, render (about one minute with two workers), mux (no grain), styleframe and poster.

Pitfalls tied to this demo: the draft Priya types in the input bar is not reported in `TEXTS` (a typewriter of the bubble that follows a second later); the placeholder "Message" needs 2 s fully in frame before the draft starts, so the first pull-out ends at 3.2 s; the status line "Nana Rose is typing…" needs 2.6 s with the header in frame, so the push to the dots starts after the first typing pass; the renamed title and the swapped pin need about 3 s before the camera leaves the header; Tomás's name in Nana's line is spelled "Tomas" for the voice and written "Tomás" on screen, so `lines.json` carries an `asr` override; subtitles are one cue per message (cues overlap slightly and `srt.py` trims them), they are not burned in.
