# ==============================================================================
# NEXUS CYBER FASE 2 - CLOUDFLARE TUNNEL LAUNCHER (WINDOWS POWERSHELL)
# ==============================================================================
# Menghubungkan sistem Nexus Cyber yang berjalan di PC lokal ke internet publik
# secara GRATIS via Cloudflare Tunnel (tanpa sewa VPS, tanpa port forwarding).
#
# Usage:
#   .\scripts\nexus-tunnel.ps1               # Default: tunnel ke port 8080 (WAF Gateway)
#   .\scripts\nexus-tunnel.ps1 -Dashboard    # Tunnel ke port 3001 (SOC Dashboard)
#   .\scripts\nexus-tunnel.ps1 -Port 80      # Tunnel ke port custom
# ==============================================================================

param(
    [switch]$Dashboard,
    [int]$Port = 0
)

$TargetPort = 8080
$TargetLabel = "WAF Core Gateway"

if ($Dashboard) {
    $TargetPort = 3001
    $TargetLabel = "SOC Command Center Dashboard"
} elseif ($Port -gt 0) {
    $TargetPort = $Port
    $TargetLabel = "Custom Service (Port $Port)"
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   NEXUS CYBER: CLOUDFLARE TUNNEL LAUNCHER                  " -ForegroundColor Cyan
Write-Host "   Target: $TargetLabel (Port $TargetPort)                  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ── Step 1: Deteksi & Install cloudflared ────────────────────────────────────
Write-Host "`n[1/3] Checking cloudflared installation..." -ForegroundColor Yellow

$CloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $CloudflaredCmd) {
    Write-Host "[!] cloudflared not found. Attempting auto-install..." -ForegroundColor Yellow

    # Cek apakah winget tersedia (Windows 10/11 modern)
    $WingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    $ScoopCmd  = Get-Command scoop  -ErrorAction SilentlyContinue

    if ($WingetCmd) {
        Write-Host "[*] Installing cloudflared via winget..." -ForegroundColor Cyan
        winget install --id Cloudflare.cloudflared -e --silent
        Write-Host "[OK] cloudflared installed via winget." -ForegroundColor Green
        # Refresh PATH untuk sesi ini
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } elseif ($ScoopCmd) {
        Write-Host "[*] Installing cloudflared via Scoop..." -ForegroundColor Cyan
        scoop install cloudflared
        Write-Host "[OK] cloudflared installed via Scoop." -ForegroundColor Green
    } else {
        # Fallback: download binary langsung dari GitHub
        Write-Host "[*] Downloading cloudflared binary from GitHub Releases..." -ForegroundColor Cyan
        $CloudflaredUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        $DestPath = "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"

        New-Item -ItemType Directory -Path "$env:LOCALAPPDATA\cloudflared" -Force | Out-Null
        Invoke-WebRequest -Uri $CloudflaredUrl -OutFile $DestPath -UseBasicParsing
        # Tambahkan ke PATH sesi ini saja (tidak permanen, cukup untuk sesi ini)
        $env:Path += ";$env:LOCALAPPDATA\cloudflared"
        Write-Host "[OK] cloudflared downloaded to: $DestPath" -ForegroundColor Green
        Write-Host "[i]  Untuk instalasi permanen, tambahkan folder tersebut ke System PATH." -ForegroundColor Yellow
    }
} else {
    $CloudflaredVersion = cloudflared --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] cloudflared detected: $CloudflaredVersion" -ForegroundColor Green
}

# ── Step 2: Verifikasi layanan target aktif ───────────────────────────────────
Write-Host "`n[2/3] Verifying Nexus Cyber service on port $TargetPort..." -ForegroundColor Yellow

try {
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    $Connected = $TcpClient.ConnectAsync("localhost", $TargetPort).Wait(2000)
    $TcpClient.Close()

    if ($Connected) {
        Write-Host "[OK] Service is running and listening on port $TargetPort." -ForegroundColor Green
    } else {
        Write-Host "[!] No service detected on port $TargetPort." -ForegroundColor Red
        Write-Host "    Pastikan Nexus Cyber sudah dijalankan terlebih dahulu:" -ForegroundColor Yellow
        Write-Host "    Mode Docker : .\scripts\deploy-local-pc.ps1" -ForegroundColor White
        Write-Host "    Mode Binary : .\scripts\deploy-local-pc.ps1 -Binary" -ForegroundColor White
        Write-Host ""
        Write-Host "    Melanjutkan tunnel launch anyway..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[i] Could not verify port $TargetPort. Proceeding with tunnel..." -ForegroundColor Yellow
}

# ── Step 3: Launch Cloudflare Tunnel ─────────────────────────────────────────
Write-Host "`n[3/3] Launching Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host "    Menghubungkan http://localhost:$TargetPort ke internet publik..." -ForegroundColor Cyan
Write-Host "    Tekan Ctrl+C untuk menghentikan tunnel." -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    Tunggu URL publik HTTPS muncul di bawah ini...          " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Jalankan tunnel (blocking - URL publik muncul di sini)
cloudflared tunnel --url "http://localhost:$TargetPort"
