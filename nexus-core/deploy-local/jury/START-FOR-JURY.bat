@echo off
title Nexus Cyber - START FOR JURY (lab + tunnel)
cd /d "%~dp0"
set "ROOT=%~dp0..\.."
set "DEPLOY=%~dp0.."

echo ============================================================
echo   NEXUS CYBER — AKSES JURI (bukan hotspot)
echo   Lab OFFLINE + Cloudflare Tunnel ke Caddy :80
echo   JANGAN expose SOC :3001 / :8081
echo ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker tidak ada di PATH. Pasang Docker Desktop dulu.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker Desktop belum Running. Buka Docker lalu coba lagi.
  pause
  exit /b 1
)

echo [1/3] Menyalakan lab (portofolio Vercel di belakang WAF)...
echo       Folder: %DEPLOY%
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%DEPLOY%\START.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Lab gagal start. Perbaiki error di atas lalu jalankan lagi.
  pause
  exit /b 1
)

echo.
echo [2/3] Menunggu Caddy :80 siap...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ok=$false; for($i=0;$i -lt 30;$i++){ try { $c=New-Object Net.Sockets.TcpClient; $c.ConnectAsync('127.0.0.1',80).Wait(1000) | Out-Null; if($c.Connected){$ok=$true;$c.Close();break}; $c.Close() } catch {} ; Start-Sleep -Seconds 2 }; if(-not $ok){ Write-Host '[!] Port 80 belum terdeteksi — tunnel tetap dilanjut.' -ForegroundColor Yellow } else { Write-Host '[OK] Port 80 listening.' -ForegroundColor Green }"

echo.
echo [3/3] Cloudflare Tunnel (quick URL untuk juri)...
echo       Salin URL https://....trycloudflare.com yang muncul.
echo       Uji dari HP (data seluler), lalu kirim ke juri.
echo       Ctrl+C di jendela tunnel = stop tunnel saja.
echo.
echo Lokal cek: http://127.0.0.1
echo Docs: docs\JURY_PUBLIC_ACCESS.md
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\tunnel\nexus-tunnel.ps1" -Port 80
echo.
pause
