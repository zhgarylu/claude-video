// 单一时间线：画面、音乐、拟音、字幕都读这里的数字
export const FPS = 24, DUR = 31.4, VOICE_END = 30.08;
export const BPM = 105, BAR = 60 / BPM * 4, G0 = 1.614;      // 小节线：3.9 / 10.8 / 17.6 落在线上，终和弦(小节12)落在 29.05

export const CUES = [
  { t0: 0.00, t1: 3.60, text: 'Claude Code 的 mods，能把它变成你自己的工作台。' },
  { t0: 3.92, t1: 7.45, text: '第一，看得见。用实时面板和状态栏，' },
  { t0: 7.52, t1: 10.70, text: '随时显示任务进度、用量和测试结果。' },
  { t0: 10.78, t1: 13.70, text: '第二，管得住。拦截危险命令，' },
  { t0: 13.76, t1: 15.90, text: '比如移除文件、强制推送，' },
  { t0: 15.96, t1: 17.58, text: '出事之前先挡住。' },
  { t0: 17.65, t1: 21.45, text: '第三，用得顺。把常用流程做成斜杠命令，' },
  { t0: 21.52, t1: 25.30, text: '一句话触发，完成时还能用提示音提醒你。' },
  { t0: 25.38, t1: 28.00, text: '想要什么，直接说，帮我做个 mod，' },
  { t0: 28.06, t1: 30.05, text: '当场生成，马上生效。' },
];

// 章标：label 在“第N”出现，title 在关键词出现
export const CHAPTERS = [
  { t: 3.92, n: '01', title: '看得见', tt: 4.70 },
  { t: 10.78, n: '02', title: '管得住', tt: 11.42 },
  { t: 17.60, n: '03', title: '用得顺', tt: 18.26 },
  { t: 25.44, n: '04', title: '直接说', tt: 26.28 },
];
export const CH_END = 29.9;

// 镜头（窗口坐标；cx,cy 为取景中心，s 为缩放），段内 smoothstep
export const CAM = [
  { t: 0, cx: 434, cy: 363, s: 1.04 },
  { t: 3.6, cx: 434, cy: 363, s: 1.04 },
  { t: 4.5, cx: 450, cy: 372, s: 1.08 },
  { t: 6.4, cx: 470, cy: 394, s: 1.16 },
  { t: 10.4, cx: 470, cy: 394, s: 1.16 },
  { t: 11.5, cx: 434, cy: 394, s: 1.12 },
  { t: 15.9, cx: 434, cy: 394, s: 1.18 },
  { t: 16.44, cx: 434, cy: 394, s: 1.18 },
  { t: 16.95, cx: 434, cy: 394, s: 1.12 },
  { t: 17.95, cx: 434, cy: 374, s: 1.26 },
  { t: 22.5, cx: 420, cy: 374, s: 1.26 },
  { t: 24.2, cx: 452, cy: 345, s: 1.2 },
  { t: 25.95, cx: 434, cy: 363, s: 1.04 },
  { t: 29.0, cx: 434, cy: 363, s: 1.04 },
  { t: 29.45, cx: 434, cy: 363, s: 1.08 },
  { t: 31.4, cx: 434, cy: 363, s: 1.04 },
];

// 打字：给 text 和时间区间（均匀），或逐字时间 chars
export const TYPE = {
  title: { t0: 0.0, t1: 0.9, text: 'Claude Code' },
  status: { t0: 6.68, t1: 7.4, text: '运行中   3 / 5 步   main · 12.4k tok' },
  ship: { t0: 20.5, t1: 21.0, text: '/ship' },
  rm: { t0: 14.0, t1: 14.55, text: 'rm -rf ./src' },
  push: { t0: 14.8, t1: 15.3, text: 'git push -f' },
  ask: { chars: [['帮', 26.98], ['我', 27.16], ['做', 27.28], ['个', 27.42], [' ', 27.5], ['m', 27.52], ['o', 27.60], ['d', 27.68]] },
};
export function typedTimes(spec) {
  if (spec.chars) return spec.chars.map(c => c[1]);
  const n = spec.text.length;
  return Array.from({ length: n }, (_, i) => spec.t0 + (spec.t1 - spec.t0) * (i / Math.max(1, n - 1)));
}
export function typedN(spec, t) { const ts = typedTimes(spec); let n = 0; for (const x of ts) if (t >= x) n++; return n; }
export function typedStr(spec, t) {
  const n = typedN(spec, t);
  return spec.chars ? spec.chars.slice(0, n).map(c => c[0]).join('') : spec.text.slice(0, n);
}

