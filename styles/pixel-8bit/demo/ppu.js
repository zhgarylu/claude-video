// A constraint-checking picture unit for an 8-bit home console look.
//   Paper    : an authoring canvas of master-palette ids (0xFF = "backdrop").
//   compile  : turns paper into what the hardware could hold (<=256 tiles, 2-bit tiles, <=4 sub-palettes of 3 colours
//              chosen per 16x16 block, one shared backdrop colour per scanline band) and THROWS where the art does not fit.
//   render   : a scanline renderer: per-line scroll (split-scroll), <=8 sprites per line (the rest drop out), no alpha, no sub-pixels.
//   validate : audits a frame state and the framebuffer it produced.
import { isMaster, rgb, COUNT } from './palette.js';

export const W = 256, H = 240, BG = 0xff;
export const LIMITS = { tiles: 256, subPalettes: 4, colours: 3, spritesPerLine: 8, oam: 64, scrollSplits: 8, backdropSplits: 6, ntW: 64 };

export class Paper {
  constructor(w = W, h = H) { this.w = w; this.h = h; this.d = new Uint8Array(w * h).fill(BG); }
  px(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (c !== BG && !isMaster(c)) throw new Error('paper: not a master colour 0x' + c.toString(16) + ' at ' + x + ',' + y);
    this.d[y * this.w + x] = c;
  }
  get(x, y) { return this.d[y * this.w + ((x % this.w) + this.w) % this.w]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
  hline(x, y, w, c) { this.rect(x, y, w, 1, c); }
  disc(cx, cy, r, c) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) this.px(cx + i, cy + j, c); }
  // column-wise silhouette: for each x, fill from top(x) down to bottom
  skyline(x0, x1, bottom, top, c) { for (let x = x0; x < x1; x++) { const t = top(x); for (let y = t; y < bottom; y++) this.px(x, y, c); } }
  // repeat a painter every `period` px across the whole width (so the nametable wraps cleanly)
  tiled(period, fn) { for (let x0 = 0; x0 < this.w; x0 += period) fn(x0); }
}

// ---------- compile ----------
export function compile(paper, { bd, name = 'scene', pals: want } = {}) {
  const bdAt = typeof bd === 'function' ? bd : () => bd;
  const bw = paper.w / 16, bh = paper.h / 16;
  const sets = [];                                   // per 16x16 block: sorted colour ids
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const s = new Set();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const c = paper.d[(by * 16 + y) * paper.w + bx * 16 + x];
      if (c !== BG && c !== bdAt(by * 16 + y)) s.add(c);
    }
    if (s.size > LIMITS.colours) throw new Error(`[${name}] block (${bx * 16},${by * 16}) needs ${s.size} colours + backdrop: ` + [...s].map(c => '0x' + c.toString(16)).join(' '));
    sets.push([...s].sort((a, b) => a - b));
  }
  // choose <=4 sub-palettes of <=3 colours so every block's set fits in one of them (small search with backtracking)
  const uniq = [...new Map(sets.map(s => [s.join(','), s])).values()].filter(s => s.length).sort((a, b) => b.length - a.length);
  const pals = [];
  const solve = i => {
    if (i === uniq.length) return true;
    const s = uniq[i];
    for (const p of pals) if (s.every(c => p.includes(c))) return solve(i + 1);
    for (let k = 0; k < pals.length; k++) {
      const u = [...new Set([...pals[k], ...s])];
      if (u.length <= LIMITS.colours) { const old = pals[k]; pals[k] = u; if (solve(i + 1)) return true; pals[k] = old; }
    }
    if (pals.length < LIMITS.subPalettes) { pals.push([...s]); if (solve(i + 1)) return true; pals.pop(); }
    return false;
  };
  if (!solve(0)) throw new Error(`[${name}] cannot fit the art into ${LIMITS.subPalettes} sub-palettes of ${LIMITS.colours} colours (${uniq.length} distinct block colour sets)`);
  while (pals.length < LIMITS.subPalettes) pals.push([]);
  pals.forEach(p => p.sort((a, b) => a - b));
  if (want) for (let i = 0; i < 4; i++) if (want[i]) { // optional: keep a requested order/padding (same members)
    if (want[i].length !== pals[i].length && pals[i].length > want[i].length) throw new Error('palette hint too small');
  }
  const attr = new Uint8Array(bw * bh);
  sets.forEach((s, i) => { const k = pals.findIndex(p => s.every(c => p.includes(c))); attr[i] = k < 0 ? 0 : k; });
  // tiles: dedupe 8x8 index patterns
  const map = new Map(), chr = [], tw = paper.w / 8, th = paper.h / 8, nt = new Uint16Array(tw * th);
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    const p = pals[attr[(ty >> 1) * bw + (tx >> 1)]], t = new Uint8Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const c = paper.d[(ty * 8 + y) * paper.w + tx * 8 + x];
      t[y * 8 + x] = c === BG || c === bdAt(ty * 8 + y) ? 0 : p.indexOf(c) + 1;
    }
    const key = t.join('');
    let id = map.get(key);
    if (id === undefined) { id = chr.length; map.set(key, id); chr.push(t); }
    nt[ty * tw + tx] = id;
  }
  if (chr.length > LIMITS.tiles) throw new Error(`[${name}] ${chr.length} unique tiles > ${LIMITS.tiles}`);
  return { name, chr, nt, ntW: tw, ntH: th, attr, attrW: bw, pals, tiles: chr.length };
}

