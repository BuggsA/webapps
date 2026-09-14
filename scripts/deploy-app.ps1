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

# Pre-gzip large binary data files (phase 10, docs/tide-v2-plan.md, for
# Tide's tide-field.bin). CloudFront's automatic compression only covers
# text-ish content types, never octet-stream, so a multi-MB binary would
# otherwise ship uncompressed on every load. Gzip locally and upload with
# the real Content-Encoding header; fetch() decompresses it transparently
# on the wire, no app code involved. Generic across apps: only fires for
# whatever .bin files actually exist under apps\<name>\data\.
Get-ChildItem -Path (Join-Path $appDir 'data') -Filter '*.bin' -File -ErrorAction SilentlyContinue | ForEach-Object {
  $src = $_.FullName
  $gz = [System.IO.Path]::GetTempFileName()
  $inStream  = [System.IO.File]::OpenRead($src)
  $outStream = [System.IO.File]::Create($gz)
  $gzStream  = New-Object System.IO.Compression.GzipStream($outStream, [System.IO.Compression.CompressionLevel]::Optimal)
  $inStream.CopyTo($gzStream)
  $gzStream.Dispose(); $outStream.Dispose(); $inStream.Dispose()
  $before = $_.Length; $after = (Get-Item $gz).Length
  Write-Host "Gzipping $($_.Name): $([math]::Round($before/1kb)) KB -> $([math]::Round($after/1kb)) KB"
  & $aws s3 cp $gz "s3://$($v.BUCKET)/$Name/data/$($_.Name)" --content-type 'application/octet-stream' --content-encoding gzip
  if ($LASTEXITCODE -ne 0) { throw "$($_.Name) gzip upload failed." }
  Remove-Item $gz -Force
}

& $aws cloudfront create-invalidation --distribution-id $v.DIST_ID --paths "/$Name/*" | Out-Null

Write-Host "Live: https://$($v.DIST_DOMAIN)/$Name/"
