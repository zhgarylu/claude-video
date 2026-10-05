"""Send a host-video prompt to Seedance (Volcengine Ark), wait for it, download the mp4.

  export ARK_API_KEY=...          # your key; this tool never stores or prints it
  python3 tools/gen/seedance.py prompts/talking-head/splitflap-project-landscape.md --image ref.jpg --aspect 16x9 --seconds 30 --out films/x/src/host.mp4 --yes
  python3 tools/gen/seedance.py status <task id>            # look at a task
  python3 tools/gen/seedance.py wait <task id> --out host.mp4   # pick up a task you already submitted

Without --yes it only PRINTS the request (a dry run): generating video costs money on your Ark account, so nothing is sent until you add --yes.
The prompt file is one of prompts/talking-head/*.md (the first ```text block is the prompt) or any text file. --image is the reference picture of the host:
an https URL, or a local file (sent inline as base64: if Ark rejects inline images, upload the picture to your own public storage and pass its URL).
After downloading, the tool runs tools/talk/hostcheck.py on the video unless --no-check.

Facts from the Ark docs (2026-10): model ids doubao-seedance-2-5-260628 (duration 4-30 s or -1 = automatic, up to 30 s in one take) and
doubao-seedance-2-0-260128 (4-15 s); tasks are asynchronous (queued, running, succeeded, failed, expired); the video URL is valid for 24 hours, so
download at once; the account needs the model activated (and a balance above a minimum). Reference images with a real person's face are refused unless
authorised: use a generated character or an image you are allowed to use. The prompt's content rules are Ark's: it can refuse a prompt it considers unsafe.
I could not test this against the live API (no key in the build environment); it is written from the documentation. If a field is rejected, the error
text is printed unchanged: compare it with https://ark.volcengine.com/region:cn-beijing/docs/ark/create-video-generation-task-api"""
import ssl, argparse, base64, json, mimetypes, os, re, subprocess, sys, time, urllib.request, urllib.error

BASE = os.environ.get('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')

def _ctx():                                         # python.org builds on macOS ship without CA certificates: fall back to the system bundle (verification stays on)
    c = ssl.create_default_context()
    if not c.cert_store_stats().get('x509_ca') and not c.cert_store_stats().get('x509'):
        for f in ('/etc/ssl/cert.pem', '/etc/ssl/certs/ca-certificates.crt', '/etc/pki/tls/certs/ca-bundle.crt'):
            if os.path.exists(f): return ssl.create_default_context(cafile=f)
    return c
CTX = _ctx()
ap = argparse.ArgumentParser(); ap.add_argument('cmd_or_prompt'); ap.add_argument('task', nargs='?')
ap.add_argument('--image', action='append', default=[], help='reference image (URL or file); repeat for more'); ap.add_argument('--model', default='doubao-seedance-2-5-260628')
ap.add_argument('--aspect', default='16x9', help='16x9, 9x16, 3x4, 4x3, 1x1, 21x9 or adaptive'); ap.add_argument('--seconds', type=int, default=30); ap.add_argument('--resolution', default='1080p', choices=['480p', '720p', '1080p'])
ap.add_argument('--no-audio', action='store_true'); ap.add_argument('--watermark', action='store_true'); ap.add_argument('--seed', type=int); ap.add_argument('--out', default='host.mp4')
ap.add_argument('--yes', action='store_true', help='really submit (costs money)'); ap.add_argument('--poll', type=int, default=10); ap.add_argument('--timeout', type=int, default=3600); ap.add_argument('--no-check', action='store_true')
A = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.dirname(os.path.dirname(HERE))

def call(method, path, body=None):
    key = os.environ.get('ARK_API_KEY')
    if not key: sys.exit('set ARK_API_KEY (Ark console, API Key management). It is read from the environment only.')
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key})
    try:
        with urllib.request.urlopen(req, timeout=120, context=CTX) as r: return json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        sys.exit('Ark answered %d: %s' % (e.code, e.read().decode('utf8', 'replace')[:1500]))
    except urllib.error.URLError as e: sys.exit('cannot reach Ark: %s' % e.reason)

