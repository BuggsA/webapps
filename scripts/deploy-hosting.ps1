#Requires -Version 5.1
<#
  One-time (and stack-update) deploy of the shared hosting stack.

  You run this, from PowerShell, with the deploy profile loaded. Nothing
  in the repo calls it automatically. It:
    - checks a deploy profile is set (envelope, DEPLOY.md step 0)
    - builds/refreshes the CDK venv
    - cdk deploy WebappsHostingStack
    - writes the stack outputs to hosting/.hosting-outputs.env
    - syncs hosting/site-root/ to the bucket root + invalidates

  Usage:
    $env:AWS_PROFILE = 'story-deploy'
    .\scripts\deploy-hosting.ps1 -AlertEmail you@example.com
#>
[CmdletBinding()]
param(
  [string]$AlertEmail,
  [string]$AwsProfile = $env:AWS_PROFILE
)

$ErrorActionPreference = 'Stop'
$aws  = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe'
$repo = Split-Path $PSScriptRoot -Parent
$hosting = Join-Path $repo 'hosting'

if (-not (Test-Path $aws)) { throw "aws CLI not found at $aws" }
if (-not $AwsProfile) {
  throw "AWS_PROFILE is not set. Do DEPLOY.md step 0 (rename [default] -> [story-deploy]), then: `$env:AWS_PROFILE = 'story-deploy'"
}
$env:AWS_PROFILE = $AwsProfile
Write-Host "AWS profile: $AwsProfile"
& $aws sts get-caller-identity --output text
if ($LASTEXITCODE -ne 0) { throw "Could not authenticate with profile '$AwsProfile'." }

$env:JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION = '1'

Push-Location $hosting
try {
  if (-not (Test-Path '.venv')) { py -3 -m venv .venv }
  $venvScripts = Join-Path $hosting '.venv\Scripts'
  $env:PATH = "$venvScripts;$env:PATH"        # venv python must win (notes 6)
  & (Join-Path $venvScripts 'pip.exe') install -q -r requirements.txt
  if ($LASTEXITCODE -ne 0) { throw "pip install failed." }

  $ctx = @()
  if ($AlertEmail) { $ctx = @('-c', "alert_email=$AlertEmail") }
  else { Write-Warning "No -AlertEmail given; the account-wide budget alarm will be skipped." }

  $outFile = Join-Path $hosting 'cdk-outputs.json'
  cdk deploy WebappsHostingStack @ctx --outputs-file $outFile
  if ($LASTEXITCODE -ne 0) { throw "cdk deploy failed ($LASTEXITCODE)." }

  $o = (Get-Content $outFile -Raw | ConvertFrom-Json).WebappsHostingStack
  $envFile = Join-Path $hosting '.hosting-outputs.env'
  @(
    "BUCKET=$($o.BucketName)",
    "DIST_ID=$($o.DistributionId)",
    "DIST_DOMAIN=$($o.DistributionDomain)"
  ) | Set-Content -Encoding utf8 $envFile
  Write-Host "`nWrote ${envFile}:"
  Get-Content $envFile | Write-Host

  # NOTE: --exclude "*/*" is load-bearing. Without it, `--delete` against the
  # bucket root deletes every app folder (they aren't in site-root/). The
  # exclude confines --delete to root-level files only.
  & $aws s3 sync (Join-Path $hosting 'site-root') "s3://$($o.BucketName)/" --delete --exclude "*/*"
  if ($LASTEXITCODE -ne 0) { throw "site-root sync failed." }
  & $aws cloudfront create-invalidation --distribution-id $o.DistributionId --paths '/*' | Out-Null

  Write-Host "`nHosting live: https://$($o.DistributionDomain)/"
  Write-Host "Now paste the three values above into PROJECT_STATE.md."
}
finally { Pop-Location }