// ---------- sprites ----------
// A sprite sheet is built from ASCII 8x8 tiles: '.' = transparent, '1'..'3' = colour index of the object's sub-palette.
export function tileFromAscii(rows) {
  if (rows.length !== 8 || rows.some(r => r.length !== 8)) throw new Error('sprite tile must be 8x8');
  const t = new Uint8Array(64);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; if (!'123'.includes(ch)) throw new Error('sprite pixel must be . 1 2 3, got ' + ch); t[y * 8 + x] = +ch; }));
  return t;
}
export class Sheet {
  constructor() { this.tiles = []; this.names = {}; }
  add(name, rows) { this.names[name] = this.tiles.length; this.tiles.push(tileFromAscii(rows)); if (this.tiles.length > LIMITS.tiles) throw new Error('sprite tiles > 256'); return this.names[name]; }
  // a 16-wide x N-tall picture split into 8x8 tiles, named name_<tx>_<ty>
  addBig(name, rows) {
    const w = rows[0].length, h = rows.length;
    if (w % 8 || h % 8 || rows.some(r => r.length !== w)) throw new Error('bad big sprite ' + name);
    for (let ty = 0; ty < h / 8; ty++) for (let tx = 0; tx < w / 8; tx++) this.add(`${name}_${tx}_${ty}`, rows.slice(ty * 8, ty * 8 + 8).map(r => r.slice(tx * 8, tx * 8 + 8)));
  }
  id(name) { if (!(name in this.names)) throw new Error('no sprite tile ' + name); return this.names[name]; }
}

// ---------- render ----------
export function blankState(scene, sheet) {
  return {
    scene, sheet, bgPal: scene.pals.map(p => p.slice()), sprPal: [[], [], [], []], backdrop: new Array(H).fill(0x0d),
    scrollX: new Array(H).fill(0), scrollY: new Array(H).fill(0), oam: [], size: 8,
  };
}
export function render(st, fb = new Uint8Array(W * H)) {
  const { scene, sheet, bgPal, sprPal, backdrop, scrollX, scrollY, oam, size } = st;
  const ntW = scene.ntW, ntH = scene.ntH, pxW = ntW * 8, pxH = ntH * 8;
  const stats = { perLine: new Uint8Array(H), dropped: new Uint8Array(H), droppedSprites: 0, maxLine: 0 };
  const lost = new Set();
  const bgIdx = new Uint8Array(W);
  const ovs = st.overlays || [];
  for (let y = 0; y < H; y++) {
    // an overlay is a second background bank switched in on these scanlines (own tiles, own sub-palettes, no scroll)
    const ov = ovs.find(o => y >= o.y0 && y < o.y1);
    const sc = ov ? ov.scene : scene, pals = ov ? ov.bgPal : bgPal;
    const nW = sc.ntW * 8, nH = sc.ntH * 8;
    const sx = ov ? 0 : scrollX[y], sy = ov ? (y - ov.y0) % nH : (((y + scrollY[y]) % nH) + nH) % nH;
    const ty = sy >> 3, ry = sy & 7, bdc = ov ? ov.bd : backdrop[y];
    for (let x = 0; x < W; x++) {
      const nx = (((x + sx) % nW) + nW) % nW, tx = nx >> 3;
      const t = sc.chr[sc.nt[ty * sc.ntW + tx]];
      const i = t[ry * 8 + (nx & 7)];
      bgIdx[x] = i;
      fb[y * W + x] = i === 0 ? bdc : pals[sc.attr[(sy >> 4) * sc.attrW + (nx >> 4)]][i - 1];
    }
    // sprite evaluation: first 8 in OAM order whose rows cover this line; the rest are lost (the classic dropout)
    const on = [];
    for (let k = 0; k < oam.length; k++) {
      const o = oam[k];
      if (y >= o.y && y < o.y + size) { if (on.length < 8) on.push(k); else { stats.dropped[y]++; lost.add(k); } }
    }
    stats.perLine[y] = on.length; if (on.length > stats.maxLine) stats.maxLine = on.length;
    for (let n = on.length - 1; n >= 0; n--) {       // lower index drawn last = in front
      const o = oam[on[n]];
      let r = y - o.y; if (o.flipV) r = size - 1 - r;
      const tile = size === 16 ? (o.tile & 0xfe) + (r >= 8 ? 1 : 0) : o.tile, t = sheet.tiles[tile], rr = r & 7;
      for (let c = 0; c < 8; c++) {
        const x = o.x + c; if (x < 0 || x >= W) continue;
        const i = t[rr * 8 + (o.flipH ? 7 - c : c)];
        if (i === 0 || (o.behind && bgIdx[x] !== 0)) continue;
        fb[y * W + x] = sprPal[o.pal][i - 1];
      }
    }
  }
  stats.droppedSprites = lost.size;
  return { fb, stats };
}

