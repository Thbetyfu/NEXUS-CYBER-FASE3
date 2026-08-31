@echo off
title Nexus Cyber - deploy-local STATUS
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0STATUS.ps1"
echo.
pause
