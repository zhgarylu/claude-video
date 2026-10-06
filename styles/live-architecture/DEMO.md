# Live Architecture Diagram — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *What Happens When You Open a Web Page* (56 s, 16:9) · `live-architecture.mp4` · source in [`demo/`](demo/)

## Story & structure

Logline: one request leaves your browser and makes seven stops before a page comes back; every stop is a place the answer might already exist, and the closer it is found the faster the page.

Arc: **hook** (a single browser, "a long road behind a blink") → the road, step by step: **ask for the address** (DNS) → **secure handshake with the edge** → **the edge already has the static things** (hit) → **dynamic content goes inward** to the load balancer → **a server is picked** (a second request goes to the other one) → **cache first** (hit) → **cache miss, database, store a copy** → **the answer returns the same way** → **the rule**: answer as early as you can; near is fast, far is slow (closing bar).

Native moves spent: light the path, same road other colour (every reply), hit and miss badges, fork (two servers), dive and resurface (the machine room), closing bar.

## Scenes

One scene; the map builds as it is talked about.

| Time | Content | Camera |
|---|---|---|
| 0.5 to 4.6 | the browser appears in its zone; title and caption | overview |
| 5 to 9.4 | DNS appears; "example.com?" goes out, "IP 地址" comes back | overview |
| 9.7 to 14 | the edge node appears; handshake, certificate, encrypted channel | overview |
| 14 to 19 | a static request is answered by the edge: green HIT badge | overview |
| 19.5 to 24 | a dynamic request goes through the edge to the load balancer; the machine room opens | dive into the machine room at about 22 s |
| 24 to 27.5 | two servers; the request goes to A, the next to B | dive |
| 27.5 to 32.5 | a cache appears; "have you got it?" "yes" with a hit badge | dive |
| 32.5 to 37.5 | the database appears; the miss, the query, the result, a copy stored | dive |
| 37.5 to 41.5 | the page data goes back along the same road | pulls back to the overview at about 40 s |
| 41.5 to 46 | three badges say what each layer stopped | overview |
| 46 to 54 | the closing bar: near is fast, far is slow; the plucked chord | overview |

Leg timings are offsets from the start of the line that names them; the line starts come from `voices/dur.json`, so the film re-times itself when a line changes.

Times in the tables are from the first (slightly faster) voice and drift by a few seconds at normal speed; the film re-times itself from the voice (`voices/dur.json`).

## Score structure

100 BPM, A minor family (Am, F, C, G). A pad on each chord, a plucked bass on beats 1 and 3, a plucked figure from bar 2, thickening over six bars. Foley per event as in STYLE.md. Music ducks 45 % under the voice. -14 LUFS, true peak about -2 dBFS.

## Palette & props

Ground `#0d1220`, panel `#161f33`, line `#2b3a5c`, text `#eaf0fb`, dim `#8d9bb8`; cyan `#4cd3f2`, amber `#ffb454`, mint `#55e3ab`, coral `#ff7b7b`, violet `#a98bff`. Props: seven node types with line icons (browser, DNS list, CDN globe, load-balancer fork, server, cache bolt, database cylinder), three zones, seven connectors, packets with labels.

## Build notes

`sh styles/live-architecture/demo/build.sh` (needs a network once, for the edge-tts voice and the Google Fonts).

- `arch.js` is the engine: `backdrop`, `node`, `edge` (orthogonal polylines with rounded corners that draw on), `packet`, `badge`, `zone`, `icon`, `pat` (a point and heading along a polyline).
- `main.js` holds the diagram data (`N` nodes, `E_` edges, `ZONES`), the journey (`LEGS`, `TAGS`, `CAM`) as offsets from voice lines, the HUD and the caption.
- `timeline.js` turns `lines.json` and `voices/dur.json` into start times.
- `mix.py` places the narration (events of type `voice`), the score and the UI foley.
- Voice: edge-tts `zh-CN-YunjianNeural`; line `l5` has an `asr` field because the speech check hears 负载均衡 as 附在均衡.
- `readcheck` flags the voice-synced captions as shorter than reading time; this is known. The badges were lengthened until it stopped flagging them.

Pitfalls met here: the narration files are 24 kHz and the mix is 48 kHz: placing them without resampling plays the voice at double speed and an octave up (the speech check does not notice, it reads the raw files), so `mix.py` resamples with `soxr`; node and connector coordinates had to be shifted when the zone titles and the step line collided; a camera dive centred too low hid the database under the caption (fixed by centring at y=600 and 1.18×); a closing bar placed under the caption was hidden (zones shortened to leave a lane); a held frame at the start was reported as frozen until the particles and the node breathing were added.
