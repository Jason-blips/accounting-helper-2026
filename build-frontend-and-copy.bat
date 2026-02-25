@echo off
chcp 65001 >nul 2>&1
title Build Frontend and Copy to Backend
cd /d "%~dp0"

echo.
echo ========================================
echo   Build Frontend - Copy to Backend
echo ========================================
echo.

REM Build frontend
echo [1/2] Building frontend (npm run build)...
cd frontend
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    cd ..
    pause
    exit /b 1
)
cd ..

REM Copy to backend static
set "DEST=backend-java\src\main\resources\static"
echo [2/2] Copying to %DEST%...
if not exist "%DEST%" mkdir "%DEST%"
xcopy /E /Y /Q "frontend\dist\*" "%DEST%\"
echo.
echo [OK] Done. Frontend is updated in backend.
echo      Run backend-java\start.bat to start and see new features.
echo ========================================
pause
