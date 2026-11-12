# Cloudflare Pages

**The only host** (owner, 2026-11-11). The AWS stack in `hosting/` is dormant:
kept, not maintained, not deployed. One Cloudflare Pages project per app, all
built from this repo. **A merge to `master` is the production deploy** for
every project; any other branch builds a `noindex` preview at
`<branch>.<project>.pages.dev` - the branch name lowercased, `/` and other
symbols turned to `-`, and **cut to 28 characters** (so
`claude/peaceful-feynman-p7r37j` previews at
`claude-peaceful-feynman-p7r3.ip-5q5.pages.dev`).

| Project | Root directory | Build command | Output directory |
|---|---|---|---|
| tonight | `apps/tonight` | *(none)* | `.` |
| until | `apps/until` | *(none)* | `.` |
| ip | `cloudflare/ip` | `rm -rf public && cp -r ../../apps/ip public` | `public` |

The apps are self-contained folders, so they publish as they are.

## tide is a Worker, not a Pages project (owner, 2026-11-12)

*"I'd prefer to use a worker."* `cloudflare/tide/wrangler.jsonc` is a
Worker with static assets and **no script**: tide is pure static (every API
call goes from the browser to Open-Meteo, NOAA or BigDataCloud), so the
Worker only serves files, and static asset requests are free and unmetered.
The assets directory is `../../apps/tide`, read in place - no copy step.

| file | why |
|---|---|
| `cloudflare/tide/wrangler.jsonc` | the Worker: name `tide`, assets from `apps/tide`, unknown paths answer a real 404. |
| `apps/tide/_headers` | `nosniff`, no Referer, long cache for `fonts/`, a day (+ a week stale) for `data/`. Geolocation is left allowed - "Use my location" needs it. |
| `apps/tide/.assetsignore` | keeps `README.md` off the site. |
| `apps/tide/404.html` | served with a 404 for any unknown path (`not_found_handling: "404-page"`), so crawlers never see index.html under a wrong URL. |
| `robots.txt`, `sitemap.xml`, canonical + Open Graph + JSON-LD in `index.html` | search basics, at the domain **`tidehere.app`** (owner, 2026-11-12: bought through Cloudflare, attached to the `tide` Worker). It is written in full in those three files and `site.webmanifest`; if the domain changes, change all four. |
| `favicon.ico`, `icon-*.png`, `apple-touch-icon.png`, `share.png` | real icon files and the 1200x630 link-preview image, rendered from the page's own favicon and globe by `node scripts/tide-build-icons.js`. |

The `workers.dev` address is off (`"workers_dev": false`, owner,
2026-11-12) so the site is indexed only at tidehere.app. Preview URLs live
on workers.dev, so tide has no branch previews: try a branch with
`npx wrangler dev` in `cloudflare/tide`.

Connect it once in the dashboard (Workers & Pages -> Create -> Import a
repository -> this repo):

| setting | value |
|---|---|
| Project name | `tide` (must match `name` in `wrangler.jsonc`) |
| Production branch | `master` |
| Root directory (Advanced) | `cloudflare/tide` |
| Build command | *(empty)* |
| Deploy command | `npx wrangler deploy` |
| Non-production branch builds | off - with workers.dev off there is no preview URL to upload to |

As with Pages, a merge to `master` is the production deploy.

Try it locally (Node required):

    cd cloudflare/tide
    npx wrangler dev

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
| `ipv6/`, `isp/`, `private/`, `ipv4-vs-ipv6/`, `cidr/`, `door/` | The doors (owner, 2026-11-11): one small fast page per search, sharing `door/door.css` and `door/door.js`, and `js/01-address.js` for parsing. Listed in `sitemap.xml`. |
| `ipv4-vs-ipv6/` numbers | The "By the numbers" section is derived from `data/space.bin` by `scripts/ip-build-door-stats.py`, never typed. Rerun it after rebuilding `space.bin`. |
| `site.webmanifest` | Name, colours and icons for phones that add the site to a home screen. |
| `share.png` | 1200x630 link-preview image (`og:image`). Same script. |
| `data/space.bin.gz` | Pages will not compress `application/octet-stream`, so the raw 2.9 MB `space.bin` was downloaded uncompressed. The page fetches this 439 KB copy and unpacks it with `DecompressionStream`; `space.bin` is the fallback. Both are written by `scripts/ip-build-space-field.py`. |

`functions/whoami.js` answers `/whoami` with the address, plus `where`
(Cloudflare's own `request.cf` city/region/country) and `net` (`request.cf`
AS number and name). Nobody else is asked.


## Browser caching on iphere.app (found 2026-11-11)

The `iphere.app` zone's **Browser Cache TTL** rewrites CSS and JS to
`max-age=14400` (4 hours); `*.pages.dev` serves them with `max-age=0`. So a
deploy reached iphere.app but phones kept running the old CSS and JS for up
to four hours - "it worked on pages.dev but not iphere.app".

- In the repo: `scripts/ip-map.py` stamps `?v=<content hash>` on every CSS
  and JS link and `data-content` on `<html>`, so a changed file has a URL
  no browser has cached. This works whatever the zone setting is.
- In the dashboard (owner): iphere.app -> Caching -> Configuration ->
  Browser Cache TTL -> **Respect Existing Headers**. Then `_headers` and
  Pages decide, as they do on pages.dev.

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
