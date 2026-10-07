# Era Scroll: recipe notes (engine API, for a fast-mode recipe)

Files: `timeline.js` (pace and schedule) · `scroll.js` (engine) · `eras1-3.js` (painters) · `main.js` (assembly) · `mix.py` (sound) · `lines.json` (narration) · `build.sh`.

## timeline.js
- Constants: `W,H=1920x1080`, `V=300` px/s walker speed, `WSX=640` walker screen x, `GY=832` ground y, `FRONT=46` (the edge "meets" the walker this far ahead of the feet), `BPM=72` (`BEAT`, `BAR`), `STRIDE=250` px per walk cycle (one step every 125 px = every half beat).
- `ERA_IDS` order; `GAP[k]` pause after line k; `C[k]` (k=2..9, 1-based) = time the edge of era k meets the walker, snapped UP to a beat: `C[k] = ceil((S[e_k] + LEAD)/BEAT)*BEAT`, `LEAD=1.6`, then `S[e_k] = C[k] - LEAD` (the line starts 1.6 s before its edge reaches the walker). `S[e_k+1] = S[e_k] + DURS[e_k] + GAP[k]`.
- `B[i]` era start in world x = `V*C[i+1] + FRONT` (era 0 starts at -2600); `Wd[i]` widths; `wxAt(t)` walker world x (constant pace, ease to a stop at `T_STOP`); `T(k, lx)` time the feet reach local x `lx` of era k; `lxAfter(beats)` local x `beats` after the edge met the walker (use it to place gags on beats); `plateSwap(k)` when the next edge crosses the plate; `PLATES[k] = {y, c}` year and caption.
- Ending schedule: `TS` stop, `T_LIFT`, `T_GRID`, `T_END`, `DUR`.

## scroll.js
- `drawWorld(g, {t, wx, eras, zoom, zy})` returns the per-era contexts. Eras are painted right to left; each (except the last) is clipped by the torn edge `x < x0+w-cam + edgeDx(seed,y)`, after a shadow (9 offset strokes) and before a rim (22 px stroke in `era.rim`, inner hairline) and fibres (hashed short strokes). Then `walker(...)`, `era.held(g,c,J)`, `era.fg(g,c)` are drawn inside the clip.
- `walker(g, {x,y,wx,t,pose,style,tag})` returns joints `{hip,SH,NK,HD,aN,aF,bag}`. Rig: legs two-bone from a phase `wx/STRIDE*TAU` (foot-planted, hip height from the lower foot), arms FK swing blended to IK targets, scarf chain, satchel swing, blink. `pose`: `{stop, crouch, hop, lean, look, brow, mouth, armN:{x,y,w}, armF, bag, flut, drop}` (screen-space targets, `w` = blend 0..1). `style`: `{id, line, lw, rim, rw, ramp:[hex...], post, off:[dx,dy], pal:{scarf,cap,coat,skin,...}, pixel:n}`; `ramp` maps luminance to colours, `pal` overrides parts, `pixel:n` draws small, quantises to the ramp and scales up by n.
- `mkCtx(e,k,t,wx)` -> `c`: `c.X(lx,p)` local x to screen x (p = parallax 1 ground, <1 far), `c.vis(p,pad)` visible local range, `c.at(g,p,(a,b)=>{...})` draw in local x (translated), `c.gp(i)` progress 0..1 of gag i (from the walker's world x), `c.wlx` walker local x, `c.cam`, `c.t`.
- `burst(g, era, tc, wx, seed, zoom)` era particles, `tc` = seconds since the edge met the walker; `era.burst = {n,size,g,spin,draw(g,s,i,p,r)}`. `plate(g, cur, prev, p, {serif,sans})` odometer flip. Helpers: `bake(key,w,h,fn)` cache, `noiseTile(seed,size,cells,oct)` + `texFill(g,tile,x,y,w,h,{alpha,op,ox,scale})`, `hatch`, `blob`, `rr`, `mixc`, `rgba`, `tagCard(g,{fill,line,w,h,r},icon)`, `bell(p,a,b,c,d)`.

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
