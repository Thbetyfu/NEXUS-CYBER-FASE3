# Membuat deploy-local/.env dari template PC server dengan secret acak.
param(
    [switch]$Force,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $PSScriptRoot
$Template = Join-Path $DeployDir ".env.pc-server.template"
$EnvFile = Join-Path $DeployDir ".env"

if (-not (Test-Path $Template)) {
    Write-Host "[ERROR] Template tidak ditemukan: $Template" -ForegroundColor Red
    exit 1
}

if ((Test-Path $EnvFile) -and -not $Force) {
    Write-Host ""
    Write-Host "File .env sudah ada: $EnvFile" -ForegroundColor Yellow
    $ans = Read-Host "Timpa dengan template PC server + secret baru? (y/N)"
    if ($ans -notmatch '^[yY]') {
        Write-Host "[Batal] .env tidak diubah." -ForegroundColor Cyan
        exit 0
    }
    $backup = "$EnvFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -LiteralPath $EnvFile -Destination $backup
    Write-Host "[OK] Backup: $backup" -ForegroundColor Green
}

function New-Secret([int]$Length = 32) {
    $chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    -join (1..$Length | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

$pgPass = New-Secret -Length 24
$session = New-Secret -Length 40
$reward = New-Secret -Length 20
$admin = New-Secret -Length 36

$content = Get-Content -LiteralPath $Template -Raw -Encoding UTF8
$content = $content -replace '__GANTI_POSTGRES_PASSWORD__', $pgPass
$content = $content -replace '__GANTI_SESSION_SECRET__', $session
$content = $content -replace '__GANTI_REWARD_PASSWORD__', $reward
$content = $content -replace '__GANTI_ADMIN_TOKEN__', $admin

[System.IO.File]::WriteAllText($EnvFile, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  .env PC SERVER dibuat" -ForegroundColor Green
Write-Host "  $EnvFile" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Secret sudah di-generate otomatis (simpan NEXUS_ADMIN_TOKEN untuk SOC):" -ForegroundColor Cyan
Write-Host "  NEXUS_ADMIN_TOKEN = $admin" -ForegroundColor White
Write-Host ""
Write-Host "Opsional: isi TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID di .env" -ForegroundColor DarkYellow
Write-Host "Langkah berikut: deploy-local\jury\PREP-PC-SERVER.bat lalu START-FOR-JURY.bat" -ForegroundColor Cyan
Write-Host ""

if (-not $Quiet) {
    $open = Read-Host "Buka .env di Notepad sekarang? (Y/n)"
    if ($open -eq '' -or $open -match '^[yY]') {
        Start-Process notepad.exe -ArgumentList $EnvFile
    }
}

exit 0
