// glaze.js: the WebGL2 renderer that turns a painted texture + a lathe vessel into porcelain.
//   albedo  = white glaze (tint, age)  ⊕  cobalt colour ramp(density)  seen *through* the glaze (parallax + soft bleed)
//   shading = wrapped diffuse from a soft key/fill  +  Fresnel reflection of a studio of softboxes (clear glaze coat, orange-peel normals)
//   details = 3D crackle (Worley edges), iron speckle and dark pooled spots in the heavy blue, unglazed foot, lip wear, interior occlusion
// Everything is a function of the uniforms below; nothing carries over between frames.
import { M } from './vessel.js';

const VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aUV; layout(location=3) in float aKind;
uniform mat4 uVP, uModel;
out vec3 vObj, vNrm, vWorld; out vec3 vUV; out float vKind;
void main(){
  vObj = aPos; vNrm = mat3(uModel) * aNrm; vec4 w = uModel * vec4(aPos,1.0); vWorld = w.xyz; vUV = aUV; vKind = aKind;
  gl_Position = uVP * w;
}`;

const NOISE = `
float h31(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
vec3 h33(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }
float vn3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn3(p); p=p*2.03+7.1; a*=.5; } return s; }
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn2(vec2 x){ vec2 i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm2(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn2(p); p=p*2.02+3.7; a*=.5; } return s; }
// Worley edge distance (F2-F1) in 3D
float crackle(vec3 p){
  vec3 ip=floor(p), fp=fract(p); float f1=9., f2=9.;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 g=vec3(x,y,z); vec3 o=h33(ip+g); vec3 d=g+o-fp; float l=dot(d,d);
    if(l<f1){ f2=f1; f1=l; } else if(l<f2){ f2=l; }
  }
  return sqrt(f2)-sqrt(f1);
}
`;

const FS = `#version 300 es
precision highp float;
in vec3 vObj, vNrm, vWorld; in vec3 vUV; in float vKind;
uniform sampler2D uWrap, uDisc;
uniform vec2 uWrapSize; uniform float uDiscSize;
uniform vec3 uCam;
uniform float uHeat, uFire, uAge, uCrack, uMirror, uLipV, uRimY, uAO, uGloss, uSeed, uPaintAmt, uSeal;
out vec4 oCol;
${NOISE}
vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
// studio: dark room, one big softbox upper-left-front, a tall strip at right, a low fill card, a top bar
float boxm(vec3 r, vec3 c, vec2 hw, float soft){
  vec3 up = abs(c.y)>.95? vec3(1,0,0): vec3(0,1,0);
  vec3 rt = normalize(cross(up,c)); vec3 u2 = cross(c,rt);
  float k = dot(r,c); if(k<=0.05) return 0.;
  vec2 q = vec2(dot(r,rt), dot(r,u2))/k;
  vec2 m = smoothstep(hw+soft, hw-soft, abs(q));
  return m.x*m.y;
}
vec3 env(vec3 r){
  vec3 base = mix(vec3(.018,.02,.028), vec3(.075,.085,.11), smoothstep(-.4,1.,r.y));
  base += vec3(.9,.95,1.1)*0.05*smoothstep(0.2,-0.6,r.y);
  float k1 = boxm(r, normalize(vec3(-.86,.30,.48)), vec2(.26,.80), .085);
  float k1b = boxm(r, normalize(vec3(-.86,.30,.48)), vec2(.20,.60), .12);
  base += vec3(16.,15.5,15.)*k1*(.40+.60*k1b);
  base += vec3(1.6,1.6,1.7)*boxm(r, normalize(vec3(-.35,.55,.75)), vec2(.45,.20), .12);
  base += vec3(2.6,3.0,3.6)*boxm(r, normalize(vec3(.78,.16,.5)), vec2(.07,.62), .05);
  base += vec3(1.4,1.35,1.3)*boxm(r, normalize(vec3(.1,.9,.25)), vec2(.7,.12), .1);
  base += vec3(.9,.95,1.05)*boxm(r, normalize(vec3(0.05,-.12,1.)), vec2(.75,.1), .12);
  return base;
}
vec3 cobalt(float d){
  vec3 c = vec3(1.0);
  c = mix(c, vec3(.83,.89,.96), smoothstep(0.0,.12,d));
  c = mix(c, vec3(.55,.69,.89), smoothstep(.12,.30,d));
  c = mix(c, vec3(.27,.43,.74), smoothstep(.30,.50,d));
  c = mix(c, vec3(.12,.24,.56), smoothstep(.50,.72,d));
  c = mix(c, vec3(.06,.12,.38), smoothstep(.72,.92,d));
  c = mix(c, vec3(.03,.06,.23), smoothstep(.92,1.25,d));
  return c;
}
void main(){
  vec3 N0 = normalize(vNrm);
  vec3 V = normalize(uCam - vWorld);
  int kind = int(mod(vKind, 10.0)+.5); float inn = vKind>9.5? 1.:0.;
  vec3 P = vObj;
  // glaze micro-undulation (orange peel)
  float e = .35;
  vec3 pp = P*16.+uSeed;
  vec3 gn = vec3(vn3(pp+vec3(e,0,0))-vn3(pp-vec3(e,0,0)), vn3(pp+vec3(0,e,0))-vn3(pp-vec3(0,e,0)), vn3(pp+vec3(0,0,e))-vn3(pp-vec3(0,0,e)));
  gn -= N0*dot(gn,N0);
  vec3 N = normalize(N0 + gn*(.045 + .04*uAge));
  vec3 Nw = N;
  float NV = max(dot(N,V),0.001);

  // --- biscuit (foot ring) ---
  vec3 col; float spec; float gl = uGloss;
  if(kind==2){
    float n1 = fbm3(P*230.), n2 = fbm3(P*30.+4.);
    vec3 bis = mix(vec3(.74,.64,.56), vec3(.86,.78,.70), n1);
    bis = mix(bis, vec3(.74,.55,.43), smoothstep(.45,.9,n2)*.4);     // iron red where fired hard
    bis *= .75+.5*n1;
    vec3 L1 = normalize(vec3(-.55,.62,.56));
    float kd = max(dot(N,L1)*.6+.4, 0.);
    col = toLin(bis)*(0.06 + 0.95*kd) * mix(1., .55, smoothstep(.0,.35,vWorld.y*0.));
    oCol = vec4(col*mix(1.,.55,inn), 1.);
    return;
  }

  // --- painted layer: parallax under the glaze, softly bled ---
  vec3 dpx = dFdx(P), dpy = dFdy(P);
  vec2 tUV = vec2(vUV.x*(kind==0? uWrapSize.x:uDiscSize), vUV.y*(kind==0? 1.:uDiscSize));  // texel space
  vec2 d1 = dFdx(tUV), d2 = dFdy(tUV);
  float det = d1.x*d2.y - d1.y*d2.x;
  vec3 Tu = (dpx*d2.y - dpy*d1.y)/ (det==0.?1e-6:det);
  vec3 Tv = (-dpx*d2.x + dpy*d1.x)/ (det==0.?1e-6:det);
  // wrap-strip seam: derivatives jump over one column, cap them
  vec3 Vw = normalize(uCam - vWorld);
  vec3 Vt = Vw - N0*dot(Vw,N0);
  float depth = 0.0045;
  vec2 off = vec2(dot(Vt,Tu)/max(dot(Tu,Tu),1e-9), dot(Vt,Tv)/max(dot(Tv,Tv),1e-9)) * (-depth);
  off = clamp(off, vec2(-40.), vec2(40.));
  vec2 tp = tUV + off;
  vec4 pa = vec4(0.);
  float rr = 1.7;
  vec2 tcA = kind==0 ? vec2(tp.x/uWrapSize.x, 1.-tp.y/uWrapSize.y) : tp/uDiscSize;
  vec2 isz = kind==0 ? 1./uWrapSize : vec2(1./uDiscSize);
  vec2 sgn = kind==0 ? vec2(1.,-1.) : vec2(1.,1.);
  float ang0 = 0.5;
  for(int i=0;i<7;i++){
    float a = ang0 + float(i)*0.8976;
    vec2 o = i==0? vec2(0.) : vec2(cos(a),sin(a))*rr;
    vec2 tc = tcA + o*isz*sgn;
    vec4 s = kind==0 ? texture(uWrap, tc, 0.6) : texture(uDisc, tc, 0.6);
    pa += s * (i==0? 1.6:1.0);
  }
  pa /= 7.6;
  float dens = (pa.r + 1.35*pa.g) * uPaintAmt;
  float wet = pa.b;
  vec2 sp = tp;                                    // texel-space for pigment noise
  float pool = fbm2(sp*0.045+uSeed);
  dens *= 0.88 + 0.30*pool;                        // uneven pigment load
  dens *= 1.0 + 0.45*wet;

  // heaped-and-piled: dark iron-rich spots where the blue is thick, plus a fine speckle
  float thick = smoothstep(.52, 1.0, dens);
  float blob = smoothstep(.55, .68, fbm2(sp*0.06 + 11.0 + uSeed)) * thick;
  float blob2 = smoothstep(.60, .72, fbm2(sp*0.15 + 3.0)) * thick;
  float speck = step(.9972 - .004*thick, h21(floor(sp*.55)+uSeed)) * smoothstep(.28,.62,dens);
  float halo = smoothstep(.50,.60,fbm2(sp*0.06+11.0+uSeed)) * thick * (1.-blob);
  float dd = dens + .38*blob + .22*blob2 + .55*speck;

  vec3 cb = cobalt(dd);                               // sRGB-ish
  cb = mix(cb, vec3(.025,.035,.12), clamp(blob*.55+speck*.5,0.,1.));
  cb = mix(cb, cb*vec3(1.12,.98,.88)+vec3(.012,.008,.0), halo*.5);            // faint warm-brown iron halo around the spots
  // before firing cobalt is a dull graphite grey on chalk
  vec3 raw = mix(vec3(.80,.80,.82), vec3(.20,.22,.28), clamp(dd*1.1,0.,1.));
  cb = mix(raw, cb, uFire);
  float cover = smoothstep(0.012, 0.16, dens);
  cover = max(cover, smoothstep(.0,.06,dens)*.5);

  // --- glaze body colour: kiln-fresh bluish white  →  aged ivory with pooled celadon tint ---
  float tn = fbm3(P*7.+uSeed*.3);
  vec3 glazeFresh = vec3(.945,.955,.955), glazeAged = vec3(.90,.865,.78);
  vec3 gcol = mix(glazeFresh, glazeAged, uAge);
  gcol = mix(gcol, gcol*vec3(.93,.985,.98), smoothstep(.45,.8,tn)*(.6));
  gcol = mix(vec3(.91,.88,.84), gcol, uFire);                                // bisque
  float footV = vUV.y; // wrap v in texels
  if(kind==0) gcol = mix(gcol, vec3(.74,.86,.82), .45*smoothstep(110.,0.,footV)*uFire);   // glaze pooling green-blue at the foot
  vec3 alb = mix(gcol, cb, cover);
  // aged lip: iron-brown "mouth edge"
  if(kind==0){
    float dl = abs(vUV.y - uLipV);
    alb = mix(alb, vec3(.55,.40,.27), uAge*.55*smoothstep(26.,0.,dl) * (.6+.4*vn2(vec2(vUV.x*400., 1.))));
    alb = mix(alb, alb*1.05, (1.-uAge)*smoothstep(10.,0.,dl)*.3);
  }

  // crackle (aged stain, fine lines)
  float cr = 0.;
  if(uCrack>0.001){
    vec3 cp = P*vec3(26.,34.,26.)+uSeed;
    float c1 = 1.-smoothstep(0., .035, crackle(cp));
    float c2 = (1.-smoothstep(0., .03, crackle(cp*2.6+9.)))*.5;
    cr = clamp(c1 + c2, 0., 1.) * uCrack;
    // some cracks skip: modulate by a slow noise so the net is not uniform
    cr *= smoothstep(.25,.6, fbm3(P*5.+3.));
  }
  vec3 stain = mix(vec3(.55,.46,.33), vec3(.07,.12,.28), cover);       // tea-brown on white, blue-black over cobalt
  alb = mix(alb, mix(alb, stain, .85), cr*mix(.35,1., uAge));

  // --- light ---
  vec3 L1 = normalize(vec3(-.55,.72,.50)), L2 = normalize(vec3(.8,.2,.4));
  float k1 = pow(max(dot(N,L1)*.72+.28, 0.),1.2), k2 = max(dot(N,L2)*.5+.3,0.);
  float hemi = .5+.5*N.y;
  float ao = 1.;
  if(inn>.5) ao = exp(-max(uRimY - vWorld.y*0. - vObj.y,0.)*uAO);
  vec3 amb = vec3(.30,.33,.40)*(.35+.65*hemi);
  vec3 diff = alb;                                       // sRGB-ish
  vec3 lin = toLin(diff);
  // translucent glow towards the key side thin rims: tiny warm term
  vec3 Lcol = vec3(1.08,1.03,.95)*k1 + vec3(.18,.22,.32)*1.0*k2 + amb*.68;
  // ground bounce darkens the underside and base
  float bounce = mix(.55,1., smoothstep(-.05,.35, vObj.y*0. + vWorld.y + (uMirror>.5?0.:0.)));
  vec3 color = lin*Lcol*ao*(0.82) ;
  // --- reflection of the clear glaze coat ---
  vec3 R = reflect(-V, N);
  float F0 = .06;
  float F = F0 + (1.-F0)*pow(1.-NV, 5.);
  float crSpec = 1. - .8*cr;
  vec3 refl = env(R) * F * gl * crSpec * mix(1., .35*ao+.05, inn);
  // second, blurrier lobe for the satin look of thick glaze
  vec3 R2 = normalize(R + gn*.9);
  refl += env(R2) * F * .22 * gl * crSpec * (inn>.5?ao:1.);
  color += refl * (1. - .55*(1.-uFire)) * mix(.12,1.,uFire);
  color = color*mix(vec3(1.),vec3(1.35,.82,.55),uHeat) + vec3(.42,.11,.02)*uHeat*(.3+.7*NV);   // kiln glow
  color *= mix(1., .985, 0.);
  // gentle filmic curve
  color = color*0.92;
  color = 1. - exp(-color*1.28);
  color = pow(color, vec3(1./2.2));
  float alpha = 1.;
  if(uMirror>.5){ float f = exp(-max(-vWorld.y,0.)*2.2)*.34; color*=f; alpha=f; }
  oCol = vec4(color, alpha);
}`;

const GVS = `#version 300 es
layout(location=0) in vec3 aPos; uniform mat4 uVP; out vec3 vW; void main(){ vW = aPos; gl_Position = uVP*vec4(aPos,1.); }`;
const GFS = `#version 300 es
precision highp float;
in vec3 vW; uniform vec3 uCam; uniform vec3 uGround; uniform vec4 uBlob; uniform vec2 uBlob2; uniform float uGroundAlpha, uShadow;
out vec4 oCol;
void main(){
  vec3 L = normalize(vec3(-.62,.46,.64));
  float dc = length(vW.xz - vec2(-0.25,0.2)*uBlob.z);
  float pool = exp(-dc*dc/(uBlob.z*uBlob.z*3.2));
  vec3 g = uGround*(.18 + 1.25*pool);
  // contact + cast shadow (light from upper-left-front → shadow falls right-back)
  float dcon = length(vW.xz); float contact = exp(-max(dcon - uBlob.x, 0.)*uBlob.y);
  vec2 sc = vW.xz - vec2(.55,-.45)*uBlob2.x; float castS = exp(-dot(sc,sc)/(uBlob2.y*uBlob2.y));
  float sh = clamp(contact*.85 + castS*.5, 0., .95) * uShadow;
  g *= 1.-sh;
  float dist = length(vW.xz - uCam.xz);
  float fade = smoothstep(uBlob.w*.5, uBlob.w*1.8, length(vW.xz));
  float a = mix(uGroundAlpha, 1., 0.0);
  a *= 1. - fade;
  oCol = vec4(g*a, a);
}`;

function sh(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); return s; }
function prog(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }

export class Glaze {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas'); this.canvas.width = w; this.canvas.height = h;
    const gl = this.gl = this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('webgl2 unavailable');
    this.pv = prog(gl, VS, FS); this.pg = prog(gl, GVS, GFS);
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    this.tex = {}; this.vessels = new Map();
    // ground quad
    this.gbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.gbuf);
    const S = 40; gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-S, 0, -S, S, 0, -S, S, 0, S, -S, 0, -S, S, 0, S, -S, 0, S]), gl.STATIC_DRAW);
    this.u = {}; for (const n of ['uVP', 'uModel', 'uWrap', 'uDisc', 'uWrapSize', 'uDiscSize', 'uCam', 'uFire', 'uAge', 'uCrack', 'uMirror', 'uLipV', 'uRimY', 'uAO', 'uGloss', 'uSeed', 'uPaintAmt', 'uSeal', 'uHeat']) this.u[n] = gl.getUniformLocation(this.pv, n);
    this.ug = {}; for (const n of ['uVP', 'uCam', 'uGround', 'uBlob', 'uBlob2', 'uGroundAlpha', 'uShadow']) this.ug[n] = gl.getUniformLocation(this.pg, n);
  }
  mesh(v) {
    let m = this.vessels.get(v.name); if (m) return m;
    const gl = this.gl; const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, v.verts, gl.STATIC_DRAW);
    const st = 9 * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, st, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, st, 24);   // u, v, kind packed: u,v in .xy; third = kind
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, st, 32);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, v.idx, gl.STATIC_DRAW);
    m = { vao, n: v.idx.length }; this.vessels.set(v.name, m); return m;
  }
  // one GPU texture per painting (keyed by Paint.uid); re-uploaded only when its rev changed
  upload(paint, unit) {
    const gl = this.gl; let e = this.tex[paint.uid];
    if (!e) e = this.tex[paint.uid] = { tex: gl.createTexture(), rev: null };
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, e.tex);
    const canvas = paint.render(this._t);
    if (e.rev !== paint.rev) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, unit === 0 ? gl.REPEAT : gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      e.rev = paint.rev;
    }
  }
  // opts: vessel, wrap (canvas), disc (canvas), model, cam:{eye,target,fov}, fire, age, crack, gloss, ao, seed, ground:{...}
  // o.items: [{vessel, wrap: Paint, disc: Paint, model, fire, age, crack, ao, seed, heat, gloss, paintAmt}] drawn in one pass (shared depth, one ground)
  render(o) {
    const gl = this.gl, W = this.w, H = this.h;
    this._t = o.t ?? 0;
    const items = o.items || [o];
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
    const proj = M.persp(o.cam.fov * Math.PI / 180, W / H, 0.05, 80), view = M.look(o.cam.eye, o.cam.target, o.cam.up);
    const vp = M.mul(proj, view); this.lastVP = vp;
    const draw = (it, model, mirror) => {
      const v = it.vessel, m = this.mesh(v);
      gl.useProgram(this.pv); gl.bindVertexArray(m.vao);
      if (it.wrap) this.upload(it.wrap, 0);
      if (it.disc) this.upload(it.disc, 1);
      const u = this.u;
      gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uModel, false, model);
      gl.uniform1i(u.uWrap, 0); gl.uniform1i(u.uDisc, 1);
      gl.uniform2f(u.uWrapSize, v.W, v.H); gl.uniform1f(u.uDiscSize, v.discSize);
      gl.uniform3fv(u.uCam, o.cam.eye);
      gl.uniform1f(u.uHeat, it.heat ?? 0); gl.uniform1f(u.uFire, it.fire ?? 1); gl.uniform1f(u.uAge, it.age ?? 0); gl.uniform1f(u.uCrack, it.crack ?? 0.5); gl.uniform1f(u.uMirror, mirror ? 1 : 0);
      gl.uniform1f(u.uLipV, v.outerEndV); gl.uniform1f(u.uRimY, v.rimY); gl.uniform1f(u.uAO, it.ao ?? 4); gl.uniform1f(u.uGloss, it.gloss ?? 1);
      gl.uniform1f(u.uSeed, it.seed ?? 1); gl.uniform1f(u.uPaintAmt, it.paintAmt ?? 1); gl.uniform1f(u.uSeal, 0);
      gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0);
    };
    const g = o.ground;
    if (g) {
      for (const it of items) draw(it, M.mul(M.scale(1, -1, 1), it.model), true);
      gl.useProgram(this.pg); gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, this.gbuf);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.disableVertexAttribArray(3);
      gl.uniformMatrix4fv(this.ug.uVP, false, vp); gl.uniform3fv(this.ug.uCam, o.cam.eye); gl.uniform3fv(this.ug.uGround, g.color);
      gl.uniform4fv(this.ug.uBlob, g.blob); gl.uniform2fv(this.ug.uBlob2, g.cast); gl.uniform1f(this.ug.uGroundAlpha, g.alpha); gl.uniform1f(this.ug.uShadow, g.shadow ?? 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    for (const it of items) draw(it, it.model, false);
    return this.canvas;
  }
  // world → screen (CSS px of the final 2D canvas), for the brush overlay
  project(p, model) { const w = M.pt(model || M.id(), p); const c = M.pt(this.lastVP, w); return [(c[0] * .5 + .5) * this.w, (1 - (c[1] * .5 + .5)) * this.h, c[3]]; }
}
