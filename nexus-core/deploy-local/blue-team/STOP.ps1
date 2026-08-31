$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
. (Join-Path $PSScriptRoot "..\ps\Hotspot.ps1")

Write-Host "BLUE TEAM | mematikan WAF + hotspot..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "..\STOP.ps1")
Stop-NexusMobileHotspot
Write-Host "[OK] Blue team lab dimatikan." -ForegroundColor Green
