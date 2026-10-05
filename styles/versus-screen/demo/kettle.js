// Two invented electric kettles drawn with paths: a steel one and a glass one. Local units: base at y = 0, the kettle faces right
// (spout right, handle left), about 300 units tall. Flip with o.flip. No images.
import { hash, TAU } from '/core/lib.js';

const P = {
  steelBody: new Path2D('M -125 -8 Q -125 0 -115 0 L 115 0 Q 125 0 125 -8 L 106 -205 Q 100 -234 76 -240 L -76 -240 Q -100 -234 -106 -205 Z'),
  steelLid: new Path2D('M -74 -240 Q -68 -280 0 -284 Q 68 -280 74 -240 Z'),
  steelSpout: new Path2D('M 98 -160 Q 168 -176 206 -252 L 232 -266 L 240 -244 Q 196 -150 106 -84 Z'),
  handle: new Path2D('M -108 -212 Q -214 -232 -206 -122 Q -200 -48 -118 -46'),
  glassBody: new Path2D('M -150 -10 Q -158 -130 -92 -208 Q -52 -250 0 -250 Q 52 -250 92 -208 Q 158 -130 150 -10 Q 148 0 130 0 L -130 0 Q -148 0 -150 -10 Z'),
  glassSpout: new Path2D('M 118 -170 L 176 -232 L 196 -218 L 134 -120 Z'),
  glassLid: new Path2D('M -64 -250 L 64 -250 L 54 -276 L -54 -276 Z'),
  glassHandle: new Path2D('M -142 -196 Q -226 -212 -218 -120 Q -212 -56 -146 -52'),
};
const INK = '#07070c';
export const STEEL_SHADES = {                                         // body gradient stops per steel variant
  brisk: ['#4a4f63', '#c9cfdd', '#f4f6fb', '#aab0c2', '#3a3e50'],
  onyx: ['#14151d', '#3a3d4c', '#6b6f82', '#2a2c38', '#0d0e14'],
  fern: ['#2f5a43', '#7fb89a', '#c8ecd6', '#6aa385', '#25463a'],
  dune: ['#6d5a3e', '#d8c196', '#f6e8c8', '#c3a97b', '#54452e'],
};

function steel(g, o) {
  const sh = STEEL_SHADES[o.shade || 'brisk'], ac = o.accent;
  const gr = g.createLinearGradient(-125, 0, 125, 0); sh.forEach((c, i) => gr.addColorStop(i / 4, c));
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.lineWidth = 38; g.strokeStyle = INK; g.stroke(P.handle);                    // handle
  g.lineWidth = 26; g.strokeStyle = '#232634'; g.stroke(P.handle);
  g.lineWidth = 4; g.strokeStyle = ac; g.save(); g.translate(-3, -2); g.stroke(P.handle); g.restore();
  const sg = g.createLinearGradient(100, -80, 220, -260); sg.addColorStop(0, sh[3]); sg.addColorStop(.5, sh[2]); sg.addColorStop(1, sh[1]); g.fillStyle = sg; g.fill(P.steelSpout); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(P.steelSpout);   // spout
  g.fillStyle = '#161823'; g.beginPath(); g.roundRect(-132, -4, 264, 22, 6); g.fill(); g.lineWidth = 6; g.stroke();   // base plate
  g.fillStyle = ac; g.fillRect(-120, 4, 240, 4);
  g.fillStyle = gr; g.fill(P.steelBody);                                                         // body
  g.save(); g.clip(P.steelBody);
  g.fillStyle = ac; g.beginPath(); g.moveTo(-130, -64); g.lineTo(130, -112); g.lineTo(130, -78); g.lineTo(-130, -30); g.closePath(); g.fill();   // diagonal team band
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-82, -230, 10, 200); g.fillRect(-60, -230, 4, 200);   // light streaks
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(84, -240, 50, 250);
  g.restore();
  g.lineWidth = 8; g.strokeStyle = INK; g.stroke(P.steelBody);
  g.fillStyle = INK; g.beginPath(); g.roundRect(-34, -176, 68, 20, 10); g.fill();                // LED slot
  g.fillStyle = ac; g.shadowColor = ac; g.shadowBlur = 18 * (o.glow ?? 1); g.beginPath(); g.roundRect(-28, -172, 56 * (0.4 + 0.6 * (o.led ?? 1)), 12, 6); g.fill(); g.shadowBlur = 0;
  g.fillStyle = sh[1]; g.fill(P.steelLid); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(P.steelLid);   // lid
  g.fillStyle = '#232634'; g.beginPath(); g.arc(0, -296, 15, 0, TAU); g.fill(); g.lineWidth = 6; g.stroke();
  g.strokeStyle = ac; g.lineWidth = 3; g.beginPath(); g.arc(0, -296, 9, 0, TAU); g.stroke();
}

