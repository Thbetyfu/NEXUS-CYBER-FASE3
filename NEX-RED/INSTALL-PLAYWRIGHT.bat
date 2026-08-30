@echo off
REM Install Playwright Chromium onto the NEX-RED drive (not C: Temp).
set "PLAYWRIGHT_BROWSERS_PATH=%~dp0workspaces\.playwright-browsers"
mkdir "%PLAYWRIGHT_BROWSERS_PATH%" 2>nul
pip install -r "%~dp0requirements-browser.txt"
python -m playwright install chromium
echo PLAYWRIGHT_BROWSERS_PATH=%PLAYWRIGHT_BROWSERS_PATH%
