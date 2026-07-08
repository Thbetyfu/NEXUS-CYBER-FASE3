@echo off
title NEXUS CYBER - PROCESS CLEANUP (ANTI-ZOMBIE)
echo ==============================================================================
echo MENYELESAIKAN PROSES DAN MEMBERSIHKAN PORT ZOMBIE (NEXUS CYBER)
echo ==============================================================================

echo [1] Membersihkan Port 8080 (Gateway WAF)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /F /PID %%a 2>nul

echo [2] Membersihkan Port 9090 (Honeypot)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9090') do taskkill /F /PID %%a 2>nul

echo [3] Membersihkan Port 2222 (SSH Tarpit)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :2222') do taskkill /F /PID %%a 2>nul

echo [4] Membersihkan Port 3001 (SOC Dashboard)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a 2>nul

echo [5] Membersihkan Port 3002 (Portfolio Web)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002') do taskkill /F /PID %%a 2>nul

echo [6] Menghentikan sisa proses Node.js dan Go runner...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM go.exe 2>nul

echo ==============================================================================
echo Seluruh port dan proses zombie berhasil dibersihkan!
echo ==============================================================================
pause
