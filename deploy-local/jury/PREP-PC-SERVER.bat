@echo off
title Nexus Cyber - PREP PC SERVER (unduh dulu, baru jalan)
cd /d "%~dp0"
set "ROOT=%~dp0..\.."
set "DEPLOY=%~dp0.."

echo ============================================================
echo   NEXUS CYBER — PERSIAPAN PC BARU (server utama / juri)
echo   Mengunduh & memeriksa prasyarat SEBELUM START-FOR-JURY
echo   Docs: docs\PC_MAIN_SERVER.md
echo ============================================================
echo.

set "FAIL=0"

call :CheckCmd git "Git for Windows" "https://git-scm.com/download/win"
call :CheckCmd docker "Docker Desktop" "https://www.docker.com/products/docker-desktop/"
call :CheckCmd node "Node.js 20 LTS" "https://nodejs.org/"
call :CheckCmd python "Python 3.10+" "https://www.python.org/downloads/"

echo.
echo [Docker] Memastikan Docker Desktop Running...
docker info >nul 2>&1
if errorlevel 1 (
  echo [!] Docker belum Running. Buka Docker Desktop, tunggu Ready, jalankan skrip ini lagi.
  set "FAIL=1"
) else (
  echo [OK] Docker siap.
)

echo.
echo [Git] Submodule portofolio...
cd /d "%ROOT%"
git submodule update --init --recursive
if errorlevel 1 set "FAIL=1"

echo.
echo [ENV] deploy-local\.env ...
if not exist "%DEPLOY%\.env" (
  echo [*] .env belum ada — membuat dari template PC server + secret acak...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP-ENV-PC-SERVER.ps1" -Force -Quiet
  if errorlevel 1 set "FAIL=1"
) else (
  echo [OK] .env sudah ada. Buat ulang: jury\SETUP-ENV-PC-SERVER.bat
)

echo.
echo [Docker] Prefetch image lab (bisa beberapa menit)...
cd /d "%DEPLOY%"
docker compose pull
if errorlevel 1 set "FAIL=1"

echo.
echo [Node] nexus-channel-portal npm install...
cd /d "%ROOT%\nexus-channel-portal"
if exist package.json (
  call npm install
  if errorlevel 1 set "FAIL=1"
) else (
  echo [!] package.json portal tidak ditemukan.
  set "FAIL=1"
)

echo.
echo [Python] channel-starter pip install...
cd /d "%ROOT%\channel-starter"
if exist requirements.txt (
  python -m pip install -r requirements.txt
  if errorlevel 1 set "FAIL=1"
) else (
  echo [!] requirements.txt tidak ditemukan.
  set "FAIL=1"
)

echo.
echo [cloudflared] Cek tunnel CLI...
where cloudflared >nul 2>&1
if errorlevel 1 (
  where winget >nul 2>&1
  if errorlevel 1 (
    echo [!] cloudflared belum ada. Install manual atau jalankan nexus-tunnel.ps1 nanti.
  ) else (
    echo [*] Menginstall cloudflared via winget...
    winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
  )
) else (
  echo [OK] cloudflared terpasang.
)

echo.
echo ============================================================
if "%FAIL%"=="1" (
  echo   Selesai dengan PERINGATAN — perbaiki item di atas.
) else (
  echo   Selesai OK. Langkah berikut:
  echo   1. Edit deploy-local\.env ^(ganti password/token^)
  echo   2. Sekali: deploy-local\ALLOW-DEV-LAPTOP.bat ^(UAC Yes^)
  echo   3. Jalankan: deploy-local\jury\START-FOR-JURY.bat
)
echo ============================================================
echo.
pause
exit /b %FAIL%

:CheckCmd
where %~1 >nul 2>&1
if errorlevel 1 (
  echo [MISSING] %~1 — unduh: %~3
  set "FAIL=1"
) else (
  echo [OK] %~1 ditemukan ^(%~2^)
)
exit /b 0
