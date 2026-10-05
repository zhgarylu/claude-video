// script.js: the whole story of "She Knows" as data (no DOM, so the page, mix.py's event export and tools/export_srt.mjs all import it).
// Times are film seconds. The chat engine (chat.js) turns this into layout, camera and drawing; EV below turns it into sound cues.
export const DUR = 59.5;

export const PEOPLE = {
  me:    { name: 'You',       col: '#5a4be0', bg: '#5a4be0', ini: 'P' },
  tomas: { name: 'Tomás',     col: '#12806f', bg: '#1fa593', ini: 'T' },
  jun:   { name: 'Jun',       col: '#b8530c', bg: '#ef8a2d', ini: 'J' },
  bee:   { name: 'Aunt Bee',  col: '#a82c78', bg: '#d8479c', ini: 'B' },
  nana:  { name: 'Nana Rose', col: '#946200', bg: '#f0b02e', ini: 'N' },
};

// Nana's voice message: the Kokoro line in voices/nana.wav; word starts (s from the start of the clip) come from the speech check.
export const VOICE = {
  text: "Eight o'clock, then. I'll wear the green dress. And Tomás, bring the good chairs, not the plastic ones.",
  dur: 6.385,
  starts: [0, 0.2, 0.68, 1.54, 1.74, 1.92, 2.08, 2.24, 3.4, 3.42, 3.9, 4.18, 4.36, 4.5, 4.8, 5.16, 5.32, 5.66],   // 18 words
};

export const ITEMS = [
  { id: 'day', kind: 'system', text: 'Today', t: -1 },
  { id: 'm1', who: 'tomas', kind: 'text', text: 'Nobody tell Nana.', t: 0.3, time: '9:41', recall: { t: 18.0 } },
  { id: 'm2', who: 'bee', kind: 'text', text: 'Obviously.', t: 1.7, time: '9:41' },
  { id: 'm3', who: 'jun', kind: 'image', img: 'cake', caption: 'Cake draft v3', t: 3.0, time: '9:42',
    reactions: [{ t: 4.3, who: 'me', icon: 'heart' }], recall: { t: 18.5 } },
  { id: 'm4', who: 'me', kind: 'text', text: 'Garden, Sat 8pm. Chairs?', t: 6.0, time: '9:43', draft: { t0: 5.0 }, seen: 7.0 },
  { id: 'm5', who: 'tomas', kind: 'link', title: '24 folding chairs, 2 days', domain: 'hirewell.example', t: 7.4, time: '9:44',
    reactions: [{ t: 8.8, who: 'me', icon: 'laugh' }], recall: { t: 19.0 } },
  { id: 'm6', who: 'bee', kind: 'text', text: 'Adding folks so we all get the photos', t: 10.0, time: '9:46' },
  { id: 's1', kind: 'system', text: 'Aunt Bee added Nana Rose', t: 11.1, ping: true },
  { id: 'm7', who: 'tomas', kind: 'text', text: 'WAIT', t: 11.9, time: '9:46' },
  { id: 'm8', who: 'tomas', kind: 'text', text: 'Bee. Who did you just add?', t: 12.6, time: '9:46' },
  { id: 'm9', who: 'jun', kind: 'text', text: 'DELETE. EVERYTHING.', t: 13.9, time: '9:47' },
  { id: 'ty1', who: 'nana', kind: 'typing', t: 22.9, tEnd: 26.1 },
  { id: 'ty2', who: 'nana', kind: 'typing', t: 26.7, tEnd: 28.45 },
  { id: 'v1', who: 'nana', kind: 'voice', t: 28.5, tPlay: 29.0, time: '9:52',
    reactions: [{ t: 35.7, who: 'jun', icon: 'heart' }, { t: 36.1, who: 'bee', icon: 'heart' }, { t: 36.5, who: 'me', icon: 'heart' }, { t: 36.9, who: 'tomas', icon: 'heart' }] },
  { id: 'm10', who: 'tomas', kind: 'text', text: "Yes ma'am. Good chairs.", t: 37.9, time: '9:53' },
  { id: 'm11', who: 'tomas', kind: 'text', text: 'Bee. Did you do this on purpose?', t: 39.6, time: '9:53' },
  { id: 'm12', who: 'bee', kind: 'text', text: 'Obviously.', t: 41.2, time: '9:54', reply: { who: 'tomas', text: 'Bee. Did you do this on purpose?' } },
  { id: 's2', kind: 'system', text: 'You renamed the group', t: 42.8 },
  { id: 'ty3', who: 'nana', kind: 'typing', t: 45.2, tEnd: 47.6 },
  { id: 'n1', who: 'nana', kind: 'text', text: 'Notifications keep what you recall, dear.', t: 47.6, time: '9:56', seenBy: 49.2 },
];

export const RECALL_LABEL = { tomas: 'Tomás recalled a message', jun: 'Jun recalled a message' };

// the header: title, status line, pinned banner
export const TITLE = { first: "Nana's 80th", edit: { t: 42.8, to: "Nana's 80th (she knows)" } };
export const MEMBERS = [{ t: 0, text: '4 members' }, { t: 11.1, text: '5 members' }];
export const PINS = [{ t: 9.4, text: 'Garden, Sat 8pm. Chairs?' }, { t: 43.0, text: 'Nana Rose: Voice message' }];

