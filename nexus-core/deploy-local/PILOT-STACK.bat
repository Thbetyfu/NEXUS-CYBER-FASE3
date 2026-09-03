@echo off
title Nexus Cyber - PILOT STACK (bukan SOC)
cd /d "%~dp0"
set "ROOT=%~dp0..\.."
set "CORE=%~dp0.."

echo ============================================================
echo   NEXUS -- PILOT STACK (PC harian, bukan START.bat SOC)
echo   Nyala: Ollama :11434 + Channel Starter :3010 + Portal :3003
echo   Tunnel: jalankan START-PORTAL-PILOT.bat (hanya :3003)
echo   JANGAN: :3001 :8081 :11434 tunnel  /  docker START.bat
echo   Vercel Channel Portal produksi TIDAK memakai Ollama PC ini.
echo ============================================================
echo.

where ollama >nul 2>&1
if errorlevel 1 (
  echo [LEWAT] Ollama tidak di PATH. Pasang lalu START-LOCAL-LLM.bat
) else (
  netstat -ano | findstr /R /C:"127.0.0.1:11434.*LISTENING" >nul 2>&1
  if not errorlevel 1 (
    echo [OK] Ollama sudah listen 127.0.0.1:11434
  ) else (
    echo [START] Ollama -- jendela baru START-LOCAL-LLM.bat
    start "Nexus Ollama 11434" cmd /k "%~dp0START-LOCAL-LLM.bat"
  )
)

netstat -ano | findstr /R /C:":3010.*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [OK] Channel Starter sudah :3010
) else (
  echo [START] python cli.py serve -- jendela baru :3010
  start "Nexus Channel Starter 3010" cmd /k "cd /d "%CORE%\channel-starter" && python cli.py serve"
)

netstat -ano | findstr /R /C:":3003.*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [OK] Channel Portal sudah :3003
) else (
  echo [START] npm run dev -- jendela baru :3003
  start "Nexus Channel Portal 3003" cmd /k "cd /d "%ROOT%\nexus-gaas-web" && npm run dev"
)

echo.
echo --- Setelah hijau, tunnel pembeli (bukan operator, bukan LLM) ---
echo   Double-click START-PORTAL-PILOT.bat
echo   Approve Kredit: http://127.0.0.1:3003/operator/topup  (hanya PC)
echo.
echo Sleep PC: Settings - System - Power and battery - Screen and sleep
echo   On battery / plugged in - sleep = Never. Hibernate Off butuh Admin.
echo.
pause
