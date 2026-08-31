# ==============================================================================
# NEXUS CYBER FASE 2 - LOCAL PC ONE-CLICK DEPLOYMENT ENGINE (WINDOWS POWERSHELL)
# ==============================================================================
# Usage: .\scripts\deploy-local-pc.ps1
# Mode A: Docker Compose (Recommended) - jalankan semua services sekaligus
# Mode B: Binary Manual               - hanya kompilasi & jalankan gateway binary

param(
    [switch]$Binary  # Gunakan flag -Binary untuk Mode B (manual binary saja)
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   NEXUS CYBER: LOCAL PC ONE-CLICK DEPLOYMENT ENGINE (WIN)  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
if (-not $WorkspaceRoot) { $WorkspaceRoot = Get-Location }

# 1. Verification of Prerequisites
Write-Host "`n[*] [1/4] Checking System Dependencies..." -ForegroundColor Yellow

$GoInstalled = Get-Command go -ErrorAction SilentlyContinue
if (-not $GoInstalled) {
    Write-Host "[!] Warning: Go compiler is not installed on PATH. Install Go 1.22+ from https://go.dev/dl/" -ForegroundColor Red
} else {
    Write-Host "[OK] Go Compiler: $(go version)" -ForegroundColor Green
}

$DockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $DockerInstalled) {
    Write-Host "[i] Docker not found. Mode B (Manual Binary) will be used." -ForegroundColor Yellow
    $Binary = $true
} else {
    Write-Host "[OK] Docker Engine: $(docker --version)" -ForegroundColor Green
}

$PythonInstalled = Get-Command python -ErrorAction SilentlyContinue
if ($PythonInstalled) {
    Write-Host "[OK] Python Environment: $(python --version)" -ForegroundColor Green
}

# 2. Build Backend Gateway Binary (always needed as fallback or for Mode B)
Write-Host "`n[*] [2/4] Building Nexus Core Gateway (Go Binary)..." -ForegroundColor Yellow
$GatewayDir = Join-Path $WorkspaceRoot "nexus-core-gateway"
Push-Location $GatewayDir
go build -o gateway.exe ./cmd/gateway
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Gateway binary 'gateway.exe' compiled successfully." -ForegroundColor Green
} else {
    Write-Host "[!] Failed to compile gateway binary. Check Go source for errors." -ForegroundColor Red
    Pop-Location
    Exit 1
}
Pop-Location

# 3. Launch Mode
Write-Host "`n[*] [3/4] Launching Nexus Cyber System..." -ForegroundColor Yellow

if ($Binary) {
    # Mode B: Manual binary - gateway only
    Write-Host "[Mode B] Starting gateway binary directly (no Docker required)..." -ForegroundColor Cyan
    $GatewayExe = Join-Path $GatewayDir "gateway.exe"
    Start-Process -FilePath $GatewayExe -WorkingDirectory $GatewayDir -NoNewWindow
    Write-Host "[OK] Gateway process started." -ForegroundColor Green
    Write-Host "[i] Note: Postgres/Redis/Dashboard are NOT started in Binary mode." -ForegroundColor Yellow
    Write-Host "    Start them manually or use Docker Compose (run without -Binary flag)." -ForegroundColor Yellow
} else {
    # Mode A: Docker Compose (recommended - starts all services)
    Write-Host "[Mode A] Launching full stack via Docker Compose..." -ForegroundColor Cyan
    Push-Location $WorkspaceRoot
    docker compose up -d --build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] All Nexus Cyber services are up and running." -ForegroundColor Green
    } else {
        Write-Host "[!] Docker Compose failed. Check docker-compose.yml and .env config." -ForegroundColor Red
        Pop-Location
        Exit 1
    }
    Pop-Location
}

# 4. Cloudflare Tunnel Info
Write-Host "`n[*] [4/4] Cloudflare Tunnel - Free Internet Exposure..." -ForegroundColor Yellow
$CloudflaredInstalled = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($CloudflaredInstalled) {
    Write-Host "[OK] cloudflared CLI detected! To expose WAF to public internet for FREE:" -ForegroundColor Green
    Write-Host "     cloudflared tunnel --url http://localhost:8080" -ForegroundColor Cyan
} else {
    Write-Host "[i] Tip: To share your Local PC WAF to public internet for FREE (no VPS needed):" -ForegroundColor Cyan
    Write-Host "    1. Download cloudflared: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor White
    Write-Host "    2. Run: cloudflared tunnel --url http://localhost:8080" -ForegroundColor White
    Write-Host "    3. Cloudflare will give you a FREE public HTTPS URL instantly!" -ForegroundColor White
}

# 5. Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "   NEXUS CYBER LOCAL PC DEPLOYMENT READY!                   " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Local Endpoint Access:" -ForegroundColor White
Write-Host "  - SOC Command Center Dashboard  : http://localhost:3001" -ForegroundColor Cyan
Write-Host "  - WAF Core Gateway (Caddy Proxy): http://localhost:80" -ForegroundColor Cyan
Write-Host "  - WAF Core Gateway (Direct)     : http://localhost:8080 (via binary mode)" -ForegroundColor Cyan
Write-Host "  - Honeypot Digital Sandbox      : http://localhost:9090" -ForegroundColor Cyan
Write-Host "  - SSH Tarpit Sandbox            : Port 2222" -ForegroundColor Cyan
Write-Host "`n Useful Commands:" -ForegroundColor Yellow
Write-Host "  - Check container status : docker compose ps" -ForegroundColor White
Write-Host "  - View gateway logs      : docker compose logs -f gateway" -ForegroundColor White
Write-Host "  - Stop all services      : .\scripts\nexus-kill.sh (or: docker compose down)" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
