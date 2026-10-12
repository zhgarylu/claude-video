"""火山引擎 豆包语音合成 2.0（doubao-seed-tts-2.0）配音，接口与 tts_zh.py 完全一致：
    python core/tts/tts_volc.py lines.json out_dir [--voice zh_female_vv_uranus_bigtts] [--rate +0%]
lines.json = [{"id":..., "text":..., "voice":"...", "rate":"+10%", "say":"..."}, ...]
输出 out_dir/<id>.wav（24kHz 单声道，去首尾静音）与 out_dir/dur.json；mp3 缓存在 out_dir/.cache/。
密钥：环境变量 VOLC_TTS_KEY，或 VOLC_KEY_FILE 指向的文件里「豆包语音key：」后面的那一段（默认 ~/aiCode/lemo-opuscar/火山引擎key.txt）。
列出可用音色：python core/tts/tts_volc.py --list [--lang zh|yue|en|ja|es|fr|de] [--gender male|female|child]（目录在 core/tts/voices.json；edge: 开头的是 Microsoft 音色，要用 tts_zh.py 去掉前缀后配音）
退出码：2 = 网络/服务问题，1 = 输入或配置有误。pitch 在这里不生效（接口无此参数）。
"""
import sys, os, re, io, json, base64, hashlib, argparse, subprocess
import numpy as np, soundfile as sf
SR = 24000
URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
RESOURCE = 'seed-tts-2.0'
DEFAULT_VOICE = 'zh_female_vv_uranus_bigtts'


def api_key():
    k = os.environ.get('VOLC_TTS_KEY')
    if k: return k.strip()
    p = os.environ.get('VOLC_KEY_FILE') or os.path.expanduser('~/aiCode/lemo-opuscar/火山引擎key.txt')
    try: txt = open(p, encoding='utf-8').read()
    except OSError: sys.exit('tts_volc.py: no key: set VOLC_TTS_KEY or VOLC_KEY_FILE')
    m = re.search(r'豆包语音\s*key\s*[:：]\s*([A-Za-z0-9_\-]{16,})', txt, re.I)
    if not m: sys.exit('tts_volc.py: no "豆包语音key：" entry in the key file')
    return m.group(1)


def rate_pct(L, default):
    r = L.get('rate')
    if r is None and 'speed' in L: r = float(L['speed'])
    if isinstance(r, (int, float)): return round((float(r) - 1) * 100)
    r = r or default
    m = re.fullmatch(r'([+-]\d+)%', r)
    if not m: sys.exit(f"tts_volc.py: line '{L['id']}': rate must look like '+10%' or a speed number, got {r!r}")
    return int(m.group(1))


def synth(text, voice, rate, path, key, resource=RESOURCE, additions=None):
    import httpx
    body = {'req_params': {'text': text, 'speaker': voice,
            'audio_params': {'format': 'mp3', 'sample_rate': SR, 'speech_rate': max(-50, min(100, rate))}}}
    if additions: body['req_params']['additions'] = json.dumps(additions, ensure_ascii=False)   # e.g. {"explicit_language": "ja"} or {"explicit_dialect": "sichuan"}
    h = {'X-Api-Key': key, 'X-Api-Resource-Id': resource, 'Content-Type': 'application/json'}
    audio = bytearray(); last = None
    for attempt in range(3):
        audio.clear()
        try:
            with httpx.stream('POST', URL, headers=h, json=body, timeout=120) as r:
                logid = r.headers.get('x-tt-logid', '')
                if r.status_code != 200:
                    raise RuntimeError(f'HTTP {r.status_code} {r.read()[:200]!r} logid={logid}')
                for ln in r.iter_lines():
                    if not ln.strip(): continue
                    d = json.loads(ln); c = d.get('code', 0)
                    if c == 0 and d.get('data'): audio.extend(base64.b64decode(d['data']))
                    elif c == 20000000: break
                    elif c > 0: raise ValueError(f"code {c}: {d.get('message')} logid={logid}")
            if not audio: raise RuntimeError('no audio came back')
            part = path + '.part'
            open(part, 'wb').write(audio); os.replace(part, path); return
        except ValueError as e: raise   # 参数/音色/权限问题，重试没用
        except Exception as e:
            last = e
            import time; time.sleep(1.5 * (attempt + 1))
    raise last


