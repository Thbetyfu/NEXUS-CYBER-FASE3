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

function Test-NexAIRequiredOff {
    return $env:NEX_AI_REQUIRED -match '^(?i)(0|false|no|off)$'
}

function Invoke-NexAIGate {
    if (Test-NexAIRequiredOff) {
        Write-Host "[NEX-AI] Gerbang dilewati (NEX_AI_REQUIRED=$($env:NEX_AI_REQUIRED)). Bukan unduhan Hub." -ForegroundColor Yellow
        return
    }

    $script = Join-Path $PSScriptRoot "..\scripts\check_nex_ai.py"
    if (-not (Test-Path -LiteralPath $script)) {
        Write-Host "[GAGAL] scripts\check_nex_ai.py tidak ditemukan." -ForegroundColor Red
        exit 1
    }

    $ran = $false
    if (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3 -- "$script"
        $ran = $true
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        & python -- "$script"
        $ran = $true
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        & python3 -- "$script"
        $ran = $true
    }

    if (-not $ran) {
        Write-Host "Model AI tidak ada. Silakan pasang terlebih dahulu." -ForegroundColor Red
        Write-Host ""
        Write-Host "Python 3 diperlukan untuk memeriksa NEX-AI di Ollama lokal." -ForegroundColor Red
        Write-Host "Bobot TIDAK diunduh dari Ollama Hub. Jangan ollama pull qwen / llama / gpt."
        Write-Host "Salin nex_ai_q4_k_m.gguf ke folder nex-ai-models\ lalu jalankan nex-ai-models\IMPORT-OLLAMA.bat"
        exit 1
    }
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

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
$hostMap = Join-Path $PSScriptRoot "nexus-host-map.json"
$hostMapExample = Join-Path $PSScriptRoot "nexus-host-map.example.json"
if (-not (Test-Path $hostMap) -and (Test-Path $hostMapExample)) {
    Copy-Item -LiteralPath $hostMapExample -Destination $hostMap
    Write-Host "[OK] nexus-host-map.json dibuat (portfolio + tepi hosts)" -ForegroundColor Green
}
if (-not $env:NEX_AI_REQUIRED) {
    $nexLine = Get-Content -LiteralPath $envFile -ErrorAction SilentlyContinue |
        Where-Object { $_ -match '^\s*NEX_AI_REQUIRED=' } |
        Select-Object -First 1
    if ($nexLine) {
        $env:NEX_AI_REQUIRED = ($nexLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
    }
}

$composeArgs = @(
    "--project-name", "nexus-local",
    "-f", "docker-compose.yml"
)
if ($Offline) {
    Write-Host "[GAGAL] START-OFFLINE dihapus. Folder playground sudah diarsip (zip), bukan origin deploy." -ForegroundColor Red
    Write-Host "        Origin = Vercel di belakang WAF. Jalankan START.bat (tanpa -Offline)." -ForegroundColor Red
    Write-Host "        Jangan buka URL Vercel langsung saat mengklaim Nexus melindungi." -ForegroundColor Yellow
    exit 1
}
Write-Host "[MODE] Origin Vercel di belakang WAF: https://portfolio-website-three-ruddy-65.vercel.app" -ForegroundColor Yellow

Write-Step "[1/4] Memeriksa NEX-AI lokal (nex-ai-protect + nex-ai-reflex)..."
Invoke-NexAIGate

Write-Step "[2/4] Build & start (pertama kali bisa beberapa menit)..."
& docker compose @composeArgs up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[GAGAL] docker compose gagal. Cek apakah port 80/8080 sudah dipakai stack lain." -ForegroundColor Red
    exit 1
}

Write-Step "[3/4] Menunggu gateway merespons di :8080..."
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

Write-Step "[4/4] Alamat akses"
Write-Host "  Laptop ini     :  http://127.0.0.1"
Write-Host "  Gateway langsung:  http://127.0.0.1:8080"

. (Join-Path $PSScriptRoot "ps\Hosts.ps1")
. (Join-Path $PSScriptRoot "ps\ChannelStarterHosts.ps1")
$protectedHost = Get-NexusProtectedHost
if (Set-NexusLabHostsEntry -IP "127.0.0.1" -Name $protectedHost) {
    Write-Host "  Nama lab       :  http://$protectedHost  (baris hosts 127.0.0.1 sudah ditulis)"
} else {
    Write-Host "  Nama lab       :  http://$protectedHost"
    Write-Host "    hosts (Administrator):  127.0.0.1    $protectedHost"
}

$csHosts = Set-ChannelStarterLabHosts -IP "127.0.0.1"
if ($csHosts.names.Count -gt 0) {
    if ($csHosts.ok) {
        Write-Host "  Channel Starter: $($csHosts.names.Count) subdomain ditulis ke hosts (127.0.0.1)"
    } elseif ($csHosts.reason -eq "admin_required") {
        Write-Host "  Channel Starter: jalankan START.bat sebagai Administrator untuk hosts subdomain"
    }
}
Write-ChannelStarterAccessLines -IP "127.0.0.1"

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
