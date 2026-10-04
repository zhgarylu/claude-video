// 单一时间线：画面、音乐、拟音、字幕都读这里的数字（口播词时间码来自 src/words.json，视频是用户的等距小世界）
export const FPS = 24, DUR = 34.0, VOICE_END = 30.08;
export const BPM = 109.91, BEAT = 60 / BPM, G0 = 0.4492;           // fit_grid 求得：场景起点 7.0 / 13.54 / 18.98 / 28.32 落在拍线上（误差 ≤ 30 ms）
export const beat = n => G0 + n * BEAT;

export const CUES = [
  { t0: 0.40, t1: 6.85, text: '9月8日，Meta 推出个人 AI 智能体 Muse，上线就登顶苹果应用商店。' },
  { t0: 6.95, t1: 12.80, text: '它由 Muse Spark 模型驱动，有专属安全虚拟机，还能跨应用替你干活。' },
  { t0: 13.45, t1: 19.00, text: '接下来，你能给它生成数字形象，实时视频聊天，也会接入智能眼镜。' },
  { t0: 19.05, t1: 23.75, text: '9月29日，小企业版上线，连接 Slack、Canva 等常用软件。' },
  { t0: 23.78, t1: 27.30, text: '好用，但隐私质疑也随之而来。' },
  { t0: 28.25, t1: 30.30, text: '你敢把事情交给它吗？' },
];

// 视频里物体的位置（视频像素 560×752），[t, x, y] 分段线性
// 信息卡：side L/R，hue，title/sub/tag，出现与消失时间，anchor=引线指向的位置
export const CARDS = [
  { id: 'date', objEnd: 6.6, side: 'L', hue: 'coral', title: '9月8日', sub: 'Meta 发布', t0: 0.55, t1: 6.8, anchor: [[0.5, 217, 425], [4.5, 217, 425], [4.8, 222, 468]] },
  { id: 'muse', objEnd: 6.6, side: 'R', hue: 'violet', title: 'MUSE', sub: '个人 AI 智能体', t0: 3.4, t1: 7.0, anchor: [[3.4, 255, 235], [4.6, 255, 235], [5.0, 408, 425]] },
  { id: 'rank', objEnd: 6.7, side: 'R', hue: 'mustard', title: 'App Store 榜首', sub: '上线即登顶', t0: 5.15, t1: 8.2, anchor: [[5.1, 408, 425]] },
  { id: 'spark', objEnd: 12.4, side: 'L', hue: 'violet', title: 'Muse Spark 模型', sub: '驱动 Muse', t0: 7.55, t1: 12.9, anchor: [[7.5, 257, 112]] },
  { id: 'vm', objEnd: 12.4, side: 'L', hue: 'teal', title: '专属安全虚拟机', sub: '自带浏览器', t0: 9.3, t1: 13.0, anchor: [[9.3, 255, 262]] },
  { id: 'cross', objEnd: 12.6, side: 'L', hue: 'mustard', title: '跨应用', sub: '邮件 · 日历 · 文档 · 对话', t0: 11.0, t1: 13.75, anchor: [[11.0, 88, 395]] },
  { id: 'work', objEnd: 12.5, side: 'R', hue: 'coral', title: '替你干活', sub: '任务交给 Muse', t0: 11.5, t1: 14.55, anchor: [[11.5, 437, 238]] },
  { id: 'avatar', objEnd: 19.3, side: 'R', hue: 'coral', title: '数字形象', sub: '实时视频聊天的化身', tag: '即将上线', y: 430, t0: 14.95, t1: 19.3, anchor: [[14.9, 283, 300]] },
  { id: 'call', objEnd: 19.3, side: 'R', hue: 'sky', title: '实时视频聊天', sub: '和它面对面', y: 235, t0: 15.85, t1: 19.3, anchor: [[15.8, 398, 208]] },
  { id: 'glasses', objEnd: 19.3, side: 'L', hue: 'sky', title: '智能眼镜', sub: '对着眼镜说话', tag: '即将上线', t0: 17.2, t1: 20.15, anchor: [[17.2, 163, 178]] },
  { id: 'shop', objEnd: 26.9, side: 'L', hue: 'mustard', title: '9月29日', sub: '小企业版上线', t0: 19.55, t1: 24.8, anchor: [[19.5, 180, 270]] },
  { id: 'lock', objEnd: 28.0, side: 'L', hue: 'graphite', title: '隐私', sub: '数据交给谁？', t0: 24.85, t1: 28.1, anchor: [[24.8, 288, 400], [26.0, 283, 330], [27.2, 273, 335]] },
];
// 右栏“连接”卡：六块应用牌依次弹出
export const TILES = [['Slack', 21.9], ['Canva', 22.44], ['Asana', 22.8], ['Zoom', 23.02], ['Intuit', 23.24], ['Box', 23.46]];
export const CONNECT = { t0: 21.3, t1: 27.2, anchor: [[21.3, 288, 480]], checks: 23.72 };
export const ROUTE = [['01', '榜单', 0], ['02', '本体', 6.8], ['03', '延伸', 13.4], ['04', '企业', 18.9], ['05', '提问', 28.2]];

export const T = {
  pull: 29.95, legend: 30.55, vidOut: 31.2, quiet: [27.9, 28.2],
};
export const KEY = [['violet', 'Muse 本体'], ['teal', '安全虚拟机'], ['mustard', '应用与企业'], ['coral', '数字形象'], ['sky', '视频与眼镜'], ['graphite', '隐私']];

function buildEV() {
  const ev = [{ t: 0, type: 'meta', bpm: BPM, g0: G0, beat: BEAT, dur: DUR }];
  const add = (t, type, o = {}) => ev.push({ t, type, ...o });
  const SC = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'E6'];
  CARDS.forEach((c, i) => { add(c.t0, 'pop', { pitch: SC[3 + (i % 6)], gain: .8 }); add(c.t0 + .1, 'tick', { gain: .35 }); });
  add(CONNECT.t0, 'pop', { pitch: 'D5', gain: .6 });
  TILES.forEach(([, t], i) => add(t, 'pop', { pitch: SC[2 + i], gain: .7 }));
  for (let i = 0; i < 6; i++) add(CONNECT.checks + i * .09, 'pop', { pitch: SC[4 + (i % 5)], gain: .45 });
  add(24.85 + 1.15, 'lockdrop', { gain: 1 });
  add(T.pull, 'whoosh', { dur: 1.2, gain: .8 });
  for (let i = 0; i < 6; i++) add(T.legend + .15 + i * .1, 'pop', { pitch: SC[i], gain: .35 });
  return ev;
}
export const EV = buildEV();
