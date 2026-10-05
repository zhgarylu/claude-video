# Lyric Video: Style Prompt

> A music video whose picture is the words: kinetic typography locked to a tempo grid, where every word lands on the beat it is sung, emphasis is carried by scale, weight and colour, shapes pulse with the kick, and each section of the song has its own palette and layout.
> References (grammar only): lyric and visualiser videos from the 2010s on, title-sequence kinetic type, karaoke screens for the progressive fill, concert-poster typography for the hook. Never copy a real song, its words, a real artist's name, a label's logo or a typeface from a real release; use an OFL display face and an OFL text face.

## 1. Essence, and what it is not

- **The words are the picture.** Every frame is typeset text moving on a beat; backgrounds are simple shapes that exist to give the type something to hit.
- **Time belongs to the tempo.** Every landing, wipe, fall and cut is placed on the song's grid (beat, eighth, sixteenth) and derived from the BPM; nothing is timed by feel.
- **A word appears when it is sung.** The picture follows the vocal's word times, not the other way round.
- **Sections are visible.** A change of verse, pre-chorus, chorus or bridge changes palette, layout, type scale and camera, so a viewer with the sound off can still tell where the song is.
- **The hook grows.** The line that returns is set bigger or louder each time it comes back.

Not a karaoke screen (no full-screen lines waiting for a bouncing ball, no static white-on-blue), not a subtitle track (the type is the show, not a caption under something else), not a motion-graphics explainer (nothing here teaches; it performs), not a music visualiser (no spectrum bars), not a typographic poster that stands still.

## 2. Materials & rendering

- **Flat, graphic shapes** on a gradient ground: discs, rings, rays, stripes and dots. No textures, no photographs, no shadows other than a deliberate offset or glow on one accent word.
- **One recurring object** (a disc that can be a clock, a moon or a sun) lets the background change character with the section while staying the same thing. Pick your own; the rule is that the pulsing shape is one object, not wallpaper.
- **Type is drawn live** with a canvas or equivalent from a variable-weight face, so weight and size can be animated per word. Draw each word as its own object with its own transform and pivot.
- **The pulse** is an envelope that jumps on every kick and decays in about a tenth of a second; it scales the main disc, spawns an expanding ring, and nudges the camera. The same kick times drive the sound, so picture and sound cannot drift.
- **Layers, back to front:** ground gradient, rays or stripes, rings, the disc, the current line, the memory line (fixed to the screen, not the camera), flashes and speed lines, a thin progress line.
- **Masks are allowed on words** (a sunrise gradient, moving beams, a shine) as long as every letter stays legible.
- Mux with no grain: the picture is flat and compresses badly with it.

## 3. Colour logic

- **One palette per section, and the palette is the section's name.** Colder, darker and quieter for the soft sections; the loudest, warmest, most saturated colours belong to the chorus and nowhere else. Each section has: ground, a second ground tone, text colour, a lit and an unlit colour for the karaoke fill, one accent, and one or two shape colours.
- **The accent is reserved for emphasis**: the rhyme word, the word that changes meaning, the hook's key word. At most one accent colour on screen at a time.
- **Contrast is non-negotiable**: dark ink on a light ground, light ink on a dark ground, text over a disc never the disc's own hue. An unlit karaoke word stays at least about 40 % opaque.
- **A section change repaints the frame** by an iris from the new section's disc (or an equivalent wipe), and the current line takes the incoming palette halfway through, so type is never left in the wrong colour.
- **Example** (ours, not a rule): night navy with cold white and a yellow accent for the soft sections, sun yellow with near-black type for the first chorus, hot red with cream type for the last.

## 4. Type & subtitles

