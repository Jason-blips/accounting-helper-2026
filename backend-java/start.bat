@echo off
chcp 65001 >nul 2>&1
title Counting Helper Backend
color 0B
cls

echo.
echo ========================================
echo   Counting Helper Backend
echo ========================================
echo.

cd /d "%~dp0"

REM Check Java
where java >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java not found. Please install Java 17+
    pause
    exit /b 1
)

REM Check Maven
where mvn >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Maven not found. Please install Maven 3.6+
    pause
    exit /b 1
)

REM Check port 8000
netstat -ano | findstr ":8000" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Port 8000 in use, releasing...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 >nul
)

REM Build
echo [INFO] Building project...
call mvn clean package -DskipTests
if errorlevel 1 (
    echo [ERROR] Build failed. Check errors above.
    pause
    exit /b 1
)

REM Start
echo.
echo ========================================
echo   Starting service...
echo ========================================
echo API: http://localhost:8000/api
echo Health: http://localhost:8000/api/health
echo Press Ctrl+C to stop
echo ========================================
echo.

echo [INFO] Starting...
echo [TIP] Wait for "Started CountingHelperApplication" and "Tomcat started"
echo.

REM Database: absolute path = script_dir\..\database\accounting.db
for %%A in ("%~dp0..\database\accounting.db") do set "DB_PATH=%%~fA"
echo [INFO] Database: %DB_PATH%
if not exist "%DB_PATH%" (
    echo [WARN] Database file not found. Put accounting.db in: %~dp0..\database\
    echo        Or set env DB_PATH to your backup path, then run again.
)

java -jar target/counting-helper-backend-1.0.0.jar

if errorlevel 1 (
    echo.
    echo [ERROR] Service failed to start.
    echo Check errors above.
    echo 1. DB file missing or path wrong
    echo 2. DB schema mismatch
    echo 3. Port in use
    echo.
    pause
    exit /b 1
)

pause
