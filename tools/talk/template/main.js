// Template page for a talking-head film. Reads film.json, draws the host in the chosen layout, adds the content and the captions.
// Replace drawContent() with the style's own graphics: this default is a plain placeholder (title + the items from film.json).
import { loadHost } from '/tools/talk/host.js';
import { splitLayout, pipLayout, worldLayout, captions, bullets, cuesFromWords, THEME } from '/tools/talk/layouts.js';

const W = 1920, H = 1080, ctx = document.getElementById('c').getContext('2d');
const F = await fetch('film.json').then(r => r.json());
const host = await loadHost('src');
const words = await fetch('src/words.json').then(r => r.json());
const theme = { ...THEME, ...(F.theme || {}), hues: { ...THEME.hues, ...((F.theme || {}).hues || {}) } };
const cues = Array.isArray(F.captions?.cues) ? F.captions.cues : cuesFromWords(words);
const items = F.cards || [], texts = [];
const tail = F.tail ?? 0, DUR = host.duration + tail;
const QS = new URLSearchParams(location.search), POSTER = QS.has('poster'), AT = parseFloat(QS.get('at') || '5');
const dark = F.layout === 'split';
if (dark) { theme.ink = '#E9EEF8'; theme.muted = '#98A4BB'; theme.paper = '#0E1522'; }

const layout = F.layout === 'split' ? splitLayout(host, { W, H, theme, ...(F.split || {}) })
  : F.layout === 'pip' ? pipLayout(host, { W, H, theme, ...(F.pip || {}) })
  : worldLayout(host, { W, H, theme, cards: items, ...(F.world || {}) });
const exitAt = F.exitAt ?? host.duration - .2;                       // when the host leaves (split / pip); omit the tail to keep it to the end

function drawContent(t) {                                            // ← your style goes here
  const title = F.title || '', sub = F.subtitle || '';
  const rect = F.layout === 'split' ? layout.content : { x: 60, y: 150, w: 900, h: 700 };
  if (F.layout !== 'world') {
    ctx.font = theme.font(700, 76); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = Math.min(1, t / .5); ctx.fillText(title, rect.x + 56, rect.y + 110);
    if (sub) { ctx.font = theme.font(500, 34); ctx.fillStyle = theme.muted; ctx.fillText(sub, rect.x + 56, rect.y + 168); } ctx.globalAlpha = 1;
    bullets(ctx, items, t, { ...rect, y: rect.y + 130 }, { theme, texts });
  }
}

window.DUR = DUR; window.EV = [];
window.render = (t0) => {
  const t = POSTER ? AT : t0, time = POSTER ? AT : Math.min(t0, host.duration - .05);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; texts.length = 0;
  if (F.layout === 'world') { layout.drawGround(ctx, t, { time }); layout.drawVideo(ctx, t, { time }); layout.drawCards(ctx, t, { texts }); drawContent(t); }
  else {
    ctx.fillStyle = dark ? '#05070c' : theme.ground; ctx.fillRect(0, 0, W, H);
    if (F.layout === 'split') { layout.drawPanel(ctx); drawContent(t); layout.drawHost(ctx, time, { exit: Math.max(0, Math.min(1, (t - exitAt) / .8)) }); }
    else { drawContent(t); layout.draw(ctx, t, { exit: Math.max(0, Math.min(1, (t - exitAt) / .6)), time }); }
  }
  if (!POSTER) (F.captions?.style === 'pill' ? captions.pill : captions.card)(ctx, cues, t, { W, H, theme });
};
window.TEXTS = (t) => { window.render(t); return texts; };
window.READY = true;
