# Cloudflare Pages

A second home for the apps, alongside the AWS stack in `hosting/` (which keeps
running). One Cloudflare Pages project per app, all built from this repo;
every push to `master` redeploys them.

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