- **Two faces:** a tall, heavy condensed display face for the hook and the chorus (Anton-like), and a variable-weight text face for verses (Archivo-like). Capitals for the loud sections, mixed case for the quiet ones.
- **Scale carries emphasis.** Verse type is large (about 100-130 px at 1080p), with the emphasised word 1.1-1.5x bigger and heavier; the chorus fills the frame; the bridge goes small and light with wide tracking.
- **Rows, not paragraphs.** A line is set in one to three rows chosen by the director; words keep a fixed gap; a row never exceeds about 85 % of the frame width after camera push, so zoom and roll never crop a word.
- **The memory line:** when the next line begins, the previous one shrinks to a small band at the top of the frame and stays for about a bar. It keeps the last words readable long enough and gives the eye a place to go.
- **There are no separate subtitles:** the lyrics are the subtitles. The `.srt` exports them one cue per line.
- **Reading time:** every word must stay fully in frame, unchanged, for at least (letters / 15 + 1.5) s from its first full appearance. `readcheck.mjs` reports each word as its own piece; effects never move a word out of frame before that time is over.
- Labels and credits (an end card) are small tracked capitals in the text face.

## 5. Motion quality

- **On the grid.** Landings on the downbeat or the sung onset; secondary motion on eighths or sixteenths; envelopes from the BPM, never from seconds typed by hand. Keep the tempo grid and the word times in data files that the picture, the score and the checks all read.
- **Easing:** hard in, soft out. Words slam in from 1.5-2x scale with a small overshoot (0.15-0.2 s); verse words rise 30 px and fade in; falling things use gravity, bounce twice and squash on landing; nothing drifts at constant speed.
- **Karaoke fill** follows the real word timings (from speech-to-text, snapped to the energy minimum between words): the unlit word is dim, the lit portion wipes across it left to right while the word is spoken, and the word pops 10-12 % at its onset.
- **Words as objects.** Words may fall, stack, orbit, hang and swing, split, open like a door, shiver, drift away, droop or rise, but each move must say what the word says, and a word never leaves its hold time unreadable.
- **The hook** is repeated with a stepped increase in size, count or colour, so the third time is visibly more than the first.
- **Hold:** after a section's last line, give the type one bar before the next change; a change on every bar is too busy.

## 6. Camera grammar

The camera is a smooth 2D move (zoom, roll, small track) over the whole stage, with a kick punch of 1-4 % added on top. The memory line and the progress line are not affected.

| Move | What it expresses | Can serve |
|---|---|---|
| Slow push, a few percent a section | a verse settling in | any quiet narrative stretch |
| Roll plus push, growing | tension before a drop | a build; a chase; a rising argument |
| Crash zoom out (about 15 % to 0 in 0.4 s) with a flash | the drop | a chorus; a reveal; a punchline |
| Whip: speed lines and an iris from the new disc | a section change | any change of mood or place |
| Fall (slow zoom out with a downward drift) | sleep, loss, letting go | a bridge; a confession; an ending |
| Rise (tilt up as a shape climbs) | resolution | an end card; a dawn |
| Per-kick punch and shake | the beat itself | a hot chorus |

Framing rules that always hold: the current line sits in the lower two thirds, the memory band in the top 15 %, and the stage keeps 6 % of margin after the camera's largest scale. Transitions are made of the medium (iris, speed lines, a flash on the downbeat), not dissolves.

## 7. Sound palette

- **The song is synthesised from the grid:** kick, snare or clap, hats, a bass that follows the kick, chords on a keyboard and a pad, one plucked lead for arpeggios. Original; no samples of existing music. Pick the key and tempo that fit the words.
- **The vocal is a performance the music is built around.** If it is spoken in rhythm (a text-to-speech voice cannot sing), say so; place anchor words on beats and keep time-stretching to +-15 %. Compress it, keep it about 10 dB above the music, and add a doubled layer and a dotted-eighth echo in the chorus.
- **Sidechain** the pads and keys to the kick so the music breathes with the shapes.
- **Foley for words that move:** a thud for a drop, a knock, a creak, a crack, a jingle, a zip for a shine, a sweep for a rise or a sink, a hit for every slammed word.
- **Silence is a tool:** at least two real breaths (a cut of everything but the voice, a quarter beat to a beat and a half) before the drop and before the turn. The first sound after the silence is one of the loudest ideas.
- **Mix:** voice first, kick and bass next, keys and pads under; low end 20-120 Hz about -3 dB against the rest; limiter, then -14 LUFS at the mux.

## 8. Native moves

A menu: use the ones the song needs.

