@echo off
title Nexus Cyber - Channel Portal tunnel (bukan SOC, bukan WAF)
cd /d "%~dp0"
set "ROOT=%~dp0..\.."

echo ============================================================
echo   NEXUS — PILOT STOREFRONT (PC + Cloudflare Tunnel)
echo   Publik: Channel Portal :3003  (+ preview /starter -^> :3010)
echo   Lokal:  approve http://127.0.0.1:3003/operator/topup
echo   JANGAN: :3001 :8081 Postgres Redis NEX-RED :11434 (Ollama)
echo ============================================================
echo.
echo Prasyarat di jendela lain:
echo   1. nexus-gaas-web  -^> npm run dev          (:3003)
echo   2. nexus-core\channel-starter -^> python cli.py serve  (:3010)
echo   3. nexus-gaas-web\.env.local:
echo        NEXUS_LEDGER_MODE=live
echo        NEXUS_LAB_FAUCET=0
echo        CHANNEL_STARTER_URL=http://127.0.0.1:3010
echo.
echo Sleep Windows OFF. Login Cloudflare (named host) pemilik lakukan sendiri:
echo   cloudflared tunnel login
echo.
echo Uji HP: /gate -^> daftar -^> /kredit Isi -^> WA + bukti
echo   lalu approve di PC, lalu /pesan/umkm-starter generate.
echo Docs: docs\DISTRIBUTION_PILOT.md  ^|  nexus-gaas-web\README.md
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\tunnel\nexus-tunnel.ps1" -Portal
echo.
pause
