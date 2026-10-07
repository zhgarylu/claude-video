# Remaking a video: structure, restyle, exact

The user brings a video and wants one like it. There are three different jobs; pick the one the user means before running anything.

| The user wants | Mode | What is taken from the source | Tool |
|---|---|---|---|
| "Same kind of film, but about **my** topic, in style X" | `structure` | the shape only: beats, lengths, text roles, camera grammar. **No footage, voice, music, characters, wording.** | `structure.py plan`, then the normal workflow ([`TEARDOWN.md`](TEARDOWN.md)) |
| "My talking-head video, with new graphics and captions around it, in style X" | `restyle` | the user's own footage and voice, as the host video | `remake.py analyze`, `remake.py restyle`, then [`TALKING-HEAD.md`](TALKING-HEAD.md) |
| "A copy of **my own** video that I can edit and re-render: change a caption, a cut, a colour, a language" | `exact` | everything: footage, voice, music, cuts, caption text and place | `exact.py build / render / compare` |

If the user says "copy this video" about **someone else's** video, that is not `exact` and not `restyle`: offer `structure`.

## 1. The rights gate (ask once, record it)

- `structure`: nothing of the source ends up in the film, so studying a video you may watch is fine. Say so in the delivery note.
- `restyle` and `exact` use the source's footage, voice and music. Ask **once**, in the brief message ([`AGENTS.md`](AGENTS.md) Workflow step 1): "Is this your own video, or do you have a licence to reuse it?" Do not guess from the file name or the account.
- Record the answer: `exact.py build` refuses to run without `--rights own` or `--rights "licensed: <who, what>"` and writes it into the project's `CREDITS`. For `restyle`, write the same line into the project's `CREDITS` yourself.
- If the answer is no or unclear: use `structure` and tell the user why.
- The tools never download anything. A platform download (`yt-dlp`) is the user's decision, as in `TEARDOWN.md`.

## 2. Analyze (all modes start here)

```sh
.venv/bin/python tools/remake/remake.py analyze <video> --out films/<name>/remake [--lang zh|en|auto] [--model small] [--ocr-step 0.5] [--no-asr] [--no-ocr] [--reuse]
```

It runs `tools/teardown/teardown.py` (shots, camera, palette, tempo; into `<out>/teardown/`, with `storyboard.jpg` and the keyframes `teardown/shots/NN.jpg`) and adds: word-level transcript (faster-whisper, voice tier: `setup.sh deps voice`), takes, on-screen text read with Apple Vision (macOS only; sampled every `--ocr-step` seconds and around every cut, then each start and end refined to the frame), per-shot motion, a loudness and energy curve, static overlays. Read `remake.md`, open the storyboard. About 1 to 2 minutes for 30 s of video with speech.

### remake.json (schema `remake/1`)

| Key | Content |
|---|---|
| `source` | `file, path, w, h, fps, duration, has_audio` |
| `facts` | teardown's facts plus `words, takes, texts, burned_captions, language` |
| `shots[]` | `index` (0-based), `t0, t1, len`, `camera` (static, pan/track, zoom in/out, subject motion), `pan, zoom`, `motion`, `activity` (still/calm/busy), `motion_curve`, `palette`, `brightness`, `keyframe`, `words: [first, last] \| null`, `said`, `texts: [ids]`, `anchor` (the cut as `{word_index, offset}` or `{shot_index, offset}`) |
| `words[]` | `i` (0-based), `w`, `t0, t1`, `take` |
| `takes[]` | `index, w0, w1, t0, t1, text, chars`: sentences, split at sentence punctuation, pauses over 0.7 s, and at the longest pause of anything longer than 6 s |
| `texts[]` | `id, text, t0, t1` (seconds), `box` (normalised x, y, w, h), `box_px`, `size_px`, `role` (`caption`: speech-synced line low in the frame; `title`; `text`: labels, cards), `caption`, `burned_in`, `color` (fill), `hot` (a second fill colour: karaoke highlight), `outline`, `stroke_px`, `bg`, `bg_busy`, `plate`, `align`, `conf`, `frames_seen`, `edge_exact` (start and end found to the frame), `crop` (png), `shot_index`, **`anchor`** and **`anchor_end`** |
| `overlays[]` | static elements that never change across the video (`type: static\|bar`, `box`, `color`): guesses for logos, watermarks, letterbox bars |
| `audio` | `lufs, lra, true_peak_db, mean_db, loud_range_db, bpm_guess, speech_share, chars_per_sec, speech_starts_s, language, hop_s, energy_db[]` (every 0.25 s) |
| `warnings` | tiers that were skipped (no OCR off macOS, no speech tier) |

**Anchors.** `anchor: {word_index, offset}` means "`offset` seconds after the start of `words[word_index]`"; `anchor_end` is relative to that word's **end**. When no word lies within 0.5 s the anchor is `{shot_index, offset}`, seconds after that shot's start. Seconds are always present too; the anchor is what survives an edit.

