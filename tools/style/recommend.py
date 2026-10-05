"""Suggest styles for a topic: python3 tools/style/recommend.py "介绍一款新保温杯" [--n 3] [--json] [--aspect 9x16]

Scores every styles/*/style.json against the topic with (1) word overlap with the style's name, line and `uses`, and (2) a hand-written table of topic cues
(product launch, song, sale, language lesson, history, data ...) that point at styles built for that job. It is a first filter, not taste: it names
three candidates with the reason, and says when nothing fits well. Chinese is matched by character pairs. No network, no model."""
import argparse, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CUES = [  # (regex, {slug: weight}, reason)
 (r'产品|新品|发布会?|开箱|评测|保温|耳机|手机|product|launch|unbox|gadget', {'product-hero': 5, 'glass-product': 4, 'dark-keynote': 4, 'iso-infographic': 2}, 'a product or a launch'),
 (r'促销|打折|优惠|大促|折扣|双十一|618|秒杀|sale|discount|coupon|deal|promo', {'flash-sale': 6, 'game-show': 2, 'comic-pop': 2}, 'a sale or an offer'),
 (r'歌|mv|音乐视频|歌词|说唱|rap|lyric|song|jingle|karaoke', {'lyric-video': 6, 'stage-light': 4, 'sheet-music': 2}, 'a song or lyrics'),
 (r'演唱会|舞台|乐队|现场|concert|band|stage|live show|tour', {'stage-light': 6, 'neon-sign': 2, 'y2k-vaporwave': 2}, 'a live show'),
 (r'英语|语法|单词|词汇|日语|法语|德语|西班牙|韩语|口语|考试|学习|背|口诀|grammar|vocabulary|language|lesson|quiz|learn|exam', {'language-lesson': 7, 'whiteboard': 3, 'chat-log': 2, 'danmaku': 1}, 'a language or study lesson'),
 (r'对话|聊天|群|微信|消息|误会|秘密|chat|message|text|dm|group', {'chat-log': 6, 'danmaku': 2}, 'a story told as messages'),
 (r'弹幕|吐槽|评论|围观|reaction|comment|crowd|meme|梗', {'danmaku': 6, 'chat-log': 2, 'comic-pop': 2}, 'a crowd reacting'),
 (r'战斗|热血|挑战|对决|冲刺|逆袭|励志|boss|battle|fight|challenge|duel|power', {'shonen-battle': 6, 'comic-pop': 3, 'microgame': 2}, 'a contest or a power-up'),
 (r'旅行|出海|冒险|航海|探险|路线|团队|海盗|travel|voyage|adventure|crew|journey|treasure', {'sea-adventure': 6, 'silkscreen-poster': 3, 'transit-map': 3, 'urban-sketch': 3}, 'a journey or a team'),
 (r'地铁|线路|路线图|换乘|流程图|步骤|route|map|transit|timeline|roadmap', {'transit-map': 5, 'blueprint': 3, 'iso-infographic': 3}, 'a route or a process'),
 (r'数据|报告|增长|对比|排名|榜单|统计|图表|data|chart|report|ranking|metric|growth', {'dataviz': 6, 'iso-infographic': 3, 'swiss-motion': 3, 'split-flap': 3}, 'data or a ranking'),
 (r'倒计时|时刻表|航班|公告|通知|schedule|timetable|countdown|announcement|board', {'split-flap': 6, 'swiss-motion': 2, 'vector-scope': 1}, 'a schedule or a countdown'),
 (r'科技|ai|人工智能|软件|代码|编程|开源|工具|终端|software|code|developer|open.?source|terminal|cli|agent', {'dark-keynote': 5, 'living-screencast': 5, 'hologram-hud': 4, 'ascii-crt': 4, 'vector-scope': 2}, 'software or AI'),
 (r'科普|原理|解释|为什么|怎么运作|知识|science|explain|how it works|why', {'whiteboard': 5, 'iso-infographic': 4, 'natural-history': 3, 'blueprint': 3, 'pictogram-motion': 3}, 'an explainer'),
 (r'历史|古代|传统|文化|节日|春节|中秋|诗|history|ancient|tradition|festival|poem', {'ink-wash': 5, 'dunhuang': 4, 'ukiyoe': 3, 'papercut-red': 4, 'nianhua': 4, 'shadow-puppet': 3, 'blue-white': 3, 'lacquer-gold': 3}, 'history or tradition'),
 (r'儿童|宝宝|童话|睡前|绘本|kid|child|fairy|bedtime|storybook', {'crayon-book': 6, 'felt': 4, 'claymation': 4, 'paper-popup': 4, 'midcentury-toon': 2}, 'a children\'s story'),
 (r'美食|咖啡|烘焙|厨房|菜谱|food|coffee|recipe|bake|kitchen', {'impasto': 3, 'watercolor': 4, 'claymation': 3, 'felt': 3, 'tilt-shift': 3, 'product-hero': 3}, 'food and craft'),
 (r'城市|街|建筑|游记|旅游|city|street|architecture|travel diary', {'urban-sketch': 6, 'tilt-shift': 4, 'lowpoly-island': 3, 'silkscreen-poster': 3, 'art-deco': 3}, 'a place'),
 (r'复古|怀旧|老|80年代|90年代|retro|vintage|nostalgia|90s|80s', {'super8': 4, 'silent-film': 4, 'cel-anime-80s': 4, 'y2k-vaporwave': 4, 'spy-titles': 3, 'newsprint': 3}, 'nostalgia'),
 (r'游戏|像素|玩|game|pixel|arcade|rpg', {'pixel-8bit': 5, 'pixel-rpg': 5, 'hd-2d': 4, 'microgame': 4, 'game-show': 3}, 'games'),
 (r'恐怖|悬疑|诡异|怪谈|horror|mystery|eerie|liminal|noir', {'backrooms': 5, 'halftone-dossier': 4, 'silent-film': 3, 'charcoal': 3, 'tarot': 3}, 'mystery or horror'),
 (r'占卜|命理|星座|运势|八字|风水|tarot|horoscope|fortune|zodiac', {'tarot': 6, 'hologram-hud': 3, 'art-nouveau': 3, 'stained-glass': 3}, 'divination'),
 (r'时尚|设计|海报|品牌|艺术|fashion|design|poster|brand|art', {'swiss-motion': 4, 'art-deco': 4, 'bauhaus': 3, 'constructivist': 4, 'risograph': 4, 'silkscreen-poster': 4}, 'design and brand'),
 (r'口播|讲者|博主|出镜|真人|presenter|host|talking head|vlog', {'dark-keynote': 3, 'split-flap': 3, 'swiss-motion': 3, 'iso-infographic': 3, 'hologram-hud': 3}, 'a presenter on camera (see TALKING-HEAD.md)'),
]
ap = argparse.ArgumentParser(); ap.add_argument('topic'); ap.add_argument('--n', type=int, default=3); ap.add_argument('--json', action='store_true'); ap.add_argument('--aspect', default='')
A = ap.parse_args(); topic = A.topic.lower()
styles = {}
for f in glob.glob(os.path.join(ROOT, 'styles', '*', 'style.json')):
    try: d = json.load(open(f, encoding='utf8'))
    except Exception: continue
    if d.get('slug') and d['slug'] != 'my-style': styles[d['slug']] = d
