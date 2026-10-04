# One Gong at Stone Gate (石门一锣) — how our demo was made

**One example among many. Don't reuse its story, arc, shots, props or timings.** Read [STYLE.md](STYLE.md) for what stays fixed; everything below is this film's own choice.

## Story and structure

52.5 s, 1920×1080, 24 fps, spoken Chinese with burned-in subtitles. All characters, names, lines and designs are original: **Qingluan**, a young stage-warrior with a red spear (a martial female role), and **Shigong**, a stone spirit with a green painted face who has shut the mountain spring behind a gate.

**Structure: "the long hold and the one stroke".** Holds and snaps carry the film: a symmetrical standoff, three explosive exchanges squeezed between held poses, two bars of near-silence, then a single gong stroke that does what the spear could not. The colour arc is part of the story: a parched ochre land turns malachite and azurite when the doors open.

| # | Shot | s |
|---|---|---|
| 1 | Cloud curtain parts on an empty painted stage; she snaps into a pose on the cymbal | 0.0 to 2.5 |
| 2 | Stage-step glide along a long painted scroll, title cut in on the wood block | 2.5 to 10.0 |
| 3 | Crane up the gate; the stone relief face opens its eyes; three beat-locked cuts to the painted face | 10.0 to 12.5 |
| 4 | Symmetrical two-shot, couplet | 12.5 to 17.5 |
| 5 | Three exchanges, each with its own camera: thrust and guard, overhead slam and parry, low sweep and leap | 17.5 to 25.0 |
| 6 | Her spear bites the gate; her line; snap-zoom to the bronze disc | 25.0 to 30.0 |
| 7 | Silence: wind, a drip; she frees the spear and turns it butt-first | 30.0 to 35.0 |
| 8 | The stroke: the disc rings, the picture shudders, the doors open, a cloud-and-wave wall wipes to the valley | 35.0 to 38.5 |
| 9 | Valley with the spring running; the gate again, lush, Shigong laughing | 38.5 to 47.0 |
| 10 | Held tableau; the scroll border closes; end card | 47.0 to 52.5 |

Voice lines (Xiaoxiao for Qingluan, Yunxi for Shigong, both edge-tts; every line checked with speech-to-text, the model hears homophones of the classical wording, so `lines.json` carries an `asr` field): 「泉断三春久，求公放一线。」「欲得山泉水，先接我三招！」「原来，这把锁，是面锣。」「哈哈哈，好一记响锣！」

## Score structure

96 BPM, 4/4, 2.5 s a bar, 21 bars, one timeline (`timeline.js`) for picture, score and mix. Every cut, strike and the stroke sit on the grid.

| Bars | Section | Instruments |
|---|---|---|
| 1 | opening | small and big gong, cymbal on the snap |
| 2 to 4 | glide | pipa walking figure, jinghu answers, wood block quarters |
| 5 | gate | big gong, bangu roll, erhu drone, three stabs on the cuts |
| 6 to 7 | standoff | erhu alone, soft cymbal on each held pose |
| 8 to 10 | fight | bangu rolls into a strike on beat 1, jinghu fast figures, pipa and drum |
| 11 to 12 | bite | tremolo pipa, low drum roll |
| 13 to 14 | silence | wind and one drip only |
| 15 | the stroke | one bronze-disc gong, long tail |
| 16 to 19 | release | D major pentatonic: pipa arpeggios, dizi, jinghu, water and birds |
| 20 to 21 | tableau | all together; cymbal and gong on the last downbeat |

Minor pentatonic (D F G A C) before the stroke, major pentatonic (D E F♯ A B) after. All instruments are synthesised in `mix.py` with numpy (no samples): a falling big gong, a rising small gong, a cymbal from filtered noise and inharmonic partials, comb-filter pipa, bowed jinghu and erhu from band-limited sawtooth with vibrato and slides, a breathy dizi.

## Palette, props and designs

Dry palette (ochre, dull olive, pale gold sky) for the first seven shots; lush palette (malachite, azurite, cinnabar sun) after the doors open. Qingluan: cinnabar coat, indigo skirt, azurite cloud collar, gold trim, pheasant plumes, a red-tasselled spear. Shigong: malachite face with a gold crest, white brow wings, crown of stone peaks, mane of black flame locks, white beard, a boulder mace. Props: the cinnabar gate pillars, blue studded doors, a bronze disc (the lock), a relief face medallion.

## End card

Paper ground with the brush title and the library's sign-off, "LemoLab × Claude Opus 5.5", shown only in this library demo.

## Build notes and code entry points

`sh styles/opera-cel/demo/build.sh` (needs the core tier, `fonttools` and `brotli` in the library's `.venv`, and a network the first time for the voices and the OFL fonts). It subsets the fonts to the characters used (only `demo/fonts/sub/` is read by the page; the full fonts stay outside git), makes the voices and checks them, exports events, runs `readcheck`, renders, mixes, masters with `mux.sh` (−14 LUFS), then writes the subtitles and poster.

- `film.js`: every shot as a function of time; `renderFilm(ctx, t)`. Secondary motion (plume, flags, ribbons) is a damped swing after each hit in `HITS` (`anim.js: ring`), evaluated on threes; poses are `poseAt` tracks: hold, 2-frame pull-back, 3 to 5 frame travel with an 8% overshoot, then a hold; characters on twos.
- `world.js`: the scroll, the gate (tall canvas for the crane), door leaves that swing with the bronze disc riding their free edges; `spirit.js`: the bust rig; `timeline.js`: bars, shots, lines and sound events.
- `index.html?shot=style|spirit|wipe` renders the style frames from `frames.js`.
