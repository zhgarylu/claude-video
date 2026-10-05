// sheet.js: a Print is a sheet of paper plus one baked layer per printing pass. Layers are multiplied
// onto the paper in order; each pass carries its own small, fixed mis-registration.
import { mk, TEX, tileFill } from './core.js';
import { bakeLayer, PASSES } from './printer.js';
import { clamp, lerp, hash } from '/core/lib.js';

// final mis-registration per pass: [dx, dy, degrees] in design units
export const REG = { key: [0, 0, 0], peach: [4.5, -3, .35], yellow: [-5, 3.5, -.3], green: [4, 4.5, .25], indigo: [-4.5, -4, -.4], red: [2.5, 3.5, .3] };

export class Print {
  // art: (P) => void, w/h: art size in design units, m: paper margin, S: pixels per unit
  constructor(art, w, h, { m = 34, S = 1.5, passes = PASSES, seed = 0, regScale = 1, paperTex = 'paper' } = {}) {
    this.art = art; this.w = w; this.h = h; this.m = m; this.S = S; this.passes = passes; this.regScale = regScale;
    this.PW = w + 2 * m; this.PH = h + 2 * m;
    this.layers = {}; this.comps = []; this.paperTex = paperTex; this.seed = seed;
    this.work = mk(this.PW * S, this.PH * S); this.tmp = mk(this.PW * S, this.PH * S);
  }
  reg(pass) { const r = REG[pass] || [0, 0, 0]; return [r[0] * this.regScale, r[1] * this.regScale, r[2] * this.regScale]; }
  layer(pass) { if (!this.layers[pass]) this.layers[pass] = bakeLayer(this.art, pass, this.w, this.h, this.S, this.passes.indexOf(pass) + this.seed); return this.layers[pass]; }
  paper() {
    if (this.paperC) return this.paperC;
    const c = mk(this.PW * this.S, this.PH * this.S), x = c.getContext('2d');
    tileFill(x, TEX[this.paperTex], 0, 0, c.width, c.height, (this.seed * 131) % 512, (this.seed * 71) % 512);
    // slightly darker, ragged edge
    const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, 'rgba(90,60,30,.10)'); g.addColorStop(.12, 'rgba(90,60,30,0)'); g.addColorStop(.88, 'rgba(90,60,30,0)'); g.addColorStop(1, 'rgba(90,60,30,.14)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    this.paperC = c; return c;
  }
  // draw a layer with offset into ctx (multiply)
  put(ctx, pass, ox = 0, oy = 0, rot = 0, extra = 1) {
    const S = this.S, L = this.layer(pass), [dx, dy, dg] = this.reg(pass);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = extra;
    ctx.translate(this.PW * S / 2, this.PH * S / 2); ctx.rotate((dg + rot) * Math.PI / 180);
    ctx.translate(-this.PW * S / 2 + (this.m + dx + ox) * S, -this.PH * S / 2 + (this.m + dy + oy) * S);
    ctx.drawImage(L, 0, 0); ctx.restore();
  }
  // composite of paper + passes[0..k-1], cached
  comp(k) {
    if (this.comps[k]) return this.comps[k];
    let c;
    if (k === 0) c = this.paper();
    else { const prev = this.comp(k - 1); c = mk(prev.width, prev.height); const x = c.getContext('2d'); x.drawImage(prev, 0, 0); this.put(x, this.passes[k - 1]); }
    this.comps[k] = c; return c;
  }
  // draw into this.work the sheet with k passes finished plus pass k printing: p 0..1 (sweep angle `dir` in radians), mis-registration `off` decays
  render(k, p = 0, dir = 0, off = 0, soft = .22) {
    const x = this.work.getContext('2d'), W = this.work.width, H = this.work.height;
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.drawImage(this.comp(k), 0, 0);
    if (p > 0 && k < this.passes.length) {
      const t = this.tmp.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, W, H);
      const S = this.S, [dx, dy, dg] = this.reg(this.passes[k]), a = off * 10 * (hash(k * 3.7 + 1) > .5 ? 1 : -1), b = off * 8 * (hash(k * 5.3 + 2) > .5 ? 1 : -1);
      t.save(); t.translate(W / 2, H / 2); t.rotate((dg + off * 1.2) * Math.PI / 180); t.translate(-W / 2 + (this.m + dx + a) * S, -H / 2 + (this.m + dy + b) * S); t.drawImage(this.layer(this.passes[k]), 0, 0); t.restore();
      // sweep mask
      const cx = W / 2, cy = H / 2, L = Math.abs(Math.cos(dir)) * W + Math.abs(Math.sin(dir)) * H, ux = Math.cos(dir), uy = Math.sin(dir);
      const uF = lerp(-soft, 1, clamp(p)), a0 = -soft, a1 = 1 + soft, sc = a1 - a0;   // front position along the sheet axis
      const x0 = cx + ux * L * (a0 - .5), y0 = cy + uy * L * (a0 - .5), x1 = cx + ux * L * (a1 - .5), y1 = cy + uy * L * (a1 - .5);
      const g = t.createLinearGradient(x0, y0, x1, y1); g.addColorStop(clamp((uF - a0) / sc), 'rgba(0,0,0,1)'); g.addColorStop(clamp((uF + soft - a0) / sc), 'rgba(0,0,0,0)');
      t.globalCompositeOperation = 'destination-in'; t.fillStyle = g; t.fillRect(0, 0, W, H); t.globalCompositeOperation = 'source-over';
      x.save(); x.globalCompositeOperation = 'multiply'; x.drawImage(this.tmp, 0, 0); x.restore();
    }
    return this.work;
  }
}
