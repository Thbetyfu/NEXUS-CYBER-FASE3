@echo off
title NEXUS CYBER - DEVELOPMENT RUNNER
echo ==============================================================================
echo # NEXUS CYBER COGNITIVE & RED TEAM CORE - DEV LAUNCHER
echo ==============================================================================

echo [0] Menyalakan Kontainer Database (Postgres & Redis) di Docker...
docker compose up -d postgres redis
echo Menunggu inisialisasi basis data (5 detik)...
timeout /t 5 /nobreak >nul

echo [1] Menjalankan Target Backend (Port 3002)...
if exist "..\Portfolio-website" (
    start "Nexus Target - Portfolio" cmd /k "cd ..\Portfolio-website && set PORT=3002&& go run main.go"
) else (
    start "Nexus Target - Mock Backend" cmd /k "cd nexus-core-gateway && node mock_backend.js 3002"
)

echo [2] Menjalankan WAF Gateway (Go) di Port 8080...
start "Nexus Core - Gateway" cmd /k "cd nexus-core-gateway && go run ./cmd/gateway"

echo [3] Menjalankan Dasbor SOC Admin (Next.js) di Port 3001...
start "Nexus SOC - Dashboard" cmd /k "cd nexus-admin-dashboard && npm run dev -- -p 3001"

echo [4] Menjalankan NEX-RED Tactical Bridge Daemon di Port 3004...
start "Nexus Red - NEX-RED Bridge" cmd /k "python NEX-RED/nexred.py bridge -p 3004"

echo ==============================================================================
echo Seluruh layanan (Gateway, Dashboard, Target, Database, & NEX-RED) berhasil diluncurkan!
echo Gunakan stop-dev.bat untuk mematikan semua layanan agar tidak menjadi zombie.
echo ==============================================================================
pause
