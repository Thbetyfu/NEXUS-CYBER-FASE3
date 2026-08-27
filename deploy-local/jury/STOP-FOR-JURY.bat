@echo off
title Nexus Cyber - STOP FOR JURY
cd /d "%~dp0"
set "DEPLOY=%~dp0.."

echo ============================================================
echo   STOP — tunnel juri (+ opsional lab)
echo ============================================================
echo.

echo [1/2] Menghentikan cloudflared...
taskkill /F /IM cloudflared.exe >nul 2>&1
if errorlevel 1 (
  echo      (tidak ada proses cloudflared, atau sudah mati)
) else (
  echo      [OK] cloudflared dihentikan
)

echo.
set /p STOPLAB="Matikan juga lab Docker (START-OFFLINE)? [y/N]: "
if /I "%STOPLAB%"=="y" (
  echo [2/2] STOP lab...
  call "%DEPLOY%\STOP.bat"
) else (
  echo [2/2] Lab dibiarkan jalan. Hanya tunnel yang dimatikan.
)

echo.
echo Selesai.
pause
