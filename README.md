# webapps

A bounded, parallel system for shipping small, polished web apps over a
long stretch of time -- without re-architecting each time and without
runaway cost. Full rationale in [`docs/SYSTEM_PLAN.md`](docs/SYSTEM_PLAN.md);
machine-specific gotchas in [`docs/SYSTEM_PLAN_NOTES.md`](docs/SYSTEM_PLAN_NOTES.md).

## Layout

```
apps/<name>/        one small app each; its own index.html, css, js, README
apps/_shared/       portable modules an app copies in (e.g. telemetry.js).
                    Each app still self-hosts its own CSS + fonts.
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

Brief the builder with
[`docs/building-a-new-app.md`](docs/building-a-new-app.md) (the house
rules, distilled from `apps/until/` and `apps/tonight/`) plus a one-page
brief for the specific app.

1. `researcher` (if any lookups are needed) -> findings.
2. `builder` -> `apps/<name>/` in a worktree, + `apps/<name>/README.md`.
   If look/feel matters: an art-direction pass + a locked
   `docs/<name>-art-direction.md` *before* code.
3. `deployer` -> review + deploy commands.
4. A human runs the `s3 sync` + CloudFront invalidation from PowerShell.

## Status

Bootstrapped 2026-09-02. Hosting stack deployed 2026-09-02
(`WebappsHostingStack`, `<DISTRIBUTION_DOMAIN>`). Two apps built:
`until` and `tonight` (both complete, neither deployed yet). Running
detail in [`PROJECT_STATE.md`](PROJECT_STATE.md).
