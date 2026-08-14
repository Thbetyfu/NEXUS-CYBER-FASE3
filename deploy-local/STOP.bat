@echo off
title Nexus Cyber - deploy-local STOP
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0STOP.ps1"
echo.
pause
