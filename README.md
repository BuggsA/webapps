# webapps

A bounded, parallel system for shipping small, polished web apps over a
long stretch of time -- without re-architecting each time and without
runaway cost. Full rationale in [`docs/SYSTEM_PLAN.md`](docs/SYSTEM_PLAN.md);
machine-specific gotchas in [`docs/SYSTEM_PLAN_NOTES.md`](docs/SYSTEM_PLAN_NOTES.md).

## Layout

```
apps/<name>/        one small app each; its own index.html, its own README
apps/_shared/       style.css -- the house style, created by the first builder
hosting/            shared S3 + CloudFront stack (CDK). Deployed once.
reference/          torn-down story-app code, kept as the Tier 2 template
docs/               the plan, the notes, the deploy runbook
.claude/agents/     builder / researcher / deployer subagent definitions
```

## The two tiers

- **Tier 1 (default)** -- pure static. HTML/CSS/JS, no backend.
- **Tier 2** -- static plus one small Lambda + Function URL, only when an
  app genuinely can't work client-side. No database, no shared state.
  Skeleton in `reference/`.

## The roles (`.claude/agents/`)

| Role | Tools | Does |
|---|---|---|
| **builder** | Read, Write, Edit, Bash, Grep, Glob | Builds one app in its own git worktree, inside `apps/<name>/` only. Parallel-safe. No AWS access. |
| **researcher** | WebSearch, WebFetch | Looks up APIs / libraries / design prior art. No file access, decides nothing. |
| **deployer** | Read, Bash, Grep, Glob | Static-checks a finished app, prepares the exact deploy commands, stops. Run only from the credentialed terminal. |

## The envelope

Builder and researcher run from a shell with **no AWS credentials**, so
`aws`/`cdk` simply fail to authenticate there -- the boundary is
environmental, not a promise in a prompt. Only the deployer's terminal
loads real credentials, and **a human runs every deploy command by
hand**, every time. Setup for this is step 0 of
[`docs/DEPLOY.md`](docs/DEPLOY.md).

## Adding an app

1. `researcher` (if any lookups are needed) -> findings.
2. `builder` -> `apps/<name>/` in a worktree, + `apps/<name>/README.md`.
3. `deployer` -> review + deploy commands.
4. A human runs the `s3 sync` + CloudFront invalidation from PowerShell.

## Status

Bootstrapped 2026-09-02: repo scaffold, three subagent definitions, and
the hosting stack **code**. Nothing deployed yet -- the hosting stack has
not been `cdk deploy`ed and no app has been built. See `PROJECT_STATE.md`.
