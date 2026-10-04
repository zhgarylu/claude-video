// The film-emulation pass. Scene canvas (960x720) -> WebGL2 -> 1920x1080 picture with a 4:3 projected frame.
// Everything that "happens to the film" lives here or in damage(): it is a function of the film-frame index f
// (and the continuous time t for the lamp), never of the previous frame.
import { hash, vnoise, mulberry } from '/core/lib.js';
import { W, H } from './util.js';

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc, uDmg;
uniform vec2 uRes;
uniform float uFrame, uFocus, uMb, uFlash, uExpo, uFade, uSlip, uLamp, uGrain, uSat, uVig, uRot, uWarm, uLift, uHalo, uSurr;
uniform vec2 uJit;
uniform vec4 uLeak;      // amount, edge angle (rad), seed, width
uniform vec4 uLeak2;     // second leak
out vec4 o;
float h11(float x){ x = fract(x*.1031); x *= x+33.33; x *= x+x; return fract(x); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
vec3 leakCol(float I){
  vec3 c = mix(vec3(.55,.03,.02), vec3(1.,.28,.03), smoothstep(.0,.35,I));
  c = mix(c, vec3(1.,.72,.18), smoothstep(.3,.7,I));
  return mix(c, vec3(1.,.95,.7), smoothstep(.65,1.1,I));
}
float leakField(vec2 c, vec4 L){
  if (L.x <= 0.) return 0.;
  vec2 d = vec2(cos(L.y), sin(L.y)), pe = vec2(-d.y, d.x);
  float s = dot(c*vec2(1.,.75), d)/0.5, a = dot(c, pe);
  float n = vn(vec2(a*5.+L.z*13., L.z)) * .6 + vn(vec2(a*13.+L.z*7., L.z*3.)) * .4;
  float edge = s + (n-.5)*.55 - (1.-L.w);
  float k = smoothstep(.0, .95, edge);
  return L.x * k * (.55 + .7*n);
}
vec3 sampleImg(vec2 uv, float lod, float mb, vec2 ca){
  if (mb < .0005) return vec3(textureLod(uSrc, uv+ca, lod).r, textureLod(uSrc, uv, lod).g, textureLod(uSrc, uv-ca, lod).b);
  vec3 acc = vec3(0.);
  for (int i=0;i<9;i++){
    float k = float(i)/8. - .5;
    vec2 u = uv + vec2(k*mb, 0.);
    acc += vec3(textureLod(uSrc, u+ca, lod).r, textureLod(uSrc, u, lod).g, textureLod(uSrc, u-ca, lod).b);
  }
  return acc / 9.;
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 fsz = vec2(1440., 1080.), fc = vec2(960., 540.);
  vec2 pc = px - fc;
  float ap = sdRound(pc, fsz*.5, 46.);
  float inside = smoothstep(7., -3., ap);
  vec2 pr = pc;
  float cr = cos(uRot), sr = sin(uRot);
  pr = mat2(cr,-sr,sr,cr)*pr - uJit;
  vec2 q = pr / fsz + .5;
  float bar = 0.;
  if (abs(uSlip) > .0005) { float seam = 1. - fract(uSlip); bar = 1. - smoothstep(.022, .05, abs(q.y - seam)); q.y = fract(q.y + uSlip); }
  vec2 uv = vec2(q.x, 1. - q.y);
  vec2 cc = q - .5;
  float rr = length(cc*vec2(1., .75)*1.9);
  float lod = .95 + uFocus*3.6 + rr*rr*.9;
  vec2 ca = vec2(.0011 + uFocus*.002, .0004);
  vec3 col = sampleImg(uv, lod, uMb, ca);
  // halation: red-orange glow around highlights, from two blur radii
  vec3 h1 = textureLod(uSrc, uv, 3.2).rgb, h2 = textureLod(uSrc, uv, 4.8).rgb;
  float hl = max(dot(h1,vec3(.3,.55,.15)) - .74, 0.), hl2 = max(dot(h2,vec3(.3,.55,.15)) - .70, 0.);
  vec3 hal = (hl*1.6 + hl2*1.6) * vec3(1.0,.42,.17) * uHalo;
  hal += max(h1 - .80, 0.) * vec3(.55,.30,.18) * uHalo * .8;
  col = col + hal;
  // exposure: lamp, leaks and burn flash add light before the curve
  col *= uExpo * uLamp;
  float lk = leakField(cc, uLeak) + leakField(cc, uLeak2);
  col += leakCol(lk) * lk * 1.15;
  col += uFlash * vec3(1.,.86,.60);
  // film curve: crushed toe, shoulder, warm faded dyes, lifted blacks
  vec3 g = pow(max(col, 0.), vec3(1.34));
  g = 1. - exp(-g*1.9); g /= (1. - exp(-1.9));
  g = mix(g, smoothstep(0.,1.,g), .35);
  mat3 M = mat3(1.13,-.045,-.07,  -.05,1.0,.02,  -.09,.015,.90);
  g = M * g;
  g = mix(vec3(dot(g,vec3(.30,.56,.14))), g, uSat);
  vec3 hi = vec3(.985, .94 - .03*uWarm, .86 - .09*uWarm);
  vec3 lo = vec3(.100,.062,.050) * uLift + vec3(.02,.0,-.01)*uWarm;
  g = mix(lo, hi, clamp(g,0.,1.2)) + max(g-1.,0.)*vec3(1.,.9,.7);
  // gate light: hot spot and corner falloff (corners go warm-dark)
  float vig = 1. - uVig*pow(rr*.82, 2.3);
  g *= mix(vec3(1.0,.93,.85), vec3(1.), clamp(vig,0.,1.));
  g *= clamp(vig, 0., 1.3) * (1. + .10*exp(-rr*rr*4.5));
  g *= 1. - bar;
  // print damage sits on the emulsion, under the grain
  vec4 dm = texture(uDmg, uv);
  g = mix(g, dm.rgb, dm.a * (1. - bar));
  // grain: per film frame, coarse (8 mm), heavier in shadows, a little chroma
  float gs = 1.9;
  vec2 go = vec2(h11(uFrame*1.37), h11(uFrame*2.91))*731.;
  vec2 gp = px/gs + go;
  float n  = vn(gp)*.55 + vn(gp*2.3+17.)*.30 + vn(gp*.55+5.)*.28;
  float nr = vn(gp+41.)*.55 + vn(gp*2.3+3.)*.30, nb = vn(gp+89.)*.55 + vn(gp*2.3+71.)*.30;
  float gl = dot(g, vec3(.3,.56,.14));
  float gam = uGrain*(.50 + 1.05*(1.-gl)*(1.-.55*gl));
  g += (n-.64)*gam*vec3(1.) + vec3(nr-.425, 0., nb-.425)*gam*.55;
  g *= 1. - uFade;
  g = clamp(g, 0., 1.);
  vec3 fr = g * inside;
  // the room: a dark wall lit by the spill of the screen
  vec2 qn = clamp(vec2(q.x, 1.-q.y), .02, .98);
  float dd = max(ap, 0.);
  vec3 sp = textureLod(uSrc, qn, 6.8).rgb;
  vec3 room = vec3(.026,.016,.012) + sp*vec3(1.0,.78,.55)*uSurr*exp(-dd/310.)*(1.-uFade);
  room *= 1. + .06*(vn(px*.012)-.5);
  room += (h21(px+uFrame*3.7)-.5)*.012;
  o = vec4(fr + room*(1.-inside), 1.);
}`;

export class Film {
  constructor(cv) {
    const gl = this.gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('WebGL2 needed');
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const pg = this.pg = gl.createProgram();
    gl.attachShader(pg, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(pg, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pg);
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pg));
    gl.useProgram(pg);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pg, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = n => gl.getUniformLocation(pg, n);
    this.tex = [0, 1].map(() => gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.w = cv.width; this.h = cv.height;
  }
  upload(i, src, mip) {
    const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    if (mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.u(i ? 'uDmg' : 'uSrc'), i);
  }
  draw(src, dmg, P) {
    const gl = this.gl, u = this.u;
    this.upload(0, src, true); this.upload(1, dmg, false);
    gl.viewport(0, 0, this.w, this.h);
    gl.uniform2f(u('uRes'), this.w, this.h);
    const f1 = (n, v) => gl.uniform1f(u(n), v);
    f1('uFrame', P.f); f1('uFocus', P.focus); f1('uMb', P.mb); f1('uFlash', P.flash); f1('uExpo', P.expo);
    f1('uFade', P.fade); f1('uSlip', P.slip); f1('uLamp', P.lamp); f1('uGrain', P.grain); f1('uSat', P.sat);
    f1('uVig', P.vig); f1('uRot', P.rot); f1('uWarm', P.warm); f1('uLift', P.lift); f1('uHalo', P.halo); f1('uSurr', P.surr);
    gl.uniform2f(u('uJit'), P.jx, P.jy);
    gl.uniform4f(u('uLeak'), ...P.leak); gl.uniform4f(u('uLeak2'), ...P.leak2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// per-film-frame mechanical state: weave, jitter, lamp, all seeded by the frame index
export function mechanics(f, o = {}) {
  const r = mulberry(f * 7919 + 13), r2 = mulberry(Math.floor(f / 3) * 104729 + 5);
  const w = o.weave ?? 1;
  const weaveX = (vnoise(f * .045 + 3) - .5) * 5.0, weaveY = (vnoise(f * .06 + 40) - .5) * 4.0;
  let jx = weaveX + (r() - .5) * 3.0, jy = weaveY + (r() - .5) * 3.6;
  if (hash(f * .731 + 2.2) > .985) jy += (hash(f * 3.1) - .5) * 26;      // rare perforation jump
  const lamp = 1 + (r() - .5) * .07 + .03 * Math.sin(f * 2.4) + (hash(Math.floor(f / 11)) > .8 ? -.05 * r2() : 0);
  return { jx: jx * w, jy: jy * w, rot: ((vnoise(f * .03 + 9) - .5) * .0042 + (r() - .5) * .0012) * w, lamp };
}

// dust, hair, scratches, blotch: redrawn for every film frame; some marks persist across several frames
export function damage(ctx, f, o = {}) {
  const k = o.amount ?? 1;
  ctx.clearRect(0, 0, W, H);
  for (let life = 0; life < 3; life++) {                 // dust specks live 1, 2 or 3 frames
    const base = Math.floor(f / (life + 1));
    const r = mulberry(base * 31 + life * 1009 + 7);
    const n = Math.round((1 + r() * 3.5) * k);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, s = .7 + Math.pow(r(), 2.2) * 3.4, white = r() < .62, a = .55 + r() * .4;
      ctx.fillStyle = white ? `rgba(255,246,225,${a})` : `rgba(12,8,6,${a})`;
      ctx.beginPath();
      const m = 4 + (r() * 3 | 0);
      for (let j = 0; j < m; j++) { const an = j / m * 6.283, rr = s * (.55 + r() * .7); ctx.lineTo(x + Math.cos(an) * rr * (1 + r() * .8), y + Math.sin(an) * rr); }
      ctx.fill();
      if (r() < .1) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (r() - .5) * 14, y + (r() - .5) * 14, x + (r() - .5) * 22, y + (r() - .5) * 22); ctx.stroke(); }
    }
  }
  const hw = Math.floor(f / 29), rh = mulberry(hw * 977 + 3);   // a short hair in the gate for about 1.6 s, trembling
  if (rh() < .6 * k) {
    const side = rh(), x0 = side < .5 ? rh() * W : (side < .75 ? 0 : W), y0 = side < .5 ? H : rh() * H * .6 + H * .3;
    const tr = mulberry(f * 13 + 1), dx = side < .5 ? (rh() - .5) * 90 : (side < .75 ? 1 : -1) * (40 + rh() * 60), dy = side < .5 ? -(50 + rh() * 70) : (rh() - .5) * 60;
    const e = [x0 + dx + (tr() - .5) * 2, y0 + dy + (tr() - .5) * 2];
    ctx.strokeStyle = 'rgba(8,6,5,.82)'; ctx.lineWidth = 1.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + dx * .3 + (rh() - .5) * 60, y0 + dy * .5, e[0] + (rh() - .5) * 50, e[1] - dy * .2, e[0], e[1]); ctx.stroke();
    ctx.fillStyle = 'rgba(8,6,5,.8)'; ctx.beginPath(); ctx.arc(e[0], e[1], 1.5, 0, 7); ctx.fill();
  }
  const sw = Math.floor(f / 41);                          // long, broken vertical scratches
  for (let i = 0; i < 2; i++) {
    const rs = mulberry(sw * 541 + i * 97 + 11);
    if (rs() < .6 * k) {
      const x = rs() * W + (hash(f + i) - .5) * .8, y0 = rs() * H * .4, y1 = H * (.6 + rs() * .4), white = rs() < .8;
      ctx.strokeStyle = white ? `rgba(255,244,220,${.22 + rs() * .3})` : `rgba(20,12,8,${.3 + rs() * .3})`;
      ctx.lineWidth = .8 + rs() * 1.1;
      let y = y0; const sg = mulberry(sw * 13 + i);
      while (y < y1) { const L = 30 + sg() * 190; if (sg() < .8) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (sg() - .5) * 1.4, Math.min(y1, y + L)); ctx.stroke(); } y += L + 8 + sg() * 60; }
    }
  }
  const bw = Math.floor(f / 67), rb = mulberry(bw * 313 + 9);   // a rare blotch, soft and orange-brown
  if (rb() < .28 * k) {
    const x = rb() * W, y = rb() * H, R = 40 + rb() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, 'rgba(210,120,50,.10)'); g.addColorStop(.7, 'rgba(180,90,40,.06)'); g.addColorStop(1, 'rgba(180,90,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
  }
}
