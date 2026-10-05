# Language Micro-lesson: Style Prompt

> A language-learning short drawn as a stack of paper-like cards under a talking teacher: a quiz with a blank, a think pause with a ticking stopwatch, a one-line rule, the clue underlined in blue, the answer written in red, and a read-after-me line lit word by word. Built for vertical 9:16, with the same cards re-laid for 16:9. Language-agnostic: the cards take tokens, ruby, gender colours and right-to-left text, so any language pair works.
> References (grammar only): the vertical grammar-lesson shorts of language teachers and flash-card apps. What they teach is a cadence: question, rule, clue, answer, repeat, next question. Never copy their mascots, characters, footage, voices, on-screen text, cards or logos.

## 1. Essence, and what it is not

- **One idea per beat.** Each card carries one question or one rule. The picture holds the sentence; the voice says the rule.
- **The loop is the film:** question, think pause, rule (one-line mnemonic), clue, answer, repeat-after-me. The answer is the payoff of the whole loop, so nothing earlier may give it away.
- **A teacher, not a narrator.** An original mascot fills the upper frame, speaks with its beak, and gestures at the card. A card slides up from the bottom for every question.
- **Dense but readable.** High information density on the cover, one item at a time everywhere else; big friendly type; captions burned in.
- **Warm paper on a dark stage.** Flash-card beige under a deep indigo stage, black ink, red for answers, blue for explanations, yellow for the title.

Not a whiteboard explainer (whiteboard: hand-drawn diagrams, no cards), not a slide deck or a dark-tech keynote, not a quiz-show format (game-show: flat stage and host, points and buzzers), not a kinetic-typography piece, not a screen recording of a learning app.

## 2. Materials & rendering

- **Canvas 2D, flat shapes with an ink outline.** Cards are paper (rounded rectangle, ink border 5 px, an inner pale line, faint ruled lines at 14 % alpha, a soft drop shadow). Chips, panels and tags are the same paper family.
- **Design space.** Cards are drawn in a 980 x 670 design space (a tall cover card in 980 x 1450) and scaled to their slot, so a card is identical in 9:16 and 16:9. All card text is positioned in that space.
- **The stage** is a vertical indigo gradient with a warm radial light behind the teacher, a floor line, and slowly drifting chalk doodles (circles, crosses, squiggles, triangles; never letters, which would count as text nobody can read).
- **The mascot** is built from simple original shapes: an egg body, round glasses, ear tufts, a pencil behind one tuft, a bow tie. It must not resemble any existing mascot: invent your own silhouette, keep it round, with a pencil or another study prop as its signature.
- **Draw every icon as a vector** (clock, calendar, span bar, speaker, stopwatch, check, stars). No emoji: their fonts differ per machine.
- Everything is a pure function of the frame time; the answer pen, the stopwatch and the word lights are computed, never accumulated.

## 3. Colour logic