def toks(s):
    s = s.lower(); w = set(re.findall(r'[a-z0-9]{3,}', s)); cj = re.findall(r'[一-鿿]+', s)
    for run in cj: w |= {run[i:i + 2] for i in range(len(run) - 1)}
    return w
T = toks(topic); score = {k: 0.0 for k in styles}; why = {k: [] for k in styles}
for pat, wt, reason in CUES:
    if re.search(pat, topic):
        for slug, w in wt.items():
            if slug in score: score[slug] += w; why[slug].append(reason)
for slug, d in styles.items():
    text = ' '.join([d.get('en', ''), d.get('cn', ''), d.get('film', ''), d.get('line', ''), d.get('line_cn', '')] + d.get('uses', []))
    ov = T & toks(text)
    if ov: score[slug] += min(4, len(ov) * .8); why[slug].append('matches its description: ' + ', '.join(sorted(ov)[:4]))
    if A.aspect == '9x16' and slug in ('language-lesson', 'chat-log', 'lyric-video'): score[slug] += .5
rank = sorted(score, key=lambda k: -score[k])[:A.n]
best = score[rank[0]] if rank else 0
out = [{'slug': k, 'en': styles[k].get('en'), 'cn': styles[k].get('cn'), 'score': round(score[k], 1), 'why': why[k], 'film': styles[k].get('film'), 'demo': 'styles/%s/%s.mp4' % (k, k)} for k in rank]
if A.json: print(json.dumps({'topic': A.topic, 'confident': best >= 4, 'styles': out}, ensure_ascii=False, indent=1)); sys.exit(0)
if best < 4: print('No cue in the topic points at a style strongly; these are the closest by wording. Ask the user, or show styles/README.md.\n')
for o in out: print('%-18s %s / %s  (score %.1f)\n    %s\n    demo film: %s — "%s"' % (o['slug'], o['en'], o['cn'], o['score'], '; '.join(o['why']) or 'weak match', o['demo'], o['film']))
