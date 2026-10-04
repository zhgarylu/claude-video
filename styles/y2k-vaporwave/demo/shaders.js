// Y2K / Vaporwave: the software pipeline in three GLSL passes.
//   A  SCENE   : raymarched world (banded sun sky, scrolling grid / checker floor, chrome puffy type, liquid-metal blobs,
//                procedural marble bust + fluted columns). Chrome = environment mapping of the same sky function.
//                Writes colour in rgb and hit distance in alpha (RGBA16F).
//   B  COMPOSE : translucent candy bubbles (analytic spheres, refraction by sampling pass A), bloom from mips, lens flare,
//                then the 2D UI canvas (windows, palms, sparkles, captions) over everything.
//   C  POST    : glitch slices, VHS tracking, JPEG-style chroma blocking, scanlines, ordered dither to a reduced palette.
export const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p*.5+.5; gl_Position = vec4(p,0,1); }`;

const COMMON = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 uv; out vec4 o;
uniform vec2 uRes; uniform float uT;
uniform vec3 uCamPos, uCamTgt; uniform float uFov, uRoll;
float hash11(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec3 camRay(vec2 q, out vec3 ro){
  ro = uCamPos; vec3 f = normalize(uCamTgt-uCamPos);
  vec3 up = vec3(sin(uRoll), cos(uRoll), 0.);
  vec3 r = normalize(cross(f, up)); vec3 u = cross(r, f);
  vec2 p = (q*uRes*2.-uRes)/uRes.y;
  return normalize(p.x*r + p.y*u + f/tan(uFov*.5));
}
`;

