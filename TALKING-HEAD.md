# Talking-head films: a presenter's video with a style's explainer graphics around it

Use this when the user brings (or wants to make) a **video of a presenter talking** and asks for the explanation to be drawn around them: news items, feature tours, product explainers, tutorials. The presenter is shot footage; everything else is drawn in code in one of the library's styles. It is the normal workflow ([`AGENTS.md`](AGENTS.md) Workflow, [`DIRECTOR.md`](DIRECTOR.md), [`TECHNIQUE.md`](TECHNIQUE.md)) plus the steps and tools below. The presenter's words are the script: **the picture follows the voice, never the other way round.**

Not for editing or re-cutting the user's footage. The host video is used as given: no trimming, no speed changes, no lip-sync changes.

## Quick start: a first cut in one command

```sh
sh tools/talk/new-film.sh <host.mp4> films/<name> --layout split|pip|world --title "…" --lang zh
```

It copies [`tools/talk/template/`](tools/talk/template/) into the project, runs `prep.sh` (frames, voice, word timings), writes `film.json` with captions made from the transcript, and renders `<name>.mp4`. The result is a plain but complete film: the host in the chosen layout, a title, the items from `film.json`, subtitles and the voice. Then you make it good: edit `film.json` (title, theme, `cards`, the exact caption text), replace `drawContent()` in `main.js` with the style's own graphics, add a score and foley in `mix.py`, rebuild with `sh films/<name>/build.sh`.

The three layouts are ready-made in [`tools/talk/layouts.js`](tools/talk/layouts.js), and each has a finished demo with its source in [`demos/talking-head/`](demos/talking-head/):

| `--layout` | Function | The host | Content area | Demo |
|---|---|---|---|---|
| `split` | `splitLayout()` | a panel on one side, about a third of the width, with a "speaking" indicator; a caption band under the panels | the other panel: the style's UI, or `bullets()` | [`claude-mods`](demos/talking-head/claude-mods/) |
| `pip` | `pipLayout()` | a corner window, about 7% of the frame; slides out when the footage ends | the whole frame | [`muse`](demos/talking-head/muse/) |
| `world` | `worldLayout()` | the video itself, near full height, four edges feathered, ground colour following the video's corners | callout cards on both sides with leaders to objects in the video; the video shrinks aside for an end card | [`muse2`](demos/talking-head/muse2/) |
| `world` + `--aspect 9x16` | `worldLayoutV()` | portrait short video: the video fitted to the width (or wider, cropping the sides), ground colour from the video's own edge, bands above and below melt into it | callout cards on the left/right edges with leaders into the video, karaoke captions (`captions.karaoke()`), a title chip in the top safe area | [`dots-v`](demos/talking-head/dots-v/) |

Also in `layouts.js`: `captions.card()` and `captions.pill()` (two caption looks), `cuesFromWords()` (subtitles from the transcript: breaks at sentences, pauses and punctuation; fix the text by hand, speech-to-text mishears names), `bullets()`, `drawCallout()` and `isoCube()`. Colours and fonts come from a `theme` you pass in; nothing in the layouts knows about a style.

## 1. The brief (one round of questions, DIRECTOR.md §1, plus)

- **Do they have the host video?** If yes, take its path. If not, offer to write the video-generation prompt (section 3) and wait for the file. Never invent a presenter.
- **Facts.** For news or product topics, search for current facts, put the sources in `CREDITS`, and tell the user which claims you could not verify at the source.
- **Brands and logos.** Anything with a real brand needs one of: the **name as plain text** (always allowed, it is naming), a **stand-in you draw** (a generic tile with the name, never an imitation of the real mark), or **their own logo file**, which you use only when the user says they have the right to use it. Put such files in `src/brand/<name>.png`; the page loads each if it exists and falls back to the name tile if not. Say which one you did in the delivery note. See DIRECTOR.md §12.
- **How big is the host?** Default **small**: a picture-in-picture of about 7% of the frame (330×443 on a 1920×1080 frame for a 3:4 clip), top-right, so the explanation is the film. Ask only if the user has a preference ("host on the left", "host half the frame").

## 2. Choose the style by the topic, not the host

| The topic is | Styles that work | Host layout |
|---|---|---|
| a software feature tour | `dark-keynote`, `living-screencast` | split panel (host ≈ 35% width, left) or PiP |
| a system or product with parts and connections | `iso-infographic` | PiP; the camera travels along the system |
| numbers, rankings, trends | `dataviz`, `swiss-motion` | PiP |
| a process or a how-to | `whiteboard`, `pictogram-motion` | PiP or lower-third strip |
| a data-heavy briefing | `halftone-dossier`, `blueprint` | PiP |

