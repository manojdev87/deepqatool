@echo off
echo ========================================
echo   Website QA Auditor
echo ========================================
echo.
echo Starting backend on http://localhost:3001
echo Starting frontend on http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop
echo.

start "QA Auditor - Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 3 /nobreak > nul
start "QA Auditor - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak > nul

echo Opening browser...
start http://localhost:5173

echo.
echo App is running! Close this window when done.
pause