def to_wav(mp3):
    try: r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-ar', str(SR), '-ac', '1', '-f', 'wav', '-'], capture_output=True, check=True)
    except FileNotFoundError: sys.exit('tts_volc.py: ffmpeg is needed')
    except subprocess.CalledProcessError: return None
    try: a, sr = sf.read(io.BytesIO(r.stdout), dtype='float32')
    except Exception: return None
    return (a, sr) if len(a) >= 0.15 * sr and float(np.abs(a).max()) > 1e-3 else None


def list_voices(lang, gender):
    cat = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voices.json'), encoding='utf-8'))
    for v in cat['voices']:
        if lang and lang not in v.get('langs', ['zh']): continue
        if gender and v.get('gender') != gender: continue
        print(f"{v['id']:48} {v['name']:10} {v.get('gender', ''):7} {v.get('scene', ''):10} {'*' if v.get('featured') else ' '} {'[edge: use tts_zh.py]' if v.get('engine') == 'edge' else ''}")
    print('\n* = featured. Default per language:', json.dumps(cat.get('defaults', {}), ensure_ascii=False), file=sys.stderr)


def main():
    if '--list' in sys.argv:
        ap = argparse.ArgumentParser(); ap.add_argument('--list', action='store_true'); ap.add_argument('--lang'); ap.add_argument('--gender'); a = ap.parse_args()
        return list_voices(a.lang, a.gender)
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('lines'); ap.add_argument('out_dir')
    ap.add_argument('--voice', default=DEFAULT_VOICE); ap.add_argument('--rate', default='+0%')
    a = ap.parse_args()
    lines = json.load(open(a.lines, encoding='utf-8')); key = api_key()
    cache = os.path.join(a.out_dir, '.cache'); os.makedirs(cache, exist_ok=True); dur = {}
    for n in os.listdir(cache):
        if n.endswith('.part'): os.remove(os.path.join(cache, n))
    for L in lines:
        voice = L.get('voice', a.voice); rate = rate_pct(L, a.rate); say = L.get('say', L['text'])
        res = L.get('resource', RESOURCE); add = L.get('additions') or None; mp3 = os.path.join(cache, 'v' + hashlib.sha1(json.dumps([voice, rate, say, res, add], ensure_ascii=False).encode()).hexdigest()[:16] + '.mp3')
        dec = to_wav(mp3) if os.path.exists(mp3) else None
        if dec is None:
            if os.path.exists(mp3): os.remove(mp3)
            try: synth(say, voice, rate, mp3, key, res, add)
            except ValueError as e: sys.exit(f"tts_volc.py: line '{L['id']}' ({voice}): {e}")
            except Exception as e:
                print(f"tts_volc.py: speech service failed for line '{L['id']}': {type(e).__name__}: {str(e)[:200]}", file=sys.stderr); sys.exit(2)
            dec = to_wav(mp3)
            if dec is None: sys.exit(f"tts_volc.py: undecodable audio for line '{L['id']}'")
        y, sr = dec
        nz = np.where(np.abs(y) > np.abs(y).max() * .02)[0]
        if len(nz): y = y[max(0, nz[0] - int(.03 * sr)): nz[-1] + int(.10 * sr)]
        sf.write(os.path.join(a.out_dir, L['id'] + '.wav'), y, sr); dur[L['id']] = round(len(y) / sr, 3)
        print(L['id'], dur[L['id']], L['text'][:30])
    json.dump(dur, open(os.path.join(a.out_dir, 'dur.json'), 'w', encoding='utf-8'), indent=1)


if __name__ == '__main__':
    main()
