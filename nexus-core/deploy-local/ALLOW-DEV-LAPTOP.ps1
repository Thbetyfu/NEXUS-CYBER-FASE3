# One-time laptop setup for Nexus Cyber local development.
# Stops repeated Firewall / Defender prompts. Does NOT disable UAC or real-time protection.

$ErrorActionPreference = "Stop"

function Test-NexusAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-NexusAdmin)) {
    Write-Host "Meminta Administrator sekali untuk menulis aturan firewall & pengecualian Defender..." -ForegroundColor Yellow
    $self = $MyInvocation.MyCommand.Path
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$self`"" -Verb RunAs
    exit 0
}

$deployLocal = $PSScriptRoot
$repo = (Resolve-Path (Join-Path $deployLocal "..")).Path

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Nexus Cyber  |  allow sekali di laptop pengembangan" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Repo: $repo"
Write-Host ""

$rulePrefix = "NexusCyber-deploy-local-WAF"
foreach ($port in @(80, 8080, 9090)) {
    netsh advfirewall firewall delete rule name="$rulePrefix-$port" 1>$null 2>$null
    netsh advfirewall firewall add rule name="$rulePrefix-$port" dir=in action=allow protocol=TCP localport=$port profile=any | Out-Null
    Write-Host "[OK] Firewall inbound TCP $port (lab WAF/honeypot)" -ForegroundColor Green
}

Write-Host "[i] Port SOC 8081 dan dasbor 3001 sengaja tidak dibuka ke jaringan." -ForegroundColor DarkGray

try {
    $existing = @(Get-MpPreference | Select-Object -ExpandProperty ExclusionPath)
    if ($existing -notcontains $repo) {
        Add-MpPreference -ExclusionPath $repo
        Write-Host "[OK] Windows Defender: pengecualian folder repo" -ForegroundColor Green
    } else {
        Write-Host "[OK] Pengecualian Defender sudah ada" -ForegroundColor Green
    }
} catch {
    Write-Host "[PERINGATAN] Defender exclusion gagal: $($_.Exception.Message)" -ForegroundColor Yellow
}

foreach ($proc in @("go.exe", "node.exe", "docker.exe", "com.docker.backend.exe")) {
    try {
        Add-MpPreference -ExclusionProcess $proc -ErrorAction Stop
    } catch {
        # Duplicate exclusion is fine.
    }
}
Write-Host "[OK] Defender: proses go/node/docker tidak di-scan berulang (dev)" -ForegroundColor Green

Get-ChildItem -LiteralPath $repo -Recurse -Include *.ps1, *.bat, *.cmd -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\|\\shannon\\|\\strix\\" } |
    ForEach-Object {
        try { Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue } catch { }
    }
Write-Host "[OK] Zone.Identifier (SmartScreen unduhan) dilepas dari skrip lab" -ForegroundColor Green

try {
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
    Write-Host "[OK] ExecutionPolicy CurrentUser = RemoteSigned" -ForegroundColor Green
} catch {
    Write-Host "[i] ExecutionPolicy tidak diubah ($($_.Exception.Message))" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Yang TIDAK bisa dihilangkan Windows:" -ForegroundColor Yellow
Write-Host "  Tombol UAC (yes/no Administrator) saat START.bat hotspot — kebijakan Microsoft."
Write-Host "  Solusi vibe coding: jalankan START.bat sekali, biarkan Docker + hotspot nyala;"
Write-Host "  ubah kode tanpa menekan START berulang."
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Selesai. Jendela boleh ditutup." -ForegroundColor Green
Start-Sleep -Seconds 2
