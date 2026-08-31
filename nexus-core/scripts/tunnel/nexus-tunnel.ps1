# ==============================================================================
# NEXUS CYBER — Cloudflare Tunnel (Windows) — AKSES PUBLIK / JURI
# ==============================================================================
# Default: port 80 (Caddy → WAF → portofolio). SELARAS docs/DISTRIBUTION_PILOT.md
#
# Usage:
#   .\scripts\tunnel\nexus-tunnel.ps1              # port 80 (disarankan untuk juri)
#   .\scripts\tunnel\nexus-tunnel.ps1 -Port 80     # sama
#   .\scripts\tunnel\nexus-tunnel.ps1 -WafDirect   # port 8080 (bypass Caddy)
#   .\scripts\tunnel\nexus-tunnel.ps1 -Port 3003   # Channel Portal (opsional)
#
# DILARANG untuk demo juri: -Dashboard / port 3001 / 8081 (SOC / control plane)
# One-click: deploy-local\jury\START-FOR-JURY.bat
# ==============================================================================

param(
    [switch]$Dashboard,
    [switch]$WafDirect,
    [switch]$AllowExposeSoc,
    [int]$Port = 0
)

$ErrorActionPreference = "Continue"

$TargetPort = 80
$TargetLabel = "Caddy :80 (WAF + portofolio) — mode juri"

if ($Dashboard) {
    if (-not $AllowExposeSoc) {
        Write-Host "[BLOCKED] -Dashboard akan mengekspos SOC :3001 ke internet." -ForegroundColor Red
        Write-Host "          Dilarang untuk juri / pilot publik (DISTRIBUTION_PILOT)." -ForegroundColor Red
        Write-Host "          Jika sadar risiko lab internal saja: tambah -AllowExposeSoc" -ForegroundColor Yellow
        exit 1
    }
    $TargetPort = 3001
    $TargetLabel = "SOC Dashboard :3001 (EXPOSE — hanya lab internal)"
} elseif ($WafDirect) {
    $TargetPort = 8080
    $TargetLabel = "WAF Gateway :8080 (langsung, tanpa Caddy)"
} elseif ($Port -gt 0) {
    if ($Port -eq 3001 -or $Port -eq 8081) {
        if (-not $AllowExposeSoc) {
            Write-Host "[BLOCKED] Port $Port adalah control plane / SOC. Jangan untuk juri." -ForegroundColor Red
            Write-Host "          Override sadar: -AllowExposeSoc" -ForegroundColor Yellow
            exit 1
        }
    }
    $TargetPort = $Port
    $TargetLabel = "Custom Port $Port"
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   NEXUS CYBER — Cloudflare Tunnel (juri / publik)" -ForegroundColor Cyan
Write-Host "   Target: $TargetLabel" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ── Step 1: cloudflared ───────────────────────────────────────────────────────
Write-Host "`n[1/3] Checking cloudflared..." -ForegroundColor Yellow

$CloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $CloudflaredCmd) {
    Write-Host "[!] cloudflared not found. Installing..." -ForegroundColor Yellow
    $WingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    $ScoopCmd  = Get-Command scoop  -ErrorAction SilentlyContinue

    if ($WingetCmd) {
        winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } elseif ($ScoopCmd) {
        scoop install cloudflared
    } else {
        $CloudflaredUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        $DestDir = "$env:LOCALAPPDATA\cloudflared"
        $DestPath = "$DestDir\cloudflared.exe"
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        Invoke-WebRequest -Uri $CloudflaredUrl -OutFile $DestPath -UseBasicParsing
        $env:Path += ";$DestDir"
        Write-Host "[OK] Downloaded: $DestPath" -ForegroundColor Green
    }
    $CloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if (-not $CloudflaredCmd) {
        Write-Host "[ERROR] cloudflared masih tidak ditemukan. Install manual:" -ForegroundColor Red
        Write-Host "  winget install Cloudflare.cloudflared" -ForegroundColor White
        exit 1
    }
}

$ver = & cloudflared --version 2>&1 | Select-Object -First 1
Write-Host "[OK] $ver" -ForegroundColor Green

# ── Step 2: port check ────────────────────────────────────────────────────────
Write-Host "`n[2/3] Verifying localhost:$TargetPort ..." -ForegroundColor Yellow
try {
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    $Connected = $TcpClient.ConnectAsync("127.0.0.1", $TargetPort).Wait(2000)
    $TcpClient.Close()
    if ($Connected) {
        Write-Host "[OK] Port $TargetPort listening." -ForegroundColor Green
    } else {
        Write-Host "[!] Port $TargetPort belum listen." -ForegroundColor Yellow
        Write-Host "    Jalankan dulu: deploy-local\jury\START-FOR-JURY.bat" -ForegroundColor White
        Write-Host "    atau: deploy-local\START.bat" -ForegroundColor White
        Write-Host "    Melanjutkan tunnel anyway..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[i] Tidak bisa cek port. Melanjutkan..." -ForegroundColor Yellow
}

# ── Step 3: tunnel ────────────────────────────────────────────────────────────
Write-Host "`n[3/3] Launching quick tunnel..." -ForegroundColor Yellow
Write-Host "    Salin URL https://....trycloudflare.com di bawah." -ForegroundColor Cyan
Write-Host "    Kirim ke juri / uji dari HP (bukan Wi-Fi rumah)." -ForegroundColor Cyan
Write-Host "    Ctrl+C = stop tunnel. Lab Docker tetap jalan." -ForegroundColor White
Write-Host "    JANGAN tunnel SOC. Docs: docs\JURY_PUBLIC_ACCESS.md" -ForegroundColor DarkYellow
Write-Host ""

& cloudflared tunnel --url "http://127.0.0.1:$TargetPort"
