@echo off
title NEX-AI — import Ollama models
cd /d "%~dp0"

where ollama >nul 2>&1
if errorlevel 1 (
  echo [GAGAL] Ollama belum terpasang. Install dari https://ollama.com/download lalu jalankan ulang.
  pause
  exit /b 1
)

if not exist "%~dp0nex_ai_q4_k_m.gguf" (
  echo [GAGAL] File nex_ai_q4_k_m.gguf tidak ada di folder ini.
  pause
  exit /b 1
)

if not exist "%~dp0Modelfile.protect" (
  echo [GAGAL] File Modelfile.protect tidak ada di folder ini.
  pause
  exit /b 1
)

if not exist "%~dp0Modelfile.production" (
  echo [GAGAL] File Modelfile.production tidak ada di folder ini.
  pause
  exit /b 1
)

echo Membuat nex-ai-protect (NEX-RED / reasoning prompt)...
ollama create nex-ai-protect -f "%~dp0Modelfile.protect"
if errorlevel 1 (
  echo [GAGAL] ollama create nex-ai-protect
  pause
  exit /b 1
)

echo Membuat nex-ai-reflex (HTTP classifier prompt, bobot GGUF sama)...
ollama create nex-ai-reflex -f "%~dp0Modelfile.production"
if errorlevel 1 (
  echo [GAGAL] ollama create nex-ai-reflex
  pause
  exit /b 1
)

echo.
echo [OK] Model siap. Cek dengan: ollama list
ollama list | findstr /i "nex-ai"
echo.
pause