Painterly, hand-made or heavily textured styles (oil, ink, embroidery, claymation) fight a photographic host. Do not use them unless the user insists; if they do, give the host window a frame that belongs to the style.

The presenter's footage keeps its own look. Give the window a border, a radius and a shadow in the style's own language; let the style's palette surround it, but do not colour-grade the person.

## 3. Writing the prompt for the host video (when the user has no footage)

The user generates the clip in their own video tool, usually from **a reference image of their presenter**. Write the prompt in the user's language. What makes a clip usable:

- **Reference image, one identity.** Say "the person in the reference image; keep face, hair and age unchanged". Never describe the face when a reference exists.
- **Stable frame.** Fixed tripod, eye level, no zoom, no cuts, no subtitles, no logo, no on-screen text, no music. The film adds all of that.
- **Spoken lines in full**, with numbers and dates spelled the way they are spoken. Keep brand names in Latin script; some voices mispronounce them, so tell the user to listen to those words.
- **Length.** Many tools cap at 5–15 s per clip. For 30 s ask for a single time-axis prompt first; if the tool refuses, split at sentence boundaries and say the cuts will be hard.
- **Wardrobe changes, if the user wants variety.** Do it with **outer layers over one base T-shirt**: jacket, cardigan, zip hoodie, open shirt. Never garments pulled over the head (they hide the mouth and break lip-sync). Describe each change in the quiet gap between two sentences: the presenter walks to one frame edge, reaches off-screen for the next layer, hands the old one off-screen, puts the new one on while walking back, **talking the whole time**. Frame knee-up so there is room to walk. Show only the arm going out of frame: no rack, no second person. If the tool cannot do this reliably, fall back to still images of each outfit made from the reference image, then one clip per outfit.

Template (fill the brackets; keep the structure):

```text
[Reference]: the person in the reference image, unchanged face, hair, age, skin, background and light. One continuous 30-second take, fixed tripod camera, knee-up medium shot, eye level, no zoom, no cuts. Natural lip-sync, [tone], small hand gestures. Only the outer layer of clothing changes, over the same white T-shirt; changes happen between sentences while he keeps talking.
0–6 s: wearing [outfit 1]. He says in [language]: "[line 1]"
6–8 s (change): as the next line starts he walks to the [right] edge, hangs the jacket off-screen, takes [outfit 2] from off-screen and puts it on while walking back to centre.
8–13 s: wearing [outfit 2]. He says: "[line 2]"
… (one block per line; keep every change in a silent gap or at the start of the next sentence)
No subtitles, no logos, no text on screen, no background music. Portrait 3:4, 1080p, 24 fps, 30 s.
```

Always end the message to the user with the facts' sources and the words most likely to be mispronounced.

## 3b. When the host video is itself a styled world

Sometimes the user generates the presenter **already inside a style's world** (an isometric stage, a paper set) and the host acts out the content with props. Then the host video is the main picture and the film's job is the **information layer**, not a second copy of the scene:

- **Video at near full height**, centred; feather its four edges and make the ground colour follow the video's own corner colours every frame, so it melts into the canvas with no frame and no halo (the video's background shifts when it dims or brightens a scene).
- **Callout cards on both sides, with leaders to the objects in the video.** Put in the cards what the video cannot draw: names, dates, numbers, "coming soon" tags, sources. Anchors are `[t, x, y]` in the video's own pixels (overlay a coordinate grid on a few frames to read them). Retract a leader when its object leaves the frame; the card can stay as a caption until its reading time is up.
- Add a **route strip** (01 → 05) and a small wordmark; end by shrinking the video to one side and putting the summary on the other.
- Look for **errors in the generated video** before building: a wrong date on a prop, a misspelt sign, a hand with six fingers. If a prop's text contradicts the script, fix it in the extracted frames (never in the user's file) and say so; `demos/talking-head/muse2/patch_calendar.py` detected the dark digits on a calendar page, painted them out with row-wise interpolation and drew the right text in the same size and colour.
- Props in generated video do not carry text or real marks. Put the names in cards, and the user's own logos in `src/brand/`.

Prompt for such a host video: the same time-axis template as section 3, but describe the **world** (projection, three tones per face, palette by meaning, platform, props that grow out of the floor and sink back, no text on props) and give the host an action per sentence instead of outfit changes; put scene changes in the silent gaps. If the tool drifts from the style, make one still per scene first and animate each.

