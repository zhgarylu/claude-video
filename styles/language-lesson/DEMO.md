# Language Micro-lesson — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Three Little Words* (65.4 s, 1080 x 1920) · `language-lesson.mp4` · source in [`demo/`](demo/)

## Story & structure

An owl teacher called Pip (an original character: an egg-shaped owl with round glasses, a pencil behind one ear tuft and a teal bow tie) teaches Chinese speakers which small word goes before a time in English: **at** for a point (a clock time), **on** for a day, **in** for a stretch (a month, a year, a season). The film is two full question loops, a ten-second proof that the same cards work in other languages, and the next question left ticking.

- **Cover** (0-4.6 s): a dense reference card pops in: Pip, the three words, one-line meaning, three numbered rule boxes with icons and example phrases, three example sentences with translations. It states the general rule with other examples (`at noon`, `on Friday`, `in 2025`); the quiz sentences are not on it.
- **Loop A, "My birthday is ___ July"** (4.9-26.0 s): the card slides up, the English question is read with the word "blank", the options pop, a **2-second think pause** (stopwatch, tick-tock, Pip's wing on his chin, the music gone), the mnemonic ribbon rises ("months, seasons, big time = in"), the clue *July* is underlined and tagged "month" while the camera pushes in, the answer *in* is written in red with a pencil scratch and a ding, and the card turns to **read-after-me**: the sentence spoken slowly and then at normal speed, the words lighting up.
- **Loop B, "The party is ___ Monday"** (26.4-44.7 s): the same ritual, shorter, then the card turns to a **minimal pair**: *on Monday* against *at 7 o'clock*, the deciding word underlined in each (no read-after-me here, to keep the film short).
- **Montage** (45.1-59.5 s): "the same cards in other languages" with three abridged loops (the think pause shortened to under a second, the music dips): a **German** article quiz with gender colours (*Die Sonne scheint.*), a **Japanese** particle quiz with furigana (*猫が好き。*), a **Spanish** minimal pair (*Soy aburrido* against *Estoy aburrido*).
- **Hook** (59.5-65.4 s): the title returns, a new card, *She is good ___ English.*, the options pop, the stopwatch starts and the film stops before the answer.

Why it fits: the style is a ritual, so the film performs the ritual twice, in full and then faster, and spends the rest on proof (other languages) and the hook. The answer is the only red on any card, and nothing before it can be read as the answer: not the cover, not a chip, not a mouth shape.

Native moves used: the dense reference cover, think pause, mnemonic ribbon, clue underline and push-in, red write-in, read-after-me (two speeds), card turn, minimal pair, gender colours, furigana, next-question hook, progress dots. The other cards of the system (vocabulary with IPA / pinyin tones / furigana, a conjugation grid, a dialogue pair, an Arabic card mirrored right to left, long-word hyphenation) are on the review sheet [`alt_cards.jpg`](demo/stills/alt_cards.jpg), rendered from `demo/showcase.js`, not in the film.

## Shots

Frames: [styleframe (16:9 composition of the same page)](demo/stills/styleframe.jpg) · [cover](demo/stills/frame_cover.jpg) · [question and think pause](demo/stills/frame_think.jpg) · [clue push](demo/stills/frame_clue.jpg) · [answer](demo/stills/frame_answer.jpg) · [read-after-me](demo/stills/frame_repeat.jpg) · [minimal pair](demo/stills/frame_pair.jpg) · [German](demo/stills/frame_de.jpg) · [Japanese](demo/stills/frame_ja.jpg) · [Spanish](demo/stills/frame_es.jpg) · [hook](demo/stills/frame_hook.jpg) · [the other cards](demo/stills/alt_cards.jpg)

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0-4.6 | the cover reference card, Pip peeking in the corner | locked | dense card that pops in item by item |
| 2 | 4.9-10.8 | stage with Pip, card slides up, options pop, stopwatch | locked | think pause (music out) |
| 3 | 10.8-18.0 | ribbon, clue underline and tag | push-in 1.12 x on *July* | mnemonic, clue |
| 4 | 18.0-26.0 | red write-in, ding, Pip cheers, card turns, the sentence lit twice | locked | answer, read-after-me |
| 5 | 26.4-44.7 | loop B and the minimal pair | push on *Monday*, then locked | card turn |
| 6 | 45.1-59.5 | German, Japanese, Spanish cards | small pushes on the clue | montage; title swaps |
| 7 | 59.5-65.4 | next question, stopwatch cut mid-sweep | locked | hook |

## Score structure

C major, 96 BPM (bar 2.5 s), C - Am - F - G, all numpy synthesis. Marimba eighth-note arpeggios, a sine bass with 2nd and 3rd harmonics, a quiet detuned-saw pad and a shaker. The cover plays the full pattern; under the questions the marimba thins to quarter notes; **both think pauses are total silences of the music** (only the tick-tock stays, with the first sound after the pause the ribbon swoosh); the montage opens up with the pad, the shaker and a shimmer of off-eighth marimba; the hook thins again and the music steps back under the ticking until the cut. Word lights are marimba taps (C pentatonic), so the read-aloud is a small melody. Voice about 12 dB over the music in speech; loudness -14.0 LUFS, peak -1.0 dBFS.

## Palette & props

Stage `#171d47` to `#2b3270` with a warm radial light; paper `#fbf0d9`; ink `#2a2118`; answer red `#e0392d`; clue blue `#2c6ae0`; title yellow `#ffd23a` with `#3b2300`. Rule colours: at orange, on plum, in blue. German genders: der blue, die pink, das green. Props drawn in code: Pip, the stopwatch, clock / calendar / span icons, the pencil, stars, the check badge.

## Language check

Every foreign-language sentence in the film was written and checked by its author (an AI), not by a native speaker. **A native speaker should review before real use:**

- English: *My birthday is in July.* · *The party is on Monday.* · *She is good at English.* (the hook only asks it) · *at noon, on Friday, in 2025, in summer, at 7:30, on May 1st* · *The film starts at noon. We have a test on Friday. She was born in 2015.* All standard.
- German: *Die Sonne scheint.* (die Sonne, feminine; the chips der / die / das are coloured by gender).
- Japanese: *猫が好き。* (ねこ が すき: "I like cats", 好き takes が; は would be possible only as a contrast), furigana ねこ and す. The distractors を and に are wrong here.
- Spanish: *Soy aburrido.* ("I am boring", a trait) and *Estoy aburrido.* ("I am bored", a state), male speaker.
- Chinese gloss lines (the translations and tags) were written for this film.
- Showcase sheet only: *勉強 / べんきょう*, *你好*, *sein* conjugation, *Lampe* (die Lampe), *Donaudampfschifffahrtsgesellschaft* (die), the Arabic *ذهبت إلى المدرسة* (I went to the school).

The voices are TTS: the Mandarin teacher is Microsoft's neural voice `zh-CN-XiaoxiaoNeural` through edge-tts (`core/tts/tts_zh.py`, **needs a network connection**; Kokoro's offline Mandarin voices `zf_xiaobei`, `zf_xiaoxiao` and `zm_yunxi` were tried first at 0.95-1.25 speed and Whisper could not understand them, so they were not used), and the English examples are Kokoro `af_heart` (offline). The German, Japanese and Spanish cards are silent (written only): a TTS voice of the right language, or a native recording, should be added for a real lesson. The film is original teaching material and makes no claim to be exam or certification content.

