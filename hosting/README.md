> **DORMANT (owner, 2026-11-11).** Cloudflare Pages is the only host - see
> `cloudflare/README.md`. Nothing here is maintained or deployed; it is kept,
> not deleted. Do not prepare AWS deploy commands from it.

# hosting

The shared static-hosting stack. Deployed **once**, then left alone. Adding
or updating an app never touches this stack -- it's just an `s3 sync`.

## What it creates

- **One private S3 bucket** (`AppsBucket`) -- `BLOCK_ALL` public access,
  SSL enforced, versioned, `RETAIN` on stack delete. No public bucket
  policy; the only reader is CloudFront via Origin Access Control.
- **One CloudFront distribution** (`Cdn`) -- HTTPS-only, HTTP/2+3,
  `PRICE_CLASS_100` (NA+EU). A viewer-request CloudFront Function rewrites
  directory URIs (`/picker/`, `/picker`) to `/picker/index.html` so each
  app's own `index.html` resolves at its path prefix. `403` -> `/404.html`.
- **An account-wide monthly cost budget** ($10) -- only if you pass
  `-c alert_email=...`. Not scoped to this stack on purpose: a runaway
  Tier 2 app should trip it too.

Outputs: `BucketName`, `DistributionId`, `DistributionDomain`.

## Serving model

`apps/<name>/` on disk  ->  `s3://<bucket>/<name>/`  ->
`https://<DistributionDomain>/<name>/`

No DNS, no per-app certificate, no per-app stack. `hosting/site-root/`
(the bare-domain landing page + `404.html`) syncs to the bucket root.

## Deploying it (human, from PowerShell -- see ../docs/DEPLOY.md)

CDK on this machine has sharp edges (notes §6). In short:

```powershell
cd hosting
py -3 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:PATH = "$PWD\.venv\Scripts;" + $env:PATH        # venv python must win
$env:JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION = "1"  # Node 26
$env:AWS_PROFILE = "story-deploy"                       # the deploy profile
# account <AWS_ACCOUNT_ID> / us-east-1 is already bootstrapped -- do NOT re-bootstrap
cdk deploy -c alert_email=you@example.com
```

`cdk.json` uses `"app": "python app.py"` -- it runs whichever `python` is
first on PATH, which is why the venv Scripts dir has to be prepended.
Never put a forward-slash venv path in `cdk.json`; cmd.exe can't run it.

## Changing it later

Safe to redeploy in place. The bucket is `RETAIN` + versioned, so a bad
change won't lose shipped apps. If you ever `cdk destroy`, the bucket and
its contents survive and must be emptied/deleted by hand.