Ready-to-paste prompts for such host videos (a Swiss white studio in two signal colours, an isometric island, and a fill-in template), with the rules that make them work: [`prompts/talking-head/`](prompts/talking-head/).

## 3c. Portrait (9:16) short videos

`sh tools/talk/new-film.sh host.mp4 films/<name> --aspect 9x16` makes a 1080×1920 film (always the `world` layout, see `worldLayoutV()` in `tools/talk/layouts.js`). It is for Douyin / Xiaohongshu / Shorts / Reels, where the host video is the picture and the film adds a thin layer:

- **Host video.** Generate it 9:16 (best) or 3:4. A 3:4 video is fitted to the width and leaves a band above and below that takes the video's own edge colour, so there is no letterbox. To fill more of the height, set `"world": { "width": 1230, "top": 50 }` in `film.json`: the video gets wider than the frame and its sides are cropped, so keep props and the host inside the central 80%.
- **Safe zones.** Platforms put their own UI over the bottom ~330 px and the right ~120 px (like, comment, share, the caption line). Keep text out of them: captions sit at y ≈ 1390, cards keep `rightSafe` (96 px) away from the right edge, the title chip is in the top-left.
- **Captions.** `captions.karaoke()`: big bold words with a dark outline, the word being spoken in the accent colour. `cuesFromWords(words, { maxChars: 14, balance: true })` splits long sentences into equal parts instead of a full line plus an orphan; a line that is a little too long shrinks to one line, a very long one becomes two balanced lines. `cueWords()` gives each cue's word times. Captions follow the voice, so they are not part of the reading-time check.
- **Cards.** `{ id, side:'L'|'R', hue, title, sub?, tag?, t0, t1, anchor:[[t, vx, vy]…] }`, `anchor` in the host video's own pixels. A card needs about `speech + 2 s`: it takes 0.4 s to arrive and 0.35 s to leave, and `readcheck` counts the time it sits fully still.
- **Cheap tricks that work.** Cards on the edges cover the generated world's side props, so ask for blank, symmetric props when you generate the video. Prompts for a 9:16 host video: [`prompts/talking-head/`](prompts/talking-head/) (`swiss-dots-vertical`).

## 4. Prepare the footage

```sh
sh tools/talk/prep.sh <host.mp4> films/<name> --lang zh --prompt "terms the host says, separated by spaces" 
```

It copies the video to `films/<name>/src/host.mp4` (the original is never touched) and writes `frames/`, `voice.wav`, `env.json` (voice level per frame), `words.json` (word timestamps), `meta.json`, then prints the **cue sheet** and the **pauses** (≥ 0.8 s). `--prompt` takes plain terms separated by spaces; punctuation in it can leak into the transcript.

- Listen to the clip. Speech-to-text mishears names, and generated voices sometimes mispronounce them. **Subtitles follow the script the host meant** (say in the delivery note if the voice differs); the picture follows the times in `words.json`.
- Read the pauses: they are the film's **transition windows** (wardrobe changes, camera moves, a scene change). A 1.5–2.5 s pause is a camera move; a 0.3 s pause is a breath.
- A film with the host in it starts at `t = 0`, because the host's audio is the film's audio. Do not add lead-in before the voice. Add a tail after it only for an end card or a legend (hold ≥ the reading time); animate the host out (shrink, slide away) when the footage ends, never freeze it.

## 5. Treatment (DIRECTOR.md §4, plus)

Write the cue map from `words.json`: for every spoken **keyword**, the visual that lands on that word's start time. Keep a table (time, spoken, picture). Rules that worked:

- One idea per sentence, one visual per idea, and the visual arrives **on the keyword**, not on the sentence start.
- Use the pauses for the big moves (camera travel, scene change, wardrobe change in the PiP). Never move the camera during a number the viewer must read.
- Label with pins or captions that **stay on screen long enough** (section 7, `readcheck`), so choose short labels: 2–4 CJK characters or one Latin word, and put the longer phrase in a smaller sub-line that readcheck does not need.
- Plan the **host exit** (shrink to a dot, slide out) a beat after the voice ends, and spend the last seconds on one idea: a question, a legend, the smallest living element.
- Sources: if the film states facts, credit them on the end frame and in `CREDITS`.

## 6. Build

The page is an ordinary `window.render(t)` page. Add the host with a layout (section "Quick start") or draw it yourself:

