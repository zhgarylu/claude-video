// 单一时间线：画面、音乐、拟音、字幕都读这里的数字（口播词时间码来自 src/words.json）
export const FPS = 24, DUR = 33.4, VOICE_END = 30.08;
export const BPM = 114.08, BEAT = 60 / BPM, G0 = 0.4886;           // 拍 n 的时间 = G0 + n*BEAT；场景起点 7.72/14.22/20.68 恰在拍线上
export const beat = n => G0 + n * BEAT;

export const CUES = [
  { t0: 0.00, t1: 6.20, text: '9月8日，Meta 推出个人 AI 智能体 Muse，上线就登顶苹果应用商店。' },
  { t0: 6.70, t1: 12.95, text: '它由 Muse Spark 模型驱动，有专属安全虚拟机，还能跨应用替你干活。' },
  { t0: 13.50, t1: 19.20, text: '接下来，你能给它生成数字形象，实时视频聊天，也会接入智能眼镜。' },
  { t0: 19.40, t1: 24.10, text: '9月29日，小企业版上线，连接 Slack、Canva 等常用软件。' },
  { t0: 24.15, t1: 27.55, text: '好用，但隐私质疑也随之而来。' },
  { t0: 28.30, t1: 30.30, text: '你敢把事情交给它吗？' },
];

// 工位中心（世界坐标）与镜头
export const STN = { s1: 4.6, s2: 11.2, s3: 19.1, s4: 27.0, y: 5 };
export const CAM = [                       // t, 世界中心 cx/cy, 缩放 k（px/单位，对数插值）
  { t: 0, cx: 5.0, cy: 4.8, k: 80 },
  { t: 5.6, cx: 5.2, cy: 4.8, k: 90 },
  { t: 5.9, cx: 5.2, cy: 4.8, k: 90 },
  { t: 7.2, cx: 11.6, cy: 5.0, k: 68 },
  { t: 8.4, cx: 11.4, cy: 5.0, k: 78 },
  { t: 9.5, cx: 11.2, cy: 5.0, k: 82 },
  { t: 13.2, cx: 11.6, cy: 5.0, k: 74 },
  { t: 14.1, cx: 19.0, cy: 5.0, k: 74 },
  { t: 19.4, cx: 19.2, cy: 5.0, k: 80 },
  { t: 20.1, cx: 27.0, cy: 5.0, k: 66 },
  { t: 24.5, cx: 27.2, cy: 5.0, k: 76 },
  { t: 27.1, cx: 27.2, cy: 5.0, k: 76 },
  { t: 28.0, cx: 26.6, cy: 5.2, k: 100 },
  { t: 29.7, cx: 26.6, cy: 5.2, k: 108 },
  { t: 30.7, cx: 15.0, cy: 5.0, k: 33 },
  { t: 33.4, cx: 15.0, cy: 5.0, k: 32 },
];

export const T = {
  cal1: 0.15, meta: 1.56, muse: 3.32, phone: 3.9, hop: 4.65, rank: 5.04,
  tower: 7.3, spark: 7.7, openTop: 7.9, vm: 9.35, openVm: 9.45, browser: 10.0,
  cross: 11.38, work: 11.92, checks: [12.0, 12.14, 12.28, 12.42],
  avatar: 15.0, call: 16.24, glasses: 17.3, waves: 18.1,
  cal2: 19.9, shop: 20.72, connect: 21.96, slack: 22.36, canva: 22.88, others: 23.2,
  good: 24.12, privacy: 25.16, lock: 25.2, ask: 28.3, pkg: 28.5, qmark: 29.2,
  pull: 29.9, legend: 30.35, pipOut: 29.95,
  quiet: [27.9, 28.2],
};
export const TILES = ['Slack', 'Canva', 'Asana', 'Zoom', 'Intuit', 'Box'];

// 声音事件（mix.py 读 events.json）
function buildEV() {
  const ev = [{ t: 0, type: 'meta', bpm: BPM, g0: G0, beat: BEAT, dur: DUR }];
  const add = (t, type, o = {}) => ev.push({ t, type, ...o });
  const SC = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'E6'];
  add(T.cal1 + .45, 'drop', { gain: 1 });
  add(T.meta, 'pop', { pitch: 'D5', gain: .6 });
  add(T.muse, 'rise', { gain: .9 }); add(T.muse + .4, 'pop', { pitch: 'G5', gain: 1 });
  add(T.phone + .35, 'drop', { gain: .8 }); add(T.phone + .5, 'pop', { pitch: 'B5', gain: .6 });
  add(T.hop, 'hop', { gain: .8 }); add(T.hop + .55, 'drop', { gain: .8 }); add(T.rank, 'chime', { gain: 1 });
  add(5.9, 'whoosh', { dur: 1.3, gain: .7 });
  add(T.tower, 'rise', { gain: .9 }); add(T.tower + .25, 'rise', { gain: .6 }); add(T.tower + .5, 'rise', { gain: .6 });
  add(T.openTop, 'slide', { gain: .8 }); add(T.spark, 'pop', { pitch: 'D6', gain: 1 });
  add(T.openVm, 'slide', { gain: .8 }); add(T.vm + .3, 'lock', { gain: .9 }); add(T.browser, 'pop', { pitch: 'A5', gain: .7 });
  for (let i = 0; i < 4; i++) add(T.cross + i * .1, 'pop', { pitch: SC[2 + i], gain: .5 });
  for (let t = T.cross + .3; t < T.work + .6; t += .16) add(t, 'tick', { gain: .5 });
  T.checks.forEach((t, i) => add(t, 'pop', { pitch: SC[3 + i], gain: .9 }));
  add(13.2, 'whoosh', { dur: .9, gain: .7 });
  for (let i = 0; i < 6; i++) add(T.avatar + i * .12, 'pop', { pitch: SC[i], gain: .6 });
  add(T.call, 'pop', { pitch: 'E6', gain: .9 }); add(T.call + .25, 'ring', { gain: .6 });
  add(T.glasses, 'rise', { gain: .7 }); add(T.glasses + .3, 'pop', { pitch: 'G5', gain: .9 });
  for (let i = 0; i < 3; i++) add(T.waves + i * .25, 'ring', { gain: .5 });
  add(19.4, 'whoosh', { dur: .7, gain: .7 });
  add(T.cal2 + .45, 'drop', { gain: 1 });
  add(T.shop, 'rise', { gain: .9 }); add(T.shop + .4, 'drop', { gain: .7 });
  for (let i = 0; i < 6; i++) add(T.connect + .0 + i * .26, 'pop', { pitch: SC[1 + i], gain: .7 + (i < 2 ? .2 : 0) });
  for (let t = T.connect; t < T.good; t += .18) add(t, 'tick', { gain: .35 });
  for (let i = 0; i < 6; i++) add(T.good + i * .09, 'pop', { pitch: SC[4 + (i % 5)], gain: .5 });
  add(T.lock, 'lockdrop', { gain: 1 });
  add(T.pkg, 'whoosh', { dur: .6, gain: .5 });
  add(T.qmark, 'pop', { pitch: 'E6', gain: 1 });
  add(T.pull, 'whoosh', { dur: 1.2, gain: .8 });
  add(T.pipOut, 'whoosh', { dur: .6, gain: .5 });
  for (let i = 0; i < 6; i++) add(T.legend + i * .12, 'pop', { pitch: SC[i], gain: .35 });
  return ev;
}
export const EV = buildEV();
