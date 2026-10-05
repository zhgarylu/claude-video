"""Host-video prompt for an AI video tool, from a style world and your spoken lines.

  python3 tools/prompt/gen.py --id my-topic --title "介绍 X（瑞士白棚）" --style swiss-motion --preset swiss --accent "信号绿" \\
      --lines "一句立题|要点一|要点二|要点三|收尾提问" --aspect 3x4 --seconds 30 [--camera fixed|moving] [--surface blank-board] [--out prompts/talking-head/]

--lines     the spoken lines, split with | or one per line in a file (--lines-file). The first is the opening, the last the close; the ones between are
            beats. Timing is computed from the length (4.8 Chinese characters or 2.7 English words per second) with 1.5 s of silence between
            lines for the film's transitions; the tool refuses lines that do not fit --seconds and says how much to cut.
--preset    world: swiss | iso | hologram | station-board | blank (see PRESETS; --world "your own one-paragraph scene" replaces it).
--camera    fixed (default: locked-off, host under half the frame) or moving (slow continuous move tied to the gestures, for a tracked surface).
--surface   blank-board: a board/screen that must stay blank and static for tracking (TALKING-HEAD.md §3d). Adds the constraints that matter.
Writes <out>/<id>.md in the format of prompts/talking-head/*.md (front matter + one ```text block) and prints it. Status is `untested`: look at the
generated video's frames before building on it."""
import argparse, os, re, sys

PRESETS = {
 'swiss': '一间极简的纯白摄影棚，只有一种点缀色：{accent}。空间里有三四个方方正正的大色块和粗线框，彼此留出站人的空位；地面上有一条{accent}的线，从远处延伸到讲者脚边。画面里的牌子和色块都是空白的。光线柔和均匀。',
 'iso': '一座干净的等距小岛，像一个放在桌上的沙盘：几个方方正正的工位或房子，用细路相连，只有一种点缀色：{accent}。所有牌子和屏幕都是空白的。柔和的漫射光，没有杂物。',
 'hologram': '一间暗色的工作室，墙上和空中有发光的线框结构，青蓝色的细线，只有一种点缀色：{accent}。线框里没有字、没有数字。光线来自这些线框本身，边缘有柔和的辉光。',
 'station-board': '一座科技感的现代高铁站候车大厅：挑高的白色和银灰色钢结构弧形顶，大面积玻璃幕墙，冷白色灯带，带倒影的浅灰色地砖。色调是冷白、银灰和钢蓝，唯一的亮点颜色是{accent}。',
 'blank': '一个简洁的场景，背景干净，只有一种点缀色：{accent}，物体都是空白的，没有文字。',
}
GEST = ['抬手打招呼，随后用双手在胸前比出一个小方框', '伸出一根手指', '伸出两根手指', '伸出三根手指', '一只手伸向右边，掌心向上，像在介绍一排列表', '双手向两侧打开，再合拢到胸前', '用手指点向画面一侧', '把手里的东西递向镜头']
MOVES = ['正面中景起，镜头缓慢向前推近，博主占画面高度约三分之二', '镜头缓慢向右环绕约二三十度，同时轻轻推近，方向和他手臂伸出的方向一致', '镜头平稳向前推近，同时略微下沉，来到更近的中近景', '镜头缓慢绕向博主的左侧前方，同时缓缓推近', '镜头开始平稳向后拉远，并缓缓升高，像用摇臂抬起来', '摇臂继续缓缓升高，到略俯的高机位；他递出东西的那一刻，镜头轻轻向他推近一点', '镜头缓缓降回视线高度，同时向后拉远，回到和开头相同的正面中景，然后停稳']
ASPECT = {'16x9': ('横幅 16:9（1920×1080）', '中景'), '9x16': ('竖幅 9:16（1080×1920）', '中景偏全景，讲者占画面高度约一半，站在画面中间偏下'), '3x4': ('竖幅 3:4', '中景偏全景，讲者占画面高度约一半，站在画面中间偏下'), '1x1': ('方幅 1:1', '中景')}

ap = argparse.ArgumentParser()
ap.add_argument('--id', required=True); ap.add_argument('--title', required=True); ap.add_argument('--title-en', default=''); ap.add_argument('--style', default='')
ap.add_argument('--lines'); ap.add_argument('--lines-file'); ap.add_argument('--seconds', type=float, default=30); ap.add_argument('--aspect', default='16x9', choices=list(ASPECT))
ap.add_argument('--preset', default='blank', choices=list(PRESETS)); ap.add_argument('--world'); ap.add_argument('--accent', default='信号红')
ap.add_argument('--person', default='参考图中的男博主'); ap.add_argument('--outfit', default='同一套日常休闲上衣'); ap.add_argument('--camera', default='fixed', choices=['fixed', 'moving'])
ap.add_argument('--surface', default='', choices=['', 'blank-board']); ap.add_argument('--facts', default=''); ap.add_argument('--out', default='prompts/talking-head')
A = ap.parse_args()
raw = open(A.lines_file, encoding='utf8').read().strip().split('\n') if A.lines_file else (A.lines or '').split('|')
lines = [l.strip() for l in raw if l.strip()]
if len(lines) < 2: sys.exit('need at least two lines (opening and close): --lines "a|b|c" or --lines-file')