// ---------- validate ----------
export function validate(st, out, label = 'frame') {
  const errs = [], rep = {};
  const palOK = (p, nm) => { if (p.length > LIMITS.colours) errs.push(nm + ' has >3 colours'); p.forEach(c => { if (!isMaster(c)) errs.push(nm + ' colour not in master palette: ' + c); }); };
  if (st.bgPal.length > 4) errs.push('more than 4 background sub-palettes');
  if (st.sprPal.length > 4) errs.push('more than 4 sprite sub-palettes');
  st.bgPal.forEach((p, i) => palOK(p, 'bg' + i)); st.sprPal.forEach((p, i) => palOK(p, 'spr' + i));
  if (!isMaster(st.backdrop[0])) errs.push('backdrop not master');
  if (st.oam.length > LIMITS.oam) errs.push('OAM > 64');
  st.oam.forEach((o, k) => {
    if (![o.x, o.y, o.tile, o.pal].every(Number.isInteger)) errs.push('sub-pixel / non-integer sprite #' + k);
    if (o.pal < 0 || o.pal > 3) errs.push('sprite palette index #' + k);
  });
  [...st.scrollX, ...st.scrollY].forEach(v => { if (!Number.isInteger(v)) errs.push('sub-pixel scroll'); });
  (st.overlays || []).forEach((o, i) => { o.bgPal.forEach((p, k) => palOK(p, 'overlay' + i + '.bg' + k)); if (!isMaster(o.bd)) errs.push('overlay backdrop'); });
  rep.bankSwitches = (st.overlays || []).length * 2; if ((st.overlays || []).length > 2) errs.push('more than 2 overlay banks');
  const splits = a => { let n = 0; for (let y = 1; y < H; y++) if (a[y] !== a[y - 1]) n++; return n; };
  rep.scrollSplits = splits(st.scrollX); rep.backdropSplits = splits(st.backdrop);
  if (rep.scrollSplits > LIMITS.scrollSplits) errs.push('too many scroll splits: ' + rep.scrollSplits);
  if (rep.backdropSplits > LIMITS.backdropSplits) errs.push('too many backdrop splits: ' + rep.backdropSplits);
  const used = new Set(out.fb); used.forEach(c => { if (!isMaster(c)) errs.push('framebuffer holds non-master id ' + c); });
  rep.coloursOnScreen = used.size; rep.maxSpritesPerLine = out.stats.maxLine;
  rep.linesWithDropout = out.stats.dropped.reduce((n, v) => n + (v ? 1 : 0), 0);
  rep.spritesDroppedSomewhere = out.stats.droppedSprites;
  if (out.stats.maxLine > LIMITS.spritesPerLine) errs.push('more than 8 sprites drawn on a line');
  rep.bgTiles = st.scene.tiles; rep.sprTiles = st.sheet.tiles.length;
  return { label, ok: !errs.length, errs, rep };
}

// ---------- presentation (outside the console): integer upscale + optional scanline darkening ----------
export function toRGBA(fb, w = W, h = H) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const c = rgb(fb[i]); d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
  return d;
}
export { COUNT };
