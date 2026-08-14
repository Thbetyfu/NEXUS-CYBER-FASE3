@echo off
title Nexus Cyber - RED TEAM CHECK
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CHECK.ps1"
echo.
pause