export const SCENE = COMMON + `
uniform float uSunY, uFloorMode, uScroll, uBeat;
uniform sampler2D uTextSDF; uniform vec3 uTextPos; uniform vec2 uTextSize, uTextRS; // size in world, (rot, scale)
uniform float uTextOn, uTextR, uTextT, uTexPx;
uniform vec4 uBust;      // xyz pos, scale (0 = off)
uniform float uBustRot;
uniform vec4 uCol0, uCol1;   // xyz pos, scale (0 = off)
uniform vec4 uBlob;      // xyz centre, radius (0 = off)
uniform vec3 uHaze;

const float PI = 3.14159265;
float sat1(float x){ return clamp(x,0.,1.); }
vec3 sat3(vec3 x){ return clamp(x,0.,1.); }
float smin(float a, float b, float k){ float h = max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
float smax(float a, float b, float k){ return -smin(-a,-b,k); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }
float sdEll(vec3 p, vec3 r){ float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.)/k1; }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
vec3 rotY(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z); }

// ---------- sky and environment (also what chrome reflects) ----------
float sunMask(vec2 t, float sy){
  float R = .36; vec2 c = vec2(0., sy); float d = length(t-c);
  float g = (t.y-(c.y-R))/(2.*R);
  float k = clamp((.85-g)/.85, 0., 1.);
  float cut = step(fract(g*15.), .10 + .74*k*k) * step(g, .85);
  return (1.-cut) * (1.-smoothstep(R-.006, R, d)) * step(0., g);
}
vec3 sunCol(vec2 t, float sy){
  float R = .36; float g = (t.y-(sy-R))/(2.*R);
  float k = smoothstep(.5,-.25,sy);
  vec3 top = mix(vec3(1.0,.93,.42), vec3(1.0,.60,.28), k), mid = mix(vec3(1.0,.52,.30), vec3(1.0,.30,.42), k), bot = mix(vec3(1.0,.16,.62), vec3(.85,.10,.60), k);
  return g>.5 ? mix(mid, top, clamp((g-.5)*2.,0.,1.)) : mix(bot, mid, clamp(g*2.,0.,1.));
}
vec3 gridCol(vec2 xz, float dist, float px){
  // xz in world units, lines every 1.0 (major every 4)
  vec2 g = abs(fract(xz-.5)-.5);
  float w = .018 + px*1.2;
  vec2 l = 1.-smoothstep(vec2(w*.5), vec2(w*1.6+px), g);
  float line = max(l.x,l.y);
  vec2 g2 = abs(fract(xz*.25-.5)-.5)*4.;
  vec2 l2 = 1.-smoothstep(vec2(w*.9), vec2(w*2.4+px), g2);
  float major = max(l2.x,l2.y);
  vec2 gl = exp(-g*vec2(7.));
  float glow = max(gl.x,gl.y)*.35;
  vec3 cy = vec3(.25,.95,1.), mg = vec3(1.,.28,.82);
  vec3 lc = mix(cy, mg, sat1(abs(xz.x)*.04));
  vec3 base = mix(vec3(.10,.03,.30), vec3(.35,.08,.55), exp(-dist*.05));
  vec3 c = base + lc*(glow*.55 + line*.95) + vec3(1.)*major*.18;
  float fade = exp(-dist*.028);
  return mix(uHaze, c, fade);
}
vec3 envSky(vec3 d){
  float h = d.y;
  float az = atan(d.x, -d.z);
  vec3 c;
  if (h >= 0.) {
    float s = pow(sat1(h*1.15), .62);
    vec3 c0 = vec3(1.0,.62,.80), c1 = vec3(1.0,.38,.78), c2 = vec3(.58,.34,1.0), c3 = vec3(.20,.12,.70), c4 = vec3(.07,.03,.30);
    c = s<.12 ? mix(c0,c1,s/.12) : s<.40 ? mix(c1,c2,(s-.12)/.28) : s<.75 ? mix(c2,c3,(s-.4)/.35) : mix(c3,c4,(s-.75)/.25);
    // cyan veil that drifts across the middle sky
    float cyW = smoothstep(.16,.36,h) * (1.-smoothstep(.45,.85,h)) * smoothstep(-.6,.7, sin(az*1.3+.7));
    c = mix(c, vec3(.28,.92,1.0)*.9, cyW*.65);
    // posterised streak clouds
    float cl = fbm(vec2(az*3.2 + uT*.012, h*34.)) ;
    float lev = floor(cl*4.)/4.;
    float cm = smoothstep(.05,.2,h)*(1.-smoothstep(.35,.6,h));
    c += vec3(1.,.55,.85)*max(lev-.35,0.)*cm*.55;
    // stars
    vec2 sg = vec2(az*190., h*190.); vec2 si = floor(sg);
    float hs = hash21(si);
    float star = step(.9965, hs) * smoothstep(.2,.5,h) * (.6+.4*sin(uT*3.+hs*60.));
    star *= 1.-smoothstep(.35,.5,length(fract(sg)-.5)*1.);
    c += vec3(1.,.95,1.)*star;
    // sun
    if (d.z < 0.) {
      vec2 t = d.xy/(-d.z);
      float m = sunMask(t, uSunY);
      c = mix(c, sunCol(t, uSunY), m);
      float dd = length(t-vec2(0., uSunY));
      c += vec3(1.,.36,.62)*exp(-max(dd-.3,0.)*4.5)*.30 * (1.-m);
    }
    c = mix(c, uHaze, exp(-h*26.)*.8);
  } else {
    float tt = -1./d.y;                  // plane 1 below the camera
    vec2 xz = d.xz*tt; xz.y += uScroll;
    c = gridCol(xz, tt, .0);
    c = mix(uHaze*.5, c, exp(-tt*.02));
    c *= .38;
  }
  return c;
}

// ---------- geometry ----------
float sdText(vec3 p){
  if (uTextOn < .001) return 1e3;
  vec3 q = p-uTextPos; q = rotY(q, uTextRS.x); q /= uTextRS.y;
  vec2 uvq = vec2(q.x/uTextSize.x+.5, .5-q.y/uTextSize.y);
  vec2 cu = clamp(uvq, .003, .997);
  float d = texture(uTextSDF, cu).r * uTexPx;
  d += length((uvq-cu)*uTextSize);
  vec2 w = vec2(d+uTextR, abs(q.z)-(uTextT-uTextR));
  float sd = min(max(w.x,w.y),0.)+length(max(w,0.))-uTextR;
  return sd*uTextRS.y;
}
float sdBlob(vec3 p){
  if (uBlob.w < .001) return 1e3;
  float R = uBlob.w; vec3 q = p-uBlob.xyz;
  float t = uT;
  vec3 a = R*.55*vec3(sin(t*.9), cos(t*.7+1.), sin(t*.6+2.));
  vec3 b = R*.55*vec3(sin(t*.8+2.1), cos(t*1.1+.3), sin(t*.5+4.));
  vec3 c = R*.55*vec3(cos(t*.7+4.), sin(t*.9+1.7), cos(t*.8+.6));
  float d = length(q-a)-R*.62;
  d = smin(d, length(q-b)-R*.55, R*.7);
  d = smin(d, length(q-c)-R*.5, R*.7);
  d = smin(d, length(q)-R*.5, R*.6);
  d += .012*R*sin(q.x*9.+t*1.3)*sin(q.y*8.-t)*sin(q.z*7.);
  return d;
}
float sdBustLocal(vec3 q){
  // abstract head-and-hair silhouette: a blank egg, a swept hair mass, no face features
  float head = sdEll(q-vec3(0,1.58,0), vec3(.40,.50,.43));
  float jaw  = sdEll(q-vec3(0,1.27,.06), vec3(.26,.27,.30));
  float h = smin(head, jaw, .2);
  float hair = sdEll(q-vec3(0,1.76,-.10), vec3(.47,.44,.52));
  hair += .02*sin(atan(q.x,q.z+.1)*9.+q.y*14.)*smoothstep(1.4,1.9,q.y);
  hair = smax(hair, -(q.y-1.58+.35*(q.z+.1)), .06);               // the hairline sweeps back, leaving a blank face plane
  float bun = sdEll(q-vec3(0,1.95,-.40), vec3(.2,.17,.2));
  h = smin(h, smin(hair, bun, .1), .04);
  float neck = sdCap(q, vec3(0,.5,-.01), vec3(0,1.2,0), .16);
  h = smin(h, neck, .09);
  float ch = sdEll(q-vec3(0,.30,0), vec3(.74,.30,.36));
  ch = smin(ch, sdEll(q-vec3(0,.56,-.02), vec3(.46,.22,.28)), .14);
  ch = smax(ch, -q.y, .02);
  h = smin(h, ch, .1);
  return h;
}
float sdBust(vec3 p){
  if (uBust.w < .001) return 1e3;
  vec3 q = rotY(p-uBust.xyz, uBustRot)/uBust.w;
  float h = sdBustLocal(q)*uBust.w;
  float ped = sdBox((p-uBust.xyz)-vec3(0,-.55*uBust.w,0), vec3(.5,.55,.5)*uBust.w) - .02;
  return min(h, ped);
}
float sdColumn(vec3 p, vec4 c){
  if (c.w < .001) return 1e3;
  vec3 q = (p-c.xyz)/c.w;
  float a = atan(q.z,q.x), r = length(q.xz);
  float fl = .018*(1.-pow(abs(sin(a*8.)),.45));
  float rr = r-(.30+.012*(q.y-2.)*-.0)+fl;
  float shaft = max(rr, abs(q.y-2.05)-1.62);
  float base = max(max(abs(q.x),abs(q.z))-.40, abs(q.y-.12)-.12);
  float base2 = max(r-.34, abs(q.y-.30)-.06);
  float cap1 = max(r-(.36+.14*smoothstep(3.55,3.75,q.y)), abs(q.y-3.70)-.14);
  float cap2 = max(max(abs(q.x),abs(q.z))-.46, abs(q.y-3.90)-.09);
  float d = min(min(shaft,base),min(base2,min(cap1,cap2)));
  return d*c.w;
}
// material ids: 1 chrome text, 2 liquid metal, 3 marble bust, 4 column
vec2 mapObjs(vec3 p){
  float d = 1e3, m = 0.;
  float t = sdText(p);   if (t<d){ d=t; m=1.; }
  float b = sdBlob(p);   if (b<d){ d=b; m=2.; }
  float u = sdBust(p);   if (u<d){ d=u; m=3.; }
  float c0 = sdColumn(p,uCol0); if (c0<d){ d=c0; m=4.; }
  float c1 = sdColumn(p,uCol1); if (c1<d){ d=c1; m=4.; }
  return vec2(d,m);
}
vec3 calcN(vec3 p){
  vec2 e = vec2(.0025,0.);
  return normalize(vec3(mapObjs(p+e.xyy).x-mapObjs(p-e.xyy).x, mapObjs(p+e.yxy).x-mapObjs(p-e.yxy).x, mapObjs(p+e.yyx).x-mapObjs(p-e.yyx).x));
}
// returns t, writes material (0 = none)
float march(vec3 ro, vec3 rd, int steps, float tmax, out float mat){
  float t = .05; mat = 0.;
  for (int i=0;i<steps;i++){
    vec3 p = ro+rd*t; vec2 h = mapObjs(p);
    if (h.x < .0012*t){ mat = h.y; return t; }
    t += h.x*.9; if (t>tmax) break;
  }
  return -1.;
}
float softShadow(vec3 ro, vec3 rd){
  float res = 1., t = .06;
  for (int i=0;i<28;i++){ float h = mapObjs(ro+rd*t).x; res = min(res, 9.*h/t); t += clamp(h,.04,.5); if (res<.01||t>14.) break; }
  return sat1(res);
}
float calcAO(vec3 p, vec3 n){
  float o = 0., s = 1.;
  for (int i=0;i<4;i++){ float h = .04+.14*float(i); o += (h-mapObjs(p+n*h).x)*s; s *= .7; }
  return sat1(1.-1.6*o);
}

// ---------- shading ----------
vec3 chrome(vec3 rd, vec3 n, vec3 p){
  vec3 r = reflect(rd, n);
  r.y += (p.y-3.0)*.8 + n.y*.35; r = normalize(r);
  vec3 e = envSky(r);
  float L = dot(e, vec3(.3,.55,.15));
  e = mix(vec3(L), e, 1.45);                        // pushed saturation
  e = pow(max(e,0.), vec3(1.7))*1.6;             // contrast curve of liquid metal
  float f = pow(1.-sat1(dot(n,-rd)), 3.);
  vec3 rim = vec3(.35,.95,1.)*f*.5;
  float iri = .5+.5*sin(n.y*5.+n.x*3.+uT*.4);
  e = mix(e, e*vec3(.82,.95,1.2), iri*.35);
  // second, fake studio strip light on the top for the crisp white band
  float strip = smoothstep(.84,.92, r.y) * smoothstep(.0,.3, r.z+.4);
  e += vec3(1.,.97,1.)*strip*.7;
  e += vec3(1.,.95,1.)*smoothstep(.05,.0,abs(r.y-.02))*.85;   // the hot horizon line in the metal
  e = mix(e, vec3(.12,.04,.36), pow(1.-sat1(dot(n,-rd)),2.2)*.62);
  return e + rim;
}
vec3 marble(vec3 p, vec3 n, vec3 rd, float ao, float mat){
  vec3 q = p*2.3;
  float v = fbm(q.xy*1.4 + fbm(q.yz*2.1)*2.6 + q.z);
  float vein = smoothstep(.015,.0,abs(v-.5)-.0)*.9 + smoothstep(.04,.0,abs(fbm(q.zx*2.+3.)-.52))*.4;
  vec3 alb = mix(vec3(.96,.93,.98), vec3(.55,.55,.72), sat1(vein)*.7);
  vec3 L1 = normalize(vec3(-.55,.7,.85));  // front key, warm
  vec3 L2 = normalize(vec3(.8,.35,-.6));   // sun back rim, pink
  float sh = softShadow(p+n*.02, L1);
  float d1 = max(dot(n,L1),0.);
  float d2 = max(dot(n,L2),0.);
  vec3 sky = mix(vec3(.55,.35,.95), vec3(.30,.95,1.), sat1(n.y*.5+.5));
  vec3 col = alb*( vec3(1.,.84,.92)*d1*(.2+.8*sh)*.82 + vec3(1.,.35,.65)*d2*.85 + sky*.26*(.55+.45*n.y) )*ao;
  vec3 h = normalize(L1-rd); col += vec3(1.)*pow(max(dot(n,h),0.),48.)*.35*sh;
  float f = pow(1.-sat1(dot(n,-rd)),3.); col += vec3(.4,.9,1.)*f*.28;
  col = mix(col, envSky(reflect(rd,n))*.7, f*.12);
  return col;
}
vec3 floorShade(vec3 p, vec3 rd, float t){
  // grid <-> glossy checker, blended by uFloorMode
  vec2 xz = p.xz; xz.y += uScroll;
  float px = .0007*t;
  vec3 g = gridCol(xz, t, px);
  // sun glare path across the grid
  float glare = exp(-abs(p.x)*.28) * exp(-t*.02) * smoothstep(-.1, 1.4, uSunY+.35);
  g += vec3(1.,.4,.6)*glare*.28;
  vec3 cres = g;
  if (uFloorMode > .001) {
    vec2 cc = floor(p.xz*.8+vec2(0.,uScroll*.8));
    float chk = mod(cc.x+cc.y,2.);
    vec3 a = vec3(.93,.74,.95), b = vec3(.20,.10,.50);
    vec3 alb = mix(a,b,chk);
    float fw = .0007*t*1.6; vec2 gf = abs(fract(p.xz*.8+vec2(0.,uScroll*.8))-.5);
    // soften the far checkers into a haze
    float far = exp(-t*.045);
    vec3 n = vec3(0,1,0);
    float fres = .22 + .6*pow(1.-sat1(-rd.y), 4.);
    // reflection of objects + env
    vec3 rr = reflect(rd, n); float rm; float rt = march(p+n*.01, rr, 48, 30., rm);
    vec3 refl;
    if (rt > 0.) { vec3 rp = p+rr*rt; vec3 rn = calcN(rp);
      refl = rm<2.5 ? chrome(rr, rn, rp) : marble(rp, rn, rr, 1., rm);
    } else refl = envSky(rr);
    vec3 L1 = normalize(vec3(-.55,.7,.85));
    float sh = softShadow(p+vec3(0,.01,0), L1);
    vec3 lit = alb*(.55+.5*sh)*vec3(1.,.9,1.) + vec3(.1,.0,.2);
    vec3 col = mix(lit, refl, fres*(.9-.3*chk));
    col = mix(uHaze, col, mix(far,1.,.25));
    cres = mix(g, col, sat1(uFloorMode));
  }
  return cres;
}

vec3 shoulder(vec3 x){ vec3 hi = max(x-.82,0.); return min(x,vec3(.82)) + .18*(1.-exp(-hi/.18)); }
void main(){
  vec3 ro; vec3 rd = camRay(uv, ro);
  float mat; float t = march(ro, rd, 120, 80., mat);
  float tf = rd.y < -1e-4 ? -ro.y/rd.y : -1.;
  vec3 col; float depth;
  if (t > 0. && (tf < 0. || t < tf)) {
    vec3 p = ro+rd*t; vec3 n = calcN(p);
    if (mat < 2.5) col = chrome(rd, n, p);
    else { float ao = calcAO(p,n); col = marble(p, n, rd, ao, mat); }
    depth = t;
  } else if (tf > 0.) {
    vec3 p = ro+rd*tf; col = floorShade(p, rd, tf); depth = tf;
  } else { col = envSky(rd); depth = 200.; }
  col = mix(col, shoulder(col), 1.);
  o = vec4(col, depth);
}`;

