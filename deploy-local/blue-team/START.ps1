param(
    [switch]$Offline
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
. (Join-Path $PSScriptRoot "..\ps\Hotspot.ps1")

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  BLUE TEAM  |  Nexus Cyber  |  hotspot + WAF" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not (Test-NexusAdmin)) {
    Write-Host "[PERINGATAN] Tidak jalan sebagai Administrator." -ForegroundColor Yellow
    Write-Host "            START.bat akan minta izin admin agar hotspot & firewall bisa otomatis." -ForegroundColor Yellow
}

$rootEnv = Join-Path $PSScriptRoot "..\.env"
$rootExample = Join-Path $PSScriptRoot "..\.env.example"
if (-not (Test-Path $rootEnv) -and (Test-Path $rootExample)) {
    Copy-Item -LiteralPath $rootExample -Destination $rootEnv
}

Write-Host ""
Write-Host "[1/4] Menyalakan Mobile Hotspot Windows..." -ForegroundColor Cyan
$null = Start-NexusMobileHotspot
Enable-NexusWafFirewall

$hotspotIp = Wait-NexusHotspotIPv4 -Seconds 15
if ($hotspotIp) {
    Write-Host "[OK] IP hotspot laptop ini: $hotspotIp" -ForegroundColor Green
} else {
    Write-Host "[PERINGATAN] IP hotspot belum terlihat. Cek Settings > Mobile hotspot, lalu lihat ipconfig." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/4] Menyalakan WAF (Docker)..." -ForegroundColor Cyan
$parentStart = Join-Path $PSScriptRoot "..\START.ps1"
if ($Offline) {
    & $parentStart -Offline
} else {
    & $parentStart
}
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[3/4] Menulis kartu untuk red team..." -ForegroundColor Cyan
$cardPath = Join-Path $PSScriptRoot "KARTU-BLUE-TEAM.txt"
$card = Write-NexusBlueCard -OutputPath $cardPath -HotspotIp $hotspotIp
Write-Host $card -ForegroundColor White
Write-Host "[OK] Disimpan: $cardPath" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Skenario" -ForegroundColor Cyan
Write-Host "  1. Biarkan jendela ini / hotspot tetap nyala."
Write-Host "  2. Red team join Wi-Fi SSID di kartu."
Write-Host "  3. Red team double-click  deploy-local\red-team\JOIN.bat"
Write-Host "============================================================" -ForegroundColor Cyan
