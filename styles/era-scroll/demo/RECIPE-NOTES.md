# Era Scroll: recipe notes (engine API, for a fast-mode recipe)

Files: `timeline.js` (pace and schedule) · `scroll.js` (engine) · `eras1-3.js` (painters) · `main.js` (assembly) · `mix.py` (sound) · `lines.json` (narration) · `build.sh`.

## timeline.js
- Constants: `W,H=1920x1080`, `V=300` px/s walker speed, `WSX=640` walker screen x, `GY=832` ground y, `FRONT=46` (the edge "meets" the walker this far ahead of the feet), `BPM=72` (`BEAT`, `BAR`), `STRIDE=250` px per walk cycle (one step every 125 px = every half beat).
- `ERA_IDS` order; `GAP[k]` pause after line k; `C[k]` (k=2..9, 1-based) = time the edge of era k meets the walker, snapped UP to a beat: `C[k] = ceil((S[e_k] + LEAD)/BEAT)*BEAT`, `LEAD=1.6`, then `S[e_k] = C[k] - LEAD` (the line starts 1.6 s before its edge reaches the walker). `S[e_k+1] = S[e_k] + DURS[e_k] + GAP[k]`.
- `B[i]` era start in world x = `V*C[i+1] + FRONT` (era 0 starts at -2600); `Wd[i]` widths; `wxAt(t)` walker world x (constant pace, ease to a stop at `T_STOP`); `T(k, lx)` time the feet reach local x `lx` of era k; `lxAfter(beats)` local x `beats` after the edge met the walker (use it to place gags on beats); `plateSwap(k)` when the next edge crosses the plate; `PLATES[k] = {y, c}` year and caption.
- Ending schedule: `TS` stop, `T_LIFT`, `T_GRID`, `T_END`, `DUR`.