export const COMPOSE = COMMON + `
uniform sampler2D uScene, uUI;
uniform vec4 uBub[6]; uniform vec3 uBubCol[6]; uniform int uBubN;
uniform vec2 uSunUV; uniform float uFlare, uBloom;
float sat1(float x){ return clamp(x,0.,1.); }
vec3 envSky(vec3 d){   // light copy of the sky gradient, for the bubble reflections
  float s = pow(sat1(abs(d.y)*1.15), .62);
  vec3 c = d.y>0. ? mix(mix(vec3(1.,.55,.85), vec3(.58,.34,1.), smoothstep(0.,.4,s)), vec3(.2,.12,.7), smoothstep(.4,1.,s)) : vec3(.18,.08,.42)+vec3(.2,.9,1.)*.15*step(.9,fract(d.x/(-d.y)*3.));
  return c;
}
void main(){
  vec3 ro; vec3 rd = camRay(uv, ro);
  vec4 sc = texture(uScene, uv);
  vec3 col = sc.rgb; float depth = sc.a;
  // bloom from mips
  vec3 bl = (textureLod(uScene, uv, 3.).rgb*.5 + textureLod(uScene, uv, 5.).rgb*.8 + textureLod(uScene, uv, 7.).rgb*.9);
  float bl_l = dot(bl, vec3(.3,.55,.15));
  col += bl*uBloom*.6*smoothstep(.8,1.8,bl_l+dot(col,vec3(.3,.55,.15))*.5);
  // candy bubbles (far -> near)
  vec3 Lk = normalize(vec3(-.55,.7,.85));
  for (int i=0;i<6;i++){
    if (i>=uBubN) break;
    vec3 c = uBub[i].xyz; float R = uBub[i].w;
    vec3 oc = ro-c; float b = dot(oc,rd); float h = b*b-(dot(oc,oc)-R*R);
    if (h<0.) continue;
    float t = -b-sqrt(h);
    if (t<0. || t>depth) continue;
    vec3 n = normalize(ro+rd*t-c);
    float ndv = sat1(dot(n,-rd));
    float F = pow(1.-ndv, 2.6);
    vec2 ruv = uv + n.xy*vec2(.045/(uRes.x/uRes.y),.045)*(R*1.4);
    vec3 tint = uBubCol[i];
    vec3 refr = texture(uScene, ruv).rgb;
    vec3 body = mix(refr*mix(vec3(1.),tint,.75), tint, .30);
    vec3 glow = tint*(.18+.9*pow(1.-ndv,1.8));
    float sp = pow(max(dot(reflect(rd,n),Lk),0.), 90.)*2.4;
    // window-shaped highlight, upper left
    vec2 hn = n.xy-vec2(-.38,.42);
    float win = smoothstep(.22,.09,length(hn*vec2(.8,1.6))) * .8 + smoothstep(.09,.03,length(n.xy-vec2(.46,-.46)))*.45;
    float caus = smoothstep(-.35,-.85,n.y)*smoothstep(.25,.0,length(vec2(n.x*.7,0.)))*.7;
    vec3 bcol = body + glow + vec3(1.)*(sp+win) + tint*caus*1.2 + envSky(reflect(rd,n))*F*.55;
    col = mix(col, bcol, mix(.72,.96,F));
  }
  // lens flare drifting from the sun position
  if (uFlare>0.001){
    vec2 asp = vec2(uRes.x/uRes.y,1.);
    vec2 pc = (uv-.5)*asp, sp = (uSunUV-.5)*asp;
    vec3 fl = vec3(0.);
    for (int i=0;i<5;i++){
      float k = float(i)*.55-.35; vec2 gp = sp - sp*2.*(k+.5)*.0 + (-sp)*k*1.3;
      float r = .05+float(i)*.022; float d = length(pc-gp);
      vec3 tc = i%2==0 ? vec3(.3,.9,1.) : vec3(1.,.4,.8);
      fl += tc*(smoothstep(r,r*.7,d)*.09 + smoothstep(.006,.0,abs(d-r*1.05))*.2);
    }
    float streak = exp(-abs(pc.y-sp.y)*38.)*exp(-abs(pc.x-sp.x)*1.6)*.35;
    fl += vec3(.8,.6,1.)*streak;
    float vis = smoothstep(-.1,.2,sc.a>150.?1.:0.0);
    col += fl*uFlare*(.4+.6*vis);
  }
  // 2D UI (premultiplied)
  vec4 ui = texture(uUI, vec2(uv.x, 1.-uv.y));
  col = col*(1.-ui.a) + ui.rgb;
  o = vec4(col,1.);
}`;

