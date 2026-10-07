"""A small, careful HTTP(S) fetcher for article pages and their pictures (used by article.py --url, and by the web service when ARTICLE_URL_FETCH is on).

  from netguard import fetch, check_url, NetError

check_url(url)  -> (scheme, host, port, path_with_query, [ip, ...])   raises NetError unless the URL is public http(s)
fetch(url, max_bytes, timeout, accept=('text/html',), redirects=4) -> (final_url, content_type, bytes)

What it enforces (the server-side-request-forgery rules):
  * only http and https, only ports 80 and 443, no credentials in the URL, no IP-literal hosts that are not public;
  * the host name is resolved here and EVERY address must be public (not private, loopback, link-local, multicast, reserved, unspecified, carrier-grade NAT,
    not an IPv4-mapped form of one); the connection then goes to that checked address (no second lookup, so DNS rebinding cannot swap it);
  * redirects are followed by hand, at most `redirects`, and each hop is checked again from scratch;
  * Accept-Encoding: identity (no decompression bombs), a hard byte cap read in pieces, a total deadline, the content type must be one of `accept`;
  * environment proxies are ignored.
"""
import http.client, ipaddress, re, socket, ssl, time, urllib.parse

class NetError(Exception): pass

UA = 'lemo-opuscar-article/1.0 (+personal tool; one page per run)'
BLOCKED_NETS = [ipaddress.ip_network(n) for n in ('0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.168.0.0/16', '198.18.0.0/15',
                                                  '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4', '::/128', '::1/128', 'fc00::/7', 'fe80::/10', 'ff00::/8', '2001:db8::/32', '64:ff9b::/96')]

def ip_is_public(ip):
    try: a = ipaddress.ip_address(ip)
    except ValueError: return False
    if getattr(a, 'ipv4_mapped', None): a = a.ipv4_mapped
    if getattr(a, 'sixtofour', None) and a.version == 6 and a.sixtofour: a = a.sixtofour
    if a.is_private or a.is_loopback or a.is_link_local or a.is_multicast or a.is_reserved or a.is_unspecified: return False
    return not any(a in n for n in BLOCKED_NETS if n.version == a.version) and a.is_global

def resolve(host, port):
    try: infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror: raise NetError('cannot resolve %s' % host)
    ips = []
    for fam, _, _, _, sa in infos:
        ip = sa[0]
        if ip not in ips: ips.append(ip)
    if not ips: raise NetError('cannot resolve %s' % host)
    bad = [ip for ip in ips if not ip_is_public(ip)]
    if bad: raise NetError('%s resolves to a non-public address (%s): refused' % (host, bad[0]))
    return ips

def _ssl_ctx():
    """The default verifying context; where Python ships no CA bundle (python.org builds on macOS) fall back to certifi or the system bundle."""
    c = ssl.create_default_context()
    if c.cert_store_stats().get('x509_ca'): return c
    for cafile in (getattr(__import__('certifi', fromlist=['x']), 'where', lambda: None)() if _has('certifi') else None, '/etc/ssl/cert.pem', '/etc/ssl/certs/ca-certificates.crt'):
        if cafile and __import__('os').path.exists(cafile): return ssl.create_default_context(cafile=cafile)
    return c
def _has(m):
    try: __import__(m); return True
    except ImportError: return False

def _canonical_ip(h):
    try: ipaddress.ip_address(h); return True
    except ValueError: return False

def check_url(url):
    if not isinstance(url, str) or len(url) > 2000 or any(c in url for c in '\r\n\t\x00 '): raise NetError('not a plain URL')
    u = urllib.parse.urlsplit(url)
    if u.scheme not in ('http', 'https'): raise NetError('only http and https URLs are accepted')
    if u.username or u.password or '@' in u.netloc: raise NetError('URLs with credentials are refused')
    host = (u.hostname or '').strip('.').lower()
    if re.fullmatch(r'(0x[0-9a-f]+|\d+)(\.(0x[0-9a-f]+|\d+))*', host or '') and not _canonical_ip(host): raise NetError('numeric host names in unusual forms are refused')
    if not host or host == 'localhost' or host.endswith(('.localhost', '.local', '.internal', '.lan', '.home', '.corp')) or '.' not in host and ':' not in host: raise NetError('not a public host name')
    try: port = u.port or (443 if u.scheme == 'https' else 80)
    except ValueError: raise NetError('bad port')
    if port not in (80, 443): raise NetError('only ports 80 and 443 are accepted')
    ips = resolve(host, port)
    path = (u.path or '/') + ('?' + u.query if u.query else '')
    return u.scheme, host, port, path, ips

class _Conn(http.client.HTTPSConnection):
    """Connects to the address we already checked, but verifies the certificate for (and sends SNI for) the real host name."""
    def __init__(self, host, ip, port, timeout, ctx):
        super().__init__(host, port, timeout=timeout, context=ctx); self._ip = ip
    def connect(self):
        sock = socket.create_connection((self._ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
class _ConnHTTP(http.client.HTTPConnection):
    def __init__(self, host, ip, port, timeout): super().__init__(host, port, timeout=timeout); self._ip = ip
    def connect(self): self.sock = socket.create_connection((self._ip, self.port), self.timeout)

def fetch(url, max_bytes=3_000_000, timeout=20, accept=('text/html', 'text/plain', 'text/markdown', 'application/xhtml+xml'), redirects=4):
    deadline = time.time() + timeout; cur = url
    for hop in range(redirects + 1):
        scheme, host, port, path, ips = check_url(cur); last = None
        for ip in ips:
            left = deadline - time.time()
            if left <= 0: raise NetError('timed out')
            conn = _Conn(host, ip, port, min(left, 15), _ssl_ctx()) if scheme == 'https' else _ConnHTTP(host, ip, port, min(left, 15))
            try:
                conn.request('GET', path, headers={'Host': host if port in (80, 443) else '%s:%d' % (host, port), 'User-Agent': UA, 'Accept': ', '.join(accept) + ', */*;q=.1', 'Accept-Encoding': 'identity', 'Connection': 'close'})
                r = conn.getresponse()
                if r.status in (301, 302, 303, 307, 308):
                    loc = r.getheader('Location') or ''
                    if not loc: raise NetError('a redirect without a target')
                    cur = urllib.parse.urljoin(cur, loc); conn.close(); break
                if r.status != 200: raise NetError('the server answered %d' % r.status)
                ct = (r.getheader('Content-Type') or '').split(';')[0].strip().lower()
                if accept and not any(ct == a or (a.endswith('/*') and ct.startswith(a[:-1])) for a in accept): raise NetError('unexpected content type %r' % ct)
                cl = r.getheader('Content-Length')
                if cl and cl.isdigit() and int(cl) > max_bytes: raise NetError('the response is larger than %d MB' % (max_bytes // 1048576))
                buf = bytearray()
                while True:
                    if time.time() > deadline: raise NetError('timed out')
                    b = r.read(65536)
                    if not b: break
                    buf += b
                    if len(buf) > max_bytes: raise NetError('the response is larger than %d MB' % (max_bytes // 1048576))
                return cur, ct, bytes(buf)
            except NetError: raise
            except (OSError, http.client.HTTPException, ssl.SSLError) as e: last = e; continue
            finally:
                try: conn.close()
                except Exception: pass
        else:
            raise NetError('could not connect (%s)' % (type(last).__name__ if last else 'no address'))
    raise NetError('too many redirects')
