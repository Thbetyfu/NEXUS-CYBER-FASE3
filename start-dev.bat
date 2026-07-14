@echo off
title NEXUS CYBER - DEVELOPMENT RUNNER
echo ==============================================================================
# NEXUS CYBER COGNITIVE CORE - DEV LAUNCHER
echo ==============================================================================

echo [0] Menyalakan Kontainer Database (Postgres & Redis) di Docker...
docker compose up -d postgres redis
echo Menunggu inisialisasi basis data (5 detik)...
timeout /t 5 /nobreak >nul

echo [1] Menjalankan Website Portofolio (Target) di Port 3002...
start "Nexus Target - Portfolio" cmd /k "cd ..\Portfolio-website && set PORT=3002&& go run main.go"

echo [2] Menjalankan WAF Gateway (Go) di Port 8080...
start "Nexus Core - Gateway" cmd /k "cd nexus-core-gateway && go run ./cmd/gateway"

echo [3] Menjalankan Dasbor SOC Admin (Next.js) di Port 3001...
start "Nexus SOC - Dashboard" cmd /k "cd nexus-admin-dashboard && npm run dev -- -p 3001"

echo ==============================================================================
echo Seluruh layanan berhasil diluncurkan di jendela CMD terpisah!
echo Gunakan stop-dev.bat untuk mematikan semua layanan agar tidak menjadi zombie.
echo ==============================================================================
pause
