@echo off
title Nexus Cyber - RED TEAM JOIN
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0JOIN.ps1"
if errorlevel 1 (
    echo.
    echo JOIN gagal. Sambungkan Wi-Fi blue team, lalu coba lagi.
)
echo.
pause
