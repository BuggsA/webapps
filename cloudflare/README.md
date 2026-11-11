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
| `robots.txt` | Allow everything. Gains a `Sitemap:` line once the custom domain is chosen. |
| `data/space.bin.gz` | Pages will not compress `application/octet-stream`, so the raw 2.9 MB `space.bin` was downloaded uncompressed. The page fetches this 439 KB copy and unpacks it with `DecompressionStream`; `space.bin` is the fallback. Both are written by `scripts/ip-build-space-field.py`. |

`functions/whoami.js` answers `/whoami` with the address, plus `where`
(Cloudflare's own `request.cf` city/region/country) and `net` (`request.cf`
AS number and name). Nobody else is asked.

