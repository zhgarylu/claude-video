# Peking Opera Cel Animation — Style Prompt

> Hand-painted Chinese feature animation in the opera mould, re-created in code: jingju costume and face-paint turned into cel characters, brush outlines of changing width, flat mineral-pigment fills, decorative painted backdrops, and a rhythm of long held poses broken by sharp, explosive moves.
> References (grammar only): the hand-painted Chinese feature-animation tradition of the 1960s (opera-derived design, gongbi line, gouache on cel over painted backdrops) and jingju stagecraft (face-paint, costume silhouettes, stage steps, held *liangxiang* poses, *luogu* percussion). Borrow no film's characters, plot, shots or lines; every pattern is generated, none traced.

## 1. Essence, and what it is not

Three layers; the difference between them is the look:
- **Cel** (anything that moves): a **brush outline** of changing width in a dark colour, **flat pigment** inside, no gradients, a few hand-placed details (gold pattern lines, a white highlight stroke). Characters are **stage figures**: costume silhouette, painted face, headdress, prop; they act in poses, not in naturalistic gesture.
- **Backdrop**: painted and **decorative**, built from motifs (cloud scrolls, wave scales, pine tiers, curved eaves, a sun disc); washes and gradients allowed, brush texture on rock and bark. A stage picture, never a perspective scene.
- **Paper**: warm xuan paper under everything, with fibres, uneven sizing and a gouache tooth over the final frame.

Not ink wash (colour here is opaque mineral pigment, lines are gongbi, not blur), not paper-cut or shadow puppet (volume is painted, not cut), not 80s anime (no airbrush, no backlit neon).

## 2. Materials & rendering

- **Brush outline (`ink`, `inkLoop`).** A contour is a polygon built along a sampled path: width = base × taper × slow pressure noise × a small direction factor, plus a hair of wobble. Closed shapes are traced in 2 to 5 overlapping strokes with their own tapers. Silhouette ~4 to 6 px at 1080p, inner folds and pattern lines 1.5 to 2.5 px, hair and barbs ~1 px. Line colour is the fill darkened toward ink; faces and hands warm brown-red; only boots, hair, rock near-black. Long strokes (rock, hair, speed lines) may run dry: bristle strips that drop out toward the end (flying white).
- **Pigment fill (`cel`).** Fill, then inside a clip: a low-contrast mottle (multiply), a darker pooled edge, a 1 to 2 px registration offset against the line. Gold = ochre with sparse specks, never a gradient.
- **Costume vocabulary (procedural):** scalloped cloud collar, fish-scale armour, pennant-strip skirt hung by gravity, fanned back flags, thick-soled boots, S-curved water sleeves, pheasant plumes of fine barbs, pom-poms on springs, bead tassels, crowns inlaid with kingfisher blue.
- **Face paint (`facePaint`).** A base colour; paint goes on in **mirrored pairs** (brow wings with notches, eye frames, nose wings with spirals, cheek swirls or cracks) around **centre marks** (forehead crest, nose bridge). One spec (base, wing length, notches, crest, cheek) generates a face; shapes are closed polygons with brush outlines and keep a ring of base colour at the edge. Colour is role: red loyal, green wild or spirit, white cunning, black blunt, blue fierce, gold divine; pretty roles are pale with a rouge flame round the eyes.
- **Cloud scroll (`xiangyun`) and wave scales (`sea`)** share one grammar: overlapping lobes drawn back to front, each outline curling inward, a gold echo line, a tapering tail. Swap the palette to turn a cloud into a wave.
- **Backdrops (`scenery.js`):** ridges graded top to base with slope strokes, shaded facets, a rim light and mist bands; S-trunk pines; curved double eaves; a flat disc with gold rings. Keep backdrop values below the cels'.
- **Finish (`post.js`):** multiplied paper grain and a warm vignette. No bloom, blur or aberration.

## 3. Colour logic

- **Mineral palette:** cinnabar, malachite, azurite, indigo, ochre-gold, lead-white cream, charcoal ink; each with one lighter and one darker tone. No neon, no pure black or white.
- **One ground:** warm paper by day, or a deep indigo wash on paper for night and palace scenes. Never grey or black.
- **Hero warm against a cooler backdrop**; a villain or spirit takes the cool pigment; gold is the shared "divine" accent. A place can change its whole palette (parched ochre to lush green) as the story turns.
- **Gold is trim, not light:** borders, pattern lines, crowns. White is cloth, plume and cloud; it never glows.

## 4. Type & subtitles

- **Subtitles:** Noto Serif SC semibold, 52 to 56 px, ivory with an indigo-ink edge, low and centred over a soft ink pool that fades out sideways (no hard box).
- **Chinese type:** OFL fonts only, subset to the characters the film uses (TECHNIQUE §11). Ma Shan Zheng or Zhi Mang Xing for titles and calligraphy, Noto Serif SC for subtitle body, ZCOOL XiaoWei for the calmer line.
- **Titles:** large brush characters, gold fill, cinnabar edge, indigo drop, optionally vertical, one small vermilion seal.
- Hold ≥ max(1.8 s, speech + 0.6 s); one line at a time.

## 5. Motion quality

