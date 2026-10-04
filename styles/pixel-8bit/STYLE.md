# 8-bit Console Pixel — Style Prompt

> A film that looks and sounds as if it ran on an 8-bit home console of the 1980s: a 256×240 picture of 8×8 tiles, a fixed palette of about 54 colours, three colours plus transparency per sprite, five sound channels. The limits are the style: every frame must be something that hardware could have drawn.
> References (grammar only): documentation of 8-bit tile-and-sprite hardware (attribute blocks, scanline sprite limits, split-scroll); cartridge-era title screens, attract modes, HUD bars and continue screens; chip music of arpeggios and envelopes. Never use an existing game's name, character, level, logo, melody or sound effect, and never name one in the film.

## 1. Essence, and what it is not

A frame reads as 8-bit console at a glance when it has all of these:

- **256×240 native pixels**, shown at an exact integer multiple (×4 = 1024×960 on 1080p), nearest-neighbour, square pixels.
- **A tile world**: background = 8×8 tiles; colour chosen per 16×16 block from four sub-palettes of three colours plus one shared backdrop colour. Colour clashes at block edges belong to the look.
- **Sprites that obey the scanline**: 8×8 or 8×16, three colours plus transparent, **at most 8 per line**; the 9th and later vanish from that line, so crowds flicker and break up.
- **Steps, not blends**: whole-pixel scroll, 2–4 frame loops on whole game frames (60 Hz), fades by palette steps, never alpha.
- **Chip sound**: 2 pulse, triangle, noise, optional DPCM; arpeggios fake chords.

Not Pixel RPG (16-bit: free palette, portraits, dialogue boxes), not HD-2D (no light, depth or bloom), not Microgame (many media), not a CRT terminal (no glyph screen). A pixel filter over smooth art is a failure: everything passes the constraint compiler (§10).

## 2. Materials & rendering

- **Paper → compiler → scanline unit.** Art is painted in code with master-palette ids onto a *paper* (a nametable image up to 512 px wide so layers wrap). The compiler cuts it into 8×8 tiles, deduplicates (**≤ 256 distinct tiles per stage**), assigns **≤ 4 sub-palettes × 3 colours** to 16×16 attribute blocks, and **throws** on a fourth colour in a block, a fifth palette or tile 257.
- **Scanline renderer.** Per line: scroll X/Y (bands at different integer rates = **split-scroll parallax**), backdrop colour (banded skies; **≤ 6 backdrop and ≤ 8 scroll changes per frame**), background, then sprite evaluation (first 8 in OAM order win; a priority bit hides a sprite behind non-empty background).
- **Master palette**: ~54 colours (4 levels × 12 hues, greys, black). A pixel is an id; RGB exists only in the final lookup. Entries may change between frames (cycling, fades, flashes), never mid-pixel.
- **Sprites** are ASCII tiles (`.123`); a character is a **metasprite** of 8×8 objects, each with its own sub-palette (head red, coat blue). Heroes 16×16 to 16×24; bosses ≲ 12 objects.
- **Dither** (1-px checkerboard) is the only gradient or glow.
- **Output stage** (after validation): integer upscale; optional scanline (one output row in four darkened ≤ 25 %; off for stills), bloom ≤ 12 %, dark surround.

## 3. Colour logic

- **Fixed table, no tints**: a colour is (hue, level). No alpha, gradient or in-between colour exists.
- **Per scene ≤ 4 background sub-palettes × 3 + backdrop; 4 × 3 for sprites.** Plan colours per layer first: sky = backdrop bands; HUD = one palette; far layers share one.
- **Light is a hue, shadow is a level**: dusk is one orange-pink family stepping down; night is the same art with every palette lowered one or two levels and the backdrop swapped.
- **Skies are 3–5 hard-edged bands**, never a smooth gradient.
- **Fades** lower every entry one level per step (4–5 steps to black), hue unchanged.
- **The hero's colours are protected**: hero and key object keep their colours in every scene.

## 4. Type & subtitles

- **Latin text is an 8×8 tile font** (5×7 glyph + shadow room) set on the tile grid (x, y multiples of 8). Titles double to 16×16 cells with a 1-px outline and 2-tone fill. Text lives in the framebuffer: no antialiasing, no HTML overlay.
- **Subtitles are the game's own text**: a HUD line or a strip at the foot, 1–2 lines of ≤ 28 characters, white on black or on a backdrop band, optional dark shadow; typed at 1 character per 2–3 frames, a blinking `>` when complete. Hold ≥ max(1.8 s, speech + 0.6 s).
- **Chinese type**: CJK needs a pixel-style **OFL** font, subset per TECHNIQUE §11, rendered on the 8×8/16×16 tile grid. Candidates: **Fusion Pixel Font** (OFL-1.1; 8/10/12 px; Simplified Chinese) and **Ark Pixel Font** (OFL-1.1; 10/12 px); check the licence file of the release you download. Zpix is **not** OFL (paid commercial licence): do not use it. Rasterise at native size, hard 50 % threshold, one character per 8×8 (8 px build) or 16×16 cell (12 px build), through the compiler like any tile; never scale or smooth. Each glyph costs 1–4 of the 256 tiles.

## 5. Motion quality

- **Native rate 60 Hz**; all state is a function of the integer game frame. Prefer 30 fps output (exactly 2 game frames each); at 24 fps steps alternate 2 and 3 frames and judder.
- **Sprite loops 2–4 frames**, each held 4–8 game frames. No tweening, rotation or scaling; a turn is a flipped tile.
- **Movement in whole pixels per frame** (0–3). Parallax = integer divisors of the camera (`cam`, `cam>>1`, `cam>>2`, `cam>>4`); the slowest layer moves in visible steps.
- **Things arrive by entering the screen or a 2–3 frame flash**, never by fading; a hit = palette flash + scroll jolt (3-2-1-0 px).
- **Flicker is deterministic**: an overloaded line rotates the OAM start each frame; dropout comes from the frame number, never random.