function glass(g, o) {
  const ac = o.accent, u = o.u || 0, lvl = o.level ?? -170;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = 38; g.strokeStyle = INK; g.stroke(P.glassHandle);
  g.lineWidth = 26; g.strokeStyle = '#1d2a33'; g.stroke(P.glassHandle);
  g.lineWidth = 4; g.strokeStyle = ac; g.save(); g.translate(-3, -2); g.stroke(P.glassHandle); g.restore();
  g.fillStyle = 'rgba(190,240,255,.20)'; g.fill(P.glassSpout); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(P.glassSpout);
  g.fillStyle = '#10222b'; g.beginPath(); g.roundRect(-160, -2, 320, 24, 8); g.fill(); g.lineWidth = 6; g.stroke();           // base with a ring light
  g.fillStyle = ac; g.shadowColor = ac; g.shadowBlur = 20 * (o.glow ?? 1); g.fillRect(-140, 8, 280, 5); g.shadowBlur = 0;
  g.fillStyle = 'rgba(150,225,245,.16)'; g.fill(P.glassBody);                                                              // glass body
  g.save(); g.clip(P.glassBody);
  const wg = g.createLinearGradient(0, lvl, 0, 0); wg.addColorStop(0, o.water0 || 'rgba(70,225,245,.58)'); wg.addColorStop(1, o.water1 || 'rgba(20,150,190,.85)');
  g.fillStyle = wg; g.beginPath(); g.moveTo(-170, 10);
  for (let x = -170; x <= 170; x += 10) g.lineTo(x, lvl + Math.sin(x * 0.05 + u * 3.2) * 4 + Math.sin(x * 0.11 - u * 2) * 2);
  g.lineTo(170, 10); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(235,255,255,.8)'; g.lineWidth = 3; g.beginPath();
  for (let x = -150; x <= 150; x += 10) { const y = lvl + Math.sin(x * 0.05 + u * 3.2) * 4 + Math.sin(x * 0.11 - u * 2) * 2; x === -150 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  g.fillStyle = 'rgba(235,255,255,.65)';                                                                                  // bubbles
  for (let i = 0; i < 7; i++) { const ph = (u * (0.35 + hash(i) * 0.3) + hash(i + 9)) % 1, bx = (hash(i + 3) - .5) * 190, by = -ph * (-lvl - 10) - 6; g.beginPath(); g.arc(bx + Math.sin(u * 4 + i) * 4, by, 3 + hash(i + 5) * 4, 0, TAU); g.fill(); }
  g.restore();
  g.save(); g.translate(0, 0); g.scale(.9, .93); g.strokeStyle = 'rgba(210,250,255,.32)'; g.lineWidth = 3; g.stroke(P.glassBody); g.restore();   // inner wall (double wall)
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 10; g.beginPath(); g.moveTo(-122, -168); g.quadraticCurveTo(-134, -108, -126, -48); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.moveTo(-108, -196); g.lineTo(-96, -204); g.stroke();
  g.lineWidth = 8; g.strokeStyle = INK; g.stroke(P.glassBody);
  g.lineWidth = 3; g.strokeStyle = ac; g.save(); g.scale(.985, .985); g.stroke(P.glassBody); g.restore();
  g.fillStyle = '#16262f'; g.fill(P.glassLid); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(P.glassLid);
  g.fillStyle = ac; g.fillRect(-52, -266, 104, 5);
  g.fillStyle = '#16262f'; g.beginPath(); g.roundRect(-16, -296, 32, 24, 8); g.fill(); g.lineWidth = 6; g.stroke();
}

let scratch = null;
// o: {kind:'steel'|'glass', x, y, s, flip, rot, accent, shade, flash (0..1 white), glow, u, level, led}
export function drawKettle(g, o) {
  const flash = o.flash || 0;
  const body = (c) => { c.save(); c.translate(o.x, o.y); c.rotate(o.rot || 0); c.scale((o.flip ? -1 : 1) * o.s * (o.sx || 1), o.s * (o.sy || 1)); (o.kind === 'glass' ? glass : steel)(c, o); c.restore(); };
  if (flash > 0.01 || o.shadow) {                                                            // flash needs an offscreen copy to tint only the kettle's pixels
    if (!scratch) { scratch = document.createElement('canvas'); scratch.width = 1920; scratch.height = 1080; }
    const c = scratch.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1920, 1080); body(c);
    if (flash > 0.01) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(255,250,235,${flash})`; c.fillRect(0, 0, 1920, 1080); c.globalCompositeOperation = 'source-over'; }
    g.drawImage(scratch, 0, 0);
  } else body(g);
}