- **Hold, then snap.** Anticipation 2 frames, travel 3 to 5 frames on ones, a 1 to 2 frame overshoot, then a held *liangxiang* of 0.5 to 2 s. Never ease through the middle of a move.
- **Stepping:** characters on twos, small cycles on threes, camera and cloud drift on ones.
- **Holds are never dead:** only secondary parts move (plume, sleeve ribbon, tassel, a breath), as damped swings after each hit; the pose does not change.
- **Stage steps** glide in tiny fast steps; turns snap between two drawings; a leap is a pose swap plus speed strokes.
- **Entrances** by cloud wipe, a stage step from off-frame, or a held pose cut in on a hit. Nothing fades.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Locked full figure, held | presence, the pose as a portrait | an introduction; a vow; a verdict |
| Slow lateral truck over a long backdrop | a journey through a painted scroll | travel; time passing; a list of places |
| Push-in to a painted face | resolve or menace; the paint read at last | a challenge; a character revealed |
| Held symmetrical two-shot | opposition, balance | a standoff; a bargain; a debate |
| Cloud-and-wave wipe | passage between worlds or moments | a change of place, scale or season |
| Snap-zoom to a prop on one beat | this object decides it | a weapon; a seal; a lantern; a bowl |

Figures fill 55 to 85% of the frame height in full shots, centred or on a third; keep the lower 120 px for subtitles. Symmetry is allowed. Transitions: hard cut on a percussion hit, or a cloud or wave wipe; no crossfade, push-slide or zoom blur.

## 7. Sound palette

- **Percussion (*luogu*):** small gong with a rising bend, big gong with a falling one, cymbals, the clapper-drum *bangu* (sharp, dry), wood block. Rolls build entrances and fights; a short clean pattern ends a pose; one lone stroke can carry the film's turn.
- **Melody:** jinghu (high, nasal, bowed), erhu, pipa (tremolo, sweeps), dizi or sheng for air, suona only for processions. Pentatonic with slides and ornamented long notes. Plucked strings via `core/audio/pluck.py`, bowed and wind via `sampler.py`.
- **Foley:** silk snaps, sleeve whip-cracks, boots on timber, shaft knock, bead rattle, wind, water. Every held pose gets a landing sound; every explosive move a whoosh on its anticipation.
- **Silence is a tool:** a bar of nothing, or only wind and a drip, before the turn. Cut percussion dead; never fade it.
- **Voice:** rhythmic, slightly high and clipped stage speech, short lines, or none with printed couplets. About 10 dB over music; −14 LUFS.

## 8. Native moves

- **The liangxiang.** The figure snaps into a pose, plumes and sleeves settle, a stroke lands, the frame holds. *Fits content like:* a product reveal; a graduate's portrait; a team introduced one by one.
- **Face-paint read.** Push into a painted face; the pattern states the character. *Fits content like:* a rival brand; four kinds of tea; the cast of a folk tale.
- **Cloud-and-wave wipe.** A wall of scroll clouds or crests sweeps over and the next scene is already painted behind it. *Fits content like:* a change of season; day to night; an ingredient's road to the table.
- **Stage-step glide.** Tiny fast steps, plumes trailing. *Fits content like:* a courier with a letter; a pilgrim; a parcel crossing a map.
- **The one-stroke turn.** The film holds its breath, one gong stroke changes the world (water flows, a gate opens, a colour floods). *Fits content like:* a feature switched on; a festival bell; a toast.

## 9. Pitfalls of the medium

- Uniform line width → taper and pressure; thin starts and ends.
- Black outlines everywhere → darken the fill's own colour; near-black only for hair, boots, rock.
- Gradients, glow or soft shadow in cels → keep flat; separate by value and outline.
- Perspective backdrops → compose by overlap, size, motif and mist bands.
- Regular cloud lobes → vary radii and overlap; tails flow one way, mirrored on the next cloud.
- Costume as a pile of patterns → one dominant pattern and one trim colour per garment. Plumes drawn as stripes → a ragged vane of fine barbs on a thin rib. Canvas font fallback → `document.fonts.load` first; page grain bloats files → ffmpeg only.

## 10. Engine

In `demo/`: `brush.js` (`ink`, `inkLoop`, `cel`, `tube`, `capsule`, path helpers `spl`/`bez`/`arc`, `PAL`, `LW`), `scenery.js` (`paperCanvas`, `mountain`, `xiangyun`, `sea`, `pine`, `eave`, `disc`), `hero.js` (`drawHero(ctx, pose)`, a jointed martial-role rig), `poses.js` (joint angles, `heroPoints` kinematics), `anim.js` (`poseAt` hold-and-snap tracks, `ring` damped swings), `facepaint.js` (`facePaint(ctx, spec)`), `spirit.js` (a bust rig), `post.js` (`finish`, `subtitle`, `title`, `snapMarks`), `mix.py` (numpy luogu, jinghu, erhu, pipa, dizi). A minimal new use: `facePaint(ctx, { base: PAL.azurite, notches: 2, cheek: 'crack', crest: 'flame' })` is a blue river-spirit face; `xiangyun` in indigo over `sea` is a wave crest.

## 11. Variation space

You decide story, characters (role type, colours, face), props, backdrop, pacing, score and camera. All far from our demo:

- Structures: **a procession** (a long truck past figures, each held in turn); **a debate in couplets** (two held figures, a cloud wipe between rounds); **a craft as stage business** (each step a prop and a pose).
- Openings: **a curtain of clouds parting** on an empty painted stage; **a gong filling the screen** that becomes the sun; **a close-up of a face painted stroke by stroke**.
- Endings: **all figures freeze in one tableau** as the border closes like a scroll; **the cloud wipe carries the hero off** as the backdrop repaints; **one prop left on the stage**, plume still swaying.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
