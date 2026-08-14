$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
. (Join-Path $PSScriptRoot "..\ps\NetworkProbe.ps1")

Write-Host "============================================================" -ForegroundColor Red
Write-Host "  RED TEAM  |  NEX-RED posture scan (tanpa payload exploit)" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red

$targetPath = Join-Path $PSScriptRoot "target.txt"
$url = Read-NexusRedTarget -Path $targetPath
if (-not $url) {
    Write-Host "[i] target.txt belum ada. Menjalankan JOIN dulu..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "JOIN.ps1")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $url = Read-NexusRedTarget -Path $targetPath
}
if (-not $url) {
    Write-Host "[GAGAL] Tidak ada URL target." -ForegroundColor Red
    exit 1
}

if ($url -match "vercel\.app") {
    Write-Host "[GAGAL] Target ini URL Vercel. Scan harus ke IP hotspot blue team (hasil JOIN.bat)." -ForegroundColor Red
    exit 1
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "[GAGAL] Python tidak ada di PATH. JOIN.bat sudah cukup untuk membuka situs lewat WAF." -ForegroundColor Red
    Write-Host "        Install Python, atau buka saja URL: $url" -ForegroundColor Red
    exit 1
}

$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$nexred = Join-Path $repo "NEX-RED\nexred.py"
if (-not (Test-Path $nexred)) {
    Write-Host "[GAGAL] NEX-RED tidak ditemukan di $nexred" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Target: $url" -ForegroundColor Yellow
Write-Host "[*] Mode: blackbox posture (header, reachability, probe jinak). Bukan exploit kit." -ForegroundColor Yellow
Set-Location $repo
& python $nexred scan -u $url -m blackbox --no-llm
exit $LASTEXITCODE
