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

```powershell
cd C:\Users\you\Downloads\scratch-repo\webapps\hosting
py -3 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:PATH = "$PWD\.venv\Scripts;" + $env:PATH
$env:JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION = "1"
$env:AWS_PROFILE = "story-deploy"

# CDKToolkit on <AWS_ACCOUNT_ID>/us-east-1 is already CREATE_COMPLETE -- do NOT bootstrap
cdk deploy -c alert_email=<your-email>
```

Record the three outputs (`BucketName`, `DistributionId`,
`DistributionDomain`) in `PROJECT_STATE.md` -- the deployer needs them.

Then push the bare-domain landing page:

```powershell
aws s3 sync ..\hosting\site-root\ s3://<BucketName>/ --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

---

## 2. Per app: ship or update

After a `builder` finishes an app and the `deployer` has reviewed it:

```powershell
$env:AWS_PROFILE = "story-deploy"
aws s3 sync C:\Users\you\Downloads\scratch-repo\webapps\apps\<name>\ s3://<BucketName>/<name>/ --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/<name>/*"
```

Live at `https://<DistributionDomain>/<name>/`.

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
