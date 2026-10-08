"""First-draft shot list for a news-digest project (new.py --preset news / --news). Structure (60-90 s): hook -> for each of 2-4 key points a clip and a freeze -> one original diagram with a basis line -> a conclusion that splits what the
source claims from what is still to verify, with one action line. Everything the author must write is a "TODO ..." string; prep.py refuses to build while one is left. BREAKDOWN.md has the guide (section 9)."""

TXT = {
  'zh': {
    'series': '实录解读', 'tag': '官方演示 · 节选', 'sec': '看点',
    'kicker': 'TODO 公司 · 产品名', 'title': 'TODO 用一句话说这次发布能做什么', 'sub': 'TODO 一句话补充，只写官方说的',
    'src': 'TODO 来源：发布方 + 页面名', 'date': 'TODO 2026.MM.DD 发布', 'hook': 'TODO 先说结论：这是什么，能做什么；说明这是官方发布',
    'lt': 'TODO 演示名', 'lts': 'TODO 官方演示 · 用的输入或指令', 'c': 'TODO 画面里发生了什么（只说画面）',
    'box': 'TODO 看这里', 'ct': 'TODO 这里证明了什么', 'cb': 'TODO 只写画面能确认的', 'f': 'TODO 这一处是官方演示给出的证据，不是我们测的',
    'e_title': 'TODO 它大概怎么运转', 'n1': 'TODO 输入', 'n2': 'TODO 处理', 'n3': 'TODO 结果', 's': 'TODO 官方的说法或画面里的',
    'basis': 'TODO 官方发布页某一节 / 演示片 0:00–0:00；内部流程为推测；非独立实测', 'e': 'TODO 我们的理解是…；内部怎么做，官方没说',
    'cmp_title': 'TODO 官方说的，与要自己验证的', 'said': '官方说的', 'verify': '要自己验证的', 'si': 'TODO 官方明确给出的一条', 'vi': 'TODO 官方没给出的一条：效果、成本、限制',
    'verdict': 'TODO 一句话行动：先用自己的小样本试一轮', 'cbasis': 'TODO 官方发布页；非独立实测', 'cmp': 'TODO 总结：官方说了什么，还缺什么；这是官方演示解读，不是我们的实测',
  },
  'en': {
    'series': 'News digest', 'tag': 'Official demo · excerpt', 'sec': 'Point',
    'kicker': 'TODO Company · product name', 'title': 'TODO One line: what this release does', 'sub': 'TODO One supporting line, only what the source says',
    'src': 'TODO Source: publisher + page', 'date': 'TODO Published YYYY-MM-DD', 'hook': 'TODO Lead with the result: what it is, what it does; say this is an official release',
    'lt': 'TODO Demo name', 'lts': 'TODO Official demo · the input or command used', 'c': 'TODO What happens on screen (describe the picture only)',
    'box': 'TODO Look here', 'ct': 'TODO What this shows', 'cb': 'TODO Only what the frame confirms', 'f': 'TODO This is evidence from the official demo, not something we measured',
    'e_title': 'TODO How it probably works', 'n1': 'TODO Input', 'n2': 'TODO Process', 'n3': 'TODO Result', 's': 'TODO The source says / the frame shows',
    'basis': 'TODO Official page, section / demo 0:00-0:00; internals are inferred; not independently tested', 'e': 'TODO Our reading is...; how it works inside, the source does not say',
    'cmp_title': 'TODO What the source says, and what to verify', 'said': 'What the source says', 'verify': 'To verify yourself', 'si': 'TODO One claim the source states', 'vi': 'TODO One thing it does not give: quality, cost, limits',
    'verdict': 'TODO One action line: try it on a small sample first', 'cbasis': 'TODO Official page; not independently tested', 'cmp': 'TODO Wrap-up: what the source said, what is missing; this is a reading of an official demo, not our test',
  },
}

def make(P, A, sources, durs):
    lang = (A.lang or 'zh'); lang = lang if lang in TXT else 'en'; T = TXT[lang]; n = max(2, min(4, A.points)); d = list(durs.values())[0]
    win = max(4.0, min(9.0, (d - 1) / n - 1.2)); shots = [{'id': 'hook', 'type': 'hook', 'kicker': T['kicker'], 'title': T['title'], 'sub': T['sub'], 'meta': [T['src'], T['date']], 'say': T['hook']}]
    for i in range(n):
        a = round(min(i * d / n + .5, max(0, d - win - 1)), 1); b = round(min(a + win, d - .1), 1); k = i + 1
        shots.append({'id': 'c%d' % k, 'type': 'clip', 'section': k, 'in': a, 'out': b, 'sound': 'duck', 'lower': {'title': T['lt'], 'sub': T['lts']}, 'say': T['c']})
        shots.append({'id': 'f%d' % k, 'type': 'freeze', 'section': k, 't': round(max(a, b - .6), 1), 'crop': [0.25, 0.25, 0.5, 0.5], 'boxes': [{'rect': [0.35, 0.35, 0.3, 0.2], 'label': T['box']}],
                      'card': {'side': 'r', 'title': T['ct'], 'body': T['cb']}, 'verified': False, 'say': T['f']})
    shots.append({'id': 'e1', 'type': 'explain', 'kind': 'flow', 'title': T['e_title'], 'nodes': [{'label': T['n1'], 'sub': T['s']}, {'label': T['n2'], 'sub': T['s'], 'emph': True}, {'label': T['n3'], 'sub': T['s']}], 'basis': T['basis'], 'say': T['e']})
    shots.append({'id': 'cmp', 'type': 'compare', 'title': T['cmp_title'], 'cols': [{'title': T['said'], 'items': [T['si'], T['si']]}, {'title': T['verify'], 'items': [T['vi'], T['vi']], 'hot': True}],
                  'verdict': T['verdict'], 'basis': T['cbasis'], 'say': T['cmp']})
    spec = {'title': A.title if A.title != '实录解读' else T['series'], 'series': T['series'], 'preset': 'news', 'lang': lang, 'aspect': A.aspect, 'fps': 24, 'theme': A.theme,
            'voice': {'name': 'zh-CN-YunxiNeural' if lang == 'zh' else 'en-US-GuyNeural', 'rate': '+0%'}, 'tag': T['tag'], 'sources': sources,
            'news': {'title': A.news_title or 'TODO ' + ('资讯标题' if lang == 'zh' else 'headline of the release'), 'url': A.news_url or 'TODO ' + ('发布页网址' if lang == 'zh' else 'URL of the release page'),
                     'published': A.published or 'TODO ' + ('发布日期 YYYY-MM-DD' if lang == 'zh' else 'publication date YYYY-MM-DD'), 'claims': ['TODO ' + ('官方明确给出的一条说法' if lang == 'zh' else 'one claim the source states')], 'verified': False},
            'sections': ['TODO %s %d' % (T['sec'], i + 1) for i in range(n)], 'shots': shots}
    return spec
