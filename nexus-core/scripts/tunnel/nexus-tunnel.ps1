# ==============================================================================
# NEXUS CYBER — Cloudflare Tunnel (Windows)
# ==============================================================================
# Dua mode:
#   Juri / WAF portofolio:  default atau -Port 80  → Caddy :80 → gateway :8080
#   Pilot storefront:       -Portal                 → Channel Portal :3003 saja
#
# Usage:
#   .\scripts\tunnel\nexus-tunnel.ps1                 # Caddy :80 (juri / Alur A)
#   .\scripts\tunnel\nexus-tunnel.ps1 -Portal         # Channel Portal :3003 (pembeli)
#   .\scripts\tunnel\nexus-tunnel.ps1 -Starter        # wizard :3010 saja (jarang; lebih baik /starter di portal)
#   .\scripts\tunnel\nexus-tunnel.ps1 -WafDirect      # :8080 bypass Caddy
#
# DILARANG: -Dashboard / :3001 / :8081 / :5432 / :6379 / :3004 (SOC, DB, NEX-RED)
# One-click juri: deploy-local\jury\START-FOR-JURY.bat
# One-click storefront: deploy-local\START-PORTAL-PILOT.bat
# ==============================================================================

param(
    [switch]$Dashboard,
    [switch]$WafDirect,
    [switch]$Portal,
    [switch]$Starter,
    [switch]$AllowExposeSoc,
    [int]$Port = 0
)

$ErrorActionPreference = "Continue"

$BlockedPorts = @(3001, 8081, 5432, 6379, 3004)

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
} elseif ($Portal) {
    $TargetPort = 3003
    $TargetLabel = "Channel Portal :3003 (storefront). Operator /operator/topup tetap localhost."
} elseif ($Starter) {
    $TargetPort = 3010
    $TargetLabel = "Channel Starter :3010 (preview). Lebih aman: tunnel -Portal dan pakai /starter/"
} elseif ($WafDirect) {
    $TargetPort = 8080
    $TargetLabel = "WAF Gateway :8080 (langsung, tanpa Caddy)"
} elseif ($Port -gt 0) {
    if ($BlockedPorts -contains $Port) {
        if (-not $AllowExposeSoc) {
            Write-Host "[BLOCKED] Port $Port adalah control plane / DB / NEX-RED. Jangan untuk publik." -ForegroundColor Red
            Write-Host "          Override sadar: -AllowExposeSoc" -ForegroundColor Yellow
            exit 1
        }
    }
    $TargetPort = $Port
    $TargetLabel = "Custom Port $Port"
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   NEXUS CYBER — Cloudflare Tunnel" -ForegroundColor Cyan
Write-Host "   Target: $TargetLabel" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($TargetPort -eq 3003) {
    Write-Host "Hostname publik = URL trycloudflare di bawah. Preview generate = https://…/starter/preview/{slug}" -ForegroundColor White
    Write-Host "Approve Kredit: HANYA http://127.0.0.1:3003/operator/topup di PC ini." -ForegroundColor Yellow
}

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
        if ($TargetPort -eq 3003) {
            Write-Host "    Jalankan: cd nexus-gaas-web && npm run dev" -ForegroundColor White
        } elseif ($TargetPort -eq 3010) {
            Write-Host "    Jalankan: python cli.py serve di nexus-core/channel-starter" -ForegroundColor White
        } else {
            Write-Host "    Jalankan dulu: deploy-local\jury\START-FOR-JURY.bat atau START.bat" -ForegroundColor White
        }
        Write-Host "    Melanjutkan tunnel anyway..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[i] Tidak bisa cek port. Melanjutkan..." -ForegroundColor Yellow
}

# ── Step 3: tunnel ────────────────────────────────────────────────────────────
Write-Host "`n[3/3] Launching quick tunnel..." -ForegroundColor Yellow
Write-Host "    Salin URL https://....trycloudflare.com di bawah." -ForegroundColor Cyan
Write-Host "    Uji dari HP (data seluler), bukan Wi-Fi rumah." -ForegroundColor Cyan
Write-Host "    Ctrl+C = stop tunnel. Lab/portal di PC tetap jalan." -ForegroundColor White
Write-Host "    JANGAN tunnel SOC. Login Cloudflare: cloudflared tunnel login (named hostname)." -ForegroundColor DarkYellow
Write-Host ""

& cloudflared tunnel --url "http://127.0.0.1:$TargetPort"
