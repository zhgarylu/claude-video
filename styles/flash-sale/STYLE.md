# Flash Sale Promo: Style Prompt

> The loud retail promo: a saturated red and yellow pair, starbursts and sticker badges, prices that slam in with a squash, old prices struck through, stock bars that drain, coupon tickets that tear, marquee tickers, big-number countdowns, and a camera that only punches. Every hit is on the beat; the information still has to be readable.
> References (grammar only): supermarket flyers and shopping-festival animations in general, game-show bonus-round graphics, mobile-shop banner ads. Never copy a real retailer's colours, mascot, slogan, logo or typeface; the shop and its goods are invented.

## 1. Essence, and what it is not

- **A price is a character.** The old price is small and struck out, the new price is the biggest thing on the screen, and the percentage is a sticker. Every scene is built to deliver one price.
- **Energy is a rule, not decoration.** Things arrive by a slam (oversize drop, hard landing, squash, settle), on a beat or an eighth, and each landing is a sound and a camera punch.
- **Flat, bold, outlined.** Everything is a thick black outline, a hard offset shadow and a flat fill. Nothing is soft, blurred or photographic.
- **Invented content only**: a fictional shop, fictional goods drawn from simple code shapes, fictional prices that add up.

Not a corporate explainer (no calm sans on white), not a kinetic-type poster (see swiss-motion: here objects and prices move, with squash), not a game-show set (see game-show), not a UI screencast.

## 2. Look and rendering

- **Flat vector on a 2D canvas.** Shapes with a 8-12 px ink outline (`#17110d`) and a hard drop shadow offset 10-18 px down and right in ink; no gradients except the occasional halftone dot field.
- **Backgrounds are patterns, not scenes**: sunburst rays, halftone dots, diagonal stripes, hazard bands, polka confetti. One per scene, in the colour pair or ink.
- **Cards** are cream rounded rectangles with a thick outline, tilted 1-4 degrees, holding a simple code-drawn product icon (flat colours, outline, one white highlight line).
- **Shapes that carry meaning**: the starburst (a deal, a hit), the sticker badge (a percentage, NEW, LIMITED), the price tag, the perforated coupon ticket with notches, the receipt with zig-zag ends, the cell-segmented stock bar, the pill button.
- No grain, no vignette, no bloom. Mux with no grain.

## 3. Colour logic

- **One hot pair plus ink.** Signal red `#ff2a1f` and sale yellow `#ffd90f`, with ink `#17110d` and cream `#fff8e6`. Yellow on red, red on yellow, white or cream on either, ink on yellow.
- **Never red on red or yellow on yellow.** A red sticker on a red scene becomes cream with red text; a yellow price on a yellow scene becomes red with a thick outline.
- **Colour has jobs**: red is the new price and the warning, yellow is the highlight and the button, orange is the middle state of a draining bar, ink is the old price. Product icons may use small accents (teal, orange, blue, green) so goods read as goods; the UI stays in the pair.
- Scenes alternate between a red scene, a yellow scene and an ink scene; a countdown flips red/ink on each second.

## 4. Type

- **A bold condensed display face for everything that shouts** (Anton): headlines, prices, percentages, the clock. Capitals, with a stroke of about 5 % of the size in ink and a hard offset shadow.
- **A bold condensed sans for everything that explains** (Barlow Condensed ExtraBold): product names, labels, dates, fine print, letter-spaced.
- **Prices**: a `$` and digits, old price about 40-50 % of the new one, the new one at least 250 px high on a single-product scene. Hold a price at least (characters / 15 + 1.5) s after it lands.
- Numerals of a running clock sit on a fixed pitch so they do not jitter.

## 5. Motion rules

- **The slam**: the object arrives at 2-3x scale (or from off-screen) in under 0.1 s, lands, squashes about 20 % and settles in 0.25 s. It lands on a beat or an eighth.
- **The strike**: a thick red bar draws across the old price in 0.14 s, then the new price slams. Strike first, answer second.
- **Overshoot and snap, never ease-in-out drifts**: motion is a hit and a settle. Only background patterns (rays, stripes, dots, marquee) move continuously.
- **At most three simultaneous motions** in a frame besides the background: more than that and nothing is read.
- **Number rolls and drains are stepped** (one cell, one tick) and end on a beat.
- **Cuts are hard** on a beat, or a starburst wipe (a star grows over 0.14 s and shrinks over 0.18 s from the new scene); a 2-frame cream flash is the other cut.
- Confetti and coins are thrown from a point with gravity and drag and are gone within 3 s; they must not sit on a price that is being read.

## 6. Camera grammar

There is no smooth camera. The camera is a **punch zoom** (a jump of 3-8 % that decays in about 0.3 s) plus a **shake** (up to about 20 px, decaying, deterministic) triggered by hits, and nothing else.

