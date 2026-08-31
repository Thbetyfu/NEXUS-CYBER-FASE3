# Install .githooks/pre-push into this clone (no git config required).
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$src = Join-Path $Root ".githooks\pre-push"
$dstDir = Join-Path $Root ".git\hooks"
$dst = Join-Path $dstDir "pre-push"
if (-not (Test-Path $src)) { throw "Missing $src" }
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Force
Write-Host "[OK] Hook pre-push terpasang: $dst" -ForegroundColor Green
Write-Host "     git push akan ditolak jika tes NEX-RED / Go gagal."
