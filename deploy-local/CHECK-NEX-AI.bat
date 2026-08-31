@echo off
title Nexus Cyber - CHECK NEX-AI
cd /d "%~dp0"

set "SCRIPT=%~dp0..\scripts\check_nex_ai.py"
if not exist "%SCRIPT%" (
  echo [GAGAL] scripts\check_nex_ai.py tidak ditemukan.
  pause
  exit /b 1
)

where py >nul 2>&1
if not errorlevel 1 (
  py -3 -- "%SCRIPT%" %*
  goto :after
)
where python >nul 2>&1
if not errorlevel 1 (
  python -- "%SCRIPT%" %*
  goto :after
)
where python3 >nul 2>&1
if not errorlevel 1 (
  python3 -- "%SCRIPT%" %*
  goto :after
)

echo Model AI tidak ada. Silakan pasang terlebih dahulu.
echo.
echo Python 3 diperlukan untuk memeriksa NEX-AI di Ollama lokal.
echo Bobot TIDAK diunduh dari Ollama Hub. Jangan ollama pull qwen / llama / gpt.
echo Salin nex_ai_q4_k_m.gguf ke folder nex-ai-models\ lalu jalankan nex-ai-models\IMPORT-OLLAMA.bat
pause
exit /b 1

:after
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)
echo.
pause
exit /b 0
