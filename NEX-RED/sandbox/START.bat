@echo off
cd /d "%~dp0"
echo [*] NEX-RED sandbox (uid 10001, no docker.sock)
docker compose run --rm nexred
if errorlevel 1 (
  echo [!] Docker Compose failed. Scan on the laptop instead:
  echo     python NEX-RED\nexred.py scan -m whitebox -r . --no-llm
  exit /b 1
)
