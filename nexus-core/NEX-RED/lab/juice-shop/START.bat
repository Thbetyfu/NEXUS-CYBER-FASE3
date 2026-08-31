@echo off
cd /d "%~dp0"
echo [*] Starting OWASP Juice Shop on http://127.0.0.1:3003
docker compose up -d
if errorlevel 1 (
  echo [!] Docker Compose failed. Is Docker Desktop running?
  exit /b 1
)
echo [*] Wait ~30s for the first pull, then:
echo     python NEX-RED\nexred.py lab-juice
echo     python NEX-RED\nexred.py benchmark --live
