@echo off
title Nexus Cyber - STATUS FOR JURY
cd /d "%~dp0"
set "DEPLOY=%~dp0.."

echo ============================================================
echo   STATUS — lab + tunnel (juri)
echo ============================================================
echo.

echo --- Docker ---
docker info >nul 2>&1
if errorlevel 1 (
  echo [!] Docker Desktop TIDAK running
) else (
  echo [OK] Docker Desktop running
)

echo.
echo --- Lab containers (deploy-local) ---
cd /d "%DEPLOY%"
if exist STATUS.bat (
  call STATUS.bat
) else (
  docker compose ps 2>nul
)

echo.
echo --- Ports (harus: 80/8080 UP; 3001/8081 jangan dipublikasikan) ---
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "foreach($p in 80,8080,3001,8081,3003){ $up=$false; try { $c=New-Object Net.Sockets.TcpClient; $t=$c.ConnectAsync('127.0.0.1',$p); if($t.Wait(400) -and $c.Connected){$up=$true}; $c.Close() } catch {}; if($up){ Write-Host ('  :' + $p + ' LISTEN') -ForegroundColor Green } else { Write-Host ('  :' + $p + ' -') -ForegroundColor DarkGray } }"

echo.
echo --- cloudflared ---
where cloudflared >nul 2>&1
if errorlevel 1 (
  echo [!] cloudflared belum di PATH (akan di-install saat START-FOR-JURY)
) else (
  cloudflared --version 2>nul
  echo Proses cloudflared:
  tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr /I cloudflared
)

echo.
echo Docs: docs\JURY_PUBLIC_ACCESS.md
echo.
pause
