"""Image -> 3D model (.glb) with Doubao Seed3D on Volcengine Ark.

  python3 tools/gen/seed3d.py image.png --out model.glb [--format glb|obj|usd|usdz] [--level low|medium|high] [--key-file "火山引擎key.txt"] [--yes]

The key comes from $ARK_API_KEY, or from --key-file (a text file holding the key; the tool picks the longest token in it). It is never printed, logged or
written anywhere. Without --yes only the request (with the image shortened) is shown: generating costs money on your Ark account.
Model doubao-seed3d-2-0-260328: one image in (URL or an inline data: URL, up to 30 MB), a textured PBR model out; faces about 100k / 500k / 1M for
low / medium / high. The task is asynchronous (minutes); the result link lives 24 hours, so the tool downloads at once. Add model=… with --model to override.
Written from the Ark docs (create-3d-generation-task-api, get-3d-generation-task-api)."""
import ssl, argparse, base64, json, mimetypes, os, re, sys, time, urllib.request, urllib.error

BASE = os.environ.get('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')

def _ctx():                                         # python.org builds on macOS ship without CA certificates: fall back to the system bundle (verification stays on)
    c = ssl.create_default_context()
    if not c.cert_store_stats().get('x509_ca') and not c.cert_store_stats().get('x509'):
        for f in ('/etc/ssl/cert.pem', '/etc/ssl/certs/ca-certificates.crt', '/etc/pki/tls/certs/ca-bundle.crt'):
            if os.path.exists(f): return ssl.create_default_context(cafile=f)
    return c
CTX = _ctx()
ap = argparse.ArgumentParser(); ap.add_argument('image'); ap.add_argument('--out', default='model.glb'); ap.add_argument('--format', default='glb', choices=['glb', 'obj', 'usd', 'usdz'])
ap.add_argument('--level', default='medium', choices=['low', 'medium', 'high']); ap.add_argument('--model', default='doubao-seed3d-2-0-260328'); ap.add_argument('--key-file')
ap.add_argument('--yes', action='store_true'); ap.add_argument('--poll', type=int, default=15); ap.add_argument('--timeout', type=int, default=1800)
A = ap.parse_args()

def get_key():
    k = os.environ.get('ARK_API_KEY')
    if not k and A.key_file:
        try: toks = re.findall(r'[A-Za-z0-9_\-\.=]{16,}', open(A.key_file, encoding='utf8').read())
        except OSError as e: sys.exit('cannot read the key file: %s' % e.strerror)
        k = max(toks, key=len) if toks else None
    if not k: sys.exit('no key: set ARK_API_KEY or pass --key-file')
    return k
def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + get_key()})
    try:
        with urllib.request.urlopen(req, timeout=120, context=CTX) as r: return json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e: sys.exit('Ark answered %d: %s' % (e.code, e.read().decode('utf8', 'replace')[:1200]))
    except urllib.error.URLError as e: sys.exit('cannot reach Ark: %s' % e.reason)

if A.image.startswith(('http://', 'https://', 'data:')): url = A.image
else:
    if not os.path.isfile(A.image): sys.exit('no such image: ' + A.image)
    if os.path.getsize(A.image) > 30e6: sys.exit('the image is over 30 MB')
    url = 'data:%s;base64,%s' % (mimetypes.guess_type(A.image)[0] or 'image/png', base64.b64encode(open(A.image, 'rb').read()).decode())
body = {'model': A.model, 'content': [{'type': 'text', 'text': '--subdivisionlevel %s --fileformat %s' % (A.level, A.format)}, {'type': 'image_url', 'image_url': {'url': url}}]}
shown = json.loads(json.dumps(body)); u = shown['content'][1]['image_url']['url']; shown['content'][1]['image_url']['url'] = u[:40] + '…(inline image)' if u.startswith('data:') else u
print('POST %s/contents/generations/tasks\n%s' % (BASE, json.dumps(shown, ensure_ascii=False, indent=1)))
if not A.yes: print('\ndry run: nothing was sent. Add --yes to submit (this costs money).'); sys.exit(0)
r = call('POST', '/contents/generations/tasks', body); tid = r.get('id')
if not tid: sys.exit('no task id in the answer: ' + json.dumps(r, ensure_ascii=False)[:500])
print('\ntask', tid); t0 = time.time()
while True:
    t = call('GET', '/contents/generations/tasks/' + tid); st = t.get('status'); print('%4ds  %s' % (time.time() - t0, st), flush=True)
    if st == 'succeeded': break
    if st in ('failed', 'expired', 'cancelled'): sys.exit('task %s: %s' % (st, json.dumps(t.get('error'), ensure_ascii=False)))
    if time.time() - t0 > A.timeout: sys.exit('still %s after %d s; task id %s (the result link lives 24 h)' % (st, A.timeout, tid))
    time.sleep(A.poll)
urls = re.findall(r'https?://[^"\s]+', json.dumps(t.get('content') or t, ensure_ascii=False))
if not urls: sys.exit('succeeded but no file link in the answer: ' + json.dumps(t, ensure_ascii=False)[:600])
os.makedirs(os.path.dirname(os.path.abspath(A.out)), exist_ok=True)
with urllib.request.urlopen(urls[0], timeout=600, context=CTX) as rr: data = rr.read()
if data[:2] == b'PK':                                   # the result arrives as a zip (e.g. pbr/mesh_textured_pbr.glb); keep the model file only
    import io, zipfile
    z = zipfile.ZipFile(io.BytesIO(data)); names = [n for n in z.namelist() if n.lower().endswith('.' + A.format)] or z.namelist()
    data = z.read(sorted(names, key=lambda n: ('pbr' not in n, len(n)))[0]); print('unpacked', sorted(names, key=lambda n: ('pbr' not in n, len(n)))[0], 'from the zip (files in it: %s)' % ', '.join(z.namelist()))
with open(A.out, 'wb') as f: f.write(data)
print('saved %s (%.1f MB), usage: %s' % (A.out, os.path.getsize(A.out) / 1e6, json.dumps(t.get('usage'))))
