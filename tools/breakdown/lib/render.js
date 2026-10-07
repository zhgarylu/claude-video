// createFilm(): builds window.render / TEXTS / EV / DUR from breakdown.json (the spec) and timeline.json (what prep.py computed: times, reveals, cues).
//   import { createFilm } from '/tools/breakdown/lib/render.js';
//   await createFilm({ canvas, spec, tl, query: new URLSearchParams(location.search) });
import { resolveTheme, rgba } from './theme.js';
import { layoutFor } from './layout.js';
import { clamp, seg, ss, wrap, font, chip, measure } from './draw.js';
import { Clip, loadStill } from './source.js';
import { hook, clip, freeze, explain, compare, mmss, ground } from './shots.js';

const DRAW = { hook, clip, freeze, explain, compare };
export async function createFilm({ canvas, spec, tl, query }) {
  const aspect = query.get('aspect') || spec.aspect || '16x9', [aw, ah] = aspect.split('x').map(Number), V = ah > aw;
  const W = V ? 1080 : 1920, H = V ? 1920 : 1080; canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
  const th = resolveTheme(spec.theme), L = layoutFor(W, H);
  const POSTER = query.has('poster'), DRY = query.has('dry'), AT = parseFloat(query.get('at') || '2');
  const shots = spec.shots.map(s => ({ ...s, ...tl.shots.find(x => x.id === s.id) })), total = (spec.sections || []).length;
  const clips = new Map(), pips = new Map(), stills = new Map();
  await Promise.all(shots.flatMap(s => {
    const jobs = [];
    if (s.type === 'clip') jobs.push(new Clip(`work/frames/${s.id}`).init().then(c => clips.set(s.id, c)));
    if (s.type === 'clip' && s.pip) jobs.push(new Clip(`work/frames/${s.id}_pip`).init().then(c => pips.set(s.id, c)).catch(() => 0));
    if (s.type === 'freeze') jobs.push(loadStill(`work/stills/${s.id}.jpg`).then(im => stills.set(s.id, im)));
    if (s.type === 'hook' && s.bg) jobs.push(loadStill(`work/stills/${s.id}_bg.jpg`).then(im => stills.set(s.id + ':bg', im)));
    return jobs;
  }));
  const allText = shots.map(s => JSON.stringify(s)).join('') + '解读示意非官方画面原片已暂停个看点结论依据：' + '0123456789 /';
  await Promise.all([500, 600, 700, 800, 900].map(w => document.fonts.load(`${w} 40px "Noto Sans SC"`, allText)));

  let texts = [];
  const R = { ctx, W, H, L, th, spec, clips, pips, stills, alpha: 1, shot: null, report(id, text, x0, y0, x1, y1, a = 1, stable = false) { if (a * R.alpha > .5) texts.push({ id: stable ? id : `${R.shot.id}:${id}`, text, x0, y0, x1, y1 }); } };
  const shotAt = t => shots.find(s => t >= s.t0 && t < s.t0 + s.dur) || shots[shots.length - 1];

  function tagOf(sh) {
    if (sh.type === 'clip' || sh.type === 'freeze') return { text: sh.tag ?? spec.tag ?? '官方演示 · 节选', own: false };
    if (sh.type === 'explain' || sh.type === 'compare') return { text: '解读示意 · 非官方画面', own: true };
    return { text: spec.series ?? '实录解读', own: false };
  }
  function chrome(sh, lt, a) {
    const tg = tagOf(sh), S = L.sizes.tag;
    ctx.save(); ctx.globalAlpha *= a;
    chip(R, tg.text, L.tag.x, L.tag.y, { size: S, h: L.tag.h, dot: tg.own ? th.warnInk : th.accent, bg: tg.own ? th.warn : th.plate, color: tg.own ? th.warnInk : th.plateInk, border: tg.own ? null : rgba(th.accent, .7), id: 'tag', stable: true });
    let label = '', n = sh.section;
    if (sh.type === 'hook') label = total ? `${total} 个看点` : '';
    else if (n) label = `${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}  ${(spec.sections || [])[n - 1] ?? ''}`.trim();
    else if (sh.type === 'compare') label = '结论';
    if (label) {
      let size = S; const maxW = L.W - 2 * L.M - 640 + (V ? 300 : 0); while (size > 30 && measure(R, label, 800, size) + 44 > maxW) size -= 2;
      const c = chip(R, label, L.prog.xr, L.prog.y, { size, h: L.prog.h, align: 'right', id: 'prog', stable: true });
      if (n && total) { ctx.fillStyle = rgba(th.accent, .3); ctx.fillRect(c.x + 8, c.y + c.h + 6, c.w - 16, 6); ctx.fillStyle = th.accent; ctx.fillRect(c.x + 8, c.y + c.h + 6, (c.w - 16) * ((n - 1 + clamp(lt / sh.dur)) / total), 6); }
    }
    if (sh.type === 'clip') chip(R, `原片 ${mmss((sh.in ?? 0) + lt)}`, L.tc.x, L.tc.y, { size: 30, h: L.tc.h, weight: 700, color: th.muted, shadow: false });
    if (sh.type === 'freeze') chip(R, `已暂停 ${mmss(sh.t ?? 0)}`, L.tc.x, L.tc.y, { size: 30, h: L.tc.h, weight: 700, color: th.muted, shadow: false });
    ctx.restore();
  }
  function subtitles(t, sh) {
    const cue = (tl.cues || []).find(c => t >= c.t0 && t < c.t1); if (!cue) return;
    const S = L.sub, onFootage = sh.type === 'clip' || sh.type === 'freeze', dark = onFootage || th.dark, a = ss(seg(t, cue.t0, cue.t0 + .12)) * (1 - ss(seg(t, cue.t1 - .08, cue.t1)));
    ctx.save(); ctx.globalAlpha = a; ctx.font = font(R, 800, S.size); let lines = wrap(ctx, cue.text, S.maxW);
    if (lines.length === 2) {            // balance two lines instead of a full line plus an orphan
      const chars = [...cue.text], total = ctx.measureText(cue.text).width; let best = 1, bd = 1e9;
      for (let i = 1; i < chars.length; i++) { const d = Math.abs(ctx.measureText(chars.slice(0, i).join('')).width - total / 2) + ('，。、；：！？'.includes(chars[i]) ? 400 : 0); if (d < bd) { bd = d; best = i; } }
      lines = [chars.slice(0, best).join('').trim(), chars.slice(best).join('').trim()];
    }
    const top = S.bottom - lines.length * S.lh;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    lines.forEach((ln, i) => { const y = top + (i + 1) * S.lh - 16; if (dark) { ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 11; ctx.strokeText(ln, S.x, y); } ctx.fillStyle = dark ? '#FFFFFF' : th.ink; ctx.fillText(ln, S.x, y); });
    ctx.restore();
  }
  function scrim(sh) {
    const S = L.sub, onFootage = sh.type === 'clip' || sh.type === 'freeze'; if (!onFootage && !th.dark) return;
    const g = ctx.createLinearGradient(0, S.scrimTop, 0, S.scrimSolid); g.addColorStop(0, `rgba(${th.scrim},0)`); g.addColorStop(1, `rgba(${th.scrim},${onFootage ? .88 : .72})`);
    ctx.fillStyle = g; ctx.fillRect(0, S.scrimTop, W, H - S.scrimTop);
  }
  function draw(t) {
    const sh = shotAt(t), lt = t - sh.t0, a = Math.min(sh.t0 === 0 ? 1 : ss(seg(lt, 0, .14)), 1 - ss(seg(lt, sh.dur - .14, sh.dur)));
    R.shot = sh; R.alpha = a;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ground(R);
    ctx.globalAlpha = a; DRAW[sh.type](R, sh, lt); ctx.globalAlpha = 1;
    scrim(sh); chrome(sh, lt, a); if (!POSTER) subtitles(t, sh);
    return sh;
  }
  async function prime(t) {
    const sh = shotAt(t), lt = t - sh.t0;
    if (sh.type === 'clip') { await clips.get(sh.id)?.need(lt); await pips.get(sh.id)?.need(lt); }
  }
  const DUR = tl.dur;
  window.DUR = DUR;
  window.render = t => { t = POSTER ? AT : t; if (DRY) return; texts = []; return prime(t).then(() => { draw(clamp(t, 0, DUR - 1e-3)); }); };
  window.TEXTS = t => { texts = []; const keep = clips; draw(clamp(t, 0, DUR - 1e-3)); return texts; };
  // sound events from the same reveal times
  const kind = k => k.split(':')[0], EVT = { box: 'box', arrow: 'arrow', mark: 'mark', card: 'card', node: 'node', edge: 'edge', item: 'item', panel: 'panel', col: 'col', row: 'row', verdict: 'verdict', value: 'value', zoom0: 'zoom', kicker: 'hit', title: 'hit', big: 'hit', meta: 'tick', lower: 'lower', head: 'tick' };
  window.EV = shots.flatMap(s => [{ t: s.t0, type: 'cut', shot: s.type }, ...(s.type === 'freeze' ? [{ t: s.t0 + .02, type: 'shutter' }] : []),
    ...Object.entries(s.sched || {}).filter(([k]) => EVT[kind(k)] && !(s.type === 'hook' && kind(k) === 'title' && false)).map(([k, v]) => ({ t: s.t0 + v, type: EVT[kind(k)], key: k, shot: s.type }))]).sort((a, b) => a.t - b.t);
  window.READY = true;
}
