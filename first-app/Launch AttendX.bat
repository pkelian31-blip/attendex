@echo off
title AttendX - Starting...
echo.
echo  ==========================================
echo   AttendX - Smart Attendance Platform
echo   Created by KEL PHANTOM
echo  ==========================================
echo.
echo  Starting AttendX... please wait...
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo  Installing dependencies for first time...
    npm install
)

:: Start the server in background and open browser
echo  Opening AttendX in your browser...
start "" "http://localhost:3000"

:: Wait 3 seconds then open browser again in case server wasn't ready
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

:: Start the dev server (this window stays open - don't close it)
echo.
echo  AttendX is running at http://localhost:3000
echo  DO NOT CLOSE THIS WINDOW - it keeps the app running
echo.
npm run dev

pause