def prompt_text(path):
    s = open(path, encoding='utf8').read(); m = re.search(r'```text\n(.*?)```', s, re.S)
    return (m.group(1) if m else re.sub(r'^---.*?---\n', '', s, flags=re.S)).strip()
def image_item(ref, role=None):
    if ref.startswith(('http://', 'https://', 'data:')): url = ref
    else:
        if not os.path.isfile(ref): sys.exit('no such image: ' + ref)
        mt = mimetypes.guess_type(ref)[0] or 'image/jpeg'; url = 'data:%s;base64,%s' % (mt, base64.b64encode(open(ref, 'rb').read()).decode())
    it = {'type': 'image_url', 'image_url': {'url': url}}
    if role: it['role'] = role
    return it
def show(t):
    print(json.dumps({k: t.get(k) for k in ('id', 'model', 'status', 'error', 'duration', 'ratio', 'resolution', 'usage') if k in t}, ensure_ascii=False, indent=1))
    return t
def download(url, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with urllib.request.urlopen(url, timeout=600, context=CTX) as r, open(out, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    print('saved', out, '(%.1f MB)' % (os.path.getsize(out) / 1e6))
def wait(tid):
    t0 = time.time()
    while True:
        t = call('GET', '/contents/generations/tasks/' + tid); st = t.get('status')
        print('%4ds  %s' % (time.time() - t0, st), flush=True)
        if st == 'succeeded':
            url = (t.get('content') or {}).get('video_url')
            if not url: sys.exit('succeeded but no video_url in the answer: ' + json.dumps(t, ensure_ascii=False)[:500])
            download(url, A.out)
            if not A.no_check and os.path.exists(os.path.join(LIB, 'tools/talk/hostcheck.py')):
                py = os.path.join(LIB, '.venv/bin/python'); subprocess.run([py if os.path.exists(py) else sys.executable, os.path.join(LIB, 'tools/talk/hostcheck.py'), A.out])
            return
        if st in ('failed', 'expired', 'cancelled'): show(t); sys.exit('task %s: %s' % (st, json.dumps(t.get('error'), ensure_ascii=False)))
        if time.time() - t0 > A.timeout: sys.exit('still %s after %d s; pick it up later with: seedance.py wait %s --out %s' % (st, A.timeout, tid, A.out))
        time.sleep(A.poll)

if A.cmd_or_prompt == 'status':
    if not A.task: sys.exit('usage: seedance.py status <task id>')
    show(call('GET', '/contents/generations/tasks/' + A.task)); sys.exit(0)
if A.cmd_or_prompt == 'wait':
    if not A.task: sys.exit('usage: seedance.py wait <task id> --out host.mp4')
    wait(A.task); sys.exit(0)

text = prompt_text(A.cmd_or_prompt)
content = [{'type': 'text', 'text': text}] + [image_item(r, 'first_frame' if (len(A.image) == 1 and False) else None) for r in A.image]
body = {'model': A.model, 'content': content, 'ratio': 'adaptive' if A.aspect == 'adaptive' else A.aspect.replace('x', ':'), 'duration': A.seconds, 'resolution': A.resolution, 'generate_audio': not A.no_audio, 'watermark': A.watermark}
if A.seed is not None: body['seed'] = A.seed
shown = json.loads(json.dumps(body))
for it in shown['content']:
    if it['type'] == 'image_url' and it['image_url']['url'].startswith('data:'): it['image_url']['url'] = it['image_url']['url'][:40] + '…(inline image)'
print('POST %s/contents/generations/tasks\n%s\n' % (BASE, json.dumps(shown, ensure_ascii=False, indent=1)))
if A.seconds != -1 and not 4 <= A.seconds <= 30: sys.exit('seconds must be 4-30 (Seedance 2.5) or -1; 2.0 series: 4-15')
if not A.yes: print('dry run: nothing was sent. Add --yes to submit (this costs money on your Ark account).'); sys.exit(0)
r = call('POST', '/contents/generations/tasks', body); tid = r.get('id')
if not tid: sys.exit('no task id in the answer: ' + json.dumps(r, ensure_ascii=False)[:500])
print('task', tid, '(keep it: seedance.py wait %s --out %s)' % (tid, A.out)); wait(tid)