```js
import { loadHost, drawPip, level } from '/tools/talk/host.js';
import { worldLayout, captions } from '/tools/talk/layouts.js';
const host = await loadHost('src');                       // decode every frame before READY
const L = worldLayout(host, { W, H, cards, endAt: 29.95 });
// in render(t):  L.drawGround(ctx, t); L.drawVideo(ctx, t); L.drawCards(ctx, t); captions.card(ctx, cues, t, { W, H });
```
`level(host, t)` is the voice level 0..1, for speaking indicators.

(In skill mode the project is served at `/@film/`; the library module URL `/tools/talk/host.js` stays the same.)

- **Subtitles.** Burn the style's caption design and export an `.srt` (`core/render/srt.py`). Hold each ≥ max(1.8 s, speech + 0.6 s); put the caption in a zone no pin or PiP uses.
- **Keep the voice, build the rest.** The host's audio is the voice bus. Use `tools/talk/mix_helpers.py` in `mix.py`: `load_voice`, `voice_env`, `duck` (music ≈ −8 dB and foley ≈ −3 dB under speech), `gate` (digital silence while the voice goes on), `finish`. Everything else (score, foley, ambience) is yours, from the same timeline.
- **Beat grid.** `fit_grid([scene starts…])` returns a tempo and offset where your scene starts land on beats; write the score on that grid so cuts and bars agree.
- **One timeline file** (`timeline.js`): caption cues, camera keys, event times, sound events. The page, `mix.py`, `cues.mjs` and the checks read it. Export with `node core/render/events.mjs`.
- `build.sh` runs: `readcheck` → `events` → `video` → `mix.py` → `srt` → `mux.sh` (grain 0 unless the style wants it). Frame extraction in `prep.sh` is done once.

## 7. Checks before delivery (DIRECTOR.md §11, plus)

1. `node core/render/readcheck.mjs films/<name>`: every pin, label and legend text stays fully in frame for CJK ÷ 4.5 + other ÷ 15 + 1.5 s. Expose `window.TEXTS(t)` for the texts people must read. When a pin is too short, shorten its text rather than slowing the film.
2. Contact sheet every second (`ffmpeg -vf fps=1`, `core/render/sheet.py`), then frame strips at the transitions and wardrobe changes.
3. `blackdetect`, loudness `I ≈ −14 LUFS, TP ≤ −1 dB` (mux prints it).
4. **Say what you could not check.** You cannot hear the film: say so, and name the words and moments to listen to (names the voice might mispronounce, the quiet gap, the end).
5. Sign-off grep, facts re-checked against the sources, brand handling stated (names as text / stand-ins / user-provided logos).

Deliver: `<name>.mp4`, `<name>.srt`, `poster.jpg` (a wide, clean frame with a title and the host window; give the page a `?poster=1` mode that drops captions and pins), `TREATMENT.md`, `CREDITS`, `build.sh` with the source. Tell the user where they are, which facts to verify, and how to drop their own logos into `src/brand/`.

## 8. Pitfalls we hit

- **Text on the right face of an isometric block is mirrored** if you use the face's natural axes: run the local x axis toward −y. Test every face with a word.
- **A pin anchored in the world drifts out of frame when the camera pans.** End pins before the pan (or after the camera has settled), and give long-lived labels short text.
- **Camera zoom crops a window at the edges and leaves half a line of text.** Keep a clear band under any title, fade the viewport's top edge, and choose camera centres so the cut falls between lines.
- **Objects from an earlier scene reappear at the edge of a later shot** (a sign poking in from the top). Sink or fade what you will not need again before the camera leaves.
- **Scenes stacked along one axis overlap on screen** even when they do not overlap in the world: place neighbouring stations ≥ 7 units apart and check the pan stills.
- **Wardrobe changes that cover the face** (sweaters, hoodies) destroy the lip-sync; use open layers.
- **faster-whisper fails to open files on some installs** with `metadata_errors`: `analyze.py` passes a numpy array to avoid it. Use `large-v3-turbo` for Chinese.
- **Do not freeze the host.** If the footage is shorter than the film, animate it away.
- **Captions need their own band.** In the split layout the panels stop above a band (`bottom`, 132 px) so the caption never covers the host or the content.
- **Auto captions are a draft.** `cuesFromWords()` breaks at sentences and pauses, but the transcript has mishearings (names, product words): correct them in `film.json` (`captions.cues`).
- **Only the latest few bullets stay on screen** (`bullets({ max })`); a long transcript otherwise overflows the content area.
