# Facts: what happens when you open a web page

General, widely documented behaviour; the film simplifies. Nothing here is a measurement.

| What the film says | Basis | Status |
|---|---|---|
| The browser asks the domain name system which address a name maps to | DNS translates names to IP addresses (RFC 1034/1035) | common knowledge, not re-checked against the RFCs here |
| It then makes an encrypted connection (a handshake) with a nearby edge node | TLS handshake; CDNs terminate connections at edge locations | simplified: in practice the order and number of round trips vary (TLS 1.2 vs 1.3, connection reuse) |
| Static things (images, styles) are served by the edge node when it has them | CDN caching | common knowledge |
| Dynamic requests continue to the machine room, first to a load balancer, then a free application server | typical web architecture | simplified: real systems differ; there can be several load balancers, gateways, queues |
| The server asks a cache first and queries the database on a miss, then stores the result | cache-aside pattern | one common pattern, not the only one |
| The result returns along the same path; the browser assembles the page | HTTP request/response | simplified (the film ignores redirects, parallel requests and API calls) |
| The closer a request is answered, the faster the page | latency grows with distance and hops | qualitative; no numbers on screen |
| `example.com` | reserved example domain (RFC 2606) | |

The packet labels (GET /logo.png, GET /我的订单) are illustrative. No product, company or protocol version is named.
