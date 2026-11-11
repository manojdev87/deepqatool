@echo off
echo ========================================
echo   Website QA Auditor - Setup
echo ========================================
echo.

echo [1/3] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend install failed
    pause
    exit /b 1
)

echo.
echo [2/3] Installing Playwright browsers...
echo NOTE: If this fails due to SSL/proxy issues, Playwright will use
echo       your system Chrome installation instead (auto-detected).
set NODE_TLS_REJECT_UNAUTHORIZED=0
call npx playwright install chromium 2>nul
set NODE_TLS_REJECT_UNAUTHORIZED=1
echo Playwright browser install attempted (failures are OK if Chrome is installed)

echo.
echo [3/3] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend install failed
    pause
    exit /b 1
)

cd ..
echo.
echo ========================================
echo   Setup Complete!
echo   Run start.bat to launch the app
echo ========================================
echo.
echo IMPORTANT: Ensure Google Chrome is installed for Lighthouse audits.
echo Chrome paths checked automatically:
echo   C:\Program Files\Google\Chrome\Application\chrome.exe
echo   C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
echo   Or set CHROME_PATH environment variable
echo.
pause
