# Cloudflare Pages

**The only host** (owner, 2026-11-11). The AWS stack in `hosting/` is dormant:
kept, not maintained, not deployed. One Cloudflare Pages project per app, all
built from this repo. **A merge to `master` is the production deploy** for
every project; any other branch builds a `noindex` preview at
`<branch>.<project>.pages.dev`.

| Project | Root directory | Build command | Output directory |
|---|---|---|---|
| tide | `apps/tide` | *(none)* | `.` |
| tonight | `apps/tonight` | *(none)* | `.` |
| until | `apps/until` | *(none)* | `.` |
| ip | `cloudflare/ip` | `rm -rf public && cp -r ../../apps/ip public` | `public` |

The apps are self-contained folders, so three of them publish as they are.

`ip` is the exception: it needs a server answer for the visitor's address.
On AWS that is the CloudFront Function `hosting/edge/ip-whoami.js` at
`/ip/whoami`; here it is the Pages Function `cloudflare/ip/functions/whoami.js`
at `/whoami`. Same contract, kept in step by hand. The function lives outside
`apps/ip` so the AWS `s3 sync` of that folder never uploads it. The page asks
for `whoami` relative to itself, so it works on both hosts unchanged.

Try the ip site locally (Node required):

    cd cloudflare/ip
    rm -rf public && cp -r ../../apps/ip public
    npx wrangler pages dev public

## What `apps/ip` ships for Cloudflare

All of these sit in `apps/ip/`, so they land at the site root:

| file | why |
|---|---|
| `_headers` | Pages response headers: long cache for `fonts/` and `data/`, no Referer sent anywhere, `noindex` on the `.md` files. |
| `404.html` | Without one, Pages answers **every** unknown path - including `/robots.txt` and `/sitemap.xml` - with `index.html` and a 200. Search engines read that as endless duplicate pages. |
| `robots.txt` | Allow everything, and points at the sitemap. |
| `sitemap.xml` | The front page and the doors, at its canonical address `https://iphere.app/`. `index.html` carries the matching `<link rel="canonical">`. |
| `favicon.ico`, `icon-*.png`, `apple-touch-icon.png` | The reticle mark as real files Google and phones can fetch (Google needs a crawlable favicon, a multiple of 48 px; it crops it to a circle, which the concentric mark survives). Built by `scripts/ip-build-icons.py`. |
| `ipv6/`, `isp/`, `private/`, `door/` | The doors (owner, 2026-11-11): one small fast page per search, sharing `door/door.css` and `door/door.js`, and `js/01-address.js` for parsing. Listed in `sitemap.xml`. |
| `share.png` | 1200x630 link-preview image (`og:image`). Same script. |
| `data/space.bin.gz` | Pages will not compress `application/octet-stream`, so the raw 2.9 MB `space.bin` was downloaded uncompressed. The page fetches this 439 KB copy and unpacks it with `DecompressionStream`; `space.bin` is the fallback. Both are written by `scripts/ip-build-space-field.py`. |

`functions/whoami.js` answers `/whoami` with the address, plus `where`
(Cloudflare's own `request.cf` city/region/country) and `net` (`request.cf`
AS number and name). Nobody else is asked.


## The custom domain: `iphere.app` (owner, 2026-11-11)

The ip project's production address is **`https://iphere.app/`**; the
canonical tag, `robots.txt` and `sitemap.xml` all name it. Set up in the
Cloudflare dashboard, not in this repo:

1. Bought through Cloudflare Registrar, so its DNS is already on Cloudflare.
2. Workers & Pages -> `ip` -> Custom domains -> add `iphere.app` (Cloudflare
   writes the DNS record and the certificate). Optionally `www.iphere.app`
   too, redirected to the bare domain.
3. `ip-5q5.pages.dev` -> `iphere.app` is a **Bulk Redirect** (Rules ->
   Redirect Rules -> Bulk Redirects): source `ip-5q5.pages.dev`, target
   `https://iphere.app`, 301, with *preserve query string*, *subpath
   matching* and *preserve path suffix* on. It lives in the dashboard
   rather than as a Pages Function so it costs no Function invocations, and
   it leaves branch previews (`<branch>.ip-5q5.pages.dev`) alone.