- **Downbeat slam.** A word enters at 1.5-2x and settles on its beat with a hit sound. *Fits content like:* a chorus; a slogan; a name.
- **Karaoke fill.** The line sits dim and fills word by word with the voice. *Fits content like:* a verse; a mantra; a speech read aloud.
- **Word as object.** A word does what it says (falls, stacks, orbits, splits, opens, droops). *Fits content like:* a storytelling verse; a rap with images; a poem with a physical image.
- **Mask.** The word is a window onto a moving gradient, beams or stripes. *Fits content like:* sun, fire, water, light; a brand colour; a place name.
- **Hook escalation.** The returning line gets bigger, louder, more repeated. *Fits content like:* a chorus; a campaign line; a punchline.
- **Echo and stutter.** Copies of a word trail or repeat on sixteenths. *Fits content like:* a hesitation; a voice in the head; a glitch.
- **Weight morph.** A word moves from thin to heavy while it is sung. *Fits content like:* a decision; a rising feeling; a loudness.
- **The memory band.** The last line parks at the top. *Fits content like:* any lyric that is read in pairs of lines.
- **Palette iris.** The section repaints from the disc. *Fits content like:* every change of section.
- **Breath and drop.** A cut to near-silence, then the biggest hit. *Fits content like:* a build; a reveal; a joke.
- **Reversal at the end.** The hook returns in a smaller unit (minutes become seconds). *Fits content like:* a comic ending; a callback.

## 9. Pitfalls of the medium

- **Words that appear before they are sung** make the viewer read ahead and lose the beat; reveal on the sung onset (a whole line may appear dim a hair before its first word, for karaoke fill only).
- **Syllable timing drift:** if the picture uses the text-to-speech's own durations, a stretched or moved line puts the highlight out of sync. Take word times from the placed audio, with their boundaries snapped to the energy minimum between words.
- **Last words disappear too soon.** The final word of a line is sung late in the bar and the next line arrives on the downbeat; without a memory line it has no reading time.
- **Effects hide letters:** a mask, glow or ghost layer that drops the word's contrast, an echo that sits on top of the letters, a split that cuts through the x-height. Check at final size.
- **Camera that crops text:** a zoom of 15 % pushes a row that is 90 % wide off the frame. Keep rows to about 85 % and the largest scale to about 1.15.
- **Lines off the grid:** a word hit 80 ms late on a beat feels wrong, 30 ms early feels right; place a spoken word's onset slightly ahead of its beat.
- **Every bar a new effect** reads as noise. Pick one or two moves per line and give the rest a plain, strong layout.
- **Chorus colour in the quiet sections** takes the chorus's impact away; keep the warmest palette for the chorus.
- **Over-compressed voice** against a loud kick: duck the music 3-4 dB under the voice, not the voice over the music.

## 10. Engine

In `demo/`: `timeline.js` (the tempo grid, sections, word-time clean-up and the drum and event pattern), `lyrics.js` (how each line is typeset: rows, sizes, weights, colours and the move on each word), `scene.js` (palettes and backgrounds), `main.js` (layout, the per-word state and moves, camera, iris, memory line, the reading-check texts), `mix.py` (synthesised score and foley from the events, the voice chain), `tools/align.py` and `tools/place.py` (word alignment and the placement of spoken lines on the beat grid). Reuse the layout and the word-state pipeline; change `lyrics.js`, the palettes and the grid for another song. File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the song or text, its language, the tempo, the key, the structure, the palettes (inside the colour logic), the recurring object, the faces, the hook and its escalation, the camera route and the ending. All far from our demo:

- Structures: **a three-minute song** with a drop and a key change; **a speech** cut as rhythm, each sentence a verse and the one repeated phrase a hook; **a jingle** (15 s, the hook five times, each a size larger); **a poem read over a slow pad** where karaoke fill is the only motion.
- Openings: **black, then one word on the first kick**; **a count-in typed on the screen**; **a quote from the song's own chorus, reversed**.
- Endings: **the hook shrinks to a whisper**; **the last word stays and the tempo grid stops**; **the lyrics scroll away like credits**.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
