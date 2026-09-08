@echo off
title Nexus Cyber - Channel Portal keep-alive
cd /d "%~dp0"
set "PS1=%~dp0KEEP-PORTAL-ALIVE.ps1"

echo ============================================================
echo   NEXUS — Channel Portal keep-alive (:3003 only)
echo   Publik: cloudflared quick tunnel -^> 127.0.0.1:3003
echo   JANGAN: :3001 :8081 :11434
echo   URL file: PORTAL-TUNNEL-URL.txt (gitignore)
echo ============================================================
echo.

if /I "%~1"=="install" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -InstallTask
  goto :end
)
if /I "%~1"=="uninstall" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -UninstallTask
  goto :end
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"

:end
if /I "%NEXUS_KEEPALIVE_NOPAUSE%"=="1" goto :eof
echo.
echo Task: NexusPortalKeepAlive   install: KEEP-PORTAL-ALIVE.bat install
pause
