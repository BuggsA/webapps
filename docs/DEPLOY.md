# Deploy runbook

Every step here is run **by a human, on purpose, from PowerShell** (not
Git Bash -- MSYS rewrites `aws` path args). Nothing in this repo deploys
itself. The `deployer` subagent prepares commands; it does not run them.

`aws` is not on PATH on this machine. Full path:
`C:\Program Files\Amazon\AWSCLIV2\aws.exe` -- shown below as `aws` for
brevity; use the call operator `& "C:\Program Files\..."` in practice.

---

## 0. One-time: close the credential envelope (notes §2)

The safety model is "builder/researcher have no AWS creds; only the
deployer session does." That only holds if there is **no `[default]`
profile** sitting on disk for `aws`/`cdk` to pick up automatically.

1. Edit `C:\Users\you\.aws\credentials`: rename the `[default]`
   section header to `[story-deploy]`. Leave no `[default]`.
2. Do the same in `C:\Users\you\.aws\config` if it has a `[default]`.
3. In the **deployer terminal only**, before any `aws`/`cdk` command:
   ```powershell
   $env:AWS_PROFILE = "story-deploy"
   ```
4. Verify the wall: open a *fresh* PowerShell with `AWS_PROFILE` unset
   and run `aws sts get-caller-identity` -> it should fail. That's the
   environment builder/researcher subagents run in.

Account is `<AWS_ACCOUNT_ID>`, region `us-east-1`.

---

## 1. One-time: deploy the hosting stack

`scripts\deploy-hosting.ps1` does the whole thing -- venv, `cdk deploy`,
capture outputs to `hosting\.hosting-outputs.env`, sync the landing page,
invalidate. You run it:

```powershell
cd C:\Users\you\Downloads\scratch-repo\webapps
$env:AWS_PROFILE = "story-deploy"
.\scripts\deploy-hosting.ps1 -AlertEmail <your-email>
```

CDK will prompt once to approve the IAM / OAC / CloudFront-function
changes -- read it, type `y`. Account `<AWS_ACCOUNT_ID>` / `us-east-1` is
already CDK-bootstrapped; do **not** bootstrap.

When it finishes, paste the three printed values (`BUCKET`, `DIST_ID`,
`DIST_DOMAIN`) into `PROJECT_STATE.md`.

If you'd rather run it by hand, the equivalent steps are: make a venv in
`hosting\`, `pip install -r requirements.txt`, prepend `.venv\Scripts` to
`PATH`, set `JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1`, then
`cdk deploy WebappsHostingStack -c alert_email=<email>`, then the
landing-page sync below.

### Updating just the landing page later

```powershell
.\scripts\deploy-site-root.ps1
```

> **Never** run `aws s3 sync hosting\site-root\ s3://<bucket>/ --delete`
> by hand. `site-root/` holds only the root `index.html` + `404.html`,
> so `--delete` at the bucket root deletes **every app folder**. The
> script uses `--delete --exclude "*/*"`, which confines deletion to
> root-level files. If you must do it manually, include that exclude.

---

## 2. Per app: ship or update

After a `builder` finishes an app and the `deployer` has reviewed it:

```powershell
cd C:\Users\you\Downloads\scratch-repo\webapps
$env:AWS_PROFILE = "story-deploy"
.\scripts\deploy-app.ps1 -Name <name>
```

It reads `hosting\.hosting-outputs.env`, syncs `apps\<name>\` to
`s3://<bucket>/<name>/ --delete`, invalidates `/<name>/*`, and prints
`https://<DistributionDomain>/<name>/`.

## Remove an app

```powershell
aws s3 rm s3://<BucketName>/<name>/ --recursive
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/<name>/*"
```

Then delete `apps/<name>/` from the repo.

---

## What a human must never delegate

- Running `cdk deploy` / `cdk destroy`
- Running `aws s3 sync` / `aws s3 rm` / `create-invalidation`
- Renaming AWS profiles / editing `~/.aws/*`

The harness also blocks `cdk deploy` from an agent session, which is a
backstop, not the plan. The plan is: you type these.