export const POST = COMMON + `
uniform sampler2D uSrc;
uniform float uGlitch, uVhs, uJpeg, uDither, uScan, uSeed, uVhsY;
float luma(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
vec3 ycc(vec3 c){ float Y=luma(c); return vec3(Y,(c.b-Y)*.564,(c.r-Y)*.713); }
vec3 rgbf(vec3 y){ return vec3(y.x+1.403*y.z, y.x-.344*y.y-.714*y.z, y.x+1.773*y.y); }
float bayer4(vec2 p){ ivec2 q = ivec2(mod(p,4.)); int i = q.x+q.y*4;
  int m[16] = int[16](0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5); return (float(m[i])+.5)/16.; }
void main(){
  vec2 px = 1./uRes; vec2 q = uv;
  float slot = floor(uT*24.);
  float gl = uGlitch;
  float rgbOff = 0.;
  if (gl > .001){
    float band = floor(q.y*26.);
    float hb = hash21(vec2(band, slot+uSeed));
    float hb2 = hash21(vec2(floor(q.y*7.), slot*1.7+uSeed));
    if (hb < gl*.55) { q.x += (hash21(vec2(band*3.1, slot))-.5)*.22*gl; rgbOff += .012*gl; }
    if (hb2 < gl*.3) { q.x += (hash21(vec2(slot, 4.))-.5)*.5*gl; }
    // blocky vertical displacement
    float blk = hash21(vec2(floor(q.x*9.), floor(q.y*5.)+slot));
    if (blk < gl*.12) q.y += (blk*8.-.5)*.05*gl;
    rgbOff += .004*gl;
  }
  // VHS tracking band travelling up + wobble
  float vh = uVhs;
  if (vh > .001){
    float bandY = uVhsY; float dd = q.y-bandY;
    float inb = smoothstep(.07,.0,abs(dd)-.02);
    q.x += inb*vh*(sin(q.y*180.+uT*50.)*.006 + (hash21(vec2(floor(q.y*240.),slot))-.5)*.03);
    q.x += vh*.0012*sin(q.y*30.+uT*3.);
    float bot = smoothstep(.08,.0,q.y);
    q.x += bot*vh*(hash21(vec2(floor(q.y*500.),slot))-.5)*.006;
  }
  // chroma/luma fetch with RGB split
  float ro_ = rgbOff + vh*.0008 + .0005;
  vec3 c;
  c.r = texture(uSrc, q+vec2(ro_,0.)).r; c.g = texture(uSrc, q).g; c.b = texture(uSrc, q-vec2(ro_,0.)).b;
  // JPEG-ish: chroma held per 8x8 block, luma slightly quantised
  if (uJpeg > .001){
    vec2 blkc = (floor(q*uRes/8.)+.5)*8./uRes;
    vec3 cb = vec3(0.);
    for (int i=0;i<4;i++){ vec2 o2 = vec2(float(i&1)-.5, float(i>>1)-.5)*7./uRes; cb += ycc(texture(uSrc, blkc+o2).rgb); }
    cb *= .25; vec3 y = ycc(c);
    y.yz = mix(y.yz, cb.yz, uJpeg);
    y.x = mix(y.x, floor(y.x*18.+.5)/18., uJpeg*.35);
    c = rgbf(y);
  }
  if (vh > .001){   // chroma smear + tape noise
    vec3 s = vec3(0.); for(int i=-3;i<=3;i++) s += ycc(texture(uSrc, q+vec2(float(i)*2.,0.)*px).rgb);
    s /= 7.; vec3 y = ycc(c); y.yz = mix(y.yz, s.yz, .7*vh); c = rgbf(y);
    float bandY = uVhsY; float inb = smoothstep(.06,.0,abs(q.y-bandY)-.015);
    float n = hash21(vec2(floor(q.x*uRes.x*.5), floor(q.y*uRes.y*.5)+slot*13.));
    c = mix(c, c*.7+vec3(n)*.45, inb*vh*.45*step(.5,n));
    c += (hash21(q*uRes+slot)-.5)*.012*vh;
  }
  // scanlines
  float sl = .5+.5*cos(q.y*uRes.y*3.14159);
  c *= 1.-uScan*(sl);
  // ordered dither to reduced levels
  float lv = uDither;
  if (lv > 1.){ float b = bayer4(gl_FragCoord.xy); c = floor(c*lv + b)/lv; c = c*(lv/(lv-0.)); }
  c = mix(c, c*vec3(1.02,.99,1.03), .5);
  o = vec4(clamp(c,0.,1.),1.);
}`;
