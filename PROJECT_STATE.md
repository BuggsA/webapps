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

## Not done yet

- **Credential envelope not closed.** `~/.aws/credentials` still has a
  `[default]` profile. Do DEPLOY.md step 0 before running any subagent
  that has `Bash`.
- **Hosting stack not deployed.** No `cdk deploy` has run. No bucket,
  no distribution, no budget exist yet.
- **No app built.** `apps/` has only `_shared/`. The house style
  (`apps/_shared/style.css` + `preview.html`) *is* now in place, done
  solo by the orchestrator so parallel builders won't race to create it.

## Fill in after deploying the hosting stack

- BucketName: _______
- DistributionId: _______
- DistributionDomain: _______

## Known machine gotchas (from docs/SYSTEM_PLAN_NOTES.md §6)

- `aws` not on PATH -> `C:\Program Files\Amazon\AWSCLIV2\aws.exe`.
- Run `aws`/`cdk` from PowerShell, not Git Bash.
- CDK needs the venv python first on PATH; system Python 3.10 lacks
  `aws-cdk-lib`.
- `JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1` (Node 26).
- Account <AWS_ACCOUNT_ID> / us-east-1 already CDK-bootstrapped.
