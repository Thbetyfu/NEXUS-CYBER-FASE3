param(
    [int]$WaitSeconds = 90
)

$ErrorActionPreference = "Continue"
Set-Location -LiteralPath $PSScriptRoot
. (Join-Path $PSScriptRoot "..\ps\NetworkProbe.ps1")

Write-Host "============================================================" -ForegroundColor Red
Write-Host "  RED TEAM  |  Nexus Cyber  |  join hotspot blue team" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red

$expected = Get-NexusExpectedSsid
$ssid = Get-CurrentWifiSsid

Write-Host ""
Write-Host "[1/3] Wi-Fi saat ini: $(if ($ssid) { $ssid } else { '(belum tersambung / bukan Wi-Fi)' })" -ForegroundColor Yellow
if ($ssid -ne $expected) {
    Write-Host "     Sambungkan ke SSID: $expected  (password ada di kartu blue team)" -ForegroundColor Yellow
    Write-Host "     Membuka pengaturan Wi-Fi. Skrip ini akan menunggu sampai WAF ketemu." -ForegroundColor Yellow
    Start-Process "ms-settings:network-wifi"
}

Write-Host ""
Write-Host "[2/3] Mencari pintu WAF di jaringan hotspot (gateway :80 / :8080)..." -ForegroundColor Cyan

$found = $null
$deadline = [datetime]::UtcNow.AddSeconds($WaitSeconds)
while ([datetime]::UtcNow -lt $deadline) {
    $ssid = Get-CurrentWifiSsid
    $found = Find-NexusWafTarget
    if ($found) { break }
    Start-Sleep -Seconds 3
}

if (-not $found) {
    Write-Host "[GAGAL] WAF tidak ketemu." -ForegroundColor Red
    Write-Host "  - Pastikan sudah join Wi-Fi $expected (bukan hotspot HP sendiri)."
    Write-Host "  - Blue team harus sudah menjalankan START.bat dan hotspot menyala."
    Write-Host "  - Beberapa HP memblokir perangkat-ke-perangkat; hotspot harus dari laptop blue team."
    Write-Host "  Cadangan: ketik URL di kartu blue team, contoh http://192.168.137.1"
    exit 1
}

$targetPath = Join-Path $PSScriptRoot "target.txt"
Save-NexusRedTarget -Path $targetPath -Url $found.Url

Write-Host "[OK] Pintu Nexus: $($found.Url)" -ForegroundColor Green
Write-Host "     Disimpan ke target.txt" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] Membuka browser ke WAF (bukan Vercel)..." -ForegroundColor Cyan
Start-Process $found.Url

Write-Host ""
Write-Host "Sesi lab: kamu sekarang di depan Nexus, bukan di situs Vercel publik." -ForegroundColor Green
Write-Host "Cek postur (situs hidup, SOC tertutup): double-click CHECK.bat" -ForegroundColor Green
Write-Host "Daftar uji browser: CHECKLIST.md" -ForegroundColor Green
Write-Host "Uji posture NEX-RED (opsional): double-click SCAN.bat" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Red