## 6. Camera grammar

The camera is the scroll register; a cut is a palette change or a screen swap. Opening and ending come from the topic.

| Move | What it expresses | Can serve |
|---|---|---|
| Side-scroll, 3–5 parallax bands | journey, distance | a commute; a supply route; a year |
| Locked screen, one thing animating | decision, attention | a menu choice; a result; a countdown |
| Vertical scroll up a tall nametable | scale, ascent | a tower; an org chart; a price ladder |
| Scroll jolt (1–3 px, stepped decay) | impact, alarm | a failure; a deadline; an arrival |
| Palette-step fade out / in | time passing, a chapter | night falling; a shift ending |
| Integer-scale cut-in (×6 on a 256×180 window) | a detail | a face; a score; an object in hand |

No smooth zoom, rotation or easing. Framing: the subject stays above the HUD rule; text on the tile grid, 8 px clear of the edge.

## 7. Sound palette

- **Five channels only**, synthesised from the chip's tables (`demo/apu.py`): **2 pulse** (duty 12.5/25/50/75 %, 11-bit timer: pitch is quantised), **triangle** (32-step, no volume control; bass, kicks), **noise** (15-bit LFSR long/short, 16 periods; hats, snares, wind, blasts), **optional DPCM** (low-rate 1-bit delta samples), through the chip's **nonlinear mixer**, a 37 Hz high-pass and a ~14 kHz low-pass.
- **Chords are arpeggios** cycled once per frame (2–3 notes at 60 Hz); bass and drums share triangle and noise in turns. **Envelopes are quick** (decay one volume step per 1–3 frames, 240 Hz clock); **sweeps** make drops and risers.
- **Foley is chip sound**: pickup = two-note pulse jump; hit = noise burst with falling period; text blip = 1-frame pulse; fall = triangle glide.
- **Music**: original, 1–3 motifs, pentatonic or minor, call-and-response between pulses; the beat is a whole number of frames (150 BPM = 24).
- **Silence** = all channels at zero (the triangle needs a gate); a cut is hard, the first note after it a bare pulse.
- **Mix**: mono, −14 LUFS, no reverb.

## 8. Native moves

- **Split-scroll parallax.** Bands scroll at different integer rates. *Fits content like:* a commute through a city; a supply chain from farm to table; a year of seasons.
- **Palette fade by steps.** *Fits content like:* the end of a shift; a power-down; a memory arriving.
- **Palette cycling.** One entry alternates every few frames. *Fits content like:* a beacon or alarm; a reactor; fire.
- **Sprite dropout as drama.** A swarm exceeds 8 per line and flickers apart. *Fits content like:* a rush of customers; a queue of tickets; noise in a data stream.
- **Attract mode and continue screen.** Title menu, high scores, a "continue?" countdown. *Fits content like:* a feature list; a team's quarter; a decision with a deadline.
- **Tile-wipe stage change.** The next screen redraws column by column. *Fits content like:* chapters; building floors; versions.

## 9. Pitfalls of the medium

- **A fourth colour in a block** → recolour or move the detail; never loosen the rule.
- **> 256 tiles** → repeat motifs, avoid per-pixel noise, tile the paper at a period.
- **9 sprites on a line vanish silently** → rotate OAM order, thin the group; a fixed drop reads as a bug.
- **Scenery across a scroll-band edge tears** → keep objects inside one 16-aligned band, or make them sprites.
- **Sub-pixel scroll, resampled camera, alpha fades, glows** → whole pixels, ×4 nearest, palette steps and dither.
- **Text off the grid or scaled** → set by tile.
- **A hero too small for a close moment** → cut to the ×6 window or a 24–32 px metasprite.
- **Square-wave harshness** → oversample the synth and keep the high-pass.

## 10. Engine

In `demo/`: `palette.js` (54 colours, `fadeId`), `ppu.js` (`Paper`, **`compile`** with rejecting checks, `Sheet` for ASCII sprites, **`render`** the scanline unit, **`validate`**), `font.js` (tile font, `putText`, `putBig`), `sprites.js`, `scenes.js` (stage paintings, per-frame state), `check.mjs` (constraint audit with negative tests), `apu.py` (chip synthesiser), `main.js` (upscale, page contract; `?scene=…&f=<game frame>`). A scene not in the demo:

```js
const p = new Paper(256, 240); p.rect(0, 160, 256, 80, C.green0); putText(p, 'LEVEL 1', 12, 4, C.grey3, C.black);
const scene = compile(p, { bd: y => y < 160 ? C.blue1 : C.green1 });   // throws if it does not fit
const st = blankState(scene, buildSheet());   // set st.scrollX[y], st.oam, st.sprPal; render(st); validate(st, out)
```

## 11. Variation space

You decide story, genre, palette plan (inside §3), opening and ending. All far from our demo:

- Structures: **a shop run in stages** (score = revenue); **a boss rush** (the topic's problems as bosses); **a map screen** (nodes, each a small level that returns).
- Openings: **a boot screen** (memory check, logo tiles drop in); **a stage already scrolling**; **a continue countdown** at a failure.
- Endings: **GAME OVER, continue? yes**; **a staff roll** over a scrolling landscape; **the high-score table** with initials entered letter by letter.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