// Priya's input field: the draft is typed from draft.t0 to the item's t, then sent
// the phone is held steady; the camera plan (target: base | {item, dy} | {x,y}); z = zoom, sx = screen shift in px; arrives at t + d
export const CAMS = [
  { t: 0, z: 2.45, tg: { item: 'm1', fx: 330, dy: -25 } },
  { t: 2.2, d: 1.0, z: 1.5, tg: 'base' },
  { t: 17.0, d: 1.0, z: 1.62, tg: 'base' },
  { t: 22.0, d: 1.3, z: 1.5, tg: 'base' },
  { t: 25.8, d: 2.6, z: 2.3, tg: { item: 'ty1', dy: -40 } },
  { t: 26.5, d: 0.6, z: 2.3, tg: { item: 'ty2', dy: -40 } },
  { t: 28.5, d: 0.9, z: 2.35, tg: { item: 'v1', dy: 0 } },
  { t: 36.4, d: 1.3, z: 1.55, tg: 'base' },
  { t: 46.6, d: 1.0, z: 1.9, tg: { item: 'ty3', dy: -80 } },
  { t: 47.9, d: 1.0, z: 1.5, tg: 'base', sx: -220 },
  { t: 55.8, d: 1.2, z: 3.3, tg: { x: 300, y: 484 }, sx: 0 },
];
export const SCROLLBACK = { t0: 17.0, up: 0.9, hold: 21.9, down: 0.9 };   // chat scrolls back to the top, then returns

// Nana's lock screen: what a recalled message still shows
export const BANNERS = [
  { t: 49.9, who: 'tomas', title: 'Tomás', body: 'Nobody tell Nana.' },
  { t: 51.0, who: 'jun', title: 'Jun', body: 'sent a photo' },
  { t: 52.1, who: 'tomas', title: 'Tomás', body: '24 folding chairs, 2 days' },
];
export const BANNER_LABEL = "Nana's lock screen";
export const CROP = { t0: 53.9, tShot: 55.8, tEnd: 57.0 };

// ---- sound cues (the mixer reads window.EV through events.json) ----
export function events() {
  const ev = [];
  const E = (t, type, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
  ITEMS.forEach((it, n) => {
    if (it.kind === 'typing') {
      for (let x = it.t + 0.15; x < it.tEnd - 0.1; x += 0.42) E(x, 'tt', { n: Math.round((x - it.t) / 0.42) });
      return;
    }
    if (it.kind === 'system') { if (it.t >= 0) E(it.t, it.ping ? 'ping' : 'sys'); return; }
    if (it.draft) {
      const nch = it.text.length, span = it.t - it.draft.t0 - 0.35;
      for (let k = 0; k < nch; k++) E(it.draft.t0 + 0.1 + (k / nch) * span, 'key', { k });
    }
    const sent = it.who === 'me';
    E(it.t, sent ? 'send' : 'in', { who: it.who, n });
    if (it.kind === 'voice') E(it.tPlay, 'voice');
    for (const r of it.reactions || []) E(r.t, 'react', { who: r.who });
    if (it.recall) E(it.recall.t, 'recall', { who: it.who });
    if (it.seen) E(it.seen, 'seen');
    if (it.seenBy) E(it.seenBy, 'seen');
  });
  const ed = TITLE.edit; const nDel = TITLE.first.length, nNew = ed.to.length;
  for (let k = 0; k < nDel + nNew; k++) E(ed.t + 0.15 + k / 22, 'key', { k: k + 40 });
  PINS.forEach(p => E(p.t, 'pin'));
  BANNERS.forEach(b => E(b.t, 'banner'));
  E(SCROLLBACK.t0, 'swish', { dir: 1 }); E(SCROLLBACK.hold, 'swish', { dir: -1 });
  E(CROP.t0, 'crop'); E(CROP.tShot, 'shutter');
  CAMS.forEach(c => { if (c.t > 1 && c.d) E(c.t, 'zoom', { z: c.z }); });
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

// subtitles (.srt): every message, in the order it arrives; Nana's voice message is the transcript
export function cues() {
  const out = [];
  for (const it of ITEMS) {
    if (it.kind === 'typing' || it.t < 0) continue;
    let text;
    if (it.kind === 'text') text = it.text;
    else if (it.kind === 'system') text = it.text;
    else if (it.kind === 'image') text = '[photo] ' + it.caption;
    else if (it.kind === 'link') text = '[link] ' + it.title;
    else if (it.kind === 'voice') text = '[voice message] ' + VOICE.text;
    const who = it.who && it.kind !== 'system' ? PEOPLE[it.who].name + ': ' : '';
    out.push({ t0: it.t, text: who + text, need: Math.max(1.8, (who + text).length / 15 + 1.5) });
  }
  out.sort((a, b) => a.t0 - b.t0);
  return out.map((c, i, a) => ({ t0: c.t0, t1: +Math.min(c.t0 + c.need, (a[i + 1] ? a[i + 1].t0 + 2.2 : DUR)).toFixed(2), text: c.text }));
}
