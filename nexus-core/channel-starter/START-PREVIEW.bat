@echo off
title Channel Starter preview
cd /d "%~dp0"
echo.
echo Preview: http://127.0.0.1:3010/preview/contoh-nexcent
echo JSON {"detail":"Site not found"} = proses LAMA masih pegang port 3010.
echo Stop listener 3010 lalu jalankan file ini lagi, atau isi form di http://127.0.0.1:3010/
echo.

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3010.*LISTENING"') do (
  echo Stop PID %%P di port 3010
  taskkill /F /PID %%P >nul 2>&1
)

python cli.py serve
if errorlevel 1 python3 cli.py serve
echo.
pause
