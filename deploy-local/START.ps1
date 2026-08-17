param(
    [switch]$Offline
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Nexus Cyber  |  deploy-local  |  1-klik lab laptop" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[GAGAL] Docker belum terpasang. Install Docker Desktop, lalu coba lagi." -ForegroundColor Red
    exit 1
}

try {
    docker info 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) { throw "daemon down" }
} catch {
    Write-Host "[GAGAL] Docker Desktop belum running. Buka Docker Desktop, tunggu Ready, lalu klik START.bat lagi." -ForegroundColor Red
    exit 1
}

$envFile = Join-Path $PSScriptRoot ".env"
$example = Join-Path $PSScriptRoot ".env.example"
if (-not (Test-Path $envFile)) {
    Copy-Item -LiteralPath $example -Destination $envFile
    Write-Host "[OK] .env dibuat dari .env.example" -ForegroundColor Green
}

$composeArgs = @(
    "--project-name", "nexus-local",
    "-f", "docker-compose.yml"
)
if ($Offline) {
    $composeArgs += @("-f", "docker-compose.offline.yml")
    Write-Host "[MODE] Origin lokal: playground/Portofolio-Thoriq" -ForegroundColor Yellow
} else {
    Write-Host "[MODE] Origin Vercel: https://portfolio-website-three-ruddy-65.vercel.app" -ForegroundColor Yellow
}

Write-Step "[1/3] Build & start (pertama kali bisa beberapa menit)..."
& docker compose @composeArgs up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[GAGAL] docker compose gagal. Cek apakah port 80/8080 sudah dipakai stack lain." -ForegroundColor Red
    exit 1
}

Write-Step "[2/3] Menunggu gateway merespons di :8080..."
$ready = $false
for ($i = 0; $i -lt 45; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:8080/" -UseBasicParsing -TimeoutSec 3 -MaximumRedirection 0 -ErrorAction Stop
        $ready = $true
        break
    } catch {
        if ($_.Exception.Response) {
            $ready = $true
            break
        }
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "[PERINGATAN] Kontainer sudah di-up, tetapi :8080 belum merespons. Jalankan STATUS.bat atau: docker logs nexus-local-gateway" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Gateway merespons." -ForegroundColor Green
}

Write-Step "[3/3] Alamat akses"
Write-Host "  Laptop ini     :  http://127.0.0.1"
Write-Host "  Gateway langsung:  http://127.0.0.1:8080"

. (Join-Path $PSScriptRoot "ps\Hosts.ps1")
$protectedHost = Get-NexusProtectedHost
if (Set-NexusLabHostsEntry -IP "127.0.0.1" -Name $protectedHost) {
    Write-Host "  Nama lab       :  http://$protectedHost  (baris hosts 127.0.0.1 sudah ditulis)"
} else {
    Write-Host "  Nama lab       :  http://$protectedHost"
    Write-Host "    hosts (Administrator):  127.0.0.1    $protectedHost"
}

$lanIps = @()
try {
    $lanIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Select-Object -ExpandProperty IPAddress -Unique
} catch { }

if ($lanIps.Count -gt 0) {
    foreach ($ip in $lanIps) {
        Write-Host "  Laptop lain    :  http://$ip"
    }
} else {
    Write-Host "  Laptop lain    :  http://<IP-Wi-Fi-laptop-ini>   (lihat ipconfig)"
}

Write-Host ""
Write-Host "Buka URL di atas (lewat WAF). Jangan pakai URL Vercel langsung untuk uji Nexus." -ForegroundColor Green
Write-Host "NEX-RED: NEX_RED_LIVE_TARGET=http://$protectedHost (bukan origin Vercel)."
Write-Host "Matikan: double-click STOP.bat"
Write-Host "============================================================" -ForegroundColor Cyan
