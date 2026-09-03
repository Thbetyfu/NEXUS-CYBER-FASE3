@echo off
title Nexus Cyber - Ollama loopback (JANGAN tunnel)
cd /d "%~dp0"

echo ============================================================
echo   NEXUS — runtime model tulis lokal
echo   Bind: 127.0.0.1:11434  (bukan 0.0.0.0)
echo   Writer: gemma3:1b  (NEXUS_LOCAL_LLM_MODEL)
echo   Portal health: GET  /api/local-llm/health
echo   Portal fill:   POST /api/local-llm/fill-starter
echo   JANGAN: cloudflared / START-PORTAL-PILOT ke :11434
echo   Bukan NEX-AI protect/reflex (itu WAF, bukan copy situs).
echo ============================================================
echo.

set "OLLAMA_HOST=127.0.0.1:11434"
set "NEXUS_WRITER_MODEL=gemma3:1b"

where ollama >nul 2>&1
if errorlevel 1 (
  echo [GAGAL] Ollama tidak ada di PATH.
  echo.
  echo Pasang runtime ^(bukan model 70B^):
  echo   1. https://ollama.com/download
  echo   2. atau: winget install Ollama.Ollama
  echo   3. Tutup installer, buka CMD baru, jalankan ulang file ini.
  echo.
  echo Setelah terpasang, env portal:
  echo   nexus-gaas-web\.env.local
  echo   NEXUS_LOCAL_LLM_URL=http://127.0.0.1:11434
  echo   NEXUS_LOCAL_LLM_MODEL=gemma3:1b
  echo.
  echo Model tulis kecil: ollama pull gemma3:1b
  echo Jangan pull 70B. Jangan pakai nex-ai-protect / nex-ai-reflex untuk copy.
  pause
  exit /b 1
)

echo [OK] ollama di PATH.
ollama --version
echo.

echo [PULL] Model tulis %NEXUS_WRITER_MODEL% jika belum ada ^(kecil, bukan 70B^)...
ollama list | findstr /I /C:"gemma3:1b" >nul 2>&1
if errorlevel 1 (
  ollama pull gemma3:1b
  if errorlevel 1 (
    echo [GAGAL] ollama pull gemma3:1b. Coba model kecil lain: llama3.2:1b
    echo Jangan pull 70B. Jangan nex-ai-protect / nex-ai-reflex.
    pause
    exit /b 1
  )
) else (
  echo [OK] %NEXUS_WRITER_MODEL% sudah terpasang.
)
echo.

netstat -ano | findstr /R /C:"127.0.0.1:11434.*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [OK] Sudah listen di 127.0.0.1:11434
  echo [WARM] Memuat %NEXUS_WRITER_MODEL% ke RAM ^(keep_alive^) agar klik Lihat teks tidak dingin...
  powershell -NoProfile -Command "$env:NEXUS_WRITER_MODEL='%NEXUS_WRITER_MODEL%'; try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/generate' -Method Post -ContentType 'application/json' -TimeoutSec 90 -Body ((@{model=$env:NEXUS_WRITER_MODEL; prompt='ok'; stream=$false; keep_alive='30m'; options=@{num_predict=8; num_ctx=512; temperature=0}}) | ConvertTo-Json -Compress -Depth 4) | Out-Null; Write-Host '[OK] Model tulis siap di RAM.' } catch { Write-Host '[LEWAT] Warmup gagal; Lihat teks tetap mencoba saat klik.' }"
  echo Cek: http://127.0.0.1:3003/api/local-llm/health
  echo Fill: POST http://127.0.0.1:3003/api/local-llm/fill-starter
  echo HP lewat tunnel portal saja — jangan buka :11434 dari HP.
  echo Daftar model terpasang:
  ollama list
  echo.
  echo Jangan tunnel :11434.
  pause
  exit /b 0
)

echo Menyalakan ollama serve di 127.0.0.1:11434 ...
echo Biarkan jendela ini terbuka. Ctrl+C = stop serve ^(jika tidak dipegang app Ollama^).
echo.
ollama serve
echo.
if errorlevel 1 (
  echo [GAGAL] ollama serve. Jika port sudah dipakai, itu biasanya app Ollama Windows.
  echo Cek: http://127.0.0.1:11434/api/tags
  pause
  exit /b 1
)
pause
exit /b 0
