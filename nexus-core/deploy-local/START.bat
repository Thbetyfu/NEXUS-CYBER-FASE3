@echo off
title Nexus Cyber - deploy-local START
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START.ps1"
if errorlevel 1 (
    echo.
    echo START gagal. Jendela ini tetap terbuka agar pesan error terbaca.
)
echo.
pause
