@echo off
chcp 65001 >nul 2>&1
title Build Frontend for Local Backend (use local DB at localhost:8000)
cd /d "%~dp0"

echo.
echo ========================================
echo   构建前端（对接本机后端 / 本地数据库）
echo ========================================
echo.
echo 本次构建不使用 .env.production 的 API 地址，
echo 前端将请求相对路径 /api，在 localhost:8000 打开时用本机后端和本地库。
echo.

cd frontend
set VITE_API_URL=
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed.
    cd ..
    pause
    exit /b 1
)
cd ..

set "DEST=backend-java\src\main\resources\static"
echo.
echo Copying to %DEST%...
if not exist "%DEST%" mkdir "%DEST%"
xcopy /E /Y /Q "frontend\dist\*" "%DEST%\"
echo.
echo [OK] Done. Start backend (start.bat) and open http://localhost:8000 to use local DB login.
echo ========================================
pause
