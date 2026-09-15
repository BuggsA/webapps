# ip — data and architecture research

All checks run 2026-09-15 from a plain shell with a foreign `Origin` header,
i.e. the same conditions a static page on `<DISTRIBUTION_DOMAIN>`
faces. Endpoints that were *assumed* to work in the source document but do
not are called out in §3.

House rule being satisfied: every runtime fetch must be keyless, CORS-open,
cached, and optional (`building-a-new-app.md` §1).

---

## 1. RIPEstat Data API — confirmed usable

`https://stat.ripe.net/data/<call>/data.json?resource=…`

Keyless. Responds `Access-Control-Allow-Origin: *` and
`Content-Type: application/json; charset=utf-8`. Verified with
`-H "Origin: https://example.com"`:

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: *
```

Calls checked live, with real responses:

| Call | Gives | Checked with | Result |
|---|---|---|---|
| `network-info` | the announced prefix + origin ASN for an address | `193.0.6.139` | `{"asns":["3333"],"prefix":"193.0.0.0/21"}` |
| `prefix-overview` | holder name, announced y/n, IANA block, related prefixes | `193.0.0.0/21` | holder `RIPE-NCC-AS Reseaux IP Europeens Network Coordination Centre (RIPE NCC)` |
| `as-overview` | AS type, holder, allocation block | `AS3333` | ok |
| `asn-neighbours` | left/right/unique neighbour counts and the neighbour list | `AS3333` | `{"left":46,"right":2,"unique":909,"uncertain":862}`, ~1 s |
| `announced-prefixes` | every prefix an AS announces, with timelines | `AS3333` | 8 prefixes |

Notes for the build:

- `asn-neighbours` took **~1 s** server-side. It is a "later phase, after the
  answer is on screen" call, never anything the first paint waits on.
- Responses carry `cached`, `query_time`, `data_call_status`. `data_call_
  status` is worth checking — some calls are `supported`, others
  `deprecated`, and the app should degrade quietly rather than throw.
- `asn-neighbours` reports an `uncertain` count alongside `unique`
  (862 of 909 for AS3333). That is real, published uncertainty, and it maps
  directly onto the brief's "unresolved regions may be fog".
- Cache in `localStorage` with a long TTL: a prefix's origin AS and holder
  change on the order of months, not minutes.

## 2. RIPE RIS Live — confirmed usable from a browser

`wss://ris-live.ripe.net/v1/ws/?client=<name>`

Keyless, no account. Handshake verified with a foreign `Origin`:

```
HTTP/1.1 101 Switching Protocols
Connection: upgrade
Upgrade: websocket
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

It upgraded and immediately began streaming frames. This is the material for
the live-rewiring layer: real BGP announcements and withdrawals from RIPE's
route collectors, continuously.

Build notes:

- Subscribe narrowly (by prefix / AS / collector), not to the firehose. The
  unfiltered stream is far more than a phone should parse, and the brief's
  performance floor is a cheap Android.
- Pure decoration risk: if the app shows churn without it meaning anything,
  it becomes a screensaver. Tie the visible thread changes to prefixes the
  visitor can actually see on screen.
- WebSocket is not in the offline path. Everything must be correct and
  beautiful with the socket never connecting.

## 3. Sources the source document names that do *not* work as assumed

- **Team Cymru IP-to-ASN.** DNS (`origin.asn.cymru.com`) and whois only.
  A browser cannot issue either. Not usable client-side at all — RIPEstat
  `network-info` covers exactly this ground and is CORS-open.
- **Cloudflare Radar** (route leaks/hijacks, confirmed outages). Needs an
  account and a `Radar:Read` bearer token, so it cannot be called from a
  static page without shipping a secret. Server-side only, 10k req/day, and
  it requires attribution. Out for Tier 1.
- **IODA** (Georgia Tech outage detection). Code is under an
  academic-research licence; other use routes through Georgia Tech
  licensing. Do not depend on it in a shipped public product without
  checking that first.
- **RouteViews.** Same category of data as RIS Live, useful for
  corroboration, but the access path is bulk MRT dumps rather than a
  browser-friendly stream. Not a v1 dependency.

Conclusion: **RIPEstat + RIS Live is the whole data layer**, and both are
keyless, CORS-open, public, and free. That is a better position than the
source document assumed it was in.

## 4. Getting the visitor's own address — the one architectural decision

The app's primary utility is the visitor's IP, and the source document wants
it (a) in the first response without JavaScript and (b) available to `curl`
as plaintext. A pure-static S3 object cannot do either: the bucket never
sees the viewer's address.

Three ways out, in order of preference.

### A. CloudFront Function at viewer-request (RECOMMENDED)

Verified in the AWS docs: the CloudFront Functions event object contains a
`viewer` object whose `ip` field is *"the IP address of the viewer (client)
that sent the request"*, and a function may return a generated `response`
object instead of a request.

So one small function on a behaviour for this app:

- `Accept` does not include `text/html` (curl, wget, scripts) → return
  `200 text/plain` with `event.viewer.ip` and a newline. Never touches the
  origin.
- Otherwise → fall through to the static page in S3, which fetches the same
  path with `Accept: application/json` for the number.

Costs, limits and consequences:

- ~$0.10 per million invocations; no Lambda, no cold start, no VPC, sub-
  millisecond, runs at every edge.
- Function source is capped at **10 KB** (quota, not adjustable) and 2 MB
  memory. Plenty for this; *not* enough to inline a whole rendered HTML
  page, which is why option C is not "generate the art page at the edge".
- The browser therefore gets the number via one **same-origin** `fetch` to
  the nearest edge — no third party, no CORS preflight, typically one short
  RTT. Reserve the space so nothing shifts when it lands.
- The cost: in a browser, the address needs JavaScript. That is the single
  concession against the source document's "available in the initial
  server-rendered response".
- Caching must be disabled on that behaviour (the response varies per
  viewer). Set `Cache-Control: no-store` in the generated response.

**This is the first app to touch `hosting/`.** The system's standing promise
is that adding an app is an `s3 sync` and never a stack change. This one
needs a `cdk deploy` of `WebappsHostingStack` to add the function and the
behaviour. Worth the human deciding knowingly, not discovering later.

### B. Tier 2 — Lambda Function URL rendering the page

Gives the source document exactly what it asked for: the address baked into
the HTML, no JS needed, content negotiation in the same handler. Costs a
Lambda per page view, a cold-start tail on the very thing that must never
feel slow, and a CloudFront behaviour anyway. The template exists in
`reference/`. Not recommended, but it is the honest way to get no-JS.

### C. A third-party echo (`ipify`, `icanhazip`, `cdn-cgi/trace`)

Rejected. It sends every visitor's address to a company that has nothing to
do with this site, on a page whose stated ethic is that it does not do that.
Also slower than our own edge, and breaks if they rate-limit us.

## 5. Privacy consequence to decide before building

The bare answer can be served with the visitor's address never leaving our
edge. **Everything past it cannot**: prefix, holder, ASN and neighbours all
come from RIPEstat, which means the browser sends the address to RIPE.

Two honest options:

1. Disclose it in one line ("your address is looked up against RIPE's public
   registry data; we store nothing"). RIPE NCC is a non-profit registry and
   about the most defensible recipient available — but it is still a third
   party and the promise now has a clause.
2. **Defer every lookup until the visitor moves past the answer.** A person
   who arrives, copies, and leaves has talked to nobody but us; only someone
   who chooses to go deeper triggers a lookup, and the line explaining it can
   sit right where that happens.

Option 2 keeps the simple promise simple and costs nothing, because the deep
layers are below the fold by design. Recommended.

## 6. Scale of the navigable field (for the later phases)

Not four billion addresses. The real navigable units are **announced
prefixes** (order 10^6) and **autonomous systems** (order 10^5 — roughly
80,000 active). Both are enumerable from RIPEstat, both have genuine
internal structure, and both have owners with recognisable names, which is
what makes search and landmarks possible at all. A tractable dataset with
real relationships beats an intractable one with invented ones.
