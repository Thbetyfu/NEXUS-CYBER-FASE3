@echo off
title Nexus Cyber - BLUE TEAM START
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
    echo Meminta izin Administrator untuk hotspot Windows dan firewall...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START.ps1"
if errorlevel 1 (
    echo.
    echo START blue team gagal. Jendela ini tetap terbuka agar pesan error terbaca.
)
echo.
pause
