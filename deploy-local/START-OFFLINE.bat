@echo off
title Nexus Cyber - deploy-local START OFFLINE
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START.ps1" -Offline
if errorlevel 1 (
    echo.
    echo START OFFLINE gagal. Jendela ini tetap terbuka agar pesan error terbaca.
)
echo.
pause