- **Ink on paper:** near-black warm ink `#2a2118` on beige `#fbf0d9`; muted brown for translations and labels.
- **Red is the answer and nothing else** (handwriting, the correct chip's border and check, the underline under it). Nothing else on a card may be red before the answer, so a viewer cannot read the answer from colour.
- **Blue is explanation:** the clue underline, the clue tag, a repeated pass. **Yellow** is the title (with a dark outline), the mnemonic ribbon and the highlighter on the word being read.
- **Grammatical gender colours** (der blue, die magenta-pink, das green, or your language's own) are a separate, fixed code, used for article chips and noun underlines. They differ from the answer red and appear as fills and bars, never as handwriting. A noun takes its gender colour only at the clue step, never before.
- **Pinyin tones** have their own set (1 orange, 2 green, 3 blue, 4 purple, neutral grey; red excluded).
- **Per-item accents** (one hue per preposition, per person, per tense) may colour a rule box's side bar, number badge and example chips, but never the answer.
- Example palette (ours): stage `#171d47` to `#2b3270`, paper `#fbf0d9`, ink `#2a2118`, answer `#e0392d`, clue `#2c6ae0`, title `#ffd23a` with `#3b2300`.

## 4. Type & subtitles

- **Latin and card text:** one rounded humanist sans (Nunito, OFL), weights 700-900. **CJK:** Noto Sans SC / JP (OFL) at weight 700-900 beside it; the pair shares x-height, so mixed lines look even. **Handwriting for the answer:** a casual script (Caveat, OFL) at about 1.2 x the sentence size, rotated about -2.5 degrees. **IPA:** Noto Sans. **Arabic / Hebrew:** Noto Sans Arabic / Hebrew. Subset CJK fonts to the characters you use.
- **Sizes in the 980-wide design space:** sentence 56-90, option chips 52-70, translation 34-40, tags 36-38, ruby 0.4 x its base, labels 28-32. On a phone the sentence must be at least about 64 px tall.
- **Title:** bold italic, yellow with a dark outline (stroke about 0.17 x size), two colours at most, 84-110 px in 9:16. One lesson title per section.
- **Captions** are burned into the picture, white with a dark outline, the foreign-language (learning-target) words in yellow, 2 lines at most, centred between the teacher and the card (9:16) or below the card (16:9). They are the spoken words. A repeat-after-me sentence is never captioned twice: the card is its caption.
- **Reading rules.** A caption holds at least 1.8 s and the spoken line + 0.6 s. A card text holds at least `CJK characters / 4.5 + other characters / 15 + 1.5` s from the frame it is complete (`readcheck.mjs`). Sentences longer than about 10 words or 18 CJK characters do not go on a card; split them.
- **Language layout rules**
  - **Tokens, not strings.** A sentence is a list of tokens; each can carry ruby (`r`), a language, a gender, a clue flag or a blank. Spaced scripts get a word gap; CJK gets none.
  - **Ruby / furigana** sits at 0.4 x size above its base, centred; a token is as wide as the wider of base and ruby; lines with ruby get extra leading and the tag above a clue rises to clear the ruby.
  - **RTL scripts (Arabic, Hebrew):** the card mirrors. The first token sits on the right, chips run right to left (A at the right), the question badge and the category label swap sides, the stopwatch moves to the left. Text runs are drawn with `direction = rtl`.
  - **CJK versus Latin:** CJK takes the same size as Latin on the line; Latin inside CJK keeps its own font and gets no extra gap. Never letterspace CJK.
  - **Long words:** shrink to 72 % of the size, then break at soft hyphens (U+00AD) with a drawn hyphen; a sentence never takes more than two lines: if it would, shrink it.
  - **The 16:9 variant** (`--size 1920x1080`): title on top, dots under it, the teacher in the left 40 %, the card in the right 55 % (scaled to fit), captions under the card. Cards are the same; only the slots move. The tall cover becomes a smaller reference card or is split into two cards.

## 5. Motion quality

- **Smooth 24 fps, no stepping.** Eases are back-out for pops, smoothstep for slides.
- **Cards slide up from the bottom edge** (about 0.55 s, a small overshoot) and leave downward (0.4 s). Between faces of one card (question, comparison, repeat) the card turns over: a 0.36 s squeeze of its width.
- **Option chips pop** one after another (0.34 s, scale 0 to 1 with overshoot, 0.12-0.15 s apart).
- **The stopwatch** pops in at the corner of the card, its red hand sweeps once over the think pause, and it gives a small pulse at each tick.
- **The red answer writes itself:** a wipe from left to right over 0.5-0.7 s with a pencil riding the edge, then a wavy underline and a burst of small stars at the end. The correct chip gets a red border and a check; the other chips dim.
- **The mnemonic ribbon** rises from behind the top edge of the card; the clue underline draws left to right; the clue tag pops with a pointer.
- **Word lights** move on the voice: the word being read gets a yellow bar and a 4 % scale; read words stay full, unread ones sit at about 35 %.
- **The teacher** moves between a handful of poses (hand up to ask, wing on chin to think, point, cheer, read) blended over 0.45 s; its beak follows the voice level; it blinks every 3.7 s and bobs slowly; it hops when the answer lands. Nothing else moves while the viewer reads.

## 6. Camera grammar

Mostly locked off. The one move this medium owns is the push-in on the clue.

| Move | What it expresses | Can serve |
|---|---|---|
| Locked frame | reading time; the question and its think pause | any quiz, comparison, repeat-after-me |
| Push-in on the clue (1.1-1.2 x, 0.75 s in, 0.75 s out, focus pulled halfway toward the clue) | "look at this word" | the decisive word of a sentence; an ending; a gender colour |
| Card turn | the same card, the next job | question to comparison to repeat |
| Slide-up | a new question | the next item of a set |
| Stack change (card down, card up) | a new lesson or a new language | a montage; a series hook |

Rules: the question, the blank and the options are always in frame at the base zoom; captions are drawn after the camera (they never scale); the teacher is not cropped except by a push; no pans or tilts, no shake, no fades. Transitions are cards sliding and turning.

## 7. Sound palette

- **Score:** an original soft loop of marimba or kalimba arpeggios, a warm sine-and-harmonics bass, a quiet detuned pad when the lesson opens up, and a light shaker. A major key at a walking pace. It thins to quarter notes under questions, **drops out during every think pause** (only the ticking remains) and steps back for the hook.
- **Foley:** soft paper slide and a pat when a card lands; a rounded pop for each chip (rising in pitch); a wood-block tick-tock for the stopwatch; a small "boop" for the ribbon and a two-note blip for the clue tag; a **pencil scratch** (short band-passed noise strokes) for the answer; a bright **ding** with a sparkle run when the answer lands; a paper flip for the card turn; a marimba tap for every lit word.
- **Silence:** the think pause is the film's silence. Keep it at least 2 s on a full question; a shortened pause in a montage must still drop the music. The first sound after the pause is the mnemonic ribbon.
- **Voice:** one calm, quick teacher voice for the explanation (a clear voice in the learner's language) and a clearly different voice for the target language; the target sentence is spoken **twice, slow then normal**. Compress the voice and sit it about 10 dB over the music. Loudness -14 LUFS.
- A TTS voice is a default only: a teacher's own recording or a native voice for the target language is better and should be used when the user has one.

## 8. Native moves

- **The think pause.** Question on screen, options in, the stopwatch sweeping, the teacher with a wing on its chin, the music gone. *Fits content like:* a vocabulary recall; a "which tense?" drill; a pronunciation choice (which of two sounds?).
- **The red write-in.** The answer appears in handwriting with a ding. *Fits content like:* a missing article; a verb ending; a kanji reading chosen from three.
- **Clue push.** The decisive word is underlined in blue, tagged, and the camera leans in. *Fits content like:* the time word that picks a preposition; the noun that fixes a gender; the word that forces the subjunctive.
- **Mnemonic ribbon.** A yellow strip rises from the card: the rule in a line. *Fits content like:* "months and seasons = in"; "masculine nouns of -er = der"; "verbs of motion take a".
- **Minimal pair.** Two panels side by side with the deciding clue underlined in each. *Fits content like:* ser and estar; a and an; 了 and 过; the two Japanese "ha" and "ga" readings.
- **Read-after-me.** The target sentence lit word by word, slow then normal. *Fits content like:* a model sentence; a tongue twister; a greeting.
- **The same cards in another language.** The deck swaps content and the grammar stays. *Fits content like:* a series trailer; a lesson that compares two languages; an app demo.
- **Next-question hook.** A new card with a ticking stopwatch and the film ends before the answer. *Fits content like:* a series; a daily drill; a teaser for tomorrow.
- **Vocabulary, grid, dialogue cards.** A word with its pronunciation line (IPA, pinyin with tone colours, kana with furigana, romanisation); a conjugation or declension table with the asked cell lit; a two-bubble exchange. *Fits content like:* a word of the day; a verb table; a travel phrase.

## 9. Pitfalls of the medium

- **Showing the answer early.** The most common failure. Nothing before the answer step may say it: not the cover card, not the colour of the right chip, not a gender colour, not a mouth shape or a voice, not a ribbon that is written too specifically. A cover reference card may state the general rule, but it must not contain a quiz sentence or its key word: the quiz asks the viewer to apply the rule to a new word (the cover shows "on Friday", the quiz asks about Monday).
- **A think pause shorter than the reading time.** Count the sentence and its translation; the pause starts when both have been readable for their time. Two seconds is the floor.
- **Too much text on a card.** One sentence, its translation, three options. Rule boxes carry a label and two examples, not paragraphs.
- **Captions that cover the teacher or the blank,** and captions that repeat a card's own sentence word for word.
- **Wrong examples.** A film that teaches a language must be right: check every foreign sentence (grammar, accents, furigana, gender, article) with a native speaker or an authoritative grammar before real use; our demo says so in DEMO.md.
- **Official-exam claims.** Never say or imply that a lesson is exam material, a certification, or from a test provider. Never use a test provider's name or mark.
- **Ambiguous cloze questions.** A blank with two correct answers teaches nothing; check that every distractor is really wrong in that sentence.
- **Pronunciation by TTS across languages.** An English voice reading German or Japanese is wrong. Use a voice of the language, or leave that sentence silent and written.
- **Copying a mascot or a real teacher.** Invent the character; no brand mascots, no look-alikes.
- **Gender colours reused as answer red.** Keep the code in fills and bars.
- **Vertical safe areas.** Keep text inside the middle of the frame; platform buttons cover the right edge and the bottom 10 %.

## 10. Engine

In `demo/`: `kit.js` (palette, font stacks, `txt()` with the reading-check registry, `flow()` / `place()` for tokens with ruby, RTL, shrink and soft hyphens, vector icons, stopwatch, wavy underline), `mascot.js` (`drawPip()` and its `POSES`; replace with your own character), `cards.js` (the faces: `cloze`, `compare`, `repeat`, `rule`, `vocab`, `grid`, `dialogue`, plus `paper()` and `ribbon()`; every face is `(ctx, data, t)`), `script.js` (the lesson as data built from `timeline.json`: cards, face flips, ribbon, clue, answer and chip times, poses, titles, dots, camera pushes, captions, sound events), `main.js` (layout for 9:16 and 16:9, stage, title, progress dots, card slide and turn, camera, captions, `TEXTS`), `showcase.js` (one of every other card, `?show=cards`), `tools/plan.py` (lays the voice lines end to end and writes the clock), `mix.py` (score, foley, voice).

A new quiz in a few lines: a cloze face is `{ type: 'cloze', q: 'Q1', tokens: [{ t: 'She' }, { t: 'is' }, { blank: true }, { t: 'tired.', clue: true }], tr: '...', opts: [{ t: 'very' }, { t: 'too' }, { t: 'so' }], correct: 1, ans: 'too', T: { chips: [t, t, t], ring: [t0, t1], ticks: [...], ans: [t0, t1], clue: { t0, t1, tag: '...' } } }`, put on a card `{ id, tIn, tOut, faces: [{ t0: 0, face }] }`. The face never shows `ans` before `T.ans[0]`.

## 11. Variation space

You decide the language pair, the level, the topic (grammar, vocabulary, pronunciation, idiom), the mascot (any original character), the colours inside the colour logic, the length and the voices. The sentences, tags and mnemonics are yours; the cadence of the loop is the style. All far from our demo:

- Structures: **one loop, deep** (a single question taken apart with a minimal pair, a grid and a repeat); **a ten-question drill** (the dots count up, each loop shorter, ending on a score of how many you got without peeking); **a mistake clinic** (a wrong sentence shown first, the clue underlined, the fix written in red); **a word of the day** (a vocabulary card with its pronunciation line, three examples, one recall); **a bilingual explainer** (the same card in two languages side by side).
- Openings: **the stopwatch alone** ticking over an empty card; **the teacher asks the question before the card arrives**; **the dense reference card** held for a second and then dropped.
- Endings: **the next question's stopwatch cut mid-sweep**; **all dots filled and the teacher bowing**; **the answer card turned over, last, and left on screen**.

**Use cases as information order** (how long each layer stays):

- **Grammar point:** question (3-4 s, read by the teacher), think pause (2-2.5 s), rule as one line (3 s), clue (2-3 s), answer (1.5 s), read-after-me twice (5-6 s).
- **Vocabulary:** the word large, its pronunciation line (2 s), the meaning (2 s), one example (3 s), one recall question (6 s).
- **Pronunciation tip:** minimal pair with the two sounds lit as they are spoken, then the word list read once slowly, once fast.
- **Exam-style drill (generic, never branded):** four to six quick loops with the pause shortened to 1.5-2 s and a counter, the rule only after the answer.
- **Kids' language game:** large type, a mascot that acts out each answer, option chips with pictures drawn in code.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