def speak(s):
    cjk = len(re.findall(r'[　-鿿＀-￯]', s)); rest = re.sub(r'[　-鿿＀-￯]', ' ', s); words = len(re.findall(r"[A-Za-z0-9']+", rest))
    return cjk / 4.8 + words / 2.7 + 0.35
dur = [speak(l) for l in lines]; gap = 1.5 if A.camera == 'fixed' else 1.5; total = sum(dur) + gap * (len(lines) - 1) + 0.6
if total > A.seconds: sys.exit('the lines take about %.0f s with pauses; %.0f s asked. Cut about %.0f s of speech (≈%d Chinese characters).' % (total, A.seconds, total - A.seconds, int((total - A.seconds) * 4.8)))
slack = (A.seconds - total) / len(lines); dur = [d + slack * .6 for d in dur]; gap += slack * .4 / max(1, len(lines) - 1) * (len(lines) - 1) / len(lines)   # spread the spare time
t = 0.0; segs = []
for i, (l, d) in enumerate(zip(lines, dur)):
    a, b = t, t + d; segs.append((a, b, l, i)); t = b + (gap if i < len(lines) - 1 else 0)
scale = A.seconds / max(t, 1e-6) if t > A.seconds else 1.0
segs[-1] = (segs[-1][0], max(segs[-1][1], A.seconds / scale if scale else A.seconds), segs[-1][2], segs[-1][3])   # the close holds to the end
fmt = lambda x: ('%.1f' % (x * scale)).rstrip('0').rstrip('.')

world = (A.world or PRESETS[A.preset]).replace('{accent}', A.accent)
ar, framing = ASPECT[A.aspect]
cam = '全程连续运镜，一镜到底，没有剪辑切换。' if A.camera == 'moving' else '固定机位，不推拉摇移，%s。' % framing
out = ['%s，时长 %d 秒，24 帧，%s' % (ar, round(A.seconds), cam), '', '【场景】', world]
if A.surface == 'blank-board':
    out += ['场景里有一块大屏或大翻牌板：深色哑光外壳，极简细边框；它必须全程保持**空白、静止**，没有任何字符、数字、标志或画面，也不翻动、不闪烁。后期会把真正的内容画在它上面。', '博主始终站在它的一侧，不挡在它前面，头顶不进入它的范围；它的四个边角每一帧都完整入画。']
out += ['不要出现任何文字、标志、数字和屏幕上的字。', '']
if A.camera == 'moving':
    out += ['【运镜总要求】', '镜头一直在缓慢、匀速、平稳地运动，没有手持晃动，没有突然的加速和停顿；运镜方向和博主的动作配合：他的手伸向哪里，镜头就朝哪里缓缓靠近。', '']
out += ['【动作%s与口播】（普通话，语速自然偏快，口型清楚，口播不要被打断）' % ('、运镜' if A.camera == 'moving' else '')]
nb = len(lines) - 2
for a, b, l, i in segs:
    if i == 0: g = GEST[0]
    elif i == len(lines) - 1: g = '面向镜头，表情认真，双手自然下垂'
    else: g = GEST[min(i, 3)] if nb <= 3 else GEST[4 + (i - 1) % 4]
    out.append('%s–%s 秒：博主%s。' % (fmt(a), fmt(b), g if i not in (0,) else '面对镜头，' + g))
    if A.camera == 'moving': out.append('运镜：' + MOVES[min(i, len(MOVES) - 2) if i < len(lines) - 1 else len(MOVES) - 1] + '。')
    out.append('口播：“%s”' % l)
    if i < len(lines) - 1:
        pa, pb = b, segs[i + 1][0]; out.append('%s–%s 秒：不说话。博主%s。' % (fmt(pa), fmt(pb), '看向下一个要讲的位置，点点头' if i % 2 == 0 else '换到下一个位置'))
    out.append('')
out += ['【画面要求】', '同一个世界、同一个人、同一套衣服，全程不换装，不要戴眼镜，不要出现第二个人，不要出现水印和字幕。', '世界里的物体保持静止，不要随镜头乱动。' if A.camera == 'fixed' else '整个过程场景布置保持一致，不要出现新的物体。',
        '动作从容、清楚，手势要明显，方便后期在旁边加说明。', '口型和口播对齐，说话声清晰，没有背景音乐。']
body = '\n'.join(out)
head = '---\nid: %s\ntitle: %s\ntitle_en: %s\nworld: %s\nworld_en: \nstyle: %s\nstatus: untested\nfacts: %s\n---\n' % (A.id, A.title, A.title_en or A.title, world.split('。')[0], A.style, A.facts)
doc = head + '# ' + A.title + '\n\n这条还没有拿去生成过：生成后先抽帧看一遍（手势、走位、牌子是否空白），再做后期。参考图要自己提供（同一个人，同一套衣服）。\n\n```text\n%s\n%s\n```\n' % ('%s，是同一个人、同一张脸、%s（全程不换装）。' % (A.person, A.outfit), body)
os.makedirs(A.out, exist_ok=True); p = os.path.join(A.out, A.id + '.md'); open(p, 'w', encoding='utf8').write(doc)
print(doc); print('→ %s   (%.1f s of speech and pauses of %d s)' % (p, t * scale, round(A.seconds)))