Everything is a measurement or a guess: colours, `role`, `bpm_guess`, camera labels and overlays can be wrong. Look at the crops in `texts/` and the storyboard. The speech-to-text mishears names; the OCR misreads small or stylised text (it read "OpenAI" as "OperAl" once). Correct `texts[].text` and `words[].w` by hand in `remake.json` before building.

## 3. Mode `structure`

```sh
.venv/bin/python tools/remake/structure.py plan films/<name>/remake --topic "…" [--style slug] [--target 60] [--out films/<name>/TREATMENT.md]
```

Runs `tools/teardown/treatment.py` and appends a **remake sheet**: one row per source beat with the source length, the length at your target, the character budget, the roles of its on-screen text, the camera, and an empty "your content" column; the same rows go to `structure-plan.json`. Then follow [`TEARDOWN.md`](TEARDOWN.md) from step 4 and the normal workflow. Do not copy the source's text, footage, voice or music; the film is built from nothing of it.

## 4. Mode `restyle`

The user's footage stays the host; the graphics, captions and cards are new, in a library style, and are anchored to the words of the host. This is [`TALKING-HEAD.md`](TALKING-HEAD.md) exactly; the only glue is the transcript:

```sh
sh tools/talk/new-film.sh <host.mp4> films/<name> --layout world --lang zh        # frames, voice, env, meta, film.json, a first cut (it runs its own transcript)
.venv/bin/python tools/remake/remake.py restyle films/<name>/remake --film films/<name> [--max-chars 28] [--balance]
```

`restyle` writes `src/words.json` (the take/word format `prep.sh` writes, from the Whisper words of the analysis, so you do not transcribe twice and your corrected words are kept), `film.json` `captions.cues` (what `cuesFromWords()` of `tools/talk/layouts.js` makes from them) and `src/source-captions.json` (the source's burned-in lines, for reference only). Then write the treatment with the cue map as TALKING-HEAD.md §5 says: every graphic lands on the **word**, read from `words.json`, so changing the script or the cut moves the graphics with it. If the source had burned-in captions the host footage still contains them: ask the user for the clean footage, or crop or cover them (a cover as in `exact`'s `cover`, or a layout that hides that band).

## 5. Mode `exact`

```sh
.venv/bin/python tools/remake/exact.py build <video> films/<name>/remake --out films/<name> --rights own [--captions cover|keep|clean [--clean clean.mp4]] [--font name|path] [--roles caption,title,text]
sh films/<name>/build.sh                                    # = exact.py render: frames → video.mjs → mix → core/render/mux.sh → films/<name>/<name>.mp4
.venv/bin/python tools/remake/exact.py compare films/<name> # compare/compare.md, compare.json, worst frames
```