| Move | What it expresses | Can serve |
|---|---|---|
| Small punch on every slam | the impact of an arrival | cards, titles, stickers |
| Big punch with shake | the number that matters | the new price, "ONLY 3 LEFT", zero |
| Growing shake over a series | tension | a draining stock bar, a countdown |
| Starburst wipe | a change of subject | between products |
| Cream flash cut | a beat-synchronised hard cut | into a list or a countdown |

Keep the layout at least 60 px inside the frame so a punch never crops a price.

## 7. Sound palette

- **Original upbeat jingle**: four-on-the-floor kick, clap on 2 and 4, off-beat hats, a bouncy bass, off-beat chord stabs and a marimba hook on a four-chord loop (C G Am F), 115-130 BPM. Brass doubles the hook for the pay-off. No sample of any existing jingle, no licensed music.
- **Designed effects for every visible action**: a whoosh before and a thud on each slam, a zip as the strike draws and a snap as it lands, a bright cash ping on a new price, a pop on a sticker, a printer tick per receipt row, a rising tick per drained cell, a buzzer for "ONLY N LEFT", a paper rip for the coupon, a register ring and coin spill for the total, clock ticks for the countdown, an air horn and a confetti pop for zero, a UI click on the button.
- **Silence is a native move**: one beat of silence (picture still running) before zero and one after a tear. The first sound after it is the biggest in the film.
- **Mix**: the effects sit on top of the music (they are information, a price is heard as well as read); the music ducks about 30 % under big hits; -14 LUFS with a limiter.

## 8. Native moves

- **The slam-in.** Any arrival. *Fits:* products, titles, badges.
- **Strike and answer.** Old price struck, new price slams. *Fits:* any markdown, upgrade, "was/now".
- **The starburst sticker.** A percentage, NEW or LIMITED slapped on a corner. *Fits:* a rating, a status, a ribbon.
- **The draining stock bar.** Cells fall away one tick at a time. *Fits:* remaining quantity, time left, budget, seats.
- **The coupon tear.** A stub peels at its perforation and falls. *Fits:* a code, a voucher, a ticket release, a membership card.
- **The receipt adds up.** Rows print in, a total is struck out, the saving bursts. *Fits:* a total, a comparison, a before/after sum.
- **The grid of cards.** Cards slam into a grid on eighths. *Fits:* a catalogue, a line-up, a list of features.
- **The countdown clock.** Minutes, seconds, hundredths, the background flipping each second, a dropout on the last beat. *Fits:* a launch, a deadline, a release.
- **The button press.** A cursor arrives, the pill button squashes, ripples, confetti. *Fits:* a call to action, a sign-up, a download.

## 9. Pitfalls of the medium

- **Price legibility.** A price needs size, contrast, an outline and time. Do not put confetti, coins or a punch on a price that has not been read.
- **More than three simultaneous motions** turns the frame to noise.
- **Red on red, yellow on yellow, thin type on a pattern.** Put a card, band or burst under text.
- **Fake urgency.** Do not invent real-sounding claims ("only today", "selling fast") for a real product. In a fictional demo, say the shop is fictional; in a user's film, state only offers the user supplied.
- **Nothing moving every frame in the foreground**: a background pattern may drift; text must hold still after it lands (the reading check requires it).
- **A running counter** (clock, rolling total) changes faster than reading time: report it separately and carry the number in a static label.
- **Everything slams at once.** Stagger arrivals by an eighth.
- Do not mirror swiss-motion (type on a grid, no objects), game-show (a studio set with a host) or comic-pop (panels, speech balloons).

## 10. Engine

In `demo/`: `timeline.js` (key times on the beat grid, goods and prices), `draw.js` (palette, outlined type with a text recorder for the reading check, the slam, starbursts, badges, strike, backgrounds, marquee, confetti and coins, product icons, coupon path, cursor), `scenes.js` (the ten scenes), `main.js` (page contract, the hit list that drives both the camera punches and the sound events, starburst wipes and flash cuts), `mix.py` (jingle, effects, silences, master bus). File list and build steps: [DEMO.md](DEMO.md) "Build notes".

## 11. Variation space

You decide the shop, the goods, the prices, the pair of colours (hot pink and electric blue, orange and black, green and yellow all work if the pair stays loud and one of them is the "new price" colour), the story and the length. Far from our demo:

- Structures: **a drop day** (one product, one clock, one button); **a membership week** (a card, perks that print in, a renewal clock); **an event ticket release** (a seat map filling, a queue, a coupon); **a year-end list** (twelve small deals, each on a month tile).
- Openings: **the clock first**; **a hand pressing a red button**; **a price falling from the top of the frame**.
- Endings: **the button pressed and the card holds**; **a receipt printing out of the frame**; **the shop shutter coming down**.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
