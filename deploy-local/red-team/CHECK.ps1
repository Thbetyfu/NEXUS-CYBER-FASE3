$ErrorActionPreference = "Continue"
Set-Location -LiteralPath $PSScriptRoot
. (Join-Path $PSScriptRoot "..\ps\NetworkProbe.ps1")

Write-Host "============================================================" -ForegroundColor Red
Write-Host "  RED TEAM  |  cek postur lab (bukan exploit)" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red

$targetPath = Join-Path $PSScriptRoot "target.txt"
$url = Read-NexusRedTarget -Path $targetPath
if (-not $url) {
    Write-Host "[i] target.txt belum ada. Jalankan JOIN.bat dulu." -ForegroundColor Yellow
    exit 1
}
if ($url -match "vercel\.app") {
    Write-Host "[GAGAL] Target Vercel. WAF hanya terbukti lewat IP hotspot." -ForegroundColor Red
    exit 1
}

$uri = [Uri]$url
$hostName = $uri.Host
$fail = 0

function Test-TcpClosed([string]$TargetHost, [int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($TargetHost, $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(1500, $false)
        if (-not $ok) { return $true }
        $client.EndConnect($iar)
        return $false
    } catch {
        return $true
    } finally {
        $client.Close()
    }
}

Write-Host ""
Write-Host "[1] Beranda WAF  $url" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20 -MaximumRedirection 3
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
        Write-Host "    LULUS  HTTP $($resp.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "    GAGAL  HTTP $($resp.StatusCode)" -ForegroundColor Red
        $fail++
    }
} catch {
    Write-Host "    GAGAL  $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

Write-Host "[2] Control plane SOC tidak boleh terbuka dari red team" -ForegroundColor Cyan
foreach ($port in 8081, 3001) {
    $closed = Test-TcpClosed -TargetHost $hostName -Port $port
    if ($closed) {
        Write-Host "    LULUS  ${hostName}:${port} tidak menerima koneksi" -ForegroundColor Green
    } else {
        Write-Host "    GAGAL  ${hostName}:${port} terbuka — SOC bocor ke hotspot" -ForegroundColor Red
        $fail++
    }
}

Write-Host "[3] Basis data tidak boleh terbuka ke hotspot" -ForegroundColor Cyan
foreach ($port in 5432, 6379) {
    $closed = Test-TcpClosed -TargetHost $hostName -Port $port
    if ($closed) {
        Write-Host "    LULUS  ${hostName}:${port} tertutup" -ForegroundColor Green
    } else {
        Write-Host "    GAGAL  ${hostName}:${port} terbuka" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "Uji browser (Gallery, password salah 5x, bukan Vercel): lihat CHECKLIST.md" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Red
if ($fail -gt 0) {
    Write-Host "HASIL: $fail cek gagal" -ForegroundColor Red
    exit 1
}
Write-Host "HASIL: postur otomatis lulus" -ForegroundColor Green
exit 0