// 关键事件时间（画面与声音共用）
export const T = {
  mods: 0.94,
  winA: 2.2, winB: 3.4,                     // 窗口从标题行展开
  slots: [3.4, 3.55, 3.7],
  paneIn: 5.7, paneDone: 6.4,
  statusIn: 6.68,
  bandIn: 9.0,
  usageRoll: [9.04, 9.7],
  tiles: 9.8, tileStep: 0.045,
  countRoll: [10.0, 10.38],
  card1: 12.4, card1Res: 14.0, card2: 14.3, card2Res: 14.8,
  freezeA: 15.98, freezeB: 16.42,
  gate1: 16.45, gate2: 16.65, shield: 16.84,
  pageOut0: 17.45, pageIn1: 19.3,
  steps: [21.8, 22.05, 22.3, 22.58],
  foldA: 20.22, foldB: 20.9, enter: 21.62,
  done: 22.9, toast: 23.84, toastOut: 26.3,
  pageOut1: 25.55,
  ask: 26.98, askEnter: 27.9,
  files: [28.0, 28.28, 28.56],
  reload: 29.05, reloadEnd: 29.75,
  hostOutA: 29.95, hostOutB: 30.8,
  blink: [30.95, 31.25],
};

// 声音事件：type 对应 mix.py 的拟音
function buildEV() {
  const ev = [{ t: 0, type: 'meta', bpm: BPM, g0: G0, bar: BAR, dur: DUR }];
  const typing = (spec, gain = 1) => typedTimes(spec).forEach(t => ev.push({ t, type: 'key', gain }));
  typing(TYPE.title, .8); typing(TYPE.status, .5); typing(TYPE.ship, .9); typing(TYPE.ask, .9);
  // 危险命令的打字声是散的
  typedTimes(TYPE.rm).forEach(t => ev.push({ t, type: 'bad', gain: .5 }));
  typedTimes(TYPE.push).forEach(t => ev.push({ t, type: 'bad', gain: .45 }));
  ev.push({ t: T.mods, type: 'mk', pitch: 'D5', gain: 1, accent: 1 });
  ev.push({ t: T.winA, type: 'whoosh', dur: 1.15, gain: .8 });
  T.slots.forEach((t, i) => ev.push({ t, type: 'mk', pitch: ['D5', 'F#5', 'A5'][i], gain: .55 }));
  ev.push({ t: T.paneIn, type: 'whoosh', dur: .7, gain: .7 });
  ev.push({ t: T.paneDone, type: 'felt', gain: .8 });
  ev.push({ t: T.bandIn, type: 'whoosh', dur: .45, gain: .5 });
  for (let t = T.usageRoll[0]; t < T.usageRoll[1]; t += 0.06) ev.push({ t, type: 'grain', gain: .35 });
  for (let t = T.countRoll[0]; t < T.countRoll[1]; t += 0.06) ev.push({ t, type: 'grain', gain: .35 });
  const pent = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B6', 'D7', 'D7'];
  for (let i = 0; i < 12; i++) ev.push({ t: T.tiles + i * T.tileStep, type: 'mk', pitch: pent[i], gain: .32 });
  ev.push({ t: T.countRoll[1], type: 'felt', gain: .9 });
  ev.push({ t: T.card1, type: 'bad', gain: 1, big: 1 });
  for (let t = T.card1 + .15; t < T.card1Res; t += 0.2) ev.push({ t, type: 'grain', gain: .22, bad: 1 });
  ev.push({ t: T.card2, type: 'bad', gain: 1, big: 1 });
  ev.push({ t: T.freezeA, type: 'freeze' }); ev.push({ t: T.freezeB, type: 'unfreeze' });
  ev.push({ t: T.gate1, type: 'glass', gain: 1, pitch: 'A5' });
  ev.push({ t: T.gate2, type: 'glass', gain: 1, pitch: 'D6' });
  ev.push({ t: T.shield, type: 'thunk', gain: 1 });
  ev.push({ t: T.pageOut0, type: 'whoosh', dur: .5, gain: .6 });
  T.steps.forEach((t, i) => ev.push({ t, type: 'mk', pitch: ['D5', 'F#5', 'A5', 'D6'][i], gain: .9 }));
  ev.push({ t: T.foldA, type: 'whoosh', dur: .6, gain: .5 });
  ev.push({ t: T.foldB, type: 'felt', gain: .8 });
  ev.push({ t: T.enter, type: 'enter', gain: 1 });
  ev.push({ t: T.done, type: 'chord', gain: .9, root: 'D5' });
  ev.push({ t: T.toast, type: 'chime', gain: 1 });
  ev.push({ t: T.toastOut, type: 'whoosh', dur: .35, gain: .4 });
  ev.push({ t: T.pageOut1, type: 'whoosh', dur: .5, gain: .55 });
  ev.push({ t: T.askEnter, type: 'enter', gain: .9 });
  T.files.forEach(t => ev.push({ t, type: 'felt', gain: 1 }));
  ev.push({ t: T.reload, type: 'reload', gain: 1 });
  ev.push({ t: T.hostOutA, type: 'whoosh', dur: .8, gain: .7 });
  T.blink.forEach(t => ev.push({ t, type: 'key', gain: .6 }));
  return ev;
}
export const EV = buildEV();