The project: `index.html` + `main.js` (the page contract of `core/README.md`; `window.render(t)` is async, which `video.mjs` and `still.mjs` await), `spec.json`, `src/frames/NNNN.jpg` (the source's frames at its own frame rate), `src/audio.wav`, `src/source.mp4`, `fonts/`, `remake.json`, `CREDITS`, `build.sh`. The footage mechanism is the one of `tools/talk/host.js` (extracted JPEG frames, `floor(t * fps)`), in `tools/remake/frames.js` with a sliding decode window, because a full 1080×1920 clip is about 5 GB decoded and `host.js` decodes everything before READY.

### The spec file (`spec.json`, schema `remake-exact/1`)

| Key | Meaning |
|---|---|
| `canvas` | `{w, h, fps}` of the render (the source's size and frame rate) |
| `shots[]` | `{id, src_t0, src_t1, t0, speed, audio, label}`: take footage `src_t0..src_t1` of the source and put it at film second `t0`. Edit these to trim, reorder, repeat, slow down or cut a shot out |
| `words[]` | the source's word timings `{i, w, t0, t1}` (source seconds) |
| `captions[]` | live text: `id, role, text`, **`from` / `to`** (word anchors: `{word, edge: start\|end, off}` or `{shot, off}`), `t0, t1` (resolved seconds), `lock` (true = ignore anchors, use `t0`/`t1`), `box` (px), `align, cx, x, baseline`, `family, weight, size, max_w`, `color`, `stroke {color, w}`, `fade`, `draw` (false = data only), `erase` (`cover` or `none`), `erase_src` (source seconds in which to paint over the original text), `cover_pad`, `hidden` (set by `sync`: its words were cut) |
| `overlays[]` | `{type: rect, x, y, w, h, color, radius, alpha, t0, t1}` or `{type: image, src, x, y, w, h, t0, t1}` |
| `fonts[]` | `{family, file, weight}`: faces loaded by the page (from `fonts/`) |
| `audio` | `{src, follow_shots, gain_db, master: mux\|keep, extra: [{src, at, gain_db}]}`: the audio of each shot's source range is laid at the shot's film time; `extra` adds music or effects |
| `tail` | seconds after the last shot |

**How word-anchored editing works.** A caption's start and end are not seconds but "the start of word 16 plus 0.16 s" and "the end of word 26 plus 0.48 s". The page resolves them through the shots: word time (source seconds) → the shot that contains it → film time. So:

- change the **text** of a caption (`exact.py retext <film> t03 "new text"`, or edit `text`): it stays on the same words; a longer text is shrunk to `max_w` pixels;
- **trim or move a shot** (edit `src_t0`, `t0`): every caption follows the words; one whose words were cut out is hidden (`exact.py sync <film>` prints and stores the resolved seconds and `hidden`);
- **change a language**: export the captions' `id` and `text`, translate, write them back; timing stays on the source's words (the lips and the voice stay in the source language: [`TALKING-HEAD.md`](TALKING-HEAD.md) "Another language" for a dub);
- a colour, size, position or font: edit the fields; `exact.py build ... --font <repo font name>` changes the face for all.

Re-render with `sh films/<name>/build.sh` (add `--keep-levels` to keep the source's loudness; the default masters to −14 LUFS with `core/render/mux.sh`).

### Fonts

`build` picks, per role (caption, title, text), the face among the library's OFL fonts (`styles/*/demo/fonts`, `films/*/fonts`: Noto Sans/Serif SC and so on, all Google Fonts under the SIL OFL) that covers the characters and looks closest to the OCR crop: correlation of edge maps with the glyphs set at the box width, ink density, ratio of horizontal to vertical stroke thickness (sans vs serif), height at that width. It prints the score and two runners-up. It is a similarity score, not a match: a source set in a proprietary heavy sans will get a lighter Noto weight. Override with `--font NotoSansSC-900` (a repo font name or a path to a font you may use).

### Burned-in captions: what is and is not possible

A burned-in caption is pixels of the footage. Without the clean master, exact mode cannot remove it. The three options:

| `--captions` | What happens | Edits to captions | Picture |
|---|---|---|---|
| `keep` | the source pixels stay; captions are data in `spec.json` only (`draw: false`) | change nothing | identical to the source (except re-encoding) |
| `cover` (default) | each caption box is painted over with a per-row gradient sampled just left and right of the box, then the live text is drawn; no inpainting | work | clean on plain or smooth backgrounds; a visible smear over a busy picture; the box can miss a stroke or an outline the OCR box did not include (raise `cover_pad`) |
| `clean` | `--clean <video without the burned-in text, same size and length>`: the footage is taken from it and live text is drawn on top | work | the right way; only possible if the user has the clean master |

Texts that belong to **graphics** burned into the footage (cards, chips, lower thirds) are treated the same way: they are separate `texts[]` with role `text` and are redrawn in the chosen font (use `--roles caption,title` to leave them in the pixels).

### Compare: what the numbers mean

`compare` decodes the source and the finished film at 540 px wide, matches every film frame to the source frame its shot points at (so it still works after edits), and reports per frame SSIM (luma, 7×7) and PSNR, then: the mean and per-second **match %** (SSIM × 100), the share of frames at SSIM ≥ 0.95 and ≥ 0.90, the five worst frames as `source | film | difference` pictures, a frame-alignment check (the film shifted by ±2 frames must score worse), the mean SSIM inside each live caption's box, an **OCR read-back** of each caption in the film (does the text read as written), duration, loudness, and the audio envelope correlation with a lag search. A frame is "identical" only if SSIM is near 100 % and PSNR is above about 35 dB; the file says which seconds are not.

### Known limits (all modes)

- Exact mode is a re-render: the footage goes through JPEG (q2) → screenshot JPEG (q95) → x264 (crf 14) → x264 (crf 19) and, by default, loudness mastering to −14 LUFS. It is near-identical, not bit-identical. The same footage with `keep` and no text measures the floor (see the measured numbers in the project's `compare.md`).
- Live text is **never** the same pixels as the source's text: different face, different anti-aliasing, outline guessed. Karaoke highlights (a word in another colour) are not reproduced; the line is drawn in the fill colour.
- Effects that are not text or footage (transitions that blend two shots, glows, fades of an overlay, animated stickers, a changing background behind the card) are in the footage's pixels and stay there, or are lost if they were separate layers in the original editor.
- Static overlays are detected but not rebuilt; they remain in the pixels.
- Shot detection misses soft dissolves; shots are only the cut list of the footage, which exact mode keeps through `src_t0`/`src_t1` (the cut points do not have to be right for the footage to be right).
- Speech-to-text needs the voice tier; on-screen text needs macOS (Vision). Elsewhere `analyze` says so, and exact mode still builds with no captions (use `--captions keep`).
- Variable frame rate sources are resampled to a constant frame rate by `ffmpeg fps`.
- Do not point any of this at video you may not reuse.

### Checks before you tell the user it is done

1. `compare.md`: the picture match per second, the worst frames (open them), the caption read-back, the loudness line.
2. Look at three stills yourself (`node core/render/still.mjs films/<name> 1 10 20 --size WxH`).
3. Tell the user plainly what is identical (cuts, footage, audio, caption timing and place) and what is not (the caption glyphs, covered regions, mastering), and which captions to read once.
