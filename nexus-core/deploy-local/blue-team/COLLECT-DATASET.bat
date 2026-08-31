@echo off
title Nexus Cyber - BLUE TEAM collect NEX-AI lab dataset
cd /d "%~dp0..\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0COLLECT-DATASET.ps1"
echo.
pause
