#Requires -Version 5.1
<#
  Ship or update one app. You run this, from PowerShell, after a builder
  has produced apps/<name>/ and the deployer has reviewed it.

  Reads hosting/.hosting-outputs.env (written by deploy-hosting.ps1).

  Usage:
    $env:AWS_PROFILE = 'story-deploy'
    .\scripts\deploy-app.ps1 -Name picker
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Name
)

$ErrorActionPreference = 'Stop'
$aws  = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe'
$repo = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $repo 'hosting\.hosting-outputs.env'
$appDir  = Join-Path $repo "apps\$Name"

if (-not $env:AWS_PROFILE) { throw "Set `$env:AWS_PROFILE = 'story-deploy' first." }
if (-not (Test-Path $envFile)) { throw "$envFile missing -- run scripts\deploy-hosting.ps1 first." }
if (-not (Test-Path (Join-Path $appDir 'index.html'))) { throw "apps\$Name\index.html not found." }

$v = @{}
Get-Content $envFile | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { $v[$Matches[1]] = $Matches[2].Trim() } }
foreach ($k in 'BUCKET','DIST_ID','DIST_DOMAIN') { if (-not $v[$k]) { throw "$k not in $envFile" } }

& $aws s3 sync $appDir "s3://$($v.BUCKET)/$Name/" --delete
if ($LASTEXITCODE -ne 0) { throw "s3 sync failed." }
& $aws cloudfront create-invalidation --distribution-id $v.DIST_ID --paths "/$Name/*" | Out-Null

Write-Host "Live: https://$($v.DIST_DOMAIN)/$Name/"
