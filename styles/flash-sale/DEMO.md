# Flash Sale Promo — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Mango Lane: Mega Markdown* (50 s) · `flash-sale.mp4` · source in [`demo/`](demo/)

## Story & structure

An invented shop, Mango Lane, announces a weekend of markdowns, told as the sum you save. A starburst, the shop name, a MEGA MARKDOWN band, an UP TO -60% sticker and the date slam in on eighth notes. Three products follow, each with a different native move: a kettle whose $48 is struck out before $29 slams in; a headphones-and-lamp bundle whose $178 becomes $99; a backpack whose $65 becomes $39 while a 24-cell stock bar drains to three cells, ending on a buzzer and ONLY 3 LEFT. A coupon ticket slams in (EXTRA $10 OFF, code MANGO10), its stub peels at the perforation and tears away; the music stops for one beat. A receipt prints the rows, strikes the $291 total out for $157 and bursts "YOU SAVE $134" with a spill of coins. Six more deals slam into a grid. A clock counts down from 00:06.00 with the background flipping every second and a snare roll, the music drops out for the last half second, and zero is a boom, an air horn and SALE IS LIVE. The end card repeats the offer, a cursor arrives and presses SHOP NOW, and the card holds under a disclaimer: the shop is fictional, there is no real offer.

Why it fits: every scene delivers one price, and the film's one turn (the coupon and the receipt) is the sum of the earlier prices. Native moves used: slam-in, strike and answer, starburst sticker, draining stock bar, coupon tear, receipt adds up, grid of cards, countdown clock, button press.

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0-4.0 | burst, MANGO LANE, band, sticker, date chip, marquee | punch on each slam | slam-in on eighths |
| 2 | 4.0-8.0 | kettle card, $48 struck, $29 on a white burst, -40% | punch on strike and price | strike and answer |
| 3 | 8.0-12.0 | headphones + lamp, plus sign, $178 struck, 2 FOR $99 | punch on plus and price | bundle |
| 4 | 12.0-20.0 | backpack, $65 to $39, stock bar 24 to 3, ONLY 3 LEFT, LIMITED | growing shake per drained cell | draining stock bar |
| 5 | 20.0-26.0 | coupon, perforation, stub peels and falls | big punch on the rip | coupon tear; silence 22.4-23.0 |
| 6 | 26.0-30.0 | receipt rows, total struck, YOU SAVE $134, coins | punch on the register ring | receipt adds up |
| 7 | 30.0-34.0 | six cards into a grid, each with a struck price | small punch per card | grid of cards |
| 8 | 34.0-40.0 | SALE STARTS IN, clock 00:06.00 to 00:00.00, red/ink flip per second | punch each second, larger for the last three | countdown; silence 39.5-40.0 |
| 9 | 40.0-43.0 | burst, SALE IS LIVE!, confetti, coins | biggest punch and shake | release |
| 10 | 43.0-50.0 | end card, cursor, SHOP NOW pressed, ripple, confetti | punch on the click | button press |

## Score structure

120 BPM, 4/4 (bar 2 s), C major hook (C G Am F). Bars 0-5: full groove with the marimba hook (doubled an octave up from bar 4). Bars 6-9 (stock): minor (Am F Am G), 16th hats, pad, a riser through bar 9, a held chord on ONLY 3 LEFT; a one-beat gap before the coupon. Bars 10-12: no drums, bass and plucks, the hook in fragments; everything stops at the rip and returns after half a second; a snare roll builds into the receipt. Bars 13-16: full groove, hook doubled. Bars 17-19: a kick on every beat, the snare roll quickens (quarters, eighths, sixteenths), a rising tone; dropout at 39.5. Bars 20-23: groove with brass on the hook. Bar 24: a C major cadence, a bell arpeggio and a long tail. Effects are placed from `events.json` (about 110 events), music ducks 30 % under the big ones, bus compressed and limited, -14 LUFS at the mux.

## Palette & props

Signal red `#ff2a1f`, sale yellow `#ffd90f`, ink `#17110d`, cream `#fff8e6`; product accents orange, teal, blue, green. Anton and Barlow Condensed. Goods: Pebble Kettle $48 to $29; Halo Headphones + Dot Lamp $178 to $99; Trail Pack $65 to $39; Sun Mug, Fern Pot, Flask, Note Set, Mini Speaker, Rain Umbrella; coupon MANGO10 (-$10). Totals: $291 to $157, saved $134 (all arithmetic in `timeline.js`).

## End card

Shop name, UP TO 60% OFF, the dates, SHOP NOW, `mangolane.example/sale`, and the line "MANGO LANE IS A FICTIONAL SHOP · NO REAL OFFER", held about 4 s after the click. No LemoLab sign-off.

## Build notes

Files in `demo/`: `index.html`, `main.js` (page contract, hit list for camera and sound, wipes and flashes, `TEXTS`), `timeline.js`, `draw.js`, `scenes.js`, `mix.py`, `build.sh`, `CREDITS`, `TREATMENT.md`.

`sh styles/flash-sale/demo/build.sh` (core tier only; no voice) runs: events export, reading check, mix, render (about four minutes with two workers), mux, styleframe and poster.

Pitfalls tied to this demo: `TEXTS` renders the frame and returns what the scenes recorded, so any text drawn through `draw.js text()` is checked automatically; the ticker bands and the running clock digits are drawn without being reported (decorative, or changing every frame; the label "SALE STARTS IN" and the date line carry the meaning); rolling numbers are reported once settled; texts are withheld during starburst wipes and flash frames. A text that lands less than (characters / 15 + 1.5) s before the end of its scene fails the reading check: land the important ones in the first second of a scene.
