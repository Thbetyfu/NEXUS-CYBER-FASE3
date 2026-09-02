@echo off
title Nexus Cyber - Ollama loopback (JANGAN tunnel)
cd /d "%~dp0"

echo ============================================================
echo   NEXUS — runtime model tulis lokal
echo   Bind: 127.0.0.1:11434  (bukan 0.0.0.0)
echo   Portal: GET /api/local-llm/health  (server-side saja)
echo   JANGAN: cloudflared / START-PORTAL-PILOT ke :11434
echo   Bukan NEX-AI protect/reflex (itu WAF). Fill cerita = langkah belakangan.
echo ============================================================
echo.

set "OLLAMA_HOST=127.0.0.1:11434"

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
  echo.
  echo Model tulis kecil ^(opsional, unduh sendiri, jangan 70B^):
  echo   ollama pull gemma3:1b
  echo Nexus tidak menarik model Hub di langkah ini.
  echo nex-ai-protect / nex-ai-reflex tetap untuk WAF, bukan copy situs.
  pause
  exit /b 1
)

echo [OK] ollama di PATH.
ollama --version
echo.

netstat -ano | findstr /R /C:"127.0.0.1:11434.*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [OK] Sudah listen di 127.0.0.1:11434
  echo Cek portal ^(setelah npm run dev^): http://127.0.0.1:3003/api/local-llm/health
  echo Daftar model terpasang:
  ollama list
  echo.
  echo Tidak menarik model baru. Copy-fill belum. Jangan tunnel :11434.
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
