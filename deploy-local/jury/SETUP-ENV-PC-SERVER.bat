@echo off
title Nexus Cyber - SETUP ENV PC SERVER
cd /d "%~dp0"
echo ============================================================
echo   Membuat deploy-local\.env dari template PC server
echo   Password/token acak otomatis — simpan NEXUS_ADMIN_TOKEN
echo ============================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP-ENV-PC-SERVER.ps1"
echo.
pause