## scroll.js
- `drawWorld(g, {t, wx, eras, zoom, zy})` returns the per-era contexts. Eras are painted right to left; each (except the last) is clipped by the torn edge `x < x0+w-cam + edgeDx(seed,y)`, after a shadow (9 offset strokes) and before a rim (22 px stroke in `era.rim`, inner hairline) and fibres (hashed short strokes). Then `walker(...)`, `era.held(g,c,J)`, `era.fg(g,c)` are drawn inside the clip.
- `walker(g, {x,y,wx,t,pose,style,tag,look,scale,phase})` returns joints `{hip,SH,NK,HD,aN,aF,bag}`. Rig: legs two-bone from a phase `wx/STRIDE*TAU` (foot-planted, hip height from the lower foot), arms FK swing blended to IK targets, trailing neckwear, bag swing, blink. `pose`: `{stop, crouch, hop, lean, look, brow, mouth, armN:{x,y,w}, armF, bag, flut, drop}` (screen-space targets, `w` = blend 0..1). `style`: `{id, line, lw, rim, rw, ramp:[hex...], post, off:[dx,dy], pal, pixel:n}`; `ramp` maps luminance to colours (the era's re-tint of the whole figure), `pixel:n` draws small, quantises to the ramp and scales up by n. **Who walks is the `look` object (next section); `style.pal` re-tints only the demo's courier (it is ignored when a `look` is given).**
- `mkCtx(e,k,t,wx)` -> `c`: `c.X(lx,p)` local x to screen x (p = parallax 1 ground, <1 far), `c.vis(p,pad)` visible local range, `c.at(g,p,(a,b)=>{...})` draw in local x (translated), `c.gp(i)` progress 0..1 of gag i (from the walker's world x), `c.wlx` walker local x, `c.cam`, `c.t`.
- `burst(g, era, tc, wx, seed, zoom)` era particles, `tc` = seconds since the edge met the walker; `era.burst = {n,size,g,spin,draw(g,s,i,p,r)}`. `plate(g, cur, prev, p, {serif,sans})` odometer flip. Helpers: `bake(key,w,h,fn)` cache, `noiseTile(seed,size,cells,oct)` + `texFill(g,tile,x,y,w,h,{alpha,op,ox,scale})`, `hatch`, `blob`, `rr`, `mixc`, `rgba`, `tagCard(g,{fill,line,w,h,r},icon)`, `bell(p,a,b,c,d)`.

## The protagonist: `look` (design it from the topic, never reuse the demo's courier)
The demo's courier (round head, cap, red scarf, satchel, message tag) is the DEMO's character and the engine's default when no `look` is passed. A film of your own always passes a `look` built from its topic: a monk, a chef, an astronaut, a robot, a queen, a child with a dog. The invariant of the style is one consistent protagonist, constant pace, recognisable in every era; the figure itself is yours. Start from the engine, not from `start_from_demo`'s era files: their `walk.pal`, `token` and `held` belong to the courier.

Pass `look` once to `drawWorld(g, {t, wx, eras, zoom, look: LOOK, companions: CPS})` (also in the `now.snap` thumbnails). ANY look is a blank figure: unlisted hat, neck, bag and held item are `none`, hair is `short`, so nothing of the courier leaks in. `COURIER_LOOK` is the courier written as a look (pixel-identical to no look).
```
head:   {shape:'round'|'oval'|'square', size:1, skin, skin2, cheeks: hex | false}
hair:   'none'|'short'|'bun'|'topknot'|'long'|'braid'|'ponytail'            (+ color)  e.g. {kind:'bun', color:'#8a3a1a'}
hat:    'none'|'cap'|'bamboo'|'conical'|'beanie'|'hood'|'crown'|'helmet'|'bubble'|'chef'|'beret'|'headphones'   (+ color, color2, size, plume)
neck:   'none'|'scarf'|'cape'|'collar'                                      (+ color, color2, len, flow, width)
outfit: 'jacket'|'robe'|'dress'|'suit'|'armor'|'overalls'|'shorts'|'space'|'robot'   (+ color, color2, pants, pants2, shoe, belt, trim, tie, hands, length:'knee'|'ankle')
bag:    'none'|'satchel'|'backpack'|'scroll'|'basket'                       (+ color, color2, size)
held:   'none'|'staff'|'lantern'|'phone'|'book'|'scroll'|'sword'            (+ color, color2, top:'ring'|'knob', length) | {draw:(g, hand, env) => {}}
face:   {eyes:'dot'|'round'|'closed'|'led'|'visor'|'none', mouth:'curve'|'smile'|'flat'|'grille'|'none', glasses:'round'|'square'|'shades', beard:'stubble'|'short'|'long'|'moustache', beardColor, brows, nose, color}
body:   {scale:1, width:1, stride}      (stride defaults to scale so feet stay planted)
extras: ['antenna', 'headband']
```
Colours are hex and pass through the era's `ramp` (that is the per-era re-tint); the walk cycle, rim light and outline never change. A kind that takes only a name can be a string. Staff, sword, book and phone are gripped in front of the body; a `pose.armN` target still wins. The message tag (`era.token`) hangs from the bag anchor at the hip whatever the bag is; leave `token` out unless the story needs it.

**Worked example, a monk** (little monk in a bamboo hat and a saffron robe, a scripture roll on his back, a staff):
```js
const MONK = { head:{skin:'#e9b98c'}, hair:'none', hat:{kind:'bamboo', color:'#d8b46a', color2:'#9a7a3a'}, neck:'none',
  outfit:{kind:'robe', color:'#d98a1c', belt:'#8a2f20', trim:'#8a2f20', pants:'#d98a1c', shoe:'#5a3a28'},
  bag:{kind:'scroll', color:'#efe3b8', color2:'#8a2f20'}, held:{kind:'staff', color:'#8b6a43', top:'ring'},
  face:{eyes:'closed', mouth:'smile'} };
const CPS = [{kind:'dog', dx:-190, t0:3, color:'#c58a4a'}, {kind:'bot', dx:-340, t0:20}];
```
**Per-era outfit**: an era painter may carry `look: {...}` to override parts: the same `kind` merges fields, a different `kind` replaces the whole part. `tablet.look = {hat:{kind:'hood', color:'#7a4a2a'}}` (monk in a hood in the winter era); `now.look = {outfit:{kind:'suit', color:'#2d3a55', pants:'#2d3a55'}, hat:'none', hair:{kind:'short', color:'#2a2018'}, bag:'backpack', held:'phone'}` (the same walk, modern clothes). Identity (head, skin, build, signature colour) should survive every change.

**Companions**: `{kind:'dog'|'cat'|'bot'|'human', look (for 'human'), color, color2, dx, t0, t1, dur, scale, phase, front}`. `dx` is the screen offset from the hero (negative = behind, the default -170), `t0` the time it joins (it walks in from the left over `dur` = 2.4 s), `t1` the time it falls out of frame. Feet are planted to the ground (phase from world x), so companions never slide. Per era, `era.companions = []` hides them, an array replaces them. Use 'human' with `scale: .7` for a child or a sidekick.

## An era painter
```js
export const seeds = { id:'seeds', paper:'#e8f0d0', rim:'#f8fbe8', camLx:1100,
  gags:[{x:lxAfter(2), len:400}, {x:lxAfter(5), len:500}],          // local x where the gag starts, length in px
  walk:{id:'seeds', line:'#1f3a22', lw:4, rim:'#f8fbe8', rw:3, pal:{scarf:'#f0d060'}},
  step:'grass', push:{b0:2,b1:4,z:1.2},                              // sound surface; optional push-in in beats after the edge
  burst:{n:40,size:14,g:400,draw:(g,s,i)=>{g.fillStyle='#5a9a4a'; g.beginPath(); g.ellipse(0,0,s*.4,s,0,0,6.28); g.fill();}},
  token:g=>tagCard(g,{fill:'#f4f8e0',line:'#1f3a22'},g=>{/* icon centred on 0,0 */}),
  pose:c=>({armN:{x:c.X(2400),y:700,w:bell(c.gp(0),.1,.4,.6,.9)}}),   // reach to a prop at local x 2400
  bg(g,c){ /* sky fill, c.at(g,.5,(a,b)=>{ for (let i=a/300|0; i<b/300; i++) ... }), ground, props, gag reactions via c.gp(i) */ },
  fg(g,c){}, held(g,c,J){}, events(k){ ev(T(k,this.gags[0].x+200),'pickup',.8); } };
```
Rules: three layers at least (far .3 to .6, mid .8, ground 1.0), iterate tiles by `hash(index)`, keep the walker's feet on `GY`, everything a function of `c.t` and `c.wlx`.

## Steps and timings
1. `lines.json` (one line per era plus intro and outro) -> `tts_zh.py` -> `asr_check.py` (`asr` field for accepted mishearings).
2. `timeline.js` reads `voices/dur.json`; edit `GAP` and `ERA_IDS`; era length = D = dur + gap snapped to beats (6 to 9 s each at 300 px/s).
3. Edge timing: it enters at the right 4.1 s before it meets the walker, passes the plate 3.5 s before, particles run 1.6 s from the meeting.
4. `main.js`: list painters in `ERAS`, assign `x0 = B[i]`, `w = Wd[i]`; `now.snap` renders each painter alone at `SNAP_T[k]` for thumbnails; `zoomAt(t)` push-ins; `TEXTS` reports plate and message texts.
5. `events.mjs` (exports `EV`), `readcheck.mjs`, `mix.py` (reads `events.json`, writes `mix.wav` and the `.srt`), `video.mjs --resume`, `mux.sh ... 24 0`.

## Pitfall: timeline entries without a line
Every `S[id]`, `E[id]` and `DURS[id]` in the timeline must correspond to a real line in `lines.json`. Do NOT add a fallback duration (such as 6 s) for a line you did not write: the closing sequence (stop at the wall, lift, grid, end card) is timed from the closing line, so a missing closing line leaves seconds of nearly empty screen. Write the closing line, or cut the closing sequence down to the time it really needs (about 2 s of hold).

## Pitfall: an era that draws nothing at t = 0
Every era painter must draw a visible world, including the first one: a dark flat "prologue" with only the plate and the subtitle is a failure. From t = 0 there are background layers (at least three), props, the protagonist and something moving.
