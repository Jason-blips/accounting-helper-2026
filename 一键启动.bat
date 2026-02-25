@echo off
chcp 65001 >nul 2>&1
title Counting Helper - 一键启动
cd /d "%~dp0"

echo.
echo ========================================
echo   Counting Helper - 一键启动
echo ========================================
echo.

REM 步骤 1：构建前端并复制到后端
echo [1/2] 构建前端并复制到后端...
cd frontend
call npm run build 2>nul
if errorlevel 1 (
    echo [提示] 前端构建跳过（未安装 Node 或失败）。若已做过「制作发布包」或曾构建过，将直接启动后端。
    cd ..
    goto :start_backend
)
cd ..
if not exist "backend-java\src\main\resources\static" mkdir "backend-java\src\main\resources\static"
xcopy /E /Y /Q "frontend\dist\*" "backend-java\src\main\resources\static\" >nul 2>&1
echo [OK] 前端已就绪
echo.

:start_backend
REM 步骤 2：启动后端
echo [2/2] 启动后端...
cd backend-java
call start.bat
cd ..
exit /b
