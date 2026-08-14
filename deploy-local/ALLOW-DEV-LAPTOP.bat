@echo off
title Nexus Cyber - allow laptop pengembangan (sekali)
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
    echo Meminta Administrator sekali untuk firewall dan Windows Security...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ALLOW-DEV-LAPTOP.ps1"
echo.
pause
