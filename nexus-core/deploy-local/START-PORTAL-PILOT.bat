@echo off
title Nexus Cyber - Channel Portal tunnel (bukan SOC, bukan WAF)
cd /d "%~dp0"

echo ============================================================
echo   NEXUS — PILOT STOREFRONT (PC + Cloudflare Tunnel)
echo   Publik: Channel Portal :3003  (+ preview /starter -^> :3010)
echo   Lokal:  approve http://127.0.0.1:3003/operator/topup
echo   JANGAN: :3001 :8081 Postgres Redis NEX-RED :11434 (Ollama)
echo ============================================================
echo.
echo Keep-alive: tidak start Next kedua jika GET /gate 200.
echo Tidak start cloudflared baru jika tunnel :3003 sudah hidup.
echo Quick hostname BUKAN permanen (zona DNS Cloudflare belum ada).
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0KEEP-PORTAL-ALIVE.ps1"
echo.
echo URL: %~dp0PORTAL-TUNNEL-URL.txt
echo Jadwal logon: KEEP-PORTAL-ALIVE.bat install   (task NexusPortalKeepAlive)
echo.
pause
