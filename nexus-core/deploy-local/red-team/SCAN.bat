@echo off
title Nexus Cyber - RED TEAM SCAN
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0SCAN.ps1"
echo.
pause