## End card

None. The last image is the next question with its stopwatch ticking, cut mid-sweep.

## Build notes

Files in `demo/`: `index.html`, `main.js` (layout for 9:16 and 16:9, stage, title and dots, card slide and turn, camera push, captions, `TEXTS`, `?show=cards`), `kit.js`, `mascot.js`, `cards.js`, `script.js` (the lesson as data), `showcase.js`, `tools/plan.py` (the clock), `tools/fonts.sh` + `tools/chars.py` + `tools/getfont.py` (font subsets), `tools/split_lines.py`, `tools/export_srt.mjs`, `mix.py`, `lines.json` (the voice lines), `build.sh`, `CREDITS`, `TREATMENT.md` (local).

`sh styles/language-lesson/demo/build.sh` (core and voice tiers, network for the font subsets) runs: fonts, voices (Kokoro for the English examples, edge-tts for the Mandarin teacher), speech checks, the clock (`timeline.json`: voice lines laid end to end, the think pauses, word timings and a mouth envelope for Pip), events export, reading check, mix, `.srt`, render (1080 x 1920, 24 fps, two workers), mux (no grain), the 16:9 styleframe, the poster and the card sheet. `RENDER_SLOTS=3`.

- `window.TEXTS` reports every text on the cards, the title and the rule boxes in screen pixels (through the camera). The burned-in captions are not reported: their holds are set from the voice (>= 1.8 s and the spoken line + 0.6 s) and exported to the `.srt`.
- The gallery crops cards to 16:9, so `demo/stills/styleframe.jpg` is a 1920 x 1080 render of the same page (the 16:9 layout: Pip on the left, the card on the right) at the moment the answer lands; `poster.jpg` is the 9:16 cover.
- Pitfalls tied to this demo: Whisper cannot transcribe one-word lines (*in*, *on*, *at* came back as *Then*, *Gone*, *Ad*), so the teacher says the preposition inside its phrase (*in July*, *on Monday*) and those lines pass; the speech check uses `large-v3-turbo` (the small models mis-hear short Mandarin lines); `m2`, `m3`, `m4` carry an `asr` override that differs from the script only by homophones (*冠 / 惯*, *助 / 注*, *是 / 式*), not listened to; Whisper's word start times are unreliable on padded TTS, so `plan.py` uses the word ends scaled to the line length; the English question is read with the word "blank", as a teacher would.
