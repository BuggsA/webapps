# PROJECT_STATE

Living status file. Update it when something material changes.

## 2026-09-02 -- bootstrap

- Fresh repo created at `C:\Users\you\Downloads\scratch-repo\webapps`
  (separate from the frozen `story-app` repo).
- Subagent definitions written: `builder`, `researcher`, `deployer`.
  Frontmatter format (`isolation: worktree`, comma-form `tools:`,
  `model:`) confirmed valid against current Claude Code docs.
- Hosting stack **code** written (`hosting/`): one private S3 bucket
  (OAC, versioned, RETAIN), one CloudFront distribution (URI-rewrite
  function for path prefixes, 403->404), optional account-wide $10
  budget. Landing page + 404 in `hosting/site-root/`.
- Tier 2 template copied to `reference/` from story-app.

## 2026-09-02 -- hosting stack deployed

`WebappsHostingStack` CREATE_COMPLETE in `<AWS_ACCOUNT_ID>` / `us-east-1`.
Landing page live at https://<DISTRIBUTION_DOMAIN>/

- BucketName: `<APPS_BUCKET>`
- DistributionId: `<DISTRIBUTION_ID>`
- DistributionDomain: `<DISTRIBUTION_DOMAIN>`

Also mirrored (gitignored) in `hosting/.hosting-outputs.env`, which
`scripts/deploy-app.ps1` reads.

## 2026-09-02 -- first app: until

- `apps/until/` built by the `builder` subagent from a full spec: a
  calm single-page countdown. Three canvas visualizations (lights /
  orbit / horizon), live updates, past-event reversal, "keep this
  open" ambient mode, `localStorage` persistence. Tier 1, no network.
- Orchestrator review + fixes: mobile viewport overflow in `.setup`
  (grid track), added a data-URI favicon (no `/favicon.ico` 403 on
  CloudFront), hardened the ambient control-hide with `visibility`.
  Verified in-browser: opening screen (desktop + mobile), all three
  modes, past event, ambient.
- Landing page (`hosting/site-root/index.html`) updated to list it.
- **Not yet deployed.** Run `.\scripts\deploy-app.ps1 -Name until`,
  and re-sync `site-root/` for the updated index.

## Not done yet

- **Credential envelope -- confirm.** DEPLOY.md step 0 (rename
  `[default]` -> `[story-deploy]`) needs to be verified done: open a
  fresh PowerShell with `AWS_PROFILE` unset and check
  `aws sts get-caller-identity` fails. That's the environment
  `Bash`-capable subagents run in.
- **Budget alarm** only exists if `-c alert_email=...` was passed to
  the deploy.

## Verified live 2026-09-02

- `/` serves the "small things" landing page.
- `/does-not-exist/` serves `404.html` (URI-rewrite function + 403->404
  error mapping both working).

## Known machine gotchas (from docs/SYSTEM_PLAN_NOTES.md §6)

- `aws` not on PATH -> `C:\Program Files\Amazon\AWSCLIV2\aws.exe`.
- Run `aws`/`cdk` from PowerShell, not Git Bash.
- CDK needs the venv python first on PATH; system Python 3.10 lacks
  `aws-cdk-lib`.
- `JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1` (Node 26).
- Account <AWS_ACCOUNT_ID> / us-east-1 already CDK-bootstrapped.
