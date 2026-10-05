// script.js: the lesson as data. Every time comes from timeline.json (tools/plan.py: the voice lines laid end to end), so
// picture, sound and captions share one clock. build(TL) -> { cards, caps, poses, titles, dots, cams, events, DUR }.
// (no imports: tools/export_srt.mjs loads this file in Node, and the page loads it in the browser)
const C = { red: '#e0392d', blue: '#2c6ae0', yel: '#ffd23a', teal: '#1f9b9b', orange: '#f2a02a', plum: '#8a4fd0' };   // same values as kit.js

const G = { in: C.blue, on: C.plum, at: C.orange };

export function build(TL) {
  const L = id => TL.lines[id] || (() => { throw new Error('no line ' + id); })(), M = n => TL.marks[n] ?? (() => { throw new Error('no mark ' + n); })();
  const DUR = TL.dur, EV = [];
  const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
  const cards = [];

  // ================================================================ 0. cover: the dense reference card
  const cT = 0.0;
  cards.push({
    id: 'cover', tIn: 0, tOut: M('cover.out'), tall: true, inDur: .01,
    faces: [{
      t0: 0, face: {
        type: 'rule', T: { at: -.45 },
        kw: [{ w: 'at', c: G.at }, { w: 'on', c: G.on }, { w: 'in', c: G.in }],
        core: '一个点用 at，一天用 on，一段用 in',
        boxes: [
          { w: 'at', c: G.at, icon: 'clock', mean: '几点钟 · 某一刻', ex: ['at noon', 'at 7:30'] },
          { w: 'on', c: G.on, icon: 'calendar', mean: '具体的某一天', ex: ['on Friday', 'on May 1st'] },
          { w: 'in', c: G.in, icon: 'span', mean: '一段较长的时间', ex: ['in 2025', 'in summer'] },
        ],
        ex: [
          { en: [{ t: 'The film starts ' }, { t: 'at noon', c: G.at }, { t: '.' }], zh: '电影中午开始。' },
          { en: [{ t: 'We have a test ' }, { t: 'on Friday', c: G.on }, { t: '.' }], zh: '星期五有测验。' },
          { en: [{ t: 'She was born ' }, { t: 'in 2015', c: G.in }, { t: '.' }], zh: '她出生于2015年。' },
        ],
      }
    }],
  });
  ev(0.05, 'cover');

  // ================================================================ 1. quiz loop A: in July
  const A = {
    id: 'A', tIn: M('A.in'), tOut: M('A.out'),
  };
  const aFlip = L('a11').t0 - .35;
  const aAns = [L('a10').t0 - .25, L('a10').t0 + .5];
  A.faces = [{
    t0: 0, t1: aFlip, face: {
      type: 'cloze', q: 'Q1', tag: '介词 · 时间', lang: 'lat',
      tokens: [{ t: 'My' }, { t: 'birthday' }, { t: 'is' }, { blank: true }, { t: 'July.', clue: true }],
      tr: '我的生日在七月。', size: 68,
      opts: [{ t: 'on' }, { t: 'in' }, { t: 'at' }], correct: 1, ans: 'in',
      ribbon: { t0: L('a4').t0 - .05, t1: aFlip, parts: [{ t: '月份 · 季节 · 大时间 ＝ ' }, { t: 'in', c: C.red, s: 54 }] },
      T: { chips: [L('a3').t0 - .1, L('a3').t0 + .04, L('a3').t0 + .18], ring: [M('A.think0'), M('A.think1')], ticks: [0, .6, 1.2, 1.8].map(x => M('A.think0') + x), ans: aAns, clue: { t0: L('a7').t0 - .05, t1: aFlip, tag: '月份' } },
    }
  }, {
    t0: aFlip, face: {
      type: 'repeat', lang: 'lat', size: 92, labels: ['慢速', '正常速度'],
      tokens: [{ t: 'My' }, { t: 'birthday' }, { t: 'is' }, { t: 'in' }, { t: 'July.' }], tr: '我的生日在七月。',
      T: { passes: [{ t0: L('a12').t0, t1: L('a12').t1 }, { t0: L('a14').t0, t1: L('a14').t1 }], words: TL.words.a12.map((w, i) => [w, TL.words.a14[i]]) },
    }
  }];
  cards.push(A);
  A.faces[0].face.T.chips.forEach((t, i) => ev(t, 'chip', { i }));
  A.faces[0].face.T.ticks.forEach((t, k) => ev(t, 'tick', { k }));
  ev(M('A.think1'), 'tickend'); ev(A.faces[0].face.ribbon.t0, 'ribbon'); ev(A.faces[0].face.T.clue.t0, 'tag');
  ev(aAns[0], 'scratch', { d: aAns[1] - aAns[0] }); ev(aAns[1], 'ding'); ev(aFlip, 'flip');
  TL.words.a12.forEach(w => ev(w[0], 'word', { slow: 1 })); TL.words.a14.forEach(w => ev(w[0], 'word', { slow: 0 }));

  // ================================================================ 2. quiz loop B: on Monday (cloze, minimal pair, repeat)
  const B = { id: 'B', tIn: M('B.in'), tOut: M('B.out') };
  const bCmp = L('b9').t0 - .3;
  const bAns = [L('b8').t0 - .25, L('b8').t0 + .5];
  B.faces = [{
    t0: 0, t1: bCmp, face: {
      type: 'cloze', q: 'Q2', tag: '介词 · 时间', lang: 'lat',
      tokens: [{ t: 'The' }, { t: 'party' }, { t: 'is' }, { blank: true }, { t: 'Monday.', clue: true }],
      tr: '派对在星期一。', size: 68,
      opts: [{ t: 'in' }, { t: 'at' }, { t: 'on' }], correct: 2, ans: 'on',
      ribbon: { t0: L('b4').t0 - .05, t1: bCmp, parts: [{ t: '具体哪一天 ＝ ' }, { t: 'on', c: C.red, s: 54 }] },
      T: { chips: [L('b3').t0 - .1, L('b3').t0 + .04, L('b3').t0 + .18], ring: [M('B.think0'), M('B.think1')], ticks: [0, .6, 1.2, 1.8].map(x => M('B.think0') + x), ans: bAns, clue: { t0: L('b5').t0 + .1, t1: bCmp, tag: '某一天' } },
    }
  }, {
    t0: bCmp, face: {
      type: 'compare', label: '对比', lang: 'lat',
      panels: [
        { c: G.on, icon: 'calendar', tokens: [{ t: 'on', hl: true }, { t: 'Monday', clue: true }], tag: '一天', tr: '星期一', size: 54 },
        { c: G.at, icon: 'clock', tokens: [{ t: 'at', hl: true }, { t: "7 o'clock", clue: true }], tag: '一个点', tr: '七点整', size: 54 },
      ],
      T: { panels: [L('b9').t0 - .1, L('b9').t0 + .3], clues: [L('b9').t0 + .6, L('b9').t0 + 1.0] },
    }
  }];
  cards.push(B);
  B.faces[0].face.T.chips.forEach((t, i) => ev(t, 'chip', { i }));
  B.faces[0].face.T.ticks.forEach((t, k) => ev(t, 'tick', { k }));
  ev(M('B.think1'), 'tickend'); ev(B.faces[0].face.ribbon.t0, 'ribbon'); ev(B.faces[0].face.T.clue.t0, 'tag');
  ev(bAns[0], 'scratch', { d: bAns[1] - bAns[0] }); ev(bAns[1], 'ding'); ev(bCmp, 'flip');
  B.faces[1].face.T.panels.forEach(t => ev(t, 'chip', { i: 1 })); B.faces[1].face.T.clues.forEach(t => ev(t, 'tag'));

  // ================================================================ 3. the same cards in other languages
  const mt = ['MON.1', 'MON.2', 'MON.3'].map(M), mEnd = M('HOOK');
  const quick = (t0) => ({ chips: [t0 + .4, t0 + .5, t0 + .6], ring: [t0 + .7, t0 + 1.5], ticks: [t0 + .7, t0 + 1.1], ans: [t0 + 2.1, t0 + 2.6] });
  const de = quick(mt[0]), ja = quick(mt[1]);
  cards.push({
    id: 'DE', tIn: mt[0], tOut: mt[1] - .05,
    faces: [{
      t0: 0, face: {
        type: 'cloze', q: 'DE', tag: '德语 · 冠词', lang: 'lat', size: 70,
        tokens: [{ blank: true }, { t: 'Sonne', gender: 'f', clue: true }, { t: 'scheint.' }], blankW: 190,
        tr: '太阳在照耀。', opts: [{ t: 'Der', g: 'm' }, { t: 'Die', g: 'f' }, { t: 'Das', g: 'n' }], correct: 1, ans: 'Die', ansScale: 1.4,
        T: { ...de, gender: mt[0] + 1.6, clue: { t0: mt[0] + 1.55, t1: mt[1], tag: '阴性' } },
      }
    }],
  });
  cards.push({
    id: 'JA', tIn: mt[1], tOut: mt[2] - .05,
    faces: [{
      t0: 0, face: {
        type: 'cloze', q: 'JA', tag: '日语 · 助词', lang: 'ja', size: 84, nospace: true,
        tokens: [{ t: '猫', r: 'ねこ' }, { blank: true }, { t: '好', r: 'す', clue: true }, { t: 'き。', clue: true }], blankW: 130,
        tr: '喜欢猫。', opts: [{ t: 'が', lang: 'ja', size: 70 }, { t: 'を', lang: 'ja', size: 70 }, { t: 'に', lang: 'ja', size: 70 }], correct: 0, ans: 'が', ansScale: 0.95,
        T: { ...ja, clue: { t0: mt[1] + 1.55, t1: mt[2], tag: '喜欢→が' } },
      }
    }],
  });
  const es = quick(mt[2]);
  cards.push({
    id: 'ES', tIn: mt[2], tOut: mEnd - .05,
    faces: [{
      t0: 0, face: {
        type: 'compare', label: 'SER ≠ ESTAR', lang: 'lat',
        panels: [
          { c: C.teal, icon: 'span', tokens: [{ t: 'Soy', clue: true, hl: true }, { t: 'aburrido.' }], tag: '本性', tr: '我很无趣。', size: 56 },
          { c: C.orange, icon: 'clock', tokens: [{ t: 'Estoy', clue: true, hl: true }, { t: 'aburrido.' }], tag: '状态', tr: '我觉得无聊。', size: 56 },
        ],
        T: { panels: [mt[2] + .3, mt[2] + .6], clues: [mt[2] + 1.0, mt[2] + 1.5] },
      }
    }],
  });
  [de, ja].forEach((q, k) => { q.chips.forEach((t, i) => ev(t, 'chip', { i })); q.ticks.forEach((t, j) => ev(t, 'tick', { k: j })); ev(q.ring[1], 'tickend'); ev(q.ans[0], 'scratch', { d: q.ans[1] - q.ans[0] }); ev(q.ans[1], 'ding'); });
  ev(mt[0] + 1.55, 'tag'); ev(mt[1] + 1.55, 'tag'); ev(mt[2] + .3, 'chip', { i: 1 }); ev(mt[2] + .6, 'chip', { i: 2 }); ev(mt[2] + 1.0, 'tag'); ev(mt[2] + 1.5, 'tag'); ev(mt[2] + 2.4, 'ding');

  // ================================================================ 4. the next question (the hook)
  const hr0 = M('H.ring0'), hr1 = hr0 + 3.4;
  cards.push({
    id: 'H', tIn: M('HOOK'), tOut: 1e9,
    faces: [{
      t0: 0, face: {
        type: 'cloze', q: 'Q3', tag: '介词 · 搭配', lang: 'lat', size: 66,
        tokens: [{ t: 'She' }, { t: 'is' }, { t: 'good' }, { blank: true }, { t: 'English.' }],
        tr: '她的英语很好。', opts: [{ t: 'in' }, { t: 'on' }, { t: 'at' }], correct: 2, ans: 'at',
        T: { chips: [L('h1').t0 + .2, L('h1').t0 + .34, L('h1').t0 + .48], ring: [hr0, hr1], ticks: [0, .6, 1.2, 1.8, 2.4, 3.0].map(x => hr0 + x) },     // no ans: the answer never appears in this film
      }
    }],
  });
  [0, 1, 2].forEach(i => ev(L('h1').t0 + .2 + i * .14, 'chip', { i })); [0, .6, 1.2, 1.8, 2.4, 3.0].forEach((x, k) => ev(hr0 + x, 'tick', { k }));

  // ================================================================ captions (burned in; also the .srt)
  const cue = (ids, parts, o = {}) => { const t0 = L(ids[0]).t0 - .05; let t1 = Math.max(L(ids[ids.length - 1]).t1 + .6, t0 + 1.9); return { t0, t1: o.t1 ?? t1, parts, ids, y: o.y, yl: o.yl }; };
  const caps = [
    cue(['c1'], [['zh', '时间前面，选哪个小词？']], { y: 1790, yl: 1010 }),
    cue(['c3'], [['zh', '三张卡片，一分钟搞定。']], { y: 1790, yl: 1010 }),
    cue(['a1', 'a2', 'a3'], [['zh', '第一题。'], ['en', ' My birthday is ___ July. '], ['zh', '选哪个？']]),
    cue(['a4', 'a5'], [['zh', '口诀：月份季节，大时间，用 '], ['en', 'in July']]),
    cue(['a6', 'a7', 'a8'], [['zh', '看线索：'], ['en', 'July'], ['zh', '，是月份。']]),
    cue(['a9', 'a10'], [['zh', '答案是 '], ['en', 'in July！']]),
    cue(['a11'], [['zh', '跟我读。']]),
    cue(['b2', 'b3'], [['en', 'The party is ___ Monday. '], ['zh', '选哪个？']]),
    cue(['b4', 'b5'], [['zh', '口诀：具体哪一天，用 '], ['en', 'on Monday']]),
    cue(['b7', 'b8'], [['zh', '答案是 '], ['en', 'on Monday！']]),
    cue(['b9', 'b10', 'b11', 'b12'], [['zh', '对比一下。星期几，用 '], ['en', 'on Monday'], ['zh', '，几点钟，用 '], ['en', "at seven o'clock"]]),
    cue(['m1'], [['zh', '同样的卡片，换成别的语言也行。']]),
    cue(['m2'], [['zh', '德语，选冠词，性别各有颜色。']]),
    cue(['m3'], [['zh', '日语，选助词，汉字上方带读音。']]),
    cue(['m4'], [['zh', '西班牙语，两个“是”，意思不同。']]),
    cue(['h1', 'h2', 'h3'], [['zh', '下一题。'], ['en', ' She is good ___ English. '], ['zh', '你选哪个？答案，下一集见。']], { t1: DUR }),
  ];
  // never overlap: a cue ends before the next begins
  for (let i = 0; i < caps.length - 1; i++) if (caps[i].t1 > caps[i + 1].t0 - .04) caps[i].t1 = caps[i + 1].t0 - .04;

  // ================================================================ Pip's poses, titles, progress dots, camera pushes
  const poses = [
    [0, 'wave'], [M('A.in'), 'ask'], [M('A.think0'), 'think'], [L('a4').t0 - .1, 'point'], [L('a6').t0 - .1, 'clue'], [L('a8').t1 + .05, 'point'],
    [L('a10').t0 - .2, 'cheer'], [L('a11').t0 - .1, 'read'],
    [M('B.in'), 'ask'], [M('B.think0'), 'think'], [L('b4').t0 - .1, 'point'], [L('b5').t0 + .1, 'clue'], [L('b8').t0 - .3, 'cheer'], [L('b9').t0 - .1, 'point'],
    [M('MON'), 'wave'], [M('MON.1') + .4, 'point'], [M('MON.1') + 2.2, 'cheer'], [M('MON.2') + .4, 'point'], [M('MON.2') + 2.2, 'cheer'], [M('MON.3') + .4, 'point'],
    [M('HOOK'), 'ask'], [hr0, 'think'],
  ];
  const titles = [{ t0: 0, t1: M('MON') - .3, s: [['in / on / at ', C.yel], ['怎么选', '#fff']] }, { t0: M('MON') - .3, t1: M('HOOK') - .3, s: [['一套卡片，', C.yel], ['换种语言', '#fff']] }, { t0: M('HOOK') - .3, t1: 1e9, s: [['in / on / at ', C.yel], ['怎么选', '#fff']] }];
  const dots = [{ t0: M('A.in'), t1: M('B.in'), cur: 0 }, { t0: M('B.in'), t1: M('MON') - .3, cur: 1 }, { t0: M('HOOK') - .2, t1: 1e9, cur: 2 }];
  const A2 = A.faces[0].face, B2 = B.faces[0].face;
  const cams = [
    { t0: L('a6').t0 - .15, t1: aAns[0] + .05, z: 1.12, card: 'A' },
    { t0: L('b5').t0 - .1, t1: bAns[0] + .05, z: 1.12, card: 'B' },
    { t0: mt[0] + 1.5, t1: mt[0] + 2.0, z: 1.08, card: 'DE' },
    { t0: mt[1] + 1.5, t1: mt[1] + 2.0, z: 1.08, card: 'JA' },
  ];
  dots.forEach(d => ev(d.t0, 'dot'));
  [M('A.in'), M('B.in'), M('MON'), M('HOOK')].forEach(t => ev(t, 'title'));
  [aAns[1], bAns[1]].forEach(t => ev(t, 'hop')); [M('A.in') + .1, M('B.in') + .1, M('HOOK') + .1, M('MON')].forEach(t => ev(t, 'hop'));
  cards.forEach(c => { if (c.tIn > .1) ev(c.tIn, 'slide', { dir: 'in' }); if (c.tOut < 1e8) ev(c.tOut, 'slide', { dir: 'out' }); });
  return { cards, caps, poses, titles, dots, cams, EV: EV.sort((a, b) => a.t - b.t), DUR, aAns, bAns };
}
