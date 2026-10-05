// showcase.js: the other cards of the system, one of each, for the review sheet (?show=cards). Not in the film.
// Sentences in German, Japanese, Arabic and Chinese below were checked by the author only; a native speaker should review before real use.
import { C } from './kit.js';
const ALL = 0;   // every reveal time is 0: the sheet is rendered at t = 10, with everything shown
const cl = (o) => ({ type: 'cloze', ...o, T: { chips: [ALL, ALL, ALL], ring: null, ticks: [], ...o.T } });

export const SHEET = [
  { name: 'vocabulary + IPA', face: { type: 'vocab', lang: 'lat', tokens: [{ t: 'birthday' }], size: 120, pron: '/ˈbɜːrθdeɪ/', pronLang: 'ipa', meaning: '生日', ex: 'My birthday is in July.', exTr: '我的生日在七月。', T: { at: 0 } } },
  { name: 'vocabulary + pinyin tones', face: { type: 'vocab', lang: 'zh', tokens: [{ t: '你好' }], size: 150, pron: [{ s: 'nǐ', tone: 3 }, { s: 'hǎo', tone: 3 }], meaning: 'hello', meaningLang: 'lat', ex: '你好，我叫小云。', exTr: 'Hello, my name is Xiaoyun.', T: { at: 0 } } },
  { name: 'vocabulary + furigana', face: { type: 'vocab', lang: 'ja', tokens: [{ t: '勉', r: 'べん', nosp: 1 }, { t: '強', r: 'きょう', nosp: 1 }], nospace: true, size: 140, pron: 'benkyō', pronLang: 'lat', meaning: '学习', ex: '毎日勉強します。', exTr: '每天学习。', T: { at: 0 } } },
  { name: 'gender colours (German)', face: { type: 'vocab', lang: 'lat', tokens: [{ t: 'Lampe' }], gender: 'f', article: 'die', size: 150, pron: '[ˈlampə]', pronLang: 'ipa', meaning: '台灯', ex: 'Die Lampe ist neu.', exTr: '这盏台灯是新的。', T: { at: 0 } } },
  { name: 'conjugation grid', face: { type: 'grid', lang: 'lat', title: 'sein', note: '德语 · 动词变位', cols: ['1.', '2.', '3.'], rows: [['Sg.', 'ich bin', 'du bist', 'er ist'], ['Pl.', 'wir sind', 'ihr seid', 'sie sind']], T: { at: 0, hi: [0, 1], hiT: 0 } } },
  { name: 'dialogue pair', face: { type: 'dialogue', lang: 'lat', lines: [{ who: 'A', t: 'Where is the station?', tr: '车站在哪儿？' }, { who: 'B', t: "It's next to the bank.", tr: '就在银行旁边。' }], T: { at: [0, 0] } } },
  { name: 'RTL: the card mirrors (Arabic)', face: cl({ q: 'AR', tag: '阿拉伯语 · 介词', rtl: true, lang: 'ar', size: 70, tokens: [{ t: 'ذهبت' }, { blank: true }, { t: 'المدرسة.', clue: true }], blankW: 170, tr: '我去了学校。', opts: [{ t: 'على', lang: 'ar', size: 62 }, { t: 'إلى', lang: 'ar', size: 62 }, { t: 'في', lang: 'ar', size: 62 }], correct: 1, ans: 'إلى', T: { ans: [0, 0.01], clue: { t0: 0, tag: '去＝إلى' } } }) },
  { name: 'long words wrap and hyphenate', face: cl({ q: 'DE', tag: '德语 · 冠词', lang: 'lat', size: 80, tokens: [{ t: 'Das' }, { t: 'ist' }, { blank: true }, { t: 'Donau­dampf­schiff­fahrts­gesell­schaft.', gender: 'f' }], blankW: 150, tr: '这是多瑙河轮船航运公司。', opts: [{ t: 'der', g: 'm' }, { t: 'die', g: 'f' }, { t: 'das', g: 'n' }], correct: 1, ans: 'die', T: { ans: [0, 0.01], gender: 0 } }) },
];
