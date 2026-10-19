@echo off
chcp 65001 >nul
title Air Quality Predictor Dev Server
echo ===================================================
echo   Starting Air Quality Predictor Development Server...
echo ===================================================
echo.

:: Check for node installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

:: Check for node_modules
if not exist "node_modules\" (
    echo [System] node_modules not found. Installing dependencies...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: Generate routes
echo [System] Generating Router Tree...
call npm run generate-routes
if %errorlevel% neq 0 (
    echo [ERROR] Route generation failed.
    pause
    exit /b 1
)

:: Start Dev Server
echo [System] Starting dev server on port 3000...
echo.
echo ===================================================
echo  Server is launching!
echo  Your browser should open automatically.
echo  If not, open: http://localhost:3000
echo.
echo  IMPORTANT: Keep this command prompt window open.
echo  Closing this window will stop the server.
echo ===================================================
echo.

call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The server stopped unexpectedly.
    pause
)
