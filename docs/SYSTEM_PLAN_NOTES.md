# Notes for the next conversation — read alongside SYSTEM_PLAN.md

Context: these come from actually building (and then tearing down) the
story-app on this same machine. The plan is good. These are corrections,
holes, and machine-specific gotchas to handle before trusting it.

---

## 1. The agent files are double-nested and in the wrong place
They're at `Downloads/claude-agents/claude-agents/{builder,researcher,deployer}.md`.
They need to live at **`.claude/agents/*.md` inside the project repo**
(not `claude-agents/`, not nested). Move them there as part of repo setup.
(Same double-nesting bug hit the old CDK project — worth a glance at any
zip that unpacked.)

## 2. The credential envelope has a real hole — fix it environmentally
The plan's safety model is "builder/researcher have no AWS creds; only
deployer does." As written it does **not** hold:

- Subagents run inside the same Claude Code process on the same machine.
  A subagent with the `Bash` tool runs subprocesses with the same `$HOME`
  and filesystem as everything else.
- This machine has real credentials in `~/.aws/credentials` under
  `[default]` (IAM user `<iam-user>`, AdministratorAccess). `aws` and `cdk`
  read that file directly — no env var needed. So a `builder` (which has
  `Bash`) could run `aws s3 sync` or `cdk deploy` and it would
  authenticate. The tool list restricts *capabilities* (a researcher with
  only WebSearch genuinely can't write a file); it does nothing about a
  creds file sitting on disk.
- `builder.md` currently asserts "You will not have AWS credentials
  available in this environment." On this machine that sentence is
  **false**. A prompt that states a false fact about its sandbox is worse
  than one that's honest.

**Fix before running anything:** get credentials out of the always-on-disk
`[default]` profile.
- Rename it to a named profile, e.g. `[story-deploy]` in
  `~/.aws/credentials`, and leave no `[default]`.
- The deployer — and only the deployer's terminal — sets
  `AWS_PROFILE=story-deploy` (or exports `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY` directly).
- Builder/researcher sessions run with neither set → `aws`/`cdk` fail to
  authenticate, which is the actual wall the plan wants.
- Then `builder.md`'s "no credentials" line becomes true and can stay.

Until that's done, treat the boundary as procedural (a hope), exactly as
the plan's own reference doc warns.

## 3. Verify the subagent frontmatter against current Claude Code
`builder.md` uses `isolation: worktree`, `tools: Read, Write, ...`,
`model: sonnet`. `isolation`/`worktree` is a real feature, but confirm it
is honored **from `.md` frontmatter** (vs only as a parameter when the
orchestrator spawns the agent), and confirm the `tools:` value format
(comma string vs YAML list). Use the `claude-code-guide` agent or current
docs — don't assume. A malformed frontmatter key is silently ignored.

## 4. Subagents don't spawn subagents
The plan reads as if `builder` calls `researcher` directly ("reports back
into the builder's task"). In practice the **main conversation**
orchestrates: it runs `researcher`, then hands the findings to `builder`
in its task prompt. Plan the workflow around the top-level conversation
being the coordinator.

## 5. `deployer` can't do the check it's told to do
`deployer.md` step 1 is "actually run it locally (open the HTML file) and
confirm it works with no console errors." Its tools are
`Read, Bash, Grep, Glob` — no browser. It cannot open a page or see a
console. Either:
- give `deployer` the browser/preview tools (there's an in-editor browser
  pane with console + network read), or
- narrow the check to: JS parses, a local `python -m http.server` returns
  200, links resolve, no obvious secrets in client code.

## 6. Machine-specific gotchas (all hit during the story-app build)
- **AWS CLI is not on PATH.** It's at
  `C:\Program Files\Amazon\AWSCLIV2\aws.exe`. Call it by full path.
- **Run `aws` from PowerShell, not Git Bash.** Git Bash (MSYS) rewrites
  path-looking args, so `aws ssm get-parameter --name /foo/bar` fails with
  ParameterNotFound. PowerShell is clean. (`MSYS_NO_PATHCONV=1` also works
  if you must use bash.)
- **CDK on Windows:** `cdk.json`'s `"app": "python app.py"` picks up
  whatever `python` is first on PATH. System Python (3.10, `C:\Program
  Files\Python310`) does **not** have `aws-cdk-lib`. Make a venv, install
  `aws-cdk-lib`, and put `.venv/Scripts` first on PATH before any `cdk`
  command, or the synth dies with ModuleNotFoundError. Do **not** put a
  forward-slash venv path in `cdk.json` — cmd.exe can't run it.
- **Node is v26** → CDK prints a big jsii "untested Node version" banner.
  Set `JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1`.
- **CDK is already bootstrapped** on account `<AWS_ACCOUNT_ID>` / `us-east-1`
  (`CDKToolkit` = CREATE_COMPLETE). Don't re-bootstrap.
- **`cdk deploy` is blocked by the harness auto-mode classifier** even
  when the user asks in-session. This is fine — it matches the plan's
  "human runs the deploy" rule — but it means the deployer/orchestrator
  genuinely cannot deploy; it can only hand over the command.

## 7. Repo / worktree setup order matters
- `isolation: worktree` needs a git repo **with at least one commit**.
  First action of the whole project: create the repo, add a `.gitignore`,
  commit. Then add the agent files. Then spawn any builder.
- **Run the first build solo, never in parallel.** The first `builder` to
  run creates `apps/_shared/style.css`; two builders racing to create it
  is a conflict even in separate worktrees (merge collision on the shared
  file). Parallel is safe only once that file exists and is committed.

## 8. Tier 2 reference code
The plan says Tier 2 "reuses the Lambda + Function URL pattern already
proven today." That stack is torn down, but the code is still in the repo
at `C:\Users\you\Downloads\scratch-repo\story-app\`:
- `lambda/orchestrator/handler.py` — Lambda + Function URL handler shape
  (auth header check, JSON responses, SSM secret fetch). It's more
  elaborate than a Tier 2 app needs — ignore the DynamoDB and
  agent-invoke parts; keep the request/response skeleton.
- `infra/story_stack.py` — CDK for a Function URL Lambda with least-priv
  IAM and a budget alarm. Good template for the "one small function"
  case.
- Both are Python 3.12 Lambda, `Code.from_asset`, CORS on the Function
  URL. That part worked fine end to end.

## 9. Carry-overs from the old PROJECT_STATE
- The deploy IAM user has **AdministratorAccess**. Fine to start; tighten
  to least-privilege (S3 + CloudFront + CloudFormation + Lambda + IAM
  pass-role for the exec roles) once the hosting stack's shape is stable.
- There's a `$10/month` AWS Budget habit from the old project — worth
  recreating one account-wide budget in the hosting stack so a runaway
  Tier 2 app still trips an alert.
- An account-level X-Ray "Transaction Search" trace config was left
  enabled by the old AgentCore deploy. Harmless and $0, but if you ever
  audit CloudWatch settings and wonder why it's on — that's why.

## 10. Hosting stack — decisions the plan leaves open
- **One** CloudFront distribution + **one** S3 bucket, apps served at
  path prefixes (`/<name>/`). Simpler than per-app subdomains (no DNS,
  no per-app cert). Decide the default root object per prefix (each app
  ships its own `index.html`).
- Each app deploy = `aws s3 sync apps/<name>/ s3://<bucket>/<name>/` +
  a CloudFront invalidation scoped to `/<name>/*`. The deployer should
  emit **both** commands.
- Put the bucket in `us-east-1`; keep it private, served only via the
  CloudFront OAC. No public bucket policy.
