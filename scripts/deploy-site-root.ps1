#Requires -Version 5.1
<#
  Push the bare-domain landing page + 404 (hosting/site-root/) to the
  bucket root. You run this from PowerShell with the deploy profile set.

  Uses `--delete --exclude "*/*"` so stale ROOT-level files are cleaned
  up but app folders (until/, ...) are never touched. Do NOT run a plain
  `aws s3 sync site-root/ s3://<bucket>/ --delete` by hand -- the exclude
  is what stops it wiping every app.

  Usage:
    $env:AWS_PROFILE = 'story-deploy'
    .\scripts\deploy-site-root.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$aws  = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe'
$repo = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $repo 'hosting\.hosting-outputs.env'

if (-not $env:AWS_PROFILE) { throw "Set `$env:AWS_PROFILE = 'story-deploy' first." }
if (-not (Test-Path $envFile)) { throw "$envFile missing -- run scripts\deploy-hosting.ps1 first." }

$v = @{}
Get-Content $envFile | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { $v[$Matches[1]] = $Matches[2].Trim() } }
foreach ($k in 'BUCKET','DIST_ID','DIST_DOMAIN') { if (-not $v[$k]) { throw "$k not in $envFile" } }

& $aws s3 sync (Join-Path $repo 'hosting\site-root') "s3://$($v.BUCKET)/" --delete --exclude "*/*"
if ($LASTEXITCODE -ne 0) { throw "site-root sync failed." }
& $aws cloudfront create-invalidation --distribution-id $v.DIST_ID --paths "/index.html" "/404.html" "/" | Out-Null

Write-Host "Landing page updated: https://$($v.DIST_DOMAIN)/"
